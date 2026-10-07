/** Read-only full-fact receipt. Run from backend with node --import tsx. */
import 'dotenv/config'
import {executeDatabricksStatement} from '../src/databricks'
import {descriptiveRelease} from '../src/databricksDashboard'
import {mkdirSync, writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {resolve} from 'node:path'

async function main() {
  const release = await descriptiveRelease()
  const table = 'workspace.medshield_gold.sales_restart_fact_candidate'
  const latest = (await executeDatabricksStatement(`DESCRIBE HISTORY ${table} LIMIT 1`, {rowLimit:1})).rows[0]
  if (Number(latest.version) !== release.fact_delta_version) throw new Error('Latest fact differs from configured release; refresh/rebind the review explicitly')
  const sql = `SELECT source_record_id, product_raw, normalized_product, product_key, calendar_year,
    CAST(month_start AS STRING) AS month_start, quantity, net_sales, gross_sales, gross_margin_amount,
    total_acquisition_cost, is_net_sales_eligible, is_gross_sales_eligible, is_gross_margin_eligible,
    is_acquisition_cost_eligible, is_quantity_observation_eligible, is_adjusted_source,
    source_data_status, source_file_sha256, source_adjustment_policy,
    is_analysis_candidate, is_contract_label
    FROM ${table} VERSION AS OF ${release.fact_delta_version} ORDER BY source_record_id`
  const result = await executeDatabricksStatement(sql, {rowLimit:250001, timeoutMs:120000})
  const count = (await executeDatabricksStatement(`SELECT COUNT(*) AS n FROM ${table} VERSION AS OF ${release.fact_delta_version}`, {rowLimit:1})).rows[0]
  if (result.rows.length !== Number(count.n)) throw new Error('Incomplete extraction')
  const end = (await executeDatabricksStatement(`DESCRIBE HISTORY ${table} LIMIT 1`, {rowLimit:1})).rows[0]
  if (end.version !== latest.version) throw new Error('Fact changed during review')
  const output = resolve('../outputs/product_catalog_implementation',new Date().toISOString().replace(/[:.]/g,'-'))
  mkdirSync(output,{recursive:true})
  const receipt = JSON.stringify({release, sql, checked_at:new Date().toISOString(), latest_start:latest.version, latest_end:end.version, rows:result.rows},null,2)+'\n'
  writeFileSync(resolve(output,'facts.json'),receipt)
  writeFileSync(resolve(output,'facts.sha256'),createHash('sha256').update(receipt).digest('hex')+'\n')
  console.log(JSON.stringify({output, records:result.rows.length, release}))
}
main().catch(error=>{console.error(error.message);process.exitCode=1})
