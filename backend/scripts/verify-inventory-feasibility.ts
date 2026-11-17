import 'dotenv/config'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {getDatabricksPlanningShortlist,solveDatabricksPlanningScenario} from '../src/databricksDashboard'
import {solvePlanningScenario} from '../src/planningScenario'
async function main(){
 const out='../outputs/inventory_feasibility_20261029';mkdirSync(out,{recursive:true})
 const scope={sector:'All',territory:'all'},shortlist=await getDatabricksPlanningShortlist(scope)
 const request={scope,checksum:shortlist.source.checksum,horizon:1,budget:100,minimum_pct:0,acknowledged:true,allocation_method:'weighted',revenue_weight:50,growth_weight:50,outbreak_weight:0,
  items:shortlist.products.map((p,i)=>({product:p.product,demand:12,stock:6,reserve:2,pack:4,pack_cost:5,max_packs:3,annual_demand:365,order_cost:10,holding_cost:2,lead_days:10,on_order:0,backorders:0,shelf_life_days:[0,4,8,30,''][i],policy_input_reference:i===0?'=Synthetic reference':'Synthetic QA input '+i,revenue_score:100,growth_score:100,outbreak_score:''}))}
 const result=await solveDatabricksPlanningScenario(request)
 assert.equal(result.status,'scenario_allocation');assert.equal(result.rows.length,5)
 assert.deepEqual(result.rows.map(r=>r.expiry_screen.status),['exceeds_gross_capacity','exceeds_gross_capacity','within_gross_capacity_not_verified','within_gross_capacity_not_verified','unavailable'])
 const cases=[{name:'feasibility',request,result},{name:'infeasible',request:{...request,budget:0,minimum_pct:100},result:solvePlanningScenario({...request,budget:0,minimum_pct:100},shortlist)}]
 writeFileSync(out+'/scenarios.json',JSON.stringify(cases,null,2)+'\n')
 const response=await fetch('http://localhost:5000/api/sales/planning-solve',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(request)})
 assert.equal(response.status,401)
 writeFileSync(out+'/live-check.json',JSON.stringify({status:'PASS_LIVE_SHORTLIST_FEASIBILITY_SCREENS',source:shortlist.source,products:5,inputs:'Synthetic QA assumptions; reference does not verify inputs',gateway_function_executed:true,authenticated_http_executed:false,unauthenticated_status:401,warehouse_writes:0,expiry_outcome_measured:false},null,2)+'\n')
 console.log(JSON.stringify({status:'PASS_LIVE_SHORTLIST_FEASIBILITY_SCREENS',products:5,warehouse_writes:0}))
}
main().catch(error=>{console.error(error instanceof Error?error.message.slice(0,180):'Feasibility check failed');process.exitCode=1})
