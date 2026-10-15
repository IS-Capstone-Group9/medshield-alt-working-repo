import type { CatalogMetadata } from './sales.types'
export type Summary = {
  total_revenue: number | null
  total_income: number | null
  total_transactions: number
  top_product: string
  top_area: string
  avg_margin: number | null
}

export type MonthlyPoint = {
  period: string; revenue: number | null; income: number | null
  margin_revenue_basis?: number | null
  transaction_count?: number
  has_sales_activity?: boolean
  missing?: boolean
}
export type AreaPoint = { area: string; revenue: number | null; income: number | null }
export type ProductPoint = Partial<CatalogMetadata> & { product: string; revenue: number | null; qty: number | null; income: number | null; abc: string; pct_of_total: number | null; estimated_qty?: number | null; verified_qty?: number | null; transaction_provenance?: string[]; transaction_lineage?: string[] }
export type YearPoint = { year: string; revenue: number | null; income: number | null; transactions: number }
export type SeasonalityPoint = { month: string; avg_revenue: number | null; observed_month_count?: number; method?: string }
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

export type DashboardDataStatus = {
  release?: { dataset_id: string; fact_delta_version: number; policy_version: string; publication_status: string }
  source: 'databricks'
  mode: 'live'
  loaded_at: string
  message: string
  catalog?: string
  schema?: string
  candidate_only?: boolean
}

export type DashboardData = {
  dataStatus: DashboardDataStatus
  summary: Summary
  monthly: MonthlyPoint[]
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

export type {
  SalesTransaction,
  SalesDatasetStatus,
  SalesPage,
  SalesSummary,
  SalesUploadResult,
} from './sales.types'

export type {
  WeatherEffect,
  WeatherEffects,
} from './weather.types'
