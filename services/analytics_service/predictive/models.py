"""Small frozen candidate grid; each adapter sees only origin-known training."""
import math

BENCHMARKS = [{'model_id': 'last_value'}, {'model_id': 'seasonal_naive'},
              {'model_id': 'mean_3', 'window': 3}, {'model_id': 'mean_6', 'window': 6}]
CHALLENGERS = [dict(model_id=f'ets_{trend}', family='ets', damped=trend == 'damped')
               for trend in ('none', 'damped')] + [
    dict(model_id=f'prophet_cp{cp}_sp{sp}', family='prophet', changepoint_prior_scale=cp, seasonality_prior_scale=sp)
    for cp in (.01, .05, .1) for sp in (.1, 1., 10.)]

# Opt-in exploratory recipes; they never change the original frozen 15-model grid.
EXTENDED_CHALLENGERS = [
    dict(model_id='sarima_ar_seasonal', family='sarima', order=[1, 0, 0],
         seasonal_order=[1, 0, 0, 12], trend='c', maxiter=200),
    dict(model_id='sarima_airline', family='sarima', order=[0, 1, 1],
         seasonal_order=[0, 1, 1, 12], trend='n', maxiter=200),
] + [dict(model_id=f'ridge_{strategy}_a{alpha}', family='ridge', strategy=strategy,
          alpha=alpha, minimum_examples=12)
     for strategy in ('direct', 'recursive') for alpha in (1, 10)]


def lag_features(history, origin, target):
    """Origin-known values and deterministic target-month encoding only."""
    lags = [history[origin - offset] for offset in (0, 1, 2, 5, 11)]
    means = [sum(history[origin - offset] for offset in range(window)) / window
             for window in (3, 6, 12)]
    angle = 2 * math.pi * (target % 12) / 12
    return lags + means + [math.sin(angle), math.cos(angle)]


def fit_ridge(features, targets, alpha):
    """Unpenalized intercept; feature scaling is fitted on these training rows."""
    import numpy as np
    matrix, values = np.asarray(features, dtype=float), np.asarray(targets, dtype=float)
    if alpha <= 0 or not np.isfinite(matrix).all() or not np.isfinite(values).all():
        raise ValueError('Ridge requires finite training data and positive regularization')
    center, scale = matrix.mean(axis=0), matrix.std(axis=0)
    scale = np.where(scale == 0, 1., scale)
    standardized = (matrix - center) / scale
    intercept = float(values.mean())
    coefficients = np.linalg.solve(standardized.T @ standardized + alpha * np.eye(matrix.shape[1]),
                                   standardized.T @ (values - intercept))
    return center, scale, coefficients, intercept


def predict_ridge(fitted, features):
    import numpy as np
    center, scale, coefficients, intercept = fitted
    return float(intercept + ((np.asarray(features) - center) / scale) @ coefficients)


def ridge_forecast(training, start, origin, leads, config):
    if not leads or any(isinstance(lead, bool) or not isinstance(lead, int) or not 1 <= lead <= 12 for lead in leads):
        return {}, 'Exploratory ridge supports integer leads 1–12 only'
    strategy = config['strategy']
    if strategy not in ('direct', 'recursive'):
        raise ValueError('Unknown ridge forecasting strategy')
    fitted = {}
    for lead in leads if strategy == 'direct' else [1]:
        # Feature origin + lead is always an observed training target, never a fold target.
        feature_origins = range(start + 11, origin - lead + 1)
        features = [lag_features(training, p, p + lead) for p in feature_origins]
        targets = [training[p + lead] for p in feature_origins]
        if len(targets) < config['minimum_examples']:
            return {}, f'Ridge lead {lead} requires {config["minimum_examples"]} origin-known training examples'
        fitted[lead] = fit_ridge(features, targets, config['alpha'])
    if strategy == 'direct':
        return {lead: predict_ridge(fitted[lead], lag_features(training, origin, origin + lead))
                for lead in leads}, None
    path = dict(training)
    predictions = {}
    for lead in range(1, max(leads) + 1):
        target = origin + lead
        value = predict_ridge(fitted[1], lag_features(path, target - 1, target))
        # Unknown lags are the model's own predictions; realized fold actuals never enter.
        path[target] = value
        if lead in leads:
            predictions[lead] = value
    return predictions, None


def sarima_forecast(values, leads, config):
    import numpy as np
    from statsmodels.tsa.statespace.sarimax import SARIMAX
    if not leads or any(isinstance(lead, bool) or not isinstance(lead, int) or not 1 <= lead <= 12 for lead in leads):
        return {}, 'Exploratory SARIMA supports integer leads 1–12 only'
    # Pure scale transform improves numerical conditioning; signed observations remain intact.
    scale = float(np.std(values)) or max(map(abs, values)) or 1.
    fitted = SARIMAX(np.asarray(values) / scale, order=config['order'],
                     seasonal_order=config['seasonal_order'], trend=config['trend'],
                     enforce_stationarity=True, enforce_invertibility=True,
                     simple_differencing=False, missing='raise').fit(
                         method='lbfgs', maxiter=config['maxiter'], disp=False, cov_type='none')
    if not fitted.mle_retvals.get('converged', False):
        return {}, 'SARIMA optimizer did not converge within frozen iteration budget'
    predictions = fitted.forecast(max(leads)) * scale
    return {lead: float(predictions[lead - 1]) for lead in leads}, None


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
    elif config.get('family') == 'ridge':
        result, reason = ridge_forecast(training, start, origin, leads, config)
        if reason:
            return {}, reason
    elif config.get('family') == 'sarima':
        result, reason = sarima_forecast(values, leads, config)
        if reason:
            return {}, reason
    else:
        raise ValueError(f'Unknown model: {model}')
    if any(not math.isfinite(v) for v in result.values()):
        return {}, 'Nonfinite model prediction'
    return result, None
