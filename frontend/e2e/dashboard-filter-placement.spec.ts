import { test, expect } from '@playwright/test'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import * as markup from '../services/api/dashboard-markup'
import { installDashboardFilterPanel } from '../services/api/dashboard-filter-panel'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

test.beforeEach(async ({ page }) => {
  await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
  await page.addStyleTag({ path: path.resolve('app/overrides.css') })
  const source = await readFile(path.resolve('services/api/dashboard-enhancements.ts'), 'utf8')
  const script = ts.transpileModule(source.replace(/import[\s\S]*?from ['"][^'"]+['"]\s*/g, '').replace(/export /g, ''), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
  }).outputText
  await page.evaluate(({ script, markup, installer }) => {
    const install = new Function(`return (${installer})`)()
    const enhance = new Function('SALES_DATA_NAV_ITEM', 'WEATHER_VALIDATION_NAV_ITEM', 'SALES_DATA_PAGE', 'WEATHER_VALIDATION_PAGE', 'installDashboardFilterPanel', `${script}; return enhanceDashboardContent`)(
      markup.SALES_DATA_NAV_ITEM, markup.WEATHER_VALIDATION_NAV_ITEM, markup.SALES_DATA_PAGE, markup.WEATHER_VALIDATION_PAGE, install,
    )
    enhance(document.body)
    window.fetch = async () => new Response('{}', { status: 503 })
  }, { script, markup, installer: installDashboardFilterPanel.toString() })
  await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
  await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())
})

test('filters belong above dashboard content and retain period and navigation behavior', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('503')) errors.push(message.text()) })
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({ monthly: [{ period: '2025-01', revenue: 100, income: 20 }, { period: '2025-02', revenue: 200, income: 40 }], year_summary: [] })
    app.buildCharts()
    app.buildCharts()
  })
  await expect(page.locator('.topbar select')).toHaveCount(0)
  await expect(page.locator('.content > #filterBar')).toBeVisible()
  const welcome = await page.locator('#overviewWelcomeHeading').boundingBox()
  const filters = await page.locator('#filterBar').boundingBox()
  expect(welcome!.y + welcome!.height).toBeLessThan(filters!.y)
  await expect(page.getByRole('region', { name: 'Analysis filters' })).toBeVisible()
  await page.getByLabel('Historical period', { exact: true }).selectOption('custom')
  await expect(page.locator('#customDateStart')).toBeVisible()
  await page.locator('#customDateStart').fill('2025-01-01')
  await page.locator('#customDateEnd').fill('2025-06-30')
  await page.getByLabel('Chart granularity', { exact: true }).selectOption('monthly')
  await page.getByLabel('Comparison', { exact: true }).selectOption('yoy')
  await page.evaluate(() => (window as any).showPage('products'))
  await expect(page.locator('#filterBar')).toBeVisible()
  await expect(page.locator('#descriptivePeriodSelect')).toHaveValue('custom')
  await page.evaluate(() => (window as any).showPage('forecast'))
  await expect(page.locator('#filterBar')).toBeHidden()
  await page.evaluate(() => (window as any).showPage('revenue'))
  await expect(page.locator('#filterBar')).toBeVisible()
  await page.waitForTimeout(250)
  expect(errors).toEqual([])
  await page.screenshot({ path: 'test-results-filter-placement/desktop.png' })
})

test('overview calendar and scatter retain observed values, negative sales and missing profit', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('503')) errors.push(message.text()) })
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({ monthly: [
      { period: '2025-01', revenue: 100, income: 20 },
      { period: '2025-02', revenue: 0, income: 0 },
      { period: '2025-03', revenue: -20, income: -5 },
      { period: '2025-04', revenue: 50, income: null },
    ], year_summary: [] })
    app.setDescriptiveGranularity('monthly')
    app.buildCharts()
    app.buildCharts()
  })
  await expect(page.locator('#overviewSalesCalendar button[aria-label="2025-01: ₱100 observed net sales"]')).toBeVisible()
  await expect(page.locator('#descriptivePeriodSelect')).toHaveValue('all')
  await expect(page.locator('#overviewCalendarMethod')).toContainText('All Time')
  await expect(page.locator('#overviewCalendarNote')).toContainText('Highest observed month: 2025-01 · ₱100')
  await expect(page.locator('#overviewSalesCalendar button[aria-label="2025-02: ₱0 observed net sales"]')).toBeVisible()
  await page.locator('#overviewSalesCalendar button[aria-label^="2025-03:"]').click()
  await expect(page.locator('#overviewCalendarValue')).toContainText('-₱20')
  await expect(page.locator('#overviewSalesCalendar button[aria-label="2025-05: No observation in selected scope"]')).toBeVisible()
  const points = await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('overviewProfitScatter')).data.datasets[0].data)
  expect(points.map((row: any) => [row.x, row.y])).toEqual([[100, 20], [0, 0], [-20, -5]])
  await expect(page.locator('#overviewProfitScatter')).toBeHidden()
  await page.locator('#overviewProfitExplore > summary').click()
  await expect(page.locator('#overviewProfitScatter')).toBeVisible()
  const scatterSize = await page.locator('#overviewProfitScatter').boundingBox()
  expect(scatterSize!.height).toBeLessThanOrEqual(320)
  expect(errors).toEqual([])
  await page.locator('#overviewAnalyticalViews').screenshot({ path: 'test-results-filter-placement/overview-analytics.png' })
})

test('filter card fits a narrow screen including custom dates', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.getByLabel('Historical period', { exact: true }).selectOption('custom')
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({ monthly: [{ period: '2025-01', revenue: 100, income: 20 }], year_summary: [] })
    app.setCustomDateRange('2025-01-01', '2025-03-31')
  })
  for (const id of ['analysisScopeSelect', 'descriptivePeriodSelect', 'descriptiveComparisonSelect', 'chartGranularitySelect', 'customDateStart', 'customDateEnd']) {
    const box = await page.locator(`#${id}`).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(375)
  }
  await page.locator('#dashboardFilterTitle').click()
  await page.locator('#overviewProfitExplore > summary').click()
  await expect(page.locator('#overviewProfitScatter')).toBeVisible()
  const chartSize = await page.locator('#overviewProfitScatter').boundingBox()
  expect(chartSize!.width).toBeLessThanOrEqual(375)
  expect(chartSize!.height).toBeLessThanOrEqual(260)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  await page.screenshot({ path: 'test-results-filter-placement/mobile.png' })
})
