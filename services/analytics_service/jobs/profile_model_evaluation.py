"""Exclusive preregistration and bounded offline evaluation timing/parity report."""
import argparse
from datetime import datetime
import hashlib
import json
from pathlib import Path
import platform
import subprocess
from zoneinfo import ZoneInfo

from .. import model_evaluation_profile as profile

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'outputs/client_model_evidence_20261102'


def write_new(path, value):
    with path.open('x', encoding='utf-8') as handle:
        json.dump(value, handle, indent=2, allow_nan=False)
        handle.write('\n')


def now():
    return datetime.now(ZoneInfo('Asia/Manila')).isoformat()


def specification(repeats, batch_size):
    paths = [Path(__file__), Path(profile.__file__), Path(profile.unit.__file__),
             ROOT / 'services/tests/test_model_evaluation_profile.py',
             ROOT / 'outputs/wp11_unit_planning_pilot_20261030/inherited/unit-candidate.json']
    paths.extend(path for path in BASE.rglob('*') if path.is_file()
                 and path.suffix in ('.json', '.sha256') and not path.name.startswith('verification-attempt'))
    return dict(version=profile.VERSION, checked_paths={p.relative_to(ROOT).as_posix(): profile.sha(p) for p in sorted(set(paths))},
                environment=dict(python=platform.python_version(), implementation=platform.python_implementation(),
                                 platform=platform.platform(), processor=platform.processor()),
                git_head=subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
                dirty_scope='Existing untracked three model studies remain read-only;new profiling module/job/tests and models output only',
                repeats=repeats, batch_size=batch_size, quantiles='nearest rank ceil(n*p),p50/p95',
                parity='Exact canonical full JSON bytes for all50 predictions,10 metric groups,8 paired groups,flags and limitations;no tolerance',
                independent_metric_tolerances=dict(company_money_php=1e-6, company_percent=1e-10, abc=1e-12),
                measurement='Alternating pair order;3warmups;wall/CPU per evaluation in bounded batches;5 separate tracemalloc allocation peaks',
                optimization='One unit forecast-vector calculation per origin/lead;local reuse only;50calls→10;no persistent cache',
                acceptance='Exact parity,wall p50 and p95 both lower;else report no demonstrated optimization',
                no_accuracy_gain=True, no_runtime_integration=True, no_training=True, no_warehouse_call=True,
                client_inputs='Explicitly deferred under user steering;engineering uses retained registered data only')


def run(output, mode, *, repeats=21, batch_size=50):
    output = Path(output).resolve()
    spec = specification(repeats, batch_size)
    if mode == 'register':
        output.mkdir(parents=True, exist_ok=False)
        write_new(output / 'protocol.json', dict(specification=spec, registered_at=now()))
        write_new(output / 'protocol-hash.json', dict(sha256=profile.sha(output / 'protocol.json')))
        return dict(status='REGISTERED_BEFORE_PROFILE', protocol_sha256=profile.sha(output / 'protocol.json'))
    if mode != 'execute':
        raise ValueError('Expected register or execute')
    if (json.loads((output / 'protocol.json').read_bytes())['specification'] != spec
            or json.loads((output / 'protocol-hash.json').read_bytes())['sha256'] != profile.sha(output / 'protocol.json')):
        raise ValueError('Source/code/environment/protocol drift')
    if any((output / name).exists() for name in ('started.json', 'results.json', 'prior-evidence-check.json')):
        raise ValueError('Refusing existing or partial profile overwrite')
    write_new(output / 'started.json', dict(started_at=now(), protocol_sha256=profile.sha(output / 'protocol.json')))
    audit = profile.audit_prior_evidence(ROOT)
    write_new(output / 'prior-evidence-check.json', audit)
    source = json.loads((ROOT / 'outputs/wp11_unit_planning_pilot_20261030/inherited/unit-candidate.json').read_bytes())
    result = profile.benchmark_pair(source['research_window'], repeats=repeats, batch_size=batch_size)
    if specification(repeats, batch_size) != spec:
        raise ValueError('Read-only dependencies changed during profiling;retain partial evidence')
    result.update(protocol_sha256=profile.sha(output / 'protocol.json'),
                  source_sha256=profile.sha(ROOT / 'outputs/wp11_unit_planning_pilot_20261030/inherited/unit-candidate.json'),
                  executed_at=now(), prior_evidence_check_sha256=profile.sha(output / 'prior-evidence-check.json'))
    write_new(output / 'results.json', result)
    return dict(status='PROFILED_EXACT_PARITY', measured_improvement=result['measured_improvement'],
                summary=result['summary'], p50_speedup=result['observed_p50_speedup'],
                p95_speedup=result['observed_p95_speedup'], fresh_checks=audit['checks'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode', choices=('register', 'execute'), required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--repeats', type=int, default=21)
    parser.add_argument('--batch-size', type=int, default=50)
    args = parser.parse_args()
    print(json.dumps(run(args.output, args.mode, repeats=args.repeats, batch_size=args.batch_size)))


if __name__ == '__main__':
    main()
