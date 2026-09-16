# Databricks notebook source
# Cell 1 — Configuration: run after 01_sales_bronze has passed.
import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP, localcontext

from pyspark.sql import functions as F
from pyspark.sql import types as T

BRONZE_TABLE = "workspace.medshield_bronze.sales_restart_rows_candidate"
MANIFEST_TABLE = "workspace.medshield_bronze.sales_restart_manifest_candidate"
ASSESSED_TABLE = "workspace.medshield_silver.sales_restart_assessed_candidate"
CLEAN_TABLE = "workspace.medshield_silver.sales_restart_clean_candidate"
AUDIT_TABLE = "workspace.medshield_audit.sales_restart_disposition_candidate"
MAX_DRIVER_ROWS = 250_000
MAX_DRIVER_BYTES = 100 * 1024 * 1024
SILVER_VERSION = "sales_restart_silver_v3_serial_dates"

# COMMAND ----------
# Cell 2 — Pure parsing functions. These also run in the local regression tests.
MEASURE_FIELDS = (
    "quantity", "unit_selling_price", "gross_sales", "discount_amount",
    "net_sales", "unit_acquisition_cost", "total_acquisition_cost",
    "gross_margin_amount", "margin_pct", "discount_rate",
)
RAW_MEASURE_FIELDS = MEASURE_FIELDS + ("quantity_secondary",)
DECIMAL_QUANTUM = Decimal("0.000001")
FORMULA_TOLERANCE = Decimal("0.02")
INVALID_TOKENS = {
    "#REF!", "#N/A", "#VALUE!", "#NAME?", "#NULL!", "#DIV/0!",
    "NAN", "NULL", "NONE", "N/A",
}
NUMBER_PATTERN = re.compile(
    r"^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$"
)
HEADER_LAYOUTS = {
    "legacy_2017": (
        "dr", "date", "area", "product", "grosssales", "unitprice", "gross",
        "discount", "", "qty", "tp", "total", "netincome",
    ),
    "legacy_2018": (
        "drnumber", "drdate", "salesrep", "product", "qty", "cpunit", "totalcp",
        "discount", "netcp", "tpunit", "totaltp", "netincome",
    ),
    "legacy_2019": (
        "drnumber", "drdate", "area", "product", "qty", "contractprice", "totalcp",
        "discount", "totalcp", "transferprice", "totaltp", "netincome",
    ),
    "modern_12": (
        "area", "drnumber", "datedelivered", "product", "qty", "cp", "totalcp",
        "disc", "netcp", "tpunit", "totaltp", "netincome",
    ),
    "modern_13": (
        "area", "drnumber", "datedelivered", "product", "qty", "cp", "totalcp",
        "disc", "netcp", "tpunit", "totaltp", "netincome", "%",
    ),
}


def normalized_text(value):
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    return None if not text or text.upper() in INVALID_TOKENS else text.upper()


def normalized_dr(value):
    text = normalized_text(value)
    if text is None:
        return None
    text = re.sub("[‐‑‒–—−]", "-", text)
    text = re.sub(r"^(DR\s*NUMBER|DR\s*NO\.?|D\.R\.|DR)\s*[:#-]?\s*", "DR-", text)
    text = re.sub(r"\s+", "", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return "DR-" + text if text.isdigit() else text


def parse_decimal(raw, percent_points=False, discount_dash_zero=False):
    """Return (value, status); never remove arbitrary text to invent a number."""
    text = str(raw or "").strip()
    if not text or text.upper() in INVALID_TOKENS:
        return None, "MISSING" if not text else "INVALID"
    if text in {"-", "—", "–"}:
        return (Decimal("0.000000"), "DASH_ZERO") if discount_dash_zero else (None, "MISSING")
    if text.endswith("%"):
        if not percent_points:
            return None, "INVALID"
        text = text[:-1].strip()
    text = re.sub(r"^(?:PHP|₱)\s*", "", text, flags=re.IGNORECASE)
    parenthesized = text.startswith("(") and text.endswith(")")
    if parenthesized:
        text = text[1:-1].strip()
        if text.startswith(("+", "-")):
            return None, "INVALID"
    if len(text) > 80 or not NUMBER_PATTERN.fullmatch(text):
        return None, "INVALID"
    try:
        with localcontext() as decimal_context:
            decimal_context.prec = 40
            value = Decimal(text.replace(",", ""))
            if parenthesized:
                value = -value
            if percent_points:
                value /= 100
            if not value.is_finite() or abs(value) >= Decimal("100000000000000"):
                return None, "INVALID"
            return value.quantize(DECIMAL_QUANTUM, rounding=ROUND_HALF_UP), "PARSED"
    except (InvalidOperation, OverflowError):
        return None, "INVALID"


def parse_delivery_date(raw, layout):
    text = str(raw or "").strip()
    if not text or text.upper() in INVALID_TOKENS:
        return None
    # Excel's 1900-system serial can be exported with thousands separators and
    # zero decimal places (confirmed in Sales Report.xlsx, 2025!C2411).
    # Reject fractional days and arbitrary numeric text rather than truncating it.
    if re.fullmatch(r"(?:\d{5}|\d{2},\d{3})(?:\.0+)?", text):
        return date(1899, 12, 30) + timedelta(days=int(Decimal(text.replace(",", ""))))
    # The source layout fixes slash interpretation; no ambiguous fallback swap.
    formats = ["%Y-%m-%d", "%d-%b-%y", "%d-%b-%Y", "%d/%b/%Y"]
    formats += ["%m/%d/%y", "%m/%d/%Y"] if layout == "legacy_2017" else ["%d/%m/%Y", "%d/%m/%y", "%d-%m-%Y"]
    for date_format in formats:
        try:
            return datetime.strptime(text, date_format).date()
        except ValueError:
            continue
    return None


def parse_csv_record(raw_line):
    try:
        rows = list(csv.reader([raw_line], strict=True))
        return rows[0] if rows else [], None
    except csv.Error as error:
        return [], str(error)


def header_layout(fields):
    tokens = [re.sub(r"[^a-z0-9%]", "", item.lower()) for item in fields]
    while tokens and tokens[-1] == "":
        tokens.pop()
    for layout, expected in HEADER_LAYOUTS.items():
        if tuple(tokens) == expected:
            return layout
    return None


def layout_positions(layout):
    if layout == "legacy_2017":
        return dict(area=2, dr_number=0, date_delivered=1, product=3,
                    quantity=4, quantity_secondary=9, unit_selling_price=5,
                    gross_sales=6, discount_rate=7, discount_amount=8,
                    unit_acquisition_cost=10, total_acquisition_cost=11,
                    gross_margin_amount=12)
    positions = dict(area=2, dr_number=0, date_delivered=1, product=3,
                     quantity=4, unit_selling_price=5, gross_sales=6,
                     discount_amount=7, net_sales=8, unit_acquisition_cost=9,
                     total_acquisition_cost=10, gross_margin_amount=11)
    if layout.startswith("modern"):
        positions.update(area=0, dr_number=1, date_delivered=2)
    if layout == "modern_13":
        positions["margin_pct"] = 12
    return positions


def record_fingerprint(row):
    fields = ("date_delivered", "area", "dr_number", "product") + MEASURE_FIELDS
    serialized = json.dumps([None if row.get(key) is None else str(row[key]) for key in fields], ensure_ascii=False)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def blank_assessment(source):
    row = dict(source)
    row.update({key + "_raw": None for key in RAW_MEASURE_FIELDS})
    row.update({key: None for key in MEASURE_FIELDS})
    row.update({key: None for key in (
        "area_raw", "product_raw", "dr_number_raw", "date_delivered_raw",
        "area", "product", "dr_number", "date_delivered", "calendar_year",
        "quantity_primary_candidate", "quantity_secondary_candidate",
        "business_fingerprint", "snapshot_reference_source_record_id",
    )})
    row.update(raw_fields=[], source_layout=None, quality_rule_codes=[],
               net_value_source="UNAVAILABLE", record_kind="PREAMBLE",
               disposition="EXCLUDE_PREAMBLE", is_analysis_candidate=False,
               silver_version=SILVER_VERSION,
               is_area_placeholder=False, is_date_missing=False,
               is_provisional_year_candidate=False, reporting_year=None,
               reporting_year_basis="NOT_APPLICABLE")
    return row


def assess_transaction(row, fields, layout):
    positions = layout_positions(layout)
    for name, position in positions.items():
        row[name + "_raw"] = fields[position] if position < len(fields) else None
    row["area"] = normalized_text(row["area_raw"])
    row["product"] = normalized_text(row["product_raw"])
    row["dr_number"] = normalized_dr(row["dr_number_raw"])
    row["date_delivered"] = parse_delivery_date(row["date_delivered_raw"], layout)
    row["calendar_year"] = row["date_delivered"].year if row["date_delivered"] else None
    rules = row["quality_rule_codes"]
    if row["date_delivered"] and re.fullmatch(r"(?:\d{5}|\d{2},\d{3})(?:\.0+)?", str(row["date_delivered_raw"] or "").strip()):
        rules.append("EXCEL_SERIAL_DELIVERY_DATE_PARSED")
    row["is_area_placeholder"] = row["area"] is None
    if row["is_area_placeholder"]:
        row["area"] = "UNKNOWN_AREA"
        rules.append("MISSING_AREA_PLACEHOLDER")
    row["is_date_missing"] = normalized_text(row["date_delivered_raw"]) is None
    row["reporting_year"] = row["calendar_year"]
    row["reporting_year_basis"] = "OBSERVED_DELIVERY_DATE" if row["date_delivered"] else "UNRESOLVED_INVALID_DATE"
    if row["is_date_missing"]:
        row["reporting_year"] = row["data_source_year"]
        row["reporting_year_basis"] = "PROVISIONAL_SOURCE_FILE_YEAR"
        rules.append("MISSING_DATE_SOURCE_YEAR_PLACEHOLDER")
    for name in MEASURE_FIELDS:
        value, status = parse_decimal(
            row[name + "_raw"], percent_points=name in {"margin_pct", "discount_rate"},
            discount_dash_zero=name == "discount_amount",
        )
        row[name] = value
        if status == "INVALID":
            rules.append("INVALID_NUMERIC_" + name.upper())
        if status == "DASH_ZERO":
            rules.append("DISCOUNT_DASH_INTERPRETED_AS_ZERO")
    row["quantity_primary_candidate"] = row["quantity"]
    secondary, secondary_status = parse_decimal(row["quantity_secondary_raw"])
    row["quantity_secondary_candidate"] = secondary
    if layout == "legacy_2017":
        rules.append("2017_LOW_TRUST_SOURCE")
        if secondary_status == "INVALID":
            rules.append("INVALID_NUMERIC_QUANTITY_SECONDARY")
        if secondary is not None:
            if row["quantity"] is not None and row["quantity"] != secondary:
                rules.append("2017_QUANTITY_CANDIDATES_DISAGREE")
            row["quantity"] = secondary
        if row["gross_sales"] is not None and row["discount_amount"] is not None:
            row["net_sales"] = row["gross_sales"] - row["discount_amount"]
            row["net_value_source"] = "DERIVED_2017_GROSS_LESS_EXPLICIT_DISCOUNT"
            rules.append("NET_SALES_DERIVED_2017")
    elif row["net_sales"] is not None:
        row["net_value_source"] = "SOURCE_REPORTED"
    if row["margin_pct"] is None and row["gross_margin_amount"] is not None and row["net_sales"] not in (None, 0):
        try:
            value = row["gross_margin_amount"] / row["net_sales"]
            if abs(value) < Decimal("100000000000000"):
                row["margin_pct"] = value.quantize(DECIMAL_QUANTUM, rounding=ROUND_HALF_UP)
                rules.append("MARGIN_PCT_DERIVED")
        except InvalidOperation:
            rules.append("INVALID_DERIVED_MARGIN_PCT")
    for key, rule in (("quantity", "INVALID_OR_MISSING_QUANTITY"), ("net_sales", "MISSING_NET_SALES"),
                      ("gross_sales", "MISSING_GROSS_SALES"), ("gross_margin_amount", "MISSING_GROSS_MARGIN")):
        if row[key] is None:
            rules.append(rule)
    if row["quantity"] is not None and row["quantity"] <= 0:
        rules.append("NEGATIVE_QUANTITY" if row["quantity"] < 0 else "ZERO_QUANTITY")
    if row["net_sales"] is not None and row["net_sales"] < 0:
        rules.append("NEGATIVE_NET_SALES")
    if row["dr_number"] is None:
        rules.append("MISSING_DR_NUMBER")
    formula_checks = (
        ("gross_sales", "quantity", "unit_selling_price", "multiply", "GROSS_VALUE_FORMULA_MISMATCH"),
        ("net_sales", "gross_sales", "discount_amount", "subtract", "NET_VALUE_FORMULA_MISMATCH"),
        ("total_acquisition_cost", "quantity", "unit_acquisition_cost", "multiply", "TRANSFER_VALUE_FORMULA_MISMATCH"),
        ("gross_margin_amount", "net_sales", "total_acquisition_cost", "subtract", "GROSS_MARGIN_FORMULA_MISMATCH"),
    )
    for actual, left, right, operation, rule in formula_checks:
        if all(row[key] is not None for key in (actual, left, right)):
            expected = row[left] * row[right] if operation == "multiply" else row[left] - row[right]
            if abs(row[actual] - expected) > FORMULA_TOLERANCE:
                rules.append(rule)
    blocking = []
    for key, rule in (("area", "MISSING_AREA"), ("product", "INVALID_OR_MISSING_PRODUCT"),
                      ("date_delivered", "INVALID_OR_MISSING_DELIVERY_DATE")):
        if row[key] is None:
            blocking.append(rule)
    rules.extend(blocking)
    row["record_kind"] = "TRANSACTION_CANDIDATE"
    if row["product"] is None and row["date_delivered"] is None:
        row["record_kind"] = "CONTINUATION_OR_MISSING_IDENTITY"
    if blocking:
        row["disposition"] = "REVIEW_INVALID_TRANSACTION_IDENTITY"
    elif row["calendar_year"] > row["data_source_year"]:
        rules.append("SOURCE_YEAR_MISMATCH")
        row["disposition"] = "REVIEW_FUTURE_DATED_SOURCE"
    else:
        if row["calendar_year"] != row["data_source_year"]:
            rules.append("SOURCE_YEAR_MISMATCH")
        row["disposition"] = "PENDING_RECONCILIATION"
        row["business_fingerprint"] = record_fingerprint(row)
    # Year-only records stay separate: no invented January 1 date or automatic
    # acceptance of potential duplicates whose delivery date is unavailable.
    row["is_provisional_year_candidate"] = bool(
        row["is_date_missing"] and row["product"] is not None
        and any(row[key] is not None for key in ("quantity", "net_sales", "gross_sales"))
    )
    return row

# COMMAND ----------
# Cell 3 — Pure source-file validation and snapshot/duplicate reconciliation.
def reconcile_sales(rows):
    """One disposition per source row; exact snapshots before within-file duplicates."""
    pending = [row for row in rows if row["disposition"] == "PENDING_RECONCILIATION"]
    strong_groups = defaultdict(list)
    relaxed_groups = defaultdict(list)
    for row in pending:
        strong_groups[row["business_fingerprint"]].append(row)
        relaxed_groups[(row["date_delivered"], row["area"], row["product"])].append(row)
    for group in strong_groups.values():
        # The dedicated source-year file takes priority; otherwise earliest snapshot.
        preferred_year = min(row["data_source_year"] for row in group)
        preferred = [row for row in group if row["data_source_year"] == preferred_year]
        preferred.sort(key=lambda row: (row["source_workbook"], row["source_row_number"], row["source_record_id"]))
        reference = preferred[0]
        matched_by_file = Counter()
        sufficient_evidence = all(reference[key] is not None for key in ("dr_number", "quantity", "net_sales"))
        for row in sorted(group, key=lambda row: (row["data_source_year"], row["source_workbook"], row["source_row_number"], row["source_record_id"])):
            if row["data_source_year"] > preferred_year:
                row["snapshot_reference_source_record_id"] = reference["source_record_id"]
                file_key = (row["data_source_year"], row["source_workbook"])
                matched_by_file[file_key] += 1
                if len(preferred) == 1 and sufficient_evidence and matched_by_file[file_key] == 1:
                    row["disposition"] = "EXCLUDE_HISTORICAL_SNAPSHOT_DUPLICATE"
                else:
                    row["disposition"] = "REVIEW_POSSIBLE_DUPLICATE"
                    row["quality_rule_codes"].append(
                        "INSUFFICIENT_SNAPSHOT_MATCH_EVIDENCE" if not sufficient_evidence
                        else "EXCESS_OR_AMBIGUOUS_SNAPSHOT_OCCURRENCES"
                    )
            elif len(preferred) > 1:
                row["disposition"] = "REVIEW_POSSIBLE_DUPLICATE"
                row["quality_rule_codes"].append("EXACT_BUSINESS_DUPLICATE_CANDIDATE")
            elif row["data_source_year"] == row["calendar_year"]:
                row["disposition"] = "KEEP_SOURCE_YEAR_ALIGNED"
            else:
                row["disposition"] = "KEEP_HISTORICAL_BACKFILL_CANDIDATE"
    for group in relaxed_groups.values():
        first_year = min(row["data_source_year"] for row in group)
        references = [row for row in group if row["data_source_year"] == first_year]
        reference = min(references, key=lambda row: (row["source_workbook"], row["source_row_number"]))
        for row in group:
            if row["disposition"] == "KEEP_HISTORICAL_BACKFILL_CANDIDATE" and row["data_source_year"] > first_year:
                row["disposition"] = "REVIEW_HISTORICAL_RESTATEMENT"
                row["snapshot_reference_source_record_id"] = reference["source_record_id"]
                row["quality_rule_codes"].append("CHANGED_HISTORICAL_DR_OR_MEASURES")
    for row in rows:
        if row["disposition"] == "KEEP_HISTORICAL_BACKFILL_CANDIDATE":
            row["quality_rule_codes"].append("HISTORICAL_BACKFILL_CANDIDATE")
        row["is_analysis_candidate"] = row["disposition"] in {"KEEP_SOURCE_YEAR_ALIGNED", "KEEP_HISTORICAL_BACKFILL_CANDIDATE"}
        row["quality_rule_codes"] = sorted(set(row["quality_rule_codes"]))
    return rows


def assess_sales_records(source_rows):
    """Transform verified Bronze dictionaries into the complete Silver ledger."""
    by_file = defaultdict(list)
    earliest_source_year = min(int(source["data_source_year"]) for source in source_rows)
    for source in source_rows:
        by_file[source["source_workbook"]].append(source)
    assessed = []
    for filename, sources in sorted(by_file.items()):
        sources.sort(key=lambda row: row["source_row_number"])
        parsed = [(source, *parse_csv_record(source["raw_csv_line"])) for source in sources]
        headers = [(source["source_row_number"], header_layout(fields), len(fields))
                   for source, fields, error in parsed if not error and header_layout(fields)]
        if not headers:
            raise ValueError(f"Unrecognized CSV header/layout in {filename}; inspect before changing the parser.")
        header_number, layout, header_width = headers[0]
        source_year = int(sources[0]["data_source_year"])
        expected_legacy = {2017: "legacy_2017", 2018: "legacy_2018", 2019: "legacy_2019"}
        if source_year in expected_legacy and layout != expected_legacy[source_year]:
            raise ValueError(f"Unexpected {source_year} layout {layout} in {filename}.")
        if source_year >= 2020 and not layout.startswith("modern"):
            raise ValueError(f"Unsupported modern layout {layout} in {filename}.")
        if any(item[1] != layout for item in headers):
            raise ValueError(f"Mixed layouts in {filename}; split or review the source file.")
        if layout == "legacy_2017":
            secondary = next((fields for source, fields, error in parsed if source["source_row_number"] == header_number + 1 and not error), [])
            if len(secondary) < 9 or secondary[7].strip() != "%" or secondary[8].strip().upper() != "AMOUNT":
                raise ValueError(f"2017 discount subheader is missing in {filename}.")
        for source, fields, error in parsed:
            row = blank_assessment(source)
            row["raw_fields"] = fields
            row["source_layout"] = layout
            if error:
                row.update(record_kind="CSV_PARSE_FAILURE", disposition="REVIEW_CSV_PARSE_FAILURE")
                row["quality_rule_codes"].append("MALFORMED_CSV_RECORD")
            elif not any(value.strip() for value in fields):
                row.update(record_kind="BLANK", disposition="EXCLUDE_BLANK")
            elif source["source_row_number"] < header_number:
                pass
            elif header_layout(fields) or (layout == "legacy_2017" and source["source_row_number"] == header_number + 1):
                row.update(record_kind="HEADER", disposition="EXCLUDE_HEADER")
            elif len(fields) > header_width and any(value.strip() for value in fields[header_width:]):
                row.update(record_kind="CSV_PARSE_FAILURE", disposition="REVIEW_CSV_COLUMN_MISMATCH")
                row["quality_rule_codes"].append("UNEXPECTED_NONEMPTY_CSV_COLUMNS")
            elif len(fields) < max(layout_positions(layout).values()) + 1:
                row.update(record_kind="CSV_PARSE_FAILURE", disposition="REVIEW_CSV_COLUMN_MISMATCH")
                row["quality_rule_codes"].append("MISSING_CSV_COLUMNS")
            else:
                # Totals and continuation lines are retained, never assigned a made-up product.
                summary_label = normalized_text(fields[3] if len(fields) > 3 else "") or ""
                is_summary = "SALES SUMM" in summary_label or "DISCREPANCY" in summary_label or summary_label in {"TOTAL", "GRAND TOTAL", "SUBTOTAL", "SUB-TOTAL"}
                if is_summary:
                    row.update(record_kind="SOURCE_SUMMARY", disposition="EXCLUDE_SOURCE_SUMMARY")
                else:
                    assess_transaction(row, fields, layout)
                    if row["calendar_year"] is not None and row["calendar_year"] < earliest_source_year:
                        row["disposition"] = "REVIEW_DELIVERY_DATE_BEFORE_SCOPE"
                        row["quality_rule_codes"].append("DELIVERY_DATE_BEFORE_SOURCE_SCOPE")
            assessed.append(row)
    reconcile_sales(assessed)
    assert len(assessed) == len(source_rows), "Silver lost a raw source row."
    assert Counter(row["source_record_id"] for row in assessed) == Counter(row["source_record_id"] for row in source_rows)
    assert all(row["disposition"] != "PENDING_RECONCILIATION" for row in assessed)
    return assessed


def identity_digest(rows):
    """Order-independent content check for persisted read-back, not just row counts."""
    records = [(row["dataset_id"], row["source_record_id"], row["source_file_sha256"],
                row["source_row_number"], row["raw_csv_line"]) for row in rows]
    serialized = json.dumps(sorted(records), ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

# COMMAND ----------
# Cell 4 — Verify the single Bronze snapshot before bounded driver processing.
for table_name in (BRONZE_TABLE, MANIFEST_TABLE):
    assert spark.catalog.tableExists(table_name), f"Missing {table_name}; run Bronze first."
bronze_input = spark.table(BRONZE_TABLE)
manifest_input = spark.table(MANIFEST_TABLE)
bronze_count = bronze_input.count()
assert 0 < bronze_count <= MAX_DRIVER_ROWS, "Snapshot is empty or exceeds the documented driver bound."
manifest_rows = [row.asDict(recursive=True) for row in manifest_input.limit(1001).collect()]
assert manifest_rows and len(manifest_rows) <= 1000, "Invalid manifest size."
assert sum(row["source_file_bytes"] for row in manifest_rows) <= MAX_DRIVER_BYTES, "CSV snapshot exceeds driver memory bound."
assert sum(row["raw_line_count"] for row in manifest_rows) == bronze_count, "Bronze manifest row reconciliation failed."
bronze_bytes = bronze_input.agg(F.sum(F.length(F.encode("raw_csv_line", "UTF-8"))).alias("bytes")).first()["bytes"]
assert bronze_bytes is not None and bronze_bytes <= MAX_DRIVER_BYTES
source_rows = [row.asDict(recursive=True) for row in bronze_input.collect()]
dataset_ids = {row["dataset_id"] for row in source_rows}
assert len(dataset_ids) == 1 and dataset_ids == {row["dataset_id"] for row in manifest_rows}, "Mixed or stale Bronze snapshot."
assert len({row["source_record_id"] for row in source_rows}) == bronze_count, "Duplicate Bronze source identities."
manifest_keys = {(row["source_workbook"], row["source_file_sha256"], row["data_source_year"]) for row in manifest_rows}
assert len(manifest_keys) == len(manifest_rows), "Duplicate manifest files."
observed_files = Counter((row["source_workbook"], row["source_file_sha256"], row["data_source_year"]) for row in source_rows)
assert set(observed_files) == manifest_keys, "Bronze files differ from the manifest."
for manifest in manifest_rows:
    key = (manifest["source_workbook"], manifest["source_file_sha256"], manifest["data_source_year"])
    assert observed_files[key] == manifest["raw_line_count"], f"Incomplete file {key[0]}."
    file_rows = [row for row in source_rows if row["source_workbook"] == key[0]]
    assert sorted(row["source_row_number"] for row in file_rows) == list(range(1, manifest["raw_line_count"] + 1)), f"Invalid physical row sequence in {key[0]}."
for source in source_rows:
    identity_json = json.dumps([source["source_workbook"], source["source_file_sha256"], source["source_row_number"]], sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    assert source["source_record_id"] == hashlib.sha256(identity_json.encode("utf-8")).hexdigest(), "Invalid Bronze source identity."
manifest_identity = sorted((row["source_workbook"], row["source_file_sha256"]) for row in manifest_rows)
manifest_json = json.dumps(manifest_identity, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
assert dataset_ids == {hashlib.sha256(manifest_json.encode("utf-8")).hexdigest()}, "Dataset identity differs from source manifest."
assessed_rows = assess_sales_records(source_rows)
print(f"Assessed {len(assessed_rows):,} physical source rows across {len(manifest_rows)} files.")

# COMMAND ----------
# Cell 5 — Explicit schemas and pre-publication reconciliation.
string_columns = [
    "dataset_id", "source_record_id", "source_workbook", "source_file_sha256",
    "source_path", "raw_csv_line", "source_layout", "area_raw", "product_raw",
    "dr_number_raw", "date_delivered_raw", "area", "product", "dr_number",
    "net_value_source", "record_kind", "disposition", "business_fingerprint",
    "snapshot_reference_source_record_id", "silver_version", "reporting_year_basis",
] + [key + "_raw" for key in RAW_MEASURE_FIELDS]
silver_schema = T.StructType(
    [T.StructField(name, T.StringType(), True) for name in string_columns]
    + [T.StructField(name, T.LongType(), True) for name in ("data_source_year", "source_row_number", "calendar_year", "reporting_year")]
    + [T.StructField("date_delivered", T.DateType(), True)]
    + [T.StructField(name, T.DecimalType(20, 6), True) for name in MEASURE_FIELDS + ("quantity_primary_candidate", "quantity_secondary_candidate")]
    + [T.StructField("raw_fields", T.ArrayType(T.StringType(), False), False),
       T.StructField("quality_rule_codes", T.ArrayType(T.StringType(), False), False),
       T.StructField("is_analysis_candidate", T.BooleanType(), False)]
    + [T.StructField(name, T.BooleanType(), False) for name in (
        "is_area_placeholder", "is_date_missing", "is_provisional_year_candidate")]
)
assessed_frame = spark.createDataFrame(assessed_rows, silver_schema)
clean_frame = assessed_frame.filter(F.col("is_analysis_candidate"))
clean_rows = [row for row in assessed_rows if row["is_analysis_candidate"]]
assert clean_rows, "No analytical candidates survived; inspect the assessed records before Gold."
assert len({row["business_fingerprint"] for row in clean_rows}) == len(clean_rows), "Unresolved exact business duplicates in clean output."
assert identity_digest(assessed_rows) == identity_digest(source_rows)
assert all(row["date_delivered"] and row["area"] and row["product"] for row in clean_rows)
assert len(clean_rows) + sum(not row["is_analysis_candidate"] for row in assessed_rows) == bronze_count
audit_frame = (
    assessed_frame.groupBy("dataset_id", "data_source_year", "record_kind", "disposition", "is_analysis_candidate")
    .agg(F.count("*").alias("source_row_count"),
         F.sum("quantity").alias("signed_quantity"),
         F.count("quantity").alias("rows_with_quantity"),
         F.sum("net_sales").alias("net_sales"),
         F.count("net_sales").alias("rows_with_net_sales"))
)

# COMMAND ----------
# Cell 6 — Publish dedicated candidates and validate persisted content.
spark.sql("CREATE SCHEMA IF NOT EXISTS workspace.medshield_silver")
spark.sql("CREATE SCHEMA IF NOT EXISTS workspace.medshield_audit")
for table_name, output in ((ASSESSED_TABLE, assessed_frame), (CLEAN_TABLE, clean_frame), (AUDIT_TABLE, audit_frame)):
    output.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(table_name)
saved_assessed = spark.table(ASSESSED_TABLE)
saved_clean = spark.table(CLEAN_TABLE)
saved_audit = spark.table(AUDIT_TABLE)
assert saved_assessed.count() == bronze_count
assert saved_clean.count() == len(clean_rows)
for saved, expected in ((saved_assessed, assessed_frame), (saved_clean, clean_frame), (saved_audit, audit_frame)):
    saved_ordered = saved.select(*expected.columns)
    assert saved_ordered.exceptAll(expected).limit(1).count() == 0, "Persisted content differs from the assessed output."
    assert expected.exceptAll(saved_ordered).limit(1).count() == 0, "Persisted output is missing assessed content."
identity_columns = ["dataset_id", "source_record_id", "source_file_sha256", "source_row_number", "raw_csv_line"]
assert identity_digest([row.asDict() for row in saved_assessed.select(*identity_columns).collect()]) == identity_digest(source_rows)
assert identity_digest([row.asDict() for row in saved_clean.select(*identity_columns).collect()]) == identity_digest(clean_rows)
assert saved_audit.agg(F.sum("source_row_count")).first()[0] == bronze_count
display(saved_audit.orderBy("data_source_year", "disposition"))
print("SALES SILVER RESTART")
print(f"Dataset: {next(iter(dataset_ids))}")
print(f"Source rows: {bronze_count:,}; analytical candidates: {len(clean_rows):,}")
print(f"Rows kept for audit/review only: {bronze_count - len(clean_rows):,}")
print("Historical backfills are provisional and remain labelled for Gold eligibility rules.")
print("Status: PASS_CANDIDATE_ONLY")
