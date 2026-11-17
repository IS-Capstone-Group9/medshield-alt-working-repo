import assert from 'node:assert/strict'
import {executeDatabricksStatement} from './databricks'
import {descriptiveBinding,readDescriptiveRelease,type DescriptiveRelease} from './descriptiveSource'
import {ITEMIZED_PREVIEW_BINDING as binding} from './itemizedPreviewBinding'
import {ORIGINAL_RESEARCH_BINDING,readOriginalResearchMonthly,originalResearchDigest as hash} from './originalResearch'
import {decimalMicros} from './itemizedPreview'
import {forecastMetrics,monthIndex,monthLabel} from './forecastEvidence'

export const ROLLING_RESEARCH_BINDING={table:ORIGINAL_RESEARCH_BINDING.table,
  artifactSha256:'2ac1325764efdac012f83a8c84fe622ffa190aefdc17acfdc9e000e1ea7d5245',
  runId:'353d0287c012078f09e4895cc5c1d546d4ac8ff09e8a0ca795a01708b1b94c35',
  protocolSha256:'72628dcae4570e17a0903cfc0924adeea272728a0b6a3ed0c0ef69070f50ae2a',
  storageId:'rolling_2ac1325764efdac012f83a8c84fe622ffa190aefdc17acfdc9e000e1ea7d5245',
} as const
type Json=Record<string,any>
type Row=Record<string,string|null>
function sameScore(actual:ReturnType<typeof forecastMetrics>,stored:Json){
  assert.equal(stored?.n,actual.n)
  for(const key of ['mae','rmse','wape','bias','normalized_bias'] as const){
    const value=actual[key]
    if(value===null)assert.equal(stored[key],null)
    else assert.ok(typeof stored[key]==='number'&&Number.isFinite(stored[key])&&Math.abs(stored[key]-value)<=Math.max(.000001,Math.abs(value)*1e-10))
  }
}
function six(raw:string|null){const n=decimalMicros(raw??''),a=n<0n?-n:n;return(n<0n?'-':'')+String(a/1000000n)+'.'+String(a%1000000n).padStart(6,'0')}

export function validateRollingResearch(raw:string,release:DescriptiveRelease,monthly:Row[]){
  const pin=ROLLING_RESEARCH_BINDING
  assert.ok(Buffer.byteLength(raw)<=8_000_000);assert.equal(hash(raw),pin.artifactSha256)
  const run:Json=JSON.parse(raw)
  assert.equal(run.schema_version,'original_itemized_rolling_execution_v1')
  assert.equal(run.status,'EXPLORATORY_ROLLING_EVALUATED_UNPUBLISHED')
  assert.equal(run.run_id,pin.runId);assert.equal(run.execution_registration_sha256,pin.runId)
  assert.equal(run.protocol_sha256,pin.protocolSha256)
  assert.equal(run.source_sha256,ORIGINAL_RESEARCH_BINDING.inputSha256)
  assert.equal(release.source_table,binding.itemizedTable);assert.equal(release.dataset_id,binding.datasetId)
  assert.equal(release.fact_delta_version,0);assert.equal(release.policy_version,binding.policy)
  assert.equal(release.product_master_sha256,binding.expectedGoldReceipt.accepted_master_sha256)
  assert.equal(release.area_mapping_sha256,null);assert.equal(release.financial_publication,undefined)
  assert.ok(release.original_itemized)
  for(const [key,value] of Object.entries({batch_id:binding.batchId,dataset_id:binding.datasetId,
    policy_version:binding.policy,source_table:binding.itemizedTable,delta_version:0,receipt_sha256:binding.receiptSha256,
    source_keys_sha256:binding.keysSha256,contracts_excluded:true,financial_release_approved:false,unit_approval:false,forecast_approval:false})){
    assert.equal((release.original_itemized as Json)[key],value);assert.equal(run.source_identity?.[key],value)
  }
  assert.equal(run.publication_approved,false);assert.equal(run.financial_release_approved,false)
  for(const field of ['warehouse_writes','model_pointer_changes','future_forecasts_generated'])assert.equal(run[field],0)
  assert.equal(monthly.length,107);assert.equal(new Set(monthly.map(row=>row.month)).size,107)
  assert.equal(hash(JSON.stringify(monthly.map(row=>[row.month,row.source_records,row.net_eligible_records,
    six(row.net_sales_php),six(row.supported_gross_profit_php),six(row.matching_margin_revenue_php)]))),ORIGINAL_RESEARCH_BINDING.monthlySha256)
  const actuals=new Map(monthly.map(row=>[row.month,Number(row.net_sales_php)]))
  assert.equal(run.selection.model_id,'mean_6');assert.equal(run.selection.best_benchmark,'mean_6')
  assert.equal(run.selection.stage,'development_only');assert.equal(run.selection.frozen_before_audits,true)
  assert.equal(run.predictions.length,1722);assert.equal(run.metrics.length,126);assert.equal(run.fits.length,945)
  const models=[...new Set<string>(run.metrics.map((row:Json)=>row.model_id))];assert.equal(models.length,21)
  const seen=new Set<string>()
  for(const point of run.predictions){
    assert.ok(models.includes(point.model_id));assert.equal(point.run_id,pin.runId)
    assert.ok([1,3].includes(point.lead_months));assert.equal(point.unit,'PHP')
    assert.equal(point.scope,'original_itemized_sales_contracts_excluded_not_complete_company')
    assert.match(point.target_period,/^\d{4}-(0[1-9]|1[0-2])$/);assert.match(point.origin_period,/^\d{4}-(0[1-9]|1[0-2])$/)
    assert.equal(monthIndex(point.target_period)-monthIndex(point.origin_period),point.lead_months)
    assert.equal(point.actual,actuals.get(point.target_period))
    assert.ok(point.prediction===null||typeof point.prediction==='number'&&Number.isFinite(point.prediction))
    if(point.prediction===null)assert.ok(point.missing_reason)
    assert.deepEqual(point.intervals,[])
    const key=[point.model_id,point.stage,point.target_period,point.lead_months].join('|')
    assert.ok(!seen.has(key));seen.add(key)
  }
  const leadViews:Record<string,Json>={}
  for(const lead of [1,3]){
    const comparisons=models.map(model=>{
      const scores:Json={}
      for(const [stage,start,count] of [['development','2023-03',20],['retrospective_audit_2025','2025-01',12],['retrospective_extension_2026','2026-01',9]] as const){
        const cohort=run.predictions.filter((p:Json)=>p.model_id===model&&p.stage===stage&&p.lead_months===lead).sort((a:Json,b:Json)=>a.target_period.localeCompare(b.target_period))
        assert.equal(cohort.length,count)
        assert.ok(cohort.every((p:Json,index:number)=>p.target_period===monthLabel(monthIndex(start)+index)))
        const metrics=forecastMetrics(cohort.filter((p:Json)=>p.prediction!==null).map((p:Json)=>[p.actual,p.prediction]))
        const stored=run.metrics.filter((row:Json)=>row.model_id===model&&row.stage===stage&&row.lead_months===lead)
        assert.equal(stored.length,1);assert.equal(stored[0].expected_cases,count);sameScore(metrics,stored[0].metrics)
        scores[stage==='retrospective_audit_2025'?'retrospective_audit':stage]={...metrics,expected_cases:count}
      }
      return {model_id:model,...scores}
    })
    const points=run.predictions.filter((p:Json)=>p.stage!=='development'&&p.lead_months===lead).map((p:Json)=>({
      model_id:p.model_id,stage:p.stage==='retrospective_audit_2025'?'retrospective_audit':p.stage,
      origin_period:p.origin_period,target_period:p.target_period,lead_months:p.lead_months,
      actual:p.actual,prediction:p.prediction,missing_reason:p.missing_reason,
    }))
    leadViews[String(lead)]={status:'evaluated_unpublished',publication_approved:false,activation_allowed:false,financial_release_approved:false,
      scope:{sector:'All',territory:'company',unit:'PHP',contracts_excluded:true,company_coverage:'unknown',
        filter_policy:'fixed_itemized_all_buyers_independent_of_dashboard_filters',forecast_lead_months:lead,
        refresh_policy:'expanding_history_refit_each_origin_month'},
      source:{table:pin.table,storage_id:pin.storageId,artifact_sha256:pin.artifactSha256,dataset_id:binding.datasetId,
        fact_table:binding.itemizedTable,fact_version:0,input_sha256:run.source_sha256,monthly_sha256:ORIGINAL_RESEARCH_BINDING.monthlySha256,
        receipt_sha256:binding.receiptSha256,policy_version:binding.policy,extension_run_id:pin.runId,protocol_sha256:pin.protocolSha256},
      selection:{...run.selection,frozen_before_audit:true},comparisons,points,
      available_stages:['retrospective_extension_2026','retrospective_audit'],
      limitations:[...run.limitations,'Substantial errors and underprediction remain. This is a separate monthly-refresh experiment; fixed-year origins/leads differ. No operational activation or calibrated interval.'],
    }
  }
  return {status:'rolling_research_unpublished',publication_approved:false,activation_allowed:false,lead_views:leadViews}
}

export async function readRollingResearch(execute=executeDatabricksStatement,releaseReader=()=>readDescriptiveRelease(descriptiveBinding())){
  const release=await releaseReader();assert.ok(release.original_itemized,'Original source required for rolling research')
  const pin=ROLLING_RESEARCH_BINDING
  const [saved,monthly]=await Promise.all([
    execute(`SELECT run_id,artifact_hash,payload_json FROM ${pin.table} WHERE run_id='${pin.storageId}'`,{rowLimit:2}),
    readOriginalResearchMonthly(execute),
  ])
  assert.equal(saved.rows.length,1);const row=saved.rows[0]
  assert.equal(row.run_id,pin.storageId);assert.equal(row.artifact_hash,pin.artifactSha256)
  assert.equal(typeof row.payload_json,'string')
  return validateRollingResearch(row.payload_json!,release,monthly.rows)
}
