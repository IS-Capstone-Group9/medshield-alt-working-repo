import {
  loadSalesDataView,
  loadWeatherEffectView,
  refreshDashboardFromGateway,
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
    'Validate PAGASA-aligned weather signals before they influence DSS outputs',
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

  if (document.body.classList.contains('nav-hidden')) {
    ;(window as any).closeNavigation?.()
  }

  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      ;(window as any).buildCharts?.()
      ;(window as any).buildTables?.()
      ;(window as any).renderShowcaseDOMVisuals?.()
      ;(window as any).renderProductPrioritizationTimeline?.()
      ;(window as any).renderSalesSectors?.()
      ;(window as any).renderForecastValidation?.()
      ;(window as any).renderExternalRegression?.()
      ;(window as any).renderSalesHeatmap?.()
      renderDecisionSupportCharts(root)
      renderMcdaSensitivity(root)
    }, 60)
  })
}

export function installDashboardEnhancements(
  root: HTMLElement,
  activeListeners: any[],
  _user: User | null,
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

  const story = root.querySelector<HTMLElement>('[data-decision-story]')
  const handleStoryNavigation = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const trigger = target.closest<HTMLElement>('[data-story-page]')
    if (!trigger || !story?.contains(trigger)) return
    const pageName = trigger.dataset.storyPage as DashboardPageName | undefined
    if (!pageName || !(pageName in DASHBOARD_PAGE_META)) return
    const navItem = navigation?.querySelector<HTMLElement>(`.nav-item[data-dashboard-page="${pageName}"]`)
    if (navItem) activateDashboardPage(root, pageName, navItem)
  }

  if (navigation) {
    navigation.addEventListener('click', handleNavigation)
    navigation.addEventListener('keydown', handleNavigationKeydown)
    activeListeners.push(
      { target: navigation, type: 'click', listener: handleNavigation },
      { target: navigation, type: 'keydown', listener: handleNavigationKeydown }
    )
  }
  if (story) {
    story.addEventListener('click', handleStoryNavigation)
    activeListeners.push({ target: story, type: 'click', listener: handleStoryNavigation })
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
    'analysisScopeSelect',
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
      console.error('Weather view load error:', error)
    })
  }

  root.querySelector('#weatherProvider')?.addEventListener('change', refreshWeatherView)
  root.querySelector('#weatherArea')?.addEventListener('change', refreshWeatherView)
  root.querySelector('#weatherYear')?.addEventListener('change', refreshWeatherView)
  root.querySelector('#weatherGrain')?.addEventListener('change', refreshWeatherView)

  // Trigger initial loads
  void refreshSalesView()
  refreshWeatherView()
}
