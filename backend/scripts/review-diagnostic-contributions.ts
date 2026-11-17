import 'dotenv/config'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {getDatabricksSalesDiagnostics} from '../src/databricksDashboard'

async function main() {
  const directory='../outputs/diagnostic_follow_up_20261030'
  mkdirSync(directory,{recursive:true})
  const selections=[['rolling_year','2025-10-01','2026-09-30'],['july','2026-07-01','2026-07-31'],['april','2026-04-01','2026-04-30'],['august','2026-08-01','2026-08-31']]
  const summaries=[]
  for(const [id,startDate,endDate] of selections) {
    const result=await getDatabricksSalesDiagnostics({startDate,endDate})
    assert.equal(result.causal_status,'unverified')
    assert.equal(result.totals.comparison_status,'matched')
    assert.equal(result.coverage.unmatched_months.length,0)
    for(const rows of Object.values(result.contributions)) {
      if(!rows.length)continue
      const sum=rows.reduce((n,row)=>n+Math.round((row.delta??0)*100),0)
      assert.equal(sum,Math.round((result.totals.delta??0)*100))
    }
    if(id==='rolling_year')assert.equal(result.totals.delta,93705705.25)
    writeFileSync(directory+'/'+id+'.json',JSON.stringify(result,null,2)+'\n')
    summaries.push({id,scope:result.scope,source:result.source,totals:result.totals,coverage:result.coverage,
      leading_products:result.contributions.product.slice(0,5),sectors:result.contributions.sector,
      leading_recorded_area_labels:result.contributions.area.slice(0,5)})
  }
  writeFileSync(directory+'/review.json',JSON.stringify({status:'PASS_RECONCILED_DIAGNOSTIC_FOLLOW_UP',checked_at:new Date().toISOString(),summaries,
    warehouse_writes:0,source_files_modified:false,approvals_added:0,causal_status:'unverified'},null,2)+'\n')
  console.log('PASS_RECONCILED_DIAGNOSTIC_FOLLOW_UP: four live Gold scopes; signed partitions conserve change; no writes or approvals')
}
main().catch(error=>{console.error(error instanceof Error?error.message.slice(0,180):'Diagnostic review unavailable');process.exitCode=1})
