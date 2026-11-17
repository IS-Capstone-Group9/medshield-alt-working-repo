import 'dotenv/config'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {getDatabricksPlanningShortlist} from '../src/databricksDashboard'
import {reviewDatabricksDatedPlan} from '../src/datedPlanGateway'
async function main(){
 const out='../outputs/dated_purchase_selection_20261029';mkdirSync(out,{recursive:true})
 const shortlist=await getDatabricksPlanningShortlist({sector:'All',territory:'all'}),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
 const snapshot={schema_version:1,classification:'entered_unverified_operating_snapshot',checksum:shortlist.source.checksum,scope:shortlist.scope,as_of:today,input_reference:'Synthetic selection QA',purchase_budget:10,
  products:shortlist.products.map((p,i)=>({product:p.product,unit_label:'entered units',stock_total:0,protected_reserve:0,batches:[],receipts:[],horizon_end:today,demand_calendar:[{date:today,units:6}],proposed_receipts:[{receipt_id:'slot',units:2,expected_on:today,expires_on:new Date(Date.parse(today)+86400000).toISOString().slice(0,10)}],purchase_constraints:{units_per_pack:2,pack_cost:1,supplier_max_packs:3,selection_max_packs:3,selection_weight:5-i,maximum_projected_expired_units:0,minimum_fulfillment_pct:0}}))}
 const request={acknowledged:true,snapshot},result=await reviewDatabricksDatedPlan(request,true)
 assert.equal(result.status,'DATED_SELECTION_RESULT');assert.ok('proof_status' in result,'Selection response must include proof status');assert.equal(result.proof_status,'optimal');if(!('spend_php'in result))throw Error('No selection')
 assert.equal(result.spend_php,'10.00');assert.equal(result.full_plan_verification_status,'DATED_FIXED_PLAN_FEASIBLE')
 const denied=await fetch('http://localhost:5000/api/sales/planning-dated-select',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)});assert.equal(denied.status,401)
 writeFileSync(out+'/live-check.json',JSON.stringify({status:'PASS_LIVE_SHORTLIST_DATED_SELECTION',source:shortlist.source,products:shortlist.products.length,inputs:'Synthetic demand, stock, price and weights; not operational facts',gateway_function_executed:true,authenticated_http_executed:false,unauthenticated_status:401,proof_status:result.proof_status,warehouse_writes:0,procurement_execution_approved:false},null,2)+'\n')
 writeFileSync(out+'/live-selection.json',JSON.stringify({request,result},null,2)+'\n');console.log(JSON.stringify({status:'PASS_LIVE_SHORTLIST_DATED_SELECTION',products:shortlist.products.length,unauthenticated_status:401}))
}
main().catch(error=>{console.error(error instanceof Error?error.message.slice(0,180):'Dated selection failed');process.exitCode=1})
