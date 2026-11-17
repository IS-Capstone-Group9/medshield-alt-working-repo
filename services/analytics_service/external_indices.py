"""Offline DII/RSI under modeled publication lag; revised data are not vintages."""
import argparse
import calendar
import json
import math
from datetime import date, timedelta
from pathlib import Path
from statistics import mean, median, pstdev

from .predictive.contracts import month

POLICY_VERSION = 'external_indices_asof_v1_candidate_only'


def month_close(period):
    month(period)
    year, number = map(int, period.split('-'))
    return date(year, number, calendar.monthrange(year, number)[1])


def external_index(rows, *, provider, signal, territory, feature_period, origin_period,
                   dataset_id, policy_version, issue_date=None, training_start='2017-01', epsilon=1e-9):
    """Reference statistics use issue-available training months through origin.

    DOH becomes available 15 days after close; weather at close. A supplied
    available_on can only delay availability. This is an assumed availability
    policy, not verification of historical publication dates or data vintages.
    """
    if provider not in ('DOH', 'PAGASA', 'NASA POWER') or not dataset_id or not policy_version:
        raise ValueError('Provider and source dataset/policy identities are required')
    if provider != 'DOH' and signal != 'Rainfall':
        raise ValueError('RSI requires rainfall')
    origin, feature, start = map(month, (origin_period, feature_period, training_start))
    if start > origin or not math.isfinite(epsilon) or epsilon <= 0:
        raise ValueError('Invalid training window or RSI epsilon')
    issue = date.fromisoformat(issue_date) if isinstance(issue_date, str) else issue_date or month_close(origin_period)
    if not isinstance(issue, date) or issue < month_close(origin_period):
        raise ValueError('Issue date must be on or after origin month close')
    result = dict(index='DII' if provider == 'DOH' else 'RSI', value=None, provider=provider,
                  signal=signal, territory=territory, feature_period=feature_period,
                  origin_period=origin_period, issue_date=issue.isoformat(), dataset_id=dataset_id,
                  policy_version=policy_version, feature_policy_version=POLICY_VERSION,
                  evidence_label='Derived', source_evidence_label='Proxy' if provider == 'NASA POWER' else 'Observed',
                  availability_evidence_label='Assumed', historical_vintages_verified=False,
                  baseline_count=0, baseline_mean=None, baseline_sd=None, baseline_median=None, reason=None)
    if feature > origin:
        return dict(result, reason='Feature is after forecast origin')
    available, seen = {}, set()
    for row in rows:
        if (row.get('provider'), row.get('signal'), row.get('territory')) != (provider, signal, territory):
            continue
        p = month(row['period'])
        if not start <= p <= origin:
            continue
        if p in seen:
            raise ValueError('Duplicate provider/signal/territory/month observation')
        seen.add(p)
        value = row.get('value')
        if value is None:
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
            raise ValueError('External values must be finite nonnegative numbers or null')
        release = month_close(row['period']) + timedelta(days=15 if provider == 'DOH' else 0)
        if row.get('available_on'):
            release = max(release, date.fromisoformat(row['available_on']))
        if release <= issue:
            available[p] = value
    if feature not in available:
        return dict(result, reason='Feature missing or not yet available under publication-lag policy')
    baseline = [v for p, v in available.items() if p % 12 == feature % 12]
    result.update(baseline_count=len(baseline), baseline_mean=mean(baseline),
                  baseline_sd=pstdev(baseline), baseline_median=median(baseline))
    result['value'] = (available[feature] / max(1.0, result['baseline_median']) if provider == 'DOH'
                       else (available[feature] - result['baseline_mean']) / max(epsilon, result['baseline_sd']))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True,
                        help='JSON with dataset_id, policy_version, rows and requests')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    payload = json.loads(args.input.read_text(encoding='utf-8'))
    features = [external_index(payload['rows'], dataset_id=payload['dataset_id'],
                               policy_version=payload['policy_version'], **request)
                for request in payload['requests']]
    with args.output.open('x', encoding='utf-8') as handle:
        json.dump(dict(status='research_candidate_only', publication_approved=False, features=features),
                  handle, indent=2, allow_nan=False)


if __name__ == '__main__':
    main()
