"""Register/evaluate origin-known raw-label grouping on the unchanged company target."""
import argparse
import csv
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import platform

from ..predictive import grouped_sales_forecast as grouped, contracts, metrics
from . import run_accuracy_improvement as shared, run_online_ensemble as selection, run_stable_ets_review as retained

STAGES = ('development', 'retrospective_audit', 'inspected_extension')


def specification(source, groups, reference):
    root = Path(__file__).resolve().parents[3]
    code = [Path(__file__), Path(grouped.__file__), Path(contracts.__file__), Path(metrics.__file__),
            Path(shared.__file__), Path(selection.__file__), Path(selection.affine.__file__), Path(retained.__file__)]
    protocol = json.loads(reference.read_bytes())['protocol']
    return dict(version=grouped.VERSION, input_sha256={name: shared.sha(p) for name, p in
        [('source', source), ('group_capture', groups), ('reference', reference)]},
        code_sha256={p.relative_to(root).as_posix(): shared.sha(p) for p in code},
        python=platform.python_version(), configs=grouped.CONFIGS, baseline_ids=list(grouped.BASELINES),
        training_start=protocol['training_start'], origins={s: protocol[s + '_origins'] for s in STAGES},
        target='Unchanged original-itemized company captured eligible net-sales PHP;contracts excluded',
        grouping='Exact raw area/channel/accounting labels;origin-observed universe only,no approved geography/category/unit claim',
        group_absence='Additive zero of a fully reconciled captured eligible financial subset,not observed zero sales/demand',
        unseen_target_groups='Not used as origin vocabulary;all recorded contributions remain in company actual/error',
        controls='Bottom-up same-formula sums equal company baseline;not counted as new model improvements',
        selection='Frozen development only:>=5% lower MAE vs strongest complete baseline AND absolute normalized bias<=5%;else mean6',
        user_targets='WAPE strictly<10%/<5% plus existing guard,not guaranteed',
        retrospective=True, untouched_test=False, publication_approved=False, source_defaults_changed=False)


def load(source_path, group_path, reference_path, spec):
    source, capture, reference = [json.loads(p.read_bytes()) for p in (source_path, group_path, reference_path)]
    retained.validate_source(source, reference, spec['input_sha256']['source'])
    panel = grouped.reconcile(capture, source, spec['training_start'])
    return source, reference, panel


def register(source_path, group_path, reference_path, output):
    spec = specification(source_path, group_path, reference_path)
    load(source_path, group_path, reference_path, spec)
    output.mkdir(parents=True, exist_ok=False)
    shared.write(output / 'registration.json', dict(spec, registered_at=datetime.now(timezone.utc).isoformat()))
    return spec


def execute(source_path, group_path, reference_path, output):
    spec = specification(source_path, group_path, reference_path)
    registered = json.loads((output / 'registration.json').read_bytes())
    registered_at = registered.pop('registered_at', None)
    if not registered_at or registered != spec:
        raise ValueError('Registered source/code/environment changed')
    if {p.name for p in output.iterdir()} != {'registration.json'}:
        raise ValueError('Refusing to overwrite completed or partial study')
    source, reference, panel = load(source_path, group_path, reference_path, spec)
    shared.write(output / 'source-controls.json', dict(source_identity=source['source_identity'],
        temporal_scope='2020 onward captured financial rowsets,not complete company demand',
        monthly=[dict(month=contracts.period(p), **frame) for p, frame in sorted(panel.items())]))
    points, reports = [], []
    for stage in STAGES:
        if stage != 'development' and not (output / 'selection.json').exists():
            raise ValueError('Development selection must be frozen before later scores')
        origins = spec['origins'][stage]
        for name in grouped.BASELINES:
            baseline = [p for p in reference['predictions'] if p['stage'] == stage
                        and p['lead_months'] == 1 and p['model_id'] == name]
            if len(baseline) != len(origins) or sorted(p['origin_period'] for p in baseline) != sorted(origins):
                raise ValueError('Baseline cohort mismatch')
            for p in baseline:
                origin = contracts.month(p['origin_period'])
                actual = float(panel[origin + 1]['company_net_sales_php'])
                values = {k: float(v['company_net_sales_php']) for k, v in panel.items()}
                check = grouped.baseline_vector(values, origin)[grouped.BASELINES.index(name)]
                if (contracts.month(p['target_period']) != origin + 1 or p['actual'] != actual
                        or not math.isclose(p['prediction'], check, rel_tol=1e-12, abs_tol=1e-6)):
                    raise ValueError('Baseline source/target/formula mismatch')
                points.append(dict(p, inherited=True, failure=None))
        for label in origins:
            origin = contracts.month(label)
            known = {p: frame for p, frame in panel.items() if p <= origin}
            for config in grouped.CONFIGS:
                prediction, trace, failure = None, None, None
                try:
                    prediction, trace = grouped.predict(known, origin, config)
                except ValueError as error:
                    failure = str(error)
                points.append(dict(stage=stage, model_id=config['model_id'], origin_period=label,
                    target_period=contracts.period(origin + 1), lead_months=1,
                    actual=float(panel[origin + 1]['company_net_sales_php']), prediction=prediction,
                    trace=trace, failure=failure, inherited=False))
        stage_reports = []
        for name in (*grouped.BASELINES, *(c['model_id'] for c in grouped.CONFIGS)):
            rows = [p for p in points if p['stage'] == stage and p['model_id'] == name]
            failed = sum(p['failure'] is not None for p in rows)
            scored = metrics.score([] if failed else [(p['actual'], p['prediction']) for p in rows])
            stage_reports.append(dict(stage=stage, model_id=name, expected_n=len(origins), failed=failed, **scored))
        reports.extend(stage_reports)
        if stage == 'development':
            shared.write(output / 'development.json', dict(points=points, reports=stage_reports))
            shared.write(output / 'selection.json', selection.choose(stage_reports))
    result = dict(points=points, reports=reports, selection=json.loads((output / 'selection.json').read_bytes()),
        source_identity=source['source_identity'], source_grouping=spec['grouping'], target_unit='PHP',
        untouched_test=False, publication_approved=False, operational_approval=False,
        executed_at=datetime.now(timezone.utc).isoformat())
    shared.write(output / 'results.json', result)
    with (output / 'metrics.csv').open('w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(reports[0])); writer.writeheader(); writer.writerows(reports)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode', choices=('register', 'execute'), required=True)
    for name in ('source', 'groups', 'reference', 'output'):
        parser.add_argument('--' + name, type=Path, required=True)
    args = parser.parse_args()
    if args.mode == 'register':
        register(args.source, args.groups, args.reference, args.output)
        print('REGISTERED_RAW_LABEL_FORECAST_BEFORE_EVALUATION')
    else:
        result = execute(args.source, args.groups, args.reference, args.output)
        print(json.dumps(dict(points=len(result['points']), failed=sum(p['failure'] is not None for p in result['points']), selection=result['selection'])))


if __name__ == '__main__':
    main()
