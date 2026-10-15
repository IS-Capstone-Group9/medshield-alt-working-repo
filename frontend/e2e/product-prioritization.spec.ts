import { test, expect } from '@playwright/test'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

test.beforeEach(async ({ page }) => {
  await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
  await page.addStyleTag({ path: path.resolve('app/overrides.css') })
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

test('observed revenue ranks and full-population ABC replace unsupported clinical claims', async ({ page }, testInfo) => {
  await expect(page.locator('#productPriorityScope')).toContainText('Recorded net sales: ₱100')
  const classes = await page.locator('#productTable').evaluate(table => {
    const column = [...table.querySelectorAll('thead th')].findIndex(header => header.textContent === 'Sales group (ABC)')
    return [...table.querySelectorAll('tbody tr')].map(row => row.querySelectorAll('td')[column].textContent)
  })
  expect(classes).toEqual(['A · Largest contributors', 'A · Largest contributors', 'B · Next contributors', 'B · Next contributors', 'C · Remaining contributors'])
  await expect(page.locator('#productFinding')).toHaveText('2 of 5 product names account for 80.0% of positive amounts.')
  await expect(page.locator('#productSalesGroupKey')).toContainText('A · Largest contributors: 80.0% of positive amounts · 2 names (40.0% of all names)')
  await expect(page.locator('#productTable thead th')).toHaveText(['Rank','Product name from sales records','Net sales (₱)','Share of positive amounts (%)','Sales group (ABC)','Details'])
  await expect(page.locator('#productAbcShareChart')).toBeVisible()
  await expect(page.locator('#abcChart')).not.toBeVisible()
  await expect(page.locator('#paretoCurveChart')).not.toBeVisible()
  const summary = page.locator('#productConcentrationDetails > summary')
  await summary.focus(); await page.keyboard.press('Enter')
  await expect(page.locator('#abcChart')).toBeVisible()
  await expect(page.locator('#paretoCurveChart')).toBeVisible()
  await expect.poll(() => page.evaluate(() => (window as any).Chart.getChart(document.getElementById('abcChart')).chartArea.width)).toBeGreaterThan(100)
  await expect.poll(() => page.evaluate(() => ['abcChart','paretoCurveChart'].every(id => {const canvas=document.getElementById(id)!,parent=canvas.parentElement!;return canvas.getBoundingClientRect().width<=parent.getBoundingClientRect().width+1}))).toBe(true)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await expect(page.locator('#matchingTable')).toHaveCount(0)
  await expect(page.locator('#page-products')).not.toContainText(/Zero-Stockout|WHO VEN|Surge Multiplier|guaranteed emergency|Clinical VEN/)
  await expect(page.locator('#productScenarioSelect')).toHaveCount(0)
  const values = await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('productBarChart')).data.datasets[0].data)
  expect(values).toEqual([60, 20, 10, 5, 5])
  await page.screenshot({ path: testInfo.outputPath('product-sales.png'), fullPage: true })
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
  await expect(page.locator('#productPriorityScope')).toContainText('Recorded net sales: ₱90')
  await expect(page.locator('#productSalesReadCue')).toContainText('plus signed negative adjustments')
  const datasets = await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('productBarChart')).data.datasets.map((dataset: any) => dataset.data))
  expect(datasets).toEqual([[100,0],[0,-10]])
  await page.locator('#productTable tbody tr').last().locator('summary').click()
  await expect(page.locator('#productTable tbody')).toContainText('Negative adjustments')
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

test('a cutoff-crossing name stays in its starting group and CSV retains original codes', async ({ page }) => {
  await page.evaluate(() => (window as any).setSalesSectorsData({rows:[96,4,0].map((revenue,index) => ({product:'Crossing '+index,period:'2025-02',revenue,positive_sales:revenue,returns_value:0})),source:{excluded:{}}}))
  const groups = await page.locator('#productTable tbody tr').evaluateAll(rows => rows.map(row => row.querySelectorAll('td')[4].textContent))
  expect(groups).toEqual(['A · Largest contributors','C · Remaining contributors','Unclassified · Not grouped'])
  await expect(page.locator('#productSalesGroupKey')).toContainText('A · Largest contributors: 96.0%')
  const download = page.waitForEvent('download'); await page.getByRole('button',{name:'Export selected rows'}).click()
  const csv = await readFile((await (await download).path())!,'utf8')
  const rows = csv.trim().split(/\r?\n/).map(line => [...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(match => match[1].replace(/""/g,'"')))
  const codeColumn = rows[0].indexOf('Candidate ABC')
  expect(rows.slice(1).map(row => row[codeColumn])).toEqual(['A','C','Unclassified'])
})

test('table search and paging preserve charts and complete-cohort export; scope changes reset pages', async ({ page }) => {
  await page.evaluate(() => (window as any).setSalesSectorsData({rows:Array.from({length:25},(_,index) => ({product:'Name '+String(index).padStart(2,'0'),product_raw:'Alias '+index,period:'2025-02',revenue:25-index,positive_sales:25-index,returns_value:0})),source:{excluded:{}}}))
  const chartState = () => page.evaluate(() => ['productBarChart','productAbcShareChart','paretoCurveChart'].map(id => { const chart=(window as any).Chart.getChart(document.getElementById(id));return {id:chart.id,data:chart.data} }))
  const exportCsv = async () => { const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export selected rows'}).click();return readFile((await (await download).path())!,'utf8') }
  const originalCsv = await exportCsv()
  // Navigation schedules its own chart paint; snapshot after the first visible export interaction.
  const initial = await chartState()
  await expect(page.locator('#productTable tbody tr')).toHaveCount(20)
  await page.getByRole('button',{name:'Next product page'}).focus();await page.keyboard.press('Enter')
  await expect(page.locator('#productTableStatus')).toContainText('Showing 21–25 of 25')
  await expect(page.locator('#productTable tbody tr')).toHaveCount(5)
  await page.getByRole('searchbox',{name:'Search product names'}).fill('Alias 24')
  await expect(page.locator('#productTable tbody tr')).toHaveCount(1)
  await expect(page.locator('#productTable tbody')).toContainText('Name 24')
  expect(await chartState()).toEqual(initial)
  expect(await exportCsv()).toEqual(originalCsv)
  await page.getByRole('searchbox',{name:'Search product names'}).fill('no match')
  await expect(page.locator('#productTableStatus')).toContainText('No product names match')
  await page.getByRole('searchbox',{name:'Search product names'}).fill('')
  await page.getByRole('button',{name:'Next product page'}).click()
  await page.selectOption('#productCohortSelect','20')
  await expect(page.locator('#productTableStatus')).toContainText('Showing 1–5 of 5')
  await page.evaluate(() => (window as any).setCustomDateRange('2024-01-01','2024-12-31'))
  await expect(page.locator('#productTable')).toContainText('No observed product sales')
  await expect(page.locator('#productBarChart')).not.toBeVisible()
  await page.evaluate(() => (window as any).setCustomDateRange('2025-01-01','2025-12-31'))
  await expect(page.locator('#productTableStatus')).toContainText('Showing 1–5 of 5')
  await page.evaluate(() => (window as any).setSalesSectorsData(null,'Warehouse unavailable'))
  await expect(page.locator('#productTableStatus')).toContainText('loading or unavailable')
  await expect(page.locator('#productAbcShareChart')).not.toBeVisible()
})

test('product controls and expanded row evidence fit a mobile viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({width:375,height:850})
  await page.locator('#productTable tbody tr').first().locator('summary').click()
  await expect(page.locator('#productTable tbody tr').first().locator('details')).toHaveAttribute('open','')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const tableBounds = await page.locator('#productTable').evaluate(table => { const parent=table.parentElement!,cell=table.querySelector('td')!;return {tableWidth:table.getBoundingClientRect().width,cssWidth:getComputedStyle(table).width,minWidth:getComputedStyle(table).minWidth,parentWidth:parent.getBoundingClientRect().width,scrollLeft:parent.scrollLeft,scrollWidth:parent.scrollWidth,firstCellLeft:cell.getBoundingClientRect().left,parentLeft:parent.getBoundingClientRect().left} })
  await testInfo.attach('product-table-bounds',{body:JSON.stringify(tableBounds),contentType:'application/json'})
  await expect.poll(() => page.locator('#productTable tbody tr').first().locator('td').first().evaluate(cell => cell.getBoundingClientRect().left>=cell.closest('[data-product-scroll]')!.getBoundingClientRect().left),{message:JSON.stringify(tableBounds)}).toBe(true)
  await expect.poll(() => page.evaluate(() => ['productBarChart','productAbcShareChart'].every(id => { const chart=(window as any).Chart.getChart(document.getElementById(id));return chart.chartArea.width>65&&chart.chartArea.height>80 }))).toBe(true)
  await expect.poll(() => page.evaluate(() => ['productBarChart','productAbcShareChart'].every(id => {const canvas=document.getElementById(id)!,parent=canvas.parentElement!;return canvas.getBoundingClientRect().width<=parent.getBoundingClientRect().width+1}))).toBe(true)
  await page.screenshot({path:testInfo.outputPath('product-mobile.png'),fullPage:true})
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
