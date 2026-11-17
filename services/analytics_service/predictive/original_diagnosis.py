"""Source-bound error diagnosis and a prepared, unexecuted refresh-policy protocol."""
import argparse
from copy import deepcopy
import csv
from datetime import date
from decimal import Decimal
import hashlib
import json
from pathlib import Path

from .contracts import month, period
from .original_research import read_input, source_values, write_new, code_hashes

EVALUATION_SHA256 = 'ee42ea80960c9954c9ba9e8e84c58e023206d241f0e906ccafd053232d5b8bf5'
D = Decimal


def decimal(value):
    number = D(str(value))
    if not number.is_finite():
        raise ValueError('Nonfinite monetary input')
    return number


def ratio(numerator, denominator):
    return float(numerator / denominator * 100) if denominator else None


def error_summary(points):
    if not points:
        return {'n': 0, 'mae_php': None, 'wape_percent': None, 'bias_php': None}
    errors = [decimal(point['prediction']) - decimal(point['actual']) for point in points]
    absolute = sum(map(abs, errors), D(0))
    actual = sum((abs(decimal(point['actual'])) for point in points), D(0))
    return dict(n=len(points), mae_php=str(absolute / len(points)), wape_percent=ratio(absolute, actual),
                bias_php=str(sum(errors) / len(points)), absolute_error_php=str(absolute),
                signed_error_php=str(sum(errors)), absolute_actual_php=str(actual),
                underprediction_absolute_php=str(sum((-error for error in errors if error < 0), D(0))),
                overprediction_absolute_php=str(sum((error for error in errors if error > 0), D(0))))


def reconcile_signals(monthly, signals):
    expected = {row['month']: row for row in monthly}
    if len(expected) != len(monthly) or len(signals) != len(expected) or {row['month'] for row in signals} != set(expected):
        raise ValueError('Diagnostic month coverage differs')
    rows = []
    seen = set()
    for source in signals:
        name = source['month']
        if name in seen:
            raise ValueError('Duplicate signal month')
        seen.add(name)
        row = deepcopy(source)
        counts = {}
        for field in ('source_records', 'net_eligible_records', 'positive_records', 'negative_records', 'zero_records'):
            number = decimal(source[field])
            if number != int(number) or number < 0:
                raise ValueError('Invalid diagnostic count')
            counts[field] = int(number)
        if any(counts[field] != int(expected[name][field]) for field in ('source_records', 'net_eligible_records')):
            raise ValueError('Diagnostic/source population differs')
        if counts['net_eligible_records'] != sum(counts[field] for field in ('positive_records', 'negative_records', 'zero_records')):
            raise ValueError('Signed source populations do not reconcile')
        positive, negative, net = map(decimal, (source['positive_net_php'], source['negative_net_php'], source['net_sales_php']))
        top5, maximum = map(decimal, (source['top5_positive_net_php'], source['maximum_eligible_line_php']))
        if positive < 0 or negative > 0 or positive + negative != net or net != decimal(expected[name]['net_sales_php']):
            raise ValueError('Signed source money does not reconcile')
        if not D(0) <= top5 <= positive or maximum > top5:
            raise ValueError('Invalid source-line concentration')
        dates = json.loads(source['eligible_dates_json'])
        if not isinstance(dates, list) or dates != sorted(set(dates)) or not dates:
            raise ValueError('Invalid observed source dates')
        if any(date.fromisoformat(value).isoformat() != value or not value.startswith(name + '-') for value in dates):
            raise ValueError('Source dates differ from month')
        row.update(counts)
        row.update(top5_positive_share_percent=ratio(top5, positive),
                   largest_positive_line_share_percent=ratio(maximum, positive),
                   negative_to_positive_percent=ratio(abs(negative), positive),
                   eligible_active_dates=len(dates), first_eligible_date=dates[0], last_eligible_date=dates[-1],
                   ineligible_source_records=counts['source_records'] - counts['net_eligible_records'],
                   completeness='unknown_date_presence_does_not_prove_complete_reporting')
        del row['eligible_dates_json']
        rows.append(row)
    return sorted(rows, key=lambda row: row['month'])


def line_value_decomposition(before, after):
    def totals(rows):
        return (sum(row['positive_records'] for row in rows),
                sum((decimal(row['positive_net_php']) for row in rows), D(0)),
                sum((decimal(row['negative_net_php']) for row in rows), D(0)))
    count_a, positive_a, negative_a = totals(before)
    count_b, positive_b, negative_b = totals(after)
    if not count_a or not count_b:
        raise ValueError('Positive source lines required for decomposition')
    mean_a, mean_b = positive_a / count_a, positive_b / count_b
    count_effect = (count_b - count_a) * (mean_b + mean_a) / 2
    value_effect = (mean_b - mean_a) * (count_b + count_a) / 2
    negative_effect = negative_b - negative_a
    delta = positive_b + negative_b - positive_a - negative_a
    residual = delta - count_effect - value_effect - negative_effect
    if abs(residual) > D('.000001'):
        raise ValueError('Change contributions do not reconcile')
    return dict(before_positive_lines=count_a, after_positive_lines=count_b,
                before_net_php=str(positive_a + negative_a), after_net_php=str(positive_b + negative_b),
                before_mean_php_per_positive_line=str(mean_a), after_mean_php_per_positive_line=str(mean_b),
                signed_net_change_php=str(delta), positive_line_count_contribution_php=str(count_effect),
                mean_php_per_positive_line_contribution_php=str(value_effect),
                negative_adjustment_contribution_php=str(negative_effect), residual_php=str(residual),
                method='symmetric_two_factor_accounting_identity_plus_signed_negative_adjustments',
                interpretation='Recorded source-line count/value contributions; not physical units, prices, causal drivers or complete-company growth.')


def build_report(evaluation, original, diagnostic):
    source_values(original)
    if diagnostic['schema_version'] != 'original_itemized_diagnostic_input_v1' or diagnostic['warehouse_writes'] != 0:
        raise ValueError('Read-only diagnostic source required')
    if diagnostic['source_identity'] != original['source_identity'] or diagnostic['monthly'] != original['monthly']:
        raise ValueError('Fresh diagnostic source differs from frozen experiment')
    if evaluation['source_identity'] != original['source_identity'] or evaluation['selection']['model_id'] != 'last_value':
        raise ValueError('Expected frozen original-source selected benchmark')
    signals = reconcile_signals(original['monthly'], diagnostic['signals'])
    by_month = {row['month']: row for row in signals}
    actuals = {row['month']: decimal(row['net_sales_php']) for row in original['monthly']}
    selected = [point for point in evaluation['predictions'] if point['model_id'] == 'last_value']
    if len(selected) != 81:
        raise ValueError('Expected all selected benchmark cases')
    errors = []
    for point in selected:
        if decimal(point['actual']) != actuals[point['target_period']] or decimal(point['prediction']) != actuals[point['origin_period']]:
            raise ValueError('Saved selected benchmark differs from source/origin')
        signal = by_month[point['target_period']]
        signed = decimal(point['prediction']) - decimal(point['actual'])
        errors.append({**point, 'signed_error_php': str(signed), 'absolute_error_php': str(abs(signed)),
                       'positive_line_count': signal['positive_records'], 'negative_line_count': signal['negative_records'],
                       'top5_positive_share_percent': signal['top5_positive_share_percent'],
                       'eligible_active_dates': signal['eligible_active_dates']})
    stages = {}
    for stage in ('development', 'retrospective_audit_2025', 'retrospective_extension_2026'):
        points = [row for row in errors if row['stage'] == stage]
        summary = error_summary(points)
        total = decimal(summary['absolute_error_php'])
        ranked = sorted(points, key=lambda row: decimal(row['absolute_error_php']), reverse=True)
        top = [{'target_period': row['target_period'], 'origin_period': row['origin_period'],
                'actual_php': str(row['actual']), 'prediction_php': str(row['prediction']),
                'absolute_error_php': row['absolute_error_php'],
                'share_of_window_absolute_error_percent': ratio(decimal(row['absolute_error_php']), total),
                'top5_positive_share_percent': row['top5_positive_share_percent']} for row in ranked[:3]]
        summary.update(top3_cases=top, top3_absolute_error_share_percent=ratio(sum((decimal(row['absolute_error_php']) for row in ranked[:3]), D(0)), total),
                       underpredicted_cases=sum(decimal(row['signed_error_php']) < 0 for row in points),
                       overpredicted_cases=sum(decimal(row['signed_error_php']) > 0 for row in points))
        if stage != 'development':
            signal_rows = [by_month[row['target_period']] for row in points]
            summary.update(fixed_prediction_php=str(points[0]['prediction']),
                           actual_monthly_mean_php=str(sum((decimal(row['actual']) for row in points), D(0)) / len(points)),
                           negative_adjustment_records=sum(row['negative_records'] for row in signal_rows),
                           negative_adjustments_php=str(sum((decimal(row['negative_net_php']) for row in signal_rows), D(0))),
                           net_ineligible_source_records=sum(row['ineligible_source_records'] for row in signal_rows))
        summary['by_lead'] = {str(lead): error_summary([row for row in points if row['lead_months'] == lead])
                              for lead in sorted({row['lead_months'] for row in points})}
        summary['by_lead_band'] = {label: error_summary([row for row in points if low <= row['lead_months'] <= high])
                                   for label, low, high in [('1-3', 1, 3), ('4-6', 4, 6), ('7-12', 7, 12)]}
        stored = next(row for row in evaluation['evaluations'] if row['stage'] == stage and row['model_id'] == 'last_value')['metrics']
        if abs(float(summary['mae_php']) - stored['mae']) > .000001 or abs(summary['wape_percent'] - stored['wape']) > 1e-10:
            raise ValueError('Independent Decimal errors differ from saved evaluation')
        stages[stage] = summary
    before = [row for row in signals if '2025-01' <= row['month'] <= '2025-09']
    after = [row for row in signals if '2026-01' <= row['month'] <= '2026-09']
    return dict(status='DIAGNOSTIC_RESEARCH_NOT_CAUSAL_OR_APPROVAL', source_identity=original['source_identity'],
                stages=stages, comparable_jan_sep_change=line_value_decomposition(before, after),
                monthly_signals=signals, selected_case_errors=errors,
                coverage=dict(observed_months=107, missing_internal_months=[row['period'] for row in source_values(original) if row['value_php'] is None],
                              fitting_segment='2020-01_to_2026-09_contiguous_record_presence',
                              source_completeness='unknown', physical_returns='not_proven_by_negative_amounts'),
                warehouse_writes=0, models_refitted=0, runtime_changed=False, publication_approved=False,
                limitations=['Concentration and level mismatch are descriptive, not verified causes.',
                             'No missing months in fitting segment; this does not prove complete reporting.',
                             'One fixed-origin audit case per lead is not enough to estimate independent horizon skill.',
                             'No sales outliers removed, adjustments relabeled as physical returns, or contracts allocated.'])


def prepare_protocol(source_sha, diagnostic_sha, registration):
    # Earliest 2025 lead-3 audit origin is 2024-10: development actuals must stop there.
    development = [period(index) for index in range(month('2023-03'), month('2024-10') + 1)]
    audit = [period(index) for index in range(month('2025-01'), month('2025-12') + 1)]
    extension = [period(index) for index in range(month('2026-01'), month('2026-09') + 1)]
    cases = [{'stage': stage, 'target_period': target, 'lead_months': lead,
              'origin_period': period(month(target) - lead)}
             for stage, targets in [('development', development), ('retrospective_audit_2025', audit),
                                    ('retrospective_extension_2026', extension)] for target in targets for lead in (1, 3)]
    assert max(month(row['target_period']) for row in cases if row['stage'] == 'development') <= min(
        month(row['origin_period']) for row in cases if row['stage'] != 'development')
    return dict(status='PREPARED_NOT_EXECUTED', schema_version='original_itemized_rolling_refresh_exploration_v1',
                target=registration['target'], source_sha256=source_sha, diagnostic_input_sha256=diagnostic_sha,
                source_identity=registration['source_identity'], existing_adapter_code_hashes=code_hashes(),
                training_start='2020-01', minimum_contiguous_training_months=36,
                horizons=[1, 3], primary_horizon=1, refresh_policy='expanding_history_refit_each_origin_month',
                configurations=deepcopy(registration['configurations']), seed=registration['seed'], cases=cases,
                selection=dict(frozen_before_audits=True, development_actual_cutoff='2024-10',
                               baseline='Best development lead-1 WAPE among four benchmarks, complete at both leads.',
                               challenger='At least 5% relative lead-1 WAPE gain; absolute normalized bias <=10%; lead-1 MAE/RMSE <=1.1x benchmark; lead-3 WAPE/MAE <=1.1x benchmark.',
                               fallback='Retain benchmark as research reference if no challenger qualifies.',
                               no_pooled_horizon_ranking=True),
                missing_policy='No filling; reject noncontiguous origin training or absent targets.',
                leakage_policy='Only months <= origin reach models; learned preprocessing is origin-local; no full-history STL/external features.',
                audit_label='post_inspection_retrospective_exploration_not_untouched_holdout',
                uncertainty='Unavailable pending sufficient lead-specific out-of-fold evidence; no unsupported intervals.',
                future_acceptance='Requires genuinely later source observations and a frozen prospective decision, not these inspected audits.',
                operational_publication_approved=False, financial_release_approved=False, models_fitted=0)


def plot_audits(report, output):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig, axes = plt.subplots(2, 1, figsize=(10, 7), layout='constrained')
    for ax, stage, label in zip(axes, ('retrospective_audit_2025', 'retrospective_extension_2026'), ('2025 audit', 'Jan–Sep 2026 audit')):
        points = [row for row in report['selected_case_errors'] if row['stage'] == stage]
        x = list(range(len(points)))
        ax.plot(x, [float(row['actual']) / 1e6 for row in points], marker='o', color='#335f78', label='Recorded itemized net sales')
        ax.plot(x, [float(row['prediction']) / 1e6 for row in points], linestyle='--', color='#a16d33', label='Frozen last-value prediction')
        ax.set_xticks(x, [row['target_period'] for row in points], rotation=35, ha='right')
        ax.set_ylabel('PHP millions'); ax.set_title(label + ' · contracts excluded', loc='left')
        ax.grid(axis='y', alpha=.2); ax.legend(frameon=False, fontsize=9)
    fig.suptitle('Fixed-origin benchmark level mismatch — retrospective research', fontsize=12)
    fig.savefig(output / 'audit-level-mismatch.png', dpi=160)
    plt.close(fig)


def main(source_path, diagnostic_path, run, output):
    original, source_hash = read_input(source_path)
    diagnostic, diagnostic_hash = read_input(diagnostic_path)
    raw = (run / 'evaluation.json').read_bytes()
    if hashlib.sha256(raw).hexdigest() != EVALUATION_SHA256:
        raise ValueError('Pinned evaluated artifact differs')
    evaluation = json.loads(raw)
    registration_raw = (run / 'registration.json').read_bytes()
    if hashlib.sha256(registration_raw).hexdigest() != evaluation['registration_sha256'] or source_hash != evaluation['source_sha256']:
        raise ValueError('Source/registration differs')
    report = build_report(evaluation, original, diagnostic)
    report.update(source_sha256=source_hash, diagnostic_input_sha256=diagnostic_hash, evaluation_sha256=EVALUATION_SHA256)
    output.mkdir(parents=True, exist_ok=True)
    digest = write_new(output / 'diagnosis.json', report)
    protocol = prepare_protocol(source_hash, diagnostic_hash, json.loads(registration_raw))
    protocol_hash = write_new(output / 'next-experiment-protocol.json', protocol)
    for name, rows, fields in [('selected-errors.csv', report['selected_case_errors'],
                              ['stage', 'origin_period', 'target_period', 'lead_months', 'actual', 'prediction', 'signed_error_php', 'absolute_error_php', 'positive_line_count', 'negative_line_count', 'top5_positive_share_percent', 'eligible_active_dates']),
                             ('monthly-source-signals.csv', report['monthly_signals'], list(report['monthly_signals'][0]))]:
        with (output / name).open('x', encoding='utf-8', newline='') as handle:
            writer = csv.DictWriter(handle, fieldnames=fields, extrasaction='ignore'); writer.writeheader(); writer.writerows(rows)
    plot_audits(report, output)
    print(json.dumps(dict(status='PASS_ORIGINAL_ERROR_DIAGNOSIS', diagnosis_sha256=digest,
                          next_protocol_sha256=protocol_hash, selected_cases=81, reconciled_months=107,
                          next_protocol_cases_per_model=len(protocol['cases']), models_refitted=0, warehouse_writes=0)))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--diagnostic-input', type=Path, required=True)
    parser.add_argument('--run', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    main(args.source, args.diagnostic_input, args.run, args.output)
