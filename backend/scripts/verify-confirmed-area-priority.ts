import 'dotenv/config'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {readAreaPriorityReview} from '../src/areaPriorityReview'

async function main(){
  const directory='../outputs/so2_area_completion_20261029';mkdirSync(directory,{recursive:true})
  const data=await readAreaPriorityReview()
  assert.equal(data.area_months.length,1032)
  const unauthorized=await fetch('http://localhost:5000/api/sales/confirmed-area-priority')
  assert.equal(unauthorized.status,401)
  writeFileSync(directory+'/actual-response.json',JSON.stringify(data,null,2)+'\n')
  const result={status:'PASS_FRESH_CONFIRMED_AREA_SOURCE',checked_at:new Date().toISOString(),source:data.regional.source,area_months:data.area_months.length,unauthorized:unauthorized.status,warehouse_writes:0,models_trained:0,approvals_added:0}
  writeFileSync(directory+'/live-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result))
}
main().catch(error=>{console.error(error instanceof Error?error.message.slice(0,180):'Area source unavailable');process.exitCode=1})
