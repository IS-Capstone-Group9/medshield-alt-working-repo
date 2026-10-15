import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

// Isolated responses exercise the actual gateway boundary. They never populate
// the running dashboard or substitute for Databricks integration evidence.
const base: Record<string, any> = {
  '/api/dashboard_status': { source: 'databricks', mode: 'live', loaded_at: '2026-10-09T00:00:00Z', message: 'isolated contract fixture' },
  '/api/summary': { total_revenue: 100, total_income: 20, total_transactions: 1, avg_margin: 20 },
  '/api/monthly': [{ period: '2025-01', revenue: 100, income: 20 }],
  '/api/by_area': [{ area: 'Quezon', revenue: 100, income: 20 }],
  '/api/products?limit=15': [{ product: 'Revenue-only source label', revenue: 100, income: 20, qty: null, abc: 'A', pct_of_total: 100 }],
  '/api/year_summary': [{ year: '2025', revenue: 100, income: 20, transactions: 1 }],
  '/api/seasonality': [{ month: 'Jan', avg_revenue: 100 }],
  '/api/forecasts': [], '/api/external_signals': [], '/api/inventory_recommendations': [], '/api/regional_priorities': [], '/api/model_evaluation': [],
}

async function load(responses: Record<string, any>) {
  const compiled = ts.transpileModule(await readFile(path.resolve('services/api/dashboard.service.ts'), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  const module = { exports: {} as any }
  new Function('require', 'module', 'exports', compiled)((name: string) => {
    if (name === './api-client') return { getJson: async (endpoint: string) => responses[endpoint] }
    throw new Error('Unexpected isolated dependency: ' + name)
  }, module, module.exports)
  return module.exports.loadDashboardData()
}

test('nullable financial measures preserve unavailable values and observed zero independently', async () => {
  const responses = structuredClone(base)
  responses['/api/summary'] = { ...responses['/api/summary'], total_income: null, avg_margin: null }
  responses['/api/monthly'].push({ period: '2025-02', revenue: null, income: null }, { period: '2025-03', revenue: 0, income: 0 })
  responses['/api/products?limit=15'][0].income = null
  responses['/api/products?limit=15'].push({ product: 'No eligible sales label', revenue: null, income: null, qty: null, abc: 'Unclassified', pct_of_total: null })
  responses['/api/by_area'][0].income = null
  responses['/api/by_area'].push({ area: 'No eligible territory', revenue: null, income: null })
  responses['/api/year_summary'][0].income = null
  responses['/api/year_summary'].push({ year: '2026', revenue: null, income: null, transactions: 1 })
  const result = await load(responses)
  expect(result.summary.total_revenue).toBe(100)
  expect(result.summary.total_income).toBeNull()
  expect(result.monthly.map((row: any) => row.revenue)).toEqual([100, null, 0])
  expect(result.products.map((row: any) => row.income)).toEqual([null, null])
  expect(result.byArea[1].revenue).toBeNull()
  expect(result.yearSummary[1].revenue).toBeNull()
})

test('observations without any eligible revenue remain a valid unavailable population', async () => {
  const responses = structuredClone(base)
  for (const endpoint of ['/api/monthly', '/api/by_area', '/api/products?limit=15', '/api/year_summary']) {
    responses[endpoint][0].revenue = null
    responses[endpoint][0].income = null
  }
  responses['/api/summary'] = { ...responses['/api/summary'], total_revenue: null, total_income: null, avg_margin: null }
  responses['/api/seasonality'][0].avg_revenue = null
  const result = await load(responses)
  expect(result.monthly[0].revenue).toBeNull()
  expect(result.summary.total_revenue).toBeNull()
})

for (const invalid of [undefined, '', '100', 'bad', false, NaN, Infinity, -Infinity, [], {}]) {
  const description = invalid === undefined ? 'undefined' : typeof invalid === 'number' ? String(invalid) : JSON.stringify(invalid)
  test(`malformed measure ${description} fails visibly at every core boundary`, async () => {
    for (const endpoint of ['/api/monthly', '/api/by_area', '/api/products?limit=15', '/api/year_summary', '/api/seasonality', '/api/summary']) {
      const responses = structuredClone(base)
      if (endpoint === '/api/summary') responses[endpoint].total_income = invalid
      else responses[endpoint][0][endpoint === '/api/seasonality' ? 'avg_revenue' : 'income'] = invalid
      await expect(load(responses)).rejects.toThrow('Databricks dashboard data is incomplete:')
    }
  })
}

test('null rows, blank identifiers, invalid periods and non-Databricks source fail visibly', async () => {
  for (const endpoint of ['/api/monthly', '/api/by_area', '/api/products?limit=15', '/api/year_summary', '/api/seasonality']) {
    const responses = structuredClone(base)
    responses[endpoint] = [null]
    await expect(load(responses)).rejects.toThrow('Databricks dashboard data is incomplete:')
  }
  for (const [endpoint, field, value] of [
    ['/api/products?limit=15', 'product', '  '], ['/api/by_area', 'area', ''],
    ['/api/monthly', 'period', '2025-13'], ['/api/year_summary', 'year', '2025extra'],
  ]) {
    const responses = structuredClone(base)
    responses[endpoint][0][field] = value
    await expect(load(responses)).rejects.toThrow('Databricks dashboard data is incomplete:')
  }
  await expect(load({ ...base, '/api/dashboard_status': { source: 'local', mode: 'live' } }))
    .rejects.toThrow('The gateway did not return a live Databricks data contract')
})

test('nullable summary cards display unavailable and ledger cells show a missing marker', async ({ page }) => {
  await page.setContent(`<div class="medshield-root">
    <span id="kpiOverviewTotalRevenue"></span><span id="kpiOverviewGrossProfit"></span>
    <span id="kpiOverviewTransactions"></span><span id="kpiOverviewGrossMargin"></span>
    <div id="salesComputationGrid"></div>
  </div>`)
  const scripts = Object.fromEntries(await Promise.all(['dashboard-interactions', 'sales-view-helpers'].map(async name => [name,
    ts.transpileModule(await readFile(path.resolve(`services/api/${name}.ts`), 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText,
  ])))
  await page.evaluate(async ({ scripts }) => {
    const app = window as any
    const data = {
      dataStatus: { source: 'databricks', mode: 'live' }, summary: { total_revenue: 0, total_income: null, total_transactions: 1, avg_margin: null },
      monthly: [], byArea: [], products: [], yearSummary: [], seasonality: [],
    }
    app.applyDatasetPatch = (patch: any) => { app.__nullContractPatch = patch }
    const modules: Record<string, any> = {
      '@/lib/api': { loadDashboardData: async () => data },
      './dashboard-enhancements': { updateDashboardProvenance: () => {} },
      './dashboard-decision-charts': { setDecisionSupportChartData: () => {} },
    }
    const load = (name: string): any => {
      if (modules[name]) return modules[name]
      const compiled = scripts[name.replace(/^\.\//, '')]
      if (!compiled) return {}
      const module = { exports: {} }; modules[name] = module.exports
      new Function('require', 'module', 'exports', compiled)(load, module, module.exports)
      return module.exports
    }
    await load('./dashboard-interactions').refreshDashboardFromGateway()
    const helper = load('./sales-view-helpers')
    const summary = { sums: { quantity: null, net_cost: 0, net_income: null, total_trade_price: null }, averages: {}, counts: { rows: 1 }, top: {}, gross_margin_rate: null }
    helper.renderSalesComputation(document.querySelector('.medshield-root'), summary, 'sum')
    app.__missingLedgerCell = helper.formatSalesValue(null, 'money')
    app.__zeroLedgerCell = helper.formatSalesValue(0, 'money')
  }, { scripts })
  await expect(page.locator('#kpiOverviewTotalRevenue')).toContainText('0')
  await expect(page.locator('#kpiOverviewGrossProfit')).toHaveText('Unavailable')
  await expect(page.locator('#kpiOverviewGrossMargin')).toHaveText('Unavailable')
  await expect(page.locator('#salesComputationGrid .sales-status-value')).toHaveText(['Unavailable', '0.00', 'Unavailable', 'Unavailable'])
  expect(await page.evaluate(() => [(window as any).__missingLedgerCell, (window as any).__zeroLedgerCell])).toEqual(['-', '0.00'])
})
