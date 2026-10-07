import { executeDatabricksStatement } from './databricks'

export class PredictiveInputError extends Error {}
const PERIOD = /^[1-9]\d{3}-(0[1-9]|1[0-2])$/
const ID = /^[A-Za-z0-9:_-]{1,160}$/
export function parsePredictiveQuery(query: Record<string, unknown>) {
  const allowed = ['schema_version', 'series_id', 'target', 'scope', 'release_id', 'run_id', 'display_start', 'horizon']
  for (const [key, value] of Object.entries(query)) {
    if (!allowed.includes(key) || typeof value !== 'string') throw new PredictiveInputError(`Invalid ${key}`)
  }
  if (query.schema_version !== '2') throw new PredictiveInputError('schema_version=2 required')
  for (const key of ['series_id', 'release_id', 'run_id']) if (query[key] !== undefined && !ID.test(String(query[key]))) throw new PredictiveInputError(`Invalid ${key}`)
  if (query.display_start !== undefined && !PERIOD.test(String(query.display_start))) throw new PredictiveInputError('Invalid display_start')
  if (query.horizon !== undefined && !['3', '6', '12'].includes(String(query.horizon))) throw new PredictiveInputError('Invalid horizon')
  const current = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).format(new Date())
  return { series_id: String(query.series_id ?? 'company:net_sales:PHP'), target: String(query.target ?? 'net_sales'), scope: String(query.scope ?? 'company'), release_id: query.release_id as string | undefined, run_id: query.run_id as string | undefined, display_start: String(query.display_start ?? current), horizon: Number(query.horizon ?? 3) }
}
export function monthLead(origin: string, target: string) {
  if (!PERIOD.test(origin) || !PERIOD.test(target)) throw new Error('Invalid forecast period')
  return (Number(target.slice(0, 4)) - Number(origin.slice(0, 4))) * 12 + Number(target.slice(5)) - Number(origin.slice(5))
}
export function validateRelease(payload: any) {
  if (!payload || payload.schema_version !== '2' || payload.publication_status !== 'approved' || !ID.test(payload.release_id ?? '') || !ID.test(payload.run_id ?? '')) throw new Error('Invalid publication identity')
  for (const key of ['model_id', 'dataset_id', 'source_checksum', 'catalog_mapping_version', 'geography_mapping_version', 'transformation_policy', 'training_cutoff', 'last_actual_period', 'evaluation_protocol']) if (typeof payload[key] !== 'string' || !payload[key]) throw new Error(`Missing ${key}`)
  if (!Number.isInteger(payload.fact_delta_version) || payload.fact_delta_version < 0 || payload.target !== 'net_sales' || payload.unit !== 'PHP' || payload.scope !== 'company' || payload.series_id !== 'company:net_sales:PHP') throw new Error('Invalid release scope')
  if (!Number.isInteger(payload.validated_max_lead) || payload.validated_max_lead < 1) throw new Error('Invalid lead support')
  if (!PERIOD.test(payload.training_cutoff) || !PERIOD.test(payload.last_actual_period)) throw new Error('Invalid release cutoff')
  const currentMonth = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).format(new Date())
  if (payload.training_cutoff !== payload.last_actual_period || payload.last_actual_period >= currentMonth) throw new Error('Release requires a closed final training period')
  if (!Array.isArray(payload.points) || !Array.isArray(payload.evaluations) || payload.expected_point_count !== payload.points.length || payload.expected_evaluation_count !== payload.evaluations.length) throw new Error('Incomplete release')
  const keys = new Set<string>()
  for (const point of payload.points) {
    if (point.run_id !== payload.run_id || point.model_id !== payload.model_id || point.series_id !== payload.series_id || point.target !== payload.target || point.unit !== payload.unit) throw new Error('Mixed release point')
    const key = `${point.role}|${point.origin_period}|${point.target_period}`
    if (keys.has(key)) throw new Error('Duplicate release point')
    keys.add(key)
    if (!['backtest', 'future', 'actual'].includes(point.role)) throw new Error('Invalid point role')
    if (point.role !== 'actual' && point.lead_months !== monthLead(point.origin_period, point.target_period)) throw new Error('Incorrect forecast lead')
    if (point.role !== 'actual' && point.lead_months < 1) throw new Error('Forecast must follow origin')
    if (point.role === 'actual' && (typeof point.actual !== 'number' || !Number.isFinite(point.actual) || point.target_period > payload.last_actual_period)) throw new Error('Invalid actual evidence')
    if (point.role === 'future' && point.origin_period !== payload.training_cutoff) throw new Error('Future origin does not match release')
    if (point.prediction === null && !point.missing_reason && point.role !== 'actual') throw new Error('Unavailable prediction needs reason')
    if (point.prediction !== null && (typeof point.prediction !== 'number' || !Number.isFinite(point.prediction))) throw new Error('Non-finite prediction')
    if (point.role === 'future' && point.lead_months > payload.validated_max_lead && point.prediction !== null) throw new Error('Unsupported prediction')
    for (const band of point.intervals ?? []) {
      if (![0.8, 0.95].includes(band.level) || !Number.isFinite(band.lower) || !Number.isFinite(band.upper) || band.lower > band.upper || band.support < (band.level === 0.8 ? 20 : 40) || !band.method) throw new Error('Invalid interval evidence')
    }
  }
  for (const row of payload.evaluations) if (row.run_id !== payload.run_id || row.dataset_id !== payload.dataset_id || !row.common_key_checksum || row.protocol !== payload.evaluation_protocol) throw new Error('Mixed evaluation evidence')
  return payload
}

type Query = typeof executeDatabricksStatement
export async function readPredictiveRelease(query: Record<string, unknown>, execute: Query = executeDatabricksStatement) {
  const filters = parsePredictiveQuery(query)
  const base = { schema_version: '2', target: filters.target, scope: filters.scope, series_id: filters.series_id, unit: 'PHP', display_window: { start: filters.display_start, months: filters.horizon } }
  if (filters.target !== 'net_sales' || filters.scope !== 'company' || filters.series_id !== 'company:net_sales:PHP') return { ...base, status: 'unsupported', reason: 'Only company recorded net-sales revenue is eligible for this release contract.', points: [], evaluations: [] }
  // One warehouse statement resolves one pointer and complete immutable payload.
  // No process cache: activation/rollback is visible on the next request.
  const where = filters.release_id ? `m.release_id = '${filters.release_id}'` : "p.channel = 'company_revenue' AND p.release_id = m.release_id"
  const result = await execute(`SELECT m.release_id, m.run_id, m.payload_json FROM workspace.medshield_gold.model_release_manifest m ${filters.release_id ? '' : 'JOIN workspace.medshield_gold.model_release_pointer p ON p.release_id = m.release_id'} WHERE ${where} AND m.publication_status = 'approved'`, { rowLimit: 2 })
  if (!result.rows.length) return { ...base, status: 'unpublished', reason: 'No approved coherent model release is selected.', points: [], evaluations: [] }
  if (result.rows.length !== 1) throw new Error('Ambiguous model release')
  const row = result.rows[0]
  const release = validateRelease(JSON.parse(String(row.payload_json)))
  if (release.release_id !== row.release_id || release.run_id !== row.run_id) throw new Error('Manifest payload identity mismatch')
  if (filters.run_id && filters.run_id !== release.run_id) return { ...base, status: 'empty', reason: 'Requested run is not in the selected release.', points: [], evaluations: [] }
  const start = new Date(`${filters.display_start}-01T00:00:00Z`)
  const display = Array.from({ length: filters.horizon }, (_, index) => {
    const period = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1)).toISOString().slice(0, 7)
    const point = release.points.find((p: any) => p.role === 'future' && p.target_period === period && p.origin_period === release.training_cutoff)
    return point ?? { role: 'future', target_period: period, origin_period: release.training_cutoff, lead_months: monthLead(release.training_cutoff, period), prediction: null, missing_reason: 'forecast_not_published_for_lead', intervals: [] }
  })
  return { ...release, ...base, status: 'published', points: display, actuals: release.points.filter((p: any) => p.role === 'actual'), backtests: release.points.filter((p: any) => p.role === 'backtest'), freshness_gap_months: monthLead(release.last_actual_period, filters.display_start) }
}
