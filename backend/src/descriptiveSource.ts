import { executeDatabricksStatement } from './databricks'
import { readFinancialPublication, type FinancialPublication } from './financialPublication'
import type { AnalyticalTruth } from './analyticalTruth'
import {ORIGINAL_ITEMIZED_ADAPTER,readOriginalItemizedRelease,type OriginalItemizedSource} from './originalItemizedSource'
import {ITEMIZED_PREVIEW_BINDING} from './itemizedPreviewBinding'
import {withoutRequestCancellation} from './requestContext'

export const CATALOG_POLICIES = new Set(['sales_restart_gold_v7_independent_catalog', 'sales_restart_gold_v8_isolated_source_rebuild'])
export const SOURCE_REBUILD_POLICY = 'sales_restart_gold_v8_isolated_source_rebuild'
export type DescriptiveRelease = {
  resolution_policy?: string; transaction_evidence_sha256?: string; catalog_helper_sha256?: string
  fact_delta_version: number; dataset_id: string; policy_version: string
  area_mapping_sha256: string | null; product_master_sha256: string; publication_status: string
  source_table?: string; source_audit_table?: string
  financial_publication?: FinancialPublication
  analytical_integrity?: AnalyticalTruth
  original_itemized?: OriginalItemizedSource
}
export type DescriptiveBinding = { schema: string; table: string; version?: number; dataset?: string; policy?: string; auditSchema?: string; financialId?: string; financialHash?: string; adapter?:typeof ORIGINAL_ITEMIZED_ADAPTER }
const identifier = /^[a-z][a-z0-9_]*$/
export function qualifiedTable(schema: string, table: string) {
  if (!identifier.test(schema) || !identifier.test(table)) throw new Error('Invalid analytical table identifier')
  return '`workspace`.`' + schema + '`.`' + table + '`'
}

/** Related analytics remain beside the same validated fact, including isolated sources. */
export function descriptiveSiblingTable(release: DescriptiveRelease, table: string) {
  const match = /^workspace\.(medshield_gold(?:_source_\d{8})?)\.sales_restart_fact_candidate$/.exec(release.source_table ?? '')
  if (!match) throw new Error('Invalid descriptive fact source for related analytics')
  return qualifiedTable(match[1], table)
}
export function descriptiveBinding(env: NodeJS.ProcessEnv = process.env): DescriptiveBinding {
  const adapter=env.DATABRICKS_DESCRIPTIVE_ADAPTER?.trim()
  if(adapter){
    if(adapter!==ORIGINAL_ITEMIZED_ADAPTER) throw new Error('Unknown descriptive source adapter')
    return {schema:'medshield_original_gold_20261026',table:qualifiedTable('medshield_original_gold_20261026',ITEMIZED_PREVIEW_BINDING.itemizedTable.split('.')[2]),version:0,adapter,dataset:ITEMIZED_PREVIEW_BINDING.datasetId,policy:ITEMIZED_PREVIEW_BINDING.policy}
  }
  const schema = env.DATABRICKS_DESCRIPTIVE_SCHEMA?.trim() || 'medshield_gold'
  if (!/^medshield_gold(?:_source_\d{8})?$/.test(schema)) throw new Error('Invalid descriptive schema')
  const rawVersion = env.DATABRICKS_DESCRIPTIVE_FACT_VERSION
  if (rawVersion !== undefined && !/^(0|[1-9][0-9]*)$/.test(rawVersion)) throw new Error('Invalid descriptive fact version')
  const version = rawVersion === undefined ? undefined : Number(rawVersion)
  if (version !== undefined && !Number.isSafeInteger(version)) throw new Error('Invalid descriptive fact version')
  const dataset = env.DATABRICKS_DESCRIPTIVE_DATASET_ID?.trim() || undefined, policy = env.DATABRICKS_DESCRIPTIVE_POLICY_VERSION?.trim() || undefined
  if (dataset !== undefined && !/^[a-f0-9]{64}$/.test(dataset)) throw new Error('Invalid descriptive dataset identity')
  const auditSchema = schema === 'medshield_gold' ? undefined : schema.replace('medshield_gold', 'medshield_audit')
  if (auditSchema && (version === undefined || !dataset || policy !== SOURCE_REBUILD_POLICY)) throw new Error('An isolated descriptive release requires an explicit version, dataset and v8 policy')
  const financialId = env.DATABRICKS_FINANCIAL_RELEASE_ID?.trim() || undefined
  const financialHash = env.DATABRICKS_FINANCIAL_MANIFEST_SHA256?.trim() || undefined
  if (financialId || financialHash) {
    if (!auditSchema || !/^financial_[a-f0-9]{16}$/.test(financialId ?? '') || !/^[a-f0-9]{64}$/.test(financialHash ?? '')) throw new Error('Financial publication requires an isolated source, release ID and manifest checksum')
  }
  return {schema, table: qualifiedTable(schema, 'sales_restart_fact_candidate'), version, dataset, policy, auditSchema, ...(financialId ? {financialId, financialHash} : {})}
}

const goldOutputs = ['fact', 'dim_date', 'dim_area', 'dim_product', 'dim_canonical_product', 'monthly', 'yearly', 'area_yearly', 'product_yearly', 'business_product_yearly', 'territory_yearly', 'medical_monthly', 'external_input', 'contract_labels', 'label_partition']
const auditOutputs = ['area_coverage', 'scope', 'provisional_year', 'gold_disposition', 'gold_quality', 'returns', 'contract_evidence']

/** Read one immutable release. Source-batch activation requires its complete audit. */
export async function readDescriptiveRelease(binding: DescriptiveBinding, execute = executeDatabricksStatement): Promise<DescriptiveRelease> {
  if(binding.adapter===ORIGINAL_ITEMIZED_ADAPTER) return readOriginalItemizedRelease(execute)
  const history = binding.version === undefined ? (await execute(`DESCRIBE HISTORY ${binding.table} LIMIT 1`, {rowLimit: 1})).rows : []
  const version = binding.version ?? Number(history[0]?.version)
  if (!Number.isSafeInteger(version) || version < 0) throw new Error('No valid descriptive Delta version')
  const fact = `${binding.table} VERSION AS OF ${version}`
  const identity = (await execute(`SELECT DISTINCT dataset_id, policy_version, area_mapping_sha256, product_master_sha256, publication_status FROM ${fact}`, {rowLimit: 2})).rows
  if (identity.length !== 1 || Object.values(identity[0]).some(value => !value)) throw new Error('Ambiguous descriptive release identity')
  const row = identity[0]
  if (row.policy_version === SOURCE_REBUILD_POLICY && !binding.auditSchema) throw new Error('A source-rebuild release requires its isolated publication audit')
  if (binding.dataset && row.dataset_id !== binding.dataset || binding.policy && row.policy_version !== binding.policy) throw new Error('Configured descriptive release identity does not match Gold')
  let catalog = {}
  if (CATALOG_POLICIES.has(row.policy_version!)) {
    const rows = (await execute(`SELECT DISTINCT resolution_policy, transaction_evidence_sha256, catalog_helper_sha256 FROM ${fact}`, {rowLimit: 2})).rows
    if (rows.length !== 1 || Object.values(rows[0]).some(value => !value)) throw new Error('Ambiguous catalog release identity')
    catalog = rows[0]
  }
  let auditTable: string | undefined
  if (binding.auditSchema) {
    auditTable = `workspace.${binding.auditSchema}.sales_restart_gold_publication_candidate`
    const rows = (await execute(`SELECT table_name, saved_rows, status, dataset_id, policy_version FROM ${qualifiedTable(binding.auditSchema, 'sales_restart_gold_publication_candidate')}`, {rowLimit: 23})).rows
    const expected = new Set([...goldOutputs.map(name => `workspace.${binding.schema}.sales_restart_${name}_candidate`), ...auditOutputs.map(name => `workspace.${binding.auditSchema}.sales_restart_${name}_candidate`)])
    if (rows.length !== 22 || new Set(rows.map(item => item.table_name)).size !== 22 || rows.some(item => !expected.has(item.table_name!) || item.status !== 'PASS' || item.dataset_id !== row.dataset_id || item.policy_version !== row.policy_version || !/^\d+$/.test(item.saved_rows ?? ''))) throw new Error('Isolated Gold publication audit is incomplete or mismatched')
    const counts = (await execute(`SELECT COUNT(*) AS records, COUNT(DISTINCT source_record_id) AS unique_records FROM ${fact}`, {rowLimit: 1})).rows[0]
    const audited = rows.find(item => item.table_name === `workspace.${binding.schema}.sales_restart_fact_candidate`)
    if (!counts || counts.records !== counts.unique_records || counts.records !== audited?.saved_rows) throw new Error('Isolated Gold fact population does not match its publication audit')
  }
  const release = {...row, ...catalog, fact_delta_version: version, source_table: `workspace.${binding.schema}.sales_restart_fact_candidate`, ...(auditTable ? {source_audit_table: auditTable} : {})} as DescriptiveRelease
  if (binding.financialId) release.financial_publication = await readFinancialPublication(release, binding.financialId, binding.financialHash!, execute)
  return release
}

let researchPromise: Promise<DescriptiveRelease> | undefined
/** Stored experiments retain their original fact; descriptive activation never rebinds them. */
export function researchRelease() {
  const configured = process.env.DATABRICKS_RESEARCH_FACT_VERSION?.trim() || undefined
  if (configured !== undefined && !/^(0|[1-9][0-9]*)$/.test(configured)) return Promise.reject(new Error('Invalid research fact version'))
  researchPromise ??= withoutRequestCancellation(()=>readDescriptiveRelease({schema: 'medshield_gold', table: qualifiedTable('medshield_gold', 'sales_restart_fact_candidate'), version: configured === undefined ? undefined : Number(configured)})).catch(error => {researchPromise = undefined; throw error})
  return researchPromise
}
