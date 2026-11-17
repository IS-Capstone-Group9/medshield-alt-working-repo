"""Offline FEFO research with explicit assumed operating inputs and conserved lots.

This engine consumes a caller-supplied presentation-consistent demand series. It
does not turn sales into verified unconstrained demand or measured inventory.
"""
from __future__ import annotations

from calendar import monthrange
from datetime import date, timedelta

import numpy as np

from services.analytics_service.planning_research import nonnegative


def disaggregate_monthly(monthly_demand, *, seed, concentration=1.0):
    """Dirichlet-multinomial integer paths preserving each monthly total exactly.

    Input months must be continuous and explicit, including observed zeros.
    Missing months are rejected instead of being filled with zero.
    """
    alpha = nonnegative(concentration, "concentration", positive=True)
    if not monthly_demand:
        raise ValueError("Monthly demand is required")
    rng = np.random.default_rng(seed)
    periods = sorted(monthly_demand)
    days, output, expected_start = [], [], None
    for period in periods:
        try:
            start = date.fromisoformat(period + "-01")
        except (TypeError, ValueError) as exc:
            raise ValueError("Months must use YYYY-MM") from exc
        if period != start.strftime("%Y-%m") or (expected_start and start != expected_start):
            raise ValueError("Demand months must be continuous and explicit")
        count = nonnegative(monthly_demand[period], "monthly demand", integer=True)
        length = monthrange(start.year, start.month)[1]
        sampled = rng.multinomial(count, rng.dirichlet(np.full(length, alpha)))
        output.extend(sampled.tolist())
        days.extend((start + timedelta(days=index)).isoformat() for index in range(length))
        expected_start = start + timedelta(days=length)
    return {"dates": days, "demand": output}


def simulate_daily(demand, *, policy, initial_lots, lead_mean_days, lead_sd_days,
                   shelf_life_days, seed, burn_in_days=0, retain_ledger=False):
    """Simulate one product and path with daily receipts → expiry → issue → order.

    Lot expiry day is exclusive: a lot expiring on day d cannot serve day d.
    P0 orders the last complete 30-day demand block, every 30 days, and uses FIFO.
    P1 uses explicit fixed ROP/lot assumptions with FEFO. P2 requires externally
    prepared origin-available daily ROP/lot arrays and caps its lot by declared
    mean daily demand × max(0, shelf life − mean lead). No champion is fabricated.
    Lost demand is not backordered. Incoming stock contributes to inventory
    position. Positive lead times prevent same-day order/receipt look-ahead.
    """
    if not isinstance(demand, (list, tuple)) or not demand:
        raise ValueError("An explicit nonempty daily demand path is required")
    units = [nonnegative(value, "daily demand", integer=True) for value in demand]
    lead = nonnegative(lead_mean_days, "lead_mean_days", positive=True)
    lead_sd = nonnegative(lead_sd_days, "lead_sd_days")
    shelf = nonnegative(shelf_life_days, "shelf_life_days", positive=True, integer=True)
    burn = nonnegative(burn_in_days, "burn_in_days", integer=True)
    if burn >= len(units):
        raise ValueError("Burn-in must leave at least one evaluated day")
    if not isinstance(policy, dict) or policy.get("name") not in {"P0", "P1", "P2"}:
        raise ValueError("Policy must explicitly select P0, P1 or P2")
    name = policy["name"]
    if name == "P0":
        # Historical information before simulation day zero; never inferred from
        # the first simulated month's future actuals.
        initial_order = nonnegative(policy.get("previous_month_units"), "previous_month_units", integer=True)
    elif name == "P1":
        reorder = nonnegative(policy.get("reorder_point_units"), "reorder_point_units", integer=True)
        lot_size = nonnegative(policy.get("order_units"), "order_units", integer=True)
    else:
        pack = nonnegative(policy.get("pack_size"), "pack_size", positive=True, integer=True)
        daily_rop, daily_lots, daily_mean = [], [], []
        for key, destination, integer in (("reorder_point_units", daily_rop, True),
                                          ("order_units", daily_lots, True),
                                          ("mean_daily_demand", daily_mean, False)):
            values = policy.get(key)
            if not isinstance(values, (list, tuple)) or len(values) != len(units):
                raise ValueError(f"P2 requires an explicit origin-available daily {key} array")
            destination.extend(nonnegative(value, key, integer=integer) for value in values)
        if any(quantity % pack for quantity in daily_lots):
            raise ValueError("P2 lot sizes must be whole packs in the declared presentation")
        if policy.get("origin_available_confirmed") is not True:
            raise ValueError("P2 caller must confirm forecast issue-time availability")
    if not isinstance(initial_lots, list):
        raise ValueError("Provide explicit initial lots, including an empty list if none")
    lots, identities = [], set()
    for lot in initial_lots:
        identity = lot.get("lot_id") if isinstance(lot, dict) else None
        if not isinstance(identity, str) or not identity or identity in identities or identity.startswith("receipt_"):
            raise ValueError("Initial lot IDs must be unique, nonempty and not use receipt_ prefix")
        identities.add(identity)
        quantity = nonnegative(lot.get("units"), "initial lot units", integer=True)
        expiry = nonnegative(lot.get("expiry_day"), "initial expiry_day", integer=True)
        lots.append({"lot_id": identity, "units": quantity, "expiry_day": expiry, "received_day": -1})

    rng = np.random.default_rng(seed)
    # Common random numbers by day, independent of the number of policy orders.
    leads = np.maximum(1, np.rint(rng.normal(lead, lead_sd, len(units)))).astype(int)
    pending, ledger, daily = [], [], []
    evaluation = dict(receipts=0, consumed=0, expired=0, demand=0, stockout_days=0,
                      closing_sum=0, opening=0)
    totals = dict(initial=sum(lot["units"] for lot in lots), receipts=0, consumed=0, expired=0)
    serial = 0
    for day, requested in enumerate(units):
        opening = sum(lot["units"] for lot in lots)
        if day == burn:
            evaluation["opening"] = opening
        movements = {lot["lot_id"]: {"opening": lot["units"], "receipts": 0,
                                    "consumed": 0, "expired": 0} for lot in lots}
        arrivals = [order for order in pending if order["arrival_day"] == day]
        pending = [order for order in pending if order["arrival_day"] != day]
        receipts = sum(order["units"] for order in arrivals)
        for order in arrivals:
            lot = {"lot_id": order["lot_id"], "units": order["units"], "expiry_day": day + shelf,
                   "received_day": day}
            lots.append(lot)
            movements[lot["lot_id"]] = {"opening": 0, "receipts": lot["units"], "consumed": 0, "expired": 0}
        expired = 0
        for lot in lots:
            if lot["expiry_day"] <= day:
                movements[lot["lot_id"]]["expired"] = lot["units"]
                expired += lot["units"]
                lot["units"] = 0
        lots.sort(key=(lambda lot: (lot["received_day"], lot["lot_id"])) if name == "P0"
                  else (lambda lot: (lot["expiry_day"], lot["received_day"], lot["lot_id"])))
        remaining = requested
        for lot in lots:
            consumed = min(lot["units"], remaining)
            lot["units"] -= consumed
            remaining -= consumed
            movements[lot["lot_id"]]["consumed"] = consumed
        fulfilled = requested - remaining
        closing = sum(lot["units"] for lot in lots)
        for lot in lots:
            movement = movements[lot["lot_id"]]
            if movement["opening"] + movement["receipts"] - movement["consumed"] - movement["expired"] != lot["units"]:
                raise AssertionError("Lot conservation failed")
            if retain_ledger:
                ledger.append({"day": day, "lot_id": lot["lot_id"], **movement, "closing": lot["units"]})
        if opening + receipts - fulfilled - expired != closing:
            raise AssertionError("Daily conservation failed")
        lots = [lot for lot in lots if lot["units"] > 0]
        for key, value in (("receipts", receipts), ("consumed", fulfilled), ("expired", expired)):
            totals[key] += value
            if day >= burn:
                evaluation[key] += value
        if day >= burn:
            evaluation["demand"] += requested
            evaluation["stockout_days"] += int(remaining > 0)
            evaluation["closing_sum"] += closing
        position = closing + sum(order["units"] for order in pending)
        order_units = 0
        if name == "P0" and day % 30 == 0:
            order_units = initial_order if day == 0 else sum(units[day-30:day])
        elif name == "P1" and position <= reorder:
            order_units = lot_size
        elif name == "P2" and position <= daily_rop[day]:
            capacity_packs = int(daily_mean[day] * max(0, shelf - lead) / pack)
            order_units = min(daily_lots[day], capacity_packs * pack)
        if order_units:
            serial += 1
            pending.append({"lot_id": f"receipt_{serial}", "units": order_units,
                            "arrival_day": day + int(leads[day])})
        daily.append({"day": day, "opening": opening, "receipts": receipts, "consumed": fulfilled,
                      "expired": expired, "closing": closing, "demand": requested, "lost_sales_units": remaining,
                      "ordered_units": order_units, "evaluated": day >= burn})
    elapsed = len(units) - burn
    mean_stock = evaluation["closing_sum"] / elapsed
    supplied = evaluation["opening"] + evaluation["receipts"]
    if totals["initial"] + totals["receipts"] - totals["consumed"] - totals["expired"] != daily[-1]["closing"]:
        raise AssertionError("Run conservation failed")
    return {"evidence_label": "Simulated", "assumption_ids": ["A1", "A2", "A3", "A4", "A5", "A6", "A7"],
            "policy_version": "offline_fefo_research_v1", "policy": name, "seed": seed,
            "operational_approval": False, "burn_in_days": burn, "evaluated_days": elapsed,
            "totals": totals, "evaluation": evaluation,
            "wastage_pct": 100 * evaluation["expired"] / supplied if supplied else None,
            "unit_fill_rate_pct": 100 * evaluation["consumed"] / evaluation["demand"] if evaluation["demand"] else None,
            "annualized_turnover": evaluation["consumed"] * 365 / elapsed / mean_stock if mean_stock else None,
            "stockout_days_per_year": evaluation["stockout_days"] * 365 / elapsed,
            "mean_daily_closing_stock": mean_stock, "pipeline_units_at_end": sum(order["units"] for order in pending),
            "daily": daily if retain_ledger else [], "lot_ledger": ledger}


def monte_carlo_comparison(monthly_demand, policies, *, runs=1000, seed=20261030,
                           concentration=1.0, **simulation_inputs):
    """Shared sampled demand/lead paths across policies; no trained inputs invented.

    Intervals are simulation quantiles, not confidence intervals for a measured
    company outcome. Unit-cost-constant turnover equals value-based turnover for
    this single presentation; mixed products must be valued separately.
    """
    count = nonnegative(runs, "runs", positive=True, integer=True)
    if count > 10_000:
        raise ValueError("At most 10,000 simulation runs per call")
    if not policies or len({policy.get("name") for policy in policies}) != len(policies):
        raise ValueError("Provide distinct explicit simulation policies")
    summaries = {policy["name"]: [] for policy in policies}
    for run in range(count):
        demand_seed, lead_seed = np.random.SeedSequence([seed, run]).spawn(2)
        lead_seed = int(lead_seed.generate_state(1)[0])
        path = disaggregate_monthly(monthly_demand, seed=demand_seed, concentration=concentration)
        for policy in policies:
            result = simulate_daily(path["demand"], policy=policy, seed=lead_seed, **simulation_inputs)
            summaries[policy["name"]].append({key: result[key] for key in
                                            ("wastage_pct", "unit_fill_rate_pct", "annualized_turnover", "stockout_days_per_year")})
    rows = []
    for name, values in summaries.items():
        for metric in values[0]:
            eligible = [row[metric] for row in values if row[metric] is not None]
            rows.append({"policy": name, "metric": metric, "runs": count, "defined_runs": len(eligible),
                         "mean": float(np.mean(eligible)) if eligible else None,
                         "median": float(np.median(eligible)) if eligible else None,
                         "simulation_p025": float(np.quantile(eligible, .025)) if eligible else None,
                         "simulation_p975": float(np.quantile(eligible, .975)) if eligible else None,
                         "evidence_label": "Simulated", "operational_approval": False})
    return {"seed": seed, "runs": count, "rows": rows, "policy_version": "offline_fefo_research_v1",
            "evidence_label": "Simulated", "operational_approval": False}
