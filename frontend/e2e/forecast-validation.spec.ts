import { test, expect } from '@playwright/test'
import path from 'node:path'
import { mkdir, readFile } from 'node:fs/promises'
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
    return {labels:data.labels,actuals:data.datasets[0].data,backtest:data.datasets[1].data,names:data.datasets.map((d:any)=>d.label)}
  })
  let displayed = await chart()
  expect(displayed.labels).toHaveLength(24)
  expect(displayed.labels.at(-1)).toBe('2025-12')
  expect(displayed.actuals.filter((v:any)=>v!==null)).toHaveLength(24)
  expect(displayed.names).toHaveLength(2)
  expect(displayed.names.some((name: string) => name.includes('future prediction'))).toBe(false)
  await expect(page.locator('#forecastPlotScope')).toContainText('Historical chart only')
  await expect(page.locator('#forecastEvidenceTable tbody tr')).toHaveCount(44)
  await page.selectOption('#forecastHorizon','3')
  await expect(page.locator('#forecastWindow')).toContainText('true forecast leads 9–11')
  await page.selectOption('#forecastModel','last_value')
  displayed = await chart()
  expect(displayed.backtest.filter((v:any)=>v!==null)).toEqual(Array(3).fill(1680))
  await expect(page.locator('#kpiForecastMae')).toHaveText('₱20.00')
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
  await expect(page.locator('#kpiForecastMae')).toHaveText('₱10.00')
  const downloadPromise = page.waitForEvent('download')
  await page.locator('#forecastExport').click()
  const csv = await readFile((await (await downloadPromise).path())!, 'utf8')
  expect(csv).toContain('fixture-run')
  expect(csv).toContain('fixture-release')
  expect(csv).toContain('unsupported_lead')
})

function errorOutputEvidence(unit = 'PHP') {
  const data = evidence()
  data.scope = {sector:'All', product:'', metric:unit === 'PHP' ? 'revenue' : 'quantity', unit}
  data.run_id = 'fixture-run'
  data.release_id = 'fixture-release'
  data.source.checksum = '+fixture-checksum'
  data.actuals = [
    {period:'2024-12',actual:20}, {period:'2025-01',actual:0},
    {period:'2025-02',actual:0}, {period:'2025-03',actual:-5},
    {period:'2025-04',actual:7}, {period:'2025-05',actual:null},
    {period:'2025-06',actual:100}, {period:'2025-07',actual:9},
    {period:'2025-08',actual:5}, {period:'2025-12',actual:20},
  ]
  const backtest = [
    {period:'2025-01',actual:0,prediction:0},
    {period:'2025-02',actual:0,prediction:10},
    {period:'2025-03',actual:-5,prediction:-8},
    {period:'2025-04',actual:7,prediction:null},
    {period:'2025-05',actual:null,prediction:3},
    {period:'2025-06',actual:99,prediction:110},
    {period:'2025-07',actual:null,prediction:10},
  ].map((p,i) => ({...p,origin:'2024-12',lead:i+1}))
  // Three matched finite pairs: errors 0, +10 and −3; hand-calculated metrics.
  data.views['12'] = {evaluation_protocol:'fixed_origin_multi_step',training_end:'2024-12',evaluation_start:'2025-01',evaluation_end:'2025-07',common_scored_months:3,
    models:{last_value:{backtest,forecast:[{period:'2026-09',origin:'2025-12',lead:9,actual:999,prediction:100}],metrics:{n:3,mae:13/3,rmse:Math.sqrt(109/3),wape:260,bias:7/3},comparison_metrics:{n:3,mae:13/3,wape:260,bias:7/3}}}}
  return data
}

test('available zero and negative future predictions retain interior gaps and trailing evidence rows', async ({page}) => {
  const data = errorOutputEvidence()
  data.views['12'].models.last_value.forecast = Array.from({length:12},(_,index) => ({
    period:new Date(Date.UTC(2026,8+index,1)).toISOString().slice(0,7),origin:'2025-12',lead:index+9,
    prediction:index === 0 ? 0 : index === 2 ? -5 : null,
  }))
  await page.evaluate(value => (window as any).setForecastValidationData(value),data)
  const graph = await page.evaluate(() => {
    const chart = (window as any).Chart.getChart(document.getElementById('forecastChart'))
    const predictions = chart.data.datasets.find((dataset: any) => dataset.label.includes('future prediction')).data
    return {labels:chart.data.labels,predictions,spanGaps:chart.options.spanGaps}
  })
  expect(graph.labels.at(-1)).toBe('2026-11')
  expect(graph.predictions.slice(-3)).toEqual([0,null,-5])
  expect(graph.spanGaps).toBe(false)
  await expect(page.locator('#forecastPlotScope')).toContainText('Missing months stay blank')
  await expect(page.locator('#forecastEvidenceTable tbody tr').last()).toContainText('2027-08')
})

async function exportedRows(page: import('@playwright/test').Page) {
  const download = page.waitForEvent('download')
  await page.locator('#forecastExport').click()
  const csv = await readFile((await (await download).path())!, 'utf8')
  const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/)
  const cells = lines.map(line => Array.from(line.matchAll(/"((?:""|[^"])*)"(?:,|$)/g), match => match[1].replace(/""/g, '"')))
  return cells.slice(1).map(values => Object.fromEntries(cells[0].map((header,i) => [header,values[i]])))
}

test('monthly evidence and CSV expose only matched historical errors and the historical summary', async ({ page }) => {
  await page.evaluate(data => (window as any).setForecastValidationData(data), errorOutputEvidence())
  await expect(page.locator('#forecastMetrics')).toContainText('Historical MAE')
  await expect(page.locator('#kpiForecastMae')).toHaveText('₱4.33')
  await expect(page.locator('#kpiForecastRmse')).toHaveText('₱6.03')
  await expect(page.locator('#kpiForecastBias')).toHaveText('₱2.33')
  await expect(page.locator('#kpiForecastWape')).toHaveText('260%')
  await expect(page.locator('#forecastReview')).toContainText('positive signed error means overforecast and negative means underforecast')
  await expect(page.locator('#forecastReview')).toContainText('Future errors are unavailable')
  await expect(page.locator('#forecastBenchmarkTable thead')).toContainText('MAE (₱)')
  await expect(page.locator('#forecastEvidenceTable thead')).toContainText('Signed error (₱)')
  await expect(page.locator('#forecastEvidenceTable')).not.toBeVisible()
  await page.getByText('Monthly actuals, predictions and historical errors', { exact: true }).click()
  await expect(page.locator('#forecastEvidenceTable')).toBeVisible()
  const monthly = (period: string) => page.locator('#forecastEvidenceTable tbody tr').filter({hasText:period})
  await expect(monthly('2025-02').locator('td').nth(4)).toHaveText('10')
  await expect(monthly('2025-03').locator('td').nth(5)).toHaveText('-3')
  await expect(monthly('2025-01').locator('td').nth(4)).toHaveText('0')
  await expect(monthly('2025-06').locator('td').nth(4)).toHaveText('Unavailable')
  await expect(monthly('2025-06').locator('td').last()).toHaveText('historical actual mismatch')
  const rows = await exportedRows(page)
  const row = (period: string) => rows.find(r => r.period === period)!
  expect(row('2025-01').absolute_error_target_units).toBe('0')
  expect(row('2025-01').signed_error_target_units).toBe('0')
  expect(row('2025-02').absolute_error_target_units).toBe('10')
  expect(row('2025-02').signed_error_target_units).toBe('10')
  expect(row('2025-03').absolute_error_target_units).toBe('3')
  expect(row('2025-03').signed_error_target_units).toBe('-3')
  for (const [period,reason] of [['2025-04','missing_backtest_prediction'],['2025-05','missing_displayed_actual'],['2025-06','historical_actual_mismatch'],['2025-07','missing_backtest_actual'],['2025-08','no_historical_backtest_prediction'],['2026-09','future_prediction_not_scored']]) {
    expect(row(period).absolute_error_target_units).toBe('')
    expect(row(period).signed_error_target_units).toBe('')
    expect(row(period).error_unavailable_reason).toBe(reason)
  }
  expect(row('2026-09').historical_evaluation_start).toBe('2025-01')
  expect(row('2026-09').historical_evaluation_end).toBe('2025-07')
  expect(row('2026-09').historical_scored_count).toBe('3')
  expect(Number(row('2026-09').historical_mae_target_units)).toBeCloseTo(13/3,12)
  expect(Number(row('2026-09').historical_rmse_target_units)).toBeCloseTo(Math.sqrt(109/3),12)
  expect(row('2026-09').historical_wape_percent).toBe('260')
  expect(Number(row('2026-09').historical_mean_signed_error_target_units)).toBeCloseTo(7/3,12)
  expect(row('2025-03').source_checksum).toBe("'+fixture-checksum")
  expect(row('2025-03').run_id).toBe('fixture-run')
  expect(row('2025-03').release_id).toBe('fixture-release')
  expect(row('2025-03').publication_status).toBe('unpublished')
  expect(row('2025-03').unit).toBe('PHP')
  const screenshots = path.resolve('../outputs/predictive_error_visibility_20261010')
  await mkdir(screenshots,{recursive:true})
  await page.locator('[data-forecast-validation]').screenshot({path:path.join(screenshots,'frontend-desktop.png')})
  await page.setViewportSize({width:390,height:844})
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.locator('[data-forecast-validation]').screenshot({path:path.join(screenshots,'frontend-mobile.png')})
})

test('non-PHP targets retain unit labels and unavailable versus zero historical summaries', async ({ page }) => {
  const data = errorOutputEvidence('boxes')
  await page.evaluate(value => (window as any).setForecastValidationData(value), data)
  await expect(page.locator('#kpiForecastMae')).toHaveText('4.33 boxes')
  await expect(page.locator('#kpiForecastBias')).toHaveText('2.33 boxes')
  await expect(page.locator('#forecastEvidenceTable thead')).toContainText('Signed error (boxes)')
  await expect(page.locator('#forecastBenchmarkTable thead')).toContainText('MAE (boxes)')
  expect((await exportedRows(page)).find(r => r.period === '2025-03')!.unit).toBe('boxes')
  data.views['12'].models.last_value.metrics = {n:0,mae:null,rmse:null,wape:null,bias:null}
  await page.evaluate(value => (window as any).setForecastValidationData(value), data)
  await expect(page.locator('#kpiForecastMae')).toHaveText('Unavailable')
  const unavailable = (await exportedRows(page))[0]
  expect(unavailable.historical_mae_target_units).toBe('')
  expect(unavailable.historical_wape_percent).toBe('')
  expect(unavailable.historical_scored_count).toBe('0')
  data.views['12'].models.last_value.metrics = {n:1,mae:0,rmse:0,wape:null,bias:0}
  await page.evaluate(value => (window as any).setForecastValidationData(value), data)
  await expect(page.locator('#kpiForecastMae')).toHaveText('0 boxes')
  await expect(page.locator('#kpiForecastBias')).toHaveText('0 boxes')
  await expect(page.locator('#kpiForecastWape')).toHaveText('Unavailable')
  const zero = (await exportedRows(page))[0]
  expect(zero.historical_mae_target_units).toBe('0')
  expect(zero.historical_rmse_target_units).toBe('0')
  expect(zero.historical_mean_signed_error_target_units).toBe('0')
  expect(zero.historical_scored_count).toBe('1')
})
