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
import { renderWeatherEffects, weatherProviderLabel } from './weather-view-helpers'
import { isWeatherApiProvider, weatherRefreshPeriod, WeatherProvider } from './weather-provider-helpers'
import { updateDashboardProvenance } from './dashboard-enhancements'
import { setDecisionSupportChartData } from './dashboard-decision-charts'
import { getJson, authenticatedJson } from './api-client'
import { publishedForecastEvidence } from './published-forecast-adapter'

let heatmapRequest = 0
export async function refreshSalesHeatmap(): Promise<boolean> {
  const request = ++heatmapRequest
  const apply = (window as any).setSalesHeatmapData
  if (typeof apply !== 'function') return false
  apply(null, 'Loading product-level quantities…')
  try {
    const data = await getJson('/api/sales/heatmap')
    if (request !== heatmapRequest || (window as any).setSalesHeatmapData !== apply) return false
    apply(data)
    return true
  } catch {
    if (request === heatmapRequest) apply(null, 'Product quantities unavailable from Databricks Gold; no local or demonstration quantities were substituted.')
    return false
  }
}

let sectorRequest = 0
export async function refreshSalesSectors(): Promise<boolean> {
  const request = ++sectorRequest
  const apply = (window as any).setSalesSectorsData
  if (typeof apply !== 'function') return false
  apply(null, 'Loading buyer-sector analysis…')
  try {
    const data = await getJson('/api/sales/sectors')
    if (request !== sectorRequest || (window as any).setSalesSectorsData !== apply) return false
    apply(data)
    return true
  } catch {
    if (request === sectorRequest) apply(null, 'Buyer-sector analysis unavailable from Databricks Gold; no local or demonstration classifications were substituted.')
    return false
  }
}

let forecastRequest = 0
export async function refreshForecastValidation(): Promise<boolean> {
  const request = ++forecastRequest
  const apply = (window as any).setForecastValidationData
  if (typeof apply !== 'function') return false
  const value = (id: string) => (document.getElementById(id) as HTMLSelectElement | null)?.value ?? ''
  const params = new URLSearchParams({ sector: value('forecastSector') || 'Unknown', product: value('forecastProduct'), metric: value('forecastMetric') || 'revenue' })
  apply(null, 'Loading source-backed forecast evidence…')
  try {
    let publicationNote = ''
    if (params.get('sector') === 'All' && !params.get('product') && params.get('metric') === 'revenue') {
      try {
        const release: any = await getJson('/api/forecasts?schema_version=2&horizon=12')
        const evidence = publishedForecastEvidence(release)
        if (evidence) {
          if (request !== forecastRequest || (window as any).setForecastValidationData !== apply) return false
          apply(evidence)
          return true
        }
        publicationNote = release.reason || 'No published model release.'
      } catch { publicationNote = 'Published model storage is unavailable; the following is separately computed retrospective benchmark evidence.' }
    }
    const data = await getJson(`/api/sales/forecast-validation?${params}`)
    if (publicationNote && data && typeof data === 'object') (data as any).limitations = [...((data as any).limitations || []), publicationNote]
    if (request !== forecastRequest || (window as any).setForecastValidationData !== apply) return false
    apply(data)
    return true
  } catch {
    if (request === forecastRequest && (window as any).setForecastValidationData === apply) apply(null, 'Forecast evidence unavailable from Databricks Gold for the selected scope; no example forecasts were substituted.')
    return false
  }
}

let regressionRequest = 0
export async function refreshExternalRegression(): Promise<boolean> {
  const request = ++regressionRequest
  const apply = (window as any).setExternalRegressionData
  if (typeof apply !== 'function') return false
  const fields: Record<string, string> = { sector: 'regSector', territory: 'regTerritory', product: 'regProduct', metric: 'regMetric', mode: 'regMode', provider: 'regProvider', disease: 'regDisease', lag: 'regLag', rainfall_lag: 'regRainLag' }
  const params = new URLSearchParams()
  for (const [key, id] of Object.entries(fields)) {
    const val = (document.getElementById(id) as HTMLSelectElement | null)?.value
    if (val && val.trim() !== '') params.set(key, val.trim())
  }
  apply(null, 'Loading matched sales and external evidence…')
  try {
    const data = await getJson(`/api/sales/external-regression?${params}`)
    if (request !== regressionRequest || (window as any).setExternalRegressionData !== apply) return false
    apply(data)
    return true
  } catch {
    if (request === regressionRequest && (window as any).setExternalRegressionData === apply) apply(null, 'Regression evidence unavailable from Databricks Gold for the selected scope; no demonstration results were substituted.')
    return false
  }
}

let planningRequest = 0, planningSolve = 0
export async function refreshPlanning(): Promise<boolean> {
  const request = ++planningRequest
  ++planningSolve
  const apply = (window as any).setPlanningData
  if (typeof apply !== 'function') return false
  const value = (id: string) => (document.getElementById(id) as HTMLSelectElement)?.value
  const params = new URLSearchParams({ sector: value('planSector') || 'All', territory: value('planTerritory') || 'all' })
  apply(null, 'Loading source-ranked products…')
  try {
    const data = await getJson(`/api/sales/planning-shortlist?${params}`)
    if (request !== planningRequest || (window as any).setPlanningData !== apply) return false
    apply(data)
    return true
  } catch {
    if (request === planningRequest && (window as any).setPlanningData === apply) apply(null, 'Shortlist unavailable from Databricks Gold; no demonstration products were substituted.')
    return false
  }
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
const pendingDeferredPages = new Map<string, Promise<boolean>>()
let deferredLoadGeneration = 0

export function resetDashboardDeferredLoads() {
  loadedDeferredPages.clear()
  pendingDeferredPages.clear()
  ++deferredLoadGeneration
  // Ignore responses from the previous dashboard/session after teardown.
  ++heatmapRequest
  ++sectorRequest
  ++forecastRequest
  ++regressionRequest
  ++planningRequest
  ++planningSolve
}

export function refreshDashboardModulesForPage(pageName: string): Promise<boolean> {
  if (loadedDeferredPages.has(pageName)) return Promise.resolve(true)
  const pending = pendingDeferredPages.get(pageName)
  if (pending) return pending

  let loaders: Array<() => Promise<boolean>> = []
  if (pageName === 'revenue') loaders = [refreshSalesHeatmap]
  if (pageName === 'products') loaders = [refreshSalesSectors]
  if (pageName === 'territory') loaders = [refreshSalesSectors]
  if (pageName === 'forecast') loaders = [refreshForecastValidation, refreshExternalRegression]
  if (pageName === 'inventory') loaders = [refreshPlanning]
  if (!loaders.length) return Promise.resolve(false)

  const generation = deferredLoadGeneration
  const completion = Promise.allSettled(loaders.map((load) => load())).then((results) => {
    const success = generation === deferredLoadGeneration
      && results.every((result) => result.status === 'fulfilled' && result.value)
    if (success) loadedDeferredPages.add(pageName)
    if (pendingDeferredPages.get(pageName) === completion) pendingDeferredPages.delete(pageName)
    return success
  })
  pendingDeferredPages.set(pageName, completion)
  return completion
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
      kpiOverviewTotalRevenue: data.summary.total_revenue == null ? 'Unavailable' : currency.format(data.summary.total_revenue),
      kpiOverviewGrossProfit: data.summary.total_income == null ? 'Unavailable' : currency.format(data.summary.total_income),
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
    release: data.dataStatus?.release,
    monthly: data.monthly,
    by_area: data.byArea,
    top_products: data.products,
    year_summary: data.yearSummary,
    seasonality: data.seasonality,
  })
  if (root) setDecisionSupportChartData(root, data)
}

export async function loadSalesDataView(root: HTMLElement, state: any) {
  const requestRevision = state.requestRevision = (state.requestRevision || 0) + 1
  const evidence = { startDate: state.startDate, endDate: state.endDate, productId: state.productId,
    area: state.area, sector: state.sector, region: state.region, territory: state.territory, category: state.category }
  const [datasetStatus, page, summary] = await Promise.all([
    getSalesDatasetStatus(),
    getSalesTransactions({
      ...evidence,
      year: state.year,
      page: state.page,
      pageSize: state.pageSize,
      search: state.search,
      qualityStatus: state.qualityStatus,
    }),
    getSalesSummary({
      ...evidence,
      year: state.year,
      search: state.search,
      qualityStatus: state.qualityStatus,
    }),
  ])
  if (requestRevision !== state.requestRevision || !root.isConnected) return
  if (state.release) {
    const sameRelease = (actual: Record<string, unknown> | undefined) => actual &&
      Object.keys(state.release).every(key => JSON.stringify(actual[key]) === JSON.stringify(state.release[key]))
    if (!sameRelease(page.release) || !sameRelease(summary.release)) {
      throw new Error('The source release changed since this investigation. Reopen the analysis before inspecting its transactions.')
    }
  }
  state.page = page.pagination.page
  renderSalesDatasetStatus(root, datasetStatus)
  renderSalesComputation(root, summary, state.computation)
  renderSalesPage(root, page)
}

const weatherRequests = new WeakMap<HTMLElement, number>()
export async function loadWeatherEffectView(root: HTMLElement) {
  const request = (weatherRequests.get(root) ?? 0) + 1
  weatherRequests.set(root, request)
  const year = root.querySelector<HTMLSelectElement>('#weatherYear')?.value ?? '2024'
  const area = root.querySelector<HTMLSelectElement>('#weatherArea')?.value ?? 'all'
  const grain = (root.querySelector<HTMLSelectElement>('#weatherGrain')?.value ?? 'monthly') as 'daily' | 'monthly'
  const provider = (root.querySelector<HTMLSelectElement>('#weatherProvider')?.value ?? 'PAGASA') as WeatherProvider
  const status = root.querySelector<HTMLElement>('#weatherEffectStatus')
  const table = root.querySelector<HTMLTableElement>('#weatherEffectTable')
  table?.replaceChildren()
  const loadingCount = root.querySelector<HTMLElement>('#weatherEffectCount')
  if (loadingCount) loadingCount.textContent = 'Loading…'
  if (status) status.textContent = `Loading ${weatherProviderLabel(provider)} records from Databricks Gold…`
  try {
    const result = await getWeatherEffects({ year, area, grain, provider })
    if (weatherRequests.get(root) === request) renderWeatherEffects(root, result)
  } catch (error) {
    if (weatherRequests.get(root) === request) {
      table?.replaceChildren()
      if (status) status.textContent = error instanceof Error ? error.message : 'Weather observations unavailable.'
      const count = root.querySelector<HTMLElement>('#weatherEffectCount')
      if (count) count.textContent = 'Unavailable'
    }
  }
}

export async function refreshSelectedWeatherData(root: HTMLElement) {
  const provider = root.querySelector<HTMLSelectElement>('#weatherProvider')?.value ?? 'PAGASA'
  if (!isWeatherApiProvider(provider)) {
    throw new Error('PAGASA is refreshed through the Databricks external-source notebook.')
  }
  const year = root.querySelector<HTMLSelectElement>('#weatherYear')?.value ?? '2024'
  const area = root.querySelector<HTMLSelectElement>('#weatherArea')?.value ?? 'all'
  const status = root.querySelector<HTMLElement>('#weatherEffectStatus')
  const button = root.querySelector<HTMLButtonElement>('#weatherRefresh')
  const originallyDisabled = button?.disabled ?? true
  if (status) status.textContent = `Fetching ${weatherProviderLabel(provider)} observations and publishing candidates to Databricks…`
  if (button) {
    button.disabled = true
    button.textContent = 'Refreshing…'
  }
  try {
    await refreshWeatherData({
      ...weatherRefreshPeriod(year),
      areas: area === 'all' ? [] : [area],
      provider,
    })
    await loadWeatherEffectView(root)
  } finally {
    if (button) {
      button.disabled = originallyDisabled || !isWeatherApiProvider(root.querySelector<HTMLSelectElement>('#weatherProvider')?.value ?? 'PAGASA')
      button.textContent = 'Refresh selected API'
    }
  }
}
