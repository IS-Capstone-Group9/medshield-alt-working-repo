import 'dotenv/config'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {getDatabricksPlanningShortlist,solveDatabricksPlanningScenario} from '../src/databricksDashboard'
import {solvePlanningScenario} from '../src/planningScenario'

async function main(){
  const directory='../outputs/inventory_policy_scenario_20261029';mkdirSync(directory,{recursive:true})
  const scope={sector:'All',territory:'all'},shortlist=await getDatabricksPlanningShortlist(scope)
  assert.ok(shortlist.products.length>0)
  const body={scope,checksum:shortlist.source.checksum,horizon:1,acknowledged:true,budget:50,minimum_pct:0,
    items:shortlist.products.map(p=>({product:p.product,demand:10,stock:6,reserve:2,pack:4,pack_cost:5,max_packs:3,
      annual_demand:365,order_cost:10,holding_cost:2,lead_days:5,on_order:0,backorders:0}))}
  const result=await solveDatabricksPlanningScenario(body)
  assert.equal(result.status,'scenario_allocation')
  for(const row of result.rows){
    assert.equal(row.inventory_policy?.reorder_point_units,7);assert.equal(row.inventory_policy?.inventory_position_units,6)
    assert.equal(row.inventory_policy?.economic_lot_units,60);assert.equal(row.inventory_policy?.reorder_triggered,true)
    assert.equal(row.purchase_packs,2);assert.equal(row.fulfilled,10);assert.equal(row.ending_stock,4)
  }
  const noPolicy={...body,items:body.items.map(({product,demand,stock,reserve,pack,pack_cost,max_packs})=>({product,demand,stock,reserve,pack,pack_cost,max_packs}))}
  const cases=[{name:'with-policy',request:body,result},
    {name:'without-policy',request:noPolicy,result:solvePlanningScenario(noPolicy,shortlist)},
    {name:'infeasible',request:{...body,budget:0,minimum_pct:100},result:solvePlanningScenario({...body,budget:0,minimum_pct:100},shortlist)}]
  const denied=await fetch('http://localhost:5000/api/sales/planning-solve',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
  assert.equal(denied.status,401)
  writeFileSync(directory+'/scenarios.json',JSON.stringify(cases,null,2)+'\n')
  const receipt={status:'PASS_LIVE_SHORTLIST_SYNTHETIC_POLICY_SCENARIO',source:shortlist.source,scope,
    products:shortlist.products.length,entered_inputs:'synthetic QA assumptions; no verified inventory or supplier inputs',
    source_reader_and_gateway_function_executed:true,unauthenticated_http_status:denied.status,warehouse_writes:0,
    inventory_inputs_verified:false,procurement_execution_approved:false,expiry_outcome_measured:false}
  writeFileSync(directory+'/live-check.json',JSON.stringify(receipt,null,2)+'\n')
  console.log(JSON.stringify({status:receipt.status,products:receipt.products,unauthenticated_http_status:denied.status}))
}
main().catch(error=>{console.error(error instanceof Error?error.message.slice(0,180):'Planning policy check failed');process.exitCode=1})
