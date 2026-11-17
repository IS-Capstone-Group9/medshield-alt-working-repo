"""SELECT-only Spark-compatible adapter for prospective recorded-unit research.

execute(sql) must return an iterable of dictionaries. No credential acquisition,
source repair, forecasting, table writes or publication occurs here.
"""
import base64
import json
import os
import re
import tempfile
import zlib
from datetime import datetime, timezone
from decimal import Decimal, localcontext
from pathlib import Path

from . import unit_prospective_issue as issue

MAX_ROWS = 10000


def table_name(value):
    issue.require(isinstance(value, str) and re.fullmatch(r'workspace\.[A-Za-z0-9_]+\.[A-Za-z0-9_]+', value), 'Invalid controlled table identifier')
    return value


def version(value):
    issue.require(type(value) is int and value >= 0, 'Invalid Delta version')
    return value


def rows_sql(table, delta_version):
    # Full confirmed-scope history, including invalid/null dates: validation must
    # see those rows rather than silently filter them out. Upper bound is checked
    # after extraction; issue/target-month data makes the extraction reject.
    return f"""SELECT dataset_id, policy_version, source_record_id, source_workbook, source_file_sha256, source_row_number,
normalized_product, area AS raw_area, record_kind,
CAST(date_delivered AS STRING) AS date, CAST(recorded_quantity AS STRING) AS recorded_quantity,
source_data_status FROM {table_name(table)} VERSION AS OF {version(delta_version)}
WHERE record_kind='itemized_sale' AND area='HOSPITAL'
AND normalized_product IN ('BUPIRIGHT','BUPIRIGHT 5MG/ML 0.5% IN 8% 4ML')
ORDER BY source_record_id LIMIT {MAX_ROWS+1}"""


def read_rows(execute, sql, queries):
    queries.append(sql)
    rows = list(execute(sql))
    issue.require(len(rows) <= MAX_ROWS, 'Source row bound exceeded; possible truncation')
    return rows


def receipt(execute, table, delta_version, queries):
    sql = f'SELECT dataset_id,record_id,payload_sha256,payload_b64 FROM {table_name(table)} VERSION AS OF {version(delta_version)} LIMIT 3'
    envelope = read_rows(execute, sql, queries)
    issue.require(len(envelope) == 1 and envelope[0]['record_id'] == 'gold_receipt', 'Expected unique Gold receipt')
    entry = envelope[0]
    compressed = base64.b64decode(entry['payload_b64'], validate=True)
    decoder = zlib.decompressobj()
    raw = decoder.decompress(compressed, 100001)
    issue.require(len(raw) <= 100000 and decoder.eof and not decoder.unused_data and
                  not decoder.unconsumed_tail and issue.sha(raw) == entry['payload_sha256'], 'Receipt payload hash mismatch')
    payload = json.loads(raw)
    issue.require(payload['dataset_id'] == entry['dataset_id'] and issue.is_hash(entry['dataset_id']), 'Receipt dataset mismatch')
    issue.require(payload['record_id'] == 'gold_receipt', 'Expected Gold receipt payload')
    return payload, issue.sha(raw)


def validate_rows(rows, protocol, last_month, dataset_id):
    ids = set()
    for row in rows:
        issue.require(set(row) == {'dataset_id', 'policy_version', 'source_record_id', 'source_workbook', 'source_file_sha256', 'source_row_number',
                                  'normalized_product', 'raw_area', 'record_kind', 'date', 'recorded_quantity', 'source_data_status'}, 'Unexpected Gold row fields')
        key = row['source_record_id']
        issue.require(isinstance(key, str) and key and key not in ids, 'Missing or duplicate source ID')
        ids.add(key)
        issue.require(row['dataset_id'] == dataset_id and row['policy_version'] == protocol['prior_evidence']['source']['policy_version'], 'Mixed source identity')
        issue.require(row['normalized_product'] in protocol['scope']['labels'] and row['raw_area'] == 'HOSPITAL' and
                      row['record_kind'] == 'itemized_sale', 'Out-of-scope source row')
        issue.require(isinstance(row['source_workbook'], str) and row['source_workbook'] and issue.is_hash(row['source_file_sha256']), 'Missing file lineage')
        issue.require(str(row['source_row_number']).isdigit() and int(row['source_row_number']) > 0, 'Invalid physical row lineage')
        date = row['date']
        issue.require(isinstance(date, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', date), 'Missing or invalid delivery date')
        datetime.strptime(date, '%Y-%m-%d')
        issue.require(date[:7] <= last_month, 'Issue/target-month data is forbidden in extraction')
        issue.quantity(row['recorded_quantity'])
        issue.require(isinstance(row['source_data_status'], str) and 0 < len(row['source_data_status']) <= 100, 'Source quality status required')


def extract(execute, source_table, source_version, receipt_table, receipt_version,
            issue_month, now=None):
    """Query pinned Gold and predecessor, reconcile, then return writer inputs.

    now is injectable for tests. A live wrapper must omit it and use the machine
    clock. Adapter captures data, but does not prove human non-exposure or source
    completeness; retain query audit records and normal source approvals.
    """
    protocol = issue.load_design()
    clock = now or (lambda: datetime.now(timezone.utc))
    started = clock().astimezone(issue.MANILA)
    issue.month_number(issue_month)
    issue.require(started.strftime('%Y-%m') == issue_month, 'Outside named issue month')
    schedule = protocol['schedule']
    issue.require(schedule['first_issue_month'] <= issue_month <= schedule['last_issue_month'], 'Unregistered issue month')
    source_table, receipt_table = table_name(source_table), table_name(receipt_table)
    issue.require(source_table.endswith('_itemized_candidates') and receipt_table.endswith('_receipt'), 'Expected controlled candidate and receipt tables')
    queries = []
    current, current_hash = receipt(execute, receipt_table, receipt_version, queries)
    issue.require(current['pipeline_policy'] == protocol['prior_evidence']['source']['policy_version'], 'Changed eligibility policy')
    prefix = source_table.removesuffix('_itemized_candidates')
    issue.require(receipt_table == prefix+'_receipt' and current['batch_id'] == prefix.split('.')[-1], 'Receipt/table batch mismatch')
    # Gold create/readback receipts describe immutable version-zero candidate
    # releases. A later source must be a new controlled candidate, not a mutable
    # table version claiming that an old creation receipt verifies new content.
    issue.require(source_version == 0 and receipt_version == 0, 'Only immutable new Delta0 release pairs supported')
    prior = protocol['prior_evidence']['source']
    prior_receipt_table = prior['fact_table'].removesuffix('_itemized_candidates') + '_receipt'
    previous, previous_hash = receipt(execute, prior_receipt_table, 0, queries)
    issue.require(previous_hash == prior['receipt_sha256'] and previous['dataset_id'] == prior['dataset_id'], 'Changed predecessor receipt')
    issue.require(current['dataset_id'] != prior['dataset_id'] and source_table != prior['fact_table'], 'New controlled candidate required')
    # The scoped unit confirmation remains fixed; master drift requires review.
    issue.require(current['accepted_master_sha256'] == previous['accepted_master_sha256'], 'Changed product master requires a new reviewed contract')
    last_month = issue.month_after(issue_month, -1)
    rows = read_rows(execute, rows_sql(source_table, source_version), queries)
    predecessor = read_rows(execute, rows_sql(prior['fact_table'], 0), queries)
    validate_rows(predecessor, protocol, protocol['prior_evidence']['last_observed_month'], previous['dataset_id'])
    validate_rows(rows, protocol, last_month, current['dataset_id'])
    # Dataset identity changes on the successor; retain every other scoped field.
    old = {row['source_record_id']: {k:v for k,v in row.items() if k != 'dataset_id'} for row in predecessor}
    past = {row['source_record_id']: {k:v for k,v in row.items() if k != 'dataset_id'} for row in rows if row['date'][:7] <= protocol['prior_evidence']['last_observed_month']}
    issue.require(old == past and len(old) == 50, 'Historical scoped rows changed, added or disappeared')
    reconciliation = dict(status='EXACT_PREDECESSOR_SCOPED_ROWS_PRESERVED', previous_receipt_sha256=previous_hash,
                          current_receipt_sha256=current_hash, previous_rows_sha256=issue.canonical_sha(sorted(predecessor, key=lambda r:r['source_record_id'])),
                          current_rows_sha256=issue.canonical_sha(sorted(rows, key=lambda r:r['source_record_id'])),
                          unchanged_historical_records=len(old), current_scoped_records=len(rows),
                          preserved_repeated_business_rows='distinct_source_ids_retained', query_sha256=issue.canonical_sha(queries),
                          code_sha256=issue.sha(Path(__file__).read_bytes()),
                          limitation='scoped_append_only_reconciliation_not_company_completeness_or_business_release')
    # Use the most recent 12 observed calendar months, never insert absent months.
    first_month = issue.month_after(last_month, -11)
    monthly = []
    with localcontext() as context:
        context.prec = 50
        for offset in range(12):
            month = issue.month_after(first_month, offset)
            group = [r for r in rows if r['date'][:7] == month]
            issue.require(group, 'Missing observed training month; no zero filling')
            monthly.append(dict(month=month, ampoules=str(sum((issue.quantity(r['recorded_quantity']) for r in group), Decimal(0))),
                                source_records=len(group), unreviewed_source_records=sum(r['source_data_status'] == 'UNREVIEWED_SOURCE_EXPORT' for r in group),
                                source_data_status=sorted({r['source_data_status'] for r in group}), zero_evidence_sha256=None))
    finished = clock().astimezone(issue.MANILA)
    issue.require(started <= finished and finished.strftime('%Y-%m') == issue_month, 'Extraction crossed deadline or clock reversed')
    source = dict(source_table=source_table, source_delta_version=0, dataset_id=current['dataset_id'],
                  policy_version=current['pipeline_policy'], source_receipt_sha256=current_hash,
                  mapping_confirmation_sha256=prior['confirmation_sha256'])
    snapshot = dict(schema_version=1, scope=protocol['scope'], source=source, extracted_at=finished.isoformat(), monthly=monthly)
    snapshot_raw = (json.dumps(snapshot, ensure_ascii=False, indent=2)+'\n').encode('utf-8')
    verification = dict(status='VERIFIED_CONTROLLED_GOLD_RESEARCH_EXTRACTION', snapshot_sha256=issue.sha(snapshot_raw), source=source,
                        verified_at=finished.isoformat(), controlled_successor_reconciliation_sha256=issue.canonical_sha(reconciliation),
                        history_end_month=last_month, monthly_records=12,
                        source_records=sum(r['source_records'] for r in monthly),
                        unreviewed_source_records=sum(r['unreviewed_source_records'] for r in monthly))
    verification_raw = (json.dumps(verification, indent=2)+'\n').encode('utf-8')
    issue.validate_inputs(snapshot, verification, issue.sha(snapshot_raw), issue_month, finished, protocol)
    return dict(snapshot_raw=snapshot_raw, receipt_raw=verification_raw,
                reconciliation=reconciliation, queries=queries, source_rows=rows,
                gold_receipts={'predecessor': previous, 'current': current})


def write_bundle(result, destination):
    """Publish a complete create-only local folder; never replace an existing one."""
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = Path(tempfile.mkdtemp(prefix='.unit-extract-', dir=destination.parent))
    try:
        (temporary/'snapshot.json').write_bytes(result['snapshot_raw'])
        (temporary/'receipt.json').write_bytes(result['receipt_raw'])
        for key in ['reconciliation', 'queries', 'source_rows', 'gold_receipts']:
            (temporary/(key+'.json')).write_text(json.dumps(result[key], ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        # Windows rename fails if the target exists (including nonempty targets).
        # Explicit precheck also protects empty existing folders on POSIX.
        issue.require(not destination.exists(), 'Extraction destination already exists')
        os.rename(temporary, destination)
    finally:
        # Only remove files created in this private temporary folder, never the
        # destination or caller data. Successful rename makes this path absent.
        if temporary.exists():
            for file in temporary.iterdir(): file.unlink()
            temporary.rmdir()
    return destination


def extract_from_spark(spark, source_table, receipt_table, issue_month, destination):
    """Databricks execution entry point: SELECTs + local evidence files only."""
    def execute(sql):
        return [row.asDict(recursive=True) for row in spark.sql(sql).toLocalIterator()]
    result = extract(execute, source_table, 0, receipt_table, 0, issue_month)
    return write_bundle(result, destination)
