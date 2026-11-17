import {financialScopeSelection, type FinancialScope} from './financial-scope'
import { getJson } from './api-client'
import {
  DashboardData,
  Summary,
  MonthlyPoint,
  AreaPoint,
  ProductPoint,
  YearPoint,
  SeasonalityPoint,
} from '@/types/api.types'

function finiteNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value)
}

function nullableMeasure(value: unknown): boolean {
  return value === null || finiteNumber(value)
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonemptyLabel(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function hasValidSummary(data: Summary): boolean {
  return record(data) && nullableMeasure(data.total_revenue) && nullableMeasure(data.total_income)
    && finiteNumber(data.total_transactions) && nullableMeasure(data.avg_margin)
}

function hasValidMonthlyData(rows: MonthlyPoint[]): boolean {
  return Array.isArray(rows) && rows.length > 0 && rows.every(
    (row) => record(row) && typeof row.period === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(row.period)
      && nullableMeasure(row.revenue) && nullableMeasure(row.income)
  )
}

function hasValidYearSummaryData(rows: YearPoint[]): boolean {
  return Array.isArray(rows) && rows.length > 0 && rows.every(
    (row) => record(row) && typeof row.year === 'string' && /^\d{4}$/.test(row.year)
      && nullableMeasure(row.revenue) && nullableMeasure(row.income)
  )
}

function hasValidAreaData(rows: AreaPoint[]): boolean {
  return Array.isArray(rows) && rows.length > 0 && rows.every(
    (row) => record(row) && nonemptyLabel(row.area) && nullableMeasure(row.revenue) && nullableMeasure(row.income)
  )
}

function hasValidProductData(rows: ProductPoint[]): boolean {
  return Array.isArray(rows) && rows.length > 0 && rows.every(
    (row) => record(row) && nonemptyLabel(row.product) && nullableMeasure(row.revenue) && nullableMeasure(row.income)
  )
}

function hasValidSeasonalityData(rows: SeasonalityPoint[]): boolean {
  return Array.isArray(rows) && rows.length > 0 && rows.every(
    (row) => record(row) && nonemptyLabel(row.month) && nullableMeasure(row.avg_revenue)
  )
}

function assertDashboardCoreData(data: DashboardData, source: string): DashboardData {
  const invalid: string[] = []
  if (!hasValidSummary(data.summary)) invalid.push('summary')
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

export async function loadDashboardData(scope:FinancialScope=financialScopeSelection().scope, options:Pick<RequestInit, 'signal'> = {}): Promise<DashboardData & {financialSectors:any}> {
  const {snapshot,sectors}=await getJson<any>('/api/financial/dashboard?financial_scope='+scope, options)
  const dataStatus=snapshot.data_status
  if(dataStatus.source!=='databricks'||dataStatus.mode!=='live'||dataStatus.release?.financial_scope?.id!==scope)
    throw new Error('The gateway did not return a live Databricks data contract for the requested financial scope')
  const result=assertDashboardCoreData({dataStatus,summary:snapshot.totals,monthly:snapshot.monthly,
    byArea:snapshot.by_area,products:snapshot.top_products,yearSummary:snapshot.year_summary,
    seasonality:snapshot.seasonality,forecasts:snapshot.forecasts??[],externalSignals:snapshot.external_signals??[],
    inventoryRecommendations:snapshot.inventory_recommendations??[],regionalPriorities:snapshot.regional_priorities??[],
    modelEvaluation:snapshot.model_evaluation??[]},'Databricks')
  return {...result,financialSectors:sectors}
}
