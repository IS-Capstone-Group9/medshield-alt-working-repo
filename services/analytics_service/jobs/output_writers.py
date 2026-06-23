"""Writers for model outputs (runs, forecasts, evaluations, priority)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from services.data_pipeline import PROCESSED_DIR


def _write_json(filename: str, data: list[dict[str, Any]] | dict[str, Any]) -> Path:
    """Helper to write json to the processed directory."""
    path = PROCESSED_DIR / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return path


def write_fact_forecast_run(records: list[dict[str, Any]]) -> Path:
    """Writes metadata about a forecast run."""
    return _write_json("fact_forecast_run.json", records)


def write_fact_demand_forecast(records: list[dict[str, Any]]) -> Path:
    """Writes the actual forecasted values."""
    return _write_json("fact_demand_forecast.json", records)


def write_fact_model_evaluation(records: list[dict[str, Any]]) -> Path:
    """Writes model evaluation metrics (MAE, RMSE, MAPE)."""
    return _write_json("fact_model_evaluation.json", records)


def write_fact_product_priority(records: list[dict[str, Any]]) -> Path:
    """Writes product priority scoring outputs."""
    return _write_json("fact_product_priority.json", records)
