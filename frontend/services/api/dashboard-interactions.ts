import {
  getSalesDatasetStatus,
  getSalesTransactions,
  getSalesSummary,
  getWeatherEffects,
  refreshWeatherData,
  loadDashboardData,
} from '@/lib/api'
import { renderSalesComputation, renderSalesDatasetStatus } from './sales-view-helpers'
import { renderSalesPage, setSalesViewError } from './sales-page-helpers'
import { renderWeatherEffects } from './weather-view-helpers'
import { splitAreaSegments } from './dashboard-area-segments'
import { updateDashboardProvenance } from './dashboard-enhancements'
import { setDecisionSupportChartData } from './dashboard-decision-charts'
import { resolveForecastCurrentYear, resolveNextForecastYear } from './dashboard-forecast-window'
import {
  buildEstimatedMonthlyRowsForYear,
  buildEstimatedYearSummaryForYear,
} from './dashboard-year-estimates'
import type { DashboardData } from '@/types/api.types'

function dashboardDataForLegacyCharts(data: DashboardData): DashboardData {
  const currentAnalyticalYear = resolveForecastCurrentYear(data.dataStatus)
  const currentCalendarYear = String(new Date().getFullYear())
  const existingPeriods = new Set(data.monthly.map((row) => row.period))
  const completedYears = new Set(
    [...data.monthly.map((row) => row.period.slice(0, 4)), ...data.yearSummary.map((row) => row.year)]
      .filter((year) => /^\d{4}$/.test(year) && year < currentCalendarYear),
  )
  const forecastYears = [
    ...completedYears,
    currentAnalyticalYear,
    resolveNextForecastYear(data.dataStatus),
  ].filter((year): year is string => Boolean(year))
  const completionRows = []
  const estimatedSummaries = []

  for (const year of new Set(forecastYears)) {
    const estimatedMonthly = buildEstimatedMonthlyRowsForYear(data, year)
    const estimatedYearSummary = buildEstimatedYearSummaryForYear(data, year, estimatedMonthly)
    if (!estimatedMonthly.length || !estimatedYearSummary) continue
    completionRows.push(...estimatedMonthly.filter((row) => !existingPeriods.has(row.period)))
    estimatedSummaries.push(estimatedYearSummary)
  }

  if (!completionRows.length && !estimatedSummaries.length) return data
  const forecastYearSet = new Set(estimatedSummaries.map((row) => row.year))
  const yearSummaryWithoutForecasts = data.yearSummary.filter((row) => !forecastYearSet.has(row.year))

  return {
    ...data,
    monthly: [...data.monthly, ...completionRows].sort((left, right) =>
      left.period.localeCompare(right.period),
    ),
    yearSummary: [...yearSummaryWithoutForecasts, ...estimatedSummaries].sort(
      (left, right) => Number(left.year) - Number(right.year),
    ),
  }
}

export function installCommonInteractions(root: HTMLElement) {
  const backdrop = root.querySelector<HTMLElement>('#dashboardHelpBackdrop') || root.querySelector<HTMLElement>('#helpGuidanceModal')
  root.querySelector('#closeDashboardHelpButton')?.addEventListener('click', () => {
    backdrop?.classList.remove('is-open')
    if (backdrop) backdrop.style.display = 'none'
  })
  backdrop?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      backdrop.classList.remove('is-open')
      backdrop.style.display = 'none'
    }
  })
}

export async function refreshDashboardFromGateway() {
  const applyDatasetPatch = (window as any).applyDatasetPatch
  if (typeof applyDatasetPatch !== 'function') return

  const data = await loadDashboardData()
  const legacyChartData = dashboardDataForLegacyCharts(data)
  const areaSegments = splitAreaSegments(data.byArea)
  const root = document.querySelector<HTMLElement>('.medshield-root')
  if (root) {
    updateDashboardProvenance(root, data.dataStatus, data.yearSummary.map((row) => row.year))
  }
  applyDatasetPatch({
    data_status: data.dataStatus,
    monthly: legacyChartData.monthly,
    by_area: data.byArea,
    by_year_area: data.byYearArea,
    by_territory: areaSegments.territory,
    by_channel: areaSegments.channel,
    by_business_line: areaSegments.businessLine,
    top_products: data.products,
    year_summary: legacyChartData.yearSummary,
    seasonality: data.seasonality,
  })
  if (root) setDecisionSupportChartData(root, data)
}

export async function loadSalesDataView(root: HTMLElement, state: any) {
  const [datasetStatus, page, summary] = await Promise.all([
    getSalesDatasetStatus(),
    getSalesTransactions({
      year: state.year,
      page: state.page,
      pageSize: state.pageSize,
      search: state.search,
      qualityStatus: state.qualityStatus,
    }),
    getSalesSummary({
      year: state.year,
      search: state.search,
      qualityStatus: state.qualityStatus,
    }),
  ])
  state.page = page.pagination.page
  renderSalesDatasetStatus(root, datasetStatus)
  renderSalesComputation(root, summary, state.computation)
  renderSalesPage(root, page)
}

export async function loadWeatherEffectView(root: HTMLElement) {
  const year = root.querySelector<HTMLSelectElement>('#weatherYear')?.value ?? String(new Date().getFullYear())
  const area = root.querySelector<HTMLSelectElement>('#weatherArea')?.value ?? 'all'
  const grain = (root.querySelector<HTMLSelectElement>('#weatherGrain')?.value ?? 'monthly') as 'daily' | 'monthly'
  renderWeatherEffects(root, await getWeatherEffects({ year, area, grain }))
}
