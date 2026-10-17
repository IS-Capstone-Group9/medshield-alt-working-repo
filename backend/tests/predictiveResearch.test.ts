import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { parsePredictiveResearchQuery, PredictiveResearchInputError, PredictiveResearchUnavailableError, readPredictiveResearch } from '../src/predictiveResearch'
import { monthIndex, monthLabel } from '../src/forecastEvidence'
import { canonicalPythonJson } from '../src/predictiveResearchBaseline'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const H = (letter: string) => letter.repeat(64)
const release = { dataset_id: H('a'), fact_delta_version: 20, policy_version: 'policy1', area_mapping_sha256: H('b'), product_master_sha256: H('c'), publication_status: 'CANDIDATE' }
const active = async () => ({ ...release })
type Json = Record<string, any>
function fixture(models = ['last_value', 'challenger', 'sarima_failed']): Json {
  const run_id = H('d')
  const input_hash = H('e')
  const configurations = models.map(model_id => ({ model_id }))
  const predictions: Json[] = []
  const actual = (period: string) => period.endsWith('-01') ? 100 : period.endsWith('-02') ? -50 : period.endsWith('-03') ? 0 : 100
  for (const model of models) for (const [stage, origin] of [['development', '2022-12'], ['retrospective_audit', '2024-12']]) {
    for (let lead = 1; lead <= 12; lead++) {
      const target = monthLabel(monthIndex(origin) + lead)
      const value = actual(target)
      const predicted = model === 'last_value' ? lead === 1 ? 120 : lead === 2 ? -40 : value : value - 10
      predictions.push({ run_id, model_id: model, series_id: 'company:net_sales:PHP', target_name: 'net_sales', unit: 'PHP', scope: 'company', stage, origin_period: origin, target_period: target, lead_months: lead, actual: value,
        prediction: model === 'sarima_failed' ? null : predicted, missing_reason: model === 'sarima_failed' ? 'nonconvergence' : null, intervals: [] })
    }
  }
  for (let lead = 1; lead <= 12; lead++) predictions.push({ run_id, model_id: 'last_value', series_id: 'company:net_sales:PHP', target_name: 'net_sales', unit: 'PHP', scope: 'company', stage: 'future', origin_period: '2025-12', target_period: monthLabel(monthIndex('2025-12') + lead), lead_months: lead, actual: null, prediction: 100, missing_reason: null,
    intervals: [{ level: 0.8, lower: null, upper: null, method: 'lead_specific_empirical_absolute_error', sample_count: 5, reason: 'Insufficient support' }] })
  const value = { schema_version: '1.0', status: 'exploratory_evaluated_unpublished', publication_approved: false, blockers: [], run_id, experiment_id: H('f'), evaluation_finished_at: '2026-10-09T14:00:00Z', protocol: 'rolling_origins_fixed_origin_multistep', experiment_protocol: { promotion: false },
    manifest: { dataset_id: release.dataset_id, source_checksum: H('1'), accepted_descriptive_release_id: H('1'), fact_delta_version: release.fact_delta_version, transformation_policy: release.policy_version, catalog_mapping_version: release.product_master_sha256, geography_mapping_version: release.area_mapping_sha256, source_publication_status: release.publication_status, source_table: 'workspace.medshield_gold.sales_restart_fact_candidate', training_approved: true, reconciliation_passed: true, publication_approved: false, revision_policy: 'retrospective_revised_snapshot_no_historical_availability_vintages', extracted_at: '2026-10-09T13:00:00Z', source_available_at: '2026-10-09T12:00:00Z' },
    identity: { input_hash, code_identity: { predictive_source_sha256: H('2') }, configurations, schedule: { training_start: '2020-01', development_origins: ['2022-12'], audit_origin: '2024-12', audit_end: '2025-12', audit_label: 'retrospective_audit' } },
    selection: { model_id: 'last_value', stage: 'development_only', frozen_before_audit: true, audit_previously_inspected: true, reason: 'Original frozen reference', status: 'exploratory_candidate_only' },
    folds: ['2022-12', '2024-12'].map(origin_period => ({ origin_period, training_start: '2020-01', training_count: monthIndex(origin_period) - monthIndex('2020-01') + 1, training_hash: H('3'), protocol: 'fixed_origin_multistep', vintage_policy: 'retrospective_revised_snapshot_no_historical_availability_vintages', target_periods: Array.from({ length: 12 }, (_, index) => monthLabel(monthIndex(origin_period) + index + 1)) })),
    evaluations: models.map(model_id => ({ model_id })), model_cards: configurations.map(configuration => ({ model_id: configuration.model_id, configuration, run_id, input_hash, unit: 'PHP', target: 'net_sales', scope: 'company' })), predictions,
    limitations: ['Frozen revised snapshot; historical availability is unverified.'] }
  value.identity.input_hash = hash(canonicalPythonJson(JSON.stringify({ schema_version: '1.0', manifest: value.manifest, rows: baselineRows() })))
  for (const card of value.model_cards) card.input_hash = value.identity.input_hash
  return value
}
function baselineRows() {
  return Array.from({ length: 12 }, (_, index) => ({ period: monthLabel(monthIndex('2025-01') + index), series_id: 'company:net_sales:PHP', target_name: 'net_sales', grain: 'company_month', scope: 'company', unit: 'PHP', target_value: 100, target_value_decimal: '100.000000', period_closed: true, calendar_closed: true, coverage_status: 'complete', value_status: 'observed', eligible_for_evaluation: true, eligible_for_publication: false, blockers: [], missing_reason: null }))
}
function warehouse(rows: ReturnType<typeof row>[]) {
  return async (statement: string) => {
    if (!statement.includes('mart_forecast_monthly_candidate')) return result(rows)
    const unique = new Map(rows.map(stored => { const run = JSON.parse(stored.payload_json); return [JSON.stringify(run.manifest), run] }))
    return result([...unique.values()].flatMap(run => baselineRows().map(value => ({ input_hash: H('9'), dataset_id: run.manifest.dataset_id, fact_delta_version: String(run.manifest.fact_delta_version), mapping_version: `${run.manifest.geography_mapping_version}:${run.manifest.catalog_mapping_version}`, series_id: value.series_id, target_name: value.target_name, period: `${value.period}-01`, target_value: '100.00', unit: value.unit, period_closed: 'true', coverage_status: value.coverage_status, eligible_for_evaluation: 'true', eligible_for_publication: 'false', payload_json: JSON.stringify({ manifest: run.manifest, row: value }) }))))
  }
}
function row(run = fixture()) {
  const raw = JSON.stringify(run)
  const artifact_hash = hash(raw)
  return { run_id: `experiment_${artifact_hash}`, model_id: run.selection.model_id, dataset_id: run.manifest.dataset_id, input_hash: run.identity.input_hash, code_hash: run.identity.code_identity.predictive_source_sha256, artifact_hash, training_cutoff: '2025-12-01', payload_json: raw }
}
const result = (rows: Record<string, string | null>[]) => ({ columns: Object.keys(rows[0] ?? {}), rows })
async function read(run = fixture()) { return await readPredictiveResearch({}, warehouse([row(run)]), active) as any }

test('signed revenue, explicit zero and hand-solvable same-cohort errors are preserved', async () => {
  const value = await read()
  assert.equal(value.status, 'research_candidate_unpublished')
  assert.equal(value.publication_approved, false); assert.equal(value.activation_allowed, false)
  const group = value.cohorts.development.groups['3']
  assert.equal(group.n, 3); assert.equal(group.distinct_target_months, 3)
  assert.equal(group.comparison_basis, 'complete_models_same_expected_origin_target_lead_keys')
  const model = group.models.last_value
  assert.equal(model.available, true); assert.equal(model.metrics.n, 3)
  assert.deepEqual(model.points.map((p: Json) => p.actual), [100, -50, 0])
  assert.deepEqual(model.points.map((p: Json) => p.signed_error_php), [20, 10, 0])
  assert.equal(model.metrics.mae, 10); assert.equal(model.metrics.wape, 20); assert.equal(model.metrics.bias, 10); assert.equal(model.metrics.normalized_bias, 20)
  assert.ok(Math.abs(model.metrics.rmse - Math.sqrt(500 / 3)) < 1e-10)
  assert.equal(group.models.challenger.metrics.n, 3); assert.equal(group.models.challenger.metrics.bias, -10)
})

test('one unavailable model stays visible without collapsing valid comparisons', async () => {
  const value = await read()
  const models = value.cohorts.retrospective_audit.groups['12'].models
  assert.equal(models.last_value.metrics.n, 12)
  assert.equal(models.challenger.metrics.n, 12)
  assert.equal(models.sarima_failed.available, false); assert.equal(models.sarima_failed.metrics.n, 0)
  assert.equal(models.sarima_failed.metrics.mae, null); assert.equal(models.sarima_failed.individual_scored_count, 0)
  assert.equal(models.sarima_failed.points[0].error_unavailable_reason, 'nonconvergence')
})

test('a missing origin key excludes only that model and preserves explicit unavailable points', async () => {
  const run = fixture()
  run.predictions = run.predictions.filter((p: Json) => !(p.stage === 'development' && p.model_id === 'challenger' && p.lead_months === 2))
  const value = await read(run)
  const models = value.cohorts.development.groups['3'].models
  assert.equal(models.last_value.metrics.n, 3)
  assert.equal(models.challenger.available, false); assert.equal(models.challenger.individual_scored_count, 2)
  assert.equal(models.challenger.points[1].prediction, null); assert.equal(models.challenger.points[1].actual, -50)
  assert.equal(models.challenger.points[1].error_unavailable_reason, 'prediction_key_missing')
})

test('missing actuals stay null and prevent same-key model scores', async () => {
  const run = fixture()
  for (const point of run.predictions) if (point.stage === 'development' && point.target_period === '2023-02') point.actual = null
  const models = (await read(run)).cohorts.development.groups['3'].models
  assert.equal(models.last_value.available, false); assert.equal(models.last_value.metrics.wape, null)
  assert.equal(models.last_value.points[1].actual, null); assert.equal(models.last_value.points[1].absolute_error_php, null)
  assert.equal(models.last_value.points[1].error_unavailable_reason, 'actual_unavailable')
})

test('zero absolute actual denominator returns null WAPE instead of zero or accuracy', async () => {
  const run = fixture(['last_value'])
  for (const point of run.predictions) if (point.stage !== 'future') { point.actual = 0; point.prediction = 5 }
  const metrics = (await read(run)).cohorts.development.groups['3'].models.last_value.metrics
  assert.equal(metrics.mae, 5); assert.equal(metrics.wape, null); assert.equal(metrics.normalized_bias, null)
  assert.equal(metrics.unavailable_reason, 'zero_absolute_actual_denominator')
})

test('origin keys remain distinct when target months overlap', async () => {
  const run = fixture(['last_value'])
  run.identity.schedule.development_origins.push('2023-01')
  run.folds.push({ ...run.folds[0], origin_period: '2023-01', training_count: 37, target_periods: Array.from({ length: 12 }, (_, index) => monthLabel(monthIndex('2023-01') + index + 1)) })
  const existing = run.predictions.filter((p: Json) => p.stage === 'development')
  for (const point of existing) {
    const target = monthLabel(monthIndex('2023-01') + point.lead_months)
    const value = target.endsWith('-01') ? 100 : target.endsWith('-02') ? -50 : target.endsWith('-03') ? 0 : 100
    run.predictions.push({ ...point, origin_period: '2023-01', target_period: target, actual: value, prediction: value + 10 })
  }
  const group = (await read(run)).cohorts.development.groups['3']
  assert.equal(group.n, 6); assert.equal(group.distinct_target_months, 4)
  assert.equal(group.models.last_value.points.filter((p: Json) => p.target_period === '2023-02').length, 2)
  assert.equal(group.models.last_value.metrics.n, 6)
})

test('candidate projections use issue time, true leads and no invented future errors or bands', async () => {
  const value = await read()
  const projections = value.candidate_projections
  assert.equal(projections.generated_at, '2026-10-09T14:00:00Z'); assert.equal(projections.training_cutoff, '2025-12')
  assert.equal(projections.points.length, 12)
  assert.equal(projections.points.filter((p: Json) => p.temporal_status_at_generation === 'elapsed').length, 9)
  assert.equal(projections.points.filter((p: Json) => p.temporal_status_at_generation === 'current').length, 1)
  assert.equal(projections.points.filter((p: Json) => p.temporal_status_at_generation === 'future').length, 2)
  for (const point of projections.points) { assert.equal(point.actual, null); assert.equal(point.absolute_error_php, null); assert.equal(point.error_unavailable_reason, 'actual_unavailable'); assert.equal(point.intervals[0].lower, null) }
  for (const point of projections.points) { assert.equal(point.prior_year_net_sales_php, 100); assert.equal(point.forecast_yoy_percent, 0); assert.equal(point.forecast_yoy_unavailable_reason, null); assert.equal(point.baseline_input_content_hash, fixture().identity.input_hash); assert.equal(point.baseline_input_storage_hash, H('9')) }
  assert.equal(projections.points[9].lead_months, 10)
  assert.equal(value.cohorts.retrospective_audit.groups['12'].models.last_value.points.some((p: Json) => p.target_period.startsWith('2026')), false)
  const run = fixture(); delete run.evaluation_finished_at
  assert.equal((await read(run)).candidate_projections.unavailable_reason, 'generation_timestamp_unavailable')
  assert.equal((await read(run)).candidate_projections.points.length, 0)
  const noFuture = fixture(); noFuture.predictions = noFuture.predictions.filter((p: Json) => p.stage !== 'future')
  assert.equal((await read(noFuture)).candidate_projections.unavailable_reason, 'candidate_projections_unavailable')
})

test('strict scalar filters reject malformed, repeated, structured, blank and unknown values before queries', async () => {
  for (const query of [{ run_id: '' }, { run_id: ['experiment_' + H('a')] }, { run_id: { a: 'b' } }, { run_id: "experiment_' OR 1=1" }, { sector: 'All' }, { run_id: 'run1' }]) {
    await assert.rejects(readPredictiveResearch(query, async () => { throw Error('must not query') }, active), PredictiveResearchInputError)
  }
  assert.equal(parsePredictiveResearchQuery({}), undefined)
})

test('default chooses largest matching grid without calling it winner/latest; explicit run works', async () => {
  const small = row(fixture(['last_value']))
  const large = row(fixture())
  let sql = ''
  const execute = async (statement: string) => { if (!statement.includes('mart_forecast_monthly_candidate')) sql = statement; return warehouse([small, large])(statement) }
  const value = await readPredictiveResearch({}, execute, active)
  assert.equal(value.selected_run_id, large.run_id)
  assert.equal(value.runs.length, 2)
  assert.equal(value.selection_rule, 'largest_matching_configuration_grid_then_run_id_not_model_ranking_or_latest')
  assert.equal((await readPredictiveResearch({ run_id: small.run_id }, execute, active)).selected_run_id, small.run_id)
  assert.ok(sql.includes('fact_forecast_run_candidate')); assert.equal(/\b(MERGE|UPDATE|INSERT|DELETE)\b/.test(sql), false)
  assert.equal(sql.includes(small.run_id), false)
})

test('empty source is distinct from unavailable warehouse or mismatched selected source', async () => {
  assert.equal((await readPredictiveResearch({}, async () => result([]), active)).status, 'empty')
  const mismatch = fixture(); mismatch.manifest.fact_delta_version = 19
  const stored = row(mismatch)
  const empty = await readPredictiveResearch({}, async () => result([stored]), active)
  assert.equal(empty.status, 'empty'); assert.equal(empty.runs[0].source_matches_active, false)
  await assert.rejects(readPredictiveResearch({ run_id: stored.run_id }, async () => result([stored]), active), PredictiveResearchUnavailableError)
  for (const failure of [async () => { throw Error('SQL token=private secret') }, async () => { throw Error('table missing') }]) await assert.rejects(readPredictiveResearch({}, failure, active), error => error instanceof PredictiveResearchUnavailableError && !error.message.includes('secret'))
  await assert.rejects(readPredictiveResearch({}, async () => result([]), async () => { throw Error('release down') }), PredictiveResearchUnavailableError)
})

test('artifact hash, metadata, grid and point corruption fail closed', async () => {
  const damaged = row(); damaged.payload_json += ' '
  await assert.rejects(readPredictiveResearch({}, async () => result([damaged]), active), PredictiveResearchUnavailableError)
  const mutations: Array<(run: Json) => void> = [
    r => { r.predictions.push({ ...r.predictions[0] }) }, r => { r.predictions[0].run_id = H('0') }, r => { r.predictions[0].lead_months = 2 },
    r => { r.predictions[0].unit = 'units' }, r => { r.predictions[0].scope = 'sku' }, r => { r.predictions[0].stage = 'untouched_holdout' },
    r => { r.predictions[12].actual = 200 }, r => { r.predictions[0].prediction = null }, r => { r.selection.frozen_before_audit = false },
    r => { r.identity.configurations.push({ model_id: 'last_value' }) }, r => { r.model_cards[0].configuration = { model_id: 'wrong' } },
    r => { r.predictions.find((p: Json) => p.stage === 'future').actual = 1 }, r => { r.evaluation_finished_at = 'wrong' },
    r => { r.predictions.find((p: Json) => p.stage === 'future').intervals[0].lower = 1 },
    r => { r.publication_approved = true }, r => { r.predictions[0].prediction = Infinity },
    r => { r.evaluation_finished_at = '2026-02-30T14:00:00Z' }, r => { r.protocol = 'unknown' },
    r => { r.folds[0].training_count = 1 }, r => { r.folds[0].target_periods.pop() },
  ]
  for (const mutate of mutations) { const run = fixture(); mutate(run); await assert.rejects(read(run), PredictiveResearchUnavailableError) }
  for (const key of ['input_hash', 'code_hash', 'model_id', 'dataset_id', 'training_cutoff']) {
    const stored = row(); stored[key as keyof typeof stored] = 'wrong'
    await assert.rejects(readPredictiveResearch({}, async () => result([stored]), active), PredictiveResearchUnavailableError)
  }
})

test('catalog/geography/policy/source status mismatch cannot be selected or activated', async () => {
  for (const key of ['catalog_mapping_version', 'geography_mapping_version', 'transformation_policy', 'source_publication_status', 'dataset_id']) {
    const run = fixture(); run.manifest[key] = key.endsWith('_version') || key === 'dataset_id' ? H('9') : 'other'
    const stored = row(run)
    await assert.rejects(readPredictiveResearch({ run_id: stored.run_id }, async () => result([stored]), active), PredictiveResearchUnavailableError)
  }
})

test('identity drift, duplicate experiment rows and oversized stores fail visibly', async () => {
  let reads = 0
  await assert.rejects(readPredictiveResearch({}, async () => result([row()]), async () => ({ ...release, fact_delta_version: ++reads === 1 ? 20 : 21 })), PredictiveResearchUnavailableError)
  const stored = row()
  await assert.rejects(readPredictiveResearch({}, async () => result([stored, stored]), active), PredictiveResearchUnavailableError)
  await assert.rejects(readPredictiveResearch({}, async () => result(Array.from({ length: 101 }, () => stored)), active), PredictiveResearchUnavailableError)
  const sameObject = { ...release }; let calls = 0
  await assert.rejects(readPredictiveResearch({}, async () => result([row()]), async () => { if (++calls > 1) sameObject.fact_delta_version = 21; return sameObject }), PredictiveResearchUnavailableError)
})

test('frozen baseline failures and release drift after the added read mask the complete response', async () => {
  let reads = 0
  await assert.rejects(readPredictiveResearch({}, warehouse([row()]), async () => ({ ...release, fact_delta_version: ++reads === 3 ? 21 : 20 })), PredictiveResearchUnavailableError)
  const valid = warehouse([row()])
  await assert.rejects(readPredictiveResearch({}, async statement => {
    if (statement.includes('mart_forecast_monthly_candidate')) throw Error('private warehouse diagnostic token=secret')
    return valid(statement)
  }, active), error => error instanceof PredictiveResearchUnavailableError && !error.message.includes('secret'))
})

test('data publication approval and legacy absent model flag do not approve a candidate model', async () => {
  const run = fixture(); run.manifest.publication_approved = true
  run.identity.input_hash = hash(canonicalPythonJson(JSON.stringify({ schema_version: '1.0', manifest: run.manifest, rows: baselineRows() })))
  for (const card of run.model_cards) card.input_hash = run.identity.input_hash
  assert.equal((await read(run)).publication_approved, false)
  run.status = 'evaluated_unpublished'; delete run.publication_approved
  assert.equal((await read(run)).status, 'research_candidate_unpublished')
})

test('development rows cannot extend into the retrospective audit target period', async () => {
  const run = fixture(['last_value'])
  run.identity.schedule.development_origins = ['2024-09']
  run.folds[0] = { ...run.folds[0], origin_period: '2024-09', training_count: 57, target_periods: Array.from({ length: 12 }, (_, index) => monthLabel(monthIndex('2024-09') + index + 1)) }
  for (const point of run.predictions) if (point.stage === 'development') { point.origin_period = '2024-09'; point.target_period = monthLabel(monthIndex('2024-09') + point.lead_months) }
  await assert.rejects(read(run), PredictiveResearchUnavailableError)
})

test('finite but overflowing individual errors fail even in an incomplete model grid', async () => {
  const run = fixture(['last_value'])
  run.predictions[0].actual = -Number.MAX_VALUE; run.predictions[0].prediction = Number.MAX_VALUE
  run.predictions = run.predictions.filter((p: Json) => !(p.stage === 'development' && p.lead_months === 2))
  await assert.rejects(read(run), PredictiveResearchUnavailableError)
})

test('HTTP route uses authentication and fixed masked failure response', () => {
  const source = readFileSync(new URL('../src/server.ts', import.meta.url), 'utf8')
  const route = source.slice(source.indexOf("app.get('/api/sales/predictive-research'"), source.indexOf("app.get('/api/sales/forecast-validation'"))
  assert.ok(route.includes("app.get('/api/sales/predictive-research', requireAuth"))
  assert.ok(route.includes('invalid ? 400 : 503')); assert.ok(route.includes('PREDICTIVE_RESEARCH_UNAVAILABLE'))
  assert.equal(route.includes('console.'), false)
})
