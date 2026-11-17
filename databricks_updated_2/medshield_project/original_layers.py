"""Original-source Bronze/Silver/Gold candidate logic; never changes live serving.

Embedded into three generated notebooks with the reviewed parsers and accepted
category package validator. No remote execution occurs on importing this module.
"""
import base64
from collections import Counter
from datetime import date, datetime
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import re
import zlib

LAYER_POLICY = 'original_source_layers_v1_candidate_only'
LAYER_SCHEMAS = {
    'bronze': 'workspace.medshield_original_bronze_20261026',
    'silver': 'workspace.medshield_original_silver_20261026',
    'gold': 'workspace.medshield_original_gold_20261026',
}
SOURCE_DIRECTORY = Path('/Workspace/medshield/medshield_project_csv')
DECIMAL_COLUMNS = ('quantity', 'unit_selling_price', 'gross_sales', 'discount_amount',
                   'net_sales', 'unit_acquisition_cost', 'total_acquisition_cost',
                   'gross_margin_amount', 'margin_pct', 'discount_rate',
                   'quantity_primary_candidate', 'quantity_secondary_candidate')


def stable_json(value):
    def encode(item):
        if isinstance(item, Decimal):
            return format(item, 'f')
        if isinstance(item, (date, datetime)):
            return item.isoformat()
        raise TypeError(type(item).__name__)
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, default=encode)


def row_digest(value):
    return hashlib.sha256(stable_json(value).encode('utf-8')).hexdigest()


def evidence_envelope(dataset_id, record_id, value):
    payload = stable_json(value).encode('utf-8')
    return (dataset_id, record_id, hashlib.sha256(payload).hexdigest(),
            base64.b64encode(zlib.compress(payload)).decode('ascii'))


def decode_evidence(row):
    decoder = zlib.decompressobj()
    payload = decoder.decompress(base64.b64decode(row['payload_b64'], validate=True), 150 * 1024 * 1024 + 1)
    require(decoder.eof and not decoder.unused_data and len(payload) <= 150 * 1024 * 1024,
            'Evidence record exceeds reviewed size or has invalid framing')
    require(hashlib.sha256(payload).hexdigest() == row['payload_sha256'], 'Evidence payload checksum mismatch')
    return json.loads(payload)


def content_digest(rows):
    return hashlib.sha256('|'.join(sorted(row_digest(row) for row in rows)).encode()).hexdigest()


def pipeline_tables(dataset_id):
    require(re.fullmatch('[a-f0-9]{64}', dataset_id), 'Invalid original dataset identity')
    batch = hashlib.sha256((dataset_id + PIPELINE_CODE_SHA256 + MANIFEST_SHA256).encode()).hexdigest()[:20]
    prefix = 'original_' + batch
    return dict(batch_id=prefix,
                source_files=LAYER_SCHEMAS['bronze'] + '.' + prefix + '_source_files',
                raw_lines=LAYER_SCHEMAS['bronze'] + '.' + prefix + '_raw_lines',
                bronze_receipt=LAYER_SCHEMAS['bronze'] + '.' + prefix + '_receipt',
                assessed=LAYER_SCHEMAS['silver'] + '.' + prefix + '_assessed_rows',
                silver_receipt=LAYER_SCHEMAS['silver'] + '.' + prefix + '_receipt',
                itemized=LAYER_SCHEMAS['gold'] + '.' + prefix + '_itemized_candidates',
                contracts=LAYER_SCHEMAS['gold'] + '.' + prefix + '_contract_candidates',
                financial=LAYER_SCHEMAS['gold'] + '.' + prefix + '_financial_candidates',
                gold_receipt=LAYER_SCHEMAS['gold'] + '.' + prefix + '_receipt')


def original_bundle(source_directory=SOURCE_DIRECTORY):
    """Preserve exact source bytes as well as normalized physical-line evidence."""
    folder = Path(source_directory)
    paths = sorted(folder.glob('medshield_data_*.csv'))
    require({f'medshield_data_{year}.csv' for year in range(2017, 2027)} <= {p.name for p in paths},
            'Expected the already-supplied 2017–2026 originals')
    require(all(re.fullmatch(r'medshield_data_20\d{2}\.csv', p.name) for p in paths), 'Unexpected source filename')
    bronze = bronze_namespace()
    files, raw = [], []
    for path in paths:
        payload = path.read_bytes()
        require(len(payload) <= 100 * 1024 * 1024, 'Source exceeds reviewed byte limit')
        digest = hashlib.sha256(payload).hexdigest()
        status, policy = bronze['source_provenance'](path.name, digest, payload=payload)
        require(status != 'ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE', 'Upload original CSVs, not adjusted allocations')
        expected = RECONCILED_SOURCE_HASHES.get(path.name)
        if expected is not None and digest not in expected:
            equivalent = path.name == 'medshield_data_2026.csv' and bronze['reviewed_2026_csv_representation'](payload)
            require(equivalent, 'Source differs from reconciled originals; reconcile the changed file before rebuilding')
        lines = bronze['decode_csv_source'](payload, path.name)
        files.append(dict(source_workbook=path.name, source_file_sha256=digest, bytes=len(payload),
                          raw_lines=len(lines), source_data_status=status, source_adjustment_policy=policy,
                          exact_source_bytes_b64=base64.b64encode(payload).decode('ascii')))
        for number, line in enumerate(lines, 1):
            raw.append(dict(dataset_id='', source_record_id=bronze['source_record_key'](path.name, digest, number),
                            source_workbook=path.name, data_source_year=int(path.stem[-4:]), source_row_number=number,
                            source_file_sha256=digest, raw_csv_line=line, source_path=str(path)))
    require(len(raw) <= 250000, 'Combined source exceeds reviewed physical-line limit')
    dataset = bronze['build_dataset_id'](files)
    for row in raw:
        row['dataset_id'] = dataset
    require(len({row['source_record_id'] for row in raw}) == len(raw), 'Duplicate physical-line identities')
    require(all(hashlib.sha256(path.read_bytes()).hexdigest() == row['source_file_sha256']
                for path, row in zip(paths, files)), 'Source changed during read')
    return dict(dataset_id=dataset, files=files, raw=raw)


def assess_bundle(raw):
    """Assess all years together, retaining a disposition for every physical line."""
    rows = silver_namespace()['assess_sales_records'](raw)
    require(len(rows) == len(raw), 'Silver lost physical lines')
    require(Counter(row['source_record_id'] for row in rows) == Counter(row['source_record_id'] for row in raw),
            'Silver changed physical-line identities')
    require(all(row['disposition'] != 'PENDING_RECONCILIATION' for row in rows), 'Silver has unresolved parser dispositions')
    return rows


def restore_assessed(row):
    result = dict(row)
    for field in DECIMAL_COLUMNS:
        if result.get(field) is not None:
            result[field] = Decimal(str(result[field]))
    if result.get('date_delivered') is not None:
        result['date_delivered'] = date.fromisoformat(result['date_delivered'])
    return result


def gold_candidates(assessed, receipt, source_files):
    decisions = {row['normalized_product']: row for row in receipt['decisions']}
    require(len(decisions) == len(receipt['decisions']), 'Duplicate accepted labels')
    provenance = {row['source_workbook']: row['source_data_status'] for row in source_files}
    is_contract = silver_namespace()['is_contract_parent_label']
    itemized, contracts, financial = [], [], []
    for source in assessed:
        if not source['is_analysis_candidate']:
            continue
        contract = is_contract(source.get('product'))
        label = ' '.join((source['product'] or '').split()).upper()
        decision = None if contract else decisions.get(label)
        require(contract or decision is not None, 'Original itemized label lacks accepted category evidence')
        if decision is not None:
            require(decision['category_status'] == 'approved', 'Category decision is not accepted')
            require(decision['product_key'] == hashlib.sha256(label.encode()).hexdigest(), 'Accepted product key mismatch')
        rules = source['quality_rule_codes']
        eligible = source['net_sales'] is not None and 'NET_VALUE_FORMULA_MISMATCH' not in rules
        cost_eligible = source['total_acquisition_cost'] is not None and 'TRANSFER_VALUE_FORMULA_MISMATCH' not in rules
        row = dict(source_record_id=source['source_record_id'], dataset_id=source['dataset_id'],
                   policy_version=LAYER_POLICY, source_workbook=source['source_workbook'],
                   source_file_sha256=source['source_file_sha256'], source_row_number=source['source_row_number'],
                   data_source_year=source['data_source_year'], date_delivered=source['date_delivered'],
                   source_data_status=provenance[source['source_workbook']],
                   record_kind='contract_summary' if contract else 'itemized_sale',
                   product_key=None if contract else decision['product_key'],
                   normalized_product=None if contract else label,
                   area=None if contract else source['area'], dr_number=None if contract else source['dr_number'],
                   product_category=None if contract else decision['product_category'],
                   category_status='not_applicable_contract' if contract else 'approved',
                   category_evidence=None if contract else decision['evidence_source'],
                   recorded_quantity=None if contract else source['quantity'], physical_quantity=None,
                   quantity_unit=None, contract_product_breakdown='unavailable' if contract else 'itemized_source_label',
                   gross_sales=source['gross_sales'], discount_amount=source['discount_amount'],
                   net_sales=source['net_sales'], acquisition_cost=source['total_acquisition_cost'],
                   gross_margin_amount=source['gross_margin_amount'],
                   is_net_sales_technically_eligible=eligible,
                   is_gross_sales_technically_eligible=source['gross_sales'] is not None and 'GROSS_VALUE_FORMULA_MISMATCH' not in rules,
                   is_acquisition_cost_technically_eligible=cost_eligible,
                   is_gross_margin_technically_eligible=eligible and cost_eligible and source['gross_margin_amount'] is not None and 'GROSS_MARGIN_FORMULA_MISMATCH' not in rules,
                   quality_rule_codes_json=json.dumps(rules, separators=(',', ':')),
                   forecast_eligible=False,
                   source_unit_approved=False, financial_release_approved=False,
                   publication_status='CANDIDATE_PENDING_FINANCIAL_RECONCILIATION_AND_RELEASE')
        (contracts if contract else itemized).append(row)
        financial.append(dict(row))
    require(len(itemized) + len(contracts) == len(financial), 'Gold candidate partition failed')
    require(len({row['source_record_id'] for row in financial}) == len(financial), 'Gold duplicated source observations')
    expected = sum((row['net_sales'] for row in assessed if row['is_analysis_candidate'] and
                    row['net_sales'] is not None and 'NET_VALUE_FORMULA_MISMATCH' not in row['quality_rule_codes']), Decimal(0))
    actual = sum((row['net_sales'] for row in financial if row['is_net_sales_technically_eligible']), Decimal(0))
    require(expected == actual, 'Gold technical financial conservation failed')
    require(all(row['physical_quantity'] is None and row['recorded_quantity'] is None for row in contracts),
            'Contract quantity was invented')
    return dict(itemized=itemized, contracts=contracts, financial=financial)


def aggregate_controls(rows):
    eligible = [row for row in rows if row['is_net_sales_technically_eligible']]
    return dict(records=len(rows), technically_eligible_records=len(eligible),
                technically_eligible_net_php=str(sum((row['net_sales'] for row in eligible), Decimal(0))))


def checked_table_name(table):
    require(re.fullmatch(r'workspace\.medshield_original_(?:bronze|silver|gold)_20261026\.original_[a-f0-9]{20}_[a-z_]+', table),
            'Refusing table outside isolated original-source namespaces')
    return table


def read_frame(spark_session, table):
    from pyspark.sql import functions as F
    checked_table_name(table)
    require(spark_session.catalog.tableExists(table), 'Run the preceding layer first; missing table: ' + table)
    version = spark_session.sql('DESCRIBE HISTORY ' + table).agg(F.max('version').alias('version')).first()['version']
    require(version == 0, 'Existing original-source candidate was changed; refusing: ' + table)
    return spark_session.read.option('versionAsOf', 0).table(table)


def create_or_verify(spark_session, table, frame):
    checked_table_name(table)
    existed = spark_session.catalog.tableExists(table)
    if not existed:
        frame.writeTo(table).using('delta').create()
    actual = read_frame(spark_session, table)
    require([(field.name, field.dataType.simpleString()) for field in actual.schema.fields] ==
            [(field.name, field.dataType.simpleString()) for field in frame.schema.fields], 'Readback schema mismatch')
    require(actual.exceptAll(frame).limit(1).count() == 0 and frame.exceptAll(actual).limit(1).count() == 0,
            'Existing/readback original-source data differs; no overwrite permitted')
    return not existed


def evidence_frame(spark_session, dataset, rows, key):
    require(len({str(row[key]) for row in rows}) == len(rows), 'Duplicate evidence record IDs')
    data = [evidence_envelope(dataset, str(row[key]), row) for row in rows]
    return spark_session.createDataFrame(data, 'dataset_id string, record_id string, payload_sha256 string, payload_b64 string')


def load_evidence(spark_session, table, dataset):
    frame = read_frame(spark_session, table)
    rows = frame.collect()
    require(all(row['dataset_id'] == dataset for row in rows), 'Stored evidence belongs to another dataset')
    require(len({row['record_id'] for row in rows}) == len(rows), 'Stored evidence IDs duplicated')
    return [decode_evidence(row.asDict()) for row in rows]


def gold_frame(spark_session, rows):
    from pyspark.sql import types as T
    # Fixed schema handles all-null contract quantities and Decimal values exactly.
    decimals = {'recorded_quantity', 'physical_quantity', 'gross_sales', 'discount_amount',
                'net_sales', 'acquisition_cost', 'gross_margin_amount'}
    booleans = {'is_net_sales_technically_eligible', 'is_gross_sales_technically_eligible',
                'is_acquisition_cost_technically_eligible', 'is_gross_margin_technically_eligible',
                'forecast_eligible', 'source_unit_approved', 'financial_release_approved'}
    integers = {'source_row_number', 'data_source_year'}
    fields = ['source_record_id', 'dataset_id', 'policy_version', 'source_workbook', 'source_file_sha256',
              'source_row_number', 'data_source_year', 'date_delivered', 'source_data_status', 'record_kind',
              'product_key', 'normalized_product', 'area', 'dr_number', 'product_category', 'category_status',
              'category_evidence', 'recorded_quantity', 'physical_quantity', 'quantity_unit', 'contract_product_breakdown',
              'gross_sales', 'discount_amount', 'net_sales', 'acquisition_cost', 'gross_margin_amount',
              'is_net_sales_technically_eligible', 'is_gross_sales_technically_eligible',
              'is_acquisition_cost_technically_eligible', 'is_gross_margin_technically_eligible',
              'quality_rule_codes_json', 'forecast_eligible', 'source_unit_approved',
              'financial_release_approved', 'publication_status']
    def datatype(name):
        return (T.DecimalType(24, 6) if name in decimals else T.BooleanType() if name in booleans else
                T.LongType() if name in integers else T.DateType() if name == 'date_delivered' else T.StringType())
    schema = T.StructType([T.StructField(name, datatype(name), True) for name in fields])
    return spark_session.createDataFrame([tuple(row[name] for name in fields) for row in rows], schema)


def run_original_layer(spark_session, layer, source_directory=SOURCE_DIRECTORY):
    require(layer in LAYER_SCHEMAS, 'Unknown original-source layer')
    bundle = original_bundle(source_directory)
    dataset, files, raw = bundle['dataset_id'], bundle['files'], bundle['raw']
    tables = pipeline_tables(dataset)
    # Schema names are fixed constants. No grants, credential changes or old schema writes.
    spark_session.sql('CREATE SCHEMA IF NOT EXISTS ' + LAYER_SCHEMAS[layer])
    writes = 0
    basic = dict(record_id=layer + '_receipt', dataset_id=dataset, pipeline_policy=LAYER_POLICY,
                 pipeline_code_sha256=PIPELINE_CODE_SHA256, acceptance_manifest_sha256=MANIFEST_SHA256,
                 physical_lines=len(raw), source_files=len(files), batch_id=tables['batch_id'])
    if layer == 'bronze':
        writes += create_or_verify(spark_session, tables['source_files'], evidence_frame(spark_session, dataset, files, 'source_workbook'))
        writes += create_or_verify(spark_session, tables['raw_lines'], evidence_frame(spark_session, dataset, raw, 'source_record_id'))
        basic.update(source_files_digest=content_digest(files), raw_lines_digest=content_digest(raw))
        writes += create_or_verify(spark_session, tables['bronze_receipt'], evidence_frame(spark_session, dataset, [basic], 'record_id'))
    elif layer == 'silver':
        saved_files = load_evidence(spark_session, tables['source_files'], dataset)
        saved_raw = load_evidence(spark_session, tables['raw_lines'], dataset)
        require(content_digest(saved_files) == content_digest(files) and content_digest(saved_raw) == content_digest(raw),
                'Bronze does not match current original bytes/lines')
        for entry in saved_files:
            require(hashlib.sha256(base64.b64decode(entry['exact_source_bytes_b64'], validate=True)).hexdigest() ==
                    entry['source_file_sha256'], 'Bronze exact source bytes differ')
        assessed = assess_bundle(saved_raw)
        basic.update(assessed_digest=content_digest(assessed), raw_lines_digest=content_digest(saved_raw),
                     dispositions=dict(Counter(row['disposition'] for row in assessed)),
                     analysis_candidates=sum(row['is_analysis_candidate'] for row in assessed))
        writes += create_or_verify(spark_session, tables['assessed'], evidence_frame(spark_session, dataset, assessed, 'source_record_id'))
        writes += create_or_verify(spark_session, tables['silver_receipt'], evidence_frame(spark_session, dataset, [basic], 'record_id'))
    else:
        master, acceptance, accepted_contract = read_package()
        saved = load_evidence(spark_session, tables['assessed'], dataset)
        silver_receipts = load_evidence(spark_session, tables['silver_receipt'], dataset)
        require(len(silver_receipts) == 1 and silver_receipts[0]['pipeline_code_sha256'] == PIPELINE_CODE_SHA256,
                'Silver receipt policy differs')
        require(silver_receipts[0]['raw_lines_digest'] == content_digest(raw) and
                silver_receipts[0]['assessed_digest'] == content_digest(saved), 'Silver evidence checksum mismatch')
        assessed = [restore_assessed(row) for row in saved]
        require(len(assessed) == len(raw), 'Silver original physical lines lost')
        result = gold_candidates(assessed, acceptance, files)
        basic.update(accepted_master_sha256=accepted_contract['product_master_sha256'],
                     itemized=aggregate_controls(result['itemized']), contracts=aggregate_controls(result['contracts']),
                     financial=aggregate_controls(result['financial']),
                     contract_product_breakdown='unavailable', contract_physical_quantity=None,
                     business_financial_release_approved=False)
        for name in ['itemized', 'contracts', 'financial']:
            writes += create_or_verify(spark_session, tables[name], gold_frame(spark_session, result[name]))
        writes += create_or_verify(spark_session, tables['gold_receipt'], evidence_frame(spark_session, dataset, [basic], 'record_id'))
    output = dict(basic)
    output.update(layer=layer, created_tables=writes, tables=tables, live_serving_changed=False,
                  source_files_modified=False, sku_unit_forecast_approvals_added=0,
                  financial_publication_approved=False)
    print(json.dumps(output, indent=2, default=str))
    print('PASS_ORIGINAL_' + layer.upper() + '_CANDIDATE. Exact readback verified; live serving unchanged.')
    return output
