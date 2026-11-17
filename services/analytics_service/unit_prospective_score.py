"""Pin controlled actuals and score the registered unit study offline."""

import argparse
import json
import os
import platform
import re
import tempfile
from collections import Counter
from datetime import datetime
from decimal import Decimal, localcontext
from pathlib import Path

from . import unit_prospective_issue as issue
from .unit_prospective_issue import is_hash, month_after, require, sha, timestamp


def read_json(path, maximum_bytes):
    with path.open('rb') as stream:
        raw = stream.read(maximum_bytes + 1)
    require(len(raw) <= maximum_bytes, 'Input exceeds size limit')
    return json.loads(raw), sha(raw)


def write_once(path, document):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix='.unit-study-', delete=False) as stream:
            temporary = Path(stream.name)
            stream.write((json.dumps(document, indent=2, allow_nan=False) + '\n').encode('utf-8'))
            stream.flush()
            os.fsync(stream.fileno())
        os.link(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def calendar(protocol):
    schedule = protocol['schedule']
    for offset in range(schedule['planned_issues']):
        month = month_after(schedule['first_issue_month'], offset)
        for lead in schedule['calendar_leads_from_issue_month']:
            yield month, lead, month_after(month, lead)


def load_issues(directory, protocol, now):
    require(directory.is_dir(), 'Issue directory required')
    issues = {}
    for month in sorted({month for month, _, _ in calendar(protocol)}):
        issue_id = 'unit_' + month.replace('-', '')
        path = directory / f'{issue_id}.json'
        if not path.exists():
            continue
        document, digest = read_json(path, 4_000_000)
        issue.validate_issue(document)
        require(document['issue_id'] == issue_id and document['issue_month'] == month and
                document['protocol_sha256'] == issue.PROTOCOL_SHA256 and
                document['status'] == 'ISSUED_RESEARCH_BASELINES_NOT_OPERATIONALLY_APPROVED' and
                all(type(row['calendar_lead']) is int and type(row['source_relative_lead']) is int
                    for row in document['predictions']) and
                timestamp(document['issued_at']) <= now, 'Invalid issued cohort identity or time')
        issues[month] = (document, digest)
    return issues


def validate_actual(actual, target, protocol, issues, now):
    fields = {'schema_version', 'scope', 'target_month', 'source', 'extracted_at', 'verified_at',
              'controlled_successor_reconciliation_sha256', 'ampoules', 'source_records',
              'unreviewed_source_records', 'source_data_status', 'zero_evidence_sha256'}
    require(set(actual) == fields and type(actual['schema_version']) is int and
            actual['schema_version'] == 1 and actual['scope'] == protocol['scope'] and
            actual['target_month'] == target, 'Invalid actual schema, scope or target')
    matching = [issues[month][0] for month, _, scheduled in calendar(protocol)
                if scheduled == target and month in issues]
    require(matching, 'Target has no registered issue')
    extracted, verified = timestamp(actual['extracted_at']), timestamp(actual['verified_at'])
    require(extracted.strftime('%Y-%m') > target and extracted <= verified <= now and
            all(timestamp(document['issued_at']) < extracted for document in matching),
            'Actual must be extracted after target close and issue, and verified before pinning')
    source = actual['source']
    prior = protocol['prior_evidence']['source']
    table = source['source_table']
    require(isinstance(table, str) and re.fullmatch(
        r'workspace\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+_itemized_candidates', table),
        'Expected controlled original Gold candidate')
    require(set(source) == set(matching[0]['snapshot']['source']) and
            issue.integer(source['source_delta_version']) and
            source['policy_version'] == prior['policy_version'] and
            source['mapping_confirmation_sha256'] == prior['confirmation_sha256'] and
            all(is_hash(source[key]) for key in ('dataset_id', 'source_receipt_sha256')) and
            is_hash(actual['controlled_successor_reconciliation_sha256']), 'Invalid source lineage')
    require(source['dataset_id'] != prior['dataset_id'] and all(
        source['dataset_id'] != document['snapshot']['source']['dataset_id']
        and (table != document['snapshot']['source']['source_table'] or
             source['source_delta_version'] > document['snapshot']['source']['source_delta_version'])
        for document in matching), 'Actual requires a controlled successor to each issued history')
    count, unreviewed = actual['source_records'], actual['unreviewed_source_records']
    require(issue.integer(count) and issue.integer(unreviewed) and unreviewed <= count,
            'Invalid source record counts')
    flags = actual['source_data_status']
    require(isinstance(flags, list) and flags and all(isinstance(flag, str) and 0 < len(flag) <= 100
                                                    for flag in flags), 'Source quality flags required')
    value = issue.quantity(actual['ampoules'])
    zero_evidence = actual['zero_evidence_sha256']
    require((count > 0 and zero_evidence is None) or
            (count == 0 and value == 0 and is_hash(zero_evidence)), 'Absent records are not observed zero')
    return value


def load_first(path, target, protocol, issues, now):
    record, digest = read_json(path, 100_000)
    pinned_at = timestamp(record['pinned_at'])
    require(record['protocol_sha256'] == issue.PROTOCOL_SHA256 and
            record['first_actual_sha256'] is None and pinned_at <= now and
            record['actual_sha256'] == issue.canonical_sha(record['actual']), 'Invalid first actual pin')
    value = validate_actual(record['actual'], target, protocol, issues, pinned_at)
    return record, digest, value


def pin_actual(directory, actual, protocol, issues, now, restatement=False):
    target = actual['target_month']
    validate_actual(actual, target, protocol, issues, now)
    actual_hash = issue.canonical_sha(actual)
    first_path = directory / f'{target}.json'
    first_hash = None
    if restatement:
        first, first_hash, _ = load_first(first_path, target, protocol, issues, now)
        previous = first['actual']['source']
        source = actual['source']
        require(timestamp(actual['extracted_at']) > timestamp(first['actual']['extracted_at']) and
                source['dataset_id'] != previous['dataset_id'] and
                (source['source_table'] != previous['source_table'] or
                 source['source_delta_version'] > previous['source_delta_version']),
                'Restatement needs a later extraction from a different source dataset')
    path = directory / f'{target}-restatement-{actual_hash}.json' if restatement else first_path
    write_once(path, dict(protocol_sha256=issue.PROTOCOL_SHA256, pinned_at=now.isoformat(),
                          first_actual_sha256=first_hash, actual_sha256=actual_hash, actual=actual))
    return path


def metrics(scored, method, tolerance):
    if not scored:
        return dict(paired_count=0, mae=None, rmse=None, wape=None, bias=None,
                    normalized_bias=None, direction=None, largest_miss=None, comparisons=None)
    errors = [errors[method] for _, _, errors in scored]
    absolute_errors = list(map(abs, errors))
    total = sum(absolute_errors)
    signed_total = sum(errors)
    denominator = sum(abs(actual) for _, actual, _ in scored)
    largest = max(range(len(errors)), key=absolute_errors.__getitem__)
    comparisons = {}
    for baseline in ('last_value', 'seasonal_naive_12'):
        deltas = [absolute - abs(by_method[baseline])
                  for absolute, (_, _, by_method) in zip(absolute_errors, scored)]
        comparisons[baseline] = dict(wins=sum(delta < -tolerance for delta in deltas),
                                     ties=sum(abs(delta) <= tolerance for delta in deltas),
                                     losses=sum(delta > tolerance for delta in deltas))
    count = len(errors)
    return dict(paired_count=count, mae=str(total / count),
                rmse=str((sum(error * error for error in errors) / count).sqrt()),
                wape=str(100 * total / denominator) if denominator else None,
                bias=str(signed_total / count),
                normalized_bias=str(100 * signed_total / denominator) if denominator else None,
                direction=dict(under=sum(error < -tolerance for error in errors),
                               exact=sum(abs(error) <= tolerance for error in errors),
                               over=sum(error > tolerance for error in errors)),
                largest_miss=dict(target_month=scored[largest][0], absolute_error=str(absolute_errors[largest])),
                comparisons=comparisons)


def score(directory, protocol, issues, now):
    require(directory.is_dir(), 'Actual directory required')
    cases = []
    pins = {}
    leads = protocol['schedule']['calendar_leads_from_issue_month']
    scored = {lead: [] for lead in leads}
    current_month = now.strftime('%Y-%m')
    with localcontext() as context:
        context.prec = 50
        for month, lead, target in calendar(protocol):
            row = dict(issue_month=month, calendar_lead=lead, source_relative_lead=lead + 1, target_month=target)
            path = directory / f'{target}.json'
            if path.exists() and target not in pins:
                pins[target] = load_first(path, target, protocol, issues, now)
            if month not in issues:
                row['status'] = 'unissued' if month < current_month else 'awaiting_issue'
            elif target >= current_month:
                row['status'] = 'awaiting_target_close'
            elif target not in pins:
                row['status'] = 'closed_without_pinned_eligible_actual'
            else:
                _, digest, value = pins[target]
                predictions = issues[month][0]['predictions']
                errors = {p['method']: Decimal(p['prediction_ampoules']) - value for p in predictions
                          if p['calendar_lead'] == lead}
                scored[lead].append((target, value, errors))
                row.update(status='scored', first_actual_sha256=digest,
                           signed_errors_ampoules={method: str(error) for method, error in errors.items()})
            cases.append(row)
        tolerance = Decimal(str(protocol['metrics']['tolerance_ampoules']))
        summaries = [
            dict(calendar_lead=lead, source_relative_lead=lead + 1,
                 case_counts=dict(Counter(row['status'] for row in cases if row['calendar_lead'] == lead)),
                 methods={method: metrics(scored[lead], method, tolerance) for method in issue.METHODS})
            for lead in leads
        ]
    complete = all(len(rows) == protocol['schedule']['planned_issues'] for rows in scored.values())
    return dict(status='COMPLETE_RESEARCH_COHORT' if complete else 'INCOMPLETE_RESEARCH_COHORT',
                protocol_sha256=issue.PROTOCOL_SHA256, scorer_sha256=sha(Path(__file__).read_bytes()),
                python_version=platform.python_version(), scored_at=now.isoformat(),
                scope=protocol['scope'], issue_sha256={month: digest for month, (_, digest) in issues.items()},
                cases=cases, summaries=summaries, selected_method=None,
                business_error_limits_status=protocol['decision_policy']['business_error_limits_status'],
                independently_attested=False, operational_forecasting_approved=False, procurement_approved=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--issues', type=Path, required=True)
    parser.add_argument('--actuals', type=Path, required=True)
    commands = parser.add_subparsers(dest='action', required=True)
    pin = commands.add_parser('pin-actual')
    pin.add_argument('--snapshot', type=Path, required=True)
    pin.add_argument('--restatement', action='store_true')
    report = commands.add_parser('score')
    report.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    try:
        protocol = issue.load_design()
        now = datetime.now(issue.MANILA)
        issues = load_issues(args.issues, protocol, now)
        if args.action == 'pin-actual':
            actual, _ = read_json(args.snapshot, 50_000)
            pin_actual(args.actuals, actual, protocol, issues, now, args.restatement)
            print('Local actual pinned. Source and timing still require operator evidence.')
        else:
            result = score(args.actuals, protocol, issues, now)
            write_once(args.out, result)
            print(result['status'])
    except (OSError, ValueError, KeyError, TypeError, AttributeError, ArithmeticError) as error:
        parser.exit(2, f'Unit study input or output rejected ({type(error).__name__}).\n')


if __name__ == '__main__':
    main()
