"""Prescriptive logic modules (Phase 7 computations)."""

from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd
import pulp
from sklearn.metrics.pairwise import cosine_similarity


def calculate_eoq(
    annual_demand: float,
    unit_cost: float | None = None,
    ordering_cost: float | None = None,
    holding_cost_pct: float | None = None,
) -> dict[str, Any]:
    """Calculates Economic Order Quantity.
    
    Falls back to scenario defaults if costs are missing.
    """
    is_scenario = False
    
    if ordering_cost is None:
        ordering_cost = 500.0
        is_scenario = True
    if holding_cost_pct is None:
        holding_cost_pct = 0.20
        is_scenario = True
    if unit_cost is None or unit_cost <= 0:
        unit_cost = 50.0  # Placeholder if completely missing
        is_scenario = True
        
    if annual_demand <= 0:
        return {"eoq": 0.0, "is_scenario": is_scenario}
        
    holding_cost = unit_cost * holding_cost_pct
    eoq = math.sqrt((2 * annual_demand * ordering_cost) / holding_cost)
    
    return {
        "eoq": round(eoq, 2),
        "is_scenario": is_scenario,
        "ordering_cost_used": ordering_cost,
        "holding_cost_used": holding_cost,
    }


def calculate_rop_and_safety_stock(
    avg_daily_demand: float,
    demand_std_dev: float,
    lead_time_days: float | None = None,
    service_level_z: float = 1.645,  # 95% service level
    current_stock: float | None = None,
) -> dict[str, Any]:
    """Calculates Reorder Point and Safety Stock."""
    is_scenario = False
    
    if lead_time_days is None:
        lead_time_days = 14.0
        is_scenario = True
        
    safety_stock = service_level_z * demand_std_dev * math.sqrt(lead_time_days)
    rop = (avg_daily_demand * lead_time_days) + safety_stock
    
    stock_gap = None
    if current_stock is not None:
        stock_gap = rop - current_stock
    else:
        is_scenario = True
        
    return {
        "safety_stock": round(safety_stock, 2),
        "rop": round(rop, 2),
        "stock_gap": round(stock_gap, 2) if stock_gap is not None else None,
        "is_scenario": is_scenario,
    }


def generate_disease_alert(historical_cases: list[float], current_cases: float) -> dict[str, Any]:
    """Checks if current cases exceed mean + 2 std dev of historical cases."""
    if not historical_cases:
        return {"alert": False, "reason": "No historical data"}
        
    mean_cases = float(np.mean(historical_cases))
    std_cases = float(np.std(historical_cases))
    threshold = mean_cases + (2 * std_cases)
    
    return {
        "alert": current_cases > threshold,
        "threshold": threshold,
        "current": current_cases,
        "mean": mean_cases,
        "std": std_cases,
        "is_live_surveillance": False,  # Enforced by business rules
    }


def generate_weather_alert(
    api_rainfall_mm: float | None,
    pagasa_rainfall_mm: float | None = None,
    rainfall_threshold: float = 50.0,
) -> dict[str, Any]:
    """Generates weather alert prioritizing API data, with PAGASA as fallback/reference."""
    alert = False
    source_used = "None"
    
    if api_rainfall_mm is not None:
        alert = api_rainfall_mm >= rainfall_threshold
        source_used = "API"
    elif pagasa_rainfall_mm is not None:
        alert = pagasa_rainfall_mm >= rainfall_threshold
        source_used = "PAGASA_Fallback"
        
    return {
        "alert": alert,
        "source_used": source_used,
        "threshold_mm": rainfall_threshold,
    }


def compute_mcda_priority(features: dict[str, float], weights: dict[str, float] | None = None) -> float:
    """Multi-criteria decision analysis scoring for regional priority."""
    default_weights = {
        "revenue": 1 / 6,
        "growth": 1 / 6,
        "demand": 1 / 6,
        "disease_risk": 1 / 6,
        "weather_risk": 1 / 6,
        "strategic_importance": 1 / 6,
    }
    w = weights if weights is not None else default_weights
    
    score = 0.0
    for key, value in features.items():
        score += value * w.get(key, 0.0)
        
    return score


def optimize_allocation(
    demands: dict[str, float],
    capacities: dict[str, float],
    total_budget: float,
    unit_costs: dict[str, float],
) -> dict[str, Any]:
    """Linear programming allocation using Pulp."""
    prob = pulp.LpProblem("Resource_Allocation", pulp.LpMaximize)
    
    alloc_vars = {}
    for area, demand in demands.items():
        upper_bound = min(demand, capacities.get(area, float("inf")))
        alloc_vars[area] = pulp.LpVariable(f"alloc_{area}", lowBound=0, upBound=upper_bound)
        
    # Objective: maximize total allocated units
    prob += pulp.lpSum([alloc_vars[a] for a in demands.keys()]), "Maximize_Fulfilled_Demand"
    
    # Constraint: total cost cannot exceed budget
    prob += pulp.lpSum([alloc_vars[a] * unit_costs.get(a, 0) for a in demands.keys()]) <= total_budget, "Budget_Constraint"
    
    prob.solve(pulp.PULP_CBC_CMD(msg=False))
    
    results = {}
    for area in demands.keys():
        results[area] = pulp.value(alloc_vars[area]) or 0.0
        
    total_cost = sum(results[a] * unit_costs.get(a, 0) for a in demands.keys())
    
    return {
        "status": pulp.LpStatus[prob.status],
        "allocations": results,
        "total_cost": total_cost,
        "is_constrained_scenario": total_cost >= total_budget,
    }


def compute_product_region_similarity(demand_matrix: pd.DataFrame) -> pd.DataFrame:
    """Uses cosine similarity on normalized historical demand vectors.
    
    Expects a DataFrame where rows are regions and columns are products.
    """
    mat = demand_matrix.fillna(0)
    if mat.empty:
        return pd.DataFrame()
        
    sim_array = cosine_similarity(mat)
    return pd.DataFrame(sim_array, index=mat.index, columns=mat.index)


def flag_stop_purchasing(
    movement_rate: float,
    abc_class: str,
    days_inactive: int,
    inventory_age: int | None = None,
) -> bool:
    """Flags if a product should be stopped from purchasing."""
    if abc_class.upper() == "C" and movement_rate < 0.1 and days_inactive > 90:
        if inventory_age is None or inventory_age > 180:
            return True
    return False
