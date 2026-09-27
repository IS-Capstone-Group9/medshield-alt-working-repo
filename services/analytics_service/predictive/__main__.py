"""python -m services.analytics_service.predictive --input frozen.json --output DIR"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

from .engine import run
from .release import release_draft


def code_identity():
    root = Path(__file__).resolve().parents[3]
    try:
        head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
        diff = subprocess.check_output(['git', 'diff', '--binary', 'HEAD'], cwd=root)
    except (OSError, subprocess.CalledProcessError):
        head, diff = 'unavailable', b''
    # Include untracked/new package code, which git diff alone omits.
    source = b''.join(p.name.encode() + p.read_bytes() for p in sorted(Path(__file__).parent.glob('*.py')))
    return dict(git_head=head, dirty_diff_sha256=hashlib.sha256(diff).hexdigest(),
                predictive_source_sha256=hashlib.sha256(source).hexdigest())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--schedule', type=Path)
    parser.add_argument('--benchmarks-only', action='store_true')
    args = parser.parse_args()
    raw_input = args.input.read_bytes()
    expected_hash = args.input.with_suffix('.sha256').read_text(encoding='utf-8').strip()
    if hashlib.sha256(raw_input).hexdigest() != expected_hash:
        raise ValueError('Frozen input checksum mismatch')
    data = json.loads(raw_input.decode('utf-8-sig'))
    schedule = json.loads(args.schedule.read_text(encoding='utf-8-sig')) if args.schedule else None
    result = run(data, schedule=schedule, include_challengers=not args.benchmarks_only, code_identity=code_identity())
    output = args.output / result['run_id']
    output.mkdir(parents=True, exist_ok=True)
    artifacts = {'run.json': result, 'input-manifest.json': result['manifest'], 'folds.json': result['folds'],
                 'predictions.json': result['predictions'], 'evaluations.json': result['evaluations'],
                 'model-cards.json': result['model_cards'],
                 'coverage.json': {'rows': len(data['rows']), 'blockers': result['blockers'],
                                   'periods': [{k: r.get(k) for k in ('series_id', 'period', 'coverage_status', 'value_status', 'eligible_for_evaluation', 'blockers')} for r in data['rows']]}}
    if result['status'] == 'evaluated_unpublished' and result.get('selection', {}).get('model_id'):
        try:
            artifacts['release-draft.json'] = release_draft(data, result)
        except ValueError as exc:
            artifacts['release-blocker.json'] = {'status': 'blocked', 'reason': str(exc)}
    hashes = {}
    for filename, content in artifacts.items():
        raw = (json.dumps(content, indent=2, sort_keys=True, allow_nan=False) + '\n').encode()
        (output / filename).write_bytes(raw)
        hashes[filename] = hashlib.sha256(raw).hexdigest()
    (output / 'artifact-hashes.json').write_text(json.dumps(hashes, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': result['status'], 'run_id': result['run_id'], 'output': str(output), 'blockers': result['blockers']}))


if __name__ == '__main__':
    main()
