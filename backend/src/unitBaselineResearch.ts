import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {executeDatabricksStatement} from './databricks'
import {descriptiveBinding,readDescriptiveRelease,type DescriptiveRelease} from './descriptiveSource'
import {ITEMIZED_PREVIEW_BINDING as binding} from './itemizedPreviewBinding'
import {forecastMetrics,monthIndex} from './forecastEvidence'
import {decimalMicros} from './itemizedPreview'

// Immutable identity pins, not analytical fallback values.
export const UNIT_RESEARCH_BINDING={
  table:'workspace.medshield_gold.fact_forecast_run_candidate',
  artifactSha256:'3cc6a939806a84fbd2552ba1b210ed98edefff62f0c34d41057641af41f7a3e4',
  storageId:'unit_baseline_3cc6a939806a84fbd2552ba1b210ed98edefff62f0c34d41057641af41f7a3e4',
} as const
export const unitResearchHash=(raw:string)=>createHash('sha256').update(raw).digest('hex')
export const UNIT_RESEARCH_SQL=`SELECT source_record_id,source_workbook,source_file_sha256,source_row_number,
  product_key,normalized_product,product_category,area AS raw_area,CAST(date_delivered AS STRING) AS date,
  CAST(recorded_quantity AS STRING) AS recorded_quantity,CAST(gross_sales AS STRING) AS gross_sales,
  CAST(net_sales AS STRING) AS net_sales,CAST(acquisition_cost AS STRING) AS acquisition_cost,
  is_gross_sales_technically_eligible,is_net_sales_technically_eligible,is_acquisition_cost_technically_eligible,
  source_data_status,source_unit_approved,quantity_unit,CAST(physical_quantity AS STRING) AS physical_quantity,
  forecast_eligible,quality_rule_codes_json
  FROM ${binding.itemizedTable} VERSION AS OF 0
  WHERE record_kind='itemized_sale' AND area='HOSPITAL'
    AND normalized_product IN ('BUPIRIGHT','BUPIRIGHT 5MG/ML 0.5% IN 8% 4ML')
  ORDER BY normalized_product,raw_area,date_delivered,source_record_id`
type Json=Record<string,any>
type Row=Record<string,string|null>
const labels=['BUPIRIGHT','BUPIRIGHT 5MG/ML 0.5% IN 8% 4ML']
const methods=['last_value','mean_3','mean_6','seasonal_naive_12']
const close=(a:unknown,b:number)=>assert.ok(typeof a==='number'&&Number.isFinite(a)&&Math.abs(a-b)<1e-9)

export function validateUnitResearch(raw:string,release:DescriptiveRelease,rows:Row[]){
  assert.ok(Buffer.byteLength(raw)<500_000);assert.equal(unitResearchHash(raw),UNIT_RESEARCH_BINDING.artifactSha256)
  const artifact:Json=JSON.parse(raw),candidate=artifact.candidate,results=artifact.results,protocol=artifact.protocol
  assert.equal(artifact.schema_version,'bupiright_unit_research_v1')
  assert.equal(artifact.research_display_authorized,true);assert.equal(artifact.operational_forecasting_approved,false)
  assert.ok(release.original_itemized)
  for(const [field,value] of Object.entries({dataset_id:binding.datasetId,source_table:binding.itemizedTable,fact_delta_version:0,policy_version:binding.policy})){
    assert.equal((release as unknown as Json)[field],value);assert.equal(artifact.source_release[field],value)
  }
  for(const [field,value] of Object.entries({receipt_sha256:binding.receiptSha256,source_keys_sha256:binding.keysSha256,
    contracts_excluded:true,financial_release_approved:false,unit_approval:false,forecast_approval:false})){
    assert.equal((release.original_itemized as Json)[field],value)
    assert.equal(artifact.source_release.original_itemized[field],value)
  }
  assert.equal(release.product_master_sha256,binding.expectedGoldReceipt.accepted_master_sha256)
  assert.equal(release.area_mapping_sha256,null)
  assert.deepEqual(rows,artifact.source_rows,'Source evidence differs from checked Gold')
  assert.equal(rows.length,50);assert.equal(new Set(rows.map(r=>r.source_record_id)).size,50)
  assert.deepEqual(artifact.confirmation.exact_labels,labels)
  assert.equal(artifact.confirmation.same_4ml_product_confirmed,true)
  assert.equal(artifact.confirmation.billed_unit,'one_ampoule_box_of_one')
  assert.equal(artifact.confirmation.quantity_multiplier,1)
  assert.deepEqual(candidate.exact_labels,labels);assert.equal(candidate.raw_area,'HOSPITAL')
  assert.equal(candidate.model_publication_approved,false);assert.equal(candidate.global_product_master_changed,false)
  assert.equal(candidate.operational_replenishment_approved,false)
  assert.equal(candidate.monthly.length,35);assert.equal(candidate.research_window.length,18)
  assert.equal(candidate.unreviewed_source_records,rows.filter(r=>r.source_data_status==='UNREVIEWED_SOURCE_EXPORT').length)
  let total=0n
  for(const m of candidate.monthly){
    const subset=rows.filter(r=>r.date?.slice(0,7)===m.month)
    assert.equal(m.source_records,subset.length)
    assert.deepEqual(m.source_record_ids,subset.map(r=>r.source_record_id).sort())
    const quantity=subset.reduce((sum,r)=>sum+decimalMicros(r.recorded_quantity!),0n)
    assert.equal(quantity,decimalMicros(m.net_recorded_ampoules));total+=quantity
  }
  assert.equal(total,decimalMicros(candidate.total_recorded_ampoules))
  assert.deepEqual(candidate.research_window,candidate.monthly.filter((r:Json)=>r.month>='2025-04'&&r.month<='2026-09'))
  const window:Json[]=candidate.research_window
  window.forEach((r,index)=>assert.equal(monthIndex(r.month),monthIndex('2025-04')+index))
  assert.deepEqual(protocol.methods,methods);assert.deepEqual(protocol.actual_calendar_leads,[1,3])
  assert.equal(protocol.minimum_training_months,12);assert.equal(protocol.selection_policy,'report_all_no_method_selection_or_activation')
  assert.equal(results.selected_method,null);assert.equal(results.future_predictions_generated,false)
  assert.equal(results.model_publication_approved,false);assert.equal(results.warehouse_writes,0)
  assert.equal(results.cases.length,40);assert.equal(results.metrics.length,8)
  const quantities=window.map(r=>Number(r.net_recorded_ampoules))
  const points:Json[]=[],metrics:Json[]=[]
  const seen=new Set<string>()
  for(const c of results.cases){
    assert.ok(methods.includes(c.method)&&[1,3].includes(c.lead))
    const oi=window.findIndex(r=>r.month===c.origin),ti=window.findIndex(r=>r.month===c.target_month)
    assert.ok(oi>=11&&ti>=0);assert.equal(ti-oi,c.lead);assert.equal(c.training_months,oi+1)
    const mean=(n:number)=>quantities.slice(oi-n+1,oi+1).reduce((a,b)=>a+b,0)/n
    const predictions:Record<string,number>={last_value:quantities[oi],mean_3:mean(3),mean_6:mean(6),seasonal_naive_12:quantities[ti-12]}
    close(Number(c.predicted_ampoules),predictions[c.method]);close(Number(c.actual_ampoules),quantities[ti])
    close(Number(c.error_ampoules),predictions[c.method]-quantities[ti])
    const key=[c.method,c.origin,c.lead].join('|');assert.ok(!seen.has(key));seen.add(key)
    points.push({method:c.method,origin:c.origin,target_month:c.target_month,lead:c.lead,
      actual:quantities[ti],prediction:predictions[c.method],error:predictions[c.method]-quantities[ti]})
  }
  for(const lead of [1,3])for(const method of methods){
    const group=points.filter(p=>p.method===method&&p.lead===lead)
    assert.equal(group.length,lead===1?6:4)
    const expected=forecastMetrics(group.map(p=>[p.actual,p.prediction]))
    const saved=results.metrics.filter((r:Json)=>r.method===method&&r.lead===lead)
    assert.equal(saved.length,1);assert.equal(saved[0].cases,expected.n)
    for(const [savedKey,key] of [['MAE_ampoules','mae'],['RMSE_ampoules','rmse'],['WAPE_percent','wape'],['mean_signed_error_ampoules','bias']] as const){
      if(expected[key]===null)assert.equal(saved[0][savedKey],null)
      else close(Number(saved[0][savedKey]),expected[key]!)
    }
    metrics.push({method,lead,...expected})
  }
  return {status:'unit_baseline_research',research_display_authorized:true,operational_forecasting_approved:false,
    activation_allowed:false,selected_method:null,
    scope:{product:'BUPIRIGHT 4 mL',labels,recorded_channel:'HOSPITAL',unit:'ampoules',contracts_excluded:true,
      geography_status:'channel_not_verified_delivery_territory',filter_policy:'fixed_research_scope_independent_of_analysis_filters'},
    source:{dataset_id:binding.datasetId,fact_table:binding.itemizedTable,fact_version:0,policy_version:binding.policy,
      receipt_sha256:binding.receiptSha256,artifact_sha256:UNIT_RESEARCH_BINDING.artifactSha256,
      storage_id:UNIT_RESEARCH_BINDING.storageId,confirmation_sha256:artifact.artifact_evidence_sha256['user-confirmation.json'],
      protocol_sha256:artifact.artifact_evidence_sha256['baseline-protocol.json']},
    evidence:{source_records:50,observed_months:35,recent_contiguous_months:18,unreviewed_source_records:candidate.unreviewed_source_records,
      unit_confirmation:'User confirmed same 4 mL product, billed as one ampoule / box of one.',
      research_window_start:'2025-04',research_window_end:'2026-09'},
    metrics,points,limitations:[...results.limitations,'Global source/master unit flags remain unchanged; the user-confirmed two-label interpretation applies to this research scope.'],
  }
}

export async function readUnitResearch(execute=executeDatabricksStatement,releaseReader=()=>readDescriptiveRelease(descriptiveBinding())){
  const release=await releaseReader()
  const [saved,current]=await Promise.all([
    execute(`SELECT run_id,artifact_hash,payload_json FROM ${UNIT_RESEARCH_BINDING.table} WHERE run_id='${UNIT_RESEARCH_BINDING.storageId}'`,{rowLimit:2}),
    execute(UNIT_RESEARCH_SQL,{rowLimit:100}),
  ])
  assert.equal(saved.rows.length,1);const row=saved.rows[0]
  assert.equal(row.run_id,UNIT_RESEARCH_BINDING.storageId);assert.equal(row.artifact_hash,UNIT_RESEARCH_BINDING.artifactSha256)
  assert.equal(typeof row.payload_json,'string')
  return validateUnitResearch(row.payload_json!,release,current.rows)
}
