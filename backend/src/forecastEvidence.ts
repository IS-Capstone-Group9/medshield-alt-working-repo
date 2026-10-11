/** Pure, retrospective benchmark evidence. Publication and coverage are separate gates. */
export const benchmarkNames = {
  seasonal_naive: 'Seasonal naive', last_value: 'Last observed value',
  recent_mean_3: 'Recent mean (3 months)', recent_mean_6: 'Recent mean (6 months)',
}
export type Benchmark = keyof typeof benchmarkNames
export const evaluationProtocol = 'fixed_origin_multi_step'
export function monthIndex(period: string): number {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error('Invalid calendar period')
  return Number(period.slice(0, 4)) * 12 + Number(period.slice(5)) - 1
}
export function monthLabel(index: number): string {
  return `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`
}
export function manilaMonth(now = new Date()): number {
  const local = new Date(now.getTime() + 8 * 3600_000)
  return local.getUTCFullYear() * 12 + local.getUTCMonth()
}
export function benchmarkPrediction(series: Map<number, number>, origin: number, target: number, kind: Benchmark): number | null {
  if (target <= origin) throw new Error('Target must follow training origin')
  if (kind === 'last_value') return series.get(origin) ?? null
  if (kind === 'seasonal_naive') {
    let matching = target - 12
    while (matching > origin) matching -= 12
    return series.get(matching) ?? null
  }
  const window = kind === 'recent_mean_3' ? 3 : 6
  const values = Array.from({length: window}, (_, offset) => series.get(origin - offset))
  return values.some(value => value == null) ? null : (values as number[]).reduce((a, b) => a + b, 0) / window
}
export function forecastMetrics(pairs: Array<[number, number]>) {
  const n = pairs.length
  const total = pairs.reduce((sum, [actual]) => sum + Math.abs(actual), 0)
  const errors = pairs.map(([actual, prediction]) => prediction - actual)
  const absolute = errors.reduce((sum, error) => sum + Math.abs(error), 0)
  const signed = errors.reduce((sum, error) => sum + error, 0)
  return {n, mae: n ? absolute / n : null, rmse: n ? Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / n) : null,
    wape: total ? absolute / total * 100 : null, bias: n ? signed / n : null,
    normalized_bias: total ? signed / total * 100 : null,
    unavailable_reason: !n ? 'no_common_observations' : !total ? 'zero_absolute_actual_denominator' : null}
}
export type EvidencePoint = {series: string; target: string; origin: string; period: string; lead: number; actual: number | null; prediction: number | null}
export function evaluationKey(point: EvidencePoint): string {
  return JSON.stringify([point.series, point.target, point.origin, point.period, point.lead])
}
export function commonEvaluationKeys(models: Array<{backtest: EvidencePoint[]}>): string[] {
  const eligible = models.map(model => new Set(model.backtest.filter(p => p.actual !== null && p.prediction !== null).map(evaluationKey)))
  return eligible.length ? [...eligible[0]].filter(key => eligible.every(keys => keys.has(key))).sort() : []
}
export function benchmarkView(series: Map<number, number>, origin: number, horizon: number, seriesId: string, target: string, displayStart: number) {
  const trainingEnd = origin - horizon
  const models = Object.fromEntries((Object.keys(benchmarkNames) as Benchmark[]).map(kind => {
    const point = (period: number, cutoff: number, prediction: number | null, actual: number | null, missing: string | null) => ({
      series: seriesId, target, period: monthLabel(period), origin: monthLabel(cutoff), lead: period - cutoff, actual, prediction,
      lower: null, upper: null, band_sample_count: 0, missing_reason: missing, interval_reason: 'insufficient_calibration_support',
    })
    const backtest = Array.from({length: horizon}, (_, i) => {
      const period = trainingEnd + i + 1
      const prediction = benchmarkPrediction(series, trainingEnd, period, kind)
      const actual = series.get(period) ?? null
      return point(period, trainingEnd, prediction, actual, actual === null ? 'missing_actual' : prediction === null ? 'missing_training_history' : null)
    })
    const forecast = Array.from({length: horizon}, (_, i) => point(displayStart + i, origin, null, null, 'unpublished_forecast'))
    const metrics = forecastMetrics(backtest.filter(p => p.actual !== null && p.prediction !== null).map(p => [p.actual!, p.prediction!]))
    return [kind, {backtest, forecast, metrics, comparison_metrics: metrics,
      missing_prediction_count: backtest.filter(p => p.prediction === null).length,
      band_coverage: {n: 0, percent: null}}]
  }))
  const commonKeys = commonEvaluationKeys(Object.values(models))
  const common = new Set(commonKeys)
  for (const model of Object.values(models)) model.comparison_metrics = forecastMetrics(model.backtest.filter(p => common.has(evaluationKey(p))).map(p => [p.actual!, p.prediction!]))
  return {evaluation_protocol: evaluationProtocol, evaluation_start: monthLabel(trainingEnd + 1), evaluation_end: monthLabel(origin),
    training_end: monthLabel(trainingEnd), common_scored_months: common.size, common_evaluation_keys: commonKeys, models}
}

/** Read bounded pages and fail closed on truncation, duplicates or count drift. */
export async function reconciledPages<T>(count: number, read: (offset: number, size: number) => Promise<T[]>, key: (row: T) => string, pageSize = 120): Promise<T[]> {
  if (!Number.isSafeInteger(count) || count < 0 || count > 120000) throw new Error('Forecast extraction count outside supported bound')
  const rows: T[] = []
  for (let offset = 0; offset < count; offset += pageSize) {
    const expected = Math.min(pageSize, count - offset)
    const page = await read(offset, expected)
    if (page.length !== expected) throw new Error('Incomplete forecast extraction page')
    rows.push(...page)
  }
  if (rows.length !== count || new Set(rows.map(key)).size !== count) throw new Error('Forecast extraction count or uniqueness mismatch')
  return rows
}


// ---------------------------------------------------------------------------
// Data-status vocabulary — Req 6
// Shared by both revenue (benchmarkView) and demand (demandForecast) paths.
// ---------------------------------------------------------------------------

/** Canonical status tags for every forecast point displayed to users. */
export type ForecastDataStatus = 'actual' | 'estimated' | 'unavailable' | 'scenario'

/**
 * Determine the display status of a single forecast point.
 * Rules (in priority order):
 *   1. Period is after forecast origin               → 'estimated'
 *   2. Period is at or before origin, value is null → 'unavailable'
 *   3. Period is at or before origin, value exists  → 'actual'
 * The label 'scenario' must be applied by the caller when the value was
 * supplied through user-defined planning assumptions, not from a model.
 */
export function forecastPointStatus(
  periodIndex: number,
  originIndex: number,
  hasObservedValue: boolean,
): ForecastDataStatus {
  if (periodIndex > originIndex) return 'estimated'
  return hasObservedValue ? 'actual' : 'unavailable'
}

// ---------------------------------------------------------------------------
// Rolling-horizon helpers — Req 3, 4
// ---------------------------------------------------------------------------

/**
 * Returns the three standard display windows (3, 6, 12 months) anchored to
 * `origin` (inclusive last verified period as month index).
 * Each window is a list of YYYY-MM period strings starting at origin + 1.
 */
export function standardRollingHorizons(origin: number): Record<'3' | '6' | '12', string[]> {
  const make = (n: number) =>
    Array.from({ length: n }, (_, i) => monthLabel(origin + 1 + i))
  return { '3': make(3), '6': make(6), '12': make(12) }
}

/**
 * Given an explicit user-selected forecast origin and a horizon (3, 6, or 12),
 * returns the YYYY-MM strings for the forecast window.
 * If origin is null (no verified observations), defaults to December 2025 cutoff.
 */
export function userSelectedHorizon(
  selectedOrigin: string | null,
  horizon: 3 | 6 | 12,
): { origin: string; periods: string[] } {
  const DEFAULT_CUTOFF = '2025-12'
  const originLabel = selectedOrigin ?? DEFAULT_CUTOFF
  const originIdx = monthIndex(originLabel)
  const periods = Array.from({ length: horizon }, (_, i) => monthLabel(originIdx + 1 + i))
  return { origin: originLabel, periods }
}
