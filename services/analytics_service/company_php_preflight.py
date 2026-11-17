"""Read-only readiness for the registered PHP forecast and a separate order-signal study."""

import argparse
import csv
from datetime import datetime
import io
import json
from pathlib import Path
import re

from . import company_php_forward as forward
from .predictive.contracts import month, period
from .predictive.surge_investigation import as_of_events

EVENT_FIELDS = ('event_id', 'revision', 'known_at', 'captured_at', 'planned_month',
                'population_scope', 'evidence_kind', 'source_evidence_id', 'custody_verified',
                'linkage_verified', 'status', 'net_sales_basis_php')
RECEIPT_FIELDS = {'schema_version', 'status', 'scope', 'target_month', 'cutoff_at', 'verified_at',
                  'export_sha256', 'source_receipt_sha256', 'complete_target_scope'}


def read_bounded(path, limit):
    with path.open('rb') as stream:
        raw = stream.read(limit + 1)
    forward.require(len(raw) <= limit, 'Input exceeds size limit')
    return raw


def window_open(definition, time):
    return (definition['first_issue'] <= time.strftime('%Y-%m') <= definition['last_issue']
            and time.day in definition['issue_days'])


def window_plan(definition, now):
    this_month = now.strftime('%Y-%m')
    first = month(definition['first_issue'])
    last = month(definition['last_issue'])
    candidate = max(first, month(this_month) if window_open(definition, now) else month(this_month) + 1)
    return dict(issue_window_open_now=window_open(definition, now),
                next_eligible_issue_month=period(candidate) if candidate <= last else None,
                required_history_end=period(candidate - 1) if candidate <= last else None,
                one_month_target=period(candidate + 1) if candidate <= last else None,
                one_month_source_relative_lead=2, eligible_days=definition['issue_days'])


def snapshot_readiness(raw, now, plan):
    snapshot, history = forward.parse_snapshot(raw, now)
    history_end = period(max(history))
    extracted_month = forward.clock(snapshot['extracted_at']).strftime('%Y-%m')
    ready = (plan['issue_window_open_now'] and history_end == plan['required_history_end']
             and extracted_month == plan['next_eligible_issue_month'])
    return dict(status='ELIGIBLE_FOR_REGISTERED_ISSUE' if ready else 'VALIDATED_NOT_ISSUE_READY',
                history_end=history_end, extraction_month=extracted_month,
                dataset_id=snapshot['source_identity']['dataset_id'], sha256=forward.digest(raw))


def order_archive(export_raw, receipt_raw, definition, now):
    receipt = json.loads(receipt_raw)
    forward.require(set(receipt) == RECEIPT_FIELDS and type(receipt['schema_version']) is int and
                    receipt['schema_version'] == 1 and receipt['status'] == 'OPERATOR_VERIFIED_ORDER_ARCHIVE' and
                    receipt['scope'] == forward.SCOPE and receipt['complete_target_scope'] is True,
                    'Verified complete target-scope archive receipt required')
    forward.require(receipt['export_sha256'] == forward.digest(export_raw) and
                    re.fullmatch(r'[0-9a-f]{64}', receipt['source_receipt_sha256']),
                    'Archive or lineage receipt hash differs')
    cutoff, verified = forward.clock(receipt['cutoff_at']), forward.clock(receipt['verified_at'])
    target = period(month(cutoff.strftime('%Y-%m')) + 1)
    forward.require(window_open(definition, cutoff) and cutoff <= verified <= now and
                    target == receipt['target_month'], 'Archive cutoff, target or review time differs')
    reader = csv.DictReader(io.StringIO(export_raw.decode('utf-8-sig'), newline=''))
    forward.require(tuple(reader.fieldnames or ()) == EVENT_FIELDS, 'Unexpected order CSV columns')
    events = []
    for row in reader:
        forward.require(set(row) == set(EVENT_FIELDS) and all(value is not None for value in row.values()),
                        'Incomplete order revision')
        forward.require(re.fullmatch(r'[1-9][0-9]{0,8}', row['revision']) and
                        row['custody_verified'] == row['linkage_verified'] == 'true' and
                        re.fullmatch(r'[A-Za-z0-9_-]{1,128}', row['event_id']) and
                        re.fullmatch(r'[A-Za-z0-9_-]{1,128}', row['source_evidence_id']) and
                        re.fullmatch(r'[0-9]{1,16}(\.[0-9]{1,6})?', row['net_sales_basis_php']) and
                        forward.clock(row['captured_at']) <= verified, 'Unverified or malformed order revision')
        events.append(dict(row, revision=int(row['revision']), custody_verified=True, linkage_verified=True))
    # Select the most recent available revision before filtering on its planned
    # month, so an already-known reschedule removes the order from this target.
    confirmed = as_of_events(events, cutoff.isoformat(), forward.SCOPE)
    count = sum(row['planned_month'] == target for row in confirmed)
    return dict(status='COMPLETE_ARCHIVE_AT_REVIEWED_CUTOFF', target_month=target,
                cutoff_at=cutoff.isoformat(), verified_at=verified.isoformat(),
                confirmed_target_orders=count, export_sha256=forward.digest(export_raw),
                operator_receipt_sha256=forward.digest(receipt_raw))


def assess(design, now, snapshot_raw=None, events_raw=None, receipt_raw=None):
    forward.validate_design(design)
    now = forward.clock(now)
    definition = design['definition']
    plan = window_plan(definition, now)
    forward.require((events_raw is None) == (receipt_raw is None), 'Archive and receipt must be supplied together')
    snapshot = snapshot_readiness(snapshot_raw, now, plan) if snapshot_raw is not None else dict(status='NOT_SUPPLIED')
    orders = (order_archive(events_raw, receipt_raw, definition, now) if events_raw is not None
              else dict(status='NOT_SUPPLIED', confirmed_target_orders=None))
    if events_raw is not None:
        orders['matches_next_issue_target'] = orders['target_month'] == plan['one_month_target']
    return dict(checked_at=now.isoformat(), forecast_scope=forward.SCOPE, schedule=plan, sales_snapshot=snapshot,
                order_archive=orders, forecast_issued=False, independently_attested=False, accuracy_measured=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--design', type=Path, required=True)
    parser.add_argument('--snapshot', type=Path)
    parser.add_argument('--event-export', type=Path)
    parser.add_argument('--event-receipt', type=Path)
    args = parser.parse_args()
    try:
        result = assess(json.loads(read_bounded(args.design, 100_000)), datetime.now(forward.MANILA),
                        read_bounded(args.snapshot, 2_000_000) if args.snapshot else None,
                        read_bounded(args.event_export, 10_000_000) if args.event_export else None,
                        read_bounded(args.event_receipt, 100_000) if args.event_receipt else None)
        print(json.dumps(result, indent=2))
    except (OSError, ValueError, KeyError, TypeError, AttributeError, ArithmeticError, csv.Error) as error:
        parser.exit(2, f'Forward preflight rejected ({type(error).__name__}).\n')


if __name__ == '__main__':
    main()
