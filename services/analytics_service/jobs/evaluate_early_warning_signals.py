"""Evaluate origin-aligned historical events without claiming live official alerts."""
import argparse
import hashlib
import json
from pathlib import Path
from ..early_warning import evaluate_events, official_bulletin_status


def run(source):
    for key in ('dataset_id', 'policy_version', 'signal_source', 'unit_scope', 'territory'):
        if not source.get(key):
            raise ValueError('Missing historical signal binding: ' + key)
    if source.get('external_evidence_label') not in ('Observed', 'Proxy'):
        raise ValueError('External provider provenance is required')
    return dict(schema_version='historical_early_warning_v1',
                source={k:v for k,v in source.items() if k != 'rows'},
                evidence_label='Derived', assumption_ids=['D1','D3','D4'],
                results=evaluate_events(source['rows']), official_bulletin=official_bulletin_status(),
                external_join_approved=False, publication_approved=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    raw = args.input.read_bytes()
    result = run(json.loads(raw))
    result['input_sha256'] = hashlib.sha256(raw).hexdigest()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('x', encoding='utf-8') as handle:
        handle.write(json.dumps(result, indent=2, allow_nan=False)+'\n')


if __name__ == '__main__':
    main()
