"""Minimum descriptive gates required before predictive model execution.

Missing calendar months remain ``None``. Only a source row with an additive
quantity of zero is an observed zero. STL is limited to a single canonical SKU
and one documented regional scope so incompatible product units are never
summed together.
"""

from __future__ import annotations

import math
from collections import defaultdict
from typing import Any

import numpy as np
from statsmodels.tsa.seasonal import STL


STUDY_REGIONS = ("CALABARZON", "MIMAROPA", "Bicol")
OPERATIONAL_REGION = "Other National"
ALL_STUDY_REGIONS = "All Study Regions"
MINIMUM_MONTHS = 24
SEASONAL_PERIOD = 12


def month_number(period: str) -> int:
    year, month = map(int, period.split("-"))
    if month < 1 or month > 12:
        raise ValueError(f"Invalid month: {period}")
    return year * 12 + month - 1


def period_name(number: int) -> str:
    year, month = divmod(number, 12)
    return f"{year:04d}-{month + 1:02d}"


def latest_contiguous_periods(observed: set[int]) -> list[int]:
    if not observed:
        return []
    end = max(observed)
    start = end
    while start - 1 in observed:
        start -= 1
    return list(range(start, end + 1))


def _round(value: float | None, digits: int = 6) -> float | None:
    if value is None or not math.isfinite(value):
        return None
    return round(float(value), digits)


def _stl_rows(
    canonical_sku: str,
    region: str,
    periods: list[int],
    values: dict[int, float],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    observed = np.asarray([values[period] for period in periods], dtype=float)
    fitted = STL(observed, period=SEASONAL_PERIOD, robust=True).fit()
    residual_variance = float(np.var(fitted.resid))
    combined_variance = float(np.var(fitted.seasonal + fitted.resid))
    seasonal_strength = max(0.0, min(1.0, 1.0 - residual_variance / combined_variance)) if combined_variance else 0.0
    rows = [
        {
            "canonical_sku": canonical_sku,
            "region": region,
            "period": period_name(period),
            "observed_quantity": _round(observed[index], 4),
            "trend": _round(fitted.trend[index], 6),
            "seasonal": _round(fitted.seasonal[index], 6),
            "residual": _round(fitted.resid[index], 6),
            "method": "STL(period=12, robust=True)",
        }
        for index, period in enumerate(periods)
    ]
    return rows, {
        "method": "STL(period=12, robust=True)",
        "seasonal_period_months": SEASONAL_PERIOD,
        "seasonal_strength": _round(seasonal_strength),
    }


def build_descriptive_readiness(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Build calendar, STL, and forecast-eligibility evidence.

    Expected input rows are the enriched accepted sales rows produced by
    ``run_descriptive.enrich_rows``.
    """
    grouped: dict[tuple[str, str], dict[int, dict[str, float | int]]] = defaultdict(
        lambda: defaultdict(lambda: {"quantity": 0.0, "source_rows": 0})
    )
    mapping_status: dict[str, str] = {}
    mapping_eligible: dict[str, bool] = {}
    region_source_rows: defaultdict[str, int] = defaultdict(int)

    for row in rows:
        canonical_sku = str(row.get("canonical_sku") or "").strip()
        region = str(row.get("region") or "").strip()
        if not canonical_sku or region not in (*STUDY_REGIONS, OPERATIONAL_REGION):
            continue
        period = month_number(str(row["period"]))
        quantity = float(row.get("quantity") or 0.0)
        mapping_status[canonical_sku] = str(row.get("product_mapping_status") or "documented").strip()
        mapping_eligible[canonical_sku] = bool(row.get("product_forecast_eligible"))
        region_source_rows[region] += 1
        scopes = [region]
        if region in STUDY_REGIONS:
            scopes.append(ALL_STUDY_REGIONS)
        for scope in scopes:
            grouped[(canonical_sku, scope)][period]["quantity"] += quantity
            grouped[(canonical_sku, scope)][period]["source_rows"] += 1

    calendar_rows: list[dict[str, Any]] = []
    eligibility_rows: list[dict[str, Any]] = []
    stl_rows: list[dict[str, Any]] = []
    eligible_series: list[dict[str, Any]] = []

    for (canonical_sku, region), monthly in sorted(grouped.items()):
        observed = set(monthly)
        if not observed:
            continue
        calendar = range(min(observed), max(observed) + 1)
        missing = [period for period in calendar if period not in observed]
        contiguous = latest_contiguous_periods(observed)
        documented_product = bool(canonical_sku and mapping_status.get(canonical_sku))
        documented_region = region in (*STUDY_REGIONS, OPERATIONAL_REGION, ALL_STUDY_REGIONS)
        reasons: list[str] = []
        if not documented_product or not mapping_eligible.get(canonical_sku, False):
            reasons.append("Product mapping is not documented as forecast eligible")
        if not documented_region:
            reasons.append("Regional mapping is not documented")
        if len(contiguous) < MINIMUM_MONTHS:
            reasons.append(f"Latest gap-free window has {len(contiguous)} of {MINIMUM_MONTHS} required months")
        eligible = not reasons
        status = "Eligible for predictive baseline" if eligible else "Insufficient history"

        for period in calendar:
            item = monthly.get(period)
            value = float(item["quantity"]) if item else None
            calendar_rows.append({
                "canonical_sku": canonical_sku,
                "region": region,
                "period": period_name(period),
                "quantity": _round(value, 4),
                "source_rows": int(item["source_rows"]) if item else 0,
                "observation_status": (
                    "missing_unknown" if item is None else "observed_zero" if value == 0 else "observed"
                ),
                "in_evaluation_window": period in contiguous if eligible else False,
            })

        stl_metadata: dict[str, Any] = {
            "method": None,
            "seasonal_period_months": SEASONAL_PERIOD,
            "seasonal_strength": None,
        }
        if eligible:
            component_rows, stl_metadata = _stl_rows(
                canonical_sku,
                region,
                contiguous,
                {period: float(value["quantity"]) for period, value in monthly.items()},
            )
            stl_rows.extend(component_rows)

        eligibility = {
            "canonical_sku": canonical_sku,
            "region": region,
            "objective_evidence": region in STUDY_REGIONS,
            "measure": "quantity",
            "measure_label": "demand (delivered source units)",
            "product_mapping_status": mapping_status.get(canonical_sku, ""),
            "observed_months": len(observed),
            "calendar_months": max(observed) - min(observed) + 1,
            "missing_unknown_months": len(missing),
            "observed_zero_months": sum(
                1 for item in monthly.values() if float(item["quantity"]) == 0
            ),
            "evaluation_start": period_name(contiguous[0]) if eligible else None,
            "evaluation_end": period_name(contiguous[-1]) if eligible else None,
            "evaluation_months": len(contiguous),
            "unresolved_evaluation_gaps": 0 if eligible else None,
            "forecast_eligible": eligible,
            "status": status,
            "reason": "; ".join(reasons),
            **stl_metadata,
        }
        eligibility_rows.append(eligibility)
        if eligible:
            eligible_series.append(eligibility)

    study_region_mapping_complete = all(region_source_rows[region] > 0 for region in STUDY_REGIONS)
    objective_eligible = [item for item in eligible_series if item["objective_evidence"]]
    primary = max(
        objective_eligible,
        key=lambda item: (item["evaluation_end"] or "", item["evaluation_months"]),
        default=None,
    )
    gates = [
        {
            "gate": "approved_demand_measure",
            "passed": True,
            "evidence": "Quantity is evaluated for one canonical SKU per series; revenue is excluded from demand STL.",
        },
        {
            "gate": "complete_monthly_calendar",
            "passed": bool(calendar_rows),
            "evidence": "Every month is emitted as observed, observed_zero, or missing_unknown; missing values remain blank.",
        },
        {
            "gate": "geographic_mapping",
            "passed": study_region_mapping_complete,
            "evidence": "CALABARZON, MIMAROPA, and Bicol remain separate objective regions; Other National is comparison-only.",
        },
        {
            "gate": "stl_decomposition",
            "passed": bool(stl_rows),
            "evidence": f"{len(eligible_series)} eligible product-region series decomposed into trend, seasonality, and residual.",
        },
        {
            "gate": "forecast_eligibility",
            "passed": bool(objective_eligible),
            "evidence": f"{len(objective_eligible)} study-region series have at least {MINIMUM_MONTHS} latest consecutive observed months.",
        },
    ]
    return {
        "status": "ready" if all(gate["passed"] for gate in gates) else "not_ready",
        "measure": {
            "field": "quantity",
            "label": "demand (delivered source units)",
            "grain": "one canonical SKU × one region × calendar month",
            "revenue_label_rule": "Use net-sales forecast for net_cost; never call revenue demand.",
        },
        "minimum_observations": MINIMUM_MONTHS,
        "study_regions": list(STUDY_REGIONS),
        "operational_comparison_region": OPERATIONAL_REGION,
        "region_source_rows": dict(region_source_rows),
        "gates": gates,
        "primary_series": primary,
        "calendar_rows": calendar_rows,
        "stl_rows": stl_rows,
        "eligibility_rows": eligibility_rows,
    }
