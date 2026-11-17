# Databricks notebook source
"""Stage accepted reporting categories in one new immutable candidate table.

Generated maintenance notebook. No serving/master/model pointer changes.
"""
import csv
import hashlib
import io
import json
import re
from decimal import Decimal
from pathlib import Path

RELEASE_ID = '__RELEASE_ID__'
MANIFEST_SHA256 = '__MANIFEST_SHA256__'
PACKAGE_DIRECTORY = '/Workspace/medshield/category_releases/' + RELEASE_ID
MUTABLE_FIELDS = {'product_category', 'category_status', 'display_category',
                  'product_scope_status', 'catalog_evidence_source',
                  'product_master_sha256', 'gold_published_at'}
KNOWN_CATEGORIES = {'medicine', 'medical_supply', 'medical_equipment', 'non_medical'}
SOURCE_TABLE = 'workspace.medshield_gold_source_20261022.truth_48a447f8fe9556d3_fact'
EXCLUDED_TABLE = 'workspace.medshield_gold_source_20261022.truth_48a447f8fe9556d3_excluded'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate_inputs(master, receipt, contract):
    """Validate category scope and exact alias coverage before any Spark action."""
    require(contract['release_id'] == RELEASE_ID, 'Wrong release')
    require(contract['mode'] == 'category_acceptance_candidate_only', 'Wrong publication mode')
    require(contract['source_table'] == SOURCE_TABLE and contract['source_version'] == 0, 'Wrong corrected source')
    require(contract['excluded_table'] == EXCLUDED_TABLE, 'Wrong exclusions')
    target = 'workspace.medshield_gold_source_20261022.' + RELEASE_ID + '_candidate'
    require(contract['target_table'] == target, 'Wrong candidate destination')
    require(set(contract['mutable_fields']) == MUTABLE_FIELDS, 'Immutable-field policy changed')
    require(contract['source_rows'] == 40160 and contract['source_product_labels'] == 5692, 'Wrong source counts')
    require(contract['accepted_aliases'] == 5694, 'Wrong accepted alias count')
    require(Decimal(contract['eligible_net_sales_php']) == Decimal('637922399.530000'), 'Wrong eligible finance')
    require(contract['live_serving_changed'] is False and contract['full_original_or_contract_finance'] is False,
            'Candidate cannot activate serving or contract finance')
    require(contract['independent_approvals_added'] == 0, 'Independent approval scope changed')
    require(receipt['scope'] == 'reporting_category_only' and receipt['schema_version'] == 1, 'Wrong acceptance scope')
    require(receipt['requested_by'] == 'Adrian' and receipt['recorded_by'] == 'Codex acting on Adrian instruction',
            'Wrong decision provenance')
    require(receipt['baseline_fact_version'] == 0 and
            receipt['dataset_id'] == contract['source_identity']['dataset_id'], 'Acceptance source mismatch')
    require(receipt['recorded_at'] == contract['recorded_at'], 'Acceptance time mismatch')
    require(receipt['product_master_sha256'] == contract['product_master_sha256'], 'Acceptance master mismatch')
    require(all(receipt[name] is False for name in
                ['business_release_approval', 'sku_or_unit_approval', 'forecast_approval']), 'Independent approval added')
    require(not any(receipt.get(name) for name in ['business_approved', 'ceo_signed_off', 'forecast_approved']),
            'Independent signoff claimed')
    decisions = receipt['decisions']
    require(len(master) == len(decisions) == 5694, 'Missing category decisions')
    by_label = {row['raw_product']: row for row in master}
    require(len(by_label) == 5694, 'Duplicate master labels')
    keys, labels = set(), set()
    for decision in decisions:
        label, key = decision['raw_product'], decision['product_key']
        require(label in by_label and label not in labels, 'Duplicate or missing receipt label')
        require(re.fullmatch('[a-f0-9]{64}', key) and key not in keys, 'Invalid or duplicate exact key')
        row = by_label[label]
        category = decision['product_category']
        require(category in KNOWN_CATEGORIES | {'unclassified'}, 'Invalid category')
        require(decision['category_status'] == 'approved', 'Category not accepted')
        require(decision['decision'] == ('accepted_unclassified' if category == 'unclassified' else 'accepted_category'),
                'Unresolved bucket must stay explicit')
        for field in ['product_category', 'category_status', 'evidence_source', 'reviewed_by', 'reviewed_at']:
            require(row[field] == decision[field], 'Master/decision mismatch: ' + field)
        require(decision['reviewed_by'] == receipt['recorded_by'] and
                decision['reviewed_at'] == receipt['recorded_at'] and bool(decision['evidence_source']),
                'Missing decision evidence')
        require(not row['canonical_sku'] and row['forecast_eligible'] == 'false', 'SKU or forecast approved')
        require(all(row[field] != 'approved' for field in
                    ['identity_status', 'unit_status', 'item_kind_status', 'mapping_status', 'forecast_status']),
                'Independent dimension approved')
        labels.add(label)
        keys.add(key)
    require(sum(row['product_category'] == 'unclassified' for row in master) == 875, 'Unclassified count changed')


def read_package(folder=PACKAGE_DIRECTORY):
    require(str(folder) == PACKAGE_DIRECTORY, 'Use the pinned Workspace package directory')
    folder = Path(folder)
    payload = (folder / 'manifest.json').read_bytes()
    require(hashlib.sha256(payload).hexdigest() == MANIFEST_SHA256, 'Wrong or changed acceptance manifest')
    manifest = json.loads(payload)
    require(manifest['release_id'] == RELEASE_ID, 'Package identity mismatch')
    required = {'accepted_product_master.csv', 'category_acceptance.json', 'publication_contract.json'}
    require(set(manifest['files']) == required, 'Unexpected package files')
    checked = {}
    for name, metadata in manifest['files'].items():
        raw = (folder / name).read_bytes()
        require(len(raw) == metadata['bytes'] and hashlib.sha256(raw).hexdigest() == metadata['sha256'],
                'Package file changed: ' + name)
        checked[name] = raw
    master = list(csv.DictReader(io.StringIO(checked['accepted_product_master.csv'].decode('utf-8-sig'))))
    receipt = json.loads(checked['category_acceptance.json'])
    contract = json.loads(checked['publication_contract.json'])
    require(hashlib.sha256(checked['accepted_product_master.csv']).hexdigest() == contract['product_master_sha256'],
            'Contract/master checksum mismatch')
    require(hashlib.sha256(checked['category_acceptance.json']).hexdigest() == contract['acceptance_sha256'],
            'Contract/acceptance checksum mismatch')
    validate_inputs(master, receipt, contract)
    return master, receipt, contract


def create_new_candidate(frame, table):
    """V2 create is atomic and fails when another writer creates the target."""
    frame.writeTo(table).using('delta').create()


def stage(spark_session):
    from pyspark.sql import functions as F, types as T
    master, receipt, contract = read_package()
    print('PASS_ACCEPTED_CATEGORY_PACKAGE: category-only receipt and all package files verified.')
    source = spark_session.read.option('versionAsOf', 0).table(SOURCE_TABLE)
    columns = source.columns
    require([(field.name, field.dataType.simpleString().lower()) for field in source.schema.fields] ==
            [tuple(row) for row in contract['source_schema']], 'Source schema changed')
    require(source.count() == 40160 and source.select('source_record_id').distinct().count() == 40160,
            'Source row count or uniqueness failed')
    key_hash = source.agg(F.sha2(F.concat_ws('|', F.sort_array(F.collect_list('source_record_id'))), 256).alias('keys')).first()['keys']
    require(key_hash == contract['source_keys_sha256'], 'Source record keys changed')
    for field, value in contract['source_identity'].items():
        if field != 'records':
            require(source.filter(~F.col(field).eqNullSafe(F.lit(value))).limit(1).count() == 0,
                    'Source identity changed: ' + field)
    excluded = spark_session.read.option('versionAsOf', 0).table(EXCLUDED_TABLE)
    require(source.join(excluded.select('source_record_id'), 'source_record_id', 'inner').limit(1).count() == 0,
            'Excluded replacements overlap')
    net = source.agg(F.sum(F.when(F.col('is_net_sales_eligible'), F.col('net_sales')).otherwise(F.lit(0))).alias('net')).first()['net']
    require(Decimal(str(net)) == Decimal(contract['eligible_net_sales_php']), 'Eligible signed net changed')
    fields = ['product_key', 'normalized_product', 'product_category', 'evidence_source']
    schema = T.StructType([T.StructField(name, T.StringType(), False) for name in fields])
    mapping = spark_session.createDataFrame([tuple(str(row[name]) for name in fields) for row in receipt['decisions']], schema)
    active = source.select('product_key', 'normalized_product').distinct()
    require(active.count() == 5692, 'Active label coverage changed')
    join_condition = ((F.col('f.product_key') == F.col('m.product_key')) &
                      (F.col('f.normalized_product') == F.col('m.normalized_product')))
    require(active.alias('f').join(mapping.alias('m'), join_condition, 'left_anti').count() == 0,
            'Source labels missing from acceptance')
    frame = source.alias('f').join(mapping.alias('m'), join_condition, 'left').select(
        'f.*', F.col('m.product_category').alias('_accepted_category'),
        F.col('m.evidence_source').alias('_category_evidence'))
    candidate = frame.withColumn('product_category', F.col('_accepted_category')).withColumn('category_status', F.lit('approved'))
    candidate = candidate.withColumn('display_category',
        F.when(F.col('_accepted_category').isin('medicine', 'medical_supply', 'medical_equipment'), F.lit('Medical'))
         .when(F.col('_accepted_category') == 'non_medical', F.lit('Non-Medical')).otherwise(F.lit('Unclassified')))
    candidate = candidate.withColumn('product_scope_status',
        F.when(F.col('is_contract_label') | F.col('product_scope_status').isin(
            'CONTRACT_LABEL_CANDIDATE', 'HASHTAG_LABEL_REQUIRES_REVIEW', 'MISSING_PRODUCT_IDENTITY'),
            F.col('product_scope_status')).otherwise(F.concat(F.upper(F.col('_accepted_category')), F.lit('_APPROVED'))))
    candidate = candidate.withColumn('catalog_evidence_source', F.col('_category_evidence'))
    candidate = candidate.withColumn('product_master_sha256', F.lit(contract['product_master_sha256']))
    candidate = candidate.withColumn('gold_published_at', F.to_timestamp(F.lit(contract['recorded_at']))).select(*columns)
    immutable = [name for name in columns if name not in MUTABLE_FIELDS]

    def verify(frame):
        require([(field.name, field.dataType.simpleString()) for field in frame.schema.fields] ==
                [(field.name, field.dataType.simpleString()) for field in candidate.schema.fields], 'Candidate schema mismatch')
        require(frame.count() == 40160 and frame.select('source_record_id').distinct().count() == 40160,
                'Candidate row or uniqueness mismatch')
        require(frame.select(*immutable).exceptAll(source.select(*immutable)).limit(1).count() == 0 and
                source.select(*immutable).exceptAll(frame.select(*immutable)).limit(1).count() == 0,
                'Immutable financial/source/demand fields changed')
        require(frame.exceptAll(candidate).limit(1).count() == 0 and candidate.exceptAll(frame).limit(1).count() == 0,
                'Candidate category values differ from acceptance')

    verify(candidate)
    target = contract['target_table']
    require(re.fullmatch(r'workspace\.medshield_gold_source_20261022\.category_[a-f0-9]{16}_candidate', target),
            'Unsafe destination')
    exists = spark_session.catalog.tableExists(target)
    if not exists:
        create_new_candidate(candidate, target)
    history = spark_session.sql('DESCRIBE HISTORY ' + target)
    require(history.agg(F.max('version').alias('version')).first()['version'] == 0, 'Candidate was modified after creation')
    verify(spark_session.read.option('versionAsOf', 0).table(target))
    print('Identical accepted-category candidate verified; zero writes.' if exists else
          'Accepted-category candidate created and read back. Live serving unchanged.')
    print(json.dumps(dict(release_id=RELEASE_ID, candidate_table=target, candidate_version=0,
                          source_records=40160, accepted_aliases=len(master),
                          category_decisions_recorded=True, live_serving_changed=False,
                          sku_unit_forecast_approvals_added=0)))


if 'spark' in globals():
    stage(spark)
