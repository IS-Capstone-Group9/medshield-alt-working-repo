import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { readCandidateArtifact, validateCandidateRun } from '../scripts/predictive-candidate-contract'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
function fixture(exploratory = false) {
  const run: any = {
    schema_version: '1.0', status: exploratory ? 'exploratory_evaluated_unpublished' : 'evaluated_unpublished',
    blockers: [], run_id: 'a'.repeat(64),
    manifest: { training_approved: true, reconciliation_passed: true, publication_approved: false, fact_delta_version: 20, dataset_id: 'fixture-only' },
    identity: { input_hash: 'b'.repeat(64), configurations: [{ model_id: 'last_value' }],
      schedule: { audit_label: 'retrospective_audit' }, code_identity: { predictive_source_sha256: 'c'.repeat(64) } },
    selection: { model_id: 'last_value', stage: 'development_only', frozen_before_audit: true },
    predictions: [{ run_id: 'a'.repeat(64), model_id: 'last_value', series_id: 'company:net_sales:PHP',
      target_name: 'net_sales', unit: 'PHP', scope: 'company', origin_period: '2025-12', target_period: '2026-01',
      lead_months: 1, prediction: -10, actual: null, stage: 'future', missing_reason: null }],
    evaluations: [{ model_id: 'last_value' }],
  }
  if (exploratory) {
    run.experiment_protocol = { status: 'exploratory_revised_recipe', promotion: false }
    run.publication_approved = false
    run.selection.audit_previously_inspected = true
    run.identity.code_identity = { code_sha256: { 'models.py': 'c'.repeat(64), 'engine.py': 'd'.repeat(64) } }
  }
  return run
}

test('original and explicitly unapproved exploratory candidates retain immutable storage identities', () => {
  for (const exploratory of [false, true]) {
    const raw = JSON.stringify(fixture(exploratory))
    const candidate = validateCandidateRun(raw)
    assert.equal(candidate.hash, hash(raw))
    assert.equal(candidate.trainingCutoff, '2025-12-01')
    assert.match(candidate.codeHash, /^[a-f0-9]{64}$/)
    assert.equal(candidate.run.manifest.publication_approved, false)
    assert.equal(candidate.run.predictions[0].prediction, -10)
  }
  const a = fixture(true), b = fixture(true)
  b.identity.code_identity.code_sha256 = Object.fromEntries(Object.entries(b.identity.code_identity.code_sha256).reverse())
  assert.equal(validateCandidateRun(JSON.stringify(a)).codeHash, validateCandidateRun(JSON.stringify(b)).codeHash)
  const acceptedData = fixture()
  acceptedData.manifest.publication_approved = true
  assert.equal(validateCandidateRun(JSON.stringify(acceptedData)).run.status, 'evaluated_unpublished')
  assert.equal(validateCandidateRun(JSON.stringify(acceptedData)).run.manifest.publication_approved, true)
})

test('candidate persistence rejects approval, changed protocol, blockers and audit-based selection', () => {
  const mutations = [
    (run: any) => { run.status = 'approved' },
    (run: any) => { run.publication_approved = true },
    (run: any) => { run.manifest.training_approved = false },
    (run: any) => { run.blockers = ['coverage incomplete'] },
    (run: any) => { run.selection.stage = 'retrospective_audit' },
    (run: any) => { run.experiment_protocol.promotion = true },
    (run: any) => { run.identity.schedule.audit_label = 'untouched_holdout' },
  ]
  for (const mutate of mutations) {
    const run = fixture(true); mutate(run)
    assert.throws(() => validateCandidateRun(JSON.stringify(run)))
  }
})

test('mixed models, duplicate keys, future actuals and incorrect calendar leads fail before warehouse access', () => {
  const mutations = [
    (run: any) => { run.predictions[0].run_id = 'different' },
    (run: any) => { run.predictions.push(run.predictions[0]) },
    (run: any) => { run.predictions[0].actual = 99 },
    (run: any) => { run.predictions[0].lead_months = 12 },
    (run: any) => { run.evaluations[0].model_id = 'different' },
    (run: any) => { run.predictions[0].prediction = null },
  ]
  for (const mutate of mutations) {
    const run = fixture(); mutate(run)
    assert.throws(() => validateCandidateRun(JSON.stringify(run)))
  }
})

test('every retained artifact is verified and unsafe manifest paths are rejected', () => {
  const folder = mkdtempSync(join(tmpdir(), 'medshield-candidate-'))
  try {
    const raw = JSON.stringify(fixture())
    writeFileSync(join(folder, 'run.json'), raw)
    writeFileSync(join(folder, 'predictions.json'), '[]')
    const hashes: Record<string, string> = { 'run.json': hash(raw), 'predictions.json': hash('[]') }
    writeFileSync(join(folder, 'artifact-hashes.json'), JSON.stringify(hashes))
    assert.equal(readCandidateArtifact(join(folder, 'run.json')).hash, hash(raw))
    writeFileSync(join(folder, 'predictions.json'), '[1]')
    assert.throws(() => readCandidateArtifact(join(folder, 'run.json')), /Artifact checksum mismatch/)
    hashes['../../outside.json'] = 'e'.repeat(64)
    delete hashes['predictions.json']
    writeFileSync(join(folder, 'artifact-hashes.json'), JSON.stringify(hashes))
    assert.throws(() => readCandidateArtifact(join(folder, 'run.json')), /Unsafe artifact path/)
  } finally {
    assert.equal(dirname(resolve(folder)), resolve(tmpdir()))
    assert.ok(folder.startsWith(join(tmpdir(), 'medshield-candidate-')))
    rmSync(folder, { recursive: true, force: true })
  }
})
