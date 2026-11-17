"""Fixed PD3 retrospective interval recipe; no runtime publication or training."""
import math
from statistics import mean
from services.analytics_service.rolling_accuracy import measurement_cases, contiguous_run


def histories(source):
    areas = {}
    seen = set()
    for row in source['area_months']:
        key = (row['area'], row['period'])
        if key in seen:
            raise ValueError('Duplicate area/month')
        seen.add(key)
        if row['net_eligible_records'] > 0:
            value = float(row['net_sales_php'])
            if not math.isfinite(value):
                raise ValueError('Nonfinite source')
            areas.setdefault(key[0], {})[key[1]] = value
    company = {}
    for area in areas.values():
        for period, value in area.items():
            company[period] = company.get(period, 0.0) + value
    series = {'company': contiguous_run(company, '2026-09')}
    for name in ('BATANGAS', 'HOSPITAL', 'QUEZON'):
        series[name] = contiguous_run(areas[name], '2026-09')
    common = set.intersection(*(set(dict(series[n])) for n in ('BATANGAS', 'HOSPITAL', 'QUEZON')))
    series['three_area_sum'] = [(p, sum(dict(series[n])[p] for n in ('BATANGAS', 'HOSPITAL', 'QUEZON')))
                                for p in sorted(common)]
    return series


def quantile80(scores):
    if not scores:
        raise ValueError('Empty calibration sample')
    # ceil((n+1)*4/5), using exact integer arithmetic.
    rank = min(len(scores), (4 * (len(scores) + 1) + 4) // 5)
    return sorted(scores)[rank - 1]


def point_cases(series, lead, reference):
    if reference not in ('mean_3', 'mean_6'):
        raise ValueError('Unsupported frozen point reference')
    return [dict(origin=c['origin'], target=c['target'], actual=c['actual'], prediction=c['pred'][reference])
            for c in measurement_cases(series, lead)]


def intervals(cases, include_candidate=True):
    """Calculate scales at original issue times and consume matured scores only."""
    output, comparator_full, prior = [], [], []
    for case in cases:
        p = case['prediction']
        if not all(math.isfinite(float(case[k])) for k in ('actual', 'prediction')):
            raise ValueError('Nonfinite case')
        known = [c for c in prior if c['target'] <= case['origin'] and c['prediction'] > 0]
        scale = max(1.0, math.sqrt(mean((c['actual'] - c['prediction']) ** 2 for c in known[-6:]))) if len(known) >= 6 else None
        row = dict(case, scale=scale)
        if p > 0 and len(known) >= 12:
            half = quantile80([abs(c['actual'] / c['prediction'] - 1) for c in known[-24:]])
            bounds = [max(0.0, p * (1 - half)), p * (1 + half)]
            comparator_full.append(dict(case, comparator=bounds))
            scored = [c for c in known if c['scale'] is not None][-24:]
            if include_candidate and scale is not None and len(scored) >= 12:
                q = quantile80([abs(c['actual'] - c['prediction']) / c['scale'] for c in scored])
                candidate = [max(0.0, p - q * scale), p + q * scale]
                if not all(math.isfinite(v) for v in candidate + bounds) or candidate[0] > candidate[1]:
                    raise ValueError('Invalid interval')
                output.append(dict(row, calibration_n=len(scored), comparator_n=min(24, len(known)),
                                   quantile=q, candidate=candidate, comparator=bounds))
        prior.append(row)
    return output, comparator_full


def metrics(rows, method):
    if not rows:
        return None
    widths = [r[method][1] - r[method][0] for r in rows]
    hits = sum(r[method][0] <= r['actual'] <= r[method][1] for r in rows)
    return {'cases': len(rows), 'hits': hits, 'coverage': hits / len(rows),
            'mean_width_php': mean(widths),
            'mean_relative_width': mean(w / r['prediction'] for w, r in zip(widths, rows))}


def summary(cells, method):
    values = [cell[method] for cell in cells.values()]
    if len(values) != 15 or any(v is None for v in values):
        return {'meets_rule': False, 'reason': 'All 15 cells require eligible cases'}
    coverage = mean(v['coverage'] for v in values)
    within = sum(0.7 <= v['coverage'] <= 0.9 for v in values)
    return {'mean_coverage': coverage, 'cells_70_90': within,
            'mean_width_php': mean(v['mean_width_php'] for v in values),
            'mean_relative_width': mean(v['mean_relative_width'] for v in values),
            'meets_rule': 0.75 <= coverage <= 0.85 and within >= 12}
