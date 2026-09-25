import {
  loadSalesDataView,
  loadWeatherEffectView,
  refreshSelectedWeatherData,
  refreshDashboardFromGateway,
  refreshDashboardModulesForPage,
  installCommonInteractions,
} from './dashboard-interactions'
import { setSalesViewError } from './sales-page-helpers'
import { weatherProviderLabel } from './weather-view-helpers'
import { applyScenarioSafetyLabels } from './dashboard-enhancements'
import { renderDecisionSupportCharts } from './dashboard-decision-charts'
import { installMcdaSensitivity, renderMcdaSensitivity } from './dashboard-mcda'
import type { User } from '@/lib/auth-tokens'

const DASHBOARD_PAGE_META = {
  overview: ['Executive Overview', 'Centralized demand intelligence, forecasting, and stock actions'],
  revenue: ['Sales Diagnostics', 'Revenue, growth, and margin trends'],
  products: ['Product Prioritization', 'ABC/Pareto product view'],
  territory: ['Area Prioritization', 'Geographic performance, concentration, and evidence quality'],
  forecast: ['Forecast Modeling', 'Actual sales, baseline forecasts and historical validation'],
  inventory: ['Prescriptive Planning', 'Priority products, constrained allocation and scenario review'],
  data: ['Databricks Source', 'Live Gold provenance and ingestion policy'],
  'sales-data': ['View Sales Data', 'Inspect, filter, validate, and reconcile Databricks Gold sales records'],
  'weather-validation': [
    'Weather API Validation',
    'Validate official PAGASA history and NASA POWER proxy observations stored in Databricks',
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

  if (document.body.classList.contains('nav-hidden')) {
    ;(window as any).closeNavigation?.()
  }

  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
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
  }

  const refreshSalesView = () =>
    loadSalesDataView(root, salesState).catch((error: unknown) => {
      setSalesViewError(root, error instanceof Error ? error.message : 'Sales data could not be loaded.')
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
      const latestHistoricalDate = end?.max || new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date())
      if (start) start.value = '2017-01-01'
      if (end) end.value = latestHistoricalDate
      ;(window as any).setDescriptivePeriod?.('custom')
      ;(window as any).setCustomDateRange?.('2017-01-01', latestHistoricalDate)
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
  const refreshButton = root.querySelector<HTMLButtonElement>('#weatherRefresh')
  const syncProviderControls = () => {
    if (!refreshButton) return
    const isNasaPower = provider?.value === 'nasa_power'
    const canRefresh = ['admin', 'analyst'].includes(user?.role.toLowerCase() ?? '')
    refreshButton.disabled = !isNasaPower || !canRefresh
    refreshButton.title = !canRefresh
      ? 'An analyst or administrator account is required to refresh NASA POWER'
      : isNasaPower
        ? 'Fetch the selected period from NASA POWER and publish it to Databricks'
        : 'PAGASA files are refreshed through the Databricks external-source notebook'
  }
  const handleProviderChange = () => {
    syncProviderControls()
    refreshWeatherView()
  }
  const handleWeatherRefresh = () => {
    refreshSelectedWeatherData(root).catch((error: unknown) => {
      const status = root.querySelector<HTMLElement>('#weatherEffectStatus')
      if (status) status.textContent = error instanceof Error ? error.message : 'NASA POWER refresh failed.'
    })
  }
  const weatherControls = ['weatherArea', 'weatherYear', 'weatherGrain']
    .map((id) => root.querySelector<HTMLElement>(`#${id}`))
    .filter((control): control is HTMLElement => Boolean(control))
  provider?.addEventListener('change', handleProviderChange)
  refreshButton?.addEventListener('click', handleWeatherRefresh)
  for (const control of weatherControls) control.addEventListener('change', refreshWeatherView)
  syncProviderControls()
  if (provider) activeListeners.push({ target: provider, type: 'change', listener: handleProviderChange })
  if (refreshButton) activeListeners.push({ target: refreshButton, type: 'click', listener: handleWeatherRefresh })
  for (const control of weatherControls) {
    activeListeners.push({ target: control, type: 'change', listener: refreshWeatherView })
  }

}
