import { readFile } from 'node:fs/promises'
import { test, expect } from '@playwright/test'
import { signInToReadyDashboard } from './helpers/dashboard'

test('live descriptive views use Databricks candidate sales and no demonstration recommendations', async ({ page }) => {
  test.setTimeout(150000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await signInToReadyDashboard(page)
  await page.evaluate(() => {
    const app = window as any
    app.setDescriptivePeriod('all')
  })
  await page.locator('.nav-item', { hasText: 'Sales Diagnostics' }).click()
  await expect(page.locator('#salesGrossMargin')).toHaveText('60.26%', { timeout: 15000 })
  await expect(page.locator('[data-metric-definitions]')).toContainText('same margin-eligible transactions')
  await expect(page.locator('#descriptiveStlPanel')).toContainText(/72 qualifying observed months/, {timeout:60000})
  await expect(page.locator('#descriptiveStlPanel')).toContainText('Fact version 16')
  await expect(page.locator('#descriptiveStlPanel canvas')).toHaveCount(3)
  const stlDownload = page.waitForEvent('download')
  await page.getByRole('button',{name:'Export STL components'}).click()
  const stlCsv = await readFile((await (await stlDownload).path())!, 'utf8')
  expect(stlCsv.trim().split('\r\n')).toHaveLength(73)
  expect(stlCsv).toContain('"16","sales_restart_gold_v6_reviewed_source_provenance","candidate_not_approved"')

  await expect(page.locator('#marginChart').locator('xpath=ancestor::div[contains(@class,"chart-card")]')).toContainText('Yearly Gross Margin')
  const margin = await page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('marginChart')).data)
  expect(margin.labels).toHaveLength(9)
  await expect(page.locator('#heatmapProduct')).not.toBeEmpty({timeout:60000})
  await expect(page.locator('#heatmapStatus')).toContainText('years have observed records')
  const yearlyQuantities = await page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('quantityTrendChart')).data.datasets[0].data)
  expect(yearlyQuantities.some((value:number|null)=>value !== null && value > 0)).toBeTruthy()
  await page.screenshot({ path: 'test-results-descriptive-live/sales.png', fullPage: true })
  await page.locator('.nav-item', { hasText: 'Product Prioritization' }).click()
  await expect(page.locator('#productPriorityScope')).toContainText('Recorded revenue: ₱626,946,742', { timeout: 60000 })
  await expect(page.locator('#productTable tbody tr')).toHaveCount(100)
  await expect(page.locator('#productPriorityScope')).toContainText('ABC policy candidate — CEO approval pending')
  await expect(page.locator('#productTable thead')).toContainText('Returns (₱)')
  await expect(page.locator('#productTable thead')).toContainText('Product provenance')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', {name:'Export selected rows'}).click()
  const download = await downloadPromise
  const exported = await readFile((await download.path())!, 'utf8')
  // This exporter quotes every field; normalized source labels have no newlines.
  const records = exported.trim().split('\r\n').map(line => [...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(match => match[1].replace(/""/g,'"')))
  const headers = records.shift()!
  const csv = records.map(record => { expect(record.length).toBe(headers.length); return Object.fromEntries(headers.map((key,i)=>[key,record[i]])) })
  expect(csv.length).toBeGreaterThan(100)
  expect(csv.every(row=>row['Fact Delta version']==='16')).toBeTruthy()
  const sum = (key: string) => csv.reduce((total,row)=>total+Number(row[key]),0)
  expect(sum('Net sales PHP')).toBeCloseTo(626946741.81,2)
  expect(sum('Positive sales PHP')+sum('Returns PHP')).toBeCloseTo(sum('Net sales PHP'),2)
  expect(csv.every(row=>row['Policy status']==='positive_sales_candidate_pending_CEO')).toBeTruthy()
  await expect(page.locator('#page-products')).not.toContainText(/WHO VEN|Zero-Stockout|Surge Multiplier|Expand stock presence|Hospital demand similarity/)
  await expect(page.locator('#matchingTable')).toContainText('not published')
  await expect(page.locator('#page-products')).not.toContainText('Class A (70%)')
  await page.screenshot({ path: 'test-results-descriptive-live/products.png', fullPage: true })
  expect(errors).toEqual([])
})

test('descriptive API rejects broadened filters and preserves future empty years', async ({page, request}) => {
  test.setTimeout(150000)
  let authorization = ''
  page.on('request', req => {if (req.url().startsWith('http://localhost:5000/api/')) authorization = req.headers().authorization || authorization})
  await signInToReadyDashboard(page)
  expect(authorization).toBeTruthy()
  for (const path of ['/sales/summary?year=2024&year=2025','/sales/summary?year=2.025e3','/sales/transactions?search[x]=a','/weather/effects?year=2024&year=2025']) {
    const response = await request.get('http://localhost:5000/api'+path,{headers:{Authorization:authorization}})
    expect(response.status(),path).toBe(400)
  }
  const future=await request.get('http://localhost:5000/api/sales/summary?year=2100',{headers:{Authorization:authorization}})
  expect(future.status()).toBe(200)
  const data=await future.json()
  expect(data.counts.rows).toBe(0)
})
