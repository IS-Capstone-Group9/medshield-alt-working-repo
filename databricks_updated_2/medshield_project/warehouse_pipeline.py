"""Staged upload pipeline and versioned warehouse release logic.

Pure functions (no Spark) hold every consequential rule so they run offline in
tests; thin runners at the bottom move the same data through Delta tables, one
Job task per stage. Nothing here appends to or replaces the pinned original or
historical serving objects: uploads stay candidate-only in the isolated intake
schema until ``promote`` builds a NEW versioned release from an approved plan.

Reuses (does not copy) the reviewed Silver parser through ``silver_namespace``
and the intake identity, category-reference and report-artifact helpers.
"""
import csv
import hashlib
import importlib.util
import io
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from pathlib import Path

HERE = Path(__file__).resolve().parent if "__file__" in globals() else None
if HERE is not None and str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))
import controlled_sales_intake as intake  # noqa: E402  (sibling helper file)

PIPELINE_VERSION = "warehouse_stage_pipeline_v1"
# The reviewed Silver parser is a generated notebook. A workspace notebook and a same-named .py file collide, so a
# deployment installs an identical file copy as silver_parser_20261026.py; the repository path is tried first.
SILVER_SOURCES = ((HERE / "original_source_20261026" / "02_original_sales_silver_20261026.py",
                   HERE / "original_source_20261026" / "silver_parser_20261026.py") if HERE else ())
SILVER_SOURCE = next((p for p in SILVER_SOURCES if p.is_file()), SILVER_SOURCES[0] if SILVER_SOURCES else None)
MAX_SOURCE_BYTES = 10 * 1024 * 1024
MAX_PROMOTION_MONTHS = 1200
MONTH = re.compile(r"(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])")
CENT = Decimal("0.01")
SIX = Decimal("0.000001")
MEASURES = ("quantity", "gross_sales", "discount_amount", "net_sales", "total_acquisition_cost", "gross_margin_amount")
CONTRACT_REVIEW = "CONTRACT_PARENT_REQUIRES_FINANCIAL_SCOPE_REVIEW"
DETAIL_ISSUES = ("INVALID_", "MISSING_AREA", "MISSING_DR")
PROMOTABLE_CATEGORIES = ("approved", "approved_unclassified")
MONTH_SHRINK_REVIEW = Decimal("0.2")  # a declared month losing more than this share needs an explicit acknowledgement
# Adrian's confirmed delivery-area mapping, also stored at Gold regional_4c5f44013464395e_candidate.
REGIONAL_MAPPING_HASH = "4c5f44013464395efa49c133f2d141646930f9437a23e60e8b05cf0298392df4"
MARGIN_MISMATCH = ("TRANSFER_VALUE_FORMULA_MISMATCH", "GROSS_MARGIN_FORMULA_MISMATCH")
_SILVER = {}


class PipelineError(ValueError):
    """Fail-closed pipeline violation; message is safe to surface (no raw records)."""


def require(condition, message):
    if not condition:
        raise PipelineError(message)


def digest_json(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()


def silver_namespace(path=None):
    """Load the reviewed Silver parser rules once. Requires the generated notebook as a readable file."""
    source = Path(path or SILVER_SOURCE or "")
    require(source.is_file(), "Reviewed Silver parser source is not installed beside the pipeline")
    key = str(source)
    if key not in _SILVER:
        spec = importlib.util.spec_from_file_location("reviewed_original_silver", key)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        _SILVER[key] = module.silver_namespace()
    return _SILVER[key]


def load_regions(data, expected_hash=REGIONAL_MAPPING_HASH):
    """Confirmed labels only. Every other area stays unallocated: no inference, per the mapping's own policy."""
    require(hashlib.sha256(data).hexdigest() == expected_hash, "Regional delivery mapping hash mismatch")
    mapping = json.loads(data)
    require(mapping.get("unconfirmed_labels_policy") == "unallocated_no_inference", "Unexpected regional mapping policy")
    return {row["recorded_label"]: dict(province=row["province"], region=row["region"], province_psgc_code=row["province_psgc_code"],
                                        territory_id="PH-PROVINCE-" + row["province"].upper().replace(" ", "-")) for row in mapping["mappings"]}


def validate_psgc_codes(regions, psgc_records=None):
    """Validate 9/10-digit PSGC codes on confirmed delivery areas; never infer unmapped labels."""
    by_code = {}
    if psgc_records is not None:
        for rec in psgc_records:
            code = str(rec.get("psgc_code") or "").strip()
            if code:
                by_code[code] = rec
    validated = {}
    for label, entry in (regions or {}).items():
        code = str(entry.get("province_psgc_code") or "").strip()
        require(re.fullmatch(r"\d{9,10}", code), f"Invalid PSGC code format for {label}")
        if psgc_records is not None:
            require(code in by_code, f"PSGC code {code} missing from reference table")
            level = str(by_code[code].get("geographic_level") or "").strip().lower()
            if level:
                require(level in ("prov", "province", "huc", "city"), f"Unexpected PSGC level {level} for {code}")
        validated[label] = code
    return validated


# ---------------------------------------------------------------- Bronze
def source_text(data):
    require(0 < len(data) <= MAX_SOURCE_BYTES, "CSV size outside intake limit")
    try:
        text = data.decode("utf-8-sig", errors="strict")
    except UnicodeDecodeError:
        raise PipelineError("CSV must be valid UTF-8") from None
    require("\0" not in text, "Binary data is not CSV")
    return text.replace("\r\n", "\n").replace("\r", "\n")


def csv_records(text):
    """(raw record text, parsed fields) per CSV record; embedded newlines stay inside one record."""
    lines = text.split("\n")
    reader = csv.reader(io.StringIO(text, newline=""), strict=True)
    records, previous = [], 0
    try:
        for fields in reader:
            records.append(("\n".join(lines[previous:reader.line_num]), fields))
            previous = reader.line_num
    except csv.Error:
        raise PipelineError("Malformed CSV quoting") from None
    return records


def detect_format(text):
    records = csv_records(text)
    require(records, "CSV has no header")
    return "template" if records[0][1] == intake.COLUMNS else "client_export"


def bronze_rows(data, ingestion_id, source_hash, as_of):
    """One row per physical line (client export) or CSV record (template); raw text is preserved."""
    text = source_text(data)
    fmt = detect_format(text)
    workbook = "upload_" + ingestion_id[:16] + ".csv"
    texts = [t for t, _ in csv_records(text)] if fmt == "template" else text.split("\n")
    require(len(texts) <= 250000, "Source exceeds the physical-line limit")
    rows = [dict(source_record_id=digest_json([source_hash, number]), source_workbook=workbook, source_file_sha256=source_hash,
                 source_row_number=number, data_source_year=as_of.year, raw_csv_line=line, source_format=fmt)
            for number, line in enumerate(texts, 1)]
    return fmt, rows


# ---------------------------------------------------------------- Silver
def fixed(value, places=SIX):
    return None if value is None else format(Decimal(value).quantize(places), "f")


def _unified(base, **fields):
    row = dict(source_record_id=base["source_record_id"], source_row_number=base["source_row_number"], source_format=base["source_format"],
               client_row_reference=None, quality_status="NON_TRANSACTION", issues=[], disposition=None, delivery_date=None,
               dr_number=None, product=None, area=None, is_margin_eligible=False, **{name: None for name in MEASURES})
    row.update(fields)
    row["issues"] = sorted(set(row["issues"]))
    return row


def _from_assessed(base, assessed, as_of, is_contract):
    codes = list(assessed["quality_rule_codes"])
    disposition = assessed["disposition"]
    delivered = assessed["date_delivered"]
    net = assessed["net_sales"]
    fields = dict(disposition=disposition, delivery_date=delivered.isoformat() if delivered else None, dr_number=assessed["dr_number"],
                  product=assessed["product"], area=assessed["area"],
                  quantity=fixed(assessed["quantity"]), gross_sales=fixed(assessed["gross_sales"]), discount_amount=fixed(assessed["discount_amount"]),
                  net_sales=fixed(assessed["net_sales"]), total_acquisition_cost=fixed(assessed["total_acquisition_cost"]),
                  gross_margin_amount=fixed(assessed["gross_margin_amount"]),
                  # The same population as Gold's gross-margin eligibility, so margin rates share a numerator and denominator.
                  is_margin_eligible=(net is not None and "NET_VALUE_FORMULA_MISMATCH" not in codes and assessed["total_acquisition_cost"] is not None
                                      and assessed["gross_margin_amount"] is not None and not any(code in codes for code in MARGIN_MISMATCH)))
    if disposition.startswith("EXCLUDE_"):
        return _unified(base, disposition=disposition)
    faults = [] if disposition.startswith("KEEP_") else [disposition]
    if disposition.startswith("KEEP_"):
        if net is None:
            faults.append("MISSING_NET_SALES")
        elif "NET_VALUE_FORMULA_MISMATCH" in codes:
            faults.append("NET_VALUE_FORMULA_MISMATCH")
        elif net.quantize(CENT) != net:
            faults.append("NET_SALES_NOT_CENT_PRECISION")
        if delivered and delivered > as_of:
            faults.append("FUTURE_DELIVERY_DATE")
        if is_contract(assessed["product"]):
            faults.append(CONTRACT_REVIEW)
    issues = faults + [code for code in codes if code.startswith(DETAIL_ISSUES)]
    return _unified(base, quality_status="REJECTED" if faults else "ACCEPTED", issues=issues, **fields)


def _template_rows(data, bronze, as_of):
    result = intake.assess(data, {})
    require(len(result["silver"]) == len(bronze) - 1, "Template record count changed between stages")
    rows = []  # the header record stays in Bronze as evidence; Silver holds data records only
    for base, silver in zip(bronze[1:], result["silver"]):
        faults = list(silver["issues"])
        if not faults and silver["delivery_date"] > as_of.isoformat():
            faults.append("FUTURE_DELIVERY_DATE")
        rows.append(_unified(base, client_row_reference=silver["source_record_id"], quality_status="REJECTED" if faults else "ACCEPTED",
                             issues=faults, disposition="KEEP_TEMPLATE_ROW" if not faults else "REVIEW_TEMPLATE_ROW",
                             delivery_date=silver["delivery_date"], dr_number=intake.normalized(silver["dr_number"]) or None,
                             product=intake.normalized(silver["product"]) or None, area=intake.normalized(silver["area"]) or None,
                             quantity=fixed(silver["reported_quantity"]), net_sales=fixed(silver["net_sales"]),
                             gross_margin_amount=fixed(silver["gross_profit"]), is_margin_eligible=silver["gross_profit"] is not None and not faults))
    return rows


def source_year(assessed, as_of):
    """The file's own year: its most common delivery year, not the processing year.

    The reviewed parser scopes each file to one source year, so rows dated in another year stay held
    for review instead of a single stray date widening the scope. Ties take the later year.
    """
    years = Counter(row["calendar_year"] for row in assessed if row["calendar_year"] and row["calendar_year"] <= as_of.year)
    return max(years, key=lambda year: (years[year], year)) if years else as_of.year


def silver_rows(fmt, bronze, data, as_of, namespace=None):
    """Unify both input layouts. Rejected rows stay visible with reasons; nothing is dropped."""
    if fmt == "template":
        rows = _template_rows(data, bronze, as_of)
    else:
        silver = namespace or silver_namespace()
        assessed = silver["assess_sales_records"]([dict(row) for row in bronze])
        year = source_year(assessed, as_of)
        if year != bronze[0]["data_source_year"]:
            assessed = silver["assess_sales_records"]([dict(row, data_source_year=year) for row in bronze])
        require(len(assessed) == len(bronze), "Silver lost source lines")
        rows = [_from_assessed(base, row, as_of, silver["is_contract_parent_label"]) for base, row in zip(bronze, assessed)]
    expected = bronze[1:] if fmt == "template" else bronze
    require(Counter(r["source_record_id"] for r in rows) == Counter(b["source_record_id"] for b in expected), "Silver changed source identities")
    return rows


def held_summary(rows):
    """Rows kept out of Gold, by primary reason. Unknown net stays unknown and is counted, never added as zero."""
    held = [row for row in rows if row["quality_status"] == "REJECTED"]
    reasons = defaultdict(lambda: {"records": 0, "known_net_sales": Decimal(0), "unknown_net_records": 0})
    for row in held:
        named = [issue for issue in row["issues"] if not issue.startswith(DETAIL_ISSUES)]
        cell = reasons[(named or row["issues"] or ["UNSPECIFIED"])[0]]
        cell["records"] += 1
        if row["net_sales"] is None:
            cell["unknown_net_records"] += 1
        else:
            cell["known_net_sales"] += Decimal(row["net_sales"])
    return {"records": len(held), "by_reason": {reason: {**cell, "known_net_sales": fixed(cell["known_net_sales"])} for reason, cell in sorted(reasons.items())}}


def silver_counts(rows):
    status = Counter(row["quality_status"] for row in rows)
    counts = {"received": len(rows), "accepted": status["ACCEPTED"], "rejected": status["REJECTED"], "non_transaction": status["NON_TRANSACTION"]}
    require(counts["received"] == counts["accepted"] + counts["rejected"] + counts["non_transaction"], "Silver counts do not reconcile")
    return counts


# ---------------------------------------------------------------- Gold
def date_key(value):
    return int(value.replace("-", ""))


def line_key(seen, row):
    """Same line, same key, whether seeded or uploaded. The occurrence index keeps legitimate repeats distinct."""
    natural = digest_json([row["delivery_date"], row["area"], row["dr_number"], row["product"]] + [row[name] for name in MEASURES])
    seen[natural] += 1
    return digest_json([natural, seen[natural]])


def build_gold(rows, categories, ingestion_id, source_hash, regions=None):
    """Candidate fact/dimensions/marts for accepted rows. Unmapped categories stay 'unclassified' and flagged."""
    accepted = [row for row in rows if row["quality_status"] == "ACCEPTED"]
    seen, facts = Counter(), []
    for row in accepted:
        key = line_key(seen, row)
        label = intake.normalized(row["product"])
        category = categories.get(label)
        # A reference disposition of "unclassified" is a recorded decision, but still a label needing review.
        status = "review_required" if category is None else "approved_unclassified" if category == "unclassified" else "approved"
        facts.append(dict(sales_line_id=key, ingestion_id=ingestion_id, source_record_id=row["source_record_id"], delivery_date=row["delivery_date"],
                          calendar_month=row["delivery_date"][:7], date_key=date_key(row["delivery_date"]),
                          area_key=hashlib.sha256(row["area"].encode()).hexdigest(), area=row["area"],
                          product_key=hashlib.sha256(label.encode()).hexdigest(), product=row["product"],
                          product_category=category or "unclassified", category_status=status,
                          dr_number=row["dr_number"], **{name: row[name] for name in MEASURES},
                          candidate_only=True, forecast_eligible=False, source_unit_approved=False, financial_release_approved=False,
                          publication_status="CANDIDATE_PENDING_PROMOTION_REVIEW", is_margin_eligible=row["is_margin_eligible"]))
    require(len({f["sales_line_id"] for f in facts}) == len(facts), "Fact key collision")
    total = sum((Decimal(r["net_sales"]) for r in accepted), Decimal(0))
    require(sum((Decimal(f["net_sales"]) for f in facts), Decimal(0)) == total, "Gold lost net sales")
    return dict(fact=facts, net_sales_total=total, **derive_dimensions(facts, regions))


def build_contract_facts(rows, ingestion_id):
    """Separate candidate partition for CONTRACT_REVIEW parent rows; never added to itemized fact totals."""
    contract_rows = [
        r for r in rows
        if r.get("quality_status") == "REJECTED"
        and CONTRACT_REVIEW in (r.get("issues") or [])
        and r.get("net_sales") is not None
        and r.get("delivery_date") is not None
    ]
    seen, contracts = Counter(), []
    for row in contract_rows:
        key = line_key(seen, row)
        contracts.append(dict(
            contract_line_id=key,
            ingestion_id=ingestion_id,
            source_record_id=row["source_record_id"],
            delivery_date=row["delivery_date"],
            calendar_month=row["delivery_date"][:7],
            date_key=date_key(row["delivery_date"]),
            area=row["area"],
            product=row["product"],
            dr_number=row["dr_number"],
            **{name: row[name] for name in MEASURES},
            is_margin_eligible=bool(row.get("is_margin_eligible")),
            financial_scope="contract_parent_unreconciled",
            candidate_only=True,
            publication_status="CANDIDATE_CONTRACT_SEPARATE_SCOPE",
        ))
    require(len({c["contract_line_id"] for c in contracts}) == len(contracts), "Contract fact key collision")
    total = sum((Decimal(r["net_sales"]) for r in contract_rows), Decimal(0))
    require(sum((Decimal(c["net_sales"]) for c in contracts), Decimal(0)) == total, "Contract fact lost net sales")
    return dict(contract_fact=contracts, record_count=len(contracts), net_sales_total=total)


def calendar(facts):
    """Every day of every month from the first to the last sale, so a month without sales is visible, not absent."""
    if not facts:
        return []
    sold = {f["delivery_date"] for f in facts}
    first, last = date.fromisoformat(min(sold)).replace(day=1), date.fromisoformat(max(sold))
    last = (last.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    days = [first + timedelta(days=offset) for offset in range((last - first).days + 1)]
    return [dict(date_key=date_key(day.isoformat()), date=day.isoformat(), year=day.year, month=day.month, quarter=(day.month - 1) // 3 + 1,
                 calendar_month=day.isoformat()[:7], has_sales=day.isoformat() in sold) for day in days]


def rollup(facts, key):
    """Record count and net for all rows, with margin measures over one eligible population only."""
    cells = defaultdict(lambda: {"record_count": 0, "net_sales": Decimal(0), "margin_record_count": 0, "margin_net_sales": Decimal(0), "gross_margin": Decimal(0)})
    for f in facts:
        cell = cells[key(f)]
        cell["record_count"] += 1
        cell["net_sales"] += Decimal(f["net_sales"])
        if f.get("is_margin_eligible"):
            cell["margin_record_count"] += 1
            cell["margin_net_sales"] += Decimal(f["net_sales"])
            cell["gross_margin"] += Decimal(f["gross_margin_amount"])
    return [(k, {name: fixed(value) if isinstance(value, Decimal) else value for name, value in v.items()}) for k, v in sorted(cells.items())]


def derive_dimensions(facts, regions=None):
    """Conformed dimensions and marts, derived only from fact rows (also used to build a release)."""
    regions = regions or {}
    dim_area = {}
    for f in facts:
        region = regions.get(f["area"], {})
        dim_area[f["area_key"]] = dict(area_key=f["area_key"], area=f["area"], province=region.get("province"), region=region.get("region"),
                                       province_psgc_code=region.get("province_psgc_code"), territory_id=region.get("territory_id"),
                                       delivery_status="confirmed_delivery_area" if region else "unallocated", is_external_join_ready=False)
    dim_product = {f["product_key"]: dict(product_key=f["product_key"], product=f["product"], product_category=f["product_category"],
                                          category_status=f["category_status"]) for f in facts}
    dim_date = calendar(facts)
    mart = [dict(calendar_month=k[0], product_category=k[1], **cell) for k, cell in rollup(facts, lambda f: (f["calendar_month"], f["product_category"]))]
    mart_area = [dict(calendar_month=k[0], area_key=k[1], territory_id=dim_area[k[1]]["territory_id"], product_category=k[2], **cell)
                 for k, cell in rollup(facts, lambda f: (f["calendar_month"], f["area_key"], f["product_category"]))]
    total = sum((Decimal(f["net_sales"]) for f in facts), Decimal(0))
    require(sum((Decimal(m["net_sales"]) for m in mart), Decimal(0)) == total and sum((Decimal(m["net_sales"]) for m in mart_area), Decimal(0)) == total, "Mart does not reconcile to fact")
    keys = {d["date_key"] for d in dim_date}
    require(all(f["area_key"] in dim_area and f["product_key"] in dim_product and f["date_key"] in keys for f in facts), "Dimension key missing")
    return dict(dim_date=dim_date, dim_area=sorted(dim_area.values(), key=lambda r: r["area_key"]),
                dim_product=sorted(dim_product.values(), key=lambda r: r["product_key"]), mart_monthly=mart, mart_area_monthly=mart_area)


def report_result(rows, gold):
    """Shape the existing gateway-readable report from unified Silver and candidate Gold."""
    counts = silver_counts(rows)
    review = sum(1 for f in gold["fact"] if f["category_status"] != "approved")
    counts["category_review"] = review
    counts["category_unmapped"] = sum(1 for f in gold["fact"] if f["category_status"] == "review_required")
    issues = []
    for row in rows:
        reference = row["client_row_reference"] or row["source_record_id"]
        for issue in row["issues"]:
            issues.append({"row_number": row["source_row_number"], "source_record_id": reference, "issue": issue})
    for f in gold["fact"]:
        if f["category_status"] != "approved":
            issues.append({"row_number": None, "source_record_id": f["source_record_id"], "issue": "CATEGORY_REVIEW_REQUIRED"})
    classes = Counter((f["product"], f["product_category"], "approved_reference_exact_normalized" if f["category_status"] in PROMOTABLE_CATEGORIES else "unmatched") for f in gold["fact"])
    needs = bool(counts["rejected"] or review)
    return {"issues": issues, "classifications": [{"product": k[0], "category": k[1], "basis": k[2], "record_count": v} for k, v in sorted(classes.items())],
            "counts": counts, "net_sales_candidate": str(gold["net_sales_total"].quantize(CENT)),
            "status": "NEEDS_REVIEW" if needs else "READY_FOR_APPROVAL"}


# ---------------------------------------------------------------- Promotion
def month_window(first, last):
    require(MONTH.fullmatch(first or "") and MONTH.fullmatch(last or ""), "Declared months must be YYYY-MM")
    require(first <= last, "First declared month follows the last")
    y, m, months = int(first[:4]), int(first[5:]), []
    while f"{y:04d}-{m:02d}" <= last:
        months.append(f"{y:04d}-{m:02d}")
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    require(len(months) <= MAX_PROMOTION_MONTHS, "Declared period exceeds the review limit")
    return months


def _controls(rows):
    return {"records": len(rows), "net_sales": fixed(sum((Decimal(r["net_sales"]) for r in rows), Decimal(0)))}


def month_shrank(before, after):
    """True when a month loses more than the review share of its records or of a positive net total."""
    keep = 1 - MONTH_SHRINK_REVIEW
    return after["records"] < before["records"] * keep or (Decimal(before["net_sales"]) > 0 and Decimal(after["net_sales"]) < Decimal(before["net_sales"]) * keep)


def replace_months(base_rows, candidate_rows, first, last, ingestion_id, source_hash, held=None):
    """Replace ONLY the declared months. Fail closed on out-of-window rows, empties and key collisions.

    Returns (new_rows, controls). Every control is derived from the rows themselves and
    pre - removed + added = post is asserted for records and net sales, overall and per month.
    Held rows and shrinking months become warnings bound into the plan hash. Conservation cannot show
    that a file is complete, so a month with existing rows and none in this file is refused outright.
    """
    window = set(month_window(first, last))
    require(candidate_rows, "Empty candidate cannot replace a period")
    require(all(r["calendar_month"] in window for r in candidate_rows), "Candidate contains months outside the declared period")
    require(all(r["category_status"] in PROMOTABLE_CATEGORIES for r in candidate_rows), "Category review must be resolved before promotion")
    empty = sorted(window & {r["calendar_month"] for r in base_rows} - {r["calendar_month"] for r in candidate_rows})
    require(not empty, "Declared months have existing rows but none in this file: " + ", ".join(empty))
    removed = [r for r in base_rows if r["calendar_month"] in window]
    kept = [r for r in base_rows if r["calendar_month"] not in window]
    new_rows = kept + list(candidate_rows)
    require(len({r["sales_line_id"] for r in new_rows}) == len(new_rows), "Sales line key conflict with retained months")
    before, gone, added, after = (_controls(base_rows), _controls(removed), _controls(candidate_rows), _controls(new_rows))
    require(before["records"] - gone["records"] + added["records"] == after["records"], "Record conservation failed")
    require(Decimal(before["net_sales"]) - Decimal(gone["net_sales"]) + Decimal(added["net_sales"]) == Decimal(after["net_sales"]), "Net sales conservation failed")
    pre_by, post_by = defaultdict(list), defaultdict(list)
    for r in base_rows:
        pre_by[r["calendar_month"]].append(r)
    for r in new_rows:
        post_by[r["calendar_month"]].append(r)
    per_month, warnings = [], []
    if held and held["records"]:
        warnings.append({"code": "HELD_ROWS", **held})
    unclassified = [r for r in candidate_rows if r["category_status"] == "approved_unclassified"]
    if unclassified:
        warnings.append({"code": "UNCLASSIFIED_ROWS", **_controls(unclassified)})
    for month in sorted(set(pre_by) | set(post_by)):
        require(month in window or pre_by[month] == post_by[month], "A month outside the declared period changed")
        row = {"calendar_month": month, "before": _controls(pre_by[month]), "after": _controls(post_by[month])}
        per_month.append(row)
        if month in window and month_shrank(row["before"], row["after"]):
            warnings.append({"code": "MONTH_SHRINK", **row})
    controls = {"declared_first_month": first, "declared_last_month": last, "before": before, "removed": gone, "added": added, "after": after,
                "months": per_month, "warnings": warnings}
    controls["plan_sha256"] = digest_json({"policy": PIPELINE_VERSION, "ingestion_id": ingestion_id, "source_sha256": source_hash,
                                          "controls": {k: v for k, v in controls.items()}})
    return sorted(new_rows, key=lambda r: (r["calendar_month"], r["sales_line_id"])), controls


def release_identity(base_release_id, ingestion_id, plan_sha256):
    return digest_json([PIPELINE_VERSION, base_release_id, ingestion_id, plan_sha256])[:16]


def assert_approved_plan(approved_plan_sha256, controls, acknowledged=False):
    """The operator approves an exact plan hash; any drift in inputs changes it and blocks promotion.

    A plan with warnings also needs an explicit acknowledgement, so held rows and shrinking months are
    decided on rather than passed through by a hash alone.
    """
    require(isinstance(approved_plan_sha256, str) and re.fullmatch(r"[a-f0-9]{64}", approved_plan_sha256)
            and approved_plan_sha256 == controls["plan_sha256"], "Recomputed plan differs from the approved plan")
    require(acknowledged or not controls["warnings"], "Plan has warnings that need an explicit acknowledgement: "
            + ", ".join(sorted({warning["code"] for warning in controls["warnings"]})))


# ---------------------------------------------------------------- History seed
SEED_POLICY = "warehouse_seed_itemized_v1"
SEED_TABLE = "workspace.medshield_original_gold_20261026.original_fd95b9e3abab028c8e41_itemized_candidates"
SEED_DELTA_VERSION = 0
SEED_DATASET_ID = "e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10"
SEED_INGESTION_ID = "seed_" + SEED_DATASET_ID[:16]
SEED_CONTROLS = {"records": 40171, "eligible_records": 39286, "eligible_net": Decimal("638015351.53"), "margin_records": 36798,
                 "margin_net": Decimal("566954921.92"), "gross_margin": Decimal("334666271.55")}
SYNTHETIC_DR_PREFIXES = ("SYNTH-", "DR-SYNTH-")


def seed_facts(gold_rows, dataset_id=SEED_DATASET_ID, expected=None):
    """Map pinned itemized Gold to warehouse facts. Eligible rows only; the rest are held, never zero-filled.

    Stops unless the whole population and every money control equals the pinned baseline.
    """
    expected = expected or SEED_CONTROLS
    seen, facts = Counter(), []
    held = {"records": 0, "by_reason": defaultdict(lambda: {"records": 0, "known_net_sales": Decimal(0), "unknown_net_records": 0})}
    for row in sorted(gold_rows, key=lambda r: r["source_record_id"]):
        require(row["dataset_id"] == dataset_id and row["record_kind"] == "itemized_sale", "Seed source is not the pinned itemized dataset")
        if not row["is_net_sales_technically_eligible"]:
            cell = held["by_reason"]["MISSING_NET_SALES" if row["net_sales"] is None else "NET_VALUE_FORMULA_MISMATCH"]
            held["records"] += 1
            cell["records"] += 1
            if row["net_sales"] is None:
                cell["unknown_net_records"] += 1
            else:
                cell["known_net_sales"] += Decimal(row["net_sales"])
            continue
        day = row["date_delivered"].isoformat()
        line = dict(delivery_date=day, area=row["area"], dr_number=row["dr_number"], product=row["normalized_product"], quantity=fixed(row["recorded_quantity"]),
                    gross_sales=fixed(row["gross_sales"]), discount_amount=fixed(row["discount_amount"]), net_sales=fixed(row["net_sales"]),
                    total_acquisition_cost=fixed(row["acquisition_cost"]), gross_margin_amount=fixed(row["gross_margin_amount"]))
        facts.append(dict(line, sales_line_id=line_key(seen, line), ingestion_id=SEED_INGESTION_ID, source_record_id=row["source_record_id"], calendar_month=day[:7],
                          date_key=date_key(day), area_key=hashlib.sha256(row["area"].encode()).hexdigest(), product_key=row["product_key"],
                          product_category=row["product_category"], category_status="approved_unclassified" if row["product_category"] == "unclassified" else "approved",
                          candidate_only=True, forecast_eligible=False, source_unit_approved=False, financial_release_approved=False,
                          publication_status="SEEDED_FROM_ORIGINAL_GOLD_PENDING_RELEASE_REVIEW", is_margin_eligible=row["is_gross_margin_technically_eligible"]))
    margin = [f for f in facts if f["is_margin_eligible"]]
    actual = {"records": len(gold_rows), "eligible_records": len(facts), "eligible_net": sum((Decimal(f["net_sales"]) for f in facts), Decimal(0)), "margin_records": len(margin),
              "margin_net": sum((Decimal(f["net_sales"]) for f in margin), Decimal(0)), "gross_margin": sum((Decimal(f["gross_margin_amount"]) for f in margin), Decimal(0))}
    require(actual == expected, "Seed totals differ from the pinned baseline")
    require(len({f["sales_line_id"] for f in facts}) == len(facts) and len({f["source_record_id"] for f in facts}) == len(facts), "Seed key collision")
    held["by_reason"] = {reason: {**cell, "known_net_sales": fixed(cell["known_net_sales"])} for reason, cell in sorted(held["by_reason"].items())}
    return facts, held


def is_synthetic(row):
    return str(row["dr_number"] or "").startswith(SYNTHETIC_DR_PREFIXES)


def seed_replacement(base_rows, facts, held):
    """Replace a test-only release with the seeded history. Refuses if the base holds any real row."""
    require(all(is_synthetic(r) for r in base_rows), "Seed can only replace synthetic test rows; this release holds real rows")
    months = sorted({f["calendar_month"] for f in facts})
    unclassified = [f for f in facts if f["category_status"] == "approved_unclassified"]
    warnings = [{"code": "HELD_ROWS", **held}] if held["records"] else []
    if unclassified:
        warnings.append({"code": "UNCLASSIFIED_ROWS", **_controls(unclassified)})
    if base_rows:
        warnings.append({"code": "SYNTHETIC_ROWS_REMOVED", **_controls(base_rows)})
    controls = {"declared_first_month": months[0], "declared_last_month": months[-1], "before": _controls(base_rows), "removed": _controls(base_rows),
                "added": _controls(facts), "after": _controls(facts), "warnings": warnings}
    return sorted(facts, key=lambda r: (r["calendar_month"], r["sales_line_id"])), controls


# ---------------------------------------------------------------- Analytical marts (derived from one release)
SIGNAL_FIELDS = ("territory_id", "period", "signal_family", "signal", "signal_value", "unit", "source", "station_name", "observation_status", "mapping_status", "is_external_join_ready")


def mart_yearly(facts):
    """Year x category totals, with the months that actually had sales (no zero-filled months)."""
    months = defaultdict(set)
    for f in facts:
        months[(f["calendar_month"][:4], f["product_category"])].add(f["calendar_month"])
    return [dict(year=int(k[0]), product_category=k[1], months_with_sales=len(months[k]), **cell)
            for k, cell in rollup(facts, lambda f: (f["calendar_month"][:4], f["product_category"]))]


def mart_yoy(facts):
    """Year over year on the SAME months only. Months missing in either year are excluded, never treated as zero."""
    by_month = defaultdict(lambda: Decimal(0))
    for f in facts:
        by_month[f["calendar_month"]] += Decimal(f["net_sales"])
    years = sorted({int(m[:4]) for m in by_month})
    rows = []
    for year in years:
        if year - 1 not in years:
            continue
        shared = sorted(m[5:] for m in by_month if m[:4] == str(year) and f"{year - 1}-{m[5:]}" in by_month)
        current = sum((by_month[f"{year}-{m}"] for m in shared), Decimal(0))
        previous = sum((by_month[f"{year - 1}-{m}"] for m in shared), Decimal(0))
        pct = None if not shared or previous == 0 else ((current - previous) / previous * 100).quantize(Decimal("0.01"))
        rows.append(dict(year=year, compared_months=len(shared), months_list=",".join(shared), net_sales=fixed(current), previous_net_sales=fixed(previous),
                         change_pct=None if pct is None else format(pct, "f")))
    return rows


def mart_seasonal(facts):
    """Average net per calendar month over the years that had sales in that month; years_observed shows the evidence."""
    by_month = defaultdict(lambda: Decimal(0))
    for f in facts:
        by_month[f["calendar_month"]] += Decimal(f["net_sales"])
    rows = []
    for month in range(1, 13):
        values = [v for k, v in by_month.items() if int(k[5:]) == month]
        if values:
            rows.append(dict(month_of_year=month, years_observed=len(values), average_net_sales=fixed(sum(values, Decimal(0)) / len(values)),
                             min_net_sales=fixed(min(values)), max_net_sales=fixed(max(values))))
    return rows


def mart_territory_monthly(facts, regions):
    """Sales per confirmed territory and month. Unallocated areas are excluded here and reported separately."""
    regions = regions or {}
    located = [f for f in facts if regions.get(f["area"])]
    return [dict(territory_id=k[0], calendar_month=k[1], **cell) for k, cell in rollup(located, lambda f: (regions[f["area"]]["territory_id"], f["calendar_month"]))]


def signal_snapshot(rows):
    """Copy of the external signals at build time, one row per territory, month and signal. Join flags are kept, never upgraded."""
    out = []
    for row in rows:
        if not row.get("territory_id") or row.get("signal_value") is None:
            continue
        out.append({**{name: row.get(name) for name in SIGNAL_FIELDS}, "signal_value": fixed(row["signal_value"]), "calendar_month": str(row["period"])[:7],
                    "is_external_join_ready": bool(row.get("is_external_join_ready"))})
    require(len({(r["territory_id"], r["calendar_month"], r["signal_family"], r["signal"], r["source"], r["station_name"]) for r in out}) == len(out), "Duplicate external signal rows")
    return out


def derived_marts(facts, regions, signals):
    """All derived marts for one release, with reconciliation checks before anything is written."""
    total = sum((Decimal(f["net_sales"]) for f in facts), Decimal(0))
    yearly, territory = mart_yearly(facts), mart_territory_monthly(facts, regions)
    require(sum((Decimal(r["net_sales"]) for r in yearly), Decimal(0)) == total, "Yearly mart does not reconcile to fact")
    located = sum((Decimal(f["net_sales"]) for f in facts if (regions or {}).get(f["area"])), Decimal(0))
    require(sum((Decimal(r["net_sales"]) for r in territory), Decimal(0)) == located, "Territory mart does not reconcile to located facts")
    return dict(mart_yearly=yearly, mart_yoy=mart_yoy(facts), mart_seasonal=mart_seasonal(facts), mart_territory_monthly=territory,
                territory_signal_monthly=signal_snapshot(signals))


# ---------------------------------------------------------------- Signal indices (decision 012)
POPULATION_HASH = "d74e41b97e6c9bf2bb34bedebab0a65d8218c63eb759f6f91eeacb84d6829314"
# Adrian approved these PAGASA stations on 10 November 2026; the other territories have none and use NASA POWER.
APPROVED_STATIONS = {"PH-PROVINCE-BATANGAS": "Ambulong", "PH-PROVINCE-CAVITE": "Sangley Point", "PH-PROVINCE-CAMARINES-NORTE": "Daet", "PH-PROVINCE-QUEZON": "Tayabas"}


def load_population(data, expected_hash=POPULATION_HASH):
    """Mid-year population per territory and year, from PSA census counts (OpenSTAT 0211A6DAPG0)."""
    require(hashlib.sha256(data).hexdigest() == expected_hash, "Population reference hash mismatch")
    rows = list(csv.DictReader(io.StringIO(data.decode("utf-8"))))
    return {(r["territory_id"], int(r["year"])): (Decimal(r["mid_year_population"]), r["basis"]) for r in rows}


def signal_row(base, **fields):
    row = {name: None for name in SIGNAL_FIELDS}
    row.update(base)
    row.update(fields)
    return row


def apply_station_decision(signals):
    """Approved stations become join-ready; unapproved alternatives are dropped; disease rows keep their own status."""
    out = []
    for row in signals:
        if row["signal_family"] == "WEATHER" and row.get("source") == "PAGASA":
            approved = APPROVED_STATIONS.get(row["territory_id"])
            if approved != row.get("station_name"):
                continue
            row = dict(row, mapping_status="approved_station_20261110", is_external_join_ready=True)
        out.append(row)
    return out


def dii_rows(signals, population):
    """DII = reported cases per 100,000 people (PSA mid-year population). Months without a population stay out."""
    out = []
    for row in signals:
        if row["signal_family"] != "DISEASE":
            continue
        people = population.get((row["territory_id"], int(row["calendar_month"][:4])))
        if not people:
            continue
        value = (Decimal(row["signal_value"]) / people[0] * 100000).quantize(SIX)
        out.append(signal_row(row, signal_family="DISEASE_INTENSITY", signal=f"{row['signal']} DII per 100k", signal_value=format(value, "f"),
                              unit="reported cases per 100,000 population", source="DOH/PSA", station_name=None,
                              observation_status=f"population_{people[1]}"))
    return out


def rsi_rows(nasa_rows, regions):
    """RSI = the NASA POWER rainfall severity proxy (approved as RSI on 10 November 2026). Territories outside the mapping are skipped."""
    ids = {v["province"]: v["territory_id"] for v in (regions or {}).values()}
    out = []
    for row in nasa_rows:
        territory = ids.get(row["territory"])
        if territory is None or row.get("rainfall_severity_proxy") is None:
            continue
        month = str(row["period_start"])[:7]
        out.append(signal_row({}, territory_id=territory, calendar_month=month, period=month, signal_family="WEATHER_INDEX", signal="RSI (NASA rainfall severity proxy)",
                              signal_value=fixed(row["rainfall_severity_proxy"]), unit="index", source="NASA_POWER", observation_status="OBSERVED",
                              mapping_status="approved_proxy_20261110", is_external_join_ready=True))
    return out


def signals_v2(raw_signals, nasa_rows, population, regions):
    base = apply_station_decision(signal_snapshot(raw_signals))
    rows = base + dii_rows(base, population) + rsi_rows(nasa_rows, regions)
    require(len({(r["territory_id"], r["calendar_month"], r["signal_family"], r["signal"], r["source"], r["station_name"]) for r in rows}) == len(rows), "Duplicate signal rows")
    return rows
