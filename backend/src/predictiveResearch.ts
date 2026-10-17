import { createHash } from 'node:crypto'
import { executeDatabricksStatement } from './databricks'
import { descriptiveRelease } from './databricksDashboard'
import { forecastMetrics, monthIndex, monthLabel } from './forecastEvidence'
import { forecastYoy, FrozenBaseline, readFrozenBaseline } from './predictiveResearchBaseline'

const TABLE = 'workspace.medshield_gold.fact_forecast_run_candidate'
const HASH = /^[a-f0-9]{64}$/
const STORAGE_ID = /^experiment_[a-f0-9]{64}$/
const MODEL_ID = /^[A-Za-z0-9_.:-]{1,160}$/
const PERIOD = /^[1-9]\d{3}-(0[1-9]|1[0-2])$/
const MAX_RUNS = 100
const MAX_PAYLOAD_BYTES = 5_000_000
type Json = Record<string, any>
type Release = Awaited<ReturnType<typeof descriptiveRelease>>
type Execute = typeof executeDatabricksStatement
type Point = { model_id: string; stage: string; origin_period: string; target_period: string; lead_months: number; actual: number | null; prediction: number | null; missing_reason: string | null; intervals: Json[] }
type Candidate = { run: Json; storageId: string; hash: string; cutoff: string; models: string[]; points: Point[]; matches: boolean }
type ExpectedKey = { origin_period: string; target_period: string; lead_months: number }

export class PredictiveResearchInputError extends Error {}
export class PredictiveResearchUnavailableError extends Error {
  constructor() { super('Stored predictive research evidence is unavailable or inconsistent.') }
}

function requireValue(condition: unknown): asserts condition {
  if (!condition) throw new PredictiveResearchUnavailableError()
}
function digest(value: string) { return createHash('sha256').update(value, 'utf8').digest('hex') }
function text(value: unknown, maximum = 2000): value is string { return typeof value === 'string' && value.length > 0 && value.length <= maximum }
function finiteOrNull(value: unknown) { return value === null || typeof value === 'number' && Number.isFinite(value) }
function canonical(value: any): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}
function pointKey(value: ExpectedKey) { return `${value.origin_period}|${value.target_period}|${value.lead_months}` }
function validTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) return false
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value.slice(0, 10)
}

export function parsePredictiveResearchQuery(query: Record<string, unknown>) {
  for (const [key, value] of Object.entries(query)) {
    if (key !== 'run_id' || typeof value !== 'string' || !STORAGE_ID.test(value)) throw new PredictiveResearchInputError('Only a scalar experiment run_id is accepted.')
  }
  return query.run_id as string | undefined
}

function sourceMatches(manifest: Json, release: Release) {
  return manifest.dataset_id === release.dataset_id && manifest.fact_delta_version === release.fact_delta_version
    && manifest.transformation_policy === release.policy_version && manifest.catalog_mapping_version === release.product_master_sha256
    && manifest.geography_mapping_version === release.area_mapping_sha256 && manifest.source_publication_status === release.publication_status
}

function intervals(value: unknown): Json[] {
  if (value === undefined) return []
  requireValue(Array.isArray(value) && value.length <= 2)
  const levels = new Set<number>()
  return value.map((band: Json) => {
    requireValue(band && [0.8, 0.95].includes(band.level) && !levels.has(band.level))
    levels.add(band.level)
    requireValue(text(band.method, 200) && Number.isSafeInteger(band.sample_count) && band.sample_count >= 0)
    requireValue(finiteOrNull(band.lower) && finiteOrNull(band.upper))
    if (band.lower === null || band.upper === null) requireValue(band.lower === null && band.upper === null && text(band.reason))
    else requireValue(band.lower <= band.upper && band.sample_count >= (band.level === 0.8 ? 20 : 40))
    return { level: band.level, lower: band.lower, upper: band.upper, method: band.method, sample_count: band.sample_count, reason: band.reason ?? null }
  })
}

/** Validate the complete immutable run payload, rather than joining mutable point tables. */
function validateCandidate(row: Record<string, string | null>, release: Release): Candidate {
  requireValue(text(row.payload_json, MAX_PAYLOAD_BYTES) && Buffer.byteLength(row.payload_json, 'utf8') <= MAX_PAYLOAD_BYTES)
  const raw = row.payload_json
  const hash = digest(raw)
  requireValue(row.artifact_hash === hash && row.run_id === `experiment_${hash}`)
  const run: Json = JSON.parse(raw)
  requireValue(run?.schema_version === '1.0' && ['evaluated_unpublished', 'exploratory_evaluated_unpublished'].includes(run.status))
  requireValue(HASH.test(run.run_id) && (run.experiment_id === undefined || HASH.test(run.experiment_id)))
  requireValue(run.publication_approved !== true && Array.isArray(run.blockers) && run.blockers.length === 0)
  const manifest = run.manifest
  requireValue(manifest && manifest.training_approved === true && manifest.reconciliation_passed === true && typeof manifest.publication_approved === 'boolean')
  requireValue(manifest.source_table === 'workspace.medshield_gold.sales_restart_fact_candidate')
  for (const key of ['dataset_id', 'source_checksum', 'accepted_descriptive_release_id', 'catalog_mapping_version', 'geography_mapping_version']) requireValue(HASH.test(manifest[key]))
  requireValue(manifest.source_checksum === manifest.accepted_descriptive_release_id)
  requireValue(Number.isSafeInteger(manifest.fact_delta_version) && manifest.fact_delta_version >= 0 && text(manifest.transformation_policy, 160) && text(manifest.source_publication_status, 160))
  requireValue(row.dataset_id === manifest.dataset_id && HASH.test(run.identity?.input_hash) && row.input_hash === run.identity.input_hash)
  const code = run.identity.code_identity
  let codeHash = code?.predictive_source_sha256
  if (!codeHash) {
    requireValue(code?.code_sha256 && Object.keys(code.code_sha256).length > 0 && Object.keys(code.code_sha256).length <= 100)
    for (const value of Object.values(code.code_sha256)) requireValue(typeof value === 'string' && HASH.test(value))
    codeHash = digest(JSON.stringify(Object.fromEntries(Object.entries(code.code_sha256).sort(([a], [b]) => a.localeCompare(b)))))
  }
  requireValue(typeof codeHash === 'string' && HASH.test(codeHash) && row.code_hash === codeHash)
  const configurations = run.identity.configurations
  requireValue(Array.isArray(configurations) && configurations.length > 0 && configurations.length <= 100)
  const models: string[] = configurations.map((config: Json) => { requireValue(config && typeof config.model_id === 'string' && MODEL_ID.test(config.model_id)); return config.model_id })
  requireValue(new Set(models).size === models.length)
  requireValue(run.selection && models.includes(run.selection.model_id) && row.model_id === run.selection.model_id && run.selection.stage === 'development_only' && run.selection.frozen_before_audit === true)
  requireValue(text(run.selection.reason) && run.protocol === 'rolling_origins_fixed_origin_multistep')
  // Legacy evaluated artifacts predate the top-level flag. Both statuses are
  // unpublished; data approval in the manifest is a separate decision.
  if (run.status === 'exploratory_evaluated_unpublished') requireValue(run.publication_approved === false && run.experiment_protocol?.promotion === false && run.selection.audit_previously_inspected === true)
  const schedule = run.identity.schedule
  requireValue(schedule && Array.isArray(schedule.development_origins) && schedule.development_origins.length > 0 && schedule.development_origins.length <= 50)
  requireValue(PERIOD.test(schedule.training_start) && PERIOD.test(schedule.audit_origin) && PERIOD.test(schedule.audit_end) && schedule.audit_label === 'retrospective_audit')
  requireValue(schedule.audit_end > schedule.audit_origin && monthIndex(schedule.audit_end) - monthIndex(schedule.audit_origin) <= 12)
  requireValue(new Set(schedule.development_origins).size === schedule.development_origins.length)
  for (const origin of schedule.development_origins) requireValue(typeof origin === 'string' && PERIOD.test(origin) && origin >= schedule.training_start && origin < schedule.audit_origin)
  requireValue(typeof row.training_cutoff === 'string' && /^[1-9]\d{3}-(0[1-9]|1[0-2])-01$/.test(row.training_cutoff))
  const cutoff = row.training_cutoff.slice(0, 7)
  requireValue(cutoff >= schedule.audit_end)
  requireValue(Array.isArray(run.folds) && run.folds.length > 0 && run.folds.length <= 51)
  requireValue(new Set(run.folds.map((fold: Json) => fold.origin_period)).size === run.folds.length)
  for (const fold of run.folds) {
    requireValue(fold && (schedule.development_origins.includes(fold.origin_period) || fold.origin_period === schedule.audit_origin))
    requireValue(fold.training_start === schedule.training_start && fold.training_count === monthIndex(fold.origin_period) - monthIndex(schedule.training_start) + 1 && HASH.test(fold.training_hash))
    requireValue(fold.protocol === 'fixed_origin_multistep' && fold.vintage_policy === manifest.revision_policy)
    requireValue(canonical(fold.target_periods) === canonical(Array.from({ length: 12 }, (_, index) => monthLabel(monthIndex(fold.origin_period) + index + 1))))
  }
  requireValue(schedule.development_origins.every((origin: string) => run.folds.some((fold: Json) => fold.origin_period === origin)))
  requireValue(Array.isArray(run.evaluations) && run.evaluations.length === models.length && new Set(run.evaluations.map((e: Json) => e.model_id)).size === models.length && run.evaluations.every((e: Json) => models.includes(e.model_id)))
  requireValue(Array.isArray(run.model_cards) && run.model_cards.length === models.length && new Set(run.model_cards.map((c: Json) => c.model_id)).size === models.length)
  for (const card of run.model_cards) {
    requireValue(models.includes(card.model_id) && card.run_id === run.run_id && card.input_hash === run.identity.input_hash && card.scope === 'company' && card.unit === 'PHP' && card.target === 'net_sales')
    requireValue(canonical(card.configuration) === canonical(configurations.find((config: Json) => config.model_id === card.model_id)))
  }
  requireValue(Array.isArray(run.predictions) && run.predictions.length > 0 && run.predictions.length <= 20000)
  const seen = new Set<string>()
  const actuals = new Map<string, number | null>()
  const targets = new Map<string, number | null>()
  const points: Point[] = run.predictions.map((point: Json) => {
    requireValue(point && point.run_id === run.run_id && models.includes(point.model_id) && point.series_id === 'company:net_sales:PHP' && point.target_name === 'net_sales' && point.scope === 'company' && point.unit === 'PHP')
    requireValue(['development', 'retrospective_audit', 'future'].includes(point.stage) && PERIOD.test(point.origin_period) && PERIOD.test(point.target_period))
    requireValue(Number.isInteger(point.lead_months) && point.lead_months >= 1 && point.lead_months <= 12 && monthIndex(point.target_period) - monthIndex(point.origin_period) === point.lead_months)
    requireValue(finiteOrNull(point.actual) && finiteOrNull(point.prediction) && (point.missing_reason === null || text(point.missing_reason)))
    if (point.prediction === null) requireValue(text(point.missing_reason))
    const key = `${point.stage}|${point.origin_period}|${point.target_period}|${point.lead_months}`
    requireValue(!seen.has(`${point.model_id}|${key}`)); seen.add(`${point.model_id}|${key}`)
    if (point.stage === 'future') requireValue(point.origin_period === cutoff && point.model_id === run.selection.model_id && point.actual === null)
    else {
      requireValue(point.target_period <= cutoff)
      if (point.stage === 'development') requireValue(schedule.development_origins.includes(point.origin_period) && point.target_period <= schedule.audit_origin)
      else requireValue(point.origin_period === schedule.audit_origin && point.target_period <= schedule.audit_end)
      if (actuals.has(key)) requireValue(actuals.get(key) === point.actual)
      if (targets.has(point.target_period)) requireValue(targets.get(point.target_period) === point.actual)
      actuals.set(key, point.actual); targets.set(point.target_period, point.actual)
    }
    return { model_id: point.model_id, stage: point.stage, origin_period: point.origin_period, target_period: point.target_period, lead_months: point.lead_months, actual: point.actual, prediction: point.prediction, missing_reason: point.missing_reason, intervals: intervals(point.intervals) }
  })
  const future = points.filter(point => point.stage === 'future')
  requireValue(future.length === 0 || future.length === 12 && new Set(future.map(point => point.lead_months)).size === 12)
  if (run.evaluation_finished_at !== undefined) requireValue(validTimestamp(run.evaluation_finished_at))
  requireValue(Array.isArray(run.limitations) && run.limitations.length <= 100 && run.limitations.every((value: unknown) => text(value)))
  return { run, storageId: row.run_id!, hash, cutoff, models, points, matches: sourceMatches(manifest, release) }
}

function expectedKeys(candidate: Candidate, stage: 'development' | 'retrospective_audit', horizon: number): ExpectedKey[] {
  const schedule = candidate.run.identity.schedule
  const origins: string[] = stage === 'development' ? [...schedule.development_origins].sort() : [schedule.audit_origin]
  return origins.flatMap(origin => Array.from({ length: horizon }, (_, index) => ({ origin_period: origin, target_period: monthLabel(monthIndex(origin) + index + 1), lead_months: index + 1 })).filter(key => stage === 'development' || key.target_period <= schedule.audit_end))
}

function cohort(candidate: Candidate, stage: 'development' | 'retrospective_audit') {
  return { groups: Object.fromEntries([3, 6, 12].map(horizon => {
    const keys = expectedKeys(candidate, stage, horizon)
    const stagePoints = candidate.points.filter(point => point.stage === stage)
    const actuals = new Map(stagePoints.map(point => [pointKey(point), point.actual]))
    const models = Object.fromEntries(candidate.models.map(model => {
      const modelPoints = new Map(stagePoints.filter(point => point.model_id === model).map(point => [pointKey(point), point]))
      const points = keys.map(key => {
        const stored = modelPoints.get(pointKey(key))
        const actual = stored ? stored.actual : actuals.get(pointKey(key)) ?? null
        const prediction = stored?.prediction ?? null
        const reason = !stored ? 'prediction_key_missing' : actual === null ? 'actual_unavailable' : prediction === null ? stored.missing_reason : null
        const error = reason === null ? prediction! - actual! : null
        requireValue(error === null || Number.isFinite(error))
        return { ...key, actual, prediction, signed_error_php: error, absolute_error_php: error === null ? null : Math.abs(error), error_unavailable_reason: reason }
      })
      const scored = points.filter(point => point.actual !== null && point.prediction !== null)
      const available = keys.length > 0 && scored.length === keys.length
      const metrics = forecastMetrics(available ? scored.map(point => [point.actual!, point.prediction!] as [number, number]) : [])
      requireValue(Object.values(metrics).every(value => typeof value !== 'number' || Number.isFinite(value)))
      return [model, { metrics, points, available, exclusion_reason: available ? null : 'incomplete_expected_origin_target_lead_keys', individual_scored_count: scored.length }]
    }))
    const targets = [...new Set(keys.map(key => key.target_period))].sort()
    return [String(horizon), { n: keys.length, distinct_target_months: targets.length, target_start: targets[0] ?? null, target_end: targets.at(-1) ?? null, origins: [...new Set(keys.map(key => key.origin_period))], comparison_basis: 'complete_models_same_expected_origin_target_lead_keys', models }]
  })) }
}

function projections(candidate: Candidate, baseline: FrozenBaseline | null) {
  const generated = candidate.run.evaluation_finished_at as string | undefined
  const stored = candidate.points.filter(point => point.stage === 'future')
  const generationMonth = generated ? new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).format(new Date(generated)) : null
  const points = generated ? stored.sort((a, b) => a.lead_months - b.lead_months).map(point => ({
    origin_period: point.origin_period, target_period: point.target_period, lead_months: point.lead_months, prediction: point.prediction, actual: null,
    signed_error_php: null, absolute_error_php: null, error_unavailable_reason: 'actual_unavailable',
    temporal_status_at_generation: point.target_period < generationMonth! ? 'elapsed' : point.target_period === generationMonth ? 'current' : 'future', intervals: point.intervals,
    ...forecastYoy(point, baseline!),
  })) : []
  return { model_id: candidate.run.selection.model_id, generated_at: generated ?? null, training_cutoff: candidate.cutoff, points, publication_approved: false, activation_allowed: false,
    limitation: 'Historical cutoff is not the forecast issue date; these are unpublished candidate projections.', unavailable_reason: !stored.length ? 'candidate_projections_unavailable' : generated ? null : 'generation_timestamp_unavailable' }
}

/** Read-only warehouse research access. No publication pointer, files, refit, or fallback. */
export async function readPredictiveResearch(query: Record<string, unknown>, execute: Execute = executeDatabricksStatement, releaseReader: () => Promise<Release> = descriptiveRelease) {
  const requested = parsePredictiveResearchQuery(query)
  try {
    const release = await releaseReader()
    const releaseIdentity = canonical(release)
    const result = await execute(`SELECT run_id, model_id, dataset_id, input_hash, code_hash, artifact_hash, training_cutoff, payload_json FROM ${TABLE} WHERE run_id RLIKE '^experiment_[a-f0-9]{64}$' ORDER BY run_id`, { rowLimit: MAX_RUNS + 1 })
    requireValue(result.rows.length <= MAX_RUNS && new Set(result.rows.map(row => row.run_id)).size === result.rows.length)
    requireValue(result.rows.reduce((total, row) => total + Buffer.byteLength(row.payload_json ?? '', 'utf8'), 0) <= 20_000_000)
    const candidates = result.rows.map(row => validateCandidate(row, release))
    requireValue(releaseIdentity === canonical(await releaseReader()))
    const runs = candidates.map(candidate => ({ run_id: candidate.storageId, source_run_id: candidate.run.run_id, artifact_hash: candidate.hash, configuration_count: candidate.models.length, training_cutoff: candidate.cutoff, source_matches_active: candidate.matches }))
    const selected = requested ? candidates.find(candidate => candidate.storageId === requested) : candidates.filter(candidate => candidate.matches).sort((a, b) => b.models.length - a.models.length || a.storageId.localeCompare(b.storageId))[0]
    if (selected && !selected.matches) throw new PredictiveResearchUnavailableError()
    const base = { schema_version: 'predictive-research.v1', publication_approved: false, activation_allowed: false, runs, selected_run_id: selected?.storageId ?? null,
      selection_rule: requested ? 'explicit_run_id' : 'largest_matching_configuration_grid_then_run_id_not_model_ranking_or_latest',
      source: { system_of_record: 'databricks', table: TABLE, release }, unit: 'PHP', target: 'net_sales', scope: 'company', series_id: 'company:net_sales:PHP' }
    if (!selected) return { ...base, status: 'empty', reason: 'No source-matched stored research experiment is available.', model_names: {}, original_selection: null, limitations: [], cohorts: null, candidate_projections: null }
    const baseline = selected.run.evaluation_finished_at && selected.points.some(point => point.stage === 'future') ? await readFrozenBaseline(selected.run.manifest, selected.run.identity.input_hash, execute) : null
    requireValue(releaseIdentity === canonical(await releaseReader()))
    const selection = selected.run.selection
    const names: Record<string, string> = { last_value: 'Last observed value', seasonal_naive: 'Seasonal naive', mean_3: 'Recent mean (3 months)', mean_6: 'Recent mean (6 months)', ets_none: 'ETS', ets_damped: 'Damped ETS', sarima_ar_seasonal: 'Seasonal ARIMA (AR)', sarima_airline: 'Seasonal ARIMA (airline)' }
    return { ...base, status: 'research_candidate_unpublished', model_names: Object.fromEntries(selected.models.map(model => [model, names[model] ?? model])),
      original_selection: { model_id: selection.model_id, reason: selection.reason, stage: selection.stage, status: selection.status ?? 'candidate_only', frozen_before_audit: selection.frozen_before_audit, audit_previously_inspected: selection.audit_previously_inspected ?? true },
      limitations: [...selected.run.limitations, 'Sales-file evidence only; physical delivery events and reporting completeness were not independently verified.', 'Retrospective audit results were already inspected and are not an untouched future test.', 'Overlapping origin and cumulative lead groups are dependent; do not sum their case counts.', 'Positive signed error and bias mean overforecasting; WAPE is error, not accuracy.', 'These results do not authorize activation or procurement.'],
      cohorts: { development: cohort(selected, 'development'), retrospective_audit: cohort(selected, 'retrospective_audit') }, candidate_projections: projections(selected, baseline) }
  } catch (error) {
    if (error instanceof PredictiveResearchUnavailableError) throw error
    throw new PredictiveResearchUnavailableError()
  }
}
