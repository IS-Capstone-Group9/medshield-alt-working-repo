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
    if (request === heatmapRequest) apply(null, 'Product quantities unavailable. Check the sales service and rebuild the allocated layer after uploads; no demo quantities are substituted.')
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
    if (request === sectorRequest) apply(null, 'Buyer-sector analysis unavailable. Check the sales service and rebuild the allocated layer after uploads; no demo quantities are substituted.')
  }
}

let forecastRequest = 0
export async function refreshForecastValidation() {
  const request = ++forecastRequest
  const apply = (window as any).setForecastValidationData
  if (typeof apply !== 'function') return
  const value = (id: string) => (document.getElementById(id) as HTMLSelectElement | null)?.value ?? ''
  const params = new URLSearchParams({ sector: value('forecastSector') || 'Government', product: value('forecastProduct'), metric: value('forecastMetric') || 'revenue' })
  apply(null, 'Loading source-backed forecast evidence…')
  try {
    const data = await getJson(`/api/sales/forecast-validation?${params}`)
    if (request === forecastRequest && (window as any).setForecastValidationData === apply) apply(data)
  } catch {
    if (request === forecastRequest && (window as any).setForecastValidationData === apply) apply(null, 'Forecast evidence unavailable. Check the selected scope and rebuild the allocated sales layer after uploads; no example forecasts are substituted.')
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
    if (request === regressionRequest && (window as any).setExternalRegressionData === apply) apply(null, 'Regression evidence unavailable. Check source preparation, freshness and the selected scope; no demo results are substituted.')
  }
}

let planningRequest = 0, planningSolve = 0
export async function refreshPlanning() {
  const request = ++planningRequest
  ++planningSolve
  const apply = (window as any).setPlanningData
  if (typeof apply !== 'function') return
  const value = (id: string) => (document.getElementById(id) as HTMLSelectElement)?.value
  const params = new URLSearchParams({ sector: value('planSector') || 'Unknown', territory: value('planTerritory') || 'Quezon' })
  apply(null, 'Loading source-ranked products…')
  try {
    const data = await getJson(`/api/sales/planning-shortlist?${params}`)
    if (request === planningRequest && (window as any).setPlanningData === apply) apply(data)
  } catch { if (request === planningRequest && (window as any).setPlanningData === apply) apply(null, 'Shortlist unavailable. Check the current sales layer; no demo products substituted.') }
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

export async function refreshDashboardFromGateway() {
  const applyDatasetPatch = (window as any).applyDatasetPatch
  if (typeof applyDatasetPatch !== 'function') return

  // This source must still be checked if the unrelated dashboard snapshot fails.
  const forecastRefresh = refreshForecastValidation()
  const regressionRefresh = refreshExternalRegression()
  const planningRefresh = refreshPlanning()

  const data = await loadDashboardData()
  const root = document.querySelector<HTMLElement>('.medshield-root')
  if (root) {
    updateDashboardProvenance(root, data.dataStatus, data.yearSummary.map((row) => row.year))
  }
  applyDatasetPatch({
    monthly: data.monthly,
    by_area: data.byArea,
    top_products: data.products,
    year_summary: data.yearSummary,
    seasonality: data.seasonality,
  })
  if (root) setDecisionSupportChartData(root, data)
  await Promise.all([refreshSalesHeatmap(), refreshSalesSectors(), forecastRefresh, regressionRefresh, planningRefresh])
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
  const year = root.querySelector<HTMLSelectElement>('#weatherYear')?.value ?? '2025'
  const area = root.querySelector<HTMLSelectElement>('#weatherArea')?.value ?? 'all'
  const grain = (root.querySelector<HTMLSelectElement>('#weatherGrain')?.value ?? 'monthly') as 'daily' | 'monthly'
  renderWeatherEffects(root, await getWeatherEffects({ year, area, grain }))
}
