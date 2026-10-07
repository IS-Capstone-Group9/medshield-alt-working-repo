"""Small frozen candidate grid; each adapter sees only origin-known training."""
import math

BENCHMARKS = [{'model_id': 'last_value'}, {'model_id': 'seasonal_naive'},
              {'model_id': 'mean_3', 'window': 3}, {'model_id': 'mean_6', 'window': 6}]
CHALLENGERS = [dict(model_id=f'ets_{trend}', family='ets', damped=trend == 'damped')
               for trend in ('none', 'damped')] + [
    dict(model_id=f'prophet_cp{cp}_sp{sp}', family='prophet', changepoint_prior_scale=cp, seasonality_prior_scale=sp)
    for cp in (.01, .05, .1) for sp in (.1, 1., 10.)]


def forecast(series, origin, leads, config, seed=20260927):
    training = {p: v for p, v in series.items() if p <= origin}
    minimum = 36 if config.get('family') else 24
    if not training or origin not in training:
        return {}, 'Missing training origin'
    start = origin
    while start - 1 in training:
        start -= 1
    if origin - start + 1 < minimum:
        return {}, f'Requires {minimum} contiguous eligible training months'
    # Earlier disconnected observations are not silently imputed.
    values = [training[p] for p in range(start, origin + 1)]
    model = config['model_id']
    if model == 'last_value':
        result = {lead: training[origin] for lead in leads}
    elif model == 'seasonal_naive':
        result = {}
        for lead in leads:
            reference = origin + lead
            while reference > origin:
                reference -= 12
            if reference in training:
                result[lead] = training[reference]
    elif model.startswith('mean_'):
        window = config['window']
        result = {lead: sum(values[-window:]) / window for lead in leads}
    elif config.get('family') == 'ets':
        from statsmodels.tsa.holtwinters import ExponentialSmoothing
        fitted = ExponentialSmoothing(values, trend='add' if config['damped'] else None,
                                      damped_trend=config['damped'], seasonal='add', seasonal_periods=12,
                                      initialization_method='estimated').fit(optimized=True)
        predictions = fitted.forecast(max(leads))
        result = {lead: float(predictions[lead - 1]) for lead in leads}
    elif config.get('family') == 'prophet':
        import pandas as pd
        from prophet import Prophet
        from .contracts import period
        frame = pd.DataFrame({'ds': [period(p) + '-01' for p in range(start, origin + 1)], 'y': values})
        model = Prophet(daily_seasonality=False, weekly_seasonality=False, yearly_seasonality=3,
                        seasonality_mode='additive', uncertainty_samples=0,
                        changepoint_prior_scale=config['changepoint_prior_scale'],
                        seasonality_prior_scale=config['seasonality_prior_scale'])
        model.fit(frame, seed=seed)
        future = pd.DataFrame({'ds': [period(origin + lead) + '-01' for lead in leads]})
        result = dict(zip(leads, map(float, model.predict(future)['yhat'])))
    else:
        raise ValueError(f'Unknown model: {model}')
    if any(not math.isfinite(v) for v in result.values()):
        return {}, 'Nonfinite model prediction'
    return result, None
