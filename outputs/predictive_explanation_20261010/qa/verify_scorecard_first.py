"""Independent verification of existing predictive presentation evidence.

No builder, model, evaluator, database, or cloud modules are imported.
Reads retained JSON numerics directly as Decimal. Writes only beside this file.
"""
from collections import Counter, defaultdict
from datetime import datetime, timezone
from decimal import Decimal, localcontext
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[3]
OUTPUT = Path(__file__).resolve().parent
PACKET = OUTPUT.parent
SOURCE = ROOT / 'outputs/predictive_completion_20261009/models/fixed-origin-extended/eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a'
INPUT = ROOT / 'outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json'
DECIMAL_TOLERANCE = Decimal('1e-24')
CHECKS = []
METRIC_GROUPS = 0
HASHES = {}


def digest(path):
    raw = path.read_bytes()
    value = hashlib.sha256(raw).hexdigest()
    HASHES[str(path.relative_to(ROOT))] = dict(sha256=value, bytes=len(raw))
    return value


def read(path):
    digest(path)
    return json.loads(path.read_text(encoding='utf-8-sig'), parse_float=Decimal)


def check(name, passed, detail=None):
    entry = dict(check=name, status='PASS' if passed else 'FAIL')
    if detail is not None:
        entry['detail'] = detail
    CHECKS.append(entry)


def month(value):
    year, number = map(int, value.split('-'))
    if not 1 <= number <= 12:
        raise ValueError(value)
    return year * 12 + number - 1


def period(number):
    year, offset = divmod(number, 12)
    return f'{year:04d}-{offset + 1:02d}'


def key(point):
    return tuple(point[name] for name in ('series_id', 'target_name', 'origin_period', 'target_period', 'lead_months'))


def values(points):
    with localcontext() as context:
        context.prec = 80
        actuals = [Decimal(p['actual']) for p in points]
        forecasts = [Decimal(p['prediction']) for p in points]
        errors = [p - a for p, a in zip(forecasts, actuals)]
        n = len(errors)
        denominator = sum(map(abs, actuals), Decimal(0))
        absolute = sum(map(abs, errors), Decimal(0))
        signed = sum(errors, Decimal(0))
        squared = sum((e * e for e in errors), Decimal(0))
        return dict(n=n, mae=absolute / n if n else None,
                    rmse=(squared / n).sqrt() if n else None,
                    bias=signed / n if n else None,
                    wape=100 * absolute / denominator if denominator else None,
                    normalized_bias=100 * signed / denominator if denominator else None,
                    actual_signed_sum_php=sum(actuals, Decimal(0)),
                    actual_absolute_sum_php=denominator,
                    prediction_sum_php=sum(forecasts, Decimal(0)),
                    signed_error_sum_php=signed, absolute_error_sum_php=absolute,
                    squared_error_sum_php_squared=squared,
                    distinct_target_month_count=len({p['target_period'] for p in points}),
                    origin_count=len({p['origin_period'] for p in points}),
                    reason=None if denominator else 'Zero absolute-actual denominator')


def compare_values(name, actual, expected, tolerance=DECIMAL_TOLERANCE):
    differences = {}
    for field, wanted in expected.items():
        got = actual.get(field)
        if wanted is None or isinstance(wanted, (int, str, bool)):
            agrees = got == wanted
        else:
            agrees = got is not None and abs(Decimal(got) - wanted) <= tolerance
        if not agrees:
            differences[field] = dict(expected=wanted, observed=got)
    check(name, not differences, differences or None)


def compare_metrics(name, actual, points):
    global METRIC_GROUPS
    METRIC_GROUPS += 1
    compare_values(name, actual, values(points))


def directional(points):
    errors = [Decimal(p['prediction']) - Decimal(p['actual']) for p in points]
    return dict(overforecast_count=sum(e > 0 for e in errors),
                overforecast_amount_php=sum((e for e in errors if e > 0), Decimal(0)),
                underforecast_count=sum(e < 0 for e in errors),
                underforecast_amount_php=sum((-e for e in errors if e < 0), Decimal(0)),
                exact_count=sum(e == 0 for e in errors))


def formatted(number, places=2):
    return 'Unavailable' if number is None else f'{Decimal(number):,.{places}f}'


def contains_row(markdown, cells):
    return '| ' + ' | '.join(map(str, cells)) + ' |' in markdown


def verify_links(path, selected_lines=None):
    content = path.read_text(encoding='utf-8-sig')
    digest(path)
    for number, line in enumerate(content.splitlines(), 1):
        if selected_lines is not None and not selected_lines(number, line):
            continue
        for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)', line):
            if re.match(r'^[a-z]+://', target, flags=re.I) or target.startswith('#'):
                continue
            target_path = target.strip('<>').split('#', 1)[0]
            check(f'local link {path.relative_to(ROOT)}:{number}:{target_path}',
                  (path.parent / target_path).resolve().is_file())


def main():
    run = read(SOURCE / 'run.json')
    predictions = read(SOURCE / 'predictions.json')
    input_data = read(INPUT)
    hashes = read(SOURCE / 'artifact-hashes.json')
    scorecard = read(PACKET / 'scorecard.json')
    receipt = read(PACKET / 'derivation-receipt.json')
    protocol = read(SOURCE.parent / 'protocol.json')
    markdown = (PACKET / 'SCORECARD.md').read_text(encoding='utf-8-sig')
    digest(PACKET / 'SCORECARD.md')
    for relative, expected in hashes.items():
        check(f'unchanged retained artifact {relative}', digest((SOURCE / relative).resolve()) == expected)
    check('ten retained declarations', len(hashes) == 10)
    check('input sidecar checksum', digest(INPUT) == INPUT.with_suffix('.sha256').read_text().strip().split()[0])
    check('input protocol checksum', digest(INPUT) == protocol['identity']['input_sha256'])
    for name, expected in run['identity']['code_identity']['code_sha256'].items():
        check(f'unchanged model source {name}', digest(ROOT / 'services/analytics_service/predictive' / name) == expected)
    check('prediction copy agreement', run['predictions'] == predictions)
    check('same manifest', run['manifest'] == input_data['manifest'] == scorecard['source']['manifest'])
    check('source run/input/status binding', scorecard['source']['run_id'] == run['run_id']
          and scorecard['source']['raw_input_sha256'] == digest(INPUT)
          and scorecard['source']['normalized_run_input_hash'] == run['identity']['input_hash']
          and scorecard['source']['status'] == run['status'])
    check('unpublished exploratory status', run['status'] == 'exploratory_evaluated_unpublished' and run['publication_approved'] is False)
    check('inherited selection unchanged', scorecard['recorded_selection'] == run['selection']
          and run['selection']['stage'] == 'development_only'
          and run['selection']['audit_previously_inspected'] is True)
    for declaration in receipt['verified_declared_artifacts']:
        check(f'derivation retained hash receipt {declaration.get("path", declaration.get("name", "artifact"))}',
              digest(Path(declaration['path'])) == declaration['verified_sha256'] == declaration['declared_sha256'])
    check('derivation script hash', digest(Path(receipt['derivation_script']['path'])) == receipt['derivation_script']['sha256'])
    check('derivation input hash', digest(Path(receipt['input']['path'])) == receipt['input']['raw_sha256'])
    check('derivation original map hash', digest(Path(receipt['artifact_hash_map']['path'])) == receipt['artifact_hash_map']['sha256'])
    for output in receipt['outputs']:
        check(f'derivation output hash {Path(output["path"]).name}', digest(Path(output['path'])) == output['sha256'])

    configurations = {c['model_id']: c for c in protocol['identity']['protocol']['configurations']}
    expected_families = {name: ('benchmarks' if name in {'last_value', 'seasonal_naive', 'mean_3', 'mean_6'} else config['family'])
                         for name, config in configurations.items()}
    check('21 configuration definitions', len(configurations) == 21)
    check('family counts', dict(Counter(expected_families.values())) == dict(benchmarks=4, ets=2, prophet=9, sarima=2, ridge=4))
    stages = defaultdict(list)
    for point in predictions:
        stages[point['model_id'], point['stage']].append(point)
    check('original stage counts', dict(Counter(p['stage'] for p in predictions)) == dict(development=1260, retrospective_audit=252, future=12))
    actuals = {r['period']: Decimal(r['target_value_decimal']) for r in input_data['rows'] if r.get('target_value_decimal') is not None}
    reference_keys = {}
    original_evaluations = {e['model_id']: e for e in run['evaluations']}
    expected_scores = {}
    metric_fields = ('mae', 'rmse', 'bias', 'wape', 'normalized_bias')
    ranking = scorecard['development_ranking']
    check('all ranking identities exactly once', Counter(r['model_id'] for r in ranking) == Counter(configurations.keys()))
    for item in ranking:
        model = item['model_id']
        check(f'{model} family/config identity', item['family'] == expected_families[model] and item['configuration'] == configurations[model])
        for stage, field, n in (('development', 'development', 60), ('retrospective_audit', 'retrospective_audit', 12)):
            points = stages[model, stage]
            keys = [key(p) for p in points]
            check(f'{model}/{stage} exact unique cohort', len(keys) == len(set(keys)) == n)
            check(f'{model}/{stage} actual calendar leads', all(month(p['target_period']) - month(p['origin_period']) == p['lead_months'] for p in points))
            check(f'{model}/{stage} input actual/unit agreement', all(Decimal(p['actual']) == actuals[p['target_period']]
                  and p['series_id'] == 'company:net_sales:PHP' and p['target_name'] == 'net_sales'
                  and p['unit'] == 'PHP' and p['scope'] == 'company' for p in points))
            if stage not in reference_keys:
                reference_keys[stage] = set(keys)
            check(f'{model}/{stage} identical model cohort', set(keys) == reference_keys[stage])
            compare_metrics(f'{model}/{stage} all aggregate fields', item[field], points)
            expected = values(points)
            original = original_evaluations[model]['development']['common'] if stage == 'development' else original_evaluations[model]['audit']
            compare_values(f'{model}/{stage} original metrics', original, {k: expected[k] for k in metric_fields}, Decimal('0.000001'))
            compare_values(f'{model}/{stage} direction fields', item['development_direction' if stage == 'development' else 'audit_direction'], directional(points))
            expected_scores[model, stage] = expected
        leads = item['development_by_lead']
        check(f'{model} 12 distinct development leads', [l['lead_months'] for l in leads] == list(range(1, 13)))
        for entry in leads:
            points = [p for p in stages[model, 'development'] if p['lead_months'] == entry['lead_months']]
            compare_metrics(f'{model}/lead{entry["lead_months"]} all fields', entry, points)
            check(f'{model}/lead{entry["lead_months"]} n5 support', len(points) == 5)
        origins = item['development_by_origin']
        check(f'{model} exact five origins', [o['origin_period'] for o in origins] == ['2022-12', '2023-03', '2023-06', '2023-09', '2023-12'])
        for entry in origins:
            points = [p for p in stages[model, 'development'] if p['origin_period'] == entry['origin_period']]
            compare_metrics(f'{model}/origin{entry["origin_period"]} all fields', entry, points)
    expected_order = sorted(configurations, key=lambda m: (expected_scores[m, 'development']['wape'], m))
    check('development ranking independently reconstructed', [r['model_id'] for r in ranking] == expected_order
          and [r['rank'] for r in ranking] == list(range(1, 22)))
    ranked_map = {r['model_id']: r for r in ranking}
    representatives = scorecard['family_representatives']
    check('five representatives exactly one per family', [r['family'] for r in representatives] == ['benchmarks', 'ets', 'prophet', 'sarima', 'ridge'])
    for representative in representatives:
        family = representative['family']
        wanted = min((m for m in configurations if expected_families[m] == family), key=lambda m: (expected_scores[m, 'development']['wape'], m))
        check(f'{family} representative chosen by development', representative['model_id'] == wanted and representative == ranked_map[wanted])
    check('last value best complete benchmark and no better challenger', expected_order[0] == 'last_value'
          and all(expected_scores[m, 'development']['wape'] > expected_scores['last_value', 'development']['wape'] for m in expected_order[1:])
          and scorecard['no_challenger_qualifies'] is True)
    for stage, keys in reference_keys.items():
        check(f'{stage} declared shared keys', set(map(tuple, scorecard['shared_calendar_keys'][stage])) == keys)
    baseline = scorecard['baseline']
    check('baseline copies verified ranking fields', all(baseline[k] == v for k, v in ranked_map['last_value'].items()))
    audit = sorted(stages['last_value', 'retrospective_audit'], key=lambda p: p['target_period'])
    check('audit monthly table has exact Jan-Dec2025', [r['target_period'] for r in baseline['audit_months']] == [f'2025-{m:02}' for m in range(1, 13)])
    for point, row in zip(audit, baseline['audit_months']):
        error = Decimal(point['prediction']) - Decimal(point['actual'])
        compare_values(f'audit row {point["target_period"]}', row,
                       dict(target_period=point['target_period'], origin_period='2024-12', lead_months=point['lead_months'],
                            actual_php=Decimal(point['actual']), prediction_php=Decimal(point['prediction']),
                            signed_error_php=error, absolute_error_php=abs(error),
                            direction='overforecast' if error > 0 else 'underforecast' if error < 0 else 'exact'))
        check(f'audit Markdown {point["target_period"]}', contains_row(markdown, [f"{point['target_period']} / {point['lead_months']}",
              formatted(point['actual']), formatted(point['prediction']), formatted(error), formatted(abs(error)),
              'overforecast' if error > 0 else 'underforecast' if error < 0 else 'exact']))
    audit_direction = directional(audit)
    compare_values('audit decomposition independently known totals', audit_direction,
                   dict(overforecast_count=7, overforecast_amount_php=Decimal('42777710.55'),
                        underforecast_count=5, underforecast_amount_php=Decimal('27234885.47'), exact_count=0))
    check('audit decomposition closes signed and absolute sums',
          audit_direction['overforecast_amount_php'] - audit_direction['underforecast_amount_php'] == expected_scores['last_value', 'retrospective_audit']['signed_error_sum_php']
          and audit_direction['overforecast_amount_php'] + audit_direction['underforecast_amount_php'] == expected_scores['last_value', 'retrospective_audit']['absolute_error_sum_php'])
    check('audit last value uses only December2024 constant', {Decimal(p['prediction']) for p in audit} == {actuals['2024-12']})
    check('unsupported audit intervals null', all(b['lower'] is None and b['upper'] is None for p in audit for b in p['intervals'])
          and scorecard['baseline_audit_supported_interval_counts'] == {'0.8': 0, '0.95': 0})
    latest = max(r['period'] for r in input_data['rows'] if r.get('eligible_for_evaluation'))
    check('latest eligible source December2025', latest == '2025-12')
    mappings = scorecard['display_horizon_mapping']
    check('four exact horizon scenarios', [(r['display_start'], r['displayed_months']) for r in mappings]
          == [('2026-10', 3), ('2026-10', 6), ('2026-10', 12), ('2026-12', 12)])
    for row in mappings:
        first = month(row['display_start']) - month(latest)
        last = first + row['displayed_months'] - 1
        compare_values(f'calendar {row["display_start"]}/{row["displayed_months"]}', row,
                       dict(source_origin=latest, display_end=period(month(row['display_start']) + row['displayed_months'] - 1),
                            required_first_lead=first, required_last_lead=last, fully_within_evaluated_leads=(1 <= first <= last <= 12)))
        check(f'calendar evaluated range {row["display_start"]}/{row["displayed_months"]}', row['evaluated_lead_range'] == [1, 12])

    for row in representatives:
        d, a = values(stages[row['model_id'], 'development']), values(stages[row['model_id'], 'retrospective_audit'])
        check(f'family Markdown {row["family"]}', contains_row(markdown, [row['family'], f"`{row['model_id']}`", formatted(d['wape'], 6),
              formatted(d['mae']), formatted(a['wape'], 6), formatted(a['mae'])]))
    for row in ranking:
        d, a = values(stages[row['model_id'], 'development']), values(stages[row['model_id'], 'retrospective_audit'])
        check(f'ranking Markdown {row["model_id"]}', contains_row(markdown, [row['rank'], f"`{row['model_id']}`", row['family'],
              formatted(d['wape'], 6), formatted(d['mae']), formatted(d['rmse']), formatted(d['normalized_bias'], 6)]))
    for row in baseline['development_by_lead']:
        d = values([p for p in stages['last_value', 'development'] if p['lead_months'] == row['lead_months']])
        check(f'lead Markdown {row["lead_months"]}', contains_row(markdown, [row['lead_months'], 5, formatted(d['actual_absolute_sum_php']),
              formatted(d['mae']), formatted(d['rmse']), formatted(d['wape'], 6), formatted(d['normalized_bias'], 6)]))
    for stage, label in [('development', 'Development'), ('retrospective_audit', '2025 retrospective audit')]:
        cohort = stages['last_value', stage]
        d, direction = values(cohort), directional(cohort)
        check(f'{stage} Markdown aggregate', contains_row(markdown, [label, d['n'], formatted(d['mae']),
              formatted(d['rmse']), formatted(d['wape'], 6), formatted(d['bias']), formatted(d['normalized_bias'], 6)]))
        check(f'{stage} Markdown sums', contains_row(markdown, [label, formatted(d['actual_signed_sum_php']),
              formatted(d['actual_absolute_sum_php']), formatted(d['prediction_sum_php']),
              formatted(d['signed_error_sum_php']), formatted(d['absolute_error_sum_php'])]))
        check(f'{stage} Markdown direction', contains_row(markdown, [label, direction['overforecast_count'],
              formatted(direction['overforecast_amount_php']), direction['underforecast_count'],
              formatted(direction['underforecast_amount_php']), direction['exact_count']]))
    for row in mappings:
        check(f'calendar Markdown {row["display_start"]}/{row["displayed_months"]}', contains_row(markdown, [row['label'],
              f"{row['display_start']}–{row['display_end']}", row['displayed_months'],
              f"{row['required_first_lead']}–{row['required_last_lead']}", 'Yes' if row['fully_within_evaluated_leads'] else 'No']))
    verify_links(ROOT / 'docs/logic/PREDICTIVE_ANALYTICS_EXPLAINER.md')
    verify_links(ROOT / 'docs/CHAPTER_3_METHODOLOGY_GUIDE.md', lambda number, line: 84 <= number <= 93)
    verify_links(ROOT / 'docs/CHAPTER_4_5_EVIDENCE_PLAN.md', lambda number, line: 9 <= number <= 22)
    verify_links(ROOT / 'docs/DOCUMENTATION_INDEX.md', lambda number, line: 'PREDICTIVE_OPERATIONS.md' in line or 'PREDICTIVE_ANALYTICS_EXPLAINER.md' in line)
    verify_links(PACKET / 'SCORECARD.md')
    check('explainer formula contract', all(token in (ROOT / 'docs/logic/PREDICTIVE_ANALYTICS_EXPLAINER.md').read_text(encoding='utf-8')
          for token in ('e = ŷ − y', 'SUM(ABS(e)) / n', 'SQRT(SUM(e²) / n)', '100 × SUM(ABS(e)) / SUM(ABS(y))', '100 × SUM(e) / SUM(ABS(y))')))
    digest(Path(__file__))
    result = dict(schema_version='1.0', status='PASS' if all(c['status'] == 'PASS' for c in CHECKS) else 'FAIL',
                  checked_at_utc=datetime.now(timezone.utc).isoformat(), accountable_role='Data Analyst; root applies supporting QA Engineer role',
                  review_mode='Root self-review using a separately authored verifier; root repaired schema/table assertions and executed it. The supporting QA agent did not complete its own verification turn.',
                  check_summary=dict(passed=sum(c['status'] == 'PASS' for c in CHECKS), failed=sum(c['status'] == 'FAIL' for c in CHECKS)),
                  independent_metric_groups=METRIC_GROUPS, decimal_precision=80, decimal_tolerance=str(DECIMAL_TOLERANCE),
                  command=subprocess.list2cmdline(sys.orig_argv), python_executable=sys.executable, python_version=sys.version,
                  source_identity=dict(run_id=run['run_id'], input_sha256=digest(INPUT), fact_delta_version=run['manifest']['fact_delta_version'], dataset_id=run['manifest']['dataset_id']),
                  independently_derived=dict(family_representatives=[r['model_id'] for r in representatives], audit_direction=audit_direction,
                    audit_metrics=expected_scores['last_value', 'retrospective_audit'], development_metrics=expected_scores['last_value', 'development']),
                  file_hashes=HASHES, checks=CHECKS,
                  skills_applied={'.agents/qa-engineer.md': 'Independent numerical expectations, report scope and acceptance boundaries.',
                    '.skills/testing-standards.md': 'Lowest useful document/derivation checks; no application suites for unchanged application.',
                    '.skills/analytics-frameworks.md': 'Same-grain denominators, signed error, paired temporal cohorts and bounded revenue interpretation.'},
                  limits=['No model training, SQL, schema change, publication or application tests.',
                    'Model and cloud correctness inherit identified existing receipts; this check independently verifies presentation derivations.',
                    'Numerical pass does not establish business tolerance, source completeness, historical availability, academic acceptance or operational value.'])
    raw = (json.dumps(result, indent=2, ensure_ascii=False, default=str) + '\n').encode('utf-8')
    (OUTPUT / 'verification.json').write_bytes(raw)
    (OUTPUT / 'verification.sha256').write_text(hashlib.sha256(raw).hexdigest() + '\n', encoding='utf-8')
    print(json.dumps(dict(status=result['status'], check_summary=result['check_summary'], independent_metric_groups=METRIC_GROUPS,
                         failures=[c for c in CHECKS if c['status'] == 'FAIL']), default=str))
    return 0 if result['status'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
