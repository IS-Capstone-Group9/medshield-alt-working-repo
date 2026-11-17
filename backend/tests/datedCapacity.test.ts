import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {selectDatedPlan} from '../src/datedPlanSelection'
import {reviewDatedPlan} from '../src/datedPlanReview'

function fixture(capacity=3){
 const shortlist={source:{checksum:'synthetic_dated_capacity'},scope:{sector:'All',territory:'all'},products:[{product:'A'},{product:'B'}]}
 const snapshot={schema_version:1,classification:'entered_unverified_operating_snapshot',checksum:shortlist.source.checksum,scope:shortlist.scope,as_of:'2026-10-29',input_reference:'Synthetic dated capacity hand case',purchase_budget:10,purchase_capacity_units:capacity,capacity_unit_label:'ampoules',
  products:['A','B'].map((product,i)=>({product,unit_label:'ampoules',stock_total:0,protected_reserve:0,batches:[],receipts:[],horizon_end:'2026-10-31',demand_calendar:['2026-10-29','2026-10-30','2026-10-31'].map(date=>({date,units:1})),
   proposed_receipts:[{receipt_id:'slot',units:1,expected_on:'2026-10-29',expires_on:'2026-11-01'}],purchase_constraints:{units_per_pack:1,pack_cost:i?2:1,supplier_max_packs:3,maximum_projected_expired_units:0,minimum_fulfillment_pct:0,selection_max_packs:3,selection_weight:i?25:75}}))}
 return {body:{acknowledged:true,snapshot},shortlist}
}
test('fixed review counts full proposed units and zero capacity without altering expiry semantics',()=>{
 const {body,shortlist}=fixture(1),result=reviewDatedPlan(body,shortlist,'2026-10-29')
 assert.equal(result.status,'DATED_FIXED_PLAN_INFEASIBLE');assert.ok(result.conflicts.includes('Shared dated purchase capacity exceeded'))
 assert.equal(result.purchase_capacity?.used_units,2);assert.equal(result.purchase_capacity?.remaining_units,-1)
 body.snapshot.purchase_capacity_units=0
 body.snapshot.products.forEach(p=>p.proposed_receipts=[])
 assert.equal(reviewDatedPlan(body,shortlist,'2026-10-29').status,'DATED_FIXED_PLAN_FEASIBLE')
 const {purchase_capacity_units:_,capacity_unit_label:__,...legacy}=body.snapshot
 assert.equal(reviewDatedPlan({...body,snapshot:legacy},shortlist,'2026-10-29').purchase_capacity,null)
})
test('selection honors shared capacity, minimum and full dated readback',()=>{
 const {body,shortlist}=fixture(),before=JSON.stringify(body),result=selectDatedPlan(body,shortlist,'2026-10-29')
 assert.equal(result.status,'DATED_SELECTION_RESULT');if(!('selected_snapshot'in result))throw Error('No feasible selection')
 assert.deepEqual(result.rows.map(r=>r.proposed_packs),[3,0]);assert.equal(result.weighted_fulfillment_pct,75)
 assert.equal(result.purchase_capacity?.used_units,3);assert.equal(result.procurement_execution_approved,false)
 assert.equal(reviewDatedPlan({...body,snapshot:result.selected_snapshot},shortlist,'2026-10-29').status,'DATED_FIXED_PLAN_FEASIBLE')
 assert.equal(JSON.stringify(body),before)
 body.snapshot.products.forEach(p=>p.purchase_constraints.minimum_fulfillment_pct=100)
 assert.equal(selectDatedPlan(body,shortlist,'2026-10-29').status,'DATED_SELECTION_INFEASIBLE')
})
test('capacity validation rejects missing/mixed labels and nonnumeric quantities',()=>{
 const {body,shortlist}=fixture()
 for(const value of [null,true,'3',-1,1.5])assert.throws(()=>reviewDatedPlan({...body,snapshot:{...body.snapshot,purchase_capacity_units:value}},shortlist,'2026-10-29'))
 assert.throws(()=>reviewDatedPlan({...body,snapshot:{...body.snapshot,capacity_unit_label:''}},shortlist,'2026-10-29'))
 body.snapshot.products[1].unit_label='boxes';assert.throws(()=>selectDatedPlan(body,shortlist,'2026-10-29'))
})
test('node exhaustion retains a capacity-feasible incumbent and honest bounds',()=>{
 const {body,shortlist}=fixture(1);body.snapshot.products.forEach(p=>p.purchase_constraints.minimum_fulfillment_pct=0)
 const r=selectDatedPlan(body,shortlist,'2026-10-29',0)
 assert.equal(r.status,'DATED_SELECTION_RESULT');if(!('purchase_capacity'in r))throw Error('No incumbent')
 assert.equal(r.proof_status,'feasible_bound');assert.ok(r.purchase_capacity!.used_units<=1)
 assert.equal(r.secondary_minimum_spend_proved,false);assert.ok(r.upper_bound_pct>=r.weighted_fulfillment_pct)
})
test('all combinations agree with independent one-day-per-unit dated enumeration',()=>{
 const evidence=[]
 for(const capacity of [0,1,2,3,4,6])for(const budget of [0,1,3,6])for(const timing of ['on_time','late','expires_early'])for(const minimum of [0,50]){
  const {body,shortlist}=fixture(capacity);body.snapshot.purchase_budget=budget
  body.snapshot.products.forEach(p=>{p.purchase_constraints.minimum_fulfillment_pct=minimum;if(timing==='late')p.proposed_receipts[0].expected_on='2026-10-30';if(timing==='expires_early')p.proposed_receipts[0].expires_on='2026-10-30'})
  const options=[]
  for(let a=0;a<=3;a++)for(let b=0;b<=3;b++){
   const counts=[a,b],filled=counts.map(q=>timing==='late'?Math.min(q,2):timing==='expires_early'?Math.min(q,1):q)
   const expired=counts.map(q=>timing==='expires_early'?Math.max(0,q-1):0)
   const cost=a+2*b
   if(a+b<=capacity&&cost<=budget&&filled.every(v=>v>=Math.ceil(3*minimum/100))&&expired.every(v=>v===0))options.push({counts,cost,numerator:75*filled[0]+25*filled[1]})
  }
  options.sort((a,b)=>b.numerator-a.numerator||a.cost-b.cost)
  const r=selectDatedPlan(body,shortlist,'2026-10-29')
  if(!options.length)assert.equal(r.status,'DATED_SELECTION_INFEASIBLE')
  else {assert.equal(r.status,'DATED_SELECTION_RESULT');if(!('objective_numerator'in r))throw Error('No objective');assert.equal(r.proof_status,'optimal');assert.ok(Math.abs(r.weighted_fulfillment_pct-options[0].numerator/3)<1e-10);assert.equal(Number(r.spend_php),options[0].cost);assert.ok(r.purchase_capacity!.used_units<=capacity)}
  evidence.push({capacity,budget,timing,minimum,request:body,result:r})
 }
 if(process.env.DATED_CAPACITY_EVIDENCE_DIRECTORY){const directory=resolve(process.env.DATED_CAPACITY_EVIDENCE_DIRECTORY);mkdirSync(directory,{recursive:true});writeFileSync(resolve(directory,'cases.json'),JSON.stringify(evidence,null,2)+'\n',{flag:'wx'})}
})
