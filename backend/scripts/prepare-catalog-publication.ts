/** Read-only predecessor/dependency capture for explicit catalog publication modes. */
import 'dotenv/config'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { executeDatabricksStatement } from '../src/databricks'

const root = resolve('..')
const project = resolve(root, 'databricks/medshield_project')
const fact = 'workspace.medshield_gold.sales_restart_fact_candidate'
const silver = 'workspace.medshield_silver.sales_restart_clean_candidate'
const publication = 'workspace.medshield_audit.sales_restart_gold_publication_candidate'
const expectedVersion = 19
const categoryMode = process.argv.includes('--category-acceptance')
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')
const identifier = (name: string) => {
  assert.match(name, /^[A-Za-z_][A-Za-z0-9_]*$/)
  return '`' + name + '`'
}
async function main() {
  const output = resolve(root, 'outputs/catalog_preparation', new Date().toISOString().replace(/[:.]/g, '-'))
  const queries: unknown[] = []
  const query = async (sql: string, limit = 1000) => {
    const rows = (await executeDatabricksStatement(sql, {rowLimit: limit, timeoutMs: 120000})).rows
    queries.push({sql, rows})
    return rows
  }
  const history = async (table: string) => {
    assert.match(table, /^workspace\.medshield_(gold|audit|bronze|silver)\.[A-Za-z0-9_]+$/)
    const row = (await query(`DESCRIBE HISTORY ${table} LIMIT 1`, 1))[0]
    assert.ok(row && /^\d+$/.test(row.version || ''), `No history for ${table}`)
    return Number(row.version)
  }
  assert.equal(await history(fact), expectedVersion, 'Current predecessor changed; prepare an explicitly reviewed contract')
  const identityRows = await query(`SELECT DISTINCT dataset_id, policy_version, area_mapping_sha256, product_master_sha256, publication_status, product_reference_sha256, transaction_evidence_sha256, catalog_helper_sha256 FROM ${fact} VERSION AS OF ${expectedVersion}`, 5)
  assert.equal(identityRows.length, 1)
  const identity = identityRows[0]
  assert.equal(identity.policy_version, 'sales_restart_gold_v7_independent_catalog')
  const schema = (await query(`DESCRIBE TABLE ${fact}`)).filter(r => r.col_name && !r.col_name.startsWith('#') && r.data_type)
  const sourceSchema = (await query(`DESCRIBE TABLE ${silver}`)).filter(r => r.col_name && !r.col_name.startsWith('#') && r.data_type)
  const names = schema.map(r => r.col_name!)
  assert.ok(names.includes('source_record_id') && new Set(names).size === names.length)
  const dependencies = [...new Set([...(await query(`SELECT table_name FROM ${publication}`)).map(r => r.table_name!),
    fact, publication, 'workspace.medshield_gold.sales_restart_stl_candidate',
    'workspace.medshield_audit.sales_restart_replacement_year_validation_candidate',
    'workspace.medshield_bronze.sales_restart_manifest_candidate',
    'workspace.medshield_bronze.sales_restart_rows_candidate',
    'workspace.medshield_silver.sales_restart_assessed_candidate', silver])].sort()
  const versions: Record<string, number> = {}
  for (let index = 0; index < dependencies.length; index += 4) {
    await Promise.all(dependencies.slice(index, index + 4).map(async table => { versions[table] = await history(table) }))
  }
  assert.equal(versions[fact], expectedVersion)
  const counts = (await query(`SELECT COUNT(*) AS records, COUNT(DISTINCT source_record_id) AS unique_records FROM ${fact} VERSION AS OF ${expectedVersion}`, 1))[0]
  assert.equal(counts.records, counts.unique_records)
  const sourceNames = sourceSchema.map(r => r.col_name!)
  assert.ok(sourceNames.every(name => names.includes(name)), 'Silver fields missing from predecessor')
  const changes = (await query(`SELECT COUNT(*) AS differences FROM ${silver} VERSION AS OF ${versions[silver]} s FULL OUTER JOIN ${fact} VERSION AS OF ${expectedVersion} f ON s.source_record_id=f.source_record_id
    WHERE s.source_record_id IS NULL OR f.source_record_id IS NULL OR ${sourceNames.map(name => `NOT(s.${identifier(name)} <=> f.${identifier(name)})`).join(' OR ')}`, 1))[0]
  assert.equal(changes.differences, '0', 'Complete Silver/predecessor source equality failed')
  const sourceDuplicates = (await query(`SELECT COUNT(*) AS duplicate_keys FROM (SELECT source_record_id FROM ${silver} VERSION AS OF ${versions[silver]} GROUP BY source_record_id HAVING COUNT(*)<>1 OR source_record_id IS NULL)`, 1))[0]
  assert.equal(sourceDuplicates.duplicate_keys, '0')
  const views: Record<string, unknown[]> = {}
  for (const file of ['04_sales_restart_monthly_bridge.py', '05_sales_restart_system_bridge.sql']) {
    const text = readFileSync(resolve(project, file), 'utf8')
    const found = [...text.matchAll(/(?:CREATE OR REPLACE VIEW|CREATE VIEW(?: IF NOT EXISTS)?)\s+(workspace\.medshield_[a-z]+\.[A-Za-z0-9_]+)/gi)]
    for (const match of found) views[match[1]] = await query(`SHOW CREATE TABLE ${match[1]}`, 5)
  }
  // The Python bridge interpolates configured names. Capture its actual runtime views too.
  for (const table of ['workspace.medshield_gold.vw_dashboard_yearly_sales_candidate', 'workspace.medshield_gold.vw_dashboard_monthly_sales_candidate']) {
    if (!views[table]) views[table] = await query(`SHOW CREATE TABLE ${table}`, 5)
  }
  const proposed = {
    product_master_sha256: hash(readFileSync(resolve(project, 'references/product_master_review.csv'))),
    transaction_evidence_sha256: hash(readFileSync(resolve(project, 'references/transaction_evidence_review.csv'))),
    catalog_helper_sha256: hash(readFileSync(resolve(project, 'product_catalog.py'))),
    area_mapping_sha256: hash(readFileSync(resolve(root, 'datasources/templates/area_classification_mapping.csv'))),
  }
  assert.equal(proposed.area_mapping_sha256, identity.area_mapping_sha256)
  assert.equal(proposed.transaction_evidence_sha256, identity.transaction_evidence_sha256)
  assert.equal(proposed.catalog_helper_sha256, identity.catalog_helper_sha256)
  for (const table of dependencies) assert.equal(await history(table), versions[table], `${table} changed during preparation`)
  mkdirSync(output, {recursive: true})
  const evidence = {status:'PASS_READ_ONLY_PREDECESSOR_SOURCE_CAPTURE', checked_at:new Date().toISOString(),
    baseline_fact_version:expectedVersion, identity, fact_schema:schema, source_schema:sourceSchema,
    source_fields:sourceNames, counts, source_differences:changes.differences,
    dependency_versions:versions, view_definitions:views, queries,
    recovery_rehearsal_verified:false, cloud_writes:false}
  const payload = JSON.stringify(evidence, null, 2) + '\n'
  const receipt = resolve(output, 'predecessor-receipt.json')
  writeFileSync(receipt, payload)
  writeFileSync(resolve(output, 'predecessor-receipt.sha256'), hash(payload) + '\n')
  const mutable = ['category_status', 'catalog_evidence_source', 'product_master_sha256', 'gold_published_at',
    ...(categoryMode ? ['product_category', 'display_category', 'product_scope_status'] : [])]
  assert.ok(mutable.every(name => names.includes(name)))
  const categoryPath = 'databricks/medshield_project/references/category_acceptance.json'
  const acceptance = categoryMode ? JSON.parse(readFileSync(resolve(root, categoryPath), 'utf8')) : undefined
  if (acceptance) {
    assert.equal(acceptance.dataset_id, identity.dataset_id)
    assert.equal(acceptance.baseline_fact_version, expectedVersion)
    assert.equal(acceptance.product_master_sha256, proposed.product_master_sha256)
    assert.equal(acceptance.scope, 'reporting_category_only')
  }
  const descriptor = {schema_version:1, mode:categoryMode ? 'category_acceptance_only' : 'unapproved_draft_metadata_only', baseline_fact_version:expectedVersion,
    baseline_identity:identity, proposed, immutable_fields:names.filter(name => !mutable.includes(name)),
    mutable_fields:mutable, predecessor_columns:names,
    source_receipt_path:receipt.slice(root.length + 1).replaceAll('\\','/'), source_receipt_sha256:hash(payload),
    dependency_versions:versions, recovery_rehearsal_verified:false,
    ...(categoryMode ? {category_acceptance_path:categoryPath,
      category_acceptance_sha256:hash(readFileSync(resolve(root,categoryPath))),
      prior_product_master_path:'outputs/category_acceptance_20261008/before.csv',
      prior_product_master_sha256:hash(readFileSync(resolve(root,'outputs/category_acceptance_20261008/before.csv')))} : {}),
    status:'PREPARED_NOT_DEPLOYED_NOT_BUSINESS_APPROVED'}
  const descriptorPath = resolve(project, 'references/catalog_publication.json')
  writeFileSync(descriptorPath, JSON.stringify(descriptor, null, 2) + '\n', {flag:'wx'})
  console.log(JSON.stringify({output, descriptor:descriptorPath, baseline:expectedVersion, source_fields:sourceNames.length,
    immutable_fields:descriptor.immutable_fields.length, dependencies:dependencies.length, views:Object.keys(views).length,
    records:counts.records, recovery_rehearsal_verified:false}))
}
main().catch(error => {
  let message = error instanceof Error ? error.message : String(error)
  const token = process.env.DATABRICKS_TOKEN
  if (token) message = message.split(token).join('[REDACTED]')
  console.error(message.slice(0, 1200)); process.exitCode = 1
})
