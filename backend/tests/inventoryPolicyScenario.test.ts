import assert from 'node:assert/strict'
import test from 'node:test'
import {inventoryPolicyScenario} from '../src/inventoryPolicyScenario'
import {solvePlanningScenario} from '../src/planningScenario'

const input={annual_demand:10000,order_cost:2,holding_cost:0.16,lead_days:10,on_order:50,backorders:10}
const item={stock:100,reserve:20,pack:100,pack_cost_cents:10000,max_packs:100}
test('known EOQ, annual cost and exact ceil reorder point remain product-specific',()=>{
  const result=inventoryPolicyScenario(input,item,50000)!
  assert.equal(result.continuous_eoq_units,500);assert.equal(result.economic_lot_packs,5)
  assert.equal(result.annual_ordering_and_cycle_holding_cost,80)
  assert.equal(result.reorder_point_units,294);assert.equal(result.inventory_position_units,140)
  assert.equal(result.reorder_triggered,true);assert.equal(result.budget_covers_single_lot,true)
  assert.equal(result.operational_inputs_verified,false);assert.equal(result.procurement_execution_approved,false)
})
test('pack-size optimum compares both adjacent costs instead of rounding units',()=>{
  const result=inventoryPolicyScenario({...input,annual_demand:100,order_cost:10,holding_cost:1},{...item,pack:30},50000)!
  assert.ok(Math.abs(result.continuous_eoq_units-Math.sqrt(2000))<1e-10)
  assert.equal(result.economic_lot_units,60);assert.equal(result.economic_lot_packs,2)
})
test('reserve is added once and an exact reorder threshold triggers review',()=>{
  const policy={...input,annual_demand:365,lead_days:5,on_order:0,backorders:0}
  assert.equal(inventoryPolicyScenario(policy,{...item,stock:16,reserve:10},0)!.reorder_triggered,false)
  assert.equal(inventoryPolicyScenario(policy,{...item,stock:15,reserve:10},0)!.reorder_triggered,true)
  const zero=inventoryPolicyScenario({...policy,lead_days:0},{...item,stock:10,reserve:5},0)!
  assert.equal(zero.reorder_point_units,5);assert.equal(zero.inventory_position_units,10);assert.equal(zero.reorder_triggered,false)
})
test('inbound and backorders change only the separate inventory-position review',()=>{
  const result=inventoryPolicyScenario({...input,on_order:0,backorders:200},item,0)!
  assert.equal(result.inventory_position_units,-100);assert.equal(result.reorder_triggered,true)
  assert.equal(result.budget_covers_single_lot,false)
})
test('unconstrained EOQ lot reports budget and supplier conflicts without relabelling it feasible',()=>{
  const result=inventoryPolicyScenario(input,{...item,max_packs:4},49999)!
  assert.equal(result.economic_lot_packs,5);assert.equal(result.review_constraints.length,2)
  assert.equal(result.supplier_covers_single_lot,false);assert.equal(result.budget_covers_single_lot,false)
})
test('optional blank policy skips; partially entered or nonnumeric assumptions fail',()=>{
  assert.equal(inventoryPolicyScenario({},item,0),null)
  assert.equal(inventoryPolicyScenario(Object.fromEntries(Object.keys(input).map(k=>[k,''])),item,0),null)
  for(const field of Object.keys(input))for(const bad of [undefined,null,' ',false,true,[],{},'Infinity',-1]){
    assert.throws(()=>inventoryPolicyScenario({...input,[field]:bad},item,0))
  }
  assert.throws(()=>inventoryPolicyScenario({annual_demand:100},item,0))
})
test('money precision, zero costs and fractional physical counts fail instead of changing inputs',()=>{
  for(const key of ['order_cost','holding_cost'])for(const value of [0,0.001,'1e-3'])assert.throws(()=>inventoryPolicyScenario({...input,[key]:value},item,0))
  for(const key of ['annual_demand','lead_days','on_order','backorders'])assert.throws(()=>inventoryPolicyScenario({...input,[key]:1.5},item,0))
})
test('bounded maximum inputs remain finite and preserve safe whole-pack arithmetic',()=>{
  const result=inventoryPolicyScenario({...input,annual_demand:1e9,order_cost:1e9,holding_cost:.01,lead_days:3650,on_order:1e9,backorders:1e9},item,1e11)!
  assert.ok(Number.isFinite(result.annual_ordering_and_cycle_holding_cost));assert.ok(Number.isSafeInteger(result.economic_lot_units))
  assert.equal(result.reorder_point_units,10_000_000_020)
})
test('policy results do not rewrite allocation inputs or override budget/supplier caps',()=>{
  const shortlist={source:{checksum:'synthetic'},scope:{sector:'All',territory:'all'},products:[{product:'Test'}]}
  const row={product:'Test',demand:20,stock:5,reserve:2,pack:10,pack_cost:5,max_packs:1}
  const body={checksum:'synthetic',acknowledged:true,horizon:1,budget:5,minimum_pct:0,items:[row]}
  const plain=solvePlanningScenario(body,shortlist),withPolicy=solvePlanningScenario({...body,items:[{...row,...input}]},shortlist)
  assert.equal(plain.rows[0].purchase_packs,withPolicy.rows[0].purchase_packs)
  assert.equal(withPolicy.rows[0].purchase_packs,1);assert.equal(withPolicy.spent,5)
  assert.equal(plain.rows[0].inventory_policy,null);assert.ok(withPolicy.rows[0].inventory_policy)
  assert.equal(withPolicy.rows[0].ending_stock,2)
})
