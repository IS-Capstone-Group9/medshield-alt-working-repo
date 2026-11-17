"""Retrospective warning evaluation; official live bulletin remains unavailable."""
import math


def official_bulletin_status():
    return dict(status='OFFICIAL_LIVE_BULLETIN_UNAVAILABLE', available=False,
                reason='No verified official live bulletin connector is configured',
                official_alert=False)


def evaluate_events(rows):
    """Rows are pre-aligned origin-known signals and next-month observed events.

    Missing signal/target is excluded and counted, never a negative. This measures
    a historical detection method and does not create an official alert.
    """
    counts = dict(true_positive=0, false_positive=0, true_negative=0, false_negative=0)
    leads, excluded, seen = [], 0, set()
    for row in rows:
        identity = (row['series_id'], row['origin_period'], row['target_period'])
        if identity in seen:
            raise ValueError('Duplicate historical event key')
        seen.add(identity)
        def month(period):
            from datetime import datetime
            parsed = datetime.strptime(period, '%Y-%m')
            if parsed.strftime('%Y-%m') != period:
                raise ValueError('Noncanonical month')
            return parsed.year * 12 + parsed.month
        lead = month(row['target_period']) - month(row['origin_period'])
        if lead != 1:
            raise ValueError('Historical early warning requires next-month target')
        if row.get('origin_known') is not True:
            raise ValueError('Signal availability at origin must be established')
        signal, event = row.get('signal'), row.get('demand_surge')
        if signal is None or event is None:
            excluded += 1
            continue
        if not isinstance(signal, bool) or not isinstance(event, bool):
            raise ValueError('Expected Boolean signal and observed event')
        name = ('true_' if signal == event else 'false_') + ('positive' if signal else 'negative')
        counts[name] += 1
        if signal and event:
            leads.append(lead)
    tp, fp, tn, fn = (counts[k] for k in ('true_positive', 'false_positive', 'true_negative', 'false_negative'))
    return dict(**counts, eligible_rows=tp+fp+tn+fn, excluded_missing_rows=excluded,
                precision=tp/(tp+fp) if tp+fp else None, recall=tp/(tp+fn) if tp+fn else None,
                false_alarm_rate=fp/(fp+tn) if fp+tn else None,
                mean_lead_months=sum(leads)/len(leads) if leads else None,
                lead_definition='fixed_next_month_detection_horizon_not_measured_time_before_peak',
                evidence_label='Derived', official_alert=False,
                interpretation='retrospective_event_detection_not_live_warning')


def surge_event(actual, training_values):
    """Strictly greater than training p90; caller supplies only origin-known history."""
    import numpy as np
    if actual is None or not training_values:
        return dict(event=None, threshold=None, reason='missing_target_or_training_history')
    if any(isinstance(v, bool) or not math.isfinite(v) or v < 0 for v in [actual, *training_values]):
        raise ValueError('Expected finite nonnegative unit demand')
    threshold = float(np.quantile(training_values, .9, method='linear'))
    return dict(event=actual > threshold, threshold=threshold, evidence_label='Derived')
