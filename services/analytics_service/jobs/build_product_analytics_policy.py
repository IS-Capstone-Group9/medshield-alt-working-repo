"""Build a source-bound OFFLINE routing review for every archived product label."""
from __future__ import annotations

import argparse
from collections import Counter
from decimal import Decimal
import hashlib
import json
from pathlib import Path

from services.analytics_service.product_analytics_policy import POLICY_VERSION, route_population

ROOT = Path(__file__).resolve().parents[3]


def build(source_dir: Path, output_dir: Path) -> dict:
    products_path = source_dir / "all_products.json"
    summary_path = source_dir / "summary.json"
    receipt_path = source_dir / "verification.json"
    reviewed_hashes = json.loads(receipt_path.read_text(encoding="utf-8"))["artifact_hashes"]
    for reviewed_file in (products_path, summary_path):
        relative = reviewed_file.resolve().relative_to(ROOT).as_posix()
        if hashlib.sha256(reviewed_file.read_bytes()).hexdigest() != reviewed_hashes[relative]:
            raise ValueError("Archived review input differs from its sealed verification")
    products = json.loads(products_path.read_text(encoding="utf-8"))
    source_summary = json.loads(summary_path.read_text(encoding="utf-8"))
    if source_summary["release_archived"]["fact_delta_version"] != 17:
        raise ValueError("Review this adapter before changing archived source version")
    if len(products) != source_summary["normalized_labels"]:
        raise ValueError("Source population differs from review receipt")
    if sum(p["records"] for p in products) != source_summary["rows"]:
        raise ValueError("Source record coverage differs from review receipt")
    total = sum((Decimal(p["eligible_net_sales_php"]) for p in products), Decimal(0))
    if total != Decimal(source_summary["eligible_net_sales_php"]):
        raise ValueError("Source financial population no longer reconciles")
    master = ROOT / source_summary["inputs"]["current_master"]["path"]
    if hashlib.sha256(master.read_bytes()).hexdigest() != source_summary["inputs"]["current_master"]["sha256"]:
        raise ValueError("Current preparation master changed; rebuild source review first")
    before = hashlib.sha256(products_path.read_bytes()).hexdigest()
    routes = route_population(products)
    output_dir.mkdir(parents=True, exist_ok=True)
    routing_path = output_dir / "product_routes.json"
    routing_path.write_text(json.dumps({
        "policy_version": POLICY_VERSION,
        "scope": "offline archive17 preparation only; not current fact20 certification or dashboard input",
        "source_release": source_summary["release_archived"],
        "source_products_sha256": before,
        "population": "normalized source label; not verified SKU", "products": routes,
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    assert before == hashlib.sha256(products_path.read_bytes()).hexdigest()
    assert len(routes) == len(products) and {p["product_key"] for p in routes} == {p["product_key"] for p in products}
    assert sum((Decimal(p["source_evidence"]["eligible_net_sales_php"]) for p in routes), Decimal(0)) == total
    result = {
        "status": "PASS_OFFLINE_ROUTING_ONLY", "policy_version": POLICY_VERSION,
        "source_products_sha256": before,
        "source_summary_sha256": hashlib.sha256(summary_path.read_bytes()).hexdigest(),
        "sealed_source_review_hashes_match": True,
        "routing_sha256": hashlib.sha256(routing_path.read_bytes()).hexdigest(),
        "archive_fact_version": 17, "fresh_current_fact20_certification": False,
        "current_preparation_master_sha256": hashlib.sha256(master.read_bytes()).hexdigest(),
        "products": len(routes), "source_records": sum(p["records"] for p in products),
        "financial_total_preserved_php": str(total),
        "categories": dict(Counter(p["category"] for p in products)),
        "quantity_routes": dict(Counter(p["quantity_model_status"] for p in routes)),
        "blockers": dict(Counter(reason for p in routes for reason in p["quantity_model_blockers"])),
        "unit_conversions_created": 0, "identities_merged": 0,
        "models_trained": 0, "models_activated": 0, "dashboard_or_database_changes": False,
        "per_product_file": "product_routes.json",
    }
    (output_dir / "summary.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, default=ROOT / "outputs/product_quantity_units_20261016")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "outputs/product_analytics_policy_20261017")
    args = parser.parse_args()
    result = build(args.source_dir, args.output_dir)
    print(json.dumps({key: result[key] for key in ("status", "products", "quantity_routes", "models_trained")}))
