"""Prepare a source-bound review draft. Never establishes completeness or approval."""
import argparse
import hashlib
import json
from pathlib import Path


def prepare(path, output):
    raw = path.read_bytes()
    checksum = hashlib.sha256(raw).hexdigest()
    if checksum != path.with_suffix('.sha256').read_text().strip():
        raise ValueError('Frozen input checksum mismatch')
    data = json.loads(raw)
    manifest = data['manifest']
    draft = dict(dataset_id=manifest['dataset_id'], fact_delta_version=manifest['fact_delta_version'],
                 descriptive_receipt_sha256=manifest['source_checksum'], reviewer='', reviewed_at='',
                 evidence_reference='', training_approved=False, publication_approved=False,
                 periods={r['period']: dict(period_closed=False, coverage_status='unknown', confirmed_zero_activity=False)
                          for r in data['rows']})
    output.mkdir(parents=True, exist_ok=True)
    target = output / 'coverage-review.draft.json'
    if target.exists():
        raise FileExistsError('Preserve existing review; choose a new output directory')
    target.write_text(json.dumps(draft, indent=2) + '\n', encoding='utf-8')
    lines = ['# Monthly reporting acceptance review', '',
             'This is an unsigned decision draft. Observed revenue is not proof of complete submissions.', '',
             f"Fact version: {manifest['fact_delta_version']}; input SHA-256: `{checksum}`.", '',
             'Review January 2020–December 2025 for the initial candidate. Earlier months remain visible for profiling.',
             'For each period, use source submission/ledger evidence to decide complete, partial or unknown.',
             'Record reviewer, review date and evidence reference. Training acceptance does not approve model publication.', '',
             '| Month | Recorded net sales (PHP) | Source records | Current value status |', '|---|---:|---:|---|']
    for row in data['rows']:
        value = row.get('target_value_decimal')
        lines.append(f"| {row['period']} | {value if value is not None else 'Unavailable'} | {row.get('source_count', 0)} | {row['value_status']} |")
    (output / 'REVIEW.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return target


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    print(prepare(args.input, args.output))
