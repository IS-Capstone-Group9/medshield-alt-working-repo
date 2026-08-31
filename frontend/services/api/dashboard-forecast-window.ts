import type { ForecastPoint } from '@/types/api.types'

export const ROLLING_FORECAST_MONTHS = 12

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

export type ForecastWindowMetadata = {
  current_month?: string | null
  forecast_window?: {
    start?: string | null
    end?: string | null
    months?: number | null
  } | null
}

export type RollingForecastWindow = {
  currentMonth: string
  start: string
  end: string
  periods: string[]
  labels: string[]
}

export function isPeriodKey(value: string | null | undefined): value is string {
  return typeof value === 'string' && PERIOD_PATTERN.test(value)
}

export function periodKeyFromDate(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  return `${year}-${String(month).padStart(2, '0')}`
}

export function parsePeriodKey(period: string): Date | null {
  if (!isPeriodKey(period)) return null
  const [year, month] = period.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1))
}

export function addMonthsToPeriod(period: string, offset: number): string {
  const date = parsePeriodKey(period)
  if (!date) {
    throw new Error(`Invalid period key: ${period}`)
  }
  date.setUTCMonth(date.getUTCMonth() + offset)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function formatPeriodLabel(period: string): string {
  const date = parsePeriodKey(period)
  if (!date) return period
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function resolveForecastCurrentMonth(
  metadata?: ForecastWindowMetadata,
  browserDate: Date = new Date(),
): string {
  const preferred = metadata?.current_month ?? metadata?.forecast_window?.start ?? null
  if (isPeriodKey(preferred)) {
    return preferred
  }
  return periodKeyFromDate(browserDate)
}

export function resolveForecastCurrentYear(
  metadata?: ForecastWindowMetadata,
  browserDate: Date = new Date(),
): string {
  return resolveForecastCurrentMonth(metadata, browserDate).slice(0, 4)
}

export function resolveNextForecastYear(
  metadata?: ForecastWindowMetadata,
  browserDate: Date = new Date(),
): string | null {
  const currentMonth = resolveForecastCurrentMonth(metadata, browserDate)
  const monthNumber = Number(currentMonth.slice(5, 7))
  if (monthNumber < 10) return null
  return String(Number(currentMonth.slice(0, 4)) + 1)
}

export function buildRollingForecastWindow(currentMonth: string): RollingForecastWindow {
  if (!isPeriodKey(currentMonth)) {
    throw new Error(`Invalid current month: ${currentMonth}`)
  }

  const periods = Array.from({ length: ROLLING_FORECAST_MONTHS }, (_, index) =>
    addMonthsToPeriod(currentMonth, index),
  )

  return {
    currentMonth,
    start: periods[0],
    end: periods[periods.length - 1],
    periods,
    labels: periods.map(formatPeriodLabel),
  }
}

export function resolveRollingForecastWindow(
  metadata?: ForecastWindowMetadata,
  browserDate: Date = new Date(),
): RollingForecastWindow {
  return buildRollingForecastWindow(resolveForecastCurrentMonth(metadata, browserDate))
}

export function filterForecastRowsToWindow<T extends { period: string }>(
  rows: T[],
  window: RollingForecastWindow,
): T[] {
  const periodSet = new Set(window.periods)
  return rows
    .filter((row) => periodSet.has(row.period))
    .sort((left, right) => left.period.localeCompare(right.period))
}

export function aggregateForecastRowsByPeriod(rows: ForecastPoint[]): ForecastPoint[] {
  const grouped = new Map<string, ForecastPoint[]>()

  for (const row of rows) {
    if (!isPeriodKey(row.period)) continue
    const periodRows = grouped.get(row.period) ?? []
    periodRows.push(row)
    grouped.set(row.period, periodRows)
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([period, periodRows]) => {
      const scopeRows = periodRows.filter((row) => row.forecast_scope === 'overall')
      const rowsToAggregate = scopeRows.length ? scopeRows : periodRows

      const aggregate = rowsToAggregate.reduce(
        (accumulator, row) => ({
          baseline_forecast: accumulator.baseline_forecast + (Number(row.baseline_forecast) || 0),
          adjusted_forecast: accumulator.adjusted_forecast + (Number(row.adjusted_forecast) || 0),
          lower_bound: accumulator.lower_bound + (Number(row.lower_bound) || 0),
          upper_bound: accumulator.upper_bound + (Number(row.upper_bound) || 0),
        }),
        {
          baseline_forecast: 0,
          adjusted_forecast: 0,
          lower_bound: 0,
          upper_bound: 0,
        },
      )

      return {
        ...rowsToAggregate[0],
        period,
        area: rowsToAggregate[0]?.area ?? 'All',
        product: rowsToAggregate[0]?.product ?? 'All',
        forecast_scope: rowsToAggregate[0]?.forecast_scope ?? 'overall',
        model_code: rowsToAggregate[0]?.model_code ?? 'UNKNOWN',
        ...aggregate,
      }
    })
}
