import { test, expect } from '@playwright/test'
import path from 'node:path'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'
import { formatSalesValue, renderSalesComputation } from '../services/api/sales-view-helpers'

test('Section 1: real chart datasets, KPI rates, labels and refresh use the same financial definitions', async ({ page }) => {
  // Exercise the actual dashboard runtime and Chart.js without depending on login or live services.
  await page.route('http://medshield.test/**', route => route.fulfill({
    contentType: 'text/html', body: '<html><head></head><body></body></html>',
  }))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
  await page.evaluate(() => { window.fetch = async () => new Response('{}', { status: 503 }) })
  await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
  await page.evaluate(script => { new Function(script)() }, getExecutableDashboardScript())
  await page.waitForFunction(() => typeof (window as any).applyDatasetPatch === 'function')
  await page.evaluate(() => {
    const app = window as any
    app.setDescriptivePeriod('custom')
    app.setYear('2025')
    app.showPage('revenue')
    app.applyDatasetPatch({
      year_summary: [{ year: '2025', revenue: 1000, income: 140, transactions: 2 }],
      monthly: [{ period: '2025-01', revenue: 1000, income: 140 }],
    })
  })
  await expect(page.locator('#salesGrossMargin')).toHaveText('14.00%')
  const chart = await page.evaluate(() => {
    const app = window as any
    const margin = app.Chart.getChart(document.getElementById('marginChart'))
    const baseline = app.Chart.getChart(document.getElementById('overviewBaselineChart'))
    return { values: margin.data.datasets[0].data, labels: baseline.data.datasets.map((d: any) => d.label) }
  })
  expect(chart.values).toHaveLength(1)
  expect(chart.values[0]).toBeCloseTo(14)
  expect(chart.labels).toEqual(['Net Sales Revenue · 2025', 'Gross Profit · 2025'])
  await page.locator('[data-metric-definitions] summary').click()
  await expect(page.locator('[data-metric-definitions]')).toContainText('transaction percentages are not averaged')
  await page.screenshot({ path: 'test-results/section-1-sales-diagnostics.png', fullPage: true })
  await page.evaluate(() => (window as any).applyDatasetPatch({
    year_summary: [{ year: '2025', revenue: 0, income: 20, transactions: 1 }],
    monthly: [{ period: '2025-01', revenue: 0, income: 20 }],
  }))
  await expect(page.locator('#salesGrossMargin')).toHaveText('Unavailable')
  expect(await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('marginChart')).data.datasets[0].data)).toEqual([null])
})

test('Section 1: filtered sales summary shows weighted rates and reconciliation in every computation mode', async ({ page }) => {
  await page.setContent('<div id="salesComputationGrid"></div><p id="salesFinancialReconciliation"></p>')
  const renderer = `${formatSalesValue.toString()}; ${renderSalesComputation.toString()};`
  for (const mode of ['overview', 'average']) {
    await page.evaluate(({ renderer, mode }) => {
      new Function(`${renderer} renderSalesComputation(document.body, {
        sums: { net_cost: 1000, net_income: 140 },
        averages: { margin_pct: 0.30 }, counts: {}, top: {},
        financial_reconciliation: { delta: 5, checked_rows: 2, mismatched_rows: 1 }
      }, '${mode}');`)()
    }, { renderer, mode })
    await expect(page.locator('#salesComputationGrid')).toContainText('14.00%')
    await expect(page.locator('#salesComputationGrid')).not.toContainText('30.00%')
    await expect(page.locator('#salesFinancialReconciliation')).toContainText('1 of 2 accepted rows')
  }
  await page.evaluate(renderer => new Function(`${renderer} renderSalesComputation(document.body, {
    sums: { net_cost: 0, net_income: 10 }, averages: {}, counts: {}, top: {}
  }, 'overview');`)(), renderer)
  await expect(page.locator('#salesComputationGrid')).not.toContainText('Infinity')
  await expect(page.locator('#salesComputationGrid')).not.toContainText('0.00%')
  await expect(page.locator('#salesComputationGrid')).toContainText('Unavailable')
})
