"""Draft sales-only benchmarks; retrospective evaluation, never archived forecasts.

No zero imputation, mixed-product quantities, future regressors or claimed champion.
Intervals are descriptive historical error bands, not calibrated confidence levels.
"""
import math
from collections import defaultdict
from datetime import date, datetime
from zoneinfo import ZoneInfo

from services.analytics_service.sales_sectors import load_sectors

MODELS = {'seasonal_naive': 'Seasonal naive', 'last_value': 'Last observed value'}
HORIZONS = (3, 6, 12)


def month_number(period):
    year, month = map(int, period.split('-'))
    if not 1 <= month <= 12:
        raise ValueError('Invalid month')
    return year * 12 + month - 1


def period_name(number):
    year, month = divmod(number, 12)
    return f'{year:04d}-{month + 1:02d}'


def predict(series, origin, target, model):
    training = {p: value for p, value in series.items() if p <= origin}
    minimum = 24 if model == 'seasonal_naive' else 2
    if len(training) < minimum or not 1 <= target - origin <= 12:
        return None
    if model == 'seasonal_naive':
        return training.get(target - 12)
    return training[max(training)]


def error_bands(series, cutoff, model):
    """At each lead, calibrate only on forecast targets observed by cutoff."""
    samples = defaultdict(list)
    for origin in sorted(p for p in series if p <= cutoff):
        for lead in range(1, 13):
            target = origin + lead
            if target > cutoff or target not in series:
                continue
            prediction = predict(series, origin, target, model)
            if prediction is not None:
                samples[lead].append(abs(series[target] - prediction))
    bands = {}
    for lead in range(1, 13):
        errors = sorted(samples[lead])
        bands[lead] = {'n': len(errors), 'radius': errors[math.ceil(.9 * len(errors)) - 1] if len(errors) >= 12 else None}
    return bands


def forecast_points(series, origin, horizon, model, metric):
    bands = error_bands(series, origin, model)
    result = []
    for lead in range(1, horizon + 1):
        value = predict(series, origin, origin + lead, model)
        radius = bands[lead]['radius']
        lower = value - radius if value is not None and radius is not None else None
        if metric == 'quantity' and lower is not None:
            lower = max(0., lower)
        result.append({'period': period_name(origin + lead), 'prediction': value,
                       'lower': lower, 'upper': value + radius if value is not None and radius is not None else None,
                       'band_sample_count': bands[lead]['n'], 'origin': period_name(origin), 'lead': lead})
    return result


def score(pairs):
    """Bias = prediction - actual; WAPE denominator uses absolute actual values."""
    if not pairs:
        return {'n': 0, 'mae': None, 'rmse': None, 'wape': None, 'bias': None}
    errors = [prediction - actual for actual, prediction in pairs]
    denominator = sum(abs(actual) for actual, _ in pairs)
    return {'n': len(pairs), 'mae': sum(map(abs, errors)) / len(errors),
            'rmse': math.sqrt(sum(e * e for e in errors) / len(errors)),
            'wape': 100 * sum(map(abs, errors)) / denominator if denominator else None,
            'bias': sum(errors) / len(errors)}


def build_validation(payload, sector='Government', product='', metric='revenue', today=None):
    if sector not in {'Government', 'Private', 'Unknown'} or metric not in {'revenue', 'quantity'}:
        raise ValueError('Invalid forecast scope')
    if metric == 'quantity' and not product:
        raise ValueError('Quantity forecasts require one raw product identity')
    today = today or datetime.now(ZoneInfo('Asia/Manila')).date()
    closed_end = today.year * 12 + today.month - 2
    population = [r for r in payload['rows'] if r['sector'] == sector]
    products = sorted({r['product'] for r in population})
    if product and product not in products:
        raise ValueError('Product is unavailable in the selected buyer cluster')
    monthly = defaultdict(float)
    excluded_not_closed = 0
    excluded_outside_history = 0
    count = 0
    for row in population:
        if product and row['product'] != product:
            continue
        period = month_number(row['period'])
        if period > closed_end:
            excluded_not_closed += row['row_count']
            continue
        if not month_number('2017-01') <= period <= month_number('2025-12'):
            excluded_outside_history += row['row_count']
            continue
        monthly[period] += row[metric]
        count += row['row_count']
    series = dict(monthly)
    response = {'scope': {'sector': sector, 'product': product, 'metric': metric, 'unit': '₱ net sales' if metric == 'revenue' else 'delivered source units'},
                'products': products, 'models': MODELS, 'status': 'Draft benchmark; source completeness unverified',
                'source': {**payload['source'], 'as_of': today.isoformat(), 'scoped_rows': count, 'excluded_not_closed': excluded_not_closed, 'excluded_outside_history': excluded_outside_history},
                'actuals': [], 'views': {}, 'origin': None, 'months_since_origin': None, 'observed_months': len(series)}
    if not series:
        return response
    start, end = min(series), max(series)
    response.update(origin=period_name(end), months_since_origin=closed_end - end,
                    actuals=[{'period': period_name(p), 'actual': series.get(p)} for p in range(start, end + 1)])
    # A frozen-origin holdout has the same calendar length as the chosen horizon.
    # Calibration for the historical bands excludes every holdout observation.
    for horizon in HORIZONS:
        cutoff = end - horizon
        predictions = {model: forecast_points(series, cutoff, horizon, model, metric) for model in MODELS}
        common = [i for i in range(horizon) if cutoff + i + 1 in series and all(predictions[m][i]['prediction'] is not None for m in MODELS)]
        models = {}
        for model in MODELS:
            backtest = predictions[model]
            pairs = []
            covered = 0
            scored_bands = 0
            for point in backtest:
                point['actual'] = series.get(month_number(point['period']))
                if point['actual'] is not None and point['prediction'] is not None:
                    pairs.append((point['actual'], point['prediction']))
                    if point['lower'] is not None:
                        scored_bands += 1
                        covered += point['lower'] <= point['actual'] <= point['upper']
            models[model] = {'forecast': forecast_points(series, end, horizon, model, metric), 'backtest': backtest,
                             'metrics': score(pairs), 'comparison_metrics': score([(backtest[i]['actual'], backtest[i]['prediction']) for i in common]),
                             'band_coverage': {'n': scored_bands, 'percent': 100 * covered / scored_bands if scored_bands else None}}
        response['views'][str(horizon)] = {'training_end': period_name(cutoff), 'evaluation_start': period_name(cutoff + 1),
                                          'evaluation_end': period_name(end), 'common_scored_months': len(common), 'models': models}
    return response


def load_validation(sector='Government', product='', metric='revenue'):
    return build_validation(load_sectors(), sector, product, metric)
