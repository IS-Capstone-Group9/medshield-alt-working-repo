"""Read-only original/source comparison. Match evidence, never approve extra revenue."""
from collections import Counter, defaultdict, deque
from datetime import date, datetime
from decimal import Decimal
import hashlib
import json
import re
from pathlib import Path

SIGNATURE_FIELDS = ('source_workbook', 'data_source_year', 'date_delivered', 'area',
                    'dr_number', 'product', 'quantity', 'quantity_primary_candidate',
                    'quantity_secondary_candidate', 'unit_selling_price', 'gross_sales',
                    'discount_amount', 'net_sales', 'unit_acquisition_cost',
                    'total_acquisition_cost', 'gross_margin_amount', 'discount_rate')
SOURCE_TABLE = 'workspace.medshield_gold_source_20261022.truth_48a447f8fe9556d3_fact'
CATEGORY_TABLE = 'workspace.medshield_gold_source_20261022.category_b160d6aad4376d64_candidate'
SOURCE_KEYS_SHA256 = '10c8386a2f97587baf55cc1b6ae41648c0046a66a2e7e185f2ad31b1ae7cdb82'
SOURCE_DATASET = 'abb5af9adc151cc7a88b5e2241ea6d4d0a1c78bbd7875a10e66fa67c1353f94d'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def signature(row):
    """Exact typed business fields; displayed margin ratio alone is not matched.

    Include source workbook/year so cross-year snapshots cannot consume another
    file's evidence. Preserve null versus zero and actual repeated observations.
    """
    values = []
    for field in SIGNATURE_FIELDS:
        value = row.get(field)
        if isinstance(value, Decimal):
            value = ('decimal', str(value.normalize()) if value else '0')
        elif isinstance(value, (date, datetime)):
            value = ('date', value.isoformat())
        values.append(value)
    return tuple(values)


def original_eligible(row):
    return row.get('net_sales') is not None and 'NET_VALUE_FORMULA_MISMATCH' not in row.get('quality_rule_codes', [])


def net(rows, eligible):
    return sum((row['net_sales'] for row in rows if eligible(row)), Decimal(0))


def reconcile_rows(assessed, serving, is_contract):
    require(len({row['source_record_id'] for row in assessed}) == len(assessed), 'Duplicate original physical-line keys')
    require(len({row['source_record_id'] for row in serving}) == len(serving), 'Duplicate serving keys')
    require(not any(row.get('is_contract_label') for row in serving), 'Unexpected contract row in itemized serving source')
    candidates = [row for row in assessed if row['is_analysis_candidate']]
    contracts = [row for row in candidates if is_contract(row.get('product'))]
    itemized = [row for row in candidates if not is_contract(row.get('product'))]
    original_groups, reviewed_groups = defaultdict(deque), defaultdict(deque)
    for row in sorted(itemized, key=lambda item: item['source_record_id']):
        original_groups[signature(row)].append(row)
    for row in sorted(assessed, key=lambda item: item['source_record_id']):
        if not row['is_analysis_candidate'] and row.get('product') and row.get('date_delivered') and not is_contract(row.get('product')):
            reviewed_groups[signature(row)].append(row)
    matched, noncandidate, serving_only = [], [], []
    eligibility_differences = 0
    for row in sorted(serving, key=lambda item: item['source_record_id']):
        key = signature(row)
        if original_groups[key]:
            original = original_groups[key].popleft()
            matched.append(original)
            eligibility_differences += original_eligible(original) != bool(row['is_net_sales_eligible'])
        elif reviewed_groups[key]:
            noncandidate.append(reviewed_groups[key].popleft())
        else:
            serving_only.append(row)
    original_only = [row for group in original_groups.values() for row in group]
    require(len(itemized) == len(matched) + len(original_only), 'Original candidate conservation failed')
    require(len(serving) == len(matched) + len(noncandidate) + len(serving_only), 'Serving conservation failed')
    require(len(candidates) == len(itemized) + len(contracts), 'Contract partition failed')
    source_net = net(itemized, original_eligible)
    contract_net = net(contracts, original_eligible)
    serving_net = net(serving, lambda row: bool(row['is_net_sales_eligible']) and row.get('net_sales') is not None)
    def controls(rows, eligibility):
        result = []
        for year in sorted({row['data_source_year'] for row in rows}):
            part = [row for row in rows if row['data_source_year'] == year]
            result.append(dict(source_year=year, records=len(part), technically_eligible_net_sales_php=str(net(part, eligibility))))
        return result
    return dict(
        original_physical_lines=len(assessed), original_candidates=len(candidates),
        original_itemized_candidates=len(itemized), original_contract_candidates=len(contracts),
        serving_records=len(serving), exact_original_candidate_matches=len(matched),
        serving_matches_original_non_candidate=len(noncandidate), unmatched_serving_records=len(serving_only),
        original_itemized_candidates_not_in_serving=len(original_only),
        matched_technical_vs_serving_eligibility_differences=eligibility_differences,
        matched_noncandidate_dispositions=dict(Counter(row['disposition'] for row in noncandidate)),
        original_only_dispositions=dict(Counter(row['disposition'] for row in original_only)),
        original_dispositions=dict(Counter(row['disposition'] for row in assessed)),
        original_itemized_technical_net_php=str(source_net), original_contract_technical_net_php=str(contract_net),
        original_total_technical_net_php=str(source_net + contract_net), serving_eligible_net_php=str(serving_net),
        itemized_technical_minus_serving_net_php=str(source_net - serving_net),
        original_itemized_controls=controls(itemized, original_eligible),
        contract_controls=controls(contracts, original_eligible),
        original_only_controls=controls(original_only, original_eligible),
        unmatched_serving_controls=controls(serving_only, lambda row: bool(row['is_net_sales_eligible'])),
        checks=dict(original_candidates_conserved=True, serving_records_conserved=True,
                    contracts_separate=True, repeated_observations_preserved=True),
        matching_policy='exact_same_workbook_typed_fields_multiset_v1; displayed margin ratio omitted',
        financial_scope='technical parser versus existing serving eligibility; differences are not approved incremental revenue',
        contract_quantity=None, contract_product_breakdown='unavailable', warehouse_writes=0,
        source_files_modified=False, serving_changed=False, approvals_added=0,
        status='RECONCILIATION_REPORT_ONLY_NOT_PUBLICATION_APPROVAL')


def assess_uploaded_originals(source_directory):
    """Use embedded current parser declarations; no external helper dependency."""
    source_directory = Path(source_directory)
    paths = sorted(source_directory.glob('medshield_data_*.csv'))
    require({f'medshield_data_{year}.csv' for year in range(2017, 2027)} <= {path.name for path in paths},
            'Expected already-uploaded original files 2017–2026')
    require(all(re.fullmatch(r'medshield_data_20\d{2}\.csv', path.name) for path in paths), 'Unexpected CSV filename')
    bronze, silver = bronze_namespace(), silver_namespace()
    manifest, raw = [], []
    for path in paths:
        payload = path.read_bytes()
        require(len(payload) <= 100 * 1024 * 1024, 'CSV exceeds reviewed source byte limit')
        digest = hashlib.sha256(payload).hexdigest()
        provenance, policy = bronze['source_provenance'](path.name, digest, payload=payload)
        lines = bronze['decode_csv_source'](payload, path.name)
        manifest.append(dict(source_workbook=path.name, source_file_sha256=digest, raw_lines=len(lines),
                             source_data_status=provenance, source_adjustment_policy=policy))
        for number, line in enumerate(lines, 1):
            raw.append(dict(dataset_id='', source_record_id=bronze['source_record_key'](path.name, digest, number),
                            source_workbook=path.name, source_row_number=number, data_source_year=int(path.stem[-4:]),
                            source_file_sha256=digest, raw_csv_line=line, source_path=str(path)))
    require(len(raw) <= 250000, 'Combined physical-line limit exceeded')
    dataset = bronze['build_dataset_id'](manifest)
    for row in raw:
        row['dataset_id'] = dataset
    assessed = silver['assess_sales_records'](raw)
    require(len(assessed) == len(raw), 'Physical lines not preserved')
    require(all(hashlib.sha256(path.read_bytes()).hexdigest() == entry['source_file_sha256']
                for path, entry in zip(paths, manifest)), 'Source changed during assessment')
    return assessed, manifest, dataset, silver['is_contract_parent_label']


def run_reconciliation(spark_session, source_directory=Path('/Workspace/medshield/medshield_project_csv')):
    from pyspark.sql import functions as F
    assessed, manifest, dataset, is_contract = assess_uploaded_originals(source_directory)
    fact = spark_session.read.option('versionAsOf', 0).table(SOURCE_TABLE)
    candidate = spark_session.read.option('versionAsOf', 0).table(CATEGORY_TABLE)
    require(fact.count() == candidate.count() == 40160, 'Pinned warehouse record counts differ')
    require(fact.select('source_record_id').distinct().count() == 40160, 'Pinned warehouse source keys not unique')
    key_hash = fact.agg(F.sha2(F.concat_ws('|', F.sort_array(F.collect_list('source_record_id'))), 256).alias('keys')).first()['keys']
    require(key_hash == SOURCE_KEYS_SHA256, 'Pinned warehouse key checksum differs')
    require(fact.filter(~F.col('dataset_id').eqNullSafe(F.lit(SOURCE_DATASET))).limit(1).count() == 0, 'Warehouse dataset identity differs')
    selected = list(SIGNATURE_FIELDS) + ['source_record_id', 'is_net_sales_eligible', 'is_contract_label']
    require(candidate.select(*selected).exceptAll(fact.select(*selected)).limit(1).count() == 0 and
            fact.select(*selected).exceptAll(candidate.select(*selected)).limit(1).count() == 0,
            'Accepted category candidate changed compared source fields')
    gold = [row.asDict() for row in fact.select(*selected).collect()]
    require(net(gold, lambda row: bool(row['is_net_sales_eligible']) and row['net_sales'] is not None) ==
            Decimal('637922399.530000'), 'Pinned warehouse financial control differs')
    report = reconcile_rows(assessed, gold, is_contract)
    report.update(original_dataset_id=dataset, source_manifest=manifest, compared_fact=SOURCE_TABLE,
                  accepted_category_candidate=CATEGORY_TABLE, warehouse_version=0)
    print(json.dumps(report, indent=2, default=str))
    print('PASS_RECONCILIATION_REPORT. No files or tables changed; differences remain review-only.')
    return report
