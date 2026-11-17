"""Offline M1-M5 horizon-specific routing, STL strength gating, combos, break switch & conformal bands.

Pure functions using only origin-available history. Retrospective development evidence only;
grants no forecast promotion, activation, or business approval.
"""
from __future__ import annotations

import math
from numbers import Real

import numpy as np
from statsmodels.tsa.seasonal import STL

from . import rolling_accuracy as ra


def stl_seasonal_strength(history: list[float]) -> float | None:
    """Compute origin-local STL seasonal strength F_s on history only; None if < 24 months or degenerate."""
    if len(history) < 24:
        return None
    arr = np.asarray(history, dtype=float)
    if not np.isfinite(arr).all():
        raise ValueError('STL requires finite historical values')
    if np.all(arr == arr[0]):
        return 0.0
    res = STL(arr, period=12, robust=True).fit()
    denom = float(np.var(res.seasonal + res.resid))
    if denom <= 0.0:
        return 0.0
    return float(max(0.0, 1.0 - float(np.var(res.resid)) / denom))


def detect_level_break(history: list[float], recent_window: int = 3, baseline_window: int = 12) -> bool:
    """True when the last `recent_window` values lie strictly outside the prior `baseline_window` range."""
    if recent_window < 1 or baseline_window < 1:
        raise ValueError('Positive break windows required')
    if len(history) < recent_window + baseline_window:
        return False
    baseline = history[-(recent_window + baseline_window):-recent_window]
    recent = history[-recent_window:]
    lo, hi = min(baseline), max(baseline)
    return all(v > hi for v in recent) or all(v < lo for v in recent)


def pooled_category_seasonal_profile(
    category_series_map: dict[str, list[tuple[str, float]]],
    min_months: int = 24,
    winsor_limits: tuple[float, float] = (0.10, 0.90),
) -> dict[int, float] | None:
    """Build robust median/Winsorized calendar-month ratios (1..12) across eligible category series."""
    lo_q, hi_q = winsor_limits
    if not (0.0 <= lo_q < hi_q <= 1.0):
        raise ValueError('Invalid Winsor quantile bounds')
    by_month: dict[int, list[float]] = {m: [] for m in range(1, 13)}
    for series in category_series_map.values():
        if len(series) < min_months:
            continue
        vals = np.asarray([float(v) for _, v in series], dtype=float)
        if not np.isfinite(vals).all() or np.mean(vals) <= 0:
            continue
        lo, hi = np.percentile(vals, [lo_q * 100.0, hi_q * 100.0])
        clipped = np.clip(vals, lo, hi)
        base_level = float(np.median(clipped))
        if base_level <= 0:
            continue
        for (label, _), val in zip(series, clipped):
            month_num = int(label.split('-')[1])
            by_month[month_num].append(float(val) / base_level)
    if any(not by_month[m] for m in range(1, 13)):
        return None
    raw = {m: float(np.median(by_month[m])) for m in range(1, 13)}
    mean_factor = sum(raw.values()) / 12.0
    if mean_factor <= 0:
        return None
    return {m: raw[m] / mean_factor for m in range(1, 13)}


def shrunk_seasonal_forecast(
    product_history: list[tuple[str, float]],
    lead: int,
    category_profile: dict[int, float] | None,
    shrinkage_k: int = 12,
) -> float | None:
    """Forecast `lead` months ahead by shrinking product month-of-year ratio toward `category_profile`."""
    if lead < 1 or shrinkage_k < 0 or not product_history or category_profile is None:
        return None
    last_label = product_history[-1][0]
    target_idx = ra.month_index(last_label) + lead
    target_month = (target_idx % 12) + 1
    cat_factor = category_profile.get(target_month)
    if cat_factor is None or cat_factor <= 0:
        return None
    vals = [float(v) for _, v in product_history]
    recent_level = float(np.mean(vals[-6:])) if len(vals) >= 6 else float(np.mean(vals))
    if recent_level <= 0:
        return max(0.0, recent_level)
    same_month = [float(v) / recent_level for lbl, v in product_history if int(lbl.split('-')[1]) == target_month]
    n = len(same_month)
    prod_factor = float(np.median(same_month)) if n else cat_factor
    w = n / (n + shrinkage_k) if (n + shrinkage_k) > 0 else 0.0
    blended_factor = w * prod_factor + (1.0 - w) * cat_factor
    return float(recent_level * blended_factor)


def _valid_series(series: list[tuple[str, float]]) -> tuple[list[str], list[float]]:
    labels, values = [], []
    for label, value in series:
        if (
            not isinstance(label, str)
            or len(label) != 7
            or label[4] != '-'
            or isinstance(value, bool)
            or not isinstance(value, Real)
            or not math.isfinite(float(value))
        ):
            raise ValueError('Finite observations with YYYY-MM calendar months required')
        labels.append(label)
        values.append(float(value))
    indexes = [ra.month_index(p) for p in labels]
    if indexes and indexes != list(range(indexes[0], indexes[0] + len(indexes))):
        raise ValueError('Monthly input must be contiguous and ordered; no gap filling')
    return labels, values


def route_horizon_cases(
    series: list[tuple[str, float]],
    lead: int,
    *,
    min_history: int = 24,
    seasonal_threshold: float = 0.4,
    break_cooldown: int = 6,
) -> list[dict]:
    """Build origin-only M1-M4 horizon-routed cases on contiguous monthly history."""
    if isinstance(lead, bool) or not isinstance(lead, int) or lead < 1:
        raise ValueError('Positive integer lead required')
    if isinstance(min_history, bool) or not isinstance(min_history, int) or min_history < 12:
        raise ValueError('min_history must be >= 12')
    labels, values = _valid_series(series)
    cases: list[dict] = []
    last_break_idx: int | None = None

    for origin in range(min_history - 1, len(values) - lead):
        history = values[: origin + 1]
        origin_label = labels[origin]
        target_idx = origin + lead
        target_label = labels[target_idx]

        mean3 = ra.forecast('mean_3', history, lead)
        mean6 = ra.forecast('mean_6', history, lead)
        last_val = history[-1]
        snaive = ra.forecast('seasonal_naive_12', history, lead)
        f_s = stl_seasonal_strength(history)
        is_break = detect_level_break(history)
        if is_break:
            last_break_idx = origin
        in_cooldown = last_break_idx is not None and (origin - last_break_idx) < break_cooldown

        seasonal_eligible = bool(
            lead > 1 and snaive is not None and f_s is not None and f_s >= seasonal_threshold
        )
        routed_base = snaive if seasonal_eligible else mean6
        mean6_last_blend = 0.5 * mean6 + 0.5 * last_val if mean6 is not None else None
        combo_equal = 0.5 * mean6 + 0.5 * snaive if (mean6 is not None and snaive is not None) else None

        known = [c for c in cases if ra.month_index(c['target']) <= ra.month_index(origin_label)]
        # Origin-local bias correction for seasonal naive (M1)
        snaive_errs = [
            (c['pred']['seasonal_naive_12'] - c['actual']) / c['pred']['seasonal_naive_12']
            for c in known[-12:]
            if c['pred']['seasonal_naive_12'] and c['pred']['seasonal_naive_12'] > 0
        ]
        if seasonal_eligible and len(snaive_errs) >= 6 and snaive is not None:
            factor = 1.0 + float(np.mean(snaive_errs))
            routed_bias_seasonal = snaive / factor if factor > 0.2 else snaive
        else:
            routed_bias_seasonal = routed_base

        # M3 inverse-error clipped combination of mean_6 and seasonal_naive_12
        paired_known = [
            c for c in known[-12:]
            if c['pred']['mean_6'] is not None and c['pred']['seasonal_naive_12'] is not None
        ]
        if len(paired_known) >= 6 and mean6 is not None and snaive is not None:
            mae_m6 = max(1e-9, float(np.mean([abs(c['pred']['mean_6'] - c['actual']) for c in paired_known])))
            mae_sn = max(1e-9, float(np.mean([abs(c['pred']['seasonal_naive_12'] - c['actual']) for c in paired_known])))
            raw_w_m6 = (1.0 / mae_m6) / ((1.0 / mae_m6) + (1.0 / mae_sn))
            w_m6 = min(0.8, max(0.2, raw_w_m6))
            w_sn = 1.0 - w_m6
            combo_inv = w_m6 * mean6 + w_sn * snaive
        else:
            combo_inv = combo_equal

        break_switched = mean3 if (in_cooldown and mean3 is not None) else routed_base

        cases.append({
            'origin': origin_label,
            'target': target_label,
            'lead': lead,
            'actual': values[target_idx],
            'stl_seasonal_strength': f_s,
            'seasonal_eligible': seasonal_eligible,
            'level_break_detected': is_break,
            'in_break_cooldown': in_cooldown,
            'pred': {
                'mean_3': mean3,
                'mean_6': mean6,
                'last_value': last_val,
                'seasonal_naive_12': snaive,
                'mean6_last_value_blend': mean6_last_blend,
                'routed_baseline': routed_base,
                'routed_bias_seasonal': routed_bias_seasonal,
                'combo_equal': combo_equal,
                'combo_inverse_error': combo_inv,
                'break_switched': break_switched,
            },
        })
    return cases


def conformal_prediction_band(
    cases: list[dict],
    model: str,
    levels: tuple[float, ...] = (0.80, 0.95),
    window: int | None = None,
    minimum: int = 12,
) -> dict[float, dict | None]:
    """M5 origin-local level-scaled split-conformal intervals across requested confidence levels."""
    out: dict[float, dict | None] = {}
    for level in levels:
        if not (0.0 < level < 1.0):
            raise ValueError('Conformal level must be in (0, 1)')
        hits = 0
        total = 0
        rel_widths = 0.0
        for i, case in enumerate(cases):
            pred = case['pred'].get(model)
            if pred is None or pred <= 0:
                continue
            known = [
                k for k in cases[:i]
                if ra.month_index(k['target']) <= ra.month_index(case['origin'])
                and k['pred'].get(model) is not None and k['pred'][model] > 0
            ]
            if window:
                known = known[-window:]
            if len(known) < minimum:
                continue
            errs = sorted(abs(k['actual'] / k['pred'][model] - 1.0) for k in known)
            rank = min(len(errs), int(math.ceil((len(errs) + 1) * level)))
            q = errs[rank - 1]
            lo = max(0.0, pred * (1.0 - q))
            hi = pred * (1.0 + q)
            total += 1
            if lo <= case['actual'] <= hi:
                hits += 1
            rel_widths += (hi - lo) / pred
        out[level] = (
            None if total == 0
            else {
                'cases': total,
                'coverage': hits / total,
                'mean_relative_width': rel_widths / total,
            }
        )
    return out
