import assert from 'node:assert/strict'
import { executeDatabricksStatement } from './databricks'
import { descriptiveBinding, readDescriptiveRelease } from './descriptiveSource'
import { reconcileSo1Source, so1Hash, so1Literal, so1Table, validateSo1Package, type So1Package } from './so1Diagnostics'

type Execute = typeof executeDatabricksStatement
export async function prepareSo1Publication(raw: string, expectedHash: string, execute: Execute = executeDatabricksStatement) {
  assert.match(expectedHash, /^[a-f0-9]{64}$/)
  assert.equal(so1Hash(raw), expectedHash)
  assert.ok(Buffer.byteLength(raw) <= 2_000_000, 'SO1 aggregate package exceeds size bound')
  const payload = JSON.parse(raw) as So1Package
  assert.equal(raw, JSON.stringify(payload) + '\n', 'SO1 needs canonical JSON bytes')
  const release = await readDescriptiveRelease(descriptiveBinding(), execute)
  validateSo1Package(payload, release)
  const source = await reconcileSo1Source(payload, execute)
  const { series, ...metadata } = payload
  const manifest = { package_sha256: expectedHash, metadata, areas: series.map(s => s.area) }
  const records = [{ key: '!manifest', value: JSON.stringify(manifest) }, ...series.map(s => ({ key: s.area, value: JSON.stringify(s) }))]
    .map(r => ({ ...r, hash: so1Hash(r.value) }))
  const table = so1Table(release, expectedHash)
  const existing = await execute(`SELECT table_name FROM workspace.information_schema.tables WHERE table_schema=${so1Literal(release.source_table!.split('.')[1])} AND table_name=${so1Literal('so1_' + expectedHash.slice(0, 16) + '_candidate')}`, { rowLimit: 2 })
  assert.ok(existing.rows.length <= 1)
  if (existing.rows.length) await validatePersisted(table, records, execute)
  // A single immutable CTAS creates Delta 0 atomically; no INSERT/UPDATE of existing candidates.
  const data = records.map(r => `SELECT ${so1Literal(r.key)} AS record_key,${so1Literal(r.value)} AS payload_json,${so1Literal(r.hash)} AS payload_sha256,current_timestamp() AS staged_at`).join('\nUNION ALL\n')
  const statement = `CREATE TABLE ${table} USING DELTA AS ${data}`
  return { hash: expectedHash, table, records, exists: !!existing.rows.length, source, statement, statement_sha256: so1Hash(statement) }
}

async function validatePersisted(table: string, records: { key: string; value: string; hash: string }[], execute: Execute) {
  const history = (await execute(`DESCRIBE HISTORY ${table} LIMIT 1`, { rowLimit: 1 })).rows
  assert.equal(Number(history[0]?.version), 0, 'SO1 staged candidate must remain immutable Delta 0')
  const rows = (await execute(`SELECT record_key,payload_json,payload_sha256 FROM ${table} VERSION AS OF 0 ORDER BY record_key`, { rowLimit: 102 })).rows
  assert.equal(rows.length, records.length)
  assert.equal(new Set(rows.map(r => r.record_key)).size, records.length)
  for (const row of rows) {
    const expected = records.find(r => r.key === row.record_key)
    assert.ok(expected)
    assert.equal(row.payload_json, expected.value)
    assert.equal(row.payload_sha256, expected.hash)
  }
}

export async function applySo1Publication(plan: Awaited<ReturnType<typeof prepareSo1Publication>>, raw: string, execute: Execute = executeDatabricksStatement) {
  const fresh = await prepareSo1Publication(raw, plan.hash, execute)
  assert.equal(fresh.statement_sha256, plan.statement_sha256, 'Prepared SO1 SQL changed')
  if (!fresh.exists) await execute(fresh.statement, { rowLimit: 1 })
  await validatePersisted(fresh.table, fresh.records, execute)
  return { status: 'conditional_diagnostic_staged_not_business_or_model_approval', table: fresh.table, version: 0,
    package_sha256: fresh.hash, staged_rows: fresh.records.length, warehouse_write_statements: fresh.exists ? 0 : 1,
    idempotent: fresh.exists, source_reconciled: fresh.source, checked_at: new Date().toISOString(), source_and_models_unchanged: true }
}
