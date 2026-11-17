"""Run a frozen, offline same-case comparison on the retained MedShield studies."""

import argparse
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from importlib.metadata import version
import json
from math import isclose, isfinite, log1p
from pathlib import Path
import platform
from statistics import median

from .. import abc_evaluation as abc
from .. import abc_protocol as abc_contract
from .. import territorial_forecast as territorial
from .. import unit_accuracy_evidence as unit
from ..predictive import contracts, metrics
from .run_stable_ets_review import validate_source

ROOT = Path(__file__).resolve().parents[3]
STAGES = ('development', 'retrospective_audit', 'inspected_extension')
ABC_STAGES = ('development_validation', 'retrospective_test_2025', 'partial_2026_extension')
FORECAST_MODELS = ('seasonal_drift', 'recent_level_with_seasonal_effect')
ABC_MODELS = ('three_year_class_memory', 'three_year_balanced_logistic')
BASELINES = ('last_value', 'mean_3', 'mean_6', 'seasonal_naive')
FILES = {
    'company_source': 'outputs/wp4_forecast_tournament_20261030/source.json',
    'company_reference': 'outputs/wp4_new_tournament_20261030/results.json',
    'regional_source': 'outputs/wp4_territorial_research_20261031/source/financial.json',
    'regional_registration': 'outputs/wp4_territorial_research_20261031/run/registration.json',
    'regional_reference': 'outputs/wp4_territorial_research_20261031/run/results.json',
    'unit_source': 'outputs/wp11_unit_planning_pilot_20261030/inherited/unit-candidate.json',
    'unit_reference': 'outputs/client_model_evidence_20261102/unit/study/results.json',
    'abc_protocol': 'outputs/original_abc_protocol_20261027/protocol.json',
    'abc_source': 'outputs/original_so2_20261027/source.json',
    'abc_predictions': 'outputs/client_model_evidence_20261102/abc/predictions.json',
    'abc_reference': 'outputs/client_model_evidence_20261102/abc/results.json',
}


def read(path):
    return json.loads(path.read_bytes())


def digest(path):
    return abc_contract.digest(path.read_bytes())


def write(path, document):
    with path.open('xb') as stream:
        stream.write(abc.encoded(document))


def now():
    return datetime.now(timezone(timedelta(hours=8))).isoformat()


def specification():
    code = [Path(__file__), Path(abc.__file__), Path(abc_contract.__file__), Path(territorial.__file__),
            Path(unit.__file__), Path(contracts.__file__), Path(metrics.__file__),
            Path(validate_source.__code__.co_filename)]
    return dict(
        schema='medshield_same_case_model_errors_v1', inspected_retrospective=True,
        source_hashes={key: digest(ROOT / path) for key, path in FILES.items()}, source_paths=FILES,
        code_hashes={path.relative_to(ROOT).as_posix(): digest(path) for path in code},
        environment={name: version(name) for name in ('numpy', 'scipy', 'scikit-learn')},
        python=platform.python_version(),
        forecast_recipes={
            FORECAST_MODELS[0]: 'Seasonal naive plus median of the last up to six observed year-over-year differences times n/(n+3).',
            FORECAST_MODELS[1]: 'Trailing mean6 plus median of up to three same-lead seasonal offsets times n/(n+2). An offset is historical same-month actual minus the mean6 at that historical issue origin.',
        },
        forecast_gate='Development only by PHP series and lead: at least 5% lower MAE than strongest transparent baseline or incumbent and absolute normalized bias <=5%. Unit results are descriptive only.',
        abc_recipes={
            ABC_MODELS[0]: 'Most recent eligible class in the past three years, or the train-only majority if none.',
            ABC_MODELS[1]: 'Train-only standardized balanced logistic C=1, lbfgs, max_iter=1000. Prior three years of A/B/C/unknown, log positive sales, log relative portfolio share, log record count and observed-month fraction.',
        },
        abc_gate='2024 validation only: macro-F1 improvement >=0.02 with no A-recall loss versus best majority/persistence baseline.',
        source_months_after_issue_used=False, operational_approval=False, publication_approved=False)


def forecasts(history, lead):
    """History is the contiguous observed prefix ending at the issue origin."""
    if len(history) < 12 or lead not in (1, 3, 6) or not all(isfinite(v) for v in history):
        raise ValueError('Complete finite 12-month history and a supported lead required')
    count = len(history)
    annual_changes = [history[i] - history[i - 12] for i in range(max(12, count - 6), count)]
    offsets = []
    for lag in (12, 24, 36):
        old_origin = count - lag
        if old_origin >= 6:
            offsets.append(history[old_origin - 1 + lead] - sum(history[old_origin - 6:old_origin]) / 6)
    return {
        FORECAST_MODELS[0]: history[count - 1 + lead - 12] + shrink(annual_changes, 3),
        FORECAST_MODELS[1]: sum(history[-6:]) / 6 + shrink(offsets, 2),
    }


def shrink(values, strength):
    return median(values) * len(values) / (len(values) + strength) if values else 0


def forecast_comparison(scope, series, reference, protocol, stage, leads, incumbents):
    first = min(series)
    abc_contract.require(sorted(series) == list(range(first, max(series) + 1)),
                         'Missing source month cannot become zero')
    points, rows, decisions = [], [], []
    for lead in leads:
        retained = [p for p in reference if p['stage'] == stage and p['lead_months'] == lead]
        origins = protocol[stage + '_origins']
        models = defaultdict(dict)
        missing_reasons = defaultdict(set)
        for point in retained:
            label, target = point['origin_period'], point['target_period']
            origin = contracts.month(label)
            actual = series[origin + lead]
            entries = models[point['model_id']]
            abc_contract.require(label in origins and label not in entries and
                                 contracts.month(target) == origin + lead and
                                 isclose(point['actual'], actual, abs_tol=1e-6, rel_tol=1e-12),
                                 'Retained forecast case or actual mismatch')
            entries[label] = point['prediction']
            if point['prediction'] is None:
                missing_reasons[point['model_id']].add(point['missing_reason'] or 'Unavailable retained fit')
        for label in origins:
            origin = contracts.month(label)
            history = [series[month] for month in range(first, origin + 1)]
            baseline_values = [history[-1], sum(history[-3:]) / 3, sum(history[-6:]) / 6,
                               history[len(history) - 1 + lead - 12]]
            for model, expected in zip(BASELINES, baseline_values):
                abc_contract.require(isclose(models[model][label], expected, abs_tol=1e-6, rel_tol=1e-12),
                                     'Retained baseline prediction mismatch')
            for model, prediction in forecasts(history, lead).items():
                models[model][label] = prediction
        for model, predictions in sorted(models.items()):
            abc_contract.require(set(predictions) == set(origins), 'Forecast origin cohort differs')
            pairs = []
            for label in origins:
                target = contracts.month(label) + lead
                actual, prediction = series[target], predictions[label]
                points.append(dict(scope=scope, stage=stage, lead=lead, model=model, origin=label,
                                   target=contracts.period(target), actual=actual, prediction=prediction))
                if prediction is not None:
                    pairs.append((actual, prediction))
            rows.append(dict(scope=scope, stage=stage, lead=lead, model=model,
                             evidence='new' if model in FORECAST_MODELS else 'retained',
                             expected_n=len(origins), missing_reasons=sorted(missing_reasons[model]),
                             **metrics.score(pairs)))
        if stage == 'development':
            summary = {r['model']: r for r in rows if r['lead'] == lead}
            comparator = min((*BASELINES, incumbents[lead]), key=lambda key: summary[key]['mae'])
            for model in FORECAST_MODELS:
                candidate = summary[model]
                passes = (summary[comparator]['mae'] > 0
                          and candidate['mae'] <= .95 * summary[comparator]['mae']
                          and candidate['normalized_bias'] is not None and abs(candidate['normalized_bias']) <= 5)
                decisions.append(dict(scope=scope, lead=lead, candidate=model, comparator=comparator, passes=passes))
    return points, rows, decisions


def unit_comparison(source, reference, source_hash):
    abc_contract.require(reference['source_sha256'] == source_hash and source['raw_area'] == 'HOSPITAL'
                         and source['exact_labels'] == ['BUPIRIGHT', 'BUPIRIGHT 5MG/ML 0.5% IN 8% 4ML']
                         and source['quantity_multiplier'] == 1 and source['model_publication_approved'] is False,
                         'Unit source identity or scope differs')
    months, values = unit.observed_series(source['research_window'])
    retained = {(r['lead'], r['origin'], r['method']): r for r in reference['points']}
    abc_contract.require(len(retained) == len(reference['points']), 'Duplicate unit case')
    points, rows = [], []
    for lead, expected_n in [(1, 6), (3, 4)]:
        origins = list(range(11, len(months) - lead))
        abc_contract.require(len(origins) == expected_n, 'Registered unit support changed')
        actuals = [values[origin + lead] for origin in origins]
        predictions = defaultdict(list)
        for origin, actual in zip(origins, actuals):
            history = values[:origin + 1]
            vector = unit.forecasts(history, lead)
            for model, prediction in vector.items():
                prior = retained.pop((lead, months[origin], model))
                abc_contract.require(prior['target_month'] == months[origin + lead]
                                     and Decimal(prior['actual_ampoules']) == Decimal(unit.decimal_string(actual))
                                     and Decimal(prior['prediction_ampoules']) == Decimal(unit.decimal_string(prediction)),
                                     'Retained unit prediction or case differs')
            vector.update(forecasts(history, lead))
            for model, prediction in vector.items():
                predictions[model].append(prediction)
                points.append(dict(scope='BUPIRIGHT_HOSPITAL_ampoules', stage='inspected_unit_pilot',
                                   lead=lead, model=model, origin=months[origin], target=months[origin + lead],
                                   actual=unit.decimal_string(actual), prediction=unit.decimal_string(prediction)))
        for model, estimates in predictions.items():
            rows.append(dict(scope='BUPIRIGHT_HOSPITAL_ampoules', stage='inspected_unit_pilot',
                             lead=lead, model=model, evidence='new' if model in FORECAST_MODELS else 'retained',
                             **unit.summarize(actuals, estimates)))
    abc_contract.require(not retained, 'Unexpected unit reference cases')
    return points, rows


def abc_history(source):
    labels, annual = abc_contract.annual_observations(source)
    yearly = defaultdict(dict)
    for (year, key), row in annual.items():
        yearly[year][key] = row['positive']
    classes = {year: abc_contract.abc_labels(amounts, labels) for year, amounts in yearly.items()}
    totals = {year: sum(amounts.values()) for year, amounts in yearly.items()}
    return annual, classes, totals


def abc_features(row, history):
    annual, classes, totals = history
    key, target = row['product_key'], row['target_year']
    abc_contract.require(row['feature_year'] == target - 1, 'Invalid ABC origin')
    classes_seen, features = [], []
    for year in range(target - 1, target - 4, -1):
        label = classes.get(year, {}).get(key)
        label = label if label in abc_contract.CLASSES else None
        classes_seen.append(label)
        observation = annual.get((year, key))
        positive = observation['positive'] if observation else 0
        total = totals.get(year, 0)
        features.extend(int(label == value) for value in (*abc_contract.CLASSES, None))
        features.extend([log1p(positive), log1p(10000 * positive / total) if total > 0 else 0,
                         log1p(observation['eligible']) if observation else 0,
                         observation['months'] / 12 if observation else 0])
    return classes_seen, features


def abc_comparison(rows, train, history, inherited, cutoff):
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    abc_contract.require(all(r['partition'] == 'train' and r['target_year'] <= cutoff for r in train)
                         and all(r['feature_year'] >= cutoff for r in rows)
                         and not ({r['product_key'] for r in train} & {r['product_key'] for r in rows}),
                         'ABC training overlaps scoring labels or feature cutoff')
    fallback = abc.majority(train)
    classifier = make_pipeline(StandardScaler(), LogisticRegression(
        class_weight='balanced', C=1, solver='lbfgs', max_iter=1000))
    classifier.fit([abc_features(row, history)[1] for row in train], [r['target_abc'] for r in train])
    abc_contract.require(classifier[-1].n_iter_[0] < 1000, 'ABC logistic did not converge')
    vectors = [abc_features(row, history) for row in rows]
    guesses = classifier.predict([values for _, values in vectors])
    retained_keys = {(r['product_key'], r['target_year']): r['target_abc'] for r in rows}
    cases = list(inherited)
    for model in {case['model_id'] for case in inherited}:
        matching = [case for case in inherited if case['model_id'] == model]
        abc_contract.require(len(matching) == len(rows) and
                             {(c['product_key'], c['target_year']): c['actual'] for c in matching} == retained_keys,
                             'Retained ABC case or actual differs')
    expected = abc.predict_cases(rows, 'prior_abc', fallback)
    abc_contract.require(expected == [c for c in inherited if c['model_id'] == 'prior_abc'],
                         'Retained ABC persistence predictions differ')
    for row, (labels, _), prediction in zip(rows, vectors, guesses):
        for model, guess in zip(ABC_MODELS, (next((c for c in labels if c), fallback), str(prediction))):
            cases.append(dict(stage=row['stage'], model_id=model, product_key=row['product_key'],
                              target_year=row['target_year'], cohort=row['cohort'], actual=row['target_abc'], predicted=guess))
    report = abc.summarize(cases)
    return cases, report


def execute(output, spec):
    inputs = {key: read(ROOT / path) for key, path in FILES.items()}
    hashes = spec['source_hashes']
    company = inputs['company_reference']
    company_values = validate_source(inputs['company_source'], company, hashes['company_source'])
    regional = inputs['regional_reference']
    abc_contract.require(regional['registration_sha256'] == hashes['regional_registration'] and
                         inputs['regional_registration']['source_sha256']['financial.json'] == hashes['regional_source']
                         and regional['source'] == inputs['regional_source']['source'], 'Regional source binding differs')
    regions, eligibility = territorial.prepare(inputs['regional_source'])
    abc_contract.require(len(regional['regions']) == 1 and regional['regions'][0]['region'] == 'CALABARZON',
                         'Unexpected regional forecast scope')
    abc_protocol = abc.load_protocol(ROOT / FILES['abc_protocol'], ROOT / FILES['abc_source'])
    abc_contract.require(inputs['abc_reference']['artifacts']['predictions.json'] == hashes['abc_predictions'],
                         'Retained ABC evidence changed')
    history = abc_history(inputs['abc_source'])
    train = abc.stage_rows(abc_protocol, 'development_train')
    scopes = [('company_PHP', company_values, company, company['protocol']),
              ('CALABARZON_PHP', regions['CALABARZON'], regional['regions'][0], territorial.protocol()['engine'])]
    forecast_points, forecast_scores, forecast_gate, abc_cases, abc_scores = [], [], [], [], []
    for index, (stage, abc_stage) in enumerate(zip(STAGES, ABC_STAGES)):
        if index:
            abc_contract.require((output / 'development-gates.json').is_file(), 'Development decisions must be frozen')
        for scope, series, reference, protocol in scopes:
            incumbents = {r['lead_months']: r['model_id'] for r in reference['selections']}
            points, scores, decisions = forecast_comparison(
                scope, series, reference['predictions'], protocol, stage, (1, 3, 6), incumbents)
            forecast_points.extend(points)
            forecast_scores.extend(scores)
            forecast_gate.extend(decisions)
        rows = abc.stage_rows(abc_protocol, abc_stage)
        refit = train + abc.stage_rows(abc_protocol, 'frozen_refit_train') if index else train
        inherited = [case for case in inputs['abc_predictions'] if case['stage'] == abc_stage]
        cases, report = abc_comparison(rows, refit, history, inherited, 2024 if index else 2023)
        abc_cases.extend(cases)
        abc_scores.extend(report)
        if not index:
            summaries = {r['model_id']: r for r in report if r['cohort'] == 'all'}
            baseline = max(abc.MODELS[:2], key=lambda key: summaries[key]['macro_f1'])
            reference = summaries[baseline]
            decisions = [dict(candidate=model, comparator=baseline, passes=(
                summaries[model]['macro_f1'] >= reference['macro_f1'] + .02 and
                summaries[model]['per_class']['A']['recall'] >= reference['per_class']['A']['recall']))
                for model in ABC_MODELS]
            write(output / 'development-gates.json', dict(PHP=forecast_gate, ABC=decisions))
    unit_points, unit_scores = unit_comparison(inputs['unit_source'], inputs['unit_reference'], hashes['unit_source'])
    write(output / 'cases.json', dict(PHP=forecast_points, ABC=abc_cases, ampoules=unit_points))
    write(output / 'summary.json', dict(status='RETROSPECTIVE_RESEARCH_ONLY', PHP=forecast_scores,
        ABC=abc_scores, ampoules=unit_scores, region_eligibility=eligibility, completed_at=now(),
        registration_sha256=digest(output / 'registration.json'), cases_sha256=digest(output / 'cases.json'),
        gates_sha256=digest(output / 'development-gates.json'), warehouse_writes=0, publication_approved=False))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('register', 'execute'))
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    spec = specification()
    registration = args.output / 'registration.json'
    if args.action == 'register':
        args.output.mkdir(parents=True, exist_ok=False)
        write(registration, dict(registered_at=now(), specification=spec))
    else:
        abc_contract.require(read(registration)['specification'] == spec, 'Registered input/code drift')
        write(args.output / 'started.json', dict(started_at=now(), registration_sha256=digest(registration)))
        execute(args.output, spec)


if __name__ == '__main__':
    main()
