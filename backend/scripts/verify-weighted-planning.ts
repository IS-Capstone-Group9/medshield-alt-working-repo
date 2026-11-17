import 'dotenv/config'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {getDatabricksPlanningShortlist,solveDatabricksPlanningScenario} from '../src/databricksDashboard'
import {solvePlanningScenario} from '../src/planningScenario'
async function main(){
 const out='../outputs/weighted_allocation_20261029';mkdirSync(out,{recursive:true})
 const scope={sector:'All',territory:'all'},shortlist=await getDatabricksPlanningShortlist(scope)
 assert.ok(shortlist.products.length)
 const request={scope,checksum:shortlist.source.checksum,horizon:1,budget:15,minimum_pct:0,acknowledged:true,allocation_method:'weighted',
  revenue_weight:50,growth_weight:50,outbreak_weight:0,
  items:shortlist.products.map((p,i)=>({product:p.product,demand:10,stock:6,reserve:2,pack:4,pack_cost:5,max_packs:3,
   annual_demand:365,order_cost:10,holding_cost:2,lead_days:5,on_order:0,backorders:0,revenue_score:100-i*10,growth_score:i*10,outbreak_score:''}))}
 const result=await solveDatabricksPlanningScenario(request)
 assert.equal(result.status,'scenario_allocation');assert.equal(result.optimization?.proof_status,'optimal')
 assert.equal(result.optimization?.absolute_gap_pp,0);assert.ok(result.spent!<=15)
 assert.ok(result.rows.every(row=>row.priority?.outbreak===null))
 const cases=[{name:'weighted',request,result},
  {name:'balanced',request:{...request,allocation_method:'balanced'},result:solvePlanningScenario({...request,allocation_method:'balanced'},shortlist)},
  {name:'infeasible',request:{...request,budget:0,minimum_pct:100},result:solvePlanningScenario({...request,budget:0,minimum_pct:100},shortlist)}]
 const denied=await fetch('http://localhost:5000/api/sales/planning-solve',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(request)})
 assert.equal(denied.status,401)
 writeFileSync(out+'/scenarios.json',JSON.stringify(cases,null,2)+'\n')
 const report={status:'PASS_LIVE_SHORTLIST_WEIGHTED_SCENARIO',products:shortlist.products.length,source:shortlist.source,
  inputs:'Synthetic QA assumptions and entered normalized scores; zero outbreak weight with blank risk values.',
  gateway_function_executed:true,authenticated_http_solve_executed:false,unauthenticated_http_status:denied.status,
  weighted_proof:result.optimization,warehouse_writes:0,operational_inputs_verified:false,expiry_outcome_measured:false}
 writeFileSync(out+'/live-check.json',JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify({status:report.status,products:report.products,proof:result.optimization?.proof_status,unauthenticated_http_status:denied.status}))
}
main().catch(error=>{console.error(error instanceof Error?error.message.slice(0,180):'Weighted scenario failed');process.exitCode=1})
