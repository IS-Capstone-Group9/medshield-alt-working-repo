import { loadDatabricksDashboardSnapshot } from './databricksDashboard'

export interface DashboardSnapshot {
  data_status: {
    source: 'databricks'
    mode: 'live'
    loaded_at: string
    message: string
    catalog?: string
    schema?: string
    table?: string
    dataset_id?: string
  }
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

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

const SNAPSHOT_CACHE_TTL_MS = envNumber('DASHBOARD_SNAPSHOT_CACHE_TTL_MS', 30000)

let snapshotCache: { data: DashboardSnapshot; expiresAt: number } | null = null
let snapshotLoad: Promise<DashboardSnapshot> | null = null

export async function loadSnapshot(): Promise<DashboardSnapshot> {
  const now = Date.now()
  if (snapshotCache && snapshotCache.expiresAt > now) return snapshotCache.data

  if (!snapshotLoad) {
    snapshotLoad = loadDatabricksDashboardSnapshot()
      .then((data) => {
        const snapshot = data as DashboardSnapshot
        snapshotCache = { data: snapshot, expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS }
        return snapshot
      })
      .finally(() => {
        snapshotLoad = null
      })
  }

  return snapshotLoad
}
