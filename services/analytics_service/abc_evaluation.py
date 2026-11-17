"""Registered offline evaluation of the frozen original ABC protocol."""
import argparse
from collections import Counter
import importlib.metadata
import json
import math
from pathlib import Path
import platform

from . import abc_protocol as contract

PROTOCOL_SHA = '8a31987c3be5578c4570f65b80697a329332254e4e46ec71d5e3c4c91d1b972a'
PACKAGES = {'numpy': '2.3.5', 'scikit-learn': '1.8.0', 'xgboost': '3.4.1', 'scipy': '1.17.1'}
MODELS = ('majority', 'prior_abc', 'xgb_depth_2', 'xgb_depth_3')
COHORTS = ('no_prior_observation', 'prior_ineligible_only',
           'low_history_1_to_6_observed_months', 'more_than_6_observed_months')


def encoded(value):
    return (json.dumps(value, indent=2, allow_nan=False) + '\n').encode()


def metrics(actual, predicted):
    contract.require(len(actual) == len(predicted), 'Prediction length differs')
    matrix = [[0]*3 for _ in range(3)]
    for truth, guess in zip(actual, predicted):
        contract.require(truth in contract.CLASSES and guess in contract.CLASSES, 'Unknown class')
        matrix[contract.CLASSES.index(truth)][contract.CLASSES.index(guess)] += 1
    detail = {}
    for i, label in enumerate(contract.CLASSES):
        tp, support, guesses = matrix[i][i], sum(matrix[i]), sum(row[i] for row in matrix)
        denom = support + guesses
        detail[label] = dict(precision=tp/guesses if guesses else None,
            recall=tp/support if support else None, f1=2*tp/denom if denom else None,
            support=support, predicted=guesses)
    f1 = [v['f1'] for v in detail.values() if v['f1'] is not None]
    recalls = [v['recall'] for v in detail.values() if v['recall'] is not None]
    return dict(samples=len(actual), class_order=list(contract.CLASSES), confusion_matrix=matrix,
        per_class=detail, macro_f1=sum(f1)/len(f1) if f1 else None,
        macro_f1_defined_classes=[k for k, v in detail.items() if v['f1'] is not None],
        balanced_accuracy=sum(recalls)/len(recalls) if recalls else None,
        accuracy=sum(matrix[i][i] for i in range(3))/len(actual) if actual else None)


def majority(rows):
    counts = Counter(row['target_abc'] for row in rows)
    contract.require(rows and all(counts[c] > 0 for c in contract.CLASSES), 'Training class missing')
    return max(contract.CLASSES, key=lambda c: counts[c])


def fit_preprocessor(rows):
    import numpy as np
    medians = []
    for field in contract.FEATURES:
        values = [float(row['features'][field]) for row in rows if row['features'][field] is not None]
        contract.require(values and all(math.isfinite(v) for v in values), 'Unsupported training feature')
        medians.append(float(np.median(values)))
    return dict(feature_order=list(contract.FEATURES), medians=medians,
        indicator_order=[name + '_missing' for name in contract.FEATURES], training_rows=len(rows),
        training_sample_sha256=contract.digest(encoded([(r['product_key'], r['target_year']) for r in rows])))


def transform(rows, preprocessor):
    import numpy as np
    contract.require(preprocessor['feature_order'] == list(contract.FEATURES), 'Preprocessor schema changed')
    output = []
    for row in rows:
        contract.require(set(row['features']) == set(contract.FEATURES), 'Feature allowlist violated')
        values = [row['features'][key] for key in contract.FEATURES]
        converted = [float(value) if value is not None else preprocessor['medians'][i]
                     for i, value in enumerate(values)]
        contract.require(all(math.isfinite(v) for v in converted), 'Nonfinite feature')
        output.append(converted + [int(value is None) for value in values])
    return np.asarray(output, dtype=float).reshape(len(rows), 2*len(contract.FEATURES))


def select_validation(scores):
    contract.require(set(scores) == set(MODELS), 'Missing frozen validation model')
    for value in scores.values():
        contract.require(value['stage'] == 'development_validation', 'Selection may only use validation')
        contract.require(value['macro_f1'] is not None and value['a_recall'] is not None, 'Selection metric unavailable')
    best_baseline = max(MODELS[:2], key=lambda key: (scores[key]['macro_f1'], -MODELS.index(key)))
    baseline = scores[best_baseline]
    eligible = [key for key in MODELS[2:]
                if scores[key]['macro_f1'] + 1e-12 >= baseline['macro_f1'] + .02
                and scores[key]['a_recall'] + 1e-12 >= baseline['a_recall']]
    selected = max(eligible, key=lambda key: (scores[key]['macro_f1'], -MODELS.index(key))) if eligible else best_baseline
    return dict(model_id=selected, best_baseline=best_baseline, eligible_challengers=eligible,
                reason='Frozen validation macro-F1 gain >=0.02 with A-recall guard; ties prefer baseline/smaller model',
                stage='development_validation', test_used=False)


def load_protocol(path, source_path):
    raw = path.read_bytes()
    contract.require(contract.digest(raw) == PROTOCOL_SHA, 'Frozen protocol changed')
    protocol = json.loads(raw)
    source_bytes = source_path.read_bytes()
    contract.require(contract.digest(source_bytes) == protocol['source_sha256'], 'Source receipt changed')
    contract.require(contract.digest(Path(contract.__file__).read_bytes()) == protocol['implementation_sha256'],
                     'Protocol implementation changed')
    records, support = contract.prepare(json.loads(source_bytes))
    contract.require(records == protocol['records'] and support == protocol['sample_support'], 'Protocol rows changed')
    return protocol


def registration(protocol):
    from xgboost import XGBClassifier
    versions = {name: importlib.metadata.version(name) for name in PACKAGES}
    contract.require(versions == PACKAGES, 'Environment differs from frozen package versions')
    configs = [{key: value for key, value in config.items() if key != 'model'} for config in protocol['challengers']]
    # Include all library-resolved defaults before any fitting. JSON cannot carry NaN.
    resolved = []
    for config in configs:
        params = XGBClassifier(**config).get_params()
        resolved.append({k: ('NaN' if isinstance(v, float) and math.isnan(v) else v) for k, v in params.items()})
    return dict(status='REGISTERED_BEFORE_FIT', protocol_sha256=PROTOCOL_SHA,
        runner_sha256=contract.digest(Path(__file__).read_bytes()), package_versions=versions,
        python_version=platform.python_version(), explicit_configs=configs, resolved_configs=resolved,
        preprocessing='Training-only per-column median; missing indicators for all six inputs; no scaling/oversampling; reject wholly missing training columns',
        selection='Only 2024 validation; frozen gain >=0.02 and A-recall guard',
        audit='2025 held-out labels and separate partial-2026; scores cannot reselect',
        refit='Only selected challenger, if any, on train-partition 2021-2024; otherwise no extra fit',
        metrics='Null unsupported precision/recall/F1; macro over defined F1 classes, balanced accuracy over classes with actual support; always report coverage',
        publication='Research-only; inspected retrospective outcomes; not calibrated or operational')


def stage_rows(protocol, stage):
    return [row for row in protocol['records'] if row['stage'] == stage and row['eligible_for_three_class_evaluation']]


def predict_cases(rows, model_id, fallback, model=None, preprocessor=None):
    if model_id == 'majority':
        guesses, probabilities = [fallback]*len(rows), [None]*len(rows)
    elif model_id == 'prior_abc':
        guesses = [r['prior_abc_baseline'] if r['prior_abc_baseline'] in contract.CLASSES else fallback for r in rows]
        probabilities = [None]*len(rows)
    else:
        probs = model.predict_proba(transform(rows, preprocessor))
        guesses = [contract.CLASSES[int(prob.argmax())] for prob in probs]
        probabilities = [[float(v) for v in prob] for prob in probs]
        contract.require(all(all(math.isfinite(v) and 0 <= v <= 1 for v in prob)
            and abs(sum(prob)-1) < 1e-5 for prob in probabilities), 'Invalid class probabilities')
    return [dict(stage=r['stage'], model_id=model_id, product_key=r['product_key'],
                 target_year=r['target_year'], cohort=r['cohort'], actual=r['target_abc'], predicted=guess,
                 raw_uncalibrated_probabilities=prob, prior_history_available=r['features']['prior_label_observed'])
            for r, guess, prob in zip(rows, guesses, probabilities)]


def summarize(cases):
    report = []
    for stage, model in sorted({(r['stage'], r['model_id']) for r in cases}):
        rows = [r for r in cases if r['stage'] == stage and r['model_id'] == model]
        for cohort in ('all', *COHORTS):
            subset = rows if cohort == 'all' else [r for r in rows if r['cohort'] == cohort]
            report.append(dict(stage=stage, model_id=model, cohort=cohort,
                coverage_of_stage=len(subset)/len(rows) if rows else None,
                **metrics([r['actual'] for r in subset], [r['predicted'] for r in subset])))
    return report


def execute(protocol, output, registered):
    from xgboost import XGBClassifier
    contract.require(registered == registration(protocol), 'Registration/code/environment changed since freeze')
    contract.require(not (output / 'results.json').exists(), 'Results already exist; verify saved artifacts instead of refitting')
    train = stage_rows(protocol, 'development_train')
    validation = stage_rows(protocol, 'development_validation')
    fallback = majority(train)
    preprocessor = fit_preprocessor(train)
    development_matrix = transform(train, preprocessor)
    y = [contract.CLASSES.index(r['target_abc']) for r in train]
    cases, artifacts = [], {}
    for model_id in MODELS[:2]:
        cases.extend(predict_cases(validation, model_id, fallback))
    for model_id, config in zip(MODELS[2:], registered['explicit_configs']):
        model = XGBClassifier(**config)
        model.fit(development_matrix, y)
        filename = f'{model_id}_development.json'
        model.save_model(output / filename)
        artifacts[filename] = contract.digest((output / filename).read_bytes())
        cases.extend(predict_cases(validation, model_id, fallback, model, preprocessor))
    validation_summary = [r for r in summarize(cases) if r['cohort'] == 'all']
    selection = select_validation({r['model_id']: dict(stage=r['stage'], macro_f1=r['macro_f1'],
        a_recall=r['per_class']['A']['recall']) for r in validation_summary})
    # Persist choice before opening/scoring the retrospective test stages.
    (output / 'selection.json').write_bytes(encoded(selection))
    refit = train + stage_rows(protocol, 'frozen_refit_train')
    refit_fallback = majority(refit)
    chosen_model, refit_preprocessor = None, None
    fits = 2
    selected = selection['model_id']
    if selected in MODELS[2:]:
        refit_preprocessor = fit_preprocessor(refit)
        config = registered['explicit_configs'][MODELS[2:].index(selected)]
        chosen_model = XGBClassifier(**config)
        chosen_model.fit(transform(refit, refit_preprocessor), [contract.CLASSES.index(r['target_abc']) for r in refit])
        chosen_model.save_model(output / 'selected_refit.json')
        artifacts['selected_refit.json'] = contract.digest((output / 'selected_refit.json').read_bytes())
        fits += 1
    for stage in ['retrospective_test_2025', 'partial_2026_extension']:
        rows = stage_rows(protocol, stage)
        for model_id in dict.fromkeys((*MODELS[:2], selected)):
            cases.extend(predict_cases(rows, model_id, refit_fallback, chosen_model, refit_preprocessor))
    preprocessing = dict(development=preprocessor, selected_refit=refit_preprocessor,
                         development_majority=fallback, refit_majority=refit_fallback)
    (output / 'preprocessing.json').write_bytes(encoded(preprocessing))
    (output / 'predictions.json').write_bytes(encoded(cases))
    result = dict(status='RETROSPECTIVE_ABC_RESEARCH_EVALUATED_NOT_PUBLISHED', protocol_sha256=PROTOCOL_SHA,
        registration_sha256=contract.digest((output / 'registration.json').read_bytes()),
        selection=selection, scores=summarize(cases), model_artifacts=artifacts,
        predictions_sha256=contract.digest((output / 'predictions.json').read_bytes()),
        preprocessing_sha256=contract.digest((output / 'preprocessing.json').read_bytes()),
        source_sha256=protocol['source_sha256'], exclusions=[dict(stage=stage,
            unclassified=sum(r['stage'] == stage and not r['eligible_for_three_class_evaluation'] for r in protocol['records']))
            for stage in ['development_train', 'development_validation', 'frozen_refit_train', 'retrospective_test_2025', 'partial_2026_extension']],
        models_trained=fits, warehouse_writes=0, runtime_changed=False,
        financial_publication_approved=False, model_publication_approved=False, limitations=protocol['limitations'])
    (output / 'results.json').write_bytes(encoded(result))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--protocol', type=Path, required=True)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--mode', choices=['register', 'execute'], required=True)
    args = parser.parse_args()
    protocol = load_protocol(args.protocol, args.source)
    args.output.mkdir(parents=True, exist_ok=True)
    path = args.output / 'registration.json'
    if args.mode == 'register':
        content = encoded(registration(protocol))
        if path.exists():
            contract.require(path.read_bytes() == content, 'Existing registration differs')
        else:
            path.write_bytes(content)
        print(json.dumps(dict(status='REGISTERED_BEFORE_FIT', sha256=contract.digest(content), models_trained=0)))
    else:
        result = execute(protocol, args.output, json.loads(path.read_bytes()))
        print(json.dumps(dict(status=result['status'], selection=result['selection'], models_trained=result['models_trained'],
            overall_scores=[r for r in result['scores'] if r['cohort'] == 'all'])))


if __name__ == '__main__':
    main()
