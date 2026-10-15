import { test, expect } from '@playwright/test'
import path from 'node:path'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { correctOverviewEvidence } from '../services/api/dashboard-enhancements'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

test.beforeEach(async ({ page }) => {
  await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style><div class="medshield-root">${MEDSHIELD_MARKUP}</div>`)
  const root = await page.$('.medshield-root')
  await page.evaluate(correctOverviewEvidence, root!)
  await page.evaluate(() => { window.fetch = async () => new Response('{}', { status: 503 }) })
  await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
  await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())
})

async function expectTruthfulOverview(page: import('@playwright/test').Page) {
  const overview = page.locator('#page-overview')
  await expect(overview).toBeVisible()
  await expect(overview.locator('.kpi-card-forecast')).toContainText('Not published')
  await expect(overview).toContainText('business approval pending')
  await expect(overview).toContainText('reviewed scenarios only')
  await expect(overview).not.toContainText(/REAL-TIME DSS GAUGE|₱9\.3M|12\.4%|Prophet ML|Dengue Alert Level 3|CRITICAL: Stock-out threat|fallback local data mode/)
  await expect(page.locator('#overviewThreatScore, #overviewThreatNeedle, #dohSignalBar')).toHaveCount(0)
}

test('overview and help show publication limits without fabricated alerts or forecasts', async ({ page }) => {
  await expectTruthfulOverview(page)
  await expect(page.locator('#overviewBaselineChart')).toBeVisible()
  const help = page.locator('#helpGuidanceModal .custom-modal-body')
  await expect(help).toContainText('sales-only baseline validation')
  await expect(help).not.toContainText(/Prophet|12\.4%|weather-disease cross-correlations|All models feature live tuning/)
})

test('overview leads with compact metrics and resizes supporting charts on expansion', async ({ page }, testInfo) => {
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({ monthly: Array.from({ length: 24 }, (_, index) => ({
      period: (2024 + Math.floor(index / 12)) + '-' + String(index % 12 + 1).padStart(2, '0'),
      revenue: 100 + index * 10, income: 20 + index * 2,
    })), year_summary: [] })
    app.showPage('overview'); app.setDescriptivePeriod('all')
  })
  await expect(page.locator('#page-overview .overview-decision-kpis .kpi-label')).toHaveText(['Net sales', 'Gross profit', 'Change vs last year', 'Months with records'])
  await expect(page.locator('#overviewPeriodCaption')).toContainText('All Time')
  await expect(page.locator('#overviewMonthAverageChart')).not.toBeVisible()
  await expect(page.locator('#overviewCoverageChart')).not.toBeVisible()
  await expect(page.locator('#overviewSalesCalendar')).toBeVisible()
  await page.locator('#overviewPatternDetails > summary').click()
  await expect(page.locator('#overviewMonthAverageChart')).toBeVisible()
  await expect.poll(() => page.evaluate(() => (window as any).Chart.getChart(document.getElementById('overviewMonthAverageChart')).chartArea.width)).toBeGreaterThan(100)
  await page.screenshot({ path: testInfo.outputPath('overview-patterns.png'), fullPage: true })
  await page.locator('#overviewPatternDetails > summary').click()
  await page.screenshot({ path: testInfo.outputPath('overview-desktop.png'), fullPage: true })
})

test('overview measure selection preserves values and explains only recorded endpoints', async ({ page }) => {
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({ monthly: [
      { period: '2025-01', revenue: 1000, income: 20 },
      { period: '2025-02', revenue: 2000, income: 10 },
      { period: '2025-03', revenue: null, income: null, missing: true },
    ], year_summary: [] })
    app.setDescriptivePeriod('custom'); app.setDescriptiveGranularity('monthly')
    app.setCustomDateRange('2025-01-01', '2025-03-31')
  })
  const state = () => page.evaluate(() => {
    const chart = (window as any).Chart.getChart(document.getElementById('overviewBaselineChart'))
    return { values: chart.data.datasets.map((d: any) => d.data), visible: chart.data.datasets.map((_: unknown, i: number) => chart.isDatasetVisible(i)), max: chart.scales.y.max }
  })
  const sales = await state()
  expect(sales.visible).toEqual([true, false])
  await expect(page.locator('#overviewTrendReading')).toContainText('recorded sales rose by ₱1,000')
  await page.selectOption('#overviewTrendMeasureSelect', 'profit')
  const profit = await state()
  expect(profit.visible).toEqual([false, true])
  expect(profit.values).toEqual(sales.values)
  expect(profit.max).toBeLessThan(100)
  await expect(page.locator('#overviewTrendReading')).toContainText('recorded gross profit fell by ₱10')
  await expect(page.locator('#overviewTrendReadCue')).toContainText('gaps stay blank')
  await expect(page.locator('#overviewObservationCoverageNote')).toContainText('2 of 3 selected months have records')
  await page.selectOption('#overviewTrendMeasureSelect', 'both')
  expect((await state()).visible).toEqual([true, true])
  await expect(page.locator('#kpiOverviewTotalRevenue')).toHaveText('₱3,000')
  await page.evaluate(() => { const app = window as any; app.setCustomDateRange('2025-01-01', '2025-01-15'); app.setDescriptiveGranularity('auto') })
  await expect(page.locator('#overviewTrendMeasureSelect')).toBeDisabled()
  await expect(page.locator('#overviewTrendMeasureSelect')).toHaveValue('sales')
})

test('period changes and navigation cannot recreate synthetic threat values', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  for (const period of ['3', '6', 'all', 'custom']) {
    await page.selectOption('#descriptivePeriodSelect', period)
    await expectTruthfulOverview(page)
  }
  await page.evaluate(() => {
    const app = window as any
    app.showPage('revenue')
    app.showPage('overview')
  })
  await expectTruthfulOverview(page)
  expect(errors).toEqual([])
})

test('Y/Y overview legend cannot reveal sales on a profit-only scale', async ({ page }) => {
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({ monthly: [
      { period: '2024-01', revenue: 10000, income: 200 },
      { period: '2025-01', revenue: 1000, income: 20 },
    ], year_summary: [] })
    app.setDescriptivePeriod('custom'); app.setDescriptiveGranularity('monthly')
    app.setCustomDateRange('2025-01-01', '2025-01-31'); app.setDescriptiveComparisonMode('yoy')
  })
  await page.selectOption('#overviewTrendMeasureSelect', 'profit')
  const state = () => page.evaluate(() => {
    const chart = (window as any).Chart.getChart(document.getElementById('overviewBaselineChart'))
    return { visible: chart.data.datasets.map((_: unknown, index: number) => chart.isDatasetVisible(index)),
      legend: chart.legend.legendItems.map((item: any) => item.text), max: chart.scales.y.max }
  })
  const before = await state()
  expect(before.visible).toEqual([false, false, true, true])
  expect(before.legend).toEqual(['Gross Profit', 'Prior-year Gross Profit'])
  expect(before.max).toBeGreaterThanOrEqual(200)
  expect(before.max).toBeLessThan(1000)
  const hit = await page.locator('#overviewBaselineChart').evaluate(canvas => {
    const chart = (window as any).Chart.getChart(canvas), box = chart.legend.legendHitBoxes[0]
    const bounds = canvas.getBoundingClientRect()
    return { x: bounds.x + box.left + box.width / 2, y: bounds.y + box.top + box.height / 2 }
  })
  await page.mouse.click(hit.x, hit.y)
  expect(await state()).toEqual(before)
  await expect(page.locator('#overviewTrendMeasureSelect')).toHaveValue('profit')
})

test('a mixed period separates observed KPI revenue and dashed gap estimates', async ({ page }) => {
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({ monthly: [
      { period: '2024-01', revenue: 100, income: 20 },
      { period: '2024-02', revenue: 200, income: 40 },
      { period: '2025-01', revenue: 300, income: 60 },
      { period: '2025-02', revenue: null, income: null, missing: true, has_sales_activity: false },
    ], year_summary: [] })
    app.setDescriptivePeriod('custom')
    app.setDescriptiveGranularity('monthly')
    app.setCustomDateRange('2025-01-01', '2025-02-28')
  })
  await expect(page.locator('#kpiOverviewTotalRevenue')).toHaveText('₱300')
  await expect(page.locator('#overviewRevenueEvidence')).toContainText('Gap estimate: ₱200')
  await expect(page.locator('#overviewRevenueEvidence')).toContainText('Combined: ₱500')
  const chart = await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('overviewBaselineChart')).data.datasets.map((d: any) => ({ label: d.label, data: d.data, dash: d.borderDash })))
  expect(chart[0].label).toContain('Net Sales Revenue')
  expect(chart[0].data).toEqual([300, 200])
  expect(chart[1].label).toContain('Gross Profit')
  expect(chart[1].data).toEqual([60, 40])
  await expect(page.locator('#overviewBaselineChart').locator('xpath=ancestor::*[contains(@class,"chart-card")][1]')).toContainText('source coverage 2024-01–2025-01')
  await page.evaluate(() => (window as any).setCustomDateRange('2025-01-01', '2025-01-31'))
  await expect(page.locator('#overviewRevenueEvidence')).toContainText('no gap estimates included')
  await page.evaluate(() => (window as any).setCustomDateRange('2025-02-01', '2025-02-28'))
  await expect(page.locator('#kpiOverviewTotalRevenue')).toHaveText('No observations')
  await expect(page.locator('#overviewRevenueEvidence')).toContainText('Gap estimate: ₱200')
})

test('real zero remains observed and missing income does not erase revenue or become zero profit', async ({ page }) => {
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({ monthly: [
      { period: '2025-01', revenue: 0, income: 0, margin_revenue_basis: 0 },
      { period: '2025-02', revenue: 300, income: null, margin_revenue_basis: null },
      { period: '2025-03', revenue: null, income: null, missing: true },
    ], year_summary: [] })
    app.setDescriptivePeriod('custom')
    app.setDescriptiveGranularity('monthly')
    app.setCustomDateRange('2025-01-01', '2025-03-31')
  })
  await expect(page.locator('#kpiOverviewTotalRevenue')).toHaveText('₱300')
  const series = await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('overviewBaselineChart')).data.datasets.map((d: any) => d.data))
  expect(series[0]).toEqual([0, 300, null])
  expect(series[1]).toEqual([0, null, null])
  await page.evaluate(() => (window as any).showPage('revenue'))
  await expect(page.locator('#salesGrossProfit')).toHaveText('Unavailable')
  await expect(page.locator('#salesGrossMargin')).toHaveText('Unavailable')
  await page.waitForFunction(() => Boolean((window as any).Chart.getChart(document.getElementById('growthChart'))))
  const growth = await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('growthChart')).data.datasets[0].data)
  expect(growth).toEqual([null, null, null])
})

test('a partial historical date range does not consume full boundary-month totals', async ({ page }) => {
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({ monthly: [
      { period: '2025-01', revenue: 1000, income: 100 },
      { period: '2025-02', revenue: 2000, income: 200 },
      { period: '2025-03', revenue: 3000, income: 300 },
    ] })
    app.setDescriptivePeriod('custom'); app.setDescriptiveGranularity('monthly')
    app.setCustomDateRange('2025-01-15', '2025-03-15')
  })
  await expect(page.locator('#kpiOverviewTotalRevenue')).toHaveText('₱2,000')
  const values = await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('overviewBaselineChart')).data.datasets[0].data)
  expect(values).toEqual([null, 2000, null])
})

test('overview decision cards reconcile observed profit, matched growth and missing month coverage', async ({page}) => {
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({monthly:[
      {period:'2024-01',revenue:100,income:20},{period:'2024-02',revenue:200,income:40},
      {period:'2025-01',revenue:300,income:60},{period:'2025-02',revenue:0,income:0},
      {period:'2025-03',revenue:null,income:null,missing:true},
    ],year_summary:[]})
    app.setDescriptivePeriod('custom');app.setDescriptiveGranularity('monthly')
    app.setCustomDateRange('2025-01-01','2025-03-31')
  })
  await expect(page.locator('#kpiOverviewTotalRevenue')).toHaveText('₱300')
  await expect(page.locator('#kpiOverviewGrossProfit')).toHaveText('₱60')
  await expect(page.locator('#kpiOverviewMatchedGrowth')).toHaveText('0.0%')
  await expect(page.locator('#overviewMatchedGrowthNote')).toContainText('2/2 observed month pairs matched')
  await expect(page.locator('#kpiOverviewObservationCoverage')).toHaveText('2/3')
  await expect(page.locator('#overviewDecisionReview')).toContainText('1 month without records')
  await expect(page.locator('#overviewPublicationStrip')).toContainText('business approval pending')
  await expect(page.locator('#page-overview .kpi-grid > .kpi-card')).toHaveCount(4)
  await page.evaluate(() => (window as any).setDescriptivePeriod('all'))
  await expect(page.locator('#kpiOverviewMatchedGrowth')).toHaveText('—')
  await expect(page.locator('#overviewMatchedGrowthNote')).toContainText('bounded period')
})

test('overview withholds incomplete profit and growth with a nonpositive prior total', async ({page}) => {
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({monthly:[
      {period:'2024-01',revenue:-100,income:20},
      {period:'2025-01',revenue:200,income:null},
    ],year_summary:[]})
    app.setDescriptivePeriod('custom');app.setDescriptiveGranularity('monthly')
    app.setCustomDateRange('2025-01-01','2025-01-31')
  })
  await expect(page.locator('#kpiOverviewGrossProfit')).toHaveText('Unavailable')
  await expect(page.locator('#kpiOverviewMatchedGrowth')).toHaveText('Unavailable')
  await expect(page.locator('#overviewMatchedGrowthNote')).toContainText('positive prior sales')
})

test('overview matched growth excludes an open month instead of comparing a partial snapshot to a full month', async ({page}) => {
  await page.clock.install({time:new Date('2026-10-03T04:00:00Z')})
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({monthly:[
      {period:'2025-09',revenue:100,income:20},{period:'2025-10',revenue:100,income:20},
      {period:'2026-09',revenue:200,income:40},{period:'2026-10',revenue:1000,income:200},
    ],year_summary:[]})
    app.setDescriptivePeriod('custom');app.setDescriptiveGranularity('monthly')
    app.setCustomDateRange('2026-09-01','2026-10-31')
  })
  await expect(page.locator('#kpiOverviewMatchedGrowth')).toHaveText('+100.0%')
  await expect(page.locator('#overviewMatchedGrowthNote')).toContainText('1/1 observed month pairs matched')
  await expect(page.locator('#overviewMatchedGrowthNote')).toContainText('Open current month')
})

test('sales sections retain the shared period, support keyboard navigation and resize reopened charts', async ({page}) => {
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({monthly:[{period:'2024-01',revenue:100,income:20},{period:'2025-01',revenue:300,income:60}]})
    app.showPage('revenue');app.setDescriptivePeriod('custom');app.setDescriptiveGranularity('monthly')
    app.setCustomDateRange('2025-01-01','2025-01-31')
  })
  await expect(page.getByRole('tabpanel',{name:'Sales Trend',exact:true})).toBeVisible()
  const growth = page.getByRole('tab',{name:'Growth',exact:true})
  await growth.click()
  await expect(page.getByRole('tabpanel',{name:'Growth',exact:true})).toBeVisible()
  await page.evaluate(() => (window as any).setCustomDateRange('2024-01-01','2025-01-31'))
  await expect(growth).toHaveAttribute('aria-selected','true')
  await expect(page.locator('#salesOutputScope')).toContainText('Jan 1, 2024')
  await growth.focus();await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab',{name:'Quantities',exact:true})).toBeFocused()
  await page.keyboard.press('Home')
  await expect(page.getByRole('tab',{name:'Sales Trend',exact:true})).toBeFocused()
  await expect.poll(() => page.evaluate(() => (window as any).Chart.getChart(document.getElementById('revenueDetailChart')).chartArea.width)).toBeGreaterThan(100)
  await expect(page.locator('#salesOutputSections')).toHaveCount(1)
})
