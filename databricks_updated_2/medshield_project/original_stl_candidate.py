"""Generated into one self-contained staging notebook; no application serving changes."""
import base64
import hashlib
import json
from decimal import Decimal

CANDIDATE_SCHEMA = 'workspace.medshield_original_stl_20261027'
CANDIDATE_COLUMNS = ['row_id', 'record_type', 'period', 'release_id', 'dataset_id',
                     'policy_version', 'payload_sha256', 'payload_json']


def canonical_json(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':'), allow_nan=False)


def content_hash(value):
    return hashlib.sha256(canonical_json(value).encode('utf-8')).hexdigest()


def checked_package(package, expected_hash):
    require(content_hash(package) == expected_hash, 'STL package bytes differ from reviewed export package')
    source = package['source']
    require(source == {'source_table': SOURCE_TABLE, 'source_delta_version': 0,
                       'dataset_id': DATASET_ID, 'policy': POLICY,
                       'receipt_sha256': RECEIPT_SHA256, 'monthly_sha256': MONTHLY_LOGICAL_SHA256},
            'STL package source identity differs')
    require(package['policy'] == 'original_itemized_stl_export_candidate_v1', 'Unexpected STL candidate policy')
    monthly = validate_monthly(package['monthly_rows'])
    require(package['calendar'] == calendar_rows(monthly), 'Calendar differs from checked monthly source')
    require(package['method'] == {'name': 'STL', 'period': 12, 'seasonal_window': 13, 'robust': True,
                                 'minimum_contiguous_months': 36, 'missing_policy': 'no_imputation_split_at_gaps',
                                 'statsmodels_version': '0.14.6', 'numpy_version': '2.3.4'}, 'STL method differs')
    require(package['contracts_excluded'] is True and package['financial_release_approved'] is False
            and package['model_publication_approved'] is False, 'Unexpected scope or approval')
    require(package['source_export_hashes'] == VERIFIED_EXPORT_HASHES, 'STL exported-evidence identities differ')
    calendar = package['calendar']
    runs, current = [], []
    for row in calendar:
        if row['status'] == 'observed_source_month':
            current.append(row['period'])
        elif current:
            runs.append(current)
            current = []
    if current:
        runs.append(current)
    expected_periods = [period for run in runs if len(run) >= 36 for period in run]
    components = package['components']
    require([row['period'] for row in components] == expected_periods, 'STL component coverage differs')
    require(len(calendar) == 120 and len(components) == 81, 'Unexpected STL calendar/component count')
    observed = {row['period']: row['net_sales_php'] for row in calendar}
    for row in components:
        require(set(row) == {'period', 'observed', 'trend', 'seasonal', 'residual'}, 'Unexpected component fields')
        values = {key: numeric(row[key]) for key in ('observed', 'trend', 'seasonal', 'residual')}
        require(values['observed'] == numeric(observed[row['period']]), 'STL observation differs from Gold monthly input')
        require(abs(values['observed'] - values['trend'] - values['seasonal'] - values['residual']) <= Decimal('.000001'),
                'STL export reconstruction differs')
    return monthly


def candidate_records(package, expected_hash):
    checked_package(package, expected_hash)
    release = 'stl_' + expected_hash[:24]
    metadata = {'release_id': release, 'package_sha256': expected_hash, **package['source'], 'source': package['source'],
                'policy': package['policy'], 'method': package['method'], 'controls': EXPECTED_TOTALS,
                'source_export_hashes': package['source_export_hashes'],
                'population': 'original_itemized_sales_contracts_excluded', 'contracts_excluded': True,
                'financial_release_approved': False, 'model_publication_approved': False,
                'retrospective_diagnostic_only': True, 'origin_safe_forecast_feature': False,
                'calendar_records': 120, 'component_records': 81,
                'limitations': ['Not complete company sales or verified medicine demand.',
                                'No cross-gap imputation; short observed segments have no fitted components.',
                                'Full-series retrospective STL is not a forecast or an origin-safe predictor.'],
                'evidence_origin': 'verified_operator_Databricks_STL_exports',
                'approved_for_live_serving': False}
    rows = []
    for kind, values in [('calendar', package['calendar']), ('component', package['components']), ('receipt', [metadata])]:
        for value in values:
            period = value.get('period')
            payload = canonical_json(value)
            rows.append({'row_id': kind + ':' + (period or 'metadata'), 'record_type': kind,
                         'period': period, 'release_id': release, 'dataset_id': DATASET_ID,
                         'policy_version': package['policy'],
                         'payload_sha256': hashlib.sha256(payload.encode('utf-8')).hexdigest(), 'payload_json': payload})
    require(len(rows) == 202 and len({row['row_id'] for row in rows}) == 202, 'Duplicate/missing candidate record')
    return sorted(rows, key=lambda row: row['row_id'])


def sql_text(value):
    if value is None:
        return 'CAST(NULL AS STRING)'
    # Base64 avoids SQL quote/backslash interpretation inside JSON/text values.
    encoded = base64.b64encode(value.encode('utf-8')).decode('ascii')
    return "CAST(unbase64('" + encoded + "') AS STRING)"


def create_candidate_sql(table, rows):
    require(table == CANDIDATE_SCHEMA + '.stl_' + PACKAGE_SHA256[:24] + '_candidate', 'Candidate target differs')
    require(len(rows) == 202, 'Candidate row bound differs')
    values = ',\n'.join('(' + ','.join(sql_text(row[column]) for column in CANDIDATE_COLUMNS) + ')' for row in rows)
    statement = 'CREATE TABLE ' + table + ' USING DELTA AS SELECT * FROM VALUES\n' + values + '\nAS candidate (' + ','.join(CANDIDATE_COLUMNS) + ')'
    require(len(statement.encode('utf-8')) < 2_000_000, 'Candidate statement exceeds safety limit')
    return statement


def verify_candidate_readback(session, table, expected):
    history = session.sql('DESCRIBE HISTORY ' + table + ' LIMIT 1').collect()
    require(len(history) == 1 and int(history[0]['version']) == 0, 'Candidate table is no longer immutable Delta0')
    actual = session.sql('SELECT ' + ','.join(CANDIDATE_COLUMNS) + ' FROM ' + table
                         + ' VERSION AS OF 0 ORDER BY row_id LIMIT 203').collect()
    rows = [row.asDict() for row in actual]
    require(rows == expected, 'Candidate readback differs; do not overwrite or activate')
    for row in rows:
        require(hashlib.sha256(row['payload_json'].encode('utf-8')).hexdigest() == row['payload_sha256'],
                'Candidate payload checksum differs')
    return content_hash(rows)


def stage_original_stl_candidate(session):
    # All source/package/coverage checks finish before the first DDL statement.
    monthly = read_gold_months(session)
    expected_monthly = checked_package(PACKAGE, PACKAGE_SHA256)
    require(monthly_identity(monthly) == monthly_identity(expected_monthly), 'Live Gold differs from staged evidence')
    rows = candidate_records(PACKAGE, PACKAGE_SHA256)
    release = rows[0]['release_id']
    table = CANDIDATE_SCHEMA + '.' + release + '_candidate'
    created = False
    # CREATE has no replace/overwrite/append/IF NOT EXISTS bypass. A concurrent
    # create may fail; retry will verify the existing content without rewriting.
    if not session.catalog.tableExists(table):
        session.sql('CREATE SCHEMA IF NOT EXISTS ' + CANDIDATE_SCHEMA)
        session.sql(create_candidate_sql(table, rows))
        created = True
    readback_hash = verify_candidate_readback(session, table, rows)
    return {'status': 'ORIGINAL_ITEMIZED_STL_CANDIDATE_STAGED', 'release_id': release,
            'candidate_table': table, 'candidate_delta_version': 0, 'package_sha256': PACKAGE_SHA256,
            'records_sha256': readback_hash, 'source': PACKAGE['source'],
            'calendar_records': 120, 'component_records': 81, 'receipt_records': 1,
            'new_candidate_tables_created': int(created), 'identical_existing_candidate_verified': not created,
            'source_files_modified': False, 'source_tables_modified': False, 'live_serving_changed': False,
            'category_approvals_added': 0, 'financial_release_approved': False,
            'model_publication_approved': False, 'forecasts_trained': 0}
