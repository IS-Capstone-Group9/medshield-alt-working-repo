import { test, expect } from '@playwright/test'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'
import { execFileSync } from 'node:child_process'
import { publishedForecastEvidence } from '../services/api/published-forecast-adapter'

// Actual gateway evaluator; this is contract evidence, not a deployed model receipt.
function evidence(originPeriod = '2025-12', displayPeriod = '2026-09') {
  const code = `const { benchmarkView, benchmarkNames, monthIndex, monthLabel } = require('./src/forecastEvidence.ts');
  const originPeriod = '${originPeriod}', displayPeriod = '${displayPeriod}';
  const origin = monthIndex(originPeriod)
  const series = new Map(Array.from({length:72}, (_, i) => [origin - 71 + i, 1000 + i * 10]))
  const payload = {
    status: 'retrospective_benchmark_evidence', publication_status: 'unpublished', reporting_coverage_status: 'unverified',
    scope: {sector:'All', product:'', metric:'revenue', unit:'PHP'}, products: [], models:benchmarkNames,
    origin:originPeriod,last_actual_period:originPeriod,observed_months:72,months_since_origin:monthIndex(displayPeriod)-origin-1,
    actuals:[...series].map(([period,actual]) => ({period:monthLabel(period),actual})),
    source:{file:'isolated TypeScript fixture',checksum:'fixture-checksum',as_of:displayPeriod+'-27'},
    limitations:['Reporting completeness and model publication are unverified.'],
    views:Object.fromEntries([3,6,12].map(h => [String(h),benchmarkView(series,origin,h,'company','net_sales',monthIndex(displayPeriod))]))
  }
  console.log(JSON.stringify(payload));`
  return JSON.parse(execFileSync('node', ['--import', 'tsx', '-e', code], {cwd:path.resolve('../backend'),encoding:'utf8'}))
}

test.beforeEach(async ({ page }) => {
  await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
  await page.evaluate(() => { window.fetch = async () => new Response('{}', { status: 503 }) })
  await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
  await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())
  await page.evaluate(() => (window as any).showPage('forecast'))
})

test('TypeScript evidence renders real comparisons, fixed origins, unavailable future leads and matching CSV', async ({ page }) => {
  const payload = evidence()
  await page.evaluate(data => (window as any).setForecastValidationData(data), payload)
  await expect(page.locator('#forecastWindow')).toContainText('2026-09 to 2027-08')
  await expect(page.locator('#forecastWindow')).toContainText('12 displayed months · true forecast leads 9–20')
  await expect(page.locator('#forecastWindow')).toContainText('8 closed months behind')
  await expect(page.locator('#forecastBenchmarkTable')).not.toContainText('Prophet')
  await expect(page.locator('#forecastBenchmarkTable tbody tr')).toHaveCount(4)
  await expect(page.locator('#forecastEvaluationScope')).toContainText('fixed_origin_multi_step')
  await expect(page.locator('#forecastCoverage')).toContainText('coverage: Unavailable')
  await expect(page.locator('#forecastStatus')).toContainText('unpublished')
  await expect(page.locator('#toggleDohOverlay')).toHaveCount(0)
  await expect(page.locator('#decompBaseTrend')).toHaveCount(0)
  const chart = () => page.evaluate(() => {
    const data = (window as any).Chart.getChart(document.getElementById('forecastChart')).data
    return {labels:data.labels,actuals:data.datasets[0].data,backtest:data.datasets[1].data,forecast:data.datasets[2].data,names:data.datasets.map((d:any)=>d.label)}
  })
  let displayed = await chart()
  expect(displayed.labels).toHaveLength(44)
  expect(displayed.actuals.filter((v:any)=>v!==null)).toHaveLength(24)
  expect(displayed.actuals.slice(-20)).toEqual(Array(20).fill(null))
  expect(displayed.forecast.every((v:any)=>v===null)).toBe(true)
  expect(displayed.names).toHaveLength(3)
  await page.selectOption('#forecastHorizon','3')
  await expect(page.locator('#forecastWindow')).toContainText('true forecast leads 9–11')
  await page.selectOption('#forecastModel','last_value')
  displayed = await chart()
  expect(displayed.backtest.filter((v:any)=>v!==null)).toEqual(Array(3).fill(1680))
  await expect(page.locator('#forecastErrorChart')).toBeVisible()
  const holdoutErrors = await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('forecastErrorChart')).data.datasets[0].data.filter((v:any) => v !== null))
  expect(holdoutErrors).toHaveLength(3)
  await expect(page.locator('#kpiForecastMae')).toHaveText('20')
  const downloadPromise = page.waitForEvent('download')
  await page.locator('#forecastExport').click()
  const csv = await readFile((await (await downloadPromise).path())!,'utf8')
  expect(csv).toContain('"2026-11","Future prediction","","","","","2025-12","11"')
  expect(csv).toContain('"unpublished_forecast"')
  expect(csv).toContain('"last_value","fixed_origin_multi_step"')
  expect(csv).not.toContain('Prophet')
  expect(csv).not.toContain('2026-12')
  await page.setViewportSize({width:390,height:844})
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
})

test('scope changes and failures clear old model metrics and charts', async ({ page }) => {
  await page.evaluate(data => {
    const app = window as any
    app.setForecastValidationData(data)
    app.forecastChanges=[]
    window.addEventListener('medshield:forecast-change',()=>app.forecastChanges.push((document.getElementById('forecastSector') as HTMLSelectElement).value))
  },evidence())
  await page.selectOption('#forecastSector','Unknown')
  expect(await page.evaluate(()=>(window as any).forecastChanges.at(-1))).toBe('Unknown')
  const blocked={...evidence(),status:'blocked',scope:{sector:'Unknown',product:'',metric:'revenue',unit:'PHP'},views:{},models:{}}
  await page.evaluate(data=>(window as any).setForecastValidationData(data),blocked)
  await expect(page.locator('#forecastWindow')).toContainText('No eligible model evidence')
  await expect(page.locator('#kpiForecastMae')).toHaveText('Unavailable')
  await expect(page.locator('#forecastExport')).toBeDisabled()
  expect(await page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('forecastChart'))===undefined)).toBe(true)
  await page.evaluate(()=>(window as any).setForecastValidationData(null,'Source unavailable'))
  await expect(page.locator('#forecastStatus')).toHaveText('Source unavailable')
  await expect(page.locator('#forecastModel')).toHaveText('Unavailable')
})

test('future years are supported and open-month actuals are rejected', async ({page}) => {
  const data=evidence('2027-12','2028-01')
  await page.evaluate(data=>(window as any).setForecastValidationData(data),data)
  await expect(page.locator('#forecastWindow')).toContainText('2028-01 to 2028-12')
  await expect(page.locator('#forecastWindow')).toContainText('last actual 2027-12')
  data.actuals.push({period:'2028-01',actual:4})
  await page.evaluate(data=>(window as any).setForecastValidationData(data),data)
  await expect(page.locator('#forecastStatus')).toContainText('actuals must be valid closed calendar months')
  await expect(page.locator('#forecastExport')).toBeDisabled()
})

test('published adapter preserves run, true lead, interval and export evidence', async ({ page }) => {
  const release = { schema_version: '2', status: 'published', publication_status: 'approved', model_id: 'seasonal_naive', run_id: 'fixture-run', release_id: 'fixture-release', training_cutoff: '2025-12', last_actual_period: '2025-12', unit: 'PHP', source_checksum: 'fixture-hash', freshness_gap_months: 9, evaluation_protocol: 'fixed_origin_multi_step', limitations: ['Isolated contract fixture, not cloud accuracy'],
    actuals: [{ target_period: '2025-12', actual: 100 }],
    backtests: [{ origin_period: '2024-12', target_period: '2025-12', lead_months: 12, prediction: 90, actual: 100 }],
    evaluations: [{ model_id: 'seasonal_naive', metrics: { n: 1, mae: 10, rmse: 10, wape: 10, bias: -10 } }],
    points: Array.from({ length: 12 }, (_, i) => ({ target_period: new Date(Date.UTC(2026, 8 + i, 1)).toISOString().slice(0, 7), origin_period: '2025-12', lead_months: 9 + i, prediction: i < 4 ? 100 : null, missing_reason: i < 4 ? null : 'unsupported_lead', intervals: i < 4 ? [{ level: .8, lower: 80, upper: 120, support: 20 }] : [] })) }
  await page.evaluate(data => (window as any).setForecastValidationData(data), publishedForecastEvidence(release))
  await expect(page.locator('#forecastStatus')).toContainText('published')
  await expect(page.locator('#forecastBandNote')).toContainText('4/12')
  await expect(page.locator('#kpiForecastMae')).toHaveText('10')
  const downloadPromise = page.waitForEvent('download')
  await page.locator('#forecastExport').click()
  const csv = await readFile((await (await downloadPromise).path())!, 'utf8')
  expect(csv).toContain('fixture-run')
  expect(csv).toContain('fixture-release')
  expect(csv).toContain('unsupported_lead')
})
