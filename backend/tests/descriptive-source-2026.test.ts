import assert from 'node:assert/strict'
import test from 'node:test'
import { descriptiveBinding, readDescriptiveRelease, SOURCE_REBUILD_POLICY } from '../src/descriptiveSource'
import { catalogProjection } from '../src/catalogContract'
import { buildSectorTrend } from '../src/sectorTrend'
import { benchmarkView, monthIndex } from '../src/forecastEvidence'

const dataset = 'a'.repeat(64)
const env = {DATABRICKS_DESCRIPTIVE_SCHEMA:'medshield_gold_source_20261022',DATABRICKS_DESCRIPTIVE_FACT_VERSION:'0',DATABRICKS_DESCRIPTIVE_DATASET_ID:dataset,DATABRICKS_DESCRIPTIVE_POLICY_VERSION:SOURCE_REBUILD_POLICY}
const gold = ['fact','dim_date','dim_area','dim_product','dim_canonical_product','monthly','yearly','area_yearly','product_yearly','business_product_yearly','territory_yearly','medical_monthly','external_input','contract_labels','label_partition']
const audit = ['area_coverage','scope','provisional_year','gold_disposition','gold_quality','returns','contract_evidence']
const receipt = () => [...gold.map(n=>`workspace.medshield_gold_source_20261022.sales_restart_${n}_candidate`),...audit.map(n=>`workspace.medshield_audit_source_20261022.sales_restart_${n}_candidate`)].map(table_name=>({table_name,saved_rows:table_name.endsWith('.sales_restart_fact_candidate')?'41073':'0',status:'PASS',dataset_id:dataset,policy_version:SOURCE_REBUILD_POLICY}))
type Row = Record<string,string|null>
function reader(rows = receipt(), identity = dataset, count = '41073') {
  const statements:string[]=[]
  const execute = async(sql:string) => {
    statements.push(sql)
    let data:Row[]=[]
    if(sql.startsWith('SELECT DISTINCT dataset_id'))data=[{dataset_id:identity,policy_version:SOURCE_REBUILD_POLICY,area_mapping_sha256:'area',product_master_sha256:'product',publication_status:'CANDIDATE'}]
    else if(sql.startsWith('SELECT DISTINCT resolution_policy'))data=[{resolution_policy:'independent_catalog_v1',transaction_evidence_sha256:'evidence',catalog_helper_sha256:'helper'}]
    else if(sql.startsWith('SELECT table_name'))data=rows
    else if(sql.startsWith('SELECT COUNT'))data=[{records:count,unique_records:count}]
    return {rows:data,statementId:'fixture',rowCount:data.length} as any
  }
  return {execute,statements}
}

test('isolated activation requires an explicit safe schema, version, dataset and policy',()=>{
  const b=descriptiveBinding(env)
  assert.equal(b.version,0); assert.equal(b.auditSchema,'medshield_audit_source_20261022')
  assert.equal(descriptiveBinding({}).schema,'medshield_gold')
  assert.equal(descriptiveBinding({DATABRICKS_DESCRIPTIVE_SCHEMA:'',DATABRICKS_DESCRIPTIVE_DATASET_ID:'',DATABRICKS_DESCRIPTIVE_POLICY_VERSION:''}).schema,'medshield_gold')
  for(const change of [{DATABRICKS_DESCRIPTIVE_SCHEMA:'other.schema'},{DATABRICKS_DESCRIPTIVE_FACT_VERSION:'0; DROP TABLE x'}, {DATABRICKS_DESCRIPTIVE_FACT_VERSION:undefined},{DATABRICKS_DESCRIPTIVE_DATASET_ID:undefined},{DATABRICKS_DESCRIPTIVE_POLICY_VERSION:'legacy'}])assert.throws(()=>descriptiveBinding({...env,...change}))
})
test('v8 retains catalog identity and only selects the validated immutable fact',async()=>{
  const mock=reader(), release=await readDescriptiveRelease(descriptiveBinding(env),mock.execute)
  assert.equal(release.dataset_id,dataset); assert.equal(release.fact_delta_version,0)
  assert.equal(release.source_table,'workspace.medshield_gold_source_20261022.sales_restart_fact_candidate')
  assert.equal(release.catalog_helper_sha256,'helper')
  assert.ok(mock.statements.filter(sql=>sql.includes('FROM `workspace`.`medshield_gold_source_20261022`')).every(sql=>sql.includes('VERSION AS OF 0')))
  assert.match(catalogProjection(SOURCE_REBUILD_POLICY),/transaction_evidence, transaction_evidence_lineage/)
  assert.doesNotMatch(catalogProjection(SOURCE_REBUILD_POLICY),/ELSE 'original_source_detail'/)
})
test('activation rejects missing, failed, duplicated or wrong-source publication evidence',async()=>{
  const cases=[receipt().slice(1),receipt().map((r,i)=>i===0?{...r,status:'FAIL'}:r),receipt().map((r,i)=>i===0?{...r,dataset_id:'b'.repeat(64)}:r),[...receipt().slice(1),receipt()[1]]]
  for(const rows of cases)await assert.rejects(readDescriptiveRelease(descriptiveBinding(env),reader(rows).execute),/audit/)
  await assert.rejects(readDescriptiveRelease(descriptiveBinding(env),reader(receipt(),'b'.repeat(64)).execute),/identity/)
  await assert.rejects(readDescriptiveRelease(descriptiveBinding(env),reader(receipt(),dataset,'41072').execute),/population/)
  await assert.rejects(readDescriptiveRelease({schema:'medshield_gold',table:'`workspace`.`medshield_gold`.`sales_restart_fact_candidate`',version:0},reader().execute),/isolated publication audit/)
})
test('unreviewed 2026 money remains visible and never becomes original or adjusted evidence',()=>{
  const rows=buildSectorTrend([{date:'2026-09-30',sector:'Private',revenue:125,income:20,margin_revenue_basis:125,row_count:2,transaction_evidence:'unreviewed_source_detail'}])
  for(const row of rows){assert.equal(row.revenue,125);assert.equal(row.unreviewed_source_rows,2);assert.equal(row.original_source_rows,0);assert.equal(row.adjusted_estimated_rows,0)}
})
test('2026 financial benchmark evaluates the same three targets without future leakage',()=>{
  const series=new Map([['2026-01',70],['2026-02',80],['2026-03',90],['2026-04',90],['2026-05',100],['2026-06',110],['2026-07',120],['2026-08',130],['2026-09',140],['2025-07',100],['2025-08',110],['2025-09',120]].map(([period,value])=>[monthIndex(String(period)),Number(value)]))
  const run=()=>benchmarkView(series,monthIndex('2026-09'),3,'company','recorded_net_sales',monthIndex('2026-10'))
  const first=run();assert.equal(first.common_scored_months,3)
  assert.equal(first.models.last_value.comparison_metrics.mae,20)
  assert.equal(first.models.last_value.comparison_metrics.bias,-20)
  assert.deepEqual(first.models.last_value.backtest.map(p=>p.origin),['2026-06','2026-06','2026-06'])
  series.set(monthIndex('2026-12'),999999)
  assert.deepEqual(run(),first)
  assert.ok(first.models.last_value.forecast.every(point=>point.prediction===null&&point.actual===null))
})
