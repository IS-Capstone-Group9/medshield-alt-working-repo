import {
  getSalesDatasetStatus,
  getSalesTransactions,
  getSalesSummary,
  getWeatherEffects,
  loadDashboardData,
  refreshWeatherData,
} from '@/lib/api'
import { renderSalesComputation, renderSalesDatasetStatus } from './sales-view-helpers'
import { renderSalesPage, setSalesViewError } from './sales-page-helpers'
import { renderWeatherEffects } from './weather-view-helpers'
import { updateDashboardProvenance } from './dashboard-enhancements'
import { setDecisionSupportChartData } from './dashboard-decision-charts'
import { getJson, authenticatedJson } from './api-client'

let heatmapRequest = 0
export async function refreshSalesHeatmap() {
  const request = ++heatmapRequest
  const apply = (window as any).setSalesHeatmapData
  if (typeof apply !== 'function') return
  apply(null, 'Loading product-level quantities…')
  try {
    const data = await getJson('/api/sales/heatmap')
    if (request === heatmapRequest) apply(data)
  } catch {
    if (request === heatmapRequest) apply(null, 'Product quantities unavailable from Databricks Gold; no local or demonstration quantities were substituted.')
  }
}

let sectorRequest = 0
export async function refreshSalesSectors() {
  const request = ++sectorRequest
  const apply = (window as any).setSalesSectorsData
  if (typeof apply !== 'function') return
  apply(null, 'Loading buyer-sector analysis…')
  try {
    const data = await getJson('/api/sales/sectors')
    if (request === sectorRequest) apply(data)
  } catch {
    if (request === sectorRequest) apply(null, 'Buyer-sector analysis unavailable from Databricks Gold; no local or demonstration classifications were substituted.')
  }
}

let forecastRequest = 0
export async function refreshForecastValidation() {
  const request = ++forecastRequest
  const apply = (window as any).setForecastValidationData
  if (typeof apply !== 'function') return
  const value = (id: string) => (document.getElementById(id) as HTMLSelectElement | null)?.value ?? ''
  const params = new URLSearchParams({ sector: value('forecastSector') || 'Unknown', product: value('forecastProduct'), metric: value('forecastMetric') || 'revenue' })
  apply(null, 'Loading source-backed forecast evidence…')
  try {
    const data = await getJson(`/api/sales/forecast-validation?${params}`)
    if (request === forecastRequest && (window as any).setForecastValidationData === apply) apply(data)
  } catch {
    if (request === forecastRequest && (window as any).setForecastValidationData === apply) apply(null, 'Forecast evidence unavailable from Databricks Gold for the selected scope; no example forecasts were substituted.')
  }
}

let regressionRequest = 0
export async function refreshExternalRegression() {
  const request = ++regressionRequest
  const apply = (window as any).setExternalRegressionData
  const fields: Record<string, string> = { sector: 'regSector', territory: 'regTerritory', product: 'regProduct', metric: 'regMetric', mode: 'regMode', provider: 'regProvider', disease: 'regDisease', lag: 'regLag', rainfall_lag: 'regRainLag' }
  const params = new URLSearchParams()
  for (const [key, id] of Object.entries(fields)) {
    const val = (document.getElementById(id) as HTMLSelectElement | null)?.value
    if (val && val.trim() !== '') params.set(key, val.trim())
  }
  apply(null, 'Loading matched sales and external evidence…')
  try {
    const data = await getJson(`/api/sales/external-regression?${params}`)
    if (request === regressionRequest && (window as any).setExternalRegressionData === apply) apply(data)
  } catch {
    if (request === regressionRequest && (window as any).setExternalRegressionData === apply) apply(null, 'Regression evidence unavailable from Databricks Gold for the selected scope; no demonstration results were substituted.')
  }
}

let planningRequest = 0, planningSolve = 0
export async function refreshPlanning() {
  const request = ++planningRequest
  ++planningSolve
  const apply = (window as any).setPlanningData
  if (typeof apply !== 'function') return
  const value = (id: string) => (document.getElementById(id) as HTMLSelectElement)?.value
  const params = new URLSearchParams({ sector: value('planSector') || 'Unknown', territory: value('planTerritory') || 'all' })
  apply(null, 'Loading source-ranked products…')
  try {
    const data = await getJson(`/api/sales/planning-shortlist?${params}`)
    if (request === planningRequest && (window as any).setPlanningData === apply) apply(data)
  } catch { if (request === planningRequest && (window as any).setPlanningData === apply) apply(null, 'Shortlist unavailable from Databricks Gold; no demonstration products were substituted.') }
}

async function solvePlanning() {
  const request = ++planningSolve
  const apply = (window as any).setPlanningResult
  if (typeof apply !== 'function') return
  try {
    const body = (window as any).getPlanningRequest()
    const result = await authenticatedJson('/api/sales/planning-solve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (request === planningSolve && (window as any).setPlanningResult === apply) apply(result)
  } catch (error) { if (request === planningSolve && (window as any).setPlanningResult === apply) apply(null, error instanceof Error ? error.message : 'Planning failed') }
}

export function installCommonInteractions(root: HTMLElement, activeListeners: any[] = []) {
  for (const [type, listener] of Object.entries({ 'medshield:planning-change': () => { void refreshPlanning() }, 'medshield:planning-solve': () => { void solvePlanning() }, 'medshield:plan-invalidated': () => { ++planningSolve } })) {
    window.addEventListener(type, listener)
    activeListeners.push({ target: window, type, listener })
  }
  const refreshRegression = () => { void refreshExternalRegression() }
  window.addEventListener('medshield:regression-change', refreshRegression)
  activeListeners.push({ target: window, type: 'medshield:regression-change', listener: refreshRegression })
  const refreshForecast = () => { void refreshForecastValidation() }
  window.addEventListener('medshield:forecast-change', refreshForecast)
  activeListeners.push({ target: window, type: 'medshield:forecast-change', listener: refreshForecast })
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

const loadedDeferredPages = new Set<string>()

export function resetDashboardDeferredLoads() {
  loadedDeferredPages.clear()
}

export function refreshDashboardModulesForPage(pageName: string) {
  if (loadedDeferredPages.has(pageName)) return

  let loaders: Array<() => Promise<void>> = []
  if (pageName === 'revenue') loaders = [refreshSalesHeatmap]
  if (pageName === 'products') loaders = [refreshSalesSectors]
  if (pageName === 'territory') loaders = [refreshSalesSectors]
  if (pageName === 'forecast') loaders = [refreshForecastValidation, refreshExternalRegression]
  if (pageName === 'inventory') loaders = [refreshPlanning]
  if (!loaders.length) return

  loadedDeferredPages.add(pageName)
  void Promise.allSettled(loaders.map((load) => load())).then((results) => {
    if (results.some((result) => result.status === 'rejected')) loadedDeferredPages.delete(pageName)
  })
}

export async function refreshDashboardFromGateway() {
  const applyDatasetPatch = (window as any).applyDatasetPatch
  if (typeof applyDatasetPatch !== 'function') {
    throw new Error('Dashboard live-data adapter is unavailable')
  }

  const data = await loadDashboardData()
  const root = document.querySelector<HTMLElement>('.medshield-root')
  if (root) {
    updateDashboardProvenance(root, data.dataStatus, data.yearSummary.map((row) => row.year))
    const currency = new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      notation: 'compact',
      maximumFractionDigits: 1,
    })
    const integer = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 })
    const metrics: Record<string, string> = {
      kpiOverviewTotalRevenue: currency.format(data.summary.total_revenue),
      kpiOverviewGrossProfit: currency.format(data.summary.total_income),
      kpiOverviewTransactions: integer.format(data.summary.total_transactions),
      kpiOverviewGrossMargin: data.summary.avg_margin == null
        ? 'Unavailable'
        : `${data.summary.avg_margin.toFixed(2)}%`,
    }
    for (const [id, value] of Object.entries(metrics)) {
      const element = root.querySelector<HTMLElement>(`#${id}`)
      if (element) element.textContent = value
    }
  }
  applyDatasetPatch({
    monthly: data.monthly,
    by_area: data.byArea,
    top_products: data.products,
    year_summary: data.yearSummary,
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
  const year = root.querySelector<HTMLSelectElement>('#weatherYear')?.value ?? '2024'
  const area = root.querySelector<HTMLSelectElement>('#weatherArea')?.value ?? 'all'
  const grain = (root.querySelector<HTMLSelectElement>('#weatherGrain')?.value ?? 'monthly') as 'daily' | 'monthly'
  const provider = (root.querySelector<HTMLSelectElement>('#weatherProvider')?.value ?? 'PAGASA') as 'PAGASA' | 'nasa_power'
  const status = root.querySelector<HTMLElement>('#weatherEffectStatus')
  if (status) status.textContent = `Loading ${provider === 'nasa_power' ? 'NASA POWER' : 'PAGASA'} records from Databricks Gold…`
  renderWeatherEffects(root, await getWeatherEffects({ year, area, grain, provider }))
}

export async function refreshSelectedWeatherData(root: HTMLElement) {
  const provider = root.querySelector<HTMLSelectElement>('#weatherProvider')?.value ?? 'PAGASA'
  if (provider !== 'nasa_power') {
    throw new Error('PAGASA is refreshed through the Databricks external-source notebook.')
  }
  const year = root.querySelector<HTMLSelectElement>('#weatherYear')?.value ?? '2024'
  const area = root.querySelector<HTMLSelectElement>('#weatherArea')?.value ?? 'all'
  const status = root.querySelector<HTMLElement>('#weatherEffectStatus')
  const button = root.querySelector<HTMLButtonElement>('#weatherRefresh')
  if (status) status.textContent = 'Fetching NASA POWER observations and publishing them to Databricks…'
  if (button) {
    button.disabled = true
    button.textContent = 'Refreshing…'
  }
  try {
    await refreshWeatherData({
      start: year === 'all' ? '2017-01-01' : `${year}-01-01`,
      end: year === 'all' ? '2025-12-31' : `${year}-12-31`,
      areas: area === 'all' ? [] : [area],
      provider: 'nasa_power',
    })
    await loadWeatherEffectView(root)
  } finally {
    if (button) {
      button.disabled = root.querySelector<HTMLSelectElement>('#weatherProvider')?.value !== 'nasa_power'
      button.textContent = 'Refresh NASA POWER'
    }
  }
}
