import { test, expect, type Page } from '@playwright/test'

const financial = { revenue: 1000, income: 200, margin_revenue_basis: 1000, margin_pct: 20, negative_sales: 0, rows: 10, net_sales_eligible_rows: 10, gross_margin_eligible_rows: 10, original_source_rows: 8, adjusted_estimated_rows: 2, unresolved_product_rows: 0 }
const contribution = (key: string, label = key) => ({ key, label, current: 1000, prior: 800, delta: 200, contribution_pct: 100, comparison_status: 'comparable', current_financial: financial, prior_financial: { ...financial, revenue: 800 } })
const diagnostics = { release: { dataset_id: 'test-only', fact_delta_version: 20, policy_version: 'fixture' }, totals: { current: 1000, prior: 800, growth_pct: 25, matched_months: 12, expected_months: 12, comparison_status: 'comparable', current_financial: financial }, coverage: { missing_current_months: [], missing_prior_months: [], unmatched_months: [], coverage_status: 'complete' }, contributions: { month: [contribution('2025-01'), contribution('2025-02')], product: [contribution('sku-1', 'Test medicine')], area: [contribution('Quezon')], sector: [contribution('Government')] } }
const status = { received_at: '2026-10-10', quality_summary: { source_period_start: '2017-01-02', source_period_end: '2025-12-31', rows_accepted: 37728 } }

async function prepare(page: Page) {
  await page.context().addCookies([{ name: 'medshield.accessToken', value: 'test-only-token', url: process.env.COMMERCIAL_BASE_URL || 'http://localhost:3001' }])
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    const bodies: Record<string, unknown> = {
      '/api/auth/me': { user: { account_id: 1, username: 'Test analyst', email: 'test@example.invalid', role: 'analyst' } },
      '/api/sales/status': status,
      '/api/sales/diagnostics': diagnostics,
      '/api/sales/forecast-validation': { status: 'exploratory', publication_status: 'candidate', scope: { sector: 'All', product: '', metric: 'revenue', unit: 'PHP' }, source: {}, actuals: [{ period: '2025-12', actual: 1000 }], origin: '2025-12', last_actual_period: '2025-12', products: [], models: {}, views: {} },
      '/api/seasonality/stl': { rows: [{ period: '2025-01', observed: 1000, trend: 800, seasonal: 150, residual: 50, segment_start: '2025-01', segment_end: '2025-01' }], release: { fact_delta_version: 20 } },
      '/api/sales/transactions': { rows: [{ dr_number: 'TEST-1', date_delivered: '2025-01-01', product: 'Test medicine', quantity: 20, total_trade_price: 1000, quality_status: 'warning', quality_notes: 'Fixture only' }], pagination: { page: 1, page_count: 1 } },
    }
    await route.fulfill({ status: path in bodies ? 200 : 503, contentType: 'application/json', body: JSON.stringify(bodies[path] || { error: 'Unavailable test endpoint' }) })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Executive Overview', exact: true })).toBeVisible()
  await expect(page.getByText('Recorded net sales', { exact: true })).toBeVisible()
}

test('six modules, calendar filters, source drawer and unsupported 24M forecast', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await prepare(page)
  await expect(page.locator('#calendar-anchor')).toHaveValue('2025-12')
  const request = page.waitForRequest(req => req.url().includes('/api/sales/diagnostics?') && req.url().includes('start_date=2024-01-01'))
  await page.getByRole('button', { name: '24M', exact: true }).click(); await request
  await page.getByRole('button', { name: 'Top Medicines & Catalog' }).click()
  await page.getByRole('button', { name: 'Test medicine', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'TEST-1' }).click()
  await expect(page.getByText('Delivery source inspector')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Sales Trends & Breakdown' }).click()
  await expect(page.getByText('Reconciles to cent precision', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Regional Sales & Clients' }).click()
  await expect(page.getByRole('heading', { name: 'Territory sales', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Demand & Sales Forecast' }).click()
  await expect(page.getByText('The source does not supply a 24-month forecast', { exact: false })).toBeVisible()
  await page.getByLabel('Forecast horizon', { exact: true }).selectOption('12')
  await expect(page.getByText('The source does not supply a 12-month forecast', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Purchasing & Inventory Plan' }).click()
  await expect(page.getByText('Complete all numeric assumptions', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Evidence checklist' }).click()
  await expect(page.getByRole('dialog')).toContainText('Not established by this source')
  expect(errors).toEqual([])
})

test('failed new filter hides old figures and retry recovers', async ({ page }) => {
  await prepare(page)
  await page.route('**/api/sales/diagnostics?**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Warehouse unavailable' }) }))
  await page.getByRole('button', { name: 'Next month', exact: true }).click()
  await expect(page.getByText('Source data could not be loaded.')).toBeVisible()
  await expect(page.getByText('Recorded net sales', { exact: true })).toHaveCount(0)
  await page.unroute('**/api/sales/diagnostics?**')
  await page.getByRole('button', { name: 'Retry loading dashboard' }).click()
  await expect(page.getByText('Recorded net sales', { exact: true })).toBeVisible()
})

test('mobile navigation and layout stay within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await prepare(page)
  await page.getByRole('button', { name: 'Toggle navigation' }).click()
  await page.getByRole('button', { name: 'Purchasing & Inventory Plan' }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await expect(page.getByRole('heading', { name: 'Purchasing & Inventory Plan', exact: true })).toBeVisible()
})
