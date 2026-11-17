import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { executeDatabricksStatement } from './databricks'
import type { DescriptiveRelease } from './descriptiveSource'
import {ITEMIZED_PREVIEW_BINDING} from './itemizedPreviewBinding'

export const TRUTH_POLICY = 'original_itemized_sales_v1'
export const AFFECTED_DATASETS = new Set([
  'abb5af9adc151cc7a88b5e2241ea6d4d0a1c78bbd7875a10e66fa67c1353f94d',
  'b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4',
])
export const truthHash = (body: string) => createHash('sha256').update(body).digest('hex')
export type TruthManifest = {
  schema_version: 1; policy: typeof TRUTH_POLICY; id: string; source_dataset: string
  source_fact_version: number; source_table: string; source_publication_id: string
  correction_sha256: string; serving_table: string; excluded_table: string
  contracts_table: string; source_rows: number; removed_rows: number; kept_rows: number
  excluded_keys: number; source_keys_sha256: string; kept_keys_sha256: string
  contract_rows: number; original_source_hashes: Record<string, string>
  scope: 'itemized_product_sales'; status: 'source_corrected_research_not_new_business_approval'
}
export type AnalyticalTruth = TruthManifest & { manifest_sha256: string; serving_version: 0 }
export function truthTable(table: string) {
  assert.match(table, /^workspace\.medshield_gold_source_\d{8}\.truth_[a-f0-9]{16}_(fact|manifest|excluded|contracts|stl)$/)
  return table.split('.').map(part => '`' + part + '`').join('.')
}
export function validateTruthManifest(m: TruthManifest, release: DescriptiveRelease, id: string) {
  assert.equal(m.schema_version, 1); assert.equal(m.policy, TRUTH_POLICY)
  assert.match(id, /^truth_[a-f0-9]{16}$/); assert.equal(m.id,id)
  assert.equal(m.source_dataset,release.dataset_id)
  assert.equal(m.source_fact_version,release.fact_delta_version)
  assert.equal(m.source_table,release.financial_publication?.serving_table)
  assert.equal(m.source_publication_id,release.financial_publication?.publication_id)
  const prefix = m.source_table.split('.').slice(0,2).join('.') + '.' + id
  assert.equal(m.serving_table,prefix+'_fact'); assert.equal(m.excluded_table,prefix+'_excluded')
  assert.equal(m.contracts_table,prefix+'_contracts')
  for (const hash of [m.correction_sha256,m.source_keys_sha256,m.kept_keys_sha256,...Object.values(m.original_source_hashes)]) assert.match(hash,/^[a-f0-9]{64}$/)
  for (const count of [m.source_rows,m.removed_rows,m.kept_rows,m.excluded_keys,m.contract_rows]) assert.ok(Number.isSafeInteger(count) && count >= 0)
  assert.ok(m.kept_rows > 0 && m.removed_rows > 0 && m.excluded_keys >= m.removed_rows)
  assert.equal(m.source_rows,m.kept_rows+m.removed_rows)
  assert.equal(m.scope,'itemized_product_sales')
  assert.equal(m.status,'source_corrected_research_not_new_business_approval')
}
/** Runtime reads a pinned warehouse correction; JSON files are never analytical fallbacks. */
export async function readAnalyticalTruth(release: DescriptiveRelease, execute = executeDatabricksStatement, env: NodeJS.ProcessEnv = process.env): Promise<AnalyticalTruth | undefined> {
  const id=env.DATABRICKS_TRUTH_RELEASE_ID, expected=env.DATABRICKS_TRUTH_MANIFEST_SHA256
  if (!id && !expected && !AFFECTED_DATASETS.has(release.dataset_id)) return undefined
  assert.ok(id && expected, 'Original-source correction is required before serving this affected analytical dataset')
  assert.match(id,/^truth_[a-f0-9]{16}$/); assert.match(expected,/^[a-f0-9]{64}$/)
  const schema=release.source_table!.split('.').slice(0,2).join('.')
  const manifest=(await execute(`SELECT manifest_json FROM ${truthTable(schema+'.'+id+'_manifest')} VERSION AS OF 0`,{rowLimit:2})).rows
  assert.equal(manifest.length,1,'Ambiguous analytical correction manifest')
  const body=manifest[0].manifest_json!; assert.equal(truthHash(body),expected,'Analytical correction checksum differs')
  const parsed=JSON.parse(body) as TruthManifest
  validateTruthManifest(parsed,release,id)
  const counts=(await execute(`SELECT COUNT(*) AS records, COUNT(DISTINCT source_record_id) AS unique_records, SHA2(CONCAT_WS('|', SORT_ARRAY(COLLECT_LIST(source_record_id))), 256) AS keys_sha256 FROM ${truthTable(parsed.serving_table)} VERSION AS OF 0`,{rowLimit:1})).rows[0]
  assert.equal(Number(counts?.records),parsed.kept_rows,'Corrected population differs')
  assert.equal(counts?.records,counts?.unique_records,'Duplicate corrected source keys')
  assert.equal(counts?.keys_sha256,parsed.kept_keys_sha256,'Corrected source keys differ')
  return {...parsed,manifest_sha256:expected,serving_version:0}
}
export function requireUncorrectedResearchEligible(dataset: string) {
  if (AFFECTED_DATASETS.has(dataset)) throw new Error('Historical research used superseded contract allocations; reevaluation on corrected itemized sales is required')
  if(process.env.DATABRICKS_DESCRIPTIVE_ADAPTER==='original_itemized_v1'&&dataset!==ITEMIZED_PREVIEW_BINDING.datasetId)
    throw new Error('Stored research does not match the connected original Gold itemized dataset; a source-matched evaluation is required')
}
