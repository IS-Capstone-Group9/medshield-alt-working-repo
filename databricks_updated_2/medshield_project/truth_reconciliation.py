"""Reconcile original itemized sales; preserve restricted contract evidence.

Produces a source-key exclusion ledger for the existing immutable Gold release.
No cloud writes, physical unit inference, or synthetic product allocation.
"""
import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import shutil

PROJECT = Path(__file__).resolve().parent
ROOT = PROJECT.parents[1]
CHANGED = (2020, 2024, 2025)
POLICY = 'original_itemized_sales_v1'
CONTRACT = re.compile(r'^(?:(?:PAGBILAO|QMC|PPDC|TOURISM|PROVINCIAL\s+TOURISM\s+OFFICE|MARINDUQUE|GULANG\s+GULANG|PESO(?:\s+PROVINCIAL)?|PHO|ABOITIZ|PADRE\s+BURGOS|PPOC)(?:\s*#|\s+\d)|DR\s*#|PR\s+\d)', re.I)

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def load_parser():
    spec = importlib.util.spec_from_file_location('truth_parser_loader', PROJECT/'verify_local_sources.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.parser_namespace('01_sales_bronze.py'), module.parser_namespace('02_sales_silver.py')

def assess(path, bronze, silver):
    payload = path.read_bytes()
    digest = hashlib.sha256(payload).hexdigest()
    rows = [dict(dataset_id='', source_record_id=bronze['source_record_key'](path.name,digest,index),
                 source_workbook=path.name,data_source_year=int(path.stem[-4:]),source_row_number=index,
                 source_file_sha256=digest,raw_csv_line=line,source_path=str(path))
            for index,line in enumerate(bronze['decode_csv_source'](payload,path.name),1)]
    return silver['assess_sales_records'](rows)

def signature(row):
    # Decimal-equivalent values have equal signatures even when CSV precision differs.
    fields=('date_delivered','area','dr_number','product','quantity','quantity_primary_candidate',
            'quantity_secondary_candidate','unit_selling_price','gross_sales','discount_amount',
            'net_sales','unit_acquisition_cost','total_acquisition_cost','gross_margin_amount','discount_rate')
    # The adjusted export recalculated the displayed margin ratio at greater
    # precision. Match its source amounts, not that non-additive derived ratio.
    return tuple(row.get(key) for key in fields)

def match_originals(original, adjusted):
    """One-to-one multiset match. Repeated observations cannot license extra children."""
    available=Counter(signature(r) for r in original if r['is_analysis_candidate'] and not CONTRACT.search(r.get('product') or ''))
    excluded=[]
    for row in adjusted:
        if not row['is_analysis_candidate']:
            continue
        key=signature(row)
        if not CONTRACT.search(row.get('product') or '') and available[key]>0:
            available[key]-=1
        else:
            excluded.append(dict(source_record_id=row['source_record_id'],source_workbook=row['source_workbook'],
                                 source_row_number=row['source_row_number'],reason='NOT_MATCHED_TO_ORIGINAL_ITEMIZED_OBSERVATION'))
    return excluded

def prepare(output, restore=False):
    output=Path(output); output.mkdir(parents=True,exist_ok=True)
    bronze,silver=load_parser()
    manifest=[]; excluded=[]; original_summary=[]; contract_rows=[]; corrected=[]
    for year in CHANGED:
        name=f'medshield_data_{year}.csv'
        current=ROOT/'databricks_updated_2/medshield_project_csv'/name
        original=ROOT/'data/medshield/dataset_csv'/name
        archive=output/'adjusted_archive'/name
        if not archive.exists():
            if sha(current)==sha(original):
                raise ValueError(f'{name}: original is already active without an adjusted archive')
            archive.parent.mkdir(exist_ok=True); shutil.copyfile(current,archive)
        expected=bronze['source_provenance'](name,sha(archive))[0]
        if expected!='ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE':
            raise ValueError('Unrecognized adjusted source archive')
        # Exact original source hashes from the retained original CSV controls.
        hashes={2020:'98c83e6a440298e145b8bbfc2463791f393f0946f26a11c6b0472752d30ce733',
                2024:'c38245983b918c0e44eecfccb3b63be00e8de9c848048dd007d1c086c714831f',
                2025:'2738afaf114d9480928e37b6c2b53dc0cac9ba2f10dc74a98b2549e3345d235c'}
        if sha(original)!=hashes[year]: raise ValueError('Original source identity changed; reassess before correction')
        old=assess(archive,bronze,silver); actual=assess(original,bronze,silver)
        removed=match_originals(actual,old); excluded.extend(removed)
        survivors=[r for r in actual if r['is_analysis_candidate']]
        contracts=[r for r in survivors if CONTRACT.search(r.get('product') or '')]
        original_summary.append(dict(year=year,original_candidates=len(survivors),
            original_contract_candidates=len(contracts),adjusted_candidates=sum(r['is_analysis_candidate'] for r in old),
            unmatched_adjusted_candidates=len(removed),
            original_candidate_net_sales=str(sum((r['net_sales'] or Decimal(0) for r in survivors),Decimal(0)))))
        for row in contracts:
            # Anonymous contract IDs; no restricted itemization or counterparty inference.
            contract_rows.append(dict(contract_id='contract_'+row['source_record_id'],
                source_year=year,source_row_number=row['source_row_number'],
                date=str(row['date_delivered']),net_sales=str(row['net_sales']) if row['net_sales'] is not None else None,
                financial_eligible=row['net_sales'] is not None and 'NET_VALUE_FORMULA_MISMATCH' not in row['quality_rule_codes'],
                product_breakdown='unavailable_nda',medicine_quantity=None,medicine_unit=None,
                geography_status='not_inferred_from_contract_name'))
        for row in survivors:
            if CONTRACT.search(row.get('product') or ''): continue
            corrected.append({k:str(row[k]) if row.get(k) is not None else None for k in
                              ('source_record_id','source_workbook','source_row_number','date_delivered','area','product','quantity','net_sales')})
        manifest.append(dict(source_workbook=name,original_sha256=sha(original),adjusted_sha256=sha(archive)))
    assert len(excluded)==len({r['source_record_id'] for r in excluded})
    body=dict(schema_version=1,policy=POLICY,source_files=manifest,excluded=sorted(excluded,key=lambda r:r['source_record_id']),
              original_summary=original_summary,contracts=contract_rows,
              limitations=['Original source exports are not independently verified physical units.',
                           'Unmatched replacement rows are excluded, not automatically proven fabricated.',
                           'This correction does not license restricted counterparty publication or infer medicine detail.'])
    (output/'correction.json').write_text(json.dumps(body,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    (output/'original-itemized.json').write_text(json.dumps(corrected,ensure_ascii=False)+'\n',encoding='utf-8')
    receipt=dict(created_at=datetime.now(timezone.utc).isoformat(),policy=POLICY,
                 correction_sha256=sha(output/'correction.json'),original_summary=original_summary,
                 original_contract_candidates=len(contract_rows),excluded_adjusted_candidates=len(excluded),restored=restore)
    if restore:
        for item in manifest:
            current=ROOT/'databricks_updated_2/medshield_project_csv'/item['source_workbook']
            if sha(current) not in (item['adjusted_sha256'],item['original_sha256']):
                raise ValueError('Current source changed concurrently; preserve it and stop')
        for item in manifest:
            current=ROOT/'databricks_updated_2/medshield_project_csv'/item['source_workbook']
            shutil.copyfile(ROOT/'data/medshield/dataset_csv'/item['source_workbook'],current)
            assert sha(current)==item['original_sha256']
    (output/'preparation.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps(receipt,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--restore-originals',action='store_true')
    args=parser.parse_args(); prepare(args.output,args.restore_originals)
