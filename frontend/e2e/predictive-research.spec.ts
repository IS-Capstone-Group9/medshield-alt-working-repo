import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

const EXPERIMENT_21 = 'experiment_' + 'a'.repeat(64)
const EXPERIMENT_6 = 'experiment_' + 'b'.repeat(64)
const BASELINE_STORAGE_HASH = '1'.repeat(64)
const BASELINE_CONTENT_HASH = '2'.repeat(64)

const point = (origin: string, target: string, lead: number, actual: number | null, prediction: number | null) => ({
  origin_period: origin, target_period: target, lead_months: lead, actual, prediction,
  signed_error_php: actual == null || prediction == null ? null : prediction - actual,
  absolute_error_php: actual == null || prediction == null ? null : Math.abs(prediction - actual),
  error_unavailable_reason: actual == null ? 'actual_unavailable' : prediction == null ? 'prediction_unavailable' : null,
})

// Expected percentages are server-supplied fixture evidence, not calculations in the UI.
const projection = (month: number, prediction: number | null, baseline: number | null, yoy: number | null, reason: string | null = null, valueStatus = 'observed', coverageStatus = 'complete') => ({
  ...point('2025-12', `2026-${String(month).padStart(2, '0')}`, month, null, prediction),
  temporal_status_at_generation: month < 10 ? 'elapsed' : month === 10 ? 'current' : 'future', intervals: [],
  prior_year_period: `2025-${String(month).padStart(2, '0')}`, prior_year_net_sales_php: baseline,
  prior_year_value_status: valueStatus, prior_year_coverage_status: coverageStatus,
  forecast_yoy_percent: yoy, forecast_yoy_unavailable_reason: reason,
  baseline_input_storage_hash: BASELINE_STORAGE_HASH, baseline_input_content_hash: BASELINE_CONTENT_HASH,
})

function evidence(runId = EXPERIMENT_21) {
  const points = [point('2023-03', '2023-04', 1, 100, 110), point('2023-06', '2023-07', 1, 0, 10), point('2023-03', '2023-07', 4, -5, -8)]
  const group = (rows = points) => ({
    n: rows.length, distinct_target_months: new Set(rows.map(p => p.target_period)).size,
    target_start: rows[0].target_period, target_end: rows.at(-1)!.target_period, origins: [...new Set(rows.map(p => p.origin_period))],
    comparison_basis: 'complete_models_same_expected_origin_target_lead_keys',
    models: {
      last_value: { available: true, exclusion_reason: null, individual_scored_count: rows.length, points: rows,
        metrics: { n: rows.length, mae: 23 / 3, rmse: Math.sqrt(209 / 3), wape: 23 / 105 * 100, bias: 17 / 3, normalized_bias: 17 / 105 * 100 } },
      median_12: { available: false, exclusion_reason: 'missing_prediction', individual_scored_count: 1,
        metrics: { n: 0, mae: null, rmse: null, wape: null, bias: null, normalized_bias: null },
        points: [point('2023-03', '2023-04', 1, 100, null), point('2023-06', '2023-07', 1, 0, 0), point('2023-03', '2023-07', 4, null, 8)] },
    },
  })
  const audit = group([point('2024-12', '2025-01', 1, 0, 0), point('2024-12', '2025-02', 2, 0, 10)])
  audit.models.last_value.metrics = { n: 2, mae: 5, rmse: Math.sqrt(50), wape: null as any, bias: 5, normalized_bias: null as any }
  return {
    schema_version: 'predictive-research.v1', status: 'research_candidate_unpublished', publication_approved: false, activation_allowed: false,
    selected_run_id: runId, selection_rule: 'largest_matching_configuration_grid_then_run_id_not_model_ranking_or_latest',
    runs: [
      { run_id: EXPERIMENT_21, source_run_id: 'c'.repeat(64), artifact_hash: 'd'.repeat(64), configuration_count: 21, training_cutoff: '2025-12', source_matches_active: true },
      { run_id: EXPERIMENT_6, source_run_id: 'e'.repeat(64), artifact_hash: 'f'.repeat(64), configuration_count: 6, training_cutoff: '2025-12', source_matches_active: true },
    ],
    source: { system_of_record: 'databricks', release: { dataset_id: '=fixture-dataset', fact_delta_version: 20, policy_version: 'policy-fixture', area_mapping_sha256: 'area-fixture', product_master_sha256: 'master-fixture', publication_status: 'PASS_CANDIDATE' } },
    model_names: { last_value: 'Last value <script>window.injected=true</script>', median_12: '12-month median' },
    original_selection: { model_id: 'last_value', audit_previously_inspected: true },
    limitations: ['Isolated fixture; this does not establish live warehouse availability or future accuracy.'],
    cohorts: { development: { groups: { '3': group(points.slice(0, 2)), '6': group(), '12': group() } }, retrospective_audit: { groups: { '3': audit, '6': audit, '12': audit } } },
    candidate_projections: { model_id: 'last_value', generated_at: '2026-10-09T00:00:00Z', training_cutoff: '2025-12', publication_approved: false, activation_allowed: false,
      points: [
        projection(1, 120, 100, 20), projection(2, 100, 100, 0),
        projection(3, 0, 100, -100), projection(4, -20, 100, -120),
        projection(5, 100, 0, null, 'baseline_zero', 'confirmed_zero'),
        projection(6, 100, -5, null, 'baseline_negative'),
        projection(7, 100, null, null, 'baseline_missing', 'missing', 'unknown'),
        projection(8, 100, 100, null, 'baseline_partial', 'partial', 'partial'),
        projection(9, null, 100, null, 'prediction_unavailable'),
        projection(10, 100, 100, 0), projection(11, 100, 100, 0), projection(12, 100, 100, 0),
      ] },
  }
}

test.beforeEach(async ({ page }) => {
  await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto('http://medshield.test/')
  const overrides = await readFile('app/overrides.css', 'utf8')
  await page.setContent(`<style>${MEDSHIELD_STYLE}\n${overrides}</style>${MEDSHIELD_MARKUP}`)
  await page.evaluate(() => { window.fetch = async () => new Response('{}', { status: 503 }) })
  await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
  await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())
  await page.evaluate(() => (window as any).showPage('forecast'))
  await page.locator('#predictiveResearchDetails > summary').click()
})

async function exportRows(page: Page) {
  const download = page.waitForEvent('download')
  await page.locator('#researchExport').click()
  const csv = await readFile((await (await download).path())!, 'utf8')
  const parse = (line: string) => Array.from(line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g), m => m[1].replace(/""/g, '"'))
  const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/).map(parse)
  return { csv, rows: lines.slice(1).map(cells => Object.fromEntries(lines[0].map((key, i) => [key, cells[i]]))) }
}

test('complete grid, paired errors and repeated origin keys are visible without changing approved forecast controls', async ({ page }) => {
  await page.evaluate(data => (window as any).setPredictiveResearchData(data), evidence())
  await expect(page.locator('#researchRun option')).toHaveCount(2)
  await expect(page.locator('#researchRun')).toHaveValue(EXPERIMENT_21)
  await expect(page.locator('#researchComparison tbody tr')).toHaveCount(2)
  await expect(page.locator('#researchComparison')).toContainText('₱7.67')
  await expect(page.locator('#researchComparison')).toContainText('21.90%')
  await expect(page.locator('#researchComparison')).toContainText('₱5.67')
  await expect(page.locator('#researchPoints tbody tr')).toHaveCount(3)
  await expect(page.locator('#researchPoints tbody tr').filter({ hasText: '2023-07' })).toHaveCount(2)
  await expect(page.locator('#researchScope')).toContainText('3 expected origin–target–lead cases · 2 distinct target months')
  await expect(page.locator('#researchStatus')).toContainText('activation unavailable')
  expect(await page.evaluate(() => (window as any).injected)).toBeUndefined()
  await expect(page.locator('#forecastHorizon')).toHaveCount(1)
  await expect(page.locator('#forecastExport')).toHaveCount(1)
  const output = await exportRows(page)
  expect(output.rows).toHaveLength(3)
  expect(output.rows.filter(row => row.target_period === '2023-07').map(row => row.origin_period)).toEqual(['2023-06', '2023-03'])
  expect(output.rows[0]).toMatchObject({ dataset_id: "'=fixture-dataset", fact_delta_version: '20', policy_version: 'policy-fixture', area_mapping_sha256: 'area-fixture', product_master_sha256: 'master-fixture', run_id: EXPERIMENT_21, source_run_id: 'c'.repeat(64), artifact_hash: 'd'.repeat(64), evidence_role: 'development', cumulative_lead_group: '1-12', publication_approved: 'false', activation_allowed: 'false' })
  expect(output.rows[2]).toMatchObject({ actual: '-5', prediction: '-8', signed_error_php: '-3', absolute_error_php: '3', absolute_percentage_error: '60' })
})

test('stage, cumulative lead and model selections retain zero, null and excluded evidence', async ({ page }) => {
  await page.evaluate(data => (window as any).setPredictiveResearchData(data), evidence())
  await page.selectOption('#researchLead', '3')
  await expect(page.locator('#researchPoints tbody tr')).toHaveCount(2)
  await page.selectOption('#researchLead', '6')
  await expect(page.locator('#researchPoints tbody tr')).toHaveCount(3)
  await page.selectOption('#researchModel', 'median_12')
  await expect(page.locator('#researchDetailTitle')).toContainText('12-month median')
  await expect(page.locator('#researchPoints')).toContainText('prediction_unavailable')
  await expect(page.locator('#researchComparison')).toContainText('Excluded from comparison: missing_prediction')
  let output = await exportRows(page)
  expect(output.rows[0]).toMatchObject({ prediction: '', signed_error_php: '', absolute_error_php: '', comparison_available: 'false', comparison_n: '0' })
  expect(output.rows[1]).toMatchObject({ actual: '0', prediction: '0', absolute_error_php: '0', absolute_percentage_error: '' })
  await page.selectOption('#researchStage', 'retrospective_audit')
  await page.selectOption('#researchModel', 'last_value')
  await expect(page.locator('#researchScope')).toContainText('Already inspected retrospective audit')
  await expect(page.locator('#researchComparison tbody tr').first()).toContainText('Unavailable')
  output = await exportRows(page)
  expect(output.rows[0]).toMatchObject({ evidence_role: 'retrospective_audit', comparison_wape_percent: '', comparison_normalized_bias_percent: '', actual: '0', absolute_error_php: '0' })
})

test('stored projections show source-bound YoY, signed baselines and matching CSV without measured errors or activation', async ({ page }, testInfo) => {
  await page.evaluate(data => (window as any).setPredictiveResearchData(data), evidence())
  await page.selectOption('#researchStage', 'projections')
  await expect(page.locator('#researchLead')).toBeDisabled()
  await expect(page.locator('#researchComparisonWrap')).toBeHidden()
  await expect(page.locator('#researchScope')).toContainText('generated 2026-10-09T00:00:00Z · training cutoff 2025-12')
  await expect(page.locator('#researchScope')).toContainText('Actuals and forecast errors are unavailable')
  await expect(page.locator('#researchScope')).toContainText('same frozen input')
  await expect(page.locator('#researchPoints th')).toContainText(['Origin cutoff', 'Target month', 'Calendar lead', 'Prediction (₱)', 'Forecast YoY change (%)', 'Prior-year month', 'Prior-year net sales (₱)', 'At generation', 'Actual / error', 'Stored interval evidence'])
  await expect(page.locator('#researchPoints')).toContainText('elapsed')
  await expect(page.locator('#researchPoints')).toContainText('current')
  await expect(page.locator('#researchPoints')).toContainText('future')
  const output = await exportRows(page)
  expect(output.rows).toHaveLength(12)
  expect(output.rows.every(row => row.actual === '' && row.signed_error_php === '' && row.absolute_error_php === '' && row.error_unavailable_reason === 'actual_unavailable')).toBe(true)
  expect(output.rows[0]).toMatchObject({ evidence_role: 'unpublished_candidate_projection', training_cutoff: '2025-12', generated_at: '2026-10-09T00:00:00Z', temporal_status_at_generation: 'elapsed', publication_approved: 'false', activation_allowed: 'false', origin_period: '2025-12', target_period: '2026-01', lead_months: '1', prior_year_period: '2025-01', prior_year_net_sales_php: '100', forecast_yoy_percent: '20', baseline_input_storage_hash: BASELINE_STORAGE_HASH, baseline_input_content_hash: BASELINE_CONTENT_HASH })
  const expected = evidence().candidate_projections.points
  for (let index = 0; index < expected.length; index++) {
    const supplied = expected[index]
    const row = page.locator('#researchPoints tbody tr').nth(index)
    const baselineText = supplied.prior_year_net_sales_php == null ? 'Unavailable' : '₱' + supplied.prior_year_net_sales_php.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const yoyText = supplied.forecast_yoy_percent == null ? 'Unavailable — ' + supplied.forecast_yoy_unavailable_reason : supplied.forecast_yoy_percent.toFixed(2) + '%'
    await expect(row.locator('[data-research-field="prior_year_period"]')).toHaveText(supplied.prior_year_period)
    await expect(row.locator('[data-research-field="prior_year_net_sales_php"]')).toContainText(baselineText)
    await expect(row.locator('[data-research-field="prior_year_net_sales_php"]')).toContainText(supplied.prior_year_value_status + ' · ' + supplied.prior_year_coverage_status)
    await expect(row.locator('[data-research-field="forecast_yoy_percent"]')).toHaveText(yoyText)
    expect(output.rows[index]).toMatchObject({
      prior_year_period: supplied.prior_year_period, prior_year_net_sales_php: supplied.prior_year_net_sales_php == null ? '' : String(supplied.prior_year_net_sales_php),
      prior_year_value_status: supplied.prior_year_value_status, prior_year_coverage_status: supplied.prior_year_coverage_status,
      forecast_yoy_percent: supplied.forecast_yoy_percent == null ? '' : String(supplied.forecast_yoy_percent), forecast_yoy_unavailable_reason: supplied.forecast_yoy_unavailable_reason || '',
      baseline_input_storage_hash: BASELINE_STORAGE_HASH, baseline_input_content_hash: BASELINE_CONTENT_HASH,
    })
  }
  expect(output.rows.slice(0, 4).map(row => row.forecast_yoy_percent)).toEqual(['20', '0', '-100', '-120'])
  expect(output.rows[4]).toMatchObject({ prior_year_net_sales_php: '0', forecast_yoy_percent: '', forecast_yoy_unavailable_reason: 'baseline_zero' })
  expect(output.rows[5]).toMatchObject({ prior_year_net_sales_php: '-5', forecast_yoy_percent: '', forecast_yoy_unavailable_reason: 'baseline_negative' })
  expect(output.rows[8]).toMatchObject({ prediction: '', prior_year_net_sales_php: '100', forecast_yoy_percent: '', forecast_yoy_unavailable_reason: 'prediction_unavailable' })
  await page.locator('[data-predictive-research]').screenshot({ path: testInfo.outputPath('research-projections-desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  const tableRegion = page.getByRole('region', { name: 'Selected research model evidence', exact: true })
  await tableRegion.focus()
  expect(await tableRegion.evaluate(region => region.scrollWidth > region.clientWidth)).toBe(true)
  for (let step = 0; step < 15; step++) await page.keyboard.press('ArrowRight')
  await expect.poll(() => tableRegion.evaluate(region => region.scrollLeft)).toBeGreaterThan(200)
  await page.locator('[data-predictive-research]').screenshot({ path: testInfo.outputPath('research-projections-mobile.png') })
  await page.selectOption('#researchStage', 'development')
  await expect(page.locator('#researchLead')).toBeEnabled()
  await expect(page.locator('#researchComparisonWrap')).toBeVisible()
})

test('empty, source failure and invalid publication envelope clear every result and export', async ({ page }) => {
  await page.evaluate(data => (window as any).setPredictiveResearchData(data), evidence())
  await page.selectOption('#researchStage', 'projections')
  await expect(page.locator('#researchPoints')).toContainText('20.00%')
  await page.evaluate(() => (window as any).setPredictiveResearchData(null, 'Databricks source failure'))
  await expect(page.locator('#researchStatus')).toHaveText('Databricks source failure')
  await expect(page.locator('#researchPoints tbody tr')).toHaveCount(0)
  await expect(page.locator('#researchComparison tbody tr')).toHaveCount(0)
  await expect(page.locator('#researchExport')).toBeDisabled()
  expect(await page.evaluate(() => {
    let exportAttempted = false
    const create = URL.createObjectURL
    URL.createObjectURL = () => { exportAttempted = true; return 'blob:unexpected' }
    ;(window as any).exportPredictiveResearchCSV()
    URL.createObjectURL = create
    return exportAttempted
  })).toBe(false)
  await page.evaluate(data => {
    ;(window as any).setPredictiveResearchData(data)
    ;(window as any).setPredictiveResearchData({ ...data, runs: [null] })
  }, evidence())
  await expect(page.locator('#researchStatus')).toContainText('response rejected')
  await expect(page.locator('#researchPoints tbody tr')).toHaveCount(0)
  await expect(page.locator('#researchExport')).toBeDisabled()
  const data = { ...evidence(), status: 'empty', runs: [], selected_run_id: '' }
  await page.evaluate(data => (window as any).setPredictiveResearchData(data), data)
  await expect(page.locator('#researchStatus')).toContainText('No stored experiment matches')
  await expect(page.locator('#researchExport')).toBeDisabled()
  await page.evaluate(data => (window as any).setPredictiveResearchData({ ...data, publication_approved: true }), evidence())
  await expect(page.locator('#researchStatus')).toContainText('response rejected')
  await expect(page.locator('#researchPoints tbody tr')).toHaveCount(0)
  await page.evaluate(data => (window as any).setPredictiveResearchData({ ...data, source: {} }), evidence())
  await expect(page.locator('#researchStatus')).toContainText('source identity')
  await expect(page.locator('#researchExport')).toBeDisabled()
  await expect(page.locator('#researchDetailTitle')).toHaveText('Origin and target month evidence')
  await page.evaluate(data => (window as any).setPredictiveResearchData({ ...data, schema_version: 'unknown' }), evidence())
  await expect(page.locator('#researchStatus')).toContainText('response rejected')
  const mismatch = evidence(); mismatch.runs[0].source_matches_active = false
  await page.evaluate(data => (window as any).setPredictiveResearchData(data), mismatch)
  await expect(page.locator('#researchStatus')).toContainText('response rejected')
  await expect(page.locator('#researchComparison tbody tr')).toHaveCount(0)
})

test('run refresh uses authenticated gateway helper, clears pending data and ignores stale responses and teardown', async ({ page }) => {
  const script = ts.transpileModule(await readFile('services/api/dashboard-interactions.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  const result = await page.evaluate(async ({ script, payload, experiment21, experiment6 }) => {
    const pending: { path: string, resolve: (value: any) => void, reject: (error: any) => void }[] = []
    const module = { exports: {} as any }
    new Function('require', 'module', 'exports', script)((name: string) => name === './api-client' ? { getJson: (path: string) => new Promise((resolve, reject) => pending.push({ path, resolve, reject })) } : {}, module, module.exports)
    const api = module.exports
    ;(window as any).setPredictiveResearchData(payload)
    const first = api.refreshPredictiveResearch(experiment21)
    const cleared = document.querySelectorAll('#researchPoints tbody tr').length === 0 && (document.getElementById('researchExport') as HTMLButtonElement).disabled
    const second = api.refreshPredictiveResearch(experiment6)
    pending[1].resolve({ ...payload, selected_run_id: experiment6 }); await second
    pending[0].resolve(payload); await first
    const retained = (document.getElementById('researchRun') as HTMLSelectElement).value
    const third = api.refreshPredictiveResearch(experiment21)
    api.resetDashboardDeferredLoads(); pending[2].resolve(payload); await third
    const afterReset = document.querySelectorAll('#researchPoints tbody tr').length
    const fourth = api.refreshPredictiveResearch(); pending[3].reject(new Error('source failure')); await fourth
    return { paths: pending.map(p => p.path), cleared, retained, afterReset, status: document.getElementById('researchStatus')!.textContent }
  }, { script, payload: evidence(), experiment21: EXPERIMENT_21, experiment6: EXPERIMENT_6 })
  expect(result.paths).toEqual([`/api/sales/predictive-research?run_id=${EXPERIMENT_21}`, `/api/sales/predictive-research?run_id=${EXPERIMENT_6}`, `/api/sales/predictive-research?run_id=${EXPERIMENT_21}`, '/api/sales/predictive-research'])
  expect(result.cleared).toBe(true)
  expect(result.retained).toBe(EXPERIMENT_6)
  expect(result.afterReset).toBe(0)
  expect(result.status).toContain('unavailable from Databricks Gold')
})

test('run selector emits selected identity, handlers are bridged and controls fit mobile and desktop', async ({ page }, testInfo) => {
  await page.evaluate(data => {
    ;(window as any).setPredictiveResearchData(data)
    window.addEventListener('medshield:predictive-research-change', event => { (window as any).researchRequest = (event as CustomEvent).detail })
  }, evidence())
  await page.selectOption('#researchRun', EXPERIMENT_6)
  expect(await page.evaluate(() => (window as any).researchRequest)).toEqual({ run_id: EXPERIMENT_6 })
  await page.locator('#researchStage').focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.locator('#researchStage')).toHaveValue('retrospective_audit')
  await expect(page.locator('#researchScope')).toContainText('Already inspected retrospective audit')
  const handlers = ['setPredictiveResearchData', 'renderPredictiveResearch', 'changePredictiveResearch', 'exportPredictiveResearchCSV']
  expect(await page.evaluate(handlers => handlers.every(name => typeof (window as any)[name] === 'function'), handlers)).toBe(true)
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    for (const id of ['researchRun', 'researchStage', 'researchLead', 'researchModel', 'researchRefresh', 'researchExport']) {
      const box = await page.locator('#' + id).boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width, id).toBeLessThanOrEqual(width + 1)
    }
    await page.locator('[data-predictive-research]').screenshot({ path: testInfo.outputPath('research-' + width + '.png') })
  }
})
