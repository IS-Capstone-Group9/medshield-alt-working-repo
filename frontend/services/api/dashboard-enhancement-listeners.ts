import {
  loadSalesDataView,
  loadWeatherEffectView,
  refreshSelectedWeatherData,
  refreshDashboardFromGateway,
  refreshDashboardModulesForPage,
  installCommonInteractions,
} from './dashboard-interactions'
import { setSalesViewError } from './sales-page-helpers'
import { applyWeatherColumns, weatherProviderLabel } from './weather-view-helpers'
import { isWeatherApiProvider, populateWeatherYears } from './weather-provider-helpers'
import { applyScenarioSafetyLabels } from './dashboard-enhancements'
import { renderDecisionSupportCharts } from './dashboard-decision-charts'
import { installMcdaSensitivity, renderMcdaSensitivity } from './dashboard-mcda'
import type { User } from '@/lib/auth-tokens'

const DASHBOARD_PAGE_META = {
  overview: ['Recorded sales overview', 'Sales, profit and coverage'],
  revenue: ['Sales Diagnostics', 'Revenue, growth, and margin trends'],
  products: ['Product Prioritization', 'ABC/Pareto product view'],
  territory: ['Area Prioritization', 'Geographic performance, concentration, and evidence quality'],
  forecast: ['Forecast Modeling', 'Actual sales, baseline forecasts and historical validation'],
  inventory: ['Prescriptive Planning', 'Priority products, constrained allocation and scenario review'],
  data: ['Databricks Source', 'Live Gold provenance and ingestion policy'],
  'sales-data': ['View Sales Data', 'Browse transactions and filtered sales totals'],
  'weather-validation': [
    'Weather API Validation',
    'Validate PAGASA history and provider weather proxies stored in Databricks',
  ],
} as const

type DashboardPageName = keyof typeof DASHBOARD_PAGE_META

function activateDashboardPage(root: HTMLElement, name: DashboardPageName, navItem: HTMLElement) {
  const targetPage = root.querySelector<HTMLElement>(`#page-${name}`)
  if (!targetPage) {
    console.error(`Dashboard page is not available: ${name}`)
    return
  }

  root.querySelectorAll<HTMLElement>('.page').forEach((page) => page.classList.remove('active'))
  root.querySelectorAll<HTMLElement>('.nav-item').forEach((item) => {
    item.classList.remove('active')
    item.removeAttribute('aria-current')
  })

  targetPage.classList.add('active')
  navItem.classList.add('active')
  navItem.setAttribute('aria-current', 'page')

  const [title, subtitle] = DASHBOARD_PAGE_META[name]
  const titleEl = root.querySelector('#topbar-title')
  const subtitleEl = root.querySelector('#topbar-sub')
  if (titleEl) titleEl.textContent = title
  if (subtitleEl) subtitleEl.textContent = subtitle

  const filterBar = root.querySelector<HTMLElement>('#filterBar')
  if (filterBar) {
    filterBar.style.display = ['overview', 'revenue', 'products', 'territory'].includes(name)
      ? 'flex'
      : 'none'
  }
  ;(window as any).configureProductYearControls?.(name)
  refreshDashboardModulesForPage(name)

  if (document.body.classList.contains('nav-hidden') || document.body.classList.contains('nav-open')) {
    ;(window as any).closeNavigation?.()
  }

  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      // Navigation may change again while this render waits for layout.
      if (!targetPage.isConnected || !targetPage.classList.contains('active')) return
      ;(window as any).buildCharts?.()
      if (name === 'products') {
        ;(window as any).buildTables?.()
        ;(window as any).renderProductPrioritizationTimeline?.()
      }
      if (name === 'inventory') {
        ;(window as any).renderShowcaseDOMVisuals?.()
      }
      renderDecisionSupportCharts(root)
      if (name === 'inventory') renderMcdaSensitivity(root)
    }, 60)
  })
}

export function installDashboardEnhancements(
  root: HTMLElement,
  activeListeners: any[],
  user: User | null,
) {
  if (root.dataset.enhancementsInstalled === 'true') return
  root.dataset.enhancementsInstalled = 'true'
  ;(window as any).__medshieldAuditInstalled = true

  installCommonInteractions(root, activeListeners)
  installMcdaSensitivity(root, activeListeners)

  const expandEvidence = (event: Event) => {
    const details = event.target
    if (!(details instanceof HTMLDetailsElement) || !details.open) return
    window.requestAnimationFrame(() => {
      if (details.querySelector('[data-external-regression]')) (window as any).renderExternalRegression?.()
      ;(window as any).resizeCharts?.()
    })
  }
  root.addEventListener('toggle', expandEvidence, true)
  activeListeners.push({ target: root, type: 'toggle', listener: expandEvidence, options: true })

  const legacySeasonSelector = (window as any).selectSeasonRestock
  if (typeof legacySeasonSelector === 'function') {
    ;(window as any).selectSeasonRestock = (...args: unknown[]) => {
      const result = legacySeasonSelector(...args)
      applyScenarioSafetyLabels(root)
      return result
    }
  }

  ;(window as any).generateAiBriefing = () => {
    const container = root.querySelector<HTMLElement>('#aiBriefingText')
    if (!container) return
    const year = root.querySelector<HTMLSelectElement>('#topbarYearSelect')?.value ?? 'all available years'
    const surge = root.querySelector<HTMLInputElement>('#surgeMultiplierSlider')?.value ?? '0'
    container.style.display = 'block'
    container.replaceChildren()

    const heading = document.createElement('strong')
    heading.textContent = 'Draft scenario briefing - review required'
    const body = document.createElement('p')
    body.textContent = `This planning scenario uses historical sales for ${year} and a user-selected ${surge}% demand uplift. It does not represent current inventory, an official DOH/PAGASA alert, or an authorized procurement instruction.`
    const note = document.createElement('p')
    note.textContent = 'Validate current stock, supplier lead time, costs, disease surveillance, and weather sources before approving any action.'
    container.append(heading, body, note)
  }

  ;(window as any).printExecutiveMemo = () => {
    window.alert('Export is unavailable until the draft scenario is backed by reviewed inventory, cost, and authoritative external-source data.')
  }

  applyScenarioSafetyLabels(root)

  const salesState = {
    year: 'all',
    search: '',
    qualityStatus: 'all',
    page: 1,
    pageSize: 25,
    computation: 'overview' as const,
    detailLevel: 'compact' as 'compact' | 'full',
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
    productId: undefined as string | undefined,
    area: undefined as string | undefined,
    sector: undefined as string | undefined,
    region: undefined as string | undefined,
    territory: undefined as string | undefined,
    category: undefined as string | undefined,
    release: undefined as Record<string, unknown> | undefined,
    requestRevision: 0,
  }

  const refreshSalesView = () => {
    const revision = salesState.requestRevision + 1
    const table = root.querySelector<HTMLTableElement>('#salesDataTable')
    if (table) {
      table.replaceChildren()
      const cell = table.createTBody().insertRow().insertCell()
      cell.className = 'uploaded-data-empty'
      cell.textContent = 'Loading transactions…'
    }
    root.querySelector('#salesDataTableWrap')?.setAttribute('aria-busy', 'true')
    root.querySelector('#salesComputationGrid')?.replaceChildren()
    root.querySelector('#salesFinancialReconciliation')?.replaceChildren()
    const reconciliationStatus = root.querySelector<HTMLElement>('#salesReconciliationStatus')
    if (reconciliationStatus) { reconciliationStatus.textContent = 'Checks pending'; reconciliationStatus.classList.remove('has-differences') }
    const badge = root.querySelector('#salesDatasetBadge'); if (badge) badge.textContent = 'Loading dataset…'
    const source = root.querySelector('#salesDatasetSource'); if (source) source.textContent = 'Loading source identity…'
    const pipeline = root.querySelector('#salesPipelineNote'); if (pipeline) pipeline.textContent = 'Loading quality checks…'
    const pageLabel = root.querySelector('#salesDataPage'); if (pageLabel) pageLabel.textContent = 'Loading…'
    for (const id of ['salesDataPrevious','salesDataNext']) { const control = root.querySelector<HTMLButtonElement>('#' + id); if (control) control.disabled = true }
    const refresh = root.querySelector<HTMLButtonElement>('#salesDataRefresh')
    if (refresh) { refresh.disabled = true; refresh.textContent = 'Refreshing…' }
    const status = root.querySelector('#salesDataStatus'); if (status) status.textContent = 'Loading selected transaction evidence…'
    return loadSalesDataView(root, salesState).catch((error: unknown) => {
      if (revision === salesState.requestRevision) setSalesViewError(root, error instanceof Error ? error.message : 'Sales data could not be loaded.')
    }).finally(() => {
      if (revision === salesState.requestRevision && refresh) { refresh.disabled = false; refresh.textContent = 'Refresh' }
    })
  }

  const clearInvestigation = () => {
    for (const field of ['startDate','endDate','productId','area','sector','region','territory','category','release'] as const) salesState[field] = undefined
    salesState.page = 1
    const context = root.querySelector<HTMLElement>('#salesDrilldownContext')
    if (context) context.hidden = true
    const year = root.querySelector<HTMLSelectElement>('#salesDataYear')
    if (year) year.disabled = false
  }
  const openTransactions = (event: Event) => {
    const detail = (event as CustomEvent).detail
    clearInvestigation()
    Object.assign(salesState, { startDate: detail.start_date, endDate: detail.end_date, productId: detail.product_id,
      area: detail.area, sector: detail.sector, region: detail.region, territory: detail.territory, category: detail.category,
      release: detail.release, year: 'all', search: '', qualityStatus: 'all', page: 1, detailLevel: 'full' })
    for (const [id, value] of [['salesDataYear','all'], ['salesDataSearch',''], ['salesDataQuality','all'], ['salesDataDetail','full']]) {
      const input = root.querySelector<HTMLInputElement | HTMLSelectElement>('#' + id)
      if (input) input.value = value
    }
    const year = root.querySelector<HTMLSelectElement>('#salesDataYear'); if (year) year.disabled = true
    const context = root.querySelector<HTMLElement>('#salesDrilldownContext'); if (context) context.hidden = false
    const label = root.querySelector('#salesDrilldownScope')
    if (label) label.textContent = [detail.label, detail.start_date + ' – ' + detail.end_date, detail.product_id && 'Product ID: ' + detail.product_id, detail.area && 'Raw area: ' + detail.area, detail.sector && 'Buyer sector: ' + detail.sector, detail.region, detail.territory].filter(Boolean).join(' › ') + '. Exact filters retained for paging and summary; all retained rows are visible.'
    const nav = root.querySelector<HTMLElement>('[data-dashboard-page="sales-data"]')
    if (nav) activateDashboardPage(root, 'sales-data', nav)
    void refreshSalesView()
  }
  window.addEventListener('medshield:transactions-open', openTransactions)
  activeListeners.push({ target: window, type: 'medshield:transactions-open', listener: openTransactions })
  root.querySelector('#salesDrilldownClear')?.addEventListener('click', () => { clearInvestigation(); void refreshSalesView() })
  root.querySelector('#salesDrilldownBack')?.addEventListener('click', () => {
    const nav = root.querySelector<HTMLElement>('[data-dashboard-page="revenue"]'); if (nav) activateDashboardPage(root, 'revenue', nav)
    root.querySelector<HTMLButtonElement>('[data-sales-output-tab="diagnostics"]')?.click()
  })

  root.querySelector('#salesDataYear')?.addEventListener('change', (event) => {
    salesState.year = (event.target as HTMLSelectElement).value
    salesState.page = 1
    void refreshSalesView()
  })

  root.querySelector('#salesDataQuality')?.addEventListener('change', (event) => {
    salesState.qualityStatus = (event.target as HTMLSelectElement).value
    salesState.page = 1
    void refreshSalesView()
  })

  root.querySelector('#salesDataPageSize')?.addEventListener('change', (event) => {
    salesState.pageSize = Number((event.target as HTMLSelectElement).value)
    salesState.page = 1
    void refreshSalesView()
  })

  root.querySelector('#salesDataComputation')?.addEventListener('change', (event) => {
    const value = (event.target as HTMLSelectElement).value
    salesState.computation = ['overview', 'sum', 'average', 'count'].includes(value)
      ? (value as any)
      : 'overview'
    void refreshSalesView()
  })

  root.querySelector('#salesDataDetail')?.addEventListener('change', (event) => {
    const value = (event.target as HTMLSelectElement).value
    salesState.detailLevel = value === 'full' ? 'full' : 'compact'
    void refreshSalesView()
  })

  let searchTimer = 0
  root.querySelector('#salesDataReset')?.addEventListener('click', () => {
    window.clearTimeout(searchTimer)
    Object.assign(salesState, { year: 'all', search: '', qualityStatus: 'all', page: 1 })
    for (const [id, value] of [['salesDataYear', 'all'], ['salesDataSearch', ''], ['salesDataQuality', 'all']]) {
      const input = root.querySelector<HTMLInputElement | HTMLSelectElement>('#' + id)
      if (input) input.value = value
    }
    void refreshSalesView()
  })
  root.querySelector('#salesDataRefresh')?.addEventListener('click', () => {
    window.clearTimeout(searchTimer)
    void refreshSalesView()
  })
  root.querySelector('#salesDataSearch')?.addEventListener('input', (event) => {
    window.clearTimeout(searchTimer)
    salesState.search = (event.target as HTMLInputElement).value
    salesState.page = 1
    searchTimer = window.setTimeout(() => void refreshSalesView(), 250)
  })

  root.querySelector('#salesDataPrevious')?.addEventListener('click', () => {
    salesState.page = Math.max(1, salesState.page - 1)
    void refreshSalesView()
  })

  root.querySelector('#salesDataNext')?.addEventListener('click', () => {
    salesState.page += 1
    void refreshSalesView()
  })

  // One route-aware listener controls every sidebar page. This prevents legacy
  // inline handlers and newer injected tabs from competing over active state.
  const navigation = root.querySelector<HTMLElement>('.nav')
  const handleNavigation = (event: Event) => {
    const eventTarget = event.target
    if (!(eventTarget instanceof Element)) return
    const navItem = eventTarget.closest<HTMLElement>('.nav-item[data-dashboard-page]')
    if (!navItem || !navigation?.contains(navItem)) return

    const pageName = navItem.dataset.dashboardPage as DashboardPageName | undefined
    if (!pageName || !(pageName in DASHBOARD_PAGE_META)) return
    activateDashboardPage(root, pageName, navItem)
    if (pageName === 'sales-data') void refreshSalesView()
    if (pageName === 'weather-validation') refreshWeatherView()
  }
  const handleNavigationKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    const eventTarget = event.target
    if (!(eventTarget instanceof Element)) return
    const navItem = eventTarget.closest<HTMLElement>('.nav-item[data-dashboard-page]')
    if (!navItem || !navigation?.contains(navItem)) return
    event.preventDefault()
    navItem.click()
  }

  if (navigation) {
    navigation.addEventListener('click', handleNavigation)
    navigation.addEventListener('keydown', handleNavigationKeydown)
    activeListeners.push(
      { target: navigation, type: 'click', listener: handleNavigation },
      { target: navigation, type: 'keydown', listener: handleNavigationKeydown }
    )
  }

  const analysisScope = root.querySelector<HTMLSelectElement>('#analysisScopeSelect')
  const applyAnalysisScope = () => {
    if (!analysisScope) return
    if (analysisScope.value === 'capstone') {
      const start = root.querySelector<HTMLInputElement>('#customDateStart')
      const end = root.querySelector<HTMLInputElement>('#customDateEnd')
      if (start) start.value = '2017-01-01'
      if (end) end.value = '2025-12-31'
      ;(window as any).setDescriptivePeriod?.('custom')
      ;(window as any).setCustomDateRange?.('2017-01-01', '2025-12-31')
    } else {
      ;(window as any).setDescriptivePeriod?.('all')
    }
  }
  if (analysisScope) {
    analysisScope.addEventListener('change', applyAnalysisScope)
    activeListeners.push({ target: analysisScope, type: 'change', listener: applyAnalysisScope })
  }

  const refreshDecisionCharts = () => {
    window.requestAnimationFrame(() => renderDecisionSupportCharts(root))
  }
  for (const controlId of [
    'descriptivePeriodSelect',
    'chartGranularitySelect',
    'analysisScopeSelect',
    'descriptiveComparisonSelect',
    'customDateStart',
    'customDateEnd',
    'topbarYearSelect',
    'yoyBaseYearSelect',
    'yoyTargetYearSelect',
    'btnSingleYear',
    'btnYoyYear',
  ]) {
    const control = root.querySelector<HTMLElement>(`#${controlId}`)
    if (!control) continue
    const eventType = control instanceof HTMLButtonElement ? 'click' : 'change'
    control.addEventListener(eventType, refreshDecisionCharts)
    activeListeners.push({ target: control, type: eventType, listener: refreshDecisionCharts })
  }

  // Weather page controls and refresh triggers
  const refreshWeatherView = () => {
    loadWeatherEffectView(root).catch((error: unknown) => {
      const status = root.querySelector<HTMLElement>('#weatherEffectStatus')
      if (status) status.textContent = error instanceof Error ? error.message : 'Weather data could not be loaded.'
    })
  }

  const provider = root.querySelector<HTMLSelectElement>('#weatherProvider')
  const weatherYear = root.querySelector<HTMLSelectElement>('#weatherYear')
  if (weatherYear) populateWeatherYears(weatherYear)
  const refreshButton = root.querySelector<HTMLButtonElement>('#weatherRefresh')
  const syncProviderControls = () => {
    if (!refreshButton) return
    const isApi = isWeatherApiProvider(provider?.value ?? '')
    const canRefresh = ['admin', 'analyst'].includes(user?.role.toLowerCase() ?? '')
    refreshButton.disabled = !isApi || !canRefresh
    refreshButton.textContent = 'Refresh selected API'
    refreshButton.title = !canRefresh
      ? 'An analyst or administrator account is required to refresh weather APIs'
      : isApi
        ? `Fetch the selected period from ${weatherProviderLabel(provider?.value ?? '')} and publish candidates to Databricks`
        : 'PAGASA files are refreshed through the Databricks external-source notebook'
  }
  const handleProviderChange = () => {
    syncProviderControls()
    refreshWeatherView()
  }
  const handleWeatherRefresh = () => {
    refreshSelectedWeatherData(root).catch((error: unknown) => {
      const status = root.querySelector<HTMLElement>('#weatherEffectStatus')
      if (status) status.textContent = error instanceof Error ? error.message : 'Weather API refresh failed.'
    })
  }
  const weatherControls = ['weatherArea', 'weatherYear', 'weatherGrain']
    .map((id) => root.querySelector<HTMLElement>(`#${id}`))
    .filter((control): control is HTMLElement => Boolean(control))
  provider?.addEventListener('change', handleProviderChange)
  const weatherColumns = root.querySelector<HTMLSelectElement>('#weatherColumns')
  const changeWeatherColumns = () => applyWeatherColumns(root)
  weatherColumns?.addEventListener('change', changeWeatherColumns)
  if (weatherColumns) activeListeners.push({ target: weatherColumns, type: 'change', listener: changeWeatherColumns })
  refreshButton?.addEventListener('click', handleWeatherRefresh)
  for (const control of weatherControls) control.addEventListener('change', refreshWeatherView)
  syncProviderControls()
  if (provider) activeListeners.push({ target: provider, type: 'change', listener: handleProviderChange })
  if (refreshButton) activeListeners.push({ target: refreshButton, type: 'click', listener: handleWeatherRefresh })
  for (const control of weatherControls) {
    activeListeners.push({ target: control, type: 'change', listener: refreshWeatherView })
  }

}
