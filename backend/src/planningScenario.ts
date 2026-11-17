import { manilaMonth, monthLabel } from './forecastEvidence'

import {PlanningScenarioInputError,numeric,cents,minimumDemandUnits} from './planningInputs'
import {inventoryPolicyScenario} from './inventoryPolicyScenario'
import {planningWeights,planningPriority,allocateWeighted} from './weightedPlanning'
export {PlanningScenarioInputError} from './planningInputs'

type Shortlist = {
  source: { checksum: string }
  scope: { sector: string; territory: string }
  products: Array<{ product: string | null }>
}

/** Only closed Manila calendar months may rank historical planning evidence. */
export function planningHistoryClause(now = new Date()): string {
  return `AND month_start < DATE '${monthLabel(manilaMonth(now))}-01'`
}

/** Entered assumptions and a bounded greedy allocation; no optimality or procurement approval. */
export function solvePlanningScenario(body: Record<string, unknown>, shortlist: Shortlist) {
  if (body.acknowledged !== true) throw new PlanningScenarioInputError('Confirm that inputs are scenario assumptions for review')
  if (body.checksum !== shortlist.source.checksum) throw new PlanningScenarioInputError('Databricks source changed; reload the shortlist')
  const horizon = numeric(body.horizon, 'Planning horizon', 1, 12, true)
  if (![1, 3, 6, 12].includes(horizon)) throw new PlanningScenarioInputError('Unsupported planning horizon')
  const budgetCents = cents(body.budget, 'Budget', 0)
  const minimum = numeric(body.minimum_pct, 'Minimum fulfillment', 0, 100)
  const weights=planningWeights(body)
  const purchaseCapacity=body.purchase_capacity_units===undefined?null:numeric(body.purchase_capacity_units,'Purchase capacity',0,1_000_000_000,true)
  const capacityUnit=body.capacity_unit_label
  if(purchaseCapacity!==null&&(typeof capacityUnit!=='string'||!capacityUnit.trim()||capacityUnit.length>80||/[\u0000-\u001f]/.test(capacityUnit)))throw new PlanningScenarioInputError('Declare the shared purchase capacity unit')
  if(purchaseCapacity===null&&capacityUnit!==undefined)throw new PlanningScenarioInputError('Capacity unit requires explicit purchase capacity')
  const rawItems = body.items
  const expected = new Set(shortlist.products.map(row => row.product))
  if (!Array.isArray(rawItems) || !rawItems.length || rawItems.length > 5 || rawItems.length !== expected.size) {
    throw new PlanningScenarioInputError('Inputs must match every shortlisted product exactly once')
  }
  const seen = new Set<string>()
  const items = rawItems.map(raw => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new PlanningScenarioInputError('Invalid planning item')
    const row = raw as Record<string, unknown>
    const product = row.product
    if (typeof product !== 'string' || !expected.has(product) || seen.has(product)) {
      throw new PlanningScenarioInputError('Inputs must match every shortlisted product exactly once')
    }
    seen.add(product)
    if(purchaseCapacity!==null&&row.unit_label!==capacityUnit)throw new PlanningScenarioInputError('Capacity requires the same declared unit for every product')
    const demand = numeric(row.demand, 'Demand', 1, 1_000_000_000, true)
    const stock = numeric(row.stock, 'Stock', 0, 1_000_000_000, true)
    const reserve = numeric(row.reserve, 'Protected stock', 0, stock, true)
    const pack = numeric(row.pack, 'Units per pack', 1, 1_000_000_000, true)
    const packCost = cents(row.pack_cost, 'Pack cost', 0.01)
    const maxPacks = numeric(row.max_packs, 'Supplier limit', 0, 100_000, true)
    const inventory_policy=inventoryPolicyScenario(row,{stock,reserve,pack,pack_cost_cents:packCost,max_packs:maxPacks},budgetCents)
    const priority=planningPriority(row,weights)
    return { product, demand, stock, reserve, pack, pack_cost_cents: packCost, max_packs: maxPacks,inventory_policy,priority,
      available: stock - reserve, purchase_packs: 0, fulfilled: 0 }
  })
  if(weights&&items.every(item=>!item.priority?.composite_score))throw new PlanningScenarioInputError('At least one product must have a positive priority score')
  let remainingCents = budgetCents
  let remainingCapacity=purchaseCapacity??Infinity
  const conflicts: string[] = []
  for (const item of items) {
    const required = minimumDemandUnits(item.demand,minimum)
    const minimumPacks = Math.max(0, Math.ceil((required - item.available) / item.pack))
    if (minimumPacks > item.max_packs) conflicts.push(`${item.product}: supplier limit cannot meet minimum fulfillment`)
    // Compare before multiplying so an infeasible large request cannot overflow cents.
    if (minimumPacks > Math.floor(remainingCents / item.pack_cost_cents)) conflicts.push(`${item.product}: budget cannot meet minimum fulfillment`)
    if (minimumPacks > Math.floor(remainingCapacity/item.pack)) conflicts.push(`${item.product}: purchase capacity cannot meet minimum fulfillment`)
    if (!conflicts.length) {
      item.purchase_packs = minimumPacks
      remainingCents -= minimumPacks * item.pack_cost_cents
      remainingCapacity -= minimumPacks*item.pack
      item.fulfilled = Math.min(item.demand, item.available + minimumPacks * item.pack)
    }
  }
  if (conflicts.length) return { status: 'infeasible', conflicts, rows: [] }
  let optimization:ReturnType<typeof allocateWeighted>|null=null
  if(weights){optimization=allocateWeighted(items,remainingCents,25000,purchaseCapacity??undefined);remainingCents=optimization.remaining_cents;remainingCapacity=(purchaseCapacity??Infinity)-items.reduce((sum,item)=>sum+item.purchase_packs*item.pack,0)}
  const candidates = () => items
    .filter(item => item.fulfilled < item.demand && item.purchase_packs < item.max_packs && item.pack_cost_cents <= remainingCents && item.pack<=remainingCapacity)
    .sort((left, right) => left.fulfilled / left.demand - right.fulfilled / right.demand || left.product.localeCompare(right.product))
  for (let step = 0; !weights && step < 100_000; step += 1) {
    const item = candidates()[0]
    if (!item) break
    item.purchase_packs += 1
    remainingCents -= item.pack_cost_cents
    remainingCapacity -= item.pack
    item.fulfilled = Math.min(item.demand, item.available + item.purchase_packs * item.pack)
  }
  if (!weights && candidates().length) {
    return { status: 'not_solved', conflicts: ['Scenario allocation reached the computation limit; reduce the pack counts or narrow the scenario'], rows: [] }
  }
  const rows = items.map(item => {
    const purchaseUnits = item.purchase_packs * item.pack
    const capacity=item.inventory_policy?.feasibility.gross_demand_capacity_before_expiry_units??null
    const shelfReview=capacity===null?'Shelf-life screen unavailable; enter usable days after receipt':purchaseUnits>capacity?'Scenario purchase exceeds gross entered demand capacity before expiry; revise lot or inputs':'Scenario purchase does not exceed the gross demand ceiling; competing stock and batch dates still need review'
    const baselineFulfilled = Math.min(item.demand, item.available)
    const additionalFulfilled = item.fulfilled - baselineFulfilled
    const gapReasons = item.fulfilled >= item.demand ? [] : [
      item.purchase_packs >= item.max_packs ? 'Supplier cap reached' : '',
      item.purchase_packs < item.max_packs && item.pack_cost_cents > remainingCents ? 'Remaining budget cannot afford the next pack' : '',
      item.purchase_packs<item.max_packs&&item.pack>remainingCapacity?'Remaining purchase capacity cannot fit the next pack':'',
      weights&&item.purchase_packs<item.max_packs&&item.pack_cost_cents<=remainingCents&&item.pack<=remainingCapacity?'Not purchased by weighted objective; review scores and proof status':'',
    ].filter(Boolean)
    return { ...item, purchase_units: purchaseUnits, unmet: item.demand - item.fulfilled,
      expiry_screen:{status:capacity===null?'unavailable':purchaseUnits>capacity?'exceeds_gross_capacity':'within_gross_capacity_not_verified',purchase_units:purchaseUnits,gross_demand_capacity_units:capacity,review:shelfReview,allocation_constrained_by_expiry:false,expiry_outcome_measured:false},
      fulfillment_pct: item.fulfilled / item.demand * 100, spend: item.purchase_packs * item.pack_cost_cents / 100,
      ending_stock: item.stock + purchaseUnits - item.fulfilled,
      baseline_fulfilled: baselineFulfilled, baseline_unmet: item.demand - baselineFulfilled,
      baseline_fulfillment_pct: baselineFulfilled / item.demand * 100,
      additional_fulfilled: additionalFulfilled, additional_fulfillment_pct: additionalFulfilled / item.demand * 100,
      purchased_units_not_needed_for_entered_demand: purchaseUnits - additionalFulfilled,
      unmet_reasons: gapReasons,
      binding: [item.fulfilled === item.demand ? 'Demand satisfied' : '', item.purchase_packs === item.max_packs ? 'Supplier cap' : ''].filter(Boolean) }
  })
  const spentCents = budgetCents - remainingCents
  const meanBaseline = rows.reduce((sum, row) => sum + row.baseline_fulfillment_pct, 0) / rows.length
  const meanFulfillment = rows.reduce((sum, row) => sum + row.fulfillment_pct, 0) / rows.length
  return { status: 'scenario_allocation', rows, budget: budgetCents / 100, spent: spentCents / 100, remaining: remainingCents / 100,
    mean_fulfillment_pct: meanFulfillment, baseline_mean_fulfillment_pct: meanBaseline,
    additional_mean_fulfillment_pp: meanFulfillment - meanBaseline,
    allocation_stop_reasons: rows.every(row => row.unmet === 0) ? ['All entered demand covered'] : [...new Set(rows.flatMap(row => row.unmet_reasons))],
    budget_binding: remainingCents === 0,optimization,
    purchase_capacity:purchaseCapacity===null?null:{units:purchaseCapacity,unit_label:capacityUnit,used_units:purchaseCapacity-remainingCapacity,remaining_units:remainingCapacity,evidence_label:'Assumed',physical_storage_verified:false},
    assumptions: { horizon, minimum_pct: minimum, scope: shortlist.scope, checksum: body.checksum,
      objective: weights?'Maximize entered-priority-weighted product fulfillment':'Balance product fulfillment under entered scenario constraints',
      method: weights?'mcda_integer_pack_branch_bound_v1':'bounded_greedy_fulfillment_v1',weights,
      comparison_policy: 'entered_stock_only_no_new_purchases_v1',
      operational_inputs_verified: false, procurement_execution_approved: false, expiry_outcome_measured: false,
      status: 'Scenario only; Databricks supplies historical shortlist evidence' } }
}
