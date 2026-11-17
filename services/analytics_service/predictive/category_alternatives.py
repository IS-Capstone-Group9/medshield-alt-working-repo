"""Origin-local financial category experiments and explicit planning assumptions."""
from decimal import Decimal
import math
from statistics import median

from .contracts import month

VERSION = 'category_bottom_up_research_v1'
BASELINES = ('last_value', 'seasonal_naive', 'mean_3', 'mean_6')
RECIPES = ('category_median_6', 'category_median_12', 'category_adaptive_12')
CONTROL = 'category_mean_6_control'


def reconcile(capture, source):
    if (capture.get('source_identity', capture.get('release', {}).get('original_itemized')) != source['source_identity']):
        raise ValueError('Category/company source identity mismatch')
    if capture.get('contracts_excluded') is not True:
        raise ValueError('Contracts must remain excluded')
    expected = {month(r['month']): r for r in source['monthly'] if r['month'][:7] >= '2020-01'}
    if not expected or sorted(expected) != list(range(min(expected), max(expected)+1)):
        raise ValueError('Missing company months')
    cells, counts = {}, {}
    for row in capture['rows']:
        p, category = month(row['month']), row['product_category']
        if not isinstance(category, str) or not category:
            raise ValueError('Missing category')
        if (p, category) in cells or p not in expected:
            raise ValueError('Duplicate or unexpected category month')
        eligible, records = int(row['eligible_records']), int(row['records'])
        if records < 1 or not 0 <= eligible <= records:
            raise ValueError('Invalid category coverage')
        value = row['net_sales_php']
        amount = Decimal(str(value)) if value is not None else None
        if (amount is not None and not amount.is_finite()) or ((eligible == 0) != (amount is None)):
            raise ValueError('Unavailable/nonfinite category amount')
        cells[p,category] = amount
        counts[p,category] = records,eligible
    company, categories = {}, {}
    for p, control in expected.items():
        if control['net_sales_php'] is None:
            raise ValueError('Unavailable company amount')
        actual = Decimal(str(control['net_sales_php']))
        if not actual.is_finite():
            raise ValueError('Nonfinite company amount')
        entries = [(key,value) for key,value in cells.items() if key[0] == p]
        if not entries or sum((v for _,v in entries if v is not None), Decimal(0)) != actual:
            raise ValueError('Category financial conservation failure')
        if sum(counts[k][0] for k,_ in entries) != int(control['source_records']):
            raise ValueError('Category record conservation failure')
        if sum(counts[k][1] for k,_ in entries) != int(control['net_eligible_records']):
            raise ValueError('Category eligibility conservation failure')
        company[p] = float(actual)
        for (_,category),value in entries:
            if value is not None:
                categories.setdefault(category,{})[p] = float(value)
    return company,categories


def baselines(history, origin):
    values = [history.get(p) for p in range(origin-11,origin+1)]
    if any(v is None or isinstance(v,bool) or not math.isfinite(v) for v in values):
        raise ValueError('Twelve contiguous observed months required')
    return dict(last_value=values[-1], seasonal_naive=values[0],
                mean_3=sum(values[-3:])/3, mean_6=sum(values[-6:])/6)


def predict(company, categories, origin, recipe):
    if recipe not in (*RECIPES,CONTROL):
        raise ValueError('Unknown category recipe')
    periods = list(range(origin-23,origin+1))
    if any(p not in company or not math.isfinite(company[p]) for p in periods):
        raise ValueError('Twenty-four contiguous company months required')
    # Only issue-time-observed category labels/history enter group membership.
    admitted = {name:{p:series[p] for p in periods} for name,series in sorted(categories.items())
                if all(p in series and math.isfinite(series[p]) for p in periods)}
    residual = {p:company[p]-math.fsum(series[p] for series in admitted.values()) for p in periods}
    groups = [(name,series) for name,series in admitted.items()] + [('__reconciled_residual__',residual)]
    traces = []
    for name,series in groups:
        inner = []
        selected = None
        if recipe == 'category_adaptive_12':
            losses = {name:0. for name in BASELINES}
            for target in range(origin-11,origin+1):
                vector = baselines(series,target-1)
                for base in BASELINES:
                    losses[base] += abs(vector[base]-series[target])
                inner.append(dict(origin=target-1,target=target,actual=series[target],predictions=vector))
            selected = min(BASELINES,key=lambda base:(losses[base],base))
            value = baselines(series,origin)[selected]
        elif recipe == CONTROL:
            selected = 'mean_6'
            value = baselines(series,origin)['mean_6']
        else:
            window = 6 if recipe == 'category_median_6' else 12
            value = median([series[p] for p in range(origin-window+1,origin+1)])
        traces.append(dict(group=name,history=[dict(period=p,value=series[p]) for p in periods],
                           selected_model=selected,inner=inner,prediction=value))
    prediction = math.fsum(t['prediction'] for t in traces)
    if not math.isfinite(prediction):
        raise ValueError('Nonfinite prediction')
    return prediction,dict(origin=origin,admitted_categories=list(admitted),groups=traces,
                           missing_category_policy='reconciled_residual_not_zero_imputation')


def choose(reports):
    if any(r['stage'] != 'development' for r in reports):
        raise ValueError('Selection must use development only')
    bases = [r for r in reports if r['model_id'] in BASELINES]
    if (len(bases) != 4 or any(r['failed'] or r['mae'] is None or r['n'] != r['expected_n'] for r in bases)
            or len({r['n'] for r in bases}) != 1):
        raise ValueError('Four complete equal-cohort baselines required')
    strongest = min(bases,key=lambda r:(r['mae'],r['model_id']))
    eligible = [r for r in reports if r['model_id'] in RECIPES and not r['failed']
                and r['n'] == strongest['n'] and r['expected_n'] == strongest['n']
                and r['mae'] is not None and r['mae'] <= .95*strongest['mae']
                and r['normalized_bias'] is not None and abs(r['normalized_bias']) <= 5]
    selected = min(eligible,key=lambda r:(r['mae'],r['model_id'])) if eligible else next(r for r in bases if r['model_id']=='mean_6')
    return dict(selected_model=selected['model_id'],candidate_passes_guard=bool(eligible),
        strongest_baseline=strongest['model_id'],below10_with_guard=bool(eligible and selected['wape'] < 10),
        below5_with_guard=bool(eligible and selected['wape'] < 5), audit_used=False,publication_approved=False)


def scenarios(base):
    if isinstance(base,bool) or not math.isfinite(base):
        raise ValueError('Finite scenario base required')
    return dict(low_php=min(.75*base,1.25*base),base_php=base,high_php=max(.75*base,1.25*base),
        assumption_id='S-PHP-PLUS-MINUS-25-PCT',assumed_variation_pct=25,
        evidence_label='Scenario',probability_coverage=None,calibrated_prediction_interval=False,
        operational_approval=False,procurement_execution_approved=False)
