import { createHash } from 'node:crypto'
import Decimal from 'decimal.js'
import { z } from 'zod'
import { addMonths, balancedComponents, CommercialError, money, poDeadline } from '../utils/contracts'
import { periodSchema, type ForecastQuery } from '../validators/schemas'

const decimalAmount = z.string().regex(/^-?\d{1,16}\.\d{2}$/)
export const forecastManifestSchema = z.object({
  schemaVersion: z.literal(1), trainingWindow: z.object({ start: periodSchema, end: periodSchema, months: z.number().int().min(36).max(1200) }), runId: z.string().min(1), anchor: periodSchema,
  scope: z.object({ kind: z.enum(['company', 'product', 'category']), id: z.string().min(1), category: z.string().nullable(), target: z.literal('net_sales'), unit: z.literal('PHP') }),
  source: z.object({ datasetId: z.string().min(1), factVersion: z.number().int().nonnegative(), checksum: z.string().length(64), mappingStatus: z.enum(['approved', 'unverified']), evidenceClass: z.literal('databricks_gold_candidate') }),
  publicationStatus: z.literal('candidate'), method: z.literal('fixed_additive_holt_winters'),
  points: z.array(z.object({ period: periodSchema, prediction: decimalAmount, seasonalComponent: decimalAmount, intervals: z.array(z.object({ level: z.union([z.literal(80), z.literal(95)]), lower: decimalAmount, upper: decimalAmount, support: z.number().int().positive(), method: z.literal('rolling_origin_absolute_error_quantile') })) })).min(1).max(36),
  evaluation: z.object({ scoredMonths: z.number().int(), mae: decimalAmount, seasonalNaiveMae: decimalAmount, protocol: z.literal('fixed_parameters_last_12_months_holdout') }),
  decomposition: z.array(z.object({ period: periodSchema, observed: decimalAmount, baselineTrend: decimalAmount, seasonalCycle: decimalAmount, unexplainedVariance: decimalAmount, roundingAdjustment: decimalAmount, reconciliationChecksum: z.literal('0.00') })),
})
export type ForecastManifest = z.infer<typeof forecastManifestSchema>
export type Observation = { period: string; value: number }

// Offline only. Fixed coefficients are declared, never selected against the held-out months.
function fit(rows: Observation[], horizon: number) {
  const season = 12, alpha = 0.25, beta = 0.05, gamma = 0.15
  let level = rows.slice(0, season).reduce((sum, row) => sum + row.value, 0) / season
  let trend = (rows.slice(season, season * 2).reduce((sum, row) => sum + row.value, 0) / season - level) / season
  const seasonal = rows.slice(0, season).map(row => row.value - level)
  const components: ForecastManifest['decomposition'] = []
  for (let i = season; i < rows.length; i++) {
    const value = rows[i].value, slot = i % season, previous = level
    const baseline = level + trend, cycle = seasonal[slot]
    components.push({ period: rows[i].period, observed: money(value), ...balancedComponents(value, baseline, cycle, value - baseline - cycle) })
    level = alpha * (value - cycle) + (1 - alpha) * (level + trend)
    trend = beta * (level - previous) + (1 - beta) * trend
    seasonal[slot] = gamma * (value - level) + (1 - gamma) * cycle
  }
  return { components, points: Array.from({ length: horizon }, (_, i) => ({ value: level + (i + 1) * trend + seasonal[(rows.length + i) % season], seasonal: seasonal[(rows.length + i) % season] })) }
}

export function prepareForecast(rows: Observation[], anchor: string, horizon: number, scope: ForecastManifest['scope'], source: ForecastManifest['source']): ForecastManifest {
  periodSchema.parse(anchor)
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 36) throw new CommercialError(400, 'INVALID_HORIZON', 'horizon must be between 1 and 36')
  const history = [...rows].filter(row => row.period <= anchor).sort((a, b) => a.period.localeCompare(b.period))
  if (history.length < 36 || history.length > 1200 || history.at(-1)?.period !== anchor) throw new CommercialError(422, 'INSUFFICIENT_HISTORY', 'Require 36–1200 observed months ending exactly at the anchor.')
  history.forEach((row, i) => { periodSchema.parse(row.period); if (!Number.isFinite(row.value) || Math.abs(row.value) > 1e14 || i && addMonths(history[i - 1].period, 1) !== row.period) throw new CommercialError(422, 'INVALID_HISTORY', 'History must contain finite, contiguous, unique observations; missing months cannot be filled with zeros.') })
  if (scope.kind !== 'company' && source.mappingStatus !== 'approved') throw new CommercialError(422, 'MAPPING_REQUIRED', 'Granular forecasts require approved source product/category mappings.')
  const holdout = history.slice(-12), training = history.slice(0, -12), evaluation = fit(training, 12)
  const errors = holdout.map((row, i) => Math.abs(row.value - evaluation.points[i].value))
  const naiveErrors = holdout.map((row, i) => Math.abs(row.value - history[history.length - 24 + i].value))
  const result = fit(history, horizon)
  const byLead: number[][] = Array.from({ length: horizon }, () => [])
  // Origin-local rolling evaluation for interval evidence; never use target observations to fit that origin.
  for (let origin = 24; origin < history.length; origin++) {
    const count = Math.min(horizon, history.length - origin)
    const forecast = fit(history.slice(0, origin), count)
    for (let lead = 0; lead < count; lead++) byLead[lead].push(Math.abs(history[origin + lead].value - forecast.points[lead].value))
  }
  const points = result.points.map((point, i) => ({
    period: addMonths(anchor, i + 1), prediction: money(point.value), seasonalComponent: money(point.seasonal),
    intervals: ([80, 95] as const).flatMap(level => {
      const residuals = byLead[i].sort((a, b) => a - b), required = level === 80 ? 20 : 40
      if (residuals.length < required) return []
      const radius = residuals[Math.min(residuals.length - 1, Math.ceil((residuals.length + 1) * level / 100) - 1)]
      return [{ level, lower: money(point.value - radius), upper: money(point.value + radius), support: residuals.length, method: 'rolling_origin_absolute_error_quantile' as const }]
    }),
  }))
  const identity = createHash('sha256').update(JSON.stringify({ history, anchor, horizon, scope, source, method: 'fixed_additive_holt_winters_v1' })).digest('hex')
  return forecastManifestSchema.parse({ schemaVersion: 1, trainingWindow: { start: history[0].period, end: anchor, months: history.length }, runId: identity, anchor, scope, source, publicationStatus: 'candidate', method: 'fixed_additive_holt_winters', points,
    evaluation: { scoredMonths: 12, mae: money(errors.reduce((a, b) => a + b, 0) / 12), seasonalNaiveMae: money(naiveErrors.reduce((a, b) => a + b, 0) / 12), protocol: 'fixed_parameters_last_12_months_holdout' }, decomposition: result.components })
}

export function validateManifest(payload: unknown) {
  const parsed = forecastManifestSchema.safeParse(payload)
  if (!parsed.success) throw new CommercialError(503, 'INVALID_FORECAST_MANIFEST', 'Forecast source does not conform to the published contract.')
  const data = parsed.data
  if (data.scope.kind === 'company' && data.scope.id !== 'company:net_sales:PHP') throw new CommercialError(503, 'INVALID_COMPANY_SCOPE', 'Company scope identity is invalid.')
  if (data.scope.kind !== 'company' && data.source.mappingStatus !== 'approved') throw new CommercialError(503, 'MAPPING_REQUIRED', 'Forecast mapping is not approved.')
  data.decomposition.forEach(row => {
    if (!new Decimal(row.observed).minus(row.baselineTrend).minus(row.seasonalCycle).minus(row.unexplainedVariance).isZero()) throw new CommercialError(503, 'DECOMPOSITION_MISMATCH', 'Manifest decomposition does not balance.')
  })
  data.points.forEach((point, i) => {
    if (new Set(point.intervals.map(band => band.level)).size !== point.intervals.length) throw new CommercialError(503, 'DUPLICATE_INTERVAL', 'Duplicate forecast intervals are ambiguous.')
    if (point.period !== addMonths(data.anchor, i + 1)) throw new CommercialError(503, 'INVALID_FORECAST_CALENDAR', 'Forecast points must follow their source anchor in sequence.')
    point.intervals.forEach(band => { if (new Decimal(band.lower).gt(point.prediction) || new Decimal(band.upper).lt(point.prediction) || band.support < (band.level === 80 ? 20 : 40)) throw new CommercialError(503, 'INVALID_INTERVAL_EVIDENCE', 'Forecast interval evidence is invalid.') })
  })
  return data
}

export function rollingForecast(manifest: ForecastManifest, query: ForecastQuery, now = new Date()) {
  if (manifest.anchor !== query.anchor) throw new CommercialError(409, 'FORECAST_ANCHOR_MISMATCH', 'No forecast run exists for the requested anchor; predictions are never shifted.')
  const category = manifest.scope.category
  const multiplier = query.scenario === 'monsoon' && ['ANTIBIOTICS', 'RESPIRATORY'].includes(category || '') ? 1.18 : query.scenario === 'typhoon' && category === 'ANALGESICS' ? 1.25 : query.scenario === 'conservative' && category === 'ONCOLOGY' ? 0.88 : 1
  return { status: 'success', meta: { anchor: query.anchor, horizonMonths: query.horizonMonths, classification: query.scenario === 'none' ? 'Exploratory forecast candidate' : 'Simulation sandbox', source: manifest.source, trainingWindow: manifest.trainingWindow, runId: manifest.runId, publicationStatus: manifest.publicationStatus, scope: manifest.scope, evaluation: manifest.evaluation, scenario: query.scenario, scenarioMultiplier: multiplier, scenarioApplied: multiplier !== 1, limitations: ['No approved production forecast or service-level guarantee is established.', 'Scenario uplifts are entered policy assumptions, not inferred disease effects.', 'Intervals are empirical rolling-origin ranges; forward coverage is not guaranteed.'] }, data: Array.from({ length: query.horizonMonths }, (_, i) => {
    const period = addMonths(query.anchor, i + 1), point = manifest.points.find(row => row.period === period), band = point?.intervals.find(row => row.level === Number(query.confidenceInterval))
    return { period, projectedSales: point ? money(new Decimal(point.prediction).times(multiplier)) : null, projectedUnits: null, lowerBound: band ? money(new Decimal(band.lower).times(multiplier)) : null, upperBound: band ? money(new Decimal(band.upper).times(multiplier)) : null, intervalSupport: band?.support ?? 0, intervalClassification: multiplier !== 1 ? 'scenario_scaled_range_not_calibrated' : 'empirical_range', seasonalComponent: point?.seasonalComponent ?? null, missingReason: point ? null : 'forecast_not_published_for_lead', intervalReason: band ? null : 'insufficient_interval_evidence', ...poDeadline(period, query.leadTimeDays, now) }
  }) }
}
