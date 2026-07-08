export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000'
const TOKEN_KEY = 'medshield.accessToken'

export type Summary = {
  total_revenue: number
  total_income: number
  total_transactions: number
  top_product: string
  top_area: string
  avg_margin: number
}

export type MonthlyPoint = { period: string; revenue: number; income: number }
export type WeeklyPoint = { period: string; revenue: number; income: number }
export type AreaPoint = { area: string; revenue: number; income: number }
export type ProductPoint = {
  product: string
  revenue: number
  qty: number
  income: number
  abc: string
  pct_of_total: number
  cumulative_pct?: number
  rank?: number
}
export type YearPoint = { year: string; revenue: number; income: number; transactions: number }
export type SeasonalityPoint = { month: string; avg_revenue: number }
export type ForecastPoint = {
  period: string
  area: string
  product: string
  model_code: string
  forecast_scope: string
  baseline_forecast: number
  adjusted_forecast: number
  lower_bound: number
  upper_bound: number
}
export type ExternalSignalPoint = {
  period: string
  area: string
  disease_names: string
  disease_intensity_index: number
  rainfall_severity_index: number
  disease_alert_level: string
  weather_alert_level: string
  typhoon_flag: boolean
}
export type InventoryRecommendation = {
  product: string
  area: string
  annual_demand_units: number
  eoq_units: number
  reorder_point_units: number
  safety_stock_units: number
  risk_level: string
  recommendation: string
}
export type RegionalPriority = {
  area: string
  priority_rank: number
  revenue_score: number
  growth_score: number
  outbreak_risk_index: number
  mcda_score: number
  recommendation: string
}
export type ModelEvaluation = {
  model_code: string
  model_name: string
  analytics_layer: string
  metric_name: string
  metric_value: number
  target_direction: string
  benchmark_value: number | null
  passed: boolean | null
  notes: string
}

type DashboardData = {
  summary: Summary
  monthly: MonthlyPoint[]
  weekly: WeeklyPoint[]
  byArea: AreaPoint[]
  products: ProductPoint[]
  yearSummary: YearPoint[]
  seasonality: SeasonalityPoint[]
  forecasts: ForecastPoint[]
  externalSignals: ExternalSignalPoint[]
  inventoryRecommendations: InventoryRecommendation[]
  regionalPriorities: RegionalPriority[]
  modelEvaluation: ModelEvaluation[]
}

export type SalesTransaction = {
  year: number | null
  area: string | null
  dr_number: string | null
  date_delivered: string | null
  product: string | null
  quantity: number
  unit_cost: number
  total_cost: number
  discount: number
  net_cost: number
  trade_price_unit: number
  total_trade_price: number
  net_income: number
  margin_pct: number
  is_service_contract?: boolean | null
  quality_status: 'valid' | 'warning' | 'rejected'
  quality_notes: string
  source_sheet: string
  source_row_number: number
}

export type SalesDatasetStatus = {
  dataset_name: string
  source_file: string
  checksum: string
  received_at: string
  cleaning_status: string
  quality_summary: {
    input_stage: string
    rows_extracted: number
    rows_accepted: number
    rows_rejected: number
    rows_with_warnings: number
    duplicate_rows: number
    valid_rows: number
    years: Record<string, number>
    source_period_start: string | null
    source_period_end: string | null
    standardizations: Record<string, number>
    issues: Record<string, number>
    columns_received: string[]
    unique_products?: number
    unique_dr_numbers?: number
    sku_count?: number
    merge_strategy?: string
    merged_years?: string[]
  }
  canonical_columns: string[]
}

export type SalesPage = {
  metadata: SalesDatasetStatus
  rows: SalesTransaction[]
  pagination: {
    page: number
    page_size: number
    page_count: number
    total_rows: number
  }
  filters: {
    year: string
    search: string
    quality_status: string
  }
}

export type SalesSummary = {
  filters: {
    year: string
    search: string
    quality_status: string
  }
  counts: {
    rows: number
    accepted_rows: number
    rejected_rows: number
    warning_rows: number
    unique_products: number
    sku_count: number
    unique_dr_numbers: number
    years: number
  }
  sums: Record<string, number>
  averages: Record<string, number>
  top: {
    product: string
    area: string
  }
}

export type SalesUploadResult = {
  dataset: {
    file_name: string
    input_stage: string
    cleaning_status: string
    checksum: string
  }
  quality: SalesDatasetStatus['quality_summary']
  persistence: {
    local: {
      persisted: boolean
      path: string
      merge_strategy?: string
      years_replaced?: string[]
      total_rows?: number
    }
    warehouse: { configured: boolean; persisted: boolean; message?: string; pipeline_run_key?: number }
  }
}

export type WeatherEffect = {
  date?: string
  period: string
  area: string
  provider: string
  rainfall_mm: number
  rainy_days?: number
  rainy_day?: boolean
  avg_temperature_c?: number
  temperature_c?: number
  avg_relative_humidity_pct?: number | null
  relative_humidity_pct?: number | null
  max_wind_speed_kph?: number
  wind_speed_kph?: number
  rainfall_severity_proxy: number
  weather_alert_level: string
  high_wind_watch: boolean
  weather_adjustment_factor: number
  sales_revenue: number
  planning_demand_uplift_pct: number
}

export type WeatherEffects = {
  metadata: Record<string, unknown>
  rows: WeatherEffect[]
  summary: Array<Record<string, unknown>>
}

function authHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra)
  const token =
    typeof window === 'undefined'
      ? null
      : localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

async function getJson<T>(path: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: 'no-store',
      headers: authHeaders(),
    })
    if (!response.ok) throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    return (await response.json()) as T
  } catch (err) {
    // rethrow to let caller handle fallback
    throw err
  }
}

async function authenticatedJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: authHeaders(init.headers),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(String(body?.error ?? `Request failed: ${response.status}`))
  }
  return body as T
}

export function getSalesDatasetStatus() {
  return getJson<SalesDatasetStatus>('/api/sales/status')
}

export function getSalesTransactions(params: {
  year?: string
  page?: number
  pageSize?: number
  search?: string
  qualityStatus?: string
}) {
  const query = new URLSearchParams({
    year: params.year ?? 'all',
    page: String(params.page ?? 1),
    page_size: String(params.pageSize ?? 25),
    search: params.search ?? '',
    quality_status: params.qualityStatus ?? 'all',
  })
  return getJson<SalesPage>(`/api/sales/transactions?${query.toString()}`)
}

export function getSalesSummary(params: {
  year?: string
  search?: string
  qualityStatus?: string
}) {
  const query = new URLSearchParams({
    year: params.year ?? 'all',
    search: params.search ?? '',
    quality_status: params.qualityStatus ?? 'all',
  })
  return getJson<SalesSummary>(`/api/sales/summary?${query.toString()}`)
}

export function uploadSalesFile(file: File) {
  return authenticatedJson<SalesUploadResult>(
    `/api/sales/upload?file_name=${encodeURIComponent(file.name)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    },
  )
}

export function getWeatherEffects(params: { year?: string; area?: string; grain?: 'daily' | 'monthly' } = {}) {
  const query = new URLSearchParams({
    year: params.year ?? 'all',
    area: params.area ?? 'all',
    grain: params.grain ?? 'monthly',
  })
  return getJson<WeatherEffects>(`/api/weather/effects?${query.toString()}`)
}

export function refreshWeatherData(input: {
  start: string
  end: string
  areas: string[]
  provider: 'nasa_power' | 'open_meteo'
}) {
  return authenticatedJson<Record<string, unknown>>('/api/weather/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

async function getPublicJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Public data fetch failed: ${response.status}`)
  return (await response.json()) as T
}

function finiteNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value)
}

function hasValidMonthlyData(rows: MonthlyPoint[]): boolean {
  return Array.isArray(rows) && rows.length >= 12 && rows.every(
    (row) => row.period && finiteNumber(row.revenue) && finiteNumber(row.income),
  )
}

function hasValidWeeklyData(rows: WeeklyPoint[]): boolean {
  return Array.isArray(rows) && rows.every(
    (row) => row.period && finiteNumber(row.revenue) && finiteNumber(row.income),
  )
}

function hasValidYearSummaryData(rows: YearPoint[]): boolean {
  return Array.isArray(rows) && rows.length >= 3 && rows.every(
    (row) => row.year && finiteNumber(row.revenue) && finiteNumber(row.income),
  )
}

function hasValidAreaData(rows: AreaPoint[]): boolean {
  return Array.isArray(rows) && rows.length > 0 && rows.every(
    (row) => row.area && finiteNumber(row.revenue) && finiteNumber(row.income),
  )
}

function hasValidProductData(rows: ProductPoint[]): boolean {
  return Array.isArray(rows) && rows.length > 0 && rows.every(
    (row) => row.product && finiteNumber(row.revenue) && finiteNumber(row.income),
  )
}

function hasValidSeasonalityData(rows: SeasonalityPoint[]): boolean {
  return Array.isArray(rows) && rows.length >= 12 && rows.every(
    (row) => row.month && finiteNumber(row.avg_revenue),
  )
}

function assertDashboardCoreData(data: DashboardData, source: string): DashboardData {
  const invalid: string[] = []
  if (!hasValidMonthlyData(data.monthly)) invalid.push('monthly')
  if (!hasValidWeeklyData(data.weekly)) invalid.push('weekly')
  if (!hasValidYearSummaryData(data.yearSummary)) invalid.push('year summary')
  if (!hasValidAreaData(data.byArea)) invalid.push('area')
  if (!hasValidProductData(data.products)) invalid.push('product')
  if (!hasValidSeasonalityData(data.seasonality)) invalid.push('seasonality')

  if (invalid.length) {
    throw new Error(`${source} dashboard data is incomplete: ${invalid.join(', ')}`)
  }

  return data
}

export async function loadDashboardData() {
  try {
    const [
      summary,
      monthly,
      weekly,
      byArea,
      products,
      yearSummary,
      seasonality,
      forecasts,
      externalSignals,
      inventoryRecommendations,
      regionalPriorities,
      modelEvaluation,
    ] = await Promise.all([
      getJson<Summary>('/api/summary'),
      getJson<MonthlyPoint[]>('/api/monthly'),
      getJson<WeeklyPoint[]>('/api/weekly'),
      getJson<AreaPoint[]>('/api/by_area'),
      getJson<ProductPoint[]>('/api/products'),
      getJson<YearPoint[]>('/api/year_summary'),
      getJson<SeasonalityPoint[]>('/api/seasonality'),
      getJson<ForecastPoint[]>('/api/forecasts'),
      getJson<ExternalSignalPoint[]>('/api/external_signals'),
      getJson<InventoryRecommendation[]>('/api/inventory_recommendations'),
      getJson<RegionalPriority[]>('/api/regional_priorities'),
      getJson<ModelEvaluation[]>('/api/model_evaluation'),
    ])
    return assertDashboardCoreData({
      summary,
      monthly,
      weekly,
      byArea,
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
    // fallback to public dataset bundled with the frontend
    const data = await getPublicJson<any>('/data/sales_data.json')
    return assertDashboardCoreData({
      summary: data.totals as Summary,
      monthly: data.monthly as MonthlyPoint[],
      weekly: (data.weekly ?? []) as WeeklyPoint[],
      byArea: data.by_area as AreaPoint[],
      products: data.top_products as ProductPoint[],
      yearSummary: data.year_summary as YearPoint[],
      seasonality: data.seasonality as SeasonalityPoint[],
      forecasts: (data.forecasts ?? []) as ForecastPoint[],
      externalSignals: (data.external_signals ?? []) as ExternalSignalPoint[],
      inventoryRecommendations: (data.inventory_recommendations ?? []) as InventoryRecommendation[],
      regionalPriorities: (data.regional_priorities ?? []) as RegionalPriority[],
      modelEvaluation: (data.model_evaluation ?? []) as ModelEvaluation[],
    }, 'Bundled fallback')
  }
}
