import assert from 'node:assert/strict'
import { test } from 'node:test'
import { revenueAbc, weightedMargin } from '../src/descriptiveMetrics'

test('ABC uses cumulative contribution, including exact 80 and 95 percent boundaries', () => {
  assert.deepEqual([60, 80, 90, 95, 100].map(value => revenueAbc(value, 100)), ['A', 'A', 'B', 'B', 'C'])
  // A fourth-ranked product can still be A; the visible top list is not the denominator.
  assert.equal(revenueAbc(30, 100), 'A')
  assert.equal(revenueAbc(30, 30), 'C')
})

test('ABC with a zero or negative population is explicitly unclassified', () => {
  assert.equal(revenueAbc(0, 0), 'Unclassified')
  assert.equal(revenueAbc(10, 100, 1), 'Unclassified')
  assert.equal(revenueAbc(null, 100), 'Unclassified')
})

test('margin denominator is revenue for margin-eligible rows, not total revenue', () => {
  assert.equal(weightedMargin(140, 700), 20)
  assert.equal(weightedMargin(-10, 100), -10)
  assert.equal(weightedMargin(0, 100), 0)
  assert.equal(weightedMargin(10, 0), null)
  assert.equal(weightedMargin(null, 100), null)
})
