from __future__ import annotations

import argparse
import gzip
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT_DIR = Path(__file__).resolve().parents[3]
DEFAULT_CANDIDATE = (
    ROOT_DIR / "data" / "medshield" / "certification" / "sales_2017_2025_v1_candidate.json.gz"
)
DEFAULT_OUTPUT_DIR = ROOT_DIR / "data" / "medshield" / "certification"
REPORT_NAME = "sales_2017_2025_v1_financial_reconciliation.json"
FLAGS_NAME = "sales_2017_2025_v1_financial_flags.json.gz"
DEFAULT_TOLERANCE = 0.02


def _round(value: float) -> float:
    return round(value, 2)


def _mapping_result(rows: list[dict[str, Any]], formula: str, tolerance: float) -> dict[str, Any]:
    matches = 0
    absolute_variance = 0.0
    aggregate_derived = 0.0
    aggregate_workbook = 0.0
    by_year: dict[str, dict[str, float]] = defaultdict(
        lambda: {"rows": 0, "matched_rows": 0, "derived_margin": 0.0, "workbook_net_income": 0.0}
    )
    for row in rows:
        net_cost = float(row.get("net_cost") or 0)
        trade_price = float(row.get("total_trade_price") or 0)
        workbook_income = float(row.get("net_income") or 0)
        derived = trade_price - net_cost if formula == "trade_price_minus_net_cost" else net_cost - trade_price
        variance = workbook_income - derived
        matched = abs(variance) <= tolerance
        matches += matched
        absolute_variance += abs(variance)
        aggregate_derived += derived
        aggregate_workbook += workbook_income
        year = str(row.get("year") or "unknown")
        by_year[year]["rows"] += 1
        by_year[year]["matched_rows"] += int(matched)
        by_year[year]["derived_margin"] += derived
        by_year[year]["workbook_net_income"] += workbook_income

    return {
        "formula": formula,
        "rows": len(rows),
        "matched_rows": matches,
        "match_rate": round(matches / len(rows), 6) if rows else 0.0,
        "aggregate_derived_margin": _round(aggregate_derived),
        "aggregate_workbook_net_income": _round(aggregate_workbook),
        "aggregate_delta": _round(aggregate_workbook - aggregate_derived),
        "mean_absolute_row_variance": _round(absolute_variance / len(rows)) if rows else 0.0,
        "by_year": {
            year: {
                "rows": int(values["rows"]),
                "matched_rows": int(values["matched_rows"]),
                "match_rate": round(values["matched_rows"] / values["rows"], 6) if values["rows"] else 0.0,
                "derived_margin": _round(values["derived_margin"]),
                "workbook_net_income": _round(values["workbook_net_income"]),
                "delta": _round(values["workbook_net_income"] - values["derived_margin"]),
            }
            for year, values in sorted(by_year.items())
        },
    }


def reconcile_financial_metrics(
    candidate_path: Path,
    output_dir: Path,
    *,
    tolerance: float = DEFAULT_TOLERANCE,
    generated_at: str | None = None,
) -> dict[str, Any]:
    if tolerance < 0:
        raise ValueError("Tolerance must be non-negative.")
    with gzip.open(candidate_path, "rt", encoding="utf-8") as handle:
        payload = json.load(handle)
    rows = [row for row in payload.get("rows", []) if row.get("publication_eligible")]
    generated = generated_at or datetime.now(timezone.utc).isoformat()

    current_mapping = _mapping_result(rows, "trade_price_minus_net_cost", tolerance)
    workbook_mapping = _mapping_result(rows, "net_cost_minus_trade_price", tolerance)
    proposed_mapping = (
        "net_cost_as_sales_value_and_total_trade_price_as_cost_basis"
        if workbook_mapping["match_rate"] > current_mapping["match_rate"]
        else "total_trade_price_as_sales_value_and_net_cost_as_cost_basis"
    )

    anomaly_counts: Counter[str] = Counter()
    financial_flags = []
    for row in rows:
        quantity = float(row.get("quantity") or 0)
        net_cost = float(row.get("net_cost") or 0)
        trade_price = float(row.get("total_trade_price") or 0)
        workbook_income = float(row.get("net_income") or 0)
        proposed_margin = net_cost - trade_price
        variance = workbook_income - proposed_margin
        flags = []
        if quantity == 0 and net_cost == 0 and trade_price == 0:
            flags.append("zero_value_transaction")
        if quantity < 0:
            flags.append("negative_quantity_credit_or_return")
        if net_cost < 0 or trade_price < 0:
            flags.append("negative_financial_value")
        if trade_price == 0 and net_cost != 0:
            flags.append("missing_trade_price_cost_basis")
        if net_cost == 0 and trade_price != 0:
            flags.append("missing_net_contract_sales_value")
        if abs(variance) > tolerance:
            flags.append("workbook_margin_mismatch")
        anomaly_counts.update(flags)
        financial_flags.append({
            "source_hash": row.get("source_hash"),
            "year": row.get("year"),
            "source_workbook": row.get("source_workbook"),
            "source_row_number": row.get("source_row_number"),
            "quantity": quantity,
            "proposed_sales_value": net_cost,
            "proposed_cost_basis": trade_price,
            "proposed_gross_margin": _round(proposed_margin),
            "proposed_gross_margin_pct": round(proposed_margin / net_cost, 6) if net_cost else None,
            "workbook_net_income": workbook_income,
            "variance": _round(variance),
            "financial_quality_status": "reconciled" if not flags else "review_required",
            "financial_quality_flags": flags,
        })

    report = {
        "dataset_id": payload.get("metadata", {}).get("dataset_id", "sales_2017_2025_v1"),
        "generated_at": generated,
        "approval_status": "proposed_pending_finance_owner_approval",
        "dashboard_financial_publication_status": "blocked",
        "tolerance_php": tolerance,
        "rows_evaluated": len(rows),
        "mapping_comparison": {
            "current_documented_assumption": current_mapping,
            "workbook_supported_candidate": workbook_mapping,
        },
        "proposed_mapping": proposed_mapping,
        "proposed_definitions": {
            "sales_value": "net_cost field (source NET CP / net contract price)",
            "cost_basis": "total_trade_price field (source TOTAL TP / transfer price)",
            "gross_margin": "net_cost - total_trade_price",
            "gross_margin_pct": "gross_margin / net_cost when net_cost is non-zero",
            "workbook_net_income": "source comparison field; retain unchanged for audit",
        },
        "anomaly_counts": dict(sorted(anomaly_counts.items())),
        "reconciled_rows": sum(not item["financial_quality_flags"] for item in financial_flags),
        "review_required_rows": sum(bool(item["financial_quality_flags"]) for item in financial_flags),
        "blocking_items": [
            "Finance/business owner must approve the proposed source-column semantics.",
            "Rows flagged workbook_margin_mismatch require quarantine or documented tolerance disposition.",
            "Dashboard revenue and gross-margin outputs must be regenerated after approval.",
            "Zero-value, returns, credits, and accounting adjustments require approved transaction types.",
        ],
        "row_flags_artifact": FLAGS_NAME,
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / REPORT_NAME).write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    with gzip.open(output_dir / FLAGS_NAME, "wt", encoding="utf-8") as handle:
        json.dump({"metadata": report, "rows": financial_flags}, handle, ensure_ascii=False)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Reconcile MedShield financial field semantics.")
    parser.add_argument("--candidate", type=Path, default=DEFAULT_CANDIDATE)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--tolerance", type=float, default=DEFAULT_TOLERANCE)
    args = parser.parse_args()
    report = reconcile_financial_metrics(args.candidate, args.output_dir, tolerance=args.tolerance)
    print(json.dumps({
        "approval_status": report["approval_status"],
        "rows_evaluated": report["rows_evaluated"],
        "proposed_mapping": report["proposed_mapping"],
        "mapping_match_rates": {
            key: value["match_rate"] for key, value in report["mapping_comparison"].items()
        },
        "review_required_rows": report["review_required_rows"],
    }, indent=2))


if __name__ == "__main__":
    main()
