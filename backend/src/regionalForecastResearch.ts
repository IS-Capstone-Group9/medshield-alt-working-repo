import assert from 'node:assert/strict'
import {executeDatabricksStatement} from './databricks'
import {readRegionalReview} from './regionalSalesReview'
import {originalResearchDigest as hash,ORIGINAL_RESEARCH_BINDING} from './originalResearch'
import {forecastMetrics,monthIndex} from './forecastEvidence'
import {TOURNAMENT_STAGES,TOURNAMENT_LEADS} from './tournamentResearch'
type Json=Record<string,any>
export const REGIONAL_FORECAST_BINDING={table:ORIGINAL_RESEARCH_BINDING.table,
 artifactSha256:'dbb21eef89a5a90ba68460650b4490fb5c2cd5694ff95351734abaab13e92ce1',
 registrationSha256:'f1d38b475de2190519bc104b6ce80c575d3310594816b1ed01b7f8d9363da7ae',
 storageId:'regional_php_dbb21eef89a5a90ba68460650b4490fb5c2cd5694ff95351734abaab13e92ce1'} as const
// These calendars and recipe names are the registered comparison, not runtime fitting options.
const consecutive=(start:string,count:number)=>Array.from({length:count},(_,i)=>{
 const m=monthIndex(start)+i;return `${Math.floor(m/12)}-${String(m%12+1).padStart(2,'0')}`
})
const protocol:Json={training_start:'2020-01',development_origins:consecutive('2022-12',19),
 retrospective_audit_origins:consecutive('2024-12',7),inspected_extension_origins:consecutive('2025-12',4)}
const models:string[]=[
 "last_value",
 "seasonal_naive",
 "mean_3",
 "mean_6",
 "ets_none",
 "ets_damped",
 "prophet_cp0.01_sp0.1",
 "prophet_cp0.01_sp1.0",
 "prophet_cp0.01_sp10.0",
 "prophet_cp0.05_sp0.1",
 "prophet_cp0.05_sp1.0",
 "prophet_cp0.05_sp10.0",
 "prophet_cp0.1_sp0.1",
 "prophet_cp0.1_sp1.0",
 "prophet_cp0.1_sp10.0",
 "sarima_ar_seasonal",
 "sarima_airline",
 "ridge_direct_a1",
 "ridge_direct_a10",
 "ridge_recursive_a1",
 "ridge_recursive_a10",
 "hist_gbdt_direct"
]
const near=(a:number|null,b:unknown)=>{if(a===null)assert.equal(b,null);else assert.ok(typeof b==='number'&&Number.isFinite(b)&&Math.abs(a-b)<=Math.max(1e-7,Math.abs(a)*1e-10),'Stored regional score differs')}
type Financial=Awaited<ReturnType<typeof readRegionalReview>>
/** Reconciliation is separately testable; production always enforces the immutable byte pin. */
export function reconcileRegionalForecastResearch(artifact:Json,financial:Financial){
 assert.equal(financial.status,'user_confirmed_regional_financial_review')
 assert.equal(financial.scope.unit,'PHP');assert.equal(financial.scope.contracts_excluded,true)
 assert.equal(financial.scope.financial_publication_approved,false);assert.equal(financial.scope.forecast_approved,false)
 assert.deepEqual(artifact.source,financial.source)
 assert.equal(artifact.status,'RETROSPECTIVE_TERRITORIAL_PHP_RESEARCH_UNPUBLISHED')
 assert.equal(artifact.registration_sha256,REGIONAL_FORECAST_BINDING.registrationSha256)
 assert.equal(artifact.unit,'PHP');assert.equal(artifact.evidence_label,'Forecast')
 for(const key of ['publication_approved','operational_approval'])assert.equal(artifact[key],false)
 for(const key of ['warehouse_writes','model_pointer_changes','future_forecasts_generated'])assert.equal(artifact[key],0)
 const calendar=Array.from({length:81},(_,i)=>{const m=monthIndex('2020-01')+i;return `${Math.floor(m/12)}-${String(m%12+1).padStart(2,'0')}`})
 const eligibility=['CALABARZON','MIMAROPA','BICOL'].map(region=>{
  const rows=financial.months.filter(r=>r.region===region&&r.period>='2020-01'&&r.period<='2026-09')
  assert.equal(new Set(rows.map(r=>r.period)).size,rows.length)
  const eligible=rows.filter(r=>r.net_eligible_records>0&&r.net_sales_php!==null)
  const missing=calendar.filter(m=>!eligible.some(r=>r.period===m))
  return {region,status:missing.length?'unavailable_incomplete_registered_history':'eligible_financial_research',expected_months:81,
   observed_eligible_months:eligible.length,missing_months:missing,observed_last_month:eligible.map(r=>r.period).sort().at(-1)??null,
   unreviewed_records_in_window:rows.reduce((s,r)=>s+r.unreviewed_records,0),unit:'PHP',territorial_unit_forecast_eligible:false}
 })
 assert.deepEqual(artifact.eligibility,eligibility)
 assert.equal(artifact.regions.length,1);const run=artifact.regions[0]
 assert.equal(run.region,'CALABARZON');assert.equal(eligibility[0].observed_eligible_months,81)
 assert.equal(run.model_publication_approved,false);assert.equal(run.operational_approval,false);assert.equal(run.future_forecasts_generated,0)
 const sourceRows=financial.months.filter(r=>r.region==='CALABARZON'&&r.period>='2020-01'&&r.period<='2026-09')
 const observed=new Map(sourceRows.map(r=>[monthIndex(r.period),Number(r.net_sales_php)]))
  assert.equal(run.predictions.length,1980)
  const points=run.predictions as Array<{model_id:string;series_id:string;target_name:string;stage:string;origin_period:string;
    target_period:string;lead_months:number;actual:number;prediction:number|null;missing_reason:string|null;mase_scale:number;mase_scale_lag_months:number;region:string;unit:string;target_source_records:number;target_unreviewed_source_records:number;training_window_unreviewed_records_in_current_snapshot:number}>
  const seen=new Set<string>()
  for(const p of points){
    assert.ok(models.includes(p.model_id)&&TOURNAMENT_STAGES.includes(p.stage as typeof TOURNAMENT_STAGES[number]))
    assert.equal(p.series_id,'confirmed_delivery_CALABARZON_itemized_PHP');assert.equal(p.target_name,'net_sales')
    assert.ok(TOURNAMENT_LEADS.includes(p.lead_months as 1|3|6))
    assert.equal(p.region,'CALABARZON');assert.equal(p.unit,'PHP')
    const targetRow=sourceRows.find(r=>r.period===p.target_period)!
    assert.equal(p.target_source_records,targetRow.records)
    assert.equal(p.target_unreviewed_source_records,targetRow.unreviewed_records)
    assert.equal(p.training_window_unreviewed_records_in_current_snapshot,sourceRows.filter(r=>r.period>='2020-01'&&r.period<=p.origin_period).reduce((s,r)=>s+r.unreviewed_records,0))
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
  assert.deepEqual(run.selections,selections.map(s=>({region:'CALABARZON',...s})))

 return {schema_version:'regional_php_research_review_v1' as const,status:'evaluated_unpublished' as const,evidence_label:'Forecast' as const,
  publication_approved:false as const,activation_allowed:false as const,financial_release_approved:false as const,operational_approval:false as const,
  source:{...financial.source,artifact_sha256:REGIONAL_FORECAST_BINDING.artifactSha256,registration_sha256:REGIONAL_FORECAST_BINDING.registrationSha256,
   storage_id:REGIONAL_FORECAST_BINDING.storageId,table:REGIONAL_FORECAST_BINDING.table,execution_at:artifact.finished_at as string},
  scope:{unit:'PHP',contracts_excluded:true,buyers:'all',company_coverage:'unknown',filter_policy:'fixed_confirmed_delivery_regions_independent_of_analysis_filters',training_start:'2020-01',source_end:'2026-09'},
  models,leads:[...TOURNAMENT_LEADS],stages:[...TOURNAMENT_STAGES],
  regions:eligibility.map(e=>({...e,points:e.region==='CALABARZON'?points:[],groups:e.region==='CALABARZON'?groups:[],selections:e.region==='CALABARZON'?selections:[]})),
  limitations:[...artifact.limitations as string[],
   'Retrospective PHP research only. No territorial unit forecast, future issuance or operational activation.',
   '842 source records in the registered CALABARZON window remain unreviewed; targets use net-eligible records only.',
   'Current revised Gold is checked; historical publication vintages are unavailable. Compare models within a lead and window.',
   'Audit and inspected extension do not select a model. Four extension origins do not establish operational superiority.']}
}
export function validateRegionalForecastResearch(raw:string,financial:Financial){
 assert.ok(Buffer.byteLength(raw)<=3_000_000);assert.equal(hash(raw),REGIONAL_FORECAST_BINDING.artifactSha256)
 return reconcileRegionalForecastResearch(JSON.parse(raw),financial)
}
export async function readRegionalForecastResearch(execute=executeDatabricksStatement,sourceReader=()=>readRegionalReview()){
 const financial=await sourceReader(),pin=REGIONAL_FORECAST_BINDING
 const saved=await execute(`SELECT run_id,artifact_hash,payload_json FROM ${pin.table} WHERE run_id=:candidate_id`,{rowLimit:2,parameters:[{name:'candidate_id',value:pin.storageId,type:'STRING'}]})
 assert.equal(saved.rows.length,1);const row=saved.rows[0]
 assert.equal(row.run_id,pin.storageId);assert.equal(row.artifact_hash,pin.artifactSha256);assert.equal(typeof row.payload_json,'string')
 return validateRegionalForecastResearch(row.payload_json!,financial)
}
