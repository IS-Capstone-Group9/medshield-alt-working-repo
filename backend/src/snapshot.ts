import { readFile } from 'node:fs/promises'
import path from 'node:path'

export interface DashboardSnapshot {
  data_status: {
    source: 'analytics_services' | 'bundled_fallback'
    mode: 'historical' | 'demo'
    loaded_at: string
    message: string
    current_month?: string
    forecast_window?: {
      start: string
      end: string
      months: number
    }
  }
  totals: Record<string, unknown>
  monthly: Array<Record<string, unknown>>
  by_area: Array<Record<string, unknown>>
  by_year_area?: Record<string, Array<Record<string, unknown>>>
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

function periodKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function addMonthsToPeriod(period: string, offset: number): string {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, 1))
  date.setUTCMonth(date.getUTCMonth() + offset)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function buildForecastWindowMetadata(currentMonth: string = periodKeyFromDate(new Date())) {
  return {
    current_month: currentMonth,
    forecast_window: {
      start: currentMonth,
      end: addMonthsToPeriod(currentMonth, 11),
      months: 12,
    },
  }
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
function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

const SERVICE_TIMEOUT_MS = envNumber('DASHBOARD_SERVICE_TIMEOUT_MS', 2500)
const SNAPSHOT_CACHE_TTL_MS = envNumber('DASHBOARD_SNAPSHOT_CACHE_TTL_MS', 30000)

let snapshotCache: { data: DashboardSnapshot; expiresAt: number } | null = null
let snapshotLoad: Promise<DashboardSnapshot> | null = null

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SERVICE_TIMEOUT_MS)

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
  const parsed = JSON.parse(raw) as Omit<DashboardSnapshot, 'data_status'> & {
    data_status?: DashboardSnapshot['data_status']
    forecast?: Array<Record<string, unknown>>
  }
  return {
    ...parsed,
    forecasts: parsed.forecasts ?? parsed.forecast ?? [],
    data_status: {
      source: 'bundled_fallback',
      mode: 'demo',
      loaded_at: new Date().toISOString(),
      message: 'Bundled demonstration snapshot; not a live operational feed.',
      ...buildForecastWindowMetadata(parsed.data_status?.current_month),
      ...(parsed.data_status ?? {}),
    },
  }
}

async function loadFreshSnapshot(): Promise<DashboardSnapshot> {
  try {
    const [
      totals,
      monthly,
      byArea,
      byYearArea,
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
      fetchJson<Record<string, Array<Record<string, unknown>>>>(
        new URL('/by_year_area', ANALYTICS_SERVICE_URL).toString(),
      ).catch(() => ({})),
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
      data_status: {
        source: 'analytics_services',
        mode: 'historical',
        loaded_at: new Date().toISOString(),
        message: 'Historical analytics service data; external signals are planning context only.',
        ...buildForecastWindowMetadata(),
      },
      totals,
      monthly,
      by_area: byArea,
      by_year_area: byYearArea,
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

export async function loadSnapshot(): Promise<DashboardSnapshot> {
  const now = Date.now()
  if (snapshotCache && snapshotCache.expiresAt > now) {
    return snapshotCache.data
  }

  if (!snapshotLoad) {
    snapshotLoad = loadFreshSnapshot()
      .then((data) => {
        snapshotCache = {
          data,
          expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS,
        }
        return data
      })
      .finally(() => {
        snapshotLoad = null
      })
  }

  return await snapshotLoad
}

export function clearSnapshotCache(): void {
  snapshotCache = null
}
