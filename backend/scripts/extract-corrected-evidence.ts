import 'dotenv/config'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { executeDatabricksStatement } from '../src/databricks'
import { descriptiveRelease } from '../src/databricksDashboard'
import { truthTable } from '../src/analyticalTruth'
import { DASHBOARD_POPULATION } from '../src/descriptiveEvidence'

/** Read-only SO1 evidence; full available history by default, original window explicitly. */
async function main() {
  const [directory, mode] = process.argv.slice(2)
  assert.ok(directory && process.argv.length <= 4 && (mode === undefined || mode === '--original-window'),
    'Usage: extract-so1-baseline.ts output-directory [--original-window]')
  const start = mode === '--original-window' ? '2021-01-01' : '2017-01-01'
  const endExclusive = mode === '--original-window' ? '2026-01-01' : '2027-01-01'
  const release = await descriptiveRelease()
  assert.ok(release.analytical_integrity, 'A verified corrected serving manifest is required')
  const fact = `${truthTable(release.analytical_integrity.serving_table)} VERSION AS OF 0`
  const historySql = `DESCRIBE HISTORY ${truthTable(release.analytical_integrity.serving_table)} LIMIT 1`
  const before = (await executeDatabricksStatement(historySql, { rowLimit: 1 })).rows[0]?.version
  const population = `(${DASHBOARD_POPULATION.predicate}) AND date_delivered >= DATE '${start}' AND date_delivered < DATE '${endExclusive}'`
  const queries = {
    daily: `SELECT CAST(date_delivered AS DATE) AS day, normalized_area, is_adjusted_source,
      COUNT(*) AS records, SUM(CASE WHEN is_net_sales_eligible THEN 1 ELSE 0 END) AS eligible_records,
      SUM(CASE WHEN is_net_sales_eligible THEN CAST(net_sales AS DECIMAL(30,6)) END) AS revenue
      FROM ${fact} WHERE ${population}
      GROUP BY CAST(date_delivered AS DATE), normalized_area, is_adjusted_source
      ORDER BY day, normalized_area, is_adjusted_source`,
    monthly_control: `SELECT CAST(month_start AS DATE) AS month, normalized_area,
      COUNT(*) AS records, SUM(CASE WHEN is_net_sales_eligible THEN 1 ELSE 0 END) AS eligible_records,
      SUM(CASE WHEN is_net_sales_eligible THEN CAST(net_sales AS DECIMAL(30,6)) END) AS revenue
      FROM ${fact} WHERE ${population} GROUP BY month_start, normalized_area ORDER BY month, normalized_area`,
    annual_control: `SELECT calendar_year AS year, COUNT(*) AS records,
      CAST(MIN(date_delivered) AS DATE) AS first_delivery, CAST(MAX(date_delivered) AS DATE) AS last_delivery,
      SUM(CASE WHEN is_net_sales_eligible THEN 1 ELSE 0 END) AS eligible_records,
      SUM(CASE WHEN is_net_sales_eligible THEN CAST(net_sales AS DECIMAL(30,6)) END) AS revenue
      FROM ${fact} WHERE ${population} GROUP BY calendar_year ORDER BY calendar_year`,
    mapping: `SELECT DISTINCT normalized_area, proposed_area_type, territory, mapped_region,
      mapped_province, mapped_city_municipality, is_geographic_territory_approved,
      area_mapping_status, area_evidence_status, area_mapping_evidence, external_mapping_status
      FROM ${fact} WHERE ${population} ORDER BY normalized_area`,
  }
  const entries = Object.entries(queries)
  const results = await Promise.all(entries.map(async ([name, sql]) => {
    const result = await executeDatabricksStatement(sql, { rowLimit: 50000 })
    assert.ok(result.rows.length < 50000, `${name}: bounded extraction must not reach row limit`)
    return [name, { sql, sql_sha256: createHash('sha256').update(sql).digest('hex'), ...result }] as const
  }))
  assert.deepEqual(await descriptiveRelease(), release,
    'Release identity or audit changed during extraction')
  const after = (await executeDatabricksStatement(historySql, { rowLimit: 1 })).rows[0]?.version
  assert.ok(before != null && before === after, 'Source changed during extraction')
  const receipt = { schema_version: 1, generated_at: new Date().toISOString(), timezone: 'Asia/Manila',
    status: 'read_only_so1_evidence_not_objective_acceptance', study_start: start,
    study_end: mode === '--original-window' ? '2025-12-31' : '2026-12-31',
    scope: mode === '--original-window' ? 'original_2021_2025' : 'available_history_2017_2026',
    extractor_sha256: createHash('sha256').update(require('node:fs').readFileSync(__filename)).digest('hex'),
    source: 'databricks', release, population: {...DASHBOARD_POPULATION, scope:'corrected_itemized_subset_not_complete_company'},
    source_latest_version_before: before, source_latest_version_after: after,
    warehouse_writes: 0, queries: Object.fromEntries(results) }
  const content = JSON.stringify(receipt, null, 2) + '\n'
  const output = resolve(directory)
  mkdirSync(output, { recursive: true })
  writeFileSync(resolve(output, 'source.json'), content, { flag: 'wx' })
  writeFileSync(resolve(output, 'source.sha256'), createHash('sha256').update(content).digest('hex') + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ status: receipt.status, output, counts: Object.fromEntries(results.map(([name, result]) => [name, result.rows.length])), warehouse_writes: 0 }))
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'SO1 extraction failed'); process.exitCode = 1 })
