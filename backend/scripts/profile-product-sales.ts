/** Read-only, complete transaction scan. Run from backend: node --import tsx scripts/profile-product-sales.ts */
import {config} from 'dotenv'
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {resolve} from 'node:path'
import {executeDatabricksStatement} from '../src/databricks'
import {descriptiveRelease} from '../src/databricksDashboard'

config({quiet: true})
const table = 'workspace.medshield_gold.sales_restart_fact_candidate'
const projection = `source_record_id, product_raw, normalized_product, product_key,
  canonical_group_id, canonical_sku, canonical_title, identity_status, category_status,
  item_kind, unit_of_measure, packaging_unit, pack_count, contained_unit,
  calendar_year, CAST(month_start AS STRING) AS month_start,
  CAST(date_delivered AS STRING) AS date_delivered, dr_number,
  quantity, unit_selling_price, discount_amount, gross_sales, net_sales,
  unit_acquisition_cost, total_acquisition_cost, gross_margin_amount,
  is_net_sales_eligible, is_gross_sales_eligible, is_gross_margin_eligible,
  is_acquisition_cost_eligible, is_quantity_observation_eligible, is_adjusted_source,
  is_low_trust_2017, is_historical_backfill_candidate,
  transaction_evidence, source_data_status, source_file_sha256, source_adjustment_policy,
  is_analysis_candidate, is_contract_label, TO_JSON(quality_rule_codes) AS quality_rule_codes`

async function main() {
  const release = await descriptiveRelease()
  const codeHashes = Object.fromEntries(['scripts/profile-product-sales.ts', 'src/databricks.ts', 'src/databricksDashboard.ts']
    .map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')]))
  const history = async () => (await executeDatabricksStatement(`DESCRIBE HISTORY ${table} LIMIT 1`, {rowLimit: 1})).rows[0]
  const start = await history()
  if (Number(start.version) !== release.fact_delta_version) throw new Error('Latest fact differs from configured release; explicitly rebind before reviewing')
  if (release.policy_version !== 'sales_restart_gold_v7_independent_catalog') throw new Error('This scan requires the independent catalog Gold schema')
  const source = `${table} VERSION AS OF ${release.fact_delta_version}`
  const countsSql = `SELECT COUNT(*) AS records, COUNT(DISTINCT source_record_id) AS unique_records,
    COUNT(DISTINCT canonical_group_id) AS product_groups FROM ${source}`
  const counts = (await executeDatabricksStatement(countsSql, {rowLimit: 1})).rows[0]
  const expected = Number(counts.records)
  if (!Number.isSafeInteger(expected) || expected < 1 || counts.records !== counts.unique_records) throw new Error('Invalid source count or source-record identity')
  const financeSql = `SELECT calendar_year, CAST(month_start AS STRING) AS month_start, COUNT(*) AS records,
    SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales,
    SUM(CASE WHEN is_gross_sales_eligible THEN gross_sales END) AS gross_sales,
    SUM(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END) AS gross_margin_amount,
    SUM(CASE WHEN is_acquisition_cost_eligible THEN total_acquisition_cost END) AS total_acquisition_cost
    FROM ${source} GROUP BY calendar_year, month_start ORDER BY calendar_year, month_start`
  const warehouseFinance = (await executeDatabricksStatement(financeSql, {rowLimit: 2400})).rows
  const size = 750
  const pages: Array<Array<Record<string, string | null>>> = []
  const queries: string[] = []
  let next = 0
  const total = Math.ceil(expected / size)
  // Bounded pages avoid INLINE byte truncation. Every read uses the same immutable version.
  await Promise.all(Array.from({length: 3}, async () => {
    for (;;) {
      const page = next++
      if (page >= total) return
      const sql = `SELECT ${projection} FROM ${source} ORDER BY source_record_id LIMIT ${size} OFFSET ${page * size}`
      queries[page] = sql
      const result = await executeDatabricksStatement(sql, {rowLimit: size, timeoutMs: 120000})
      if (result.rows.length !== Math.min(size, expected - page * size)) throw new Error(`Incomplete page ${page}`)
      pages[page] = result.rows
      if (page % 10 === 0) console.log(`Scanned page ${page + 1}/${total}`)
    }
  }))
  const rows = pages.flat()
  if (rows.length !== expected || new Set(rows.map(r => r.source_record_id)).size !== expected) throw new Error('Incomplete or duplicate extraction')
  if (new Set(rows.map(r => r.canonical_group_id)).size !== Number(counts.product_groups)) throw new Error('Product-group count mismatch')
  const end = await history()
  if (end.version !== start.version) throw new Error('Gold changed during the scan; no receipt emitted')
  const output = resolve('../outputs/product_sales_rules', new Date().toISOString().replace(/[:.]/g, '-'))
  mkdirSync(output, {recursive: true})
  const payload = JSON.stringify({release, checked_at: new Date().toISOString(), latest_start: start.version,
    latest_end: end.version, counts, code_sha256: codeHashes, queries: {counts: countsSql, finance: financeSql, pages: queries},
    warehouse_finance: warehouseFinance, rows}, null, 2) + '\n'
  const hash = createHash('sha256').update(payload).digest('hex')
  writeFileSync(resolve(output, 'facts.json'), payload)
  writeFileSync(resolve(output, 'facts.sha256'), hash + '\n')
  console.log(JSON.stringify({output, records: rows.length, groups: counts.product_groups, fact_delta_version: release.fact_delta_version, sha256: hash}))
}
main().catch(error => {console.error(error.message); process.exitCode = 1})
