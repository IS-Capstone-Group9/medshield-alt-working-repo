import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'
import { installDashboardFilterPanel } from '../services/api/dashboard-filter-panel'
import * as markup from '../services/api/dashboard-markup'

const release = { dataset_id: 'diagnostic-fixture', fact_delta_version: 17, policy_version: 'fixture-policy' }
const sources = ['dashboard-enhancements', 'diagnostics.service', 'diagnostic-panel', 'sales.service', 'sales-view-helpers', 'sales-page-helpers', 'dashboard-interactions', 'dashboard-enhancement-listeners', 'stl-panel', 'stl-view-model', 'weather-provider-helpers']
const runtimeErrors = new WeakMap<Page, string[]>()

async function scopeRequests(page: Page, endpoint = '/api/sales/diagnostics') {
  return page.evaluate(endpoint => (window as any).__diagnosticRequests.filter((request: any) => request.path === endpoint), endpoint)
}

async function selectChartPoint(page: Page, id: string, index: number, datasetIndex = 0) {
  await page.evaluate(({ id, index, datasetIndex }) => {
    const chart = (window as any).Chart.getChart(document.getElementById(id))
    chart.options.onClick({}, [{ index, datasetIndex }], chart)
  }, { id, index, datasetIndex })
}

async function openScope(page: Page, scope: Record<string, string>) {
  await page.evaluate(scope => window.dispatchEvent(new CustomEvent('medshield:diagnostic-open', { detail: scope })), scope)
  await expect(page.locator('#diagnosticStatus')).toContainText('Recorded contribution evidence loaded')
  await expect(page.locator('#diagnosticRetry')).toBeHidden()
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = []; runtimeErrors.set(page, errors)
  page.on('pageerror', error => errors.push(error.message))
  await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto('http://medshield.test/')
  await page.clock.setFixedTime(new Date('2026-10-05T04:00:00Z'))
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
  await page.addStyleTag({ path: path.resolve('app/overrides.css') })
  await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
  const scripts = Object.fromEntries(await Promise.all(sources.map(async name => [name, ts.transpileModule(
    await readFile(path.resolve('services/api/' + name + '.ts'), 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
  ).outputText])))
  await page.evaluate(({ scripts, markup, filter, release }) => {
    const app = window as any
    app.__diagnosticRequests = []; app.__diagnosticFailures = 0; app.__invalidPartition = false; app.__changedRelease = false; app.__changedDiagnosticRelease = false
    app.__opened = []
    window.addEventListener('medshield:diagnostic-open', (event: Event) => app.__opened.push((event as CustomEvent).detail))
    const financial = (revenue: number) => ({ revenue, income: revenue * .2, margin_revenue_basis: revenue, margin_pct: revenue > 0 ? 20 : null,
      negative_sales: revenue < 0 ? revenue : 0, rows: 2, net_sales_eligible_rows: 2, gross_margin_eligible_rows: 2,
      original_source_rows: 1, adjusted_estimated_rows: 1, unresolved_product_rows: 1 })
    const contribution = (key: string, label: string, current: number, prior: number, delta: number) => ({ key, label, current, prior, delta,
      contribution_pct: delta, comparison_status: 'matched_observed', identity_status: 'needs_review', current_financial: financial(current), prior_financial: financial(prior) })
    const getJson = async (address: string) => {
      const url = new URL(address, 'http://fixture.gateway')
      const scope = Object.fromEntries(url.searchParams)
      app.__diagnosticRequests.push({ path: url.pathname, query: scope })
      if (url.pathname === '/api/sales/diagnostics') {
        if (app.__diagnosticFailures > 0) { app.__diagnosticFailures--; throw new Error('Fixture gateway unavailable; retry source access.') }
        const prior = (date: string) => String(Number(date.slice(0, 4)) - 1) + date.slice(4)
        const narrow = Boolean(scope.product_id || scope.area || scope.sector || scope.start_date.slice(0, 7) === scope.end_date.slice(0, 7))
        const nextMonth = new Date(Date.UTC(Number(scope.start_date.slice(0, 4)), Number(scope.start_date.slice(5, 7)), 1)).toISOString().slice(0, 7)
        const delta = narrow ? 200 : 100
        const current = delta + 200
        const groups = {
          month: narrow ? [contribution(scope.start_date.slice(0, 7), scope.start_date.slice(0, 7), current, 200, delta)]
            : [contribution(scope.start_date.slice(0, 7), scope.start_date.slice(0, 7), 400, 200, 200), contribution(nextMonth, nextMonth, -100, 0, -100)],
          product: narrow ? [contribution(scope.product_id || 'RAW:PRODUCT_A', 'Canonical Product A', current, 200, delta)]
            : [contribution('RAW:PRODUCT_A', 'Canonical Product A', 400, 200, 200), contribution('RAW:RETURN_B', 'Return label B', -100, 0, -100)],
          area: narrow ? [contribution(scope.area || 'Quezon', scope.area || 'Quezon', current, 200, delta)]
            : [contribution('Quezon', 'Quezon', 400, 200, 200), contribution('Batangas', 'Batangas', -100, 0, -100)],
          sector: narrow ? [contribution(scope.sector || 'Private', scope.sector || 'Private', current, 200, delta)]
            : [contribution('Private', 'Private', 400, 200, 200), contribution('Government', 'Government', -100, 0, -100)],
        }
        for (const rows of Object.values(groups)) for (const row of rows) row.contribution_pct = row.delta / delta * 100
        if (app.__invalidPartition) groups.product[0].delta += 1
        return { release: { ...release, fact_delta_version: app.__changedDiagnosticRelease ? 18 : 17 }, source: { system_of_record: 'Databricks Gold' }, scope: { ...scope, prior_start_date: prior(scope.start_date), prior_end_date: prior(scope.end_date) },
          totals: { current, prior: 200, delta, growth_pct: delta / 2, comparison_status: 'matched_observed', matched_months: narrow ? 1 : 2, expected_months: narrow ? 1 : 4,
            current_rows: 2, prior_rows: 2, current_eligible_rows: 2, prior_eligible_rows: 2, current_financial: financial(current), prior_financial: financial(200) },
          coverage: { missing_current_months: [], missing_prior_months: ['2024-03'], unmatched_months: ['2025-03'], partial_boundary_months: ['2025-01', '2025-04'], coverage_status: 'partial' },
          contributions: groups, causal_status: 'unverified', limitations: ['Buyer and geography labels are derived; no business cause is verified.'] }
      }
      if (url.pathname === '/api/sales/status') return { source_file: 'fixture', cleaning_status: 'candidate', canonical_columns: ['date', 'product'], quality_summary: {
        rows_accepted: 50, rows_extracted: 50, rows_with_warnings: 0, rows_rejected: 0, years: { '2025': 50 } } }
      if (url.pathname === '/api/sales/transactions') {
        const page = Number(scope.page), version = app.__changedRelease ? 18 : 17
        return { release: { ...release, fact_delta_version: version, publication_status: 'candidate' }, pagination: { page, page_size: 25, total_rows: 50, page_count: 2 },
          rows: Array.from({ length: 25 }, (_, i) => ({ source_record_id: `fixture-record-${(page - 1) * 25 + i + 1}`, source_workbook: 'fixture.xlsx', source_sheet: '2025', source_row_number: i + 1,
            canonical_group_id: scope.product_id || 'RAW:PRODUCT_A', transaction_evidence: 'original_source', area: scope.area || 'Quezon', product: 'Canonical Product A', date_delivered: scope.start_date,
            quantity: 1, net_cost: app.__changedRelease ? 999999 : 20, total_trade_price: 16, net_income: 4, quality_status: 'accepted' })) }
      }
      if (url.pathname === '/api/sales/summary') return { release: { ...release, publication_status: 'candidate' }, sums: { net_cost: 500, net_income: 100, total_trade_price: 400 },
        averages: {}, counts: { rows: 50 }, top: { area: 'Quezon' }, gross_margin_rate: 20,
        financial_reconciliation: { delta: 0, checked_rows: 50, mismatched_rows: 0 } }
      if (url.pathname === '/api/seasonality/stl') return { release, parameters: { period: 12, seasonal_window: 13, robust: true, missing_policy: 'no_fill' }, rows: [
        { period: '2023-01', observed: 100, trend: 95, seasonal: 3, residual: 2, segment_start: '2023-01', segment_end: '2023-02' },
        { period: '2023-02', observed: 150, trend: 100, seasonal: 5, residual: 45, segment_start: '2023-01', segment_end: '2023-02' },
      ] }
      throw new Error('This analytical capability is not part of the isolated fixture: ' + url.pathname)
    }
    const modules: Record<string, any> = {
      './api-client': { getJson }, 'chart.js/auto': { default: app.Chart }, './dashboard-markup': markup,
      './dashboard-filter-panel': { installDashboardFilterPanel: new Function(`return (${filter})`)() },
      './dashboard-decision-charts': { renderDecisionSupportCharts: () => {}, setDecisionSupportChartData: () => {} },
      './dashboard-mcda': { installMcdaSensitivity: () => {}, renderMcdaSensitivity: () => {} },
      './weather-view-helpers': { weatherProviderLabel: () => 'fixture' }, './published-forecast-adapter': { publishedForecastEvidence: () => null },
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
    app.__installDiagnostic = () => load('./diagnostic-panel').installDiagnosticPanel(document.body)
    app.__installListeners = () => load('./dashboard-enhancement-listeners').installDashboardEnhancements(document.body, [], null)
    app.__installStl = () => load('./stl-panel').installStlPanel(document.body)
    window.fetch = async () => new Response('{}', { status: 503 })
  }, { scripts, markup, filter: installDashboardFilterPanel.toString(), release })
  await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())
  await page.evaluate(release => {
    const app = window as any
    app.__installDiagnostic(); app.__installListeners()
    app.applyDatasetPatch({ release, monthly: [
      { period: '2024-02', revenue: 50, income: 10, margin_revenue_basis: 50 },
      { period: '2025-01', revenue: 100, income: 20, margin_revenue_basis: 100 },
      { period: '2025-04', revenue: -20, income: -4, margin_revenue_basis: -20 },
    ], year_summary: [] })
    app.showPage('revenue'); app.setDescriptivePeriod('custom'); app.setCustomDateRange('2025-01-01', '2025-04-30'); app.setDescriptiveGranularity('monthly'); app.buildCharts()
  }, release)
})

test.afterEach(async ({ page }) => { expect(runtimeErrors.get(page)).toEqual([]) })

test('chart drilldown admits observed zero and excludes missing, estimates and prior-series selections', async ({ page }) => {
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({ monthly: [
      { period: '2024-02', revenue: 50, income: 10, margin_revenue_basis: 50 },
      { period: '2025-01', revenue: 0, income: 0, margin_revenue_basis: 0 },
      { period: '2025-04', revenue: -20, income: -4, margin_revenue_basis: -20 },
    ] })
    app.buildCharts()
  })
  await selectChartPoint(page, 'revenueDetailChart', 0)
  await expect(page.locator('#diagnosticStatus')).toContainText('Recorded contribution evidence loaded')
  expect((await scopeRequests(page)).at(-1).query).toEqual({ start_date: '2025-01-01', end_date: '2025-01-31' })
  const before = (await scopeRequests(page)).length
  await selectChartPoint(page, 'revenueDetailChart', 1)
  await selectChartPoint(page, 'revenueDetailChart', 2)
  expect((await scopeRequests(page)).length).toBe(before)
  await page.evaluate(() => { const app = window as any; app.setComparisonMode('yoy'); app.buildCharts() })
  await selectChartPoint(page, 'revenueDetailChart', 0, 2)
  expect((await scopeRequests(page)).length).toBe(before)
})

test('chart point scope keeps exact partial custom dates instead of broadening month boundaries', async ({ page }) => {
  await page.evaluate(() => {
    const app = window as any
    app.setSalesSectorsData({ rows: [{ date: '2025-01-15', period: '2025-01', revenue: 100, income: 20, margin_revenue_basis: 100,
      positive_sales: 100, returns_value: 0, product: 'A', sector: 'Private', channel: 'Pharma', territory: 'Quezon', row_count: 1 }], source: { file: 'fixture', excluded: {} } })
    app.setCustomDateRange('2025-01-10', '2025-04-20'); app.buildCharts()
  })
  await selectChartPoint(page, 'revenueDetailChart', 0)
  await expect(page.locator('#diagnosticStatus')).toContainText('Recorded contribution evidence loaded')
  expect((await scopeRequests(page)).at(-1).query).toEqual({ start_date: '2025-01-10', end_date: '2025-01-31' })
  await expect(page.locator('#diagnosticStart')).toHaveValue('2025-01-10')
})

test('last-N monthly date scope stays exact when the chart uses yearly display grain', async ({ page }) => {
  await page.evaluate(() => {
    const app = window as any
    app.setDescriptivePeriod('3'); app.setDescriptiveGranularity('yearly'); app.buildCharts()
  })
  const scope = await page.evaluate(() => (window as any).getDiagnosticScope())
  expect(scope.start_date).toBe('2026-08-01')
  expect(scope.end_date).toBe('2026-10-05')
  await page.locator('[data-sales-output-tab="diagnostics"]').click()
  await page.locator('#diagnosticScope').click()
  await expect(page.locator('#diagnosticStatus')).toContainText('Recorded contribution evidence loaded')
  expect((await scopeRequests(page)).at(-1).query).toEqual({ start_date: '2026-08-01', end_date: '2026-10-05' })
})

test('chart-to-investigation transition withholds data when the source release changes', async ({ page }) => {
  expect(await page.evaluate(() => (window as any).getDiagnosticScope().expected_release)).toEqual(release)
  await page.evaluate(() => { (window as any).__changedDiagnosticRelease = true })
  await selectChartPoint(page, 'revenueDetailChart', 0)
  await expect(page.locator('#diagnosticStatus')).toContainText('source release changed since these charts loaded')
  await expect(page.locator('#diagnosticResults')).toBeHidden()
  await expect(page.locator('#diagnosticContributionTable')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible()
})

test('all dimensions retain signed offsets, nested filters and back navigation without losing draft notes on view changes', async ({ page }) => {
  await openScope(page, { start_date: '2025-01-10', end_date: '2025-04-20', category: 'Medical', region: 'CALABARZON', territory: 'Quezon' })
  for (const dimension of ['month', 'product', 'area', 'sector']) {
    await page.selectOption('#diagnosticDimension', dimension)
    const values = await page.evaluate(() => {
      const chart = (window as any).Chart.getChart(document.querySelector('#diagnosticResults canvas'))
      return chart.data.datasets[0].data
    })
    expect(values).toEqual([200, -100])
    expect(values.reduce((sum: number, value: number) => sum + value, 0)).toBe(100)
    await expect(page.locator('#diagnosticContributionTable')).toContainText('-100.00%')
  }
  await page.locator('#diagnosticNotes').fill('Review owner: Finance. Contract evidence pending.')
  await page.selectOption('#diagnosticDimension', 'product')
  await expect(page.locator('#diagnosticNotes')).toHaveValue('Review owner: Finance. Contract evidence pending.')
  await page.getByRole('button', { name: 'Inspect Canonical Product A', exact: true }).click()
  await expect(page.locator('#diagnosticStatus')).toContainText('Recorded contribution evidence loaded')
  await page.selectOption('#diagnosticDimension', 'area')
  await page.getByRole('button', { name: 'Inspect Quezon', exact: true }).click()
  await expect(page.locator('#diagnosticStatus')).toContainText('Recorded contribution evidence loaded')
  expect((await scopeRequests(page)).at(-1).query).toEqual({ start_date: '2025-01-10', end_date: '2025-04-20', product_id: 'RAW:PRODUCT_A', area: 'Quezon', region: 'CALABARZON', territory: 'Quezon', category: 'Medical' })
  await expect(page.locator('#diagnosticBreadcrumb')).toContainText('RAW:PRODUCT_A')
  await page.getByRole('button', { name: 'Back one level' }).click()
  await expect.poll(async () => (await scopeRequests(page)).at(-1).query.area).toBeUndefined()
  expect((await scopeRequests(page)).at(-1).query.product_id).toBe('RAW:PRODUCT_A')
  await page.getByRole('button', { name: 'Back one level' }).click()
  await expect.poll(async () => (await scopeRequests(page)).at(-1).query.product_id).toBeUndefined()
  await expect(page.getByRole('button', { name: 'Back one level' })).toBeDisabled()
})

test('canonical product inspection uses reporting identity and retains category scope', async ({ page }) => {
  await page.evaluate(() => {
    const app = window as any
    app.setSalesSectorsData({ rows: [{ date: '2025-01-15', period: '2025-01', product: 'SOURCE ALIAS A', canonical_title: 'Canonical Product A', canonical_group_id: 'RAW:PRODUCT_A', category: 'Medical', identity_status: 'needs_review',
      revenue: 100, positive_sales: 100, returns_value: 0, income: 20, margin_revenue_basis: 100, sector: 'Private', channel: 'Pharma', territory: 'Quezon', row_count: 1 }], source: { file: 'fixture', excluded: {} } })
    app.showPage('products'); app.buildCharts()
  })
  await page.selectOption('#productCategorySelect', 'Medical')
  // The deferred navigation render can replace an evidence panel opened before
  // layout has settled. Retry the complete user action against fresh locators.
  await expect(async () => {
    await page.getByLabel('View evidence for Canonical Product A', { exact: true }).click({ timeout: 1000 })
    await page.getByRole('button', { name: 'Inspect records for Canonical Product A', exact: true }).click({ timeout: 1000 })
  }).toPass({ timeout: 5000 })
  await expect(page.locator('#diagnosticStatus')).toContainText('Recorded contribution evidence loaded')
  expect((await scopeRequests(page)).at(-1).query.product_id).toBe('RAW:PRODUCT_A')
  expect((await scopeRequests(page)).at(-1).query.product_id).not.toBe('SOURCE ALIAS A')
  expect((await scopeRequests(page)).at(-1).query.category).toBe('Medical')
})

test('unavailable evidence retries the same scope and inconsistent partitions remain withheld', async ({ page }) => {
  await page.evaluate(() => { (window as any).__diagnosticFailures = 1 })
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('medshield:diagnostic-open', { detail: { start_date: '2025-01-01', end_date: '2025-04-30', product_id: 'RAW:PRODUCT_A' } })))
  await expect(page.locator('#diagnosticStatus')).toContainText('Fixture gateway unavailable')
  await expect(page.locator('#diagnosticResults')).toBeHidden()
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.locator('#diagnosticStatus')).toContainText('Recorded contribution evidence loaded')
  const requests = await scopeRequests(page)
  expect(requests[0].query).toEqual(requests[1].query)
  await page.evaluate(() => { (window as any).__invalidPartition = true })
  await page.getByRole('button', { name: 'Analyze dates' }).click()
  await expect(page.locator('#diagnosticStatus')).toContainText('Contribution totals do not reconcile')
  await expect(page.locator('#diagnosticResults')).toBeHidden()
  await expect(page.locator('#diagnosticContributionTable')).toHaveCount(0)
})

test('export keeps release identity, every signed partition and unverified causal status with review notes', async ({ page }) => {
  await openScope(page, { start_date: '2025-01-10', end_date: '2025-04-20' })
  await page.locator('#diagnosticNotes').fill('Review owner: Finance. Invoice 42 requested; cause unverified.')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export investigation evidence' }).click()
  const data = JSON.parse(await readFile((await (await download).path())!, 'utf8'))
  expect(data.release).toEqual(release)
  expect(data.source.system_of_record).toBe('Databricks Gold')
  expect(data.causal_status).toBe('unverified')
  expect(data.investigation.status).toBe('unverified')
  expect(data.investigation.notes).toContain('Invoice 42 requested')
  expect(data.investigation.required_evidence).toHaveLength(4)
  for (const dimension of ['month', 'product', 'area', 'sector']) expect(data.contributions[dimension].reduce((sum: number, row: any) => sum + row.delta, 0)).toBe(data.totals.delta)
  await expect(page.locator('#diagnosticResults')).toContainText('Original source rows: 1; adjusted/estimated rows: 1; unresolved product rows: 1')
})

test('transaction ledger retains identical date and dimension filters in pagination and summary and blocks a changed release', async ({ page }) => {
  const scope = { start_date: '2025-01-10', end_date: '2025-04-20', product_id: 'RAW:PRODUCT_A', area: 'Quezon', sector: 'Private', region: 'CALABARZON', territory: 'Quezon', category: 'Medical' }
  await openScope(page, scope)
  await page.getByRole('button', { name: 'Current transactions', exact: true }).click()
  await expect(page.locator('#salesDataTable tbody tr')).toHaveCount(25)
  await expect(page.locator('#salesDataYear')).toBeDisabled()
  await expect(page.locator('#salesDrilldownScope')).toContainText('RAW:PRODUCT_A')
  await page.locator('#salesDataNext').click()
  await expect(page.locator('#salesDataPage')).toHaveText('Page 2 of 2')
  await expect(page.locator('#salesDataTable')).toContainText('fixture-record-26')
  const rows = await scopeRequests(page, '/api/sales/transactions'), summaries = await scopeRequests(page, '/api/sales/summary')
  expect(rows.at(-1).query.page).toBe('2')
  for (const request of [...rows, ...summaries]) {
    for (const [key, value] of Object.entries(scope)) expect(request.query[key], key).toBe(value)
    expect(request.query.year).toBe('all')
  }
  await page.evaluate(() => { (window as any).__changedRelease = true })
  await page.locator('#salesDataPrevious').click()
  await expect(page.locator('#salesDataStatus')).toContainText('source release changed')
  await expect(page.locator('#salesDataTable')).not.toContainText('fixture-record-1')
  await expect(page.locator('#salesDataTable')).not.toContainText('999,999')
})

test('prior ledger dates and STL unusual-period investigation keep their documented independent scope', async ({ page }) => {
  await openScope(page, { start_date: '2025-01-10', end_date: '2025-04-20', product_id: 'RAW:PRODUCT_A' })
  await page.getByRole('button', { name: 'Prior transactions', exact: true }).click()
  await expect(page.locator('#salesDataPage')).toHaveText('Page 1 of 2')
  expect((await scopeRequests(page, '/api/sales/transactions')).at(-1).query).toMatchObject({ start_date: '2024-01-10', end_date: '2024-04-20', product_id: 'RAW:PRODUCT_A' })
  await page.locator('#salesDrilldownBack').click()
  await page.evaluate(() => { (window as any).__installStl() })
  await expect(page.locator('#descriptiveStlPanel')).toContainText('2 qualifying months')
  await page.locator('[data-sales-output-tab="seasonality"]').click()
  await page.locator('#stlResidualDetail > summary').click()
  await page.getByRole('button', { name: /Investigate.*2023-02/ }).click()
  await expect.poll(async () => (await scopeRequests(page)).at(-1).query.start_date).toBe('2023-02-01')
  expect((await scopeRequests(page)).at(-1).query.end_date).toBe('2023-02-28')
  expect((await scopeRequests(page)).at(-1).query.product_id).toBeUndefined()
  expect(await page.evaluate(() => (window as any).__opened.at(-1).expected_release)).toEqual(release)
})

for (const width of [1440, 375]) test(`diagnostic evidence fits ${width}px and remains inspectable without page overflow`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 })
  await openScope(page, { start_date: '2025-01-10', end_date: '2025-04-20', product_id: 'RAW:PRODUCT_A', category: 'Medical', region: 'CALABARZON', territory: 'Quezon' })
  await page.selectOption('#diagnosticDimension', 'product')
  await expect(page.locator('#diagnosticContributionTable')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  const panel = await page.locator('#salesDiagnosticInvestigation').boundingBox()
  expect(panel!.x).toBeGreaterThanOrEqual(0)
  expect(panel!.x + panel!.width).toBeLessThanOrEqual(width)
  const chart = await page.locator('#diagnosticResults canvas').boundingBox()
  expect(chart!.width).toBeGreaterThan(0)
  expect(chart!.height).toBeLessThanOrEqual(310)
  const screenshot = testInfo.outputPath(`diagnostic-panel-${width}.png`)
  await page.locator('#salesDiagnosticInvestigation').screenshot({ path: screenshot })
  await testInfo.attach(`diagnostic-panel-${width}`, { path: screenshot, contentType: 'image/png' })
})
