import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'
import { MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { DESCRIPTIVE_CHART_STYLE } from '../services/api/descriptive-chart-style'

test.beforeEach(async ({ page }) => {
  await page.route('http://so1.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto('http://so1.test/')
  const css = await readFile(path.resolve('app/overrides.css'), 'utf8')
  // Production mounts page content in a width-constrained main region. The bare
  // test body is flex; model that region instead of giving it min-content width.
  await page.setContent('<style>' + MEDSHIELD_STYLE + css + DESCRIPTIVE_CHART_STYLE + '</style><main style="width:100%;min-width:0"><div class="medshield-root"><div id="page-revenue"></div></div></main>')
  await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
  const views = JSON.parse(await readFile(path.resolve('../outputs/so1_dashboard_20261025/test-views.json'), 'utf8'))
  const scripts = Object.fromEntries(await Promise.all(['so1-panel', 'sales-output-sections'].map(async name => [name,
    ts.transpileModule(await readFile(path.resolve('services/api/' + name + '.ts'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText])))
  await page.evaluate(({ scripts, views }) => {
    const app = window as any; app.__so1Failure = false; app.__so1WrongScope = false; app.__so1Views = views
    const modules: Record<string, any> = { 'chart.js/auto': { default: app.Chart }, './api-client': { getJson: async (request: string) => {
      if (app.__so1Failure) throw Error('source unavailable')
      const url = new URL(request, location.origin), area = url.searchParams.get('area'), year = url.searchParams.get('year')
      const data = app.__so1Views[area + '|' + year]
      if (!data) throw Error('fixture scope unavailable')
      return app.__so1WrongScope ? { ...data, scope: { ...data.scope, area: 'WRONG' } } : data
    } } }
    const load = (name: string) => { if (modules[name]) return modules[name]; const module = { exports: {} as any }; new Function('require', 'module', 'exports', scripts[name])(load, module, module.exports); return module.exports }
    const root = document.querySelector<HTMLElement>('.medshield-root')!
    load('sales-output-sections').installSalesOutputSections(root)
    app.__disposeSo1 = load('so1-panel').installSo1Panel(root)
  }, { scripts, views })
  await page.getByRole('tab', { name: 'Territory baseline', exact: true }).click()
  await expect(page.locator('#so1Status')).toContainText('Validated Databricks diagnostics loaded')
})

for (const width of [1440, 390]) test(`territory/year controls, primary chart, uncertainty and exact CSV at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 1000 })
  await page.selectOption('#so1Area', 'QUEZON'); await page.selectOption('#so1Year', '2026')
  await expect(page.locator('#so1MonthlyTable tbody tr')).toHaveCount(9)
  await expect(page.locator('#so1Scope')).toContainText('2026-01–2026-09')
  await expect(page.locator('#so1Scope')).toContainText('independent of the topbar')
  await expect(page.locator('#so1YoyTable')).toContainText('01, 02, 03, 04, 05, 06, 07, 08, 09')
  await expect(page.locator('#so1Context')).toContainText('down (peak 10)')
  await expect(page.locator('#so1Context')).toContainText('up (peak 6)')
  await expect(page.locator('#so1DailyStatus')).toContainText('does not refit')
  const chart = await page.evaluate(() => { const c = (window as any).Chart.getChart(document.getElementById('so1MonthlyChart')); return { labels: c.data.labels, values: c.data.datasets[0].data, spanGaps: c.data.datasets[0].spanGaps } })
  expect(chart.labels).toEqual(Array.from({ length: 9 }, (_, i) => '2026-' + String(i + 1).padStart(2, '0')))
  expect(chart.spanGaps).toBe(false)
  const fixture = await page.evaluate(() => (window as any).__so1Views['QUEZON|2026'])
  expect(chart.values).toEqual(fixture.months.map((r: any) => r.revenue))
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export monthly baseline' }).click()
  const csv = await readFile((await (await download).path())!, 'utf8')
  const rows = csv.trim().replace(/^\uFEFF/, '').split('\r\n').map(line => [...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m => m[1].replace(/""/g, '"')))
  expect(rows).toHaveLength(10)
  for (let i = 0; i < 9; i++) { expect(rows[i + 1][0]).toBe(chart.labels[i]); expect(Number(rows[i + 1][1])).toBe(chart.values[i]) }
  expect(rows[1][rows[0].indexOf('diagnostic_sha256')]).toBe(fixture.checksum)
  const dailyDownload = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export daily comparison values' }).click()
  const dailyCsv = await readFile((await (await dailyDownload).path())!, 'utf8')
  expect(dailyCsv).toContain('conditional_diagnostic_not_verified_actual_sales')
  expect(dailyCsv).toContain('assumed_zero_dates_in_month')
  expect(dailyCsv).toContain('daily_stress_aggregated')
  const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
    elements: Array.from(document.querySelectorAll('*')).filter(el => el.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 12).map(el => ({ tag: el.tagName, id: el.id, class: el.className, width: el.getBoundingClientRect().width })) }))
  if (overflow.scroll > overflow.width + 1) console.log(JSON.stringify(overflow))
  expect(overflow.scroll <= overflow.width + 1).toBe(true)
  await page.locator('#so1Panel').screenshot({ path: info.outputPath('so1-' + width + '.png') })
})

test('whole missing months stay null and no-history territory has no replacement daily fit', async ({ page }) => {
  const first = await page.evaluate(() => { const c = (window as any).Chart.getChart(document.getElementById('so1MonthlyChart')); return { labels: c.data.labels, values: c.data.datasets[0].data } })
  expect(first.values[first.labels.indexOf('2017-05')]).toBeNull()
  await page.selectOption('#so1Area', 'ALBAY')
  await expect(page.locator('#so1DailyStatus')).toContainText('No daily fit has enough')
  await expect(page.locator('#so1Segment')).toBeDisabled()
  expect(await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('so1DailyChart')))).toBeUndefined()
  await expect(page.locator('#so1Mapping')).toContainText('Proposed mapping; not approved')
  const trend = await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('so1MonthlyChart')).data.datasets[1].data)
  expect(trend.every((v: unknown) => v === null)).toBe(true)
})

test('source failure and invalid scope remove stale plots/table/export; recovery and disposal work', async ({ page }) => {
  await page.evaluate(() => { (window as any).__so1Failure = true })
  await page.getByRole('button', { name: 'Reload source', exact: true }).click()
  await expect(page.locator('#so1Status')).toContainText('unavailable from Databricks')
  await expect(page.locator('#so1MonthlyTable tbody tr')).toHaveCount(0)
  await expect(page.locator('#so1Export')).toBeDisabled()
  expect(await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('so1MonthlyChart')))).toBeUndefined()
  await page.evaluate(() => { (window as any).__so1Failure = false; (window as any).__so1WrongScope = true })
  await page.getByRole('button', { name: 'Reload source', exact: true }).click()
  await expect(page.locator('#so1Status')).toContainText('unavailable from Databricks')
  await page.evaluate(() => { (window as any).__so1WrongScope = false })
  await page.getByRole('button', { name: 'Reload source', exact: true }).click()
  await expect(page.locator('#so1Status')).toContainText('Validated Databricks')
  await page.evaluate(() => (window as any).__disposeSo1())
  await expect(page.locator('#so1Panel')).toHaveCount(0)
})

test('keyboard activation and navigation retain independent filters', async ({ page }) => {
  await page.selectOption('#so1Area', 'QUEZON'); await page.selectOption('#so1Year', '2025')
  await page.getByRole('tab', { name: 'Change investigation', exact: true }).click()
  await page.getByRole('tab', { name: 'Change investigation', exact: true }).press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Territory baseline', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#so1Area')).toHaveValue('QUEZON')
  await expect(page.locator('#so1Year')).toHaveValue('2025')
})
