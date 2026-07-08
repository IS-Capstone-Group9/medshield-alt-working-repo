"""Warehouse read helpers for MedShield microservices."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parent.parent
REFERENCE_DATA = ROOT_DIR / "frontend" / "public" / "data" / "sales_data.json"
PROCESSED_SALES_SNAPSHOT = ROOT_DIR / "data" / "medshield" / "processed" / "dashboard_sales_snapshot.json"
load_dotenv(ROOT_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def supabase_enabled() -> bool:
    base_url = os.getenv("SUPABASE_URL", "").strip()
    api_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        or os.getenv("SUPABASE_ANON_KEY", "").strip()
    )
    return env_bool("USE_SUPABASE", True) and bool(base_url) and bool(api_key)


def supabase_headers() -> dict[str, str]:
    api_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        or os.getenv("SUPABASE_ANON_KEY", "").strip()
    )
    return {"apikey": api_key, "Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}


def supabase_base_url() -> str:
    return os.getenv("SUPABASE_URL", "").rstrip("/")


def supabase_fetch(table_name: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    url = f"{supabase_base_url()}/rest/v1/{table_name}"
    response = requests.get(url, headers=supabase_headers(), params=params or {"select": "*"}, timeout=20)
    response.raise_for_status()
    return response.json()


def local_snapshot() -> dict[str, Any]:
    import json

    with REFERENCE_DATA.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if PROCESSED_SALES_SNAPSHOT.exists():
        with PROCESSED_SALES_SNAPSHOT.open("r", encoding="utf-8") as handle:
            sales = json.load(handle)
        for key in (
            "totals",
            "monthly",
            "weekly",
            "by_area",
            "top_products",
            "year_summary",
            "seasonality",
        ):
            data[key] = sales.get(key, data.get(key))
        for key in (
            "forecasts",
            "external_signals",
            "inventory_recommendations",
            "regional_priorities",
            "area_clusters",
            "product_priorities",
            "allocation_recommendations",
            "product_region_matches",
            "decision_alerts",
        ):
            data[key] = []
    return data


def to_int(value: Any) -> int:
    if value is None or value == "":
        return 0
    return int(float(value))


def to_float(value: Any) -> float:
    if value is None or value == "":
        return 0.0
    return float(value)


def normalize_snapshot(data: dict[str, Any]) -> dict[str, Any]:
    totals = data.get("totals", {})
    data["totals"] = {
        **totals,
        "total_revenue": to_float(totals.get("total_revenue")),
        "total_income": to_float(totals.get("total_income")),
        "total_transactions": to_int(totals.get("total_transactions")),
        "avg_margin": to_float(totals.get("avg_margin")),
    }

    def normalize_rows(rows: list[dict[str, Any]], fields: list[str], int_fields: set[str] | None = None) -> list[dict[str, Any]]:
        normalized: list[dict[str, Any]] = []
        int_fields = int_fields or set()
        for row in rows:
            item = dict(row)
            for field in fields:
                if field in item:
                    item[field] = to_float(item[field])
            for field in int_fields:
                if field in item:
                    item[field] = to_int(item[field])
            normalized.append(item)
        return normalized

    data["monthly"] = normalize_rows(data.get("monthly", []), ["revenue", "income"])
    data["weekly"] = normalize_rows(data.get("weekly", []), ["revenue", "income"])
    data["by_area"] = normalize_rows(data.get("by_area", []), ["revenue", "income"])
    data["top_products"] = normalize_rows(data.get("top_products", []), ["revenue", "income", "qty", "pct_of_total", "cumulative_pct"], {"rank"})
    data["year_summary"] = normalize_rows(data.get("year_summary", []), ["revenue", "income"], {"transactions"})
    data["seasonality"] = normalize_rows(data.get("seasonality", []), ["avg_revenue"])
    data["forecasts"] = normalize_rows(data.get("forecasts", []), [
        "baseline_forecast",
        "adjusted_forecast",
        "lower_bound",
        "upper_bound",
        "disease_adjustment_factor",
        "weather_adjustment_factor",
        "confidence_level",
    ])
    data["external_signals"] = normalize_rows(data.get("external_signals", []), [
        "disease_intensity_index",
        "rainfall_severity_index",
    ])
    data["inventory_recommendations"] = normalize_rows(data.get("inventory_recommendations", []), [
        "annual_demand_units",
        "eoq_units",
        "reorder_point_units",
        "safety_stock_units",
        "current_stock_units",
        "forecast_demand_units",
        "stock_gap_units",
    ])
    data["regional_priorities"] = normalize_rows(data.get("regional_priorities", []), [
        "revenue_weight",
        "growth_weight",
        "outbreak_risk_weight",
        "revenue_score",
        "growth_score",
        "outbreak_risk_index",
        "mcda_score",
    ], {"priority_rank"})
    data["area_clusters"] = normalize_rows(data.get("area_clusters", []), [
        "revenue_score",
        "demand_growth_score",
        "outbreak_risk_index",
    ])
    data["product_priorities"] = normalize_rows(data.get("product_priorities", []), [
        "cumulative_revenue_pct",
        "demand_score",
        "margin_score",
        "xgboost_urgency_score",
    ], {"pareto_rank"})
    data["allocation_recommendations"] = normalize_rows(data.get("allocation_recommendations", []), [
        "available_units",
        "recommended_units",
        "objective_value",
        "optimization_gap",
    ])
    data["product_region_matches"] = normalize_rows(data.get("product_region_matches", []), [
        "similarity_score",
    ], {"match_rank"})
    data["decision_alerts"] = normalize_rows(data.get("decision_alerts", []), [
        "threshold_value",
        "observed_value",
        "demand_multiplier",
    ])
    data["model_evaluation"] = normalize_rows(data.get("model_evaluation", []), [
        "metric_value",
        "benchmark_value",
    ])
    return data


def warehouse_snapshot() -> dict[str, Any]:
    if not supabase_enabled():
        raise RuntimeError("Supabase warehouse is not configured")
    return normalize_snapshot({
        "totals": (supabase_fetch("vw_dashboard_kpis", {"select": "*", "limit": 1}) or [{}])[0],
        "monthly": supabase_fetch("vw_dashboard_monthly", {"select": "*", "order": "period.asc"}),
        "weekly": [],
        "by_area": supabase_fetch("vw_dashboard_by_area", {"select": "*", "order": "revenue.desc"}),
        "top_products": supabase_fetch("vw_dashboard_top_products", {"select": "*", "order": "revenue.desc"}),
        "year_summary": supabase_fetch("vw_dashboard_year_summary", {"select": "*", "order": "year.asc"}),
        "seasonality": supabase_fetch("vw_dashboard_seasonality", {"select": "*", "order": "month_num.asc"}),
        "forecasts": supabase_fetch("vw_dss_forecasts", {"select": "*", "order": "period.asc"}),
        "external_signals": supabase_fetch("vw_dss_external_signals", {"select": "*", "order": "period.asc"}),
        "inventory_recommendations": supabase_fetch("vw_dss_inventory_recommendations", {"select": "*"}),
        "regional_priorities": supabase_fetch("vw_dss_regional_priorities", {"select": "*", "order": "priority_rank.asc"}),
        "area_clusters": supabase_fetch("vw_dss_area_clusters", {"select": "*", "order": "cluster_label.asc"}),
        "product_priorities": supabase_fetch("vw_dss_product_priorities", {"select": "*", "order": "pareto_rank.asc"}),
        "allocation_recommendations": supabase_fetch("vw_dss_allocation_recommendations", {"select": "*"}),
        "product_region_matches": supabase_fetch("vw_dss_product_region_matches", {"select": "*", "order": "match_rank.asc"}),
        "decision_alerts": supabase_fetch("vw_dss_decision_alerts", {"select": "*"}),
        "model_evaluation": supabase_fetch("vw_dss_model_evaluation", {"select": "*"}),
    })


def snapshot() -> dict[str, Any]:
    if supabase_enabled():
        try:
            return warehouse_snapshot()
        except Exception:
            pass
    return local_snapshot()
