"""Offline metrics for matched model assessment cases."""

import math
from statistics import mean

from . import abc_rank_policy, rolling_accuracy


FINAL_EVIDENCE = {'prospective', 'untouched retrospective'}
MIN_CASES = 12
MIN_RELATIVE_WAPE_REDUCTION = 15.0
MAX_ABSOLUTE_BIAS = 5.0
ABSOLUTE_WAPE_TARGET = 15.0
BOOTSTRAP_DRAWS = 4000
BOOTSTRAP_SEED = 20261106


def forecast_metrics(cases, model):
    metrics = rolling_accuracy.measurement_metrics(cases, model)
    actual = [case['actual'] for case in cases]
    errors = [case['pred'][model] - case['actual'] for case in cases]
    scales = [case.get('seasonal_scale') for case in cases]
    metrics['bias'] = metrics.pop('bias_php')
    return dict(
        metrics,
        actual_total=math.fsum(actual),
        absolute_actual_total=math.fsum(map(abs, actual)),
        mase=mean(abs(error) / scale for error, scale in zip(errors, scales))
        if scales and all(scale is not None and scale > 0 for scale in scales) else None,
        overforecast_share=mean(error > 0 for error in errors) if errors else None,
        underforecast_share=mean(error < 0 for error in errors) if errors else None,
    )


def subgroups(cases):
    """Rank high-value targets, breaking ties by target month."""
    ranked = sorted(cases, key=lambda case: (-case['actual'], case['target']))
    return {
        'top_quartile': ranked[:max(1, len(ranked) // 4)],
        'june_september': [c for c in cases if '06' <= c['target'][5:] <= '09'],
        '2025_2026': [c for c in cases if '2025' <= c['target'][:4] <= '2026'],
    }


def forecast_verdict(evidence_class, n, reduction, bias, ci95):
    if (evidence_class not in FINAL_EVIDENCE or n < MIN_CASES or reduction is None
            or bias is None or ci95 is None):
        return 'not yet verifiable'
    if reduction >= MIN_RELATIVE_WAPE_REDUCTION and abs(bias) <= MAX_ABSOLUTE_BIAS and ci95[1] < 0:
        return 'met'
    return 'not met'


def forecast_comparison(cases, model, reference, block, evidence_class):
    # The measurement comparison rejects duplicate/missing cases and gives no
    # interval when there are too few blocks or any draw has a zero denominator.
    paired = rolling_accuracy.measurement_comparison(
        cases, model, reference, draws=BOOTSTRAP_DRAWS, block=block,
    )
    candidate = forecast_metrics(cases, model)
    baseline = forecast_metrics(cases, reference)
    wape = candidate['wape_percent']
    bias = candidate['normalized_bias_percent']
    reduction = paired['relative_fva_percent']
    ci95 = paired['bootstrap_ci95_pp']
    return dict(
        candidate=candidate, reference=baseline,
        wape_difference_pp=paired['difference_pp'], relative_wape_reduction_percent=reduction,
        ci95_pp=ci95, bootstrap_block=block, bootstrap_unavailable_reason=paired['unavailable_reason'],
        below_15_percent_wape=None if wape is None else wape < ABSOLUTE_WAPE_TARGET,
        verdict=forecast_verdict(evidence_class, len(cases), reduction, bias, ci95),
        subgroups={key: dict(candidate=forecast_metrics(part, model), reference=forecast_metrics(part, reference))
                   for key, part in subgroups(cases).items()},
    )


def interval_metrics(cases, method, nominal):
    widths, scores, hits = [], [], []
    for case in cases:
        lower, upper = case[method]
        actual = case['actual']
        if not all(map(math.isfinite, (lower, upper, actual))) or lower > upper:
            raise ValueError('Invalid prediction interval')
        width = upper - lower
        widths.append(width)
        scores.append(width + 2 * max(lower - actual, actual - upper, 0.0) / (1 - nominal))
        hits.append(lower <= actual <= upper)
    denominator = math.fsum(abs(case['actual']) for case in cases)
    return dict(n=len(cases), coverage=mean(hits), mean_width=mean(widths),
                width_over_actual=math.fsum(widths) / denominator if denominator else None,
                mean_interval_score=mean(scores))


def abc_metrics(cases, method):
    classes = abc_rank_policy.CLASSES
    actual = [case['actual'] for case in cases]
    predicted = [case[method] for case in cases]
    if set(actual + predicted) - set(classes):
        raise ValueError('Unknown ABC class')
    matrix = [[sum(a == label and p == estimate for a, p in zip(actual, predicted))
               for estimate in classes] for label in classes]
    predicted_a = sum(row[0] for row in matrix)
    cold = [case for case in cases if case['cold_start'] and case['actual'] == 'A']
    return dict(n=len(cases), macro_f1=abc_rank_policy.macro_f1(actual, predicted),
                class_a_recall=abc_rank_policy.a_recall(actual, predicted),
                class_a_precision=matrix[0][0] / predicted_a if predicted_a else None,
                cold_start_a_recall=mean(case[method] == 'A' for case in cold) if cold else None,
                confusion_matrix=matrix)
