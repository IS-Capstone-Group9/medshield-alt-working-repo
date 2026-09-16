"""Source-ranked shortlist and explicitly hypothetical integer-pack allocation."""
import math
from collections import defaultdict
from datetime import datetime
from decimal import Decimal, InvalidOperation
from zoneinfo import ZoneInfo

from services.analytics_service.forecast_validation import month_number, period_name
from services.analytics_service.sales_sectors import load_sectors


def build_shortlist(payload, sector='Unknown', territory='Quezon', today=None):
    if sector not in {'Unknown', 'Private', 'Government', 'Internal'}:
        raise ValueError('Invalid buyer cluster')
    today = today or datetime.now(ZoneInfo('Asia/Manila')).date()
    cutoff = today.year * 12 + today.month - 2
    rows = [r for r in payload['rows'] if r['sector'] == sector and (territory == 'all' or r['territory'] == territory) and month_number('2017-01') <= month_number(r['period']) <= min(cutoff, month_number('2025-12'))]
    end = max((month_number(r['period']) for r in rows), default=None)
    totals = defaultdict(lambda: {'revenue': 0., 'quantity': 0., 'months': set()})
    for r in rows:
        if month_number(r['period']) < end - 11:
            continue
        p = totals[r['product']]
        p['revenue'] += r['revenue']
        p['quantity'] += r['quantity']
        p['months'].add(r['period'])
    positive = sorted(((name, p) for name, p in totals.items() if p['revenue'] > 0), key=lambda pair: (-pair[1]['revenue'], pair[0]))
    n = min(5, math.ceil(len(positive) * .2))
    denominator = sum(p['revenue'] for _, p in positive)
    shortlist = [dict(product=name, revenue=p['revenue'], quantity=p['quantity'], observed_months=len(p['months']), revenue_share_pct=100*p['revenue']/denominator) for name, p in positive[:n]]
    return {'scope': {'sector': sector, 'territory': territory}, 'source': payload['source'], 'products': shortlist,
            'period_start': period_name(end-11) if end is not None else None, 'period_end': period_name(end) if end is not None else None,
            'months_stale': cutoff-end if end is not None else None, 'eligible_products': len(positive), 'excluded_nonpositive_products': len(totals)-len(positive),
            'shortlist_share_pct': sum(p['revenue_share_pct'] for p in shortlist), 'ranking_revenue': denominator,
            'territories': sorted({r['territory'] for r in payload['rows'] if r['territory'] != 'Unassigned geography'})}


def number(value, label, integer=False, positive=False):
    if isinstance(value, bool) or value is None or value == '':
        raise ValueError(label+' is required')
    try:
        value = float(value)
    except (TypeError, ValueError):
        raise ValueError(label+' must be numeric')
    if not math.isfinite(value) or value < 0 or value > 1e9 or (positive and value <= 0) or (integer and value != int(value)):
        raise ValueError(label+' is outside the permitted range')
    return int(value) if integer else value


def cents(value, label, positive=False):
    number(value, label, positive=positive)
    amount = Decimal(str(value)) * 100
    if amount != amount.to_integral_value():
        raise ValueError(label+' must have at most two decimal places')
    return int(amount)


def solve_plan(body, shortlist):
    from scipy.optimize import Bounds, LinearConstraint, milp
    import numpy as np

    if not isinstance(body, dict) or body.get('acknowledged') is not True:
        raise ValueError('Confirm that inputs are scenario assumptions for review')
    if body.get('checksum') != shortlist['source'].get('checksum'):
        raise ValueError('Sales source changed; reload the shortlist before solving')
    if body.get('scope') != shortlist['scope']:
        raise ValueError('Planning scope changed; reload the shortlist')
    horizon = number(body.get('horizon'), 'Planning horizon', integer=True, positive=True)
    if horizon not in (1, 3, 6, 12):
        raise ValueError('Unsupported planning horizon')
    budget = cents(body.get('budget'), 'Budget')
    minimum = number(body.get('minimum_pct'), 'Minimum fulfillment')
    if minimum > 100:
        raise ValueError('Minimum fulfillment cannot exceed 100%')
    inputs = body.get('items')
    expected = {p['product'] for p in shortlist['products']}
    if not isinstance(inputs, list) or not 1 <= len(inputs) <= 5 or {r.get('product') for r in inputs if isinstance(r, dict)} != expected or len(inputs) != len(expected):
        raise ValueError('Inputs must match every shortlisted product exactly once')
    items = []
    for row in inputs:
        item = {'product': row['product']}
        for key in ('demand', 'stock', 'reserve', 'pack', 'max_packs'):
            item[key] = number(row.get(key), key, integer=True, positive=key in ('demand', 'pack'))
        item['pack_cost_cents'] = cents(row.get('pack_cost'), 'Pack cost', positive=True)
        if item['reserve'] > item['stock']:
            raise ValueError('Protected stock cannot exceed usable stock')
        item['available'] = item['stock'] - item['reserve']
        item['required'] = math.ceil(item['demand'] * minimum / 100 - 1e-10)
        items.append(item)
    n = len(items)
    # Variables: integer purchased packs q_i, integer fulfilled source units f_i.
    # Objective: mean fulfilled fraction; no cross-product quantity summation.
    constraints = np.zeros((n+1, 2*n))
    constraints[0, :n] = [r['pack_cost_cents'] for r in items]
    limits = [budget]
    for i, r in enumerate(items):
        constraints[i+1, i] = -r['pack']
        constraints[i+1, n+i] = 1
        limits.append(r['available'])
    lower = [0]*n+[r['required'] for r in items]
    upper = [r['max_packs'] for r in items]+[r['demand'] for r in items]
    objective = [0]*n+[-1/r['demand'] for r in items]
    min_cost = sum(max(0, math.ceil((r['required']-r['available'])/r['pack']))*r['pack_cost_cents'] for r in items)
    conflicts = [r['product']+': supplier limit cannot meet minimum fulfillment' for r in items if r['available']+r['pack']*r['max_packs'] < r['required']]
    if min_cost > budget:
        conflicts.append(f'Minimum fulfillment requires at least ₱{min_cost/100:,.2f}; budget is ₱{budget/100:,.2f}')
    if conflicts:
        return {'status': 'infeasible', 'conflicts': conflicts, 'rows': []}
    bound = Bounds(lower, upper)
    lc = LinearConstraint(constraints, -np.inf, limits)
    first = milp(objective, integrality=np.ones(2*n), bounds=bound, constraints=lc, options={'time_limit': 5, 'mip_rel_gap': 0.0})
    if first.status != 0:
        return {'status': 'not_solved', 'conflicts': ['No proven optimal solution within the solver limit'], 'rows': []}
    # Lexicographic second solve: same best service, minimum purchase spend.
    service = np.asarray([0]*n+[1/r['demand'] for r in items])
    second = milp([r['pack_cost_cents'] for r in items]+[0]*n, integrality=np.ones(2*n), bounds=bound,
                  constraints=[lc, LinearConstraint(service, -first.fun-1e-9, np.inf)], options={'time_limit': 5, 'mip_rel_gap': 0.0})
    if second.status != 0:
        return {'status': 'not_solved', 'conflicts': ['Minimum-cost tie-break was not solved to optimality'], 'rows': []}
    x = np.rint(second.x).astype(int)
    if np.any(np.abs(second.x-x)>1e-5) or np.any(constraints@x > np.asarray(limits)+1e-5) or np.any(x<np.asarray(lower)) or np.any(x>np.asarray(upper)):
        raise ValueError('Solver result failed independent constraint verification')
    output = []
    for i,r in enumerate(items):
        bought, fulfilled = int(x[i]), int(x[n+i])
        output.append({**r, 'purchase_packs': bought, 'purchase_units': bought*r['pack'], 'fulfilled': fulfilled,
                       'unmet': r['demand']-fulfilled, 'fulfillment_pct': 100*fulfilled/r['demand'], 'spend': bought*r['pack_cost_cents']/100,
                       'ending_stock': r['stock']+bought*r['pack']-fulfilled,
                       'binding': [name for name, active in [('Demand satisfied',fulfilled==r['demand']),('Supplier cap',bought==r['max_packs']),('Available stock',fulfilled==r['available']+bought*r['pack']),('Minimum service',fulfilled==r['required'])] if active]})
    spent = sum(r['spend'] for r in output)
    return {'status': 'optimal_scenario', 'rows': output, 'budget': budget/100, 'spent': round(spent,2), 'remaining': round(budget/100-spent,2),
            'mean_fulfillment_pct': sum(r['fulfillment_pct'] for r in output)/n, 'budget_binding': round(spent*100)==budget,
            'assumptions': {'horizon': horizon, 'minimum_pct': minimum, 'scope': shortlist['scope'], 'checksum': body['checksum'],
                            'objective': 'Maximize equally weighted product fulfillment fractions; then minimize spend',
                            'status': 'Scenario only; client objective and operational inputs unverified'}}


def load_shortlist(sector='Unknown', territory='Quezon'):
    return build_shortlist(load_sectors(), sector, territory)
