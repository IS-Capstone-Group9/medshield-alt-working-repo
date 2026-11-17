import 'dotenv/config'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {readUnitResearch} from '../src/unitBaselineResearch'

async function main(){
  const directory=process.env.SO3_RESEARCH_REVIEW_DIRECTORY||'../outputs/so3_research_review_20261029';mkdirSync(directory,{recursive:true})
  const data=await readUnitResearch()
  assert.equal(data.scope.recorded_channel,'HOSPITAL');assert.equal(data.scope.unit,'ampoules')
  assert.equal(data.operational_forecasting_approved,false);assert.equal(data.points.length,40)
  const unauthorized=await fetch('http://localhost:5000/api/sales/unit-baseline-research')
  assert.equal(unauthorized.status,401)
  writeFileSync(directory+'/actual-response.json',JSON.stringify(data,null,2)+'\n')
  const result={status:'PASS_FRESH_SO3_RESEARCH_REVIEW_SOURCE',checked_at:new Date().toISOString(),source:data.source,
    points:data.points.length,metric_groups:data.metrics.length,unauthorized:unauthorized.status,warehouse_writes:0,forecasts_trained:0,approvals_added:0}
  writeFileSync(directory+'/live-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result))
}
main().catch(error=>{console.error(error instanceof Error?error.message.slice(0,180):'Research source unavailable');process.exitCode=1})
