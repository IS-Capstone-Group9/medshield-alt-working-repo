import { readFile, writeFile } from 'node:fs/promises'
import { test, expect, type Page } from '@playwright/test'
import { signInToReadyDashboard } from './helpers/dashboard'

test.use({ trace: 'off', video: 'off', screenshot: 'off' })
const gateway = 'http://localhost:5000'
function csvRecords(csv: string) {
  const lines = csv.trim().replace(/^\uFEFF/, '').split('\r\n').map(line =>
    [...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(match => match[1].replace(/""/g, '"')))
  const headers = lines.shift()!
  return lines.map(line => { expect(line).toHaveLength(headers.length); return Object.fromEntries(headers.map((key, i) => [key, line[i]])) })
}
async function login(page: Page) {
  let authorization = ''
  page.on('request', request => { if (request.url().startsWith(gateway + '/api/')) authorization = request.headers().authorization || authorization })
  await signInToReadyDashboard(page)
  expect(authorization).toBeTruthy()
  return { Authorization: authorization }
}

test('live Sales Diagnostics exact-date investigation and STL exports retain their source populations', async ({ page, request }, testInfo) => {
  test.setTimeout(240000)
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  const headers = await login(page)
  const statusResponse = await request.get(gateway + '/api/dashboard_status', { headers })
  const status = await statusResponse.json()
  expect(status.release.fact_delta_version).toBe(20)
  const monthly = await (await request.get(gateway + '/api/monthly', { headers })).json()
  const marginBasis = monthly.reduce((sum: number, row: any) => sum + (row.margin_revenue_basis ?? 0), 0)
  const income = monthly.reduce((sum: number, row: any) => sum + (row.income ?? 0), 0)
  await page.selectOption('#analysisScopeSelect', 'capstone')
  await page.locator('[data-dashboard-page="revenue"]').click()
  await expect(page.locator('#salesGrossMargin')).toHaveText((100 * income / marginBasis).toFixed(2) + '%')
  await page.getByRole('tab', { name: 'Seasonality', exact: true }).click()
  await expect(page.locator('#descriptiveStlPanel')).toContainText('72 qualifying months', { timeout: 90000 })
  const stl = await (await request.get(gateway + '/api/seasonality/stl', { headers })).json()
  expect(stl.release).toMatchObject(status.release)
  const stlDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export STL components' }).click()
  const stlCsv = await readFile((await (await stlDownload).path())!, 'utf8')
  const stlRows = csvRecords(stlCsv)
  expect(stlRows).toHaveLength(stl.rows.length)
  for (let i = 0; i < stlRows.length; i++) {
    const row = stlRows[i], original = stl.rows[i]
    expect(row.Month).toBe(original.period)
    for (const [column, field] of [['Observed PHP', 'observed'], ['Trend PHP', 'trend'], ['Seasonal PHP', 'seasonal'], ['Residual PHP', 'residual']]) {
      expect(Number(row[column])).toBeCloseTo(original[field], 6)
    }
    expect(Number(row['Trend PHP']) + Number(row['Seasonal PHP']) + Number(row['Residual PHP'])).toBeCloseTo(Number(row['Observed PHP']), 4)
    expect(row['Fact Delta version']).toBe('20'); expect(row.Status).toBe('candidate_not_approved')
  }
  await writeFile(testInfo.outputPath('stl-components.csv'), stlCsv)

  await page.locator('[data-sales-output-tab="diagnostics"]').click()
  await page.locator('#diagnosticStart').fill('2025-01-15')
  await page.locator('#diagnosticEnd').fill('2025-02-15')
  const investigationResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/sales/diagnostics' && response.status() === 200)
  await page.locator('#diagnosticRun').click()
  const investigation = await (await investigationResponse).json()
  await expect(page.locator('#diagnosticStatus')).toContainText('Recorded contribution evidence loaded', { timeout: 90000 })
  expect(investigation.release).toMatchObject(status.release)
  expect(investigation.scope).toMatchObject({ start_date: '2025-01-15', end_date: '2025-02-15', prior_start_date: '2024-01-15', prior_end_date: '2024-02-15' })
  expect(investigation.coverage.partial_boundary_months).toHaveLength(2)
  for (const dimension of ['month', 'product', 'area', 'sector']) {
    const delta = investigation.contributions[dimension].reduce((sum: number, row: any) => sum + (row.delta ?? 0), 0)
    expect(delta).toBeCloseTo(investigation.totals.delta, 2)
    await page.selectOption('#diagnosticDimension', dimension)
    await expect(page.locator('#diagnosticResults')).toContainText('No underlying business cause has been verified')
  }
  const summary = await (await request.get(gateway + '/api/sales/summary?start_date=2025-01-15&end_date=2025-02-15', { headers })).json()
  expect(investigation.totals.current).toBeCloseTo(summary.sums.net_cost, 2)
  expect(investigation.totals.current_financial.income).toBeCloseTo(summary.sums.net_income, 2)
  const evidenceDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export investigation evidence' }).click()
  const evidenceText = await readFile((await (await evidenceDownload).path())!, 'utf8')
  const exported = JSON.parse(evidenceText)
  expect(exported.scope).toEqual(investigation.scope)
  expect(exported.totals).toEqual(investigation.totals)
  expect(exported.contributions).toEqual(investigation.contributions)
  expect(exported.investigation.status).toBe('unverified')
  await writeFile(testInfo.outputPath('investigation.json'), evidenceText)
  await page.locator('#salesDiagnosticInvestigation').screenshot({ path: testInfo.outputPath('sales-investigation.png') })
  expect(errors).toEqual([])
  await testInfo.attach('sales-result', { body: JSON.stringify({ source: status.release, exact_date_filter: investigation.scope, stl_rows: stlRows.length,
    contribution_dimensions_reconciled: 4, investigation_export_matches: true, gross_margin_matched_denominator: true, causal_status: investigation.causal_status, browser_errors: errors }), contentType: 'application/json' })
})

test('live Product Prioritization category/cohort/table filters and CSV keep full source denominators', async ({ page, request }, testInfo) => {
  test.setTimeout(240000)
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  const headers = await login(page)
  const sectors = await (await request.get(gateway + '/api/sales/sectors', { headers })).json()
  expect(sectors.source.release.fact_delta_version).toBe(20)
  const sourceRows = sectors.rows.filter((row: any) => row.date >= '2017-01-01' && row.date <= '2025-12-31')
  await page.selectOption('#analysisScopeSelect', 'capstone')
  await page.locator('[data-dashboard-page="products"]').click()
  await expect(page.locator('#productCategorySelect')).toBeEnabled({ timeout: 90000 })
  await expect(page.locator('#productPriorityScope')).toContainText('Recorded net sales:', { timeout: 90000 })
  const categoryEvidence: Record<string, unknown> = {}
  let partition = 0
  let fullRows: Record<string, string>[] = []
  const downloadRows = async () => {
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export selected rows' }).click()
    return await readFile((await (await download).path())!, 'utf8')
  }
  for (const category of ['All', 'Medical', 'Non-Medical', 'Unclassified']) {
    await page.selectOption('#productCategorySelect', category)
    await expect(page.getByRole('button', { name: 'Export selected rows' })).toBeEnabled()
    const csv = await downloadRows(), rows = csvRecords(csv)
    const expected = (category === 'All' ? sourceRows : sourceRows.filter((row: any) => row.category === category))
      .reduce((sum: number, row: any) => sum + (row.revenue ?? 0), 0)
    const net = rows.reduce((sum, row) => sum + Number(row['Net sales PHP']), 0)
    expect(net).toBeCloseTo(expected, 2)
    expect(rows.reduce((sum, row) => sum + Number(row['Positive sales PHP']) + Number(row['Returns PHP']), 0)).toBeCloseTo(net, 2)
    expect(rows.every(row => row['Fact Delta version'] === '20' && row['Policy status'] === 'positive_sales_crossing_inclusive_v2_candidate')).toBe(true)
    expect(rows.every(row => row['Identity status'] === 'needs_review')).toBe(true)
    if (category !== 'All') { partition += net; expect(rows.every(row => row.Category === category)).toBe(true) }
    else fullRows = rows
    categoryEvidence[category] = { rows: rows.length, net_sales_php: net }
    await writeFile(testInfo.outputPath(`products-${category}.csv`), csv)
  }
  expect(partition).toBeCloseTo(fullRows.reduce((sum, row) => sum + Number(row['Net sales PHP']), 0), 2)
  await page.selectOption('#productCategorySelect', 'All')
  await page.selectOption('#productCohortSelect', '20')
  const cohortRows = csvRecords(await downloadRows())
  expect(cohortRows).toHaveLength(Math.ceil(fullRows.length * 0.2))
  expect(cohortRows[0]['Share of positive amounts (%)']).toBe(fullRows[0]['Share of positive amounts (%)'])
  await expect(page.locator('#productPriorityScope')).toContainText('CEO approval pending')
  // Search changes the table, not the complete cohort and its export.
  await page.locator('#productTableSearch').fill('NO_SUCH_PRODUCT_T09')
  await expect(page.locator('#productTable')).toContainText(/No .*match/i)
  const afterSearch = csvRecords(await downloadRows())
  expect(afterSearch).toEqual(cohortRows)
  await page.locator('#productTableSearch').fill('')
  await page.locator('#page-products').screenshot({ path: testInfo.outputPath('product-prioritization.png') })
  await expect(page.locator('#page-products')).not.toContainText(/WHO VEN|Zero-Stockout|Surge Multiplier|Hospital demand similarity/)
  expect(errors).toEqual([])
  await testInfo.attach('products-result', { body: JSON.stringify({ source: sectors.source.release, categoryEvidence, category_partition_reconciled: true,
    top20percent_rows: cohortRows.length, full_population: fullRows.length, table_search_does_not_change_export: true, browser_errors: errors }), contentType: 'application/json' })
})
