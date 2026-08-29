from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT_DIR = Path(__file__).resolve().parents[3]
DEFAULT_CANDIDATE = (
    ROOT_DIR / "data" / "medshield" / "certification" / "sales_2017_2025_v1_candidate.json.gz"
)
DEFAULT_PRODUCT_MAPPING = ROOT_DIR / "datasources" / "templates" / "product_master_mapping.csv"
DEFAULT_AREA_MAPPING = ROOT_DIR / "datasources" / "templates" / "area_classification_mapping.csv"
DEFAULT_OUTPUT_DIR = ROOT_DIR / "data" / "medshield" / "certification"


def _bool(value: object) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes"}


def _key(value: object) -> str:
    return " ".join(str(value or "").strip().upper().split())


def _stable_id(prefix: str, value: str) -> str:
    return f"{prefix}-{hashlib.sha256(value.encode('utf-8')).hexdigest()[:12].upper()}"


def _read_mapping(path: Path, key_field: str) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return {
            _key(row.get(key_field)): row
            for row in csv.DictReader(handle)
            if _key(row.get(key_field))
        }


def _write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = list(rows[0]) if rows else []
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        if fields:
            writer.writeheader()
            writer.writerows(rows)


def build_master_data_candidates(
    candidate_path: Path,
    product_mapping_path: Path,
    area_mapping_path: Path,
    output_dir: Path,
    *,
    generated_at: str | None = None,
) -> dict[str, Any]:
    with gzip.open(candidate_path, "rt", encoding="utf-8") as handle:
        payload = json.load(handle)
    rows = [row for row in payload.get("rows", []) if row.get("publication_eligible")]
    product_mapping = _read_mapping(product_mapping_path, "raw_product")
    area_mapping = _read_mapping(area_mapping_path, "raw_area")
    generated = generated_at or datetime.now(timezone.utc).isoformat()

    product_counts: dict[str, dict[str, float]] = defaultdict(lambda: {"rows": 0, "quantity": 0.0})
    area_counts: dict[str, dict[str, float]] = defaultdict(lambda: {"rows": 0, "quantity": 0.0})
    for row in rows:
        product = _key(row.get("product"))
        area = _key(row.get("area"))
        quantity = float(row.get("quantity") or 0)
        if product:
            product_counts[product]["rows"] += 1
            product_counts[product]["quantity"] += quantity
        if area:
            area_counts[area]["rows"] += 1
            area_counts[area]["quantity"] += quantity

    product_rows = []
    for raw_product, counts in product_counts.items():
        mapping = product_mapping.get(raw_product, {})
        canonical = _key(mapping.get("canonical_sku")) or raw_product
        mapping_status = str(mapping.get("mapping_status") or "unmapped").strip().lower()
        approved = mapping_status == "approved"
        product_rows.append({
            "product_id": _stable_id("SKU", canonical),
            "raw_product": raw_product,
            "canonical_sku": canonical,
            "brand_name": mapping.get("brand_name", ""),
            "generic_name": mapping.get("generic_name", ""),
            "strength": mapping.get("strength", ""),
            "dosage_form": mapping.get("dosage_form", ""),
            "pack_size": mapping.get("pack_size", ""),
            "product_category": mapping.get("product_category", ""),
            "is_medicine": _bool(mapping.get("is_medicine")) if approved else False,
            "forecast_eligible": _bool(mapping.get("forecast_eligible")) if approved else False,
            "mapping_status": mapping_status,
            "clinical_review_required": not approved,
            "transaction_rows": int(counts["rows"]),
            "quantity": round(counts["quantity"], 4),
            "review_notes": mapping.get("review_notes", "Unmapped product; pharmacy/business review required."),
        })
    product_rows.sort(key=lambda row: (-row["transaction_rows"], row["raw_product"]))

    area_rows = []
    for raw_area, counts in area_counts.items():
        mapping = area_mapping.get(raw_area, {})
        standard_area = str(mapping.get("standard_area") or raw_area).strip()
        mapping_status = str(mapping.get("mapping_status") or "unmapped").strip().lower()
        approved = mapping_status == "approved"
        area_type = str(mapping.get("area_type") or "unmapped").strip().lower()
        area_rows.append({
            "area_id": _stable_id("AREA", _key(standard_area)),
            "raw_area": raw_area,
            "standard_area": standard_area,
            "area_type": area_type,
            "territory": mapping.get("territory", ""),
            "customer_type": mapping.get("customer_type", ""),
            "business_line": mapping.get("business_line", ""),
            "weather_eligible": approved and area_type == "territory" and _bool(mapping.get("weather_eligible")),
            "forecast_eligible": approved and area_type == "territory" and _bool(mapping.get("forecast_eligible")),
            "mapping_status": mapping_status,
            "transaction_rows": int(counts["rows"]),
            "quantity": round(counts["quantity"], 4),
            "review_notes": mapping.get("review_notes", "Unmapped area; territory/customer/business-line review required."),
        })
    area_rows.sort(key=lambda row: (-row["transaction_rows"], row["raw_area"]))

    approved_products = [row for row in product_rows if row["mapping_status"] == "approved"]
    approved_areas = [row for row in area_rows if row["mapping_status"] == "approved"]
    report = {
        "dataset_id": payload.get("metadata", {}).get("dataset_id", "sales_2017_2025_v1"),
        "generated_at": generated,
        "governance_status": "blocked_pending_master_data_approval",
        "product_master": {
            "unique_raw_products": len(product_rows),
            "mapped_products": sum(row["mapping_status"] != "unmapped" for row in product_rows),
            "approved_products": len(approved_products),
            "forecast_eligible_products": sum(bool(row["forecast_eligible"]) for row in product_rows),
            "approved_row_coverage": round(
                sum(row["transaction_rows"] for row in approved_products) / len(rows), 6
            ) if rows else 0.0,
            "candidate_file": "sales_2017_2025_v1_product_master_candidate.csv",
        },
        "area_master": {
            "unique_raw_areas": len(area_rows),
            "mapped_areas": sum(row["mapping_status"] != "unmapped" for row in area_rows),
            "approved_areas": len(approved_areas),
            "approved_territories": sum(
                row["mapping_status"] == "approved" and row["area_type"] == "territory"
                for row in area_rows
            ),
            "weather_eligible_areas": sum(bool(row["weather_eligible"]) for row in area_rows),
            "approved_row_coverage": round(
                sum(row["transaction_rows"] for row in approved_areas) / len(rows), 6
            ) if rows else 0.0,
            "candidate_file": "sales_2017_2025_v1_area_master_candidate.csv",
        },
        "blocking_items": [
            "Approve canonical SKU aliases and medicine classifications.",
            "Complete generic name, strength, dosage form, and pack-size mappings.",
            "Approve every territory/customer/business-line classification.",
            "Require pharmacy or clinical review before medicine forecast eligibility.",
            "Publish unmapped-value disposition and reviewer identity.",
        ],
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    _write_csv(output_dir / report["product_master"]["candidate_file"], product_rows)
    _write_csv(output_dir / report["area_master"]["candidate_file"], area_rows)
    (output_dir / "sales_2017_2025_v1_master_data_coverage.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Build governed MedShield master-data candidates.")
    parser.add_argument("--candidate", type=Path, default=DEFAULT_CANDIDATE)
    parser.add_argument("--product-mapping", type=Path, default=DEFAULT_PRODUCT_MAPPING)
    parser.add_argument("--area-mapping", type=Path, default=DEFAULT_AREA_MAPPING)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args()
    report = build_master_data_candidates(
        args.candidate, args.product_mapping, args.area_mapping, args.output_dir
    )
    print(json.dumps({
        "governance_status": report["governance_status"],
        "product_master": report["product_master"],
        "area_master": report["area_master"],
    }, indent=2))


if __name__ == "__main__":
    main()
