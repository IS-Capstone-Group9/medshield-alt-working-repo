import { readFile } from 'node:fs/promises'
import { test, expect } from '@playwright/test'
import { signInToReadyDashboard } from './helpers/dashboard'

test('live descriptive views use Databricks candidate sales and no demonstration recommendations', async ({ page }, testInfo) => {
  test.setTimeout(150000)
  const expectedFactVersion = process.env.MEDSHIELD_E2E_FACT_VERSION
  const expectedPolicy = process.env.MEDSHIELD_E2E_POLICY_VERSION
  expect(expectedFactVersion, 'Set MEDSHIELD_E2E_FACT_VERSION to the candidate under review').toMatch(/^\d+$/)
  expect(expectedPolicy, 'Set MEDSHIELD_E2E_POLICY_VERSION to the candidate policy').toBeTruthy()
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
  await page.getByRole('tab', { name: 'Seasonality', exact: true }).click()
  await expect(page.locator('#descriptiveStlPanel')).toContainText(/72 qualifying months/, {timeout:60000})
  await expect(page.locator('#descriptiveStlPanel')).toContainText(`Fact version ${expectedFactVersion}`)
  await expect(page.locator('#descriptiveStlPanel canvas')).toHaveCount(3)
  const stlDownload = page.waitForEvent('download')
  await page.getByRole('button',{name:'Export STL components'}).click()
  const stlCsv = await readFile((await (await stlDownload).path())!, 'utf8')
  expect(stlCsv.trim().split('\r\n')).toHaveLength(73)
  expect(stlCsv).toContain(`"${expectedFactVersion}","${expectedPolicy}","candidate_not_approved"`)
  await expect(page.locator('#descriptiveStlPanel table tbody tr')).toHaveCount(72)
  const stlRecords = stlCsv.trim().split('\r\n').slice(1).map(line =>
    [...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(match => match[1].replace(/""/g, '"')))
  for (const row of stlRecords) {
    const [observed, trend, seasonal, residual] = row.slice(1, 5).map(Number)
    expect([observed, trend, seasonal, residual].every(Number.isFinite)).toBeTruthy()
    expect(trend + seasonal + residual).toBeCloseTo(observed, 4)
    expect(row[8]).toBe(expectedFactVersion)
    expect(row[9]).toBe(expectedPolicy)
  }

  await page.getByRole('tab', { name: 'Growth', exact: true }).click()
  await expect(page.locator('#salesMarginDetails')).not.toHaveAttribute('open', '')
  await page.locator('#salesMarginDetails > summary').click()
  await expect(page.locator('#marginChart').locator('xpath=ancestor::div[contains(@class,"chart-card")]')).toContainText('Yearly Gross Margin')
  const margin = await page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('marginChart')).data)
  expect(margin.labels).toHaveLength(9)
  await page.getByRole('tab', { name: 'Quantities', exact: true }).click()
  await expect(page.locator('#heatmapProduct')).not.toBeEmpty({timeout:60000})
  await expect(page.locator('#heatmapStatus')).toContainText('years have original-source records')
  const yearlyQuantities = await page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('quantityTrendChart')).data.datasets[0].data)
  expect(yearlyQuantities.some((value:number|null)=>value !== null && value > 0)).toBeTruthy()
  await page.screenshot({ path: testInfo.outputPath('sales.png'), fullPage: true })
  await page.locator('.nav-item', { hasText: 'Product Prioritization' }).click()
  await expect(page.locator('#productPriorityScope')).toContainText('Recorded net sales: ₱626,946,742', { timeout: 60000 })
  await expect(page.locator('#productTable tbody tr')).toHaveCount(20)
  await expect(page.locator('#productTableStatus')).toContainText('Showing 1–20')
  await expect(page.locator('#productPriorityScope')).toContainText('ABC policy candidate — CEO approval pending')
  await expect(page.locator('#productTable thead th')).toHaveCount(6)
  await expect(page.locator('#productTable tbody details').first()).toContainText('Negative adjustments')
  await expect(page.locator('#productTable tbody details').first()).toContainText('Product provenance')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', {name:'Export selected rows'}).click()
  const download = await downloadPromise
  const exported = await readFile((await download.path())!, 'utf8')
  // This exporter quotes every field; normalized source labels have no newlines.
  const records = exported.trim().split('\r\n').map(line => [...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(match => match[1].replace(/""/g,'"')))
  const headers = records.shift()!
  const csv = records.map(record => { expect(record.length).toBe(headers.length); return Object.fromEntries(headers.map((key,i)=>[key,record[i]])) })
  expect(csv.length).toBeGreaterThan(100)
  expect(csv.every(row=>row['Fact Delta version']===expectedFactVersion)).toBeTruthy()
  const sum = (key: string) => csv.reduce((total,row)=>total+Number(row[key]),0)
  expect(sum('Net sales PHP')).toBeCloseTo(626946741.81,2)
  expect(sum('Positive sales PHP')+sum('Returns PHP')).toBeCloseTo(sum('Net sales PHP'),2)
  expect(csv.every(row=>row['Policy status']==='positive_sales_crossing_inclusive_v2_candidate')).toBeTruthy()
  await expect(page.locator('#page-products')).not.toContainText(/WHO VEN|Zero-Stockout|Surge Multiplier|Expand stock presence|Hospital demand similarity/)
  await expect(page.locator('#productPublicationLimits')).toContainText('Product-region recommendations are not published')
  await expect(page.locator('#page-products')).not.toContainText('Class A (70%)')
  await page.screenshot({ path: testInfo.outputPath('products.png'), fullPage: true })
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

test('authenticated descriptive endpoints identify the selected candidate', async ({ page, request }, testInfo) => {
  test.setTimeout(150000)
  const expectedVersion = process.env.MEDSHIELD_E2E_FACT_VERSION
  const expectedPolicy = process.env.MEDSHIELD_E2E_POLICY_VERSION
  expect(expectedVersion).toMatch(/^\d+$/)
  expect(expectedPolicy).toBeTruthy()
  let authorization = ''
  page.on('request', req => {
    if (req.url().startsWith('http://localhost:5000/api/')) authorization = req.headers().authorization || authorization
  })
  await signInToReadyDashboard(page)
  expect(authorization).toBeTruthy()
  const evidence: Record<string, unknown> = {}
  let dataset = ''
  for (const endpoint of ['/dashboard_status', '/sales/status', '/sales/sectors', '/sales/heatmap', '/seasonality/stl', '/products']) {
    const response = await request.get('http://localhost:5000/api' + endpoint, { headers: { Authorization: authorization } })
    expect(response.status(), endpoint).toBe(200)
    const identities: any[] = []
    const visit = (value: any) => {
      if (!value || typeof value !== 'object') return
      if (value.fact_delta_version !== undefined && value.dataset_id && value.policy_version) identities.push(value)
      else Object.values(value).forEach(visit)
    }
    visit(await response.json())
    expect(identities.length, endpoint + ' must expose release identity').toBeGreaterThan(0)
    for (const release of identities) {
      expect(String(release.fact_delta_version), endpoint).toBe(expectedVersion)
      expect(release.policy_version, endpoint).toBe(expectedPolicy)
      dataset ||= release.dataset_id
      expect(release.dataset_id, endpoint).toBe(dataset)
    }
    evidence[endpoint] = { status: response.status(), identity: identities[0], matching_identities: identities.length }
  }
  await testInfo.attach('candidate-api-identities', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' })
})
