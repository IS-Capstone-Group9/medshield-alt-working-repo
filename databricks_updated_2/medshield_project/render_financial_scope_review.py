"""Generate a multi-cell read-only audit for the actually staged original batch."""
import argparse
import ast
import hashlib
import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parent
TARGET = PROJECT / 'maintenance/20261026_review_original_financial_scope.py'


def render():
    receipt_path = PROJECT.parents[1] / 'outputs/original_layers_20261026/gold-user-output.json'
    expected = json.loads(receipt_path.read_text(encoding='utf-8'))['output']
    fields = ['record_id', 'dataset_id', 'pipeline_policy', 'pipeline_code_sha256',
              'acceptance_manifest_sha256', 'physical_lines', 'source_files', 'batch_id',
              'accepted_master_sha256', 'itemized', 'contracts', 'financial',
              'contract_product_breakdown', 'contract_physical_quantity', 'business_financial_release_approved']
    expected_receipt = {name: expected[name] for name in fields}
    layers = ast.parse((PROJECT / 'original_layers.py').read_text(encoding='utf-8'))
    evidence = [node for node in layers.body if isinstance(node, ast.FunctionDef) and node.name in
                ['decode_evidence', 'restore_assessed']]
    constants = "TABLES = " + repr(expected['tables']) + '\nEXPECTED_GOLD_RECEIPT = ' + repr(expected_receipt)
    identity = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in
                [PROJECT / 'financial_scope_review.py', PROJECT / 'original_layers.py', receipt_path, Path(__file__)]}
    constants += '\nREVIEW_CODE_SHA256 = ' + repr(hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest())
    core = (PROJECT / 'financial_scope_review.py').read_text(encoding='utf-8')
    core = core.replace('\ndef candidate_document_key(', '\n# COMMAND ----------\n\n# MAGIC %md\n# MAGIC ## 2. Financial populations and document screening\n\n# COMMAND ----------\n\ndef candidate_document_key(', 1)
    helpers = '''
import base64, hashlib, zlib
from pyspark.sql import functions as F
DECIMAL_COLUMNS = ('quantity','unit_selling_price','gross_sales','discount_amount','net_sales',
                   'unit_acquisition_cost','total_acquisition_cost','gross_margin_amount',
                   'margin_pct','discount_rate','quantity_primary_candidate','quantity_secondary_candidate')
def pinned(table):
    require(table in TABLES.values(), 'Unpinned financial-review input')
    latest = spark.sql('DESCRIBE HISTORY ' + table).agg(F.max('version').alias('version')).first()['version']
    require(latest == 0, 'Candidate table changed after creation; retain evidence and stop')
    return spark.read.option('versionAsOf', 0).table(table)
'''
    # pyspark import is in its own final helper cell; no extra Python files needed.
    execute = '''
receipt_rows = pinned(TABLES['gold_receipt']).collect()
require(len(receipt_rows) == 1, 'Expected one original Gold receipt')
observed = decode_evidence(receipt_rows[0].asDict())
require(observed == EXPECTED_GOLD_RECEIPT, 'Stored Gold receipt differs from the supplied execution identity')
populations = {}
for name in ['itemized','contracts','financial']:
    frame = pinned(TABLES[name])
    require(frame.count() == EXPECTED_GOLD_RECEIPT[name]['records'], 'Candidate population differs: ' + name)
    populations[name] = [row.asDict() for row in frame.collect()]
    require(all(row['dataset_id'] == EXPECTED_GOLD_RECEIPT['dataset_id'] for row in populations[name]), 'Mixed dataset identities')
ledger_frame = pinned(TABLES['assessed'])
require(ledger_frame.count() == EXPECTED_GOLD_RECEIPT['physical_lines'], 'Silver physical-line ledger differs')
ledger_rows = ledger_frame.collect()
require(len({row['record_id'] for row in ledger_rows}) == len(ledger_rows) and
        all(row['dataset_id'] == EXPECTED_GOLD_RECEIPT['dataset_id'] for row in ledger_rows), 'Silver envelope identity differs')
assessed = [restore_assessed(decode_evidence(row.asDict())) for row in ledger_rows]
require(all(row['dataset_id'] == EXPECTED_GOLD_RECEIPT['dataset_id'] and row['source_record_id'] == envelope['record_id']
            for row,envelope in zip(assessed,ledger_rows)), 'Decoded Silver identity differs')
report = financial_scope_report(populations['itemized'], populations['contracts'], populations['financial'], assessed)
for name, expected in EXPECTED_GOLD_RECEIPT.items():
    if name in ['itemized','contracts','financial']:
        controls = report['controls'][name]
        require(controls['records'] == expected['records'] and controls['eligible_records'] == expected['technically_eligible_records'] and
                Decimal(controls['signed_net_php']) == Decimal(expected['technically_eligible_net_php']), 'Gold technical control differs: ' + name)
report.update(batch_id=EXPECTED_GOLD_RECEIPT['batch_id'], dataset_id=EXPECTED_GOLD_RECEIPT['dataset_id'], input_versions=0,
              review_code_sha256=REVIEW_CODE_SHA256)
print(json.dumps(report, indent=2))
print('PASS_FINANCIAL_SCOPE_REVIEW. No tables changed; unresolved financial scope remains explicit.')
'''
    source = '\n\n'.join([
        '# Databricks notebook source\n# MAGIC %md\n# MAGIC # Original financial scope review\n# MAGIC Read-only. Candidate document matches cannot approve contract overlap.\n\n# COMMAND ----------',
        constants, '# COMMAND ----------\n\n# MAGIC %md\n# MAGIC ## 1. Read-only validation helpers\n\n# COMMAND ----------',
        core, '# COMMAND ----------\n\n# MAGIC %md\n# MAGIC ## 3. Pinned evidence readers\n\n# COMMAND ----------',
        helpers, ast.unparse(ast.Module(body=evidence, type_ignores=[])),
        '# COMMAND ----------\n\n# MAGIC %md\n# MAGIC ## 4. Run read-only review and print aggregate results\n\n# COMMAND ----------', execute])
    tree = ast.parse(source)
    forbidden = {'write', 'writeTo', 'saveAsTable', 'write_text', 'write_bytes', 'unlink', 'mkdir'}
    if any(isinstance(node, ast.Attribute) and node.attr in forbidden for node in ast.walk(tree)):
        raise ValueError('Unexpected write in financial review')
    return source


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    source = render()
    if args.check:
        if TARGET.read_text(encoding='utf-8') != source:
            raise SystemExit('Financial review differs from reviewed source')
    else:
        TARGET.write_text(source, encoding='utf-8')
    print('Financial review ' + ('matches reviewed source.' if args.check else 'generated.'))
