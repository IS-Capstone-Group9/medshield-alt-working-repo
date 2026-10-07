from __future__ import annotations

import argparse
import csv
import gzip
import json
from collections import Counter
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
DEFAULT_FULL_SALES_PATH = ROOT / "data" / "medshield" / "processed" / "sales_transactions_area_allocated.json.gz"
DEFAULT_CANDIDATE_PATH = ROOT / "outputs" / "product_classification_review" / "likely_non_medical_product_candidates.csv"
DEFAULT_MEDICAL_OUTPUT_PATH = ROOT / "data" / "medshield" / "processed" / "sales_transactions_medical_demand.json.gz"
DEFAULT_EXCLUDED_OUTPUT_PATH = ROOT / "data" / "medshield" / "processed" / "sales_transactions_non_medical_excluded.json.gz"
DEFAULT_REPORT_DIR = ROOT / "outputs" / f"medical_demand_cleaning_{date.today():%Y%m%d}"

ADDITIVE_FIELDS = ("quantity", "total_trade_price", "net_cost", "net_income", "discount", "total_cost")
FALLBACK_NON_MEDICAL_RULES = (
    ("office_stationery", ("BALLPEN", "BOND PAPER", "CORRECTION TAPE", "CLEAR BOOK", "FOLDER", "HARD COPY", "RECORD BOOK", "STAPLE WIRE")),
    ("printer_it_supplies", ("INK EPSON", "PRINTER", "FLASH DRIVE", "TONER", "CARTRIDGE")),
    ("janitorial_cleaning", ("TRASH BAG", "BATHROOM TISSUE", "BLEACH", "JANITORIAL")),
    ("equipment_appliance", ("AIRCON", "REFRIGERATOR", "CHILLER", "FURNITURE")),
    ("clothing_personal", ("T SHIRT", "UNIFORM")),
)


def read_json_gz(path: Path) -> dict[str, Any]:
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        return json.load(handle)


def write_json_gz(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(path, "wt", encoding="utf-8") as handle:
        json.dump(payload, handle, separators=(",", ":"))


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str] | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if fieldnames is None:
        fieldnames = []
        seen = set()
        for row in rows:
            for key in row:
                if key not in seen:
                    seen.add(key)
                    fieldnames.append(key)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def safe_float(value: object) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def round_num(value: float, digits: int = 4) -> float:
    return round(value + 0.0, digits)


def load_non_medical_candidates(path: Path) -> dict[str, dict[str, str]]:
    candidates: dict[str, dict[str, str]] = {}
    if not path.exists():
        return candidates
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            product = str(row.get("raw_product", "")).strip().upper()
            if product and str(row.get("forecast_eligible", "")).strip().lower() == "false":
                candidates[product] = row
    return candidates


def fallback_candidate(product: str) -> dict[str, str] | None:
    normalized = product.upper()
    for category, keywords in FALLBACK_NON_MEDICAL_RULES:
        for keyword in keywords:
            if keyword in normalized:
                return {
                    "proposed_category": category,
                    "forecast_eligible": "false",
                    "mapping_status": "needs_review",
                    "review_notes": f"Likely non-medical fallback rule matched keyword: {keyword}. Confirm with product master.",
                }
    return None


def totals(rows: list[dict[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {
        "rows": len(rows),
        "unique_products": len({str(row.get("product", "")).strip() for row in rows if row.get("product")}),
        "estimated_contract_rows": sum(1 for row in rows if row.get("allocation_status") == "estimated_backward_allocation"),
    }
    for field in ADDITIVE_FIELDS:
        result[field] = round_num(sum(safe_float(row.get(field)) for row in rows), 4)
    return result


def add_classification(row: dict[str, Any], candidate: dict[str, str] | None) -> dict[str, Any]:
    item = dict(row)
    if candidate:
        item["product_category"] = candidate.get("proposed_category", "non_medical_candidate")
        item["is_medicine"] = "false"
        item["forecast_eligible"] = "false"
        item["mapping_status"] = candidate.get("mapping_status", "needs_review")
        item["classification_source"] = "likely_non_medical_product_candidates"
        item["classification_notes"] = candidate.get("review_notes", "")
        item["medical_demand_exclusion_reason"] = "likely_non_medical_product_candidate"
    else:
        item["product_category"] = item.get("product_category") or "unreviewed_medical_or_uncategorized"
        item["is_medicine"] = item.get("is_medicine") or ""
        item["forecast_eligible"] = item.get("forecast_eligible") or "needs_review"
        item["mapping_status"] = item.get("mapping_status") or "needs_review"
        item["classification_source"] = "not_in_non_medical_candidate_list"
        item["classification_notes"] = "Retained for provisional medical-demand modeling until product master approval."
        item["medical_demand_exclusion_reason"] = ""
    return item


def exclusion_summary(excluded_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, str], dict[str, Any]] = {}
    for row in excluded_rows:
        key = (str(row.get("product_category", "")), str(row.get("product", "")))
        if key not in grouped:
            grouped[key] = {
                "product_category": key[0],
                "product": key[1],
                "row_count": 0,
                "estimated_contract_rows": 0,
                "quantity": 0.0,
                "total_trade_price": 0.0,
                "net_cost": 0.0,
                "net_income": 0.0,
            }
        item = grouped[key]
        item["row_count"] += 1
        item["estimated_contract_rows"] += 1 if row.get("allocation_status") == "estimated_backward_allocation" else 0
        for field in ("quantity", "total_trade_price", "net_cost", "net_income"):
            item[field] += safe_float(row.get(field))
    output = []
    for item in grouped.values():
        for field in ("quantity", "total_trade_price", "net_cost", "net_income"):
            item[field] = round_num(item[field], 4)
        output.append(item)
    return sorted(output, key=lambda item: item["total_trade_price"], reverse=True)


def build_split(
    full_sales_path: Path,
    candidate_path: Path,
    medical_output_path: Path,
    excluded_output_path: Path,
    report_dir: Path,
) -> dict[str, Any]:
    full_payload = read_json_gz(full_sales_path)
    rows = full_payload.get("rows", [])
    candidates = load_non_medical_candidates(candidate_path)

    medical_rows: list[dict[str, Any]] = []
    excluded_rows: list[dict[str, Any]] = []
    category_counts: Counter[str] = Counter()
    for row in rows:
        product = str(row.get("product", "")).strip().upper()
        candidate = candidates.get(product) or fallback_candidate(product)
        classified = add_classification(row, candidate)
        if candidate:
            excluded_rows.append(classified)
            category_counts[classified["product_category"]] += 1
        else:
            medical_rows.append(classified)

    generated_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    base_metadata = dict(full_payload.get("metadata", {}))
    source_dataset = str(full_sales_path.relative_to(ROOT)) if full_sales_path.is_relative_to(ROOT) else str(full_sales_path)

    medical_payload = {
        "metadata": {
            **base_metadata,
            "dataset_name": "MedShield Sales - Provisional Medical Demand",
            "source_dataset": source_dataset,
            "generated_at": generated_at,
            "classification_source": str(candidate_path.relative_to(ROOT)) if candidate_path.is_relative_to(ROOT) else str(candidate_path),
            "cleaning_status": "provisional_medical_demand_candidate_split",
            "limitations": [
                "Rows are retained when they are not in the likely non-medical candidate list.",
                "Product master approval is still required before final disease/weather model publication.",
                "Excluded rows remain available in the non-medical audit dataset.",
            ],
            "summary": totals(medical_rows),
        },
        "rows": medical_rows,
    }
    excluded_payload = {
        "metadata": {
            **base_metadata,
            "dataset_name": "MedShield Sales - Non-Medical Exclusion Audit",
            "source_dataset": source_dataset,
            "generated_at": generated_at,
            "classification_source": str(candidate_path.relative_to(ROOT)) if candidate_path.is_relative_to(ROOT) else str(candidate_path),
            "cleaning_status": "non_medical_exclusion_audit",
            "summary": totals(excluded_rows),
        },
        "rows": excluded_rows,
    }

    write_json_gz(medical_output_path, medical_payload)
    write_json_gz(excluded_output_path, excluded_payload)

    full_totals = totals(rows)
    medical_totals = totals(medical_rows)
    excluded_totals = totals(excluded_rows)
    reconciliation = {
        field: {
            "full": full_totals[field],
            "medical_demand": medical_totals[field],
            "excluded_non_medical": excluded_totals[field],
            "delta": round_num(full_totals[field] - medical_totals[field] - excluded_totals[field]),
        }
        for field in ADDITIVE_FIELDS
    }
    report = {
        "generated_at": generated_at,
        "source_dataset": source_dataset,
        "candidate_file": str(candidate_path.relative_to(ROOT)) if candidate_path.is_relative_to(ROOT) else str(candidate_path),
        "medical_output": str(medical_output_path.relative_to(ROOT)) if medical_output_path.is_relative_to(ROOT) else str(medical_output_path),
        "excluded_output": str(excluded_output_path.relative_to(ROOT)) if excluded_output_path.is_relative_to(ROOT) else str(excluded_output_path),
        "full_sales": full_totals,
        "medical_demand": medical_totals,
        "excluded_non_medical": excluded_totals,
        "excluded_category_row_counts": dict(sorted(category_counts.items())),
        "reconciliation": reconciliation,
        "status": "draft",
        "limitations": [
            "This is a provisional keyword-review split, not a fully approved product master.",
            "Use this dataset to test pharmaceutical models without obvious office/admin/equipment contamination.",
            "Do not publish final disease/weather findings until product categories are reviewed.",
        ],
    }
    write_json(report_dir / "medical_demand_cleaning_report.json", report)
    write_csv(report_dir / "non_medical_exclusion_summary.csv", exclusion_summary(excluded_rows))
    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build provisional medical-demand and non-medical exclusion datasets.")
    parser.add_argument("--full-sales-path", type=Path, default=DEFAULT_FULL_SALES_PATH)
    parser.add_argument("--candidate-path", type=Path, default=DEFAULT_CANDIDATE_PATH)
    parser.add_argument("--medical-output-path", type=Path, default=DEFAULT_MEDICAL_OUTPUT_PATH)
    parser.add_argument("--excluded-output-path", type=Path, default=DEFAULT_EXCLUDED_OUTPUT_PATH)
    parser.add_argument("--report-dir", type=Path, default=DEFAULT_REPORT_DIR)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    report = build_split(
        args.full_sales_path,
        args.candidate_path,
        args.medical_output_path,
        args.excluded_output_path,
        args.report_dir,
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
