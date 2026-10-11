/**
 * analyticsContracts.ts
 * Unified Analytical Architecture Data Contracts for MedShield DSS.
 *
 * Enforces strict data provenance and viewing mode separation across:
 * Data Management -> Descriptive -> Diagnostic -> Predictive -> Prescriptive -> Decision Evaluation
 */

export type GlobalViewingMode = 'actual' | 'estimated' | 'both'

export type ProvenanceTag =
  | 'verified_actual'         // Audited historical observation from Databricks Gold Fact
  | 'historical_missing'      // Verified calendar month with zero/null transaction record (never silently cast to 0)
  | 'retrospective_estimate'  // Holdout backtest point generated during model evaluation
  | 'current_month_estimate'  // Rolling estimate for the open/in-progress calendar period
  | 'future_forecast'         // Forward rolling projection (strictly labeled 'estimated')
  | 'scenario_assumption'     // User-entered or simulated operational constraint

export type AnalyticalDataStatus = 'actual' | 'estimated' | 'unavailable' | 'scenario'

export interface AnalyticalPoint {
  period: string               // 'YYYY-MM'
  value: number | null         // Numeric measure or null if missing/unobserved
  data_status: AnalyticalDataStatus
  provenance: ProvenanceTag
  unit: string                 // 'PHP' | 'source units' | 'packs' | etc.
  model_id?: string | null     // Generating model identifier, if estimated
  confidence_lower?: number | null
  confidence_upper?: number | null
  metadata?: Record<string, unknown>
}

/**
 * Filter analytical points according to the active global viewing mode.
 * - 'actual': Only verified actuals and confirmed historical missing periods.
 * - 'estimated': Only prospective forecasts, retrospective estimates, and scenarios.
 * - 'both': Unified view with both actuals and estimates clearly demarcated.
 */
export function filterPointsByViewingMode(
  points: AnalyticalPoint[],
  mode: GlobalViewingMode,
): AnalyticalPoint[] {
  if (mode === 'both') return points
  if (mode === 'actual') {
    return points.filter(
      p => p.data_status === 'actual' || p.provenance === 'verified_actual' || p.provenance === 'historical_missing',
    )
  }
  return points.filter(
    p => p.data_status === 'estimated' || p.data_status === 'scenario' || p.provenance === 'future_forecast' || p.provenance === 'retrospective_estimate' || p.provenance === 'current_month_estimate',
  )
}

/**
 * Resolve the dynamic calendar boundary and forecast horizon years.
 * Never hardcodes calendar years; infers the active reference year from closed observation history.
 */
export function resolveAnalyticalOrigin(latestClosedPeriod = '2025-12'): {
  originPeriod: string
  referenceYear: number
  forecastYear: number
  rollingStartPeriod: string
} {
  const parts = latestClosedPeriod.split('-').map(Number)
  const originYear = parts[0] || 2025
  const originMonth = parts[1] || 12

  const nextMonth = originMonth === 12 ? 1 : originMonth + 1
  const nextYear = originMonth === 12 ? originYear + 1 : originYear

  const rollingStartPeriod = `${nextYear}-${String(nextMonth).padStart(2, '0')}`

  return {
    originPeriod: latestClosedPeriod,
    referenceYear: originYear,
    forecastYear: nextYear,
    rollingStartPeriod,
  }
}

/**
 * Validate that an analytical point obeys the provenance contract:
 * Future periods beyond the origin can NEVER be tagged as 'actual' or 'verified_actual'.
 */
export function assertPointProvenance(point: AnalyticalPoint, originPeriod: string): void {
  if (point.period > originPeriod) {
    if (point.data_status === 'actual' || point.provenance === 'verified_actual') {
      throw new Error(
        `Provenance violation: Future period ${point.period} (beyond origin ${originPeriod}) cannot be tagged as actual.`,
      )
    }
  }
}
