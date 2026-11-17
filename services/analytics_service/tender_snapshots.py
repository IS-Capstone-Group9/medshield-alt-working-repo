"""Offline WS1 dated tender / advance-order snapshot intake and issue-time feature builder.

Fails closed when no dated archive or approved entity-to-channel mapping exists.
Never invents advance orders or alters frozen forecast selections.
"""
from __future__ import annotations

from datetime import date
import hashlib
import json
import math
import re

VALID_STATUSES = ('open', 'awarded', 'cancelled', 'rescheduled')
MONTH_RE = re.compile(r'^\d{4}-(0[1-9]|1[0-2])$')


def _norm_entity(value: str | None) -> str:
    return ' '.join(str(value or '').strip().upper().split())


def validate_tender_snapshot(
    records: list[dict] | None,
    entity_map: dict[str, dict],
    *,
    source_dataset_id: str,
    policy_version: str,
    as_of_date: str,
) -> dict:
    """Validate dated tender/order snapshot; fails closed if empty or malformed."""
    if not records:
        raise ValueError('MISSING_ORDER_ARCHIVE: no dated order or tender records supplied')
    if not source_dataset_id or not policy_version:
        raise ValueError('source_dataset_id and policy_version are required')
    as_of = date.fromisoformat(as_of_date)

    validated = []
    seen_ids = set()
    unmapped = 0
    for row in records:
        notice_id = str(row.get('notice_id') or '').strip()
        if not notice_id or notice_id in seen_ids:
            raise ValueError('Duplicate or missing tender notice_id')
        seen_ids.add(notice_id)

        status = str(row.get('status') or '').strip().lower()
        if status not in VALID_STATUSES:
            raise ValueError(f'Invalid tender status: {status}')

        avail = date.fromisoformat(str(row.get('available_on') or ''))
        if avail > as_of:
            raise ValueError(f'Snapshot record {notice_id} available_on exceeds as_of_date')
        delivery_month = str(row.get('expected_delivery_month') or '')
        if not MONTH_RE.fullmatch(delivery_month):
            raise ValueError(f'Invalid expected_delivery_month for {notice_id}')

        php = row.get('php_value')
        if isinstance(php, bool) or not isinstance(php, (int, float)) or not math.isfinite(php) or php < 0:
            raise ValueError(f'Invalid php_value for {notice_id}')

        entity_key = _norm_entity(row.get('procuring_entity'))
        mapped = entity_map.get(entity_key)
        approved = bool(mapped and mapped.get('mapping_status') == 'approved')
        if not approved:
            unmapped += 1
        validated.append({
            'notice_id': notice_id,
            'procuring_entity': entity_key,
            'channel': mapped.get('channel') if approved else None,
            'territory_id': mapped.get('territory_id') if approved else None,
            'mapping_status': 'approved' if approved else 'unmapped_pending',
            'available_on': avail.isoformat(),
            'expected_delivery_month': delivery_month,
            'status': status,
            'php_value': float(php),
        })

    digest = hashlib.sha256(
        json.dumps(validated, sort_keys=True, separators=(',', ':')).encode('utf-8')
    ).hexdigest()
    return {
        'status': 'snapshot_validated',
        'source_dataset_id': source_dataset_id,
        'policy_version': policy_version,
        'as_of_date': as_of.isoformat(),
        'record_count': len(validated),
        'unmapped_pending_count': unmapped,
        'sha256': digest,
        'publication_approved': False,
        'records': validated,
    }


def tender_features_at_origin(
    snapshot: dict,
    *,
    origin_period: str,
    target_period: str,
    issue_date: str,
    channel: str | None = None,
) -> dict:
    """Compute issue-time advance tender PHP value without future leakage."""
    if not MONTH_RE.fullmatch(origin_period) or not MONTH_RE.fullmatch(target_period):
        raise ValueError('origin_period and target_period must be YYYY-MM')
    issue = date.fromisoformat(issue_date)
    total_php = 0.0
    approved_count = 0
    excluded_unmapped = 0
    for rec in snapshot.get('records', []):
        if rec['expected_delivery_month'] != target_period:
            continue
        if date.fromisoformat(rec['available_on']) > issue:
            continue
        if rec['status'] not in ('open', 'awarded'):
            continue
        if rec['mapping_status'] != 'approved':
            excluded_unmapped += 1
            continue
        if channel is not None and rec['channel'] != channel:
            continue
        total_php += rec['php_value']
        approved_count += 1
    return {
        'origin_period': origin_period,
        'target_period': target_period,
        'issue_date': issue.isoformat(),
        'channel': channel,
        'approved_tender_php': round(total_php, 2),
        'approved_notice_count': approved_count,
        'unmapped_excluded_count': excluded_unmapped,
        'evidence_label': 'Observed (advance_signal)',
        'snapshot_sha256': snapshot.get('sha256'),
        'publication_approved': False,
    }
