"""Full, immutable-fact product/pricing review. Local audit output, never serving data.

Run: python review_product_sales.py --facts <facts.json> --output <new-directory>
Only the receipt is read. No warehouse access, writes, catalog approval or SKU merges.
"""
import argparse
from collections import Counter, defaultdict
from decimal import Decimal, localcontext
import hashlib
import json
from pathlib import Path

from product_review_rules import proposal_attributes, PROPOSAL_POLICY
from review_catalog import financial_partition

TOLERANCE = Decimal("0.02")  # Matches Silver financial checks; never changes a value.


def truth(value):
    return str(value).lower() == "true"


def decimal(value):
    if value is None or str(value).strip() == "":
        return None
    result = Decimal(str(value))
    if not result.is_finite():
        raise ValueError("Non-finite source amount")
    return result


def decimal_text(value):
    value = format(value, "f")
    return value.rstrip("0").rstrip(".") if "." in value else value


def assess_price(row):
    """Diagnostics only. Literal CP differs from effective net price and SKU identity."""
    fields = ("quantity", "unit_selling_price", "gross_sales", "discount_amount", "net_sales")
    quantity, cp, gross, discount, net = (decimal(row.get(field)) for field in fields)
    warnings = ["MISSING_" + field.upper() for field, value in zip(fields, (quantity, cp, gross, discount, net)) if value is None]
    for field, value in zip(fields, (quantity, cp, gross, discount, net)):
        # Zero discount is an ordinary recorded observation, not a quality warning.
        if value is not None and value == 0 and field != "discount_amount":
            warnings.append("ZERO_REPORTED_" + field.upper())
    if cp is not None and cp < 0:
        warnings.append("NEGATIVE_REPORTED_CP")
    signed = (quantity is not None and quantity < 0) or (net is not None and net < 0)
    if signed:
        warnings.append("RETURN_OR_CREDIT_CANDIDATE")
    if quantity is not None and cp is not None and gross is not None and abs(quantity * cp - gross) > TOLERANCE:
        warnings.append("REVIEW_QTY_CP_GROSS_MISMATCH")
    if gross is not None and discount is not None and net is not None and abs(gross - discount - net) > TOLERANCE:
        warnings.append("REVIEW_GROSS_DISCOUNT_NET_MISMATCH")
    adjusted = truth(row.get("is_adjusted_source"))
    if adjusted:
        warnings.append("ADJUSTED_ALLOCATION_NOT_VERIFIED_PRICING")
    if row.get("transaction_evidence") == "independently_verified_detail":
        warnings.append("IDENTITY_QUANTITY_EVIDENCE_DOES_NOT_VERIFY_PRICE")
    low_trust = truth(row.get("is_low_trust_2017")) or str(row.get("calendar_year")) == "2017"
    backfill = truth(row.get("is_historical_backfill_candidate"))
    if low_trust:
        warnings.append("LOW_TRUST_SOURCE_NOT_COMPARABLE_PRICING")
    if backfill:
        warnings.append("HISTORICAL_BACKFILL_NOT_COMPARABLE_PRICING")
    verified_unit = (row.get("identity_status") == "approved" and row.get("item_kind") == "physical_product"
                     and bool(row.get("unit_of_measure")) and bool(row.get("packaging_unit"))
                     and row.get("packaging_unit") != "Unknown" and bool(row.get("pack_count"))
                     and bool(row.get("contained_unit")))
    if not verified_unit:
        warnings.append("SELLABLE_IDENTITY_OR_UNIT_UNVERIFIED")
    original_positive = (not adjusted and not signed and quantity is not None and quantity > 0
                         and cp is not None and cp > 0 and net is not None and net > 0
                         and row.get("item_kind") != "service" and truth(row.get("is_analysis_candidate"))
                         and not truth(row.get("is_contract_label")) and truth(row.get("is_quantity_observation_eligible"))
                         and truth(row.get("is_gross_sales_eligible")) and truth(row.get("is_net_sales_eligible"))
                         and not any("MISMATCH" in warning for warning in warnings))
    comparable = (original_positive and verified_unit and not low_trust and not backfill
                  and gross is not None and discount is not None and bool(row.get("date_delivered")))
    states = {field: "missing" if value is None else "zero" if value == 0 else "negative" if value < 0 else "positive"
              for field, value in zip(fields, (quantity, cp, gross, discount, net))}
    return {"warnings": sorted(set(warnings)), "numeric_states": states, "recorded_cp_positive_original_candidate": original_positive,
            "verified_unit_price_comparison_eligible": comparable,
            "effective_net_unit_price": decimal_text(net / quantity) if comparable else None,
            "price_reason": "unknown", "customer_price_analysis": "unavailable_no_verified_account_id",
            "price_evidence": "adjusted_allocation_not_verified_price" if adjusted else "reported_source_price_not_independently_verified"}


def enrich(rows):
    keys = [r.get("source_record_id") for r in rows]
    if any(not key for key in keys) or len(set(keys)) != len(keys):
        raise ValueError("Missing/duplicate source-record ID")
    if any("pricing_review" in r for r in rows):
        raise ValueError("Source already has a pricing_review field; refuse to replace it")
    with localcontext() as context:
        context.prec = 60
        return [{**row, "pricing_review": assess_price(row)} for row in rows]


def profiles(rows):
    groups = defaultdict(list)
    for row in rows:
        if not row.get("canonical_group_id"):
            raise ValueError("Missing source product group")
        groups[row["canonical_group_id"]].append(row)
    result = []
    with localcontext() as context:
        context.prec = 60
        for group, records in sorted(groups.items()):
            candidates = [r for r in records if r["pricing_review"]["recorded_cp_positive_original_candidate"]]
            original_cp = Counter(decimal(r["unit_selling_price"]) for r in candidates)
            all_cp = Counter(decimal(r["unit_selling_price"]) for r in records if decimal(r.get("unit_selling_price")) is not None)
            estimated_cp = Counter(decimal(r["unit_selling_price"]) for r in records
                                   if truth(r["is_adjusted_source"]) and decimal(r.get("unit_selling_price")) is not None)
            positive = [decimal(r["net_sales"]) for r in records if truth(r["is_net_sales_eligible"])
                        and decimal(r.get("net_sales")) is not None and decimal(r["net_sales"]) > 0]
            net = [decimal(r["net_sales"]) for r in records if truth(r["is_net_sales_eligible"]) and decimal(r.get("net_sales")) is not None]
            titles = sorted({r["normalized_product"] for r in records})
            encode = lambda counts: [{"recorded_cp": decimal_text(value), "records": count} for value, count in sorted(counts.items())]
            price_context = []
            for cp, count in sorted(original_cp.items()):
                matching = [r for r in candidates if decimal(r["unit_selling_price"]) == cp]
                quantities = [decimal(r["quantity"]) for r in matching]
                dates = sorted(r["date_delivered"] for r in matching if r["date_delivered"])
                price_context.append({"recorded_cp": decimal_text(cp), "records": count,
                                      "first_observed_date": dates[0] if dates else None, "last_observed_date": dates[-1] if dates else None,
                                      "year_record_counts": dict(sorted(Counter(r["calendar_year"] for r in matching).items())),
                                      "min_reported_quantity": decimal_text(min(quantities)), "max_reported_quantity": decimal_text(max(quantities)),
                                      "interpretation": "Literal source quantities; no verified unit comparison or explanation of price variation"})
            result.append({"canonical_group_id": group, "identity_statuses": sorted({r["identity_status"] for r in records}),
                           "labels": titles, "raw_titles": sorted({r["product_raw"] for r in records if r["product_raw"] is not None}),
                           "proposed_attributes": {title: proposal_attributes(title) for title in titles},
                           "raw_title_proposals": {title: proposal_attributes(title) for title in sorted({r["product_raw"] for r in records if r["product_raw"] is not None})},
                           "records": len(records), "source_record_ids": sorted(r["source_record_id"] for r in records),
                           "years": sorted({int(r["calendar_year"]) for r in records}),
                           "eligible_net_sales": decimal_text(sum(net, Decimal(0))) if net else None,
                           "positive_sales_contribution": decimal_text(sum(positive, Decimal(0))) if positive else None,
                           "signed_returns_value": decimal_text(sum((v for v in net if v < 0), Decimal(0))),
                           "missing_cp_records": sum(r["unit_selling_price"] is None for r in records),
                           "zero_cp_records": sum(decimal(r["unit_selling_price"]) == 0 for r in records),
                           "adjusted_records": sum(truth(r["is_adjusted_source"]) for r in records),
                           "reported_cp_all_sources": encode(all_cp), "reported_cp_adjusted_sources": encode(estimated_cp),
                           "reported_cp_positive_original_candidates": encode(original_cp),
                           "positive_original_cp_context": price_context,
                           "varying_reported_cp_positive_original": len(original_cp) > 1,
                           "verified_unit_comparison_records": sum(r["pricing_review"]["verified_unit_price_comparison_eligible"] for r in records),
                           "warning_counts": dict(sorted(Counter(w for r in records for w in r["pricing_review"]["warnings"]).items())),
                           "decision": "retain_all_transactions_and_current_group; no_price_based_identity_change",
                           "interpretation": "Reported CP variation; unit/identity review and independent evidence needed to explain pricing. No verified customer segmentation."})
    # Review ordering is positive sales contribution; it does not approve ABC or remove signed returns.
    return sorted(result, key=lambda r: (-decimal(r["positive_sales_contribution"] or "0"), r["canonical_group_id"]))


def reconcile_warehouse(rows, warehouse):
    local = financial_partition(rows)
    if len(warehouse) != len(local):
        raise ValueError("Warehouse/local period coverage differs")
    for row in warehouse:
        key = row["month_start"] or str(row["calendar_year"])
        values = local[key]
        if int(row["records"]) != int(values["records"]):
            raise ValueError("Warehouse/local record-count mismatch: " + key)
        for field in ("net_sales", "gross_sales", "gross_margin_amount", "total_acquisition_cost"):
            if decimal(row[field]) != decimal(values.get(field)):
                raise ValueError("Warehouse/local financial mismatch: " + key + " / " + field)
    return local


def run(fact_path, output):
    payload = fact_path.read_bytes()
    sha = hashlib.sha256(payload).hexdigest()
    if sha != fact_path.with_suffix(".sha256").read_text().strip():
        raise ValueError("Fact receipt checksum mismatch")
    receipt = json.loads(payload)
    if int(receipt["latest_start"]) != receipt["release"]["fact_delta_version"] or receipt["latest_start"] != receipt["latest_end"]:
        raise ValueError("Receipt is not bound to one current fact version")
    rows = receipt["rows"]
    if any(not {"is_low_trust_2017", "is_historical_backfill_candidate"} <= row.keys() for row in rows):
        raise ValueError("Pricing receipt lacks source-trust restrictions; re-extract with current collector")
    if len(rows) != int(receipt["counts"]["records"]) or len(rows) != int(receipt["counts"]["unique_records"]):
        raise ValueError("Receipt record-count mismatch")
    enriched = enrich(rows)
    with localcontext() as context:
        context.prec = 60
        before = reconcile_warehouse(rows, receipt["warehouse_finance"])
        after = financial_partition(enriched)
        before_year = financial_partition(rows, yearly=True)
        after_year = financial_partition(enriched, yearly=True)
        if before != after or before_year != after_year:
            raise ValueError("Review changed financial partitions")
        if not all(all(new[field] == old[field] for field in old) for old, new in zip(rows, enriched)):
            raise ValueError("Review changed an original source field")
        grouped = profiles(enriched)
        if len(grouped) != int(receipt["counts"]["product_groups"]) or sum(r["records"] for r in grouped) != len(rows):
            raise ValueError("Group coverage mismatch")
        warnings = Counter(w for r in enriched for w in r["pricing_review"]["warnings"])
        years = sorted({r["calendar_year"] for r in enriched})
        yearly_price_counts = {}
        for year in years:
            observed = [r for r in enriched if r["calendar_year"] == year]
            candidates = [r for r in observed if r["pricing_review"]["recorded_cp_positive_original_candidate"]]
            cp_by_group = defaultdict(set)
            for row in candidates:
                cp_by_group[row["canonical_group_id"]].add(decimal(row["unit_selling_price"]))
            yearly_price_counts[year] = {"records": len(observed), "positive_original_price_candidate_records": len(candidates),
                                       "groups_with_multiple_reported_cp": sum(len(values) > 1 for values in cp_by_group.values())}
        summary = {"release": receipt["release"], "proposal_policy": PROPOSAL_POLICY, "fact_receipt_sha256": sha,
                   "source": "Databricks version-pinned fact; complete extraction; local audit artifacts only",
                   "records": len(rows), "groups": len(grouped),
                   "raw_titles": len({r["product_raw"] for r in rows if r["product_raw"] is not None}),
                   "raw_titles_profiled": sum(len(r["raw_title_proposals"]) for r in grouped),
                   "groups_with_varying_reported_cp_positive_original": sum(r["varying_reported_cp_positive_original"] for r in grouped),
                   "groups_with_multiple_reported_cp_all_sources": sum(len(r["reported_cp_all_sources"]) > 1 for r in grouped),
                   "verified_unit_price_comparison_records": sum(r["pricing_review"]["verified_unit_price_comparison_eligible"] for r in enriched),
                   "yearly_price_counts": yearly_price_counts,
                   "warning_counts": dict(sorted(warnings.items())),
                   "numeric_state_counts": dict(sorted(Counter(field + ":" + state for r in enriched
                                                       for field, state in r["pricing_review"]["numeric_states"].items()).items())),
                   "proposed_attribute_warning_counts": dict(sorted(Counter(w for r in grouped for a in r["proposed_attributes"].values() for w in a.get("warnings", [])).items())),
                   "reconciliation": {"warehouse_monthly": "PASS", "unchanged_source_fields": "PASS",
                                      "monthly_and_annual_eligibility_totals": "PASS", "record_and_group_counts": "PASS"},
                   "code_sha256": {str(path.name): hashlib.sha256(path.read_bytes()).hexdigest() for path in
                                   (Path(__file__), Path(__file__).with_name("product_review_rules.py"), Path(__file__).with_name("review_catalog.py"))},
                   "customer_id": "No verified account identifier in this fact; DR is a document number",
                   "approvals_created": 0, "cloud_writes": 0, "price_reason": "unknown_without_independent_evidence"}
    output.mkdir(parents=True, exist_ok=False)
    def write(name, data):
        value = (json.dumps(data, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
        (output / name).write_bytes(value)
        return hashlib.sha256(value).hexdigest()
    hashes = {"summary.json": write("summary.json", summary), "groups.json": write("groups.json", grouped),
              "record_reviews.json": write("record_reviews.json", [{"source_record_id": r["source_record_id"], "canonical_group_id": r["canonical_group_id"], **r["pricing_review"]} for r in enriched]),
              "reconciliation.json": write("reconciliation.json", {"before_monthly": before, "after_monthly": after,
                                                                     "before_annual": before_year, "after_annual": after_year})}
    write("receipt.json", {"release": receipt["release"], "input_sha256": sha, "outputs_sha256": hashes, "policy": PROPOSAL_POLICY})
    (output / "README.md").write_text(
        f"# Complete product and pricing rule review\n\nFact version {receipt['release']['fact_delta_version']}; {len(rows):,} source records; {len(grouped):,} current groups.\n\n"
        f"{summary['groups_with_varying_reported_cp_positive_original']:,} groups contain multiple recorded CP values in positive original-source candidate rows. "
        "This describes reported prices within existing groups; it does not prove identical sellable units, negotiated pricing, or a bulk discount.\n\n"
        f"Validated unit price comparison records: {summary['verified_unit_price_comparison_records']:,}. Missing values remain missing, zero remains zero, and signed returns stay in eligible net revenue.\n\n"
        "summary.json contains scan counts and limitations. groups.json contains every current group, every source-record ID, literal proposals and CP frequencies separated by provenance. "
        "record_reviews.json contains every record's diagnostics. reconciliation.json proves exact monthly/annual financial conservation and receipt.json binds output checksums.\n\n"
        "No source records, approvals, catalog master entries or warehouse tables were modified. These files are audit artifacts and are never dashboard sources.\n",
        encoding="utf-8")
    print(json.dumps({"output": str(output), **{k: summary[k] for k in ("records", "groups", "groups_with_varying_reported_cp_positive_original", "verified_unit_price_comparison_records", "reconciliation")}}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--facts", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    run(args.facts, args.output)
