"""Registered development-only adaptive forecast and prior-state ABC experiments."""
import argparse
import csv
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
from pathlib import Path
import platform

from ..predictive import adaptive_ensemble as adaptive, contracts, metrics
from .. import abc_evaluation as abc, abc_protocol
from . import run_stable_ets_review

ABC_CONFIGS = [dict(model_id=f'prior_state_xgb_d{d}_{w}', max_depth=d, balanced=w == 'balanced')
               for d in (2, 3) for w in ('ordinary', 'balanced')]
BASELINES = ('last_value', 'seasonal_naive', 'mean_3', 'mean_6')


def write(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + '\n', encoding='utf-8')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def select_forecast(rows, lead):
    if any(r['stage'] != 'development' for r in rows):
        raise ValueError('Forecast selection accepts development only')
    reference = 'mean_6' if lead == 1 else 'seasonal_naive'
    baseline = next(r for r in rows if r['model_id'] == reference)
    eligible = [r for r in rows if r['model_id'] not in BASELINES and r['n'] == baseline['n']
                and r['mae'] <= .95 * baseline['mae']
                and abs(r['normalized_bias']) <= abs(baseline['normalized_bias']) + 1.]
    selected = min(eligible, key=lambda r: (r['mae'], r['model_id'])) if eligible else baseline
    return dict(lead_months=lead, reference=reference, selected_model=selected['model_id'],
                development_relative_mae_reduction=1 - selected['mae'] / baseline['mae'],
                stage='development', audit_used=False, publication_approved=False)


def forecast_study(source, reference, series, out):
    spec = reference['protocol']
    points, reports, choices = [], [], []
    for stage in ('development', 'retrospective_audit', 'inspected_extension'):
        if stage != 'development' and not (out / 'forecast-selection.json').exists():
            raise ValueError('Freeze development choice before later-stage scoring')
        for p in reference['predictions']:
            if p['stage'] == stage and p['model_id'] in BASELINES:
                if series[contracts.month(p['target_period'])] != p['actual']:
                    raise ValueError('Reference actual differs from source')
                points.append(dict(p, inherited=True))
        for label in spec[stage + '_origins']:
            origin = contracts.month(label)
            known = {p: v for p, v in series.items() if p <= origin}
            for lead in (1, 3, 6):
                for config in adaptive.CONFIGS:
                    value, trace = adaptive.predict(known, origin, lead, config)
                    points.append(dict(stage=stage, model_id=config['model_id'], origin_period=label,
                        target_period=contracts.period(origin + lead), lead_months=lead,
                        actual=series[origin + lead], prediction=value, inherited=False, trace=trace))
        for lead in (1, 3, 6):
            subset = [p for p in points if p['stage'] == stage and p['lead_months'] == lead]
            stage_reports = []
            for name in sorted({p['model_id'] for p in subset}):
                rows = [p for p in subset if p['model_id'] == name]
                stage_reports.append(dict(stage=stage, lead_months=lead, model_id=name,
                    **metrics.score([(p['actual'], p['prediction']) for p in rows])))
            reports.extend(stage_reports)
            if stage == 'development':
                choices.append(select_forecast(stage_reports, lead))
        if stage == 'development':
            write(out / 'forecast-development.json', dict(reports=reports, points=points))
            write(out / 'forecast-selection.json', choices)
    write(out / 'forecast-results.json', dict(points=points, reports=reports, selections=choices,
        target_unit='PHP', source_identity=source['source_identity'], untouched_test=False,
        publication_approved=False, operational_approval=False))
    with (out / 'forecast-metrics.csv').open('w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(reports[0]))
        writer.writeheader()
        writer.writerows(reports)
    return choices


def prior_state_features(rows, preprocessor):
    import numpy as np
    extra = []
    for row in rows:
        prior = row['prior_abc_baseline']
        if prior not in (*abc_protocol.CLASSES, 'Unclassified', None):
            raise ValueError('Unknown origin-known prior class')
        extra.append([int(prior == c) for c in abc_protocol.CLASSES] +
                     [int(prior not in abc_protocol.CLASSES)])
    return np.c_[abc.transform(rows, preprocessor), np.asarray(extra).reshape(len(rows), 4)]


def class_weights(rows):
    counts = {c: sum(r['target_abc'] == c for r in rows) for c in abc_protocol.CLASSES}
    if not all(counts.values()):
        raise ValueError('All training classes required')
    return [len(rows) / (3 * counts[r['target_abc']]) for r in rows]


def abc_predict(rows, name, fallback, model=None, preprocessor=None):
    if name in ('prior_abc', 'majority'):
        return abc.predict_cases(rows, name, fallback)
    probabilities = model.predict_proba(prior_state_features(rows, preprocessor))
    result = []
    for row, prob in zip(rows, probabilities):
        values = [float(v) for v in prob]
        if any(not 0 <= v <= 1 for v in values) or abs(sum(values) - 1) > 1e-5:
            raise ValueError('Invalid probability vector')
        result.append(dict(stage=row['stage'], model_id=name, product_key=row['product_key'],
            target_year=row['target_year'], cohort=row['cohort'], actual=row['target_abc'],
            predicted=abc_protocol.CLASSES[int(prob.argmax())],
            raw_uncalibrated_probabilities=values))
    return result


def choose_abc(reports):
    if any(r['stage'] != 'development_validation' or r['cohort'] != 'all' for r in reports):
        raise ValueError('ABC selection accepts all-population validation only')
    baseline = max((r for r in reports if r['model_id'] in ('prior_abc', 'majority')),
                   key=lambda r: (r['macro_f1'], r['model_id'] == 'prior_abc'))
    eligible = [r for r in reports if r['model_id'] not in ('prior_abc', 'majority') and
                r['macro_f1'] >= baseline['macro_f1'] + .02 and
                r['per_class']['A']['recall'] >= baseline['per_class']['A']['recall']]
    chosen = min(eligible, key=lambda r: (-r['macro_f1'], r['model_id'])) if eligible else baseline
    return dict(selected_model=chosen['model_id'], baseline=baseline['model_id'],
                stage='development_validation', test_used=False,
                validation_macro_f1=chosen['macro_f1'], baseline_macro_f1=baseline['macro_f1'],
                publication_approved=False)


def abc_study(protocol, out):
    from xgboost import XGBClassifier
    train = abc.stage_rows(protocol, 'development_train')
    validation = abc.stage_rows(protocol, 'development_validation')
    processor = abc.fit_preprocessor(train)
    fallback = abc.majority(train)
    params = dict(n_estimators=120, learning_rate=.05, min_child_weight=3, reg_lambda=10.,
                  subsample=.8, colsample_bytree=1., objective='multi:softprob',
                  num_class=3, tree_method='hist', n_jobs=1, random_state=20261031)
    cases = []
    for name in ('majority', 'prior_abc'):
        cases.extend(abc_predict(validation, name, fallback))
    x = prior_state_features(train, processor)
    y = [abc_protocol.CLASSES.index(r['target_abc']) for r in train]
    for config in ABC_CONFIGS:
        model = XGBClassifier(**params, max_depth=config['max_depth'])
        model.fit(x, y, sample_weight=class_weights(train) if config['balanced'] else None)
        cases.extend(abc_predict(validation, config['model_id'], fallback, model, processor))
    reports = abc.summarize(cases)
    choice = choose_abc([r for r in reports if r['cohort'] == 'all'])
    write(out / 'abc-selection.json', choice)  # Persist before opening held-out stages.
    write(out / 'abc-development.json', dict(cases=cases, reports=reports, preprocessing=processor))
    refit = train + abc.stage_rows(protocol, 'frozen_refit_train')
    selected = choice['selected_model']
    model, refit_processor = None, None
    if selected not in ('majority', 'prior_abc'):
        config = next(c for c in ABC_CONFIGS if c['model_id'] == selected)
        refit_processor = abc.fit_preprocessor(refit)
        model = XGBClassifier(**params, max_depth=config['max_depth'])
        model.fit(prior_state_features(refit, refit_processor),
                  [abc_protocol.CLASSES.index(r['target_abc']) for r in refit],
                  sample_weight=class_weights(refit) if config['balanced'] else None)
        model.save_model(out / 'abc-selected-research.json')
    for stage in ('retrospective_test_2025', 'partial_2026_extension'):
        rows = abc.stage_rows(protocol, stage)
        for name in dict.fromkeys(('prior_abc', selected)):
            cases.extend(abc_predict(rows, name, abc.majority(refit), model, refit_processor))
    result = dict(cases=cases, reports=abc.summarize(cases), selection=choice,
                  refit_preprocessor=refit_processor, untouched_test=False,
                  publication_approved=False, operational_approval=False)
    write(out / 'abc-results.json', result)
    return choice


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for field in ('source', 'reference', 'abc-protocol', 'abc-source', 'output'):
        parser.add_argument('--' + field, type=Path, required=True)
    parser.add_argument('--mode', choices=('register', 'execute'), required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[3]
    inputs = {name: sha(getattr(args, name)) for name in ('source', 'reference', 'abc_protocol', 'abc_source')}
    modules = [Path(__file__), Path(adaptive.__file__), Path(metrics.__file__),
               Path(abc.__file__), Path(abc_protocol.__file__), Path(contracts.__file__),
               Path(run_stable_ets_review.__file__)]
    registration = dict(version='accuracy_improvement_v1', inputs=inputs,
        code={p.relative_to(root).as_posix(): sha(p) for p in modules},
        forecast_configs=adaptive.CONFIGS, abc_configs=ABC_CONFIGS,
        forecast_selection='>=5% development MAE gain vs frozen per-lead reference;abs bias no more than1pp worse',
        abc_selection='Validation macroF1 gain>=.02 and A-recall no worse;all cases included',
        environment=dict(python=platform.python_version(), **{p: importlib.metadata.version(p)
            for p in ('numpy', 'scipy', 'scikit-learn', 'xgboost')}),
        inspected_outcomes=True, operational_approval=False)
    source, reference = (json.loads(p.read_bytes()) for p in (args.source, args.reference))
    series = run_stable_ets_review.validate_source(source, reference, inputs['source'])
    protocol = abc.load_protocol(args.abc_protocol, args.abc_source)
    if args.mode == 'register':
        args.output.mkdir(parents=True, exist_ok=False)
        write(args.output / 'registration.json', registration)
        print('REGISTERED_ACCURACY_EXPERIMENT_BEFORE_FIT')
        return
    if json.loads((args.output / 'registration.json').read_bytes()) != registration:
        raise ValueError('Source/code/environment changed;new registration required')
    if any((args.output / f).exists() for f in ('forecast-results.json', 'abc-results.json')):
        raise ValueError('Refusing to overwrite existing execution')
    from threadpoolctl import threadpool_limits
    with threadpool_limits(limits=1):
        forecasts = forecast_study(source, reference, series, args.output)
        classification = abc_study(protocol, args.output)
    write(args.output / 'completion.json', dict(executed_at=datetime.now(timezone.utc).isoformat(),
        forecast_selection=forecasts, abc_selection=classification,
        source_identity=source['source_identity'], warehouse_writes=0, runtime_changed=False))
    print(json.dumps(dict(forecasts=forecasts, abc=classification)))


if __name__ == '__main__':
    main()
