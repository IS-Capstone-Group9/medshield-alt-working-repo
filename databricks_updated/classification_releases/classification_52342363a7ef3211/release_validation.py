"""Pure validation shared by local package checks and the staged preview notebook."""
import csv,hashlib,json,re
from pathlib import Path

EXPECTED_SUBMISSION='96a1f1a0e3eae7971ad675a11199d7d2e237d2f1d38cfbe8464d659328bcec07'
ALLOWED_CATEGORIES={'medicine','medical_supply','medical_equipment','non_medical','unclassified'}
IDENTITY_FIELDS=['identity_status','unit_status','item_kind_status','forecast_status']
def digest(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def validate_proposals(rows):
 if len(rows)!=5694:raise ValueError('Expected all 5694 exact product keys')
 keys=set();labels=set()
 for row in rows:
  key=row['product_key'];label=row['source_label']
  if not re.fullmatch('[a-f0-9]{64}',key) or key in keys:raise ValueError('Malformed/duplicate product key')
  if not label or label in labels:raise ValueError('Missing/duplicate exact source label')
  if row['proposed_category'] not in ALLOWED_CATEGORIES:raise ValueError('Unsupported category enum')
  if row['proposal_status'] not in ['approved','needs_review']:raise ValueError('Unexpected proposal status')
  if row['submission_sha256']!=EXPECTED_SUBMISSION:raise ValueError('Submission mismatch')
  if row['disposition']!='existing_master_preserved' and row['proposal_status']!='needs_review':raise ValueError('New category proposal cannot imply approval')
  if row['disposition'] in ['exact_identity_conflict','supplied_unverified_guess','supplied_low','supplied_no_suggestion','unresolved_or_nonstock_disposition','reporting_family_outside_master_enum'] and row['proposed_category']!='unclassified':raise ValueError('Unsupported identity/category promoted')
  keys.add(key);labels.add(label)
 return {r['product_key']:r for r in rows}
def validate_master_rows(rows,fields,old_rows):
 if len(rows)!=5694 or len(old_rows)!=4561:raise ValueError('Master row coverage differs')
 current={r['raw_product']:r for r in rows}
 if len(current)!=len(rows):raise ValueError('Duplicate master alias')
 for row in rows:
  if set(row)!=set(fields):raise ValueError('Master schema differs')
  if row['product_category'] not in ALLOWED_CATEGORIES:raise ValueError('Unsupported master category')
  if row['forecast_eligible']!='false' or any(row[f]=='approved' for f in IDENTITY_FIELDS):raise ValueError('Unintended independent approval')
 for old in old_rows:
  now=current[old['raw_product']]
  for field in fields:
   if field not in ['product_category','category_status'] and now[field]!=old[field]:raise ValueError('Noncategory field modified: '+field)
 return current
def validate_files(folder,manifest):
 folder=Path(folder)
 for name,metadata in manifest['files'].items():
  p=Path(name)
  if p.is_absolute() or '..' in p.parts:raise ValueError('Unsafe package path')
  target=folder/p
  if not target.is_file() or digest(target)!=metadata['sha256'] or target.stat().st_size!=metadata['bytes']:raise ValueError('Package file changed: '+name)
 if manifest['source_version']!=0 or manifest['source_table']!='workspace.medshield_gold_source_20261022.truth_48a447f8fe9556d3_fact':raise ValueError('Wrong current corrected source')
 if manifest['warehouse_execution_performed'] or manifest['serving_activation']:raise ValueError('Preparation package cannot claim execution/activation')
 if manifest['input_submission_sha256']!=EXPECTED_SUBMISSION:raise ValueError('Wrong finalized submission')
 if not re.fullmatch('classification_[a-f0-9]{16}',manifest['package_id']):raise ValueError('Invalid package id')
 capture=json.loads((folder/'current_source_capture.json').read_text(encoding='utf-8'))
 if capture['source_table']!=manifest['source_table'] or capture['source_version']!=0:raise ValueError('Source capture differs')
 if len(capture['results']['schema']['rows'])!=144:raise ValueError('Unexpected fact schema')
 controls=capture['results']['controls']['rows'][0]
 if int(controls['records'])!=40160 or controls['records']!=controls['unique_records'] or controls['keys_sha256']!=manifest['source_keys_sha256']:raise ValueError('Source coverage differs')
 if int(capture['results']['excluded_overlap']['rows'][0]['records'])!=0:raise ValueError('Excluded replacements overlap')
 if capture['results']['eligible_finance']['rows'][0]['eligible_net_sales']!='637922399.530000':raise ValueError('Eligible signed net differs')
 parity=json.loads((folder/'live_product_parity.json').read_text(encoding='utf-8'))
 if parity['status']!='PASS_LIVE_PRODUCT_PARITY' or parity['source_table']!=manifest['source_table'] or parity['source_version']!=0 or parity['current_product_groups']!=5692 or not parity['exact_keys_labels_records_finance_match']:raise ValueError('Live per-product reconciliation unavailable')
 with (folder/'product_master_review.csv').open(encoding='utf-8-sig',newline='') as f:reader=csv.DictReader(f);fields=reader.fieldnames;rows=list(reader)
 with (folder/'predecessor_product_master_review.csv').open(encoding='utf-8-sig',newline='') as f:old=list(csv.DictReader(f))
 validate_master_rows(rows,fields,old)
 proposals=json.loads((folder/'classification_proposals.json').read_text(encoding='utf-8'))
 validate_proposals(proposals)
 if {r['raw_product'] for r in rows}!={r['source_label'] for r in proposals}:raise ValueError('Master and proposal labels differ')
 return capture,proposals
