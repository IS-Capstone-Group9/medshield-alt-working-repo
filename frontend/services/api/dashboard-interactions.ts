import {financialScopeSelection, financialSelectionIsCurrent} from './financial-scope'
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
import { appendTableSkeletonRows } from './dashboard-loading'
import { isWeatherApiProvider, weatherRefreshPeriod, WeatherProvider } from './weather-provider-helpers'
import { updateDashboardProvenance } from './dashboard-enhancements'
import { setDecisionSupportChartData } from './dashboard-decision-charts'
import { getJson, authenticatedJson } from './api-client'
import { publishedForecastEvidence } from './published-forecast-adapter'
import {getSalesLedgerExport} from './sales.service'
import { installDashboardHelp } from './dashboard-help'

// These controllers belong to this dashboard runtime, never to the shared API
// client. Replacing one family must not cancel a different panel's transport.
type DashboardRequestFamily = 'heatmap' | 'sectors' | 'forecast' | 'research' | 'regression' | 'source' | 'ledger' | 'weather' | 'weather-refresh' | 'ledger-export'
const dashboardRequestControllers = new Map<DashboardRequestFamily, AbortController>()
function beginDashboardRequest(family: DashboardRequestFamily) {
  dashboardRequestControllers.get(family)?.abort()
  const controller = new AbortController()
  dashboardRequestControllers.set(family, controller)
  return controller
}
function finishDashboardRequest(family: DashboardRequestFamily, controller: AbortController) {
  if (dashboardRequestControllers.get(family) === controller) dashboardRequestControllers.delete(family)
}

let heatmapRequest = 0
export async function refreshSalesHeatmap(): Promise<boolean> {
  const request = ++heatmapRequest
  const controller = beginDashboardRequest('heatmap')
  const apply = (window as any).setSalesHeatmapData
  if (typeof apply !== 'function') { finishDashboardRequest('heatmap', controller); return false }
  apply(null, 'Loading product-level quantities…')
  try {
    const data = await getJson('/api/sales/heatmap', { signal: controller.signal })
    if (request !== heatmapRequest || (window as any).setSalesHeatmapData !== apply) return false
    apply(data)
    return true
  } catch {
    if (request === heatmapRequest && (window as any).setSalesHeatmapData === apply) apply(null, 'Product quantities unavailable from Databricks Gold; no local or demonstration quantities were substituted.')
    return false
  } finally {
    finishDashboardRequest('heatmap', controller)
  }
}

let sectorRequest = 0
export async function refreshSalesSectors(): Promise<boolean> {
  const request = ++sectorRequest
  const controller = beginDashboardRequest('sectors')
  const apply = (window as any).setSalesSectorsData
  if (typeof apply !== 'function') { finishDashboardRequest('sectors', controller); return false }
  apply(null, 'Loading buyer-sector analysis…')
  try {
    const data = await getJson('/api/sales/sectors', { signal: controller.signal })
    if (request !== sectorRequest || (window as any).setSalesSectorsData !== apply) return false
    apply(data)
    return true
  } catch {
    if (request === sectorRequest && (window as any).setSalesSectorsData === apply) apply(null, 'Buyer-sector analysis unavailable from Databricks Gold; no local or demonstration classifications were substituted.')
    return false
  } finally {
    finishDashboardRequest('sectors', controller)
  }
}

let forecastRequest = 0
export async function refreshForecastValidation(): Promise<boolean> {
  const request = ++forecastRequest
  const controller = beginDashboardRequest('forecast')
  const apply = (window as any).setForecastValidationData
  if (typeof apply !== 'function') { finishDashboardRequest('forecast', controller); return false }
  const value = (id: string) => (document.getElementById(id) as HTMLSelectElement | null)?.value ?? ''
  const params = new URLSearchParams({ sector: value('forecastSector') || 'Unknown', product: value('forecastProduct'), metric: value('forecastMetric') || 'revenue' })
  apply(null, 'Loading source-backed forecast evidence…')
  try {
    let publicationNote = ''
    if (params.get('sector') === 'All' && !params.get('product') && params.get('metric') === 'revenue') {
      try {
        const release: any = await getJson('/api/forecasts?schema_version=2&horizon=12', { signal: controller.signal })
        const evidence = publishedForecastEvidence(release)
        if (evidence) {
          if (request !== forecastRequest || (window as any).setForecastValidationData !== apply) return false
          apply(evidence)
          return true
        }
        publicationNote = release.reason || 'No published model release.'
      } catch {
        if (controller.signal.aborted) return false
        publicationNote = 'Published model storage is unavailable; the following is separately computed retrospective benchmark evidence.'
      }
    }
    if (request !== forecastRequest || (window as any).setForecastValidationData !== apply) return false
    const data = await getJson(`/api/sales/forecast-validation?${params}`, { signal: controller.signal })
    if (publicationNote && data && typeof data === 'object') (data as any).limitations = [...((data as any).limitations || []), publicationNote]
    if (request !== forecastRequest || (window as any).setForecastValidationData !== apply) return false
    apply(data)
    return true
  } catch {
    if (request === forecastRequest && (window as any).setForecastValidationData === apply) apply(null, 'Forecast evidence unavailable from Databricks Gold for the selected scope; no example forecasts were substituted.')
    return false
  } finally {
    finishDashboardRequest('forecast', controller)
  }
}

let regressionRequest = 0
let predictiveResearchRequest = 0

export async function refreshPredictiveResearch(runId?: string): Promise<boolean> {
  // Retained for isolated archival fixtures, not the current dashboard.
  if (!document.querySelector('[data-predictive-research]')) return false
  const request = ++predictiveResearchRequest
  const controller = beginDashboardRequest('research')
  const apply = (window as any).setPredictiveResearchData
  if (typeof apply !== 'function') { finishDashboardRequest('research', controller); return false }
  const selected = runId ?? (document.getElementById('researchRun') as HTMLSelectElement | null)?.value ?? ''
  const params = new URLSearchParams()
  if (selected) params.set('run_id', selected)
  apply(null, 'Loading stored research evidence from Databricks Gold…')
  try {
    const data = await getJson(`/api/sales/predictive-research${params.size ? `?${params}` : ''}`, { signal: controller.signal })
    if (request !== predictiveResearchRequest || (window as any).setPredictiveResearchData !== apply) return false
    apply(data)
    return true
  } catch {
    if (request === predictiveResearchRequest && (window as any).setPredictiveResearchData === apply) {
      apply(null, 'Stored research evidence unavailable from Databricks Gold; no local model results substituted.')
    }
    return false
  } finally {
    finishDashboardRequest('research', controller)
  }
}

export async function refreshExternalRegression(): Promise<boolean> {
  const request = ++regressionRequest
  const controller = beginDashboardRequest('regression')
  const apply = (window as any).setExternalRegressionData
  if (typeof apply !== 'function') { finishDashboardRequest('regression', controller); return false }
  const fields: Record<string, string> = { sector: 'regSector', territory: 'regTerritory', product: 'regProduct', metric: 'regMetric', mode: 'regMode', provider: 'regProvider', disease: 'regDisease', lag: 'regLag', rainfall_lag: 'regRainLag' }
  const params = new URLSearchParams()
  for (const [key, id] of Object.entries(fields)) {
    const val = (document.getElementById(id) as HTMLSelectElement | null)?.value
    if (val && val.trim() !== '') params.set(key, val.trim())
  }
  apply(null, 'Loading matched sales and external evidence…')
  try {
    const data = await getJson(`/api/sales/external-regression?${params}`, { signal: controller.signal })
    if (request !== regressionRequest || (window as any).setExternalRegressionData !== apply) return false
    apply(data)
    return true
  } catch {
    if (request === regressionRequest && (window as any).setExternalRegressionData === apply) apply(null, 'Regression evidence unavailable from Databricks Gold for the selected scope; no demonstration results were substituted.')
    return false
  } finally {
    finishDashboardRequest('regression', controller)
  }
}

let planningRequest = 0, planningSolve = 0
let planningLoadController: AbortController | null = null
let planningSolveController: AbortController | null = null

function cancelPlanningSolve() {
  ++planningSolve
  planningSolveController?.abort()
  planningSolveController = null
}

export async function refreshPlanning(): Promise<boolean> {
  const request = ++planningRequest
  planningLoadController?.abort()
  cancelPlanningSolve()
  const apply = (window as any).setPlanningData
  if (typeof apply !== 'function') return false
  const controller = new AbortController()
  planningLoadController = controller
  const value = (id: string) => (document.getElementById(id) as HTMLSelectElement)?.value
  const params = new URLSearchParams({ sector: value('planSector') || 'All', territory: value('planTerritory') || 'all' })
  apply(null, 'Loading source-ranked products…')
  try {
    const data = await getJson(`/api/sales/planning-shortlist?${params}`, { signal: controller.signal })
    if (request !== planningRequest || (window as any).setPlanningData !== apply) return false
    apply(data)
    return true
  } catch {
    if (request === planningRequest && (window as any).setPlanningData === apply) apply(null, 'Shortlist unavailable from Databricks Gold; no demonstration products were substituted.')
    return false
  } finally {
    if (planningLoadController === controller) planningLoadController = null
  }
}

async function solvePlanning() {
  cancelPlanningSolve()
  const request = planningSolve
  const apply = (window as any).setPlanningResult
  if (typeof apply !== 'function') return
  const controller = new AbortController()
  planningSolveController = controller
  try {
    const body = (window as any).getPlanningRequest()
    const result = await authenticatedJson('/api/sales/planning-solve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal })
    if (request === planningSolve && (window as any).setPlanningResult === apply) apply(result)
  } catch (error) { if (request === planningSolve && (window as any).setPlanningResult === apply) apply(null, error instanceof Error ? error.message : 'Planning failed') }
  finally { if (planningSolveController === controller) planningSolveController = null }
}

export function installCommonInteractions(root: HTMLElement, activeListeners: any[] = []) {
  for (const [type, listener] of Object.entries({ 'medshield:planning-change': () => { void refreshPlanning() }, 'medshield:planning-solve': () => { void solvePlanning() }, 'medshield:plan-invalidated': cancelPlanningSolve })) {
    window.addEventListener(type, listener)
    activeListeners.push({ target: window, type, listener })
  }
  const refreshRegression = () => { void refreshExternalRegression() }
  window.addEventListener('medshield:regression-change', refreshRegression)
  activeListeners.push({ target: window, type: 'medshield:regression-change', listener: refreshRegression })
  const refreshForecast = () => { void refreshForecastValidation() }
  window.addEventListener('medshield:forecast-change', refreshForecast)
  activeListeners.push({ target: window, type: 'medshield:forecast-change', listener: refreshForecast })
  installDashboardHelp(root, activeListeners)
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
  ++predictiveResearchRequest
  ++regressionRequest
  ++planningRequest
  planningLoadController?.abort()
  planningLoadController = null
  cancelPlanningSolve()
  ++dashboardRequestRevision
  for (const controller of dashboardRequestControllers.values()) controller.abort()
  dashboardRequestControllers.clear()
}

export function refreshDashboardModulesForPage(pageName: string): Promise<boolean> {
  if (loadedDeferredPages.has(pageName)) return Promise.resolve(true)
  const pending = pendingDeferredPages.get(pageName)
  if (pending) return pending

  let loaders: Array<() => Promise<boolean>> = []
  if (pageName === 'overview') loaders = [refreshForecastValidation]
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

let dashboardRequestRevision=0
export async function refreshDashboardFromGateway() {
  const request=++dashboardRequestRevision
  const controller=beginDashboardRequest('source')
  const selection=financialScopeSelection()
  const applyDatasetPatch = (window as any).applyDatasetPatch
  if (typeof applyDatasetPatch !== 'function') {
    finishDashboardRequest('source', controller)
    throw new Error('Dashboard live-data adapter is unavailable')
  }

  try {
    const data=await loadDashboardData(selection.scope, { signal: controller.signal })
    if(request!==dashboardRequestRevision||!financialSelectionIsCurrent(selection)||(window as any).applyDatasetPatch!==applyDatasetPatch) return false
    const sectors=data.financialSectors
    if (!data.dataStatus?.release || !Object.keys(data.dataStatus.release).every(key=>JSON.stringify(sectors.source?.release?.[key])===JSON.stringify((data.dataStatus!.release as any)[key]))) {
      throw new Error('Buyer-sector and dashboard source releases differ. Reload before comparing.')
    }
    ;(window as any).setOverviewSectorData(sectors)
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
    root?.dispatchEvent(new Event('medshield:source-ready'))
    return true
  } catch (error) {
    if(request!==dashboardRequestRevision||!financialSelectionIsCurrent(selection)||(window as any).applyDatasetPatch!==applyDatasetPatch) return false
    const root = document.querySelector<HTMLElement>('.medshield-root')
    if (root?.dataset.sourceState === 'loading') root.dispatchEvent(new CustomEvent('medshield:source-error', { detail: error }))
    throw error
  } finally {
    finishDashboardRequest('source', controller)
  }
}

export async function loadSalesDataView(root: HTMLElement, state: any) {
  cancelSalesViewRequests()
  const controller=beginDashboardRequest('ledger')
  const selection=financialScopeSelection()
  const requestRevision = state.requestRevision = (state.requestRevision || 0) + 1
  const evidence = { financialScope:selection.scope, startDate: state.startDate, endDate: state.endDate, productId: state.productId,
    area: state.area, sector: state.sector, region: state.region, territory: state.territory, category: state.category }
  try {
  const [datasetStatus, page, summary] = await Promise.all([
    getSalesDatasetStatus(selection.scope,{signal:controller.signal}),
    getSalesTransactions({
      ...evidence,
      year: state.year,
      page: state.page,
      pageSize: state.pageSize,
      search: state.search,
      qualityStatus: state.qualityStatus,
    },{signal:controller.signal}),
    getSalesSummary({
      ...evidence,
      year: state.year,
      search: state.search,
      qualityStatus: state.qualityStatus,
    },{signal:controller.signal}),
  ])
  if (controller.signal.aborted || requestRevision !== state.requestRevision || !financialSelectionIsCurrent(selection) || !root.isConnected) return
  if(page.release?.financial_scope?.id!==selection.scope || summary.release?.financial_scope?.id!==selection.scope) throw new Error("Ledger and summary financial scopes differ")
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
  } catch(error) {
    if(controller.signal.aborted || requestRevision!==state.requestRevision || !root.isConnected)return
    controller.abort() // Stop sibling reads after a genuine failure.
    throw error
  } finally {finishDashboardRequest('ledger',controller)}
}

export function cancelSalesViewRequests(){
  for(const family of ['ledger','ledger-export'] as const){dashboardRequestControllers.get(family)?.abort();dashboardRequestControllers.delete(family)}
}

export async function loadSalesLedgerExport(params:Parameters<typeof getSalesLedgerExport>[0]) {
  const controller=beginDashboardRequest('ledger-export')
  try {const blob=await getSalesLedgerExport(params,{signal:controller.signal});return controller.signal.aborted?null:blob}
  catch(error){if(controller.signal.aborted)return null;throw error}
  finally{finishDashboardRequest('ledger-export',controller)}
}

const weatherRequests = new WeakMap<HTMLElement, number>()
export async function loadWeatherEffectView(root: HTMLElement) {
  const controller=beginDashboardRequest('weather')
  const request = (weatherRequests.get(root) ?? 0) + 1
  weatherRequests.set(root, request)
  const year = root.querySelector<HTMLSelectElement>('#weatherYear')?.value ?? '2024'
  const area = root.querySelector<HTMLSelectElement>('#weatherArea')?.value ?? 'all'
  const grain = (root.querySelector<HTMLSelectElement>('#weatherGrain')?.value ?? 'monthly') as 'daily' | 'monthly'
  const provider = (root.querySelector<HTMLSelectElement>('#weatherProvider')?.value ?? 'PAGASA') as WeatherProvider
  const status = root.querySelector<HTMLElement>('#weatherEffectStatus')
  const table = root.querySelector<HTMLTableElement>('#weatherEffectTable')
  const wrapper = table?.parentElement
  wrapper?.setAttribute('aria-busy', 'true')
  if (table) {
    table.replaceChildren()
    appendTableSkeletonRows(table, 1)
  }
  const loadingCount = root.querySelector<HTMLElement>('#weatherEffectCount')
  const weatherEvidence = root.querySelector<HTMLElement>('#weatherEffectEvidence')
  if (weatherEvidence) weatherEvidence.textContent = ''
  if (loadingCount) {
    loadingCount.textContent = 'Loading…'
    loadingCount.classList.add('skeleton', 'skeleton-value')
  }
  if (status) status.textContent = `Loading ${weatherProviderLabel(provider)} records from Databricks Gold…`
  try {
    const result = await getWeatherEffects({ year, area, grain, provider },{signal:controller.signal})
    if (!controller.signal.aborted && root.isConnected && weatherRequests.get(root) === request) renderWeatherEffects(root, result)
  } catch (error) {
    if (!controller.signal.aborted && root.isConnected && weatherRequests.get(root) === request) {
      table?.replaceChildren()
      if (status) status.textContent = error instanceof Error ? error.message : 'Weather observations unavailable.'
      const count = root.querySelector<HTMLElement>('#weatherEffectCount')
      if (count) count.textContent = 'Unavailable'
    }
  } finally {
    if (weatherRequests.get(root) === request) {
      wrapper?.removeAttribute('aria-busy')
      table?.querySelector('.table-loading-rows')?.remove()
      loadingCount?.classList.remove('skeleton', 'skeleton-value')
    }
    finishDashboardRequest('weather',controller)
  }
}

export function cancelSelectedWeatherRefresh(){
  dashboardRequestControllers.get('weather-refresh')?.abort()
  dashboardRequestControllers.delete('weather-refresh')
}

export async function refreshSelectedWeatherData(root: HTMLElement) {
  const provider = root.querySelector<HTMLSelectElement>('#weatherProvider')?.value ?? 'PAGASA'
  if (!isWeatherApiProvider(provider)) {
    throw new Error('PAGASA is refreshed through the Databricks external-source notebook.')
  }
  const year = root.querySelector<HTMLSelectElement>('#weatherYear')?.value ?? '2024'
  const area = root.querySelector<HTMLSelectElement>('#weatherArea')?.value ?? 'all'
  const controller=beginDashboardRequest('weather-refresh')
  const scope=()=>['weatherProvider','weatherYear','weatherArea'].map(id=>root.querySelector<HTMLSelectElement>('#'+id)?.value).join('|')
  const selectedScope=scope()
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
    },{signal:controller.signal})
    if(!controller.signal.aborted&&root.isConnected&&scope()===selectedScope)await loadWeatherEffectView(root)
  } catch(error){if(!controller.signal.aborted&&root.isConnected&&scope()===selectedScope)throw error
  } finally {
    finishDashboardRequest('weather-refresh',controller)
    if (!controller.signal.aborted&&root.isConnected&&button) {
      button.disabled = originallyDisabled || !isWeatherApiProvider(root.querySelector<HTMLSelectElement>('#weatherProvider')?.value ?? 'PAGASA')
      button.textContent = 'Refresh selected API'
    }
  }
}
