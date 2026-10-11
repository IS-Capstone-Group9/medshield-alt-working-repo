import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateEoq,
  calculateRop,
  calculateExpirySafeCap,
  getZScore,
  PRESET_SCENARIOS,
} from '../src/prescriptiveEngine'

test('calculateEoq accurately balances setup and holding costs', () => {
  // D = 10,000 units/year, S = ₱500/order, H = ₱10/unit/year
  // EOQ = sqrt(2 * 10000 * 500 / 10) = sqrt(1,000,000) = 1000 units
  const res = calculateEoq({
    annual_demand: 10000,
    order_cost: 500,
    holding_cost_per_unit: 10,
  })

  assert.equal(res.eoq_units, 1000)
  assert.equal(res.recommended_orders_per_year, 10)
  assert.equal(res.annual_ordering_cost, 5000)
  assert.equal(res.annual_holding_cost, 5000)
  assert.equal(res.total_inventory_cost, 10000)
})

test('calculateRop incorporates both demand volatility and lead time variance', () => {
  // Monthly demand = 1000 units, std_dev = 200 units
  // Lead time = 0.5 months (15 days), lead time std dev = 0.1 months
  // Service level = 95% -> Z = 1.65
  const res = calculateRop({
    monthly_demand: 1000,
    demand_std_dev: 200,
    lead_time_months: 0.5,
    lead_time_std_dev: 0.1,
    service_level_pct: 95,
  })

  assert.equal(res.z_score, 1.65)
  assert.equal(res.lead_time_demand, 500)
  assert.ok(res.safety_stock > 0)
  assert.equal(res.reorder_point, res.lead_time_demand + res.safety_stock)
})

test('calculateRop increases safety stock when surge multiplier is applied', () => {
  const normal = calculateRop({
    monthly_demand: 1000,
    demand_std_dev: 200,
    lead_time_months: 1.0,
    lead_time_std_dev: 0.1,
    service_level_pct: 95,
    surge_multiplier: 1.0,
  })

  const surge = calculateRop({
    monthly_demand: 1000,
    demand_std_dev: 200,
    lead_time_months: 1.0,
    lead_time_std_dev: 0.1,
    service_level_pct: 99,
    surge_multiplier: 1.45,
  })

  assert.ok(surge.safety_stock > normal.safety_stock)
  assert.ok(surge.reorder_point > normal.reorder_point)
})

test('calculateExpirySafeCap bounds procurement to prevent dead-stock accumulation', () => {
  // 500 units/month, 12 months shelf life, pack size 50 units
  // Consumable capacity = 6000 units. With 5% loss ceiling, safe max = 5700 units = 114 packs.
  const cap = calculateExpirySafeCap({
    monthly_demand: 500,
    shelf_life_months: 12,
    pack_size: 50,
    target_max_loss_pct: 5.0,
  })

  assert.equal(cap.safe_max_units, 5700)
  assert.equal(cap.safe_max_packs, 114)
  assert.ok(cap.projected_loss_rate_pct <= 5.0)
})

test('PRESET_SCENARIOS defines the four required core operational profiles', () => {
  assert.equal(PRESET_SCENARIOS.length, 4)
  const ids = PRESET_SCENARIOS.map(s => s.id)
  assert.ok(ids.includes('baseline'))
  assert.ok(ids.includes('monsoon_surge'))
  assert.ok(ids.includes('logistics_delay'))
  assert.ok(ids.includes('budget_cut'))
})
