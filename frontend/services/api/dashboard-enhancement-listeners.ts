import { refreshWeatherData } from '@/lib/api'
import {
  loadSalesDataView,
  loadWeatherEffectView,
  refreshDashboardFromGateway,
  installCommonInteractions,
} from './dashboard-interactions'
import { setSalesViewError } from './sales-page-helpers'
import { weatherProviderLabel } from './weather-view-helpers'
import { processSalesUpload } from './upload-pipeline'
import { applyScenarioSafetyLabels } from './dashboard-enhancements'
import { renderDecisionSupportCharts } from './dashboard-decision-charts'
import { installMcdaSensitivity, renderMcdaSensitivity } from './dashboard-mcda'
import {
  checkDatabricksConnection,
  syncDatabricksYearlyCandidate,
} from './integrations.service'
import type { User } from '@/lib/auth-tokens'

const DASHBOARD_PAGE_META = {
  overview: ['Executive Overview', 'Centralized demand intelligence, forecasting, and stock actions'],
  revenue: ['Sales Diagnostics', 'Revenue, growth, and margin trends'],
  products: ['Product Prioritization', 'ABC/Pareto product view'],
  territory: ['Area Prioritization', 'Territory performance and ranking'],
  forecast: ['Forecast Modeling', 'Prophet forecast with external signals'],
  inventory: ['Prescriptive Planning', 'Reorder, alerts, and urgency outputs'],
  data: ['Data Upload', 'CSV and JSON sources for dashboard updates'],
  'sales-data': ['View Sales Data', 'Inspect, filter, validate, and reconcile the uploaded sales records'],
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

  if (document.body.classList.contains('nav-hidden')) {
    ;(window as any).closeNavigation?.()
  }

  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      ;(window as any).buildCharts?.()
      ;(window as any).buildTables?.()
      ;(window as any).renderShowcaseDOMVisuals?.()
      renderDecisionSupportCharts(root)
      renderMcdaSensitivity(root)
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

  installCommonInteractions(root)
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

  const uploadInput = root.querySelector<HTMLInputElement>('#salesDataUploadInput')
  uploadInput?.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    processSalesUpload(
      file,
      () => {},
      async () => {
        salesState.page = 1
        await refreshSalesView()
        await refreshDashboardFromGateway()
      },
      () => {}
    )
  })

  root.querySelector('#salesDataUploadButton')?.addEventListener('click', () => {
    uploadInput?.click()
  })

  const databricksPanel = root.querySelector<HTMLElement>('#databricksConnectionPanel')
  const databricksButton = root.querySelector<HTMLButtonElement>('#checkDatabricksConnectionButton')
  const databricksBadge = root.querySelector<HTMLElement>('#databricksConnectionBadge')
  const databricksDetail = root.querySelector<HTMLElement>('#databricksConnectionDetail')
  const databricksSyncButton = root.querySelector<HTMLButtonElement>('#syncDatabricksYearlyButton')
  const databricksSyncResult = root.querySelector<HTMLElement>('#databricksYearlySyncResult')
  const databricksSyncBadge = root.querySelector<HTMLElement>('#databricksYearlySyncBadge')
  const databricksSyncDetail = root.querySelector<HTMLElement>('#databricksYearlySyncDetail')
  const databricksSyncWarning = root.querySelector<HTMLElement>('#databricksYearlySyncWarning')

  if (user?.role.toLowerCase() !== 'admin') {
    databricksPanel?.remove()
  } else if (
    databricksButton &&
    databricksBadge &&
    databricksDetail &&
    databricksSyncButton &&
    databricksSyncResult &&
    databricksSyncBadge &&
    databricksSyncDetail &&
    databricksSyncWarning
  ) {
    let databricksConnectionVerified = false

    const handleDatabricksCheck = async () => {
      databricksConnectionVerified = false
      databricksButton.disabled = true
      databricksButton.textContent = 'Checking...'
      databricksSyncButton.disabled = true
      databricksSyncButton.title = 'Verify the Databricks Gold connection first'
      databricksBadge.textContent = 'Checking'
      databricksPanel?.classList.remove('is-connected', 'is-error')
      databricksPanel?.classList.add('is-checking')
      databricksDetail.textContent = 'MedShield is checking the approved Databricks Gold view. Free Edition may need a few seconds to wake up.'

      try {
        const status = await checkDatabricksConnection()
        if (
          status.row_count !== 9 ||
          status.period.year_count !== 9 ||
          status.period.minimum_year !== 2017 ||
          status.period.maximum_year !== 2025
        ) {
          throw new Error('The Gold yearly view must contain exactly one row for every year from 2017 through 2025.')
        }
        databricksConnectionVerified = true
        databricksBadge.textContent = 'Connected'
        databricksDetail.textContent = `${status.source.catalog}.${status.source.schema}.${status.source.view} is available: ${status.period.minimum_year}-${status.period.maximum_year}, ${status.period.year_count} years, ${status.row_count.toLocaleString()} yearly rows.`
        databricksPanel?.classList.remove('is-checking', 'is-error')
        databricksPanel?.classList.add('is-connected')
        databricksSyncButton.disabled = false
        databricksSyncButton.removeAttribute('title')
        databricksSyncResult.hidden = false
        databricksSyncResult.classList.remove('is-syncing', 'is-success', 'is-error')
        databricksSyncBadge.textContent = 'Ready'
        databricksSyncDetail.textContent = 'Connection verified. The nine Gold yearly candidates can now be synchronized into the protected Supabase cache.'
        databricksSyncWarning.textContent = 'Candidate-only data will not replace approved dashboard facts.'
      } catch (error) {
        databricksBadge.textContent = 'Unavailable'
        databricksDetail.textContent = error instanceof Error
          ? error.message
          : 'MedShield could not verify the Databricks connection.'
        databricksPanel?.classList.remove('is-checking', 'is-connected')
        databricksPanel?.classList.add('is-error')
        databricksSyncButton.disabled = true
        databricksSyncButton.title = 'Verify the Databricks Gold connection first'
        databricksSyncResult.hidden = true
      } finally {
        databricksButton.disabled = false
        databricksButton.textContent = 'Verify Again'
      }
    }

    const handleDatabricksYearlySync = async () => {
      if (!databricksConnectionVerified) return

      databricksButton.disabled = true
      databricksSyncButton.disabled = true
      databricksSyncButton.classList.add('is-busy')
      databricksSyncButton.setAttribute('aria-busy', 'true')
      databricksSyncButton.textContent = 'Syncing...'
      databricksSyncResult.hidden = false
      databricksSyncResult.classList.remove('is-success', 'is-error')
      databricksSyncResult.classList.add('is-syncing')
      databricksSyncBadge.textContent = 'Syncing'
      databricksSyncDetail.textContent = 'Validating the 47-column Gold contract and writing the nine yearly rows atomically.'
      databricksSyncWarning.textContent = 'Please keep this page open while Databricks Free Edition wakes and runs the query.'

      try {
        const result = await syncDatabricksYearlyCandidate()
        databricksSyncResult.classList.remove('is-syncing', 'is-error')
        databricksSyncResult.classList.add('is-success')
        databricksSyncBadge.textContent = 'Synchronized'
        databricksSyncDetail.textContent = `${result.loaded_rows.toLocaleString()} of ${result.extracted_rows.toLocaleString()} rows loaded • ${result.period.minimum_year}-${result.period.maximum_year} • ${result.reconciliation.loaded_transaction_count.toLocaleString()} transactions reconciled • pipeline run ${result.pipeline_run_key}.`
        databricksSyncWarning.textContent = result.warning
        databricksSyncButton.textContent = 'Sync Again'
      } catch (error) {
        databricksSyncResult.classList.remove('is-syncing', 'is-success')
        databricksSyncResult.classList.add('is-error')
        databricksSyncBadge.textContent = 'Failed'
        databricksSyncDetail.textContent = error instanceof Error
          ? error.message
          : 'The yearly candidate synchronization failed.'
        databricksSyncWarning.textContent = 'Published dashboard facts were not changed. Check the candidate-cache validation result before retrying.'
        databricksSyncButton.textContent = 'Try Sync Again'
      } finally {
        databricksButton.disabled = false
        databricksSyncButton.disabled = !databricksConnectionVerified
        databricksSyncButton.classList.remove('is-busy')
        databricksSyncButton.removeAttribute('aria-busy')
      }
    }

    databricksButton.addEventListener('click', handleDatabricksCheck)
    databricksSyncButton.addEventListener('click', handleDatabricksYearlySync)
    activeListeners.push(
      {
        target: databricksButton,
        type: 'click',
        listener: handleDatabricksCheck,
      },
      {
        target: databricksSyncButton,
        type: 'click',
        listener: handleDatabricksYearlySync,
      },
    )
  }

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

  if (navigation) {
    navigation.addEventListener('click', handleNavigation)
    navigation.addEventListener('keydown', handleNavigationKeydown)
    activeListeners.push(
      { target: navigation, type: 'click', listener: handleNavigation },
      { target: navigation, type: 'keydown', listener: handleNavigationKeydown }
    )
  }

  const refreshDecisionCharts = () => {
    window.requestAnimationFrame(() => renderDecisionSupportCharts(root))
  }
  for (const controlId of [
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
      console.error('Weather view load error:', error)
    })
  }

  root.querySelector('#weatherProvider')?.addEventListener('change', refreshWeatherView)
  root.querySelector('#weatherArea')?.addEventListener('change', refreshWeatherView)
  root.querySelector('#weatherYear')?.addEventListener('change', refreshWeatherView)
  root.querySelector('#weatherGrain')?.addEventListener('change', refreshWeatherView)

  root.querySelector('#refreshWeatherButton')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement
    const originalText = btn.innerHTML
    btn.disabled = true
    btn.innerHTML = '<svg class="animate-spin inline-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4"></path></svg> Syncing...'

    const providerSelect = root.querySelector('#weatherProvider') as HTMLSelectElement | null
    const areaSelect = root.querySelector('#weatherArea') as HTMLSelectElement | null
    const yearSelect = root.querySelector('#weatherYear') as HTMLSelectElement | null

    const provider = (providerSelect?.value === 'open_meteo' ? 'open_meteo' : 'nasa_power')
    const area = areaSelect?.value ?? 'all'
    const year = yearSelect?.value ?? '2025'

    const start = `${year}-01-01`
    const end = `${year}-12-31`
    const areas = area === 'all' ? [] : [area]

    try {
      await refreshWeatherData({ start, end, areas, provider })
      refreshWeatherView()
    } catch (err) {
      console.error(err)
    } finally {
      btn.disabled = false
      btn.innerHTML = originalText
    }
  })

  // Trigger initial loads
  void refreshSalesView()
  refreshWeatherView()
}
