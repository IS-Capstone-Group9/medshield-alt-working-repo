import assert from 'node:assert/strict'
import {executeDatabricksStatement} from './databricks'
import {descriptiveBinding,readDescriptiveRelease,type DescriptiveRelease} from './descriptiveSource'
import {ITEMIZED_PREVIEW_BINDING as binding} from './itemizedPreviewBinding'
import {decimalMicros} from './itemizedPreview'
import {ORIGINAL_RESEARCH_BINDING,readOriginalResearchMonthly,originalResearchDigest as hash} from './originalResearch'
import {forecastMetrics,monthIndex} from './forecastEvidence'

export const TOURNAMENT_BINDING={table:ORIGINAL_RESEARCH_BINDING.table,
  artifactSha256:'6f48c17c1e581864a42b5e34acc0747eff008fc7e8b87155e8bab0562d92055d',
  registrationSha256:'de9493b198e85768cbdbd42ea05ebb52618c51fd93cae020cc086d2eecc03c65',
  inputSha256:'5720ef1276e29c131b2f16b01efb3f0c313e6108b55ff92b4ab540a057c61957',
  storageId:'tournament_6f48c17c1e581864a42b5e34acc0747eff008fc7e8b87155e8bab0562d92055d',
} as const
type Json=Record<string,any>
type Row=Record<string,string|null>
export const TOURNAMENT_STAGES=['development','retrospective_audit','inspected_extension'] as const
export const TOURNAMENT_LEADS=[1,3,6] as const
const six=(raw:string|null)=>{
  const n=decimalMicros(raw??''),a=n<0n?-n:n
  return(n<0n?'-':'')+String(a/1000000n)+'.'+String(a%1000000n).padStart(6,'0')
}
const near=(a:number|null,b:unknown)=>{
  if(a===null)assert.equal(b,null)
  else assert.ok(typeof b==='number'&&Number.isFinite(b)&&Math.abs(a-b)<=Math.max(1e-7,Math.abs(a)*1e-10),'Stored tournament score differs')
}

/** Exact artifact plus fresh complete Gold controls; no fitting or filesystem analytics. */
export function validateTournamentResearch(raw:string,release:DescriptiveRelease,monthly:Row[]){
  const pin=TOURNAMENT_BINDING
  assert.ok(Buffer.byteLength(raw)<=2_000_000);assert.equal(hash(raw),pin.artifactSha256)
  const run:Json=JSON.parse(raw)
  assert.equal(run.schema_version,'sales_external_tournament_v1')
  assert.equal(run.source_sha256,pin.inputSha256);assert.equal(run.target_unit,'PHP')
  assert.equal(run.evidence_label,'Forecast');assert.equal(run.publication_approved,false);assert.equal(run.operational_approval,false)
  assert.deepEqual(run.assumption_ids,[]);assert.equal(run.consequence_units,null);assert.equal(run.consequence_tp_php,null)
  assert.equal(release.source_table,binding.itemizedTable);assert.equal(release.dataset_id,binding.datasetId)
  assert.equal(release.fact_delta_version,0);assert.equal(release.policy_version,binding.policy)
  assert.equal(release.product_master_sha256,binding.expectedGoldReceipt.accepted_master_sha256)
  assert.equal(release.area_mapping_sha256,null);assert.equal(release.financial_publication,undefined)
  assert.ok(release.original_itemized)
  for(const [key,value] of Object.entries({batch_id:binding.batchId,dataset_id:binding.datasetId,
    source_table:binding.itemizedTable,delta_version:0,policy_version:binding.policy,
    receipt_sha256:binding.receiptSha256,source_keys_sha256:binding.keysSha256,contracts_excluded:true,
    financial_release_approved:false,unit_approval:false,forecast_approval:false})){
    assert.equal((release.original_itemized as Json)[key],value);assert.equal(run.source_identity?.[key],value)
  }
  assert.equal(monthly.length,107);assert.equal(new Set(monthly.map(r=>r.month)).size,107)
  assert.equal(hash(JSON.stringify(monthly.map(r=>[r.month,r.source_records,r.net_eligible_records,
    six(r.net_sales_php),six(r.supported_gross_profit_php),six(r.matching_margin_revenue_php)]))),ORIGINAL_RESEARCH_BINDING.monthlySha256)
  const observed=new Map(monthly.map(r=>[monthIndex(r.month!),Number(r.net_sales_php)]))
  const protocol=run.protocol
  assert.equal(protocol.policy_version,'sales_external_tournament_v1_candidate_only')
  assert.equal(protocol.training_start,'2020-01');assert.deepEqual(protocol.leads,TOURNAMENT_LEADS)
  const models:string[]=protocol.configs.map((r:Json)=>r.model_id)
  assert.equal(models.length,22);assert.equal(new Set(models).size,22)
  assert.equal(run.predictions.length,1980)
  const points=run.predictions as Array<{model_id:string;series_id:string;target_name:string;stage:string;origin_period:string;
    target_period:string;lead_months:number;actual:number;prediction:number|null;missing_reason:string|null;mase_scale:number;mase_scale_lag_months:number}>
  const seen=new Set<string>()
  for(const p of points){
    assert.ok(models.includes(p.model_id)&&TOURNAMENT_STAGES.includes(p.stage as typeof TOURNAMENT_STAGES[number]))
    assert.equal(p.series_id,'original_itemized_all_buyers_PHP');assert.equal(p.target_name,'net_sales')
    assert.ok(TOURNAMENT_LEADS.includes(p.lead_months as 1|3|6))
    const origin=monthIndex(p.origin_period),target=monthIndex(p.target_period)
    assert.equal(target-origin,p.lead_months);assert.equal(p.actual,observed.get(target))
    assert.ok(protocol[p.stage+'_origins'].includes(p.origin_period))
    const key=[p.stage,p.model_id,p.origin_period,p.lead_months].join('|');assert.ok(!seen.has(key));seen.add(key)
    assert.ok(p.prediction===null||Number.isFinite(p.prediction))
    assert.ok(p.prediction!==null||typeof p.missing_reason==='string'&&p.missing_reason.length>0)
    const history=Array.from({length:origin-monthIndex(protocol.training_start)+1},(_,i)=>observed.get(monthIndex(protocol.training_start)+i))
    assert.ok(history.length>12&&history.every(v=>v!==undefined&&Number.isFinite(v)))
    const scale=history.slice(12).reduce<number>((sum,v,i)=>sum+Math.abs(v!-history[i]!),0)/(history.length-12)
    assert.equal(p.mase_scale_lag_months,12);near(scale,p.mase_scale)
  }
  const groups=TOURNAMENT_STAGES.flatMap(stage=>TOURNAMENT_LEADS.flatMap(lead=>models.map(model=>{
    const cohort=points.filter(p=>p.stage===stage&&p.lead_months===lead&&p.model_id===model)
    const expected=protocol[stage+'_origins'].length
    assert.equal(cohort.length,expected)
    const eligible=cohort.filter(p=>p.prediction!==null)
    const score=forecastMetrics(eligible.map(p=>[p.actual,p.prediction!]))
    const complete=eligible.length===expected
    const mase=eligible.length?eligible.reduce((s,p)=>s+Math.abs(p.prediction!-p.actual)/p.mase_scale,0)/eligible.length:null
    const saved=run.reports.filter((r:Json)=>r.stage===stage&&r.lead_months===lead&&r.model_id===model)
    assert.equal(saved.length,complete?1:0)
    if(complete){
      for(const field of ['mae','rmse','wape','bias','normalized_bias'] as const){near(score[field],saved[0].common[field]);near(score[field],saved[0].scored[field])}
      assert.equal(saved[0].common.n,expected);near(mase,saved[0].common_scaled_error.mase)
    }
    return {stage,lead_months:lead,model_id:model,expected_cases:expected,complete,...score,mase}
  })))
  const selections=TOURNAMENT_LEADS.map(lead=>{
    const development=groups.filter(g=>g.stage==='development'&&g.lead_months===lead&&g.complete)
    const last=development.find(g=>g.model_id==='last_value')!,season=development.find(g=>g.model_id==='seasonal_naive')!
    assert.ok(last&&season)
    const eligible=development.filter(g=>!['last_value','seasonal_naive'].includes(g.model_id)&&g.mase!==null&&g.mase<1
      &&g.mae!==null&&g.mae<last.mae!&&g.mae<season.mae!&&g.normalized_bias!==null&&Math.abs(g.normalized_bias)<=5)
      .sort((a,b)=>a.mae!-b.mae!||(a.model_id<b.model_id?-1:1))
    return {lead_months:lead,model_id:eligible[0]?.model_id??'seasonal_naive',
      status:eligible.length?'RESEARCH_RULE_CHALLENGER_SELECTED':'NO_PROMOTION_RETAIN_BASELINE',publication_approved:false as const}
  })
  assert.deepEqual(run.selections,selections)
  return {schema_version:'tournament_research_review_v1' as const,status:'evaluated_unpublished' as const,
    evidence_label:'Forecast' as const,publication_approved:false as const,activation_allowed:false as const,
    financial_release_approved:false as const,operational_approval:false as const,
    source:{dataset_id:binding.datasetId,fact_table:binding.itemizedTable,fact_version:0,
      policy_version:binding.policy,receipt_sha256:binding.receiptSha256,monthly_sha256:ORIGINAL_RESEARCH_BINDING.monthlySha256,
      artifact_sha256:pin.artifactSha256,registration_sha256:pin.registrationSha256,input_sha256:pin.inputSha256,
      storage_id:pin.storageId,table:pin.table,execution_at:run.executed_at as string},
    scope:{unit:'PHP' as const,contracts_excluded:true as const,buyers:'all' as const,company_coverage:'unknown' as const,
      filter_policy:'fixed_itemized_all_buyers_independent_of_dashboard_filters' as const,training_start:'2020-01',source_end:'2026-09'},
    models,leads:[...TOURNAMENT_LEADS],stages:[...TOURNAMENT_STAGES],selections,groups,points,
    limitations:[...protocol.limitations as string[],
      'Retrospective target sets differ by lead; compare models within the same stage and lead.',
      'Missing Prophet dependencies remain unavailable; incomplete models cannot enter selection.',
      'Prediction minus actual is the error sign; positive bias means overprediction.',
      'PHP sales forecasts do not establish unit demand, regional coverage, procurement quantities or TP consequences.',
      'Existing operational and frozen model selections are unchanged. No future forecast or calibrated interval is supplied.']}
}

export async function readTournamentResearch(execute=executeDatabricksStatement,releaseReader=()=>readDescriptiveRelease(descriptiveBinding())){
  const release=await releaseReader();assert.ok(release.original_itemized)
  const pin=TOURNAMENT_BINDING
  const [saved,monthly]=await Promise.all([
    execute(`SELECT run_id,artifact_hash,payload_json FROM ${pin.table} WHERE run_id=:candidate_id`,
      {rowLimit:2,parameters:[{name:'candidate_id',value:pin.storageId,type:'STRING'}]}),
    readOriginalResearchMonthly(execute),
  ])
  assert.equal(saved.rows.length,1)
  const row=saved.rows[0];assert.equal(row.run_id,pin.storageId);assert.equal(row.artifact_hash,pin.artifactSha256)
  assert.equal(typeof row.payload_json,'string')
  return validateTournamentResearch(row.payload_json!,release,monthly.rows)
}
