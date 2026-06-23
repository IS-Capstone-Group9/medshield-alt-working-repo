"""Descriptive logic modules (Phase 2 computations)."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from statsmodels.tsa.seasonal import seasonal_decompose


def encode_entity_labels(df: pd.DataFrame, area_col: str = "area") -> pd.DataFrame:
    """Encodes territory and customer type from raw area labels.
    
    Rule-based separation of institutional vs geographic areas.
    """
    df_out = df.copy()
    
    def determine_type(name: Any) -> str:
        n = str(name).lower()
        if any(kw in n for kw in ["hospital", "medical", "clinic", "pharmacy", "drugstore", "health", "center"]):
            return "institutional"
        return "geographic"
        
    df_out["entity_type"] = df_out[area_col].apply(determine_type)
    return df_out


def compute_seasonality(timeseries: pd.Series, period: int = 12) -> dict[str, Any]:
    """Computes seasonality index and strength using additive decomposition.
    
    Strength is bounded [0, 1] using: max(0, 1 - Var(R)/Var(S+R))
    """
    if len(timeseries) < period * 2:
        return {"seasonal_strength": 0.0, "indices": []}
        
    # Using additive for robust baseline
    result = seasonal_decompose(timeseries, model="additive", period=period, extrapolate_trend="freq")
    
    seasonal = result.seasonal
    resid = result.resid
    
    var_resid = float(np.var(resid))
    var_seas_resid = float(np.var(seasonal + resid))
    
    if var_seas_resid == 0:
        strength = 0.0
    else:
        strength = max(0.0, 1.0 - (var_resid / var_seas_resid))
        
    return {
        "seasonal_strength": round(strength, 4),
        "indices": seasonal[:period].tolist(),
    }


def compute_abc_classification(
    df: pd.DataFrame,
    groupby_col: str,
    metric_col: str = "revenue"
) -> pd.DataFrame:
    """Computes ABC / Pareto classification based on an 80/15/5 heuristic."""
    grouped = df.groupby(groupby_col)[metric_col].sum().reset_index()
    grouped = grouped.sort_values(by=metric_col, ascending=False).reset_index(drop=True)
    
    total_metric = grouped[metric_col].sum()
    if total_metric == 0:
        grouped["abc_class"] = "C"
        grouped["cumulative_pct"] = 1.0
        return grouped
        
    grouped["cumulative_pct"] = grouped[metric_col].cumsum() / total_metric
    
    def assign_abc(pct: float) -> str:
        if pct <= 0.80:
            return "A"
        elif pct <= 0.95:
            return "B"
        return "C"
        
    grouped["abc_class"] = grouped["cumulative_pct"].apply(assign_abc)
    return grouped


def compute_yoy_growth(monthly_df: pd.DataFrame, join_keys: list[str]) -> pd.DataFrame:
    """Computes Year-Over-Year growth given a monthly dataframe.
    
    Assumes `period` column is of datetime type.
    """
    df_out = monthly_df.copy()
    
    if "period" not in df_out.columns:
        raise ValueError("DataFrame must contain a 'period' datetime column")
        
    df_out["year"] = df_out["period"].dt.year
    df_out["month"] = df_out["period"].dt.month
    
    # Create a lagged frame for joining
    df_yoy = df_out.copy()
    df_yoy["year"] = df_yoy["year"] + 1
    
    # Ensure keys are present
    merge_cols = ["year", "month"] + [k for k in join_keys if k in df_out.columns and k not in ("year", "month")]
    
    merged = pd.merge(
        df_out, 
        df_yoy[merge_cols + ["revenue", "quantity"]], 
        on=merge_cols, 
        how="left", 
        suffixes=("", "_prev_year")
    )
    
    merged["yoy_revenue_pct"] = (merged["revenue"] - merged["revenue_prev_year"]) / merged["revenue_prev_year"].replace(0, np.nan)
    merged["yoy_quantity_pct"] = (merged["quantity"] - merged["quantity_prev_year"]) / merged["quantity_prev_year"].replace(0, np.nan)
    
    # Flag holdout period
    merged["is_incomplete_holdout"] = merged["year"] >= 2025
    
    return merged
