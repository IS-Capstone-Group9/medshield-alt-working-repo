import 'dotenv/config'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {readAreaPriorityReview} from '../src/areaPriorityReview'

async function main(){
  const current=await readAreaPriorityReview()
  const previous=JSON.parse(readFileSync('../outputs/so2_area_completion_20261029/actual-response.json','utf8'))
  assert.deepEqual(current,previous,'Current source changed; old captured recommendations must not be treated as current')
  const unauthorized=await fetch('http://localhost:5000/api/sales/confirmed-area-priority')
  assert.equal(unauthorized.status,401)
  const receipt={status:'PASS_CURRENT_AREA_SOURCE_UNCHANGED',checked_at:new Date().toISOString(),
    source:current.regional.source,area_months:current.area_months.length,source_matches_compiled_fixture:true,
    unauthorized_status:unauthorized.status,warehouse_writes:0,model_approvals:0,
    browser_review:'Unavailable: local browser use disabled in Work settings; no visual acceptance claimed.'}
  writeFileSync('../outputs/system_recommendations_20261029/live-source.json',JSON.stringify(receipt,null,2)+'\n')
  console.log(JSON.stringify({status:receipt.status,area_months:receipt.area_months,unauthorized_status:receipt.unauthorized_status}))
}
main().catch(error=>{console.error(error instanceof Error?error.message.slice(0,180):'Source check failed');process.exitCode=1})
