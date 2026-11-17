"""Registered offline buyer-sector and refresh-schedule benchmark assessment.

This deliberately uses the minimal observations required by each unfitted
benchmark. It does not change the trained adapter's contiguous-history policy.
No model is selected, activated, or used to generate future forecasts here.
"""
import argparse
from collections import Counter, defaultdict
import csv
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import platform
import sys

from .contracts import digest, month, period
from .metrics import score
from .models import BENCHMARKS


SCOPES = ('All', 'Government', 'Private', 'Internal')
SECTORS = SCOPES[1:]
MODEL_IDS = ('last_value', 'seasonal_naive', 'mean_3', 'mean_6')
SCHEDULES = ('monthly_rolling', 'annual_fixed')
STAGES = ('development', 'inspected_retrospective')
LEAD_GROUPS = [(f'lead_{lead}', (lead,)) for lead in range(1, 13)] + [
    (f'leads_1_{maximum}', tuple(range(1, maximum + 1))) for maximum in (3, 6, 12)]
PROTOCOL = {
    'version': 'sector-refresh-benchmark-v1',
    'input_start': '2020-01', 'input_end': '2025-12',
    'target_start': '2023-01', 'target_end': '2025-12',
    'development_targets': ['2023-01', '2024-12'],
    'inspected_retrospective_targets': ['2025-01', '2025-12'],
    'scopes': list(SCOPES), 'models': list(MODEL_IDS),
    'schedules': {'monthly_rolling': 'origin = target minus actual lead, leads 1 through 12',
                  'annual_fixed': 'origin = previous December; actual lead is target month number'},
    'benchmark_input_policy': {
        'name': 'minimal-origin-known-calendar-requirements-v1',
        'last_value': 'Requires observed origin only',
        'mean_3': 'Requires origin and preceding 2 exact calendar months',
        'mean_6': 'Requires origin and preceding 5 exact calendar months',
        'seasonal_naive': 'Subtract 12 from target repeatedly until reference <= origin; requires observed reference',
        'adapter_difference': 'Does not apply the trained adapter minimum of 24 contiguous months; this is a separate unfitted benchmark policy',
    },
    'missing_policy': 'Null stays unavailable; never fill a missing sector month with zero',
    'signed_policy': 'Preserve signed net-sales PHP, including negative adjustments',
    'accounting_policy': 'All reconciles observed sector subtotals within PHP 0.01; this does not establish absent-sector actual zero',
    'common_policy': 'Intersect exact origin/target/actual-lead keys across all four models within stage/scope/schedule/lead group',
    'schedule_policy': 'Compare annual fixed versus rolling lead 1 on identical eligible target months; origins and leads intentionally differ',
    'bottom_up_policy': 'Sum all three sector predictions only if all are available; match direct All on exact origin/target/lead',
    'window_policy': 'For complete rolling origin windows of 3/6/12 months within one stage, report sum absolute monthly errors separately from absolute error of the total',
    'metric_policy': 'Shared score: WAPE=100*sum(abs(predicted-actual))/sum(abs(actual)); bias=mean(predicted-actual); zero denominator unavailable',
    'availability_limit': 'Historical extract contains retrospective revisions; vintage-specific source availability is not established',
    'evidence_limit': '2025 outcomes were already inspected. All results are retrospective; there is no untouched holdout or proof of future accuracy',
    'non_goals': ['fitting', 'tuning', 'selection', 'publication', 'future forecasts', 'procurement decisions'],
}


def _timestamp():
    return datetime.now(timezone.utc).isoformat()


def _checked_month(value):
    number = month(value)
    if not 1900 <= int(value[:4]) <= 2200:
        raise ValueError('Nonsensical calendar year')
    return number


def validate_input(data):
    """Return calendar-indexed observations without imputing absent values."""
    if not isinstance(data, dict) or not isinstance(data.get('manifest'), dict) or not data['manifest']:
        raise ValueError('Nonempty manifest source identities required')
    if not isinstance(data.get('rows'), list):
        raise ValueError('Input rows must be a list')
    start, end = month(PROTOCOL['input_start']), month(PROTOCOL['input_end'])
    manifest = data['manifest']
    for field, expected in [('input_period_start', start), ('input_period_end', end),
                            ('period_start', start), ('period_end', end)]:
        if field in manifest and _checked_month(manifest[field]) != expected:
            raise ValueError(f'Manifest {field} disagrees with registered input window')
    for field, expected, is_start in [('source_period_start', start, True), ('source_period_end', end, False)]:
        if field in manifest:
            bound = _checked_month(manifest[field])
            if (is_start and bound > expected) or (not is_start and bound < expected):
                raise ValueError('Manifest source period bounds do not contain input window')
    series = {scope: {} for scope in SCOPES}
    for row in data['rows']:
        if not isinstance(row, dict) or row.get('scope') not in SCOPES:
            raise ValueError('Unknown input scope')
        number = _checked_month(row.get('period'))
        if not start <= number <= end:
            raise ValueError('Observation outside registered input period bounds')
        scope = row['scope']
        if number in series[scope]:
            raise ValueError('Duplicate scope/period input key')
        if 'value' not in row:
            raise ValueError('Missing value field')
        value = row['value']
        if value is not None and (isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value)):
            raise ValueError('Observation must be finite numeric or null')
        series[scope][number] = value
    calendar = set(range(start, end + 1))
    if any(set(values) != calendar for values in series.values()):
        raise ValueError('Input requires every registered calendar month and scope, including explicit nulls')
    for number in calendar:
        observed = [series[scope][number] for scope in SECTORS if series[scope][number] is not None]
        total = series['All'][number]
        if total is not None and (not observed or abs(total - math.fsum(observed)) > 0.01000001):
            raise ValueError(f'All fails observed-sector accounting reconciliation at {period(number)}')
        if total is None and observed:
            raise ValueError(f'All unavailable despite observed sector subtotal at {period(number)}')
    return series


def predict(series, origin, target, model_id):
    """Return prediction, unavailable reason and its exact calendar dependencies."""
    if model_id not in MODEL_IDS:
        raise ValueError('Unknown registered benchmark')
    if target <= origin or not 1 <= target - origin <= 12:
        raise ValueError('Benchmark requires actual calendar lead 1 through 12')
    training = {number: value for number, value in series.items()
                if month(PROTOCOL['input_start']) <= number <= origin}
    if model_id == 'seasonal_naive':
        reference = target
        while reference > origin:
            reference -= 12
        required = [reference]
    else:
        width = {'last_value': 1, 'mean_3': 3, 'mean_6': 6}[model_id]
        required = list(range(origin - width + 1, origin + 1))
    unavailable = [period(number) for number in required if training.get(number) is None]
    if unavailable:
        return None, 'Missing required observed months: ' + ', '.join(unavailable), [period(number) for number in required]
    prediction = math.fsum(training[number] for number in required) / len(required)
    return prediction, None, [period(number) for number in required]


def _key(point):
    return point['origin_period'], point['target_period'], point['lead_months']


def _stage(target):
    return 'development' if target < month('2025-01') else 'inspected_retrospective'


def generate_predictions(series):
    points = []
    for target in range(month(PROTOCOL['target_start']), month(PROTOCOL['target_end']) + 1):
        for schedule in SCHEDULES:
            leads = range(1, 13) if schedule == 'monthly_rolling' else [target % 12 + 1]
            for lead in leads:
                origin = target - lead
                for model in MODEL_IDS:
                    sectors = []
                    for scope in SCOPES:
                        prediction, reason, required = predict(series[scope], origin, target, model)
                        point = dict(stage=_stage(target), scope=scope, schedule=schedule,
                                     origin_period=period(origin), target_period=period(target), lead_months=lead,
                                     model_id=model, actual=series[scope][target], prediction=prediction,
                                     prediction_reason=reason, required_periods=required)
                        points.append(point)
                        if scope in SECTORS:
                            sectors.append(point)
                    missing = [point['scope'] for point in sectors if point['prediction'] is None]
                    points.append(dict(stage=_stage(target), scope='BottomUp', schedule=schedule,
                                       origin_period=period(origin), target_period=period(target), lead_months=lead,
                                       model_id=model, actual=series['All'][target],
                                       prediction=None if missing else math.fsum(point['prediction'] for point in sectors),
                                       prediction_reason='Missing sector predictions: ' + ', '.join(missing) if missing else None,
                                       required_periods=sectors[0]['required_periods'], missing_scopes=missing))
    return points


def _metrics(points):
    return score([(point['actual'], point['prediction']) for point in points])


def _support(points):
    eligible = [point for point in points if point['actual'] is not None and point['prediction'] is not None]
    return dict(planned_count=len(points), prediction_available_count=sum(point['prediction'] is not None for point in points),
                prediction_missing_count=sum(point['prediction'] is None for point in points),
                actual_missing_count=sum(point['actual'] is None for point in points),
                eligible_count=len(eligible), unique_target_count=len({point['target_period'] for point in eligible}),
                missing_prediction_reasons=dict(sorted(Counter(point['prediction_reason'] for point in points
                                                               if point['prediction'] is None).items())),
                native_metrics=_metrics(eligible))


def common_comparisons(points):
    grouped = defaultdict(list)
    for point in points:
        grouped[(point['stage'], point['scope'], point['schedule'])].append(point)
    comparisons = []
    for (stage, scope, schedule), population in sorted(grouped.items()):
        for label, leads in LEAD_GROUPS:
            indexes = {model: {_key(point): point for point in population
                               if point['model_id'] == model and point['lead_months'] in leads}
                       for model in MODEL_IDS}
            eligible = {model: {key for key, point in index.items()
                                if point['actual'] is not None and point['prediction'] is not None}
                        for model, index in indexes.items()}
            common = sorted(set.intersection(*(eligible[model] for model in MODEL_IDS)))
            comparisons.append(dict(stage=stage, scope=scope, schedule=schedule, lead_group=label,
                                    planned_count=len(indexes[MODEL_IDS[0]]),
                                    unique_target_count=len({key[1] for key in common}), common_keys=[list(key) for key in common],
                                    models={model: dict(native_support=_support(list(indexes[model].values())),
                                                        common_metrics=_metrics([indexes[model][key] for key in common]))
                                            for model in MODEL_IDS}))
    return comparisons


def schedule_comparisons(points):
    comparisons = []
    for stage in STAGES:
        for scope in (*SCOPES, 'BottomUp'):
            for model in MODEL_IDS:
                indexes = {schedule: {point['target_period']: point for point in points
                                      if point['stage'] == stage and point['scope'] == scope and point['model_id'] == model
                                      and point['schedule'] == schedule and (schedule == 'annual_fixed' or point['lead_months'] == 1)
                                      and point['actual'] is not None and point['prediction'] is not None}
                           for schedule in SCHEDULES}
                targets = sorted(set(indexes['annual_fixed']) & set(indexes['monthly_rolling']))
                result = dict(stage=stage, scope=scope, model_id=model, target_periods=targets,
                              unique_target_count=len(targets),
                              origin_difference_warning='Same target months, different information sets: annual previous December versus monthly target minus one month')
                for schedule, label in [('annual_fixed', 'annual_fixed'), ('monthly_rolling', 'monthly_rolling_lead_1')]:
                    selected = [indexes[schedule][target] for target in targets]
                    result[label] = dict(metrics=_metrics(selected), keys=[list(_key(point)) for point in selected])
                comparisons.append(result)
    return comparisons


def bottom_up_comparisons(points):
    comparisons = []
    for stage in STAGES:
        for schedule in SCHEDULES:
            for label, leads in LEAD_GROUPS:
                for model in MODEL_IDS:
                    indexes = {scope: {_key(point): point for point in points
                                       if point['stage'] == stage and point['schedule'] == schedule and point['model_id'] == model
                                       and point['scope'] == scope and point['lead_months'] in leads}
                               for scope in ('All', 'BottomUp')}
                    common = sorted(set.intersection(*(set(key for key, point in index.items()
                                                            if point['actual'] is not None and point['prediction'] is not None)
                                                       for index in indexes.values())))
                    gaps = [abs(indexes['All'][key]['prediction'] - indexes['BottomUp'][key]['prediction']) for key in common]
                    comparisons.append(dict(stage=stage, schedule=schedule, lead_group=label, model_id=model,
                                            common_keys=[list(key) for key in common], unique_target_count=len({key[1] for key in common}),
                                            direct_all_metrics=_metrics([indexes['All'][key] for key in common]),
                                            bottom_up_metrics=_metrics([indexes['BottomUp'][key] for key in common]),
                                            direct_all_support=_support(list(indexes['All'].values())),
                                            bottom_up_support=_support(list(indexes['BottomUp'].values())),
                                            max_prediction_gap=max(gaps) if gaps else None,
                                            accounting_tolerance_php=0.01,
                                            linear_additivity_expected='For these linear benchmarks, complete common sector history reproduces direct All within accounting tolerance'))
    return comparisons


def complete_windows(points):
    grouped = defaultdict(dict)
    for point in points:
        if point['schedule'] == 'monthly_rolling':
            grouped[(point['stage'], point['scope'], point['model_id'], point['origin_period'])][point['lead_months']] = point
    windows = []
    for (stage, scope, model, origin), by_lead in sorted(grouped.items()):
        for horizon in (3, 6, 12):
            required = list(range(1, horizon + 1))
            # Only origins whose full target window lies within the same evaluation stage.
            if not all(lead in by_lead for lead in required):
                continue
            selected = [by_lead[lead] for lead in required]
            complete = all(point['actual'] is not None and point['prediction'] is not None for point in selected)
            result = dict(stage=stage, scope=scope, model_id=model, horizon_months=horizon, origin_period=origin,
                          target_periods=[point['target_period'] for point in selected], complete=complete,
                          reason=None if complete else 'Missing actual or prediction in origin horizon',
                          actual_total=None, prediction_total=None, sum_absolute_monthly_errors=None,
                          absolute_total_error=None, signed_total_error=None)
            if complete:
                errors = [point['prediction'] - point['actual'] for point in selected]
                result.update(actual_total=math.fsum(point['actual'] for point in selected),
                              prediction_total=math.fsum(point['prediction'] for point in selected),
                              sum_absolute_monthly_errors=math.fsum(abs(error) for error in errors),
                              absolute_total_error=abs(math.fsum(errors)), signed_total_error=math.fsum(errors))
            windows.append(result)
    return windows


def evaluate(data):
    if tuple(config['model_id'] for config in BENCHMARKS) != MODEL_IDS:
        raise ValueError('Registered four-benchmark grid has changed')
    series = validate_input(data)
    points = generate_predictions(series)
    return dict(status='exploratory_retrospective_only', selection=None, publication_approved=False,
                protocol=PROTOCOL, input_profile={scope: dict(calendar_months=len(values),
                observed_months=sum(value is not None for value in values.values()),
                missing_periods=[period(number) for number, value in sorted(values.items()) if value is None],
                negative_months=sum(value is not None and value < 0 for value in values.values()))
                for scope, values in series.items()}, predictions=points,
                common_comparisons=common_comparisons(points), schedule_comparisons=schedule_comparisons(points),
                bottom_up=bottom_up_comparisons(points), windows=complete_windows(points))


def _read_input(path):
    def invalid_constant(value):
        raise ValueError('Nonfinite JSON constant: ' + value)
    return json.loads(Path(path).read_text(encoding='utf-8-sig'), parse_constant=invalid_constant)


def _sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def _identity(input_path):
    root = Path(__file__).resolve().parent
    return dict(input_sha256=_sha(input_path), input_size_bytes=Path(input_path).stat().st_size,
                protocol_sha256=digest(PROTOCOL),
                runtime=dict(python_version=platform.python_version(), implementation=platform.python_implementation(),
                             executable=str(Path(sys.executable).resolve()), dependencies='Python standard library and hash-bound shared predictive modules'),
                code_sha256={name: _sha(root / name) for name in
                             ('sector_refresh_experiment.py', 'contracts.py', 'metrics.py', 'models.py')})


def _write_json(path, value):
    with Path(path).open('x', encoding='utf-8', newline='\n') as handle:
        json.dump(value, handle, ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False)
        handle.write('\n')


def prepare(input_path, output_dir):
    data = _read_input(input_path)
    validate_input(data)
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    registration = dict(schema_version='1.0', registered_at_utc=_timestamp(),
                        identity=_identity(input_path), protocol=PROTOCOL,
                        source_manifest=data['manifest'],
                        status='registered_before_this_execution; historical_2025_already_inspected')
    _write_json(output / 'registration.json', registration)
    return registration


def _format(value, places=2):
    return 'unavailable' if value is None else f'{value:,.{places}f}'


def report(results):
    lines = ['# Sector and refresh schedule benchmark results', '',
             'Offline historical net-sales PHP benchmark assessment; no fitting, tuning, model selection, activation, or future forecast.', '',
             '2023–2024 is development evidence. 2025 is an already inspected retrospective assessment, not an untouched test. Source vintage and revision availability at historical issue time are not verified.', '',
             'The separate minimal-input benchmark policy is registered in registration.json. Missing stays null; signed adjustments are retained. The trained adapter’s 24 contiguous month requirement is unchanged.', '',
             'Positive bias means overprediction. WAPE uses absolute actual revenue in its denominator and is not 100 minus accuracy. A zero denominator produces unavailable WAPE.', '',
             'Annual fixed means issuing all calendar-year months from the preceding December. Rolling lead 1 updates the issue origin every month. Their matched-target comparison deliberately changes information sets and actual leads.', '',
             '## Matched target months: annual fixed versus monthly rolling lead 1', '',
             '| Stage | Scope | Benchmark | Months | Annual WAPE % | Monthly WAPE % | Annual MAE PHP | Monthly MAE PHP |',
             '|---|---|---|---:|---:|---:|---:|---:|']
    for item in results['schedule_comparisons']:
        annual = item['annual_fixed']['metrics']
        rolling = item['monthly_rolling_lead_1']['metrics']
        lines.append(f"| {item['stage']} | {item['scope']} | {item['model_id']} | {item['unique_target_count']} | {_format(annual['wape'])} | {_format(rolling['wape'])} | {_format(annual['mae'])} | {_format(rolling['mae'])} |")
    lines += ['', '## Support and scope', '',
              'results.json contains every prediction, each model’s native support and missing reasons, and comparisons on common exact origin/target/actual-lead keys for leads 1–12 and lead groups 1–3, 1–6, and 1–12. Unique target counts distinguish repeated leads from independent months.', '',
              'Bottom-up requires all three sector predictions. Its comparisons use the same eligible keys as direct All; absent sector months are never interpreted as zero. These four methods are linear, so complete sector histories are expected to reproduce direct All. An accounting sum of observed sectors does not establish an absent-sector zero.', '',
              'windows distinguishes the sum of absolute monthly errors from the absolute error of an origin’s 3/6/12-month total. Cancellation can make total error smaller without making each month reliable. Windows crossing development/retrospective boundaries are excluded.', '',
              'All values remain candidate historical evidence. No result here proves medicine quantity demand, business acceptance, future accuracy, or procurement benefit.', '']
    return '\n'.join(lines)


def run(input_path, output_dir):
    output = Path(output_dir)
    registration = _read_input(output / 'registration.json')
    current_identity = _identity(input_path)
    if registration.get('identity') != current_identity or registration.get('protocol') != PROTOCOL:
        raise ValueError('Registration identity drift: input, code or protocol changed; use a new registration/output directory')
    filenames = ('results.json', 'PREDICTIONS.csv', 'RESULTS.md', 'artifacthashes.json')
    if any((output / filename).exists() for filename in filenames):
        raise FileExistsError('Evaluation output exists; retained evidence cannot be overwritten')
    data = _read_input(input_path)
    if registration.get('source_manifest') != data['manifest']:
        raise ValueError('Registration source manifest drift')
    results = evaluate(data)
    results.update(identity=current_identity, executed_at_utc=_timestamp(),
                   registration_sha256=_sha(output / 'registration.json'), source_manifest=data['manifest'])
    _write_json(output / 'results.json', results)
    fields = ('stage', 'scope', 'schedule', 'origin_period', 'target_period', 'lead_months', 'model_id',
              'actual', 'prediction', 'prediction_reason', 'required_periods', 'missing_scopes')
    with (output / 'PREDICTIONS.csv').open('x', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for point in results['predictions']:
            writer.writerow({**point, 'required_periods': '|'.join(point['required_periods']),
                             'missing_scopes': '|'.join(point.get('missing_scopes', []))})
    with (output / 'RESULTS.md').open('x', encoding='utf-8', newline='\n') as handle:
        handle.write(report(results))
    _write_json(output / 'artifacthashes.json', dict(created_at_utc=_timestamp(),
                sha256={filename: _sha(output / filename) for filename in
                        ('registration.json', 'results.json', 'PREDICTIONS.csv', 'RESULTS.md')}))
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--prepare', action='store_true', help='Register frozen identities without computing scores')
    args = parser.parse_args()
    if args.prepare:
        registration = prepare(args.input, args.output)
        print(json.dumps(dict(status='registered', identity=registration['identity']), sort_keys=True))
    else:
        results = run(args.input, args.output)
        print(json.dumps(dict(status='evaluated_retrospective_only', predictions=len(results['predictions']),
                              comparisons=len(results['common_comparisons']), windows=len(results['windows'])), sort_keys=True))


if __name__ == '__main__':
    main()
