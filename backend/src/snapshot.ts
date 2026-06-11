import { readFile } from 'node:fs/promises'
import path from 'node:path'

export interface DashboardSnapshot {
  totals: Record<string, unknown>
  monthly: Array<Record<string, unknown>>
  by_area: Array<Record<string, unknown>>
  top_products: Array<Record<string, unknown>>
  year_summary: Array<Record<string, unknown>>
  seasonality: Array<Record<string, unknown>>
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
  'external',
  'medshield_frontend',
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
    const [totals, monthly, byArea, yearSummary, seasonality, topProducts] = await Promise.all([
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
        new URL('/products?limit=15', PRODUCT_SERVICE_URL).toString(),
      ),
    ])

    return {
      totals,
      monthly,
      by_area: byArea,
      top_products: topProducts,
      year_summary: yearSummary,
      seasonality,
    }
  } catch {
    return await loadReferenceSnapshot()
  }
}

