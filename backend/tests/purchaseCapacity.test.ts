import assert from 'node:assert/strict'
import test from 'node:test'
import {solvePlanningScenario} from '../src/planningScenario'

function fixture(){
 const shortlist={source:{checksum:'capacity_fixture'},scope:{sector:'All',territory:'all'},products:['A','B'].map(product=>({product}))}
 const body={acknowledged:true,checksum:'capacity_fixture',horizon:1,budget:100,minimum_pct:0,allocation_method:'weighted',revenue_weight:100,growth_weight:0,outbreak_weight:0,
   purchase_capacity_units:3,capacity_unit_label:'fixture units',items:[
    {product:'A',demand:4,stock:0,reserve:0,pack:2,pack_cost:1,max_packs:2,revenue_score:100,unit_label:'fixture units'},
    {product:'B',demand:3,stock:0,reserve:0,pack:1,pack_cost:1,max_packs:3,revenue_score:60,unit_label:'fixture units'}]}
 return {shortlist,body}
}
test('weighted and balanced allocations honor shared compatible-unit purchase capacity',()=>{
 const {shortlist,body}=fixture();const weighted=solvePlanningScenario(body,shortlist)
 assert.deepEqual(weighted.rows.map(r=>r.purchase_packs),[1,1]);assert.equal(weighted.purchase_capacity?.used_units,3)
 assert.equal(weighted.optimization?.proof_status,'optimal');assert.ok(weighted.rows.some(r=>r.unmet_reasons.some(reason=>reason.includes('capacity'))))
 const balanced=solvePlanningScenario({...body,allocation_method:'balanced'},shortlist)
 assert.ok(balanced.rows.reduce((sum,r)=>sum+r.purchase_units,0)<=3)
 assert.equal(balanced.purchase_capacity?.physical_storage_verified,false)
})
test('zero and infeasible minimum capacity remain explicit and omitted capacity retains prior behavior',()=>{
 const {shortlist,body}=fixture()
 const zero=solvePlanningScenario({...body,purchase_capacity_units:0},shortlist);assert.ok(zero.rows.every(r=>r.purchase_packs===0))
 assert.equal(solvePlanningScenario({...body,purchase_capacity_units:0,minimum_pct:100},shortlist).status,'infeasible')
 const {purchase_capacity_units:_,capacity_unit_label:__,...uncapped}=body
 assert.ok(solvePlanningScenario(uncapped,shortlist).rows.every(r=>r.unmet===0))
})
test('capacity rejects missing/mixed units and malformed numeric constraints',()=>{
 const {shortlist,body}=fixture()
 for(const units of [-1,1.5,null,true,'3x',''])assert.throws(()=>solvePlanningScenario({...body,purchase_capacity_units:units},shortlist))
 assert.throws(()=>solvePlanningScenario({...body,capacity_unit_label:''},shortlist))
 assert.throws(()=>solvePlanningScenario({...body,items:body.items.map((r,i)=>({...r,unit_label:i?'boxes':'ampoules'}))},shortlist))
 assert.equal(solvePlanningScenario({...body,purchase_capacity_units:'3'},shortlist).purchase_capacity?.used_units,3)
})
test('capacity counts full purchased packs including units beyond capped demand',()=>{
 const {shortlist,body}=fixture(),one={...shortlist,products:[{product:'A'}]}
 const scenario={...body,items:[{...body.items[0],demand:3}],purchase_capacity_units:3}
 const partial=solvePlanningScenario(scenario,one)
 assert.equal(partial.rows[0].purchase_units,2);assert.equal(partial.rows[0].unmet,1)
 assert.equal(solvePlanningScenario({...scenario,minimum_pct:100},one).status,'infeasible')
 const full=solvePlanningScenario({...scenario,purchase_capacity_units:4,minimum_pct:100},one)
 assert.equal(full.purchase_capacity?.used_units,4);assert.equal(full.rows[0].purchased_units_not_needed_for_entered_demand,1)
})
test('weighted objective matches exhaustive capacities including existing stock and minimum fulfillment',()=>{
 const {shortlist,body}=fixture()
 for(const capacity of [0,1,2,3,4,5,6,7])for(const minimum of [0,50,100]){
  const scenario={...body,purchase_capacity_units:capacity,minimum_pct:minimum,items:body.items.map((r,i)=>({...r,stock:i?1:0}))}
  const feasible=[]
  for(let a=0;a<=2;a++)for(let b=0;b<=3;b++){
   const fulfilled=[Math.min(4,a*2),Math.min(3,1+b)]
   if(a*2+b<=capacity&&fulfilled.every((v,i)=>v>=Math.ceil(scenario.items[i].demand*minimum/100)))feasible.push(100*fulfilled[0]/4+60*fulfilled[1]/3)
  }
  const result=solvePlanningScenario(scenario,shortlist)
  if(!feasible.length)assert.equal(result.status,'infeasible')
  else {assert.equal(result.optimization?.proof_status,'optimal');assert.ok(Math.abs(result.optimization!.weighted_fulfillment_pct-Math.max(...feasible)/160*100)<1e-10)}
 }
})
