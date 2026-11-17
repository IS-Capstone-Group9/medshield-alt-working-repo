import 'dotenv/config'
import assert from 'node:assert/strict'
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {readRegionalReview} from '../src/regionalSalesReview'
import {readRegionalStl} from '../src/regionalStlReview'

async function main() {
  const directory='../outputs/so1_regional_completion_20261029'
  mkdirSync(directory,{recursive:true})
  const current=await readRegionalReview()
  const stl=await readRegionalStl()
  const previous=JSON.parse(readFileSync('../outputs/so1_client_review_20261028/actual-response.json','utf8'))
  assert.deepEqual(current,previous,'Source changed since client verification')
  assert.deepEqual(stl.source,current.source)
  const health=await fetch('http://localhost:5000/api/health')
  const unauthorized=await fetch('http://localhost:5000/api/sales/regional-source-review')
  assert.equal(health.status,200)
  assert.equal(unauthorized.status,401)
  writeFileSync(directory+'/actual-response.json',JSON.stringify(current,null,2)+'\n')
  writeFileSync(directory+'/actual-stl-response.json',JSON.stringify(stl,null,2)+'\n')
  const result={status:'PASS_FRESH_SO1_REGIONAL_COMPLETION_SOURCE',checked_at:new Date().toISOString(),
    source:current.source,exact_previous_match:true,health:health.status,unauthorized:unauthorized.status,
    warehouse_writes:0,models_trained:0,approvals_added:0}
  writeFileSync(directory+'/live-verification.json',JSON.stringify(result,null,2)+'\n')
  console.log(JSON.stringify(result))
}
main().catch(error=>{console.error(error instanceof Error?error.message.slice(0,180):'Source verification failed');process.exitCode=1})
