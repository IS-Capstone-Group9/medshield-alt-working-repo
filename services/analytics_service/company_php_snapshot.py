"""Prepare read-only SQL and reconcile operator-exported forward snapshots.

No credentials, warehouse calls, approval generation or prediction issuance.
"""
import argparse
import json
import re
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from . import company_php_forward as forward

require = forward.require
COUNTS = ('source_records', 'net_eligible_records', 'unreviewed_source_records')
DECIMALS = ('net_sales_php', 'positive_sales_php', 'negative_sales_php')


def identity_check(identity):
    require(set(identity) == {'dataset_id', 'policy_version', 'source_table', 'delta_version',
                              'receipt_sha256'}, 'Exact source identity fields required')
    for key in ('dataset_id', 'receipt_sha256'):
        require(re.fullmatch(r'[0-9a-f]{64}', identity[key]) is not None, 'Invalid identity hash')
    require(identity['policy_version'] == 'original_source_layers_v1_candidate_only', 'Policy mismatch')
    require(re.fullmatch(r'\w+\.\w+\.\w+_itemized_candidates', identity['source_table']) is not None,
            'Controlled itemized table required')
    require(type(identity['delta_version']) is int and identity['delta_version'] >= 0, 'Invalid Delta version')


def query(identity, history_end):
    identity_check(identity)
    require(re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', history_end) is not None
            and '2020-01' <= history_end <= '2040-12', 'Invalid history end')
    table = '.'.join('`' + part + '`' for part in identity['source_table'].split('.'))
    following = forward.period(forward.month(history_end) + 1) + '-01'
    # Invalid dates remain in the control population, causing the adapter to fail.
    return f"""WITH observations AS (
 SELECT DATE_FORMAT(date_delivered,'yyyy-MM') AS month_key, dataset_id, policy_version,
        net_sales, is_net_sales_technically_eligible AS eligible, source_data_status
 FROM {table} VERSION AS OF {identity['delta_version']}
 WHERE record_kind='itemized_sale' AND
       (date_delivered IS NULL OR (date_delivered >= DATE '2020-01-01' AND date_delivered < DATE '{following}'))
)
SELECT CASE WHEN GROUPING(month_key)=1 THEN 'control' ELSE 'monthly' END AS row_kind,
 month_key AS month, MIN(dataset_id) AS dataset_id_min, MAX(dataset_id) AS dataset_id_max,
 MIN(policy_version) AS policy_min, MAX(policy_version) AS policy_max,
 COUNT(*) AS source_records, COUNT_IF(eligible) AS net_eligible_records,
 COUNT_IF(source_data_status IS NULL OR source_data_status <> 'reviewed') AS unreviewed_source_records,
 COUNT_IF(month_key IS NULL) AS undated_records,
 COUNT_IF(dataset_id IS NULL OR policy_version IS NULL OR eligible IS NULL) AS invalid_identity_records,
 TO_JSON(SORT_ARRAY(COLLECT_SET(COALESCE(source_data_status,'MISSING')))) AS source_data_status_json,
 CAST(SUM(CASE WHEN eligible THEN net_sales END) AS STRING) AS net_sales_php,
 CAST(SUM(CASE WHEN eligible AND net_sales > 0 THEN net_sales ELSE 0 END) AS STRING) AS positive_sales_php,
 CAST(SUM(CASE WHEN eligible AND net_sales < 0 THEN net_sales ELSE 0 END) AS STRING) AS negative_sales_php
FROM observations GROUP BY GROUPING SETS ((month_key),())
ORDER BY row_kind, month
"""


def plan(identity, history_end):
    sql = query(identity, history_end)
    return dict(schema_version=1, scope=forward.SCOPE, history_end=history_end,
                source_identity=identity, sql=sql, query_sha256=forward.digest(sql.encode()),
                warehouse_writes=0, executed=False)


def integer(value):
    require((type(value) is int and value >= 0) or
            (isinstance(value, str) and re.fullmatch(r'\d{1,12}', value) is not None),
            'Nonnegative integer count required')
    return int(value)


def decimal(value):
    require(isinstance(value, str) and re.fullmatch(r'-?\d{1,16}(\.\d{1,6})?', value) is not None,
            'Exact signed decimal string required')
    return Decimal(value)


def build_snapshot(request, export_raw, receipt_raw, now, fixture=False):
    require(type(fixture) is bool, 'Boolean fixture flag required')
    expected = plan(request['source_identity'], request['history_end'])
    require(request == expected, 'Query plan changed')
    require(len(export_raw) <= 2_000_000 and len(receipt_raw) <= 100_000, 'Input too large')
    receipt = json.loads(receipt_raw)
    require(receipt['schema_version'] == 1 and receipt['source_identity'] == request['source_identity'],
            'Receipt identity mismatch')
    require(receipt['query_sha256'] == request['query_sha256'] and
            receipt['export_sha256'] == forward.digest(export_raw), 'Receipt/query/export hash mismatch')
    require(receipt['verification_status'] == ('SYNTHETIC_FIXTURE' if fixture else 'OPERATOR_VERIFIED'),
            'Pending verification cannot produce a snapshot')
    require(forward.clock(receipt['extracted_at']) <= forward.clock(receipt['verified_at']) <= forward.clock(now),
            'Invalid receipt timestamps')
    rows = json.loads(export_raw)
    require(isinstance(rows, list) and 37 <= len(rows) <= 601, 'Monthly rows and one control required')
    controls = [r for r in rows if r['row_kind'] == 'control']
    monthly = [r for r in rows if r['row_kind'] == 'monthly']
    require(len(controls) == 1 and len(monthly) + 1 == len(rows) and controls[0]['month'] is None,
            'Exactly one control and monthly rows required')
    identity = request['source_identity']
    normalized = []
    all_statuses = set()
    for row in rows:
        require(row['dataset_id_min'] == row['dataset_id_max'] == identity['dataset_id'] and
                row['policy_min'] == row['policy_max'] == identity['policy_version'], 'Mixed source identity')
        require(integer(row['undated_records']) == integer(row['invalid_identity_records']) == 0,
                'Undated or unidentified source records')
        counts = {name: integer(row[name]) for name in COUNTS}
        require(0 < counts['net_eligible_records'] <= counts['source_records'] and
                counts['unreviewed_source_records'] <= counts['source_records'], 'Invalid eligibility counts')
        values = {name: decimal(row[name]) for name in DECIMALS}
        require(values['positive_sales_php'] >= 0 and values['negative_sales_php'] <= 0 and
                values['net_sales_php'] == values['positive_sales_php'] + values['negative_sales_php'],
                'Signed financial components do not reconcile')
        statuses = json.loads(row['source_data_status_json'])
        require(isinstance(statuses, list) and statuses and all(isinstance(v, str) and v for v in statuses)
                and statuses == sorted(set(statuses)), 'Distinct ordered source statuses required')
        require((counts['unreviewed_source_records'] > 0) == any(v != 'reviewed' for v in statuses),
                'Source statuses disagree with conservative unreviewed count')
        require('reviewed' in statuses or counts['unreviewed_source_records'] == counts['source_records'],
                'All records must remain unreviewed when no reviewed status exists')
        if row['row_kind'] == 'monthly':
            all_statuses.update(statuses)
            normalized.append(dict(month=row['month'], **counts,
                                   **{name: row[name] for name in DECIMALS}, source_data_status=statuses))
    control = controls[0]
    for name in COUNTS:
        require(sum(row[name] for row in normalized) == integer(control[name]), 'Count control mismatch')
    for name in DECIMALS:
        require(sum((decimal(row[name]) for row in normalized), Decimal(0)) == decimal(control[name]),
                'Financial control mismatch')
    require(sorted(all_statuses) == json.loads(control['source_data_status_json']), 'Status control mismatch')
    require(normalized[0]['month'] == '2020-01' and normalized[-1]['month'] == request['history_end'],
            'Requested history boundaries missing')
    result = dict(schema_version=1, scope=forward.SCOPE, contracts_excluded=True,
                  evidence_kind='synthetic_fixture' if fixture else 'controlled_source',
                  verification_status=receipt['verification_status'], source_identity=identity,
                  extracted_at=receipt['extracted_at'], verified_at=receipt['verified_at'], monthly=normalized,
                  extraction_evidence=dict(query_sha256=request['query_sha256'],
                                           export_sha256=forward.digest(export_raw),
                                           operator_receipt_sha256=forward.digest(receipt_raw),
                                           control=control, independently_attested=False),
                  financial_release_approved=False, model_publication_approved=False)
    forward.parse_snapshot(forward.encoded(result), now, fixture)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['plan', 'build'])
    parser.add_argument('--identity', type=Path)
    parser.add_argument('--history-end')
    parser.add_argument('--request', type=Path)
    parser.add_argument('--export', type=Path)
    parser.add_argument('--receipt', type=Path)
    parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    if args.action == 'plan':
        require(args.identity is not None and args.history_end is not None, 'Identity and history end required')
        result = plan(json.loads(args.identity.read_bytes()), args.history_end)
    else:
        require(all((args.request, args.export, args.receipt)), 'Request, export and operator receipt required')
        result = build_snapshot(json.loads(args.request.read_bytes()), args.export.read_bytes(),
                                args.receipt.read_bytes(), datetime.now(forward.MANILA))
    forward.exclusive_write(args.out, result)


if __name__ == '__main__':
    main()
