import assert from 'node:assert/strict'
import {executeDatabricksStatement} from './databricks'
import {readRegionalReview,regionalHash} from './regionalSalesReview'
import {monthIndex,monthLabel} from './forecastEvidence'
export const REGIONAL_STL_BINDING={table:'workspace.medshield_original_gold_20261026.regional_stl_b681c59b6fa1365d_candidate',
  artifactSha256:'b681c59b6fa1365d82c5a5b04d740ff43b6c3bdba661d6877b158f5b5d0e712f'} as const
type Json=Record<string,any>
export function regionalStrengthSummary(series:Json[]){
  const variance=(values:number[])=>{const mean=values.reduce((a,b)=>a+b,0)/values.length;return values.reduce((sum,value)=>sum+(value-mean)**2,0)/values.length}
  return series.flatMap(s=>s.fitted_segments.map((segment:Json)=>{
    const points=s.components.filter((p:Json)=>p.segment_start===segment.start&&p.segment_end===segment.end)
    assert.equal(points.length,segment.months);assert.ok(points.length>0)
    const residual=variance(points.map((p:Json)=>p.residual_php))
    const strength=(field:string)=>{const denominator=variance(points.map((p:Json)=>p[field]+p.residual_php));return denominator===0?null:Math.max(0,1-residual/denominator)}
    return {region:s.region,start:segment.start,end:segment.end,months:points.length,
      trend_strength:strength('trend_php'),seasonal_strength:strength('seasonal_php'),
      evidence_label:'Derived',method_version:'stl_strength_v1',assumption_ids:['D4'],
      interpretation:'full_segment_retrospective_not_origin_safe_forecast_feature'}
  }))
}
export function validateRegionalStl(raw:string,current:Awaited<ReturnType<typeof readRegionalReview>>):Json{
  assert.ok(Buffer.byteLength(raw)<300_000);assert.equal(regionalHash(raw),REGIONAL_STL_BINDING.artifactSha256)
  const data:Json=JSON.parse(raw)
  assert.equal(current.status,'user_confirmed_regional_financial_review');assert.equal(current.scope.contracts_excluded,true)
  for(const key of ['financial_publication_approved','forecast_approved','external_join_approved'] as const)assert.equal(current.scope[key],false)
  assert.equal(data.schema_version,'confirmed_regional_stl_v1');assert.equal(data.status,'RETROSPECTIVE_REGIONAL_STL_CANDIDATE')
  assert.deepEqual(data.source,current.source)
  assert.deepEqual(data.protocol,{period:12,seasonal_window:13,robust:true,minimum_contiguous_months:36,
    missing_policy:'no_imputation_split_at_gaps',interpretation:'full_segment_retrospective_not_origin_safe_forecast_feature'})
  for(const key of ['financial_publication_approved','forecast_approved','external_join_approved','future_forecasts_generated'])assert.equal(data[key],false)
  assert.equal(data.forecast_models_trained,0);assert.equal(data.diagnostic_fits,1)
  assert.deepEqual(data.series.map((s:Json)=>s.region),['CALABARZON','MIMAROPA','BICOL'])
  for(const s of data.series){
    const expected=new Map(current.months.filter(r=>r.region===s.region).map(r=>[r.period,r]))
    const first=monthIndex(current.source.calendar_start),last=monthIndex(current.source.calendar_end)
    assert.equal(s.calendar.length,last-first+1)
    const runs:Json[][]=[]
    for(let i=0;i<s.calendar.length;i++){
      const r=s.calendar[i],period=monthLabel(first+i),source=expected.get(period)
      assert.equal(r.period,period);assert.equal(r.observed_net_sales_php,source?.net_sales_php??null)
      assert.equal(r.records,source?.records??0);assert.equal(r.unreviewed_records,source?.unreviewed_records??0)
      assert.equal(r.status,source?.net_sales_php!==null&&source?.net_sales_php!==undefined?'recorded':source?'no_eligible_net_sales':'no_regional_source_records')
      if(r.observed_net_sales_php!==null){if(!runs.length||monthIndex(runs.at(-1)!.at(-1)!.period)!==first+i-1)runs.push([]);runs.at(-1)!.push(r)}
    }
    assert.equal(s.maximum_contiguous_observed_months,Math.max(0,...runs.map(r=>r.length)))
    const fitted=runs.filter(r=>r.length>=36),excluded=runs.filter(r=>r.length<36)
    assert.deepEqual(s.fitted_segments.map((r:Json)=>[r.start,r.end,r.months]),fitted.map(r=>[r[0].period,r.at(-1)!.period,r.length]))
    assert.deepEqual(s.excluded_segments.map((r:Json)=>[r.start,r.end,r.months]),excluded.map(r=>[r[0].period,r.at(-1)!.period,r.length]))
    const expectedPoints=fitted.flat();assert.equal(s.components.length,expectedPoints.length)
    for(let i=0;i<s.components.length;i++){
      const p=s.components[i],source=expectedPoints[i]
      assert.equal(p.period,source.period);assert.equal(p.observed_net_sales_php,source.observed_net_sales_php)
      assert.ok([p.trend_php,p.seasonal_php,p.residual_php].every(n=>typeof n==='number'&&Number.isFinite(n)))
      assert.ok(Math.abs(Number(p.observed_net_sales_php)-p.trend_php-p.seasonal_php-p.residual_php)<1e-6)
      assert.ok(fitted.some(r=>p.segment_start===r[0].period&&p.segment_end===r.at(-1)!.period&&p.period>=p.segment_start&&p.period<=p.segment_end))
    }
    if(s.matched_change){
      const b=s.matched_change;assert.equal(s.region,'CALABARZON');assert.equal(b.base_year,2025);assert.equal(b.target_year,2026)
      assert.deepEqual(b.matched_months,['01','02','03','04','05','06','07','08','09'])
      const points=new Map<string,Json>(s.components.map((p:Json)=>[p.period,p]))
      for(const field of ['trend_php','seasonal_php','residual_php']){
        const delta=b.matched_months.reduce((sum:number,m:string)=>sum+points.get('2026-'+m)![field]-points.get('2025-'+m)![field],0)
        assert.ok(Math.abs(delta-b.component_changes_php[field])<1e-6)
      }
      for(const [year,key] of [[2025,'base_net_sales_php'],[2026,'target_net_sales_php']] as const){
        const value=b.matched_months.reduce((sum:number,m:string)=>sum+Number(points.get(year+'-'+m)!.observed_net_sales_php),0)
        assert.ok(Math.abs(value-Number(b[key]))<1e-6)
      }
      assert.ok(Math.abs(Number(b.target_net_sales_php)-Number(b.base_net_sales_php)-Number(b.recorded_change_php))<1e-6)
      assert.ok(Math.abs(Object.values<number>(b.component_changes_php).reduce((a,b)=>a+b,0)-Number(b.recorded_change_php))<1e-6)
    }else assert.equal(s.components.length,0)
  }
  const strengths=regionalStrengthSummary(data.series).map(row=>({...row,dataset_id:data.source.dataset_id,policy_version:data.source.policy_version}))
  return {...data,strength_summary:strengths,status:'regional_stl_review',artifact_sha256:REGIONAL_STL_BINDING.artifactSha256,candidate_table:REGIONAL_STL_BINDING.table,candidate_version:0}
}
export async function readRegionalStl(execute=executeDatabricksStatement,sourceReader=()=>readRegionalReview()){
  const current=await sourceReader()
  const [saved,history]=await Promise.all([
    execute(`SELECT artifact_sha256,payload_json FROM ${REGIONAL_STL_BINDING.table}`,{rowLimit:2}),
    execute(`DESCRIBE HISTORY ${REGIONAL_STL_BINDING.table} LIMIT 1`,{rowLimit:1})])
  assert.equal(history.rows[0]?.version,'0');assert.equal(saved.rows.length,1)
  assert.equal(saved.rows[0].artifact_sha256,REGIONAL_STL_BINDING.artifactSha256);assert.equal(typeof saved.rows[0].payload_json,'string')
  return validateRegionalStl(saved.rows[0].payload_json!,current)
}
