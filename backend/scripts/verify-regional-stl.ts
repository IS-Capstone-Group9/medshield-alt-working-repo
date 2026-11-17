import 'dotenv/config'
import assert from 'node:assert/strict'
import {writeFileSync} from 'node:fs'
import {readRegionalStl} from '../src/regionalStlReview'
async function main(){
  const result=await readRegionalStl();assert.equal(result.series[0].components.length,81)
  const health=await fetch('http://localhost:5000/api/health'),unauth=await fetch('http://localhost:5000/api/sales/regional-stl-review'),frontend=await fetch('http://localhost:3000/')
  assert.equal(health.status,200);assert.equal(unauth.status,401);assert.equal(frontend.status,200)
  const receipt={status:'PASS_LIVE_REGIONAL_STL_READER',checked_at:new Date().toISOString(),artifact_sha256:result.artifact_sha256,
    source:result.source,components:81,forecast_approved:false,warehouse_writes:0,health:health.status,unauthenticated_route:unauth.status,frontend:frontend.status,visual_browser_review:'unverified'}
  writeFileSync('../outputs/so1_regional_stl_20261028/live-verification.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt))
}
main().catch(e=>{console.error(e instanceof Error?e.message.slice(0,250):'Regional STL verification failed');process.exitCode=1})
