"""Register a signed-sales component comparison against fixed direct baselines."""
import argparse
import csv
from datetime import datetime, timezone
import json
from pathlib import Path
import platform

from ..predictive import component_forecast as component, contracts, metrics
from . import run_accuracy_improvement as shared, run_feature_accuracy as selection, run_stable_ets_review as retained


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('source', 'components', 'reference', 'output'):
        parser.add_argument('--' + name, type=Path, required=True)
    parser.add_argument('--mode', choices=('register', 'execute'), required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[3]
    files = [Path(__file__), Path(component.__file__), Path(contracts.__file__), Path(metrics.__file__),
             Path(shared.__file__), Path(selection.__file__), Path(retained.__file__)]
    registration = dict(version=component.VERSION,
        inputs={name: shared.sha(getattr(args, name)) for name in ('source', 'components', 'reference')},
        code={p.relative_to(root).as_posix(): shared.sha(p) for p in files},
        configs=component.CONFIGS, lead_months=1,
        selection='Development MAE gain>=5% vs strongest complete baseline AND abs normalized bias<=5%;else mean6',
        python=platform.python_version(), inspected_history=True,
        baseline_ids=list(shared.BASELINES), historical_selection_changed=False)
    source, raw, reference = (json.loads(p.read_bytes()) for p in (args.source, args.components, args.reference))
    retained.validate_source(source, reference, registration['inputs']['source'])
    series = component.reconcile(raw, source)
    if args.mode == 'register':
        args.output.mkdir(parents=True, exist_ok=False)
        shared.write(args.output / 'registration.json', registration)
        print('REGISTERED_SIGNED_COMPONENTS_BEFORE_EXECUTION')
        return
    if json.loads((args.output / 'registration.json').read_bytes()) != registration:
        raise ValueError('Registration source/code/environment changed')
    if (args.output / 'results.json').exists():
        raise ValueError('Refusing to overwrite an executed study')
    shared.write(args.output / 'source-components.json', [dict(period=contracts.period(p), **v)
                                                        for p, v in sorted(series.items())])
    points, reports, choice = [], [], None
    for stage in ('development', 'retrospective_audit', 'inspected_extension'):
        if stage != 'development' and not (args.output / 'selection.json').exists():
            raise ValueError('Freeze development choice before later scoring')
        points.extend(dict(p, inherited=True) for p in reference['predictions'] if p['stage'] == stage
                      and p['lead_months'] == 1 and p['model_id'] in shared.BASELINES)
        for label in reference['protocol'][stage + '_origins']:
            origin = contracts.month(label)
            known = {p: row for p, row in series.items() if p <= origin}
            for config in component.CONFIGS:
                prediction, trace = component.predict(known, origin, config)
                points.append(dict(stage=stage, model_id=config['model_id'], origin_period=label,
                    target_period=contracts.period(origin + 1), lead_months=1,
                    actual=series[origin + 1]['net'], prediction=prediction, trace=trace, inherited=False))
        stage_reports = []
        for name in sorted({p['model_id'] for p in points if p['stage'] == stage}):
            rows = [p for p in points if p['stage'] == stage and p['model_id'] == name]
            stage_reports.append(dict(stage=stage, model_id=name,
                **metrics.score([(p['actual'], p['prediction']) for p in rows])))
        reports.extend(stage_reports)
        if stage == 'development':
            choice = selection.choose_forecast(stage_reports)
            shared.write(args.output / 'development.json', dict(points=points, reports=reports))
            shared.write(args.output / 'selection.json', choice)
    totals = {k: sum(row[k] for row in series.values()) for k in ('positive', 'negative', 'net')}
    result = dict(points=points, reports=reports, selection=choice, source_identity=source['source_identity'],
        component_profile=dict(months=len(series), totals=totals,
            absolute_correction_share_of_positive=abs(totals['negative']) / totals['positive']),
        target_unit='PHP', publication_approved=False, operational_approval=False, untouched_test=False,
        executed_at=datetime.now(timezone.utc).isoformat())
    shared.write(args.output / 'results.json', result)
    with (args.output / 'metrics.csv').open('w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(reports[0]))
        writer.writeheader();writer.writerows(reports)
    print(json.dumps(dict(points=len(points), groups=len(reports), choice=choice,
                         component_profile=result['component_profile'])))


if __name__ == '__main__':
    main()
