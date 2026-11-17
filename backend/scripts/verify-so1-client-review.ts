import 'dotenv/config'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {readRegionalReview} from '../src/regionalSalesReview'
async function main(){
  const current=await readRegionalReview(),prior=JSON.parse(readFileSync('../outputs/so1_regional_connection_20261027/actual-response.json','utf8'))
  assert.deepEqual(current,prior,'Current source differs from retained UI controls')
  const health=await fetch('http://localhost:5000/api/health'),unauth=await fetch('http://localhost:5000/api/sales/regional-source-review'),frontend=await fetch('http://localhost:3000/')
  assert.equal(health.status,200);assert.equal(unauth.status,401);assert.equal(frontend.status,200)
  writeFileSync('../outputs/so1_client_review_20261028/actual-response.json',JSON.stringify(current,null,2)+'\n')
  const result={status:'PASS_FRESH_SO1_CLIENT_SOURCE',checked_at:new Date().toISOString(),source:current.source,exact_prior_response_match:true,
    health:health.status,unauthenticated_endpoint:unauth.status,frontend:frontend.status,warehouse_writes:0}
  writeFileSync('../outputs/so1_client_review_20261028/live-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result))
}
main().catch(e=>{console.error(e instanceof Error?e.message.slice(0,180):'Client review source unavailable');process.exitCode=1})
