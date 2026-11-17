"""Metrics and lead-specific empirical uncertainty, without coverage guarantees."""
import math


def mase_scale(training):
    """Seasonal-naive training MAE, or lag-one MAE for fewer than 13 months."""
    periods = sorted(training)
    if periods and periods != list(range(periods[0], periods[-1] + 1)):
        raise ValueError('MASE training months must be contiguous; missing is not zero')
    values = [training[p] for p in periods]
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in values):
        raise ValueError('MASE training values must be finite numbers')
    lag = 12 if len(values) >= 13 else 1
    differences = [abs(values[i] - values[i - lag]) for i in range(lag, len(values))]
    scale = sum(differences) / len(differences) if differences else None
    return dict(value=scale if scale else None, lag_months=lag, training_count=len(values),
                reason=None if scale else 'Insufficient or constant training history')


def scaled_error(points):
    """Require origin-local scales for every scored point; never shrink the cohort."""
    eligible = [p for p in points if p.get('actual') is not None and p.get('prediction') is not None]
    scales = [p.get('mase_scale') for p in eligible]
    if not eligible or any(v is None or not math.isfinite(v) or v <= 0 for v in scales):
        return dict(n=len(eligible), mase=None, reason='MASE scale unavailable for one or more scored origins')
    return dict(n=len(eligible), mase=sum(abs(p['prediction'] - p['actual']) / scale
                                        for p, scale in zip(eligible, scales)) / len(eligible), reason=None)


def diebold_mariano(points, model_id, reference_id='seasonal_naive', lead=1, power=1):
    """Paired monthly single-series HLN test, Bartlett HAC, two-sided t p-value.

    Negative statistic favors model_id. No pooling of series, leads, or sparse origins.
    Reference: https://pkg.robjhyndman.com/forecast/reference/dm.test.html
    """
    from .contracts import month
    from scipy.stats import t
    if isinstance(lead, bool) or not isinstance(lead, int) or lead < 1 or power not in (1, 2):
        raise ValueError('Positive integer lead and absolute/squared loss required')
    if model_id == reference_id:
        raise ValueError('DM requires two distinct models')
    indexes = {name: {} for name in (model_id, reference_id)}
    for p in points:
        if p['lead_months'] != lead or p['model_id'] not in indexes or p.get('actual') is None or p.get('prediction') is None:
            continue
        k = key(p)
        if k in indexes[p['model_id']]:
            raise ValueError('Duplicate evaluation point')
        if any(not math.isfinite(p[f]) for f in ('actual', 'prediction')):
            raise ValueError('Nonfinite evaluation value')
        indexes[p['model_id']][k] = p
    common = sorted(set(indexes[model_id]) & set(indexes[reference_id]))
    result = dict(n=len(common), lead_months=lead, loss='absolute' if power == 1 else 'squared',
                  model_id=model_id, reference_id=reference_id, statistic=None, p_value=None,
                  variance_estimator='bartlett_hac', reason=None)
    if len(common) <= max(2, lead):
        return dict(result, reason='Insufficient paired origins for HLN test')
    if len({k[:2] for k in common}) != 1:
        return dict(result, reason='DM requires one series and target')
    origins = sorted(month(k[2]) for k in common)
    if origins != list(range(origins[0], origins[-1] + 1)):
        return dict(result, reason='DM requires contiguous monthly paired origins')
    differences = []
    for k in common:
        a, b = indexes[model_id][k], indexes[reference_id][k]
        if a['actual'] != b['actual']:
            raise ValueError('Models disagree on the actual for a common evaluation key')
        if month(a['target_period']) - month(a['origin_period']) != lead:
            raise ValueError('Calendar lead differs from declared lead')
        differences.append(abs(a['prediction'] - a['actual']) ** power - abs(b['prediction'] - b['actual']) ** power)
    n = len(differences)
    average = sum(differences) / n
    centered = [d - average for d in differences]
    gamma = [sum(centered[i] * centered[i - lag] for i in range(lag, n)) / n for lag in range(lead)]
    variance = (gamma[0] + 2 * sum((1 - lag / lead) * gamma[lag] for lag in range(1, lead))) / n
    if variance <= 0:
        return dict(result, reason='Zero or nonpositive loss-difference variance')
    correction = math.sqrt((n + 1 - 2 * lead + lead * (lead - 1) / n) / n)
    statistic = average / math.sqrt(variance) * correction
    return dict(result, statistic=statistic, p_value=float(2 * t.sf(abs(statistic), df=n - 1)))


def score(pairs):
    if not pairs:
        return dict(n=0, mae=None, rmse=None, wape=None, bias=None, normalized_bias=None, reason='No eligible pairs')
    if any(not math.isfinite(value) for pair in pairs for value in pair):
        raise ValueError('Nonfinite evaluation value')
    errors = [predicted - actual for actual, predicted in pairs]
    denominator = sum(abs(actual) for actual, _ in pairs)
    return dict(n=len(pairs), mae=sum(map(abs, errors)) / len(pairs),
                rmse=math.sqrt(sum(e * e for e in errors) / len(pairs)),
                bias=sum(errors) / len(pairs),
                wape=100 * sum(map(abs, errors)) / denominator if denominator else None,
                normalized_bias=100 * sum(errors) / denominator if denominator else None,
                reason=None if denominator else 'Zero absolute-actual denominator')


def key(point):
    return (point['series_id'], point['target_name'], point['origin_period'], point['target_period'], point['lead_months'])


def compare(points, model_ids):
    indexes = {model: {} for model in model_ids}
    for p in points:
        if p['model_id'] in indexes and p['prediction'] is not None and p.get('actual') is not None:
            k = key(p)
            if k in indexes[p['model_id']]:
                raise ValueError('Duplicate evaluation point')
            indexes[p['model_id']][k] = p
    common = set.intersection(*(set(v) for v in indexes.values())) if indexes else set()
    for k in common:
        if len({index[k]['actual'] for index in indexes.values()}) != 1:
            raise ValueError('Models disagree on the actual for a common evaluation key')
        for field in ('mase_scale', 'mase_scale_lag_months'):
            supplied = [index[k].get(field) for index in indexes.values() if index[k].get(field) is not None]
            if any(isinstance(value, bool) or not isinstance(value, (int, float)) or
                   not math.isfinite(value) or value <= 0 for value in supplied):
                raise ValueError('Invalid common-origin MASE metadata')
            if len(set(supplied)) > 1:
                raise ValueError('Models disagree on training MASE metadata for a common evaluation key')
    shared_scales_available = all(index[k].get('mase_scale') is not None
                                  for k in common for index in indexes.values())
    return {model: {'scored': score([(p['actual'], p['prediction']) for p in index.values()]),
                    'common': score([(index[k]['actual'], index[k]['prediction']) for k in sorted(common)]),
                    'common_scaled_error': scaled_error([index[k] for k in sorted(common)])
                        if shared_scales_available else dict(n=len(common), mase=None,
                            reason='Shared origin scales unavailable for the complete common cohort'),
                    'common_keys': [list(k) for k in sorted(common)]}
            for model, index in indexes.items()}


def interval(prediction, residual_points, cutoff, lead, level):
    from .contracts import month
    support = {0.8: 20, 0.95: 40}
    if level not in support:
        raise ValueError('Unsupported nominal level')
    if prediction is not None and not math.isfinite(prediction):
        raise ValueError('Nonfinite calibration prediction')
    # Deduplicate overlapping/accidentally repeated fold evidence; no pooling of leads.
    errors = {}
    evidence = {}
    for p in residual_points:
        if p['lead_months'] != lead or month(p['target_period']) > cutoff or p['prediction'] is None or p.get('actual') is None:
            continue
        values = (p['model_id'], p['actual'], p['prediction'])
        if not all(math.isfinite(value) for value in values[1:]):
            raise ValueError('Nonfinite calibration value')
        k = key(p)
        if k in evidence and evidence[k] != values:
            raise ValueError('Conflicting calibration evidence for one evaluation key')
        evidence[k] = values
        errors[k] = abs(p['actual'] - p['prediction'])
    result = dict(level=level, lower=None, upper=None, sample_count=len(errors),
                  method='lead_specific_empirical_absolute_error',
                  reason='Insufficient lead-specific out-of-fold support')
    if prediction is not None and len(errors) >= support[level]:
        ordered = sorted(errors.values())
        radius = ordered[min(len(ordered), math.ceil((len(ordered) + 1) * level)) - 1]
        result.update(lower=prediction - radius, upper=prediction + radius, reason=None)
    return result


def interval_metrics(points, level):
    evidence = [(p['actual'], b) for p in points for b in p.get('intervals', [])
                if b['level'] == level and b['lower'] is not None and p.get('actual') is not None]
    if not evidence:
        return dict(n=0, level=level, coverage=None, mean_width=None, interval_score=None, reason='No supported held-out intervals')
    widths = [b['upper'] - b['lower'] for _, b in evidence]
    scores = [b['upper'] - b['lower'] + 2 / (1 - level) * (max(b['lower'] - actual, 0) + max(actual - b['upper'], 0)) for actual, b in evidence]
    return dict(n=len(evidence), level=level,
                coverage=sum(b['lower'] <= a <= b['upper'] for a, b in evidence) / len(evidence),
                mean_width=sum(widths) / len(evidence), interval_score=sum(scores) / len(evidence), reason=None)
