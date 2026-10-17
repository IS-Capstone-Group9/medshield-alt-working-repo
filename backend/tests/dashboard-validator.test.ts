import assert from 'node:assert/strict'
import test from 'node:test'
import { assertForecastValidationScopes as validateForecastScopes, assertGoldCoverage, assertObservedAmount, assertPlanningShortlist } from '../scripts/validate-databricks-dashboard'

const assertForecastValidationScopes = (...args: Parameters<typeof validateForecastScopes>) =>
  validateForecastScopes(args[0], args[1], args[2], args[3] ?? new Date('2026-10-16T04:00:00Z'))

const release = { fact_delta_version: 91, dataset_id: 'fixture-dataset', policy_version: 'fixture-policy',
  area_mapping_sha256: 'fixture-area', product_master_sha256: 'fixture-catalog', publication_status: 'candidate_only',
  resolution_policy: 'fixture-resolution', transaction_evidence_sha256: 'fixture-evidence', catalog_helper_sha256: 'fixture-helper' }
const names = { seasonal_naive: 'Seasonal naive', last_value: 'Last observed value', recent_mean_3: 'Recent mean (3 months)', recent_mean_6: 'Recent mean (6 months)' }
// Independent fixture calendar: index 0 is January 2023; 35 is December 2025.
const periodAt = (index: number) => new Date(Date.UTC(2023, index, 1)).toISOString().slice(0, 7)
type Point = { series: string; target: string; origin: string; period: string; lead: number; actual: number | null;
  prediction: number | null; lower: null; upper: null; missing_reason: string | null }
const fixturePoint = (period: number, origin: number, actual: number | null, prediction: number | null, reason: string | null): Point => ({
  series: 'company', target: 'recorded_net_sales', origin: periodAt(origin), period: periodAt(period), lead: period - origin,
  actual, prediction, lower: null, upper: null, missing_reason: reason,
})
const companyEvidence = () => {
  const views = Object.fromEntries([3, 6, 12].map(horizon => {
    const backtest = Array.from({ length: horizon }, (_, index) => fixturePoint(36 - horizon + index, 35 - horizon, 136 - horizon + index, 100, null))
    const models = Object.fromEntries(Object.keys(names).map(id => [id, {
      backtest: structuredClone(backtest),
      forecast: Array.from({ length: horizon }, (_, index) => fixturePoint(45 + index, 35, null, null, 'unpublished_forecast')),
      metrics: { n: horizon }, comparison_metrics: { n: horizon }, missing_prediction_count: 0,
    }]))
    return [String(horizon), { evaluation_protocol: 'fixed_origin_multi_step', training_end: periodAt(35 - horizon),
      evaluation_start: periodAt(36 - horizon), evaluation_end: '2025-12', common_scored_months: horizon,
      common_evaluation_keys: backtest.map(point => JSON.stringify([point.series, point.target, point.origin, point.period, point.lead])).sort(), models }]
  }))
  return { schema_version: 'forecast-validation.v2', scope: { sector: 'All', product: '', metric: 'revenue', unit: '₱ net sales' },
    status: 'exploratory', publication_status: 'unpublished', reporting_coverage_status: 'unverified', evaluation_protocol: 'fixed_origin_multi_step',
    source: { file: 'workspace.medshield_gold.sales_restart_fact_candidate', view: 'workspace.medshield_gold.sales_restart_fact_candidate', system_of_record: 'databricks', release: structuredClone(release), as_of: '2026-10-16' },
    actuals: Array.from({ length: 36 }, (_, index) => ({ period: periodAt(index), actual: 100 + index as number | null, period_closed: true })),
    origin: '2025-12', last_actual_period: '2025-12', observed_months: 36, display_start: '2026-10', validated_lead_range: null,
    views, models: { ...names } }
}

const unsupportedEvidence = () => ({ ...companyEvidence(),
  scope: { sector: 'Unknown', product: '', metric: 'revenue', unit: '₱ net sales' }, status: 'blocked', views: {}, models: {} })

test('dashboard validator separates company benchmarks from blocked buyer scope', () => {
  const checked = assertForecastValidationScopes(companyEvidence(), unsupportedEvidence(), release)
  assert.deepEqual(checked['3'], { training_end: '2025-09', evaluation_start: '2025-10', evaluation_end: '2025-12',
    display_start: '2026-10', display_end: '2026-12', first_future_lead: 10, last_future_lead: 12, model_count: 4, common_scored_months: 3 })
  assert.equal(checked['12'].training_end, '2024-12')
  assert.equal(checked['12'].display_end, '2027-09')
  assert.equal(checked['12'].last_future_lead, 21)
})

test('dashboard validator rejects company evidence missing supported horizons', () => {
  assert.throws(() => assertForecastValidationScopes({ ...companyEvidence(), views: {} }, unsupportedEvidence(), release), /supported company forecast horizons/)
  assert.throws(() => assertForecastValidationScopes({ ...companyEvidence(), views: { '3': {}, '6': {}, '12': {} } }, unsupportedEvidence(), release), /evaluation protocol/)
})

test('dashboard validator rejects a consistently shifted future window and stale as-of date', () => {
  const shifted = companyEvidence()
  shifted.display_start = '2026-11'
  for (const view of Object.values(shifted.views)) for (const model of Object.values(view.models)) {
    model.forecast.forEach((point, index) => { point.period = periodAt(46 + index); point.lead += 1 })
  }
  assert.throws(() => assertForecastValidationScopes(shifted, unsupportedEvidence(), release), /current Manila month/)
  const stale = companyEvidence()
  stale.source.as_of = '2026-10-15'
  assert.throws(() => assertForecastValidationScopes(stale, unsupportedEvidence(), release), /current Manila date/)
  assert.throws(() => assertForecastValidationScopes(companyEvidence(), { ...unsupportedEvidence(), display_start: '2026-11' }, release), /current Manila month/)
})

test('dashboard validator uses Manila date at a UTC month boundary without changing model origin', () => {
  const company = companyEvidence(), unknown = unsupportedEvidence()
  company.source.as_of = unknown.source.as_of = '2026-10-01'
  const checked = assertForecastValidationScopes(company, unknown, release, new Date('2026-09-30T16:00:00Z'))
  assert.equal(checked['12'].first_future_lead, 10)
  assert.equal(checked['12'].last_future_lead, 21)
})

test('dashboard validator rejects forecast or model choices on the blocked buyer scope', () => {
  assert.throws(() => assertForecastValidationScopes(companyEvidence(), { ...unsupportedEvidence(), views: { '3': {} } }, release), /unsupported buyer has no forecast horizons/)
  assert.throws(() => assertForecastValidationScopes(companyEvidence(), { ...unsupportedEvidence(), models: { last_value: 'Last value' } }, release), /unsupported buyer has no model choices/)
})

test('dashboard validator does not confuse exploratory benchmarks with publication', () => {
  assert.throws(() => assertForecastValidationScopes({ ...companyEvidence(), publication_status: 'approved' }, unsupportedEvidence(), release), /benchmark publication status/)
})

test('dashboard validator requires exact company and blocked request scopes', () => {
  for (const scope of [{ ...companyEvidence().scope, product: 'raw-label' }, { ...companyEvidence().scope, metric: 'quantity' }, { ...companyEvidence().scope, unit: 'boxes' }]) {
    assert.throws(() => assertForecastValidationScopes({ ...companyEvidence(), scope }, unsupportedEvidence(), release), /company forecast scope/)
    assert.throws(() => assertForecastValidationScopes(companyEvidence(), { ...unsupportedEvidence(), scope: { ...scope, sector: 'Unknown' } }, release), /unsupported buyer scope/)
  }
  assert.throws(() => assertForecastValidationScopes({ ...companyEvidence(), models: { last_value: 'Last value' } }, unsupportedEvidence(), release), /model choices/)
})

test('dashboard validator binds both forecast scopes to the exact captured source and catalog release', () => {
  for (const field of Object.keys(release) as Array<keyof typeof release>) {
    const evidence = companyEvidence()
    const changed = { ...evidence.source.release, [field]: 'different' }
    assert.throws(() => assertForecastValidationScopes({ ...evidence, source: { ...evidence.source, release: changed } }, unsupportedEvidence(), release), /immutable release/)
    assert.throws(() => assertForecastValidationScopes(evidence, { ...unsupportedEvidence(), source: { ...evidence.source, release: changed } }, release), /immutable release/)
  }
  assert.throws(() => assertForecastValidationScopes({ ...companyEvidence(), source: { ...companyEvidence().source, system_of_record: 'local' } }, unsupportedEvidence(), release), /system of record/)
  assert.throws(() => assertForecastValidationScopes({ ...companyEvidence(), source: { ...companyEvidence().source, release: null } }, unsupportedEvidence(), release), /immutable release/)
})

test('dashboard validator rejects truncated, duplicate or wrong-origin evaluation keys despite correct horizon labels', () => {
  const mutate = (change: (evidence: ReturnType<typeof companyEvidence>) => void, expected: RegExp) => {
    const evidence = companyEvidence()
    change(evidence)
    assert.throws(() => assertForecastValidationScopes(evidence, unsupportedEvidence(), release), expected)
  }
  mutate(evidence => { evidence.views['3'].models.last_value.backtest.pop() }, /complete backtest window/)
  mutate(evidence => { evidence.views['3'].models.last_value.backtest[1] = { ...evidence.views['3'].models.last_value.backtest[0] } }, /consecutive backtest target/)
  mutate(evidence => { evidence.views['3'].models.last_value.backtest[0].origin = '2025-08' }, /fixed backtest origin/)
  mutate(evidence => { evidence.views['3'].models.last_value.backtest[0].lead = 3 }, /actual calendar backtest lead/)
  mutate(evidence => { evidence.views['3'].models.last_value.backtest[0].target = 'quantity' }, /backtest target key/)
  mutate(evidence => { evidence.views['12'].training_end = '2025-01' }, /true training cutoff/)
  mutate(evidence => { evidence.views['6'].evaluation_start = '2025-08' }, /evaluation start/)
  mutate(evidence => { evidence.views['3'].models.last_value.forecast[0].lead = 1 }, /actual calendar forecast lead/)
  mutate(evidence => { evidence.views['3'].models.last_value.forecast[0].origin = '2026-09' }, /original forecast cutoff/)
  mutate(evidence => { evidence.views['3'].models.last_value.forecast[0].prediction = 100 }, /unpublished forecast unavailable/)
})

test('dashboard validator retains null gaps and exact common-key intersections with different missing model support', () => {
  const evidence = companyEvidence()
  evidence.actuals[33].actual = null // October 2025 is missing, not observed zero.
  evidence.actuals[34].actual = 0
  evidence.observed_months = 35
  for (const view of Object.values(evidence.views)) {
    for (const [id, model] of Object.entries(view.models)) {
      for (const point of model.backtest) {
        if (point.period === '2025-10') { point.actual = null; point.missing_reason = 'missing_actual' }
        if (point.period === '2025-11') point.actual = 0
        if (id === 'seasonal_naive' && point.period === '2025-11') { point.prediction = null; point.missing_reason = 'missing_training_history' }
      }
      model.metrics.n = model.backtest.filter(point => point.actual !== null && point.prediction !== null).length
      model.missing_prediction_count = model.backtest.filter(point => point.prediction === null).length
      model.comparison_metrics.n = model.backtest.length - 2
    }
    view.common_evaluation_keys = view.common_evaluation_keys.filter(key => !key.includes('2025-10') && !key.includes('2025-11'))
    view.common_scored_months = view.common_evaluation_keys.length
  }
  assert.equal(assertForecastValidationScopes(evidence, unsupportedEvidence(), release)['3'].common_scored_months, 1)
  evidence.views['3'].common_evaluation_keys = ['different-origin-and-target']
  assert.throws(() => assertForecastValidationScopes(evidence, unsupportedEvidence(), release), /exact common origin-target-lead keys/)
})

test('dashboard validator rejects nonfinite, source-mismatched and unexplained missing values', () => {
  for (const value of [NaN, Infinity, undefined]) {
    const evidence = companyEvidence()
    Object.assign(evidence.views['3'].models.last_value.backtest[0], { actual: value })
    assert.throws(() => assertForecastValidationScopes(evidence, unsupportedEvidence(), release), /finite observed value or null/)
  }
  const mismatch = companyEvidence()
  mismatch.views['3'].models.last_value.backtest[0].actual = 0
  assert.throws(() => assertForecastValidationScopes(mismatch, unsupportedEvidence(), release), /actual matches source observation/)
  const missing = companyEvidence()
  missing.views['3'].models.last_value.backtest[0].prediction = null
  assert.throws(() => assertForecastValidationScopes(missing, unsupportedEvidence(), release), /missing evidence reason/)
})

const source = () => ({ fact_rows: '7', analysis_rows: '6', first_year: '2024', last_year: '2026', observed_years: '2', product_labels: '3' })
const quality = () => ({ rows_extracted: 7, rows_accepted: 6, years: { '2024': 2, '2026': 4 } })
const snapshot = () => ({ monthly: Array(36).fill({}), year_summary: [{}, {}], top_products: [{}, {}, {}], totals: { total_transactions: 6 } })

test('dashboard validator derives calendar gaps and later years from Gold instead of a fixed study count', () => {
  assert.deepEqual(assertGoldCoverage(snapshot(), quality(), source()), { extracted: 7, accepted: 6, firstYear: 2024, lastYear: 2026 })
  assert.throws(() => assertGoldCoverage({ ...snapshot(), monthly: Array(24).fill({}) }, quality(), source()), /complete calendar month spine/)
})

test('dashboard validator exposes extra label-based exclusion of an eligible Gold survivor', () => {
  assert.throws(() => assertGoldCoverage(snapshot(), { ...quality(), rows_accepted: 5 }, source()), /validation\/fact survivor population/)
  assert.throws(() => assertGoldCoverage({ ...snapshot(), top_products: [{}, {}] }, quality(), source()), /bounded source-label snapshot population/)
})

test('dashboard validator applies the snapshot cap only after counting the complete source population', () => {
  assert.doesNotThrow(() => assertGoldCoverage({ ...snapshot(), top_products: Array(100).fill({}) }, quality(), { ...source(), product_labels: '125' }))
  assert.throws(() => assertGoldCoverage(snapshot(), quality(), { ...source(), fact_rows: null }), /must be an observed count/)
})

test('financial validation distinguishes observed zero from absent or nonfinite amounts', () => {
  assert.doesNotThrow(() => assertObservedAmount(0, 0, 'fixture'))
  assert.doesNotThrow(() => assertObservedAmount(-15.25, -15.25, 'fixture'))
  assert.throws(() => assertObservedAmount(null, 0, 'fixture'), /must be observed/)
  assert.throws(() => assertObservedAmount(0, null, 'fixture'), /must be observed/)
  assert.throws(() => assertObservedAmount(NaN, 0, 'fixture'), /must be observed/)
  assert.throws(() => assertObservedAmount(10, 11, 'fixture'), /10 vs 11/)
})

const emptyPlanning = () => ({ scope: { sector: 'Unknown', territory: 'all' }, products: [], period_start: null, period_end: null, months_stale: null,
  eligible_products: 0, excluded_nonpositive_products: 0, ranking_revenue: 0, shortlist_share_pct: 0 })

test('an empty Unknown planning scope truthfully reports absent history without invented products', () => {
  assert.doesNotThrow(() => assertPlanningShortlist(emptyPlanning()))
  assert.throws(() => assertPlanningShortlist({ ...emptyPlanning(), months_stale: 0 }), /absent history has no staleness/)
  assert.throws(() => assertPlanningShortlist({ ...emptyPlanning(), products: [{ revenue: 10 }] }), /selection population/)
  assert.throws(() => assertPlanningShortlist({ ...emptyPlanning(), ranking_revenue: 100 }), /empty positive-revenue ranking/)
})

test('observed planning history with no positive products remains distinct from absent history', () => {
  assert.doesNotThrow(() => assertPlanningShortlist({ ...emptyPlanning(), period_start: '2025-01', period_end: '2025-12', months_stale: 9, excluded_nonpositive_products: 3 }))
  assert.throws(() => assertPlanningShortlist({ ...emptyPlanning(), excluded_nonpositive_products: 3 }), /absent history has no excluded/)
})

test('nonempty planning shortlist reconciles selected positive revenue to its complete ranking denominator', () => {
  const observed = { ...emptyPlanning(), period_start: '2025-01', period_end: '2025-12', months_stale: 9, eligible_products: 6,
    products: [{ revenue: 40 }, { revenue: 20 }], ranking_revenue: 100, shortlist_share_pct: 60 }
  assert.doesNotThrow(() => assertPlanningShortlist(observed))
  assert.throws(() => assertPlanningShortlist({ ...observed, shortlist_share_pct: 80 }), /share reconciles/)
  assert.throws(() => assertPlanningShortlist({ ...observed, products: [{ revenue: 40 }] }), /selection population/)
})
