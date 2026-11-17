import assert from 'node:assert/strict'
import test from 'node:test'
import { aggregateOpenMeteoMonthly, normalizeOpenMeteoRefresh, parseOpenMeteoDaily, refreshOpenMeteoWeather } from '../src/openMeteoWeather'
import { refreshWeatherProvider } from '../src/weatherProviders'

function payload() {
  return { latitude: 13.94, longitude: 121.62, timezone: 'Asia/Manila', utc_offset_seconds: 28800,
    daily_units: { time: 'iso8601', precipitation_sum: 'mm', temperature_2m_mean: '°C', relative_humidity_2m_mean: '%', wind_speed_10m_max: 'km/h' },
    daily: { time: Array.from({ length: 31 }, (_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`),
      precipitation_sum: Array(31).fill(2), temperature_2m_mean: Array(31).fill(27), relative_humidity_2m_mean: Array(31).fill(80), wind_speed_10m_max: Array(31).fill(12) } }
}
const fixedNow = () => new Date('2026-10-08T00:00:00Z')
const request = { provider: 'open_meteo_era5', start: '2024-01-01', end: '2024-01-31', areas: ['Quezon'] }
const provenance = { gridLatitude: 13.94, gridLongitude: 121.62, sourceUrl: 'https://archive-api.open-meteo.com/v1/archive', sourceResponseSha256: 'a'.repeat(64) }

test('provider variants require closed whole months, literal territory names and explicit model', () => {
  for (const provider of ['open_meteo_era5', 'open_meteo_era5_seamless', 'open_meteo_ifs']) {
    assert.equal(normalizeOpenMeteoRefresh({ ...request, provider }, fixedNow()).provider, provider)
  }
  for (const change of [{ provider: 'best_match' }, { areas: ['toString'] }, { start: '2024-01-02' }, { end: '2026-10-31' }, { areas: [true] }]) {
    assert.throws(() => normalizeOpenMeteoRefresh({ ...request, ...change }, fixedNow()))
  }
})

test('units, timezone, duplicate dates and malformed arrays cannot become candidate observations', () => {
  const units = payload(); units.daily_units.precipitation_sum = 'inch'
  const timezone = payload(); timezone.utc_offset_seconds = 0
  const duplicate = payload(); duplicate.daily.time[30] = duplicate.daily.time[0]
  const arrays = payload(); arrays.daily.precipitation_sum.pop()
  for (const body of [units, timezone, duplicate, arrays]) assert.throws(() => parseOpenMeteoDaily(body, request.start, request.end))
})

test('January totals reconcile and missing optional metrics stay null with coverage', () => {
  const body = payload(); (body.daily.temperature_2m_mean as Array<number | null>)[0] = null
  const parsed = parseOpenMeteoDaily(body, request.start, request.end)
  const row = aggregateOpenMeteoMonthly('open_meteo_era5', 'Quezon', request.start, request.end, parsed.rows, provenance)[0]
  assert.equal(row.rainfallMm, 62)
  assert.equal(row.rainyDays, 31)
  assert.equal(row.avgTemperatureC, null)
  assert.equal(row.validTemperatureDays, 30)
  assert.equal(row.expectedDays, 31)
  assert.equal(row.maxWindSpeedKph, 12)
})

test('incomplete rainfall or provider errors perform zero warehouse operations', async () => {
  const body = payload(); (body.daily.precipitation_sum as Array<number | null>)[0] = null
  let writes = 0
  const execute = async () => { writes++; throw new Error('should not write') }
  await assert.rejects(refreshOpenMeteoWeather(request, { now: fixedNow, fetch: async () => new Response(JSON.stringify(body)) as any, execute: execute as any }), /incomplete/)
  assert.equal(writes, 0)
  await assert.rejects(refreshOpenMeteoWeather(request, { now: fixedNow, fetch: async () => new Response('unavailable', { status: 503 }) as any, execute: execute as any }), /503/)
  assert.equal(writes, 0)
})

test('successful refresh uses fixed HTTPS archive and candidate lineage, then verifies exact readback', async () => {
  const statements: string[] = []
  const fetched: string[] = []
  const result = await refreshOpenMeteoWeather(request, { now: fixedNow,
    fetch: async (url, options) => { fetched.push(String(url)); assert.equal(options?.redirect, 'error'); return new Response(JSON.stringify(payload())) },
    execute: async (sql) => { statements.push(sql); return { rows: sql.startsWith('SELECT COUNT') ? [{ saved_rows: '1' }] : [] } as any } })
  const url = new URL(fetched[0])
  assert.equal(url.origin, 'https://archive-api.open-meteo.com')
  assert.equal(url.searchParams.get('models'), 'era5')
  assert.equal(url.searchParams.get('timezone'), 'Asia/Manila')
  assert.equal(statements.length, 4)
  assert.match(statements[2], /MERGE INTO.*weather_open_meteo_monthly_candidate/s)
  assert.match(statements[2], /source_response_sha256/)
  assert.equal(result.metadata.candidate_only, true)
  assert.equal(result.metadata.is_forecast_eligible, false)
  assert.equal(result.metadata.reliability_benchmark_id, null)
  assert.equal(result.persistence.local.persisted, false)
})

test('wrong readback and unknown provider fail visibly', async () => {
  await assert.rejects(refreshOpenMeteoWeather(request, { now: fixedNow, fetch: async () => new Response(JSON.stringify(payload())), execute: async () => ({ rows: [{ saved_rows: '0' }] } as any) }), /expected 1 rows/)
  await assert.rejects(refreshWeatherProvider({ ...request, provider: 'https://untrusted.test' }), /provider must/)
})
