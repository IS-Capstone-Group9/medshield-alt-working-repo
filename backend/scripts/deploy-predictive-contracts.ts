import 'dotenv/config'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { executeDatabricksStatement as execute } from '../src/databricks'
import { databricksLiteral } from '../src/databricksLiteral'

async function main() {
  const [inputPath, outputPath] = process.argv.slice(2)
  assert.ok(inputPath && outputPath, 'Usage: deploy-predictive-contracts.ts input.json output-directory')
  const raw = readFileSync(inputPath, 'utf8')
  const hash = createHash('sha256').update(raw).digest('hex')
  assert.equal(hash, readFileSync(inputPath.replace(/\.json$/, '.sha256'), 'utf8').trim())
  const input = JSON.parse(raw), m = input.manifest
  assert.equal(input.schema_version, '1.0')
  assert.equal(m.reconciliation_passed, true)
  assert.ok(input.rows.length > 0 && input.rows.length <= 12000)
  assert.equal(new Set(input.rows.map((r: any) => `${r.series_id}|${r.target_name}|${r.period}`)).size, input.rows.length)
  const ddl = readFileSync(resolve('..', 'databricks', 'medshield_project', '07_predictive_contracts.sql'), 'utf8')
  const statements = ddl.replace(/^--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean)
  for (const statement of statements) {
    assert.match(statement, /^CREATE (TABLE|VIEW) IF NOT EXISTS workspace\.medshield_gold\./)
    await execute(statement)
  }
  const q = databricksLiteral
  const fields = ['input_hash', 'dataset_id', 'fact_delta_version', 'mapping_version', 'series_id', 'target_name', 'period', 'target_value', 'unit', 'period_closed', 'coverage_status', 'eligible_for_evaluation', 'eligible_for_publication', 'payload_json']
  const rows = input.rows.map((r: any) => [hash, m.dataset_id, m.fact_delta_version, `${m.geography_mapping_version}:${m.catalog_mapping_version}`, r.series_id, r.target_name, `${r.period}-01`, r.target_value_decimal, r.unit, r.period_closed, r.coverage_status, r.eligible_for_evaluation, r.eligible_for_publication, JSON.stringify({ manifest: m, row: r })])
  const source = rows.map((r: any[]) => `SELECT ${r.map((v, i) => `${q(v)} AS ${fields[i]}`).join(',')}`).join('\nUNION ALL\n')
  await execute(`MERGE INTO workspace.medshield_gold.mart_forecast_monthly_candidate t USING (${source}) s ON t.input_hash=s.input_hash AND t.series_id=s.series_id AND t.target_name=s.target_name AND t.period=CAST(s.period AS DATE) WHEN MATCHED THEN UPDATE SET payload_json=s.payload_json WHEN NOT MATCHED THEN INSERT (${fields.join(',')}) VALUES (${fields.map(f => `s.${f}`).join(',')})`)
  const stored = await execute(`SELECT payload_json FROM workspace.medshield_gold.mart_forecast_monthly_candidate WHERE input_hash=${q(hash)} ORDER BY period`, { rowLimit: input.rows.length + 1 })
  assert.equal(stored.rows.length, input.rows.length)
  const expected = rows.map((r: any[]) => r.at(-1)).sort()
  assert.ok(JSON.stringify(stored.rows.map(r => r.payload_json).sort()) === JSON.stringify(expected), 'Frozen input payload readback mismatch')
  const pointer = await execute("SELECT channel, release_id FROM workspace.medshield_gold.model_release_pointer WHERE channel='company_revenue'", { rowLimit: 2 })
  const receipt = { generated_at: new Date().toISOString(), status: 'candidate_input_persisted_not_training_or_model_approval', ddl_sha256: createHash('sha256').update(ddl).digest('hex'), ddl_statements: statements.length, input_hash: hash, dataset_id: m.dataset_id, fact_delta_version: m.fact_delta_version, stored_rows: stored.rows.length, content_reconciled: true, model_pointer_rows: pointer.rows, activated: false }
  mkdirSync(outputPath, { recursive: true })
  writeFileSync(resolve(outputPath, 'warehouse-receipt.json'), JSON.stringify(receipt, null, 2))
  console.log(JSON.stringify(receipt))
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
