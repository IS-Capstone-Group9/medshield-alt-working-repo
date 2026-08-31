import test from 'node:test'
import assert from 'node:assert/strict'

import {
  addMonthsToPeriod,
  buildRollingForecastWindow,
  filterForecastRowsToWindow,
  resolveForecastCurrentMonth,
  resolveForecastCurrentYear,
  resolveNextForecastYear,
  resolveRollingForecastWindow,
} from '../services/api/dashboard-forecast-window.ts'

test('rolling window returns exactly 12 months from 2026-08 through 2027-07', () => {
  const window = buildRollingForecastWindow('2026-08')
  assert.equal(window.periods.length, 12)
  assert.equal(window.periods[0], '2026-08')
  assert.equal(window.periods.at(-1), '2027-07')
  assert.deepEqual(window.periods.slice(0, 4), ['2026-08', '2026-09', '2026-10', '2026-11'])
})

test('rolling window returns exactly 12 months from 2026-09 through 2027-08', () => {
  const window = buildRollingForecastWindow('2026-09')
  assert.equal(window.periods.length, 12)
  assert.equal(window.periods[0], '2026-09')
  assert.equal(window.periods.at(-1), '2027-08')
})

test('rolling window crosses year boundaries from 2026-12 through 2027-11', () => {
  const window = buildRollingForecastWindow('2026-12')
  assert.equal(window.periods.length, 12)
  assert.equal(window.periods[0], '2026-12')
  assert.equal(window.periods.at(-1), '2027-11')
  assert.equal(addMonthsToPeriod(window.periods[0], 11), window.periods.at(-1))
})

test('rolling window stays inside the next calendar year when anchored at 2027-01', () => {
  const window = buildRollingForecastWindow('2027-01')
  assert.equal(window.periods.length, 12)
  assert.equal(window.periods[0], '2027-01')
  assert.equal(window.periods.at(-1), '2027-12')
})

test('forecast filtering keeps following-year periods inside the rolling window', () => {
  const window = buildRollingForecastWindow('2026-09')
  const filtered = filterForecastRowsToWindow(
    [
      { period: '2026-08', value: 10 },
      { period: '2026-09', value: 20 },
      { period: '2026-12', value: 30 },
      { period: '2027-01', value: 40 },
      { period: '2027-08', value: 50 },
      { period: '2027-09', value: 60 },
    ],
    window,
  )

  assert.deepEqual(
    filtered.map((row) => row.period),
    ['2026-09', '2026-12', '2027-01', '2027-08'],
  )
})

test('metadata current month wins over browser month when available', () => {
  const currentMonth = resolveForecastCurrentMonth(
    {
      current_month: '2026-09',
      forecast_window: { start: '2026-10', end: '2027-09', months: 12 },
    },
    new Date('2026-08-31T00:00:00+08:00'),
  )

  assert.equal(currentMonth, '2026-09')
})

test('current analytical year is derived from forecast metadata', () => {
  const currentYear = resolveForecastCurrentYear(
    {
      current_month: '2026-08',
      forecast_window: { start: '2026-08', end: '2027-07', months: 12 },
    },
    new Date('2025-12-31T00:00:00+08:00'),
  )

  assert.equal(currentYear, '2026')
})

test('browser month is used when metadata is unavailable', () => {
  const window = resolveRollingForecastWindow(undefined, new Date('2026-09-15T00:00:00+08:00'))
  assert.equal(window.start, '2026-09')
  assert.equal(window.end, '2027-08')
})

test('next forecast year appears only when Q4 begins', () => {
  assert.equal(resolveNextForecastYear({ current_month: '2026-09' }), null)
  assert.equal(resolveNextForecastYear({ current_month: '2026-10' }), '2027')
  assert.equal(resolveNextForecastYear({ current_month: '2027-10' }), '2028')
})
