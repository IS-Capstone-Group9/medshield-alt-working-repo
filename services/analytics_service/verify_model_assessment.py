"""Verify a paired-prediction scorecard using only the standard library.

Metrics are reconstructed from the CSV. The accompanying aggregate Gold
receipt provides an independent control for the PHP actuals.
"""

import argparse
from collections import defaultdict
import csv
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import hashlib
import json
import math
from pathlib import Path
import re


def require(condition, reason):
    if not condition:
        raise ValueError(reason)


def month(value):
    require(re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', value), 'Invalid calendar month')
    return 12 * int(value[:4]) + int(value[5:]) - 1


def number(text):
    value = Decimal(text)
    require(value.is_finite(), 'Missing/nonfinite numeric value')
    return value


def timestamp(value):
    result = datetime.fromisoformat(value)
    require(result.utcoffset() is not None, 'Timezone-aware cutoff required')
    return result.astimezone(timezone(timedelta(hours=8)))


def check_timing(row, group):
    origin, issue, start, end = (month(row[name]) for name in ('origin', 'issue_month', 'target_start', 'target'))
    require(origin + 1 == issue <= start <= end, 'Invalid origin, issue month or target window')
    if group['track'] == 'T5':
        last_month = 12 if group['complete_year'] else 9
        require(row['target_start'] == f"{group['horizon']}-01" and row['target'] == f"{group['horizon']}-{last_month:02d}",
                'Invalid ABC assessment period')
        require(re.fullmatch(r'[0-9a-f]{64}', row['case_id']), 'Invalid ABC case key')
    else:
        require(end - origin == group['horizon'] and end - issue == group['calendar_lead'], 'Forecast lead changed')
        expected_start = issue if group.get('target_kind') == 'total' else end
        require(start == expected_start and not row['case_id'], 'Incorrect target grain')
    if row['issued_at'] or group['evidence_class'] == 'prospective':
        issued = timestamp(row['issued_at'])
        require(month(issued.strftime('%Y-%m')) == issue and issued.day <= 3, 'Issue outside window')
    if row['feature_latest_at']:
        require(row['issued_at'] and timestamp(row['feature_latest_at']) < timestamp(row['issued_at']),
                'Feature timestamp must precede issue')


def point_metrics(rows, field):
    actual = [number(row['actual']) for row in rows]
    errors = [number(row[field]) - value for row, value in zip(rows, actual)]
    scales = [number(row['seasonal_scale']) if row['seasonal_scale'] else None for row in rows]
    n = len(rows)
    denominator = sum(map(abs, actual))
    absolute_error, signed_error = sum(map(abs, errors)), sum(errors)
    return dict(
        n=n, actual_total=sum(actual), absolute_actual_total=denominator,
        mae=absolute_error / n if n else None,
        rmse=(sum(error ** 2 for error in errors) / n).sqrt() if n else None,
        bias=signed_error / n if n else None,
        wape_percent=100 * absolute_error / denominator if denominator else None,
        normalized_bias_percent=100 * signed_error / denominator if denominator else None,
        mase=sum(abs(error) / scale for error, scale in zip(errors, scales)) / n
        if scales and all(scale is not None and scale > 0 for scale in scales) else None,
        overforecast_share=sum(error > 0 for error in errors) / n if n else None,
        underforecast_share=sum(error < 0 for error in errors) / n if n else None,
    )


def forecast_score(rows):
    candidate, reference = (point_metrics(rows, field) for field in ('forecast', 'reference'))
    wape, ref_wape = candidate['wape_percent'], reference['wape_percent']
    high = sorted(rows, key=lambda row: (-number(row['actual']), row['target']))[:max(1, len(rows) // 4)]
    surge = [row for row in rows if row['target'][5:] in ('06', '07', '08', '09')]
    shift = [row for row in rows if row['target'][:4] in ('2025', '2026')]
    return dict(
        candidate=candidate, reference=reference,
        wape_difference_pp=wape - ref_wape if wape is not None else None,
        relative_wape_reduction_percent=100 * (ref_wape - wape) / ref_wape if ref_wape else None,
        below_15_percent_wape=wape < 15 if wape is not None else None,
        subgroups={label: dict(candidate=point_metrics(part, 'forecast'), reference=point_metrics(part, 'reference'))
                   for label, part in [('top_quartile', high), ('june_september', surge), ('2025_2026', shift)]},
    )


def interval_score(rows, field, nominal):
    width, loss, hits, volume = Decimal(0), Decimal(0), 0, Decimal(0)
    alpha = 1 - Decimal(str(nominal))
    for row in rows:
        actual, lower, upper = (number(row[name]) for name in ('actual', field, field + '_upper'))
        require(lower <= upper, 'Reversed interval bounds')
        width += upper - lower
        hits += lower <= actual <= upper
        volume += abs(actual)
        loss += upper - lower + max(0, lower - actual, actual - upper) * 2 / alpha
    return dict(n=len(rows), coverage=hits / len(rows), mean_width=width / len(rows),
                width_over_actual=width / volume if volume else None, mean_interval_score=loss / len(rows))


def classification_score(rows, field):
    labels = ('A', 'B', 'C')
    counts = [[0] * 3 for _ in labels]
    cold_n = cold_hits = 0
    for row in rows:
        require(row['actual'] in labels and row[field] in labels and row['cold_start'] in ('0', '1'), 'Invalid class')
        a, p = labels.index(row['actual']), labels.index(row[field])
        counts[a][p] += 1
        if a == 0 and row['cold_start'] == '1':
            cold_n += 1
            cold_hits += p == 0
    actual = [sum(row) for row in counts]
    predicted = [sum(col) for col in zip(*counts)]
    f1 = [2 * counts[i][i] / (actual[i] + predicted[i]) if actual[i] + predicted[i] else 0 for i in range(3)]
    return dict(n=len(rows), confusion_matrix=counts, macro_f1=sum(f1) / 3,
                class_a_recall=counts[0][0] / actual[0] if actual[0] else None,
                class_a_precision=counts[0][0] / predicted[0] if predicted[0] else None,
                cold_start_a_recall=cold_hits / cold_n if cold_n else None)


def compare(actual, reported, path):
    if isinstance(actual, dict):
        return sum(compare(value, reported[key], path + '/' + key) for key, value in actual.items())
    if isinstance(actual, (float, Decimal)):
        matches = (isinstance(reported, (int, float)) and not isinstance(reported, bool)
                   and math.isclose(float(actual), reported, rel_tol=1e-12, abs_tol=1e-9))
    else:
        matches = actual == reported
    require(matches, f'Metric mismatch at {path}')
    return 1


def gold_months(receipt, card):
    require(all(card['source_identity'][key] == value for key, value in receipt['source_identity'].items()),
            'Source identity differs from Gold')
    amounts, records, eligible, months = {}, 0, 0, 0
    for series, label, count, included, value in receipt['rows']:
        key = series, month(label)
        require(key not in amounts and 0 <= included <= count and (value is None) == (included == 0), 'Invalid Gold row')
        amounts[key] = number(value) if value is not None else None
        if series == 'company':
            records += count
            eligible += included
            months += 1
    net = sum(amount for (series, _), amount in amounts.items() if series == 'company')
    control = card['source_control']
    require((months, records, eligible, net) == (
        control['source_months'], control['source_records'], control['eligible_records'], number(control['net_php']),
    ), 'Source totals do not reconcile')
    return amounts


def verify(directory):
    registration = (directory / 'registration.json').read_bytes()
    sha = hashlib.sha256(registration).hexdigest()
    card = json.loads((directory / 'scorecard.json').read_bytes())
    require(sha == card['registration_sha256'] == (directory / 'registration.sha256').read_text().strip(),
            'Scorecard registration hash mismatch')
    frozen = json.loads(registration)
    gold_bytes = (directory / 'live-gold.json').read_bytes()
    gold_key = next(key for key in frozen['hashes'] if key.endswith('/live-gold.json'))
    require(hashlib.sha256(gold_bytes).hexdigest() == frozen['hashes'][gold_key], 'Gold receipt changed after registration')
    require(card['source_identity'] == frozen['source_identity'], 'Scorecard source differs from registration')
    gold = gold_months(json.loads(gold_bytes), card)
    by_group = defaultdict(list)
    with (directory / 'paired_predictions.csv').open(encoding='utf-8', newline='') as handle:
        for row in csv.DictReader(handle):
            by_group[row['group']].append(row)
    groups = card['groups']
    row_count = sum(map(len, by_group.values()))
    require(set(by_group) == set(groups) and row_count == card['paired_case_rows'], 'Missing or unexpected case groups')
    compared, cohorts = 0, {}
    for key, rows in by_group.items():
        group = groups[key]
        track = group['track']
        require(group['evidence_class'] == frozen['evidence_class'], 'Evidence class differs from registration')
        paired_keys = {}
        for row in rows:
            check_timing(row, group)
            case = (row['case_id'], row['target'])
            require(case not in paired_keys, 'Duplicate assessment case')
            paired_keys[case] = (row['origin'], row['target_start'], row['actual'], row['reference'],
                                 row['reference_upper'], row['cold_start'], row['seasonal_scale'])
            if group['model'] == group['reference_model']:
                require(row['forecast'] == row['reference'], 'Baseline predictions differ from their reference')
            if track in ('T1', 'T2', 'T4'):
                start, end = month(row['target_start']), month(row['target'])
                volume = [gold.get((group['series'], period)) for period in range(start, end + 1)]
                require(all(value is not None for value in volume), 'Missing Gold target month')
                require(abs(sum(volume) - number(row['actual'])) < Decimal('.005'), 'Case actual differs from Gold')
        cohort = (track, group['series'], group['horizon'], group['cohort'])
        require(cohorts.setdefault(cohort, paired_keys) == paired_keys, 'Unmatched cases or references')
        if track == 'T4':
            computed = {key: interval_score(rows, field, group['nominal'])
                        for key, field in [('candidate', 'forecast'), ('reference', 'reference')]}
            computed['within_nominal_band'] = abs(computed['candidate']['coverage'] - group['nominal']) <= .05
            computed['no_wider_than_reference'] = computed['candidate']['mean_width'] <= computed['reference']['mean_width']
        elif track == 'T5':
            computed = {key: classification_score(rows, field)
                        for key, field in [('candidate', 'forecast'), ('reference', 'reference')]}
            computed['macro_f1_delta'] = computed['candidate']['macro_f1'] - computed['reference']['macro_f1']
        else:
            computed = forecast_score(rows)
        if group['evidence_class'] == 'inspected retrospective':
            computed['verdict'] = 'not yet verifiable'
        compared += compare(computed, group, key)
    return dict(status='pass', registration_sha256=sha, paired_rows=row_count,
                checked_groups=len(groups), metric_checks=compared, gold_control=card['source_control'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    args = parser.parse_args()
    print(json.dumps(verify(args.directory), indent=2))
