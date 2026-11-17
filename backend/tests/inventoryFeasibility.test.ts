import assert from 'node:assert/strict'
import test from 'node:test'
import {inventoryPolicyScenario} from '../src/inventoryPolicyScenario'
import {solvePlanningScenario} from '../src/planningScenario'
const row={annual_demand:365,order_cost:10,holding_cost:2,lead_days:10,on_order:20,backorders:3,shelf_life_days:30,policy_input_reference:'Synthetic QA inputs'}
const item={stock:8,reserve:2,pack:4,pack_cost_cents:500,max_packs:100}
test('lead-time gap separates current usable stock from optimistic timely inbound',()=>{
 const f=inventoryPolicyScenario(row,item,10000)!.feasibility
 assert.equal(f.lead_demand_ceiling_units,10);assert.equal(f.available_before_new_receipts_units,3)
 assert.equal(f.gap_without_receipts_units,7);assert.equal(f.gap_even_if_inbound_timely_units,0)
 assert.match(f.lead_review,/Check inbound arrival dates/);assert.equal(f.input_status,'entered_unverified_assumptions')
})
test('insufficient timely supply and no receipt gap produce distinct review messages',()=>{
 const f=inventoryPolicyScenario({...row,on_order:0},item,10000)!.feasibility
 assert.equal(f.gap_even_if_inbound_timely_units,7);assert.match(f.lead_review,/insufficient even/)
 assert.match(inventoryPolicyScenario({...row,lead_days:0},item,10000)!.feasibility.lead_review,/no service guarantee/)
})
test('gross shelf capacity floors demand and packs; equality is not excess or a safety approval',()=>{
 const p=inventoryPolicyScenario(row,item,10000)!
 assert.equal(p.feasibility.gross_demand_capacity_before_expiry_units,30)
 assert.equal(p.feasibility.gross_demand_capacity_before_expiry_packs,7)
 assert.equal(p.eoq_lot_exceeds_gross_shelf_capacity,true)
 const short=inventoryPolicyScenario({...row,annual_demand:1,shelf_life_days:364},item,10000)!
 assert.equal(short.feasibility.gross_demand_capacity_before_expiry_units,0)
 assert.equal(short.eoq_lot_exceeds_gross_shelf_capacity,true)
})
test('zero days is a known zero-capacity assumption; blank shelf life stays unknown',()=>{
 const zero=inventoryPolicyScenario({...row,shelf_life_days:0},item,10000)!
 assert.equal(zero.feasibility.gross_demand_capacity_before_expiry_units,0)
 const blank=inventoryPolicyScenario({...row,shelf_life_days:''},item,10000)!
 assert.equal(blank.feasibility.gross_demand_capacity_before_expiry_units,null)
 assert.equal(blank.eoq_lot_exceeds_gross_shelf_capacity,null)
})
test('shelf inputs without model evidence, malformed days and unsafe reference shapes fail',()=>{
 assert.throws(()=>inventoryPolicyScenario({shelf_life_days:10},item,0),/all EOQ/)
 for(const value of [null,false,' ',1.5,-1,3651])assert.throws(()=>inventoryPolicyScenario({...row,shelf_life_days:value},item,0))
 for(const value of [null,false,{},'x'.repeat(201),'line\nbreak'])assert.throws(()=>inventoryPolicyScenario({...row,policy_input_reference:value},item,0))
})
test('post-allocation screen warns but does not silently constrain purchases or claim measured expiry',()=>{
 const shortlist={source:{checksum:'test'},scope:{sector:'All',territory:'all'},products:[{product:'A'}]}
 const body={checksum:'test',acknowledged:true,horizon:1,budget:100,minimum_pct:0,items:[{...row,product:'A',stock:0,reserve:0,pack:4,pack_cost:5,max_packs:100,demand:40,shelf_life_days:30}]}
 const result=solvePlanningScenario(body,shortlist),r=result.rows[0]
 assert.equal(r.purchase_units,40);assert.equal(r.expiry_screen.gross_demand_capacity_units,30)
 assert.equal(r.expiry_screen.status,'exceeds_gross_capacity');assert.equal(r.expiry_screen.allocation_constrained_by_expiry,false)
 assert.equal(r.expiry_screen.expiry_outcome_measured,false)
 body.items[0].demand=30;body.items[0].pack=1
 const within=solvePlanningScenario(body,shortlist).rows[0]
 assert.equal(within.expiry_screen.status,'within_gross_capacity_not_verified');assert.match(within.expiry_screen.review,/batch dates still/)
})
