import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { installDashboardFilterPanel } from '../services/api/dashboard-filter-panel'
import * as markup from '../services/api/dashboard-markup'

// Isolated boundary fixtures exercise production renderers/listeners. They never
// replace the application's Databricks source or require a running local server.
const release = { dataset_id: 'sales-view-isolated-fixture', fact_delta_version: 17, policy_version: 'fixture-policy' }
const sources = ['dashboard-enhancements', 'sales.service', 'sales-view-helpers', 'sales-page-helpers', 'dashboard-interactions', 'dashboard-enhancement-listeners', 'weather-provider-helpers']
const runtimeErrors = new WeakMap<Page, string[]>()

async function requests(page: Page, endpoint = '/api/sales/transactions') {
  return page.evaluate(endpoint => (window as any).__salesViewRequests.filter((request: any) => request.path === endpoint), endpoint)
}

async function expectLoaded(page: Page, rows = 25) {
  await expect(page.locator('#salesDataStatus')).toContainText('Showing')
  await expect(page.locator('#salesDataTable tbody tr')).toHaveCount(rows)
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = []; runtimeErrors.set(page, errors)
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto('http://medshield.test/')
  await page.clock.setFixedTime(new Date('2026-10-08T04:00:00Z'))
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
  await page.addStyleTag({ path: path.resolve('app/overrides.css') })
  const scripts = Object.fromEntries(await Promise.all(sources.map(async name => [name, ts.transpileModule(
    await readFile(path.resolve('services/api/' + name + '.ts'), 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
  ).outputText])))
  await page.evaluate(({ scripts, markup, filter, release }) => {
    const app = window as any
    app.__salesViewRequests = []; app.__salesViewFailures = 0; app.__salesViewChangedRelease = false; app.__salesViewMissingTotals = false
    const rows = Array.from({ length: 60 }, (_, index) => {
      const year = index < 30 ? 2025 : index < 50 ? 2026 : 2017
      const revenue = index === 0 ? 240 : index === 1 ? -120 : index === 2 ? 0 : 100
      return {
        source_record_id: `isolated-record-${index + 1}-${'b'.repeat(64)}`, source_workbook: 'isolated-sales-fixture.xlsx',
        source_layout: 'single_table', source_row_number: index + 2, source_file_sha256: 'a'.repeat(64),
        canonical_group_id: 'RAW:FIXTURE_PRODUCT', transaction_evidence: index % 5 === 0 ? 'adjusted_estimated_source' : 'original_source_detail',
        year, date_delivered: `${year}-01-15`, area: index % 2 ? 'Batangas' : 'Quezon', dr_number: index === 2 ? 'ZERO-ONLY-3' : `DR-${index + 1}`,
        product: index % 3 === 0 ? 'Amoxicillin 500 mg capsules — 100 capsules per source pack, long workbook product description' : 'Paracetamol 500 mg tablets',
        quantity: index === 1 ? -3 : index === 2 ? 0 : 6, unit_cost: 40, total_cost: revenue, discount: 0,
        net_cost: revenue, trade_price_unit: 32, total_trade_price: revenue * .8, net_income: revenue * .2, margin_pct: .2,
        quality_status: index % 5 === 0 ? 'warning' : 'valid', quality_notes: index % 5 === 0 ? 'Isolated fixture: source pack needs review.' : '',
      }
    })
    const filterRows = (scope: Record<string, string>) => rows.filter(row =>
      (!scope.year || scope.year === 'all' || String(row.year) === scope.year)
      && (!scope.quality_status || scope.quality_status === 'all' || row.quality_status === scope.quality_status)
      && (!scope.search || [row.product, row.area, row.dr_number].some(value => value.toLowerCase().includes(scope.search.toLowerCase())))
      && (!scope.start_date || row.date_delivered >= scope.start_date)
      && (!scope.end_date || row.date_delivered <= scope.end_date)
      && (!scope.area || row.area === scope.area))
    const getJson = async (address: string) => {
      const url = new URL(address, 'http://isolated.gateway')
      const scope = Object.fromEntries(url.searchParams)
      app.__salesViewRequests.push({ path: url.pathname, query: scope })
      const responseRelease = { ...release, fact_delta_version: app.__salesViewChangedRelease ? 18 : 17, publication_status: 'candidate' }
      if (url.pathname === '/api/sales/status') return {
        dataset_name: 'Isolated sales fixture', release: responseRelease, source_file: 'isolated_catalog.gold.sales_fact',
        cleaning_status: 'databricks_gold_candidate', canonical_columns: ['date', 'product', 'quantity', 'net_sales'],
        quality_summary: { rows_accepted: 60, rows_extracted: 63, rows_with_warnings: 12, rows_rejected: 3, years: { '2017': 10, '2025': 30, '2026': 20 } },
      }
      if (url.pathname === '/api/sales/transactions') {
        if (app.__salesViewFailures > 0) { app.__salesViewFailures--; throw new Error('Isolated fixture gateway unavailable; retry source access.') }
        const filtered = filterRows(scope), pageSize = Number(scope.page_size), pageCount = Math.ceil(filtered.length / pageSize)
        const page = Math.min(Number(scope.page), Math.max(1, pageCount))
        return { release: responseRelease, rows: filtered.slice((page - 1) * pageSize, page * pageSize),
          pagination: { page, page_size: pageSize, total_rows: filtered.length, page_count: pageCount } }
      }
      if (url.pathname === '/api/sales/summary') {
        const filtered = filterRows(scope)
        const sum = (key: 'quantity' | 'net_cost' | 'net_income' | 'total_trade_price') => filtered.reduce((total, row) => total + row[key], 0)
        return { release: responseRelease, sums: { quantity: app.__salesViewMissingTotals ? undefined : sum('quantity'), net_cost: sum('net_cost'), net_income: app.__salesViewMissingTotals ? undefined : sum('net_income'), total_trade_price: sum('total_trade_price') },
          averages: { quantity: filtered.length ? sum('quantity') / filtered.length : 0, unit_cost: filtered.length ? 40 : 0, net_income: filtered.length ? sum('net_income') / filtered.length : 0 },
          counts: { rows: filtered.length, accepted_rows: filtered.length, sku_count: filtered.length ? 2 : 0, unique_dr_numbers: filtered.length },
          top: { area: filtered.length ? 'Quezon' : null }, gross_margin_rate: filtered.length ? 20 : null,
          financial_reconciliation: { delta: filtered.length ? 10.75 : 0, checked_rows: filtered.length, mismatched_rows: filtered.length ? 2 : 0 } }
      }
      throw new Error('Capability outside the isolated sales-view fixture: ' + url.pathname)
    }
    const modules: Record<string, any> = {
      './api-client': { getJson }, 'chart.js/auto': { default: class {} }, './dashboard-markup': markup,
      './dashboard-filter-panel': { installDashboardFilterPanel: new Function(`return (${filter})`)() },
      './dashboard-decision-charts': { renderDecisionSupportCharts: () => {}, setDecisionSupportChartData: () => {} },
      './dashboard-mcda': { installMcdaSensitivity: () => {}, renderMcdaSensitivity: () => {} },
      './weather-view-helpers': { weatherProviderLabel: () => 'fixture', renderWeatherEffects: () => {} },
      './published-forecast-adapter': { publishedForecastEvidence: () => null },
    }
    const load = (name: string): any => {
      if (modules[name]) return modules[name]
      const source = scripts[name.replace(/^\.\//, '')]
      if (!source) throw new Error('Unknown isolated module: ' + name)
      const module = { exports: {} }; modules[name] = module.exports
      new Function('require', 'module', 'exports', source)(load, module, module.exports)
      return module.exports
    }
    modules['@/lib/api'] = load('./sales.service')
    load('./dashboard-enhancements').enhanceDashboardContent(document.body)
    load('./dashboard-enhancement-listeners').installDashboardEnhancements(document.body, [], null)
  }, { scripts, markup, filter: installDashboardFilterPanel.toString(), release })
  await page.locator('#salesDataNavItem').click()
  await expectLoaded(page)
})

test.afterEach(async ({ page }) => { expect(runtimeErrors.get(page)).toEqual([]) })

test('search, multi-year quality filters, paging and reset keep summaries in the selected scope', async ({ page }) => {
  await expect(page.locator('#salesDataYear option')).toHaveText(['All Years', '2026', '2025', '2017'])
  await page.selectOption('#salesDataComputation', 'count')
  await expect(page.locator('#salesComputationGrid')).toContainText('60')
  await page.locator('#salesDataNext').click()
  await expect(page.locator('#salesDataPage')).toHaveText('Page 2 of 3')
  await expect(page.locator('#salesDataStatus')).toContainText(/26.*50.*60/)
  await page.selectOption('#salesDataPageSize', '50')
  await expectLoaded(page, 50)
  await expect(page.locator('#salesDataPage')).toHaveText('Page 1 of 2')
  expect((await requests(page)).at(-1).query).toMatchObject({ page: '1', page_size: '50' })
  await page.selectOption('#salesDataYear', '2026')
  await expectLoaded(page, 20)
  await page.selectOption('#salesDataQuality', 'warning')
  await expectLoaded(page, 4)
  await page.locator('#salesDataSearch').fill('Amoxicillin')
  await expectLoaded(page, 2)
  await expect(page.locator('#salesComputationGrid .sales-status-value').first()).toHaveText('2')
  for (const endpoint of ['/api/sales/transactions', '/api/sales/summary']) {
    expect((await requests(page, endpoint)).at(-1).query).toMatchObject({ year: '2026', quality_status: 'warning', search: 'Amoxicillin' })
  }
  await page.locator('#salesDataReset').click()
  await expectLoaded(page, 50)
  await expect(page.locator('#salesDataYear')).toHaveValue('all')
  await expect(page.locator('#salesDataQuality')).toHaveValue('all')
  await expect(page.locator('#salesDataSearch')).toHaveValue('')
  await expect(page.locator('#salesDataPageSize')).toHaveValue('50')
  await expect(page.locator('#salesDataComputation')).toHaveValue('count')
  await expect(page.locator('#salesDataPage')).toHaveText('Page 1 of 2')
  await expect(page.locator('#salesComputationGrid .sales-status-value').first()).toHaveText('60')
})

test('signed financial values stay readable and full ledger exposes source lineage', async ({ page }) => {
  const negative = page.locator('#salesDataTable tbody tr').nth(1)
  await expect(negative).toContainText('-120.00')
  await expect(negative).toContainText('-24.00')
  await expect(negative).toContainText('-3')
  const revenue = negative.locator('td').filter({ hasText: /^-120\.00$/ })
  expect(await revenue.evaluate(cell => getComputedStyle(cell).textAlign)).toBe('right')
  const product = page.locator('#salesDataTable tbody tr').first().locator('.sales-cell-product')
  await expect(product).toContainText('100 capsules per source pack')
  expect(await product.evaluate(cell => getComputedStyle(cell).whiteSpace)).toBe('normal')
  await page.selectOption('#salesDataDetail', 'full')
  await expect(page.locator('#salesDataTable')).toContainText('isolated-record-1')
  await expect(page.locator('#salesDataTable')).toContainText('isolated-sales-fixture.xlsx')
  await expect(page.locator('#salesDataTable')).toContainText('single_table')
  await expect(page.locator('#salesDataTable')).toContainText('RAW:FIXTURE_PRODUCT')
  await expect(page.locator('#salesDataTable')).toContainText('a'.repeat(64))
})

test('dataset evidence is discoverable while the transaction table stays the default focus', async ({ page }) => {
  await expect(page.locator('#salesDataEvidence')).not.toHaveAttribute('open', '')
  await expect(page.locator('#salesDatasetBadge')).toContainText(/Databricks Gold/i)
  await expect(page.locator('#salesDatasetBadge')).toContainText(/candidate/i)
  await expect(page.locator('#salesReconciliationStatus')).toContainText('2')
  await expect(page.locator('#salesDatasetSource')).toBeHidden()
  await page.locator('#salesDataEvidence > summary').click()
  await expect(page.locator('#salesDatasetSource')).toContainText('isolated_catalog.gold.sales_fact')
  await expect(page.locator('#salesPipelineNote')).toContainText('60')
  await expect(page.locator('#salesFinancialReconciliation')).toContainText('2 of 60')
  await expect(page.locator('#salesDataEvidence')).toContainText('Mixed packs are not equivalent units')
  await page.locator('#salesDataEvidence > summary').click()
  await expect(page.locator('#salesDataTableWrap')).toHaveAttribute('aria-label', 'Sales transactions')
  await page.locator('#salesDataTableWrap').focus()
  await expect(page.locator('#salesDataTableWrap')).toBeFocused()
})

test('no matching records and rejected-row browsing show an honest empty state', async ({ page }) => {
  await page.locator('#salesDataSearch').fill('no such product in this fixture')
  await expect(page.locator('#salesDataTable')).toContainText('No transactions match the selected filters.')
  await expect(page.locator('#salesDataPage')).toHaveText('Page 0 of 0')
  await expect(page.locator('#salesDataPrevious')).toBeDisabled()
  await expect(page.locator('#salesDataNext')).toBeDisabled()
  await page.locator('#salesDataReset').click()
  await expectLoaded(page)
  await page.selectOption('#salesDataQuality', 'rejected')
  await expect(page.locator('#salesDataTable')).toContainText('No transactions match the selected filters.')
  await expect(page.locator('#salesDataPage')).toHaveText('Page 0 of 0')
  await expect(page.locator('#salesDataTable')).not.toContainText('Amoxicillin')
})

test('missing summary measures remain unavailable while observed zero remains zero', async ({ page }) => {
  await page.evaluate(() => { (window as any).__salesViewMissingTotals = true })
  await page.selectOption('#salesDataComputation', 'sum')
  await expect(page.locator('#salesComputationGrid .sales-status-value').nth(0)).toHaveText('Unavailable')
  await expect(page.locator('#salesComputationGrid .sales-status-value').nth(2)).toHaveText('Unavailable')
  await page.evaluate(() => { (window as any).__salesViewMissingTotals = false })
  await page.locator('#salesDataSearch').fill('ZERO-ONLY-3')
  await expectLoaded(page, 1)
  await expect(page.locator('#salesComputationGrid .sales-status-value').nth(0)).toHaveText('0')
  await expect(page.locator('#salesComputationGrid .sales-status-value').nth(1)).toHaveText('0.00')
  await expect(page.locator('#salesComputationGrid .sales-status-value').nth(2)).toHaveText('0.00')
})

test('source failure clears stale values and refresh retries the same selected scope', async ({ page }) => {
  await page.selectOption('#salesDataYear', '2026')
  await expectLoaded(page, 20)
  await page.evaluate(() => { (window as any).__salesViewFailures = 1 })
  await page.locator('#salesDataRefresh').click()
  await expect(page.locator('#salesDataStatus')).toContainText('Isolated fixture gateway unavailable')
  await expect(page.locator('#salesDataTable')).not.toContainText('Amoxicillin')
  await expect(page.locator('#salesComputationGrid .sales-status-value')).toHaveCount(0)
  await expect(page.locator('#salesFinancialReconciliation')).toBeEmpty()
  await expect(page.locator('#salesDataPrevious')).toBeDisabled()
  await expect(page.locator('#salesDataNext')).toBeDisabled()
  const failed = (await requests(page)).at(-1).query
  await page.locator('#salesDataRefresh').click()
  await expectLoaded(page, 20)
  expect((await requests(page)).at(-1).query).toEqual(failed)
  await expect(page.locator('#salesDataYear')).toHaveValue('2026')
})

test('investigation reset retains exact dates, dimensions and release across paging and refresh', async ({ page }) => {
  const scope = { start_date: '2025-01-10', end_date: '2025-04-20', product_id: 'RAW:FIXTURE_PRODUCT', sector: 'Private', region: 'CALABARZON', territory: 'Quezon', category: 'Medical' }
  await page.evaluate(({ scope, release }) => window.dispatchEvent(new CustomEvent('medshield:transactions-open', { detail: { ...scope, label: 'Isolated selected transaction scope', release } })), { scope, release })
  await expectLoaded(page)
  await expect(page.locator('#salesDataYear')).toBeDisabled()
  await expect(page.locator('#salesDataDetail')).toHaveValue('full')
  await expect(page.locator('#salesDrilldownScope')).toContainText('2025-01-10')
  await page.locator('#salesDataNext').click()
  await expect(page.locator('#salesDataPage')).toHaveText('Page 2 of 2')
  await page.locator('#salesDataSearch').fill('Amoxicillin')
  await expectLoaded(page, 10)
  await page.selectOption('#salesDataQuality', 'warning')
  await expectLoaded(page, 2)
  await page.locator('#salesDataReset').click()
  await expectLoaded(page)
  await expect(page.locator('#salesDataYear')).toBeDisabled()
  await expect(page.locator('#salesDrilldownContext')).toBeVisible()
  await expect(page.locator('#salesDataPage')).toHaveText('Page 1 of 2')
  await page.locator('#salesDataRefresh').click()
  await expectLoaded(page)
  for (const endpoint of ['/api/sales/transactions', '/api/sales/summary']) {
    expect((await requests(page, endpoint)).at(-1).query).toMatchObject({ ...scope, year: 'all', search: '', quality_status: 'all' })
  }
  await page.evaluate(() => { (window as any).__salesViewChangedRelease = true })
  await page.locator('#salesDataRefresh').click()
  await expect(page.locator('#salesDataStatus')).toContainText('source release changed')
  await expect(page.locator('#salesDataTable')).not.toContainText('isolated-record-1')
  await expect(page.locator('#salesComputationGrid .sales-status-value')).toHaveCount(0)
})

for (const width of [1440, 926, ...(process.env.MEDSHIELD_QA_MOBILE === 'true' ? [390] : [])]) {
  test(`sales browser stays within ${width}px and preserves a scrollable ledger`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(page.locator('#salesDataTable')).toBeVisible()
    await expect(page.locator('#salesDataEvidence')).not.toHaveAttribute('open', '')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    for (const selector of ['#page-sales-data .uploaded-data-panel', '#salesDataSearch', '#salesDataYear', '#salesDataQuality', '#salesDataRefresh', '#salesDataTableWrap']) {
      const bounds = await page.locator(selector).boundingBox()
      expect(bounds, selector).not.toBeNull()
      expect(bounds!.x, selector).toBeGreaterThanOrEqual(0)
      expect(bounds!.x + bounds!.width, selector).toBeLessThanOrEqual(width)
    }
    const topbar = await page.locator('.topbar').boundingBox()
    const refresh = await page.locator('#salesDataRefresh').boundingBox()
    expect(refresh!.y).toBeGreaterThanOrEqual(topbar!.y + topbar!.height)
    const compactScreenshot = testInfo.outputPath(`sales-data-compact-${width}.png`)
    await page.screenshot({ path: compactScreenshot, fullPage: true })
    await testInfo.attach(`sales-data-compact-${width}`, { path: compactScreenshot, contentType: 'image/png' })
    await page.selectOption('#salesDataDetail', 'full')
    await expect(page.locator('#salesDataTable')).toContainText('isolated-record-1')
    expect((await page.locator('#salesDataTable tbody tr').first().locator('td').first().boundingBox())!.width).toBeLessThanOrEqual(204)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    const scroll = await page.locator('#salesDataTableWrap').evaluate(element => {
      element.scrollLeft = element.scrollWidth
      return { client: element.clientWidth, content: element.scrollWidth, position: element.scrollLeft }
    })
    expect(scroll.content).toBeGreaterThan(scroll.client)
    expect(scroll.position).toBeGreaterThan(0)
    const ledgerScreenshot = testInfo.outputPath(`sales-data-ledger-${width}.png`)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: ledgerScreenshot, fullPage: true })
    await testInfo.attach(`sales-data-ledger-${width}`, { path: ledgerScreenshot, contentType: 'image/png' })
  })
}
