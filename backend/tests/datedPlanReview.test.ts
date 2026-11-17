import assert from 'node:assert/strict'
import test from 'node:test'
import {reviewDatedPlan} from '../src/datedPlanReview'
const current={source:{checksum:'synthetic'},scope:{sector:'All',territory:'all'},products:[{product:'A'}]}
function fixture(){return {acknowledged:true,snapshot:{schema_version:1,classification:'entered_unverified_operating_snapshot',checksum:'synthetic',scope:current.scope,as_of:'2026-10-29',input_reference:'Synthetic QA',purchase_budget:10,
 products:[{product:'A',unit_label:'entered units',stock_total:0,protected_reserve:0,batches:[] as Array<Record<string,unknown>>,receipts:[],horizon_end:'2026-10-31',demand_calendar:['2026-10-29','2026-10-30','2026-10-31'].map(date=>({date,units:2})),
 proposed_receipts:[{receipt_id:'P',units:6,expected_on:'2026-10-29',expires_on:'2026-11-01'}],purchase_constraints:{units_per_pack:2,pack_cost:3,supplier_max_packs:3,maximum_projected_expired_units:0,minimum_fulfillment_pct:100}}]}}}
test('server recomputes dated supply and exact cost without trusting supplied review flags',()=>{
 const body=fixture(),result=reviewDatedPlan({...body,client_result:{approved:true}},current,'2026-10-29')
 assert.equal(result.status,'DATED_FIXED_PLAN_FEASIBLE');assert.equal(result.spend_php,'9.00');assert.equal(result.rows[0].candidate.fulfilled_units,6)
 assert.equal(result.rows[0].baseline.fulfilled_units,0);assert.equal(result.objective_optimized,false);assert.equal(result.procurement_execution_approved,false)
})
test('shared budget and product supplier cap are hard fixed-plan checks',()=>{
 const body=fixture();body.snapshot.purchase_budget=8
 assert.ok(reviewDatedPlan(body,current,'2026-10-29').conflicts.some(c=>c.includes('Shared')))
 body.snapshot.products[0].purchase_constraints.supplier_max_packs=2
 assert.ok(reviewDatedPlan(body,current,'2026-10-29').rows[0].conflicts.some(c=>c.includes('supplier')))
})
test('short-lived or late stock fails explicit expiry and fulfillment constraints',()=>{
 const body=fixture();body.snapshot.products[0].proposed_receipts[0].expires_on='2026-10-30'
 const result=reviewDatedPlan(body,current,'2026-10-29')
 assert.equal(result.status,'DATED_FIXED_PLAN_INFEASIBLE');assert.equal(result.rows[0].candidate.projected_expired_units,4)
 assert.equal(result.rows[0].conflicts.length,2)
})
test('whole pack, absent constraints, fractional cents and missing demand are rejected',()=>{
 for(const mutate of [(b:ReturnType<typeof fixture>)=>{b.snapshot.products[0].proposed_receipts[0].units=5},b=>{b.snapshot.purchase_budget=.001},b=>{b.snapshot.products[0].demand_calendar.pop()},b=>{b.snapshot.products[0].purchase_constraints=null as never}]){
  const body=fixture();mutate(body);assert.throws(()=>reviewDatedPlan(body,current,'2026-10-29'))
 }
})
test('source scope, duplicate products, future snapshot and missing acknowledgment fail',()=>{
 const body=fixture();assert.throws(()=>reviewDatedPlan({...body,acknowledged:false},current,'2026-10-29'))
 assert.throws(()=>reviewDatedPlan(body,{...current,source:{checksum:'other'}},'2026-10-29'))
 body.snapshot.as_of='2026-10-30';assert.throws(()=>reviewDatedPlan(body,current,'2026-10-29'))
})
test('unmodeled proposed arrivals reject; existing outside-horizon receipts are not consumed',()=>{
 const body=fixture();body.snapshot.products[0].proposed_receipts[0].expected_on='2026-11-01';body.snapshot.products[0].proposed_receipts[0].expires_on='2026-11-02'
 assert.throws(()=>reviewDatedPlan(body,current,'2026-10-29'),/within/)
})
test('expired and held batches cannot satisfy reserve or demand; input stays unchanged',()=>{
 const body=fixture();body.snapshot.products[0].stock_total=4;body.snapshot.products[0].batches=[{batch_id:'held',units:4,received_on:'2026-10-01',expires_on:'2026-11-01',disposition:'quarantined'}]
 const before=JSON.stringify(body),r=reviewDatedPlan(body,current,'2026-10-29');assert.equal(r.rows[0].baseline.fulfilled_units,0);assert.equal(JSON.stringify(body),before)
 body.snapshot.products[0].protected_reserve=1;assert.throws(()=>reviewDatedPlan(body,current,'2026-10-29'),/reserve/)
})
test('null proposals, invalid references and nonnumeric snapshot quantities reject at the server boundary',()=>{
 for(const patch of [{proposed_receipts:null},{stock_total:false},{stock_total:'0'},{protected_reserve:null}]){
  const body=fixture();Object.assign(body.snapshot.products[0],patch);assert.throws(()=>reviewDatedPlan(body,current,'2026-10-29'))
 }
 const body=fixture();body.snapshot.input_reference='line\nbreak';assert.throws(()=>reviewDatedPlan(body,current,'2026-10-29'))
})
