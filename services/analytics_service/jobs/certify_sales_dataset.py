from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from services.data_pipeline import _read_source, clean_sales_rows


ROOT_DIR = Path(__file__).resolve().parents[3]
DEFAULT_SOURCE_DIR = ROOT_DIR / "data" / "medshield" / "dataset_csv"
DEFAULT_OUTPUT_DIR = ROOT_DIR / "data" / "medshield" / "certification"
DATASET_ID = "sales_2017_2025_v1"
EXPECTED_AUDIT_ROWS = 44_948
YEARS = tuple(range(2017, 2026))


def _sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def _record_type(source_row: Any) -> str:
    raw = source_row.raw
    product = str(raw.get("product") or "").strip().upper()
    has_identity = any(str(raw.get(field) or "").strip() for field in ("area", "dr_number", "date_delivered"))
    has_financial_value = any(str(raw.get(field) or "").strip() for field in (
        "quantity", "total_cost", "net_cost", "total_trade_price", "net_income"
    ))
    if "SALES SUMM" in product or "DISCREPANCY" in product:
        return "reconciliation_summary"
    if not has_identity and not product and has_financial_value:
        return "source_total"
    if not has_identity and product:
        return "orphan_product"
    return "transaction_candidate"


def _issue_names(row: dict[str, Any]) -> list[str]:
    return [part.strip() for part in str(row.get("quality_notes") or "").split(";") if part.strip()]


def _round_totals(values: dict[str, float]) -> dict[str, float]:
    return {key: round(value, 2) for key, value in values.items()}


def _year_grade(metrics: dict[str, Any]) -> tuple[str, list[str]]:
    reasons: list[str] = []
    if metrics["ref_product_rows"]:
        reasons.append(f'{metrics["ref_product_rows"]} source rows contain an Excel product reference error')
    if metrics["rejected_rows"]:
        reasons.append(f'{metrics["rejected_rows"]} rows are rejected')
    if metrics["warning_rows"]:
        reasons.append(f'{metrics["warning_rows"]} accepted rows require review')
    if metrics["duplicate_rows"]:
        reasons.append(f'{metrics["duplicate_rows"]} duplicate occurrences are quarantined')
    if metrics["source_year_mismatch_rows"]:
        reasons.append(f'{metrics["source_year_mismatch_rows"]} rows are dated outside their source-file year')
    if metrics["delivery_rows_from_other_source_years"]:
        reasons.append(
            f'{metrics["delivery_rows_from_other_source_years"]} dated rows originate from another source-file year'
        )
    if metrics["missing_months"]:
        reasons.append(f'missing accepted months: {", ".join(metrics["missing_months"])}')

    source_rows = metrics["source_rows"]
    rejection_rate = metrics["rejected_rows"] / source_rows if source_rows else 1.0
    if not source_rows or rejection_rate >= 0.5 or metrics["ref_product_rows"] >= 1000:
        return "excluded", reasons
    return "usable_with_limitations", reasons or ["formal reviewer approval is pending"]


def build_certification_candidate(
    source_dir: Path,
    output_dir: Path,
    *,
    generated_at: str | None = None,
) -> dict[str, Any]:
    source_files = sorted(source_dir.glob("medshield_data_*.csv"))
    if not source_files:
        raise FileNotFoundError(f"No yearly MedShield CSV files found in {source_dir}")

    all_source_rows = []
    source_manifest = []
    record_types: Counter[str] = Counter()
    ref_rows_by_source_year: Counter[int] = Counter()

    for path in source_files:
        content = path.read_bytes()
        source_rows, stage, headers = _read_source(content, path.name)
        source_year = int(path.stem.rsplit("_", 1)[-1])
        file_record_types = Counter(_record_type(row) for row in source_rows)
        record_types.update(file_record_types)
        ref_count = sum(str(row.raw.get("product") or "").strip().upper() == "#REF!" for row in source_rows)
        ref_rows_by_source_year[source_year] += ref_count
        source_manifest.append({
            "file_name": path.name,
            "source_year": source_year,
            "sha256": _sha256(content),
            "bytes": len(content),
            "input_stage": stage,
            "extracted_rows": len(source_rows),
            "record_types": dict(sorted(file_record_types.items())),
            "headers": headers,
        })
        all_source_rows.extend(source_rows)

    cleaned_rows, quality_summary, _ = clean_sales_rows(all_source_rows, "raw_tabular_multi_file")
    for cleaned, source in zip(cleaned_rows, all_source_rows, strict=True):
        cleaned["record_type"] = _record_type(source)
        cleaned["quality_eligible"] = (
            cleaned["quality_status"] != "rejected"
            and not cleaned["duplicate"]
            and cleaned["record_type"] == "transaction_candidate"
        )
        cleaned["publication_eligible"] = False

    generated = generated_at or datetime.now(timezone.utc).isoformat()
    issue_counts: Counter[str] = Counter()
    quarantine_counts: Counter[str] = Counter()
    year_metrics: dict[int, dict[str, Any]] = {}
    financial_totals: dict[str, dict[str, float]] = defaultdict(
        lambda: {"total_trade_price": 0.0, "net_cost": 0.0, "net_income": 0.0, "quantity": 0.0}
    )

    for row in cleaned_rows:
        issue_counts.update(_issue_names(row))
        if row["quality_status"] == "rejected":
            quarantine_counts["rejected"] += 1
        if row["duplicate"]:
            quarantine_counts["duplicate_occurrence"] += 1
        if row["record_type"] != "transaction_candidate":
            quarantine_counts[row["record_type"]] += 1
    month_names = {f"{month:02d}" for month in range(1, 13)}
    for year in YEARS:
        source_rows = [row for row in cleaned_rows if row.get("data_source_year") == year]
        delivery_rows = [row for row in cleaned_rows if row.get("year") == year]
        accepted = [row for row in delivery_rows if row["quality_status"] != "rejected"]
        months = {str(row["date_delivered"])[5:7] for row in accepted if row.get("date_delivered")}
        metrics = {
            "source_rows": len(source_rows),
            "accepted_delivery_rows": len(accepted),
            "quality_eligible_rows": sum(bool(row["quality_eligible"]) for row in delivery_rows),
            "valid_rows": sum(row["quality_status"] == "valid" for row in delivery_rows),
            "warning_rows": sum(row["quality_status"] == "warning" for row in delivery_rows),
            "rejected_rows": sum(row["quality_status"] == "rejected" for row in source_rows),
            "duplicate_rows": sum(bool(row["duplicate"]) for row in delivery_rows),
            "source_year_mismatch_rows": sum(
                row.get("year") is not None and row.get("year") != row.get("data_source_year")
                for row in source_rows
            ),
            "delivery_rows_from_other_source_years": sum(
                row.get("data_source_year") is not None and row.get("data_source_year") != year
                for row in delivery_rows
            ),
            "ref_product_rows": ref_rows_by_source_year[year],
            "months_present": sorted(months),
            "missing_months": sorted(month_names - months),
        }
        grade, reasons = _year_grade(metrics)
        metrics["trust_grade"] = grade
        metrics["trust_grade_reasons"] = reasons
        year_metrics[year] = metrics

    for row in cleaned_rows:
        row_year = row.get("year")
        row["publication_eligible"] = bool(
            row["quality_eligible"]
            and row_year in year_metrics
            and year_metrics[row_year]["trust_grade"] != "excluded"
        )
        if row["publication_eligible"]:
            year = str(row_year)
            for field in financial_totals[year]:
                financial_totals[year][field] += float(row.get(field) or 0)

    for year in YEARS:
        year_metrics[year]["publication_candidate_rows"] = sum(
            bool(row["publication_eligible"]) for row in cleaned_rows if row.get("year") == year
        )

    extracted_rows = len(cleaned_rows)
    published_rows = sum(bool(row["publication_eligible"]) for row in cleaned_rows)
    manifest = {
        "dataset_id": DATASET_ID,
        "generated_at": generated,
        "analysis_period": {"start_year": YEARS[0], "end_year": YEARS[-1]},
        "publication_status": "candidate_blocked_pending_reviewer_approval",
        "approved": False,
        "source_files": source_manifest,
        "row_policy": {
            "business_reporting": "valid or warning transaction rows, excluding duplicate occurrences",
            "forecasting": "valid, geographic, approved-product rows only; downstream master-data approval required",
            "quarantine": "rejected rows, duplicate occurrences, source totals, reconciliation summaries, and orphan products",
        },
        "trust_grades": {str(year): year_metrics[year]["trust_grade"] for year in YEARS},
        "candidate_artifact": f"{DATASET_ID}_candidate.json.gz",
        "certification_report": f"{DATASET_ID}_reconciliation.json",
    }

    reconciliation = {
        "dataset_id": DATASET_ID,
        "generated_at": generated,
        "gate_status": "blocked_pending_reviewer_approval",
        "raw_audit_comparison": {
            "checklist_raw_audit_rows": EXPECTED_AUDIT_ROWS,
            "csv_rows_extracted": extracted_rows,
            "delta": extracted_rows - EXPECTED_AUDIT_ROWS,
            "explanation": "The nine supplied CSV exports contain six more parser-visible rows than the checklist audit count. Source totals and reconciliation/footer rows are now classified explicitly; the remaining six-row provenance difference requires owner confirmation.",
        },
        "row_reconciliation": {
            "extracted_rows": extracted_rows,
            "accepted_rows": quality_summary["rows_accepted"],
            "rejected_rows": quality_summary["rows_rejected"],
            "valid_rows": quality_summary["valid_rows"],
            "warning_rows": quality_summary["rows_with_warnings"],
            "duplicate_occurrences": quality_summary["duplicate_rows"],
            "accepted_duplicate_occurrences": sum(
                row["quality_status"] != "rejected" and bool(row["duplicate"])
                for row in cleaned_rows
            ),
            "publication_candidate_rows": published_rows,
            "accepted_equals_valid_plus_warning": (
                quality_summary["rows_accepted"]
                == quality_summary["valid_rows"] + quality_summary["rows_with_warnings"]
            ),
            "extracted_equals_accepted_plus_rejected": (
                extracted_rows == quality_summary["rows_accepted"] + quality_summary["rows_rejected"]
            ),
        },
        "record_types": dict(sorted(record_types.items())),
        "quarantine": dict(sorted(quarantine_counts.items())),
        "issues": dict(sorted(issue_counts.items())),
        "year_assessment": {str(year): year_metrics[year] for year in YEARS},
        "candidate_financial_totals_by_year": {
            year: _round_totals(values) for year, values in sorted(financial_totals.items())
        },
        "blocking_items": [
            "Confirm the six-row difference between the checklist audit count and supplied CSV extracts.",
            "Approve the 2018 policy for rows split across the 2018 and 2019 source files.",
            "Approve year trust grades and warning-row eligibility.",
            "Complete P2 financial reconciliation before publication.",
            "Obtain formal dataset reviewer approval.",
        ],
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / f"{DATASET_ID}_manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (output_dir / f"{DATASET_ID}_reconciliation.json").write_text(
        json.dumps(reconciliation, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    with gzip.open(output_dir / f"{DATASET_ID}_candidate.json.gz", "wt", encoding="utf-8") as handle:
        json.dump({"metadata": manifest, "rows": cleaned_rows}, handle, ensure_ascii=False)

    return reconciliation


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the MedShield 2017-2025 certification candidate.")
    parser.add_argument("--source-dir", type=Path, default=DEFAULT_SOURCE_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args()
    report = build_certification_candidate(args.source_dir, args.output_dir)
    print(json.dumps({
        "dataset_id": report["dataset_id"],
        "gate_status": report["gate_status"],
        "row_reconciliation": report["row_reconciliation"],
        "output_dir": str(args.output_dir),
    }, indent=2))


if __name__ == "__main__":
    main()
