import { createHash } from 'node:crypto'
import { executeDatabricksStatement } from './databricks'
import { databricksLiteral } from './databricksLiteral'
import { WeatherProviderUnavailableError, WeatherRefreshInputError } from './nasaPowerWeather'
import { WEATHER_AREA_COORDINATES, WEATHER_POINT_BASIS, WEATHER_POINT_POLICY, WeatherArea } from './weatherAreas'

export const OPEN_METEO_ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'
export const OPEN_METEO_SILVER_TABLE = '`workspace`.`medshield_silver`.`weather_open_meteo_monthly_candidate`'
export const OPEN_METEO_GOLD_VIEW = '`workspace`.`medshield_gold`.`vw_weather_open_meteo_monthly_candidate`'

export const OPEN_METEO_PROVIDERS = Object.freeze({
  open_meteo_era5: { model: 'era5', label: 'Open-Meteo ERA5', variableModels: { precipitation: 'ERA5', temperature: 'ERA5', humidity: 'ERA5', wind: 'ERA5' } },
  open_meteo_era5_seamless: { model: 'era5_seamless', label: 'Open-Meteo ERA5-Seamless', variableModels: { precipitation: 'ERA5 forcing', temperature: 'ERA5-Land', humidity: 'ERA5-Land', wind: 'ERA5' } },
  open_meteo_ifs: { model: 'ecmwf_ifs', label: 'Open-Meteo ECMWF IFS', variableModels: { precipitation: 'ECMWF IFS archive', temperature: 'ECMWF IFS archive', humidity: 'ECMWF IFS archive', wind: 'ECMWF IFS archive' } },
})
export type OpenMeteoProvider = keyof typeof OPEN_METEO_PROVIDERS
export type OpenMeteoRefreshInput = { provider?: unknown; start?: unknown; end?: unknown; areas?: unknown }
export type WeatherDailyObservation = { date: string; precipitationMm: number | null; temperatureC: number | null; relativeHumidityPct: number | null; maxWindSpeedKph: number | null }
export type OpenMeteoMonthlyRow = {
  provider: OpenMeteoProvider; model: string; territory: WeatherArea; periodStart: string
  latitude: number; longitude: number; gridLatitude: number; gridLongitude: number
  rainfallMm: number | null; rainyDays: number | null; avgTemperatureC: number | null
  avgRelativeHumidityPct: number | null; maxWindSpeedKph: number | null
  expectedDays: number; validRainfallDays: number; validTemperatureDays: number
  validHumidityDays: number; validWindDays: number; qualityStatus: string
  sourceUrl: string; sourceResponseSha256: string
}
type Dependencies = { fetch?: typeof fetch; execute?: typeof executeDatabricksStatement; now?: () => Date }

export function isOpenMeteoProvider(provider: string): provider is OpenMeteoProvider {
  return Object.hasOwn(OPEN_METEO_PROVIDERS, provider)
}

function parseDate(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new WeatherRefreshInputError(`${name} must use YYYY-MM-DD format`)
  const date = new Date(`${value}T00:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new WeatherRefreshInputError(`${name} is not a valid calendar date`)
  return value
}

export function lastClosedWeatherMonth(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).formatToParts(now)
  const year = Number(parts.find(part => part.type === 'year')!.value)
  const month = Number(parts.find(part => part.type === 'month')!.value)
  return new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 10)
}

export function normalizeOpenMeteoRefresh(input: OpenMeteoRefreshInput, now = new Date()) {
  const provider = typeof input.provider === 'string' ? input.provider.trim().toLowerCase() : ''
  if (!isOpenMeteoProvider(provider)) throw new WeatherRefreshInputError(`provider must be one of ${Object.keys(OPEN_METEO_PROVIDERS).join(', ')}`)
  const start = parseDate(input.start, 'start')
  const end = parseDate(input.end, 'end')
  if (start > end) throw new WeatherRefreshInputError('end must be on or after start')
  const latest = lastClosedWeatherMonth(now)
  if (start < '2017-01-01' || end > latest) throw new WeatherRefreshInputError(`weather refresh must stay within 2017-01-01 and ${latest}, the last fully closed month in Asia/Manila`)
  const endDate = new Date(`${end}T00:00:00Z`)
  if (!start.endsWith('-01') || new Date(endDate.getTime() + 86_400_000).getUTCDate() !== 1) throw new WeatherRefreshInputError('weather refresh must request whole calendar months')
  if ((endDate.getTime() - Date.parse(`${start}T00:00:00Z`)) / 86_400_000 + 1 > 3660) throw new WeatherRefreshInputError('weather refresh is limited to ten years per request')
  if (input.areas !== undefined && !Array.isArray(input.areas)) throw new WeatherRefreshInputError('areas must be an array')
  const requested = input.areas as unknown[] | undefined
  if (requested?.some(area => typeof area !== 'string')) throw new WeatherRefreshInputError('areas must contain territory names as strings')
  const areas = requested?.length ? [...new Set((requested as string[]).map(area => area.trim()))] : Object.keys(WEATHER_AREA_COORDINATES)
  if (areas.some(area => !Object.hasOwn(WEATHER_AREA_COORDINATES, area))) throw new WeatherRefreshInputError('one or more areas has no configured candidate weather point')
  return { provider, start, end, areas: areas as WeatherArea[] }
}

function measurement(value: unknown, minimum: number, maximum: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum ? value : null
}
function record(value: unknown): Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export function parseOpenMeteoDaily(payload: unknown, start: string, end: string) {
  const body = record(payload)
  const daily = record(body.daily)
  const units = record(body.daily_units)
  if (body.timezone !== 'Asia/Manila' || body.utc_offset_seconds !== 28800) throw new WeatherProviderUnavailableError('Open-Meteo returned an unexpected timezone')
  const expectedUnits = { time: 'iso8601', precipitation_sum: 'mm', temperature_2m_mean: '°C', relative_humidity_2m_mean: '%', wind_speed_10m_max: 'km/h' }
  if (Object.entries(expectedUnits).some(([name, unit]) => units[name] !== unit)) throw new WeatherProviderUnavailableError('Open-Meteo returned missing or incompatible measurement units')
  if (!Array.isArray(daily.time)) throw new WeatherProviderUnavailableError('Open-Meteo returned no daily calendar')
  const times = daily.time as unknown[]
  const variables = ['precipitation_sum', 'temperature_2m_mean', 'relative_humidity_2m_mean', 'wind_speed_10m_max']
  if (variables.some(name => !Array.isArray(daily[name]) || (daily[name] as unknown[]).length !== times.length)) throw new WeatherProviderUnavailableError('Open-Meteo returned inconsistent daily arrays')
  const seen = new Set<string>()
  const rows: WeatherDailyObservation[] = times.map((time, index) => {
    let date: string
    try { date = parseDate(time, 'provider date') } catch { throw new WeatherProviderUnavailableError('Open-Meteo returned an invalid daily date') }
    if (date < start || date > end || seen.has(date)) throw new WeatherProviderUnavailableError('Open-Meteo returned duplicate or out-of-range daily dates')
    seen.add(date)
    return {
      date,
      precipitationMm: measurement((daily.precipitation_sum as unknown[])[index], 0, 5000),
      temperatureC: measurement((daily.temperature_2m_mean as unknown[])[index], -90, 65),
      relativeHumidityPct: measurement((daily.relative_humidity_2m_mean as unknown[])[index], 0, 100),
      maxWindSpeedKph: measurement((daily.wind_speed_10m_max as unknown[])[index], 0, 500),
    }
  })
  const gridLatitude = measurement(body.latitude, -90, 90)
  const gridLongitude = measurement(body.longitude, -180, 180)
  if (gridLatitude == null || gridLongitude == null) throw new WeatherProviderUnavailableError('Open-Meteo returned invalid grid coordinates')
  return { rows, gridLatitude, gridLongitude }
}

function completeAverage(values: Array<number | null>, expected: number): number | null {
  return values.length === expected && values.every(value => value != null) ? Number((values.reduce<number>((sum, value) => sum + value!, 0) / expected).toFixed(4)) : null
}

export function aggregateOpenMeteoMonthly(
  provider: OpenMeteoProvider, territory: WeatherArea, start: string, end: string,
  dailyRows: WeatherDailyObservation[], provenance: { gridLatitude: number; gridLongitude: number; sourceUrl: string; sourceResponseSha256: string },
): OpenMeteoMonthlyRow[] {
  const groups = new Map<string, WeatherDailyObservation[]>()
  const seen = new Set<string>()
  for (const row of dailyRows) {
    if (row.date < start || row.date > end || seen.has(row.date)) throw new WeatherProviderUnavailableError('Weather aggregation received duplicate or out-of-range dates')
    seen.add(row.date)
    const month = row.date.slice(0, 7)
    groups.set(month, [...(groups.get(month) ?? []), row])
  }
  const result: OpenMeteoMonthlyRow[] = []
  for (let cursor = new Date(`${start}T00:00:00Z`); cursor.toISOString().slice(0, 10) <= end; cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))) {
    const periodStart = cursor.toISOString().slice(0, 10)
    const expectedDays = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate()
    const rows = groups.get(periodStart.slice(0, 7)) ?? []
    const rainfall = rows.map(row => row.precipitationMm)
    const temperature = rows.map(row => row.temperatureC)
    const humidity = rows.map(row => row.relativeHumidityPct)
    const wind = rows.map(row => row.maxWindSpeedKph)
    const validRainfallDays = rainfall.filter(value => value != null).length
    const validTemperatureDays = temperature.filter(value => value != null).length
    const validHumidityDays = humidity.filter(value => value != null).length
    const validWindDays = wind.filter(value => value != null).length
    const completeRainfall = validRainfallDays === expectedDays
    result.push({
      provider, model: OPEN_METEO_PROVIDERS[provider].model, territory, periodStart,
      latitude: WEATHER_AREA_COORDINATES[territory][0], longitude: WEATHER_AREA_COORDINATES[territory][1], ...provenance,
      rainfallMm: completeRainfall ? Number(rainfall.reduce<number>((sum, value) => sum + value!, 0).toFixed(4)) : null,
      rainyDays: completeRainfall ? rainfall.filter(value => value! >= 1).length : null,
      avgTemperatureC: completeAverage(temperature, expectedDays), avgRelativeHumidityPct: completeAverage(humidity, expectedDays),
      maxWindSpeedKph: validWindDays === expectedDays ? Math.max(...wind as number[]) : null,
      expectedDays, validRainfallDays, validTemperatureDays, validHumidityDays, validWindDays,
      qualityStatus: !completeRainfall ? 'INCOMPLETE_RAINFALL' : [validTemperatureDays, validHumidityDays, validWindDays].every(count => count === expectedDays) ? 'COMPLETE_ALL_METRICS' : 'COMPLETE_RAINFALL_OTHER_METRICS_MISSING',
    })
  }
  return result
}

async function fetchArea(provider: OpenMeteoProvider, territory: WeatherArea, start: string, end: string, fetcher: typeof fetch) {
  const [latitude, longitude] = WEATHER_AREA_COORDINATES[territory]
  const url = new URL(OPEN_METEO_ARCHIVE_URL)
  url.search = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), start_date: start, end_date: end,
    daily: 'precipitation_sum,temperature_2m_mean,relative_humidity_2m_mean,wind_speed_10m_max', models: OPEN_METEO_PROVIDERS[provider].model,
    timezone: 'Asia/Manila', temperature_unit: 'celsius', wind_speed_unit: 'kmh', precipitation_unit: 'mm', cell_selection: 'land' }).toString()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)
  try {
    const response = await fetcher(url, { signal: controller.signal, redirect: 'error' })
    if (!response.ok) throw new WeatherProviderUnavailableError(`Open-Meteo returned HTTP ${response.status} for ${territory}`)
    const body = await response.text()
    if (body.length > 5_000_000) throw new WeatherProviderUnavailableError('Open-Meteo response exceeded the permitted size')
    const parsed = parseOpenMeteoDaily(JSON.parse(body), start, end)
    if (Math.abs(parsed.gridLatitude - latitude) > 1 || Math.abs(parsed.gridLongitude - longitude) > 1) throw new WeatherProviderUnavailableError('Open-Meteo returned a grid point outside the requested location')
    return aggregateOpenMeteoMonthly(provider, territory, start, end, parsed.rows, { gridLatitude: parsed.gridLatitude, gridLongitude: parsed.gridLongitude,
      sourceUrl: url.toString(), sourceResponseSha256: createHash('sha256').update(body, 'utf8').digest('hex') })
  } catch (error) {
    if (error instanceof WeatherProviderUnavailableError) throw error
    throw new WeatherProviderUnavailableError(`Open-Meteo request failed for ${territory}: ${error instanceof Error ? error.message : 'network error'}`)
  } finally { clearTimeout(timeout) }
}

async function persistMonthly(rows: OpenMeteoMonthlyRow[], start: string, end: string, fetchedAt: Date, execute: typeof executeDatabricksStatement) {
  await execute(`CREATE TABLE IF NOT EXISTS ${OPEN_METEO_SILVER_TABLE} (
    provider STRING NOT NULL, model STRING NOT NULL, period_start DATE NOT NULL, territory STRING NOT NULL,
    latitude DOUBLE NOT NULL, longitude DOUBLE NOT NULL, grid_latitude DOUBLE NOT NULL, grid_longitude DOUBLE NOT NULL,
    rainfall_mm DOUBLE, rainy_days INT, avg_temperature_c DOUBLE, avg_relative_humidity_pct DOUBLE, max_wind_speed_kph DOUBLE,
    expected_days INT NOT NULL, valid_rainfall_days INT NOT NULL, valid_temperature_days INT NOT NULL, valid_humidity_days INT NOT NULL, valid_wind_days INT NOT NULL,
    quality_status STRING NOT NULL, source_url STRING NOT NULL, source_response_sha256 STRING NOT NULL,
    source_period_start DATE NOT NULL, source_period_end DATE NOT NULL, fetched_at TIMESTAMP NOT NULL,
    timezone STRING NOT NULL, point_policy STRING NOT NULL, variable_models_json STRING NOT NULL,
    candidate_only BOOLEAN NOT NULL, is_external_join_ready BOOLEAN NOT NULL, is_forecast_eligible BOOLEAN NOT NULL, reliability_benchmark_id STRING
  ) USING DELTA`)
  await execute(`CREATE OR REPLACE VIEW ${OPEN_METEO_GOLD_VIEW} AS SELECT * FROM ${OPEN_METEO_SILVER_TABLE}`)
  const columns = 'provider, model, period_start, territory, latitude, longitude, grid_latitude, grid_longitude, rainfall_mm, rainy_days, avg_temperature_c, avg_relative_humidity_pct, max_wind_speed_kph, expected_days, valid_rainfall_days, valid_temperature_days, valid_humidity_days, valid_wind_days, quality_status, source_url, source_response_sha256, source_period_start, source_period_end, fetched_at, timezone, point_policy, variable_models_json, candidate_only, is_external_join_ready, is_forecast_eligible, reliability_benchmark_id'
  for (let index = 0; index < rows.length; index += 100) {
    const values = rows.slice(index, index + 100).map(row => `(${[
      databricksLiteral(row.provider), databricksLiteral(row.model), `CAST(${databricksLiteral(row.periodStart)} AS DATE)`, databricksLiteral(row.territory),
      row.latitude, row.longitude, row.gridLatitude, row.gridLongitude, row.rainfallMm ?? 'CAST(NULL AS DOUBLE)', row.rainyDays ?? 'CAST(NULL AS INT)',
      row.avgTemperatureC ?? 'CAST(NULL AS DOUBLE)', row.avgRelativeHumidityPct ?? 'CAST(NULL AS DOUBLE)', row.maxWindSpeedKph ?? 'CAST(NULL AS DOUBLE)',
      row.expectedDays, row.validRainfallDays, row.validTemperatureDays, row.validHumidityDays, row.validWindDays, databricksLiteral(row.qualityStatus),
      databricksLiteral(row.sourceUrl), databricksLiteral(row.sourceResponseSha256), `CAST(${databricksLiteral(start)} AS DATE)`, `CAST(${databricksLiteral(end)} AS DATE)`, `CAST(${databricksLiteral(fetchedAt.toISOString())} AS TIMESTAMP)`,
      databricksLiteral('Asia/Manila'), databricksLiteral(WEATHER_POINT_POLICY), databricksLiteral(JSON.stringify(OPEN_METEO_PROVIDERS[row.provider].variableModels)), 'TRUE', 'FALSE', 'FALSE', 'CAST(NULL AS STRING)',
    ].join(', ')})`).join(',\n')
    await execute(`MERGE INTO ${OPEN_METEO_SILVER_TABLE} AS target USING (SELECT * FROM VALUES ${values} AS source(${columns})) AS source
      ON target.provider = source.provider AND target.period_start = source.period_start AND target.territory = source.territory
      WHEN MATCHED THEN UPDATE SET * WHEN NOT MATCHED THEN INSERT *`, { timeoutMs: 120_000 })
  }
  const result = await execute(`SELECT COUNT(*) AS saved_rows FROM ${OPEN_METEO_GOLD_VIEW}
    WHERE provider = ${databricksLiteral(rows[0].provider)} AND fetched_at = CAST(${databricksLiteral(fetchedAt.toISOString())} AS TIMESTAMP)
      AND period_start BETWEEN CAST(${databricksLiteral(start)} AS DATE) AND CAST(${databricksLiteral(end)} AS DATE)
      AND territory IN (${[...new Set(rows.map(row => row.territory))].map(databricksLiteral).join(', ')})`)
  const savedRows = Number(result.rows[0]?.saved_rows)
  if (savedRows !== rows.length) throw new Error(`Databricks weather validation expected ${rows.length} rows from this refresh but found ${savedRows}`)
  return savedRows
}

export async function refreshOpenMeteoWeather(input: OpenMeteoRefreshInput, dependencies: Dependencies = {}) {
  const fetchedAt = (dependencies.now ?? (() => new Date()))()
  const { provider, start, end, areas } = normalizeOpenMeteoRefresh(input, fetchedAt)
  const rows: OpenMeteoMonthlyRow[] = []
  // Bound concurrency and finish every provider fetch before starting persistence.
  for (let index = 0; index < areas.length; index += 3) {
    const batches = await Promise.all(areas.slice(index, index + 3).map(area => fetchArea(provider, area, start, end, dependencies.fetch ?? fetch)))
    rows.push(...batches.flat())
  }
  const incomplete = rows.find(row => row.rainfallMm == null)
  if (incomplete) throw new WeatherProviderUnavailableError(`Open-Meteo rainfall is incomplete for ${incomplete.territory} ${incomplete.periodStart.slice(0, 7)}: ${incomplete.validRainfallDays}/${incomplete.expectedDays} days; no candidate rows were written`)
  const savedRows = await persistMonthly(rows, start, end, fetchedAt, dependencies.execute ?? executeDatabricksStatement)
  return {
    metadata: { provider, model: OPEN_METEO_PROVIDERS[provider].model, variable_models: OPEN_METEO_PROVIDERS[provider].variableModels,
      source_url: OPEN_METEO_ARCHIVE_URL, refreshed_at: fetchedAt.toISOString(), period_start: start, period_end: end, areas, timezone: 'Asia/Manila',
      expected_days: rows.reduce((sum, row) => sum + row.expectedDays, 0), valid_rainfall_days: rows.reduce((sum, row) => sum + row.validRainfallDays, 0),
      monthly_rows_loaded: rows.length, candidate_only: true, usage_policy: 'noncommercial_research_candidate', point_policy: WEATHER_POINT_POLICY,
      point_basis: WEATHER_POINT_BASIS, is_external_join_ready: false, is_forecast_eligible: false, reliability_benchmark_id: null,
      system_of_record: 'databricks', destination: 'workspace.medshield_gold.vw_weather_open_meteo_monthly_candidate',
      interpretation: 'Historical model weather proxy; not an official PAGASA observation or alert. ERA5 variants share ancestry; IFS archive model changes can affect historical consistency.' },
    rows_loaded: rows.length, persistence: { databricks: { persisted: true, saved_rows: savedRows }, local: { persisted: false } },
  }
}
