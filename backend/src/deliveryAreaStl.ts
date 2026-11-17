import assert from 'node:assert/strict'
import {executeDatabricksStatement} from './databricks'
import {readRegionalReview,regionalHash,microsText} from './regionalSalesReview'
import {decimalMicros} from './itemizedPreview'
import {monthIndex,monthLabel} from './forecastEvidence'
import {regionalStrengthSummary} from './regionalStlReview'
export const AREA_STL_BINDING={table:'workspace.medshield_original_gold_20261026.area_stl_b048eddb4de40a23_candidate',artifactSha256:'b048eddb4de40a23596b8b1392f33dc86ca8b89ce9171b5c7b72fdc04f1dba1f'} as const
export function validateAreaStl(raw:string,current:Awaited<ReturnType<typeof readRegionalReview>>){
  assert.ok(Buffer.byteLength(raw)<500_000);assert.equal(regionalHash(raw),AREA_STL_BINDING.artifactSha256)
  const data=JSON.parse(raw)
  assert.equal(data.schema_version,'delivery_area_stl_v1');assert.deepEqual(data.source,current.source)
  assert.deepEqual(data.protocol,{period:12,seasonal_window:13,robust:true,minimum_contiguous_months:36,missing_policy:'no_imputation_split_at_gaps',interpretation:'full_segment_retrospective_not_origin_safe_forecast_feature'})
  for(const key of ['forecast_approved','financial_publication_approved','external_join_approved','future_forecasts_generated'])assert.equal(data[key],false)
  assert.deepEqual(data.series.map((s:any)=>s.area),['QUEZON','BATANGAS','CAVITE','LOWER CAVITE','LAGUNA','MARINDUQUE','ALBAY','CAM NORTE','CAM SUR','CAVITE PROVINCE'])
  let fits=0
  for(const s of data.series){
    const members=s.area==='CAVITE PROVINCE'?['CAVITE','LOWER CAVITE']:[s.area];assert.deepEqual(s.members,members)
    const observed=new Map<string,bigint>()
    for(const r of current.area_months)if(members.includes(r.area)&&r.net_sales_php!==null)observed.set(r.period,(observed.get(r.period)??0n)+decimalMicros(r.net_sales_php))
    const start=monthIndex(current.source.calendar_start),end=monthIndex(current.source.calendar_end),runs:string[][]=[]
    assert.equal(s.calendar.length,end-start+1)
    for(let i=start;i<=end;i++){
      const period=monthLabel(i),value=observed.get(period),row=s.calendar[i-start];assert.equal(row.period,period)
      assert.equal(row.net_sales_php,value===undefined?null:microsText(value))
      if(value!==undefined){if(!runs.length||monthIndex(runs.at(-1)!.at(-1)!)!==i-1)runs.push([]);runs.at(-1)!.push(period)}
    }
    assert.equal(s.observed_months,observed.size);assert.equal(s.first,[...observed.keys()].sort()[0]);assert.equal(s.latest,[...observed.keys()].sort().at(-1))
    assert.equal(s.maximum_contiguous_months,Math.max(0,...runs.map(r=>r.length)))
    const fitted=runs.filter(r=>r.length>=36),excluded=runs.filter(r=>r.length<36);fits+=fitted.length
    const meta=(r:string[])=>({start:r[0],end:r.at(-1),months:r.length})
    assert.deepEqual(s.fitted_segments.map(({start,end,months}:any)=>({start,end,months})),fitted.map(meta));assert.deepEqual(s.excluded_segments,excluded.map(meta))
    const periods=fitted.flat();assert.equal(s.components.length,periods.length)
    for(let i=0;i<periods.length;i++){
      const p=s.components[i];assert.equal(p.period,periods[i]);assert.equal(decimalMicros(p.observed_net_sales_php),observed.get(p.period))
      assert.ok(['trend_php','seasonal_php','residual_php'].every(k=>Number.isFinite(p[k])))
      assert.ok(Math.abs(Number(p.observed_net_sales_php)-p.trend_php-p.seasonal_php-p.residual_php)<1e-6)
      assert.ok(fitted.some(r=>p.segment_start===r[0]&&p.segment_end===r.at(-1)&&r.includes(p.period)))
    }
    const strengths=regionalStrengthSummary([{...s,region:s.area}])
    for(let i=0;i<strengths.length;i++)for(const key of ['trend_strength','seasonal_strength'] as const){const expected=strengths[i][key],actual=s.fitted_segments[i][key];assert.ok(expected===null?actual===null:Math.abs(expected-actual)<1e-12)}
  }
  assert.equal(fits,3);assert.equal(data.diagnostic_fits,fits)
  return {...data,status:'delivery_area_stl_review',artifact_sha256:AREA_STL_BINDING.artifactSha256,candidate_table:AREA_STL_BINDING.table,candidate_version:0}
}
export async function readAreaStl(execute=executeDatabricksStatement,sourceReader=readRegionalReview){
  const current=await sourceReader()
  const [saved,history]=await Promise.all([execute(`SELECT artifact_sha256,payload_json FROM ${AREA_STL_BINDING.table}`,{rowLimit:2}),execute(`DESCRIBE HISTORY ${AREA_STL_BINDING.table} LIMIT 1`,{rowLimit:1})])
  assert.equal(history.rows[0]?.version,'0');assert.equal(saved.rows.length,1);assert.equal(saved.rows[0].artifact_sha256,AREA_STL_BINDING.artifactSha256)
  return validateAreaStl(saved.rows[0].payload_json!,current)
}
