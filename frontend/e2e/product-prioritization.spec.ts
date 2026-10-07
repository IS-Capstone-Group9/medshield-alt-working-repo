import { test, expect } from '@playwright/test'
import path from 'node:path'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

test.beforeEach(async ({ page }) => {
  await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
  await page.evaluate(() => { window.fetch = async () => new Response('{}', { status: 503 }) })
  await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
  await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())
  await page.evaluate(() => {
    const app = window as any
    app.setDescriptivePeriod('custom')
    app.setDescriptiveGranularity('monthly')
    app.setCustomDateRange('2025-01-01', '2025-12-31')
    app.showPage('products')
    app.setSalesSectorsData({ rows: [60, 20, 10, 5, 5].map((revenue, i) => ({
      product: 'Product ' + i, period: '2025-02', revenue, positive_sales: revenue, returns_value: 0, quantity: i + 1,
      sector: 'Private', territory: 'Quezon', channel: 'Retail Pharmacy', row_count: 1, evidence: 'actual',
    })), source: { file: 'Databricks test fixture', excluded: {} } })
  })
})

test('observed revenue ranks and full-population ABC replace unsupported clinical claims', async ({ page }) => {
  await expect(page.locator('#productPriorityScope')).toContainText('Recorded revenue: ₱100')
  const classes = await page.locator('#productTable').evaluate(table => {
    const column = [...table.querySelectorAll('thead th')].findIndex(header => header.textContent === 'Candidate ABC')
    return [...table.querySelectorAll('tbody tr')].map(row => row.querySelectorAll('td')[column].textContent)
  })
  expect(classes).toEqual(['A', 'A', 'B', 'B', 'C'])
  await expect(page.locator('#page-products')).not.toContainText(/Zero-Stockout|WHO VEN|Surge Multiplier|guaranteed emergency|Clinical VEN/)
  await expect(page.locator('#productScenarioSelect')).toHaveCount(0)
  const values = await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('productBarChart')).data.datasets[0].data)
  expect(values).toEqual([60, 20, 10, 5, 5])
  await page.screenshot({ path: 'test-results-descriptive/product-sales.png', fullPage: true })
})

test('cohort preserves denominator; empty years do not fall back to historical products', async ({ page }) => {
  await page.selectOption('#productCohortSelect', '20')
  await expect(page.locator('#productTable tbody tr')).toHaveCount(1)
  const cumulative = await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('paretoCurveChart')).data.datasets[0].data)
  expect(cumulative).toEqual([60])
  await page.evaluate(() => (window as any).setCustomDateRange('2024-01-01', '2024-12-31'))
  await expect(page.locator('#productTable')).toContainText('No observed product sales')
})

test('returns remain separate in positive-sales ABC; monthly aggregates cannot become partial-month sales', async ({ page }) => {
  await page.evaluate(() => (window as any).setSalesSectorsData({ rows: [
    { product: 'Sale', period: '2025-02', revenue: 100, positive_sales: 100, returns_value: 0, quantity: 10, sector: 'Private', territory: 'Quezon' },
    { product: 'Credit', period: '2025-02', revenue: -10, positive_sales: 0, returns_value: -10, quantity: -1, sector: 'Private', territory: 'Quezon' },
  ], source: { excluded: {} } }))
  await expect(page.locator('#productPriorityScope')).toContainText('Recorded revenue: ₱90')
  await expect(page.locator('#productPriorityScope')).toContainText('Returns remain in net revenue')
  await expect(page.locator('#productTable tbody')).toContainText('Unclassified')
  await page.evaluate(() => (window as any).setCustomDateRange('2025-02-15', '2025-02-28'))
  await expect(page.locator('#productPriorityScope')).toContainText('cannot be assigned to the exact requested dates')
  await expect(page.locator('#productTable')).toContainText('No observed product sales')
})

test('source labels render as text and export uses selected scope', async ({ page }) => {
  await page.evaluate(() => (window as any).setSalesSectorsData({ rows: [
    { product: '<img src=x onerror="window.injected=true">', period: '2025-02', revenue: 100, positive_sales: 100, returns_value: 0, quantity: 10, sector: 'Private', territory: 'Quezon' },
  ], source: { excluded: {} } }))
  await expect(page.locator('#productTable tbody img')).toHaveCount(0)
  expect(await page.evaluate(() => (window as any).injected)).toBeUndefined()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export selected rows' }).click()
  expect((await download).suggestedFilename()).toBe('medshield-observed-product-sales.csv')
})
