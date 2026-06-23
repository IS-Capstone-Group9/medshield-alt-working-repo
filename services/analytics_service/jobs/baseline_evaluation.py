"""Baseline evaluation module for sales forecasts."""

from __future__ import annotations

import numpy as np
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error, mean_squared_error


def evaluate_forecast(y_true: list[float] | np.ndarray, y_pred: list[float] | np.ndarray) -> dict[str, float]:
    """Computes standard evaluation metrics for forecasting.
    
    Returns:
        A dictionary containing MAE, RMSE, and MAPE.
    """
    y_true_arr = np.array(y_true, dtype=float)
    y_pred_arr = np.array(y_pred, dtype=float)
    
    if len(y_true_arr) == 0 or len(y_pred_arr) == 0 or len(y_true_arr) != len(y_pred_arr):
        return {"mae": 0.0, "rmse": 0.0, "mape": 0.0}
    
    # To avoid division by zero in MAPE, replace zeros with a small epsilon
    y_true_safe = np.where(y_true_arr == 0, 1e-6, y_true_arr)
    
    mae = mean_absolute_error(y_true_arr, y_pred_arr)
    rmse = np.sqrt(mean_squared_error(y_true_arr, y_pred_arr))
    mape = mean_absolute_percentage_error(y_true_safe, y_pred_arr)
    
    return {
        "mae": float(mae),
        "rmse": float(rmse),
        "mape": float(mape),
    }


def naive_seasonal_baseline(series: list[float], period: int = 12) -> list[float]:
    """Generates a naive seasonal baseline prediction.
    
    The prediction for time t is the actual value at time t - period.
    For the first `period` steps, it falls back to a naive persistence 
    or simply replicates the values (since history isn't available).
    """
    predictions = []
    for i in range(len(series)):
        if i < period:
            # Not enough history for a full seasonal lag, fall back to simple persistence if i > 0
            if i == 0:
                predictions.append(series[i])
            else:
                predictions.append(series[i - 1])
        else:
            predictions.append(series[i - period])
    return predictions
