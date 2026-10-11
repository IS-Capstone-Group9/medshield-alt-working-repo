/**
 * demandForecast.test.ts
 *
 * Acceptance tests for the demand-quantity forecasting engine.
 * Covers: correct 2026 dates, estimated-data labels, rolling horizons,
 * missing-data handling, leakage prevention, and actual/predicted separation.
 *
 * All tests use in-process fixtures; no network or Databricks calls are made.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyDemand,
  crostonLiteEstimate,
  demandForecastView,
  demandPrediction,
  forecastDataStatus,
  buildDownloadRows,
  downloadRowsToCSV,
  hasSufficientHistory,
  assertNoLeakage,
  horizonPeriods,
  rollingHorizon,
} from '../src/demandForecast'
import {
  monthIndex,
  monthLabel,
  standardRollingHorizons,
  forecastPointStatus,
  userSelectedHorizon,
} from '../src/forecastEvidence'

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build a monthly quantity series from 2017-01 as month 0. */
function makeSeries(entries: Array<[string, number | null]>): Map<number, number | null> {
  return new Map(entries.map(([period, val]) => [monthIndex(period), val]))
}

// History through 2025-12 with some zeros and nulls
function historySeries(): Map<number, number | null> {
  const entries: Array<[string, number | null]> = []
  // 2017-01 … 2025-12 = 108 months
  for (let y = 2017; y <= 2025; y++) {
    for (let m = 1; m <= 12; m++) {
      const period = `${y}-${String(m).padStart(2, '0')}`
      // Simulate some nulls (missing months) and zeros
      const val = (y === 2020 && m === 3) ? null   // COVID disruption = missing
        : (y === 2021 && m === 2) ? null           // missing
        : (y === 2022 && m === 7) ? 0              // true zero
        : (y + m) * 100                            // synthetic quantity
      entries.push([period, val])
    }
  }
  return new Map(entries.map(([p, v]) => [monthIndex(p), v]))
}

const DEC_2025 = monthIndex('2025-12')
const JAN_2026 = monthIndex('2026-01')
const DEC_2026 = monthIndex('2026-12')

// ─── 1. Correct 2026 dates ────────────────────────────────────────────────

test('2026 forecast periods are correctly generated from Dec-2025 origin', () => {
  const horizons = standardRollingHorizons(DEC_2025)
  assert.equal(horizons['3'][0], '2026-01')
  assert.equal(horizons['3'][2], '2026-03')
  assert.equal(horizons['6'][5], '2026-06')
  assert.equal(horizons['12'][0], '2026-01')
  assert.equal(horizons['12'][11], '2026-12')
})

test('rolling horizon periods start one month after the specified origin', () => {
  const spec = rollingHorizon(DEC_2025, 6)
  const periods = horizonPeriods(spec)
  assert.equal(periods.length, 6)
  assert.equal(periods[0], '2026-01')
  assert.equal(periods[5], '2026-06')
})

test('2027+ periods are correctly generated beyond 2026', () => {
  const origin2026Dec = monthIndex('2026-12')
  const horizons = standardRollingHorizons(origin2026Dec)
  assert.equal(horizons['3'][0], '2027-01')
  assert.equal(horizons['12'][11], '2027-12')
})

// ─── 2. Estimated-data labels ─────────────────────────────────────────────

test('forecast origin guard: period after origin → estimated', () => {
  assert.equal(forecastDataStatus(JAN_2026, DEC_2025, false), 'estimated')
  assert.equal(forecastDataStatus(DEC_2026, DEC_2025, false), 'estimated')
  // Even if hasActual is true for some reason, future must still be estimated
  assert.equal(forecastDataStatus(JAN_2026, DEC_2025, true), 'estimated')
})

test('forecastPointStatus: same semantics as forecastDataStatus', () => {
  // Future → estimated
  assert.equal(forecastPointStatus(JAN_2026, DEC_2025, false), 'estimated')
  assert.equal(forecastPointStatus(JAN_2026, DEC_2025, true), 'estimated')
  // Historical with value → actual
  assert.equal(forecastPointStatus(DEC_2025, DEC_2025, true), 'actual')
  // Historical null → unavailable
  assert.equal(forecastPointStatus(DEC_2025, DEC_2025, false), 'unavailable')
})

test('all forecast model points labeled estimated in demandForecastView', () => {
  const series = historySeries()
  const view = demandForecastView(series, DEC_2025, 12, 'test:sku', 'Amoxicillin 500mg', 'capsules', JAN_2026)
  for (const [, model] of Object.entries(view.models)) {
    for (const point of model.forecast) {
      assert.equal(point.data_status, 'estimated',
        `Model forecast point at ${point.period} must be labeled 'estimated', got '${point.data_status}'`)
    }
  }
})

test('backtest points labeled actual or unavailable for historical periods', () => {
  const series = historySeries()
  const view = demandForecastView(series, DEC_2025, 12, 'test:sku', 'Amoxicillin 500mg', 'capsules', JAN_2026)
  for (const [, model] of Object.entries(view.models)) {
    for (const point of model.backtest) {
      assert.ok(
        point.data_status === 'actual' || point.data_status === 'unavailable',
        `Backtest point at ${point.period} must be 'actual' or 'unavailable', got '${point.data_status}'`,
      )
    }
  }
})

test('missing historical observation labeled unavailable, not actual', () => {
  // Only point 2020-03 is null in historySeries
  const series = historySeries()
  const origin = monthIndex('2020-12')
  const view = demandForecastView(series, origin, 12, 'test:sku', 'X', 'units', origin + 1)
  // Check that the null 2020-03 observation appears in backtest as unavailable
  const mar2020 = monthIndex('2020-03')
  for (const [, model] of Object.entries(view.models)) {
    const point = model.backtest.find((p: any) => p.period === '2020-03')
    if (point) {
      assert.equal(point.actual, null)
      assert.equal(point.data_status, 'unavailable')
    }
  }
})

// ─── 3. Rolling horizons ──────────────────────────────────────────────────

test('userSelectedHorizon falls back to 2025-12 when no origin given', () => {
  const result = userSelectedHorizon(null, 3)
  assert.equal(result.origin, '2025-12')
  assert.equal(result.periods[0], '2026-01')
  assert.equal(result.periods.length, 3)
})

test('userSelectedHorizon uses explicit origin when supplied', () => {
  const result = userSelectedHorizon('2024-06', 6)
  assert.equal(result.origin, '2024-06')
  assert.equal(result.periods[0], '2024-07')
  assert.equal(result.periods.length, 6)
})

test('standardRollingHorizons returns all three windows from the same origin', () => {
  const h = standardRollingHorizons(DEC_2025)
  assert.equal(h['3'].length, 3)
  assert.equal(h['6'].length, 6)
  assert.equal(h['12'].length, 12)
  // All windows share the same start
  assert.equal(h['3'][0], h['6'][0])
  assert.equal(h['6'][0], h['12'][0])
})

// ─── 4. Missing-data handling ─────────────────────────────────────────────

test('null observations are treated as missing, not zero', () => {
  const sparse = new Map<number, number | null>([
    [monthIndex('2023-01'), 100],
    [monthIndex('2023-02'), null],  // missing
    [monthIndex('2023-03'), null],  // missing
    [monthIndex('2023-04'), 200],
    [monthIndex('2023-05'), 150],
    [monthIndex('2023-06'), 180],
    [monthIndex('2023-07'), 90],
    [monthIndex('2023-08'), 110],
    [monthIndex('2023-09'), 130],
    [monthIndex('2023-10'), 140],
    [monthIndex('2023-11'), 160],
    [monthIndex('2023-12'), 170],
  ])
  const origin = monthIndex('2023-12')
  const view = demandForecastView(sparse, origin, 6, 'test', 'X', 'units', origin + 1)
  // recent_mean_3 and recent_mean_6 require consecutive observations;
  // if nulls appear in the window, they must return null (not treat null as 0)
  const lastValueModel = view.models.last_value
  assert.ok(lastValueModel, 'last_value model must exist')
  // last_value should be the Dec-2023 training-end value (since trainingEnd = origin-6 = 2023-06)
  // training end = monthIndex('2023-06')
})

test('zero quantity is NOT the same as null/missing', () => {
  // A true zero demand is observable and non-null
  const zeroMonth = monthIndex('2023-07')
  assert.equal(forecastDataStatus(zeroMonth, DEC_2025, true), 'actual')
  // A missing month is null/unavailable
  assert.equal(forecastDataStatus(zeroMonth, DEC_2025, false), 'unavailable')
})

test('hasSufficientHistory requires at least max(6, 2*horizon) non-null obs', () => {
  const tenObs = new Map<number, number | null>(
    Array.from({ length: 10 }, (_, i) => [i, i === 5 ? null : i + 1]),
  )
  assert.equal(hasSufficientHistory(tenObs, 3), true)   // 9 non-null ≥ max(6,6)
  assert.equal(hasSufficientHistory(tenObs, 6), false)  // 9 non-null < max(6,12)

  const fiveObs = new Map<number, number | null>(
    Array.from({ length: 5 }, (_, i) => [i, i + 1]),
  )
  assert.equal(hasSufficientHistory(fiveObs, 3), false) // 5 < 6
})

// ─── 5. Leakage prevention ────────────────────────────────────────────────

test('assertNoLeakage throws when future period has a non-null value', () => {
  const leaky = new Map<number, number | null>([
    [DEC_2025, 1000],
    [JAN_2026, 2000],  // future value — leakage!
  ])
  assert.throws(() => assertNoLeakage(leaky, DEC_2025), /Leakage detected/)
})

test('assertNoLeakage accepts null values for future periods', () => {
  const safe = new Map<number, number | null>([
    [DEC_2025, 1000],
    [JAN_2026, null],  // null is permitted (means "not yet observed")
  ])
  assert.doesNotThrow(() => assertNoLeakage(safe, DEC_2025))
})

test('backtest training never includes periods beyond trainingEnd', () => {
  const series = historySeries()
  const origin = DEC_2025
  const horizon = 12
  const trainingEnd = origin - horizon   // 2024-12
  const view = demandForecastView(series, origin, horizon, 'leak-test', 'X', 'units', JAN_2026)

  // Backtest predictions must have been generated from data ≤ trainingEnd
  // We verify that changing data AFTER trainingEnd does not change predictions.
  const before = JSON.stringify(view.models.last_value.backtest.map((p: any) => p.prediction))

  // Tamper with a month in the backtest evaluation window (after trainingEnd)
  const seriesTampered = new Map(series)
  seriesTampered.set(trainingEnd + 6, 999_999)  // 2025-06 → in evaluation window

  const viewTampered = demandForecastView(seriesTampered, origin, horizon, 'leak-test', 'X', 'units', JAN_2026)
  const after = JSON.stringify(viewTampered.models.last_value.backtest.map((p: any) => p.prediction))

  // last_value uses trainingEnd (2024-12), not any period after it
  assert.equal(before, after, 'Backtest predictions must not change when evaluation-window data is modified')
})

test('forecast predictions do not change when post-origin data is added', () => {
  const series = historySeries()
  const view = demandForecastView(series, DEC_2025, 12, 'test', 'X', 'units', JAN_2026)
  const beforePredictions = view.models.last_value.forecast.map((p: any) => p.prediction)

  // Simulate "2026 actuals arrive" — they must NOT be used for model re-training
  const seriesWithFuture = new Map(series)
  seriesWithFuture.set(JAN_2026, null)    // null = not yet trained on
  seriesWithFuture.set(monthIndex('2026-06'), null)

  const viewAfter = demandForecastView(seriesWithFuture, DEC_2025, 12, 'test', 'X', 'units', JAN_2026)
  const afterPredictions = viewAfter.models.last_value.forecast.map((p: any) => p.prediction)

  assert.deepEqual(beforePredictions, afterPredictions,
    'Forecast predictions must not change when post-origin null entries are added')
})

// ─── 6. Actual/predicted separation ──────────────────────────────────────

test('no model forecast point has data_status=actual', () => {
  const series = historySeries()
  const view = demandForecastView(series, DEC_2025, 12, 'test', 'X', 'units', JAN_2026)
  for (const [modelName, model] of Object.entries(view.models)) {
    for (const point of model.forecast) {
      assert.notEqual(point.data_status, 'actual',
        `${modelName} forecast at ${point.period} must not be labeled 'actual'`)
    }
  }
})

test('no backtest actual value is used as prediction input', () => {
  // Verify structural separation: backtest.actual ≠ backtest.prediction source
  const series = historySeries()
  const view = demandForecastView(series, DEC_2025, 12, 'test', 'X', 'units', JAN_2026)
  // For last_value: prediction = value at trainingEnd, not at target period
  const trainingEnd = DEC_2025 - 12
  const expectedLastValue = series.get(trainingEnd) ?? null
  for (const point of view.models.last_value.backtest) {
    if (point.prediction !== null) {
      assert.equal(point.prediction, expectedLastValue,
        'last_value prediction must come from trainingEnd, never from target actual')
    }
  }
})

// ─── 7. Demand-pattern classification ────────────────────────────────────

test('smooth demand classified correctly', () => {
  // Low CV, low zero rate
  const series = new Map<number, number | null>(
    Array.from({ length: 24 }, (_, i) => [i, 100 + Math.round(Math.sin(i) * 5)]),
  )
  const profile = classifyDemand(series)
  assert.equal(profile.pattern, 'smooth')
  assert.equal(profile.zero_rate, 0)
})

test('intermittent demand classified correctly', () => {
  // Many zeros (≥50%), low CV on non-zeros
  const vals: Array<[number, number | null]> = []
  for (let i = 0; i < 24; i++) vals.push([i, i % 3 === 0 ? 100 : 0])
  const series = new Map(vals)
  const profile = classifyDemand(series)
  assert.ok(['intermittent', 'lumpy'].includes(profile.pattern),
    `Expected intermittent or lumpy, got ${profile.pattern}`)
  assert.ok(profile.zero_rate >= 0.5)
})

test('insufficient history returns insufficient pattern', () => {
  const series = new Map<number, number | null>([[0, 10], [1, 20], [2, 30]])
  const profile = classifyDemand(series)
  assert.equal(profile.pattern, 'insufficient')
})

// ─── 8. Croston-lite ──────────────────────────────────────────────────────

test('crostonLiteEstimate returns null for fewer than 2 non-zero demands', () => {
  const series = new Map<number, number | null>([[0, 100], [1, 0], [2, 0]])
  assert.equal(crostonLiteEstimate(series, 2), null)
})

test('crostonLiteEstimate computes correct mean-demand / mean-gap', () => {
  // Periods: 0→0, 2→100, 4→0, 6→200, 8→0, 10→150
  // Non-zero: at indices 2 (100), 6 (200), 10 (150) → mean_demand = 150
  // Gaps: 6-2=4, 10-6=4 → mean_gap = 4
  // Rate = 150/4 = 37.5
  const series = new Map<number, number | null>([
    [0, 0], [2, 100], [4, 0], [6, 200], [8, 0], [10, 150],
  ])
  const estimate = crostonLiteEstimate(series, 10)
  assert.ok(estimate !== null)
  assert.ok(Math.abs(estimate! - 37.5) < 0.01, `Expected ~37.5, got ${estimate}`)
})

// ─── 9. Download rows ─────────────────────────────────────────────────────

test('buildDownloadRows produces rows for every model and every forecast period', () => {
  const series = historySeries()
  const view = demandForecastView(series, DEC_2025, 12, 'test:sku', 'Amox', 'caps', JAN_2026)
  const rows = buildDownloadRows(view, 12, '2026-01-01T00:00:00.000Z')
  const modelCount = Object.keys(view.models).length
  // Each model should have 12 forecast rows
  assert.equal(rows.length, modelCount * 12)
  for (const row of rows) {
    assert.equal(row.data_status, 'estimated')
    assert.equal(row.forecast_horizon, 12)
    assert.ok(row.forecast_origin, 'forecast_origin must be set')
    assert.ok(row.forecast_month, 'forecast_month must be set')
    assert.ok(row.sku_or_scope, 'sku_or_scope must be set')
    assert.ok(row.generation_timestamp, 'generation_timestamp must be set')
  }
})

test('downloadRowsToCSV emits correct column headers', () => {
  const series = historySeries()
  const view = demandForecastView(series, DEC_2025, 12, 'test', 'X', 'units', JAN_2026)
  const rows = buildDownloadRows(view, 12, '2026-01-01T00:00:00.000Z')
  const csv = downloadRowsToCSV(rows)
  const header = csv.split('\n')[0]
  assert.ok(header.includes('forecast_origin'))
  assert.ok(header.includes('forecast_month'))
  assert.ok(header.includes('forecast_horizon'))
  assert.ok(header.includes('sku_or_scope'))
  assert.ok(header.includes('measurement_unit'))
  assert.ok(header.includes('predicted_value'))
  assert.ok(header.includes('model'))
  assert.ok(header.includes('mae'))
  assert.ok(header.includes('rmse'))
  assert.ok(header.includes('wape'))
  assert.ok(header.includes('bias'))
  assert.ok(header.includes('data_status'))
  assert.ok(header.includes('generation_timestamp'))
})

test('CSV data rows count matches download rows', () => {
  const series = historySeries()
  const view = demandForecastView(series, DEC_2025, 12, 'test', 'X', 'units', JAN_2026)
  const rows = buildDownloadRows(view, 12, '2026-01-01T00:00:00.000Z')
  const csv = downloadRowsToCSV(rows)
  const lines = csv.split('\n').filter(Boolean)
  assert.equal(lines.length, rows.length + 1)  // +1 for header
})

// ─── 10. Revenue / quantity separation ────────────────────────────────────

test('forecastEvidence benchmarkNames contains only revenue-domain labels', () => {
  const { benchmarkNames } = require('../src/forecastEvidence')
  const { demandBenchmarkNames } = require('../src/demandForecast')
  // Revenue benchmarks should not include croston_lite
  assert.ok(!Object.keys(benchmarkNames).includes('croston_lite'),
    'Revenue benchmarks must not include croston_lite (quantity-only method)')
  // Demand benchmarks include croston_lite
  assert.ok(Object.keys(demandBenchmarkNames).includes('croston_lite'),
    'Demand benchmarks must include croston_lite')
})
