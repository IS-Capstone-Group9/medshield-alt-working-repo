import assert from 'node:assert/strict'
import test from 'node:test'
import {allocateWeighted,planningWeights,planningPriority} from '../src/weightedPlanning'
import {solvePlanningScenario} from '../src/planningScenario'

function example(){
  const shortlist={source:{checksum:'test'},scope:{sector:'All',territory:'all'},products:['A','B','C'].map(product=>({product}))}
  const body={acknowledged:true,checksum:'test',horizon:1,budget:10,minimum_pct:0,allocation_method:'weighted',revenue_weight:100,growth_weight:0,outbreak_weight:0,
    items:['A','B','C'].map((product,i)=>({product,demand:1,stock:0,reserve:0,pack:1,pack_cost:i===0?6:5,max_packs:1,revenue_score:i===0?60:50}))}
  return {shortlist,body}
}
test('integer allocation beats an equal-density expensive-pack greedy trap',()=>{
  const {shortlist,body}=example(),result=solvePlanningScenario(body,shortlist)
  assert.deepEqual(result.rows.map(row=>row.purchase_packs),[0,1,1]);assert.equal(result.spent,10)
  assert.equal(result.optimization?.proof_status,'optimal');assert.equal(result.optimization?.weighted_fulfillment_pct,62.5)
  assert.equal(result.optimization?.absolute_gap_pp,0)
})
test('node exhaustion returns a feasible incumbent with an honest enclosing bound',()=>{
  const {body}=example(),weights=planningWeights(body)
  const items=body.items.map(row=>({...row,available:0,pack_cost_cents:row.pack_cost*100,purchase_packs:0,fulfilled:0,priority:planningPriority(row,weights)}))
  const result=allocateWeighted(items,1000,0)
  assert.equal(result.proof_status,'feasible_bound');assert.ok(result.absolute_gap_pp>0)
  assert.ok(result.weighted_fulfillment_pct<=62.5&&result.upper_bound_pct>=62.5)
  assert.equal(items.reduce((sum,row)=>sum+row.purchase_packs*row.pack_cost_cents,0),600)
})
test('entered weights and active criterion values are explicit; unused criteria remain unknown',()=>{
  assert.equal(planningWeights({}),null)
  for(const body of [{allocation_method:'oops'},{allocation_method:'weighted'},
    {allocation_method:'weighted',revenue_weight:50,growth_weight:40,outbreak_weight:0},
    {allocation_method:'weighted',revenue_weight:100,growth_weight:false,outbreak_weight:0}])assert.throws(()=>planningWeights(body))
  const weights=planningWeights({allocation_method:'weighted',revenue_weight:100,growth_weight:0,outbreak_weight:0})!
  const p=planningPriority({revenue_score:50},weights)!
  assert.equal(p.growth,null);assert.equal(p.outbreak,null);assert.equal(p.composite_score,5000)
  for(const value of [undefined,'',null,false,-1,101,1.5])assert.throws(()=>planningPriority({revenue_score:value},weights))
})
test('all-zero priorities reject a meaningless weighted objective',()=>{
  const {body,shortlist}=example();body.items.forEach(row=>row.revenue_score=0)
  assert.throws(()=>solvePlanningScenario(body,shortlist),/positive priority/)
})
test('minimum service, reserve, supplier caps and infeasibility remain hard constraints',()=>{
  const {body,shortlist}=example();body.minimum_pct=100
  assert.equal(solvePlanningScenario(body,shortlist).status,'infeasible')
  body.budget=16
  const result=solvePlanningScenario(body,shortlist)
  assert.ok(result.rows.every(row=>row.fulfillment_pct===100));assert.equal(result.optimization?.proof_status,'optimal')
})
test('zero gain products retain demand and an explicit weighted-objective review reason',()=>{
  const {body,shortlist}=example();body.items[1].revenue_score=0;body.items[2].revenue_score=0;body.budget=100
  const result=solvePlanningScenario(body,shortlist)
  assert.equal(result.rows[1].purchase_packs,0);assert.ok(result.rows[1].unmet_reasons.some(x=>x.includes('weighted objective')))
  assert.equal(result.optimization?.weighted_fulfillment_pct,100)
})
test('balanced default is preserved and no scoring fact or approval is inferred',()=>{
  const {body,shortlist}=example()
  const result=solvePlanningScenario({...body,allocation_method:'balanced'},shortlist)
  assert.equal(result.optimization,null);assert.ok(result.rows.every(row=>row.priority===null))
  assert.equal(result.assumptions?.procurement_execution_approved,false)
})
test('pack overshoot caps fulfillment, while the fractional bound still encloses integer optimality',()=>{
  const {body,shortlist}=example();body.items.forEach(row=>{row.demand=3;row.pack=2;row.max_packs=3;row.pack_cost=1});body.budget=4
  const result=solvePlanningScenario(body,shortlist)
  assert.ok(result.rows.every(row=>row.fulfilled<=row.demand&&row.purchase_units===row.purchase_packs*row.pack))
  assert.equal(result.spent,4);assert.equal(result.optimization?.proof_status,'optimal')
  assert.ok(result.rows.every(row=>row.ending_stock>=row.reserve))
})
test('decimal minimum fulfillment does not falsely require an extra unit at a binary rounding boundary',()=>{
  const shortlist={source:{checksum:'rounding'},scope:{sector:'All',territory:'all'},products:[{product:'A'}]}
  const body={acknowledged:true,checksum:'rounding',horizon:1,budget:7,minimum_pct:0.07,allocation_method:'weighted',revenue_weight:100,growth_weight:0,outbreak_weight:0,
    items:[{product:'A',demand:10000,stock:0,reserve:0,pack:1,pack_cost:1,max_packs:7,revenue_score:100}]}
  const result=solvePlanningScenario(body,shortlist)
  assert.equal(result.status,'scenario_allocation');assert.equal(result.rows[0].fulfilled,7);assert.equal(result.optimization?.proof_status,'optimal')
})
