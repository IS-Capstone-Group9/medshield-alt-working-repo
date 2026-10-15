import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const sha256 = (raw: string) => createHash('sha256').update(raw).digest('hex')
const periodIndex = (value: string) => {
  assert.match(value, /^[1-9]\d{3}-(0[1-9]|1[0-2])$/)
  return Number(value.slice(0, 4)) * 12 + Number(value.slice(5)) - 1
}

/** Candidate storage is distinct from the artifact-bound publication workflow. */
export function validateCandidateRun(raw: string) {
  const run = JSON.parse(raw)
  assert.equal(run.schema_version, '1.0')
  assert.ok(['evaluated_unpublished', 'exploratory_evaluated_unpublished'].includes(run.status), 'Only evaluated unpublished candidates can be stored')
  assert.deepEqual(run.blockers, [])
  assert.equal(run.manifest?.training_approved, true)
  assert.equal(run.manifest?.reconciliation_passed, true)
  // Data approval may exist while the evaluated model remains unpublished.
  assert.equal(typeof run.manifest?.publication_approved, 'boolean')
  assert.notEqual(run.publication_approved, true)
  assert.ok(Number.isSafeInteger(run.manifest.fact_delta_version) && run.manifest.fact_delta_version >= 0)
  assert.ok(typeof run.manifest.dataset_id === 'string' && run.manifest.dataset_id.length > 0)
  assert.match(run.run_id, /^[a-f0-9]{64}$/)
  assert.match(run.identity?.input_hash, /^[a-f0-9]{64}$/)
  assert.equal(run.selection?.stage, 'development_only')
  assert.equal(run.selection?.frozen_before_audit, true)
  if (run.status === 'exploratory_evaluated_unpublished') {
    assert.equal(run.experiment_protocol?.status, 'exploratory_revised_recipe')
    assert.equal(run.experiment_protocol?.promotion, false)
    assert.equal(run.publication_approved, false)
    assert.equal(run.selection?.audit_previously_inspected, true)
    assert.equal(run.identity?.schedule?.audit_label, 'retrospective_audit')
  }
  assert.ok(Array.isArray(run.identity.configurations) && run.identity.configurations.length > 0 && run.identity.configurations.length <= 100)
  const models = new Set(run.identity.configurations.map((c: any) => c.model_id))
  for (const model of models) assert.match(String(model), /^[A-Za-z0-9_.:-]{1,160}$/)
  assert.equal(models.size, run.identity.configurations.length, 'Duplicate model configuration')
  assert.ok(models.has(run.selection.model_id))
  assert.ok(Array.isArray(run.predictions) && run.predictions.length > 0 && run.predictions.length <= 20000)
  assert.ok(Array.isArray(run.evaluations) && run.evaluations.length === models.size)
  assert.deepEqual(new Set(run.evaluations.map((e: any) => e.model_id)), models)
  const seen = new Set<string>()
  for (const point of run.predictions) {
    assert.equal(point.run_id, run.run_id)
    assert.ok(models.has(point.model_id))
    assert.equal(point.target_name, 'net_sales')
    assert.equal(point.unit, 'PHP')
    assert.equal(point.scope, 'company')
    assert.equal(point.series_id, 'company:net_sales:PHP')
    assert.ok(['development', 'retrospective_audit', 'untouched_holdout', 'future'].includes(point.stage))
    if (run.status === 'exploratory_evaluated_unpublished') assert.notEqual(point.stage, 'untouched_holdout')
    assert.ok(Number.isInteger(point.lead_months) && point.lead_months >= 1 && point.lead_months <= 12)
    assert.equal(point.lead_months, periodIndex(point.target_period) - periodIndex(point.origin_period))
    assert.ok(point.prediction === null || (typeof point.prediction === 'number' && Number.isFinite(point.prediction)))
    assert.ok(point.actual === null || (typeof point.actual === 'number' && Number.isFinite(point.actual)))
    if (point.prediction === null) assert.ok(typeof point.missing_reason === 'string' && point.missing_reason.length > 0)
    if (point.stage === 'future') {
      assert.equal(point.actual, null)
      assert.equal(point.model_id, run.selection.model_id)
    }
    const key = JSON.stringify([point.model_id, point.series_id, point.origin_period, point.target_period, point.stage])
    assert.ok(!seen.has(key), 'Duplicate prediction key')
    seen.add(key)
  }
  const future = run.predictions.filter((p: any) => p.stage === 'future')
  assert.ok(future.length > 0 && new Set(future.map((p: any) => p.origin_period)).size === 1)
  const source = run.identity.code_identity
  let codeHash = source?.predictive_source_sha256
  if (!codeHash) {
    assert.ok(source?.code_sha256 && Object.keys(source.code_sha256).length > 0)
    for (const value of Object.values(source.code_sha256)) assert.match(String(value), /^[a-f0-9]{64}$/)
    codeHash = sha256(JSON.stringify(Object.fromEntries(Object.entries(source.code_sha256).sort(([a], [b]) => a.localeCompare(b)))))
  }
  assert.match(codeHash, /^[a-f0-9]{64}$/)
  return { run, hash: sha256(raw), codeHash, trainingCutoff: future[0].origin_period + '-01' }
}

export function readCandidateArtifact(path: string) {
  const hashes = JSON.parse(readFileSync(resolve(dirname(path), 'artifact-hashes.json'), 'utf8'))
  assert.ok(hashes['run.json'], 'Run artifact checksum is required')
  for (const [name, expected] of Object.entries(hashes)) {
    // The registered extension includes exactly one parent file: its protocol.
    assert.ok(name === '../protocol.json' || /^[A-Za-z0-9_-]+\.(json|md)$/.test(name), 'Unsafe artifact path')
    assert.match(String(expected), /^[a-f0-9]{64}$/)
    assert.equal(sha256(readFileSync(resolve(dirname(path), name), 'utf8')), expected, `Artifact checksum mismatch: ${name}`)
  }
  const raw = readFileSync(path, 'utf8')
  assert.equal(sha256(raw), hashes['run.json'])
  return { raw, ...validateCandidateRun(raw) }
}
