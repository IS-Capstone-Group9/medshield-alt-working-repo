"""Fixed-origin backtests, development-only selection and frozen final audit."""
from collections import defaultdict
from importlib.metadata import PackageNotFoundError, version
import platform
import time

from .contracts import digest, eligible, month, period, validate_input
from .metrics import compare, interval, interval_metrics, score
from .models import BENCHMARKS, CHALLENGERS, forecast

DEFAULT_SCHEDULE = dict(training_start='2020-01', development_origins=[
    '2022-12', '2023-03', '2023-06', '2023-09', '2023-12'], audit_origin='2024-12',
    audit_end='2025-12', audit_label='retrospective_audit',
    rationale='Blueprint initial contiguous-history candidate; requires full eligible coverage')
CRITERIA = dict(status='experimental_not_business_approval', relative_wape_improvement=.05,
                absolute_normalized_bias_max=10, relative_mae_rmse_deterioration_max=.10,
                critical_horizon_mae_deterioration_max=.10)


def package_versions():
    result = {'python': platform.python_version()}
    for name in ('numpy', 'pandas', 'statsmodels', 'prophet', 'cmdstanpy'):
        try:
            result[name] = version(name)
        except PackageNotFoundError:
            result[name] = None
    return result


def validate_schedule(schedule):
    if not schedule.get('rationale'):
        raise ValueError('Schedule changes require a recorded rationale before evaluation')
    start, audit, end = map(month, (schedule['training_start'], schedule['audit_origin'], schedule['audit_end']))
    origins = list(map(month, schedule['development_origins']))
    if not origins or len(origins) != len(set(origins)) or any(o < start + 35 or o + 12 > audit for o in origins):
        raise ValueError('Development folds require 36 months and must end before audit targets')
    if end != audit + 12:
        raise ValueError('Audit must contain twelve calendar months')
    if schedule.get('audit_label') not in ('retrospective_audit', 'untouched_holdout'):
        raise ValueError('Explicit audit label required')


def evaluate_fold(series, series_id, origin, config, run_id, residuals, stage, seed):
    try:
        values, reason = forecast(series, origin, list(range(1, 13)), config, seed)
    except (ImportError, ValueError, RuntimeError, ArithmeticError) as exc:
        values, reason = {}, f'{type(exc).__name__}: {exc}'
    points = []
    for lead in range(1, 13):
        prediction = values.get(lead)
        points.append(dict(series_id=series_id, target_name='net_sales', unit='PHP', scope='company',
                           run_id=run_id, model_id=config['model_id'], origin_period=period(origin),
                           target_period=period(origin + lead), lead_months=lead, prediction=prediction,
                           actual=series.get(origin + lead), stage=stage,
                           missing_reason=reason if prediction is None else None,
                           intervals=[interval(prediction, residuals, origin, lead, level) for level in (.8, .95)]))
    return points


def grouped_metrics(points, field):
    groups = defaultdict(list)
    for p in points:
        if p['prediction'] is not None and p.get('actual') is not None:
            groups[str(p[field])].append((p['actual'], p['prediction']))
    return {name: score(pairs) for name, pairs in sorted(groups.items())}


def select_model(points, configs):
    expected = {tuple(p[k] for k in ('series_id', 'origin_period', 'target_period', 'lead_months'))
                for p in points if p.get('actual') is not None}
    complete = [c['model_id'] for c in configs if sum(
        p['model_id'] == c['model_id'] and p['prediction'] is not None and p.get('actual') is not None
        for p in points) == len(expected) and expected]
    comparisons = compare(points, complete)
    benchmarks = [c['model_id'] for c in BENCHMARKS if c['model_id'] in complete
                  and comparisons[c['model_id']]['common']['wape'] is not None]
    if not benchmarks:
        return None, 'No complete benchmark with defined WAPE', comparisons
    best = min(benchmarks, key=lambda m: (comparisons[m]['common']['wape'], m))
    reference = comparisons[best]['common']
    if reference['wape'] == 0:
        return best, 'Zero-error benchmark; relative improvement is undefined', comparisons
    accepted = []
    for model in complete:
        if model in benchmarks:
            continue
        metric = comparisons[model]['common']
        horizon_ok = True
        for limit in (3, 6, 12):
            subset = [p for p in points if p['lead_months'] <= limit]
            pair = compare(subset, [best, model])
            baseline = pair[best]['common']['mae']
            challenger = pair[model]['common']['mae']
            horizon_ok &= baseline is not None and challenger is not None and challenger <= baseline * 1.1
        if (metric['wape'] is not None and metric['wape'] <= reference['wape'] * .95
                and abs(metric['normalized_bias']) <= 10
                and all(metric[k] <= reference[k] * 1.1 for k in ('mae', 'rmse')) and horizon_ok):
            accepted.append(model)
    if accepted:
        return min(accepted, key=lambda m: (comparisons[m]['common']['wape'], m)), 'Meets frozen experimental development criteria; review still required', comparisons
    return best, 'No challenger qualifies; retain best complete benchmark candidate', comparisons


def run(data, *, schedule=None, include_challengers=True, code_identity=None, seed=20260927):
    started = time.monotonic()
    blockers = validate_input(data)
    schedule = dict(schedule or DEFAULT_SCHEDULE)
    validate_schedule(schedule)
    configs = BENCHMARKS + (CHALLENGERS if include_challengers else [])
    identity = dict(input_hash=digest(data), schedule=schedule, configurations=configs, seed=seed,
                    code_identity=code_identity or {'status': 'not_supplied'}, packages=package_versions(), criteria=CRITERIA)
    run_id = digest(identity)
    result = dict(schema_version='1.0', run_id=run_id, status='blocked' if blockers else 'evaluated_unpublished',
                  manifest=data['manifest'], identity=identity, blockers=blockers, protocol='rolling_origins_fixed_origin_multistep',
                  predictions=[], evaluations=[], model_cards=[], folds=[], selection=None,
                  limitations=['Revised snapshot evaluation is retrospective unless historical vintages establish availability.',
                               'Reporting coverage follows the supplied review receipt; inspect its evidence reference for attested versus independently verified completeness.',
                               'Empirical bands use dependent temporal errors and provide no coverage guarantee.',
                               'Publication requires a separate accepted data and model review.'])
    if blockers:
        result['runtime_seconds'] = time.monotonic() - started
        return result
    series_by_id = defaultdict(dict)
    start = month(schedule['training_start'])
    for row in data['rows']:
        if eligible(row) and month(row['period']) >= start:
            series_by_id[row['series_id']][month(row['period'])] = row['target_value']
    if len(series_by_id) != 1:
        result.update(status='blocked', blockers=['First release requires exactly one eligible company series'])
        result['runtime_seconds'] = time.monotonic() - started
        return result
    series_id, series = next(iter(series_by_id.items()))
    dev_origins = sorted(map(month, schedule['development_origins']))
    # Missing history never silently changes a fold's intended training population.
    if any(p not in series for p in range(start, max(dev_origins) + 13)):
        result.update(status='blocked', blockers=['Incomplete eligible training/development coverage for frozen schedule'])
        result['runtime_seconds'] = time.monotonic() - started
        return result
    dev = []
    for config in configs:
        residuals = []
        for origin in dev_origins:
            points = evaluate_fold(series, series_id, origin, config, run_id, residuals, 'development', seed)
            residuals.extend(points)
            dev.extend(points)
    chosen, reason, comparisons = select_model(dev, configs)
    result['selection'] = dict(model_id=chosen, reason=reason, stage='development_only', criteria=CRITERIA,
                               frozen_before_audit=True)
    result['predictions'].extend(dev)
    audit_origin = month(schedule['audit_origin'])
    audit_complete = all(p in series for p in range(start, month(schedule['audit_end']) + 1))
    # Auditing all frozen candidates is permitted; never reselect from audit results.
    for config in configs:
        model = config['model_id']
        model_dev = [p for p in dev if p['model_id'] == model]
        audit = evaluate_fold(series, series_id, audit_origin, config, run_id, model_dev, schedule['audit_label'], seed) if audit_complete else []
        result['predictions'].extend(audit)
        result['evaluations'].append(dict(model_id=model, development=comparisons.get(model),
                                         development_scored=score([(p['actual'], p['prediction']) for p in model_dev if p['actual'] is not None and p['prediction'] is not None]),
                                         audit=score([(p['actual'], p['prediction']) for p in audit if p['actual'] is not None and p['prediction'] is not None]),
                                         audit_reason=None if audit_complete else 'Incomplete accepted audit coverage',
                                         by_lead=grouped_metrics(model_dev, 'lead_months'), by_origin=grouped_metrics(model_dev, 'origin_period'),
                                         intervals=[interval_metrics(audit, level) for level in (.8, .95)]))
        result['model_cards'].append(dict(model_id=model, configuration=config, target='net_sales', unit='PHP', scope='company',
                                          selected=model == chosen, status='candidate_unpublished',
                                          unsupported_reasons=sorted({p['missing_reason'] for p in model_dev if p['missing_reason']}),
                                          input_hash=identity['input_hash'], run_id=run_id))
    for origin in dev_origins + ([audit_origin] if audit_complete else []):
        training = [{'period': period(p), 'value': series[p]} for p in range(start, origin + 1)]
        result['folds'].append(dict(origin_period=period(origin), training_start=period(start),
                                   training_count=len(training), training_hash=digest(training),
                                   target_periods=[period(origin + lead) for lead in range(1, 13)],
                                   protocol='fixed_origin_multistep', vintage_policy=data['manifest']['revision_policy']))
    if chosen:
        config = next(c for c in configs if c['model_id'] == chosen)
        residuals = [p for p in result['predictions'] if p['model_id'] == chosen]
        future = evaluate_fold(series, series_id, max(series), config, run_id, residuals, 'future', seed)
        for point in future:
            point['actual'] = None
        result['predictions'].extend(future)
    result['runtime_seconds'] = time.monotonic() - started
    return result
