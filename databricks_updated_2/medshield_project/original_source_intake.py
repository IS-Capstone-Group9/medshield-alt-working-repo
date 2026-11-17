# Databricks notebook source
"""Isolated original-source intake; never fits models or reuses allocated products.

Upload the ten restored source CSVs, truth_reconciliation.py, verify_local_sources.py
and sales_csv_assessment.py as ordinary files under their existing directories.
The 01/02 notebooks are not runtime file dependencies. This notebook writes
only a new original-evidence namespace, never the historical analytical fact.
Product runtime uses the separately verified truth correction serving snapshot.
"""
import hashlib
import json
from pathlib import Path
from decimal import Decimal
from datetime import date

project=Path('/Workspace/medshield/medshield_project')
api={'__name__':'original_intake','__file__':str(project/'truth_reconciliation.py')}
exec(compile((project/'truth_reconciliation.py').read_bytes(),str(project/'truth_reconciliation.py'),'exec'),api)
# Pure parser loader uses its module location; explicitly give it the uploaded path.
api['PROJECT']=project
bronze,silver=api['load_parser']()
source=Path('/Workspace/medshield/medshield_project_csv')
original_hashes={
 'medshield_data_2020.csv':'98c83e6a440298e145b8bbfc2463791f393f0946f26a11c6b0472752d30ce733',
 'medshield_data_2024.csv':'c38245983b918c0e44eecfccb3b63be00e8de9c848048dd007d1c086c714831f',
 'medshield_data_2025.csv':'2738afaf114d9480928e37b6c2b53dc0cac9ba2f10dc74a98b2549e3345d235c',
}
paths=sorted(source.glob('medshield_data_*.csv'))
assert len(paths)==10 and {int(p.stem[-4:]) for p in paths}==set(range(2017,2027))
manifest=[]; assessed=[]; raw=[]
for path in paths:
 payload=path.read_bytes(); digest=hashlib.sha256(payload).hexdigest()
 if path.name in original_hashes: assert digest==original_hashes[path.name],'Original CSV identity differs'
 else: bronze['source_provenance'](path.name,digest,payload=payload) # retain actual byte identity; allow reviewed CSV representation
 lines=bronze['decode_csv_source'](payload,path.name)
 manifest.append(dict(source_workbook=path.name,source_file_sha256=digest,raw_line_count=len(lines)))
 for index,line in enumerate(lines,1): raw.append(json.dumps(dict(source_workbook=path.name,source_row_number=index,raw_csv_line=line),ensure_ascii=False))
 assessed.extend(api['assess'](path,bronze,silver))
assert len(raw)==len(assessed) and len({r['source_record_id'] for r in assessed})==len(assessed)
dataset=hashlib.sha256(json.dumps(manifest,sort_keys=True).encode()).hexdigest()
namespace='workspace.medshield_original_evidence_20261025'
spark.sql(f'CREATE SCHEMA IF NOT EXISTS {namespace}')
def save(name,rows):
 table=namespace+'.'+name
 encoded=[json.dumps(dict(dataset_id=dataset,**row),default=str,ensure_ascii=False) for row in rows]
 assert encoded, 'No evidence rows to publish'
 frame=spark.createDataFrame([(dataset,value) for value in encoded],['dataset_id','record_json'])
 if spark.catalog.tableExists(table):
  existing=spark.table(table)
  assert existing.exceptAll(frame).count()==0 and frame.exceptAll(existing).count()==0,'Existing evidence differs; use a new reviewed namespace'
 else: frame.write.format('delta').mode('errorifexists').saveAsTable(table)
 saved=spark.table(table)
 assert saved.count()==len(rows) and saved.select('dataset_id').distinct().count()==1
save('source_manifest',manifest)
save('raw_lines',[dict(payload=value) for value in raw])
save('assessed_rows',[{k:v for k,v in row.items() if k!='dataset_id'} for row in assessed])
itemized=[]; contracts=[]
for row in assessed:
 if not row['is_analysis_candidate']: continue
 if api['CONTRACT'].search(row.get('product') or ''):
  contracts.append(dict(contract_id='contract_'+row['source_record_id'],date=row['date_delivered'],
                       net_sales=row['net_sales'],quantity=None,unit=None,product_breakdown='unavailable_nda'))
 else: itemized.append({k:v for k,v in row.items() if k!='dataset_id'})
save('itemized_observations',itemized)
save('contract_evidence',contracts)
print(json.dumps(dict(status='PASS_ORIGINAL_EVIDENCE_ONLY',dataset_id=dataset,raw_lines=len(raw),itemized_records=len(itemized),contract_candidates=len(contracts),
                     serving_activation=False,medicine_unit_approval=False,models_fitted=False)))
