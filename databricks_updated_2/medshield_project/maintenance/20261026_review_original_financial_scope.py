# Databricks notebook source
# MAGIC %md
# MAGIC # Original financial scope review
# MAGIC Read-only. Candidate document matches cannot approve contract overlap.

# COMMAND ----------

TABLES = {'batch_id': 'original_fd95b9e3abab028c8e41', 'source_files': 'workspace.medshield_original_bronze_20261026.original_fd95b9e3abab028c8e41_source_files', 'raw_lines': 'workspace.medshield_original_bronze_20261026.original_fd95b9e3abab028c8e41_raw_lines', 'bronze_receipt': 'workspace.medshield_original_bronze_20261026.original_fd95b9e3abab028c8e41_receipt', 'assessed': 'workspace.medshield_original_silver_20261026.original_fd95b9e3abab028c8e41_assessed_rows', 'silver_receipt': 'workspace.medshield_original_silver_20261026.original_fd95b9e3abab028c8e41_receipt', 'itemized': 'workspace.medshield_original_gold_20261026.original_fd95b9e3abab028c8e41_itemized_candidates', 'contracts': 'workspace.medshield_original_gold_20261026.original_fd95b9e3abab028c8e41_contract_candidates', 'financial': 'workspace.medshield_original_gold_20261026.original_fd95b9e3abab028c8e41_financial_candidates', 'gold_receipt': 'workspace.medshield_original_gold_20261026.original_fd95b9e3abab028c8e41_receipt'}
EXPECTED_GOLD_RECEIPT = {'record_id': 'gold_receipt', 'dataset_id': 'e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10', 'pipeline_policy': 'original_source_layers_v1_candidate_only', 'pipeline_code_sha256': '17c7c0c474aeab41271936874d5560b2ecc07fbd702a6d3b330b6706a6a07372', 'acceptance_manifest_sha256': '49f87290a0919701a6e657ee0938e5fa1efee9bbd595ce1f5c03d097106f179d', 'physical_lines': 62065, 'source_files': 10, 'batch_id': 'original_fd95b9e3abab028c8e41', 'accepted_master_sha256': '470afb59b6ef3f720c54c3d1bb27345ae1629665917b361c10362f8fb2d9f74c', 'itemized': {'records': 40171, 'technically_eligible_records': 39286, 'technically_eligible_net_php': '638015351.530000'}, 'contracts': {'records': 352, 'technically_eligible_records': 352, 'technically_eligible_net_php': '118330249.950000'}, 'financial': {'records': 40523, 'technically_eligible_records': 39638, 'technically_eligible_net_php': '756345601.480000'}, 'contract_product_breakdown': 'unavailable', 'contract_physical_quantity': None, 'business_financial_release_approved': False}
REVIEW_CODE_SHA256 = '200443ee8df83e5b94e56ac4c95771d4afb9217f0b3925baaed313656271bfd6'

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Read-only validation helpers

# COMMAND ----------

"""Read-only financial checks. Candidate document groups never establish overlap clearance."""
from collections import Counter, defaultdict
from datetime import date
from decimal import Decimal
import json


def require(condition, message):
    if not condition:
        raise ValueError(message)


def keyed(rows):
    result = {row['source_record_id']: row for row in rows}
    require(len(result) == len(rows) and all(result), 'Missing or duplicate source record ID')
    return result


def money(rows):
    eligible = [row for row in rows if row['is_net_sales_technically_eligible']]
    require(all(row['net_sales'] is not None for row in eligible), 'Eligible net is missing')
    positive = sum((row['net_sales'] for row in eligible if row['net_sales'] > 0), Decimal(0))
    negative = sum((row['net_sales'] for row in eligible if row['net_sales'] < 0), Decimal(0))
    return dict(records=len(rows), eligible_records=len(eligible), ineligible_records=len(rows)-len(eligible),
                signed_net_php=str(positive+negative), positive_net_php=str(positive),
                signed_negative_net_php=str(negative),
                eligible_zero_net_records=sum(row['net_sales'] == 0 for row in eligible),
                missing_net_records=sum(row['net_sales'] is None for row in rows))


# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Financial populations and document screening

# COMMAND ----------

def candidate_document_key(row):
    """Screen only; DR/area are not verified customer or parent-child identities."""
    values = tuple(row.get(name) for name in ['source_workbook', 'date_delivered', 'area', 'dr_number'])
    return values if all(value is not None and str(value).strip() for value in values) else None


def financial_scope_report(itemized, contracts, financial, assessed):
    items, parents, combined = keyed(itemized), keyed(contracts), keyed(financial)
    ledger = keyed(assessed)
    require(not set(items) & set(parents), 'Itemized and contract keys overlap')
    require(set(items) | set(parents) == set(combined), 'Financial population does not equal itemized plus contracts')
    require(set(combined) == {row['source_record_id'] for row in assessed if row['is_analysis_candidate']},
            'Gold differs from Silver analysis candidates')
    require(all(combined[key] == row for key, row in {**items, **parents}.items()), 'Financial row values differ from source partitions')
    for row in financial:
        require(row['forecast_eligible'] is False and row['source_unit_approved'] is False and
                row['financial_release_approved'] is False, 'Unexpected independent or financial approval')
        require(row['date_delivered'] is not None, 'Gold candidate delivery date is missing')
        rules = json.loads(row['quality_rule_codes_json'])
        if row['is_net_sales_technically_eligible']:
            require(row['net_sales'] is not None and 'NET_VALUE_FORMULA_MISMATCH' not in rules, 'Invalid net eligibility flag')
        if row['is_gross_margin_technically_eligible']:
            require(row['is_net_sales_technically_eligible'] and row['is_acquisition_cost_technically_eligible'] and
                    row['acquisition_cost'] is not None and row['gross_margin_amount'] is not None,
                    'Margin numerator/denominator population mismatch')
            require(abs(row['net_sales']-row['acquisition_cost']-row['gross_margin_amount']) <= Decimal('0.02'),
                    'Eligible margin formula differs beyond source tolerance')
    require(all(row['record_kind'] == 'itemized_sale' for row in itemized), 'Unexpected itemized row kind')
    require(all(row['record_kind'] == 'contract_summary' and row['physical_quantity'] is None and
                row['recorded_quantity'] is None and row['normalized_product'] is None and
                row['area'] is None and row['dr_number'] is None for row in contracts), 'Contract detail or quantity invented')
    controls = dict(itemized=money(itemized), contracts=money(contracts), financial=money(financial))
    require(Decimal(controls['itemized']['signed_net_php'])+Decimal(controls['contracts']['signed_net_php']) ==
            Decimal(controls['financial']['signed_net_php']), 'Signed net partition differs')
    margin_rows = [row for row in financial if row['is_gross_margin_technically_eligible']]
    margin_sales = sum((row['net_sales'] for row in margin_rows), Decimal(0))
    margin_cost = sum((row['acquisition_cost'] for row in margin_rows), Decimal(0))
    margin_reported = sum((row['gross_margin_amount'] for row in margin_rows), Decimal(0))
    item_docs = defaultdict(list)
    for key in items:
        document = candidate_document_key(ledger[key])
        if document is not None:
            item_docs[document].append(key)
    screening = Counter()
    case_refs = []
    for key, parent in parents.items():
        document = candidate_document_key(ledger[key])
        if document is None:
            screening['missing_candidate_document_fields'] += 1
        elif document not in item_docs:
            screening['no_itemized_rows_with_same_candidate_document_key'] += 1
        else:
            child_rows = [items[identity] for identity in item_docs[document]]
            if parent['is_net_sales_technically_eligible'] and all(row['is_net_sales_technically_eligible'] for row in child_rows):
                child_net = sum((row['net_sales'] for row in child_rows), Decimal(0))
                label = ('shared_candidate_document_and_net_amount_match' if abs(parent['net_sales']-child_net) <= Decimal('0.02')
                         else 'shared_candidate_document_but_amounts_differ')
            else:
                label = 'shared_candidate_document_with_ineligible_amounts'
            screening[label] += 1
            case_refs.append(dict(source_record_id=key, source_workbook=ledger[key]['source_workbook'],
                                  physical_csv_line=ledger[key].get('source_row_number'),
                                  screen_result=label, candidate_itemized_records=len(child_rows),
                                  interpretation='possible link only; requires source-owner disposition'))
    require(sum(screening.values()) == len(contracts), 'Contract screen does not cover all parents')
    repeated_fields = ['source_workbook', 'date_delivered', 'area', 'dr_number', 'normalized_product',
                       'recorded_quantity', 'gross_sales', 'discount_amount', 'net_sales', 'acquisition_cost', 'gross_margin_amount']
    repeats = Counter(tuple(row.get(field) for field in repeated_fields) for row in itemized)
    positive_total = Decimal(controls['financial']['positive_net_php'])
    positive_itemized = Decimal(controls['itemized']['positive_net_php'])
    years = []
    for year in sorted({row['date_delivered'].year for row in financial}):
        part = [row for row in financial if row['date_delivered'].year == year]
        years.append(dict(delivery_year=year, **money(part)))
    return dict(status='FINANCIAL_TECHNICAL_REVIEW_NOT_RELEASE_APPROVAL',
                controls=controls, by_delivery_year=years,
                margin_same_population=dict(records=len(margin_rows), net_sales_php=str(margin_sales),
                    acquisition_cost_php=str(margin_cost), reported_gross_margin_php=str(margin_reported),
                    derived_sales_minus_cost_php=str(margin_sales-margin_cost),
                    reported_margin_pct=None if margin_sales == 0 else str((margin_reported/margin_sales*100).quantize(Decimal('0.01')))),
                candidate_itemized_positive_value_share_pct=None if positive_total == 0 else
                    str((positive_itemized/positive_total*100).quantize(Decimal('0.01'))),
                share_scope='eligible positive candidate net only; returns separate; not complete-company coverage or demand coverage',
                possible_repeated_itemized_groups=sum(count > 1 for count in repeats.values()),
                possible_repeated_itemized_occurrences_beyond_first=sum(count-1 for count in repeats.values() if count > 1),
                repeat_action='preserved; equality does not prove erroneous duplication',
                contract_document_screen=dict(screening),
                contract_review_case_refs=case_refs,
                document_screen_scope='same source file, delivery date, recorded area label and DR; screening only, not verified parent/child or customer linkage',
                contract_overlap_clearance='NOT_ESTABLISHED_BY_AUTOMATED_SCREEN',
                contracts_requiring_supported_financial_scope_disposition=len(contracts),
                publication_ready=False, business_financial_release_approved=False,
                warehouse_writes=0, live_serving_changed=False, approvals_added=0)


# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Pinned evidence readers

# COMMAND ----------


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


def decode_evidence(row):
    decoder = zlib.decompressobj()
    payload = decoder.decompress(base64.b64decode(row['payload_b64'], validate=True), 150 * 1024 * 1024 + 1)
    require(decoder.eof and (not decoder.unused_data) and (len(payload) <= 150 * 1024 * 1024), 'Evidence record exceeds reviewed size or has invalid framing')
    require(hashlib.sha256(payload).hexdigest() == row['payload_sha256'], 'Evidence payload checksum mismatch')
    return json.loads(payload)

def restore_assessed(row):
    result = dict(row)
    for field in DECIMAL_COLUMNS:
        if result.get(field) is not None:
            result[field] = Decimal(str(result[field]))
    if result.get('date_delivered') is not None:
        result['date_delivered'] = date.fromisoformat(result['date_delivered'])
    return result

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Run read-only review and print aggregate results

# COMMAND ----------


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
