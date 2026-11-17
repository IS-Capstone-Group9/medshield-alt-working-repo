"""Signed financial attribution and conservative advance-event eligibility."""
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
import re


def contributions(rows, history, target, field):
    """Actual minus mean-six contribution; absent captured subsets are additive zero."""
    if len(history) != 6 or len(set(history)) != 6 or target in history:
        raise ValueError('Six distinct preceding observed months required')
    if sorted(history) != history or history[-1] >= target:
        raise ValueError('History must precede target')
    amounts = defaultdict(lambda: defaultdict(Decimal))
    counts = defaultdict(int)
    for row in rows:
        month = str(row['date_delivered'])[:7]
        if month not in [*history, target]:
            continue
        label = row[field]
        if row['is_net_sales_technically_eligible']:
            amounts[label][month] += Decimal(str(row['net_sales']))
            counts[label] += 1
    result = []
    for label, monthly in amounts.items():
        actual = monthly[target]
        historical = sum((monthly[m] for m in history), Decimal(0)) / 6
        result.append(dict(label=label, actual_php=str(actual), mean6_php=str(historical),
                           surge_contribution_php=str(actual - historical), eligible_records_in_seven_months=counts[label]))
    return sorted(result, key=lambda r: Decimal(r['surge_contribution_php']), reverse=True)


def aware(value):
    result = datetime.fromisoformat(value)
    if result.tzinfo is None:
        raise ValueError('Timezone-aware availability timestamps required')
    return result


def as_of_events(events, issued_at, population):
    """Select known revisions; operator/custody assertions still need real verification."""
    issued = aware(issued_at)
    selected, keys = {}, set()
    for event in events:
        key = event['event_id'], event['revision']
        if not event['event_id'] or type(event['revision']) is not int or event['revision'] < 1 or key in keys:
            raise ValueError('Unique anonymous event/revision keys required')
        keys.add(key)
        known, captured = aware(event['known_at']), aware(event['captured_at'])
        if captured < known:
            raise ValueError('Capture cannot precede documented availability')
        if event['population_scope'] != population or event['evidence_kind'] != 'confirmed_order':
            raise ValueError('Verified compatible confirmed-order scope required')
        if not event['source_evidence_id'] or event['custody_verified'] is not True or event['linkage_verified'] is not True:
            raise ValueError('Availability custody and population linkage are unverified')
        if event['status'] not in ('confirmed', 'cancelled'):
            raise ValueError('Unsupported order status')
        if not isinstance(event['net_sales_basis_php'], str) or not re.fullmatch(r'\d+(?:\.\d{1,6})?', event['net_sales_basis_php']):
            raise ValueError('Exact compatible decimal-string order amount required')
        amount = Decimal(event['net_sales_basis_php'])
        if not amount.is_finite() or amount < 0:
            raise ValueError('Finite nonnegative compatible order amount required')
        if len(event['planned_month']) != 7:
            raise ValueError('Planned month required')
        datetime.strptime(event['planned_month'], '%Y-%m')
        # Backfilled evidence cannot establish that a forecast had access to it.
        if max(known, captured) > issued:
            continue
        previous = selected.get(event['event_id'])
        if previous is None or event['revision'] > previous['revision']:
            selected[event['event_id']] = dict(event)
    return [e for _, e in sorted(selected.items()) if e['status'] == 'confirmed']
