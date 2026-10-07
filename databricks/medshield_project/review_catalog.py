"""Build complete, checksum-bound catalog proposals and exact reconciliation locally.
Audit artifacts only; the application never reads these files.
"""
import argparse
from collections import defaultdict
import csv
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import re

from product_catalog import RESOLUTION_POLICY, validate_master, resolve, interchange
from product_review_rules import proposal_attributes, PROPOSAL_POLICY


def truth(value):
    return str(value).lower() == "true"


def financial_partition(rows, category=False, yearly=False):
    result = defaultdict(lambda: defaultdict(lambda: Decimal(0)))
    for row in rows:
        key = str(row["calendar_year"]) if yearly else row["month_start"] or str(row["calendar_year"])
        if category:
            key += "|" + row["display_category"]
        result[key]["records"] += 1
        for measure, flag in (("net_sales", "is_net_sales_eligible"), ("gross_sales", "is_gross_sales_eligible"),
                              ("gross_margin_amount", "is_gross_margin_eligible"), ("total_acquisition_cost", "is_acquisition_cost_eligible")):
            if truth(row[flag]) and row[measure] is not None:
                result[key][measure] += Decimal(row[measure])
                result[key][measure + "_observations"] += 1
    return {key: {measure: str(amount) for measure, amount in sorted(values.items())} for key, values in sorted(result.items())}


def enrich(facts, master):
    keys = [r["source_record_id"] for r in facts]
    if len(set(keys)) != len(keys):
        raise ValueError("Source-record keys are not unique")
    return [{**row, **resolve(row["normalized_product"], row["product_key"], master),
             "transaction_evidence": "adjusted_estimated_source" if truth(row["is_adjusted_source"]) else "original_source_detail"}
            for row in facts]


def run(fact_path, evidence_path, master_path, output):
    payload = fact_path.read_bytes()
    if hashlib.sha256(payload).hexdigest() != fact_path.with_suffix(".sha256").read_text().strip():
        raise ValueError("Fact receipt hash mismatch")
    receipt = json.loads(payload)
    evidence = json.loads(evidence_path.read_text(encoding="utf-8"))
    if receipt["release"] != evidence["release"]:
        raise ValueError("Evidence must share one exact release identity")
    with master_path.open(encoding="utf-8-sig", newline="") as stream:
        master = validate_master(list(csv.DictReader(stream)))
    facts = receipt["rows"]
    enriched = enrich(facts, master)
    before, after = financial_partition(facts), financial_partition(enriched)
    assert before == after, "Monthly financial reconciliation failed"
    before_yearly, after_yearly = financial_partition(facts, yearly=True), financial_partition(enriched, yearly=True)
    assert before_yearly == after_yearly, "Annual financial reconciliation failed"
    assert all(all(new[field] == old[field] for field in old) for old, new in zip(facts,enriched)), "Source mutation"
    partitions = financial_partition(enriched, True)
    recombined = defaultdict(lambda: defaultdict(lambda: Decimal(0)))
    for key, values in partitions.items():
        for measure, amount in values.items():
            recombined[key.split("|")[0]][measure] += Decimal(amount)
    assert all(dict(recombined[key]) == {m: Decimal(v) for m,v in values.items()} for key,values in before.items())
    labels = evidence["queries"]["labels"]["rows"]
    records = defaultdict(list)
    for row in facts:
        records[row["normalized_product"]].append(row["source_record_id"])
    assert sum(len(v) for v in records.values()) == len(facts)
    families = defaultdict(list)
    for row in labels:
        families[re.sub(r"[\s\-()]", "", row["normalized_product"])].append(row["normalized_product"])
    groups = [sorted(v) for v in families.values() if len(v) > 1]
    group_by_label = {label: family for family in groups for label in family}
    ranked = sorted(labels, key=lambda r: (-Decimal(r["eligible_positive_sales"] or "0"), r["product_key"]))
    total = sum((Decimal(r["eligible_positive_sales"] or "0") for r in ranked), Decimal(0))
    cohort, running = set(), Decimal(0)
    for row in ranked:
        if running < total * Decimal(".8"):
            cohort.add(row["product_key"])
            running += Decimal(row["eligible_positive_sales"] or "0")
    proposals, exchange = [], []
    for row in ranked:
        title = row["normalized_product"]
        reasons = []
        if title in {"F6 FETAL MONITOR SINGLE", "IM70 PATIENT MONITOR W/ CAPNOGRAPH"}:
            reasons.append("Misleading printer/IT proposal: medical-equipment evidence required; monitor alone proves nothing")
        attributes = proposal_attributes(title)
        if re.search(r"HYCLENS.*WOUND|EVAPROST", title):
            reasons.append("Concentration/presentation conflict: preserve decimal and denominator literally")
        if attributes["item_kind"] == "service":
            reasons.append("Service candidate: retain revenue; verify kind before excluding physical demand")
        if attributes["packaging_unit"] != "Unknown" or attributes["pack_count"]:
            reasons.append("Packaging evidence required: capacity is not pack count")
        if title in group_by_label:
            reasons.append("Formatting-only alias proposal; missing attributes block automatic merge")
        if row["product_key"] in cohort:
            reasons.append("80% positive-sales review cohort; not approved ABC or medical market share")
        if "#" in title:
            reasons.append("Hashtag may be a size/model/specification; not proof of a contract")
        proposals.append({"raw_title": title, "product_key": row["product_key"], "status": "needs_review",
                          "proposed_attributes": attributes, "proposed_matches": group_by_label.get(title, []),
                          "reasons": reasons or ["Insufficient identity/category/packaging evidence"],
                          "source_record_ids": sorted(records[title]), "affected_records": len(records[title]),
                          "net_sales": row["eligible_net_sales"], "positive_sales": row["eligible_positive_sales"],
                          "returns_value": row["eligible_negative_sales"], "adjusted_source_records": row["adjusted_source_rows"],
                          "existing_reference_proposals": json.loads(row["reference_categories"]),
                          "priority": 0 if reasons and reasons[0].startswith("Misleading") else 1 if re.search(r"HYCLENS.*WOUND|EVAPROST", title) or attributes["item_kind"] == "service" else 2 if title in group_by_label else 3 if row["product_key"] in cohort else 4})
        for raw in json.loads(row["raw_title_variants"]):
            exchange.append(interchange(raw, row["product_key"], master))
    proposals.sort(key=lambda r: (r["priority"], -Decimal(r["positive_sales"] or "0"), r["product_key"]))
    output.mkdir(parents=True,exist_ok=True)
    def write(name, value):
        (output/name).write_text(json.dumps(value,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    write("review.json", proposals)
    write("interchange.json", exchange)
    write("reconciliation.json", {"before_monthly": before, "after_monthly": after, "before_yearly": before_yearly, "after_yearly": after_yearly, "category_partitions": partitions})
    summary = {"release": receipt["release"], "fact_receipt_sha256": hashlib.sha256(payload).hexdigest(),
               "label_evidence_sha256": hashlib.sha256(evidence_path.read_bytes()).hexdigest(),
               "preparation_master_sha256": hashlib.sha256(master_path.read_bytes()).hexdigest(),
               "resolution_policy": RESOLUTION_POLICY, "proposal_policy": PROPOSAL_POLICY, "records": len(facts), "labels": len(labels),
               "raw_titles": len(exchange), "formatting_families": len(groups), "review_cohort_labels": len(cohort),
               "cohort_positive_sales_percent": str(running/total*100), "all_positive_sales": str(total),
               "unresolved_records": sum(r["identity_status"] != "approved" for r in enriched),
               "adjusted_source_records": sum(truth(r["is_adjusted_source"]) for r in enriched),
               "unresolved_eligible_net_sales": str(sum((Decimal(r["net_sales"]) for r in enriched if r["identity_status"] != "approved" and truth(r["is_net_sales_eligible"]) and r["net_sales"] is not None),Decimal(0))),
               "monthly_financial_reconciliation": "PASS", "annual_financial_reconciliation": "PASS", "category_partition_reconciliation": "PASS",
               "source_fields_and_eligibility_preserved": "PASS", "deployed": False, "business_approved": False}
    write("summary.json", summary)
    with (output/"review.csv").open("w",encoding="utf-8",newline="") as stream:
        fields = ["priority", "raw_title", "product_key", "affected_records", "net_sales", "positive_sales", "returns_value", "reasons"]
        writer = csv.DictWriter(stream,fieldnames=fields);writer.writeheader()
        for row in proposals:
            values = {f: "; ".join(row[f]) if isinstance(row[f],list) else row[f] for f in fields}
            # Spreadsheet-formula escaping for source text; numeric financial columns remain numeric.
            for f in ("raw_title", "reasons"):
                if str(values[f]).lstrip().startswith(("=", "+", "-", "@")):
                    values[f] = "'" + values[f]
            writer.writerow(values)
    (output/"README.md").write_text("# Catalog preparation receipt\n\nLocal implementation evidence only; no live writes or approvals.\n\n```json\n"+json.dumps(summary,indent=2)+"\n```\n\nAll labels and affected source-record IDs are in review.json. Interchange imports cannot grant approval. Monthly exact-decimal financial and category partitions are in reconciliation.json. Unknown attributes require product documents, packaging evidence, and CEO review.\n",encoding="utf-8")
    print(json.dumps(summary,indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--facts",type=Path,required=True)
    parser.add_argument("--evidence",type=Path,required=True)
    parser.add_argument("--master",type=Path,default=Path(__file__).parent/"references/product_master_review.csv")
    parser.add_argument("--output",type=Path,required=True)
    args = parser.parse_args()
    run(args.facts,args.evidence,args.master,args.output)
