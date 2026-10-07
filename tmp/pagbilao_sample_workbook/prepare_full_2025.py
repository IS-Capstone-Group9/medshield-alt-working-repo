import csv
import json
import math
import os
from collections import defaultdict

BASE = r"C:\Users\Adrian\projects\medshield1\medshield"
OUT = os.path.join(BASE, "tmp", "pagbilao_sample_workbook", "full_2025_staging.json")
CLASSIFICATION = os.path.join(BASE, "outputs", "product_grouping_2017_2025", "product_classification_candidates.csv")
SOURCE_2025 = os.path.join(BASE, "data", "medshield", "dataset_csv", "medshield_data_2025.csv")
MEDICAL_GROUPS = {"medicine", "medical_device", "medical_supply"}


def number(value):
    text = (value or "").strip().replace(",", "").replace("₱", "").replace("%", "")
    if text in {"", "-", "-   "}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def read_sales(path):
    with open(path, encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.reader(handle))
    header_index = next(i for i, row in enumerate(rows) if row and row[0].strip() == "Area")
    result = []
    for source_line, row in enumerate(rows[header_index + 1 :], start=header_index + 2):
        row = row + [""] * (13 - len(row))
        # Omit the report-total row and the final blank row; keep valid transactions with blank products.
        if not row[0].strip() and not row[1].strip():
            continue
        result.append({
            "source_line": source_line,
            "area": row[0].strip(),
            "dr_number": row[1].strip(),
            "date_delivered": row[2].strip(),
            "product": row[3].strip(),
            "qty": number(row[4]),
            "cp": number(row[5]),
            "total_cp": number(row[6]),
            "discount": number(row[7]) or 0.0,
            "net_cp": number(row[8]),
            "tp_unit": number(row[9]),
            "total_tp": number(row[10]),
            "net_income": number(row[11]),
            "margin_pct_source": number(row[12]),
        })
    return result


classification = {}
with open(CLASSIFICATION, encoding="utf-8-sig", newline="") as handle:
    for row in csv.DictReader(handle):
        classification[row["raw_product"].strip().upper()] = row


def class_info(product):
    row = classification.get((product or "").strip().upper())
    if not row:
        return {"group": "unresolved", "category": "unclassified_product_candidate", "confidence": "low", "rule": "no_governed_rule_match"}
    return {"group": row["product_group"], "category": row["product_category"], "confidence": row["confidence"], "rule": row["classification_rule"]}


# Build coherent reference baskets from real Government-channel medical transactions.
reference_groups = {}
for year in (2022, 2023, 2024):
    rows = read_sales(os.path.join(BASE, "data", "medshield", "dataset_csv", f"medshield_data_{year}.csv"))
    for row in rows:
        info = class_info(row["product"])
        qty = row["qty"] or 0.0
        net = row["net_cp"] or 0.0
        cost = row["total_tp"] or 0.0
        if row["area"].upper() != "GOVERNMENT" or info["group"] not in MEDICAL_GROUPS:
            continue
        if not row["product"] or not row["dr_number"] or qty <= 0 or net <= 0 or cost < 0:
            continue
        key = (year, row["dr_number"], row["date_delivered"])
        basket = reference_groups.setdefault(key, {"year": year, "dr_number": row["dr_number"], "date_delivered": row["date_delivered"], "lines": {}})
        product_line = basket["lines"].setdefault(row["product"], {
            "product": row["product"], "product_group": info["group"], "product_category": info["category"],
            "classification_confidence": info["confidence"], "classification_rule": info["rule"],
            "qty": 0.0, "net": 0.0, "cost": 0.0, "source_lines": [],
        })
        product_line["qty"] += qty
        product_line["net"] += net
        product_line["cost"] += cost
        product_line["source_lines"].append(row["source_line"])

reference_baskets = []
for basket in reference_groups.values():
    lines = list(basket["lines"].values())
    total_net = sum(line["net"] for line in lines)
    total_cost = sum(line["cost"] for line in lines)
    if total_net <= 0 or total_cost <= 0:
        continue
    basket["lines"] = sorted(lines, key=lambda line: (-line["net"], line["product"]))
    basket["total_net"] = round(total_net, 2)
    basket["total_cost"] = round(total_cost, 2)
    basket["cost_ratio"] = total_cost / total_net
    basket["product_count"] = len(lines)
    reference_baskets.append(basket)

reference_baskets.sort(key=lambda item: (item["year"], item["dr_number"], item["date_delivered"]))
for index, basket in enumerate(reference_baskets, start=1):
    basket["reference_basket_id"] = f"REF-GOV-MED-{index:04d}"


def max_products(parent_net):
    if parent_net < 25000:
        return 2
    if parent_net < 50000:
        return 3
    if parent_net < 100000:
        return 4
    if parent_net < 250000:
        return 6
    if parent_net < 500000:
        return 8
    if parent_net < 1000000:
        return 12
    if parent_net < 5000000:
        return 20
    return 30


def desired_products(parent_net):
    if parent_net < 25000:
        return 1
    if parent_net < 50000:
        return 2
    if parent_net < 100000:
        return 3
    if parent_net < 250000:
        return 4
    if parent_net < 500000:
        return 6
    if parent_net < 1000000:
        return 8
    if parent_net < 5000000:
        return 12
    return 16


def select_reference(parent_net, parent_cost):
    parent_ratio = parent_cost / parent_net if parent_net else 0.0
    cap = max_products(parent_net)
    desired = desired_products(parent_net)
    candidates = [basket for basket in reference_baskets if basket["product_count"] <= cap]
    if not candidates:
        candidates = reference_baskets

    def score(basket):
        value_score = abs(math.log(max(basket["total_net"], 0.01) / max(parent_net, 0.01)))
        ratio_score = abs(math.log(max(basket["cost_ratio"], 0.001) / max(parent_ratio, 0.001)))
        recency_score = 0.08 * (2024 - basket["year"])
        basket_size_score = 0.025 * abs(basket["product_count"] - desired)
        return value_score + 2.75 * ratio_score + recency_score + basket_size_score

    return min(candidates, key=score), score(min(candidates, key=score))


source_2025 = read_sales(SOURCE_2025)
full_rows = []
parent_rows = []
audit_rows = []
evidence_index = {}


def normalized_source_row(row):
    info = class_info(row["product"])
    net = row["net_cp"]
    cost = row["total_tp"]
    gross = row["net_income"]
    if gross is None and net is not None and cost is not None:
        gross = net - cost
    margin = (gross / net) if net not in (None, 0) and gross is not None else None
    source_id = f"SRC-2025-{row['source_line']:04d}"
    return {
        "area": row["area"], "dr_number": row["dr_number"], "date_delivered": row["date_delivered"], "product": row["product"],
        "qty": row["qty"], "cp": row["cp"], "total_cp": row["total_cp"], "discount": row["discount"], "net_cp": net,
        "tp_unit": row["tp_unit"], "total_tp": cost, "net_income": gross, "margin_pct": margin,
        "source_year": 2025, "source_csv_line": row["source_line"], "source_record_id": source_id, "parent_source_record_id": "",
        "original_product_label": row["product"], "record_type": "original_sales_row", "product_group": info["group"],
        "product_category": info["category"], "classification_confidence": info["confidence"], "product_exists_in_dataset": bool(row["product"]),
        "allocation_method": "", "allocation_confidence": "", "reference_basket_id": "", "reference_year": None,
        "reference_dr_number": "", "reference_source_lines": "", "parent_financial_anomaly": False, "pagbilao_line_verified": None,
        "canonical_sku": "", "sku_mapping_status": "needs_review" if row["product"] else "sku_resolution_pending",
        "record_status": "original_2025_source_row", "notes": "Preserved non-Pagbilao 2025 source transaction.",
    }


for source in source_2025:
    if not source["product"].upper().startswith("PAGBILAO #"):
        full_rows.append(normalized_source_row(source))
        continue

    parent_id = f"SRC-2025-{source['source_line']:04d}"
    parent_net = source["net_cp"] or 0.0
    parent_cost = source["total_tp"] or 0.0
    parent_gross = source["net_income"] if source["net_income"] is not None else parent_net - parent_cost
    parent_ratio = parent_cost / parent_net if parent_net else 0.0
    financial_anomaly = parent_net <= 0 or parent_cost < 0 or parent_cost > parent_net
    basket, match_score = select_reference(parent_net, parent_cost)
    net_scale = parent_net / basket["total_net"] if basket["total_net"] else 0.0
    cost_scale = parent_cost / basket["total_cost"] if basket["total_cost"] else 0.0
    adjustment_factor = (cost_scale / net_scale) if net_scale else None
    confidence = "low" if financial_anomaly or match_score > 2.5 or not adjustment_factor or adjustment_factor < 0.5 or adjustment_factor > 2.0 else "medium"
    children = []
    for child_index, ref_line in enumerate(basket["lines"], start=1):
        qty = round(ref_line["qty"] * net_scale, 2)
        if qty <= 0:
            qty = 0.01
        net = round(ref_line["net"] * net_scale, 2)
        cost = round(ref_line["cost"] * cost_scale, 2)
        children.append({"ref": ref_line, "qty": qty, "net": net, "cost": cost, "child_index": child_index})
    # Reconcile rounding to the parent exactly on the largest reference line.
    if children:
        target = max(range(len(children)), key=lambda i: children[i]["net"])
        children[target]["net"] = round(children[target]["net"] + (parent_net - sum(item["net"] for item in children)), 2)
        children[target]["cost"] = round(children[target]["cost"] + (parent_cost - sum(item["cost"] for item in children)), 2)

    child_net = child_cost = child_gross = 0.0
    parent_source = normalized_source_row(source)
    parent_source.update({
        "record_type": "pagbilao_parent_replaced", "record_status": "preserved_in_parent_lineage_only",
        "notes": "Excluded from Full 2025 Dataset to prevent double counting; replaced by estimated medical child rows.",
        "reference_basket_id": basket["reference_basket_id"], "reference_year": basket["year"], "reference_dr_number": basket["dr_number"],
        "parent_financial_anomaly": financial_anomaly,
    })
    parent_rows.append({**parent_source, "replacement_child_count": len(children)})

    for item in children:
        ref = item["ref"]
        qty = item["qty"]
        net = item["net"]
        cost = item["cost"]
        gross = round(net - cost, 2)
        child_net += net
        child_cost += cost
        child_gross += gross
        source_lines = "; ".join(f"{basket['year']}:{line}" for line in ref["source_lines"])
        child_id = f"EST-MED-{parent_id}-{item['child_index']:02d}"
        full_rows.append({
            "area": source["area"], "dr_number": source["dr_number"], "date_delivered": source["date_delivered"], "product": ref["product"],
            "qty": qty, "cp": round(net / qty, 2), "total_cp": net, "discount": 0.0, "net_cp": net,
            "tp_unit": round(cost / qty, 2), "total_tp": cost, "net_income": gross, "margin_pct": gross / net if net else None,
            "source_year": 2025, "source_csv_line": source["source_line"], "source_record_id": child_id, "parent_source_record_id": parent_id,
            "original_product_label": source["product"], "record_type": "estimated_pagbilao_medical_child", "product_group": ref["product_group"],
            "product_category": ref["product_category"], "classification_confidence": ref["classification_confidence"], "product_exists_in_dataset": True,
            "allocation_method": "nearest_actual_government_medical_basket_2022_2024", "allocation_confidence": confidence,
            "reference_basket_id": basket["reference_basket_id"], "reference_year": basket["year"], "reference_dr_number": basket["dr_number"],
            "reference_source_lines": source_lines, "parent_financial_anomaly": financial_anomaly, "pagbilao_line_verified": False,
            "canonical_sku": "", "sku_mapping_status": "needs_product_master_review", "record_status": "estimated_pagbilao_medical_allocation",
            "notes": "Product identity and reference basket are observed in MedShield Government data; assignment to Pagbilao is estimated.",
        })
        ev = evidence_index.setdefault(ref["product"], {
            "product": ref["product"], "product_group": ref["product_group"], "product_category": ref["product_category"],
            "classification_confidence": ref["classification_confidence"], "classification_rule": ref["classification_rule"],
            "allocation_count": 0, "reference_basket_ids": set(), "reference_years": set(), "reference_dr_numbers": set(), "source_lines": set(),
        })
        ev["allocation_count"] += 1
        ev["reference_basket_ids"].add(basket["reference_basket_id"])
        ev["reference_years"].add(basket["year"])
        ev["reference_dr_numbers"].add(basket["dr_number"])
        ev["source_lines"].update(source_lines.split("; "))

    child_net = round(child_net, 2)
    child_cost = round(child_cost, 2)
    child_gross = round(child_gross, 2)
    audit_rows.append({
        "parent_source_record_id": parent_id, "source_csv_line": source["source_line"], "dr_number": source["dr_number"],
        "date_delivered": source["date_delivered"], "original_product_label": source["product"], "parent_net_sales": parent_net,
        "parent_acquisition_cost": parent_cost, "parent_gross_profit": round(parent_gross, 2), "child_count": len(children),
        "child_net_sales": child_net, "child_acquisition_cost": child_cost, "child_gross_profit": child_gross,
        "net_delta": round(child_net - parent_net, 2), "cost_delta": round(child_cost - parent_cost, 2),
        "gross_delta": round(child_gross - parent_gross, 2), "reconciliation_status": "PASS" if abs(child_net-parent_net) <= 0.01 and abs(child_cost-parent_cost) <= 0.01 and abs(child_gross-parent_gross) <= 0.01 else "FAIL",
        "reference_basket_id": basket["reference_basket_id"], "reference_year": basket["year"], "reference_dr_number": basket["dr_number"],
        "reference_product_count": basket["product_count"], "reference_net_sales": basket["total_net"], "reference_cost_ratio": basket["cost_ratio"],
        "parent_cost_ratio": parent_ratio, "net_scale_factor": net_scale, "cost_scale_factor": cost_scale,
        "unit_cost_adjustment_factor": adjustment_factor, "match_score": match_score, "allocation_confidence": confidence,
        "parent_financial_anomaly": financial_anomaly,
    })


evidence_rows = []
for ev in evidence_index.values():
    evidence_rows.append({
        **{key: value for key, value in ev.items() if not isinstance(value, set)},
        "reference_basket_ids": "; ".join(sorted(ev["reference_basket_ids"])),
        "reference_years": "; ".join(str(value) for value in sorted(ev["reference_years"])),
        "reference_dr_numbers": "; ".join(sorted(ev["reference_dr_numbers"])),
        "source_lines": "; ".join(sorted(ev["source_lines"])),
    })
evidence_rows.sort(key=lambda row: (row["product_group"], row["product"]))

source_net = round(sum((row["net_cp"] or 0.0) for row in source_2025), 2)
source_cost = round(sum((row["total_tp"] or 0.0) for row in source_2025), 2)
source_gross = round(sum((row["net_income"] if row["net_income"] is not None else (row["net_cp"] or 0.0) - (row["total_tp"] or 0.0)) for row in source_2025), 2)
output_net = round(sum((row["net_cp"] or 0.0) for row in full_rows), 2)
output_cost = round(sum((row["total_tp"] or 0.0) for row in full_rows), 2)
output_gross = round(sum((row["net_income"] or 0.0) for row in full_rows), 2)

summary = {
    "source_transaction_rows": len(source_2025), "non_pagbilao_original_rows": len(source_2025) - len(parent_rows),
    "pagbilao_parent_rows_replaced": len(parent_rows), "estimated_pagbilao_child_rows": sum(row["child_count"] for row in audit_rows),
    "full_output_rows": len(full_rows), "unique_allocated_medical_products": len(evidence_rows),
    "source_net_sales": source_net, "output_net_sales": output_net, "net_delta": round(output_net - source_net, 2),
    "source_acquisition_cost": source_cost, "output_acquisition_cost": output_cost, "cost_delta": round(output_cost - source_cost, 2),
    "source_gross_profit": source_gross, "output_gross_profit": output_gross, "gross_delta": round(output_gross - source_gross, 2),
    "parent_reconciliation_failures": sum(row["reconciliation_status"] != "PASS" for row in audit_rows),
    "negative_margin_pagbilao_parents": sum(row["parent_financial_anomaly"] for row in audit_rows),
    "low_confidence_allocations": sum(row["allocation_confidence"] == "low" for row in audit_rows),
    "reference_basket_count": len(reference_baskets),
}

payload = {"summary": summary, "full_rows": full_rows, "parent_rows": parent_rows, "audit_rows": audit_rows, "evidence_rows": evidence_rows}
with open(OUT, "w", encoding="utf-8") as handle:
    json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))
print(json.dumps(summary, indent=2))
print(OUT)
