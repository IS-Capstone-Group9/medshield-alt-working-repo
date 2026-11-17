import 'dotenv/config'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {getDatabricksPlanningShortlist} from '../src/databricksDashboard'
import {reviewDatabricksDatedPlan} from '../src/datedPlanGateway'
async function main(){
 const out='../outputs/backend_dated_plan_20261029';mkdirSync(out,{recursive:true})
 const shortlist=await getDatabricksPlanningShortlist({sector:'All',territory:'all'})
 const snapshot={schema_version:1,classification:'entered_unverified_operating_snapshot',as_of:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),input_reference:'Synthetic server QA',checksum:shortlist.source.checksum,scope:shortlist.scope,purchase_budget:30,
  products:shortlist.products.map(p=>({product:p.product,unit_label:'entered QA units',stock_total:0,protected_reserve:0,batches:[],receipts:[],horizon_end:'',demand_calendar:[] as Array<{date:string;units:number}>,proposed_receipts:[] as Array<{receipt_id:string;units:number;expected_on:string;expires_on:string}>,purchase_constraints:{units_per_pack:2,pack_cost:1,supplier_max_packs:3,maximum_projected_expired_units:0,minimum_fulfillment_pct:100}}))}
 for(const p of snapshot.products){p.horizon_end=snapshot.as_of;p.demand_calendar=[{date:snapshot.as_of,units:6}];p.proposed_receipts=[{receipt_id:'Synthetic proposal',units:6,expected_on:snapshot.as_of,expires_on:new Date(Date.parse(snapshot.as_of)+86400000).toISOString().slice(0,10)}]}
 const request={acknowledged:true,snapshot},result=await reviewDatabricksDatedPlan(request)
 assert.equal(result.status,'DATED_FIXED_PLAN_FEASIBLE');assert.ok('spend_php' in result,'Fixed-plan response must include spend');assert.equal(result.spend_php,'15.00');assert.ok(result.rows.every(r=>r.candidate.fulfilled_units===6))
 const overBudget={acknowledged:true,snapshot:{...snapshot,purchase_budget:14}},infeasible=await reviewDatabricksDatedPlan(overBudget)
 assert.equal(infeasible.status,'DATED_FIXED_PLAN_INFEASIBLE');assert.ok(infeasible.conflicts.some(conflict=>conflict==='Shared dated purchase budget exceeded'))
 const denied=await fetch('http://localhost:5000/api/sales/planning-dated-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)});assert.equal(denied.status,401)
 writeFileSync(out+'/live-check.json',JSON.stringify({status:'PASS_LIVE_SHORTLIST_DATED_FIXED_PLAN',source:shortlist.source,products:shortlist.products.length,inputs:'Synthetic dated quantities and limits; not verified stock/demand',gateway_function_executed:true,authenticated_http_executed:false,unauthenticated_status:401,warehouse_writes:0,objective_optimized:false,procurement_execution_approved:false},null,2)+'\n')
 writeFileSync(out+'/live-scenarios.json',JSON.stringify([{request,result},{request:overBudget,result:infeasible}],null,2)+'\n')
 console.log(JSON.stringify({status:'PASS_LIVE_SHORTLIST_DATED_FIXED_PLAN',products:shortlist.products.length,unauthenticated_status:401}))
}
main().catch(error=>{console.error(error instanceof Error?error.message.slice(0,180):'Dated plan check failed');process.exitCode=1})
