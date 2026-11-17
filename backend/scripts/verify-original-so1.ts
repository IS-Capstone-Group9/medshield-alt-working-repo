import 'dotenv/config'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {readSo1Diagnostics,so1View} from '../src/so1Diagnostics'
import {ORIGINAL_SO1_SHA256 as hash} from '../src/originalSo1Binding'
async function main(){
  const output='../outputs/original_so1_20261027'
  const payload=JSON.parse(readFileSync(output+'/payload.json','utf8'))
  const views:Record<string,unknown>={}
  for(const [area,year] of [['COMPANY','all'],['COMPANY','2026'],['QUEZON','2026'],['ALBAY','all'],['GOVERNMENT','2026'],['HOSPITAL','2026']]){
    const data=await readSo1Diagnostics({area,year})
    const expected=so1View(payload,hash,{area,year})
    const {source,...returned}=data
    const view:Record<string,unknown>=structuredClone(returned)
    delete view.financial_summary;delete view.financial_yoy
    view.months=data.months.map(row=>({period:row.period,revenue:row.revenue,records:row.records,
      eligible_records:row.eligible_records,adjusted_records:row.adjusted_records}))
    assert.deepEqual(view,expected)
    assert.equal(source.rows,1032);assert.equal(data.scope.contracts_excluded,true)
    if(area!=='COMPANY')assert.equal(data.mapping?.is_geographic_territory_approved,'false')
    views[area+'|'+year]=data
  }
  writeFileSync(output+'/actual-views.json',JSON.stringify(views,null,2)+'\n')
  // Full fixture matrix is derived only for isolated UI contract checks; never runtime data.
  const controls=Object.fromEntries(payload.series.flatMap((s:any)=>['all',...Array.from({length:10},(_,i)=>String(2017+i))].map(year=>[
    s.area+'|'+year,{...so1View(payload,hash,{area:s.area,year}),source:(views['COMPANY|all'] as any).source},
  ])))
  writeFileSync(output+'/test-views.json',JSON.stringify(controls)+'\n')
  const report={status:'PASS_ACTUAL_ORIGINAL_SO1_SOURCE_AND_CANDIDATE',checked_at:new Date().toISOString(),package_sha256:hash,
    actual_views:Object.keys(views),monthly_controls:1032,series:23,contracts_excluded:true,
    source_matched:true,geography_approved:false,financial_release_approved:false,model_publication_approved:false,
    warehouse_writes:0,limits:['Actual API module/Databricks reads; signed-in visual acceptance remains separate.']}
  writeFileSync(output+'/live-verification.json',JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report))
}
main().catch(error=>{console.error(error instanceof Error?error.message.slice(0,500):'Original SO1 verification failed');process.exitCode=1})
