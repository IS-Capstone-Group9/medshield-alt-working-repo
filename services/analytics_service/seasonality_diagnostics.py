"""Offline SO1 diagnostics: seasonality evidence and thin-month audit for a monthly sales ledger.

Descriptive and retrospective only. No forecast, publication or dashboard metric is produced here.
Variants and the verdict rule are declared below BEFORE any series is examined; do not tune
them to a series. Missing months are never zero-filled.
"""
from statistics import median
import numpy as np
from scipy import stats
from statsmodels.tsa.seasonal import STL

PERIOD = 12
# Pre-declared variants: the project protocol and one declared log-scale sensitivity.
VARIANTS = {
    'protocol_raw_robust_w13': dict(log=False, seasonal=13, robust=True),
    'sensitivity_log_robust_w13': dict(log=True, seasonal=13, robust=True),
}
# Pre-declared verdict rule on month-of-year pattern repeatability.
ALPHA = 0.05
MIN_YEAR_CONSISTENCY = 0.3
MIN_FULL_YEARS = 3
THIN_RATIO = 0.10  # observed month with < 10% of the reference median record count


def month_id(period):
    year, month = map(int, period.split('-'))
    return year * 12 + month - 1


def label(index):
    return f'{index // 12}-{index % 12 + 1:02d}'


def _strengths(fit):
    var_r = np.var(fit.resid)
    return (round(max(0.0, 1 - var_r / np.var(fit.seasonal + fit.resid)), 6),
            round(max(0.0, 1 - var_r / np.var(fit.trend + fit.resid)), 6))


def seasonality_evidence(values, start, end):
    """values: {'YYYY-MM': number|None}. Requires every month start..end observed (no imputation)."""
    ids = range(month_id(start), month_id(end) + 1)
    gaps = [label(i) for i in ids if values.get(label(i)) is None]
    if gaps:
        return {'status': 'unavailable', 'reason': 'gap_in_window', 'gaps': gaps}
    y = np.array([float(values[label(i)]) for i in ids])
    if len(y) < 2 * PERIOD:
        return {'status': 'unavailable', 'reason': 'fewer_than_24_months', 'months': len(y)}
    variants = {}
    for name, spec in VARIANTS.items():
        if spec['log'] and not (y > 0).all():
            variants[name] = {'status': 'unavailable', 'reason': 'non_positive_values'}
            continue
        series = np.log(y) if spec['log'] else y
        seasonal, trend = _strengths(STL(series, period=PERIOD, seasonal=spec['seasonal'], robust=spec['robust']).fit())
        variants[name] = {'status': 'fitted', 'seasonal_strength': seasonal, 'trend_strength': trend}
    by_year = {}
    for i, v in zip(ids, y):
        by_year.setdefault(i // 12, {})[i % 12] = v
    full = sorted(year for year, months in by_year.items() if len(months) == 12)
    pattern = {'full_years': full}
    if len(full) < MIN_FULL_YEARS:
        verdict = 'inconclusive_too_few_full_years'
    else:
        share = np.array([[by_year[yr][m] / np.mean(list(by_year[yr].values())) for m in range(12)] for yr in full])
        p_value = float(stats.kruskal(*[share[:, m] for m in range(12)]).pvalue)
        rho = float(np.mean([stats.spearmanr(share[a], share[b])[0] for a in range(len(full)) for b in range(a + 1, len(full))]))
        pattern.update(kruskal_p=round(p_value, 6), mean_between_year_spearman=round(rho, 6))
        if p_value < ALPHA and rho >= MIN_YEAR_CONSISTENCY:
            verdict = 'stable_seasonal_pattern'
        elif p_value >= ALPHA and rho < MIN_YEAR_CONSISTENCY:
            verdict = 'no_stable_seasonal_pattern'
        else:
            verdict = 'inconclusive_mixed_signals'
    return {'status': 'ok', 'window': [start, end, len(y)], 'variants': variants, 'month_pattern': pattern, 'verdict': verdict,
            'limits': ['descriptive only', 'few full years', 'months treated as independent', 'no multiplicity adjustment across areas']}


def thin_month_audit(records_by_period, calendar_start, calendar_end, reference_start):
    """records_by_period: {'YYYY-MM': record count}. Missing = absent/zero; thin = observed but below THIN_RATIO x reference median."""
    ids = [label(i) for i in range(month_id(calendar_start), month_id(calendar_end) + 1)]
    reference = [records_by_period.get(p, 0) for p in ids if p >= reference_start and records_by_period.get(p, 0) > 0]
    if not reference:
        return {'status': 'unavailable', 'reason': 'no_reference_months'}
    floor = THIN_RATIO * median(reference)
    missing = [p for p in ids if records_by_period.get(p, 0) == 0]
    thin = [p for p in ids if 0 < records_by_period.get(p, 0) < floor]
    flagged = set(missing) | set(thin)
    affected = []
    for p in ids:
        base = f'{int(p[:4]) - 1}{p[4:]}'
        if base in set(ids) and (p in flagged or base in flagged):
            affected.append({'target': p, 'base': base, 'reason': sorted(r for r, hit in (('missing_or_thin_target', p in flagged), ('missing_or_thin_base', base in flagged)) if hit)})
    return {'status': 'ok', 'reference_median_records': median(reference), 'floor_records': floor, 'missing_months': missing, 'thin_months': thin,
            'yoy_pairs_with_flagged_month': affected}
