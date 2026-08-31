"""Helpers shared by thin Databricks notebook entry points."""

from __future__ import annotations

from typing import Any

from medshield_etl.config import PipelineConfig


def widget_value(dbutils: Any, name: str, default: str) -> str:
    try:
        return dbutils.widgets.get(name)
    except Exception:
        dbutils.widgets.text(name, default)
        return dbutils.widgets.get(name)


def config_from_widgets(dbutils: Any) -> PipelineConfig:
    return PipelineConfig(
        catalog=widget_value(dbutils, "catalog", "workspace"),
        year_min=int(widget_value(dbutils, "year_min", "2017")),
        year_max=int(widget_value(dbutils, "year_max", "2025")),
        financial_tolerance=float(widget_value(dbutils, "financial_tolerance", "0.02")),
    )


def batch_id_from_widgets(dbutils: Any) -> str:
    value = widget_value(dbutils, "import_batch_id", "manual_initial_2017_2025_v1").strip()
    if not value:
        raise ValueError("import_batch_id cannot be empty")
    return value
