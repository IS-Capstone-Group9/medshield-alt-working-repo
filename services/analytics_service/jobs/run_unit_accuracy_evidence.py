"""Create-only registration/execution of a fixed unit accuracy experiment."""
import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import platform

from ..unit_accuracy_evidence import BASELINES, CANDIDATE, evaluate

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'outputs/wp11_unit_planning_pilot_20261030/inherited/unit-candidate.json'
SOURCE_HASH = '0f5c5d18d0c7078ce729a2dba9b1919744d950420949f6586561c3b1205b6936'
MODULE = ROOT / 'services/analytics_service/unit_accuracy_evidence.py'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_new(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x', encoding='utf-8') as stream:
        json.dump(value, stream, indent=2, allow_nan=False)
        stream.write('\n')


def register(directory):
    if sha(SOURCE) != SOURCE_HASH:
        raise ValueError('Changed frozen unit source')
    write_new(directory / 'protocol.json', dict(schema='unit_accuracy_evidence_v1',
        registered_at=datetime.now(timezone(timedelta(hours=8))).isoformat(),
        hypothesis='A fixed median of four origin-local baseline forecasts may reduce error sensitivity to a single extreme method.',
        candidate=CANDIDATE, baselines=list(BASELINES),
        recipe='Arithmetic midpoint of the middle two of last/mean3/mean6/target-month-minus12; no learned weights, clipping or rounding.',
        window=['2025-04', '2026-09'], minimum_training_months=12, calendar_leads=[1, 3],
        expected_cases_by_lead={'1': 6, '3': 4}, source_path=SOURCE.relative_to(ROOT).as_posix(),
        source_sha256=SOURCE_HASH, code_sha256=sha(MODULE), runner_sha256=sha(Path(__file__)),
        metrics=['MAE_ampoules', 'RMSE_ampoules', 'WAPE_percent', 'normalized_bias_percent'],
        comparison='All four same-case baselines by lead; strongest observed baseline is a retrospective reference, not a selected model.',
        selection_policy='No promotion or automatic winner; too few previously inspected cases for operational selection.',
        numerical_tolerance='Independent decimal arithmetic: relative 1e-24 or absolute 1e-24.',
        future_issue=False, model_publication_approved=False))
    write_new(directory / 'registration.json', dict(protocol_sha256=sha(directory / 'protocol.json'),
        code_sha256=sha(MODULE), source_sha256=SOURCE_HASH,
        timestamp_boundary='Local registration; not independent external custody or an untouched-data claim.'))


def execute(directory):
    protocol_path = directory / 'protocol.json'
    protocol = json.loads(protocol_path.read_text(encoding='utf-8'))
    registration = json.loads((directory / 'registration.json').read_text(encoding='utf-8'))
    if (sha(protocol_path) != registration['protocol_sha256']
            or sha(SOURCE) != protocol['source_sha256'] or protocol['source_sha256'] != SOURCE_HASH
            or sha(MODULE) != protocol['code_sha256'] or sha(Path(__file__)) != protocol['runner_sha256']):
        raise ValueError('Input or registered code drift; do not overwrite the protocol')
    candidate = json.loads(SOURCE.read_bytes())
    if (candidate['exact_labels'] != ['BUPIRIGHT', 'BUPIRIGHT 5MG/ML 0.5% IN 8% 4ML']
            or candidate['raw_area'] != 'HOSPITAL' or candidate['quantity_multiplier'] != 1
            or candidate['model_publication_approved'] is not False):
        raise ValueError('Changed unit/identity/approval scope')
    result = evaluate(candidate['research_window'])
    result.update(protocol_sha256=sha(protocol_path), source_sha256=SOURCE_HASH,
                  dataset_id=candidate['dataset_id'], code_sha256=sha(MODULE),
                  executed_at=datetime.now(timezone(timedelta(hours=8))).isoformat(), python=platform.python_version())
    for lead, count in [(1, 6), (3, 4)]:
        if [r['cases'] for r in result['metrics'] if r['lead'] == lead] != [count] * 5:
            raise ValueError('Changed evaluation cohort')
    write_new(directory / 'results.json', result)
    print(json.dumps(dict(status=result['status'], predictions=len(result['points']), groups=len(result['metrics']),
                          selected_method=None, output=str(directory / 'results.json'))))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['register', 'execute'])
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    (register if args.action == 'register' else execute)(args.output)


if __name__ == '__main__':
    main()
