"""Offline product analysis routing; no model fitting, serving or approval writes.

Policy thresholds are proposed screening rules, not learned optima or business
acceptance. A routing result never grants publication or procurement permission.
"""
from __future__ import annotations

from copy import deepcopy
from decimal import Decimal
import math
import re
from typing import Any

POLICY_VERSION = "product_analytics_routing_v1_proposed"
MIN_SCREENING_MONTHS = 24
SEASONAL_SCREENING_MONTHS = 36
INTERMITTENT_ZERO_SHARE = 0.5

CATEGORY_CONTEXT = {
    "medicine": "Medicine-category sales; clinical necessity and disease effects require separate reviewed evidence",
    "medical_supply": "Supply sales; fulfilled quantity is not consumption or unconstrained demand",
    "medical_equipment": "Equipment sales may be project-driven; do not infer recurring consumable demand",
    "non_medical": "Keep nonmedical commercial reporting separate from medicine-demand cohorts",
    "unclassified": "Keep financial contribution visible while underlying category remains unresolved",
}


def _month_index(value: str) -> int:
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", value):
        raise ValueError("Use exact YYYY-MM periods")
    year, month = map(int, value.split("-"))
    return year * 12 + month - 1


def screen_quantity_series(
    observations: list[dict[str, Any]], *, origin: str,
    coverage_approved: bool, quantity_evidence_approved: bool,
) -> dict[str, Any]:
    """Screen one consistently identified product/presentation at one origin.

    Every calendar month must be present and coverage-approved. Only explicit
    observed zero is a zero. Reject post-origin observations and duplicate months
    instead of silently selecting or merging them. No imputation is performed.
    """
    origin_index = _month_index(origin)
    reasons: list[str] = []
    if coverage_approved is not True:
        reasons.append("monthly_coverage_not_approved")
    if quantity_evidence_approved is not True:
        reasons.append("historical_quantity_evidence_not_approved")
    values: dict[int, float] = {}
    for row in observations:
        period = _month_index(row["period"])
        if period > origin_index:
            reasons.append("post_origin_observation")
        if period in values:
            reasons.append("duplicate_month")
        value = row.get("quantity")
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            reasons.append("unknown_or_nonfinite_quantity")
            continue
        if value < 0:
            reasons.append("signed_quantity_needs_separate_adjustment_review")
        if row.get("coverage_approved") is not True:
            reasons.append("monthly_coverage_not_approved")
        values[period] = value
    if not observations:
        reasons.append("monthly_series_not_supplied")
    elif values:
        expected = set(range(min(values), origin_index + 1))
        if set(values) != expected:
            reasons.append("missing_month_or_stale_origin")
    reasons = sorted(set(reasons))
    profile: dict[str, Any] = {
        "status": "blocked" if reasons else "screened",
        "reasons": reasons, "origin": origin, "months": len(values),
        "pattern": "not_assessed", "zero_share": None,
        "candidate_methods": [], "fit_performed": False,
    }
    if reasons:
        return profile
    n = len(values)
    zero_share = sum(value == 0 for value in values.values()) / n
    profile["zero_share"] = zero_share
    if zero_share == 1:
        profile.update(pattern="all_observed_zero", status="descriptive_only")
        profile["reasons"] = ["no_positive_sales_for_model_comparison"]
    elif n < MIN_SCREENING_MONTHS:
        profile.update(pattern="short_history", status="descriptive_only")
        profile["reasons"] = ["below_proposed_24_month_screening_rule"]
    else:
        profile["candidate_methods"] = ["last_value", "recent_mean_3", "recent_mean_6", "simple_exponential_smoothing"]
        if zero_share >= INTERMITTENT_ZERO_SHARE:
            profile["pattern"] = "intermittent_observed_sales"
            profile["candidate_methods"] += ["croston_sba", "tsb"]
        else:
            profile["pattern"] = "regular_observed_sales"
            profile["candidate_methods"] += ["damped_ets"]
        if n >= SEASONAL_SCREENING_MONTHS:
            profile["candidate_methods"] += ["seasonal_naive_12", "seasonal_ets", "seasonal_arima"]
        profile["status"] = "candidate_comparison_design_required"
    return profile


def route_product(
    product: dict[str, Any], *, observations: list[dict[str, Any]] | None = None,
    origin: str | None = None, coverage_approved: bool = False,
    quantity_evidence_approved: bool = False,
) -> dict[str, Any]:
    """Choose permitted interpretation for an exact source-label review row.

    Approval flags are inputs from a separately reviewed contract. Literal
    wording and price differences never create them. No cross-label merge or
    historical conversion is attempted, including a default pack size of one.
    """
    required = ("product_key", "source_label", "category", "category_status", "identity_status", "unit_status")
    if any(not product.get(key) for key in required):
        raise ValueError("Missing product identity or review status")
    blocks = []
    identity_ok = product["identity_status"] == "approved" and bool(product.get("canonical_sku"))
    unit_ok = product["unit_status"] == "approved" and bool(product.get("current_unit_of_measure"))
    for ok, reason in [
        (identity_ok, "sellable_identity_not_approved"),
        (unit_ok, "historical_sales_unit_not_approved"),
        (product["category_status"] == "approved" and product["category"] != "unclassified", "resolved_category_not_approved"),
        (product.get("item_kind_status") == "approved" and product.get("item_kind") == "physical_product", "physical_item_kind_not_approved"),
        (product.get("current_forecast_eligible") is True, "forecast_suitability_not_approved"),
        (quantity_evidence_approved is True, "historical_quantity_evidence_not_approved"),
    ]:
        if not ok:
            blocks.append(reason)
    is_service = product.get("item_kind_status") == "approved" and product.get("item_kind") == "service"
    if is_service:
        blocks.append("service_has_no_physical_replenishment_target")
    result: dict[str, Any] = {
        "policy_version": POLICY_VERSION,
        "product_key": product["product_key"], "source_label": product["source_label"],
        "category": product["category"],
        "category_interpretation": CATEGORY_CONTEXT.get(product["category"], "Use reviewed category only; do not infer clinical or consumption behavior"),
        "identity_grain": "reviewed_sellable_identity" if identity_ok else "unresolved_source_label",
        "source_evidence": deepcopy({key: product.get(key) for key in (
            "source_reference", "records", "adjusted_records", "eligible_net_sales_php",
            "original_positive_observation_months", "finding", "outer_presentation_clue",
            "identity_status", "unit_status", "current_unit_of_measure", "current_forecast_eligible",
        )}),
        "descriptive_methods": ["eligible_recorded_net_sales", "signed_adjustments_separate", "observed_month_coverage", "source_label_contribution"],
        "conditional_methods": {
            "gross_margin": "same_margin_eligible_rows_for_profit_and_revenue",
            "yoy": "matched_observed_months_and_exact_date_boundaries",
            "pareto_abc": "positive_sales_denominator_preserve_negative_adjustments_separately",
            "recorded_quantity": "same_source_label_only_source_unit_unverified_until_approved",
            "price_comparison": "reviewed_identical_package_unit_dates_and_price_eligibility_only",
            "territory": "reviewed_geography_only_unmapped_remains_visible",
        },
        "quantity_model_status": "blocked", "quantity_model_blockers": blocks,
        "series_profile": None,
        "revenue_model_status": "not_assessed_no_monthly_financial_series_or_evaluation_supplied",
        "quantity_conversion": None, "cross_product_quantity_total_allowed": False,
        "clinical_or_urgency_inference_allowed": False,
        "external_regressors_status": "requires_approved_geo_time_join_and_issue_time_features",
        "procurement_status": "blocked_requires_verified_stock_lead_time_supplier_expiry_and_accepted_model",
        "publication_approved": False, "activation_allowed": False,
        "observation_warnings": (["adjusted_records_need_independent_identity_quantity_evidence"]
                                 if product.get("adjusted_records", 0) else []),
    }
    if is_service:
        result["conditional_methods"]["recorded_quantity"] = "service_count_only_if_its_definition_is_reviewed"
    if not blocks:
        if origin is None:
            result["quantity_model_blockers"] = ["origin_not_supplied"]
        else:
            profile = screen_quantity_series(
                observations or [], origin=origin, coverage_approved=coverage_approved,
                quantity_evidence_approved=quantity_evidence_approved,
            )
            result["series_profile"] = profile
            result["quantity_model_status"] = profile["status"]
            result["quantity_model_blockers"] = profile["reasons"]
    result["next_action"] = (
        "Review missing identity/category/item-kind/unit and observation evidence; preserve source Qty and price"
        if result["quantity_model_blockers"] else
        "Design common-origin development comparison and freeze choices before untouched final evaluation"
    )
    if blocks:
        result["next_action"] = (
            "Resolve underlying category before medicine cohort eligibility; "
            if product["category"] == "unclassified" else ""
        ) + (
            "Verify whether historical Qty follows the literal presentation clue; do not infer contents or convert"
            if product.get("outer_presentation_clue") else
            "Obtain historical sellable presentation and Qty-unit evidence; retain unknown meanwhile"
        )
        if product.get("adjusted_records", 0):
            result["next_action"] += "; independently verify adjusted-source identity/quantity before physical modeling"
    return result


def route_population(products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """One output per exact input key, prioritized for financial evidence review.

    Rank positive recorded net sales, not clinical importance, Pareto/ABC,
    physical demand, or expected forecast improvement. Ties use stable key.
    """
    keys = [row.get("product_key") for row in products]
    if len(keys) != len(set(keys)):
        raise ValueError("Duplicate product keys; no automatic merge permitted")
    ranked = sorted(products, key=lambda p: (-max(Decimal(str(p["eligible_net_sales_php"])), Decimal(0)), p["product_key"]))
    return [dict(route_product(row), financial_review_rank=index + 1) for index, row in enumerate(ranked)]
