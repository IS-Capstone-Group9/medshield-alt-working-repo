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

test.skip('legacy year-selector history view is superseded by descriptive period windows', async ({ page }) => {
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

test.skip('legacy year dropdown scope is superseded by descriptive period controls', async ({ page }) => {
  expect(await page.locator('#topbarYearSelect').inputValue()).toBe('all')
  await page.evaluate(() => (window as any).showPage('products'))
  await expect(page.locator('#filterBar')).not.toBeVisible()
  await expect(page.locator('#productBarChart').locator('..').locator('..')).toContainText('year filter does not apply')
})

test.skip('legacy all-years chart reconciliation is superseded by descriptive period windows', async ({ page }) => {
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

test.skip('legacy overview year chart is superseded by descriptive period windows', async ({ page }) => {
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
    app.setDescriptivePeriod('custom')
    app.setYear('2025')
  }, fixture([2023, 2024, 2025]))
  const revenue = await chartData(page, 'revenueDetailChart')
  expect(revenue.labels).toEqual(['Jan 25', 'Feb 25', 'Mar 25', 'Apr 25', 'May 25', 'Jun 25', 'Jul 25', 'Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25'])
  expect(revenue.datasets[0].data).toEqual(Array(12).fill(3_000_000))
  expect(revenue.datasets[1].data).toEqual(Array.from({ length: 12 }, (_, i) => 60_000 + i * 1000))
  expect(revenue.datasets[0].axis).toBe('revenue')
  expect(revenue.datasets[1].axis).toBe('grossProfit')
  expect(revenue.axes.revenue.position).toBe('left')
  const growth = await chartData(page, 'growthChart')
  expect(growth.labels).toEqual(['Jan 25', 'Feb 25', 'Mar 25', 'Apr 25', 'May 25', 'Jun 25', 'Jul 25', 'Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25'])
  expect(growth.datasets[0].data).toEqual(Array(12).fill(50))
  expect(growth.datasets[1].data).toEqual(Array(12).fill(1_000_000))
  await expect(page.locator('#salesGrowthSummary')).toContainText('50.0%')
  await expect(page.locator('#salesGrowthSummary')).toContainText('36,000,000')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Growth CSV' }).click()
  const download = await downloadPromise
  const csv = await readFile((await download.path())!, 'utf8')
  expect(csv).toContain('Jan')
  expect(csv).toContain('50.0%')
  expect(csv).toContain('1,000,000')
  await page.locator('[data-metric-definitions] summary').click()
  await page.screenshot({ path: 'test-results/section-2-sales-diagnostics.png', fullPage: true })
})

test('custom full-year range uses weighted same-month estimates when the prior year is missing', async ({ page }) => {
  await page.evaluate(data => {
    const app = window as any
    app.applyDatasetPatch(data); app.setDescriptivePeriod('custom'); app.setYear('2025')
  }, fixture([2023, 2025]))
  const revenue = await chartData(page, 'revenueDetailChart')
  expect(revenue.labels).toHaveLength(12)
  const growth = await chartData(page, 'growthChart')
  expect(growth.datasets[0].data).toEqual(Array(12).fill(100))
  const margin = await chartData(page, 'marginChart')
  expect(margin.labels).toHaveLength(12)
  await expect(page.locator('#salesGrowthSummary')).toContainText('12/12 periods matched')
})

test('custom full-year range uses matched prior months; zero baseline keeps nominal change only', async ({ page }) => {
  const data = fixture([2024, 2025])
  data.monthly = data.monthly.filter(row => row.period.startsWith('2024') || row.period.endsWith('-01') || row.period.endsWith('-03'))
  await page.evaluate(data => {
    const app = window as any
    app.applyDatasetPatch(data); app.setDescriptivePeriod('custom'); app.setYear('2025')
  }, data)
  let growth = await chartData(page, 'growthChart')
  expect(growth.labels).toEqual(['Jan 25', 'Feb 25', 'Mar 25', 'Apr 25', 'May 25', 'Jun 25', 'Jul 25', 'Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25'])
  expect(growth.datasets[0].data).toEqual([100, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  expect(growth.datasets[1].data).toEqual([1_000_000, 0, 1_000_000, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  await expect(page.locator('#salesGrowthSummary')).toContainText('12/12 periods matched')
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

test('custom current-year-to-date range ends today and actuals override estimates', async ({ page }) => {
  const calendar = await page.evaluate(() => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' })
      .formatToParts(new Date())
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
    return { year: Number(values.year), month: Number(values.month) }
  })
  const priorYear = calendar.year - 1
  const data = fixture([priorYear])
  data.monthly.push({ period: `${calendar.year}-${String(calendar.month).padStart(2, '0')}`, revenue: 9_000_000, income: 900_000 })

  await page.evaluate(({ data, currentYear }) => {
    const app = window as any
    app.applyDatasetPatch(data)
    app.setDescriptivePeriod('custom')
    app.setYear(String(currentYear))
  }, { data, currentYear: calendar.year })

  const monthly = await chartData(page, 'revenueDetailChart')
  expect(monthly.labels).toHaveLength(calendar.month)
  expect(monthly.datasets[0].data.slice(0, calendar.month - 1)).toEqual(Array(Math.max(0, calendar.month - 1)).fill(1_000_000))
  expect(monthly.datasets[0].data[calendar.month - 1]).toBe(9_000_000)
  expect(monthly.datasets[0].data).toHaveLength(calendar.month)
})
