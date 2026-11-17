"""Offline WS2/WS3 external signal readiness & issue-time vintage validator.

Enforces publication-lag gating (`available_on <= issue_date`), approved territory mapping,
and explicit provenance (`Observed`, `Proxy`, `Outlook`) for cyclone proximity, climate
outlooks, and DOH weekly surveillance without filling absent periods as zero.
"""
from __future__ import annotations

from datetime import date
import math
import re

PROVIDERS = {
    'PAGASA': 'Observed',
    'DOH_WEEKLY': 'Observed',
    'NASA_POWER': 'Proxy',
    'OPEN_METEO': 'Proxy',
    'IBTRACS': 'Observed',
    'NOAA_ONI': 'Outlook',
    'PAGASA_OUTLOOK': 'Outlook',
}
MONTH_RE = re.compile(r'^\d{4}-(0[1-9]|1[0-2])$')


def evaluate_signal_readiness(
    records: list[dict],
    *,
    provider: str,
    territory: str,
    origin_period: str,
    issue_date: str,
    max_cyclone_km: float = 200.0,
) -> dict:
    """Validate issue-time external observations/outlooks and report explicit join readiness."""
    if provider not in PROVIDERS:
        raise ValueError(f'Unsupported external provider: {provider}')
    if not MONTH_RE.fullmatch(origin_period):
        raise ValueError('origin_period must be YYYY-MM')
    if max_cyclone_km <= 0 or not math.isfinite(max_cyclone_km):
        raise ValueError('max_cyclone_km must be positive and finite')
    issue = date.fromisoformat(issue_date)

    matched = [
        r for r in records
        if r.get('provider') == provider and r.get('territory') == territory
    ]
    available_months: dict[str, dict] = {}
    blocked_reasons: set[str] = set()
    unmapped_count = 0
    future_vintage_count = 0

    for rec in matched:
        period = str(rec.get('period') or '')
        if not MONTH_RE.fullmatch(period):
            raise ValueError(f'Invalid period in external record: {period}')
        if period > origin_period:
            future_vintage_count += 1
            continue
        avail_raw = rec.get('available_on')
        if not avail_raw:
            blocked_reasons.add('MISSING_AVAILABLE_ON_VINTAGE')
            continue
        if date.fromisoformat(str(avail_raw)) > issue:
            future_vintage_count += 1
            continue
        if rec.get('mapping_status') != 'approved':
            unmapped_count += 1
            blocked_reasons.add('EXTERNAL_MAPPING_PENDING')
            continue
        val = rec.get('value')
        if val is not None and (isinstance(val, bool) or not isinstance(val, (int, float)) or not math.isfinite(val)):
            raise ValueError('Nonfinite external signal value')
        if provider == 'IBTRACS':
            dist = rec.get('distance_km')
            if dist is None or isinstance(dist, bool) or not isinstance(dist, (int, float)) or not math.isfinite(dist) or dist < 0:
                raise ValueError('IBTRACS record requires finite nonnegative distance_km')
            if dist <= max_cyclone_km:
                entry = available_months.setdefault(period, {'cyclone_count_le_200km': 0, 'min_distance_km': dist})
                entry['cyclone_count_le_200km'] += 1
                entry['min_distance_km'] = min(entry['min_distance_km'], float(dist))
        else:
            if val is not None:
                available_months[period] = {'value': float(val), 'available_on': str(avail_raw)}

    if not available_months:
        blocked_reasons.add('NO_ELIGIBLE_OBSERVATIONS_AT_ISSUE')
    join_ready = len(available_months) > 0 and not (blocked_reasons - {'NO_ELIGIBLE_OBSERVATIONS_AT_ISSUE'})

    return {
        'provider': provider,
        'evidence_label': PROVIDERS[provider],
        'territory': territory,
        'origin_period': origin_period,
        'issue_date': issue.isoformat(),
        'eligible_months_count': len(available_months),
        'future_or_unreleased_skipped': future_vintage_count,
        'unmapped_skipped': unmapped_count,
        'join_ready': join_ready,
        'blocked_reasons': sorted(blocked_reasons),
        'monthly_values': available_months,
        'publication_approved': False,
    }
