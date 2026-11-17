"""Fixed signed-component research recipes; no fitting or publication."""
from datetime import date
from decimal import Decimal
import math
import statistics

from .contracts import month

VERSION = 'signed_sales_component_v1'
CONFIGS = [dict(model_id=f'component_mean{p}_mean{n}', positive_method='mean',
                positive_window=p, negative_window=n) for p in (3, 6, 12) for n in (3, 6, 12)] + [
    dict(model_id=f'component_median{p}_mean12', positive_method='median',
         positive_window=p, negative_window=12) for p in (3, 6, 12)]


def reconcile(component_source, net_source):
    if component_source['release']['dataset_id'] != net_source['source_identity']['dataset_id']:
        raise ValueError('Component and net dataset identity differ')
    components = {}
    for row in component_source['queries']['company_months']['rows']:
        parsed = date.fromisoformat(row['month'])
        if parsed.day != 1:
            raise ValueError('Expected first-of-month source dates')
        p = month(parsed.strftime('%Y-%m'))
        if p in components:
            raise ValueError('Duplicate component month')
        values = {k: Decimal(str(row[f])) for k, f in
                  [('positive', 'positive_revenue'), ('negative', 'negative_revenue'), ('net', 'revenue')]}
        if not all(v.is_finite() for v in values.values()):
            raise ValueError('Finite component values required')
        if values['positive'] < 0 or values['negative'] > 0:
            raise ValueError('Invalid signed component values')
        if values['positive'] + values['negative'] != values['net']:
            raise ValueError('Component amounts do not conserve net sales')
        components[p] = values
    result, seen = {}, set()
    for row in net_source['monthly']:
        p = month(row['month'])
        if p in seen:
            raise ValueError('Duplicate retained net month')
        seen.add(p)
        if p < month('2020-01'):
            continue
        if p not in components or row['net_sales_php'] is None:
            raise ValueError('Required observed component/net month unavailable')
        if components[p]['net'] != Decimal(str(row['net_sales_php'])):
            raise ValueError('Components disagree with retained net source')
        result[p] = {k: float(v) for k, v in components[p].items()}
    if not result or sorted(result) != list(range(month('2020-01'), max(result) + 1)):
        raise ValueError('Required history must be contiguous;missing is not zero')
    return result


def predict(series, origin, config):
    if config not in CONFIGS or isinstance(origin, bool) or not isinstance(origin, int):
        raise ValueError('Registered recipe and integer origin required')
    if any(isinstance(p, bool) or not isinstance(p, int) for p in series):
        raise ValueError('Integer calendar keys required')
    known = {p: v for p, v in series.items() if p <= origin}
    if not known or origin not in known:
        raise ValueError('Missing origin')
    if sorted(known) != list(range(min(known), origin + 1)) or len(known) < 36:
        raise ValueError('Requires36 contiguous observed months')
    for row in known.values():
        if (any(isinstance(row[k], bool) or not isinstance(row[k], (int, float)) or
                not math.isfinite(row[k]) for k in ('positive', 'negative', 'net')) or
                row['positive'] < 0 or row['negative'] > 0 or
                not math.isclose(row['positive'] + row['negative'], row['net'],
                                 rel_tol=1e-12, abs_tol=1e-7)):
            raise ValueError('Invalid or nonconserving signed observation')
    pw, nw = config['positive_window'], config['negative_window']
    positive = [known[p]['positive'] for p in range(origin - pw + 1, origin + 1)]
    negative = [known[p]['negative'] for p in range(origin - nw + 1, origin + 1)]
    pvalue = statistics.median(positive) if config['positive_method'] == 'median' else math.fsum(positive) / pw
    nvalue = math.fsum(negative) / nw
    return pvalue + nvalue, dict(method_version=VERSION, positive_prediction=pvalue,
        negative_prediction=nvalue, positive_periods=list(range(origin - pw + 1, origin + 1)),
        negative_periods=list(range(origin - nw + 1, origin + 1)),
        equivalent_direct_mean=pw if config['positive_method'] == 'mean' and pw == nw else None)
