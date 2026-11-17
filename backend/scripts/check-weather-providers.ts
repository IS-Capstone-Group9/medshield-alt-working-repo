/** Read-only live archive/adapter probe: no warehouse connection or publication. */
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { aggregateOpenMeteoMonthly, OPEN_METEO_ARCHIVE_URL, OPEN_METEO_PROVIDERS, parseOpenMeteoDaily, type OpenMeteoProvider } from '../src/openMeteoWeather'
import { WEATHER_AREA_COORDINATES } from '../src/weatherAreas'

async function main() {
  const output = path.resolve(__dirname, '../../outputs/weather_reliability_20261008')
  const checks = []
  for (const provider of Object.keys(OPEN_METEO_PROVIDERS) as OpenMeteoProvider[]) {
    const start = '2024-01-01', end = '2024-01-31'
    const [latitude, longitude] = WEATHER_AREA_COORDINATES.Quezon
    const url = new URL(OPEN_METEO_ARCHIVE_URL)
    url.search = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), start_date: start, end_date: end,
      daily: 'precipitation_sum,temperature_2m_mean,relative_humidity_2m_mean,wind_speed_10m_max', models: OPEN_METEO_PROVIDERS[provider].model,
      timezone: 'Asia/Manila', temperature_unit: 'celsius', wind_speed_unit: 'kmh', precipitation_unit: 'mm', cell_selection: 'land' }).toString()
    const began = new Date().toISOString()
    const response = await fetch(url, { signal: AbortSignal.timeout(40_000), redirect: 'error' })
    if (!response.ok) throw new Error(`${provider} HTTP ${response.status}`)
    const raw = await response.text()
    const hash = createHash('sha256').update(raw).digest('hex')
    const parsed = parseOpenMeteoDaily(JSON.parse(raw), start, end)
    const rows = aggregateOpenMeteoMonthly(provider, 'Quezon', start, end, parsed.rows,
      { gridLatitude: parsed.gridLatitude, gridLongitude: parsed.gridLongitude, sourceUrl: url.toString(), sourceResponseSha256: hash })
    if (rows.length !== 1 || rows[0].qualityStatus !== 'COMPLETE_ALL_METRICS') throw new Error(`${provider} incomplete adapter result`)
    checks.push({ provider, requested_at_utc: began, http_status: response.status, url: url.toString(), response_sha256: hash,
      calendar_days: parsed.rows.length, monthly_rows: rows, test_scope: 'Live HTTP, unit/timezone/calendar parsing and aggregation only; no SQL execution' })
    console.log(JSON.stringify({ provider, status: 'PASS', days: parsed.rows.length, quality: rows[0].qualityStatus }))
  }
  await mkdir(output, { recursive: true })
  await writeFile(path.join(output, 'live-adapter-check.json'), JSON.stringify({ checked_at_utc: new Date().toISOString(), status: 'PASS', warehouse_writes: 0, checks }, null, 2)+'\n')
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Weather adapter check failed'); process.exitCode = 1 })
