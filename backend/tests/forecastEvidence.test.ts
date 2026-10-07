import assert from 'node:assert/strict'
import test from 'node:test'
import {benchmarkPrediction, benchmarkView, commonEvaluationKeys, forecastMetrics, manilaMonth, monthIndex, reconciledPages} from '../src/forecastEvidence'

test('fixed origin last value and means never consume held-out actuals', () => {
  const series = new Map(Array.from({length: 36}, (_, i) => [i, i + 1]))
  const before = benchmarkView(series, 35, 3, 'company', 'net_sales', 44)
  series.set(33, 999999)
  series.set(34, -999999)
  const after = benchmarkView(series, 35, 3, 'company', 'net_sales', 44)
  assert.deepEqual(before.models.last_value.backtest.map(p => p.prediction), [33, 33, 33])
  assert.deepEqual(after.models.last_value.backtest.map(p => p.prediction), [33, 33, 33])
  assert.deepEqual(after.models.recent_mean_3.backtest.map(p => p.prediction), [32, 32, 32])
  assert.deepEqual(after.models.last_value.backtest.map(p => p.lead), [1, 2, 3])
  assert.equal(new Set(after.models.last_value.backtest.map(p => p.origin)).size, 1)
})
test('seasonal naive recurs only to origin-known matching calendar months', () => {
  const series = new Map([[0, 20], [12, 40], [24, 999]])
  assert.equal(benchmarkPrediction(series, 12, 24, 'seasonal_naive'), 40)
  assert.equal(benchmarkPrediction(series, 12, 36, 'seasonal_naive'), 40)
  assert.equal(benchmarkPrediction(series, 12, 25, 'seasonal_naive'), null)
  assert.equal(benchmarkPrediction(series, 12, 13, 'recent_mean_3'), null)
})
test('common observations intersect exact keys, not minimum counts', () => {
  const p = (period: string, origin = '2024-12') => ({series: 'company', target: 'net_sales', origin, period, lead: 1, actual: 0, prediction: 0})
  assert.deepEqual(commonEvaluationKeys([{backtest: [p('2025-01')]}, {backtest: [p('2025-02')]}]), [])
  assert.deepEqual(commonEvaluationKeys([{backtest: [p('2025-01')]}, {backtest: [p('2025-01', '2024-11')]}]), [])
  assert.equal(commonEvaluationKeys([{backtest: [p('2025-01')]}, {backtest: [p('2025-01')]}]).length, 1)
})
test('metrics preserve signed returns and unavailable denominators', () => {
  const m = forecastMetrics([[100, 110], [-50, -40]])
  assert.equal(m.mae, 10); assert.equal(m.rmse, 10); assert.equal(m.bias, 10)
  assert.equal(m.wape, 20 / 150 * 100); assert.equal(m.normalized_bias, 20 / 150 * 100)
  assert.equal(forecastMetrics([[0, 0]]).wape, null)
  assert.equal(forecastMetrics([]).mae, null)
})
test('Manila rollover and stale display use true lead; unsupported future stays unavailable', () => {
  assert.equal(manilaMonth(new Date('2030-12-31T16:00:00Z')), monthIndex('2031-01'))
  const origin = monthIndex('2025-12')
  const view = benchmarkView(new Map([[origin, 0]]), origin, 12, 'company', 'net_sales', monthIndex('2026-09'))
  assert.equal(view.models.last_value.forecast[0].lead, 9)
  assert.equal(view.models.last_value.forecast[11].lead, 20)
  assert.ok(view.models.last_value.forecast.every(p => p.prediction === null && p.lower === null && p.missing_reason === 'unpublished_forecast'))
})
test('bounded extraction handles more than 150 months and rejects truncation/duplicates', async () => {
  const source = Array.from({length: 241}, (_, i) => ({id: String(i)}))
  assert.deepEqual(await reconciledPages(source.length, async (offset, size) => source.slice(offset, offset + size), row => row.id), source)
  await assert.rejects(reconciledPages(241, async () => [], row => String(row)), /Incomplete/)
  await assert.rejects(reconciledPages(2, async () => [{id: 'x'}, {id: 'x'}], row => row.id), /uniqueness/)
})
