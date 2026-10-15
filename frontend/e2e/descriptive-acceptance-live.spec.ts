import { readFile, writeFile } from 'node:fs/promises'
import { test, expect } from '@playwright/test'
import { signInToReadyDashboard } from './helpers/dashboard'

function csvRecords(text: string) {
  const records = text.trim().split('\r\n').map(line =>
    [...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(match => match[1].replace(/""/g, '"')))
  const headers = records.shift()!
  return records.map(record => {
    expect(record).toHaveLength(headers.length)
    return Object.fromEntries(headers.map((key, index) => [key, record[index]]))
  })
}

test('accepted categories and the 2017–2025 study reconcile across API, dashboard and exports', async ({ page, request }, testInfo) => {
  test.setTimeout(240000)
  const version = process.env.MEDSHIELD_E2E_FACT_VERSION
  expect(version).toMatch(/^\d+$/)
  let authorization = ''
  page.on('request', req => {
    if (req.url().startsWith('http://localhost:5000/api/')) authorization = req.headers().authorization || authorization
  })
  await signInToReadyDashboard(page)
  const headers = { Authorization: authorization }
  const sectorsResponse = await request.get('http://localhost:5000/api/sales/sectors', { headers })
  expect(sectorsResponse.status()).toBe(200)
  const sectors = await sectorsResponse.json()
  expect(String(sectors.source.release.fact_delta_version)).toBe(version)
  const sourceRows = sectors.rows.filter((row: any) => row.date >= '2017-01-01' && row.date <= '2025-12-31')
  // Independently retained warehouse reconciliation; no dashboard calculation supplies this expectation.
  const receipt = JSON.parse(await readFile('../outputs/descriptive_validation/2026-10-09T07-40-39-615Z/evidence.json', 'utf8'))
  expect(String(receipt.delta_version)).toBe(version)
  const months = receipt.snapshot.monthly.filter((row: any) => row.period >= '2017-01' && row.period <= '2025-12')
  const expectedRevenue = months.reduce((sum: number, row: any) => sum + (row.revenue ?? 0), 0)
  expect(months).toHaveLength(108)
  const missingMonths = months.filter((row: any) => row.missing)
  expect(months.filter((row: any) => row.has_sales_activity)).toHaveLength(98)
  expect(missingMonths.map((row: any) => row.period)).toEqual([
    '2017-05', '2017-06', '2017-07', '2017-08', '2017-10',
    '2018-01', '2018-02', '2019-10', '2019-11', '2019-12',
  ])
  expect(missingMonths.every((row: any) => row.revenue === null && row.income === null)).toBeTruthy()
  const summaryResponse = await request.get('http://localhost:5000/api/sales/summary?start_date=2017-01-01&end_date=2025-12-31', { headers })
  expect(summaryResponse.status()).toBe(200)
  const summary = await summaryResponse.json()
  expect(summary.sums.net_cost).toBeCloseTo(expectedRevenue, 2)
  expect(summary.sums.net_income).toBeCloseTo(months.reduce((sum: number, row: any) => sum + (row.income ?? 0), 0), 2)
  const basis = months.reduce((sum: number, row: any) => sum + (row.margin_revenue_basis ?? 0), 0)
  // Spark returns this decimal rate rounded to six places; allow one millionth of a percentage point.
  expect(Math.abs(summary.gross_margin_rate - 100 * summary.sums.net_income / basis)).toBeLessThanOrEqual(0.000001)
  await page.selectOption('#analysisScopeSelect', 'capstone')
  await expect(page.locator('#customDateStart')).toHaveValue('2017-01-01')
  await expect(page.locator('#customDateEnd')).toHaveValue('2025-12-31')
  await expect(page.locator('#kpiOverviewTotalRevenue')).toHaveText(new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(expectedRevenue))
  await page.screenshot({ path: testInfo.outputPath('study-overview.png'), fullPage: true })
  await page.locator('[data-dashboard-page="products"]').click()
  await expect(page.locator('#productCategorySelect')).toBeEnabled({ timeout: 60000 })
  await expect(page.locator('#productPriorityScope')).toContainText('Recorded net sales:', { timeout: 60000 })
  const categories: Record<string, unknown> = {}
  let partitionRevenue = 0
  for (const category of ['All', 'Medical', 'Non-Medical', 'Unclassified']) {
    await page.selectOption('#productCategorySelect', category)
    await expect(page.getByRole('button', { name: 'Export selected rows' })).toBeEnabled()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export selected rows' }).click()
    const download = await downloadPromise
    const csv = await readFile((await download.path())!, 'utf8')
    const exported = csvRecords(csv)
    expect(exported.length).toBeGreaterThan(0)
    expect(exported.every(row => row['Fact Delta version'] === version && row['Reporting scope'].includes('2017') && row['Reporting scope'].includes('2025'))).toBeTruthy()
    if (category !== 'All') expect(exported.every(row => row.Category === category)).toBeTruthy()
    const selected = category === 'All' ? sourceRows : sourceRows.filter((row: any) => row.category === category)
    const expected = selected.reduce((sum: number, row: any) => sum + (row.revenue ?? 0), 0)
    const actual = exported.reduce((sum, row) => sum + Number(row['Net sales PHP']), 0)
    expect(actual, category).toBeCloseTo(expected, 2)
    expect(exported.reduce((sum, row) => sum + Number(row['Positive sales PHP']) + Number(row['Returns PHP']), 0)).toBeCloseTo(actual, 2)
    expect(exported.every(row => row['Identity status'] === 'needs_review')).toBeTruthy()
    if (category !== 'All') partitionRevenue += actual
    categories[category] = { reporting_groups: exported.length, net_sales: actual, source_records: selected.length }
    await writeFile(testInfo.outputPath(`study-products-${category}.csv`), csv)
  }
  expect(partitionRevenue).toBeCloseTo(expectedRevenue, 2)
  await page.screenshot({ path: testInfo.outputPath('study-unclassified.png'), fullPage: true })

  const search = "BUPIRIGHT 1'S VIALS"
  const ledgerResponse = await request.get('http://localhost:5000/api/sales/transactions', { headers, params: { search, page_size: '100' } })
  expect(ledgerResponse.status()).toBe(200)
  const ledger = await ledgerResponse.json()
  expect(ledger.rows.length).toBeGreaterThan(0)
  expect(ledger.rows.every((row: any) => row.product.includes(search))).toBeTruthy()
  await page.locator('#salesDataNavItem').click()
  await page.locator('#salesDataSearch').fill(search)
  await expect(page.locator('#salesDataStatus')).toContainText('Showing', { timeout: 60000 })
  await expect(page.locator('#salesDataTable tbody')).toContainText(search)
  await expect(page.locator('.medshield-root')).toHaveAttribute('data-source-state', 'ready')
  await page.screenshot({ path: testInfo.outputPath('ledger-apostrophe.png'), fullPage: true })
  await testInfo.attach('study-acceptance', { body: JSON.stringify({ fact_delta_version: version, study_period: '2017-01-01/2025-12-31',
    calendar_months: months.length, observed_months: months.filter((row: any) => row.has_sales_activity).length,
    missing_months: missingMonths.map((row: any) => row.period), net_sales: expectedRevenue, gross_margin_rate: summary.gross_margin_rate,
    categories, apostrophe_search_rows: ledger.pagination.total_rows }, null, 2), contentType: 'application/json' })
})
