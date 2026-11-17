"""Reconcile saved original-source backtests without refitting or publishing a model."""
import argparse
import csv
import json
import math
from pathlib import Path
from collections import Counter

from . import original_research as research
from .contracts import digest, month, period
from .engine import select_model


def independent_metrics(points):
    eligible = [point for point in points if point['prediction'] is not None]
    if not eligible:
        return dict(n=0, mae=None, rmse=None, wape=None, bias=None, normalized_bias=None)
    errors = [point['prediction'] - point['actual'] for point in eligible]
    absolute_total = math.fsum(abs(point['actual']) for point in eligible)
    absolute_errors = math.fsum(abs(value) for value in errors)
    return dict(n=len(errors), mae=absolute_errors / len(errors),
                rmse=math.sqrt(math.fsum(value ** 2 for value in errors) / len(errors)),
                wape=100 * absolute_errors / absolute_total if absolute_total else None,
                bias=math.fsum(errors) / len(errors),
                normalized_bias=100 * math.fsum(errors) / absolute_total if absolute_total else None)


def check_metrics(expected, actual):
    for field, value in expected.items():
        if value is None:
            assert actual[field] is None, field
        else:
            assert math.isclose(value, actual[field], rel_tol=1e-12, abs_tol=1e-7), field


def verify(source_path, output):
    source, source_hash = research.read_input(source_path)
    rows = research.source_values(source)
    plan_raw = (output / 'registration.json').read_bytes()
    plan = json.loads(plan_raw)
    assert research.sha(plan_raw) == (output / 'registration.sha256').read_text().strip()
    raw = (output / 'evaluation.json').read_bytes()
    result = json.loads(raw)
    assert research.sha(raw) == (output / 'evaluation.sha256').read_text().strip()
    assert result['registration_sha256'] == result['run_id'] == research.sha(plan_raw)
    assert result['source_sha256'] == plan['source_sha256'] == source_hash
    assert result['source_identity'] == plan['source_identity'] == source['source_identity']
    assert result['code_hashes'] == plan['code_hashes'] == research.code_hashes()
    assert plan['observed_rows'] == rows
    selection_raw = (output / 'selection-before-audit.json').read_bytes()
    assert result['selection_sha256'] == research.sha(selection_raw)
    assert result['selection'] == json.loads(selection_raw)
    actuals = {row['period']: float(row['value_php']) for row in rows if row['value_php'] is not None}
    stage_origins = {'development': plan['schedule']['development_origins'],
                     'retrospective_audit_2025': [plan['schedule']['audit_origin']],
                     'retrospective_extension_2026': [plan['extension_origin']]}
    points = result['predictions']
    expected = {(config['model_id'], stage, origin, lead)
                for config in plan['configurations'] for stage, origins in stage_origins.items()
                for origin in origins for lead in range(1, 10 if stage == 'retrospective_extension_2026' else 13)}
    assert len(points) == len(expected) == 1701
    observed = [(point['model_id'], point['stage'], point['origin_period'], point['lead_months']) for point in points]
    assert len(set(observed)) == len(observed) and set(observed) == expected
    for point in points:
        assert month(point['target_period']) == month(point['origin_period']) + point['lead_months']
        assert point['actual'] == actuals[point['target_period']]
        assert point['run_id'] == result['run_id']
        assert point['scope'] == plan['target']['scope'] and point['unit'] == 'PHP'
        assert point['prediction'] is None or math.isfinite(point['prediction'])
        if point['prediction'] is None:
            assert point['missing_reason']
        for band in point['intervals']:
            assert band['lower'] is None and band['upper'] is None and band['sample_count'] == 0
    fold_keys = set()
    for fold in result['folds']:
        key = (fold['model_id'], fold['stage'], fold['origin'])
        assert key not in fold_keys
        fold_keys.add(key)
        training = [{'period': period(index), 'value': actuals[period(index)]}
                    for index in range(month('2020-01'), month(fold['origin']) + 1)]
        assert fold['training_count'] == len(training)
        assert fold['training_sha256'] == digest(training)
        assert fold['training_start'] == '2020-01' and fold['training_end'] == fold['origin']
        assert fold['future_values_passed_to_adapter'] is False
    assert fold_keys == {(model, stage, origin) for model, stage, origin, _ in expected}
    assert len(result['evaluations']) == 63
    for row in result['evaluations']:
        subset = [point for point in points if point['stage'] == row['stage'] and point['model_id'] == row['model_id']]
        assert row['expected_cases'] == len(subset)
        assert row['complete_for_comparison'] == all(point['prediction'] is not None for point in subset)
        check_metrics(independent_metrics(subset), row['metrics'])
        for lead, metrics in row['by_lead'].items():
            check_metrics(independent_metrics([point for point in subset if point['lead_months'] == int(lead)]), metrics)
    selected, reason, _ = select_model([point for point in points if point['stage'] == 'development'], plan['configurations'])
    assert selected == result['selection']['model_id'] and reason == result['selection']['reason']
    for field in ('warehouse_writes', 'model_pointer_changes', 'future_forecasts_generated'):
        assert result[field] == 0
    assert result['publication_approved'] is False and result['financial_release_approved'] is False
    summary_path = output / 'metrics.csv'
    with summary_path.open('w', newline='', encoding='utf-8') as handle:
        fields = ['stage', 'model_id', 'selected', 'n', 'mae_php', 'rmse_php', 'wape_percent', 'bias_php', 'normalized_bias_percent']
        writer = csv.writer(handle)
        writer.writerow(fields)
        for row in result['evaluations']:
            metrics = row['metrics']
            writer.writerow([row['stage'], row['model_id'], row['model_id'] == selected,
                             *[metrics[key] for key in ('n', 'mae', 'rmse', 'wape', 'bias', 'normalized_bias')]])
    with (output / 'predictions.csv').open('w', newline='', encoding='utf-8') as handle:
        fields = ['stage', 'model_id', 'origin_period', 'target_period', 'lead_months', 'actual', 'prediction', 'unit', 'scope', 'missing_reason']
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(points)
    receipt = dict(status='PASS_ORIGINAL_RESEARCH_RECONCILIATION', source_sha256=source_hash,
                   registration_sha256=result['registration_sha256'], evaluation_sha256=research.sha(raw),
                   points=len(points), folds=len(fold_keys), metric_groups=63,
                   missing_predictions=sum(point['prediction'] is None for point in points),
                   warning_categories=dict(Counter(row['category'] for row in result['warnings'])),
                   checks=['Exact source and frozen code/result hashes', 'All intended model/origin/lead cases unique',
                           'Exact observed targets; training membership and digests',
                           'All aggregate and per-lead errors independently recomputed',
                           'Development-only selection reproduced; later audits cannot select',
                           'No supported intervals or future forecasts; approvals remain false'],
                   limitations=['A saved receipt cannot establish historical issue-time source vintages.',
                                'Mocked boundary tests verify runner input isolation; this is not a second independent fit.'],
                   warehouse_writes=0, publication_approved=False)
    (output / 'verification.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    verify(args.source, args.output)
