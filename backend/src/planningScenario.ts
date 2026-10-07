import { manilaMonth, monthLabel } from './forecastEvidence'

export class PlanningScenarioInputError extends Error {}

type Shortlist = {
  source: { checksum: string }
  scope: { sector: string; territory: string }
  products: Array<{ product: string | null }>
}

function numeric(value: unknown, label: string, minimum: number, maximum: number, integer = false): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) {
    throw new PlanningScenarioInputError(`${label} is required and must be numeric`)
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum || (integer && !Number.isSafeInteger(parsed))) {
    throw new PlanningScenarioInputError(`${label} must be ${integer ? 'an integer' : 'a number'} from ${minimum} to ${maximum}`)
  }
  return parsed
}

function cents(value: unknown, label: string, minimum: number): number {
  numeric(value, label, minimum, 1_000_000_000)
  const text = String(value).trim()
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(text)
  if (!match || !(match[2] || match[3])) throw new PlanningScenarioInputError(`${label} must be numeric`)
  const digits = (match[2] + (match[3] || '')).replace(/^0+/, '') || '0'
  if (digits === '0') return 0
  const decimals = (match[3]?.length || 0) - Number(match[4] || 0)
  // Valid finite amounts within the bound cannot require arbitrarily large powers.
  if (digits.length > 100 || !Number.isSafeInteger(decimals) || Math.abs(decimals) > 100) {
    throw new PlanningScenarioInputError(`${label} has unsupported precision`)
  }
  const mantissa = BigInt(digits)
  const scale = BigInt(Math.abs(2 - decimals))
  const factor = 10n ** scale
  if (decimals > 2 && mantissa % factor !== 0n) {
    throw new PlanningScenarioInputError(`${label} must have at most two decimal places`)
  }
  const exact = decimals > 2 ? mantissa / factor : mantissa * factor
  const result = Number(exact)
  if (!Number.isSafeInteger(result)) throw new PlanningScenarioInputError(`${label} exceeds safe currency arithmetic`)
  return result
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
    const demand = numeric(row.demand, 'Demand', 1, 1_000_000_000, true)
    const stock = numeric(row.stock, 'Stock', 0, 1_000_000_000, true)
    const reserve = numeric(row.reserve, 'Protected stock', 0, stock, true)
    const pack = numeric(row.pack, 'Units per pack', 1, 1_000_000_000, true)
    const packCost = cents(row.pack_cost, 'Pack cost', 0.01)
    const maxPacks = numeric(row.max_packs, 'Supplier limit', 0, 100_000, true)
    return { product, demand, stock, reserve, pack, pack_cost_cents: packCost, max_packs: maxPacks,
      available: stock - reserve, purchase_packs: 0, fulfilled: 0 }
  })
  let remainingCents = budgetCents
  const conflicts: string[] = []
  for (const item of items) {
    const required = Math.ceil(item.demand * minimum / 100)
    const minimumPacks = Math.max(0, Math.ceil((required - item.available) / item.pack))
    if (minimumPacks > item.max_packs) conflicts.push(`${item.product}: supplier limit cannot meet minimum fulfillment`)
    // Compare before multiplying so an infeasible large request cannot overflow cents.
    if (minimumPacks > Math.floor(remainingCents / item.pack_cost_cents)) conflicts.push(`${item.product}: budget cannot meet minimum fulfillment`)
    if (!conflicts.length) {
      item.purchase_packs = minimumPacks
      remainingCents -= minimumPacks * item.pack_cost_cents
      item.fulfilled = Math.min(item.demand, item.available + minimumPacks * item.pack)
    }
  }
  if (conflicts.length) return { status: 'infeasible', conflicts, rows: [] }
  const candidates = () => items
    .filter(item => item.fulfilled < item.demand && item.purchase_packs < item.max_packs && item.pack_cost_cents <= remainingCents)
    .sort((left, right) => left.fulfilled / left.demand - right.fulfilled / right.demand || left.product.localeCompare(right.product))
  for (let step = 0; step < 100_000; step += 1) {
    const item = candidates()[0]
    if (!item) break
    item.purchase_packs += 1
    remainingCents -= item.pack_cost_cents
    item.fulfilled = Math.min(item.demand, item.available + item.purchase_packs * item.pack)
  }
  if (candidates().length) {
    return { status: 'not_solved', conflicts: ['Scenario allocation reached the computation limit; reduce the pack counts or narrow the scenario'], rows: [] }
  }
  const rows = items.map(item => {
    const purchaseUnits = item.purchase_packs * item.pack
    return { ...item, purchase_units: purchaseUnits, unmet: item.demand - item.fulfilled,
      fulfillment_pct: item.fulfilled / item.demand * 100, spend: item.purchase_packs * item.pack_cost_cents / 100,
      ending_stock: item.stock + purchaseUnits - item.fulfilled,
      binding: [item.fulfilled === item.demand ? 'Demand satisfied' : '', item.purchase_packs === item.max_packs ? 'Supplier cap' : ''].filter(Boolean) }
  })
  const spentCents = budgetCents - remainingCents
  return { status: 'scenario_allocation', rows, budget: budgetCents / 100, spent: spentCents / 100, remaining: remainingCents / 100,
    mean_fulfillment_pct: rows.reduce((sum, row) => sum + row.fulfillment_pct, 0) / rows.length,
    budget_binding: remainingCents === 0,
    assumptions: { horizon, minimum_pct: minimum, scope: shortlist.scope, checksum: body.checksum,
      objective: 'Balance product fulfillment under entered scenario constraints',
      status: 'Scenario only; Databricks supplies historical shortlist evidence' } }
}
