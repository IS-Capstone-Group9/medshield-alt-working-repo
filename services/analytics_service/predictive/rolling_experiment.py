"""Separate development experiment: monthly refresh versus annual fixed origin."""
import argparse
import hashlib
import json
from pathlib import Path

from .contracts import digest, eligible, month, period, validate_input
from .engine import package_versions
from .metrics import compare, score
from .models import BENCHMARKS, CHALLENGERS, forecast


def protocol():
    return dict(version='1.0', training_start='2020-01', target_start='2023-01',
                target_end='2024-12', configurations=BENCHMARKS + CHALLENGERS,
                seed=20260927, schedules=['monthly_one_step', 'annual_fixed_origin'],
                rationale='Test monthly updates on the same development targets; no 2025 fitting or scoring.',
                status='exploratory_development_only', promotion=False,
                selection='Report complete models only; no automatic selection or publication.',
                limitations=['Protocol informed by previously inspected retrospective audit.',
                             'Revised snapshot lacks historical data-availability vintages.',
                             'Assumes the preceding month is available before issuing each forecast.',
                             'Schedule comparison pairs targets; origins and lead lengths differ.',
                             'Coverage is user-attested; no intervals or business acceptance inferred.'])


def evaluate(data, specification, predictor=forecast):
    if specification != protocol():
        raise ValueError('Protocol differs from frozen experiment definition')
    blockers = validate_input(data)
    if blockers:
        raise ValueError('; '.join(blockers))
    start, first, end = map(month, (specification['training_start'], specification['target_start'], specification['target_end']))
    rows = [r for r in data['rows'] if eligible(r) and start <= month(r['period']) <= end]
    if len({r['series_id'] for r in rows}) != 1:
        raise ValueError('Exactly one eligible company series is required')
    series = {month(r['period']): r['target_value'] for r in rows}
    if set(series) != set(range(start, end + 1)):
        raise ValueError('Incomplete eligible training/development coverage')
    series_id = rows[0]['series_id']
    points = []
    for config in specification['configurations']:
        for schedule in specification['schedules']:
            cache = {}
            for target in range(first, end + 1):
                origin = target - 1 if schedule == 'monthly_one_step' else month(period(target)[:4] + '-01') - 1
                lead = target - origin
                if origin not in cache:
                    # Enforce the cutoff before invoking an adapter, even if it filters internally.
                    training = {p: v for p, v in series.items() if p <= origin}
                    leads = [1] if schedule == 'monthly_one_step' else list(range(1, 13))
                    try:
                        cache[origin] = predictor(training, origin, leads, config, specification['seed'])
                    except (ImportError, ValueError, RuntimeError, ArithmeticError) as exc:
                        cache[origin] = ({}, f'{type(exc).__name__}: {exc}')
                predictions, reason = cache[origin]
                points.append(dict(series_id=series_id, target_name='net_sales', model_id=config['model_id'],
                                   schedule=schedule, origin_period=period(origin), target_period=period(target),
                                   lead_months=lead, actual=series[target], prediction=predictions.get(lead),
                                   missing_reason=reason))
    evaluations = {}
    for schedule in specification['schedules']:
        subset = [p for p in points if p['schedule'] == schedule]
        complete = [c['model_id'] for c in specification['configurations'] if sum(
            p['model_id'] == c['model_id'] and p['prediction'] is not None for p in subset) == end - first + 1]
        evaluations[schedule] = dict(complete_models=complete, comparisons=compare(subset, complete),
                                    by_year={model: {year: score([(p['actual'], p['prediction']) for p in subset
                                        if p['model_id'] == model and p['target_period'].startswith(year)])
                                        for year in ('2023', '2024')} for model in complete})
    return dict(status='exploratory_development_only', protocol=specification,
                manifest=data['manifest'], predictions=points, evaluations=evaluations,
                selection=None, publication_approved=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--prepare', action='store_true')
    args = parser.parse_args()
    raw = args.input.read_bytes()
    input_hash = hashlib.sha256(raw).hexdigest()
    if input_hash != args.input.with_suffix('.sha256').read_text().strip():
        raise ValueError('Frozen input hash mismatch')
    code_files = ['rolling_experiment.py', 'contracts.py', 'models.py', 'metrics.py', 'engine.py']
    identity = dict(protocol=protocol(), input_sha256=input_hash, packages=package_versions(),
                    code_sha256={name: hashlib.sha256(Path(__file__).with_name(name).read_bytes()).hexdigest()
                                 for name in code_files})
    registration = dict(identity=identity, experiment_id=digest(identity))
    registration_path = args.output / 'protocol.json'
    if args.prepare:
        args.output.mkdir(parents=True, exist_ok=True)
        with registration_path.open('x', encoding='utf-8') as handle:
            json.dump(registration, handle, indent=2, allow_nan=False)
        print(f'Registered {registration["experiment_id"]}; evaluation not run')
        return
    if json.loads(registration_path.read_text(encoding='utf-8')) != registration:
        raise ValueError('Input, code, environment or protocol changed since registration')
    result = evaluate(json.loads(raw), identity['protocol'])
    result['experiment_id'] = registration['experiment_id']
    result_path = args.output / 'results.json'
    with result_path.open('x', encoding='utf-8') as handle:
        json.dump(result, handle, indent=2, allow_nan=False)
    lines = ['# Monthly refresh development experiment', '',
             'Targets: January 2023–December 2024 (24 shared target months). Training begins January 2020.',
             'Exploratory revised-snapshot evaluation; no 2025 inputs/scores, selection, intervals or publication.',
             'Annual fixed forecasts use the preceding December; monthly forecasts use the preceding month.',
             'Cross-schedule comparison matches targets, not identical origins/leads. Within-schedule models use exact common keys.', '',
             '| Model | Monthly WAPE | Annual fixed WAPE | Monthly MAE PHP | Monthly bias % |',
             '|---|---:|---:|---:|---:|']
    for config in identity['protocol']['configurations']:
        name = config['model_id']
        monthly = result['evaluations']['monthly_one_step']['comparisons'].get(name)
        annual = result['evaluations']['annual_fixed_origin']['comparisons'].get(name)
        if monthly and annual:
            a, b = monthly['common'], annual['common']
            def fmt(v):
                return 'undefined' if v is None else f'{v:,.2f}'
            lines.append(f"| {name} | {fmt(a['wape'])}% | {fmt(b['wape'])}% | {fmt(a['mae'])} | {fmt(a['normalized_bias'])}% |")
        else:
            lines.append(f'| {name} | incomplete | incomplete | — | — |')
    lines += ['', '## Limits', ''] + ['- ' + item for item in identity['protocol']['limitations']]
    (args.output / 'RESULTS.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    artifacts = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in
                 (registration_path, result_path, args.output / 'RESULTS.md')}
    (args.output / 'artifact-hashes.json').write_text(json.dumps(artifacts, indent=2), encoding='utf-8')
    print(json.dumps(dict(experiment_id=result['experiment_id'], points=len(result['predictions']),
                          complete_models={k: len(v['complete_models']) for k, v in result['evaluations'].items()})))


if __name__ == '__main__':
    main()
