# Databricks notebook source
"""Persist a checksum-bound input audit artifact; does not train or activate models.

Deploy 07_predictive_contracts.sql first. Provide a reviewed Volume file path and
its SHA-256 through job parameters. Reads one bounded monthly JSON artifact.
"""
import hashlib
import json
from datetime import date
from decimal import Decimal
from pyspark.sql.types import (StructType, StructField, StringType, LongType,
                               DateType, DecimalType, BooleanType)

dbutils.widgets.text('input_path', '')
dbutils.widgets.text('input_sha256', '')
path = dbutils.widgets.get('input_path')
expected = dbutils.widgets.get('input_sha256')
assert path.startswith('/Volumes/'), 'Use a governed Unity Catalog Volume'
with open(path, 'rb') as handle:
    raw = handle.read(20_000_001)
assert len(raw) <= 20_000_000, 'Input exceeds monthly artifact size bound'
assert hashlib.sha256(raw).hexdigest() == expected, 'Input checksum mismatch'
data = json.loads(raw)
assert data['schema_version'] == '1.0'
manifest = data['manifest']
assert manifest['reconciliation_passed'] is True
rows = data['rows']
assert 0 < len(rows) <= 12000
keys = [(r['series_id'], r['target_name'], r['period']) for r in rows]
assert len(keys) == len(set(keys)), 'Duplicate input key'
schema = StructType([
    StructField('input_hash', StringType(), False), StructField('dataset_id', StringType(), False),
    StructField('fact_delta_version', LongType(), False), StructField('mapping_version', StringType(), False),
    StructField('series_id', StringType(), False), StructField('target_name', StringType(), False),
    StructField('period', DateType(), False), StructField('target_value', DecimalType(24, 2), True),
    StructField('unit', StringType(), False), StructField('period_closed', BooleanType(), False),
    StructField('coverage_status', StringType(), False), StructField('eligible_for_evaluation', BooleanType(), False),
    StructField('eligible_for_publication', BooleanType(), False), StructField('payload_json', StringType(), False)])
values = [(expected, manifest['dataset_id'], manifest['fact_delta_version'],
           manifest['geography_mapping_version'] + ':' + manifest['catalog_mapping_version'],
           r['series_id'], r['target_name'], date.fromisoformat(r['period'] + '-01'),
           Decimal(r['target_value_decimal']) if r.get('target_value_decimal') is not None else None,
           r['unit'], r['period_closed'], r['coverage_status'], r['eligible_for_evaluation'],
           r['eligible_for_publication'], json.dumps({'manifest': manifest, 'row': r}, sort_keys=True)) for r in rows]
spark.createDataFrame(values, schema).createOrReplaceTempView('predictive_input_stage')
spark.sql('''MERGE INTO workspace.medshield_gold.mart_forecast_monthly_candidate t
USING predictive_input_stage s ON t.input_hash=s.input_hash AND t.series_id=s.series_id
AND t.target_name=s.target_name AND t.period=s.period
WHEN NOT MATCHED THEN INSERT *''')
stored = spark.table('workspace.medshield_gold.mart_forecast_monthly_candidate').where(f"input_hash = '{expected}'")
assert stored.count() == len(rows), 'Input persistence count mismatch'
assert stored.exceptAll(spark.table('predictive_input_stage')).count() == 0, 'Input persistence content mismatch'
print(json.dumps({'status': 'candidate_input_persisted_not_approved', 'input_hash': expected, 'rows': len(rows)}))
