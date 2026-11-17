"""Offline rolling-origin accuracy study helpers (pre-registered 6 Nov 2026).

Pure functions. Every forecaster receives only history at or before its origin.
Evidence from this module is retrospective development evidence, never an
untouched test, and grants no activation or publication approval.
"""
from __future__ import annotations

import numpy as np
import math
import re
from numbers import Real

COMPARATORS = ('mean_3', 'mean_6', 'seasonal_naive_12')
CANDIDATES = ('median_6', 'winsor_mean_12', 'combo_equal', 'combo_robust', 'bias_mean_6')


def measurement_cases(series, horizon=1, target='point', min_history=24, include_growth=False):
    """PD0 calendar-safe cases; total targets never masquerade as monthly leads.

    Baselines are origin-only. The single PD2 recipe is opt-in so generating a
    baseline scoreboard does not silently try a challenger on extra targets.
    """
    if (isinstance(horizon, bool) or not isinstance(horizon, int) or horizon < 1
            or isinstance(min_history, bool) or not isinstance(min_history, int) or min_history < 1
            or target not in ('point', 'total') or (include_growth and target != 'total')):
        raise ValueError('Positive integer horizon/history and point/total target required')
    labels, values = [], []
    for label, value in series:
        if (not isinstance(label, str) or not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', label)
                or isinstance(value, bool) or not isinstance(value, Real) or not math.isfinite(value)):
            raise ValueError('Finite observations with valid calendar months required')
        labels.append(label)
        values.append(float(value))
    indexes = [month_index(p) for p in labels]
    if indexes and indexes != list(range(indexes[0], indexes[0] + len(indexes))):
        raise ValueError('Monthly input must be unique, ordered and contiguous; no gap filling')
    required = max(min_history, 2 * horizon if target == 'total' else 1)
    cases = []
    for origin in range(required - 1, len(values) - horizon):
        history = values[:origin + 1]
        multiplier = horizon if target == 'total' else 1
        predictions = {'last_value': history[-1] * multiplier,
                       'mean_3': sum(history[-3:]) / 3 * multiplier if len(history) >= 3 else None,
                       'mean_6': sum(history[-6:]) / 6 * multiplier if len(history) >= 6 else None}
        seasonal_indexes = ([origin + horizon - 12] if target == 'point'
                            else list(range(origin + 1 - 12, origin + horizon + 1 - 12)))
        predictions['seasonal_naive_12'] = (sum(values[i] for i in seasonal_indexes)
                                           if all(0 <= i <= origin for i in seasonal_indexes) else None)
        fallback = False
        if target == 'total':
            recent = sum(history[-horizon:])
            predictions['trailing_sum'] = recent
            if include_growth:
                previous = sum(history[-2 * horizon:-horizon])
                fallback = previous <= 0
                predictions['half_growth'] = recent if fallback else recent * (1 + .5 * (recent / previous - 1))
        if any(v is not None and not math.isfinite(v) for v in predictions.values()):
            raise ValueError('Nonfinite prediction; stop rather than drop the case')
        actual = values[origin + horizon] if target == 'point' else sum(values[origin + 1:origin + horizon + 1])
        cases.append({'origin': labels[origin], 'target_start': labels[origin + horizon if target == 'point' else origin + 1],
                      'target': labels[origin + horizon], 'horizon': horizon, 'target_kind': target,
                      'actual': actual, 'pred': predictions, 'growth_fallback': fallback})
    return cases


def measurement_metrics(cases, model):
    """All supplied cases or an explicit error; percentage metrics use absolute actuals."""
    actual, predicted = [], []
    for case in cases:
        prediction = case['pred'].get(model)
        if prediction is None or not math.isfinite(prediction) or not math.isfinite(case['actual']):
            raise ValueError('Cannot silently remove a missing/nonfinite model case')
        actual.append(case['actual'])
        predicted.append(prediction)
    if not actual:
        return dict(n=0, mae=None, rmse=None, wape_percent=None, bias_php=None, normalized_bias_percent=None)
    errors = [p - a for a, p in zip(actual, predicted)]
    denominator = sum(map(abs, actual))
    return dict(n=len(actual), mae=sum(map(abs, errors)) / len(actual),
                rmse=math.sqrt(sum(e * e for e in errors) / len(actual)), bias_php=sum(errors) / len(actual),
                wape_percent=100 * sum(map(abs, errors)) / denominator if denominator else None,
                normalized_bias_percent=100 * sum(errors) / denominator if denominator else None)


def measurement_comparison(cases, candidate='half_growth', reference='trailing_sum', draws=4000, block=None, split='2025-01'):
    """One paired PD2 comparison, with overlap-aware intervals and no post-hoc selection."""
    keys = [(c['origin'], c['target_start'], c['target'], c['horizon'], c['target_kind']) for c in cases]
    if len(set(keys)) != len(keys):
        raise ValueError('Duplicate evaluation case')
    if len({(c['horizon'], c['target_kind']) for c in cases}) > 1:
        raise ValueError('Compare one target and horizon at a time')
    if isinstance(draws, bool) or not isinstance(draws, int) or draws < 1:
        raise ValueError('Positive integer bootstrap count required')
    block = block if block is not None else (cases[0]['horizon'] if cases else 1)
    if isinstance(block, bool) or not isinstance(block, int) or block < 1:
        raise ValueError('Positive integer block required')
    cand, ref = measurement_metrics(cases, candidate), measurement_metrics(cases, reference)
    difference = None if cand['wape_percent'] is None else cand['wape_percent'] - ref['wape_percent']
    relative = None if not ref['wape_percent'] else 100 * (1 - cand['wape_percent'] / ref['wape_percent'])
    halves = []
    for group in ([c for c in cases if c['target'] < split], [c for c in cases if c['target'] >= split]):
        cm, rm = measurement_metrics(group, candidate), measurement_metrics(group, reference)
        halves.append({'n': len(group), 'difference_pp': None if cm['wape_percent'] is None else cm['wape_percent'] - rm['wape_percent']})
    interval, reason = None, None
    if difference is None:
        reason = 'Zero absolute-actual denominator or no cases'
    elif len(cases) < 2 * block:
        reason = 'Fewer than two bootstrap blocks'
    else:
        rng = np.random.default_rng(20261106)
        samples = []
        for _ in range(draws):
            starts = rng.integers(0, len(cases) - block + 1, size=int(np.ceil(len(cases) / block)))
            indexes = np.concatenate([np.arange(s, s + block) for s in starts])[:len(cases)]
            subset = [cases[i] for i in indexes]
            c, r = measurement_metrics(subset, candidate), measurement_metrics(subset, reference)
            if c['wape_percent'] is None:
                reason = 'Zero denominator in a bootstrap sample; no redraw'
                break
            samples.append(c['wape_percent'] - r['wape_percent'])
        if reason is None:
            interval = [float(v) for v in np.percentile(samples, [2.5, 97.5])]
    wins = bool(interval and interval[1] < 0 and abs(cand['normalized_bias_percent']) <= 5
                and all(h['difference_pp'] is not None and h['difference_pp'] < 0 for h in halves))
    return {'candidate': candidate, 'reference': reference, 'cases': len(cases), 'candidate_metrics': cand, 'reference_metrics': ref,
            'difference_pp': difference, 'fva_pp': None if difference is None else -difference,
            'relative_fva_percent': relative, 'halves': halves, 'bootstrap_ci95_pp': interval,
            'bootstrap_block': block, 'bootstrap_draws': draws, 'unavailable_reason': reason,
            'growth_fallback_cases': sum(c['growth_fallback'] for c in cases), 'retrospective_rule_pass': wins,
            'publication_approved': False, 'activation_allowed': False}


def month_index(label: str) -> int:
    year, month = label.split('-')
    return int(year) * 12 + int(month) - 1


def month_label(index: int) -> str:
    return f'{index // 12}-{index % 12 + 1:02d}'


def contiguous_run(values: dict[str, float], end: str, minimum: int = 60):
    """Longest contiguous run ending at `end`; missing months are never filled."""
    stop = month_index(end)
    if end not in values:
        return None
    start = stop
    while month_label(start - 1) in values:
        start -= 1
    if stop - start + 1 < minimum:
        return None
    return [(month_label(i), float(values[month_label(i)])) for i in range(start, stop + 1)]


def base_forecast(name: str, history: list[float]) -> float | None:
    h = np.asarray(history, dtype=float)
    if name == 'mean_3':
        return float(h[-3:].mean()) if len(h) >= 3 else None
    if name == 'mean_6':
        return float(h[-6:].mean()) if len(h) >= 6 else None
    if name == 'seasonal_naive_12':
        return None  # needs the lead; handled in forecast()
    if name == 'median_6':
        return float(np.median(h[-6:])) if len(h) >= 6 else None
    if name == 'winsor_mean_12':
        if len(h) < 12:
            return None
        t = h[-12:]
        lo, hi = np.percentile(t, [10, 90])
        return float(np.clip(t, lo, hi).mean())
    raise KeyError(name)


def forecast(name: str, history: list[float], lead: int) -> float | None:
    if name == 'seasonal_naive_12':
        # value 12 months before the target month; target is origin + lead
        position = len(history) + lead - 1 - 12
        if position < 0 or position >= len(history):
            return None
        return float(history[position])
    if name == 'combo_equal':
        parts = [forecast(n, history, lead) for n in COMPARATORS]
        return None if any(p is None for p in parts) else float(np.mean(parts))
    if name == 'combo_robust':
        parts = [forecast(n, history, lead) for n in ('mean_3', 'mean_6', 'median_6')]
        return None if any(p is None for p in parts) else float(np.mean(parts))
    return base_forecast(name, history)


def rolling_cases(series: list[tuple[str, float]], lead: int, min_history: int = 24):
    """All origins with enough history. Each case keeps its origin and target labels."""
    labels = [p for p, _ in series]
    values = [v for _, v in series]
    cases = []
    for origin in range(min_history - 1, len(values) - lead):
        history = values[:origin + 1]
        target = origin + lead
        preds = {n: forecast(n, history, lead) for n in COMPARATORS + ('median_6', 'winsor_mean_12', 'combo_equal', 'combo_robust')}
        cases.append({'origin': labels[origin], 'target': labels[target], 'actual': values[target], 'pred': preds})
    # bias-corrected mean_6: only past errors whose target <= current origin
    for i, case in enumerate(cases):
        known = [c for c in cases[:i] if month_index(c['target']) <= month_index(case['origin'])]
        errs = [(c['pred']['mean_6'] - c['actual']) / c['pred']['mean_6'] for c in known[-12:]
                if c['pred']['mean_6'] and c['pred']['mean_6'] > 0]
        base = case['pred']['mean_6']
        case['pred']['bias_mean_6'] = base / (1 + float(np.mean(errs))) if len(errs) >= 6 and base and (1 + float(np.mean(errs))) > 0.2 else base
    return cases


def wape(actual, pred) -> float | None:
    a = np.asarray(actual, dtype=float)
    p = np.asarray(pred, dtype=float)
    denom = np.abs(a).sum()
    return None if denom == 0 else float(np.abs(p - a).sum() / denom)


def norm_bias(actual, pred) -> float | None:
    a = np.asarray(actual, dtype=float)
    p = np.asarray(pred, dtype=float)
    denom = np.abs(a).sum()
    return None if denom == 0 else float((p - a).sum() / denom)


def block_bootstrap_diff(actual, cand, ref, draws=4000, block=3, seed=20261106):
    """Moving-block bootstrap of WAPE(cand) - WAPE(ref) on identical cases."""
    a = np.asarray(actual, float)
    c = np.asarray(cand, float)
    r = np.asarray(ref, float)
    n = len(a)
    rng = np.random.default_rng(seed)
    nblocks = int(np.ceil(n / block))
    out = np.empty(draws)
    for d in range(draws):
        starts = rng.integers(0, n - block + 1, size=nblocks)
        idx = np.concatenate([np.arange(s, s + block) for s in starts])[:n]
        out[d] = wape(a[idx], c[idx]) - wape(a[idx], r[idx])
    lo, hi = np.percentile(out, [2.5, 97.5])
    return float(lo), float(hi)


def evaluate(cases, split='2025-01', draws=4000):
    """Score comparators and candidates against the pre-registered reference."""
    complete = [c for c in cases if all(c['pred'][n] is not None for n in COMPARATORS + CANDIDATES)]
    actual = [c['actual'] for c in complete]
    scores = {n: wape(actual, [c['pred'][n] for c in complete]) for n in COMPARATORS + CANDIDATES}
    reference = min(COMPARATORS, key=lambda n: scores[n])
    early = [c for c in complete if c['target'] < split]
    late = [c for c in complete if c['target'] >= split]
    rows = {}
    for n in COMPARATORS + CANDIDATES:
        pred = [c['pred'][n] for c in complete]
        ref = [c['pred'][reference] for c in complete]
        diff = scores[n] - scores[reference]
        lo, hi = block_bootstrap_diff(actual, pred, ref, draws=draws) if n != reference else (0.0, 0.0)
        halves = []
        for part in (early, late):
            if part:
                pa = [c['actual'] for c in part]
                halves.append(wape(pa, [c['pred'][n] for c in part]) - wape(pa, [c['pred'][reference] for c in part]))
        bias = norm_bias(actual, pred)
        wins = (n not in COMPARATORS and hi < 0 and abs(bias) <= 0.05 and len(halves) == 2 and all(h < 0 for h in halves))
        rows[n] = {'wape': scores[n], 'bias': bias, 'diff_vs_reference': diff, 'ci95': [lo, hi],
                   'half_diffs': halves, 'wins': bool(wins)}
    return {'cases': len(complete), 'reference': reference, 'models': rows}


def interval_coverage(cases, model='mean_6', level=0.8, minimum=12):
    """Empirical interval from past relative errors known at the origin."""
    lo_q, hi_q = (1 - level) / 2 * 100, (1 + level) / 2 * 100
    hits = widths = total = 0
    for i, c in enumerate(cases):
        p = c['pred'][model]
        if not p or p <= 0:
            continue
        known = [k for k in cases[:i] if month_index(k['target']) <= month_index(c['origin'])
                 and k['pred'][model] and k['pred'][model] > 0]
        if len(known) < minimum:
            continue
        rel = [k['actual'] / k['pred'][model] - 1 for k in known]
        lo, hi = np.percentile(rel, [lo_q, hi_q])
        low, high = p * (1 + lo), p * (1 + hi)
        total += 1
        hits += low <= c['actual'] <= high
        widths += (high - low) / p
    if not total:
        return None
    return {'cases': total, 'coverage': float(hits) / total, 'mean_relative_width': float(widths) / total}


def conformal_coverage(cases, model, level=0.8, window=None, minimum=12):
    """Symmetric split-conformal interval on relative errors known at the origin.

    window=None uses every past error; an integer keeps only the latest errors.
    """
    hits = widths = total = 0
    for i, c in enumerate(cases):
        p = c['pred'][model]
        if not p or p <= 0:
            continue
        known = [k for k in cases[:i] if month_index(k['target']) <= month_index(c['origin'])
                 and k['pred'][model] and k['pred'][model] > 0]
        if window:
            known = known[-window:]
        if len(known) < minimum:
            continue
        errs = sorted(abs(k['actual'] / k['pred'][model] - 1) for k in known)
        rank = min(len(errs), int(np.ceil((len(errs) + 1) * level)))
        half = errs[rank - 1]
        low, high = max(p * (1 - half), 0.0), p * (1 + half)
        total += 1
        hits += low <= c['actual'] <= high
        widths += (high - low) / p
    if not total:
        return None
    return {'cases': total, 'coverage': float(hits) / total, 'mean_relative_width': float(widths) / total}
