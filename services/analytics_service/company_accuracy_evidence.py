"""Origin-safe company-PHP error evidence; offline, unpublished research only.

The point forecast is deliberately unchanged. The single new experiment checks
whether signed residuals normalized by financial scale improve interval scores.
Empirical time-series coverage is measured, never guaranteed.
"""
import math


VERSION = 'company_mean6_asymmetric_scale_interval_v1'
BASELINES = ('last_value', 'seasonal_naive', 'mean_3', 'mean_6')
INTERVALS = ('mean6_symmetric_absolute24', 'mean6_asymmetric_scaled24')
WINDOW = 24
LEVEL = .8


def known_history(series, origin):
    if isinstance(origin, bool) or not isinstance(origin, int):
        raise ValueError('Integer calendar origin required')
    if any(isinstance(p, bool) or not isinstance(p, int) for p in series):
        raise ValueError('Integer calendar keys required')
    known = {p: value for p, value in series.items() if p <= origin}
    if not known or origin not in known:
        raise ValueError('Observed issue origin required')
    if sorted(known) != list(range(min(known), origin + 1)):
        raise ValueError('Missing financial month; missing is not zero')
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v)
           for v in known.values()):
        raise ValueError('Finite observed financial values required')
    return known


def baseline_values(series, origin):
    known = known_history(series, origin)
    if len(known) < 12:
        raise ValueError('Twelve contiguous observed months required')
    return dict(last_value=known[origin], seasonal_naive=known[origin - 11],
                mean_3=math.fsum(known[p] for p in range(origin - 2, origin + 1)) / 3,
                mean_6=math.fsum(known[p] for p in range(origin - 5, origin + 1)) / 6)


def issue_intervals(series, origin):
    """All calibration targets are completed by origin; no future input is read."""
    known = known_history(series, origin)
    first = min(known)
    if len(known) < WINDOW + 6:
        raise ValueError('Thirty contiguous observed months required')
    inner = []
    for target in range(origin - WINDOW + 1, origin + 1):
        prior = list(range(target - 6, target))
        if prior[0] < first:
            raise ValueError('Insufficient completed calibration history')
        prediction = math.fsum(known[p] for p in prior) / 6
        scale = math.fsum(abs(known[p]) for p in prior) / 6
        residual = known[target] - prediction
        inner.append(dict(origin=target - 1, target=target, actual=known[target],
                          prediction=prediction, scale=scale, residual=residual,
                          normalized_residual=residual / scale if scale > 0 else None))
    point = baseline_values(known, origin)['mean_6']
    current_scale = math.fsum(abs(known[p]) for p in range(origin - 5, origin + 1)) / 6
    radius_rank = math.ceil((WINDOW + 1) * LEVEL)
    radius = sorted(abs(row['residual']) for row in inner)[radius_rank - 1]
    lower_rank, upper_rank = math.floor((WINDOW + 1) * .1), math.ceil((WINDOW + 1) * .9)
    reference = dict(model_id=INTERVALS[0], prediction=point, lower=point - radius,
                     upper=point + radius, radius=radius, failure=None)
    candidate = dict(model_id=INTERVALS[1], prediction=point, lower=None, upper=None,
                     failure='Positive origin-local scales required')
    if current_scale > 0 and all(row['normalized_residual'] is not None for row in inner):
        scores = sorted(row['normalized_residual'] for row in inner)
        candidate.update(lower=point + current_scale * scores[lower_rank - 1],
                         upper=point + current_scale * scores[upper_rank - 1], failure=None)
    for row in (reference, candidate):
        if row['failure'] is None and (not all(math.isfinite(row[k]) for k in ('prediction', 'lower', 'upper'))
                                       or row['lower'] > row['upper']):
            raise ValueError('Invalid empirical interval')
    return dict(origin=origin, target=origin + 1, point_forecast=point,
                current_scale=current_scale, sample_count=WINDOW, inner=inner,
                symmetric_radius_rank=radius_rank, signed_lower_rank=lower_rank,
                signed_upper_rank=upper_rank, max_completed_target=origin,
                current_or_future_actual_used=False, intervals=[reference, candidate])


def summarize_intervals(rows):
    failed = sum(row['failure'] is not None for row in rows)
    if not rows or failed:
        return dict(expected_n=len(rows), n=0, failed=failed, coverage=None,
                    mean_width=None, interval_score=None,
                    reason='Incomplete interval cohort' if failed else 'No interval cases')
    widths = [row['upper'] - row['lower'] for row in rows]
    penalties = [10 * (max(row['lower'] - row['actual'], 0) + max(row['actual'] - row['upper'], 0))
                 for row in rows]
    return dict(expected_n=len(rows), n=len(rows), failed=0,
                coverage=sum(row['lower'] <= row['actual'] <= row['upper'] for row in rows) / len(rows),
                mean_width=math.fsum(widths) / len(rows),
                interval_score=math.fsum(w + p for w, p in zip(widths, penalties)) / len(rows), reason=None)


def choose_interval(reports):
    if len(reports) != 2 or any(row['stage'] != 'development' for row in reports):
        raise ValueError('Only the two complete development interval reports may select')
    indexed = {row['model_id']: row for row in reports}
    if set(indexed) != set(INTERVALS):
        raise ValueError('Expected registered interval recipes')
    reference, candidate = (indexed[name] for name in INTERVALS)
    eligible = (candidate['n'] == reference['n'] == candidate['expected_n'] == reference['expected_n']
                and candidate['n'] > 0 and not candidate['failed'] and not reference['failed']
                and reference['interval_score'] > 0
                and candidate['interval_score'] <= .95 * reference['interval_score']
                and candidate['coverage'] >= max(LEVEL, reference['coverage']))
    return dict(selected_interval=INTERVALS[1] if eligible else INTERVALS[0],
                candidate_passed_development_guard=eligible,
                guard='at least5% lower mean80% interval score;coverage>=80% and no worse than reference;complete same-case cohort',
                point_model_unchanged='mean_6', point_accuracy_improved=False,
                stage='development', later_results_used=False, publication_approved=False,
                coverage_guaranteed=False)
