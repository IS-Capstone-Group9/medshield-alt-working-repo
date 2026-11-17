"""Read-only diagnosis of the frozen one-month mean-six revenue forecast."""
import csv
import hashlib
import json
from collections import defaultdict
from decimal import Decimal
from pathlib import Path


def concentration(rows):
    """Absolute-error shares; undefined for a perfect forecast."""
    ranked = sorted(rows, key=lambda r: r['absolute_error_php'], reverse=True)
    total = sum(r['absolute_error_php'] for r in ranked)
    return {'cases': len(rows), 'absolute_error_php': total,
            'top3_share': sum(r['absolute_error_php'] for r in ranked[:3]) / total if total else None,
            'top5_share': sum(r['absolute_error_php'] for r in ranked[:5]) / total if total else None,
            'signed_error_php': sum(r['signed_error_php'] for r in rows),
            'top_months': [r['target_period'] for r in ranked[:5]]}


def main():
    root = Path(__file__).resolve().parents[3]
    paths = ['outputs/wp4_new_tournament_20261030/results.json',
             'outputs/wp4_forecast_tournament_20261030/source.json',
             'outputs/original_forecast_diagnosis_20261027/input/source.json',
             'outputs/original_so1_20261027/input/source.json']
    tournament, source, diagnosis, areas = [json.loads((root / p).read_text()) for p in paths]
    signals = {r['month']: r for r in diagnosis['signals']}
    company = {r['month']: Decimal(r['net_sales_php']) for r in source['monthly']}
    query = areas['queries']['monthly_control']
    group_rows = query['rows'] if isinstance(query, dict) else query
    grouped = defaultdict(dict)
    for r in group_rows:
        month = r['month'][:7]
        label = r['normalized_area']
        if label in grouped[month]:
            raise ValueError('Duplicate area/month')
        if r['revenue'] is None and int(r['eligible_records']) != 0:
            raise ValueError('Unavailable eligible revenue')
        grouped[month][label] = Decimal(r['revenue'] or '0')
    for month, actual in company.items():
        if month >= '2020-01' and sum(grouped[month].values()) != actual:
            raise ValueError('Group population mismatch: ' + month)
    months = sorted(m for m in company if m >= '2020-01')
    cases, contributions = [], []
    for p in tournament['predictions']:
        if p['model_id'] != 'mean_6' or p['lead_months'] != 1:
            continue
        target, origin = p['target_period'], p['origin_period']
        history = [m for m in months if m <= origin][-6:]
        if len(history) != 6:
            raise ValueError('Insufficient history')
        prediction = sum(company[m] for m in history) / 6
        actual = company[target]
        if abs(prediction - Decimal(str(p['prediction']))) > Decimal('.000001') or abs(actual - Decimal(str(p['actual']))) > Decimal('.000001'):
            raise ValueError('Frozen prediction mismatch')
        error = prediction - actual
        signal = signals[target]
        if Decimal(signal['net_sales_php']) != actual:
            raise ValueError('Signal population mismatch')
        positive = Decimal(signal['positive_net_php'])
        cases.append({'stage': p['stage'], 'origin_period': origin, 'target_period': target,
                      'actual_php': float(actual), 'prediction_php': float(prediction),
                      'signed_error_php': float(error), 'absolute_error_php': float(abs(error)),
                      'positive_net_php': float(positive), 'negative_net_php': float(signal['negative_net_php']),
                      'source_records': int(signal['source_records']),
                      'eligible_dates': len(json.loads(signal['eligible_dates_json'])),
                      'top5_positive_line_share': float(Decimal(signal['top5_positive_net_php']) / positive) if positive else None})
        labels = set(grouped[target]).union(*(set(grouped[m]) for m in history))
        signed_total = Decimal(0)
        for label in sorted(labels):
            group_prediction = sum(grouped[m].get(label, Decimal(0)) for m in history) / 6
            contribution = group_prediction - grouped[target].get(label, Decimal(0))
            signed_total += contribution
            contributions.append({'stage': p['stage'], 'target_period': target, 'raw_area_channel': label,
                                  'signed_error_php': float(contribution), 'absolute_component_php': float(abs(contribution))})
        if abs(signed_total - error) > Decimal('.000001'):
            raise ValueError('Signed attribution mismatch')
    if len(cases) != 30:
        raise ValueError('Expected all 30 frozen cases')
    summaries = {stage: concentration([r for r in cases if r['stage'] == stage]) for stage in sorted({r['stage'] for r in cases})}
    summaries['all'] = concentration(cases)
    by_label = defaultdict(float)
    for r in contributions:
        by_label[r['raw_area_channel']] += r['absolute_component_php']
    output = root / 'outputs/forecast_error_concentration_20261101'
    output.mkdir(exist_ok=True)
    for name, rows in [('cases.csv', sorted(cases, key=lambda r: -r['absolute_error_php'])), ('area_contributions.csv', contributions)]:
        with (output / name).open('w', newline='', encoding='utf-8') as handle:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)
    result = {'status': 'diagnostic_only', 'source_sha256': {p: hashlib.sha256((root / p).read_bytes()).hexdigest() for p in paths},
              'summaries': summaries, 'gross_absolute_components_by_raw_label': dict(sorted(by_label.items(), key=lambda r: -r[1])),
              'checks': {'frozen_cases': 30, 'monthly_group_reconciliations': 81, 'signed_case_reconciliations': 30},
              'limitations': ['Retrospective inspected windows; not untouched evaluation.', 'Signed error = prediction minus actual.',
                              'Absolute group components include cancellation and are not shares of company absolute error.',
                              'Raw area/channel labels are not approved territories.', 'Empty eligible financial row-set contributes zero; not observed zero demand.',
                              'Line concentration is descriptive, not evidence of causation. No rows removed or model changed.']}
    (output / 'results.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result['summaries'], indent=2))


if __name__ == '__main__':
    main()
