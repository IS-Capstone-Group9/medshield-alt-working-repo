import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { executeDatabricksStatement } from './databricks'
import type { DescriptiveRelease } from './descriptiveSource'

export const FINANCIAL_SCOPE = 'descriptive_company_financial_history_and_source_label_commercial_reporting'
export const financialHash = (value: string) => createHash('sha256').update(value).digest('hex')
export type FinancialManifest = {
  schema_version: '1'; publication_id: string; scope: typeof FINANCIAL_SCOPE
  source: Omit<DescriptiveRelease, 'financial_publication'>
  population: { version: string; predicate: string; predicate_sha256: string }
  decision_sha256: string; evidence_sha256: string; reviewed_packet_sha256: string
  reviewer: { name: string; role: string }; decision_date: string
  limitations: string[]; excluded_approvals: string[]
  serving_table: string; serving_version: 0; expected_rows: number
}
export type FinancialPublication = {
  status: 'approved'; scope: typeof FINANCIAL_SCOPE; publication_id: string
  manifest_sha256: string; serving_table: string; serving_version: 0
  reviewer: { name: string; role: string }; decision_date: string
  population_sha256: string; limitations: string[]; excluded_approvals: string[]
}
export function financialNames(schema: string, id: string) {
  assert.match(schema, /^medshield_gold_source_\d{8}$/)
  assert.match(id, /^financial_[a-f0-9]{16}$/)
  return { manifest: `workspace.${schema}.${id}_manifest`, serving: `workspace.${schema}.${id}_fact` }
}
export function financialTableSql(table: string) {
  assert.match(table, /^workspace\.medshield_gold_source_\d{8}\.financial_[a-f0-9]{16}_(?:manifest|fact)$/)
  return table.split('.').map(part => '`' + part + '`').join('.')
}
export function validateFinancialManifest(manifest: FinancialManifest, release: DescriptiveRelease, id: string) {
  assert.equal(manifest.schema_version, '1')
  assert.equal(manifest.publication_id, id)
  assert.equal(manifest.scope, FINANCIAL_SCOPE)
  const { financial_publication: _publication, ...source } = release
  assert.deepEqual(manifest.source, source, 'Financial approval source identity differs')
  assert.match(manifest.source.source_table ?? '', /^workspace\.medshield_gold_source_\d{8}\.sales_restart_fact_candidate$/)
  const names = financialNames(manifest.source.source_table!.split('.')[1], id)
  assert.equal(manifest.serving_table, names.serving)
  assert.equal(manifest.serving_version, 0)
  assert.equal(manifest.population.version, 'dashboard_observed_fact_v1')
  assert.equal(financialHash(manifest.population.predicate), manifest.population.predicate_sha256)
  for (const hash of [manifest.decision_sha256, manifest.evidence_sha256, manifest.reviewed_packet_sha256, manifest.population.predicate_sha256]) assert.match(hash, /^[a-f0-9]{64}$/)
  assert.ok(Number.isSafeInteger(manifest.expected_rows) && manifest.expected_rows > 0)
  assert.ok(manifest.reviewer.name && manifest.reviewer.role)
  assert.match(manifest.decision_date, /^\d{4}-\d{2}-\d{2}$/)
  assert.ok(manifest.limitations.length)
  for (const excluded of ['canonical_medicine_identity_and_units', 'external_disease_weather_joins', 'trained_model_publication', 'live_disease_alerts', 'operational_procurement', 'academic_scope_amendment']) {
    assert.ok(manifest.excluded_approvals.includes(excluded), 'Financial approval must retain separate acceptance gates')
  }
}
/** Approval is read only from a pinned warehouse manifest; local decision files are never runtime inputs. */
export async function readFinancialPublication(release: DescriptiveRelease, id: string, expectedHash: string, execute = executeDatabricksStatement): Promise<FinancialPublication> {
  assert.match(expectedHash, /^[a-f0-9]{64}$/)
  const names = financialNames(release.source_table!.split('.')[1], id)
  const rows = (await execute(`SELECT manifest_json FROM ${financialTableSql(names.manifest)} VERSION AS OF 0`, { rowLimit: 2 })).rows
  assert.equal(rows.length, 1, 'Ambiguous financial approval manifest')
  const body = rows[0].manifest_json!
  assert.equal(financialHash(body), expectedHash, 'Financial manifest checksum mismatch')
  const manifest = JSON.parse(body) as FinancialManifest
  validateFinancialManifest(manifest, release, id)
  const counts = (await execute(`SELECT COUNT(*) AS records, COUNT(DISTINCT source_record_id) AS unique_records FROM ${financialTableSql(names.serving)} VERSION AS OF 0`, { rowLimit: 1 })).rows[0]
  assert.equal(Number(counts?.records), manifest.expected_rows, 'Approved serving population differs')
  assert.equal(counts?.records, counts?.unique_records, 'Duplicate approved serving keys')
  return {status:'approved', scope:manifest.scope, publication_id:id, manifest_sha256:expectedHash,
    serving_table:manifest.serving_table, serving_version:0, reviewer:manifest.reviewer, decision_date:manifest.decision_date,
    population_sha256:manifest.population.predicate_sha256, limitations:manifest.limitations, excluded_approvals:manifest.excluded_approvals}
}
