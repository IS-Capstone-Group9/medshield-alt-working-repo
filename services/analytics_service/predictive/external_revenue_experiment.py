"""Registered Quezon retrospective revenue comparison; offline, no publication."""
import argparse
import csv
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import platform

import numpy as np

from .contracts import month, period
from .metrics import score

MODELS = ('last_value', 'sales_calendar_baseline', 'combined_tayabas_primary',
          'combined_alabat_sensitivity')
VALUES = ('target_net_sales_php', 'prior_net_sales_php', 'prior_Dengue_cases',
          'prior_Tayabas_rainfall_mm', 'prior_Alabat_rainfall_mm')
PROTOCOL = {
    'version': 'quezon-external-revenue-v1',
    'target': 'Quezon All eligible recorded net sales PHP',
    'evaluation': ['2024-01', '2024-12'], 'lead_months': 1,
    'models': list(MODELS), 'training': 'expanding complete candidate cases ending by origin',
    'features': ['calendar_month_index_since_2018_01', 'annual_sine', 'annual_cosine',
                 'prior_month_net_sales_PHP_millions'],
    'added_features': ['prior_month_Dengue_cases_per_100', 'prior_month_named_station_mm_per_100'],
    'regression': 'SVD OLS, intercept, full rank, train-only population standardization',
    'missing': 'preserve calendar gaps; identical complete numerical cohort for every recipe',
    'failure': 'unavailable model/fold; no clipping, fallback, dropping or retuning',
    'selection': 'none; retain all scores and bias; no automatic promotion',
    'claim': 'inspected retrospective revised-record sensitivity, not issue-time or untouched evaluation',
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def save(path, value):
    with Path(path).open('x', encoding='utf-8') as stream:
        stream.write(json.dumps(value, indent=2, allow_nan=False) + '\n')


def stamp():
    return datetime.now(timezone.utc).isoformat()


def number(value):
    require(not isinstance(value, bool) and isinstance(value, (str, int, float)),
            'Numeric input must be a number or nonblank numeric string')
    require(not isinstance(value, str) or bool(value.strip()), 'Blank numeric input')
    value = float(value)
    require(math.isfinite(value), 'Nonfinite numerical input')
    return value


def validate_rows(rows):
    require(isinstance(rows, list) and bool(rows), 'Calendar rows required')
    index = {}
    for row in rows:
        target = month(row['target_month'])
        require(target not in index, 'Duplicate target month')
        require(row['origin_month'] == period(target - 1)
                and row['disease_month'] == row['origin_month']
                and row['weather_month'] == row['origin_month']
                and row['actual_lead_months'] == 1, 'Exact prior-calendar-month keys required')
        missing = [field for field in VALUES if row[field] is None]
        require(row['missing_fields'] == missing, 'Missing-field declaration mismatch')
        require(row['eligible_numerical_case'] is (not missing), 'Numerical eligibility mismatch')
        for field in VALUES:
            if row[field] is not None:
                value = number(row[field])
                if field not in VALUES[:2]:
                    require(value >= 0, 'Disease/rainfall cannot be negative')
                if field == 'prior_Dengue_cases':
                    require(value.is_integer(), 'Case count must be integral')
        index[target] = row
    ordered = sorted(index)
    require(ordered == list(range(ordered[0], ordered[-1] + 1)),
            'Retain missing calendar rows explicitly')
    for target in ordered[1:]:
        previous = index[target - 1]['target_net_sales_php']
        prior = index[target]['prior_net_sales_php']
        require((previous is None and prior is None) or
                (previous is not None and prior is not None and
                 abs(number(previous) - number(prior)) <= .000001),
                'Prior sales differ from preceding recorded target')
    return [index[key] for key in ordered]


def external_blockers(rows, policy, preflight):
    """Read evidence status; never create or infer an approval from an execution request."""
    problems = []
    if (policy.get('owner_decision') != 'accepted' or not policy.get('owner_identity')
            or not policy.get('decision_evidence')):
        problems.append('Attributable source/methodology decision is absent')
    if (policy.get('model_execution_ready') is not True
            or policy.get('warehouse_external_joins_accepted') is not True
            or preflight.get('model_execution_ready') is not True):
        problems.append('Source-bound accepted external contracts/preflight are absent')
    governance = preflight.get('current_governance', {})
    if (governance.get('owner_decision') != 'accepted'
            or governance.get('station_status') != 'approved'
            or governance.get('disease_external_mapping') != 'approved'
            or governance.get('warehouse_join_ready_months', 0) < len(rows)):
        problems.append('Versioned station/disease/geographic eligibility is not accepted')
    if any(row.get('accepted_model_input') is not True
           or row.get('disease_mapping_accepted') is not True
           or row.get('station_mapping_status') != 'approved'
           or row.get('external_geography_status') != 'approved' for row in rows):
        problems.append('Candidate row eligibility remains unaccepted')
    if (policy.get('weather', {}).get('primary_station') != 'Tayabas'
            or policy.get('weather', {}).get('sensitivity_station') != 'Alabat'
            or policy.get('weather', {}).get('one_station_per_model_and_source_policy') is not True):
        problems.append('Distinct registered Tayabas/Alabat policies are required')
    return problems


def features(row, model):
    require(model in MODELS[1:], 'Unknown regression recipe')
    target = month(row['target_month'])
    values = [target - month('2018-01'), math.sin(2 * math.pi * (target % 12) / 12),
              math.cos(2 * math.pi * (target % 12) / 12),
              number(row['prior_net_sales_php']) / 1_000_000]
    if model != 'sales_calendar_baseline':
        station = 'Tayabas' if model == MODELS[2] else 'Alabat'
        values += [number(row['prior_Dengue_cases']) / 100,
                   number(row[f'prior_{station}_rainfall_mm']) / 100]
    return values


def validate_policy(policy):
    comparison, temporal = policy['comparison'], policy['temporal']
    require(comparison['models'] == list(MODELS), 'Registered model list changed')
    require(comparison['baseline_features'] == ['intercept', 'calendar_month_index_since_2018_01',
            'annual_sine', 'annual_cosine', 'prior_month_net_sales'], 'Baseline recipe mismatch')
    require(comparison['combined_added_features'] == ['prior_month_Dengue_cases_per_100',
            'prior_month_one_station_rainfall_mm_per_100'], 'External recipe mismatch')
    require(comparison['signed_predictions_preserved'] is True
            and comparison['lag_search'] is False and comparison['winner_selection'] is False,
            'Signed/no-search/no-selection protocol required')
    require(comparison['regression'].startswith('Ordinary least squares via SVD')
            and 'population-standard-deviation' in comparison['preprocessing'],
            'OLS/population-standardization recipe required')
    require(temporal['evaluation_start'] == '2024-01' and temporal['evaluation_end'] == '2024-12'
            and temporal['actual_forecast_lead_months'] == 1
            and temporal['disease_calendar_lag_months'] == 1
            and temporal['rainfall_calendar_lag_months'] == 1,
            'Only the predeclared2024 one-month protocol is supported')


def fit_ols(training, target, model):
    require(len(training) >= 36, 'At least36 numerical training cases required')
    x = np.asarray([features(row, model) for row in training], dtype=float)
    y = np.asarray([number(row['target_net_sales_php']) / 1_000_000 for row in training])
    means, scales = x.mean(axis=0), x.std(axis=0, ddof=0)
    require(bool(np.all(scales > 1e-12)), 'Constant predictor; recipe unavailable')
    design = np.column_stack([np.ones(len(training)), (x - means) / scales])
    coefficients, _, rank, singular_values = np.linalg.lstsq(design, y, rcond=None)
    require(rank == design.shape[1], 'Rank-deficient training design; recipe unavailable')
    target_design = np.r_[1., (np.asarray(features(target, model)) - means) / scales]
    prediction = float(target_design @ coefficients) * 1_000_000
    require(math.isfinite(prediction), 'Nonfinite model prediction')
    return prediction, dict(training_means=means.tolist(), training_scales=scales.tolist(),
                            standardized_coefficients=coefficients.tolist(), rank=int(rank),
                            singular_values=singular_values.tolist())


def evaluate(rows, policy, preflight):
    rows = validate_rows(rows)
    validate_policy(policy)
    complete = [row for row in rows if row['eligible_numerical_case']]
    targets = [row for row in complete if '2024-01' <= row['target_month'] <= '2024-12']
    require([row['target_month'] for row in targets] ==
            [f'2024-{i:02d}' for i in range(1, 13)], 'Exactly12 common2024 targets required')
    blockers = external_blockers(complete, policy, preflight)
    points, traces = [], []
    for target in targets:
        training = [row for row in complete if row['target_month'] <= target['origin_month']]
        require(len(training) >= 36, 'Insufficient initial training')
        for model in MODELS:
            prediction, trace, reason = None, None, None
            status = 'scored'
            if model in MODELS[2:] and blockers:
                status, reason = 'blocked', '; '.join(blockers)
            else:
                try:
                    if model == 'last_value':
                        prediction = number(target['prior_net_sales_php'])
                    else:
                        prediction, trace = fit_ols(training, target, model)
                except (ValueError, np.linalg.LinAlgError) as error:
                    status, reason = 'unavailable', str(error)
            points.append(dict(model_id=model, origin_month=target['origin_month'],
                               target_month=target['target_month'], lead_months=1,
                               actual_php=number(target['target_net_sales_php']),
                               prediction_php=prediction, status=status, reason=reason,
                               training_cases=len(training), training_end=training[-1]['target_month']))
            if trace is not None:
                traces.append(dict(model_id=model, target_month=target['target_month'],
                                   training_keys=[row['target_month'] for row in training], **trace))
    metrics = {}
    for model in MODELS:
        model_points = [row for row in points if row['model_id'] == model]
        pairs = [(row['actual_php'], row['prediction_php']) for row in model_points
                 if row['prediction_php'] is not None]
        metrics[model] = (dict(status='scored', **score(pairs)) if len(pairs) == 12 else
                          dict(status='blocked' if any(p['status'] == 'blocked' for p in model_points)
                               else 'unavailable', n=len(pairs), mae=None, rmse=None, wape=None,
                               bias=None, normalized_bias=None,
                               reason='A complete twelve-case same-model score is unavailable'))
    comparisons = []
    for challenger in MODELS[1:]:
        for baseline in MODELS[:2]:
            if challenger == baseline:
                continue
            a, b = metrics[challenger], metrics[baseline]
            comparable = a['status'] == b['status'] == 'scored'
            comparisons.append(dict(challenger=challenger, baseline=baseline,
                status='scored' if comparable else ('blocked' if 'blocked' in (a['status'], b['status'])
                                                    else 'unavailable'),
                mae_difference_php=a['mae'] - b['mae'] if comparable else None,
                wape_difference_percentage_points=a['wape'] - b['wape'] if comparable else None))
    all_scored = all(value['status'] == 'scored' for value in metrics.values())
    external_fits = sum(trace['model_id'] in MODELS[2:] for trace in traces)
    return dict(status='partial_external_blocked' if blockers else
                ('complete_retrospective_comparison' if all_scored else 'partial_unavailable'),
                target=PROTOCOL['target'], protocol=PROTOCOL, external_blockers=blockers,
                baseline_cohort_status='numerically complete candidate comparison months; not accepted external inputs',
                metrics=metrics, comparisons=comparisons, points=points, fits=traces,
                external_models_fitted=external_fits > 0, external_fits_completed=external_fits,
                approved_for_publication=False)


def runtime():
    return dict(python=platform.python_version(), numpy=np.__version__)


def registered_paths(root, paths):
    root = Path(root).resolve()
    for relative, expected in paths.items():
        path = (root / relative).resolve()
        require(path.is_relative_to(root) and path.is_file(), 'Invalid registered source path')
        require(sha(path) == expected, 'Registered source/code drift: ' + relative)


def register(root, candidate, policy_path, preflight_path, output):
    root = Path(root).resolve()
    policy, preflight = load(policy_path), load(preflight_path)
    validate_policy(policy)
    # Check inherited identities before adding current artifact hashes; otherwise
    # a changed policy path could overwrite its own earlier expected digest.
    registered_paths(root, preflight['source_sha256'])
    paths = dict(preflight['source_sha256'])
    for path in (candidate, policy_path, preflight_path, Path(__file__),
                 Path(__file__).with_name('contracts.py'), Path(__file__).with_name('metrics.py')):
        path = Path(path).resolve()
        require(path.is_relative_to(root), 'Artifact outside repository')
        paths[path.relative_to(root).as_posix()] = sha(path)
    registered_paths(root, paths)
    rows = validate_rows(load(candidate))
    require(len(rows) == 84 and rows[0]['target_month'] == '2018-01'
            and rows[-1]['target_month'] == '2024-12', 'Expected84 preserved calendar rows')
    complete = [row for row in rows if row['eligible_numerical_case']]
    require(len(preflight['folds']) == preflight['evaluation_cases'] == 12,
            'Twelve preflight folds required')
    for index, fold in enumerate(preflight['folds']):
        target = f'2024-{index + 1:02d}'
        keys = [r['target_month'] for r in complete if r['target_month'] < target]
        require(fold['target_month'] == target and fold['origin_month'] == period(month(target) - 1)
                and fold['training_keys'] == keys and fold['training_cases'] == len(keys),
                'Preflight training/calendar mismatch')
    require(preflight['initial_training_cases'] == preflight['folds'][0]['training_cases']
            == policy['cohort']['expected_initial_training'], 'Initial cohort size mismatch')
    recipe_fields = ('baseline_features', 'combined_added_features', 'regression', 'preprocessing',
                     'constant_feature_policy', 'signed_predictions_preserved', 'lag_search',
                     'winner_selection')
    registration = dict(registered_at_utc=stamp(), protocol=PROTOCOL, runtime=runtime(), paths=paths,
                        candidate=Path(candidate).resolve().relative_to(root).as_posix(),
                        policy=Path(policy_path).resolve().relative_to(root).as_posix(),
                        preflight=Path(preflight_path).resolve().relative_to(root).as_posix(),
                        inherited_recipe={key: policy['comparison'][key] for key in recipe_fields},
                        source_release=preflight['source_release'],
                        external_blockers=external_blockers([r for r in rows if r['eligible_numerical_case']],
                                                          policy, preflight))
    save(output, registration)
    return registration


def run(root, registration_path, output):
    root, output = Path(root).resolve(), Path(output)
    registration = load(registration_path)
    require(registration['protocol'] == PROTOCOL, 'Protocol drift')
    require(registration['runtime'] == runtime(), 'Runtime drift')
    registered_paths(root, registration['paths'])
    require(all(registration[key] in registration['paths'] for key in ('candidate', 'policy', 'preflight')),
            'Unregistered candidate/policy/preflight reference')
    require(not output.exists(), 'Run output exists; preserve delivered evidence')
    output.mkdir(parents=True)
    save(output / 'started.json', dict(started_at_utc=stamp(), registration_sha256=sha(registration_path)))
    result = evaluate(load(root / registration['candidate']), load(root / registration['policy']),
                      load(root / registration['preflight']))
    result.update(completed_at_utc=stamp(), registration_sha256=sha(registration_path),
                  source_release=registration['source_release'])
    save(output / 'results.json', result)
    with (output / 'predictions.csv').open('x', encoding='utf-8', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(result['points'][0]))
        writer.writeheader()
        writer.writerows(result['points'])
    save(output / 'artifacts.json', {name: sha(output / name)
                                    for name in ('started.json', 'results.json', 'predictions.csv')})
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path.cwd())
    commands = parser.add_subparsers(dest='command', required=True)
    registration = commands.add_parser('register')
    for name in ('candidate', 'policy', 'preflight', 'output'):
        registration.add_argument('--' + name, type=Path, required=True)
    execution = commands.add_parser('run')
    execution.add_argument('--registration', type=Path, required=True)
    execution.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.command == 'register':
        result = register(args.root, args.candidate, args.policy, args.preflight, args.output)
        print(json.dumps({'registered': True, 'external_blockers': result['external_blockers']}))
    else:
        result = run(args.root, args.registration, args.output)
        print(json.dumps({'status': result['status'], 'metrics': result['metrics']}, allow_nan=False))


if __name__ == '__main__':
    main()
