"""Offline, locally source-bound forward comparison; never activates a model.

Hashes establish consistency, not independent warehouse or timestamp attestation.
CLI clocks cannot be overridden. Injected clocks are only for fixture tests.
"""
import argparse
import hashlib
import json
import math
import os
import re
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

from .predictive.adaptive_ensemble import CONFIGS, expert, predict
from .predictive.contracts import month, period

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'outputs/wp4_forecast_tournament_20261030/source.json'
SCOPE = 'original_itemized_sales_contracts_excluded'
METHODS = ('last_value', 'seasonal_naive', 'mean_3', 'mean_6', 'bias_w12', 'bias_w24')
LEADS = (1, 3, 6)
MANILA = timezone(timedelta(hours=8))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def encoded(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()


def clock(value):
    result = datetime.fromisoformat(value) if isinstance(value, str) else value
    require(result.tzinfo is not None, 'Timezone-aware timestamp required')
    return result.astimezone(MANILA)


def code_hashes():
    files = [Path(__file__), Path(__file__).parent / 'predictive/adaptive_ensemble.py',
             Path(__file__).parent / 'predictive/contracts.py']
    return {str(p.relative_to(ROOT)): digest(p.read_bytes()) for p in files}


def definition():
    return dict(version='company_php_forward_v1', scope=SCOPE, currency='PHP',
                contracts_excluded=True, complete_company_sales=False,
                first_issue='2026-11', last_issue='2027-10', issue_days=[1, 2, 3],
                calendar_leads=list(LEADS), source_relative_leads=[2, 4, 7],
                methods=list(METHODS), minimum_completed_issues=12,
                minimum_mae_gain=.05, maximum_absolute_normalized_bias=5.,
                python_version=sys.version,
                baseline_sha256=digest(BASE.read_bytes()), code_sha256=code_hashes())


def register(now):
    now = clock(now)
    require(now.strftime('%Y-%m') < '2026-11', 'Design registration must precede first issue month')
    return dict(definition=definition(), registered_at=now.isoformat())


def validate_design(design):
    require(design['definition'] == definition(), 'Protocol/source/code changed; new version required')
    require(clock(design['registered_at']).strftime('%Y-%m') < '2026-11', 'Late registration')


def parse_snapshot(raw, now, fixture=False):
    require(len(raw) <= 2_000_000, 'Snapshot too large')
    data = json.loads(raw)
    require(data['schema_version'] == 1 and data['scope'] == SCOPE, 'Wrong schema/scope')
    require(data['evidence_kind'] == ('synthetic_fixture' if fixture else 'controlled_source'),
            'Wrong evidence kind; fixtures cannot issue real forecasts')
    require(data['contracts_excluded'] is True, 'Contracts must be excluded')
    identity = data['source_identity']
    baseline = json.loads(BASE.read_bytes())['source_identity']
    require(identity['policy_version'] == baseline['policy_version'], 'Policy mismatch')
    require(re.fullmatch(r'[0-9a-f]{64}', identity['dataset_id']) is not None
            and identity['dataset_id'] != baseline['dataset_id'], 'Fresh dataset identity required')
    require(re.fullmatch(r'\w+\.\w+\.\w+_itemized_candidates', identity['source_table']) is not None,
            'Controlled itemized table required')
    require(type(identity['delta_version']) is int and identity['delta_version'] >= 0,
            'Invalid Delta version')
    require(re.fullmatch(r'[0-9a-f]{64}', identity['receipt_sha256']) is not None,
            'Extraction receipt hash required')
    require(clock(data['extracted_at']) <= clock(data['verified_at']) <= clock(now),
            'Extraction/verification timestamps out of order')
    require(data['verification_status'] == ('SYNTHETIC_FIXTURE' if fixture else 'OPERATOR_VERIFIED'),
            'Explicit operator verification required')
    rows = data['monthly']
    require(36 <= len(rows) <= 600, 'Requires 36–600 observed months')
    series = {}
    for row in rows:
        key = row['month']
        require(re.fullmatch(r'\d{4}-\d{2}', key) is not None and 1 <= int(key[5:]) <= 12,
                'Invalid month')
        require(type(row['source_records']) is int and row['source_records'] > 0,
                'Observed source records required; missing is not zero')
        text = row['net_sales_php']
        require(isinstance(text, str) and re.fullmatch(r'-?\d{1,16}(\.\d{1,6})?', text) is not None,
                'Bounded signed PHP decimal string required')
        require(month(key) not in series, 'Duplicate month')
        series[month(key)] = float(Decimal(text))
    keys = list(series)
    require(keys == list(range(keys[0], keys[-1] + 1)), 'Unordered or missing month')
    require(keys[-1] < month(clock(now).strftime('%Y-%m')), 'Unclosed actual month')
    if not fixture:
        retained = {r['month']: r for r in json.loads(BASE.read_bytes())['monthly']
                    if '2020-01' <= r['month'] <= '2026-09'}
        supplied = {r['month']: r for r in rows}
        require(rows[0]['month'] == '2020-01', 'History must start January 2020')
        for key, old in retained.items():
            new = supplied.get(key)
            require(new is not None and Decimal(new['net_sales_php']) == Decimal(old['net_sales_php'])
                    and new['source_records'] == int(old['source_records']),
                    'Retained history changed; reconcile under a new protocol')
    return data, series


def predictions(series, issue_month):
    origin = max(series)
    rows = []
    for lead in LEADS:
        target = month(issue_month) + lead
        source_lead = target - origin
        require(source_lead == lead + 1, 'History must end before issue month')
        for name in METHODS:
            value = (predict(series, origin, source_lead,
                             next(c for c in CONFIGS if c['model_id'] == name))[0]
                     if name.startswith('bias') else expert(series, origin, source_lead, name))
            require(math.isfinite(value), 'Nonfinite prediction')
            rows.append(dict(calendar_lead=lead, source_relative_lead=source_lead,
                             target_month=period(target), method=name, prediction=value))
    return rows


def build_issue(design, raw, now, fixture=False):
    validate_design(design)
    require(type(fixture) is bool, 'Boolean fixture flag required')
    now = clock(now)
    issue_month = now.strftime('%Y-%m')
    require('2026-11' <= issue_month <= '2027-10' and now.day <= 3, 'Outside registered issue window')
    require(clock(design['registered_at']) < now, 'Issue predates design')
    snapshot, series = parse_snapshot(raw, now, fixture)
    require(max(series) == month(issue_month) - 1, 'Fresh previous-month history required')
    require(clock(snapshot['extracted_at']).strftime('%Y-%m') == issue_month,
            'Issue-month extraction required')
    return dict(protocol_sha256=digest(encoded(design)), issued_at=now.isoformat(),
                issue_month=issue_month, fixture=fixture, snapshot_raw=raw.decode('utf-8'),
                snapshot_sha256=digest(raw), predictions=predictions(series, issue_month),
                accuracy_measured=False, serving_changed=False, procurement_authorized=False,
                independently_attested=False)


def validate_issue(design, issue):
    raw = issue['snapshot_raw'].encode('utf-8')
    require(issue['snapshot_sha256'] == digest(raw), 'Snapshot bytes changed')
    expected = build_issue(design, raw, issue['issued_at'], issue['fixture'])
    require(issue == expected, 'Issue cohort or metadata changed')
    return json.loads(raw)


def metrics(pairs):
    errors = [p - a for a, p in pairs]
    n = len(errors)
    denominator = math.fsum(abs(a) for a, _ in pairs)
    return dict(n=n, mae=math.fsum(map(abs, errors)) / n if n else None,
                rmse=math.sqrt(math.fsum(e * e for e in errors) / n) if n else None,
                bias=math.fsum(errors) / n if n else None,
                wape=100 * math.fsum(map(abs, errors)) / denominator if denominator else None,
                normalized_bias=100 * math.fsum(errors) / denominator if denominator else None,
                denominator_reason=None if denominator else 'No absolute actual volume')


def score(design, issues, raw_actuals, now, fixture=False):
    validate_design(design)
    actuals, series = parse_snapshot(raw_actuals, now, fixture)
    require(issues, 'At least one issue required')
    months = set()
    groups = {(lead, name): [] for lead in LEADS for name in METHODS}
    pending = []
    for issue in issues:
        snapshot = validate_issue(design, issue)
        require(issue['fixture'] is fixture, 'Mixed fixture/controlled cohort')
        require(clock(issue['issued_at']) < clock(actuals['extracted_at']), 'Actuals predate issue')
        require(issue['issue_month'] not in months, 'Duplicate issue month')
        months.add(issue['issue_month'])
        old = {r['month']: (Decimal(r['net_sales_php']), r['source_records']) for r in snapshot['monthly']}
        new = {r['month']: (Decimal(r['net_sales_php']), r['source_records']) for r in actuals['monthly']}
        require(all(new.get(k) == v for k, v in old.items()), 'Issued history revised')
        require(actuals['source_identity']['dataset_id'] != snapshot['source_identity']['dataset_id'],
                'New outcome dataset required')
        for row in issue['predictions']:
            target = month(row['target_month'])
            if target >= month(clock(now).strftime('%Y-%m')):
                pending.append(dict(issue_month=issue['issue_month'], **row))
                continue
            require(target in series, 'Closed target missing; cohort cannot be dropped')
            require(clock(actuals['extracted_at']).strftime('%Y-%m') > row['target_month'],
                    'Outcome extracted before target closed')
            groups[row['calendar_lead'], row['method']].append((series[target], row['prediction']))
    results = []
    for lead in LEADS:
        scored = {name: metrics(groups[lead, name]) for name in METHODS}
        ready = all(v['n'] == 12 for v in scored.values()) and len(months) == 12
        strongest = min((scored[n]['mae'] for n in METHODS[:4]), default=None) if ready else None
        gates = {name: (strongest > 0 and scored[name]['mae'] <= .95 * strongest
                        and scored[name]['normalized_bias'] is not None
                        and abs(scored[name]['normalized_bias']) <= 5) if ready else None
                 for name in METHODS[4:]}
        results.append(dict(calendar_lead=lead, source_relative_lead=lead + 1,
                            metrics=scored, research_comparison_ready=ready, research_gate=gates))
    return dict(fixture=fixture, scope=SCOPE, scored_at=clock(now).isoformat(),
                protocol_sha256=digest(encoded(design)),
                issue_sha256=[digest(encoded(i)) for i in issues], actuals_sha256=digest(raw_actuals),
                comparisons=results, pending=pending, serving_changed=False,
                procurement_authorized=False, independently_attested=False)


def exclusive_write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(encoded(value) + b'\n')
            stream.flush()
            os.fsync(stream.fileno())
        os.link(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['register', 'readiness', 'issue', 'validate', 'score'])
    parser.add_argument('--design', type=Path, required=True)
    parser.add_argument('--snapshot', type=Path)
    parser.add_argument('--issues', nargs='+', type=Path)
    parser.add_argument('--out', type=Path)
    args = parser.parse_args()
    now = datetime.now(MANILA)
    if args.action == 'register':
        exclusive_write(args.design, register(now))
        return
    design = json.loads(args.design.read_bytes())
    validate_design(design)
    if args.action == 'readiness':
        print(json.dumps(dict(checked_at=now.isoformat(),
                              issue_window_open='2026-11' <= now.strftime('%Y-%m') <= '2027-10' and now.day <= 3,
                              required_history_end=period(month(now.strftime('%Y-%m')) - 1),
                              controlled_snapshot_checked=False, issue_created=False)))
    elif args.action == 'issue':
        require(args.snapshot is not None and args.out is not None, 'Snapshot and output directory required')
        issue = build_issue(design, args.snapshot.read_bytes(), now)
        exclusive_write(args.out / ('company_php_' + issue['issue_month'] + '.json'), issue)
    elif args.action == 'validate':
        require(args.issues is not None, 'Issue paths required')
        for path in args.issues:
            issue = json.loads(path.read_bytes())
            require(issue['fixture'] is False, 'CLI accepts controlled issues only')
            validate_issue(design, issue)
        print('Local issue consistency checks passed; independent attestation not established.')
    else:
        require(args.snapshot is not None and args.issues is not None and args.out is not None,
                'Actual snapshot, issue paths and output directory required')
        result = score(design, [json.loads(p.read_bytes()) for p in args.issues],
                       args.snapshot.read_bytes(), now)
        exclusive_write(args.out / ('score_' + digest(encoded(result)) + '.json'), result)


if __name__ == '__main__':
    main()
