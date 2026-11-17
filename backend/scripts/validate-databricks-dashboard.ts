import assert from 'node:assert/strict'
import 'dotenv/config'
import { executeDatabricksStatement } from '../src/databricks'
import {
  getDatabricksExternalRegression,
  getDatabricksForecastValidation,
  getDatabricksSalesHeatmap,
  getDatabricksSalesSectors,
  getDatabricksSalesStatus,
  getDatabricksSalesSummary,
  getDatabricksSalesTransactions,
  getDatabricksPlanningShortlist,
  getDatabricksWeatherEffects,
  loadDatabricksDashboardSnapshot,
  descriptiveRelease,
} from '../src/databricksDashboard'

type GoldCounts = Record<string, string | null>

function sourceCount(source: GoldCounts, field: string): number {
  const raw = source[field]
  assert.ok(raw != null && /^\d+$/.test(raw), `Gold ${field} must be an observed count`)
  const value = Number(raw)
  assert.ok(Number.isSafeInteger(value), `Gold ${field} must be a safe count`)
  return value
}

export function assertObservedAmount(a: number | null, b: number | null, label: string) {
  assert.ok(a != null && b != null && Number.isFinite(a) && Number.isFinite(b), `${label}: measurements must be observed`)
  assert.ok(Math.abs(a - b) < 0.01, `${label}: ${a} vs ${b}`)
}

export function assertPlanningShortlist(planning: {
  scope: { sector: string; territory: string }; products: Array<{ revenue: number }>;
  period_start: string | null; period_end: string | null; months_stale: number | null;
  eligible_products: number; excluded_nonpositive_products: number; ranking_revenue: number; shortlist_share_pct: number;
}) {
  assert.deepEqual(planning.scope, { sector: 'Unknown', territory: 'all' }, 'planning validation scope')
  assert.ok(Number.isSafeInteger(planning.eligible_products) && planning.eligible_products >= 0, 'planning eligible product count')
  assert.ok(Number.isSafeInteger(planning.excluded_nonpositive_products) && planning.excluded_nonpositive_products >= 0, 'planning excluded product count')
  assert.equal(planning.products.length, Math.min(5, Math.ceil(planning.eligible_products * 0.2)), 'shortlist cap and positive-revenue selection population')
  if (planning.period_end === null) {
    assert.equal(planning.period_start, null, 'absent history has no start period')
    assert.equal(planning.months_stale, null, 'absent history has no staleness measurement')
    assert.equal(planning.eligible_products, 0, 'absent history has no eligible products')
    assert.equal(planning.excluded_nonpositive_products, 0, 'absent history has no excluded product observations')
  } else {
    assert.match(planning.period_end, /^\d{4}-(0[1-9]|1[0-2])$/, 'planning history end')
    assert.ok(planning.period_start !== null && /^\d{4}-(0[1-9]|1[0-2])$/.test(planning.period_start), 'planning history start')
    assert.ok(planning.months_stale !== null && Number.isSafeInteger(planning.months_stale) && planning.months_stale >= 0, 'observed history staleness')
  }
  if (!planning.eligible_products) {
    assert.equal(planning.ranking_revenue, 0, 'empty positive-revenue ranking')
    assert.equal(planning.shortlist_share_pct, 0, 'empty shortlist share')
  } else {
    assert.ok(Number.isFinite(planning.ranking_revenue) && planning.ranking_revenue > 0, 'positive ranking revenue')
    assert.ok(planning.products.every(product => Number.isFinite(product.revenue) && product.revenue > 0), 'shortlist contains positive observed revenue')
    const share = planning.products.reduce((sum, product) => sum + product.revenue, 0) / planning.ranking_revenue * 100
    assert.ok(share <= 100 + 1e-8 && Math.abs(share - planning.shortlist_share_pct) < 1e-8, 'shortlist share reconciles to ranking revenue')
  }
}

export function assertGoldCoverage(
  snapshot: { monthly: unknown[]; year_summary: unknown[]; top_products: unknown[]; totals: { total_transactions: number } },
  quality: { rows_extracted: number; rows_accepted: number; years: Record<string, unknown> },
  source: GoldCounts,
) {
  const extracted = sourceCount(source, 'fact_rows')
  const accepted = sourceCount(source, 'analysis_rows')
  const firstYear = sourceCount(source, 'first_year')
  const lastYear = sourceCount(source, 'last_year')
  const years = sourceCount(source, 'observed_years')
  assert.ok(firstYear >= 1000 && lastYear <= 9999 && lastYear >= firstYear, 'Gold reporting year bounds')
  assert.ok(accepted > 0 && accepted <= extracted, 'Gold analysis population')
  assert.equal(quality.rows_extracted, extracted, 'validation/fact extracted population')
  assert.equal(quality.rows_accepted, accepted, 'validation/fact survivor population')
  assert.equal(snapshot.totals.total_transactions, accepted, 'dashboard/fact transaction population')
  assert.equal(snapshot.monthly.length, (lastYear - firstYear + 1) * 12, 'complete calendar month spine including unknown gaps')
  assert.equal(snapshot.year_summary.length, years, 'observed yearly aggregate rows')
  assert.equal(Object.keys(quality.years).length, years, 'fact observed year count')
  assert.equal(snapshot.top_products.length, Math.min(100, sourceCount(source, 'product_labels')), 'bounded source-label snapshot population')
  return { extracted, accepted, firstYear, lastYear }
}

type ForecastScopeEvidence = {
  schema_version: string
  scope: { sector: string; product: string; metric: string; unit: string }
  status: string
  publication_status: string
  reporting_coverage_status: string
  evaluation_protocol: string
  source: { file: string; view: string; system_of_record: string; release: unknown; as_of?: unknown }
  actuals: Array<{ period: string; actual: number | null; period_closed: boolean }>
  origin: string | null
  last_actual_period: string | null
  observed_months: number
  display_start: string
  validated_lead_range: unknown
  views: Record<string, unknown>
  models: Record<string, unknown>
}

function calendarMonth(period: unknown, label: string): number {
  assert.ok(typeof period === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(period), `${label}: valid calendar month`)
  return Number(period.slice(0, 4)) * 12 + Number(period.slice(5)) - 1
}

function objectEvidence(value: unknown, label: string): Record<string, unknown> {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), `${label}: object evidence required`)
  return value as Record<string, unknown>
}

function observedOrMissing(value: unknown, label: string): asserts value is number | null {
  assert.ok(value === null || typeof value === 'number' && Number.isFinite(value), `${label}: finite observed value or null`)
}

export function assertForecastValidationScope(
  evidence: ForecastScopeEvidence,
  sector: string,
  release: Awaited<ReturnType<typeof descriptiveRelease>>,
  now = new Date(),
) {
  const manilaDate = new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10)
  assert.ok(['All', 'Government', 'Private', 'Internal', 'Unknown'].includes(sector), 'supported buyer scope')
  assert.equal(evidence.schema_version, 'forecast-validation.v2', 'forecast schema version')
  assert.equal(evidence.evaluation_protocol, 'fixed_origin_multi_step', 'forecast evaluation protocol')
  assert.equal(evidence.reporting_coverage_status, 'unverified', 'forecast reporting completeness remains unverified')
  assert.equal(evidence.source.system_of_record, 'databricks', 'forecast system of record')
  assert.equal(evidence.source.file, 'workspace.medshield_gold.sales_restart_fact_candidate', 'forecast source fact')
  assert.equal(evidence.source.view, evidence.source.file, 'forecast source view')
  assert.deepEqual(evidence.source.release, release, 'forecast source matches captured immutable release')
  assert.equal(evidence.source.as_of, manilaDate, 'forecast source as-of matches current Manila date')
  assert.equal(evidence.display_start, manilaDate.slice(0, 7), 'forecast display starts in current Manila month')
  assert.equal(evidence.validated_lead_range, null, 'exploratory forecasts have no approved lead range')
  assert.deepEqual(evidence.scope, { sector, product: '', metric: 'revenue', unit: '₱ net sales' }, 'selected buyer forecast scope')
  assert.equal(evidence.publication_status, 'unpublished', 'benchmark publication status')
  if (evidence.status === 'empty') {
    assert.equal(evidence.origin, null, 'empty scope has no origin')
    assert.equal(evidence.last_actual_period, null, 'empty scope has no last actual')
    assert.equal(evidence.observed_months, 0, 'empty scope has no observed measures')
    assert.deepEqual(evidence.models, {}, 'empty scope has no model choices')
    assert.deepEqual(evidence.views, {}, 'empty scope has no forecast horizons')
    const displayStart = calendarMonth(evidence.display_start, 'empty scope display start')
    let previous = -1
    for (const point of evidence.actuals) {
      const period = calendarMonth(point.period, 'empty scope period')
      assert.ok(period > previous && period < displayStart, 'empty scope periods ordered and closed')
      assert.equal(point.period_closed, true, 'empty scope period closed')
      assert.equal(point.actual, null, 'empty scope has no observed actual')
      previous = period
    }
    return {}
  }
  const seriesKey = sector === 'All' ? 'company' : `buyer:${sector}`
  assert.equal(evidence.status, 'exploratory', 'evidence forecast evidence status')
  assert.equal(evidence.publication_status, 'unpublished', 'benchmark publication status')
  assert.deepEqual(Object.keys(evidence.views), ['3', '6', '12'], 'supported evidence forecast horizons')
  const modelIds = ['seasonal_naive', 'last_value', 'recent_mean_3', 'recent_mean_6'].sort()
  assert.deepEqual(Object.keys(evidence.models).sort(), modelIds, 'evidence benchmark model choices')
  const origin = calendarMonth(evidence.origin, 'evidence model origin')
  const displayStart = calendarMonth(evidence.display_start, 'evidence forecast display start')
  assert.ok(displayStart > origin, 'evidence forecast display starts after model origin')
  assert.equal(evidence.last_actual_period, evidence.origin, 'evidence latest observed period is model origin')
  const actuals = new Map<number, number | null>()
  let previousMonth = -1
  for (const point of evidence.actuals) {
    const period = calendarMonth(point.period, 'evidence actual period')
    assert.ok(period > previousMonth && period < displayStart, 'evidence actual periods unique, ordered and closed before display')
    assert.equal(point.period_closed, true, 'evidence actual period closed')
    observedOrMissing(point.actual, 'evidence actual')
    actuals.set(period, point.actual)
    previousMonth = period
  }
  const observedPeriods = [...actuals].filter(([, value]) => value !== null).map(([period]) => period)
  assert.equal(evidence.observed_months, observedPeriods.length, 'evidence observed month population')
  assert.equal(observedPeriods.at(-1), origin, 'evidence origin is last observed actual month')
  const verifiedViews: Record<string, {
    training_end: string; evaluation_start: string; evaluation_end: string;
    display_start: string; display_end: string; first_future_lead: number; last_future_lead: number;
    model_count: number; common_scored_months: number;
  }> = {}
  for (const horizon of [3, 6, 12]) {
    const label = `evidence ${horizon}-month view`
    const view = objectEvidence(evidence.views[String(horizon)], label)
    const trainingEnd = origin - horizon
    assert.equal(view.evaluation_protocol, 'fixed_origin_multi_step', `${label}: evaluation protocol`)
    assert.equal(calendarMonth(view.training_end, label), trainingEnd, `${label}: true training cutoff`)
    assert.equal(calendarMonth(view.evaluation_start, label), trainingEnd + 1, `${label}: evaluation start`)
    assert.equal(calendarMonth(view.evaluation_end, label), origin, `${label}: evaluation end`)
    const models = objectEvidence(view.models, `${label} models`)
    assert.deepEqual(Object.keys(models).sort(), modelIds, `${label}: model choices`)
    const eligibleKeys: Set<string>[] = []
    for (const modelId of modelIds) {
      const modelLabel = `${label} ${modelId}`
      const model = objectEvidence(models[modelId], modelLabel)
      assert.ok(Array.isArray(model.backtest) && model.backtest.length === horizon, `${modelLabel}: complete backtest window`)
      assert.ok(Array.isArray(model.forecast) && model.forecast.length === horizon, `${modelLabel}: complete display window`)
      const scored = new Set<string>()
      for (const [index, raw] of model.backtest.entries()) {
        const point = objectEvidence(raw, modelLabel)
        const target = trainingEnd + index + 1
        assert.equal(point.series, seriesKey, `${modelLabel}: backtest series key`)
        assert.equal(point.target, 'recorded_net_sales', `${modelLabel}: backtest target key`)
        assert.equal(calendarMonth(point.origin, modelLabel), trainingEnd, `${modelLabel}: fixed backtest origin`)
        assert.equal(calendarMonth(point.period, modelLabel), target, `${modelLabel}: consecutive backtest target`)
        assert.equal(point.lead, target - trainingEnd, `${modelLabel}: actual calendar backtest lead`)
        observedOrMissing(point.actual, `${modelLabel} actual`)
        observedOrMissing(point.prediction, `${modelLabel} prediction`)
        assert.equal(point.actual, actuals.get(target) ?? null, `${modelLabel}: actual matches source observation`)
        assert.equal(point.missing_reason, point.actual === null ? 'missing_actual' : point.prediction === null ? 'missing_training_history' : null, `${modelLabel}: missing evidence reason`)
        if (point.actual !== null && point.prediction !== null) {
          scored.add(JSON.stringify([point.series, point.target, point.origin, point.period, point.lead]))
        }
      }
      eligibleKeys.push(scored)
      assert.equal(objectEvidence(model.metrics, modelLabel).n, scored.size, `${modelLabel}: scored observation count`)
      assert.equal(model.missing_prediction_count, model.backtest.filter(raw => objectEvidence(raw, modelLabel).prediction === null).length, `${modelLabel}: missing prediction count`)
      for (const [index, raw] of model.forecast.entries()) {
        const point = objectEvidence(raw, modelLabel)
        const target = displayStart + index
        assert.equal(point.series, seriesKey, `${modelLabel}: forecast series key`)
        assert.equal(point.target, 'recorded_net_sales', `${modelLabel}: forecast target key`)
        assert.equal(calendarMonth(point.origin, modelLabel), origin, `${modelLabel}: original forecast cutoff`)
        assert.equal(calendarMonth(point.period, modelLabel), target, `${modelLabel}: consecutive display target`)
        assert.equal(point.lead, target - origin, `${modelLabel}: actual calendar forecast lead`)
        assert.equal(point.actual, null, `${modelLabel}: future actual unavailable`)
        assert.equal(point.prediction, null, `${modelLabel}: unpublished forecast unavailable`)
        assert.equal(point.lower, null, `${modelLabel}: unpublished lower bound unavailable`)
        assert.equal(point.upper, null, `${modelLabel}: unpublished upper bound unavailable`)
        assert.equal(point.missing_reason, 'unpublished_forecast', `${modelLabel}: unpublished forecast reason`)
      }
    }
    const commonKeys = [...eligibleKeys[0]].filter(key => eligibleKeys.every(keys => keys.has(key))).sort()
    assert.deepEqual(view.common_evaluation_keys, commonKeys, `${label}: exact common origin-target-lead keys`)
    assert.equal(view.common_scored_months, commonKeys.length, `${label}: common scored population`)
    for (const modelId of modelIds) {
      const model = objectEvidence(models[modelId], `${label} ${modelId}`)
      assert.equal(objectEvidence(model.comparison_metrics, label).n, commonKeys.length, `${label}: comparison scored population`)
    }
    const firstModel = objectEvidence(models[modelIds[0]], label)
    const display = firstModel.forecast as Array<Record<string, unknown>>
    verifiedViews[String(horizon)] = {
      training_end: String(view.training_end), evaluation_start: String(view.evaluation_start), evaluation_end: String(view.evaluation_end),
      display_start: evidence.display_start, display_end: String(display.at(-1)!.period),
      first_future_lead: displayStart - origin, last_future_lead: displayStart + horizon - 1 - origin,
      model_count: modelIds.length, common_scored_months: commonKeys.length,
    }
  }
  return verifiedViews
}

export function assertForecastValidationScopes(
  company: ForecastScopeEvidence,
  unknown: ForecastScopeEvidence,
  release: Awaited<ReturnType<typeof descriptiveRelease>>,
  now = new Date(),
) {
  const verified = assertForecastValidationScope(company, 'All', release, now)
  assertForecastValidationScope(unknown, 'Unknown', release, now)
  return verified
}

type ExternalContextEvidence = {
  status: string; scope: {sector: string; territory: string};
  coverage: {sales_months: number; matched_months: number};
  context: {status: string; sales_months: number; coobserved_months: number; join_ready_months: number;
    rows: Array<{period: string; sales: number | null; signals: Array<{value: number | null; join_ready: boolean}>}>};
}

/** An empty Unknown buyer is valid; a separate known scope proves coverage. */
export function assertExternalContextScopes(known: ExternalContextEvidence, unknown: ExternalContextEvidence) {
  assert.equal(known.scope.sector, 'Private', 'external known buyer scope')
  assert.equal(unknown.scope.sector, 'Unknown', 'external empty buyer scope')
  for (const evidence of [known, unknown]) {
    assert.equal(evidence.status, 'blocked', 'external regression publication gate')
    assert.equal(evidence.scope.territory, 'Quezon', 'external selected territory')
    const c = evidence.context
    assert.equal(c.status, 'historical_context_candidate', 'external context candidate status')
    assert.equal(c.rows.length, 108, 'external full2017–2025 study calendar')
    assert.equal(new Set(c.rows.map(row => row.period)).size, 108, 'unique external target months')
    assert.equal(c.sales_months, evidence.coverage.sales_months, 'context/coverage buyer sales population')
    assert.equal(c.sales_months, c.rows.filter(row => row.sales !== null).length, 'observed sales month count')
    assert.equal(c.coobserved_months, c.rows.filter(row => row.sales !== null && row.signals.length === 2 && row.signals.every(s => s.value !== null)).length, 'co-observation count')
    assert.equal(c.join_ready_months, 0, 'unapproved external joins remain blocked')
    assert.equal(evidence.coverage.matched_months, 0, 'candidate alignment is not approved model coverage')
    assert.ok(c.rows.every(row => row.signals.length === 2 && row.signals.every(s => s.join_ready === false)), 'selected disease/rainfall signals retain pending mapping')
  }
  assert.ok(known.coverage.sales_months > 0, 'external known buyer has observed sales')
  assert.equal(unknown.coverage.sales_months, 0, 'absent Unknown buyer is not private-territory coverage')
  assert.ok(unknown.context.rows.every(row => row.sales === null), 'absent Unknown buyer never becomes zero sales')
  return {known_scope:known.scope,known_sales_months:known.coverage.sales_months,coobserved_months:known.context.coobserved_months,
    unknown_sales_months:unknown.coverage.sales_months,approved_join_months:known.context.join_ready_months}
}

async function main() {
  // Compare against the same immutable fact version used by the gateway. Gold
  // owns survivor/metric eligibility; do not reclassify rows from label patterns.
  const release = await descriptiveRelease()
  const fact = `workspace.medshield_gold.sales_restart_fact_candidate VERSION AS OF ${release.fact_delta_version}`
  const source = (await executeDatabricksStatement(`SELECT COUNT(*) AS fact_rows,
    SUM(CASE WHEN is_analysis_candidate THEN 1 ELSE 0 END) AS analysis_rows,
    MIN(CASE WHEN is_analysis_candidate THEN calendar_year END) AS first_year,
    MAX(CASE WHEN is_analysis_candidate THEN calendar_year END) AS last_year,
    COUNT(DISTINCT CASE WHEN is_analysis_candidate THEN calendar_year END) AS observed_years,
    COUNT(DISTINCT CASE WHEN is_analysis_candidate THEN normalized_product END) AS product_labels,
    SUM(CASE WHEN is_analysis_candidate AND is_net_sales_eligible THEN 1 ELSE 0 END) AS net_sales_eligible,
    SUM(CASE WHEN is_analysis_candidate AND is_gross_margin_eligible THEN 1 ELSE 0 END) AS gross_margin_eligible,
    SUM(CASE WHEN is_analysis_candidate AND is_quantity_observation_eligible THEN 1 ELSE 0 END) AS quantity_eligible,
    SUM(CASE WHEN is_analysis_candidate AND is_net_sales_eligible THEN net_sales END) AS net_sales
    FROM ${fact}`, { rowLimit: 1 })).rows[0]
  assert.ok(source, 'Gold validation returned no source aggregate')
  const weatherYear = sourceCount(source, 'last_year')
  const [snapshot, status, summary, transactions, heatmap, sectors, forecast, unknownForecast, regression, unknownRegression, planning, weather, nasaWeather, nasaCount] =
    await Promise.all([
      loadDatabricksDashboardSnapshot(),
      getDatabricksSalesStatus(),
      getDatabricksSalesSummary({}),
      getDatabricksSalesTransactions({ page: 1, pageSize: 5 }),
      getDatabricksSalesHeatmap(),
      getDatabricksSalesSectors(),
      getDatabricksForecastValidation({ sector: 'All', metric: 'revenue' }),
      getDatabricksForecastValidation({ sector: 'Unknown', metric: 'revenue' }),
      getDatabricksExternalRegression({ sector: 'Private', territory: 'Quezon', metric: 'revenue', mode: 'combined' }),
      getDatabricksExternalRegression({ sector: 'Unknown', territory: 'Quezon', metric: 'revenue', mode: 'combined' }),
      getDatabricksPlanningShortlist({ sector: 'Unknown', territory: 'all' }),
      getDatabricksWeatherEffects({ grain: 'monthly' }),
      getDatabricksWeatherEffects({ grain: 'monthly', provider: 'nasa_power', year: String(weatherYear) }),
      executeDatabricksStatement(`SELECT COUNT(*) AS weather_rows
        FROM workspace.medshield_gold.vw_weather_nasa_power_monthly_candidate
        WHERE YEAR(period_start) = ${weatherYear}`, { rowLimit: 1 }),
    ])

  const quality = status.quality_summary
  const counts = assertGoldCoverage(snapshot, quality, source)
  const ownership = [...new Set(sectors.rows.map((row) => {
    assert.ok('sector' in row && typeof row.sector === 'string', 'catalog buyer sector must be a string')
    return row.sector
  }))]

  assert.equal(snapshot.data_status.source, 'databricks', 'snapshot source')
  assert.equal(snapshot.data_status.mode, 'live', 'snapshot mode')
  assert.equal(quality.duplicate_rows, 0, 'duplicate fact rows')
  assert.equal(summary.counts.rows, quality.rows_accepted, 'summary/fact accepted population')
  assert.equal(snapshot.totals.total_transactions, quality.rows_accepted, 'dashboard/fact transaction population')
  assert.equal(transactions.pagination.total_rows, quality.rows_accepted, 'transaction/fact accepted population')
  assert.equal(transactions.rows.length, 5, 'transaction page rows')
  assertObservedAmount(summary.sums.net_cost, snapshot.totals.total_revenue, 'summary/snapshot net sales')
  assertObservedAmount(source.net_sales == null ? null : Number(source.net_sales), snapshot.totals.total_revenue, 'Gold/snapshot eligible net sales')
  assert.ok(ownership.includes('Government') && ownership.includes('Private') && ownership.includes('Internal'), 'buyer ownership values')
  assert.equal(heatmap.source.included_rows, counts.accepted, 'heatmap/Gold survivor population')
  assert.equal(sectors.source.included_rows, counts.accepted, 'buyer grouping/Gold survivor population')
  const forecastCalendar = assertForecastValidationScopes(forecast, unknownForecast, release)
  const externalContext = assertExternalContextScopes(regression, unknownRegression)
  assertPlanningShortlist(planning)
  assert.equal(weather.metadata.provider, 'PAGASA', 'weather provider')
  assert.equal(weather.metadata.sales_matched_rows, 0, 'unapproved PAGASA/sales matches')
  assert.equal(nasaWeather.metadata.provider, 'nasa_power', 'NASA weather provider')
  assert.equal(nasaWeather.metadata.system_of_record, 'databricks', 'NASA weather source')
  assert.equal(nasaWeather.metadata.rows_returned, sourceCount(nasaCount.rows[0] ?? {}, 'weather_rows'), 'NASA selected-year source rows')
  assert.ok(Number(nasaWeather.metadata.sales_matched_rows) <= nasaWeather.metadata.rows_returned, 'NASA matches cannot exceed source observations')
  assert.deepEqual(await descriptiveRelease(), release, 'captured descriptive release remains unchanged after validation')

  console.log(JSON.stringify({
    snapshot: {
      monthly_rows: snapshot.monthly.length,
      yearly_rows: snapshot.year_summary.length,
      areas: snapshot.by_area.length,
      products: snapshot.top_products.length,
      dashboard_transaction_count: snapshot.totals.total_transactions,
    },
    fact_quality: {
      extracted_rows: quality.rows_extracted,
      accepted_rows: quality.rows_accepted,
      valid_rows: quality.valid_rows,
      warning_rows: quality.rows_with_warnings,
      duplicate_rows: quality.duplicate_rows,
      excluded_survivor_rows: counts.extracted - counts.accepted,
      net_sales_eligible_rows: sourceCount(source, 'net_sales_eligible'),
      gross_margin_eligible_rows: sourceCount(source, 'gross_margin_eligible'),
      quantity_eligible_rows: sourceCount(source, 'quantity_eligible'),
      release,
      period: [quality.source_period_start, quality.source_period_end],
    },
    financial_reconciliation: {
      rows: summary.counts.rows,
      net_sales: summary.sums.net_cost,
      gross_profit: summary.sums.net_income,
      mismatched_rows: summary.financial_reconciliation.mismatched_rows,
    },
    heatmap: {
      aggregate_rows: heatmap.monthly.length,
      included_fact_rows: heatmap.source.included_rows,
    },
    buyer_ownership: {
      aggregate_rows: sectors.rows.length,
      included_fact_rows: sectors.source.included_rows,
      published_values: ownership,
    },
    forecast: {
      scope: forecast.scope,
      status: forecast.status,
      observed_months: forecast.observed_months,
      origin: forecast.origin,
      horizons: Object.keys(forecast.views),
      calendar_views: forecastCalendar,
      buyer_scope_probe: {
        scope: unknownForecast.scope,
        status: unknownForecast.status,
        horizons: Object.keys(unknownForecast.views),
      },
    },
    external_regression: { status: regression.status, reason: regression.reason, context: externalContext },
    pagasa: {
      rows: weather.metadata.rows_returned,
      period: [weather.metadata.period_start, weather.metadata.period_end],
      sales_matches: weather.metadata.sales_matched_rows,
    },
    nasa_power: {
      selected_year: weatherYear,
      rows: nasaWeather.metadata.rows_returned,
      period: [nasaWeather.metadata.period_start, nasaWeather.metadata.period_end],
      sales_matches: nasaWeather.metadata.sales_matched_rows,
      source: nasaWeather.metadata.source,
    },
  }, null, 2))
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? `${error.name}: ${error.message}` : error)
    process.exit(1)
  })
}
