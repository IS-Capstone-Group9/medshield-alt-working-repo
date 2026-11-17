import { createHash } from 'node:crypto'
import { executeDatabricksStatement } from './databricks'
import { descriptiveBinding, readDescriptiveRelease, type DescriptiveRelease } from './descriptiveSource'
import { forecastMetrics, monthIndex, monthLabel } from './forecastEvidence'

export const EXTENSION_RESEARCH_TABLE = 'workspace.medshield_gold.fact_forecast_run_candidate'
const HASH = /^[a-f0-9]{64}$/
type Json = Record<string, any>
type Release = DescriptiveRelease
export class ExtensionResearchUnavailableError extends Error {
  constructor() { super('Current-source research is unavailable or inconsistent. No substitute results were used.') }
}
function check(value: unknown): asserts value { if (!value) throw new ExtensionResearchUnavailableError() }
export const extensionDigest = (raw: string) => createHash('sha256').update(raw, 'utf8').digest('hex')

/** Immutable research storage never changes a model publication pointer. */
export function validateExtensionResearch(raw: string, hash: string, release: Release) {
  check(HASH.test(hash) && Buffer.byteLength(raw, 'utf8') <= 5_000_000 && extensionDigest(raw) === hash)
  const run: Json = JSON.parse(raw)
  const base = run.base_run, manifest = base?.manifest
  check(run.schema_version === 1 && run.status === 'evaluated_unpublished' && run.publication_approved === false)
  check(HASH.test(run.extension_run_id) && Array.isArray(run.blockers) && run.blockers.length === 0)
  check(base?.status === 'evaluated_unpublished' && manifest?.training_approved === true && manifest.reconciliation_passed === true && manifest.publication_approved === false)
  check(run.source_table === release.source_table && run.dataset_id === release.dataset_id && run.fact_delta_version === release.fact_delta_version)
  check(manifest.source_table === run.source_table && manifest.dataset_id === run.dataset_id && manifest.fact_delta_version === run.fact_delta_version)
  check(manifest.transformation_policy === release.policy_version && manifest.catalog_mapping_version === release.product_master_sha256 && manifest.geography_mapping_version === release.area_mapping_sha256)
  check(manifest.population?.version === 'dashboard_observed_fact_v1' && HASH.test(manifest.population.predicate_sha256))
  check(!release.financial_publication || manifest.population.predicate_sha256 === release.financial_publication.population_sha256)
  for (const key of ['frozen_input_sha256', 'input_data_hash', 'plan_data_hash', 'plan_sha256']) check(HASH.test(run.identity?.[key]))
  check(HASH.test(run.identity?.code_identity?.predictive_source_sha256) && HASH.test(base.run_id))
  check(run.selection_unchanged === true && JSON.stringify(run.selection) === JSON.stringify(base.selection))
  check(run.selection?.stage === 'development_only' && run.selection.frozen_before_audit === true)
  const configurations: Json[] = base.identity?.configurations
  check(Array.isArray(configurations) && configurations.length > 0 && configurations.length <= 100)
  const models: string[] = configurations.map(row => row.model_id)
  check(new Set(models).size === models.length && models.every(id => typeof id === 'string' && /^[A-Za-z0-9_.:-]{1,160}$/.test(id)) && models.includes(run.selection.model_id))
  check(Array.isArray(base.predictions) && base.predictions.length > 0 && base.predictions.length <= 20_000)
  check(Array.isArray(run.predictions) && run.predictions.length === models.length * 9)
  const stages = ['retrospective_audit', 'retrospective_extension_2026', 'future']
  const points: Json[] = [...base.predictions.filter((p: Json) => ['retrospective_audit', 'future'].includes(p.stage)), ...run.predictions]
  const seen = new Set<string>(), actuals = new Map<string, number>()
  for (const point of points) {
    check(stages.includes(point.stage) && models.includes(point.model_id) && point.unit === 'PHP' && point.scope === 'company' && point.target_name === 'net_sales' && point.series_id === 'company:net_sales:PHP')
    const extension = point.stage === 'retrospective_extension_2026', future = point.stage === 'future'
    check(point.run_id === (extension ? run.extension_run_id : base.run_id))
    check(/^\d{4}-(0[1-9]|1[0-2])$/.test(point.target_period) && /^\d{4}-(0[1-9]|1[0-2])$/.test(point.origin_period))
    check(Number.isInteger(point.lead_months) && point.lead_months >= 1 && point.lead_months <= 12 && monthIndex(point.target_period) - monthIndex(point.origin_period) === point.lead_months)
    check(point.origin_period === (future ? '2026-09' : extension ? '2025-12' : '2024-12'))
    check(point.prediction === null || typeof point.prediction === 'number' && Number.isFinite(point.prediction))
    if (point.prediction === null) check(typeof point.missing_reason === 'string' && point.missing_reason.length > 0)
    if (future) check(point.actual === null && point.model_id === run.selection.model_id)
    else {
      check(typeof point.actual === 'number' && Number.isFinite(point.actual))
      if (actuals.has(point.target_period)) check(actuals.get(point.target_period) === point.actual)
      actuals.set(point.target_period, point.actual)
    }
    const key = `${point.stage}|${point.model_id}|${point.target_period}`
    check(!seen.has(key)); seen.add(key)
  }
  check(Array.isArray(run.evaluations) && run.evaluations.length === models.length && new Set(run.evaluations.map((e: Json) => e.model_id)).size === models.length)
  check(Array.isArray(base.evaluations) && base.evaluations.length === models.length && new Set(base.evaluations.map((e: Json) => e.model_id)).size === models.length)
  const comparisons = models.map(model => {
    const scores: Json = {}
    for (const [stage, count, first] of [['retrospective_audit', 12, '2025-01'], ['retrospective_extension_2026', 9, '2026-01']] as const) {
      const cohort = points.filter(p => p.model_id === model && p.stage === stage).sort((a, b) => a.target_period.localeCompare(b.target_period))
      check(cohort.length === count && cohort.every((p, index) => p.target_period === monthLabel(monthIndex(first) + index)))
      const metrics = forecastMetrics(cohort.filter(p => p.prediction !== null).map(p => [p.actual, p.prediction]))
      const stored = stage === 'retrospective_audit' ? base.evaluations.find((e: Json) => e.model_id === model)?.audit : run.evaluations.find((e: Json) => e.model_id === model)?.metrics
      check(stored && stored.n === metrics.n)
      for (const key of ['mae', 'rmse', 'wape', 'bias', 'normalized_bias'] as const) {
        const value = metrics[key], expected = stored[key]
        check(value === null ? expected === null : typeof expected === 'number' && Number.isFinite(expected) && Math.abs(expected - value) <= Math.max(0.000001, Math.abs(value) * 1e-10))
      }
      scores[stage] = { ...metrics, expected_cases: count }
    }
    return { model_id: model, ...scores }
  })
  const future = points.filter(p => p.stage === 'future').sort((a, b) => a.target_period.localeCompare(b.target_period))
  check(future.length === 12 && future.every((p, index) => p.target_period === monthLabel(monthIndex('2026-10') + index)))
  check(Array.isArray(run.limitations) && run.limitations.every((s: unknown) => typeof s === 'string'))
  return {
    status: 'evaluated_unpublished' as const, publication_approved: false, activation_allowed: false,
    scope: { sector: 'All', territory: 'company', unit: 'PHP', target: 'recorded_net_sales', study_start: '2017-01', study_end: '2025-12', extension_end: '2026-09' },
    source: { table: EXTENSION_RESEARCH_TABLE, storage_id: `extension_${hash}`, artifact_sha256: hash, dataset_id: run.dataset_id, fact_table: run.source_table, fact_version: run.fact_delta_version, input_sha256: run.identity.frozen_input_sha256, base_run_id: base.run_id, extension_run_id: run.extension_run_id },
    selection: run.selection, comparisons,
    points: points.map(p => ({model_id:p.model_id, stage:p.stage, origin_period:p.origin_period, target_period:p.target_period, lead_months:p.lead_months, actual:p.actual, prediction:p.prediction, missing_reason:p.missing_reason})),
    limitations: run.limitations,
  }
}

export async function readExtensionResearch(execute = executeDatabricksStatement, releaseReader = () => readDescriptiveRelease(descriptiveBinding()), configuredHash = process.env.DATABRICKS_EXTENSION_RESEARCH_SHA256) {
  check(typeof configuredHash === 'string' && HASH.test(configuredHash))
  const release = await releaseReader()
  check(!release.original_itemized)
  requireUncorrectedResearchEligible(release.dataset_id)
  const result = await execute(`SELECT run_id, artifact_hash, payload_json FROM ${EXTENSION_RESEARCH_TABLE} WHERE run_id = 'extension_${configuredHash}'`, {rowLimit:2})
  check(result.rows.length === 1)
  const row = result.rows[0]
  check(row.artifact_hash === configuredHash && row.run_id === `extension_${configuredHash}` && typeof row.payload_json === 'string')
  return validateExtensionResearch(row.payload_json, configuredHash, release)
}
import { requireUncorrectedResearchEligible } from './analyticalTruth'
