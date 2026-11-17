"""Freeze before scoring; one registered retrospective attempt, no estimator fits."""
from datetime import datetime, timezone
from pathlib import Path
import argparse
import hashlib
import json
import platform
import numpy as np
from services.analytics_service import rolling_accuracy as ra

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).parent
CONTROL = ROOT / 'outputs/model_accuracy_run_20261106'
FILES = [OUT / name for name in ('PREREGISTRATION.md', 'inputs.json', 'prepare_inputs.py', 'run.py', 'verify.py')]
FILES += [ROOT / 'services/analytics_service/rolling_accuracy.py', CONTROL / 'results.json', CONTROL / 'horizon_results.json']
FILES += [ROOT / 'outputs/local_data_model_validation_20261105/source-area.json',
          ROOT / 'outputs/analytical_improvement_plan_20261106/signal_profile_gaps.json']


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def freeze():
    manifest = {'registered_at': datetime.now(timezone.utc).isoformat(), 'timezone': 'Asia/Manila',
                'experiment_id': 'PD0-PD2-itemized-stable-totals-v1',
                'python': platform.python_version(), 'numpy': np.__version__,
                'new_candidate_recipes': 1, 'candidate_cells': 4, 'fits_allowed': 0,
                'files': {str(path.relative_to(ROOT)): digest(path) for path in FILES}}
    with (OUT / 'registration.json').open('x', encoding='utf-8') as handle:
        json.dump(manifest, handle, indent=2)
    with (OUT / 'registration.sha256').open('x', encoding='utf-8') as handle:
        handle.write(digest(OUT / 'registration.json') + '\n')
    print('Registration frozen before scoring:', digest(OUT / 'registration.json'))


def check_registration():
    manifest = json.loads((OUT / 'registration.json').read_text(encoding='utf-8'))
    if digest(OUT / 'registration.json') != (OUT / 'registration.sha256').read_text(encoding='utf-8').strip():
        raise ValueError('Registration manifest changed after freeze')
    if set(manifest['files']) != {str(path.relative_to(ROOT)) for path in FILES}:
        raise ValueError('Incomplete frozen file set')
    for relative, expected in manifest['files'].items():
        if digest(ROOT / relative) != expected:
            raise ValueError('Frozen input/implementation changed: ' + relative)
    return digest(OUT / 'registration.json')


def run():
    registration = check_registration()
    if any((OUT / name).exists() for name in ('results.json', 'cases.json', 'attempt.json')):
        raise ValueError('Registered attempt already exists; no overwrite or retuning')
    data = json.loads((OUT / 'inputs.json').read_text(encoding='utf-8'))
    previous = json.loads((CONTROL / 'results.json').read_text(encoding='utf-8'))
    horizons = json.loads((CONTROL / 'horizon_results.json').read_text(encoding='utf-8'))
    pd0, pd2, case_ledger = {}, {}, {}
    for name, series in data['series'].items():
        for lead in (1, 3, 6):
            rows = ra.measurement_cases(series, lead)
            pd0[f'{name}_point_{lead}'] = ra.measurement_metrics(rows, 'mean_6')
        for h in (3, 6, 12):
            rows = ra.measurement_cases(series, h, 'total')
            pd0[f'{name}_total_{h}'] = ra.measurement_metrics(rows, 'trailing_sum')
    old = previous['series']['company']['leads']['1']['models']['mean_6']['wape'] * 100
    if abs(pd0['company_point_1']['wape_percent'] - old) > 1e-8:
        raise ValueError('PD0 company control mismatch')
    for name in ('BATANGAS', 'QUEZON'):
        for h in (6, 12):
            key = f'{name}_total_{h}'
            control = horizons[f'{name}_h{h}']
            metric = pd0[key]
            if metric['n'] != control['cases'] or abs(metric['wape_percent'] - control['trailing_sum']['wape'] * 100) > 1e-8:
                raise ValueError('PD0 horizon control mismatch: ' + key)
    # Controls must pass before evaluating the one new candidate recipe.
    attempt = {'registration_sha256': registration, 'started_at': datetime.now(timezone.utc).isoformat(),
               'status': 'started', 'new_recipes': 1, 'candidate_cells': 4, 'fitted_models': 0}
    with (OUT / 'attempt.json').open('x', encoding='utf-8') as handle:
        json.dump(attempt, handle, indent=2)
    for name in ('BATANGAS', 'QUEZON'):
        for h in (6, 12):
            key = f'{name}_total_{h}'
            cases = ra.measurement_cases(data['series'][name], h, 'total', include_growth=True)
            pd2[key] = ra.measurement_comparison(cases)
            case_ledger[key] = cases
    result = {'registration_sha256': registration, 'evidence_class': 'retrospective development only; no untouched test',
              'pd0': pd0, 'pd2': pd2, 'inherited_target_sensitivity': data['inherited_target_sensitivity'],
              'attempt_ledger': {'new_recipes': 1, 'candidate_cells': 4, 'fitted_models': 0,
                                 'historical_scope': 'Known studies linked in README; complete historical trial count not claimed'},
              'publication_approved': False, 'activation_allowed': False}
    with (OUT / 'cases.json').open('x', encoding='utf-8') as handle:
        json.dump(case_ledger, handle, indent=2, allow_nan=False)
    with (OUT / 'results.json').open('x', encoding='utf-8') as handle:
        json.dump(result, handle, indent=2, allow_nan=False)
    attempt.update(status='completed', results_sha256=digest(OUT / 'results.json'))
    (OUT / 'attempt.json').write_text(json.dumps(attempt, indent=2), encoding='utf-8')
    print(json.dumps({key: {'wape': row['candidate_metrics']['wape_percent'], 'bias': row['candidate_metrics']['normalized_bias_percent'],
                            'fva_pp': row['fva_pp'], 'retrospective_rule_pass': row['retrospective_rule_pass']} for key, row in pd2.items()}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['freeze', 'check', 'run'])
    action = parser.parse_args().action
    {'freeze': freeze, 'check': check_registration, 'run': run}[action]()
