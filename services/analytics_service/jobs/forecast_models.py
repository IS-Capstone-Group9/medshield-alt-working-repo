"""Predictive baseline models (Phase 3 computations)."""

from __future__ import annotations

import datetime
import uuid
from typing import Any

import pandas as pd
from prophet import Prophet

from services.analytics_service.jobs.baseline_evaluation import evaluate_forecast, naive_seasonal_baseline
from services.analytics_service.jobs.output_writers import (
    write_fact_demand_forecast,
    write_fact_forecast_run,
    write_fact_model_evaluation,
)


def train_sales_baseline(train_df: pd.DataFrame) -> Prophet:
    """Trains a sales-only baseline forecast model using Prophet."""
    model = Prophet(yearly_seasonality=True, weekly_seasonality=False, daily_seasonality=False)
    
    df = train_df.rename(columns={"period": "ds", "quantity": "y"})
    model.fit(df[["ds", "y"]])
    
    return model


def generate_forecast(model: Prophet, periods: int = 12, freq: str = "MS") -> pd.DataFrame:
    """Generates a forecast for the specified periods."""
    future = model.make_future_dataframe(periods=periods, freq=freq)
    forecast = model.predict(future)
    return forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]]


def run_blocked_validation(df: pd.DataFrame, test_year: int = 2024) -> dict[str, Any]:
    """Runs a blocked time-series cross-validation.
    
    Trains on data before test_year, tests on test_year data.
    """
    df_copy = df.copy()
    df_copy["year"] = df_copy["period"].dt.year
    
    train_df = df_copy[df_copy["year"] < test_year].copy()
    test_df = df_copy[df_copy["year"] == test_year].copy()
    
    if train_df.empty or test_df.empty:
        raise ValueError("Insufficient data for blocked cross-validation split.")
        
    model = train_sales_baseline(train_df)
    forecast_df = generate_forecast(model, periods=len(test_df), freq="MS")
    
    # Align predictions with test data dates
    forecast_df["period_m"] = forecast_df["ds"].dt.to_period("M")
    test_df["period_m"] = test_df["period"].dt.to_period("M")
    
    merged = pd.merge(test_df, forecast_df, on="period_m")
    
    y_true = merged["quantity"].tolist()
    y_pred_prophet = merged["yhat"].tolist()
    
    # Generate naive predictions using full historical series
    historical_y = df_copy[df_copy["year"] <= test_year].sort_values("period")["quantity"].tolist()
    naive_predictions = naive_seasonal_baseline(historical_y, period=12)
    y_pred_naive = naive_predictions[-len(test_df):]
    
    prophet_metrics = evaluate_forecast(y_true, y_pred_prophet)
    naive_metrics = evaluate_forecast(y_true, y_pred_naive)
    
    return {
        "prophet_metrics": prophet_metrics,
        "naive_metrics": naive_metrics,
        "beats_naive": prophet_metrics["mape"] < naive_metrics["mape"] and prophet_metrics["rmse"] < naive_metrics["rmse"]
    }


def execute_forecast_job(df: pd.DataFrame, model_code: str = "PRPH-BL", version: str = "1.0.0") -> None:
    """Orchestrates model training, evaluation, and output persistence."""
    df_copy = df.copy()
    df_copy["year"] = df_copy["period"].dt.year
    max_year = df_copy["year"].max()
    
    # Assume the max year (e.g. 2025) is the incomplete holdout. Test on max_year - 1.
    try:
        val_results = run_blocked_validation(df_copy, test_year=max_year - 1)
        beats_naive = val_results["beats_naive"]
        eval_metrics = val_results["prophet_metrics"]
    except ValueError:
        beats_naive = False
        eval_metrics = {"mae": 0.0, "rmse": 0.0, "mape": 0.0}
        
    # Train final model on data up to the test_year (or complete years)
    train_df = df_copy[df_copy["year"] < max_year]
    final_model = train_sales_baseline(train_df)
    
    # Forecast future for the holdout year and beyond
    forecast_df = generate_forecast(final_model, periods=12, freq="MS")
    
    run_id = str(uuid.uuid4())
    run_timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    run_record = {
        "run_id": run_id,
        "model_code": model_code,
        "version": version,
        "run_timestamp": run_timestamp,
        "status": "published" if beats_naive else "draft",
        "limitations": "Sales-only baseline. Does not account for external shocks.",
    }
    
    eval_record = {
        "run_id": run_id,
        "model_code": model_code,
        "mae": eval_metrics["mae"],
        "rmse": eval_metrics["rmse"],
        "mape": eval_metrics["mape"],
        "is_partial_holdout": True if max_year == 2025 else False
    }
    
    forecast_records = []
    for _, row in forecast_df.iterrows():
        forecast_records.append({
            "run_id": run_id,
            "period": row["ds"].isoformat()[:10],
            "forecast_value": float(row["yhat"]),
            "lower_bound": float(row["yhat_lower"]),
            "upper_bound": float(row["yhat_upper"]),
        })
        
    write_fact_forecast_run([run_record])
    write_fact_model_evaluation([eval_record])
    write_fact_demand_forecast(forecast_records)
