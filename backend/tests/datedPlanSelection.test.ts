import test from 'node:test'
import assert from 'node:assert/strict'
import {selectDatedPlan} from '../src/datedPlanSelection'
function fixture(){
 const shortlist={source:{checksum:'synthetic'},scope:{sector:'All',territory:'all'},products:[{product:'A'},{product:'B'}]}
 const snapshot={schema_version:1,classification:'entered_unverified_operating_snapshot',checksum:'synthetic',scope:shortlist.scope,as_of:'2026-10-29',input_reference:'Synthetic selection QA',purchase_budget:3,
 products:['A','B'].map((product,i)=>({product,unit_label:'entered units',stock_total:0,protected_reserve:0,batches:[],receipts:[],horizon_end:'2026-10-31',demand_calendar:['2026-10-29','2026-10-30','2026-10-31'].map(date=>({date,units:2})),proposed_receipts:[{receipt_id:'slot',units:2,expected_on:'2026-10-29',expires_on:'2026-11-01'}],purchase_constraints:{units_per_pack:2,pack_cost:1,supplier_max_packs:3,maximum_projected_expired_units:0,minimum_fulfillment_pct:0,selection_max_packs:3,selection_weight:i?25:75}}))}
 return {body:{acknowledged:true,snapshot},shortlist}
}
test('dated quantity selection maximizes entered weighted fulfillment and rechecks full feasible plan',()=>{
 const {body,shortlist}=fixture(),r=selectDatedPlan(body,shortlist,'2026-10-29')
 assert.equal(r.status,'DATED_SELECTION_RESULT');if(!('weighted_fulfillment_pct'in r))throw Error('Missing result')
 assert.equal(r.proof_status,'optimal');assert.equal(r.weighted_fulfillment_pct,75);assert.equal(r.spend_php,'3.00')
 assert.deepEqual(r.rows.map(row=>row.proposed_packs),[3,0]);assert.equal(r.absolute_gap_pp,0);assert.equal(r.full_plan_verification_status,'DATED_FIXED_PLAN_FEASIBLE')
 assert.equal(r.procurement_execution_approved,false)
})
test('zero-node stop retains a feasible incumbent with honest primary bound and unproved secondary spend',()=>{
 const {body,shortlist}=fixture(),r=selectDatedPlan(body,shortlist,'2026-10-29',0)
 assert.equal(r.status,'DATED_SELECTION_RESULT');if(!('absolute_gap_pp'in r))throw Error('Missing gap')
 assert.equal(r.proof_status,'feasible_bound');assert.ok(r.absolute_gap_pp>0);assert.equal(r.secondary_minimum_spend_proved,false)
 assert.equal(r.spend_php,'0.00')
})
test('entered minimum coverage can prove infeasible under shared budget',()=>{
 const {body,shortlist}=fixture();body.snapshot.products.forEach(p=>p.purchase_constraints.minimum_fulfillment_pct=100)
 const r=selectDatedPlan(body,shortlist,'2026-10-29');assert.equal(r.status,'DATED_SELECTION_INFEASIBLE');assert.equal(r.proof_status,'infeasible');assert.deepEqual(r.rows,[])
})
test('late arrivals cannot satisfy first-day demand even with a large budget',()=>{
 const {body,shortlist}=fixture();body.snapshot.purchase_budget=100;body.snapshot.products.forEach(p=>{p.purchase_constraints.minimum_fulfillment_pct=100;p.proposed_receipts[0].expected_on='2026-10-30'})
 assert.equal(selectDatedPlan(body,shortlist,'2026-10-29').status,'DATED_SELECTION_INFEASIBLE')
})
test('scope is explicit: one slot, at most20 packs, supplier/quantity bounds and nonzero objective',()=>{
 for(const mutate of [(b:ReturnType<typeof fixture>['body'])=>{b.snapshot.products[0].purchase_constraints.selection_max_packs=21},b=>{b.snapshot.products[0].purchase_constraints.selection_max_packs=4},b=>{b.snapshot.products[0].proposed_receipts.push(b.snapshot.products[0].proposed_receipts[0])},b=>{b.snapshot.products.forEach(p=>p.purchase_constraints.selection_weight=0)}]){
  const {body,shortlist}=fixture();mutate(body);assert.throws(()=>selectDatedPlan(body,shortlist,'2026-10-29'))
 }
})
test('secondary minimum spend avoids unnecessary packs with identical objective',()=>{
 const {body,shortlist}=fixture();body.snapshot.purchase_budget=100;body.snapshot.products.forEach(p=>p.demand_calendar.forEach(d=>d.units=0));body.snapshot.products[0].demand_calendar[0].units=1
 const r=selectDatedPlan(body,shortlist,'2026-10-29');if(!('spend_php'in r))throw Error('No selection')
 assert.equal(r.spend_php,'1.00');assert.equal(r.secondary_minimum_spend_proved,true)
})
test('selection leaves original receipt prototypes and their quantities unchanged',()=>{
 const {body,shortlist}=fixture(),before=JSON.stringify(body);selectDatedPlan(body,shortlist,'2026-10-29');assert.equal(JSON.stringify(body),before)
})
