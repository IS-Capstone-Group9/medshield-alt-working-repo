import 'dotenv/config'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { executeDatabricksStatement as execute } from '../src/databricks'
import { databricksLiteral as q } from '../src/databricksLiteral'

async function main() {
  const path = process.argv[2]
  assert.ok(path, 'Usage: persist-predictive-candidate.ts path/to/run.json')
  const raw = readFileSync(path, 'utf8'), run = JSON.parse(raw)
  const hash = createHash('sha256').update(raw).digest('hex')
  assert.equal(JSON.parse(readFileSync(resolve(dirname(path), 'artifact-hashes.json'), 'utf8'))['run.json'], hash)
  assert.equal(run.status, 'evaluated_unpublished')
  assert.ok(run.selection?.model_id && run.manifest?.training_approved === true)
  assert.ok(run.predictions.length <= 20000 && run.evaluations.length <= 1000)
  const seen = new Set<string>()
  for (const p of run.predictions) {
    const key = JSON.stringify([p.model_id, p.series_id, p.origin_period, p.target_period, p.stage])
    assert.ok(!seen.has(key)); seen.add(key)
    assert.equal(p.run_id, run.run_id)
    assert.ok(p.prediction === null || Number.isFinite(p.prediction))
  }
  const gold = 'workspace.medshield_gold'
  // Experiment artifacts include all candidate models and development folds.
  // Namespace storage separately from a later reviewed single-model release.
  const storageId = `experiment_${hash}`
  async function stage(table: string, keys: string[], rows: Record<string, unknown>[]) {
    const fields = Object.keys(rows[0])
    for (let offset = 0; offset < rows.length; offset += 100) {
      const source = rows.slice(offset, offset + 100).map(row => `SELECT ${fields.map(f => `${q(row[f])} AS ${f}`).join(',')}`).join(' UNION ALL ')
      await execute(`MERGE INTO ${gold}.${table} t USING (${source}) s ON ${keys.map(k => `t.${k}=s.${k}`).join(' AND ')} WHEN NOT MATCHED THEN INSERT (${fields.join(',')}) VALUES (${fields.map(f => `s.${f}`).join(',')})`)
    }
    const actual = await execute(`SELECT payload_json FROM ${gold}.${table} WHERE run_id=${q(storageId)}`, { rowLimit: rows.length + 1 })
    assert.equal(actual.rows.length, rows.length, `${table} count`)
    assert.ok(JSON.stringify(actual.rows.map(r => r.payload_json).sort()) === JSON.stringify(rows.map(r => r.payload_json).sort()), `${table} payload readback`)
  }
  const existing = await execute(`SELECT artifact_hash FROM ${gold}.fact_forecast_run_candidate WHERE run_id=${q(storageId)}`, { rowLimit: 2 })
  assert.ok(existing.rows.length <= 1 && existing.rows.every(r => r.artifact_hash === hash), 'Immutable candidate run mismatch')
  await stage('fact_forecast_run_candidate', ['run_id'], [{ run_id: storageId, model_id: run.selection.model_id, dataset_id: run.manifest.dataset_id, input_hash: run.identity.input_hash, code_hash: run.identity.code_identity.predictive_source_sha256, artifact_hash: hash, training_cutoff: run.predictions.filter((p: any) => p.stage === 'future')[0].origin_period + '-01', payload_json: raw }])
  await stage('fact_forecast_point_candidate', ['run_id', 'model_id', 'series_id', 'origin_period', 'target_period', 'role'], run.predictions.map((p: any) => ({ run_id: storageId, model_id: p.model_id, series_id: p.series_id, origin_period: p.origin_period + '-01', target_period: p.target_period + '-01', lead_months: p.lead_months, role: p.stage, prediction: p.prediction, payload_json: JSON.stringify(p) })))
  await stage('fact_model_evaluation_candidate', ['run_id', 'evaluation_id'], run.evaluations.map((e: any) => ({ run_id: storageId, evaluation_id: `${storageId}:${e.model_id}`, dataset_id: run.manifest.dataset_id, protocol: run.protocol, common_key_checksum: createHash('sha256').update(JSON.stringify(e.development?.common_keys ?? [])).digest('hex'), payload_json: JSON.stringify(e) })))
  const receipt = { status: 'candidate_persisted_not_published', run_id: run.run_id, warehouse_experiment_id: storageId, artifact_hash: hash, predictions: run.predictions.length, evaluations: run.evaluations.length, content_reconciled: true, release_pointer_modified: false, completed_at: new Date().toISOString() }
  writeFileSync(resolve(dirname(path), 'candidate-warehouse-receipt.json'), JSON.stringify(receipt, null, 2))
  console.log(JSON.stringify(receipt))
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
