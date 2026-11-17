import assert from 'node:assert/strict'
import test from 'node:test'
import { aggregateNasaPowerMonthly, lastClosedWeatherDate, normalizeNasaPowerInput } from '../src/nasaPowerWeather'
import { WEATHER_AREA_COORDINATES } from '../src/weatherAreas'

function january() {
  return Array.from({ length: 31 }, (_, index) => ({
    date: `2024-01-${String(index + 1).padStart(2, '0')}`,
    precipitationMm: index === 0 ? 0 : 2,
    temperatureC: 25,
    relativeHumidityPct: 80,
    windSpeedKph: 10,
  }))
}

test('last closed month follows Manila at the UTC month boundary', () => {
  assert.equal(lastClosedWeatherDate(new Date('2026-09-30T15:59:59Z')), '2026-08-31')
  assert.equal(lastClosedWeatherDate(new Date('2026-09-30T16:00:00Z')), '2026-09-30')
  assert.equal(lastClosedWeatherDate(new Date('2026-01-01T00:00:00Z')), '2025-12-31')
})

test('NASA accepts closed 2026 months and all target regions without granting mappings', () => {
  const result = normalizeNasaPowerInput({ start: '2026-09-01', end: '2026-09-30', areas: ['Albay', 'Palawan', 'Batangas'] }, new Date('2026-10-08T00:00:00Z'))
  assert.deepEqual(result.areas, ['Albay', 'Palawan', 'Batangas'])
  assert.equal(Object.keys(WEATHER_AREA_COORDINATES).length, 17)
})

test('partial or open months cannot overwrite a complete monthly total', () => {
  for (const input of [
    { start: '2024-01-02', end: '2024-01-31' },
    { start: '2024-01-01', end: '2024-01-30' },
    { start: '2026-10-01', end: '2026-10-31' },
  ]) assert.throws(() => normalizeNasaPowerInput(input, new Date('2026-10-08T00:00:00Z')), /whole calendar|last closed/)
})

test('invalid dates, providers and inherited object properties are denied', () => {
  const base = { start: '2024-01-01', end: '2024-01-31' }
  assert.throws(() => normalizeNasaPowerInput({ ...base, start: '2024-02-30' }), /valid calendar/)
  assert.throws(() => normalizeNasaPowerInput({ ...base, areas: ['toString'] }), /coordinates/)
  assert.throws(() => normalizeNasaPowerInput({ ...base, provider: 'untrusted' }), /provider/)
})

test('complete January reconciles rainfall and rainy days to hand-computed values', () => {
  const row = aggregateNasaPowerMonthly('Quezon', 14, 121, january())[0]
  assert.equal(row.rainfallMm, 60)
  assert.equal(row.rainyDays, 30)
  assert.equal(row.avgTemperatureC, 25)
  assert.equal(row.avgRelativeHumidityPct, 80)
})

test('missing, duplicate and invalid rainfall days fail rather than become a low monthly total', () => {
  const missing = january().slice(1)
  const duplicate = january(); duplicate[30] = duplicate[0]
  const invalid = january(); invalid[30].date = '2024-01-32'
  const sentinel = january(); sentinel[0].precipitationMm = -999
  for (const rows of [missing, duplicate, invalid, sentinel]) {
    assert.throws(() => aggregateNasaPowerMonthly('Quezon', 14, 121, rows), /incomplete or invalid/)
  }
})

test('an incomplete optional measure remains unavailable instead of averaging fewer days', () => {
  const rows: Parameters<typeof aggregateNasaPowerMonthly>[3] = january()
  rows[0].temperatureC = null
  rows[1].relativeHumidityPct = null
  rows[2].windSpeedKph = null
  const row = aggregateNasaPowerMonthly('Quezon', 14, 121, rows)[0]
  assert.equal(row.rainfallMm, 60)
  assert.equal(row.avgTemperatureC, null)
  assert.equal(row.avgRelativeHumidityPct, null)
  assert.equal(row.maxWindSpeedKph, null)
})
