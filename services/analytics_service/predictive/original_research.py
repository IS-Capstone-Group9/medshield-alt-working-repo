"""Frozen original-itemized PHP backtests; no operational publication or data fallback."""
import argparse
from copy import deepcopy
from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import json
import math
from pathlib import Path
import time
import warnings

from .contracts import digest, month, period
from .engine import CRITERIA, DEFAULT_SCHEDULE, evaluate_fold, package_versions, select_model, validate_schedule
from .metrics import compare, score
from .models import BENCHMARKS, CHALLENGERS, EXTENDED_CHALLENGERS

VERSION = 'original_itemized_monthly_php_retrospective_v1'
DATASET = 'e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10'
BATCH = 'original_fd95b9e3abab028c8e41'
SOURCE_TABLE = 'workspace.medshield_original_gold_20261026.' + BATCH + '_itemized_candidates'
MONTHLY_HASH = '9d087afd9dce2ee41da1701d34cbb0083d92d5b5b24dc8aac6471d83e5ed8d0e'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def write_new(path, data):
    raw = (json.dumps(data, indent=2, sort_keys=True, allow_nan=False) + '\n').encode('utf-8')
    with path.open('xb') as output:
        output.write(raw)
    return sha(raw)


def read_input(path):
    raw = path.read_bytes()
    if sha(raw) != path.with_suffix('.sha256').read_text().strip():
        raise ValueError('Frozen source checksum differs')
    return json.loads(raw), sha(raw)


def source_values(data):
    source = data['source_identity']
    expected = {'batch_id': BATCH, 'dataset_id': DATASET, 'policy_version': 'original_source_layers_v1_candidate_only',
                'source_table': SOURCE_TABLE, 'delta_version': 0,
                'receipt_sha256': 'd69414d3bb72c706bba30f24489074e4677f403277e18c64bb8d2e643b0012dd',
                'source_keys_sha256': 'da74cc50c67e22fd33928f5ca3faaebc3e21a6e1b76f7f169829bf6515d8c580',
                'contracts_excluded': True, 'financial_release_approved': False, 'unit_approval': False, 'forecast_approval': False}
    if (data.get('schema_version') != 'original_itemized_forecast_input_v1' or data.get('source') != 'databricks'
            or data.get('warehouse_writes') != 0 or any(source.get(key) != value for key, value in expected.items())
            or data.get('contracts_excluded') is not True or data.get('model_publication_approved') is not False
            or data.get('financial_release_approved') is not False):
        raise ValueError('Expected read-only pinned original itemized source with independent false approvals')
    monthly, annual = data['monthly'], data['annual']
    if len(monthly) != 107 or len({row['month'] for row in monthly}) != 107 or len(annual) != 10:
        raise ValueError('Unexpected original monthly/annual coverage')
    if [row['month'] for row in monthly] != sorted(row['month'] for row in monthly):
        raise ValueError('Monthly source must be ordered')
    normalized = []
    for row in monthly:
        month(row['month'])
        values = [row['month']]
        for field in ('source_records', 'net_eligible_records'):
            value = Decimal(row[field])
            if not value.is_finite() or value != int(value) or value < 0:
                raise ValueError('Invalid source count')
            values.append(str(int(value)))
        if int(row['source_records']) <= 0 or int(row['net_eligible_records']) > int(row['source_records']):
            raise ValueError('Invalid eligible source population')
        for field in ('net_sales_php', 'supported_gross_profit_php', 'matching_margin_revenue_php'):
            value = Decimal(row[field])
            if not value.is_finite() or value != value.quantize(Decimal('.000001')):
                raise ValueError('Invalid exact monthly amount')
            values.append(format(value, '.6f'))
        normalized.append(values)
    actual_hash = sha(json.dumps(normalized, separators=(',', ':'), ensure_ascii=False).encode())
    if actual_hash != MONTHLY_HASH or data['monthly_logical_sha256'] != MONTHLY_HASH:
        raise ValueError('Monthly source differs from the verified original Gold values')
    if len({row['year'] for row in annual}) != 10:
        raise ValueError('Duplicate annual controls')
    for row in annual:
        subset = [item for item in monthly if item['month'].startswith(row['year'] + '-')]
        for field in ('source_records', 'net_eligible_records', 'net_sales_php', 'supported_gross_profit_php', 'matching_margin_revenue_php'):
            if sum((Decimal(item[field]) for item in subset), Decimal(0)) != Decimal(row[field]):
                raise ValueError('Monthly/annual source control differs')
    for field, expected_value in {'source_records': '40171', 'net_eligible_records': '39286',
                                  'net_sales_php': '638015351.530000', 'supported_gross_profit_php': '334666271.550000',
                                  'matching_margin_revenue_php': '566954921.920000'}.items():
        if sum((Decimal(row[field]) for row in monthly), Decimal(0)) != Decimal(expected_value):
            raise ValueError('Full source controls differ')
    observed = {row['month']: row['net_sales_php'] for row in monthly}
    return [{'period': period(index), 'value_php': observed.get(period(index)),
             'coverage': 'record_presence_not_verified_reporting_completeness'}
            for index in range(month('2017-01'), month('2026-09') + 1)]


def code_hashes():
    return {name: sha(Path(__file__).with_name(name).read_bytes())
            for name in ('original_research.py', 'contracts.py', 'engine.py', 'models.py', 'metrics.py')}


def prepare(source_path, output):
    data, source_hash = read_input(source_path)
    observed = source_values(data)
    schedule = deepcopy(DEFAULT_SCHEDULE)
    validate_schedule(schedule)
    configs = deepcopy(BENCHMARKS + CHALLENGERS + EXTENDED_CHALLENGERS)
    if len(configs) != 21 or len({config['model_id'] for config in configs}) != 21:
        raise ValueError('Existing 21-model grid changed')
    plan = {'schema_version': VERSION, 'prepared_at': datetime.now(timezone.utc).isoformat(),
            'source_sha256': source_hash, 'source_identity': data['source_identity'], 'monthly_logical_sha256': MONTHLY_HASH,
            'target': {'name': 'net_sales', 'unit': 'PHP', 'grain': 'month', 'buyers': 'all',
                       'scope': 'original_itemized_sales_contracts_excluded_not_complete_company'},
            'schedule': schedule, 'extension_origin': '2025-12', 'extension_end': '2026-09',
            'configurations': configs, 'criteria': deepcopy(CRITERIA), 'selection': 'development_only_frozen_before_retrospective_audits',
            'seed': 20260927, 'code_hashes': code_hashes(), 'packages': package_versions(), 'observed_rows': observed,
            'training_authority': 'explicit_current_user_request_for_offline_original_itemized_research',
            'publication_approved': False, 'source_completeness': 'unknown',
            'limitations': ['Revised snapshot; historical issue-time vintages are unavailable.',
                            'Previously inspected 2025/2026 dates: retrospective audit, never an untouched holdout.',
                            'No external regressors or full-history STL features; all learning is origin-local.',
                            'Signed original net values retained; internal gaps are null and never imputed.',
                            'Observed monthly record presence does not prove complete company reporting.',
                            'Itemized monetary sales are not medicine demand or approved SKU quantities.',
                            'Overlapping development origins are dependent; no independent significance or calibrated interval claim.',
                            'No forecast or financial approval, warehouse write or operational activation.']}
    output.mkdir(parents=True, exist_ok=True)
    registration = write_new(output / 'registration.json', plan)
    (output / 'registration.sha256').write_text(registration + '\n')
    print(json.dumps({'status': 'PREPARED_NOT_FITTED', 'registration_sha256': registration, 'models': len(configs)}), flush=True)


def run(source_path, output):
    started = time.monotonic()
    raw = (output / 'registration.json').read_bytes()
    if sha(raw) != (output / 'registration.sha256').read_text().strip():
        raise ValueError('Registration checksum differs')
    plan = json.loads(raw)
    if plan['schema_version'] != VERSION or code_hashes() != plan['code_hashes'] or package_versions() != plan['packages']:
        raise ValueError('Frozen protocol/code/runtime differs')
    source, source_hash = read_input(source_path)
    if source_hash != plan['source_sha256'] or source_values(source) != plan['observed_rows']:
        raise ValueError('Registered source values changed')
    validate_schedule(plan['schedule'])
    first, end = month(plan['schedule']['training_start']), month(plan['extension_end'])
    series = {month(row['period']): float(Decimal(row['value_php'])) for row in plan['observed_rows']
              if row['value_php'] is not None and month(row['period']) >= first}
    if set(series) != set(range(first, end + 1)):
        raise ValueError('Contiguous original monthly history required; missing values are not filled')
    predictions, folds, captured = [], [], []
    run_id = sha(raw)

    def fit(config, origin, stage, leads):
        # Only origin-available values reach forecasting code. Actuals are appended for scoring afterward.
        training = {index: series[index] for index in range(first, origin + 1)}
        with warnings.catch_warnings(record=True) as seen:
            warnings.simplefilter('always')
            points = evaluate_fold(training, 'original_itemized_all_buyers_php', origin, config, run_id, [], stage, plan['seed'])
        captured.extend({'model_id': config['model_id'], 'origin': period(origin), 'stage': stage,
                         'category': type(item.message).__name__, 'message': str(item.message)} for item in seen)
        kept = [point for point in points if point['lead_months'] in leads]
        for point in kept:
            point['actual'] = series[month(point['target_period'])]
            point['scope'] = plan['target']['scope']
            if point['prediction'] is not None and not math.isfinite(point['prediction']):
                raise ValueError('Nonfinite forecast')
            if any(band['lower'] is not None or band['upper'] is not None for band in point['intervals']):
                raise ValueError('Unsupported intervals must remain unavailable')
        folds.append({'model_id': config['model_id'], 'origin': period(origin), 'stage': stage,
                      'training_start': period(first), 'training_end': period(origin), 'training_count': len(training),
                      'training_sha256': digest([{'period': period(index), 'value': value} for index, value in sorted(training.items())]),
                      'actual_leads': leads, 'future_values_passed_to_adapter': False})
        predictions.extend(kept)

    configs = plan['configurations']
    for config in configs:
        for origin in plan['schedule']['development_origins']:
            fit(config, month(origin), 'development', list(range(1, 13)))
        print(json.dumps({'stage': 'development', 'completed_model': config['model_id']}), flush=True)
    chosen, reason, comparisons = select_model(predictions, configs)
    selection = {'model_id': chosen, 'reason': reason, 'criteria': plan['criteria'],
                 'stage': 'development_only', 'frozen_before_audit': True, 'comparisons': comparisons}
    selection_hash = write_new(output / 'selection-before-audit.json', selection)
    for config in configs:
        fit(config, month(plan['schedule']['audit_origin']), 'retrospective_audit_2025', list(range(1, 13)))
        fit(config, month(plan['extension_origin']), 'retrospective_extension_2026', list(range(1, 10)))
        print(json.dumps({'stage': 'retrospective_audits', 'completed_model': config['model_id']}), flush=True)
    if sha((output / 'selection-before-audit.json').read_bytes()) != selection_hash:
        raise ValueError('Selection changed after audit')
    evaluations, paired = [], {}
    for stage, expected in [('development', 60), ('retrospective_audit_2025', 12), ('retrospective_extension_2026', 9)]:
        stage_points = [point for point in predictions if point['stage'] == stage]
        complete = []
        for config in configs:
            model_points = [point for point in stage_points if point['model_id'] == config['model_id']]
            if len(model_points) != expected:
                raise ValueError('Missing intended forecast cases')
            pairs = [(point['actual'], point['prediction']) for point in model_points if point['prediction'] is not None]
            if len(pairs) == expected:
                complete.append(config['model_id'])
            by_lead = {str(lead): score([(point['actual'], point['prediction']) for point in model_points
                                       if point['lead_months'] == lead and point['prediction'] is not None])
                       for lead in sorted({point['lead_months'] for point in model_points})}
            evaluations.append({'stage': stage, 'model_id': config['model_id'], 'expected_cases': expected,
                                'complete_for_comparison': len(pairs) == expected, 'metrics': score(pairs), 'by_lead': by_lead,
                                'missing_reasons': sorted({point['missing_reason'] for point in model_points if point['missing_reason']})})
        paired[stage] = compare(stage_points, complete)
    report = {'schema_version': VERSION, 'run_id': run_id, 'status': 'evaluated_unpublished',
              'source_identity': plan['source_identity'], 'source_sha256': plan['source_sha256'], 'monthly_logical_sha256': MONTHLY_HASH,
              'registration_sha256': sha(raw), 'selection_sha256': selection_hash, 'target': plan['target'], 'schedule': plan['schedule'],
              'selection': selection, 'evaluations': evaluations, 'paired_complete_model_comparisons': paired,
              'predictions': predictions, 'folds': folds, 'warnings': captured,
              'limitations': plan['limitations'], 'packages': plan['packages'], 'code_hashes': plan['code_hashes'],
              'evaluation_cases_per_model': 81, 'future_forecasts_generated': 0,
              'publication_approved': False, 'financial_release_approved': False,
              'warehouse_writes': 0, 'model_pointer_changes': 0, 'runtime_seconds': time.monotonic() - started}
    result_hash = write_new(output / 'evaluation.json', report)
    (output / 'evaluation.sha256').write_text(result_hash + '\n')
    print(json.dumps({'status': report['status'], 'run_id': run_id, 'selected': chosen,
                      'prediction_rows': len(predictions), 'result_sha256': result_hash}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'run'])
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    (prepare if args.action == 'prepare' else run)(args.source, args.output)
