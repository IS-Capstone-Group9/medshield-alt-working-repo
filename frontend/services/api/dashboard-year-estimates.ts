import type {
  AreaPoint,
  DashboardData,
  ForecastPoint,
  MonthlyPoint,
  SeasonalityPoint,
  YearPoint,
} from '@/types/api.types'

const YEAR_PATTERN = /^\d{4}$/
const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const FALLBACK_FORWARD_MARGIN = 0.48
const MIN_FORWARD_MARGIN = 0.05
const MAX_FORWARD_MARGIN = 0.88

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

function currentMonthForData(data: DashboardData): string {
  const configured = data.dataStatus?.current_month ?? data.dataStatus?.forecast_window?.start
  if (typeof configured === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(configured)) return configured
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function validForwardMargin(revenue: number, income: number): number | null {
  if (!finite(revenue) || !finite(income) || revenue <= 0) return null
  const margin = income / revenue
  if (!Number.isFinite(margin) || margin <= 0 || margin >= 1) return null
  return Math.max(MIN_FORWARD_MARGIN, Math.min(MAX_FORWARD_MARGIN, margin))
}

function weightedAverage(values: number[]): number | null {
  if (!values.length) return null
  const denominator = values.reduce((sum, _value, index) => sum + index + 1, 0)
  const numerator = values.reduce((sum, value, index) => sum + value * (index + 1), 0)
  return numerator / denominator
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

export function resolveWeightedForwardProfitMargin(data: DashboardData): number {
  const annualMargins = data.yearSummary
    .map((row) => ({
      year: Number(row.year),
      margin: validForwardMargin(row.revenue, row.income),
    }))
    .filter((row): row is { year: number; margin: number } => Number.isFinite(row.year) && row.margin !== null)
    .sort((left, right) => left.year - right.year)
    .slice(-3)
    .map((row) => row.margin)
  const annualMargin = weightedAverage(annualMargins)
  if (annualMargin !== null) return annualMargin

  const monthlyMargins = [...data.monthly]
    .sort((left, right) => left.period.localeCompare(right.period))
    .map((row) => validForwardMargin(row.revenue, row.income))
    .filter((margin): margin is number => margin !== null)
    .slice(-12)
  return weightedAverage(monthlyMargins) ?? FALLBACK_FORWARD_MARGIN
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

  const currentMonth = currentMonthForData(data)
  const currentYear = currentMonth.slice(0, 4)
  const actualCutoff = year < currentYear ? `${year}-12` : year === currentYear ? currentMonth : null
  const actualByPeriod = new Map(
    data.monthly
      .filter(
        (row) =>
          actualCutoff !== null &&
          row.period?.startsWith(`${year}-`) &&
          row.period <= actualCutoff &&
          finite(row.revenue) &&
          finite(row.income),
      )
      .map((row) => [row.period, row]),
  )
  const forecastByPeriod = new Map(
    aggregateForecastRowsByPeriod(data.forecasts)
      .filter((row) => row.period.startsWith(`${year}-`))
      .map((row) => [row.period, row]),
  )
  const seasonalIndices = seasonalityIndexByMonth(data.seasonality)
  const baseline = fallbackRevenueBaseline(data)
  const margin = resolveWeightedForwardProfitMargin(data)

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const period = monthPeriod(year, monthIndex)
    const actual = actualByPeriod.get(period)
    if (actual) return actual

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

export function buildEstimatedYearSummaryForYear(
  data: DashboardData,
  year: string,
  monthlyRows: MonthlyPoint[] = buildEstimatedMonthlyRowsForYear(data, year),
): YearPoint | null {
  if (!YEAR_PATTERN.test(year) || monthlyRows.length === 0) return null

  const revenue = monthlyRows.reduce((sum, row) => sum + (finite(row.revenue) ? row.revenue : 0), 0)
  const income = monthlyRows.reduce((sum, row) => sum + (finite(row.income) ? row.income : 0), 0)
  const historicalTransactionDensity =
    average(
      data.yearSummary
        .filter((row) => finite(row.revenue) && row.revenue > 0 && finite(row.transactions))
        .map((row) => row.transactions / row.revenue),
    ) ?? 0

  return {
    year,
    revenue: Math.round(revenue),
    income: Math.round(income),
    transactions: Math.round(revenue * historicalTransactionDensity),
  }
}

export function buildEstimatedAreaRowsForYear(data: DashboardData, year: string): AreaPoint[] {
  if (!YEAR_PATTERN.test(year)) return data.byArea ?? []

  // If we already have isolated historical records for this year, use them
  if (data.byYearArea && Array.isArray(data.byYearArea[year]) && data.byYearArea[year].length > 0) {
    return data.byYearArea[year]
  }

  // Otherwise, compute recency-weighted forward estimates (e.g. 2026)
  const estimatedMonthly = buildEstimatedMonthlyRowsForYear(data, year)
  const totalEstimatedRevenue = estimatedMonthly.reduce(
    (sum, row) => sum + (finite(row.revenue) ? row.revenue : 0),
    0,
  )
  if (totalEstimatedRevenue <= 0) return data.byArea ?? []

  const margin = resolveWeightedForwardProfitMargin(data)

  // Use up to 3 recent historical years for recency weighting (weight: 3, 2, 1)
  const availableYears = Object.keys(data.byYearArea ?? {})
    .filter((yr) => YEAR_PATTERN.test(yr) && yr < year)
    .sort()
    .slice(-3)

  if (availableYears.length > 0) {
    const areaWeightedShares = new Map<string, number>()
    let totalWeight = 0

    availableYears.forEach((yr, idx) => {
      const weight = idx + 1 // 1 for oldest, 2 for middle, 3 for newest
      const rows = (data.byYearArea ?? {})[yr] ?? []
      const yrTotal = rows.reduce((s, r) => s + (finite(r.revenue) ? r.revenue : 0), 0)
      if (yrTotal > 0) {
        totalWeight += weight
        for (const row of rows) {
          if (!row.area || !finite(row.revenue)) continue
          const current = areaWeightedShares.get(row.area) ?? 0
          areaWeightedShares.set(row.area, current + (row.revenue / yrTotal) * weight)
        }
      }
    })

    if (totalWeight > 0 && areaWeightedShares.size > 0) {
      const result: AreaPoint[] = []
      for (const [area, weightedShare] of areaWeightedShares.entries()) {
        const normalizedShare = weightedShare / totalWeight
        const revenue = Math.round(totalEstimatedRevenue * normalizedShare)
        const income = Math.round(revenue * margin)
        result.push({ area, revenue, income })
      }
      return result.sort((a, b) => b.revenue - a.revenue)
    }
  }

  // Fallback if byYearArea is not available: use cumulative shares from data.byArea
  const totalBaseRev = (data.byArea ?? []).reduce((s, r) => s + (finite(r.revenue) ? r.revenue : 0), 0)
  if (totalBaseRev <= 0) return data.byArea ?? []

  return (data.byArea ?? []).map((row) => {
    const share = (finite(row.revenue) && row.revenue > 0) ? row.revenue / totalBaseRev : 0
    const revenue = Math.round(totalEstimatedRevenue * share)
    const income = Math.round(revenue * margin)
    return { area: row.area, revenue, income }
  }).sort((a, b) => b.revenue - a.revenue)
}

export function areaRowsForView(
  data: DashboardData,
  year: string | null,
): { rows: AreaPoint[]; isEstimated: boolean; selectedYear: string } {
  const normalizedYear = (year ?? '').trim()
  if (!normalizedYear || normalizedYear.toLowerCase() === 'all' || !YEAR_PATTERN.test(normalizedYear)) {
    return {
      rows: data.byArea ?? [],
      isEstimated: false,
      selectedYear: 'All available years',
    }
  }

  if (data.byYearArea && Array.isArray(data.byYearArea[normalizedYear]) && data.byYearArea[normalizedYear].length > 0) {
    return {
      rows: data.byYearArea[normalizedYear],
      isEstimated: false,
      selectedYear: normalizedYear,
    }
  }

  return {
    rows: buildEstimatedAreaRowsForYear(data, normalizedYear),
    isEstimated: true,
    selectedYear: normalizedYear,
  }
}
