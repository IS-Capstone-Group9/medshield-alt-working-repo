import { test, expect } from '@playwright/test'
import path from 'node:path'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

test.beforeEach(async ({ page }) => {
  await page.route('http://medshield.test/**', route => route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style><div class="medshield-root">${MEDSHIELD_MARKUP}</div>`)
  await page.evaluate(() => { window.fetch = async () => new Response('{}', {status:503}) })
  await page.addScriptTag({path:path.resolve('node_modules/chart.js/dist/chart.umd.js')})
  await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())
})

test('client-provided annual totals retain plain year labels, exact amounts and coverage guidance', async ({page}) => {
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({monthly:[{period:'2017-01',revenue:100,income:20}, ...Array.from({length:12},(_,i)=>({period:'2018-'+String(i+1).padStart(2,'0'),revenue:200,income:30}))],year_summary:[]})
    app.setDescriptivePeriod('custom'); app.setCustomDateRange('2017-01-01','2018-12-31'); app.setDescriptiveGranularity('yearly')
  })
  for (const name of ['overview','revenue']) {
    await page.evaluate(name => (window as any).showPage(name),name)
    const reading = page.locator(name === 'overview' ? '#overviewTrendReading' : '#salesTrendReading')
    await expect(reading).toContainText('Totals use client-provided records')
    await expect(reading).not.toContainText(/Partial|Incomplete-year/)
    await expect(reading).not.toContainText(/rose by|fell by/)
    await expect(reading).toContainText('₱100')
    await expect(reading).toContainText('₱2,400')
    const chart = await page.evaluate(id => {
      const chart = (window as any).Chart.getChart(document.getElementById(id))
      return {labels:chart.data.labels, values:chart.data.datasets[0].data}
    },name === 'overview' ? 'overviewBaselineChart' : 'revenueDetailChart')
    expect(chart.labels).toEqual(['2017','2018'])
    expect(chart.values).toEqual([100,2400])
  }
  await page.evaluate(() => (window as any).setCustomDateRange('2018-01-01','2018-06-30'))
  const selected = await page.evaluate(() => {
    const chart = (window as any).Chart.getChart(document.getElementById('revenueDetailChart'))
    return {labels:chart.data.labels, values:chart.data.datasets[0].data}
  })
  expect(selected.labels).toEqual(['2018 · selected dates'])
  expect(selected.values).toEqual([1200])
})

test('a region without mapped rows differs from an observed zero-sales region', async ({page}) => {
  await page.evaluate(() => {
    const app = window as any
    app.showPage('territory'); app.setDescriptivePeriod('custom'); app.setCustomDateRange('2025-01-01','2025-12-31')
    app.setSalesSectorsData({rows:[
      {date:'2025-01-15',period:'2025-01',sector:'Government',territory:'Quezon',region:'CALABARZON',revenue:100,positive_sales:100,returns_value:0,evidence:'actual',row_count:1},
      {date:'2025-01-15',period:'2025-01',sector:'Government',territory:'Camarines Sur',region:'Bicol',revenue:0,positive_sales:0,returns_value:0,evidence:'actual',row_count:1},
    ],source:{file:'isolated graph-meaning fixture',excluded:{}}})
  })
  const absent = page.locator('[data-rollup-region="MIMAROPA"]')
  await expect(absent).toContainText('No mapped records')
  await expect(absent).toContainText('Share unavailable')
  await expect(absent).not.toContainText('₱0')
  const observed = page.locator('[data-rollup-region="Bicol"]')
  await expect(observed).toContainText('1 area')
  await expect(observed).toContainText('₱0')
  await expect(observed).not.toContainText('No mapped records')
})

test('planning never presents missing or unverified historical Qty as verified units', async ({page}) => {
  await page.evaluate(() => {
    const app = window as any
    app.showPage('inventory')
    app.setPlanningData({scope:{sector:'All',territory:'all'},territories:[],period_start:'2025-01',period_end:'2025-12',eligible_products:3,shortlist_share_pct:100,excluded_nonpositive_products:0,source:{file:'isolated graph-meaning fixture',checksum:'fixture',excluded:{}},products:[
      {product:'Missing quantity',revenue:100,quantity:null,observed_months:1,revenue_share_pct:50},
      {product:'Observed zero quantity',revenue:60,quantity:0,observed_months:1,revenue_share_pct:30},
      {product:'Signed quantity',revenue:40,quantity:-2,observed_months:1,revenue_share_pct:20},
    ]})
  })
  const rows = page.locator('#planInputs tbody tr')
  await expect(rows.nth(0)).toContainText('Source Qty unavailable')
  await expect(rows.nth(0)).not.toContainText('0 source Qty')
  await expect(rows.nth(1)).toContainText('0 source Qty (unit unverified)')
  await expect(rows.nth(2)).toContainText('-2 source Qty (unit unverified)')
  await expect(page.locator('#planInputs tbody')).not.toContainText(' units ·')
})

test('product charts remain scannable while exact signed amounts stay available', async ({page}) => {
  await page.evaluate(() => {
    const app = window as any
    app.showPage('products'); app.setDescriptivePeriod('custom'); app.setCustomDateRange('2025-01-01','2025-12-31')
    app.setSalesSectorsData({rows:[
      {product:'Positive',revenue:90,positive_sales:100,returns_value:-10,period:'2025-02'},
      {product:'Negative',revenue:-1,positive_sales:0,returns_value:-1,period:'2025-02'},
    ],source:{file:'isolated graph-meaning fixture',excluded:{}}})
  })
  await expect(page.locator('#productSalesValues')).not.toBeVisible()
  await page.locator('#productExactAmounts > summary').click()
  await expect(page.locator('#productSalesValues')).toBeVisible()
  await expect(page.locator('#productSalesValues')).toContainText('positive ₱100, negative adjustments -₱10, net sales ₱90')
  expect(await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('productBarChart')).data.datasets.map((d: any) => d.data))).toEqual([[100,0],[-10,-1]])
})
