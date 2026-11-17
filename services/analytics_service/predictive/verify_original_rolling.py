"""Reconcile rolling research using source targets and independent error arithmetic."""
import argparse
from collections import Counter
import csv
import json
import math
from pathlib import Path

from .contracts import digest, month, period
from .original_research import read_input, source_values, sha
from .original_rolling import runner_hashes, PROTOCOL_SHA256


def independent_score(points):
    pairs = [row for row in points if row['prediction'] is not None]
    if not pairs:
        return dict(n=0, mae=None, rmse=None, wape=None, bias=None, normalized_bias=None)
    errors = [row['prediction'] - row['actual'] for row in pairs]
    denominator = math.fsum(abs(row['actual']) for row in pairs)
    absolute = math.fsum(abs(value) for value in errors)
    return dict(n=len(pairs), mae=absolute / len(pairs),
                rmse=math.sqrt(math.fsum(value * value for value in errors) / len(pairs)),
                wape=100 * absolute / denominator if denominator else None,
                bias=math.fsum(errors) / len(pairs),
                normalized_bias=100 * math.fsum(errors) / denominator if denominator else None)


def same_score(expected, actual):
    for field, value in expected.items():
        if value is None:
            assert actual[field] is None, field
        else:
            assert math.isclose(value, actual[field], rel_tol=1e-12, abs_tol=1e-7), field


def verify(source_path, live_path, output):
    source, source_hash = read_input(source_path)
    live, live_hash = read_input(live_path)
    observed = source_values(source)
    assert source_values(live) == observed
    raw = (output / 'execution-registration.json').read_bytes()
    assert sha(raw) == (output / 'execution-registration.sha256').read_text().strip()
    registration = json.loads(raw)
    assert registration['protocol_sha256'] == PROTOCOL_SHA256
    assert registration['source_sha256'] == source_hash and registration['live_confirmation_sha256'] == live_hash
    assert registration['code_hashes'] == runner_hashes()
    result_raw = (output / 'evaluation.json').read_bytes()
    assert sha(result_raw) == (output / 'evaluation.sha256').read_text().strip()
    report = json.loads(result_raw)
    assert report['run_id'] == report['execution_registration_sha256'] == sha(raw)
    assert report['code_hashes'] == registration['code_hashes']
    assert report['source_identity'] == source['source_identity']
    assert report['source_sha256'] == source_hash and report['live_confirmation_sha256'] == live_hash
    selection_raw = (output / 'selection-before-audits.json').read_bytes()
    assert sha(selection_raw) == report['selection_sha256']
    assert json.loads(selection_raw) == report['selection']
    protocol = registration['protocol']
    models = [row['model_id'] for row in protocol['configurations']]
    cases = protocol['cases']
    actuals = {row['period']: float(row['value_php']) for row in observed if row['value_php'] is not None}
    points = report['predictions']
    expected = {(model, row['stage'], row['origin_period'], row['target_period'], row['lead_months'])
                for model in models for row in cases}
    keys = [(row['model_id'], row['stage'], row['origin_period'], row['target_period'], row['lead_months']) for row in points]
    assert len(points) == len(set(keys)) == len(expected) == 1722 and set(keys) == expected
    for point in points:
        assert point['actual'] == actuals[point['target_period']]
        assert month(point['target_period']) - month(point['origin_period']) == point['lead_months']
        assert point['unit'] == 'PHP' and point['scope'] == protocol['target']['scope']
        assert point['intervals'] == []
        assert point['prediction'] is None or math.isfinite(point['prediction'])
        if point['prediction'] is None:
            assert point['missing_reason']
    fit_keys = []
    for fit in report['fits']:
        fit_keys.append((fit['model_id'], fit['origin_period']))
        assert fit['training_start'] == '2020-01' and fit['training_end'] == fit['origin_period']
        training = [dict(period=period(index), value=actuals[period(index)])
                    for index in range(month('2020-01'), month(fit['origin_period']) + 1)]
        assert fit['training_count'] == len(training) and len(training) >= 36
        assert fit['training_sha256'] == digest(training)
        assert fit['future_values_passed_to_adapter'] is False
    assert len(fit_keys) == len(set(fit_keys)) == 945
    assert set(fit_keys) == {(model, row['origin_period']) for model in models for row in cases}
    assert len(report['fit_uses']) == 987 and sum(row['fit_reused'] for row in report['fit_uses']) == 42
    group_keys = []
    for row in report['metrics']:
        key = row['stage'], row['model_id'], row['lead_months']
        group_keys.append(key)
        subset = [point for point in points if (point['stage'], point['model_id'], point['lead_months']) == key]
        same_score(independent_score(subset), row['metrics'])
        assert row['expected_cases'] == len(subset)
        assert row['complete'] == all(point['prediction'] is not None for point in subset)
    assert len(group_keys) == len(set(group_keys)) == 126
    # Independently apply the predeclared primary/secondary criteria to complete development rows.
    development = {(row['model_id'], row['lead_months']): row for row in report['metrics'] if row['stage'] == 'development'}
    complete = [model for model in models if all(development[(model, lead)]['complete'] for lead in (1, 3))]
    benchmarks = [model for model in ('last_value', 'seasonal_naive', 'mean_3', 'mean_6') if model in complete]
    metric = lambda model, lead: development[(model, lead)]['metrics']
    baseline = min(benchmarks, key=lambda model: (metric(model, 1)['wape'], model))
    b1, b3 = metric(baseline, 1), metric(baseline, 3)
    qualified = []
    for model in complete:
        if model in benchmarks:
            continue
        one, three = metric(model, 1), metric(model, 3)
        if (b1['wape'] > 0 and one['wape'] <= b1['wape'] * .95 and abs(one['normalized_bias']) <= 10
                and one['mae'] <= b1['mae'] * 1.1 and one['rmse'] <= b1['rmse'] * 1.1
                and three['wape'] <= b3['wape'] * 1.1 and three['mae'] <= b3['mae'] * 1.1):
            qualified.append(model)
    selected = min(qualified, key=lambda model: (metric(model, 1)['wape'], model)) if qualified else baseline
    assert report['selection']['model_id'] == selected and report['selection']['best_benchmark'] == baseline
    assert max(row['target_period'] for row in cases if row['stage'] == 'development') <= min(
        row['origin_period'] for row in cases if row['stage'] != 'development')
    assert report['publication_approved'] is False and report['financial_release_approved'] is False
    for field in ('warehouse_writes', 'model_pointer_changes', 'future_forecasts_generated'):
        assert report[field] == 0
    metadata = dict(dataset_id=source['source_identity']['dataset_id'],
                    source_table=source['source_identity']['source_table'], source_delta_version=0,
                    policy_version=source['source_identity']['policy_version'], source_sha256=source_hash,
                    protocol_sha256=PROTOCOL_SHA256, execution_run_id=report['run_id'],
                    contracts_excluded=True, publication_approved=False, financial_release_approved=False)
    csv_fields = ['stage', 'model_id', 'origin_period', 'target_period', 'lead_months', 'actual', 'prediction', 'missing_reason', 'unit', 'scope', *metadata]
    with (output / 'predictions.csv').open('w', newline='', encoding='utf-8') as handle:
        writer = csv.DictWriter(handle, fieldnames=csv_fields, extrasaction='ignore')
        writer.writeheader(); writer.writerows({**point, **metadata} for point in points)
    receipt = dict(status='PASS_ROLLING_RESEARCH_RECONCILIATION', evaluation_sha256=sha(result_raw),
                   execution_registration_sha256=sha(raw), protocol_sha256=PROTOCOL_SHA256,
                   predictions=1722, actual_fits=945, reused_fit_uses=42, metric_groups=126,
                   missing_forecast_cases=sum(row['prediction'] is None for row in points),
                   warnings_by_category=dict(Counter(row['category'] for row in report['warnings'])),
                   development_selection_recomputed=True, selected=selected, benchmark=baseline,
                   source_target_and_training_digest_parity=True, source_sha256=source_hash,
                   current_gold_confirmation_sha256=live_hash, warehouse_writes=0, publication_approved=False,
                   limitations=['Independent metrics/selection reconciliation, not a second independent model fit.',
                                'Historical source vintages and reporting completeness remain unknown.',
                                'Post-inspection retrospective exploration; no untouched holdout or operational approval.'])
    (output / 'verification.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--live-source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    verify(args.source, args.live_source, args.output)
