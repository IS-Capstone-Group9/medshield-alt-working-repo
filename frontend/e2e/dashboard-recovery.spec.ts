import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

async function browserModule(file: string) {
  return ts.transpileModule(await readFile(path.resolve(file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText
}

test.beforeEach(async ({ page }) => {
  await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto('http://medshield.test/')
})

test('cookie-only restored local session supplies bearer headers to read and write callers', async ({ page }) => {
  const [tokens, client] = await Promise.all([browserModule('lib/auth-tokens.ts'), browserModule('services/api/api-client.ts')])
  const requests: { authorization?: string; method: string }[] = []
  await page.route('http://medshield.gateway/**', route => {
    requests.push({ authorization: route.request().headers().authorization, method: route.request().method() })
    return route.fulfill({ contentType: 'application/json', body: '{"ok":true}', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } })
  })
  const result = await page.evaluate(async ({ tokens, client }) => {
    const process = { env: { NEXT_PUBLIC_API_BASE_URL: 'http://medshield.gateway' } }
    const load = (script: string, require: (name: string) => any) => {
      const module = { exports: {} as any }
      new Function('process', 'require', 'module', 'exports', script)(process, require, module, module.exports)
      return module.exports
    }
    const tokenModule = load(tokens, () => { throw new Error('Unexpected token dependency') })
    const api = load(client, name => name.includes('supabase') ? { isSupabaseBrowserConfigured: () => false } : tokenModule)
    localStorage.clear(); sessionStorage.clear()
    document.cookie = 'medshield.accessToken=restored-test-token; path=/; SameSite=Lax'
    const restored = tokenModule.getStoredToken()
    const read = await api.getJson('/api/monthly')
    const write = await api.authenticatedJson('/api/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"action":"filter"}' })
    tokenModule.clearStoredToken()
    const cleared = (await api.authHeaders()).get('Authorization')
    const supplied = (await api.authHeaders({ 'X-Test': 'preserved' })).get('X-Test')
    return { restored, read, write, cleared, supplied }
  }, { tokens, client })
  expect(result).toEqual({ restored: 'restored-test-token', read: { ok: true }, write: { ok: true }, cleared: null, supplied: 'preserved' })
  expect(requests.filter(request => request.method !== 'OPTIONS')).toEqual([
    { authorization: 'Bearer restored-test-token', method: 'GET' },
    { authorization: 'Bearer restored-test-token', method: 'POST' },
  ])
})

test('all deferred modules retry after transient failure and successful pages stay cached', async ({ page }) => {
  const interactions = await browserModule('services/api/dashboard-interactions.ts')
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const result = await page.evaluate(async script => {
    const counts: Record<string, number> = {}
    const state: Record<string, { data: any; message?: string }> = {}
    const app = window as any
    for (const name of ['setSalesHeatmapData', 'setSalesSectorsData', 'setForecastValidationData', 'setExternalRegressionData', 'setPlanningData', 'setPredictiveResearchData']) {
      app[name] = (data: any, message?: string) => { state[name] = { data, message } }
    }
    const module = { exports: {} as any }
    const require = (name: string) => {
      if (name === './api-client') return { getJson: async (path: string) => {
        const key = path.split('?')[0]
        counts[key] = (counts[key] || 0) + 1
        if (counts[key] === 1) throw new Error('Transient source unavailable')
        return { rows: [], recovered: true }
      } }
      if (name === './published-forecast-adapter') return { publishedForecastEvidence: () => null }
      return {}
    }
    new Function('require', 'module', 'exports', script)(require, module, module.exports)
    const reports = []
    for (const [pageName, setter] of [['revenue', 'setSalesHeatmapData'], ['territory', 'setSalesSectorsData'], ['forecast', 'setForecastValidationData'], ['inventory', 'setPlanningData']]) {
      const failed = await module.exports.refreshDashboardModulesForPage(pageName)
      const failedDisplay = state[setter]
      await module.exports.refreshDashboardModulesForPage('overview')
      const recovered = await module.exports.refreshDashboardModulesForPage(pageName)
      const recoveredDisplay = state[setter]
      const cached = await module.exports.refreshDashboardModulesForPage(pageName)
      reports.push({ pageName, failed, failedDisplay, recovered, recoveredDisplay, cached })
    }
    return { reports, counts }
  }, interactions)
  for (const report of result.reports) {
    expect(report.failed, report.pageName).toBe(false)
    expect(report.failedDisplay.data, report.pageName).toBeNull()
    expect(report.failedDisplay.message, report.pageName).toContain('unavailable')
    expect(report.recovered, report.pageName).toBe(true)
    expect(report.recoveredDisplay.data, report.pageName).toEqual({ rows: [], recovered: true })
    expect(report.cached, report.pageName).toBe(true)
  }
  expect(result.counts).toEqual({ '/api/sales/heatmap': 2, '/api/sales/sectors': 2, '/api/sales/forecast-validation': 2, '/api/sales/external-regression': 2, '/api/sales/planning-shortlist': 2, '/api/sales/predictive-research': 2 })
  expect(errors).toEqual([])
})

test('deferred requests deduplicate and reset cannot cache or render a stale response', async ({ page }) => {
  const result = await page.evaluate(async script => {
    const app = window as any
    const applied: any[] = []
    app.setSalesSectorsData = (data: any) => { if (data) applied.push(data) }
    const pending: ((value: any) => void)[] = []
    let calls = 0
    const module = { exports: {} as any }
    new Function('require', 'module', 'exports', script)(
      (name: string) => name === './api-client' ? { getJson: () => { calls++; return new Promise(resolve => pending.push(resolve)) } } : {}, module, module.exports)
    const first = module.exports.refreshDashboardModulesForPage('territory')
    const duplicate = module.exports.refreshDashboardModulesForPage('territory')
    const samePromise = first === duplicate
    module.exports.resetDashboardDeferredLoads()
    const fresh = module.exports.refreshDashboardModulesForPage('territory')
    pending[0]({ stale: true })
    const staleSuccess = await first
    pending[1]({ fresh: true })
    const freshSuccess = await fresh
    await module.exports.refreshDashboardModulesForPage('territory')
    return { samePromise, staleSuccess, freshSuccess, calls, applied }
  }, await browserModule('services/api/dashboard-interactions.ts'))
  expect(result).toEqual({ samePromise: true, staleSuccess: false, freshSuccess: true, calls: 2, applied: [{ fresh: true }] })
})

test('missing runtime handler does not cache an unloaded page', async ({ page }) => {
  const result = await page.evaluate(async script => {
    const module = { exports: {} as any }
    let calls = 0
    new Function('require', 'module', 'exports', script)(
      (name: string) => name === './api-client' ? { getJson: async () => { calls++; return { rows: [] } } } : {}, module, module.exports)
    const missing = await module.exports.refreshDashboardModulesForPage('territory')
    ;(window as any).setSalesSectorsData = () => {}
    const loaded = await module.exports.refreshDashboardModulesForPage('territory')
    return { missing, loaded, calls }
  }, await browserModule('services/api/dashboard-interactions.ts'))
  expect(result).toEqual({ missing: false, loaded: true, calls: 1 })
})

test('provenance retains valid future source years and keeps estimate choices out of observed evidence', async ({ page }) => {
  const result = await page.evaluate(script => {
    document.body.innerHTML = '<select id="topbarYearSelect"></select><div class="data-freshness-bar"></div>'
    const module = { exports: {} as any }
    new Function('require', 'module', 'exports', script)(() => ({}), module, module.exports)
    const status = { loaded_at: '2026-10-05T00:00:00Z', source: 'databricks', mode: 'live', message: 'Observed source' }
    const year = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', year: 'numeric' }).format(new Date())
    const future = String(Number(year) + 5)
    module.exports.updateDashboardProvenance(document.body, status, ['2017', '2026', future, '9999', '2016', '10000', '2026', '2.026e3', '2026-01', '<script>'])
    const mixed = document.querySelector('.data-freshness-bar')!.textContent
    const options = Array.from(document.querySelectorAll<HTMLOptionElement>('#topbarYearSelect option')).map(option => option.value)
    module.exports.updateDashboardProvenance(document.body, status, ['2025'])
    const history = document.querySelector('.data-freshness-bar')!.textContent
    const offered = Array.from(document.querySelectorAll<HTMLOptionElement>('#topbarYearSelect option')).map(option => ({ value: option.value, label: option.textContent }))
    module.exports.updateDashboardProvenance(document.body, status, [])
    const empty = document.querySelector('.data-freshness-bar')!.textContent
    return { mixed, options, future, year, history, offered, empty }
  }, await browserModule('services/api/dashboard-enhancements.ts'))
  expect(result.mixed).toContain(`Years: 9999, ${result.future}, 2026, 2017`)
  expect(result.options).toContain(result.future)
  expect(result.options).not.toContain('2016')
  expect(result.options).not.toContain('10000')
  expect(result.history).toContain('Years: 2025')
  expect(result.history).not.toContain(`Years: ${result.year}`)
  expect(result.offered).toContainEqual({ value: result.year, label: `${result.year} (Actual + Estimate)` })
  expect(result.empty).toContain('Years: Unavailable')
})
