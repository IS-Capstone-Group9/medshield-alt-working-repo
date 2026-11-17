import 'dotenv/config'
import assert from 'node:assert/strict'
import {writeFileSync} from 'node:fs'
import {readUnitResearch,UNIT_RESEARCH_BINDING} from '../src/unitBaselineResearch'

async function main(){
  const data=await readUnitResearch()
  assert.equal(data.points.length,40);assert.equal(data.scope.recorded_channel,'HOSPITAL')
  assert.equal(data.operational_forecasting_approved,false)
  const health=await fetch('http://localhost:5000/api/health'),unauth=await fetch('http://localhost:5000/api/sales/unit-baseline-research'),frontend=await fetch('http://localhost:3000/')
  assert.equal(health.status,200);assert.equal(unauth.status,401);assert.equal(frontend.status,200)
  const result={status:'PASS_LIVE_UNIT_RESEARCH_READER',checked_at:new Date().toISOString(),candidate:UNIT_RESEARCH_BINDING,
    points:data.points.length,metric_groups:data.metrics.length,channel:data.scope.recorded_channel,unit:data.scope.unit,
    research_display_authorized:true,operational_forecasting_approved:false,
    runtime:{health:health.status,unauthenticated_route:unauth.status,frontend:frontend.status},
    warehouse_writes:0,visual_browser_review:'unverified'}
  writeFileSync('../outputs/bupiright_research_connection_20261027/live-verification.json',JSON.stringify(result,null,2)+'\n')
  console.log(JSON.stringify(result))
}
main().catch(error=>{console.error(error instanceof Error?error.message.slice(0,250):'Unit research verification failed');process.exitCode=1})
