import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  computePvmDecomposition,
  computeHhi,
  buildSurgeInvestigationReport,
  ProductPriceVolume,
} from '../src/diagnosticAnalytics'

test('computePvmDecomposition accurately decomposes revenue change into Volume, Price, and Mix', () => {
  const items: ProductPriceVolume[] = [
    {
      product: 'Paracetamol 500mg',
      base_quantity: 1000,
      base_revenue: 5000,
      base_avg_price: 5.0,
      comp_quantity: 1500, // +500 qty
      comp_revenue: 9000,  // price = 6.0 (+1.0)
      comp_avg_price: 6.0,
    },
    {
      product: 'Amoxicillin 500mg',
      base_quantity: 500,
      base_revenue: 4000,
      base_avg_price: 8.0,
      comp_quantity: 400,  // -100 qty
      comp_revenue: 3200,  // price = 8.0 (flat)
      comp_avg_price: 8.0,
    },
  ]

  const pvm = computePvmDecomposition(items)
  assert.equal(pvm.base_revenue, 9000)
  assert.equal(pvm.comp_revenue, 12200)
  assert.equal(pvm.net_revenue_change, 3200)

  // Sum of volume + price + cross interaction must exactly equal net revenue change
  const sumEffects = pvm.volume_effect + pvm.price_effect + pvm.cross_interaction_effect
  assert.ok(Math.abs(sumEffects - pvm.net_revenue_change) < 0.001)

  // Paracetamol volume effect: (1500 - 1000) * 5.0 = 2500
  // Amoxicillin volume effect: (400 - 500) * 8.0 = -800
  // Total volume effect: 2500 - 800 = 1700
  assert.equal(pvm.volume_effect, 1700)

  // Paracetamol price effect: (6.0 - 5.0) * 1000 = 1000
  // Amoxicillin price effect: (8.0 - 8.0) * 500 = 0
  // Total price effect: 1000
  assert.equal(pvm.price_effect, 1000)

  // Paracetamol cross effect: (1500 - 1000) * (6.0 - 5.0) = 500
  // Amoxicillin cross effect: 0
  assert.equal(pvm.cross_interaction_effect, 500)
})

test('computeHhi classifies low, moderate, and high market concentration correctly', () => {
  // Diverse portfolio: 10 equal products of 10% each => HHI = 10 * 100 = 1000
  const low = computeHhi([10, 10, 10, 10, 10, 10, 10, 10, 10, 10])
  assert.equal(low.hhi, 1000)
  assert.equal(low.concentration_level, 'low')

  // Highly concentrated: 1 product with 60%, 4 with 10% => HHI = 3600 + 400 = 4000
  const high = computeHhi([60, 10, 10, 10, 10])
  assert.equal(high.hhi, 4000)
  assert.equal(high.concentration_level, 'high')
})

test('buildSurgeInvestigationReport categorizes epistemic findings strictly', () => {
  const pvm = computePvmDecomposition([
    {
      product: 'Item A',
      base_quantity: 100,
      base_revenue: 1000,
      base_avg_price: 10,
      comp_quantity: 200,
      comp_revenue: 2400,
      comp_avg_price: 12,
    },
  ])

  const report = buildSurgeInvestigationReport({
    baseRev: 1000,
    surgeRev: 2400,
    sectorRows: [
      { sector: 'Government', baseRev: 600, surgeRev: 1800 },
      { sector: 'Private', baseRev: 400, surgeRev: 600 },
    ],
    pvm,
    topDrivers: [{ product: 'Item A', deltaQ: 100, deltaRev: 1400 }],
  })

  assert.equal(report.growth_pesos, 1400)
  assert.equal(report.growth_percentage, 140)
  assert.ok(report.findings_ledger.some(f => f.category === 'CONFIRMED_FACT'))
  assert.ok(report.findings_ledger.some(f => f.category === 'ACCOUNTING_DELTA'))
  assert.ok(report.findings_ledger.some(f => f.category === 'UNVERIFIED_HYPOTHESIS'))
})
