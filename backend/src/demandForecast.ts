/**
 * demandForecast.ts
 * Quantity-demand forecasting engine for MedShield DSS.
 *
 * Design contracts:
 * - Never trains on observations beyond the declared forecast origin.
 * - Never labels a model-generated value as Actual.
 * - Recursive multi-step forecasting may use preceding predictions as inputs
 *   but never as training observations (leakage guard).
 * - 2026+ values generated from a Dec-2025 cutoff are always tagged 'estimated'.
 * - Verified historical transactions are always tagged 'actual'.
 * - Missing historical observations are always tagged 'unavailable'.
 * - User-defined planning assumptions are always tagged 'scenario'.
 */

import { benchmarkPrediction, forecastMetrics, monthLabel, monthIndex } from './forecastEvidence'

// ---------------------------------------------------------------------------
// Data-status vocabulary (Req 6)
// ---------------------------------------------------------------------------
export type DataStatus = 'actual' | 'estimated' | 'unavailable' | 'scenario'

// ---------------------------------------------------------------------------
// Demand-pattern classification
// ---------------------------------------------------------------------------
export type DemandPattern =
  | 'smooth'       // low CV, low zero rate
  | 'erratic'      // high CV, low zero rate
  | 'intermittent' // low CV, high zero rate
  | 'lumpy'        // high CV, high zero rate
  | 'insufficient' // fewer than 6 usable observations

export interface DemandProfile {
  pattern: DemandPattern
  zero_rate: number          // fraction of months with zero demand
  nonzero_cv: number | null  // coefficient of variation over non-zero observations
  observed_months: number
  nonzero_months: number
  mean_nonzero: number | null
}

/**
 * Classify demand pattern using the Syntetos-Boylan-Shenstone 2x2 grid:
 *   zero_rate < 0.5 && CV < 0.5  → smooth
 *   zero_rate < 0.5 && CV ≥ 0.5  → erratic
 *   zero_rate ≥ 0.5 && CV < 0.5  → intermittent
 *   zero_rate ≥ 0.5 && CV ≥ 0.5  → lumpy
 */
export function classifyDemand(series: Map<number, number | null>): DemandProfile {
  const values = [...series.values()].filter(v => v !== null) as number[]
  const observed = values.length
  if (observed < 6) {
    return { pattern: 'insufficient', zero_rate: 0, nonzero_cv: null, observed_months: observed, nonzero_months: 0, mean_nonzero: null }
  }
  const nonzero = values.filter(v => v > 0)
  const zero_rate = (observed - nonzero.length) / observed
  let nonzero_cv: number | null = null
  let mean_nonzero: number | null = null
  if (nonzero.length > 0) {
    mean_nonzero = nonzero.reduce((s, v) => s + v, 0) / nonzero.length
    if (mean_nonzero > 0) {
      const variance = nonzero.reduce((s, v) => s + (v - mean_nonzero!) ** 2, 0) / nonzero.length
      nonzero_cv = Math.sqrt(variance) / mean_nonzero
    }
  }
  const cv = nonzero_cv ?? 0
  let pattern: DemandPattern
  if (zero_rate < 0.5 && cv < 0.5) pattern = 'smooth'
  else if (zero_rate < 0.5 && cv >= 0.5) pattern = 'erratic'
  else if (zero_rate >= 0.5 && cv < 0.5) pattern = 'intermittent'
  else pattern = 'lumpy'
  return { pattern, zero_rate, nonzero_cv, observed_months: observed, nonzero_months: nonzero.length, mean_nonzero }
}

// ---------------------------------------------------------------------------
// Croston-lite: simplified Croston's method for intermittent demand
// Produces a constant estimate = mean_nonzero / mean_interarrival.
// This is a retrospective benchmark — the estimate is frozen at origin.
// ---------------------------------------------------------------------------
export function crostonLiteEstimate(series: Map<number, number | null>, origin: number): number | null {
  const sorted = [...series.entries()]
    .filter(([idx, v]) => idx <= origin && v !== null)
    .sort(([a], [b]) => a - b)
  const demands = sorted.map(([, v]) => v as number)
  const nonzero = demands.filter(v => v > 0)
  if (nonzero.length < 2) return null
  // Mean non-zero demand
  const meanDemand = nonzero.reduce((s, v) => s + v, 0) / nonzero.length
  // Mean inter-arrival in months
  const indices = sorted.filter(([, v]) => (v as number) > 0).map(([idx]) => idx)
  const gaps: number[] = []
  for (let i = 1; i < indices.length; i++) gaps.push(indices[i] - indices[i - 1])
  if (!gaps.length) return null
  const meanGap = gaps.reduce((s, g) => s + g, 0) / gaps.length
  return meanGap > 0 ? meanDemand / meanGap : null
}

// ---------------------------------------------------------------------------
// Extended benchmark names for demand mode
// ---------------------------------------------------------------------------
export const demandBenchmarkNames = {
  last_value: 'Last observed value',
  seasonal_naive: 'Seasonal naive (12-month)',
  recent_mean_3: 'Recent mean (3 months)',
  recent_mean_6: 'Recent mean (6 months)',
  croston_lite: 'Croston-lite (intermittent)',
} as const

export type DemandBenchmark = keyof typeof demandBenchmarkNames

// ---------------------------------------------------------------------------
// Forecast origin guard — hard leakage fence
// ---------------------------------------------------------------------------
function guardOrigin(series: Map<number, number | null>, origin: number): Map<number, number> {
  const safe = new Map<number, number>()
  for (const [idx, val] of series) {
    if (idx <= origin && typeof val === 'number' && val !== null) safe.set(idx, val)
  }
  return safe
}

// ---------------------------------------------------------------------------
// Single-point demand prediction from a leakage-safe series
// ---------------------------------------------------------------------------
export function demandPrediction(
  safeSeries: Map<number, number>,
  origin: number,
  target: number,
  kind: DemandBenchmark,
): number | null {
  if (target <= origin) throw new Error('Target must follow forecast origin')
  if (kind === 'croston_lite') {
    // Croston-lite is a flat estimator — same value for every future lead
    return crostonLiteEstimate(new Map([...safeSeries].map(([k, v]) => [k, v])), origin)
  }
  // Reuse the existing benchmark logic for standard methods
  const compatibleSeries = safeSeries as Map<number, number>
  return benchmarkPrediction(compatibleSeries, origin, target, kind as any)
}

// ---------------------------------------------------------------------------
// 2026 estimate label — Req 2, 6
// ---------------------------------------------------------------------------
export function forecastDataStatus(period: number, origin: number, hasActual: boolean): DataStatus {
  if (period <= origin && hasActual) return 'actual'
  if (period <= origin && !hasActual) return 'unavailable'
  return 'estimated'   // any month after the training cutoff is always 'estimated'
}

// ---------------------------------------------------------------------------
// Rolling horizon calculation — Req 3, 4
// ---------------------------------------------------------------------------
export interface RollingHorizonSpec {
  horizon: 3 | 6 | 12
  /** Forecast origin (inclusive last training month, as monthIndex number) */
  origin: number
  /** First forecast period (origin + 1) */
  display_start: number
}

export function rollingHorizon(origin: number, horizon: 3 | 6 | 12): RollingHorizonSpec {
  return { horizon, origin, display_start: origin + 1 }
}

/**
 * Generate forecast periods for a given horizon spec, returning period labels
 * and the maximum month index included.
 */
export function horizonPeriods(spec: RollingHorizonSpec): string[] {
  return Array.from({ length: spec.horizon }, (_, i) => monthLabel(spec.display_start + i))
}

// ---------------------------------------------------------------------------
// Demand forecast view (mirrors benchmarkView for revenue)
// ---------------------------------------------------------------------------
export interface DemandPoint {
  series: string
  target: string
  period: string
  origin: string
  lead: number
  actual: number | null
  prediction: number | null
  data_status: DataStatus
  missing_reason: string | null
  model: DemandBenchmark
}

export interface DemandForecastView {
  scope: string
  series_id: string
  unit: string
  pattern: DemandProfile
  evaluation_protocol: string
  training_end: string
  evaluation_start: string
  evaluation_end: string
  common_scored_months: number
  models: Record<DemandBenchmark, {
    backtest: DemandPoint[]
    forecast: DemandPoint[]
    metrics: ReturnType<typeof forecastMetrics>
    comparison_metrics: ReturnType<typeof forecastMetrics>
    missing_prediction_count: number
  }>
}

/**
 * Build a complete demand forecast view for a monthly quantity series.
 *
 * @param series       Map of monthIndex → quantity (null = missing/unavailable)
 * @param origin       Training cutoff as monthIndex (inclusive). 2025-12 = monthIndex('2025-12')
 * @param horizon      Backtest evaluation window length in months
 * @param seriesId     Unique series identifier (e.g. 'sku:AMOX500:quantity')
 * @param scopeLabel   Human-readable scope description
 * @param unit         Physical unit label (e.g. 'capsules', '₱')
 * @param displayStart First period to include in forecast display (as monthIndex)
 */
export function demandForecastView(
  series: Map<number, number | null>,
  origin: number,
  horizon: number,
  seriesId: string,
  scopeLabel: string,
  unit: string,
  displayStart: number,
): DemandForecastView {
  const trainingEnd = origin - horizon
  const pattern = classifyDemand(series)
  const safeSeries = guardOrigin(series, trainingEnd)

  const makePoint = (
    period: number,
    cutoff: number,
    prediction: number | null,
    actual: number | null,
    missingReason: string | null,
    model: DemandBenchmark,
    displayOrigin: number,  // the overall observation boundary for data_status labeling
  ): DemandPoint => ({
    series: seriesId,
    target: scopeLabel,
    period: monthLabel(period),
    origin: monthLabel(cutoff),
    lead: period - cutoff,
    actual,
    prediction,
    // data_status is relative to displayOrigin (the full forecast cutoff, i.e. `origin`),
    // so that backtest evaluation-window periods (trainingEnd < period ≤ origin) are
    // correctly labeled 'actual' or 'unavailable', not 'estimated'.
    data_status: forecastDataStatus(period, displayOrigin, actual !== null),
    missing_reason: missingReason,
    model,
  })

  const models = Object.fromEntries(
    (Object.keys(demandBenchmarkNames) as DemandBenchmark[]).map(kind => {
      // Leakage guard: training data ends at trainingEnd, not origin
      const trainSafe = guardOrigin(series, trainingEnd)

      const backtest: DemandPoint[] = Array.from({ length: horizon }, (_, i) => {
        const period = trainingEnd + i + 1
        const prediction = demandPrediction(trainSafe, trainingEnd, period, kind)
        const rawActual = series.get(period) ?? null
        const actual = rawActual !== null && rawActual !== undefined ? rawActual : null
        return makePoint(
          period, trainingEnd, prediction, actual,
          actual === null ? 'missing_actual' : prediction === null ? 'missing_training_history' : null,
          kind,
          origin,  // backtest periods compared against the full origin
        )
      })

      // Future forecast: origin is the declared cutoff.
      // Recursive multi-step: preceding predictions fill gaps in observed series,
      // but these predictions are NEVER used as training inputs (guard: trainSafe is frozen).
      const forecastSafe = guardOrigin(series, origin)  // up to real origin, not trainingEnd
      const forecastPoints: DemandPoint[] = Array.from({ length: horizon }, (_, i) => {
        const period = displayStart + i
        const prediction = demandPrediction(forecastSafe, origin, period, kind)
        // No actual exists for future periods — always 'estimated'
        return makePoint(period, origin, prediction, null, prediction === null ? 'insufficient_history' : null, kind, origin)
      })

      const scorablePairs = backtest
        .filter(p => p.actual !== null && p.prediction !== null)
        .map(p => [p.actual!, p.prediction!] as [number, number])
      const metrics = forecastMetrics(scorablePairs)
      return [kind, {
        backtest,
        forecast: forecastPoints,
        metrics,
        comparison_metrics: metrics,  // updated below for common keys
        missing_prediction_count: backtest.filter(p => p.prediction === null).length,
      }]
    }),
  ) as Record<DemandBenchmark, any>

  // Common-key comparison metrics across all demand models
  const backtestKeyOf = (p: DemandPoint) =>
    JSON.stringify([p.series, p.target, p.origin, p.period, p.lead])
  const eligibleSets: Set<string>[] = (Object.values(models) as any[]).map(
    m => new Set<string>(m.backtest.filter((p: DemandPoint) => p.actual !== null && p.prediction !== null).map(backtestKeyOf)),
  )
  const commonKeys: string[] = eligibleSets.length
    ? [...eligibleSets[0]].filter(k => eligibleSets.every(s => s.has(k)))
    : []
  const commonSet = new Set(commonKeys)
  for (const model of Object.values(models) as any[]) {
    const pairs = model.backtest
      .filter((p: DemandPoint) => commonSet.has(backtestKeyOf(p)) && p.actual !== null && p.prediction !== null)
      .map((p: DemandPoint) => [p.actual!, p.prediction!] as [number, number])
    model.comparison_metrics = forecastMetrics(pairs)
  }

  return {
    scope: scopeLabel,
    series_id: seriesId,
    unit,
    pattern,
    evaluation_protocol: 'fixed_origin_multi_step',
    training_end: monthLabel(trainingEnd),
    evaluation_start: monthLabel(trainingEnd + 1),
    evaluation_end: monthLabel(origin),
    common_scored_months: commonKeys.length,
    models,
  }
}

// ---------------------------------------------------------------------------
// Download row builder — Req 11
// ---------------------------------------------------------------------------
export interface ForecastDownloadRow {
  forecast_origin: string
  forecast_month: string
  forecast_horizon: number
  sku_or_scope: string
  measurement_unit: string
  predicted_value: number | null
  model: string
  mae: number | null
  rmse: number | null
  wape: number | null
  bias: number | null
  data_status: DataStatus
  generation_timestamp: string
}

export function buildDownloadRows(
  view: DemandForecastView,
  horizon: 3 | 6 | 12,
  generationTimestamp: string,
): ForecastDownloadRow[] {
  const rows: ForecastDownloadRow[] = []
  for (const [modelKey, modelData] of Object.entries(view.models)) {
    for (const point of modelData.forecast as DemandPoint[]) {
      rows.push({
        forecast_origin: point.origin,
        forecast_month: point.period,
        forecast_horizon: horizon,
        sku_or_scope: view.series_id,
        measurement_unit: view.unit,
        predicted_value: point.prediction,
        model: demandBenchmarkNames[modelKey as DemandBenchmark] ?? modelKey,
        mae: modelData.metrics.mae,
        rmse: modelData.metrics.rmse,
        wape: modelData.metrics.wape,
        bias: modelData.metrics.bias,
        data_status: point.data_status,
        generation_timestamp: generationTimestamp,
      })
    }
  }
  return rows
}

// ---------------------------------------------------------------------------
// CSV serializer — Req 11
// ---------------------------------------------------------------------------
export function downloadRowsToCSV(rows: ForecastDownloadRow[]): string {
  const headers: (keyof ForecastDownloadRow)[] = [
    'forecast_origin', 'forecast_month', 'forecast_horizon', 'sku_or_scope',
    'measurement_unit', 'predicted_value', 'model', 'mae', 'rmse', 'wape', 'bias',
    'data_status', 'generation_timestamp',
  ]
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const csvLines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ]
  return csvLines.join('\n')
}

// ---------------------------------------------------------------------------
// Forecast scope validation helpers
// ---------------------------------------------------------------------------
/**
 * Returns whether this series has enough history for a meaningful backtest.
 * Minimum: 2 × horizon observations, at least 6 total.
 */
export function hasSufficientHistory(series: Map<number, number | null>, horizon: number): boolean {
  const nonNull = [...series.values()].filter(v => v !== null).length
  return nonNull >= Math.max(6, 2 * horizon)
}

/**
 * Validates that no future period (> origin) appears in the series with a
 * non-null value. Throws a hard error if leakage is detected.
 */
export function assertNoLeakage(series: Map<number, number | null>, origin: number): void {
  for (const [idx, val] of series) {
    if (idx > origin && val !== null) {
      throw new Error(
        `Leakage detected: period ${monthLabel(idx)} is after origin ${monthLabel(origin)} but has a non-null value.`,
      )
    }
  }
}
