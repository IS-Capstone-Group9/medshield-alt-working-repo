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

export function installCommonInteractions(root: HTMLElement) {
  const backdrop = root.querySelector('#dashboardHelpBackdrop')
  root.querySelector('#closeDashboardHelpButton')?.addEventListener('click', () => {
    backdrop?.classList.remove('is-open')
  })
  backdrop?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) backdrop?.classList.remove('is-open')
  })
}

export async function refreshDashboardFromGateway() {
  const applyDatasetPatch = (window as any).applyDatasetPatch
  if (typeof applyDatasetPatch !== 'function') return

  const data = await loadDashboardData()
  applyDatasetPatch({
    monthly: data.monthly,
    by_area: data.byArea,
    top_products: data.products,
    year_summary: data.yearSummary,
    seasonality: data.seasonality,
  })
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
