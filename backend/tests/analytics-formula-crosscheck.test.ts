import test from 'node:test'
import assert from 'node:assert/strict'
import {weightedMargin,revenueAbc} from '../src/descriptiveMetrics'
import {forecastMetrics} from '../src/forecastEvidence'
import {solvePlanningScenario} from '../src/planningScenario'

test('hand-calculated financial, ABC and forecast examples agree with published formulas',()=>{
  // Profits 20+30 on matching revenue 100+300: ratio of sums is 12.5%.
  assert.equal(weightedMargin(50,400),12.5)
  assert.equal(weightedMargin(50,0),null)
  assert.equal(weightedMargin(-10,100),-10)
  assert.deepEqual([revenueAbc(90,100,90),revenueAbc(100,100,10),revenueAbc(100,100,0)],['A','B','Unclassified'])
  // Errors -2,+4,-3: abs=9, squares=29, actual abs=30, signed=-1.
  const m=forecastMetrics([[10,8],[20,24],[0,-3]])
  assert.equal(m.mae,3);assert.equal(m.wape,30);assert.equal(m.bias,-1/3)
  assert.equal(m.rmse,Math.sqrt(29/3))
  assert.equal(forecastMetrics([[0,5]]).wape,null)
})
test('hand-calculated pack purchase respects protected stock, budget and fulfillment',()=>{
  // Demand 10, stock 4 with 2 protected: buy two packs of four at ₱2.50.
  const result=solvePlanningScenario({acknowledged:true,checksum:'fixture',horizon:3,budget:5,minimum_pct:100,
    items:[{product:'A',demand:10,stock:4,reserve:2,pack:4,pack_cost:2.5,max_packs:2}]},
  {source:{checksum:'fixture'},scope:{sector:'Private',territory:'Quezon'},products:[{product:'A'}]})
  assert.equal(result.status,'scenario_allocation')
  assert.equal(result.spent,5);assert.equal(result.remaining,0)
  assert.equal(result.rows[0].purchase_units,8)
  assert.equal(result.rows[0].ending_stock,2)
  assert.equal(result.rows[0].fulfillment_pct,100)
})
