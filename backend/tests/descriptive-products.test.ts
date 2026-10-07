import assert from 'node:assert/strict'
import { test } from 'node:test'
import { descriptivePortfolio } from '../../frontend/services/api/descriptive-products'

test('full population determines ABC before cohort selection', () => {
  const result = descriptivePortfolio([60, 20, 10, 5, 5].map((revenue, i) => ({ product: `Product ${i}`, revenue, period: '2025-01' })))
  assert.deepEqual(result.products.map(row => row.abc), ['A', 'A', 'B', 'B', 'C'])
  assert.equal(result.products.slice(0, 1)[0].share, 60)
  assert.equal(result.products.at(-1)?.cumulativeShare, 100)
})

test('negative revenue stays in totals and holds cumulative classification', () => {
  const result = descriptivePortfolio([{ product: 'Sale', revenue: 100 }, { product: 'Credit', revenue: -10 }])
  assert.equal(result.revenue, 90)
  assert.equal(result.negativeProducts, 1)
  assert.ok(result.products.every(row => row.abc === 'Unclassified'))
})

test('estimates are excluded; absent revenue is not observed zero', () => {
  const result = descriptivePortfolio([
    { product: 'Estimate', revenue: 1000, evidence: 'estimate' },
    { product: 'Unknown', revenue: null },
    { product: 'Observed zero', revenue: 0, period: '2025-01' },
  ])
  assert.equal(result.estimatedRows, 1)
  assert.equal(result.unavailableRows, 1)
  assert.equal(result.products.length, 1)
  assert.equal(result.products[0].observedMonths, 1)
})


test('candidate ABC ranks positive sales without concealing returns', () => {
  const result = descriptivePortfolio([
    {product:'A', revenue:-20,positive_sales:100,returns_value:-120},
    {product:'B', revenue:50,positive_sales:50,returns_value:0},
    {product:'Return only', revenue:-10,positive_sales:0,returns_value:-10},
  ], 'positive_sales_candidate')
  assert.equal(result.revenue,20)
  assert.equal(result.contributionTotal,150)
  assert.equal(result.products[0].name,'A')
  assert.equal(result.products[0].abc,'A')
  assert.equal(result.products[2].abc,'Unclassified')
  assert.equal(result.products[0].returnsValue,-120)
})
test('candidate ABC cannot infer gross sales from a net aggregate', () => {
  const result = descriptivePortfolio([{product:'A',revenue:100}], 'positive_sales_candidate')
  assert.equal(result.abcAvailable,false)
})
