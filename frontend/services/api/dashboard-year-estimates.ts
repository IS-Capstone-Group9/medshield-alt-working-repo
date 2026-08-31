import type { DashboardData, ForecastPoint, MonthlyPoint, SeasonalityPoint } from '@/types/api.types'

const YEAR_PATTERN = /^\d{4}$/
const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function average(values: number[]): number | null {
  const validValues = values.filter((value) => Number.isFinite(value))
  if (!validValues.length) return null
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length
}

function monthPeriod(year: string, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

function seasonalityIndexByMonth(rows: SeasonalityPoint[]): Map<number, number> {
  const validRows = rows.filter((row) => row.month && finite(row.avg_revenue))
  const mean = average(validRows.map((row) => row.avg_revenue)) ?? 0
  const indices = new Map<number, number>()

  for (const row of validRows) {
    const monthIndex = MONTH_NAMES.indexOf(String(row.month).trim().slice(0, 3).toLowerCase())
    if (monthIndex < 0) continue
    indices.set(monthIndex + 1, mean > 0 ? row.avg_revenue / mean : 1)
  }

  return indices
}

function historicalProfitMargin(rows: MonthlyPoint[]): number {
  const totals = rows.reduce(
    (accumulator, row) => {
      if (finite(row.revenue) && row.revenue > 0 && finite(row.income)) {
        accumulator.revenue += row.revenue
        accumulator.income += row.income
      }
      return accumulator
    },
    { revenue: 0, income: 0 },
  )

  return totals.revenue > 0 ? Math.max(0, Math.min(1, totals.income / totals.revenue)) : 0.42
}

function fallbackRevenueBaseline(data: DashboardData): number {
  return (
    average(
      [...data.monthly]
        .filter((row) => finite(row.revenue) && row.revenue > 0)
        .sort((left, right) => left.period.localeCompare(right.period))
        .slice(-3)
        .map((row) => row.revenue),
    ) ??
    average(data.seasonality.filter((row) => finite(row.avg_revenue)).map((row) => row.avg_revenue)) ??
    0
  )
}

function aggregateForecastRowsByPeriod(rows: ForecastPoint[]): ForecastPoint[] {
  const grouped = new Map<string, ForecastPoint[]>()

  for (const row of rows) {
    if (!row.period) continue
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

export function hasMonthlyRowsForYear(rows: MonthlyPoint[], year: string | null): boolean {
  return Boolean(year) && rows.some((row) => row.period?.startsWith(`${year}-`) && finite(row.revenue))
}

export function buildEstimatedMonthlyRowsForYear(data: DashboardData, year: string): MonthlyPoint[] {
  if (!YEAR_PATTERN.test(year)) return []

  const forecastByPeriod = new Map(
    aggregateForecastRowsByPeriod(data.forecasts)
      .filter((row) => row.period.startsWith(`${year}-`))
      .map((row) => [row.period, row]),
  )
  const seasonalIndices = seasonalityIndexByMonth(data.seasonality)
  const baseline = fallbackRevenueBaseline(data)
  const margin = historicalProfitMargin(data.monthly)

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const period = monthPeriod(year, monthIndex)
    const forecast = forecastByPeriod.get(period)
    const month = monthIndex + 1
    const seasonalIndex = seasonalIndices.get(month) ?? 1
    const revenue = finite(forecast?.adjusted_forecast)
      ? forecast.adjusted_forecast
      : Math.round(baseline * seasonalIndex)

    return {
      period,
      revenue,
      income: Math.round(revenue * margin),
    }
  })
}
