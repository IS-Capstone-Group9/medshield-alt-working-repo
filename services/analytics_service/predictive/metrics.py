"""Metrics and lead-specific empirical uncertainty, without coverage guarantees."""
import math


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
    return {model: {'scored': score([(p['actual'], p['prediction']) for p in index.values()]),
                    'common': score([(index[k]['actual'], index[k]['prediction']) for k in sorted(common)]),
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
