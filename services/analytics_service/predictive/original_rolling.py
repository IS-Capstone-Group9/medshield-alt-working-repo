"""Execute the frozen original-itemized monthly-refresh research protocol offline."""
import argparse
from collections import defaultdict
from copy import deepcopy
import csv
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import time
import warnings

from .contracts import month, period, digest
from .engine import package_versions
from .metrics import score
from .models import forecast, BENCHMARKS, CHALLENGERS, EXTENDED_CHALLENGERS
from .original_research import read_input, source_values, sha, write_new, code_hashes

PROTOCOL_SHA256 = '72628dcae4570e17a0903cfc0924adeea272728a0b6a3ed0c0ef69070f50ae2a'
VERSION = 'original_itemized_rolling_execution_v1'
STAGES = ['development', 'retrospective_audit_2025', 'retrospective_extension_2026']


def runner_hashes():
    return {**code_hashes(), 'original_rolling.py': sha(Path(__file__).read_bytes())}


def validate_protocol(protocol):
    if (protocol['status'] != 'PREPARED_NOT_EXECUTED' or protocol['horizons'] != [1, 3]
            or protocol['primary_horizon'] != 1 or protocol['training_start'] != '2020-01'
            or protocol['minimum_contiguous_training_months'] != 36
            or protocol['configurations'] != BENCHMARKS + CHALLENGERS + EXTENDED_CHALLENGERS
            or protocol['audit_label'] != 'post_inspection_retrospective_exploration_not_untouched_holdout'
            or protocol['operational_publication_approved'] is not False
            or protocol['financial_release_approved'] is not False):
        raise ValueError('Frozen rolling method/target/model contract differs')
    cases = protocol['cases']
    expected = {(stage, period(target), lead)
                for stage, start, end in [('development', '2023-03', '2024-10'),
                                          ('retrospective_audit_2025', '2025-01', '2025-12'),
                                          ('retrospective_extension_2026', '2026-01', '2026-09')]
                for target in range(month(start), month(end) + 1) for lead in (1, 3)}
    if len(cases) != 82 or {(row['stage'], row['target_period'], row['lead_months']) for row in cases} != expected:
        raise ValueError('Frozen rolling cases differ')
    for row in cases:
        if month(row['target_period']) - month(row['origin_period']) != row['lead_months']:
            raise ValueError('Forecast origin/lead mismatch')
        if month(row['origin_period']) - month('2020-01') + 1 < 36:
            raise ValueError('Insufficient origin-local history')
    development = [row for row in cases if row['stage'] == 'development']
    audits = [row for row in cases if row['stage'] != 'development']
    if max(row['target_period'] for row in development) > min(row['origin_period'] for row in audits):
        raise ValueError('Development outcomes occur after an audit origin')


def group_scores(points, models):
    result = []
    for stage, expected in [('development', 20), ('retrospective_audit_2025', 12), ('retrospective_extension_2026', 9)]:
        for model in models:
            for lead in (1, 3):
                cohort = [row for row in points if row['stage'] == stage and row['model_id'] == model and row['lead_months'] == lead]
                if len(cohort) != expected:
                    raise ValueError('Missing intended rolling cases')
                pairs = [(row['actual'], row['prediction']) for row in cohort if row['prediction'] is not None]
                result.append(dict(stage=stage, model_id=model, lead_months=lead, expected_cases=expected,
                                   complete=len(pairs) == expected, metrics=score(pairs),
                                   missing_reasons=sorted({row['missing_reason'] for row in cohort if row['missing_reason']})))
    return result


def select_development(points, configurations):
    # This function cannot see either audit. Ranking never pools forecast leads.
    if any(row['stage'] != 'development' for row in points):
        raise ValueError('Selection accepts development cases only')
    models = [config['model_id'] for config in configurations]
    metrics = {}
    for model in models:
        leads = {}
        for lead in (1, 3):
            rows = [row for row in points if row['model_id'] == model and row['lead_months'] == lead]
            if len(rows) != 20 or any(row['prediction'] is None for row in rows):
                break
            leads[lead] = score([(row['actual'], row['prediction']) for row in rows])
        if len(leads) == 2 and all(leads[lead]['wape'] is not None for lead in (1, 3)):
            metrics[model] = leads
    benchmarks = [config['model_id'] for config in BENCHMARKS if config['model_id'] in metrics]
    if not benchmarks:
        raise ValueError('No complete rolling benchmark for both registered leads')
    baseline = min(benchmarks, key=lambda model: (metrics[model][1]['wape'], model))
    base = metrics[baseline]
    assessments = []
    for model in models:
        if model in benchmarks:
            continue
        candidate = metrics.get(model)
        checks = {} if candidate is None else dict(
            primary_wape_gain=base[1]['wape'] > 0 and candidate[1]['wape'] <= base[1]['wape'] * .95,
            primary_bias=abs(candidate[1]['normalized_bias']) <= 10,
            primary_mae=candidate[1]['mae'] <= base[1]['mae'] * 1.1,
            primary_rmse=candidate[1]['rmse'] <= base[1]['rmse'] * 1.1,
            secondary_wape=candidate[3]['wape'] <= base[3]['wape'] * 1.1,
            secondary_mae=candidate[3]['mae'] <= base[3]['mae'] * 1.1)
        assessments.append(dict(model_id=model, complete_at_both_leads=candidate is not None,
                                checks=checks, qualifies=bool(checks) and all(checks.values())))
    qualified = [row['model_id'] for row in assessments if row['qualifies']]
    selected = min(qualified, key=lambda model: (metrics[model][1]['wape'], model)) if qualified else baseline
    return dict(model_id=selected, best_benchmark=baseline, stage='development_only',
                frozen_before_audits=True, primary_horizon=1, secondary_horizon=3,
                tie_breaker='ascending model_id after ascending primary WAPE',
                reason='Qualifying challenger selected' if qualified else 'No challenger qualifies; retain research benchmark',
                assessments=assessments, publication_approved=False)


def prepare(protocol_path, source_path, live_source_path, output):
    raw = protocol_path.read_bytes()
    if sha(raw) != PROTOCOL_SHA256:
        raise ValueError('Prepared protocol byte checksum differs')
    protocol = json.loads(raw)
    validate_protocol(protocol)
    source, source_hash = read_input(source_path)
    live, live_hash = read_input(live_source_path)
    observed = source_values(source)
    source_values(live)
    if (source_hash != protocol['source_sha256'] or protocol['source_identity'] != source['source_identity']
            or live['source_identity'] != source['source_identity'] or live['monthly'] != source['monthly']
            or live['annual'] != source['annual'] or protocol['existing_adapter_code_hashes'] != code_hashes()):
        raise ValueError('Frozen versus fresh Gold source/code identity differs')
    registration = dict(schema_version=VERSION, prepared_at=datetime.now(timezone.utc).isoformat(),
                        protocol=protocol, protocol_sha256=sha(raw), source_sha256=source_hash,
                        live_confirmation_sha256=live_hash, live_confirmation_time=live['extracted_at'],
                        observed_rows=observed, code_hashes=runner_hashes(), packages=package_versions(),
                        training_authority='Explicit user authorization to execute frozen monthly-refresh experiment',
                        selection_interpretation='Research comparison only; retained baseline is not absolute accuracy acceptance.',
                        cache_policy='One deterministic fit per model/origin; reuse only within frozen source/code/config, including shared audit origins.',
                        limitations=['Prepared after prior audit inspection: exploratory retrospective evaluation.',
                                     'Historical issue-time source vintages and full reporting completeness are unavailable.',
                                     'Recorded itemized PHP is not verified SKU demand or complete company sales.',
                                     'Overlapping 3-month leads are dependent; no significance or supported intervals claimed.'],
                        publication_approved=False, financial_release_approved=False)
    output.mkdir(parents=True, exist_ok=True)
    value = write_new(output / 'execution-registration.json', registration)
    (output / 'execution-registration.sha256').write_text(value + '\n')
    print(json.dumps(dict(status='ROLLING_REGISTERED_NOT_FITTED', execution_sha256=value,
                          cases_per_configuration=82, configurations=21)), flush=True)


def run(source_path, live_source_path, output):
    started = time.monotonic()
    raw = (output / 'execution-registration.json').read_bytes()
    if sha(raw) != (output / 'execution-registration.sha256').read_text().strip():
        raise ValueError('Execution registration checksum differs')
    registration = json.loads(raw)
    if registration['code_hashes'] != runner_hashes() or registration['packages'] != package_versions():
        raise ValueError('Registered runner/model code or runtime changed')
    protocol = registration['protocol']
    validate_protocol(protocol)
    source, source_hash = read_input(source_path)
    live, live_hash = read_input(live_source_path)
    if (source_hash != registration['source_sha256'] or live_hash != registration['live_confirmation_sha256']
            or source_values(source) != registration['observed_rows'] or source_values(live) != registration['observed_rows']):
        raise ValueError('Registered source or fresh confirmation changed')
    series = {month(row['period']): float(row['value_php']) for row in registration['observed_rows']
              if row['value_php'] is not None and row['period'] >= protocol['training_start']}
    first = month(protocol['training_start'])
    if set(series) != set(range(first, month('2026-09') + 1)):
        raise ValueError('Noncontiguous original source; no imputation permitted')
    run_id = sha(raw)
    cache, fits, uses, points, captured = {}, [], [], [], []
    selection_hash = None
    for stage in STAGES:
        cases = [row for row in protocol['cases'] if row['stage'] == stage]
        by_origin = defaultdict(list)
        for row in cases:
            by_origin[row['origin_period']].append(row)
        for config in protocol['configurations']:
            model = config['model_id']
            for origin_label, origin_cases in sorted(by_origin.items()):
                origin = month(origin_label)
                training = {index: series[index] for index in range(first, origin + 1)}
                key = (model, origin)
                reused = key in cache
                if not reused:
                    with warnings.catch_warnings(record=True) as seen:
                        warnings.simplefilter('always')
                        try:
                            predictions, reason = forecast(training, origin, protocol['horizons'], config, protocol['seed'])
                        except (ImportError, ValueError, RuntimeError, ArithmeticError) as error:
                            predictions, reason = {}, type(error).__name__ + ': ' + str(error)
                    cache[key] = predictions, reason
                    captured.extend(dict(model_id=model, origin_period=origin_label, category=type(item.message).__name__,
                                         message=str(item.message)) for item in seen)
                    fits.append(dict(model_id=model, origin_period=origin_label, first_stage=stage,
                                     training_start=period(first), training_end=origin_label, training_count=len(training),
                                     training_sha256=digest([dict(period=period(index), value=value) for index, value in sorted(training.items())]),
                                     future_values_passed_to_adapter=False))
                predictions, reason = cache[key]
                uses.append(dict(stage=stage, model_id=model, origin_period=origin_label, fit_reused=reused))
                for case in origin_cases:
                    lead = case['lead_months']
                    prediction = predictions.get(lead)
                    if prediction is not None and not math.isfinite(prediction):
                        raise ValueError('Nonfinite forecast')
                    if prediction is None and not reason:
                        raise ValueError('Missing forecast requires an explicit reason')
                    points.append(dict(**case, model_id=model, run_id=run_id, actual=series[month(case['target_period'])],
                                       prediction=prediction, missing_reason=reason if prediction is None else None,
                                       unit='PHP', scope=protocol['target']['scope'], intervals=[]))
            print(json.dumps(dict(stage=stage, completed_model=model)), flush=True)
        if stage == 'development':
            selection = select_development(points, protocol['configurations'])
            selection_hash = write_new(output / 'selection-before-audits.json', selection)
        elif sha((output / 'selection-before-audits.json').read_bytes()) != selection_hash:
            raise ValueError('Frozen development selection changed after audit')
    models = [config['model_id'] for config in protocol['configurations']]
    metrics = group_scores(points, models)
    # Fixed-origin context uses matching audit target months but different forecast leads.
    context = []
    for stage, year in [('retrospective_audit_2025', 2025), ('retrospective_extension_2026', 2026)]:
        targets = sorted({row['target_period'] for row in points if row['stage'] == stage})
        fixed = series[month(str(year - 1) + '-12')]
        context.append(dict(stage=stage, policy='previous_December_last_value_fixed_for_year',
                            metrics=score([(series[month(target)], fixed) for target in targets]),
                            limitation='Matching target months, different origins/leads: policy context, not identical-horizon model skill.'))
    report = dict(schema_version=VERSION, status='EXPLORATORY_ROLLING_EVALUATED_UNPUBLISHED',
                  run_id=run_id, protocol_sha256=registration['protocol_sha256'], execution_registration_sha256=sha(raw),
                  source_identity=source['source_identity'], source_sha256=source_hash,
                  live_confirmation_sha256=live_hash, selection=selection, selection_sha256=selection_hash,
                  metrics=metrics, predictions=points, fits=fits, fit_uses=uses, warnings=captured,
                  fixed_annual_policy_context=context, code_hashes=registration['code_hashes'], packages=registration['packages'],
                  limitations=registration['limitations'], warehouse_writes=0, model_pointer_changes=0,
                  future_forecasts_generated=0, publication_approved=False, financial_release_approved=False,
                  runtime_seconds=time.monotonic() - started)
    value = write_new(output / 'evaluation.json', report)
    (output / 'evaluation.sha256').write_text(value + '\n')
    with (output / 'metrics.csv').open('x', encoding='utf-8', newline='') as handle:
        writer = csv.writer(handle); writer.writerow(['stage', 'model', 'lead_months', 'expected_cases', 'complete', 'n', 'mae_php', 'rmse_php', 'wape_percent', 'bias_php', 'normalized_bias_percent'])
        for row in metrics:
            writer.writerow([row['stage'], row['model_id'], row['lead_months'], row['expected_cases'], row['complete'],
                             *[row['metrics'][field] for field in ('n', 'mae', 'rmse', 'wape', 'bias', 'normalized_bias')]])
    print(json.dumps(dict(status=report['status'], selected=selection['model_id'], benchmark=selection['best_benchmark'],
                          actual_fits=len(fits), forecast_cases=len(points), evaluation_sha256=value)), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'run'])
    parser.add_argument('--protocol', type=Path)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--live-source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.action == 'prepare':
        if args.protocol is None:
            parser.error('prepare requires --protocol')
        prepare(args.protocol, args.source, args.live_source, args.output)
    else:
        run(args.source, args.live_source, args.output)
