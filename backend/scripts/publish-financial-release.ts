import 'dotenv/config'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { descriptiveBinding, readDescriptiveRelease, qualifiedTable } from '../src/descriptiveSource'
import { executeDatabricksStatement as execute } from '../src/databricks'
import { databricksLiteral } from '../src/databricksLiteral'
import { DASHBOARD_POPULATION } from '../src/descriptiveEvidence'
import { FINANCIAL_SCOPE, financialHash, financialNames, financialTableSql, readFinancialPublication, validateFinancialManifest, type FinancialManifest } from '../src/financialPublication'

async function main() {
  const args = process.argv.slice(2)
  assert.ok(args.length === 1 && ['--prepare', '--apply', '--verify'].includes(args[0]), 'Usage: publish-financial-release.ts --prepare|--apply|--verify')
  const root = resolve('..'), out = resolve(root, 'outputs/sales_publication_20261025')
  const decisionPath = resolve(root, 'outputs/process_completion_20261025/sales-decision.json')
  const decisionBytes = readFileSync(decisionPath, 'utf8'), decision = JSON.parse(decisionBytes)
  assert.equal(decision.artifact_kind, 'attributed_business_decision_audit_only')
  assert.equal(decision.decision, 'approved')
  assert.equal(decision.scope, FINANCIAL_SCOPE)
  assert.equal(decision.reviewer.authorized_final_approver, true)
  assert.equal(decision.review_scope.listed_limitations_accepted, true)
  assert.deepEqual(decision.review_scope.additional_conditions, [])
  assert.equal(financialHash(readFileSync(resolve(root, decision.evidence.path), 'utf8')), decision.evidence.sha256)
  assert.equal(financialHash(readFileSync(resolve(root, decision.evidence.reviewed_packet), 'utf8')), decision.evidence.reviewed_packet_sha256)
  const receipt = JSON.parse(readFileSync(resolve(root, decision.evidence.path), 'utf8'))
  const configured = descriptiveBinding()
  const { financialId: _id, financialHash: _hash, ...binding } = configured
  const source = await readDescriptiveRelease(binding)
  assert.deepEqual(source, decision.source, 'Accepted source identity has changed')
  assert.deepEqual(source, receipt.identity)
  assert.deepEqual(decision.population, DASHBOARD_POPULATION)
  const latest = (await execute(`DESCRIBE HISTORY ${binding.table} LIMIT 1`, {rowLimit:1})).rows[0]
  assert.equal(Number(latest?.version), source.fact_delta_version, 'Source advanced after acceptance; assess the new version first')
  const id = 'financial_' + financialHash(decisionBytes).slice(0,16)
  const names = financialNames(binding.schema, id)
  const manifest: FinancialManifest = {
    schema_version:'1', publication_id:id, scope:FINANCIAL_SCOPE, source,
    population:DASHBOARD_POPULATION, decision_sha256:financialHash(decisionBytes),
    evidence_sha256:decision.evidence.sha256, reviewed_packet_sha256:decision.evidence.reviewed_packet_sha256,
    reviewer:{name:decision.reviewer.name,role:decision.reviewer.role}, decision_date:decision.decision_date,
    limitations:['Source completeness is user-attested, not independently proven.',
      'Estimated and unreviewed provenance, exclusions and missing observations remain disclosed.',
      'Buyer and territory groupings are derived; physical SKU identity and units remain unapproved.',
      'Financial acceptance does not approve external joins, trained forecasts, live alerts or purchases.'],
    excluded_approvals:decision.excluded_approvals, serving_table:names.serving, serving_version:0, expected_rows:receipt.source_count,
  }
  validateFinancialManifest(manifest, source, id)
  const body = JSON.stringify(manifest) + '\n', digest = financialHash(body)
  const fact = `${qualifiedTable(binding.schema, 'sales_restart_fact_candidate')} VERSION AS OF ${source.fact_delta_version}`
  const population = `SELECT * FROM ${fact} WHERE ${DASHBOARD_POPULATION.predicate}`
  const statements = [
    `CREATE TABLE IF NOT EXISTS ${financialTableSql(names.serving)} USING DELTA AS ${population}`,
    `CREATE TABLE IF NOT EXISTS ${financialTableSql(names.manifest)} USING DELTA AS SELECT ${databricksLiteral(body)} AS manifest_json`,
  ]
  mkdirSync(out, {recursive:true})
  for (const [name, value] of [['manifest.json',body],['publication.sql',statements.join(';\n\n')+';\n'],['manifest.sha256',digest+'\n']] as const) {
    const path = resolve(out,name)
    if (existsSync(path)) assert.equal(readFileSync(path,'utf8'),value, 'Refusing to overwrite a different prepared release')
    else writeFileSync(path,value)
  }
  if (args[0] === '--prepare') { console.log(JSON.stringify({status:'prepared_not_deployed',publication_id:id,manifest_sha256:digest,out})); return }
  if (args[0] === '--apply') await execute(statements[0], {rowLimit:1})
  // Exact multiset conservation of every source column, not just matching sums.
  const serving = `${financialTableSql(names.serving)} VERSION AS OF 0`
  for (const [left,right] of [[population,`SELECT * FROM ${serving}`],[`SELECT * FROM ${serving}`,population]]) {
    const result = (await execute(`SELECT COUNT(*) AS differences FROM ((${left}) EXCEPT ALL (${right}))`,{rowLimit:1})).rows[0]
    assert.equal(Number(result?.differences),0,'Approved serving table differs from accepted source population')
  }
  const stable = (await execute(`DESCRIBE HISTORY ${binding.table} LIMIT 1`,{rowLimit:1})).rows[0]
  assert.equal(stable?.version, latest?.version, 'Source changed during publication')
  if (args[0] === '--apply') await execute(statements[1],{rowLimit:1})
  const approval = await readFinancialPublication(source,id,digest)
  const report = {verified_at:new Date().toISOString(), mode:args[0], approval, exact_multiset_parity:true, source, decision_sha256:manifest.decision_sha256,
    activation:{DATABRICKS_FINANCIAL_RELEASE_ID:id,DATABRICKS_FINANCIAL_MANIFEST_SHA256:digest},
    rollback:'Remove only the two DATABRICKS_FINANCIAL_* settings and restart gateway; the original immutable candidate binding is retained.'}
  writeFileSync(resolve(out,`warehouse-${args[0].slice(2)}-${Date.now()}.json`),JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report,null,2))
}
main().catch(error => {console.error(error instanceof Error ? error.message : 'Financial publication failed');process.exitCode=1})
