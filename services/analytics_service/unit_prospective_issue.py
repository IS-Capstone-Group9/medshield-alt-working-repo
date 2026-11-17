"""Offline, create-only research issuance. No warehouse, serving or scoring client."""
import argparse
import base64
import hashlib
import json
import os
import platform
import re
import tempfile
from datetime import datetime, timedelta, timezone
from decimal import Decimal, localcontext
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DESIGN = ROOT / 'outputs/unit_prospective_protocol_20261029'
PROTOCOL_SHA256 = '65714d0bbf75afd5ca6abddf0e89a66abba20ff606c1278625cb66059a6fe5c5'
MANILA = timezone(timedelta(hours=8), name='Asia/Manila')
METHODS = ('last_value', 'mean_3', 'mean_6', 'seasonal_naive_12')


def require(condition, reason):
    if not condition:
        raise ValueError(reason)


def sha(payload):
    return hashlib.sha256(payload).hexdigest()


def canonical_sha(value):
    return sha(json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode('utf-8'))


def month_number(month):
    require(isinstance(month, str) and re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month), 'Invalid month')
    year, number = map(int, month.split('-'))
    return year * 12 + number - 1


def month_after(month, distance):
    number = month_number(month) + distance
    return f'{number // 12:04d}-{number % 12 + 1:02d}'


def timestamp(value):
    require(isinstance(value, str), 'Timestamp must be an ISO string')
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    require(parsed.tzinfo is not None and parsed.utcoffset() is not None, 'Timezone required')
    return parsed.astimezone(MANILA)


def is_hash(value):
    return isinstance(value, str) and re.fullmatch('[0-9a-f]{64}', value) is not None


def integer(value):
    return type(value) is int and value >= 0


def quantity(value):
    require(isinstance(value, str) and len(value) <= 64, 'Quantity must be a bounded decimal string')
    try:
        result = Decimal(value)
    except ArithmeticError as error:
        raise ValueError('Invalid quantity') from error
    require(result.is_finite() and abs(result) <= Decimal('1e12') and result.as_tuple().exponent >= -12,
            'Nonfinite, excessive or unsupported source precision')
    return result


def load_design(directory=DESIGN):
    raw = (directory / 'protocol.json').read_bytes()
    registration = json.loads((directory / 'registration.json').read_bytes())
    require(sha(raw) == PROTOCOL_SHA256 == registration['protocol_sha256'], 'Changed registered protocol')
    require(sha((directory / 'planned-cases.csv').read_bytes()) == registration['schedule_sha256'], 'Changed registered calendar')
    return json.loads(raw)


def validate_inputs(snapshot, receipt, snapshot_sha256, issue_month, issued_at, protocol):
    require(issued_at.tzinfo is not None, 'Issue timezone required')
    issued_at = issued_at.astimezone(MANILA)
    schedule = protocol['schedule']
    require(schedule['first_issue_month'] <= issue_month <= schedule['last_issue_month'], 'Issue outside registered schedule')
    month_number(issue_month)
    require(issued_at.strftime('%Y-%m') == issue_month, 'Early or late issue; backdating is not supported')
    require(set(snapshot) == {'schema_version', 'scope', 'source', 'extracted_at', 'monthly'}, 'Unexpected snapshot fields')
    require(type(snapshot['schema_version']) is int and snapshot['schema_version'] == 1, 'Unknown snapshot schema')
    require(snapshot['scope'] == protocol['scope'], 'Changed product, channel, unit or contract scope')
    source = snapshot['source']
    require(set(source) == {'source_table', 'source_delta_version', 'dataset_id', 'policy_version',
                            'source_receipt_sha256', 'mapping_confirmation_sha256'}, 'Invalid source fields')
    require(isinstance(source['source_table'], str) and re.fullmatch(r'workspace\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+_itemized_candidates', source['source_table']), 'Expected controlled original Gold candidate')
    require(integer(source['source_delta_version']), 'Invalid source version')
    for name in ['dataset_id', 'source_receipt_sha256', 'mapping_confirmation_sha256']:
        require(is_hash(source[name]), 'Invalid source hash')
    prior = protocol['prior_evidence']['source']
    require(source['policy_version'] == prior['policy_version'], 'Changed source eligibility policy')
    require(source['mapping_confirmation_sha256'] == prior['confirmation_sha256'], 'Changed confirmed alias/unit mapping')
    require(receipt.get('status') == 'VERIFIED_CONTROLLED_GOLD_RESEARCH_EXTRACTION', 'Extraction verification receipt required')
    required_receipt = {'status', 'snapshot_sha256', 'source', 'verified_at',
                        'controlled_successor_reconciliation_sha256', 'history_end_month',
                        'monthly_records', 'source_records', 'unreviewed_source_records'}
    require(required_receipt <= set(receipt) <= required_receipt | {'explicit_zero_evidence'}, 'Unexpected receipt fields')
    require(receipt.get('snapshot_sha256') == snapshot_sha256 and receipt.get('source') == source, 'Receipt/source/snapshot mismatch')
    extracted, verified = timestamp(snapshot['extracted_at']), timestamp(receipt['verified_at'])
    require(extracted.strftime('%Y-%m') == issue_month and extracted <= verified <= issued_at, 'Stale, future or unordered extraction timestamps')
    require(is_hash(receipt.get('controlled_successor_reconciliation_sha256')), 'Controlled successor history reconciliation required')
    require((source['source_table'], source['source_delta_version'], source['dataset_id']) !=
            (prior['fact_table'], prior['fact_version'], prior['dataset_id']), 'Historical Delta0 cannot supply new months')
    history = snapshot['monthly']
    require(isinstance(history, list) and 12 <= len(history) <= 600, 'Need bounded contiguous history of at least 12 months')
    months, values, records, unreviewed = [], {}, 0, 0
    for row in history:
        require(set(row) == {'month', 'ampoules', 'source_records', 'unreviewed_source_records', 'source_data_status', 'zero_evidence_sha256'}, 'Invalid monthly fields')
        month = row['month']
        month_number(month)
        require(month not in values, 'Duplicate month')
        count, unknown = row['source_records'], row['unreviewed_source_records']
        require(integer(count) and integer(unknown) and unknown <= count, 'Invalid monthly record counts')
        statuses = row['source_data_status']
        require(isinstance(statuses, list) and statuses and all(isinstance(s, str) and 0 < len(s) <= 100 for s in statuses), 'Source quality flags required')
        value = quantity(row['ampoules'])
        if count == 0:
            require(value == 0 and is_hash(row['zero_evidence_sha256']) and
                    receipt.get('explicit_zero_evidence', {}).get(month) == row['zero_evidence_sha256'], 'Absent records are not observed zero')
        else:
            require(row['zero_evidence_sha256'] is None, 'Zero attestation only applies to explicit empty months')
        records += count
        unreviewed += unknown
        months.append(month)
        values[month] = value
    require(months == sorted(months), 'History must be ordered')
    require(all(month_after(a, 1) == b for a, b in zip(months, months[1:])), 'Missing history month; no imputation')
    require(months[-1] == month_after(issue_month, -1), 'Stale history or forbidden issue/target-month input')
    require(receipt.get('history_end_month') == months[-1] and receipt.get('monthly_records') == len(history), 'History receipt mismatch')
    require(type(receipt.get('source_records')) is int and receipt['source_records'] == records and
            type(receipt.get('unreviewed_source_records')) is int and receipt['unreviewed_source_records'] == unreviewed, 'Source controls do not reconcile')
    return values, issued_at


def estimates(values, issue_month, lead):
    history = list(values.values())
    seasonal_month = month_after(month_after(issue_month, lead), -12)
    require(seasonal_month in values, 'Seasonal reference month unavailable')
    with localcontext() as context:
        context.prec = 50
        return dict(last_value=history[-1], mean_3=sum(history[-3:])/3,
                    mean_6=sum(history[-6:])/6, seasonal_naive_12=values[seasonal_month])


def validate_cohort(issue, protocol):
    rows = issue['predictions']
    expected = {(lead, method) for lead in (1, 3) for method in METHODS}
    require(len(rows) == 8 and {(r['calendar_lead'], r['method']) for r in rows} == expected, 'Incomplete or duplicate method/lead cohort')
    for row in rows:
        require(set(protocol['issue_ledger_required_fields']) == set(row), 'Unexpected or missing ledger field')
        require(row['operational_forecasting_approved'] is False and row['protocol_sha256'] == PROTOCOL_SHA256, 'Invalid release or protocol state')
        require(row['issue_month'] == issue['issue_month'] and row['issued_at'] == issue['issued_at'], 'Inconsistent cohort issue')
        require(row['history_end_month'] == month_after(row['issue_month'], -1), 'Invalid source gap')
        require(row['target_month'] == month_after(row['issue_month'], row['calendar_lead']) and
                row['source_relative_lead'] == row['calendar_lead'] + 1, 'Invalid calendar lead')
        require(isinstance(row['prediction_ampoules'], str) and Decimal(row['prediction_ampoules']).is_finite(), 'Invalid prediction')
        require('actual_ampoules' not in row, 'Issue must not include target actuals')


def validate_issue(issue):
    """Reconcile a prepared local issue to its embedded inputs; not a warehouse attestation."""
    protocol = load_design()
    validate_cohort(issue, protocol)
    for name, parsed_key, hash_key in [('snapshot', 'snapshot', 'snapshot_sha256'),
                                      ('receipt', 'extraction_verification_receipt', 'extraction_verification_receipt_sha256')]:
        raw = base64.b64decode(issue['input_payloads_base64'][name], validate=True)
        require(sha(raw) == issue[hash_key] and json.loads(raw) == issue[parsed_key], 'Changed exact input payload or hash')
    require(issue['operational_forecasting_approved'] is False and issue['selected_method'] is None and
            issue['prospective_accuracy_measured'] is False and issue['live_serving_changed'] is False and
            issue['warehouse_writes'] == 0, 'Invalid issue release/accuracy state')
    require(canonical_sha(issue['snapshot']) == issue['snapshot_canonical_sha256'] and
            canonical_sha(issue['extraction_verification_receipt']) == issue['receipt_canonical_sha256'], 'Changed embedded source evidence')
    values, _ = validate_inputs(issue['snapshot'], issue['extraction_verification_receipt'], issue['snapshot_sha256'],
                               issue['issue_month'], timestamp(issue['issued_at']), protocol)
    training_hash = canonical_sha(issue['snapshot']['monthly'])
    source = issue['snapshot']['source']
    receipt = issue['extraction_verification_receipt']
    quality = {'source_records': receipt['source_records'], 'unreviewed_source_records': receipt['unreviewed_source_records'],
               'source_data_status': sorted({s for r in issue['snapshot']['monthly'] for s in r['source_data_status']})}
    for row in issue['predictions']:
        require(all(row[key] == value for key, value in source.items()), 'Changed row source lineage')
        require(row['issue_id'] == issue['issue_id'] and row['quality_status'] == quality and
                row['extracted_at'] == issue['snapshot']['extracted_at'] and
                row['pre_target_access_attestation_status'] == 'not_independently_attested', 'Changed row evidence or attestation')
        require(row['runtime_versions'] == {'python': platform.python_version(), 'decimal_precision': 50}, 'Changed runtime identity')
        require(row['training_values_sha256'] == training_hash and row['code_sha256'] == sha(Path(__file__).read_bytes()), 'Changed training or writer code')
        require(Decimal(row['prediction_ampoules']) == estimates(values, issue['issue_month'], row['calendar_lead'])[row['method']], 'Prediction differs from registered recipe')


def build_issue(snapshot_raw, receipt_raw, issue_month, issued_at):
    """Pure preparation; tests supply synthetic times. CLI alone supplies the real clock."""
    protocol = load_design()
    snapshot, receipt = json.loads(snapshot_raw), json.loads(receipt_raw)
    values, issued_at = validate_inputs(snapshot, receipt, sha(snapshot_raw), issue_month, issued_at, protocol)
    training_hash = canonical_sha(snapshot['monthly'])
    source = snapshot['source']
    issue_id = 'unit_' + issue_month.replace('-', '')
    rows = []
    with localcontext() as context:
        context.prec = 50
        for lead in (1, 3):
            target = month_after(issue_month, lead)
            predictions = estimates(values, issue_month, lead)
            for method in METHODS:
                rows.append(dict(protocol_sha256=PROTOCOL_SHA256, issue_id=issue_id,
                    issued_at=issued_at.isoformat(), issue_month=issue_month, history_end_month=month_after(issue_month, -1),
                    calendar_lead=lead, source_relative_lead=lead+1, target_month=target, method=method,
                    prediction_ampoules=str(predictions[method]), **source,
                    training_values_sha256=training_hash, code_sha256=sha(Path(__file__).read_bytes()),
                    runtime_versions={'python': platform.python_version(), 'decimal_precision': 50},
                    extracted_at=snapshot['extracted_at'],
                    quality_status={'source_records': receipt['source_records'], 'unreviewed_source_records': receipt['unreviewed_source_records'],
                                    'source_data_status': sorted({s for r in snapshot['monthly'] for s in r['source_data_status']})},
                    pre_target_access_attestation_status='not_independently_attested', operational_forecasting_approved=False))
    issue = dict(status='ISSUED_RESEARCH_BASELINES_NOT_OPERATIONALLY_APPROVED', issue_id=issue_id,
                 issue_month=issue_month, issued_at=issued_at.isoformat(), protocol_sha256=PROTOCOL_SHA256,
                 snapshot_sha256=sha(snapshot_raw), extraction_verification_receipt_sha256=sha(receipt_raw),
                 snapshot_canonical_sha256=canonical_sha(snapshot), receipt_canonical_sha256=canonical_sha(receipt),
                 input_payloads_base64={'snapshot': base64.b64encode(snapshot_raw).decode('ascii'),
                                        'receipt': base64.b64encode(receipt_raw).decode('ascii')},
                 input_verification_boundary='operator_supplied_receipt_not_independent_warehouse_verification',
                 snapshot=snapshot, extraction_verification_receipt=receipt, predictions=rows,
                 selected_method=None, operational_forecasting_approved=False, warehouse_writes=0,
                 prospective_accuracy_measured=False, live_serving_changed=False)
    validate_issue(issue)
    return issue


def write_issue(issue, directory):
    """One atomic, exclusive file for the entire cohort, including concurrent callers."""
    validate_issue(issue)
    require(issue['issue_id'] == 'unit_' + issue['issue_month'].replace('-', ''), 'Invalid issue identity')
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    destination = directory / (issue['issue_id'] + '.json')
    payload = (json.dumps(issue, ensure_ascii=False, indent=2, allow_nan=False)+'\n').encode('utf-8')
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=directory, prefix='.unit-issue-', suffix='.tmp', delete=False) as output:
            temporary = Path(output.name)
            output.write(payload)
            output.flush()
            os.fsync(output.fileno())
        os.link(temporary, destination)  # Atomic fail-if-exists; never fall back to replacement.
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    return destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', type=Path)
    parser.add_argument('--receipt', type=Path)
    parser.add_argument('--issue-month')
    parser.add_argument('--out', type=Path)
    parser.add_argument('--validate-issue', type=Path, help='Read-only validation of an existing local issue')
    args = parser.parse_args()
    try:
        if args.validate_issue:
            require(not any([args.snapshot, args.receipt, args.issue_month, args.out]), 'Validation does not accept issuance options')
            validate_issue(json.loads(args.validate_issue.read_bytes()))
            print(json.dumps({'status': 'PASS_LOCAL_RESEARCH_ISSUE_VALIDATION', 'warehouse_verified': False, 'files_written': 0}))
            return
        require(all([args.snapshot, args.receipt, args.issue_month, args.out]), 'All issuance arguments required')
        # No user-supplied timestamp/backdating option. Missing source fails, no substitute.
        snapshot_raw, receipt_raw = args.snapshot.read_bytes(), args.receipt.read_bytes()
        require(len(snapshot_raw) <= 2_000_000 and len(receipt_raw) <= 100_000, 'Input too large')
        issue = build_issue(snapshot_raw, receipt_raw, args.issue_month, datetime.now(timezone.utc))
        path = write_issue(issue, args.out)
        print(json.dumps({'status': issue['status'], 'issue_file': str(path), 'predictions': 8,
                          'operational_forecasting_approved': False}))
    except (OSError, ValueError, KeyError, TypeError, ArithmeticError) as error:
        # Avoid echoing source content or raw business input in CLI diagnostics.
        parser.exit(2, f'Issue rejected ({type(error).__name__}); no replacement or serving change.\n')


if __name__ == '__main__':
    main()
