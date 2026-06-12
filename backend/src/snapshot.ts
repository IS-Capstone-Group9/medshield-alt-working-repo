import { readFile } from 'node:fs/promises'
import path from 'node:path'

export interface DashboardSnapshot {
  totals: Record<string, unknown>
  monthly: Array<Record<string, unknown>>
  by_area: Array<Record<string, unknown>>
  top_products: Array<Record<string, unknown>>
  year_summary: Array<Record<string, unknown>>
  seasonality: Array<Record<string, unknown>>
  forecasts?: Array<Record<string, unknown>>
  external_signals?: Array<Record<string, unknown>>
  inventory_recommendations?: Array<Record<string, unknown>>
  regional_priorities?: Array<Record<string, unknown>>
  area_clusters?: Array<Record<string, unknown>>
  product_priorities?: Array<Record<string, unknown>>
  allocation_recommendations?: Array<Record<string, unknown>>
  product_region_matches?: Array<Record<string, unknown>>
  decision_alerts?: Array<Record<string, unknown>>
  model_evaluation?: Array<Record<string, unknown>>
}

const ANALYTICS_SERVICE_URL = (process.env.ANALYTICS_SERVICE_URL ?? 'http://localhost:5101').replace(
  /\/$/,
  '',
)
const PRODUCT_SERVICE_URL = (process.env.PRODUCT_SERVICE_URL ?? 'http://localhost:5102').replace(
  /\/$/,
  '',
)
const REFERENCE_DATA_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'frontend',
  'public',
  'data',
  'sales_data.json',
)

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`)
    }
    return (await response.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

async function loadReferenceSnapshot(): Promise<DashboardSnapshot> {
  const raw = await readFile(REFERENCE_DATA_PATH, 'utf8')
  return JSON.parse(raw) as DashboardSnapshot
}

export async function loadSnapshot(): Promise<DashboardSnapshot> {
  try {
    const [
      totals,
      monthly,
      byArea,
      yearSummary,
      seasonality,
      forecasts,
      externalSignals,
      regionalPriorities,
      areaClusters,
      decisionAlerts,
      modelEvaluation,
      topProducts,
      inventoryRecommendations,
      productPriorities,
      allocationRecommendations,
      productRegionMatches,
    ] = await Promise.all([
      fetchJson<Record<string, unknown>>(new URL('/summary', ANALYTICS_SERVICE_URL).toString()),
      fetchJson<Array<Record<string, unknown>>>(
        new URL('/monthly', ANALYTICS_SERVICE_URL).toString(),
      ),
      fetchJson<Array<Record<string, unknown>>>(
        new URL('/by_area', ANALYTICS_SERVICE_URL).toString(),
      ),
      fetchJson<Array<Record<string, unknown>>>(
        new URL('/year_summary', ANALYTICS_SERVICE_URL).toString(),
      ),
      fetchJson<Array<Record<string, unknown>>>(
        new URL('/seasonality', ANALYTICS_SERVICE_URL).toString(),
      ),
      fetchJson<Array<Record<string, unknown>>>(
        new URL('/forecasts', ANALYTICS_SERVICE_URL).toString(),
      ),
      fetchJson<Array<Record<string, unknown>>>(
        new URL('/external_signals', ANALYTICS_SERVICE_URL).toString(),
      ),
      fetchJson<Array<Record<string, unknown>>>(
        new URL('/regional_priorities', ANALYTICS_SERVICE_URL).toString(),
      ),
      fetchJson<Array<Record<string, unknown>>>(
        new URL('/area_clusters', ANALYTICS_SERVICE_URL).toString(),
      ),
      fetchJson<Array<Record<string, unknown>>>(
        new URL('/decision_alerts', ANALYTICS_SERVICE_URL).toString(),
      ),
      fetchJson<Array<Record<string, unknown>>>(
        new URL('/model_evaluation', ANALYTICS_SERVICE_URL).toString(),
      ),
      fetchJson<Array<Record<string, unknown>>>(
        new URL('/products?limit=15', PRODUCT_SERVICE_URL).toString(),
      ),
      fetchJson<Array<Record<string, unknown>>>(
        new URL('/inventory_recommendations', PRODUCT_SERVICE_URL).toString(),
      ),
      fetchJson<Array<Record<string, unknown>>>(
        new URL('/product_priorities', PRODUCT_SERVICE_URL).toString(),
      ),
      fetchJson<Array<Record<string, unknown>>>(
        new URL('/allocation_recommendations', PRODUCT_SERVICE_URL).toString(),
      ),
      fetchJson<Array<Record<string, unknown>>>(
        new URL('/product_region_matches', PRODUCT_SERVICE_URL).toString(),
      ),
    ])

    return {
      totals,
      monthly,
      by_area: byArea,
      top_products: topProducts,
      year_summary: yearSummary,
      seasonality,
      forecasts,
      external_signals: externalSignals,
      inventory_recommendations: inventoryRecommendations,
      regional_priorities: regionalPriorities,
      area_clusters: areaClusters,
      product_priorities: productPriorities,
      allocation_recommendations: allocationRecommendations,
      product_region_matches: productRegionMatches,
      decision_alerts: decisionAlerts,
      model_evaluation: modelEvaluation,
    }
  } catch {
    return await loadReferenceSnapshot()
  }
}
