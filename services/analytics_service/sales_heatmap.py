"""Observed monthly product quantities, with source and mapping limitations.

No zero-filling: absence of a product-month is not proof of zero demand.
No cross-product pack addition or unapproved alias merging.
"""
import csv
import gzip
import json
import math
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROCESSED = ROOT / "data/medshield/processed"
MAPPING = ROOT / "datasources/templates/product_master_mapping.csv"


def build_heatmap(rows, mappings, metadata, source_name):
    mapping = {str(row.get("raw_product", "")).strip().upper(): row for row in mappings if not row.get(None)}
    excluded = Counter()
    products = {}
    totals = defaultdict(lambda: {"quantity": 0.0, "row_count": 0})
    daily_totals = defaultdict(lambda: {"quantity": 0.0, "row_count": 0})
    for row in rows:
        if row.get("quality_status") not in {"valid", "warning"}:
            excluded["rejected_or_unclassified"] += 1
            continue
        if row.get("duplicate") is True:
            excluded["duplicate"] += 1
            continue
        if any(row.get(key) for key in ("estimated", "is_estimated_date", "is_estimated_contract_allocation", "allocation_method")):
            excluded["estimated"] += 1
            continue
        product = str(row.get("product") or "").strip()
        if not product or product.startswith("#"):
            excluded["missing_or_contract_product"] += 1
            continue
        try:
            delivered = date.fromisoformat(str(row.get("date_delivered"))[:10])
            if row.get("in_analysis_range") is False:
                raise ValueError()
            quantity = float(row.get("quantity"))
            if not math.isfinite(quantity) or quantity < 0:
                raise ValueError()
        except (ValueError, TypeError):
            excluded["invalid_date_or_quantity"] += 1
            continue
        master = mapping.get(product.upper(), {})
        category = str(master.get("product_category") or "").strip()
        status = str(master.get("mapping_status") or "unmapped").strip()
        # Malformed legacy mapping rows must not become therapeutic categories.
        if category.lower() in {"true", "false", "medicine", ""}:
            category = "Unclassified"
        elif status != "approved":
            category += " (proposed)"
        products[product] = {"id": product, "label": product, "category": category,
                             "mapping_status": status, "unit": "source units",
                             "pack_size": str(master.get("pack_size") or "")}
        area = str(row.get("area") or "Unspecified").strip()
        key = (product, delivered.strftime("%Y-%m"), area)
        totals[key]["quantity"] += quantity
        totals[key]["row_count"] += 1
        daily_key = (product, delivered.isoformat(), area)
        daily_totals[daily_key]["quantity"] += quantity
        daily_totals[daily_key]["row_count"] += 1
    monthly = [{"product": key[0], "period": key[1], "area": key[2],
                "quantity": round(value["quantity"], 4), "row_count": value["row_count"]}
               for key, value in sorted(totals.items())]
    daily = [{"product": key[0], "period": key[1], "area": key[2],
              "quantity": round(value["quantity"], 4), "row_count": value["row_count"]}
             for key, value in sorted(daily_totals.items())]
    return {
        "products": sorted(products.values(), key=lambda row: row["label"]), "monthly": monthly,
        "daily": daily,
        "source": {"file": source_name, "checksum": metadata.get("checksum"),
                   "generated_at": metadata.get("generated_at") or metadata.get("received_at"),
                   "input_rows": len(rows), "included_rows": sum(row["row_count"] for row in monthly),
                   "excluded": dict(excluded), "mapping_file": "datasources/templates/product_master_mapping.csv",
                   "metric": "Delivered quantity sold in source units; one raw product identity per view",
                   "missing_months": "Unobserved, not zero", "estimated_rows": "Excluded"},
    }


def load_observed_source():
    source = PROCESSED / "sales_transactions_area_allocated.json.gz"
    with gzip.open(source, "rt", encoding="utf-8") as handle:
        payload = json.load(handle)
    # Never silently serve an older allocated snapshot after a new sales upload.
    with (PROCESSED / "sales_dataset_status.json").open(encoding="utf-8") as handle:
        current = json.load(handle)
    if not payload["metadata"].get("checksum") or payload["metadata"]["checksum"] != current.get("checksum"):
        raise ValueError("Product-level sales snapshot is outdated. Rebuild the allocated sales layer after the latest upload.")
    return payload, str(source.relative_to(ROOT)).replace("\\", "/")


def load_heatmap():
    payload, source_name = load_observed_source()
    with MAPPING.open(encoding="utf-8-sig", newline="") as handle:
        mappings = list(csv.DictReader(handle))
    return build_heatmap(payload["rows"], mappings, payload["metadata"], source_name)
