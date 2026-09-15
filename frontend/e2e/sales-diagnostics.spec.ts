import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

function fixture(years: number[]) {
  const monthly = years.flatMap((year, index) => Array.from({ length: 12 }, (_, i) => ({
    period: `${year}-${String(i + 1).padStart(2, '0')}`,
    revenue: (index + 1) * 1_000_000,
    income: (index + 1) * 20_000 + i * 1000,
  })))
  return {
    monthly,
    year_summary: years.map(year => ({ year: String(year),
      revenue: monthly.filter(row => row.period.startsWith(String(year))).reduce((sum, row) => sum + row.revenue, 0),
      income: monthly.filter(row => row.period.startsWith(String(year))).reduce((sum, row) => sum + row.income, 0), transactions: 12 })),
  }
}

async function chartData(page: Page, id: string) {
  return page.evaluate(id => {
    const chart = (window as any).Chart.getChart(document.getElementById(id))
    return { labels: chart.data.labels, datasets: chart.data.datasets.map((d: any) => ({ label: d.label, data: d.data, axis: d.yAxisID })),
      axes: Object.fromEntries(Object.entries(chart.options.scales).map(([key, value]: [string, any]) => [key, { position: value.position, step: value.ticks.stepSize }])) }
  }, id)
}

test.beforeEach(async ({ page }) => {
  await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
  await page.evaluate(() => { window.fetch = async () => new Response('{}', { status: 503 }) })
  await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
  await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())
  await page.waitForFunction(() => typeof (window as any).applyDatasetPatch === 'function')
  await page.evaluate(() => (window as any).showPage('revenue'))
})

test('Y/Y mode aligns selected years by month and export agrees', async ({ page }) => {
  await page.evaluate(data => {
    const app = window as any
    app.applyDatasetPatch(data)
    app.setComparisonMode('yoy')
    app.setYoYYear('2023', 'base')
    app.setYoYYear('2025', 'target')
  }, fixture([2023, 2024, 2025]))
  const revenue = await chartData(page, 'revenueDetailChart')
  expect(revenue.labels).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])
  expect(revenue.datasets[0].data).toEqual(Array(12).fill(3_000_000))
  expect(revenue.datasets[1].data).toEqual(Array(12).fill(1_000_000))
  expect(revenue.datasets[0].axis).toBe('revenue')
  expect(revenue.datasets[1].axis).toBe('revenue')
  expect(revenue.axes.revenue.position).toBe('left')
  const growth = await chartData(page, 'growthChart')
  expect(growth.labels).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])
  expect(growth.datasets[0].data).toEqual(Array(12).fill(200))
  expect(growth.datasets[1].data).toEqual(Array(12).fill(2_000_000))
  await expect(page.locator('#salesGrowthSummary')).toContainText('200.0%')
  await expect(page.locator('#salesGrowthSummary')).toContainText('24,000,000')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Growth CSV' }).click()
  const download = await downloadPromise
  const csv = await readFile((await download.path())!, 'utf8')
  expect(csv).toContain('Jan')
  expect(csv).toContain('200.0%')
  expect(csv).toContain('2,000,000')
  await page.locator('[data-metric-definitions] summary').click()
  await page.screenshot({ path: 'test-results/section-2-sales-diagnostics.png', fullPage: true })
})

test('all years stays annual, bounded to the reporting window, and does not invent intervening years', async ({ page }) => {
  await page.evaluate(data => {
    const app = window as any
    app.setComparisonMode('single'); app.setYear('all'); app.applyDatasetPatch(data)
  }, fixture([2023, 2025]))
  const revenue = await chartData(page, 'revenueDetailChart')
  expect(revenue.labels[0]).toBe('2023')
  expect(revenue.labels[1]).toBe('2025')
  expect(revenue.labels).not.toContain('2024')
  expect(revenue.labels.every((label: unknown) => Number.parseInt(String(label), 10) >= 2017)).toBe(true)
  const growth = await chartData(page, 'growthChart')
  expect(growth.labels).not.toContain('2024')
  expect(growth.datasets[0].data.slice(0, 2)).toEqual([null, null])
  const margin = await chartData(page, 'marginChart')
  expect(margin.labels).not.toContain('2024')
  await expect(page.locator('#salesGrowthSummary')).toContainText('100.0%')
})

test('single year uses matched months from prior calendar year; zero baseline keeps nominal change only', async ({ page }) => {
  const data = fixture([2024, 2025])
  data.monthly = data.monthly.filter(row => row.period.startsWith('2024') || row.period.endsWith('-01') || row.period.endsWith('-03'))
  await page.evaluate(data => {
    const app = window as any
    app.applyDatasetPatch(data); app.setComparisonMode('single'); app.setYear('2025')
  }, data)
  let growth = await chartData(page, 'growthChart')
  expect(growth.labels).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])
  expect(growth.datasets[0].data).toEqual([100, null, 100, null, null, null, null, null, null, null, null, null])
  expect(growth.datasets[1].data).toEqual([1_000_000, null, 1_000_000, null, null, null, null, null, null, null, null, null])
  await expect(page.locator('#salesGrowthSummary')).toContainText('Jan, Mar (2/12 matched months)')
  await page.evaluate(() => (window as any).applyDatasetPatch({ monthly: [
    { period: '2024-01', revenue: 0, income: 0 },
    { period: '2025-01', revenue: 500, income: -20 },
  ] }))
  growth = await chartData(page, 'growthChart')
  expect(growth.datasets[0].data).toEqual([null, null, null, null, null, null, null, null, null, null, null, null])
  expect(growth.datasets[1].data).toEqual([500, null, null, null, null, null, null, null, null, null, null, null])
  expect((await chartData(page, 'revenueDetailChart')).datasets[1].data[0]).toBe(-20)
  await expect(page.locator('#salesGrowthSummary')).toContainText('Unavailable')
})

test('current year stops at the current month and uploaded actuals override estimates', async ({ page }) => {
  const calendar = await page.evaluate(() => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' })
      .formatToParts(new Date())
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
    return { year: Number(values.year), month: Number(values.month) }
  })
  const priorYear = calendar.year - 1
  const data = fixture([priorYear])
  data.monthly.push({ period: `${calendar.year}-01`, revenue: 9_000_000, income: 900_000 })

  await page.evaluate(({ data, currentYear }) => {
    const app = window as any
    app.applyDatasetPatch(data)
    app.setComparisonMode('single')
    app.setYear(String(currentYear))
  }, { data, currentYear: calendar.year })

  const monthly = await chartData(page, 'revenueDetailChart')
  expect(monthly.labels).toHaveLength(calendar.month)
  expect(monthly.datasets[0].data[0]).toBe(9_000_000)
  expect(monthly.datasets[0].data.slice(1)).toEqual(Array(Math.max(0, calendar.month - 1)).fill(1_000_000))

  await page.evaluate(() => (window as any).setYear('all'))
  const annual = await chartData(page, 'revenueDetailChart')
  const currentIndex = annual.labels.findIndex((label: unknown) => String(label).startsWith(String(calendar.year)))
  expect(currentIndex).toBeGreaterThanOrEqual(0)
  expect(annual.datasets[0].data[currentIndex]).toBe(9_000_000 + Math.max(0, calendar.month - 1) * 1_000_000)
})
