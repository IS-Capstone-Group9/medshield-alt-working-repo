"""Six registered origin-only absolute-error candidates; no publication or 2026 scoring."""
import argparse
from collections import Counter
import copy
from datetime import datetime, timedelta, timezone
from decimal import Decimal, localcontext
from pathlib import Path
import sys
import warnings

from . import annual_projection as evidence
from .contracts import digest, eligible, month, period, validate_input
from .engine import CRITERIA, DEFAULT_SCHEDULE, package_versions

LEADS = list(range(1, 13))
CONFIGURATIONS = [
    dict(model_id=f'median_{window}', method='recent_median', window=window)
    for window in (3, 6, 12)
] + [
    dict(model_id='weighted_median_6', method='linear_recency_weighted_median', window=6,
         chronological_weights=[1, 2, 3, 4, 5, 6], weighted_median_tie='lower'),
    dict(model_id='seasonal_median_shrink_6_3y', method='seasonal_median_shrinkage', window=6,
         seasonal_years=3, seasonal_weight=0.5),
    dict(model_id='last_value_l1_calibrated_10pct', method='origin_local_l1_scale',
         inner_initial_history=24, inner_step_months=3, inner_horizon=12,
         scale_min=0.9, scale_max=1.1, weighted_median_tie='lower'),
]
INTERVAL_REASON = 'Not calibrated: five dependent development errors per lead do not support uncertainty bands.'


def decimal(value):
    evidence.require(not isinstance(value, bool) and isinstance(value, (int, float, Decimal)),
                     'Require finite numeric values, not Boolean or strings')
    result = Decimal(str(value))
    evidence.require(result.is_finite(), 'Require finite numeric values')
    return result


def median(values):
    ordered = sorted(map(decimal, values))
    evidence.require(bool(ordered), 'Median needs observations')
    middle = len(ordered) // 2
    return ordered[middle] if len(ordered) % 2 else (ordered[middle - 1] + ordered[middle]) / 2


def lower_weighted_median(values, weights):
    """Keep duplicate mass; choose first value reaching half the positive weight."""
    evidence.require(len(values) == len(weights) and bool(values), 'Weighted median needs matched observations')
    masses = {}
    for value, weight in zip(values, weights):
        value, weight = decimal(value), decimal(weight)
        evidence.require(weight > 0, 'Weighted median needs positive weights')
        masses[value] = masses.get(value, Decimal(0)) + weight
    half, cumulative = sum(masses.values()) / 2, Decimal(0)
    for value, weight in sorted(masses.items()):
        cumulative += weight
        if cumulative >= half:
            return value
    raise ValueError('Weighted median crossing unavailable')


def training_record(training, start, origin):
    values = [dict(period=period(p), value=training[p]) for p in range(start, origin + 1)]
    return dict(training_start=period(start), origin_period=period(origin),
                training_count=len(values), training_hash=digest(values))


def l1_calibration(training, start, origin, config):
    """Inner targets all end by the outer origin; zero endpoints retain constant loss."""
    inner_origins = list(range(start + config['inner_initial_history'] - 1,
                               origin - config['inner_horizon'] + 1, config['inner_step_months']))
    inner_folds, cases, ratios, weights = [], [], [], []
    zero_count, constant_loss = 0, Decimal(0)
    for inner in inner_origins:
        inner_folds.append(training_record(training, start, inner))
        endpoint = decimal(training[inner])
        for lead in LEADS:
            target = inner + lead
            actual = decimal(training[target])
            cases.append(dict(inner_origin_period=period(inner), target_period=period(target),
                              lead_months=lead, endpoint=training[inner], actual=training[target]))
            if endpoint == 0:
                zero_count += 1
                constant_loss += abs(actual)
            else:
                ratios.append(actual / endpoint)
                weights.append(abs(endpoint))
    unconstrained = lower_weighted_median(ratios, weights) if ratios else None
    scale = max(decimal(config['scale_min']), min(decimal(config['scale_max']), unconstrained)) if ratios else Decimal(1)
    unscaled_loss = sum(abs(decimal(case['endpoint']) - decimal(case['actual'])) for case in cases)
    scaled_loss = sum(abs(scale * decimal(case['endpoint']) - decimal(case['actual'])) for case in cases)
    return scale, dict(learned_scale=str(scale), unbounded_l1_scale=str(unconstrained) if unconstrained is not None else None,
        scale_bounds=[config['scale_min'], config['scale_max']], weighted_median_tie='lower',
        inner_origin_count=len(inner_origins), inner_case_count=len(cases), informative_case_count=len(ratios),
        zero_endpoint_case_count=zero_count, inner_zero_endpoint_constant_absolute_loss_php=str(constant_loss),
        inner_absolute_loss_unscaled_php=str(unscaled_loss), inner_absolute_loss_calibrated_php=str(scaled_loss),
        calibration_reason=None if ratios else 'No informative nonzero inner endpoints; uncalibrated scale 1',
        support_status='limited_dependent_inner_cases_not_reliable_calibration',
        inner_folds=inner_folds, inner_cases=cases, inner_cases_hash=digest(cases))


def robust_forecast(series, start, origin, leads, config):
    """Exactly the registered recipe; ignore every value after this forecast origin."""
    evidence.require(config in CONFIGURATIONS, 'Unknown or altered robust recipe')
    evidence.require(all(isinstance(p, int) and not isinstance(p, bool) for p in (start, origin)), 'Integer origin/start required')
    evidence.require(bool(leads) and len(set(leads)) == len(leads)
        and all(isinstance(lead, int) and not isinstance(lead, bool) and 1 <= lead <= 12 for lead in leads),
        'Require unique integer leads 1–12')
    evidence.require(origin - start + 1 >= 36, 'Require 36 contiguous origin-known eligible months')
    training = {p: series[p] for p in range(start, origin + 1) if p in series}
    evidence.require(len(training) == origin - start + 1, 'Missing contiguous origin-known training month')
    for value in training.values():
        decimal(value)
    metadata = training_record(training, start, origin)
    with localcontext() as context:
        context.prec = 50
        method = config['method']
        if method == 'recent_median':
            level = median([training[p] for p in range(origin - config['window'] + 1, origin + 1)])
            predictions = {lead: level for lead in leads}
        elif method == 'linear_recency_weighted_median':
            values = [training[p] for p in range(origin - config['window'] + 1, origin + 1)]
            level = lower_weighted_median(values, config['chronological_weights'])
            predictions = {lead: level for lead in leads}
        elif method == 'seasonal_median_shrinkage':
            level = median([training[p] for p in range(origin - config['window'] + 1, origin + 1)])
            seasonal_weight = decimal(config['seasonal_weight'])
            predictions, references = {}, []
            for lead in leads:
                months = [origin + lead - 12 * year for year in range(1, config['seasonal_years'] + 1)]
                evidence.require(all(start <= p <= origin and p in training for p in months), 'Unsupported seasonal reference coverage')
                seasonal = median([training[p] for p in months])
                predictions[lead] = (1 - seasonal_weight) * level + seasonal_weight * seasonal
                references.append(dict(lead_months=lead, target_period=period(origin + lead),
                    reference_periods=list(map(period, months)), seasonal_median=str(seasonal)))
            metadata.update(recent_median=str(level), seasonal_references=references)
        else:
            scale, calibration = l1_calibration(training, start, origin, config)
            metadata['calibration'] = calibration
            predictions = {lead: scale * decimal(training[origin]) for lead in leads}
    result = {lead: float(value) for lead, value in predictions.items()}
    for value in result.values():
        decimal(value)
    return result, metadata


def data_contract(data, comparison):
    evidence.comparison_contract(comparison)
    evidence.require(comparison['identity']['schedule'] == DEFAULT_SCHEDULE, 'Unchanged five-origin schedule required')
    blockers = validate_input(data)
    evidence.require(not blockers, 'Frozen input is not approved for training: ' + '; '.join(blockers))
    evidence.require(data['manifest'] == comparison['manifest'] and digest(data) == comparison['identity']['input_hash'],
                     'Frozen input differs from retained comparison')
    start, end = month(DEFAULT_SCHEDULE['training_start']), month(DEFAULT_SCHEDULE['audit_end'])
    rows = [row for row in data['rows'] if start <= month(row['period']) <= end]
    evidence.require(len(rows) == end - start + 1 and all(eligible(row) for row in rows),
                     'Require all 72 contiguous eligible January2020–December2025 months')
    evidence.require(len({row['series_id'] for row in rows}) == 1, 'Require exactly one company series')
    series = {month(row['period']): row['target_value'] for row in rows}
    evidence.require(set(series) == set(range(start, end + 1)), 'Training/development/audit calendar gap')
    return rows[0]['series_id'], series


def retained_baseline(data, comparison):
    series_id, series = data_contract(data, comparison)
    points = []
    for stage, origins in [('development', DEFAULT_SCHEDULE['development_origins']),
                           ('retrospective_audit', [DEFAULT_SCHEDULE['audit_origin']])]:
        expected = {(series_id, 'net_sales', origin, period(month(origin) + lead), lead) for origin in origins for lead in LEADS}
        found = {}
        for point in comparison['predictions']:
            if point['model_id'] != 'last_value' or point['stage'] != stage:
                continue
            key = point_key(point)
            evidence.require(key not in found, 'Duplicate retained baseline key')
            evidence.require(key in expected and point['actual'] == series[month(point['target_period'])]
                             and point['prediction'] == series[month(point['origin_period'])]
                             and point['unit'] == 'PHP' and point['scope'] == 'company',
                             'Retained last-value prediction/actual/source key differs')
            found[key] = copy.deepcopy(point)
        evidence.require(set(found) == expected, 'Incomplete retained baseline comparison keys')
        points.extend(found[key] for key in sorted(found))
    evaluations = {entry['model_id']: entry for entry in comparison['evaluations']}
    benchmarks = ['last_value', 'seasonal_naive', 'mean_3', 'mean_6']
    evidence.require(all(evaluations[model]['development_scored']['n'] == 60 for model in benchmarks), 'Incomplete retained benchmark')
    best = min(benchmarks, key=lambda model: (evaluations[model]['development_scored']['wape'], model))
    evidence.require(best == 'last_value', 'Retained strongest development benchmark changed')
    for stage, metric_field in [('development', 'development_scored'), ('retrospective_audit', 'audit')]:
        current, original = metrics([p for p in points if p['stage'] == stage]), evaluations['last_value'][metric_field]
        evidence.require(current['n'] == original['n'], 'Retained baseline metric count differs')
        for field in ('mae', 'rmse', 'bias', 'wape', 'normalized_bias'):
            tolerance = Decimal('0.000001') if field in ('wape', 'normalized_bias') else Decimal('0.01')
            evidence.require((current[field] is None and original[field] is None) or
                (current[field] is not None and original[field] is not None
                 and abs(decimal(current[field]) - decimal(original[field])) <= tolerance), 'Retained baseline metrics differ')
    return points


def point_key(point):
    return tuple(point[field] for field in ('series_id', 'target_name', 'origin_period', 'target_period', 'lead_months'))


def metrics(points):
    pairs = [(decimal(p['actual']), decimal(p['prediction'])) for p in points
             if p.get('actual') is not None and p.get('prediction') is not None]
    result = dict(n=len(pairs), mae=None, rmse=None, wape=None, bias=None, normalized_bias=None,
                  reason='No eligible pairs' if not pairs else None,
                  distinct_target_month_count=len({p['target_period'] for p in points if p.get('prediction') is not None and p.get('actual') is not None}),
                  origin_count=len({p['origin_period'] for p in points if p.get('prediction') is not None and p.get('actual') is not None}))
    if not pairs:
        return result
    with localcontext() as context:
        context.prec = 50
        errors = [prediction - actual for actual, prediction in pairs]
        absolute, signed = sum(map(abs, errors)), sum(errors)
        denominator = sum(abs(actual) for actual, _ in pairs)
        squared = sum(error * error for error in errors)
        result.update(mae=float(absolute / len(pairs)), rmse=float((squared / len(pairs)).sqrt()),
            bias=float(signed / len(pairs)), wape=float(100 * absolute / denominator) if denominator else None,
            normalized_bias=float(100 * signed / denominator) if denominator else None,
            reason=None if denominator else 'Zero absolute-actual denominator',
            actual_signed_sum_php=str(sum(actual for actual, _ in pairs)), actual_absolute_sum_php=str(denominator),
            prediction_sum_php=str(sum(prediction for _, prediction in pairs)), absolute_error_sum_php=str(absolute),
            signed_error_sum_php=str(signed), squared_error_sum_php_squared=str(squared),
            overforecast_count=sum(error > 0 for error in errors), underforecast_count=sum(error < 0 for error in errors),
            exact_count=sum(error == 0 for error in errors),
            overforecast_amount_php=str(sum(error for error in errors if error > 0)),
            underforecast_amount_php=str(-sum(error for error in errors if error < 0)), max_absolute_error_php=str(max(map(abs, errors))))
    return result


def grouped(points, field):
    names = sorted({str(p[field]) for p in points})
    return {name: metrics([p for p in points if str(p[field]) == name]) for name in names}


def protocol():
    return dict(version='1.0', purpose='bounded_exploratory_absolute_error_reduction', promotion=False,
        target='company_month_net_sales_PHP', configurations=copy.deepcopy(CONFIGURATIONS),
        schedule=copy.deepcopy(DEFAULT_SCHEDULE), seed=20260927, frozen_original_criteria=copy.deepcopy(CRITERIA),
        candidate_ordering='Lowest development MAE, then model_id, among complete sixty-key recipes; WAPE shares numerator on same keys.',
        stop_rule='Evaluate exactly six registered recipes once; no post-result grid expansion or audit reselection.',
        median_rule='Even-window median is midpoint; weighted median is deterministic lower crossing; duplicate weights are summed.',
        calibration='Quarterly inner origins start training_start+23 and end no later than outer_origin−12. Minimize origin-known L1 with ratio weights abs(endpoint); zero endpoints retain constant loss. Bound scale to [0.9,1.1].',
        preprocessing='Origin-local values only; all signed observations retained; no clipping, outlier deletion, smoothing across origin or gap imputation.',
        intervals='Unavailable; no uncertainty calibration or future accuracy assessment.',
        limitations=[
            'Designed after development and the 2025 audit were inspected; all new conclusions are exploratory.',
            '2025 is a previously inspected retrospective audit, never an untouched final test or recipe-selection set.',
            'Five overlapping origins yield sixty cases over twenty-four distinct target months, not independent months.',
            'Scalar inner origins overlap; first outer origin has only one inner origin and twelve cases; calibration reliability is not established.',
            'Origin-local calculations do not verify historical availability: this is a revised snapshot without availability vintages.',
            '2020–2025 completeness is inherited training-only user attestation, not independent verification.',
            'Company PHP revenue does not establish SKU quantity demand, disease causation, stock losses or procurement benefits.',
            'Business MAE/WAPE limits remain unset; original experimental criteria are not publication approval.',
            'Later untouched accepted actuals and scoped model/data review are required before promotion.',
            'No 2026 actuals, accuracy claims, new annual projections, release draft, warehouse writes or activation.'
        ], method_references=[
            'https://otexts.com/fpp3/accuracy.html', 'https://robjhyndman.com/hyndsight/wape.html'])


def registration(data, comparison, receipt):
    data_contract(data, comparison)
    retained_baseline(data, comparison)
    evidence.require(comparison['identity']['seed'] == protocol()['seed'], 'Retained seed differs from frozen protocol')
    packages = package_versions()
    evidence.require(packages == comparison['identity']['packages'], 'Evaluated package environment changed')
    code = evidence.code_identity(comparison)
    code['code_sha256']['robust_error_experiment.py'] = evidence.raw_hash(Path(__file__).read_bytes())
    test_path = Path(__file__).resolve().parents[2] / 'tests' / 'test_predictive_robust_error.py'
    code['test_sha256'] = evidence.raw_hash(test_path.read_bytes())
    identity = dict(protocol=protocol(), input_hash=digest(data), source_receipt=copy.deepcopy(receipt),
        packages=packages, code_identity=code, comparison_run_id=comparison['run_id'],
        original_selection=copy.deepcopy(comparison['selection']), publication_approved=False)
    return dict(identity=identity, experiment_id=digest(identity))


def fold(series, series_id, start, origin, config, run_id, stage):
    training = {p: series[p] for p in range(start, origin + 1)}
    metadata, predictions, reason = training_record(training, start, origin), {}, None
    with warnings.catch_warnings(record=True) as captured:
        warnings.simplefilter('always')
        try:
            predictions, details = robust_forecast(training, start, origin, LEADS[:], copy.deepcopy(config))
            evidence.require(isinstance(details, dict), 'Malformed adapter metadata')
            metadata.update(details)
            evidence.require(isinstance(predictions, dict) and set(predictions) == set(LEADS)
                and all(isinstance(lead, int) and not isinstance(lead, bool) for lead in predictions), 'Incomplete twelve-lead adapter output')
            for value in predictions.values():
                decimal(value)
        except Exception as exc:
            predictions, reason = {}, f'{type(exc).__name__}: {exc}'
    counts = Counter((warning.category.__name__, str(warning.message)) for warning in captured)
    model_warnings = [dict(model_id=config['model_id'], origin_period=period(origin), stage=stage,
                          category=category, message=message, count=count) for (category, message), count in sorted(counts.items())]
    if any(warning['category'] == 'ConvergenceWarning' for warning in model_warnings):
        reason = reason or 'Convergence warning; coherent twelve-lead recipe unavailable'
    metadata.update(model_id=config['model_id'], stage=stage, unavailable_reason=reason, warnings=model_warnings)
    points = [dict(run_id=run_id, model_id=config['model_id'], series_id=series_id, target_name='net_sales',
        unit='PHP', scope='company', origin_period=period(origin), target_period=period(origin + lead), lead_months=lead,
        prediction=float(predictions[lead]) if reason is None else None, actual=series[origin + lead], stage=stage,
        status='exploratory_research_unpublished' if reason is None else 'exploratory_recipe_unavailable',
        publication_approved=False, missing_reason=reason,
        intervals=[dict(level=level, lower=None, upper=None, sample_count=0, method='not_calibrated', reason=INTERVAL_REASON)
                   for level in (0.8, 0.95)]) for lead in LEADS]
    return points, metadata


def criterion_review(points, baseline):
    reference = metrics(baseline)
    details = []
    for config in CONFIGURATIONS:
        selected = [p for p in points if p['model_id'] == config['model_id']]
        complete = len(selected) == len(baseline) and all(p['prediction'] is not None for p in selected)
        metric = metrics(selected)
        checks = dict(complete_identical_keys=complete and {point_key(p) for p in selected} == {point_key(p) for p in baseline},
            relative_wape_improvement=complete and reference['wape'] is not None and reference['wape'] > 0
                and metric['wape'] is not None and metric['wape'] <= reference['wape'] * (1 - CRITERIA['relative_wape_improvement']),
            absolute_normalized_bias=metric['normalized_bias'] is not None and abs(metric['normalized_bias']) <= CRITERIA['absolute_normalized_bias_max'],
            mae_deterioration=metric['mae'] is not None and metric['mae'] <= reference['mae'] * (1 + CRITERIA['relative_mae_rmse_deterioration_max']),
            rmse_deterioration=metric['rmse'] is not None and metric['rmse'] <= reference['rmse'] * (1 + CRITERIA['relative_mae_rmse_deterioration_max']))
        horizon_checks = {}
        for limit in (3, 6, 12):
            candidate = metrics([p for p in selected if p['lead_months'] <= limit])
            benchmark = metrics([p for p in baseline if p['lead_months'] <= limit])
            horizon_checks[str(limit)] = candidate['mae'] is not None and candidate['mae'] <= benchmark['mae'] * (1 + CRITERIA['critical_horizon_mae_deterioration_max'])
        checks['critical_horizon_mae'] = all(horizon_checks.values())
        details.append(dict(model_id=config['model_id'], qualifies=all(checks.values()), checks=checks, critical_horizons=horizon_checks))
    accepted = [entry['model_id'] for entry in details if entry['qualifies']]
    chosen = min(accepted, key=lambda model: (metrics([p for p in points if p['model_id'] == model])['wape'], model)) if accepted else 'last_value'
    return dict(criteria=copy.deepcopy(CRITERIA), criteria_selected_model=chosen, qualified_models=accepted, model_checks=details,
                status='experimental_research_comparison_only_not_original_selection_change')


def evaluate(data, comparison, record):
    evidence.require(record.get('experiment_id') == digest(record['identity']), 'Experiment registration identity mismatch')
    evidence.require(record['identity']['protocol'] == protocol(), 'Protocol differs from registered six-recipe definition')
    evidence.require(record['identity']['input_hash'] == digest(data)
        and record['identity']['comparison_run_id'] == comparison['run_id']
        and record['identity']['original_selection'] == comparison['selection'], 'Registered source/comparison identity differs')
    series_id, series = data_contract(data, comparison)
    baseline = retained_baseline(data, comparison)
    start = month(DEFAULT_SCHEDULE['training_start'])
    result = dict(schema_version='1.0', run_id=record['experiment_id'], experiment_id=record['experiment_id'],
        status='robust_error_exploratory_evaluated_unpublished', publication_approved=False, identity=copy.deepcopy(record['identity']),
        manifest=copy.deepcopy(data['manifest']), original_selection=copy.deepcopy(comparison['selection']),
        baseline_predictions=baseline, predictions=[], folds=[], evaluations=[], model_cards=[], warnings=[],
        limitations=protocol()['limitations'], actuals_2026=None, assessment_2026=None,
        evaluation_started_at=datetime.now(timezone.utc).isoformat())
    for config in CONFIGURATIONS:
        for origin in DEFAULT_SCHEDULE['development_origins']:
            points, metadata = fold(series, series_id, start, month(origin), config, result['run_id'], 'development')
            result['predictions'].extend(points)
            result['folds'].append(metadata)
            result['warnings'].extend(metadata['warnings'])
    development = result['predictions'][:]
    baseline_dev = [p for p in baseline if p['stage'] == 'development']
    expected = {point_key(p) for p in baseline_dev}
    complete = [config['model_id'] for config in CONFIGURATIONS
                if len([p for p in development if p['model_id'] == config['model_id'] and p['prediction'] is not None]) == len(expected)]
    best = min(complete, key=lambda model: (metrics([p for p in development if p['model_id'] == model])['mae'], model)) if complete else None
    criteria = criterion_review(development, baseline_dev)
    result['development_freeze'] = dict(frozen_at=datetime.now(timezone.utc).isoformat(), stage='development_only',
        best_new_complete_recipe=best, criteria_selected_model=criteria['criteria_selected_model'],
        original_selection_preserved=True, audit_previously_inspected=True, publication_approved=False,
        development_predictions_sha256=digest(development), criteria_review=criteria,
        decision='No further recipes, revised weights or audit-driven selection; grid stopped after six predetermined recipes.')
    result['audit_execution_started_at'] = datetime.now(timezone.utc).isoformat()
    for config in CONFIGURATIONS:
        points, metadata = fold(series, series_id, start, month(DEFAULT_SCHEDULE['audit_origin']), config, result['run_id'], 'retrospective_audit')
        result['predictions'].extend(points)
        result['folds'].append(metadata)
        result['warnings'].extend(metadata['warnings'])
    result['baseline_evaluations'] = dict(development=metrics(baseline_dev),
        retrospective_audit=metrics([p for p in baseline if p['stage'] == 'retrospective_audit']))
    for config in CONFIGURATIONS:
        model = config['model_id']
        dev = [p for p in development if p['model_id'] == model]
        audit = [p for p in result['predictions'] if p['model_id'] == model and p['stage'] == 'retrospective_audit']
        dev_metric, audit_metric = metrics(dev), metrics(audit)
        reference = result['baseline_evaluations']['development']
        reduction = dict(mae_php=reference['mae'] - dev_metric['mae'] if dev_metric['n'] == 60 else None,
            mae_relative_percent=100 * (1 - dev_metric['mae'] / reference['mae']) if dev_metric['n'] == 60 and reference['mae'] else None,
            wape_percentage_points=reference['wape'] - dev_metric['wape'] if dev_metric['n'] == 60 and dev_metric['wape'] is not None else None,
            comparable=dev_metric['n'] == 60 and {point_key(p) for p in dev} == expected)
        result['evaluations'].append(dict(model_id=model, development=dev_metric, retrospective_audit=audit_metric,
            development_reduction_vs_last_value=reduction, by_origin=grouped(dev, 'origin_period'), by_lead=grouped(dev, 'lead_months'),
            critical_horizons={str(limit): dict(development=metrics([p for p in dev if p['lead_months'] <= limit]),
                baseline=metrics([p for p in baseline_dev if p['lead_months'] <= limit])) for limit in (3, 6, 12)},
            audit_by_lead=grouped(audit, 'lead_months'), tolerance_status='not_assessed_thresholds_missing', publication_approved=False))
        result['model_cards'].append(dict(model_id=model, configuration=copy.deepcopy(config), status='exploratory_candidate_unpublished',
            target='net_sales', unit='PHP', scope='company', complete_development=model in complete,
            best_new_complete_recipe=model == best, qualifies_frozen_original_criteria=model in criteria['qualified_models'],
            original_selection_changed=False, publication_approved=False,
            unsupported_reasons=sorted({p['missing_reason'] for p in dev + audit if p['missing_reason']})))
    result['evaluation_finished_at'] = datetime.now(timezone.utc).isoformat()
    return result


def report(result):
    def fmt(value, precision=6):
        return 'unavailable' if value is None else f'{value:,.{precision}f}'
    reference = result['baseline_evaluations']
    lines = ['# Bounded exploratory error-reduction experiment', '',
        f'Run `{result["run_id"]}`; status `{result["status"]}`. Publication approved: false.',
        'Exactly six pre-registered recipes; company monthly net sales in PHP. Development: 60 cases, 24 distinct months, 5 origins. Audit: 12 previously inspected 2025 months.', '',
        '| Recipe | Dev MAE PHP | Dev WAPE % | Dev bias % | MAE reduction % | Audit MAE PHP | Audit WAPE % |',
        '|---|---:|---:|---:|---:|---:|---:|',
        f'| retained last_value | {fmt(reference["development"]["mae"], 2)} | {fmt(reference["development"]["wape"])} | {fmt(reference["development"]["normalized_bias"])} | — | {fmt(reference["retrospective_audit"]["mae"], 2)} | {fmt(reference["retrospective_audit"]["wape"])} |']
    for entry in result['evaluations']:
        dev, audit = entry['development'], entry['retrospective_audit']
        lines.append(f'| {entry["model_id"]} | {fmt(dev["mae"], 2)} | {fmt(dev["wape"])} | {fmt(dev["normalized_bias"])} | '
            f'{fmt(entry["development_reduction_vs_last_value"]["mae_relative_percent"])} | {fmt(audit["mae"], 2)} | {fmt(audit["wape"])} |')
    freeze = result['development_freeze']
    lines += ['', f'Best new complete development recipe: `{freeze["best_new_complete_recipe"]}`.',
        f'Research comparison under unchanged original challenger criteria: `{freeze["criteria_selected_model"]}`.',
        f'Original retained selection: `{result["original_selection"]["model_id"]}`; unchanged.',
        f'Development frozen at {freeze["frozen_at"]}; audit execution started at {result["audit_execution_started_at"]}.', '',
        'A lowest-error new recipe need not qualify under the original criteria. Neither designation grants business acceptance or activation.',
        'MAE and WAPE use the same absolute-error numerator on identical pairs; WAPE is not accuracy=100−WAPE. Bias can cancel opposing misses. Directional revenue errors are not verified inventory losses.',
        'Scalar calibration uses the lower weighted median, preserving duplicate weight mass and zero-endpoint constant loss. The fixed 0.9–1.1 multiplier bounds are recipe design constraints, not business error limits.', '',
        '| Scalar fold | Inner origins | Inner cases | Informative | Zero endpoint | Learned scale |',
        '|---|---:|---:|---:|---:|---:|']
    for fold_record in result['folds']:
        calibration = fold_record.get('calibration')
        if calibration:
            lines.append(f'| {fold_record["origin_period"]} | {calibration["inner_origin_count"]} | {calibration["inner_case_count"]} | '
                f'{calibration["informative_case_count"]} | {calibration["zero_endpoint_case_count"]} | {calibration["learned_scale"]} |')
    lines += ['', '## Limitations', ''] + ['- ' + item for item in result['limitations']]
    lines += ['', 'Method basis: [MAE and median forecasts](https://otexts.com/fpp3/accuracy.html); '
        '[WAPE definition and changing-denominator limitations](https://robjhyndman.com/hyndsight/wape.html). '
        'Windows, weights, seasonal blend and bounded scalar are predetermined project research choices.', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--comparison', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--prepare', action='store_true')
    args = parser.parse_args()
    data, comparison, receipt = evidence.load_sources(args.input, args.comparison)
    record = registration(data, comparison, receipt)
    path = args.output / 'protocol.json'
    if args.prepare:
        evidence.require(not args.output.exists() or not any(args.output.iterdir()), 'Experiment directory already exists; use a new directory')
        args.output.mkdir(parents=True, exist_ok=True)
        record['registered_at'] = datetime.now(timezone.utc).isoformat()
        with path.open('xb') as handle:
            handle.write(evidence.encode(record))
        print(evidence.encode(dict(status='registered_not_evaluated', experiment_id=record['experiment_id'], output=str(path))).decode().strip())
        return
    registered = evidence.read_json(path.read_bytes())
    evidence.require({key: registered.get(key) for key in ('identity', 'experiment_id')} == record
        and set(registered) == {'identity', 'experiment_id', 'registered_at'}, 'Sources, code, packages or protocol changed since registration')
    timestamp = datetime.fromisoformat(registered['registered_at'])
    evidence.require(timestamp.tzinfo is not None and timestamp.utcoffset() == timedelta(0), 'Registration time must be UTC')
    evidence.require({p.name for p in args.output.iterdir()} == {'protocol.json'}, 'Evaluation already exists or output contains unrelated files')
    result = evaluate(data, comparison, record)
    result['registered_at'] = registered['registered_at']
    result['generated_on_manila'] = datetime.fromisoformat(result['evaluation_finished_at']).astimezone(evidence.MANILA).date().isoformat()
    result['execution_command'] = [sys.executable, '-m', 'services.analytics_service.predictive.robust_error_experiment'] + sys.argv[1:]
    output = args.output / result['run_id']
    output.mkdir(exist_ok=False)
    artifacts = {'run.json': result, 'input-manifest.json': result['manifest'], 'predictions.json': result['predictions'],
        'baseline-predictions.json': result['baseline_predictions'], 'evaluations.json': result['evaluations'],
        'baseline-evaluations.json': result['baseline_evaluations'], 'folds.json': result['folds'],
        'model-cards.json': result['model_cards'], 'warnings.json': result['warnings'],
        'development-freeze.json': result['development_freeze']}
    hashes = {'../protocol.json': evidence.raw_hash(path.read_bytes())}
    for name, value in artifacts.items():
        raw = evidence.encode(value)
        with (output / name).open('xb') as handle:
            handle.write(raw)
        hashes[name] = evidence.raw_hash(raw)
    raw_report = report(result).encode('utf-8')
    with (output / 'RESULTS.md').open('xb') as handle:
        handle.write(raw_report)
    hashes['RESULTS.md'] = evidence.raw_hash(raw_report)
    (output / 'artifact-hashes.json').write_bytes(evidence.encode(hashes))
    print(evidence.encode(dict(status=result['status'], run_id=result['run_id'], output=str(output),
        best_new_complete_recipe=result['development_freeze']['best_new_complete_recipe'],
        criteria_selected_model=result['development_freeze']['criteria_selected_model'],
        original_selection=result['original_selection']['model_id'], publication_approved=False)).decode().strip())


if __name__ == '__main__':
    main()
