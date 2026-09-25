import { executeDatabricksStatement } from './databricks'

function nasaPowerUrl(): string {
  return process.env.NASA_POWER_DAILY_URL?.trim() ||
    'https://power.larc.nasa.gov/api/temporal/daily/point'
}

const SILVER_TABLE = '`workspace`.`medshield_silver`.`weather_nasa_power_monthly_candidate`'
const GOLD_VIEW = '`workspace`.`medshield_gold`.`vw_weather_nasa_power_monthly_candidate`'
const EARLIEST_SUPPORTED_DATE = '2017-01-01'
const LATEST_SUPPORTED_DATE = '2025-12-31'
const MAX_RANGE_DAYS = 3660
const FETCH_CONCURRENCY = 3

export const WEATHER_AREA_COORDINATES = Object.freeze({
  Batangas: [13.7565, 121.0583],
  'Camarines Norte': [14.139, 122.7633],
  'Camarines Sur': [13.6218, 123.1948],
  Cavite: [14.2456, 120.8786],
  Laguna: [14.2691, 121.4113],
  Marinduque: [13.4767, 121.9032],
  'Metro Manila': [14.5995, 120.9842],
  Quezon: [13.9414, 121.6234],
  Rizal: [14.6037, 121.3084],
} satisfies Record<string, readonly [number, number]>)

type WeatherArea = keyof typeof WEATHER_AREA_COORDINATES

type NasaPowerPayload = {
  properties?: {
    parameter?: Record<string, Record<string, number | null | undefined>>
  }
}

type DailyWeatherRow = {
  date: string
  precipitationMm: number
  temperatureC: number | null
  relativeHumidityPct: number | null
  windSpeedKph: number | null
}

export type NasaPowerMonthlyRow = {
  provider: 'nasa_power'
  periodStart: string
  territory: WeatherArea
  latitude: number
  longitude: number
  rainfallMm: number
  rainyDays: number
  avgTemperatureC: number | null
  avgRelativeHumidityPct: number | null
  maxWindSpeedKph: number | null
  rainfallSeverityProxy: number
  weatherAlertLevel: 'normal' | 'watch' | 'warning' | 'critical'
}

export type NasaPowerRefreshInput = {
  start?: unknown
  end?: unknown
  areas?: unknown
  provider?: unknown
}

export class WeatherRefreshInputError extends Error {
  readonly status = 400
  readonly code = 'INVALID_WEATHER_REFRESH'

  constructor(message: string) {
    super(message)
    this.name = 'WeatherRefreshInputError'
  }
}

export class WeatherProviderUnavailableError extends Error {
  readonly status = 502
  readonly code = 'WEATHER_PROVIDER_UNAVAILABLE'

  constructor(message: string) {
    super(message)
    this.name = 'WeatherProviderUnavailableError'
  }
}

function parseDate(value: unknown, label: string): { iso: string; date: Date } {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new WeatherRefreshInputError(`${label} must use YYYY-MM-DD format`)
  }
  const date = new Date(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new WeatherRefreshInputError(`${label} is not a valid calendar date`)
  }
  return { iso: value, date }
}

function normalizeInput(input: NasaPowerRefreshInput) {
  const provider = String(input.provider ?? 'nasa_power').trim().toLowerCase()
  if (provider !== 'nasa_power') {
    throw new WeatherRefreshInputError('provider must be nasa_power')
  }

  const start = parseDate(input.start, 'start')
  const end = parseDate(input.end, 'end')
  if (end.date < start.date) {
    throw new WeatherRefreshInputError('end must be on or after start')
  }
  if (start.iso < EARLIEST_SUPPORTED_DATE || end.iso > LATEST_SUPPORTED_DATE) {
    throw new WeatherRefreshInputError(
      `weather refresh must stay within ${EARLIEST_SUPPORTED_DATE} and ${LATEST_SUPPORTED_DATE}`,
    )
  }
  const rangeDays = Math.round((end.date.getTime() - start.date.getTime()) / 86_400_000)
  if (rangeDays > MAX_RANGE_DAYS) {
    throw new WeatherRefreshInputError('weather refresh is limited to ten years per request')
  }

  if (input.areas !== undefined && !Array.isArray(input.areas)) {
    throw new WeatherRefreshInputError('areas must be an array')
  }
  const requested = (input.areas as unknown[] | undefined) ?? []
  const areas = requested.length
    ? [...new Set(requested.map((area) => String(area).trim()))]
    : Object.keys(WEATHER_AREA_COORDINATES)
  const invalidAreas = areas.filter((area) => !(area in WEATHER_AREA_COORDINATES))
  if (invalidAreas.length) {
    throw new WeatherRefreshInputError(
      `no weather coordinates are configured for: ${invalidAreas.join(', ')}`,
    )
  }

  return { provider: 'nasa_power' as const, start, end, areas: areas as WeatherArea[] }
}

function validMeasurement(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(Number(value)) || Number(value) <= -998) return null
  return Number(value)
}

async function fetchNasaPowerDaily(
  area: WeatherArea,
  latitude: number,
  longitude: number,
  start: string,
  end: string,
): Promise<DailyWeatherRow[]> {
  const url = new URL(nasaPowerUrl())
  url.search = new URLSearchParams({
    start: start.replaceAll('-', ''),
    end: end.replaceAll('-', ''),
    latitude: String(latitude),
    longitude: String(longitude),
    community: 'AG',
    parameters: 'PRECTOTCORR,T2M,RH2M,WS10M',
    format: 'JSON',
    units: 'metric',
    'time-standard': 'LST',
  }).toString()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new WeatherProviderUnavailableError(
        `NASA POWER returned HTTP ${response.status} for ${area}`,
      )
    }
    const payload = (await response.json()) as NasaPowerPayload
    const parameters = payload.properties?.parameter
    if (!parameters?.PRECTOTCORR || !parameters.T2M || !parameters.RH2M || !parameters.WS10M) {
      throw new WeatherProviderUnavailableError(
        `NASA POWER response for ${area} did not contain the requested parameters`,
      )
    }

    return Object.keys(parameters.PRECTOTCORR).sort().flatMap((key) => {
      const rainfall = validMeasurement(parameters.PRECTOTCORR[key])
      if (rainfall == null || !/^\d{8}$/.test(key)) return []
      const temperature = validMeasurement(parameters.T2M[key])
      const humidity = validMeasurement(parameters.RH2M[key])
      const windMs = validMeasurement(parameters.WS10M[key])
      return [{
        date: `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`,
        precipitationMm: rainfall,
        temperatureC: temperature,
        relativeHumidityPct: humidity,
        windSpeedKph: windMs == null ? null : windMs * 3.6,
      }]
    })
  } catch (error) {
    if (error instanceof WeatherProviderUnavailableError) throw error
    const message = error instanceof Error ? error.message : 'unknown network error'
    throw new WeatherProviderUnavailableError(`NASA POWER request failed for ${area}: ${message}`)
  } finally {
    clearTimeout(timeout)
  }
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

function weatherSeverity(
  rainfallMm: number,
  rainyDays: number,
  maxWindSpeedKph: number | null,
  avgTemperatureC: number | null,
): number {
  const rainfall = Math.min(Math.max(rainfallMm, 0) / 500, 1) * 0.5
  const rainDays = Math.min(Math.max(rainyDays, 0) / 20, 1) * 0.2
  const wind = Math.min(Math.max(maxWindSpeedKph ?? 0, 0) / 60, 1) * 0.2
  const temperature = Math.min(Math.abs((avgTemperatureC ?? 27) - 27) / 10, 1) * 0.1
  return Number((rainfall + rainDays + wind + temperature).toFixed(4))
}

function alertLevel(severity: number): NasaPowerMonthlyRow['weatherAlertLevel'] {
  if (severity >= 0.95) return 'critical'
  if (severity >= 0.8) return 'warning'
  if (severity >= 0.6) return 'watch'
  return 'normal'
}

export function aggregateNasaPowerMonthly(
  territory: WeatherArea,
  latitude: number,
  longitude: number,
  dailyRows: DailyWeatherRow[],
): NasaPowerMonthlyRow[] {
  const groups = new Map<string, DailyWeatherRow[]>()
  for (const row of dailyRows) {
    const period = row.date.slice(0, 7)
    groups.set(period, [...(groups.get(period) ?? []), row])
  }

  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right)).map(
    ([period, rows]) => {
      const rainfallMm = rows.reduce((sum, row) => sum + row.precipitationMm, 0)
      const rainyDays = rows.filter((row) => row.precipitationMm >= 1).length
      const avgTemperatureC = average(rows.flatMap((row) => row.temperatureC == null ? [] : [row.temperatureC]))
      const avgRelativeHumidityPct = average(rows.flatMap((row) => row.relativeHumidityPct == null ? [] : [row.relativeHumidityPct]))
      const winds = rows.flatMap((row) => row.windSpeedKph == null ? [] : [row.windSpeedKph])
      const maxWindSpeedKph = winds.length ? Math.max(...winds) : null
      const rainfallSeverityProxy = weatherSeverity(
        rainfallMm,
        rainyDays,
        maxWindSpeedKph,
        avgTemperatureC,
      )
      return {
        provider: 'nasa_power',
        periodStart: `${period}-01`,
        territory,
        latitude,
        longitude,
        rainfallMm: Number(rainfallMm.toFixed(4)),
        rainyDays,
        avgTemperatureC: avgTemperatureC == null ? null : Number(avgTemperatureC.toFixed(4)),
        avgRelativeHumidityPct: avgRelativeHumidityPct == null ? null : Number(avgRelativeHumidityPct.toFixed(4)),
        maxWindSpeedKph: maxWindSpeedKph == null ? null : Number(maxWindSpeedKph.toFixed(4)),
        rainfallSeverityProxy,
        weatherAlertLevel: alertLevel(rainfallSeverityProxy),
      }
    },
  )
}

async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  worker: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length)
  let nextIndex = 0
  async function run() {
    while (nextIndex < values.length) {
      const index = nextIndex++
      results[index] = await worker(values[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, run))
  return results
}

function sqlText(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function sqlNumber(value: number | null): string {
  return value == null ? 'CAST(NULL AS DOUBLE)' : String(value)
}

function sqlTimestamp(value: Date): string {
  const timestamp = value.toISOString().replace('T', ' ').replace('Z', '')
  return `TIMESTAMP ${sqlText(timestamp)}`
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

async function ensureWeatherTables(): Promise<void> {
  await executeDatabricksStatement(`CREATE TABLE IF NOT EXISTS ${SILVER_TABLE} (
    provider STRING NOT NULL,
    period_start DATE NOT NULL,
    territory STRING NOT NULL,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    rainfall_mm DOUBLE NOT NULL,
    rainy_days INT NOT NULL,
    avg_temperature_c DOUBLE,
    avg_relative_humidity_pct DOUBLE,
    max_wind_speed_kph DOUBLE,
    rainfall_severity_proxy DOUBLE NOT NULL,
    weather_alert_level STRING NOT NULL,
    source_url STRING NOT NULL,
    source_period_start DATE NOT NULL,
    source_period_end DATE NOT NULL,
    fetched_at TIMESTAMP NOT NULL
  ) USING DELTA`)

  await executeDatabricksStatement(`CREATE OR REPLACE VIEW ${GOLD_VIEW} AS
    SELECT provider, period_start, territory, latitude, longitude,
      rainfall_mm, rainy_days, avg_temperature_c, avg_relative_humidity_pct,
      max_wind_speed_kph, rainfall_severity_proxy, weather_alert_level,
      source_url, source_period_start, source_period_end, fetched_at
    FROM ${SILVER_TABLE}`)
}

async function upsertMonthlyRows(
  rows: NasaPowerMonthlyRow[],
  sourceStart: string,
  sourceEnd: string,
  fetchedAt: Date,
  sourceUrl: string,
): Promise<void> {
  for (const batch of chunks(rows, 100)) {
    const values = batch.map((row) => `(
      ${sqlText(row.provider)}, DATE ${sqlText(row.periodStart)}, ${sqlText(row.territory)},
      ${row.latitude}, ${row.longitude}, ${row.rainfallMm}, ${row.rainyDays},
      ${sqlNumber(row.avgTemperatureC)}, ${sqlNumber(row.avgRelativeHumidityPct)},
      ${sqlNumber(row.maxWindSpeedKph)}, ${row.rainfallSeverityProxy},
      ${sqlText(row.weatherAlertLevel)}, ${sqlText(sourceUrl)},
      DATE ${sqlText(sourceStart)}, DATE ${sqlText(sourceEnd)}, ${sqlTimestamp(fetchedAt)}
    )`).join(',\n')

    await executeDatabricksStatement(`MERGE INTO ${SILVER_TABLE} AS target
      USING (
        SELECT * FROM VALUES ${values}
        AS source(provider, period_start, territory, latitude, longitude,
          rainfall_mm, rainy_days, avg_temperature_c, avg_relative_humidity_pct,
          max_wind_speed_kph, rainfall_severity_proxy, weather_alert_level,
          source_url, source_period_start, source_period_end, fetched_at)
      ) AS source
      ON target.provider = source.provider
        AND target.period_start = source.period_start
        AND target.territory = source.territory
      WHEN MATCHED THEN UPDATE SET *
      WHEN NOT MATCHED THEN INSERT *`, { timeoutMs: 120_000 })
  }
}

export async function refreshNasaPowerWeather(input: NasaPowerRefreshInput) {
  const normalized = normalizeInput(input)
  const fetchedAt = new Date()
  const sourceUrl = nasaPowerUrl()
  const grouped = await mapWithConcurrency(
    normalized.areas,
    FETCH_CONCURRENCY,
    async (area) => {
      const [latitude, longitude] = WEATHER_AREA_COORDINATES[area]
      const daily = await fetchNasaPowerDaily(
        area,
        latitude,
        longitude,
        normalized.start.iso,
        normalized.end.iso,
      )
      return {
        dailyRows: daily.length,
        monthly: aggregateNasaPowerMonthly(area, latitude, longitude, daily),
      }
    },
  )
  const monthlyRows = grouped.flatMap((result) => result.monthly)
  if (!monthlyRows.length) {
    throw new WeatherProviderUnavailableError('NASA POWER returned no usable weather observations')
  }

  await ensureWeatherTables()
  await upsertMonthlyRows(
    monthlyRows,
    normalized.start.iso,
    normalized.end.iso,
    fetchedAt,
    sourceUrl,
  )

  const territoryList = normalized.areas.map(sqlText).join(', ')
  const validation = await executeDatabricksStatement(`SELECT COUNT(*) AS saved_rows
    FROM ${GOLD_VIEW}
    WHERE provider = 'nasa_power'
      AND period_start BETWEEN DATE ${sqlText(normalized.start.iso)} AND DATE ${sqlText(normalized.end.iso)}
      AND territory IN (${territoryList})`)
  const savedRows = Number(validation.rows[0]?.saved_rows ?? 0)
  if (savedRows < monthlyRows.length) {
    throw new Error(
      `Databricks weather validation expected at least ${monthlyRows.length} rows but found ${savedRows}`,
    )
  }

  return {
    metadata: {
      provider: normalized.provider,
      source_url: sourceUrl,
      refreshed_at: fetchedAt.toISOString(),
      period_start: normalized.start.iso,
      period_end: normalized.end.iso,
      areas: normalized.areas,
      daily_rows_received: grouped.reduce((sum, result) => sum + result.dailyRows, 0),
      monthly_rows_loaded: monthlyRows.length,
      system_of_record: 'databricks',
      destination: 'workspace.medshield_gold.vw_weather_nasa_power_monthly_candidate',
      interpretation: 'NASA POWER is a provider-derived historical weather proxy, not an official PAGASA alert.',
    },
    rows_loaded: monthlyRows.length,
    persistence: {
      databricks: { persisted: true, saved_rows: savedRows },
      local: { persisted: false },
    },
  }
}
