"""Stateless offline evaluation profiling and source-bound evidence checks.

This wrapper reuses forecasts within one unit evaluation only. It does not cache
across sources, alter frozen methods, or change model/accuracy selections.
"""
from fractions import Fraction
import gc
import hashlib
import json
import math
from pathlib import Path
import time
import tracemalloc

from . import unit_accuracy_evidence as unit

VERSION = 'offline_unit_origin_reuse_profile_v1'


def encoded(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode('utf-8')


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def evaluate_units_once(monthly):
    """Exact original contract; calculate all methods once per origin and lead."""
    months, values = unit.observed_series(monthly)
    points, metrics, comparisons = [], [], []
    exact = {}
    for lead in unit.LEADS:
        cohort = list(range(11, len(values) - lead))
        if not cohort:
            continue
        actual = [values[origin + lead] for origin in cohort]
        by_origin = {origin: unit.forecasts(values[:origin + 1], lead) for origin in cohort}
        for method in unit.METHODS:
            predicted = [by_origin[origin][method] for origin in cohort]
            errors = [p - a for a, p in zip(actual, predicted)]
            exact[lead, method] = errors
            metrics.append(dict(lead=lead, method=method, **unit.summarize(actual, predicted)))
            for origin, a, p in zip(cohort, actual, predicted):
                points.append(dict(origin=months[origin], target_month=months[origin + lead], lead=lead,
                                   method=method, training_months=origin + 1, actual_ampoules=unit.decimal_string(a),
                                   prediction_ampoules=unit.decimal_string(p), error_ampoules=unit.decimal_string(p - a)))
        for baseline in unit.BASELINES:
            paired = list(zip(exact[lead, unit.CANDIDATE], exact[lead, baseline]))
            delta = sum(abs(a) - abs(b) for a, b in paired) / len(paired)
            baseline_error = sum(abs(b) for _, b in paired)
            comparisons.append(dict(lead=lead, candidate=unit.CANDIDATE, baseline=baseline, cases=len(paired),
                mae_delta_ampoules=unit.decimal_string(delta),
                relative_mae_gain_percent=unit.decimal_string(-100 * delta * len(paired) / baseline_error) if baseline_error else None,
                candidate_wins=sum(abs(a) < abs(b) for a, b in paired),
                candidate_losses=sum(abs(a) > abs(b) for a, b in paired),
                ties=sum(abs(a) == abs(b) for a, b in paired)))
    return dict(status='EXPLORATORY_RETROSPECTIVE_UNIT_COMPARISON', points=points,
                metrics=metrics, paired_comparisons=comparisons, selected_method=None,
                operational_forecasting_approved=False, runtime_changed=False, warehouse_writes=0,
                point_accuracy_promotion_allowed=False,
                limitations=['Previously inspected 18-month retrospective scope; no untouched outcomes.',
                             'Only six lead-one and four lead-three targets in the registered source.',
                             'Signed recorded ampoules in the confirmed two-label HOSPITAL channel, not unconstrained demand.',
                             'No verified geographic generalization, future issue, procurement approval or automatic method selection.'])


def nearest_rank(values, fraction):
    if not values or not 0 < fraction <= 1:
        raise ValueError('Nonempty samples and quantile in (0,1] required')
    return sorted(values)[math.ceil(len(values) * fraction) - 1]


def independent_classification_summary(cases):
    """Separate count/Fraction recomputation,including empty/unsupported classes."""
    if any(row['actual'] not in 'ABC' or row['predicted'] not in 'ABC' for row in cases):
        raise ValueError('Unknown retained ABC class')
    matrix = [[sum(p['actual'] == a and p['predicted'] == b for p in cases) for b in 'ABC'] for a in 'ABC']
    recalls, f1s = [], []
    for i in range(3):
        support, predicted, tp = sum(matrix[i]), sum(row[i] for row in matrix), matrix[i][i]
        if support + predicted:
            f1s.append(Fraction(2 * tp, support + predicted))
        recalls.append(Fraction(tp, support) if support else None)
    return dict(confusion_matrix=matrix, recalls=recalls,
                macro_f1=sum(f1s) / len(f1s) if f1s else None,
                accuracy=Fraction(sum(matrix[i][i] for i in range(3)), len(cases)) if cases else None)


def benchmark_pair(monthly, *, repeats=21, batch_size=50):
    if (isinstance(repeats, bool) or not isinstance(repeats, int) or not 5 <= repeats <= 101
            or isinstance(batch_size, bool) or not isinstance(batch_size, int) or not 1 <= batch_size <= 500):
        raise ValueError('Bounded integer repeat and batch counts required')
    original = unit.evaluate(monthly)
    optimized = evaluate_units_once(monthly)
    if encoded(original) != encoded(optimized):
        raise ValueError('Exact evaluation parity failed before timing')
    expected = hashlib.sha256(encoded(original)).hexdigest()
    methods = {'original': unit.evaluate, 'reuse_once_per_origin': evaluate_units_once}
    for method in methods.values():
        for _ in range(3):
            method(monthly)
    samples = {name: [] for name in methods}
    was_enabled = gc.isenabled()
    try:
        gc.disable()
        for repeat in range(repeats):
            order = list(methods) if repeat % 2 == 0 else list(reversed(methods))
            for name in order:
                wall, cpu = time.perf_counter_ns(), time.process_time_ns()
                for _ in range(batch_size):
                    result = methods[name](monthly)
                cpu_ms = (time.process_time_ns() - cpu) / batch_size / 1e6
                wall_ms = (time.perf_counter_ns() - wall) / batch_size / 1e6
                if hashlib.sha256(encoded(result)).hexdigest() != expected:
                    raise ValueError('Evaluation parity changed during timing')
                samples[name].append(dict(repeat=repeat, first_in_pair=order[0] == name,
                                          wall_ms_per_evaluation=wall_ms, cpu_ms_per_evaluation=cpu_ms))
    finally:
        if was_enabled:
            gc.enable()
    peaks = {name: [] for name in methods}
    for name, method in methods.items():
        for _ in range(5):
            tracemalloc.start()
            try:
                method(monthly)
                _, peak = tracemalloc.get_traced_memory()
                peaks[name].append(peak)
            finally:
                tracemalloc.stop()
    summary = {}
    for name, rows in samples.items():
        wall = [r['wall_ms_per_evaluation'] for r in rows]
        cpu = [r['cpu_ms_per_evaluation'] for r in rows]
        summary[name] = dict(wall_p50_ms=nearest_rank(wall, .5), wall_p95_ms=nearest_rank(wall, .95),
                             cpu_p50_ms=nearest_rank(cpu, .5), cpu_p95_ms=nearest_rank(cpu, .95),
                             traced_peak_bytes_p50=nearest_rank(peaks[name], .5),
                             traced_peak_bytes_max=max(peaks[name]))
    old, new = summary.values()
    passed = new['wall_p50_ms'] < old['wall_p50_ms'] and new['wall_p95_ms'] < old['wall_p95_ms']
    return dict(version=VERSION, exact_parity=True, evaluation_result_sha256=expected,
                repeats=repeats, batch_size=batch_size, samples=samples, memory_peak_samples_bytes=peaks,
                summary=summary, observed_p50_speedup=old['wall_p50_ms'] / new['wall_p50_ms'],
                observed_p95_speedup=old['wall_p95_ms'] / new['wall_p95_ms'],
                measured_improvement=passed, memory_is_python_traced_allocations_not_process_rss=True,
                no_accuracy_gain=True, no_runtime_integration=True,
                timing_scope='Single-process local warmed unit evaluation only; alternating pair order,GC disabled for both; no gateway/model-fitting or production claim')


def audit_prior_evidence(root):
    """Fresh bindings and separate metric arithmetic; prior receipt counts inherited."""
    root = Path(root)
    base = root / 'outputs/client_model_evidence_20261102'
    checks = 0

    def require(ok, message):
        nonlocal checks
        checks += 1
        if not ok:
            raise ValueError(message)

    def load(path):
        return json.loads(path.read_bytes())

    def close(a, b, tolerance=1e-6):
        require(a is None if b is None else a is not None and abs(float(a) - float(b)) <= tolerance,
                'Independent retained metric mismatch')

    cdir, udir, adir = (base / name for name in ('company', 'unit', 'abc'))
    company = load(cdir / 'study/results.json')
    cspec = load(cdir / 'study/protocol.json')['specification']
    for name, expected in {**cspec['inputs'], **cspec['code_sha256']}.items():
        require(sha(root / name) == expected, 'Company input/code/test drift')
    creceipt = load(cdir / 'independent-verification.json')
    require(sha(cdir / 'study/results.json') == creceipt['result_sha256'], 'Company result drift')
    require(sha(cdir / 'study/protocol.json') == creceipt['protocol_sha256'], 'Company protocol drift')
    require(sha(cdir / 'verify_independent.py') == creceipt['verifier_sha256'], 'Company verifier drift')
    for report in company['point_reports']:
        points = [p for p in company['point_predictions'] if p['stage'] == report['stage'] and p['model_id'] == report['model_id']]
        errors = [Fraction(str(p['prediction'])) - Fraction(str(p['actual'])) for p in points]
        denominator = sum(abs(Fraction(str(p['actual']))) for p in points)
        require(len(points) == report['n'], 'Company metric cohort drift')
        close(report['mae'], sum(map(abs, errors)) / len(errors))
        close(report['wape'], 100 * sum(map(abs, errors)) / denominator, 1e-10)
        close(report['normalized_bias'], 100 * sum(errors) / denominator, 1e-10)
    require(company['point_accuracy_improved'] is False and company['publication_approved'] is False, 'Company claim drift')

    uresult, uspec, ureceipt = [load(udir / p) for p in ('study/results.json', 'study/protocol.json', 'verification.json')]
    for path, key in ((root / uspec['source_path'], 'source_sha256'),
                      (root / 'services/analytics_service/unit_accuracy_evidence.py', 'code_sha256'),
                      (root / 'services/analytics_service/jobs/run_unit_accuracy_evidence.py', 'runner_sha256')):
        require(sha(path) == uspec[key], 'Unit source/code drift')
    for path, key in ((udir / 'study/results.json', 'result_sha256'), (udir / 'study/protocol.json', 'protocol_sha256'),
                      (udir / 'verify.py', 'verifier_sha256')):
        require(sha(path) == ureceipt[key], 'Unit retained receipt drift')
    source = load(root / uspec['source_path'])
    original = unit.evaluate(source['research_window'])
    require(all(uresult[key] == value for key, value in original.items()), 'Unit saved/full evaluation parity')
    require(encoded(original) == encoded(evaluate_units_once(source['research_window'])), 'Unit optimized parity')

    abc, aspec, areceipt = [load(adir / p) for p in ('results.json', 'registration.json', 'independent-verification.json')]
    for name, expected in aspec['dependencies'].items():
        require(sha(root / name) == expected, 'ABC dependency drift')
    for name, expected in abc['artifacts'].items():
        require(sha(adir / name) == expected, 'ABC artifact drift')
    require(sha(adir / 'results.json') == areceipt['result_sha256'], 'ABC result drift')
    require(sha(adir / 'registration.json') == abc['registration_sha256'], 'ABC registration drift')
    require(sha(adir / 'verify_independent.py') == areceipt['verifier_sha256'], 'ABC verifier drift')
    cases = load(adir / 'predictions.json')
    for report in abc['scores']:
        selected = [p for p in cases if p['stage'] == report['stage'] and p['model_id'] == report['model_id']
                    and (report['cohort'] == 'all' or p['cohort'] == report['cohort'])]
        require(len(selected) == report['samples'], 'ABC score cohort drift')
        expected = independent_classification_summary(selected)
        require(expected['confusion_matrix'] == report['confusion_matrix'], 'ABC confusion matrix drift')
        for label, recall in zip('ABC', expected['recalls']):
            close(report['per_class'][label]['recall'], recall, 1e-12)
        close(report['macro_f1'], expected['macro_f1'], 1e-12)
        close(report['accuracy'], expected['accuracy'], 1e-12)
    require(abc['runtime_changed'] is False and abc['activation_allowed'] is False and abc['model_publication_approved'] is False, 'ABC claim drift')
    return dict(status='PASS_FRESH_PRIOR_BINDINGS_AND_METRICS', checks=checks,
                studies=['company', 'abc', 'unit'], fresh_scope='All registered input/code/artifact/verifier hashes;company point metrics,ABC75 score rows,unit full exact evaluation and optimized parity',
                inherited_independent_checks=dict(company=creceipt['checks'], abc=areceipt['checks'], unit=ureceipt['checks']),
                inherited_checks_not_rerun=True, no_accuracy_claim=True, warehouse_queried=False)
