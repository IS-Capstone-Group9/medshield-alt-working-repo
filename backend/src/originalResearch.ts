import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {executeDatabricksStatement} from './databricks'
import {descriptiveBinding,readDescriptiveRelease,type DescriptiveRelease} from './descriptiveSource'
import {EXTENSION_RESEARCH_TABLE,readExtensionResearch} from './extensionResearch'
import {ITEMIZED_PREVIEW_BINDING as binding} from './itemizedPreviewBinding'
import {decimalMicros} from './itemizedPreview'
import {forecastMetrics,monthIndex} from './forecastEvidence'
import {currentRequestSignal,recordRequestMetric,withoutRequestCancellation} from './requestContext'

// Validation identities only. Runtime values always come from Databricks.
export const ORIGINAL_RESEARCH_BINDING={table:EXTENSION_RESEARCH_TABLE,
  artifactSha256:'ee42ea80960c9954c9ba9e8e84c58e023206d241f0e906ccafd053232d5b8bf5',
  runId:'a40d4493b69a5f2ed99432269b49fd2e091fc971538e2fa3653c3756c2f67e63',
  inputSha256:'9cb44b4b031f172844f616c55b37df9ebb9851df1c6a5060370e8b2842956da0',
  monthlySha256:'9d087afd9dce2ee41da1701d34cbb0083d92d5b5b24dc8aac6471d83e5ed8d0e',
} as const
export const originalResearchDigest=(raw:string)=>createHash('sha256').update(raw).digest('hex')
export const originalResearchStorageId='original_'+ORIGINAL_RESEARCH_BINDING.artifactSha256
type Row=Record<string,string|null>
type Json=Record<string,any>

export const ORIGINAL_RESEARCH_MONTHLY_SQL=`SELECT DATE_FORMAT(date_delivered,'yyyy-MM') AS month,
  COUNT(*) AS source_records, COUNT_IF(is_net_sales_technically_eligible) AS net_eligible_records,
  CAST(SUM(CASE WHEN is_net_sales_technically_eligible THEN net_sales END) AS STRING) AS net_sales_php,
  CAST(SUM(CASE WHEN is_gross_margin_technically_eligible THEN gross_margin_amount END) AS STRING) AS supported_gross_profit_php,
  CAST(SUM(CASE WHEN is_gross_margin_technically_eligible THEN net_sales END) AS STRING) AS matching_margin_revenue_php
  FROM ${binding.itemizedTable.split('.').map(part=>'`'+part+'`').join('.')} VERSION AS OF 0
  WHERE record_kind='itemized_sale' GROUP BY DATE_FORMAT(date_delivered,'yyyy-MM') ORDER BY month`

let monthlyInFlight: ReturnType<typeof executeDatabricksStatement> | undefined

/** Same immutable Gold target, shared only while readers overlap; never a stale fallback. */
export function readOriginalResearchMonthly(execute=executeDatabricksStatement) {
  if (execute!==executeDatabricksStatement) return execute(ORIGINAL_RESEARCH_MONTHLY_SQL,{rowLimit:2400})
  const caller=currentRequestSignal()
  if (caller?.aborted) return Promise.reject(caller.reason)
  if (monthlyInFlight) {
    recordRequestMetric('cacheSharedLoads')
    return monthlyInFlight
  }
  // The bounded SQL operation owns its lifetime, not the first HTTP reader.
  monthlyInFlight=withoutRequestCancellation(()=>execute(ORIGINAL_RESEARCH_MONTHLY_SQL,{rowLimit:2400}))
    .finally(()=>{monthlyInFlight=undefined})
  return monthlyInFlight
}

function six(value:string|null){
  const n=decimalMicros(value??''),a=n<0n?-n:n
  return(n<0n?'-':'')+String(a/1_000_000n)+'.'+String(a%1_000_000n).padStart(6,'0')
}
function sameMetrics(actual:ReturnType<typeof forecastMetrics>,stored:Json){
  assert.equal(stored?.n,actual.n)
  for(const key of ['mae','rmse','wape','bias','normalized_bias'] as const){
    const value=actual[key]
    if(value===null)assert.equal(stored[key],null)
    else assert.ok(typeof stored[key]==='number'&&Number.isFinite(stored[key])&&Math.abs(value-stored[key])<=Math.max(.000001,Math.abs(value)*1e-10),'Saved forecast score differs')
  }
}

/** Independent Gold target checks and metric recomputation precede any UI response. */
export function validateOriginalResearch(raw:string,release:DescriptiveRelease,monthly:Row[]){
  const pin=ORIGINAL_RESEARCH_BINDING
  assert.ok(Buffer.byteLength(raw)<=5_000_000);assert.equal(originalResearchDigest(raw),pin.artifactSha256)
  assert.equal(release.source_table,binding.itemizedTable);assert.equal(release.dataset_id,binding.datasetId)
  assert.equal(release.policy_version,binding.policy);assert.equal(release.fact_delta_version,0)
  assert.equal(release.product_master_sha256,binding.expectedGoldReceipt.accepted_master_sha256)
  assert.equal(release.area_mapping_sha256,null);assert.equal(release.financial_publication,undefined)
  assert.ok(release.original_itemized)
  const expected={batch_id:binding.batchId,dataset_id:binding.datasetId,source_table:binding.itemizedTable,
    delta_version:0,policy_version:binding.policy,receipt_sha256:binding.receiptSha256,source_keys_sha256:binding.keysSha256,
    contracts_excluded:true,financial_release_approved:false,unit_approval:false,forecast_approval:false}
  for(const [key,value] of Object.entries(expected))assert.equal((release.original_itemized as Json)[key],value)
  const run:Json=JSON.parse(raw)
  for(const [key,value] of Object.entries(expected))assert.equal(run.source_identity?.[key],value)
  assert.equal(run.schema_version,'original_itemized_monthly_php_retrospective_v1')
  assert.equal(run.status,'evaluated_unpublished');assert.equal(run.run_id,pin.runId)
  assert.equal(run.registration_sha256,pin.runId);assert.equal(run.source_sha256,pin.inputSha256)
  assert.equal(run.monthly_logical_sha256,pin.monthlySha256)
  for(const field of ['publication_approved','financial_release_approved'])assert.equal(run[field],false)
  for(const field of ['warehouse_writes','model_pointer_changes','future_forecasts_generated'])assert.equal(run[field],0)
  assert.equal(run.target.unit,'PHP');assert.equal(run.target.buyers,'all')
  assert.equal(run.target.scope,'original_itemized_sales_contracts_excluded_not_complete_company')
  assert.equal(monthly.length,107);assert.equal(new Set(monthly.map(row=>row.month)).size,107)
  const canonical=monthly.map(row=>[row.month,row.source_records,row.net_eligible_records,
    six(row.net_sales_php),six(row.supported_gross_profit_php),six(row.matching_margin_revenue_php)])
  assert.equal(originalResearchDigest(JSON.stringify(canonical)),pin.monthlySha256,'Current Gold monthly history differs')
  const actuals=new Map(monthly.map(row=>[row.month,Number(row.net_sales_php)]))
  const configs=Object.keys(run.code_hashes??{});assert.ok(configs.includes('models.py')&&configs.includes('original_research.py'))
  assert.equal(run.selection.model_id,'last_value');assert.equal(run.selection.stage,'development_only')
  assert.equal(run.selection.frozen_before_audit,true)
  const stages=['development','retrospective_audit_2025','retrospective_extension_2026']
  const models=[...new Set<string>(run.evaluations.map((row:Json)=>row.model_id))]
  assert.equal(models.length,21);assert.equal(run.evaluations.length,63);assert.equal(run.predictions.length,1701)
  assert.equal(run.folds.length,147)
  const seen=new Set<string>()
  for(const point of run.predictions){
    assert.ok(stages.includes(point.stage)&&models.includes(point.model_id))
    assert.equal(point.run_id,pin.runId);assert.equal(point.scope,run.target.scope);assert.equal(point.unit,'PHP')
    assert.equal(point.target_name,'net_sales');assert.equal(point.series_id,'original_itemized_all_buyers_php')
    assert.match(point.origin_period,/^\d{4}-(0[1-9]|1[0-2])$/);assert.match(point.target_period,/^\d{4}-(0[1-9]|1[0-2])$/)
    assert.ok(Number.isInteger(point.lead_months)&&point.lead_months>=1&&point.lead_months<=12)
    assert.equal(monthIndex(point.target_period)-monthIndex(point.origin_period),point.lead_months)
    assert.equal(point.actual,actuals.get(point.target_period))
    assert.ok(point.prediction===null||typeof point.prediction==='number'&&Number.isFinite(point.prediction))
    if(point.prediction===null)assert.ok(point.missing_reason)
    assert.ok(point.intervals.every((band:Json)=>band.lower===null&&band.upper===null&&band.sample_count===0))
    const origins=point.stage==='development'?run.schedule.development_origins:[point.stage==='retrospective_audit_2025'?'2024-12':'2025-12']
    assert.ok(origins.includes(point.origin_period))
    if(point.stage==='retrospective_extension_2026')assert.ok(point.lead_months<=9)
    const key=[point.model_id,point.stage,point.origin_period,point.lead_months].join('|')
    assert.ok(!seen.has(key));seen.add(key)
  }
  const comparisons=models.map(model=>{
    const scores:Json={}
    for(const stage of stages){
      const cohort=run.predictions.filter((p:Json)=>p.model_id===model&&p.stage===stage)
      const expectedCases=stage==='development'?60:stage==='retrospective_audit_2025'?12:9
      assert.equal(cohort.length,expectedCases)
      const metrics=forecastMetrics(cohort.filter((p:Json)=>p.prediction!==null).map((p:Json)=>[p.actual,p.prediction]))
      const stored=run.evaluations.filter((row:Json)=>row.model_id===model&&row.stage===stage)
      assert.equal(stored.length,1);assert.equal(stored[0].expected_cases,expectedCases);sameMetrics(metrics,stored[0].metrics)
      scores[stage==='retrospective_audit_2025'?'retrospective_audit':stage]={...metrics,expected_cases:expectedCases}
    }
    return {model_id:model,...scores}
  })
  const points=run.predictions.filter((p:Json)=>p.stage!=='development').map((p:Json)=>({
    model_id:p.model_id,stage:p.stage==='retrospective_audit_2025'?'retrospective_audit':p.stage,
    origin_period:p.origin_period,target_period:p.target_period,lead_months:p.lead_months,
    actual:p.actual,prediction:p.prediction,missing_reason:p.missing_reason,
  }))
  return {status:'evaluated_unpublished' as const,publication_approved:false,activation_allowed:false,
    financial_release_approved:false,
    scope:{sector:'All',territory:'company',unit:'PHP',target:'recorded_itemized_net_sales',contracts_excluded:true,
      company_coverage:'unknown',filter_policy:'fixed_itemized_all_buyers_independent_of_dashboard_filters',
      training_start:'2020-01',extension_end:'2026-09'},
    source:{table:pin.table,storage_id:originalResearchStorageId,artifact_sha256:pin.artifactSha256,
      dataset_id:binding.datasetId,fact_table:binding.itemizedTable,fact_version:0,input_sha256:pin.inputSha256,
      monthly_sha256:pin.monthlySha256,receipt_sha256:binding.receiptSha256,policy_version:binding.policy,
      base_run_id:pin.runId,extension_run_id:pin.runId},
    selection:run.selection,comparisons,points,available_stages:['retrospective_extension_2026','retrospective_audit'],
    limitations:[...run.limitations,'Errors are substantial; retained benchmark is a research reference, not accepted operational accuracy.'],
  }
}

export async function readOriginalResearch(release:DescriptiveRelease,execute=executeDatabricksStatement){
  assert.ok(release.original_itemized,'Original itemized release required')
  const [saved,monthly]=await Promise.all([
    execute(`SELECT run_id,artifact_hash,payload_json FROM ${ORIGINAL_RESEARCH_BINDING.table} WHERE run_id='${originalResearchStorageId}'`,{rowLimit:2}),
    readOriginalResearchMonthly(execute),
  ])
  assert.equal(saved.rows.length,1)
  const row=saved.rows[0]
  assert.equal(row.run_id,originalResearchStorageId);assert.equal(row.artifact_hash,ORIGINAL_RESEARCH_BINDING.artifactSha256)
  assert.equal(typeof row.payload_json,'string')
  return validateOriginalResearch(row.payload_json!,release,monthly.rows)
}

export async function readCurrentSourceResearch(){
  const selected=descriptiveBinding()
  if(selected.adapter==='original_itemized_v1')return readOriginalResearch(await readDescriptiveRelease(selected))
  return readExtensionResearch()
}
