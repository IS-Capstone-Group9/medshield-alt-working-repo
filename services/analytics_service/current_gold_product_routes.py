"""Strict offline current-Gold adapter. Never supplies local dashboard data."""
from __future__ import annotations

from collections import Counter
from copy import deepcopy
from decimal import Decimal, InvalidOperation
from typing import Any

from services.analytics_service.product_analytics_policy import route_population

SCHEMA = "current-gold-product-input.v1"
REVIEW_FIELDS = ("unit_status", "item_kind_status", "forecast_status")
RELEASE_FIELDS = ("dataset_id", "policy_version", "product_master_sha256", "area_mapping_sha256", "fact_delta_version")


def integer(value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, (str, int)) or not str(value).isdigit():
        raise ValueError("Invalid nonnegative integer")
    return int(value)


def money(value: Any) -> Decimal:
    if isinstance(value, bool) or value is None:
        raise ValueError("Missing financial amount")
    try:
        result = Decimal(str(value))
    except InvalidOperation as exc:
        raise ValueError("Invalid financial amount") from exc
    if not result.is_finite():
        raise ValueError("Nonfinite financial amount")
    return result


def one(row: dict[str, Any], field: str, *, nullable: bool = False) -> str | None:
    values = row.get(field)
    if not isinstance(values, list) or len(values) > 1 or (not values and not nullable):
        raise ValueError(f"Missing or ambiguous group metadata: {field}")
    if not values:
        return None
    if not isinstance(values[0], str) or not values[0].strip():
        raise ValueError(f"Invalid metadata value: {field}")
    return values[0]


def adapt_current_gold(payload: dict[str, Any], expected_release: dict[str, Any]) -> dict[str, Any]:
    if payload.get("schema_version") != SCHEMA:
        raise ValueError("Unsupported current-Gold input schema")
    release = payload.get("source_release", {})
    if any(field not in release for field in RELEASE_FIELDS) or release != expected_release or payload.get("source_release_after") != release:
        raise ValueError("Source release mismatch or missing binding")
    if not isinstance(release["fact_delta_version"], int) or isinstance(release["fact_delta_version"], bool) or release["fact_delta_version"] < 0:
        raise ValueError("Invalid pinned version")
    rows = payload.get("products")
    if not isinstance(rows, list) or not rows:
        raise ValueError("No source product population")
    keys = [row.get("product_key") for row in rows]
    if any(not isinstance(key, str) or not key.strip() for key in keys) or len(keys) != len(set(keys)):
        raise ValueError("Invalid or duplicate source key")
    prepared = []
    metadata = {}
    for row in rows:
        records = integer(row["records"])
        eligible = integer(row["financial_rows"])
        adjusted = integer(row["adjusted_records"])
        if not records or eligible > records or adjusted > records:
            raise ValueError("Inconsistent product row counts")
        amount = money(row["net_sales_php"]) if eligible else None
        if not eligible and row["net_sales_php"] is not None:
            raise ValueError("Ineligible financial population must retain null")
        flag = one(row, "forecast_flags")
        if flag not in ("true", "false"):
            raise ValueError("Invalid forecast flag")
        product = {
            "product_key": row["product_key"], "source_label": one(row, "source_labels"),
            "category": one(row, "categories"), "category_status": one(row, "category_statuses"),
            "identity_status": one(row, "identity_statuses"),
            "canonical_sku": one(row, "canonical_skus", nullable=True),
            "current_unit_of_measure": one(row, "units", nullable=True),
            "item_kind": one(row, "item_kinds", nullable=True),
            "current_forecast_eligible": flag == "true",
            "unit_status": "needs_review", "item_kind_status": "needs_review",
            "forecast_status": "needs_review",
            "eligible_net_sales_php": str(amount) if amount is not None else "0",
            "records": records, "adjusted_records": adjusted,
            "source_reference": f"Databricks Gold fact version {release['fact_delta_version']}; exact current product_key",
        }
        # The source does not yet carry independently evidenced review states.
        # Populated SKU/unit/forecast flags cannot synthesize those decisions.
        if any(field in row for field in REVIEW_FIELDS):
            raise ValueError("Independent review bridge requires a separately versioned adapter")
        prepared.append(product)
        metadata[row["product_key"]] = {"financial_eligible": eligible > 0, "financial_rows": eligible,
                                        "recorded_net_sales_php": str(amount) if amount is not None else None}
    totals = payload["totals"]
    if (integer(totals["records"]) != sum(p["records"] for p in prepared)
            or integer(totals["product_keys"]) != len(prepared)
            or integer(totals["financial_product_keys"]) != sum(m["financial_eligible"] for m in metadata.values())
            or money(totals["net_sales_php"]) != sum((money(p["eligible_net_sales_php"]) for p in prepared), Decimal(0))):
        raise ValueError("Current source aggregate reconciliation failed")
    routes = route_population(prepared)
    for route in routes:
        cohort = metadata[route["product_key"]]
        route.update(cohort)
        route["missing_independent_review_fields"] = list(REVIEW_FIELDS)
        if not cohort["financial_eligible"]:
            route["descriptive_methods"] = ["source_record_and_quality_review_only"]
            route["source_evidence"]["eligible_net_sales_php"] = None
            route["financial_unavailable_reason"] = "no_eligible_financial_rows"
        else:
            route["financial_unavailable_reason"] = None
        route["source_release"] = deepcopy(release)
    return {
        "schema_version": "current-gold-product-routes.v1", "source_release": deepcopy(release),
        "scope": "offline candidate preparation; not published Gold or dashboard source",
        "review_products": len(routes), "financial_products": sum(r["financial_eligible"] for r in routes),
        "review_only_products": sum(not r["financial_eligible"] for r in routes),
        "records": sum(p["records"] for p in prepared), "eligible_net_sales_php": str(money(totals["net_sales_php"])),
        "quantity_routes": dict(Counter(r["quantity_model_status"] for r in routes)),
        "publication_approved": False, "activation_allowed": False, "products": routes,
    }
