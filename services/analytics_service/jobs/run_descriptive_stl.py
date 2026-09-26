"""Reproducible offline STL evidence from a validated Databricks receipt.

This job never serves local files to the dashboard or publishes Gold tables.
Missing months are not imputed. Each uninterrupted segment of at least three
annual cycles is decomposed separately; shorter segments remain excluded.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import statsmodels
from statsmodels.tsa.seasonal import STL


def month_index(period: str) -> int:
    year, month = map(int, period.split("-"))
    if not 1 <= month <= 12:
        raise ValueError(f"Invalid month: {period}")
    return year * 12 + month - 1


def decompose(rows: list[dict], minimum_months: int = 36) -> dict:
    if minimum_months < 24:
        raise ValueError("At least two complete annual cycles are required by this job")
    periods = [str(row["period"]) for row in rows]
    if len(set(periods)) != len(periods):
        raise ValueError("Duplicate monthly aggregates cannot be decomposed")
    ordered = sorted(rows, key=lambda row: month_index(row["period"]))
    segments: list[list[dict]] = []
    current: list[dict] = []
    for row in ordered:
        value = row.get("revenue")
        observed = (value is not None and math.isfinite(float(value))
                    and not row.get("missing") and row.get("evidence") != "estimate")
        consecutive = not current or month_index(row["period"]) == month_index(current[-1]["period"]) + 1
        if (not observed or not consecutive) and current:
            segments.append(current)
            current = []
        if observed:
            current.append(row)
    if current:
        segments.append(current)
    outputs = []
    excluded = []
    for segment in segments:
        if len(segment) < minimum_months:
            excluded.extend(row["period"] for row in segment)
            continue
        values = np.array([float(row["revenue"]) for row in segment])
        fit = STL(values, period=12, seasonal=13, robust=True).fit()
        components = []
        for i, row in enumerate(segment):
            components.append({
                "period": row["period"], "observed": float(values[i]),
                "trend": float(fit.trend[i]), "seasonal": float(fit.seasonal[i]),
                "residual": float(fit.resid[i]),
            })
        error = float(np.max(np.abs(values - fit.trend - fit.seasonal - fit.resid)))
        if not np.all(np.isfinite(fit.trend + fit.seasonal + fit.resid)) or error > 0.000001:
            raise ValueError("STL components failed reconstruction")
        outputs.append({"start": segment[0]["period"], "end": segment[-1]["period"],
                        "months": len(segment), "max_reconstruction_error": error, "components": components})
    return {
        "status": "candidate" if outputs else "insufficient_contiguous_history",
        "metric": "eligible_net_sales_php", "method": "STL", "period": 12,
        "seasonal_window": 13, "robust": True, "minimum_contiguous_months": minimum_months,
        "missing_policy": "no_imputation_split_at_gaps", "statsmodels_version": statsmodels.__version__,
        "unavailable_periods": [row["period"] for row in ordered if row.get("revenue") is None or row.get("missing")],
        "short_segment_periods": excluded, "segments": outputs,
        "limitations": ["Describes this candidate sales series; does not prove recurring disease-driven demand.",
                        "Observed months do not establish source completeness.",
                        "Publication and product identity gates remain separate."],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    content = args.evidence.read_bytes()
    digest = hashlib.sha256(content).hexdigest()
    expected = args.evidence.with_suffix(".sha256").read_text().strip()
    if digest != expected:
        raise ValueError("Evidence checksum mismatch")
    evidence = json.loads(content)
    snapshot = evidence["snapshot"]
    if snapshot["data_status"]["source"] != "databricks" or snapshot["data_status"]["mode"] != "live":
        raise ValueError("A live Databricks extraction receipt is required")
    result = decompose(snapshot["monthly"])
    result["source_evidence_sha256"] = digest
    result["source_generated_at"] = evidence["generated_at"]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output), "status": result["status"],
                      "segments": [{k: s[k] for k in ("start", "end", "months", "max_reconstruction_error")} for s in result["segments"]]}))


if __name__ == "__main__":
    main()
