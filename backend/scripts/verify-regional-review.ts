import 'dotenv/config'
import assert from 'node:assert/strict'
import {writeFileSync} from 'node:fs'
import {readRegionalReview,REGIONAL_BINDING} from '../src/regionalSalesReview'
async function main(){
  const data=await readRegionalReview()
  const health=await fetch('http://localhost:5000/api/health'),unauth=await fetch('http://localhost:5000/api/sales/regional-source-review'),frontend=await fetch('http://localhost:3000/')
  assert.equal(health.status,200);assert.equal(unauth.status,401);assert.equal(frontend.status,200)
  const result={status:'PASS_LIVE_CONFIRMED_REGIONAL_REVIEW',checked_at:new Date().toISOString(),binding:REGIONAL_BINDING,
    coverage:data.coverage,company:data.company,summaries:data.summaries,monthly_groups:data.months.length,
    runtime:{health:health.status,unauthenticated_route:unauth.status,frontend:frontend.status},warehouse_writes:0,financial_release_approved:false,forecast_approved:false,visual_browser_review:'unverified'}
  writeFileSync('../outputs/so1_regional_connection_20261027/live-verification.json',JSON.stringify(result,null,2)+'\n')
  console.log(JSON.stringify(result))
}
main().catch(error=>{console.error(error instanceof Error?error.message.slice(0,250):'Regional live verification failed');process.exitCode=1})
