"""One hash-bound PD3 attempt; call freeze, run, check in that order."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import platform
from services.analytics_service import volatility_intervals as vi

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
SOURCE = ROOT / 'outputs/local_data_model_validation_20261105/source-area.json'
OLD = ROOT / 'outputs/model_accuracy_run_20261106'
FILES = [OUT / n for n in ('PREREGISTRATION.md', 'run.py', 'verify.py')]
FILES += [ROOT / n for n in ('services/analytics_service/volatility_intervals.py',
                            'services/analytics_service/rolling_accuracy.py',
                            'services/tests/test_volatility_intervals.py')]
FILES += [SOURCE, OLD / 'results.json', OLD / 'intervals.json']


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(name, data):
    with (OUT / name).open('x', encoding='utf-8') as f:
        json.dump(data, f, indent=2, allow_nan=False)


def check():
    manifest = json.loads((OUT / 'registration.json').read_text())
    if digest(OUT / 'registration.json') != (OUT / 'registration.sha256').read_text().strip():
        raise ValueError('Changed registration')
    if set(manifest['files']) != {str(p.relative_to(ROOT)) for p in FILES}:
        raise ValueError('Incomplete frozen file set')
    for name, sha in manifest['files'].items():
        if digest(ROOT / name) != sha:
            raise ValueError('Changed frozen file: ' + name)
    return digest(OUT / 'registration.json')


def freeze():
    save('registration.json', {'experiment_id': 'PD3-recent-six-error-RMS-v1',
         'registered_at': datetime.now(timezone.utc).isoformat(), 'timezone': 'Asia/Manila',
         'python': platform.python_version(), 'recipes': 1, 'cells': 15, 'point_estimator_fits': 0,
         'files': {str(p.relative_to(ROOT)): digest(p) for p in FILES}})
    with (OUT / 'registration.sha256').open('x', encoding='utf-8') as f:
        f.write(digest(OUT / 'registration.json') + '\n')
    print('Frozen before scoring:', check())


def run():
    sha = check()
    if any((OUT / n).exists() for n in ('attempt.json', 'results.json', 'cases.json')):
        raise ValueError('Attempt exists; no rerun or overwrite')
    save('attempt.json', {'registration_sha256': sha, 'started_at': datetime.now(timezone.utc).isoformat(),
                         'recipes': 1, 'cells': 15, 'point_estimator_fits': 0})
    source = json.loads(SOURCE.read_text(encoding='utf-8'))
    series = vi.histories(source)
    controls = json.loads((OLD / 'intervals.json').read_text())['cells']
    refs = json.loads((OLD / 'results.json').read_text())['series']
    cells, ledger, prepared = {}, {}, {}
    for name, history in series.items():
        for lead in (1, 3, 6):
            key = f'{name}_L{lead}'
            ref = refs[name]['leads'][str(lead)]['reference']
            points = vi.point_cases(history, lead, ref)
            _, full = vi.intervals(points, include_candidate=False)
            baseline = vi.metrics(full, 'comparator')
            old = controls[key]['C_conformal_last24']
            for metric in ('cases', 'coverage', 'mean_relative_width'):
                if abs(baseline[metric] - old[metric]) > 1e-10:
                    raise ValueError('Historical comparator mismatch: ' + key + '/' + metric)
            prepared[key] = (ref, points, baseline)
    # Reconcile every historical comparator before any candidate scoring.
    for key, (ref, points, baseline) in prepared.items():
        rows, _ = vi.intervals(points)
        cell = {'reference': ref, 'point_cases': len(points),
                'nonpositive_prediction_cases': sum(r['prediction'] <= 0 for r in points),
                'warmup_or_ineligible_cases': len(points) - len(rows),
                'comparator_full': baseline}
        for method in ('candidate', 'comparator'):
            cell[method] = vi.metrics(rows, method)
            cell[method + '_pre2026'] = vi.metrics([r for r in rows if r['target'] < '2026-01'], method)
        cell['paired_difference_candidate_minus_comparator'] = {
            m: cell['candidate'][m] - cell['comparator'][m]
            for m in ('coverage', 'mean_width_php', 'mean_relative_width')
        } if rows else None
        cells[key], ledger[key] = cell, rows
    result = {'registration_sha256': sha, 'evidence_class': 'retrospective development only',
              'source': source['regional']['source'], 'history_months': {n: len(s) for n, s in series.items()},
              'cells': cells, 'summary': {m: vi.summary(cells, m) for m in ('candidate', 'comparator', 'candidate_pre2026', 'comparator_pre2026')},
              'activation_allowed': False, 'publication_approved': False}
    save('cases.json', ledger)
    save('results.json', result)
    save('completion.json', {'completed_at': datetime.now(timezone.utc).isoformat(),
                            'results_sha256': digest(OUT / 'results.json'), 'cases_sha256': digest(OUT / 'cases.json'),
                            'registration_sha256': sha})
    print(json.dumps(result['summary'], indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['freeze', 'run', 'check'])
    action = parser.parse_args().action
    if action == 'check':
        print('PASS frozen integrity:', check())
    else:
        globals()[action]()
