"""Register and execute lagged-activity/portfolio-feature accuracy experiments."""
import argparse
from datetime import datetime, timezone
import importlib.metadata
import json
from pathlib import Path
import platform

from ..predictive import asof_features as features, contracts, metrics
from .. import abc_evaluation as abc, abc_protocol
from . import run_accuracy_improvement as previous, run_stable_ets_review as retained


def choose_forecast(rows):
    if any(r['stage'] != 'development' for r in rows):
        raise ValueError('Development-only selection')
    baseline = min((r for r in rows if r['model_id'] in previous.BASELINES),
                   key=lambda r: (r['mae'], r['model_id']))
    eligible = [r for r in rows if r['model_id'] not in previous.BASELINES and
                r['n'] == baseline['n'] and r['mae'] <= .95 * baseline['mae'] and
                abs(r['normalized_bias']) <= 5.]
    chosen = min(eligible, key=lambda r: (r['mae'], r['model_id'])) if eligible else next(
        r for r in rows if r['model_id'] == 'mean_6')
    return dict(selected_model=chosen['model_id'], best_development_baseline=baseline['model_id'],
                stage='development', test_used=False, publication_approved=False)


def forecast_study(source, reference, out):
    first = contracts.month(reference['protocol']['training_start'])
    activity = {contracts.month(r['month']): dict(net=float(r['net_sales_php']),
        records=float(r['source_records']), eligible=float(r['net_eligible_records']))
        for r in source['monthly'] if contracts.month(r['month']) >= first}
    points, reports, selection = [], [], None
    for stage in ('development', 'retrospective_audit', 'inspected_extension'):
        if stage != 'development' and not (out / 'forecast-selection.json').exists():
            raise ValueError('Choice must be frozen before later scoring')
        points.extend(dict(p, inherited=True) for p in reference['predictions'] if p['stage'] == stage
                      and p['lead_months'] == 1 and p['model_id'] in previous.BASELINES)
        for label in reference['protocol'][stage + '_origins']:
            origin = contracts.month(label)
            known = {p: row for p, row in activity.items() if p <= origin}
            for config in features.FORECAST_CONFIGS:
                value, trace = features.forecast(known, origin, config)
                points.append(dict(stage=stage, model_id=config['model_id'], origin_period=label,
                    target_period=contracts.period(origin + 1), lead_months=1,
                    actual=activity[origin + 1]['net'], prediction=value, inherited=False, trace=trace))
        stage_reports = []
        for name in sorted({p['model_id'] for p in points if p['stage'] == stage}):
            rows = [p for p in points if p['stage'] == stage and p['model_id'] == name]
            stage_reports.append(dict(stage=stage, model_id=name,
                **metrics.score([(p['actual'], p['prediction']) for p in rows])))
        reports.extend(stage_reports)
        if stage == 'development':
            selection = choose_forecast(stage_reports)
            previous.write(out / 'forecast-development.json', dict(points=points, reports=reports))
            previous.write(out / 'forecast-selection.json', selection)
    result = dict(points=points, reports=reports, selection=selection, target_unit='PHP',
                  source_identity=source['source_identity'], publication_approved=False,
                  operational_approval=False, untouched_test=False)
    previous.write(out / 'forecast-results.json', result)
    return selection


def estimator(config):
    if config['family'] == 'logistic':
        from sklearn.linear_model import LogisticRegression
        return LogisticRegression(C=config['c'], class_weight='balanced', solver='lbfgs', max_iter=2000)
    from xgboost import XGBClassifier
    return XGBClassifier(n_estimators=120, learning_rate=.05, min_child_weight=3, reg_lambda=10.,
        subsample=.8, colsample_bytree=1., objective='multi:softprob', num_class=3,
        tree_method='hist', n_jobs=1, random_state=20261031, max_depth=config['depth'])


def fit_classifier(rows, context, config):
    raw = [features.portfolio_features(r, context) for r in rows]
    processor = features.fit_transformer(raw)
    model = estimator(config)
    x = features.transform(raw, processor)
    y = [abc_protocol.CLASSES.index(r['target_abc']) for r in rows]
    kwargs = dict(sample_weight=previous.class_weights(rows)) if config['family'] == 'xgb' and config['balanced'] else {}
    model.fit(x, y, **kwargs)
    if hasattr(model, 'n_iter_') and max(model.n_iter_) >= 2000:
        raise ValueError('Logistic optimizer did not converge')
    return model, processor


def predict_classifier(rows, context, config, model, processor):
    matrix = features.transform([features.portfolio_features(r, context) for r in rows], processor)
    probabilities = model.predict_proba(matrix)
    cases = []
    for row, prob in zip(rows, probabilities):
        values = [float(v) for v in prob]
        if any(not 0 <= v <= 1 for v in values) or abs(sum(values) - 1) > 1e-5:
            raise ValueError('Invalid class probability')
        cases.append(dict(stage=row['stage'], model_id=config['model_id'], product_key=row['product_key'],
            target_year=row['target_year'], cohort=row['cohort'], actual=row['target_abc'],
            predicted=abc_protocol.CLASSES[int(prob.argmax())], raw_uncalibrated_probabilities=values))
    return cases


def abc_study(protocol, source, out):
    context = features.portfolio_context(source)
    train = abc.stage_rows(protocol, 'development_train')
    validation = abc.stage_rows(protocol, 'development_validation')
    receipts = [dict(product_key=r['product_key'], target_year=r['target_year'],
        feature_year=r['feature_year'], feature_cutoff=r['feature_cutoff'], stage=r['stage'],
        features=features.portfolio_features(r, context)) for r in protocol['records']
        if r['stage'] in ('development_train', 'development_validation', 'frozen_refit_train',
                          'retrospective_test_2025', 'partial_2026_extension') and r['eligible_for_three_class_evaluation']]
    previous.write(out / 'feature-receipts.json', receipts)
    cases, processors = [], {}
    for name in ('majority', 'prior_abc'):
        cases.extend(abc.predict_cases(validation, name, abc.majority(train)))
    for config in features.ABC_CONFIGS:
        model, processor = fit_classifier(train, context, config)
        processors[config['model_id']] = processor
        cases.extend(predict_classifier(validation, context, config, model, processor))
    choice = previous.choose_abc([r for r in abc.summarize(cases) if r['cohort'] == 'all'])
    previous.write(out / 'abc-selection.json', choice)
    previous.write(out / 'abc-development.json', dict(cases=cases, reports=abc.summarize(cases), processors=processors))
    refit = train + abc.stage_rows(protocol, 'frozen_refit_train')
    selected = choice['selected_model']
    config = next((c for c in features.ABC_CONFIGS if c['model_id'] == selected), None)
    if config:
        model, processor = fit_classifier(refit, context, config)
        processors['selected_refit'] = processor
        if config['family'] == 'xgb':
            model.save_model(out / 'selected-abc-research.json')
        else:
            previous.write(out / 'selected-abc-research.json', dict(classes=model.classes_.tolist(),
                coefficients=model.coef_.tolist(), intercept=model.intercept_.tolist(), config=config))
    for stage in ('retrospective_test_2025', 'partial_2026_extension'):
        rows = abc.stage_rows(protocol, stage)
        for name in dict.fromkeys(('prior_abc', selected)):
            cases.extend(predict_classifier(rows, context, config, model, processor) if name not in
                         ('majority', 'prior_abc') else abc.predict_cases(rows, name, abc.majority(refit)))
    result = dict(cases=cases, reports=abc.summarize(cases), selection=choice, processors=processors,
                  publication_approved=False, operational_approval=False, untouched_test=False)
    previous.write(out / 'abc-results.json', result)
    return choice


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for field in ('source', 'reference', 'abc-protocol', 'abc-source', 'output'):
        parser.add_argument('--' + field, type=Path, required=True)
    parser.add_argument('--mode', choices=('register', 'execute'), required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[3]
    files = [Path(__file__), Path(features.__file__), Path(previous.__file__), Path(retained.__file__),
             Path(abc.__file__), Path(abc_protocol.__file__), Path(metrics.__file__), Path(contracts.__file__)]
    registration = dict(version=features.VERSION,
        inputs={k: previous.sha(getattr(args, k)) for k in ('source', 'reference', 'abc_protocol', 'abc_source')},
        code={p.relative_to(root).as_posix(): previous.sha(p) for p in files},
        forecast_configs=features.FORECAST_CONFIGS, abc_configs=features.ABC_CONFIGS,
        forecast_selection='MAE gain>=5% vs best development baseline AND abs normalized bias<=5%',
        abc_selection='Validation macroF1 gain>=.02 vs best baseline AND A-recall no worse',
        environment=dict(python=platform.python_version(), **{k: importlib.metadata.version(k)
            for k in ('numpy', 'scipy', 'scikit-learn', 'xgboost')}), inspected_historical_outcomes=True)
    source, reference = (json.loads(p.read_bytes()) for p in (args.source, args.reference))
    retained.validate_source(source, reference, registration['inputs']['source'])
    protocol = abc.load_protocol(args.abc_protocol, args.abc_source)
    abc_source = json.loads(args.abc_source.read_bytes())
    if args.mode == 'register':
        args.output.mkdir(parents=True, exist_ok=False)
        previous.write(args.output / 'registration.json', registration)
        print('REGISTERED_ASOF_FEATURES_BEFORE_FIT')
        return
    if json.loads((args.output / 'registration.json').read_bytes()) != registration:
        raise ValueError('Source/code/environment changed;new registration required')
    if any((args.output / f).exists() for f in ('forecast-results.json', 'abc-results.json')):
        raise ValueError('Refusing to overwrite an execution')
    from threadpoolctl import threadpool_limits
    with threadpool_limits(limits=1):
        forecast_choice = forecast_study(source, reference, args.output)
        abc_choice = abc_study(protocol, abc_source, args.output)
    previous.write(args.output / 'completion.json', dict(time=datetime.now(timezone.utc).isoformat(),
        forecast_selection=forecast_choice, abc_selection=abc_choice, runtime_changed=False,
        warehouse_writes=0, publication_approved=False))
    print(json.dumps(dict(forecast=forecast_choice, abc=abc_choice)))


if __name__ == '__main__':
    main()
