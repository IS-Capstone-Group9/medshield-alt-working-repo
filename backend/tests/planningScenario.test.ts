import assert from 'node:assert/strict'
import test from 'node:test'
import { planningHistoryClause, solvePlanningScenario } from '../src/planningScenario'

function fixture() {
  const shortlist = { source: { checksum: 'controlled' }, scope: { sector: 'All', territory: 'all' }, products: [{ product: 'A' }, { product: 'B' }] }
  const body = { acknowledged: true, checksum: 'controlled', horizon: 3, budget: 100, minimum_pct: 0,
    items: ['A', 'B'].map(product => ({ product, demand: 10, stock: 0, reserve: 0, pack: 1, pack_cost: 1, max_packs: 10 })) }
  return { shortlist, body }
}

test('missing, blank and Boolean scenario values cannot become zero assumptions', () => {
  for (const value of [undefined, null, '', ' ', false, true, [], {}]) {
    for (const field of ['stock', 'reserve', 'max_packs', 'pack_cost'] as const) {
      const { shortlist, body } = fixture()
      ;(body.items[0] as Record<string, unknown>)[field] = value
      assert.throws(() => solvePlanningScenario(body, shortlist), /required|must be/)
    }
    for (const field of ['budget', 'minimum_pct'] as const) {
      const { shortlist, body } = fixture()
      ;(body as Record<string, unknown>)[field] = value
      assert.throws(() => solvePlanningScenario(body, shortlist), /required|must be/)
    }
  }
  const { shortlist, body } = fixture()
  body.budget = 0
  assert.equal(solvePlanningScenario(body, shortlist).status, 'scenario_allocation')
  ;(body.items[0] as Record<string, unknown>).stock = '0'
  assert.equal(solvePlanningScenario(body, shortlist).status, 'scenario_allocation')
})

test('each shortlisted product must occur exactly once, independent of order', () => {
  const { shortlist, body } = fixture()
  body.items[1].product = 'A'
  assert.throws(() => solvePlanningScenario(body, shortlist), /exactly once/)
  body.items[1].product = 'C'
  assert.throws(() => solvePlanningScenario(body, shortlist), /exactly once/)
  body.items[1].product = 'B'
  body.items.reverse()
  assert.equal(solvePlanningScenario(body, shortlist).status, 'scenario_allocation')
  body.items.pop()
  assert.throws(() => solvePlanningScenario(body, shortlist), /exactly once/)
})

test('currency retains exact cents and rejects fractional cents including exponent strings', () => {
  for (const value of [1.001, '1.001', '0.001', '1e-3', '1.00000000000000001']) {
    const { shortlist, body } = fixture()
    ;(body as Record<string, unknown>).budget = value
    assert.throws(() => solvePlanningScenario(body, shortlist), /two decimal/)
  }
  const { shortlist, body } = fixture()
  body.budget = 0.3
  body.items[0].pack_cost = 0.1
  body.items[1].pack_cost = 0.2
  const result = solvePlanningScenario(body, shortlist)
  assert.equal(result.status, 'scenario_allocation')
  assert.equal(result.spent, 0.3)
  assert.equal(result.remaining, 0)
})

test('large infeasible money requests do not multiply beyond safe integer cents', () => {
  const { shortlist, body } = fixture()
  body.budget = 1_000_000_000
  body.minimum_pct = 100
  body.items[0].demand = 1_000_000_000
  body.items[0].pack_cost = 1_000_000_000
  assert.equal(solvePlanningScenario(body, shortlist).status, 'infeasible')
})

test('computation exhaustion returns no fabricated completed allocation', () => {
  const { shortlist, body } = fixture()
  shortlist.products = ['A', 'B', 'C', 'D', 'E'].map(product => ({ product }))
  body.items = shortlist.products.map(({ product }) => ({ product, demand: 100_000, stock: 0, reserve: 0, pack: 1, pack_cost: 1, max_packs: 100_000 }))
  body.budget = 500_000
  const result = solvePlanningScenario(body, shortlist)
  assert.equal(result.status, 'not_solved')
  assert.deepEqual(result.rows, [])
  assert.match(result.conflicts![0], /computation limit/)
})

test('the exact iteration boundary may complete successfully', () => {
  const { shortlist, body } = fixture()
  body.items[0].demand = body.items[0].max_packs = 100_000
  body.items[1].stock = 10
  body.budget = 100_000
  const result = solvePlanningScenario(body, shortlist)
  assert.equal(result.status, 'scenario_allocation')
  assert.equal(result.mean_fulfillment_pct, 100)
})

test('minimum service, protected stock and stale input checks retain scenario behavior', () => {
  const { shortlist, body } = fixture()
  body.budget = 0
  body.items[0].stock = 10
  body.items[0].reserve = 3
  const result = solvePlanningScenario(body, shortlist)
  assert.equal(result.rows[0].fulfilled, 7)
  assert.equal(result.rows[0].ending_stock, 3)
  body.minimum_pct = 100
  assert.equal(solvePlanningScenario(body, shortlist).status, 'infeasible')
  body.checksum = 'stale'
  assert.throws(() => solvePlanningScenario(body, shortlist), /source changed/)
})

test('shortlist evidence excludes the current open and all future Manila months', () => {
  assert.equal(planningHistoryClause(new Date('2026-10-07T00:00:00Z')), "AND month_start < DATE '2026-10-01'")
  assert.equal(planningHistoryClause(new Date('2026-09-30T16:00:00Z')), "AND month_start < DATE '2026-10-01'")
  assert.equal(planningHistoryClause(new Date('2026-12-31T16:00:00Z')), "AND month_start < DATE '2027-01-01'")
})
