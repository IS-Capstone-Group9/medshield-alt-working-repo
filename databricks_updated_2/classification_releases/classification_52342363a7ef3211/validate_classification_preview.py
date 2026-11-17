# Staged validation script; create a separate Python notebook before execution.
# This notebook is STAGED ONLY. It was not run during steps 1–4.
# The default mode validates pinned files and current-source controls without writing.
# create_preview creates a NEW isolated review table and never changes serving/master views.
import json,sys
from decimal import Decimal
from pathlib import Path
from pyspark.sql import functions as F,types as T

dbutils.widgets.text('package_directory','')
dbutils.widgets.dropdown('mode','validate',['validate','create_preview'])
package_directory=dbutils.widgets.get('package_directory')
assert package_directory.startswith('/Workspace/medshield/classification_releases/classification_')
folder=Path(package_directory).resolve()
assert folder.parent==Path('/Workspace/medshield/classification_releases')
sys.path.insert(0,str(folder))
from release_validation import validate_files
manifest=json.loads((folder/'manifest.json').read_text(encoding='utf-8'))
assert folder.name==manifest['package_id']
capture,proposals=validate_files(folder,manifest)
source_name=manifest['source_table'];source=spark.read.option('versionAsOf',0).table(source_name)
source_columns=source.columns
expected_schema=[(r['col_name'],r['data_type'].lower()) for r in capture['results']['schema']['rows']]
assert [(f.name,f.dataType.simpleString().lower()) for f in source.schema.fields]==expected_schema
assert source.count()==40160
assert source.select('source_record_id').distinct().count()==40160
keys=source.agg(F.sha2(F.concat_ws('|',F.sort_array(F.collect_list('source_record_id'))),256).alias('keys')).first()['keys']
assert keys==manifest['source_keys_sha256']
excluded=spark.read.option('versionAsOf',0).table(manifest['excluded_table'])
assert source.join(excluded.select('source_record_id'),'source_record_id','inner').limit(1).count()==0
net=source.agg(F.sum(F.when(F.col('is_net_sales_eligible'),F.col('net_sales')).otherwise(F.lit(0))).alias('net')).first()['net']
assert Decimal(str(net))==Decimal('637922399.530000')
for key,value in capture['results']['identity']['rows'][0].items():
 if key!='records':assert source.filter(~F.col(key).eqNullSafe(F.lit(value))).limit(1).count()==0,key

proposal_fields=['product_key','source_label','proposed_category','proposed_reporting_group','proposal_status','disposition','confidence','evidence_reference','submission_sha256']
schema=T.StructType([T.StructField(name,T.StringType(),False) for name in proposal_fields])
mapping=spark.createDataFrame([tuple(str(r[k]) for k in proposal_fields) for r in proposals],schema)
assert mapping.select('product_key').distinct().count()==5694
assert source.select('product_key','normalized_product').distinct().alias('k').join(mapping.alias('p'),(F.col('k.product_key')==F.col('p.product_key')) & (F.col('k.normalized_product')==F.col('p.source_label')),'left_anti').count()==0
joined=source.alias('f').join(mapping.alias('p'),(F.col('f.product_key')==F.col('p.product_key')) & (F.col('f.normalized_product')==F.col('p.source_label')),'left')
preview=joined.select('f.*',*[F.col('p.'+name).alias('classification_review_'+name) for name in proposal_fields if name not in ['product_key','source_label']])
assert preview.count()==source.count()
def verify_unchanged(frame):
 original=frame.select(*source_columns)
 assert original.schema==source.schema
 assert original.exceptAll(source).limit(1).count()==0
 assert source.exceptAll(original).limit(1).count()==0
verify_unchanged(preview)
target=manifest['preview_table']
assert target==source_name.rsplit('.',1)[0]+'.'+manifest['package_id']+'_review_preview'
mode=dbutils.widgets.get('mode')
assert mode in ['validate','create_preview']
if mode=='create_preview':
 if spark.catalog.tableExists(target):
  actual=spark.read.option('versionAsOf',0).table(target)
  assert actual.schema==preview.schema
  assert actual.exceptAll(preview).limit(1).count()==0 and preview.exceptAll(actual).limit(1).count()==0
  print('Identical existing preview verified; zero writes.')
 else:
  preview.write.format('delta').mode('errorifexists').saveAsTable(target)
  actual=spark.read.option('versionAsOf',0).table(target)
  verify_unchanged(actual)
  assert actual.exceptAll(preview).limit(1).count()==0 and preview.exceptAll(actual).limit(1).count()==0
  print('Isolated review preview created and read back. Live serving unchanged.')
else:print('Validation complete. Zero table writes; proposal columns remain review-only.')
print(json.dumps({'package_id':manifest['package_id'],'source_records':40160,'source_version':0,'mode':mode,'preview_table':target,'live_serving_changed':False,'category_approvals_added':0,'forecast_approvals_added':0}))
