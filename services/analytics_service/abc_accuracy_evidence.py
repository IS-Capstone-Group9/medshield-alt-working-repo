"""Fixed, train-only ABC transition research and conditional accuracy evidence.

This offline comparison never changes the existing selected model or runtime.
"""
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path
import random

from . import abc_evaluation as original
from . import abc_protocol as contract

ROOT = Path(__file__).resolve().parents[2]
PROTOCOL = ROOT / 'outputs/original_abc_protocol_20261027/protocol.json'
SOURCE = ROOT / 'outputs/original_so2_20261027/source.json'
INHERITED = ROOT / 'outputs/wp6_abc_classifier_evaluation_20261030/inherited'
EXTENSION = ROOT / 'outputs/so2_closeout_20261102'
MODEL_ID = 'hierarchical_transition_sqrt_balance_v1'
STAGES = ('development_validation', 'retrospective_test_2025', 'partial_2026_extension')
PSEUDOCOUNT = .5
SHRINKAGE = 10.
BOOTSTRAP_REPLICATES = 2000
BOOTSTRAP_SEED = 20261102


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_new(path, value):
    """Exclusive creation makes completed research artifacts immutable by retry."""
    with Path(path).open('xb') as stream:
        stream.write(original.encoded(value))


def predictor_key(row):
    contract.require(row['feature_year'] == row['target_year'] - 1, 'Feature year must precede target')
    contract.require(row['feature_cutoff'] == f"{row['feature_year']}-12-31", 'Invalid issue-time cutoff')
    features = row['features']
    contract.require(set(features) == set(contract.FEATURES), 'Feature allowlist changed')
    observed = features['prior_label_observed']
    contract.require(isinstance(observed, bool), 'Prior observation must be explicit')
    if not observed:
        cohort = 'no_prior_observation'
        contract.require(all(features[k] is None for k in contract.FEATURES[:-1]), 'Missing history cannot become zero')
    else:
        eligible, months = features['prior_eligible_records'], features['prior_observed_months']
        contract.require(isinstance(eligible, int) and eligible >= 0, 'Invalid prior eligible support')
        contract.require(isinstance(months, int) and 1 <= months <= 12, 'Invalid prior month support')
        cohort = ('prior_ineligible_only' if eligible == 0 else
                  'low_history_1_to_6_observed_months' if months <= 6 else 'more_than_6_observed_months')
    contract.require(cohort == row['cohort'], 'History cohort differs from origin-available features')
    prior = row['prior_abc_baseline']
    contract.require(prior in (*contract.CLASSES, 'Unclassified', None), 'Invalid prior ABC')
    return prior if prior in contract.CLASSES else 'unavailable', cohort


def fit_transition(rows, through_year):
    contract.require(through_year in (2023, 2024), 'Unregistered training cutoff')
    contract.validate_records(rows)
    contract.require(bool(rows), 'Training rows required')
    global_counts, prior_counts, cell_counts = Counter(), defaultdict(Counter), defaultdict(Counter)
    for row in rows:
        contract.require(row['partition'] == 'train' and row['stage'] in ('development_train', 'frozen_refit_train'),
                         'Training must use the frozen training-label partition')
        contract.require(2021 <= row['target_year'] <= through_year, 'Future target cannot enter training')
        contract.require(row['eligible_for_three_class_evaluation'] and row['target_abc'] in contract.CLASSES,
                         'Unsupported training target')
        prior, cohort = predictor_key(row)
        target = row['target_abc']
        global_counts[target] += 1
        prior_counts[prior][target] += 1
        cell_counts[prior + '|' + cohort][target] += 1
    contract.require(all(global_counts[c] for c in contract.CLASSES), 'Training class missing')
    packed = lambda counts: {c: counts[c] for c in contract.CLASSES}
    return dict(model_id=MODEL_ID, through_year=through_year, samples=len(rows),
        training_identity_sha256=contract.digest(original.encoded([(r['product_key'], r['target_year']) for r in rows])),
        global_counts=packed(global_counts), prior_counts={k: packed(v) for k, v in sorted(prior_counts.items())},
        cell_counts={k: packed(v) for k, v in sorted(cell_counts.items())},
        class_weights={c: math.sqrt(len(rows)/(3*global_counts[c])) for c in contract.CLASSES},
        pseudocount=PSEUDOCOUNT, shrinkage=SHRINKAGE, probabilities_calibrated=False)


def predict_one(row, model):
    """Prediction reads only origin-available predictors, never the row target."""
    prior, cohort = predictor_key(row)
    counts = model['prior_counts'].get(prior, model['global_counts'])
    denominator = sum(counts.values()) + 3*PSEUDOCOUNT
    parent = {c: (counts[c]+PSEUDOCOUNT)/denominator for c in contract.CLASSES}
    cell = model['cell_counts'].get(prior + '|' + cohort, {c: 0 for c in contract.CLASSES})
    denominator = sum(cell.values()) + SHRINKAGE
    posterior = {c: (cell[c]+SHRINKAGE*parent[c])/denominator for c in contract.CLASSES}
    weighted = {c: posterior[c]*model['class_weights'][c] for c in contract.CLASSES}
    predicted = max(contract.CLASSES, key=lambda c: weighted[c])
    return predicted, posterior, weighted


def predict_cases(rows, model):
    cases = []
    for row in rows:
        contract.require(row['feature_year'] >= model['through_year'], 'Training cutoff exceeds prediction origin')
        predicted, posterior, weighted = predict_one(row, model)
        cases.append(dict(stage=row['stage'], model_id=MODEL_ID, product_key=row['product_key'],
            target_year=row['target_year'], cohort=row['cohort'], actual=row['target_abc'], predicted=predicted,
            raw_uncalibrated_probabilities=[posterior[c] for c in contract.CLASSES],
            decision_scores=[weighted[c] for c in contract.CLASSES],
            prior_history_available=row['features']['prior_label_observed']))
    return cases


def research_gate(scores):
    """A separate comparison gate; the existing registered selection is immutable."""
    contract.require(set(scores) == {'majority', 'prior_abc', MODEL_ID}, 'Missing validation comparison')
    contract.require(all(s['stage'] == 'development_validation' for s in scores.values()), 'Later scores cannot select')
    baseline = max(('majority', 'prior_abc'), key=lambda k: scores[k]['macro_f1'])
    challenger, reference = scores[MODEL_ID], scores[baseline]
    passed = challenger['macro_f1']+1e-12 >= reference['macro_f1']+.02 and challenger['a_recall']+1e-12 >= reference['a_recall']
    return dict(gate='new_retrospective_comparison_gate_only', stage='development_validation',
        best_baseline=baseline, eligible_research_candidate=passed,
        rule='macro-F1 gain >=0.02 and A recall not lower than best validation baseline',
        original_selected_model='prior_abc', automatic_promotion=False, activation_allowed=False)


def wilson(successes, total):
    if not total:
        return None
    z = 1.959963984540054
    p = successes/total
    denominator = 1+z*z/total
    center = (p+z*z/(2*total))/denominator
    radius = z*math.sqrt(p*(1-p)/total+z*z/(4*total*total))/denominator
    return [max(0., center-radius), min(1., center+radius)]


def conditional_bootstrap(candidate, reference, stage):
    contract.require(len(candidate) == len(reference) and bool(candidate), 'Paired cases required')
    candidate = sorted(candidate, key=lambda r: r['product_key'])
    reference = sorted(reference, key=lambda r: r['product_key'])
    for left, right in zip(candidate, reference):
        contract.require(all(left[k] == right[k] for k in ('product_key', 'target_year', 'actual', 'stage')),
                         'Bootstrap populations differ')
    rng = random.Random(BOOTSTRAP_SEED + STAGES.index(stage))
    deltas = {key: [] for key in ('accuracy', 'macro_f1', 'a_recall')}
    for _ in range(BOOTSTRAP_REPLICATES):
        indices = [rng.randrange(len(candidate)) for _ in candidate]
        truth = [candidate[i]['actual'] for i in indices]
        a = original.metrics(truth, [candidate[i]['predicted'] for i in indices])
        b = original.metrics(truth, [reference[i]['predicted'] for i in indices])
        for key in deltas:
            av = a['per_class']['A']['recall'] if key == 'a_recall' else a[key]
            bv = b['per_class']['A']['recall'] if key == 'a_recall' else b[key]
            if av is not None and bv is not None:
                deltas[key].append(av-bv)
    intervals = {}
    for key, values in deltas.items():
        values.sort()
        intervals[key] = dict(defined_replicates=len(values), percentile_95_interval=
            [values[math.floor(.025*(len(values)-1))], values[math.ceil(.975*(len(values)-1))]] if values else None)
    return dict(stage=stage, candidate=MODEL_ID, reference='prior_abc', samples=len(candidate),
        replicates=BOOTSTRAP_REPLICATES, seed=BOOTSTRAP_SEED+STAGES.index(stage), intervals=intervals,
        scope='Conditional exact-label case resampling only; ABC rank/year dependence and inspected outcomes prevent temporal or future-generalization confidence claims')


def declaration(protocol):
    dependencies = [Path(__file__), Path(original.__file__), Path(contract.__file__),
        ROOT/'services/analytics_service/jobs/run_abc_accuracy_evidence.py',
        ROOT/'services/tests/test_abc_accuracy_evidence.py', PROTOCOL, SOURCE,
        INHERITED/'predictions.json', INHERITED/'selection.json', EXTENSION/'predictions.json', EXTENSION/'results.json']
    return dict(schema='abc_accuracy_evidence_v1', status='REGISTERED_BEFORE_FIT',
        method=MODEL_ID, pseudocount=PSEUDOCOUNT, shrinkage=SHRINKAGE,
        decision='Smoothed transition posterior multiplied by inverse-square-root training class frequency; ABC order breaks ties',
        predictors=['prior_abc_baseline', 'origin_available_history_cohort'],
        development='train-label target2021–2023; validation-label target2024',
        audit='train-label target2021–2024; test-label2025 and separate January–September2026',
        comparison_gate='2024 macro-F1 gain >=0.02 and no lower A recall than best majority/persistence; no automatic promotion',
        uncertainty=dict(method='paired case percentile bootstrap', replicates=BOOTSTRAP_REPLICATES, seed=BOOTSTRAP_SEED,
            limitation='Conditional case resampling, not temporal/generalization confidence; yearly rank targets are dependent'),
        dataset_id=protocol['dataset_id'], protocol_sha256=original.PROTOCOL_SHA, source_sha256=protocol['source_sha256'],
        dependencies={str(path.relative_to(ROOT)).replace('\\', '/'): sha(path) for path in dependencies},
        source_labels_not_verified_skus=True, inspected_retrospective=True, tuning_on_later_scores=False,
        original_selection_changed=False, runtime_changed=False, model_publication_approved=False, warehouse_writes=0)


def execute(output):
    output = Path(output)
    protocol = original.load_protocol(PROTOCOL, SOURCE)
    registered = json.loads((output/'registration.json').read_bytes())
    contract.require(registered == declaration(protocol), 'Registration/code/source changed before fit')
    contract.require(not any((output/name).exists() for name in ('started.json', 'results.json', 'predictions.json')),
                     'Existing/partial execution cannot be overwritten; use a newly registered directory')
    write_new(output/'started.json', dict(status='EXECUTION_STARTED', registration_sha256=sha(output/'registration.json')))
    train = original.stage_rows(protocol, 'development_train')
    validation = original.stage_rows(protocol, STAGES[0])
    model = fit_transition(train, 2023)
    cases = predict_cases(validation, model)
    for model_id in original.MODELS[:2]:
        cases.extend(original.predict_cases(validation, model_id, original.majority(train)))
    scores = {s['model_id']: dict(stage=s['stage'], macro_f1=s['macro_f1'], a_recall=s['per_class']['A']['recall'])
              for s in original.summarize(cases) if s['cohort'] == 'all'}
    gate = research_gate(scores)
    write_new(output/'comparison-gate.json', gate)
    refit_rows = train + original.stage_rows(protocol, 'frozen_refit_train')
    refit = fit_transition(refit_rows, 2024)
    inherited = json.loads((INHERITED/'predictions.json').read_bytes())
    extension = json.loads((EXTENSION/'predictions.json').read_bytes())
    # Original challenger validation cases and separately frozen audit fits are retained comparators.
    cases.extend(c for c in inherited if c['stage'] == STAGES[0] and c['model_id'] in original.MODELS[2:])
    train_keys = {r['product_key'] for r in refit_rows}
    for stage in STAGES[1:]:
        rows = original.stage_rows(protocol, stage)
        contract.require(not train_keys & {r['product_key'] for r in rows}, 'Train/test labels overlap')
        cases.extend(predict_cases(rows, refit))
        for model_id in original.MODELS:
            retained = [c for c in extension if c['stage'] == stage and c['model_id'] == model_id]
            if model_id in original.MODELS[:2]:
                contract.require(retained == original.predict_cases(rows, model_id, original.majority(refit_rows)),
                                 'Retained baseline predictions differ')
            cases.extend(retained)
    summary = original.summarize(cases)
    for score in summary:
        support = score['per_class']['A']['support']
        tp = score['confusion_matrix'][0][0]
        score['a_recall_wilson_95_interval'] = wilson(tp, support)
        score['uncertainty_scope'] = 'Conditional observed-case proportion, not future temporal generalization'
    uncertainty = []
    for stage in STAGES:
        stage_cases = [c for c in cases if c['stage'] == stage]
        keys = [{(c['product_key'], c['target_year']) for c in stage_cases if c['model_id'] == model_id}
                for model_id in (*original.MODELS, MODEL_ID)]
        contract.require(all(k == keys[0] for k in keys), 'Model evaluation populations differ')
        uncertainty.append(conditional_bootstrap([c for c in stage_cases if c['model_id'] == MODEL_ID],
            [c for c in stage_cases if c['model_id'] == 'prior_abc'], stage))
    write_new(output/'models.json', dict(development=model, refit=refit))
    write_new(output/'predictions.json', cases)
    write_new(output/'uncertainty.json', uncertainty)
    result = dict(status='RETROSPECTIVE_RESEARCH_EVALUATED_NOT_PUBLISHED', model_id=MODEL_ID,
        registration_sha256=sha(output/'registration.json'), source_sha256=protocol['source_sha256'],
        protocol_sha256=original.PROTOCOL_SHA, dataset_id=protocol['dataset_id'],
        models_trained=2, scores=summary, new_comparison_gate=gate,
        original_selection=json.loads((INHERITED/'selection.json').read_bytes()),
        artifacts={name: sha(output/name) for name in ('models.json', 'predictions.json', 'comparison-gate.json', 'uncertainty.json')},
        exclusions=[dict(stage=stage, unclassified=sum(r['stage'] == stage and not r['eligible_for_three_class_evaluation']
            for r in protocol['records'])) for stage in STAGES],
        limitations=protocol['limitations']+[
            'Fixed balanced transition experiment was declared after prior outcomes were inspected; no blind test claim.',
            'Smoothed transition probabilities are uncalibrated; class-weighted decision scores are not probabilities.',
            'Bootstrap intervals condition on these label cases and cannot account for annual ABC-rank or temporal dependence.',
            'Reused XGBoost cases are inherited saved-fit evidence, not new fits in this experiment.',
            'Physical quantity demand, catalog cold start, operational impact and future accuracy remain unestablished.'],
        runtime_changed=False, activation_allowed=False, warehouse_writes=0, model_publication_approved=False)
    write_new(output/'results.json', result)
    return result
