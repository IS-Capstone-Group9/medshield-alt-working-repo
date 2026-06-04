"""Warehouse read helpers for MedShield microservices."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parent.parent
REFERENCE_DATA = ROOT_DIR / "external" / "medshield_frontend" / "data" / "sales_data.json"
load_dotenv(ROOT_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def supabase_enabled() -> bool:
    base_url = os.getenv("SUPABASE_URL", "").strip()
    api_key = os.getenv("SUPABASE_ANON_KEY", "").strip()
    return env_bool("USE_SUPABASE", True) and bool(base_url) and bool(api_key)


def supabase_headers() -> dict[str, str]:
    api_key = os.getenv("SUPABASE_ANON_KEY", "").strip()
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
        return json.load(handle)


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
    data["by_area"] = normalize_rows(data.get("by_area", []), ["revenue", "income"])
    data["top_products"] = normalize_rows(data.get("top_products", []), ["revenue", "income", "qty", "pct_of_total"])
    data["year_summary"] = normalize_rows(data.get("year_summary", []), ["revenue", "income"], {"transactions"})
    data["seasonality"] = normalize_rows(data.get("seasonality", []), ["avg_revenue"])
    return data


def warehouse_snapshot() -> dict[str, Any]:
    if not supabase_enabled():
        raise RuntimeError("Supabase warehouse is not configured")
    return normalize_snapshot({
        "totals": (supabase_fetch("vw_dashboard_kpis", {"select": "*", "limit": 1}) or [{}])[0],
        "monthly": supabase_fetch("vw_dashboard_monthly", {"select": "*", "order": "period.asc"}),
        "by_area": supabase_fetch("vw_dashboard_by_area", {"select": "*", "order": "revenue.desc"}),
        "top_products": supabase_fetch("vw_dashboard_top_products", {"select": "*", "order": "revenue.desc", "limit": 15}),
        "year_summary": supabase_fetch("vw_dashboard_year_summary", {"select": "*", "order": "year.asc"}),
        "seasonality": supabase_fetch("vw_dashboard_seasonality", {"select": "*", "order": "month_num.asc"}),
    })


def snapshot() -> dict[str, Any]:
    if supabase_enabled():
        try:
            return warehouse_snapshot()
        except Exception:
            pass
    return local_snapshot()
