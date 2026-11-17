"""Register then execute the single company-PHP uncertainty evidence experiment."""
import argparse
import csv
from datetime import datetime
import hashlib
import json
from pathlib import Path
import platform
import time
from zoneinfo import ZoneInfo

from .. import company_accuracy_evidence as model
from ..predictive import contracts, metrics
from .run_stable_ets_review import validate_source

ROOT = Path(__file__).resolve().parents[3]
STAGES = ('development', 'retrospective_audit', 'inspected_extension')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_new(path, value):
    with path.open('x', encoding='utf-8') as handle:
        json.dump(value, handle, indent=2, ensure_ascii=False, allow_nan=False)
        handle.write('\n')


def specification(source, reference):
    protocol = json.loads(reference.read_bytes())['protocol']
    paths = [Path(__file__), Path(model.__file__), Path(contracts.__file__), Path(metrics.__file__),
             ROOT / 'services/analytics_service/jobs/run_stable_ets_review.py',
             ROOT / 'services/tests/test_company_accuracy_evidence.py']
    return dict(version=model.VERSION, source_sha256=sha(source), reference_sha256=sha(reference),
                inputs={p.relative_to(ROOT).as_posix(): sha(p) for p in (source, reference)},
                code_sha256={p.relative_to(ROOT).as_posix(): sha(p) for p in paths},
                python=platform.python_version(), target='signed_original_itemized_net_sales', unit='PHP',
                source_scope='contracts_excluded_not_complete_company_sales',
                origins={stage: protocol[stage + '_origins'] for stage in STAGES}, leads=[1],
                baseline_models=list(model.BASELINES), fixed_point_model='mean_6',
                interval_models=list(model.INTERVALS), window_completed_targets=24, nominal_level=.8,
                reference='symmetric rank ceil((n+1)*.8) of completed absolute mean6 errors',
                candidate='signed residual/mean(abs(prior6));ranks floor((n+1)*.1),ceil((n+1)*.9);rescale by current prior6',
                zero_scale='candidate unavailable;no epsilon,zero filling or clipping',
                selection='development only;>=5% lower mean interval score;coverage>=.8 and >=reference;complete cohort',
                metric='interval_score=upper-lower+10*outside_distance at nominal80%;inclusive endpoints',
                prior_work='Point mean/median/seasonal/ETS/ARIMA/GBDT/affine/occurrence/calibration recipes already inspected; no point retuning',
                reference_source='https://proceedings.mlr.press/v313/barber26a.html',
                guarantee='Empirical asymmetric scale interval;not a claim of conformal or time-series coverage guarantee',
                inspected_historical_outcomes=True, untouched_test=False,
                actual_historical_availability_vintages_verified=False, fresh_warehouse_query=False,
                publication_approved=False, operational_approval=False)


def run(source_path, reference_path, output, mode):
    source_path, reference_path, output = [p.resolve() for p in (source_path, reference_path, output)]
    spec = specification(source_path, reference_path)
    source, reference = [json.loads(path.read_bytes()) for path in (source_path, reference_path)]
    series = validate_source(source, reference, spec['source_sha256'])
    if mode == 'register':
        output.mkdir(parents=True, exist_ok=False)
        write_new(output / 'protocol.json', dict(specification=spec,
                  registered_at=datetime.now(ZoneInfo('Asia/Manila')).isoformat()))
        write_new(output / 'protocol-hash.json', dict(sha256=sha(output / 'protocol.json')))
        return dict(status='REGISTERED_BEFORE_NEW_INTERVAL_EXECUTION', protocol_sha256=sha(output / 'protocol.json'))
    if mode != 'execute':
        raise ValueError('Expected register or execute')
    if (json.loads((output / 'protocol.json').read_bytes())['specification'] != spec
            or json.loads((output / 'protocol-hash.json').read_bytes())['sha256'] != sha(output / 'protocol.json')):
        raise ValueError('Protocol/input/code/environment drift')
    if any((output / name).exists() for name in ('execution-start.json', 'development.json', 'selection.json', 'results.json')):
        raise ValueError('Refusing executed or partial study overwrite')
    started = time.monotonic()
    write_new(output / 'execution-start.json', dict(started_at=datetime.now(ZoneInfo('Asia/Manila')).isoformat(),
              protocol_sha256=sha(output / 'protocol.json')))
    points, issues, interval_points, point_reports, interval_reports = [], [], [], [], []
    for stage in STAGES:
        if stage != 'development' and not (output / 'selection.json').exists():
            raise ValueError('Development choice must freeze before later scoring')
        for label in spec['origins'][stage]:
            origin = contracts.month(label)
            actual = series[origin + 1]
            known = {p: value for p, value in series.items() if p <= origin}
            vector = model.baseline_values(known, origin)
            for name, prediction in vector.items():
                inherited = [p for p in reference['predictions'] if p['stage'] == stage
                             and p['origin_period'] == label and p['model_id'] == name and p['lead_months'] == 1]
                if (len(inherited) != 1 or actual != inherited[0]['actual']
                        or abs(prediction - inherited[0]['prediction']) > 1e-6):
                    raise ValueError('Same-case retained point baseline parity failed')
                points.append(dict(stage=stage, model_id=name, origin_period=label,
                                   target_period=contracts.period(origin + 1), lead_months=1,
                                   actual=actual, prediction=prediction, failure=None))
            issue = model.issue_intervals(known, origin)
            issues.append(dict(stage=stage, origin_period=label, **issue))
            for row in issue['intervals']:
                interval_points.append(dict(stage=stage, origin_period=label,
                                            target_period=contracts.period(origin + 1), actual=actual, **row))
        for name in model.BASELINES:
            rows = [p for p in points if p['stage'] == stage and p['model_id'] == name]
            point_reports.append(dict(stage=stage, model_id=name,
                                      **metrics.score([(p['actual'], p['prediction']) for p in rows])))
        current = []
        for name in model.INTERVALS:
            rows = [p for p in interval_points if p['stage'] == stage and p['model_id'] == name]
            current.append(dict(stage=stage, model_id=name, **model.summarize_intervals(rows)))
        interval_reports.extend(current)
        if stage == 'development':
            write_new(output / 'development.json', dict(point_reports=point_reports, interval_reports=current))
            write_new(output / 'selection.json', model.choose_interval(current))
    result = dict(schema_version=model.VERSION, source_identity=source['source_identity'],
                  protocol_sha256=sha(output / 'protocol.json'), point_predictions=points,
                  issue_traces=issues, interval_predictions=interval_points,
                  point_reports=point_reports, interval_reports=interval_reports,
                  selection=json.loads((output / 'selection.json').read_bytes()),
                  point_accuracy_improved=False, point_forecasts_changed=False,
                  source_values_are_retained_revised_history=True, historical_vintages_verified=False,
                  untouched_test=False, coverage_guaranteed=False, fresh_warehouse_query=False,
                  publication_approved=False, operational_approval=False,
                  executed_at=datetime.now(ZoneInfo('Asia/Manila')).isoformat(),
                  runtime_seconds=time.monotonic() - started)
    write_new(output / 'results.json', result)
    for filename, rows in (('point_metrics.csv', point_reports), ('interval_metrics.csv', interval_reports)):
        with (output / filename).open('x', encoding='utf-8', newline='') as handle:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)
    return dict(status='EXECUTED', point_cases=len(points), interval_cases=len(interval_points),
                issue_traces=len(issues), failures=sum(row['failure'] is not None for row in interval_points),
                selection=result['selection'], runtime_seconds=result['runtime_seconds'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode', choices=('register', 'execute'), required=True)
    for name in ('source', 'reference', 'output'):
        parser.add_argument('--' + name, type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(run(args.source, args.reference, args.output, args.mode)))


if __name__ == '__main__':
    main()
