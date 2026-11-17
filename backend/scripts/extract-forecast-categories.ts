import 'dotenv/config'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {executeDatabricksStatement} from '../src/databricks'
import {readOriginalItemizedRelease, originalItemizedFactSql} from '../src/originalItemizedSource'

/** Read-only, all-category signed financial partition; no customer/raw-record export. */
async function main() {
  assert.equal(process.argv.length, 3, 'Usage: extract-forecast-categories.ts output-directory')
  const directory = resolve(process.argv[2])
  mkdirSync(directory, {recursive: true})
  const release = await readOriginalItemizedRelease()
  const fact = originalItemizedFactSql(release, 'itemized')
  const sql = `SELECT CAST(month_start AS STRING) AS month, product_category,
    COUNT(*) AS records,
    SUM(CASE WHEN is_net_sales_eligible THEN 1 ELSE 0 END) AS eligible_records,
    CAST(SUM(CASE WHEN is_net_sales_eligible THEN CAST(net_sales AS DECIMAL(30,6)) END) AS STRING) AS net_sales_php
    FROM ${fact} WHERE record_kind='itemized_sale' AND date_delivered >= DATE '2020-01-01'
    AND date_delivered < DATE '2026-10-01'
    GROUP BY month_start, product_category ORDER BY month_start, product_category`
  const result = await executeDatabricksStatement(sql, {rowLimit: 1000})
  assert.ok(result.rows.length > 0 && result.rows.length < 1000, 'Incomplete/empty aggregate extraction')
  assert.deepEqual(await readOriginalItemizedRelease(), release, 'Source identity changed during extraction')
  const receipt = {schema_version: 1, extracted_at: new Date().toISOString(), release,
    source: 'databricks', warehouse_writes: 0, contracts_excluded: true,
    retrospective_mapping: true, historical_vintage_verified: false,
    sql, sql_sha256: createHash('sha256').update(sql).digest('hex'),
    extractor_sha256: createHash('sha256').update(readFileSync(resolve('scripts/extract-forecast-categories.ts'))).digest('hex'),
    rows: result.rows}
  writeFileSync(resolve(directory, 'categories.json'), JSON.stringify(receipt, null, 2)+'\n', {flag:'wx'})
  console.log(JSON.stringify({status:'READ_ONLY_CATEGORY_CAPTURE', rows:result.rows.length, warehouse_writes:0}))
}
main().catch(error => {
  const message = error instanceof Error ? error.message : ''
  const status = message.match(/HTTP (\d{3})/)?.[1] ?? null
  const reason = status ? 'provider_http_error' : error instanceof assert.AssertionError ? 'source_assertion_failed' :
    message.includes('not configured') ? 'missing_configuration' : 'source_or_transport_error'
  const providerCode = message.match(/\(([A-Z_]+):/)?.[1] ?? null
  let detail = message
  for (const key of ['DATABRICKS_TOKEN','DATABRICKS_HOST','DATABRICKS_SQL_WAREHOUSE_ID']) {
    if(process.env[key]) detail = detail.split(process.env[key]!).join('[redacted]')
  }
  console.error(JSON.stringify({status:'CATEGORY_EXTRACTION_FAILED', reason, http_status:status,
    provider_code:providerCode, detail:detail.slice(0,600),
    error_type:error instanceof Error ? error.name : 'unknown', warehouse_writes:0, substitute_data_used:false}))
  process.exitCode=1
})
