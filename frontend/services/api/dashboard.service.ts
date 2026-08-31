import { getJson, getPublicJson } from './api-client'
import {
  DashboardData,
  Summary,
  MonthlyPoint,
  AreaPoint,
  ProductPoint,
  YearPoint,
  SeasonalityPoint,
  ForecastPoint,
  ExternalSignalPoint,
  InventoryRecommendation,
  RegionalPriority,
  ModelEvaluation,
  DashboardDataStatus,
} from '@/types/api.types'

function finiteNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value)
}

function hasValidMonthlyData(rows: MonthlyPoint[]): boolean {
  return Array.isArray(rows) && rows.length >= 12 && rows.every(
    (row) => row.period && finiteNumber(row.revenue) && finiteNumber(row.income)
  )
}

function hasValidYearSummaryData(rows: YearPoint[]): boolean {
  return Array.isArray(rows) && rows.length >= 3 && rows.every(
    (row) => row.year && finiteNumber(row.revenue) && finiteNumber(row.income)
  )
}

function hasValidAreaData(rows: AreaPoint[]): boolean {
  return Array.isArray(rows) && rows.length > 0 && rows.every(
    (row) => row.area && finiteNumber(row.revenue) && finiteNumber(row.income)
  )
}

function hasValidProductData(rows: ProductPoint[]): boolean {
  return Array.isArray(rows) && rows.length > 0 && rows.every(
    (row) => row.product && finiteNumber(row.revenue) && finiteNumber(row.income)
  )
}

function hasValidSeasonalityData(rows: SeasonalityPoint[]): boolean {
  return Array.isArray(rows) && rows.length >= 12 && rows.every(
    (row) => row.month && finiteNumber(row.avg_revenue)
  )
}

function assertDashboardCoreData(data: DashboardData, source: string): DashboardData {
  const invalid: string[] = []
  if (!hasValidMonthlyData(data.monthly)) invalid.push('monthly')
  if (!hasValidYearSummaryData(data.yearSummary)) invalid.push('year summary')
  if (!hasValidAreaData(data.byArea)) invalid.push('area')
  if (!hasValidProductData(data.products)) invalid.push('product')
  if (!hasValidSeasonalityData(data.seasonality)) invalid.push('seasonality')

  if (invalid.length) {
    throw new Error(`${source} dashboard data is incomplete: ${invalid.join(', ')}`)
  }
  return data
}

export async function loadDashboardData(): Promise<DashboardData> {
  try {
    const [
      dataStatus,
      summary,
      monthly,
      byArea,
      byYearArea,
      products,
      yearSummary,
      seasonality,
      forecasts,
      externalSignals,
      inventoryRecommendations,
      regionalPriorities,
      modelEvaluation,
    ] = await Promise.all([
      getJson<DashboardDataStatus>('/api/dashboard_status'),
      getJson<Summary>('/api/summary'),
      getJson<MonthlyPoint[]>('/api/monthly'),
      getJson<AreaPoint[]>('/api/by_area'),
      getJson<Record<string, AreaPoint[]>>('/api/by_year_area').catch(() => undefined),
      getJson<ProductPoint[]>('/api/products?limit=15'),
      getJson<YearPoint[]>('/api/year_summary'),
      getJson<SeasonalityPoint[]>('/api/seasonality'),
      getJson<ForecastPoint[]>('/api/forecasts'),
      getJson<ExternalSignalPoint[]>('/api/external_signals'),
      getJson<InventoryRecommendation[]>('/api/inventory_recommendations'),
      getJson<RegionalPriority[]>('/api/regional_priorities'),
      getJson<ModelEvaluation[]>('/api/model_evaluation'),
    ])
    return assertDashboardCoreData({
      dataStatus,
      summary,
      monthly,
      byArea,
      byYearArea,
      products,
      yearSummary,
      seasonality,
      forecasts,
      externalSignals,
      inventoryRecommendations,
      regionalPriorities,
      modelEvaluation,
    }, 'Gateway')
  } catch (err) {
    const data = await getPublicJson<any>('/data/sales_data.json')
    return assertDashboardCoreData({
      dataStatus: {
        source: 'bundled_fallback',
        mode: 'demo',
        loaded_at: new Date().toISOString(),
        message: 'Bundled demonstration snapshot; not a live operational feed.',
        ...(data.data_status ?? {}),
      },
      summary: data.totals as Summary,
      monthly: data.monthly as MonthlyPoint[],
      byArea: data.by_area as AreaPoint[],
      byYearArea: data.by_year_area as Record<string, AreaPoint[]>,
      products: data.top_products as ProductPoint[],
      yearSummary: data.year_summary as YearPoint[],
      seasonality: data.seasonality as SeasonalityPoint[],
      forecasts: (data.forecasts ?? data.forecast ?? []) as ForecastPoint[],
      externalSignals: (data.external_signals ?? []) as ExternalSignalPoint[],
      inventoryRecommendations: (data.inventory_recommendations ?? []) as InventoryRecommendation[],
      regionalPriorities: (data.regional_priorities ?? []) as RegionalPriority[],
      modelEvaluation: (data.model_evaluation ?? []) as ModelEvaluation[],
    }, 'Bundled fallback')
  }
}
