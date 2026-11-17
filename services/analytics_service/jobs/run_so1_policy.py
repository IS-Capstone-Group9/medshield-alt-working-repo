"""Monthly primary / conditional daily SO1 diagnostics. Never a runtime fallback."""
from __future__ import annotations

import argparse
import calendar
import csv
import hashlib
import json
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from statistics import median

import numpy as np
from statsmodels.tsa.seasonal import STL

from services.analytics_service.jobs.run_descriptive_stl import decompose
from services.analytics_service.jobs.run_so1_baseline import amount, matched_yoy, nullable_sum

POLICY = {
    "version": "so1_recorded_sales_conditional_daily_v1", "monthly_period": 12,
    "daily_period": 365, "seasonal_window": 13, "robust": True, "minimum_months": 36,
    "hypothetical_blank_day_sales_fraction": "0.10", "neutral_trend_scale_fraction": 0.05,
    "material_normalized_trend_mae_pct": 10, "material_peak_shift_months": 2,
    "material_hypothetical_revenue_increase_pct": 5,
    "status": "user_authorized_offline_assumption_not_verified_source_completeness",
}


def calendar_months(start, end):
    month = date(start.year, start.month, 1)
    while month <= end:
        yield month.strftime("%Y-%m")
        month = date(month.year + (month.month == 12), month.month % 12 + 1, 1)


def classify_day(rows, active_month):
    value = nullable_sum([row["revenue"] for row in rows])
    if value is not None:
        return "recorded_eligible_revenue", value, value
    if rows:
        return "unknown_ineligible_revenue", None, None
    if active_month:
        return "assumed_zero_no_recorded_transaction", None, Decimal(0)
    return "unknown_whole_month", None, None


def build_calendar(label, days, monthly, start, end):
    result = []
    current = start
    while current <= end:
        key = current.isoformat()
        rows = days.get(key, [])
        status, original, conditional = classify_day(rows, monthly.get(key[:7]) is not None)
        result.append({"area": label, "day": key, "source_value_php": original,
                       "conditional_value_php": conditional, "status": status,
                       "source_missing": original is None, "assumed_zero": status.startswith("assumed_zero"),
                       "source_records": sum(row["records"] for row in rows),
                       "ineligible_records": sum(row["records"] - row["eligible_records"] for row in rows),
                       "adjusted_source_records": sum(row["adjusted_records"] for row in rows)})
        current += timedelta(days=1)
    return result


def complete_segments(rows, minimum_months=36):
    runs, current = [], []
    previous = None
    for row in rows:
        day = date.fromisoformat(row["day"])
        if previous is not None and day - previous != timedelta(days=1):
            raise ValueError("Daily calendar must be consecutive; do not compress missing dates")
        previous = day
        if row["conditional_value_php"] is None:
            if current:
                runs.append(current)
                current = []
        else:
            current.append(row)
    if current:
        runs.append(current)
    accepted, skipped = [], []
    for run in runs:
        first, last = date.fromisoformat(run[0]["day"]), date.fromisoformat(run[-1]["day"])
        full = [period for period in calendar_months(first, last)
                if date.fromisoformat(period + "-01") >= first and
                date(int(period[:4]), int(period[5:]), calendar.monthrange(int(period[:4]), int(period[5:]))[1]) <= last]
        if len(full) < minimum_months:
            skipped.append({"start": str(first), "end": str(last), "full_months": len(full), "reason": "short_contiguous_history"})
            continue
        selected = [row for row in run if full[0] <= row["day"][:7] <= full[-1]]
        accepted.append(selected)
    return accepted, skipped


def stress_values(segment, fraction=Decimal("0.10")):
    if fraction < 0:
        raise ValueError("Stress fraction must be nonnegative")
    positives = defaultdict(list)
    for row in segment:
        value = row["source_value_php"]
        if value is not None and value > 0:
            positives[date.fromisoformat(row["day"]).weekday()].append(value)
    all_positive = [value for values in positives.values() for value in values]
    fallback = median(all_positive) if all_positive else Decimal(0)
    result = []
    for row in segment:
        value = row["conditional_value_php"]
        if value is None:
            raise ValueError("Unknown observations cannot enter a daily fit")
        if row["assumed_zero"]:
            values = positives.get(date.fromisoformat(row["day"]).weekday(), [])
            value += fraction * (median(values) if values else fallback)
        result.append(value)
    return result


def fit_daily(segment, values):
    if len(segment) != len(values) or any(value is None for value in values):
        raise ValueError("Aligned, nonmissing daily values are required")
    source = np.array([float(value) for value in values], dtype=float)
    if len(source) < 3 * POLICY["daily_period"] or not np.all(np.isfinite(source)):
        raise ValueError("Daily annual STL requires at least three finite annual cycles")
    fit = STL(source, period=POLICY["daily_period"], seasonal=POLICY["seasonal_window"], robust=POLICY["robust"]).fit()
    error = float(np.max(np.abs(source - fit.trend - fit.seasonal - fit.resid)))
    if not np.all(np.isfinite(fit.trend + fit.seasonal + fit.resid)) or error > 0.000001:
        raise ValueError("Daily STL reconstruction failed")
    rows = [{"day": row["day"], "observed": float(source[i]), "trend": float(fit.trend[i]),
             "seasonal": float(fit.seasonal[i]), "residual": float(fit.resid[i])}
            for i, row in enumerate(segment)]
    monthly = defaultdict(lambda: {"observed": 0.0, "trend": 0.0, "seasonal": 0.0, "residual": 0.0})
    for row in rows:
        for field in monthly[row["day"][:7]]:
            monthly[row["day"][:7]][field] += row[field]
    return rows, [{"period": key, **value} for key, value in sorted(monthly.items())], error


def compare_components(reference, candidate, scale):
    if [row["period"] for row in reference] != [row["period"] for row in candidate]:
        raise ValueError("Component comparison requires identical calendar months")
    def description(rows):
        trend = np.array([row["trend"] for row in rows])
        change = float(np.mean(trend[-3:]) - np.mean(trend[:3]))
        neutral = POLICY["neutral_trend_scale_fraction"] * scale
        seasonal = defaultdict(list)
        for row in rows:
            seasonal[int(row["period"][5:])].append(row["seasonal"])
        peak = max(seasonal, key=lambda month: float(np.mean(seasonal[month])))
        return {"trend_direction": "flat" if abs(change) <= neutral else "up" if change > 0 else "down",
                "trend_change_php_per_month": change, "seasonal_peak_month": peak}
    before, after = description(reference), description(candidate)
    mae = float(np.mean([abs(a["trend"] - b["trend"]) for a, b in zip(reference, candidate)]))
    normalized = 100 * mae / scale if scale > 0 else None
    shift = abs(before["seasonal_peak_month"] - after["seasonal_peak_month"])
    shift = min(shift, 12 - shift)
    flags = []
    if normalized is not None and normalized >= POLICY["material_normalized_trend_mae_pct"]:
        flags.append("trend_level_sensitive")
    if before["trend_direction"] != after["trend_direction"]:
        flags.append("trend_direction_changes")
    if shift >= POLICY["material_peak_shift_months"]:
        flags.append("seasonal_peak_changes")
    return {"reference": before, "candidate": after, "trend_mae_php_per_month": mae,
            "normalized_trend_mae_pct": normalized, "circular_peak_shift_months": shift, "material_flags": flags}


def write_csv(path, rows):
    if not rows:
        return
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def summarize_year(label, year, rows):
    observed = sum(row["revenue_php"] is not None for row in rows)
    return {"area": label, "year": year, "revenue_php": nullable_sum([row["revenue_php"] for row in rows]),
            "recorded_months": observed, "calendar_months_in_scope": len(rows),
            "partial_year": len(rows) < 12 or observed < 12}


def execute(source_path, output):
    raw = source_path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != source_path.with_suffix(".sha256").read_text().strip():
        raise ValueError("SO1 source checksum mismatch")
    source = json.loads(raw)
    if source.get("status") != "read_only_so1_evidence_not_objective_acceptance" or source.get("source") != "databricks":
        raise ValueError("A pinned read-only Gold extraction is required")
    mapping = {row["normalized_area"]: row for row in source["queries"]["mapping"]["rows"]}
    if len(mapping) != len(source["queries"]["mapping"]["rows"]):
        raise ValueError("Ambiguous area mapping")
    days, months, annual = defaultdict(lambda: defaultdict(list)), defaultdict(list), defaultdict(list)
    checks, keys = 0, set()
    for row in source["queries"]["daily"]["rows"]:
        day, label = row["day"], row["normalized_area"]
        key = day, label, row["is_adjusted_source"]
        if key in keys or label not in mapping:
            raise ValueError("Duplicate daily aggregate or absent mapping label")
        keys.add(key)
        value = amount(row["revenue"])
        records, eligible = int(row["records"]), int(row["eligible_records"])
        if not 0 <= eligible <= records or (eligible == 0) != (value is None):
            raise ValueError("Invalid financial eligibility aggregate")
        parsed = {"revenue": value, "records": records, "eligible_records": eligible,
                  "adjusted_records": records if row["is_adjusted_source"] == "true" else 0}
        days[label][day].append(parsed)
        days["COMPANY"][day].append(parsed)
        months[label, day[:7]].append(parsed)
        months["COMPANY", day[:7]].append(parsed)
        annual[day[:4]].append(parsed)
        checks += 1
    monthly_controls = source["queries"]["monthly_control"]["rows"]
    if {(r["normalized_area"], r["month"][:7]) for r in monthly_controls} != {key for key in months if key[0] != "COMPANY"}:
        raise ValueError("Monthly SQL population differs from daily aggregates")
    for row in monthly_controls:
        rows = months[row["normalized_area"], row["month"][:7]]
        assert nullable_sum([r["revenue"] for r in rows]) == amount(row["revenue"])
        assert sum(r["records"] for r in rows) == int(row["records"])
        assert sum(r["eligible_records"] for r in rows) == int(row["eligible_records"])
        checks += 3
    for row in source["queries"]["annual_control"]["rows"]:
        rows = annual[row["year"]]
        assert nullable_sum([r["revenue"] for r in rows]) == amount(row["revenue"])
        assert sum(r["records"] for r in rows) == int(row["records"])
        assert sum(r["eligible_records"] for r in rows) == int(row["eligible_records"])
        checks += 3
    start = date.fromisoformat(source["study_start"])
    last = date.fromisoformat(max(row["day"] for row in source["queries"]["daily"]["rows"]))
    end = date(last.year, last.month, calendar.monthrange(last.year, last.month)[1])
    periods = list(calendar_months(start, end))
    monthly_rows, annual_rows, yoy_rows, monthly_components = [], [], [], []
    monthly_stl, month_lookup = {}, {}
    # Original labels support their own recorded-sales series, not verified regional claims.
    original_labels = bool(source['release'].get('original_itemized'))
    daily_labels = ["COMPANY"] + sorted(label for label, row in mapping.items()
                                         if row["proposed_area_type"] == "territory"
                                         or original_labels and row["proposed_area_type"] == "recorded_source_label")
    for label in ["COMPANY"] + sorted(mapping):
        values = {}
        for period in periods:
            selected = months.get((label, period), [])
            value = nullable_sum([r["revenue"] for r in selected])
            values[period] = value
            monthly_rows.append({"area": label, "period": period, "revenue_php": value,
                                 "records": sum(r["records"] for r in selected),
                                 "eligible_records": sum(r["eligible_records"] for r in selected),
                                 "adjusted_records": sum(r["adjusted_records"] for r in selected), "missing": value is None})
        month_lookup[label] = values
        for year in range(start.year, end.year + 1):
            selected = [row for row in monthly_rows if row["area"] == label and row["period"].startswith(str(year))]
            annual_rows.append(summarize_year(label, year, selected))
            if year < end.year:
                yoy_rows.append({"area": label, **matched_yoy(values, year, year + 1)})
        if label in daily_labels:
            result = decompose([{"period": period, "revenue": value, "missing": value is None} for period, value in values.items()])
            monthly_stl[label] = {key: value for key, value in result.items() if key != "segments"}
            monthly_stl[label]["segments"] = [{key: value for key, value in s.items() if key != "components"} for s in result["segments"]]
            for segment in result["segments"]:
                monthly_components.extend({"area": label, **row} for row in segment["components"])
    output.mkdir(parents=True, exist_ok=True)
    protocol_bytes = (json.dumps(POLICY, indent=2) + "\n").encode()
    protocol_path = output / "protocol.json"
    if protocol_path.exists() and protocol_path.read_bytes() != protocol_bytes:
        raise ValueError("Frozen protocol changed; use a new output directory")
    protocol_path.write_bytes(protocol_bytes)
    calendars, components, comparisons, daily_summaries = [], [], [], {}
    for label in daily_labels:
        calendar_rows = build_calendar(label, days[label], month_lookup[label], start, end)
        calendars.extend(calendar_rows)
        segments, skipped = complete_segments(calendar_rows, POLICY["minimum_months"])
        daily_summaries[label] = {"status_counts": dict(Counter(row["status"] for row in calendar_rows)),
                                  "partial_eligibility_days": sum(row["ineligible_records"] > 0 and row["source_value_php"] is not None for row in calendar_rows),
                                  "skipped_segments": skipped, "fitted_segments": []}
        for number, segment in enumerate(segments):
            identity = f"{label}:{segment[0]['day']}:{segment[-1]['day']}"
            print(json.dumps({"fitting": identity, "days": len(segment)}), flush=True)
            values = [row["conditional_value_php"] for row in segment]
            stress = stress_values(segment, Decimal(POLICY["hypothetical_blank_day_sales_fraction"]))
            baseline_daily, baseline_monthly, error = fit_daily(segment, values)
            stress_daily, stress_monthly, stress_error = fit_daily(segment, stress)
            period_keys = [row["period"] for row in baseline_monthly]
            refit = decompose([{"period": key, "revenue": month_lookup[label][key], "missing": False} for key in period_keys])
            assert len(refit["segments"]) == 1
            reference = refit["segments"][0]["components"]
            scale = float(np.mean([abs(row["observed"]) for row in reference]))
            full_context = [point for point in monthly_components
                            if point["area"] == label and point.get("comparison_segment") is None and point["period"] in period_keys]
            if len(full_context) != len(reference):
                raise ValueError("Full-history monthly context must cover the comparison months")
            zero_total, stress_total = sum(values, Decimal(0)), sum(stress, Decimal(0))
            uplift = float(100 * (stress_total - zero_total) / abs(zero_total)) if zero_total else None
            temporal = compare_components(reference, baseline_monthly, scale)
            sensitivity = compare_components(baseline_monthly, stress_monthly, scale)
            if uplift is not None and uplift >= POLICY["material_hypothetical_revenue_increase_pct"]:
                sensitivity["material_flags"].append("hypothetical_revenue_level_sensitive")
            row = {"segment_id": identity, "area": label, "start": segment[0]["day"], "end": segment[-1]["day"],
                   "months": len(reference), "days": len(segment), "assumed_zero_days": sum(r["assumed_zero"] for r in segment),
                   "recorded_php": str(zero_total), "hypothetical_stress_php": str(stress_total), "stress_uplift_pct": uplift,
                   "baseline_reconstruction_error": error, "stress_reconstruction_error": stress_error,
                   "monthly_vs_daily": temporal, "zero_vs_missing_sale_stress": sensitivity,
                   "monthly_fit_context_check": compare_components(full_context, reference, scale)}
            comparisons.append(row)
            daily_summaries[label]["fitted_segments"].append(identity)
            for scenario, fitted in [("assumed_zero", baseline_daily), ("hypothetical_missing_sales_stress", stress_daily)]:
                components.extend({"area": label, "segment_id": identity, "scenario": scenario,
                                   "assumed_zero_source_day": segment[i]["assumed_zero"], **point} for i, point in enumerate(fitted))
            for a, b, c in zip(reference, baseline_monthly, stress_monthly):
                assert abs(a["observed"] - b["observed"]) <= 0.000001
                checks += 1
                for scenario, point in [("matched_monthly_primary", a), ("daily_zero_aggregated", b), ("daily_stress_aggregated", c)]:
                    monthly_components.append({"area": label, "period": point["period"], "observed": point["observed"],
                                               "trend": point["trend"], "seasonal": point["seasonal"], "residual": point["residual"],
                                               "comparison_segment": identity, "scenario": scenario})
    # Every row has a stable CSV schema, including the full-history primary components.
    for row in monthly_components:
        row.setdefault("comparison_segment", "full_history_primary")
        row.setdefault("scenario", "monthly_primary")
    write_csv(output / "monthly-baseline.csv", monthly_rows)
    write_csv(output / "annual-baseline.csv", annual_rows)
    write_csv(output / "matched-yoy.csv", [{**row, "common_months": ";".join(map(str, row["common_months"]))} for row in yoy_rows])
    write_csv(output / "daily-calendar.csv", calendars)
    write_csv(output / "daily-components.csv", components)
    write_csv(output / "monthly-components.csv", monthly_components)
    original = {"start": "2021-01", "end": "2025-12", "revenue_php": str(nullable_sum([
        row["revenue_php"] for row in monthly_rows if row["area"] == "COMPANY" and "2021-01" <= row["period"] <= "2025-12"]))}
    summary = {"generated_at": datetime.now(timezone(timedelta(hours=8))).isoformat(), "status": "actions_1_4_executed_offline_not_objective_acceptance",
               "source_sha256": digest, "release": source["release"], "population": source["population"],
               "protocol": POLICY, "protocol_sha256": hashlib.sha256(protocol_bytes).hexdigest(),
               "period_start": str(start), "period_end": str(end), "latest_delivery": str(last),
               "mapping": mapping, "monthly_primary": monthly_stl, "daily_summary": daily_summaries,
               "comparisons": comparisons, "original_window": original, "integrity_checks_passed": checks,
               "total_recorded_php": str(nullable_sum([r["revenue_php"] for r in monthly_rows if r["area"] == "COMPANY"])),
               "limits": ["Recorded sales; blank-day zeros are assumptions, not verified absence of actual sales.",
                          "Stress values are hypothetical and never replace recorded observations.",
                          "365-day annual STL approximates the calendar and does not isolate weekly/holiday effects.",
                          "Geographic labels retain their original review/provenance status.",
                          "Full-series diagnostic fits are not origin-safe forecast features or forecast accuracy results.",
                          "No runtime, source, reference, warehouse or model-publication change."]}
    (output / "results.json").write_text(json.dumps(summary, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps({"status": summary["status"], "period_end": str(end), "daily_fitted_segments": len(comparisons),
                      "monthly_primary_series": len(monthly_stl), "checks_passed": checks}), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    execute(args.source, args.output)


if __name__ == "__main__":
    main()
