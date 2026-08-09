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

export function installDashboardEnhancements(root: HTMLElement, activeListeners: any[]) {
  if (root.dataset.enhancementsInstalled === 'true') return
  root.dataset.enhancementsInstalled = 'true'
  ;(window as any).__medshieldAuditInstalled = true

  installCommonInteractions(root)

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

  // Tab navigation for Sales Data and Weather API Validation
  root.querySelector('#salesDataNavItem')?.addEventListener('click', (e) => {
    ;(window as any).showPage('sales-data', e.currentTarget)
  })
  root.querySelector('#weatherValidationNavItem')?.addEventListener('click', (e) => {
    ;(window as any).showPage('weather-validation', e.currentTarget)
  })

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
