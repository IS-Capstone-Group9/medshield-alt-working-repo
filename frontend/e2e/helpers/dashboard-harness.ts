import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Page, Route } from '@playwright/test'

/**
 * Runs the real dashboard runtime in a test page with mocked gateway responses.
 * This proves layout, order and behaviour only. Every amount here is synthetic,
 * so it can never stand in for live Databricks evidence.
 */
const GATEWAY = 'http://fixture.gateway'
// Installed through the backend's tsx dependency; this test helper adds nothing to the frontend lockfile.
const { build } = createRequire(path.resolve('../backend/package.json'))('esbuild') as {
  build(options: Record<string, unknown>): Promise<{ outputFiles: { text: string }[] }>
}
let bundle: Promise<string> | undefined

const compiled = () => bundle ??= build({
  entryPoints: [path.resolve('e2e/helpers/dashboard-harness-entry.tsx')],
  bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2022', jsx: 'automatic',
  tsconfig: path.resolve('tsconfig.json'), logLevel: 'silent',
  define: {
    'process.env.NEXT_PUBLIC_API_BASE_URL': JSON.stringify(GATEWAY),
    'process.env.NEXT_PUBLIC_SUPABASE_URL': '""',
    'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': '""',
    'process.env.NODE_ENV': '"production"',
  },
}).then(result => result.outputFiles[0].text)

export function fixtureDashboard() {
  const monthly: { period: string; revenue: number; income: number; transactions: number }[] = []
  for (let year = 2017; year <= 2026; year++) {
    for (let month = 1; month <= (year === 2026 ? 9 : 12); month++) {
      const seasonal = 1 + 0.35 * Math.sin((month / 12) * 2 * Math.PI)
      const revenue = Math.round((3_000_000 + (year - 2017) * 900_000) * seasonal)
      monthly.push({ period: `${year}-${String(month).padStart(2, '0')}`, revenue, income: Math.round(revenue * 0.52), transactions: 300 + month })
    }
  }
  const years = [...new Set(monthly.map(row => row.period.slice(0, 4)))]
  const yearSummary = years.map(year => {
    const rows = monthly.filter(row => row.period.startsWith(year))
    return { year, revenue: rows.reduce((total, row) => total + row.revenue, 0), income: rows.reduce((total, row) => total + row.income, 0), months: rows.length }
  })
  const totalRevenue = yearSummary.reduce((total, row) => total + row.revenue, 0)
  const totalIncome = yearSummary.reduce((total, row) => total + row.income, 0)
  const release = {
    dataset_id: 'fixture-dataset', fact_delta_version: 0, policy_version: 'fixture-policy',
    financial_scope: { id: 'itemized', label: 'Exclude Contracts', note: 'Synthetic fixture amounts.' },
  }
  const dataStatus = { source: 'databricks', mode: 'live', loaded_at: '2026-11-07T00:00:00Z', message: 'Fixture source', release }
  return {
    snapshot: {
      data_status: dataStatus,
      totals: { total_revenue: totalRevenue, total_income: totalIncome, total_transactions: monthly.length * 300, avg_margin: 52 },
      monthly,
      year_summary: yearSummary,
      by_area: ['GOVERNMENT', 'HOSPITAL', 'QUEZON', 'BATANGAS'].map((area, index) => ({ area, revenue: 90_000_000 - index * 15_000_000, income: 40_000_000 - index * 6_000_000 })),
      top_products: Array.from({ length: 12 }, (_, index) => ({ product: `FIXTURE PRODUCT ${index + 1}`, revenue: 24_000_000 - index * 1_800_000, income: 12_000_000 - index * 900_000 })),
      seasonality: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => ({ month, avg_revenue: 5_000_000 + index * 150_000 })),
      forecasts: [],
    },
    sectors: {
      source: { release }, years, sectors: ['All', 'Government', 'Private', 'Internal'],
      observations: { start: '2017-01-01', end: '2026-09-30' },
      daily: ['All', 'Government', 'Private', 'Internal'].flatMap((sector, index) => monthly.map(row => {
        const share = index === 0 ? 1 : [0, 0.55, 0.35, 0.1][index]
        return {
          sector, period: row.period, date: `${row.period}-15`, revenue: Math.round(row.revenue * share),
          income: Math.round(row.income * share), margin_revenue_basis: Math.round(row.revenue * share),
        }
      })),
    },
  }
}

/** The dashboard rejects a response whose release names a different scope, so the fixture echoes it. */
function dashboardForScope(dashboard: ReturnType<typeof fixtureDashboard>, scope: string | null) {
  const status = dashboard.snapshot.data_status
  const release = { ...status.release, financial_scope: { ...status.release.financial_scope, id: scope ?? 'itemized' } }
  return {
    snapshot: { ...dashboard.snapshot, data_status: { ...status, release } },
    sectors: { ...dashboard.sectors, source: { ...dashboard.sectors.source, release } },
  }
}

/** Enough synthetic product rows to fill the ranking chart and paged table. */
export function fixtureProductRows() {
  return {
    rows: Array.from({ length: 32 }, (_, index) => ({
      product: `FIXTURE PRODUCT ${index + 1}`, period: '2026-02', revenue: 2_400_000 - index * 60_000, positive_sales: 2_400_000 - index * 60_000,
      returns_value: 0, quantity: 40 + index, sector: 'Private', territory: 'Quezon', channel: 'Retail Pharmacy', row_count: 3, evidence: 'actual',
    })),
    source: { file: 'Synthetic fixture', excluded: {} },
  }
}

async function fontFace() {
  const font = await readFile(path.resolve('app/fonts/Inter-variable.ttf'))
  return `@font-face{font-family:Inter;src:url(data:font/ttf;base64,${font.toString('base64')});font-weight:100 900}body{font-family:Inter,system-ui,sans-serif}`
}

/** Unknown gateway paths answer 503, which is the unavailable state a real outage would show. */
export async function mountDashboardHarness(page: Page, responses: Record<string, unknown> = {}) {
  const [script, globals, overrides, font] = await Promise.all([
    compiled(), readFile(path.resolve('app/globals.css'), 'utf8'), readFile(path.resolve('app/overrides.css'), 'utf8'), fontFace(),
  ])
  const dashboard = fixtureDashboard()
  await page.route(`${GATEWAY}/**`, (route: Route) => {
    const url = new URL(route.request().url())
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const body = url.pathname === '/api/financial/dashboard' ? dashboardForScope(dashboard, url.searchParams.get('financial_scope'))
      : url.pathname === '/api/sales/sectors' ? fixtureProductRows() : responses[url.pathname]
    return body === undefined
      ? route.fulfill({ status: 503, headers, contentType: 'application/json', body: '{"error":"Fixture source unavailable"}' })
      : route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(body) })
  })
  await page.route('http://harness.test/**', route => route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${font} #harness{display:contents}</style><style>${globals}</style><style>${overrides}</style></head><body><div id="harness"></div></body></html>`,
  }))
  const problems: string[] = []
  page.on('pageerror', error => problems.push(error.message))
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) problems.push(message.text()) })
  await page.goto('http://harness.test/')
  await page.addScriptTag({ content: script })
  await page.waitForFunction(() => document.querySelector('.medshield-root')?.getAttribute('data-source-state') === 'ready', undefined, { timeout: 30000 })
    .catch(error => { throw new Error('Harness did not reach ready: ' + problems.slice(0, 6).join(' | '), { cause: error }) })
}
