"""Run reviewed, explicitly scoped offline diagnostic cohorts from JSON input."""
import argparse
import hashlib
import json
from pathlib import Path
from ..diagnostic_drivers import price_volume_mix, residual_anomalies, lagged_associations
from ..regional_stl import month_id


def calendar_series(values):
    from datetime import datetime
    result = {}
    for period, value in values.items():
        parsed = datetime.strptime(period, '%Y-%m')
        if parsed.strftime('%Y-%m') != period:
            raise ValueError('Expected canonical YYYY-MM association keys')
        result[month_id(period)] = value
    return result


def run(source):
    for key in ('dataset_id', 'policy_version', 'population', 'periods'):
        if not source.get(key):
            raise ValueError('Missing diagnostic source binding: ' + key)
    cohorts = source.get('association_cohorts', [])
    associations = []
    for cohort in cohorts:
        if not all(cohort.get(k) for k in ('unit_scope', 'territory', 'external_source', 'evidence_label')):
            raise ValueError('Missing association cohort scope/provider/provenance')
        if cohort['evidence_label'] not in ('Observed', 'Proxy'):
            raise ValueError('Unsupported external provenance')
        associations.append(dict(cohort={k:v for k,v in cohort.items() if k not in ('demand','external')},
            results=lagged_associations(calendar_series(cohort['demand']), calendar_series(cohort['external']))))
    return dict(schema_version='diagnostic_drivers_v1', dataset_id=source['dataset_id'],
                policy_version=source['policy_version'], population=source['population'], periods=source['periods'],
                evidence_label='Derived', assumption_ids=['D1','D3','D4'],
                pvm=price_volume_mix(source.get('pvm_cohorts', [])),
                anomalies=[dict(series_id=s['series_id'], rows=residual_anomalies(s['rows']))
                           for s in source.get('residual_segments', [])],
                associations=associations, publication_approved=False,
                limitations=['Exploratory association is not causation.',
                             'DR drilldown requires separately bound Gold transaction evidence.',
                             'Offline analysis is never a dashboard fallback.'])


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
