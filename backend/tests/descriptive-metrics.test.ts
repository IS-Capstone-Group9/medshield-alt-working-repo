import assert from 'node:assert/strict'
import { test } from 'node:test'
import { revenueAbc, weightedMargin } from '../src/descriptiveMetrics'

test('ABC retains the crossing item and starts the next class after exact cutoffs', () => {
  assert.deepEqual([60, 80, 90, 95, 100].map((value,i) => revenueAbc(value, 100, [60,20,10,5,5][i])), ['A', 'A', 'B', 'B', 'C'])
  // A fourth-ranked product can still be A; the visible top list is not the denominator.
  assert.equal(revenueAbc(30, 100, 10), 'A')
  assert.equal(revenueAbc(30, 30, 30), 'A')
  assert.equal(revenueAbc(96, 100, 96), 'A')
  assert.equal(revenueAbc(100, 100, 4), 'C')
})

test('ABC with a zero or negative population is explicitly unclassified', () => {
  assert.equal(revenueAbc(0, 0, 0), 'Unclassified')
  assert.equal(revenueAbc(10, 100, 10, 1), 'Unclassified')
  assert.equal(revenueAbc(null, 100, 10), 'Unclassified')
  assert.equal(revenueAbc(100, 100, 0), 'Unclassified')
  assert.equal(revenueAbc(110, 100, 10), 'Unclassified')
})

test('margin denominator is revenue for margin-eligible rows, not total revenue', () => {
  assert.equal(weightedMargin(140, 700), 20)
  assert.equal(weightedMargin(-10, 100), -10)
  assert.equal(weightedMargin(0, 100), 0)
  assert.equal(weightedMargin(10, 0), null)
  assert.equal(weightedMargin(null, 100), null)
})
