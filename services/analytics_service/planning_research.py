"""Offline, explicitly assumed planning research; never a procurement interface.

Inputs must already be scoped to a consistent presentation. This module does not
infer units, stock, supplier parameters, disease joins, or approved weights.
"""
from __future__ import annotations

from copy import deepcopy
from itertools import product
from math import ceil, floor, isfinite, sqrt

import numpy as np
from scipy.stats import rankdata, spearmanr


def nonnegative(value, name, *, positive=False, integer=False):
    if isinstance(value, (bool, str)) or value is None:
        raise ValueError(f"{name} must be an explicit finite number")
    try:
        result = float(value)
    except (TypeError, ValueError, OverflowError) as exc:
        raise ValueError(f"{name} must be numeric") from exc
    if not isfinite(result) or result < 0 or result > 1e9 or (positive and result == 0):
        raise ValueError(f"{name} is outside the permitted range")
    if integer and result != int(result):
        raise ValueError(f"{name} must be an integer")
    return int(result) if integer else result


def eoq_rop_scenario(*, annual_demand, acquisition_cost, order_cost,
                     holding_fraction, pack_size, lead_days, daily_demand_sd,
                     lead_sd_days, service_z, shelf_life_days):
    """WP8 formula, with entered stochastic-lead assumptions A1–A6.

    Ordering/cycle-holding model cost excludes purchasing, expiry and shortage
    costs. It is not a claim about actual company expenses or savings.
    """
    demand = nonnegative(annual_demand, "annual_demand", positive=True)
    unit_cost = nonnegative(acquisition_cost, "acquisition_cost", positive=True)
    ordering = nonnegative(order_cost, "order_cost", positive=True)
    holding = nonnegative(holding_fraction, "holding_fraction", positive=True) * unit_cost
    if not isfinite(holding) or holding <= 0:
        raise ValueError("Annual unit holding cost must be positive and representable")
    pack = nonnegative(pack_size, "pack_size", positive=True, integer=True)
    lead = nonnegative(lead_days, "lead_days")
    demand_sd = nonnegative(daily_demand_sd, "daily_demand_sd")
    lead_sd = nonnegative(lead_sd_days, "lead_sd_days")
    z = nonnegative(service_z, "service_z")
    shelf = nonnegative(shelf_life_days, "shelf_life_days", positive=True)
    continuous = sqrt(2 * demand * ordering / holding)
    if not isfinite(continuous):
        raise ValueError("EOQ is not representable for the supplied assumptions")
    packs = {max(1, floor(continuous / pack)), max(1, ceil(continuous / pack))}

    def cost(count):
        units = count * pack
        return demand / units * ordering + units / 2 * holding

    chosen = min(packs, key=lambda count: (cost(count), count))
    mean_daily = demand / 365
    safety = ceil(z * sqrt(lead * demand_sd**2 + mean_daily**2 * lead_sd**2))
    capacity = mean_daily * max(0, shelf - lead)
    return {"evidence_label": "Assumed", "policy_version": "offline_eoq_rop_sensitivity_v1",
            "assumption_ids": ["A1", "A2", "A3", "A4", "A5", "A6"],
            "continuous_eoq": continuous, "order_packs": chosen, "order_units": chosen * pack,
            "annual_ordering_cycle_holding_cost": cost(chosen),
            "safety_stock_units": safety, "reorder_point_units": ceil(mean_daily * lead) + safety,
            "gross_shelf_capacity_units": capacity,
            "eoq_lot_exceeds_gross_shelf_capacity": chosen * pack > capacity,
            "operational_approval": False}


def eoq_sensitivity(base_inputs, ranges):
    """Evaluate a caller-declared Cartesian scenario grid; no hidden defaults."""
    allowed = {"holding_fraction", "order_cost", "lead_days", "lead_sd_days", "service_z", "shelf_life_days"}
    if not ranges or set(ranges) - allowed or any(not values for values in ranges.values()):
        raise ValueError("Provide nonempty sensitivity ranges for supported assumptions")
    keys = sorted(ranges)
    if np.prod([len(ranges[key]) for key in keys]) > 100_000:
        raise ValueError("Sensitivity grid exceeds 100,000 scenarios")
    rows = []
    for combination in product(*(ranges[key] for key in keys)):
        changed = dict(zip(keys, combination))
        rows.append({"inputs": {**base_inputs, **changed}, **eoq_rop_scenario(**{**base_inputs, **changed})})
    return rows


def ahp_weights(matrix):
    """Three-criterion reciprocal AHP matrix; reject CR >= .10, never repair it."""
    values = np.asarray(matrix)
    if values.shape != (3, 3) or values.dtype.kind not in "iuf":
        raise ValueError("AHP requires a numeric 3 by 3 matrix")
    values = values.astype(float)
    if not np.isfinite(values).all() or (values <= 0).any():
        raise ValueError("AHP comparisons must be positive and finite")
    if not np.allclose(np.diag(values), 1, atol=1e-10, rtol=0) or not np.allclose(values * values.T, 1, atol=1e-8, rtol=0):
        raise ValueError("AHP matrix must have unit diagonal and reciprocal comparisons")
    eigenvalues, eigenvectors = np.linalg.eig(values)
    index = int(np.argmax(eigenvalues.real))
    largest = float(eigenvalues[index].real)
    weights = np.abs(eigenvectors[:, index].real)
    weights /= weights.sum()
    ci = max(0, (largest - 3) / 2)
    cr = ci / .58
    if cr >= .10:
        raise ValueError(f"Inconsistent AHP matrix: CR={cr:.6f} must be below 0.10")
    return {"weights": weights.tolist(), "lambda_max": largest, "consistency_index": ci,
            "consistency_ratio": cr, "evidence_label": "Assumed", "operational_approval": False}


def ranking_sensitivity(scores, weights, *, top_k=10):
    """Six one-at-a-time ±20% probes, plus a 25-point two-axis grid.

    Scores are already normalized, reviewed criteria; unavailable external joins
    must be resolved by the caller, never substituted with zero here. Average
    score ranks preserve ties for Spearman; display ties use input order.
    """
    data = np.asarray(scores)
    weight = np.asarray(weights)
    if data.ndim != 2 or data.shape[1] != 3 or data.shape[0] < 2 or data.dtype.kind not in "iuf":
        raise ValueError("Provide at least two items and three finite criteria")
    if weight.shape != (3,) or weight.dtype.kind not in "iuf":
        raise ValueError("Provide three numeric positive weights")
    data, weight = data.astype(float), weight.astype(float)
    if not np.isfinite(data).all() or not np.isfinite(weight).all() or (weight <= 0).any():
        raise ValueError("Scores and weights must be finite; weights must be positive")
    if (data < 0).any() or (data > 100).any():
        raise ValueError("Caller-normalized criterion scores must be between 0 and 100")
    if isinstance(top_k, bool) or not isinstance(top_k, int) or top_k < 1:
        raise ValueError("top_k must be a positive integer")
    weight /= weight.max()
    weight /= weight.sum()
    baseline = data @ weight
    base_rank = rankdata(-baseline)
    k = min(top_k, len(data))
    top = set(np.argsort(-baseline, kind="stable")[:k].tolist())
    probes = []
    for criterion in range(3):
        for multiplier in (.8, 1.2):
            factors = np.ones(3)
            factors[criterion] = multiplier
            probes.append((f"criterion_{criterion}_{multiplier}", factors))
    for first, second in product((.8, .9, 1., 1.1, 1.2), repeat=2):
        probes.append((f"grid_{first}_{second}", np.array([first, second, 1.])))
    results = []
    for name, factors in probes:
        changed = weight * factors
        changed /= changed.sum()
        score = data @ changed
        ranks = rankdata(-score)
        # A constant rank vector has no defined correlation, even against itself.
        rho = None if np.ptp(base_rank) == 0 or np.ptp(ranks) == 0 else float(spearmanr(base_rank, ranks).statistic)
        overlap = len(top.intersection(np.argsort(-score, kind="stable")[:k].tolist())) / k * 100
        results.append({"probe": name, "weights": changed.tolist(), "spearman_rho": rho,
                        "top_k": k, "top_k_overlap_pct": overlap, "evidence_label": "Assumed"})
    return results


def budget_frontier(body, shortlist, budgets):
    """Existing equally weighted MILP scenarios, with discrete marginal gains.

    This is not the gateway's weighted objective, an LP dual/shadow price, or
    three-solver parity. Infeasible points have no interpolated fill or gain.
    """
    from services.analytics_service.prescriptive_planning import solve_plan

    if not budgets or list(budgets) != sorted(set(budgets)):
        raise ValueError("Budgets must be nonempty, unique and increasing")
    results = []
    for budget in budgets:
        amount = nonnegative(budget, "budget")
        scenario = deepcopy(body)
        scenario["budget"] = amount
        solved = solve_plan(scenario, shortlist)
        fill = solved.get("mean_fulfillment_pct")
        previous = results[-1] if results else None
        marginal = None
        if fill is not None and previous and previous["mean_fulfillment_pct"] is not None:
            marginal = (fill - previous["mean_fulfillment_pct"]) / (amount - previous["budget"]) * 10_000
        results.append({"budget": amount, "status": solved["status"], "spent": solved.get("spent"),
                        "mean_fulfillment_pct": fill, "discrete_gain_pct_per_php_10000": marginal,
                        "evidence_label": "Assumed", "operational_approval": False})
    return results
