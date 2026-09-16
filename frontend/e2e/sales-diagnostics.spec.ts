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
    return { labels: chart.data.labels, datasets: chart.data.datasets.map((d: any) => ({ label: d.label, data: d.data, axis: d.yAxisID, borderColor: d.borderColor })),
      animationDuration: chart.options.animation?.duration ?? 0,
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

test('2017–2025 history keeps years distinct, gaps empty and overview profile scoped', async ({ page }) => {
  const data = fixture(Array.from({ length: 9 }, (_, i) => 2017 + i))
  data.monthly.reverse()
  data.monthly = data.monthly.filter(r => r.period !== '2024-02')
  data.monthly.push({ period: '2026-01', revenue: 999999999, income: 1 })
  data.year_summary.push({ year: '2026', revenue: 999999999, income: 1, transactions: 1 })
  await page.evaluate(data => {
    const w = window as any; w.applyDatasetPatch(data); w.setComparisonMode('single'); w.setYear('2024'); w.showPage('revenue')
  }, data)
  const monthly = await chartData(page, 'revenueDetailChart')
  expect(monthly.labels).toHaveLength(12)
  expect(monthly.datasets[0].data).toEqual([8000000, null, ...Array(10).fill(8000000)])
  expect(monthly.datasets[2].label).toBe('Predicted Net Sales Revenue')
  expect(monthly.datasets[2].borderColor).toBe('rgba(124,58,237,0.9)')
  expect(monthly.datasets[2].data).toEqual([null, 8000000, ...Array(10).fill(null)])
  expect(monthly.datasets[3].label).toBe('Predicted Gross Profit')
  expect(monthly.datasets[3].borderColor).toBe('rgba(219,39,119,0.9)')
  expect(monthly.animationDuration).toBe(850)
  await expect(page.locator('#salesComparisonSubtitle')).toContainText('Dashed triangles are predicted')
  await expect(page.locator('#page-overview .kpi-grid')).toContainText('1 unavailable months shown as predictions; excluded from totals')
  await expect(page.locator('#page-overview .kpi-card-ai')).toHaveCount(4)
  expect(await page.locator('#page-overview .kpi-card-ai .kpi-tag').evaluateAll(nodes =>
    nodes.every(node => getComputedStyle(node).display === 'none'))).toBe(true)
  expect(await page.locator('#topbarYearSelect').inputValue()).toBe('2024')
  await page.evaluate(() => (window as any).showPage('overview'))
  await expect(page.locator('#kpiOverviewTotalRevenue')).toContainText('96,000,000')
  await expect(page.locator('#page-overview .kpi-grid')).not.toContainText('May & Nov')
  await expect(page.locator('#page-overview .kpi-grid')).not.toContainText('9.3M')
  await page.evaluate(() => { const w = window as any; w.setYear('all'); w.showPage('revenue') })
  const history = await chartData(page, 'revenueDetailChart')
  expect(history.labels).toHaveLength(108)
  expect(history.labels[0]).toBe('2017-01')
  expect(history.labels[107]).toBe('2025-12')
  expect(history.datasets[0].data[0]).toBe(1000000)
  expect(history.datasets[0].data[96]).toBe(9000000)
  expect(await page.locator('#topbarYearSelect option').allTextContents()).not.toContain('2026')
  await page.screenshot({ path: 'test-results/year-audit-history.png', fullPage: true })
})

test('initial dropdown and plotted year scope agree; aggregate product charts disclose their scope', async ({ page }) => {
  expect(await page.locator('#topbarYearSelect').inputValue()).toBe('all')
  await page.evaluate(() => (window as any).showPage('products'))
  await expect(page.locator('#filterBar')).not.toBeVisible()
  await expect(page.locator('#productBarChart').locator('..').locator('..')).toContainText('year filter does not apply')
})

test('bundled source outliers are excluded and every historical chart point reconciles', async ({ page }) => {
  const data=JSON.parse(await readFile(path.resolve('public/data/sales_data.json'),'utf8'))
  expect(data.monthly.some((r:any)=>r.period==='2047-11')).toBe(true)
  await page.evaluate(data=>{const w=window as any;w.applyDatasetPatch(data);w.setComparisonMode('single');w.setYear('all');w.showPage('revenue')},data)
  const actual=await chartData(page,'revenueDetailChart')
  expect(actual.labels).toHaveLength(108)
  for(let i=0;i<actual.labels.length;i++) {
    const rows=data.monthly.filter((r:any)=>r.period===actual.labels[i])
    const expected=rows.length?rows.reduce((n:number,r:any)=>n+r.revenue,0):null
    if(expected===null)expect(actual.datasets[0].data[i]).toBeNull()
    else expect(actual.datasets[0].data[i]).toBeCloseTo(expected,2)
  }
  await page.screenshot({path:'test-results/year-audit-real-source.png',fullPage:true})
  await page.setViewportSize({width:390,height:844})
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:'test-results/year-audit-real-source-mobile.png',fullPage:true})
})

test('processed snapshot plots net sales revenue for 2017–2019', async ({ page }) => {
  const data = JSON.parse(await readFile(
    path.resolve('../data/medshield/processed/dashboard_sales_snapshot.json'),
    'utf8',
  ))
  await page.evaluate(data => {
    const app = window as any
    app.applyDatasetPatch(data)
    app.setComparisonMode('single')
    app.setYear('all')
    app.showPage('overview')
  }, data)

  const overview = await chartData(page, 'overviewBaselineChart')
  expect(overview.labels.slice(0, 3)).toEqual(['2017', '2018', '2019'])
  const expected = data.year_summary.slice(0, 3).map((row: any) => row.revenue)
  expect(expected.every((value: number) => value > 0)).toBe(true)
  expect(overview.datasets[0].data.slice(0, 3)).toEqual(expected)
  await page.screenshot({ path: 'test-results/historical-net-sales-revenue.png', fullPage: true })
})

test('continuous years, independent scales, peso movement, baseline change and export agree', async ({ page }) => {
  await page.evaluate(data => {
    const app = window as any
    app.applyDatasetPatch(data)
    app.setComparisonMode('yoy')
    app.setYoYYear('2023', 'base')
    app.setYoYYear('2025', 'target')
  }, fixture([2023, 2024, 2025]))
  const revenue = await chartData(page, 'revenueDetailChart')
  expect(revenue.labels).toHaveLength(36)
  expect(revenue.labels[12]).toBe('2024-01')
  expect(revenue.datasets[0].data[12]).toBe(2_000_000)
  expect(revenue.datasets[0].axis).toBe('revenue')
  expect(revenue.datasets[1].axis).toBe('grossProfit')
  expect(revenue.axes.revenue.position).toBe('left')
  expect(revenue.axes.grossProfit.position).toBe('right')
  expect(revenue.axes.grossProfit.step).toBeLessThan(revenue.axes.revenue.step)
  const growth = await chartData(page, 'growthChart')
  expect(growth.labels).toEqual(['2023', '2024', '2025'])
  expect(growth.datasets[0].data).toEqual([null, 100, 50])
  expect(growth.datasets[1].data).toEqual([null, 12_000_000, 12_000_000])
  await expect(page.locator('#salesGrowthSummary')).toContainText('200.0%')
  await expect(page.locator('#salesGrowthSummary')).toContainText('24,000,000')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Growth CSV' }).click()
  const download = await downloadPromise
  const csv = await readFile((await download.path())!, 'utf8')
  expect(csv).toContain('2024')
  expect(csv).toContain('100.0%')
  expect(csv).toContain('12,000,000')
  await page.locator('[data-metric-definitions] summary').click()
  await page.screenshot({ path: 'test-results/section-2-sales-diagnostics.png', fullPage: true })
})

test('missing intervening year stays a gap and is never relabeled as YoY growth', async ({ page }) => {
  await page.evaluate(data => {
    const app = window as any
    app.setComparisonMode('single'); app.setYear('all'); app.applyDatasetPatch(data)
  }, fixture([2023, 2025]))
  const revenue = await chartData(page, 'revenueDetailChart')
  expect(revenue.labels).toHaveLength(36)
  expect(revenue.datasets[0].data.slice(12, 24)).toEqual(Array(12).fill(null))
  const growth = await chartData(page, 'growthChart')
  expect(growth.labels).toEqual(['2023', '2024', '2025'])
  expect(growth.datasets[0].data).toEqual([null, null, null])
  const margin = await chartData(page, 'marginChart')
  expect(margin.labels).toEqual(['2023', '2024', '2025'])
  expect(margin.datasets[0].data[1]).toBeNull()
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
  expect(growth.labels).toEqual(['2025'])
  expect(growth.datasets[0].data).toEqual([100])
  expect(growth.datasets[1].data).toEqual([2_000_000])
  await expect(page.locator('#salesGrowthSummary')).toContainText('Jan, Mar (2/12 matched months)')
  await page.evaluate(() => (window as any).applyDatasetPatch({ monthly: [
    { period: '2024-01', revenue: 0, income: 0 },
    { period: '2025-01', revenue: 500, income: -20 },
  ] }))
  growth = await chartData(page, 'growthChart')
  expect(growth.datasets[0].data).toEqual([null])
  expect(growth.datasets[1].data).toEqual([500])
  expect((await chartData(page, 'revenueDetailChart')).datasets[1].data[0]).toBe(-20)
  await expect(page.locator('#salesGrowthSummary')).toContainText('Unavailable')
})
