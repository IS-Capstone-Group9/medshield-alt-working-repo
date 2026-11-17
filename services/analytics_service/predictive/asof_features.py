"""Versioned lagged-activity and prior-portfolio features for offline research."""
import math
import statistics
from collections import defaultdict
from decimal import Decimal

from .. import abc_protocol

VERSION = 'origin_known_sales_features_v1'
FORECAST_CONFIGS = [dict(model_id=f'activity_hist_mae_l{leaves}', family='hist', leaves=leaves)
                    for leaves in (3, 7)] + [
    dict(model_id=f'activity_ridge_a{alpha}', family='ridge', alpha=alpha) for alpha in (1., 10.)] + [
    dict(model_id=f'activity_quantile_a{alpha}', family='quantile', alpha=alpha) for alpha in (.01, .1)]
ABC_CONFIGS = [dict(model_id=f'portfolio_xgb_d{depth}_{weight}', family='xgb', depth=depth,
                    balanced=weight == 'balanced') for depth in (2, 3) for weight in ('ordinary', 'balanced')] + [
    dict(model_id=f'portfolio_logistic_c{c}', family='logistic', c=c, balanced=True) for c in (.1, 1.)]
PORTFOLIO_FIELDS = ('prior_share', 'prior_cumulative_before', 'prior_rank_fraction',
                    'distance_to_80', 'distance_to_95', 'observed_years_last3',
                    'positive_growth_symmetric', 'share_change', 'observed_month_change', 'return_fraction')


def forecast_features(known, origin):
    """Only current/prior observed values; target calendar encoding is deterministic."""
    if any(p not in known for p in range(origin - 11, origin + 1)):
        raise ValueError('Twelve exact observed calendar months required for features')
    rows = [known[p] for p in range(origin - 11, origin + 1)]
    if any(any(isinstance(r[k], bool) or not isinstance(r[k], (int, float)) or
                   not math.isfinite(r[k]) for k in ('net', 'records', 'eligible')) for r in rows):
        raise ValueError('Finite recorded financial/activity values required')
    if any(r['records'] <= 0 or not 0 <= r['eligible'] <= r['records'] for r in rows):
        raise ValueError('Invalid observed activity counts')
    scale = math.fsum(abs(r['net']) for r in rows) / 12 or 1.
    nets = [r['net'] for r in rows]
    count_scale = math.fsum(r['records'] for r in rows) / 12
    angle = 2 * math.pi * ((origin + 1) % 12) / 12
    values = [nets[-lag] / scale for lag in (1, 2, 3, 6, 12)] + [
        math.fsum(nets[-w:]) / w / scale for w in (3, 6, 12)] + [
        statistics.median(nets[-6:]) / scale,
        (math.fsum(nets[-3:]) - math.fsum(nets[-6:-3])) / 3 / scale,
        math.sin(angle), math.cos(angle), math.sin(2 * angle), math.cos(2 * angle)] + [
        rows[-lag]['records'] / count_scale for lag in (1, 2, 3)] + [
        rows[-1]['eligible'] / rows[-1]['records'],
        (nets[-1] / rows[-1]['records']) / scale * count_scale]
    return values, scale


def forecast(known, origin, config):
    if config not in FORECAST_CONFIGS:
        raise ValueError('Unregistered forecast recipe')
    if isinstance(origin, bool) or not isinstance(origin, int):
        raise ValueError('Integer calendar origin required')
    known = {p: row for p, row in known.items() if p <= origin}
    if not known or origin not in known:
        raise ValueError('Missing forecast origin')
    start = min(known)
    if sorted(known) != list(range(start, origin + 1)) or len(known) < 36:
        raise ValueError('Requires36 contiguous observed months')
    import numpy as np
    examples = []
    for p in range(start + 11, origin):
        features, scale = forecast_features(known, p)
        examples.append((p, features, scale, known[p + 1]['net']))
    current, current_scale = forecast_features(known, origin)
    x = np.asarray([r[1] for r in examples]);y = np.asarray([r[3] / r[2] for r in examples])
    center, spread = x.mean(axis=0), x.std(axis=0)
    spread = np.where(spread == 0, 1., spread)
    normalized = (x - center) / spread
    scales = np.asarray([r[2] for r in examples]);weights = scales / np.median(scales)
    if config['family'] == 'hist':
        from sklearn.ensemble import HistGradientBoostingRegressor
        model = HistGradientBoostingRegressor(loss='absolute_error', max_iter=80,
            max_leaf_nodes=config['leaves'], min_samples_leaf=5, l2_regularization=1.,
            early_stopping=False, random_state=20261031)
    elif config['family'] == 'ridge':
        from sklearn.linear_model import Ridge
        model = Ridge(alpha=config['alpha'])
    else:
        from sklearn.linear_model import QuantileRegressor
        model = QuantileRegressor(quantile=.5, alpha=config['alpha'], solver='highs')
    model.fit(normalized, y, sample_weight=weights)
    value = float(model.predict([(np.asarray(current) - center) / spread])[0] * current_scale)
    if not math.isfinite(value):
        raise ValueError('Nonfinite forecast')
    trace = dict(method_version=VERSION, training_feature_origins=[r[0] for r in examples],
        last_training_target=examples[-1][0] + 1, current_features=current, current_scale=current_scale,
        center=center.tolist(), spread=spread.tolist(), examples=len(examples))
    return value, trace


def portfolio_context(source):
    labels, annual = abc_protocol.annual_observations(source)
    years = defaultdict(list)
    for (year, key), row in annual.items():
        if row['positive'] > 0:
            years[year].append(key)
    positions = {}
    for year, keys in years.items():
        keys.sort(key=lambda k: (-annual[(year, k)]['positive'], labels[k]))
        total = sum((annual[(year, k)]['positive'] for k in keys), Decimal(0))
        before = Decimal(0)
        for rank, key in enumerate(keys):
            amount = annual[(year, key)]['positive']
            positions[(year, key)] = dict(share=float(amount / total), before=float(before / total),
                                         rank=rank / len(keys))
            before += amount
    return annual, positions


def portfolio_features(row, context):
    if row['feature_year'] != row['target_year'] - 1 or row['feature_cutoff'] != f"{row['feature_year']}-12-31":
        raise ValueError('ABC feature-year cutoff mismatch')
    annual, positions = context
    year, key = row['feature_year'], row['product_key']
    prior, previous = annual.get((year, key)), annual.get((year - 1, key))
    position, earlier = positions.get((year, key)), positions.get((year - 1, key))
    v = row['features']
    values = {name: float(v[name]) if v[name] is not None else None for name in abc_protocol.FEATURES}
    for c in abc_protocol.CLASSES:
        values['prior_class_' + c] = int(row['prior_abc_baseline'] == c)
    values['prior_class_unknown'] = int(row['prior_abc_baseline'] not in abc_protocol.CLASSES)
    values.update(prior_share=position['share'] if position else None,
        prior_cumulative_before=position['before'] if position else None,
        prior_rank_fraction=position['rank'] if position else None,
        distance_to_80=position['before'] - .8 if position else None,
        distance_to_95=position['before'] - .95 if position else None,
        observed_years_last3=sum((y, key) in annual for y in range(year - 2, year + 1)),
        positive_growth_symmetric=float((prior['positive'] - previous['positive']) /
            (prior['positive'] + previous['positive'])) if prior and previous and
            prior['positive'] + previous['positive'] > 0 else None,
        share_change=position['share'] - earlier['share'] if position and earlier else None,
        observed_month_change=prior['months'] - previous['months'] if prior and previous else None,
        return_fraction=float(-prior['negative'] / prior['positive']) if prior and prior['positive'] > 0 else None)
    return values


def fit_transformer(features):
    import numpy as np
    fields = list(features[0])
    if any(list(f) != fields for f in features):
        raise ValueError('Feature schema mismatch')
    medians = []
    for field in fields:
        observed = [f[field] for f in features if f[field] is not None]
        if not observed or not all(math.isfinite(x) for x in observed):
            raise ValueError('Unsupported training feature')
        medians.append(float(np.median(observed)))
    matrix = np.asarray([[f[k] if f[k] is not None else medians[i] for i, k in enumerate(fields)] +
                         [int(f[k] is None) for k in fields] for f in features])
    center, spread = matrix.mean(axis=0), matrix.std(axis=0)
    return dict(fields=fields, medians=medians, center=center.tolist(),
                spread=np.where(spread == 0, 1., spread).tolist(), rows=len(features))


def transform(features, processor):
    import numpy as np
    fields = processor['fields']
    if any(list(f) != fields for f in features):
        raise ValueError('Feature schema changed')
    matrix = np.asarray([[f[k] if f[k] is not None else processor['medians'][i]
                          for i, k in enumerate(fields)] + [int(f[k] is None) for k in fields]
                         for f in features])
    if not np.isfinite(matrix).all():
        raise ValueError('Nonfinite transformed features')
    return (matrix - processor['center']) / processor['spread']
