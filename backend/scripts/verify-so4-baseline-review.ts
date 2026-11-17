import 'dotenv/config'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {getDatabricksPlanningShortlist} from '../src/databricksDashboard'
import {solvePlanningScenario} from '../src/planningScenario'

async function main(){
  const directory='../outputs/so4_baseline_review_20261029';mkdirSync(directory,{recursive:true})
  const source=await getDatabricksPlanningShortlist({sector:'All',territory:'all'})
  assert.ok(source.products.length>0&&source.products.length<=5)
  const scenarios=[]
  for(const name of ['budget_limited','fully_funded','supplier_and_budget','infeasible_minimum','stock_covers']){
    const request={scope:source.scope,checksum:source.source.checksum,acknowledged:true,horizon:3,budget:name==='fully_funded'?1000:name==='infeasible_minimum'?0:25,minimum_pct:name==='infeasible_minimum'?100:0,
      items:source.products.map((row,index)=>({product:row.product!,demand:10+index*5,stock:name==='stock_covers'?100:6,reserve:2,pack:4,pack_cost:5+index,max_packs:name==='supplier_and_budget'&&index===0?0:20}))}
    scenarios.push({name,classification:'synthetic_qa_assumptions_not_operating_inputs',request,result:solvePlanningScenario(request,source)})
  }
  const unauthorized=await fetch('http://localhost:5000/api/sales/planning-shortlist');assert.equal(unauthorized.status,401)
  writeFileSync(directory+'/source.json',JSON.stringify(source,null,2)+'\n')
  writeFileSync(directory+'/scenarios.json',JSON.stringify(scenarios,null,2)+'\n')
  const receipt={status:'PASS_FRESH_SO4_SHORTLIST_AND_SYNTHETIC_BASELINE_CONTROLS',checked_at:new Date().toISOString(),source:source.source,scope:source.scope,
    products:source.products.length,scenario_cases:scenarios.length,unauthorized:unauthorized.status,warehouse_writes:0,models_trained:0,operating_inputs_verified:false,approvals_added:0}
  writeFileSync(directory+'/live-verification.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt))
}
main().catch(error=>{console.error(error instanceof Error?error.message.slice(0,180):'Planning review unavailable');process.exitCode=1})
