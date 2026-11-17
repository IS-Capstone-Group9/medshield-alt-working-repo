import { test, expect } from '@playwright/test'
import { CURRENT_YEAR_SCRIPT } from '../services/api/current-year-runtime'
import path from 'node:path'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

// Exercise the executed browser script with an explicit Manila calendar. These
// fixtures remain isolated from the application and its required Gold source.
test('2026 has no estimated months or annual total without source observations', async ({ page }) => {
  const result = await page.evaluate(script => {
    const data = { monthly: [
      { period: '2023-01', revenue: 100, income: 10 },
      { period: '2024-01', revenue: 200, income: 20 },
      { period: '2025-01', revenue: 300, income: 30 },
    ], year_summary: [{ year: '2025', revenue: 300, income: 30 }] }
    return new Function('DATA', script + `
      dashboardCalendar = () => ({year:2026,month:10});
      return {monthly:dashboardMonthlyRows(),annual:dashboardAnnualRows()};`)(data)
  }, CURRENT_YEAR_SCRIPT)
  expect(result.monthly.map((r: { period: string }) => r.period)).toEqual(['2023-01', '2024-01', '2025-01'])
  expect(result.annual.map((r: { year: string }) => r.year)).toEqual(['2025'])
  expect(result.monthly.every((r: { evidence: string }) => r.evidence === 'actual')).toBe(true)
})

test('partial current-year observations remain exact and missing months stay absent', async ({ page }) => {
  const result = await page.evaluate(script => {
    const data = { monthly: [
      { period: '2025-02', revenue: 900, income: 90 },
      { period: '2026-01', revenue: 120, income: 12 },
      { period: '2026-03', revenue: 0, income: 0 },
      { period: '2026-04', revenue: null, income: null, missing: true },
    ], year_summary: [] }
    return new Function('DATA', script + `
      dashboardCalendar = () => ({year:2026,month:10});
      return {monthly:dashboardMonthlyRows(),annual:dashboardAnnualRows()};`)(data)
  }, CURRENT_YEAR_SCRIPT)
  expect(result.monthly.map((r: { period: string }) => r.period)).toEqual(['2025-02', '2026-01', '2026-03'])
  expect(result.annual).toMatchObject([{ year: '2026', label: '2026 YTD', revenue: 120, income: 12, evidence: 'actual_ytd' }])
})

test('2027 rollover does not turn 2025 history into 2026 or 2027 sales', async ({ page }) => {
  const result = await page.evaluate(script => new Function('DATA', script + `
    dashboardCalendar = () => ({year:2027,month:1});
    return {monthly:dashboardMonthlyRows(),annual:dashboardAnnualRows()};
  `)({ monthly: [{ period: '2025-01', revenue: -50, income: null }], year_summary: [] }), CURRENT_YEAR_SCRIPT)
  expect(result.monthly).toMatchObject([{ period: '2025-01', revenue: -50, income: null }])
  expect(result.annual).toEqual([])
})

test('an observed current-year revenue does not turn unknown profit into zero', async ({ page }) => {
  const result = await page.evaluate(script => new Function('DATA', script + `
    dashboardCalendar = () => ({year:2026,month:10});
    return dashboardAnnualRows();
  `)({ monthly: [{ period: '2026-01', revenue: 120, income: null }], year_summary: [] }), CURRENT_YEAR_SCRIPT)
  expect(result).toMatchObject([{ year: '2026', revenue: 120, income: null, evidence: 'actual_ytd' }])
})

for (const calendarYear of [2026, 2027]) {
  test(`custom 2026 charts cannot regenerate estimates in calendar ${calendarYear}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date(`${calendarYear}-10-17T04:00:00Z`))
    await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
    await page.goto('http://medshield.test/')
    await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
    await page.evaluate(() => { window.fetch = async () => new Response('{}', { status: 503 }) })
    await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
    await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())
    await page.evaluate(() => {
      const app = window as unknown as Record<string, (...args: unknown[]) => void>
      app.applyDatasetPatch({ monthly: [
        { period: '2024-01', revenue: 100, income: 10 },
        { period: '2025-01', revenue: 200, income: 20 },
        { period: '2025-02', revenue: 300, income: 30 },
      ], year_summary: [] })
      app.setDescriptivePeriod('custom')
      app.setDescriptiveGranularity('monthly')
      app.setCustomDateRange('2026-01-01', '2026-10-17')
    })
    for (const [pageName, chartId] of [['overview', 'overviewBaselineChart'], ['revenue', 'revenueDetailChart']]) {
      await page.evaluate(name => (window as unknown as { showPage: (name: string) => void }).showPage(name), pageName)
      await page.locator('#' + chartId).scrollIntoViewIfNeeded()
      await expect.poll(() => page.evaluate(id => {
        const app = window as unknown as { Chart: { getChart: (element: HTMLElement | null) => unknown } }
        return Boolean(app.Chart.getChart(document.getElementById(id)))
      }, chartId)).toBe(true)
      const values = await page.evaluate(id => {
        const app = window as unknown as { Chart: { getChart: (element: HTMLElement | null) => { data: { datasets: { data: unknown[] }[] } } } }
        return app.Chart.getChart(document.getElementById(id)).data.datasets[0].data
      }, chartId)
      expect(values.length).toBeGreaterThan(0)
      expect(values.every(value => value === null)).toBe(true)
    }
  })
}
