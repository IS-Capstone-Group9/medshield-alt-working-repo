import 'dotenv/config'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { executeDatabricksStatement } from '../src/databricks'
import { descriptiveBinding, readDescriptiveRelease } from '../src/descriptiveSource'
import { DASHBOARD_POPULATION } from '../src/descriptiveEvidence'

/** Read-only SO2 aggregates: recorded source-unit counts, never inferred pack conversions. */
async function main() {
  const [directory, option] = process.argv.slice(2)
  assert.ok(directory && process.argv.length <= 4 && (option === undefined || option === '--include-2026' || option === '--through-2025'),
    'Usage: extract-so2-priorities.ts output-directory [--through-2025|--include-2026] (2026 included by default)')
  const include2026 = option !== '--through-2025'
  const output = resolve(directory)
  const binding = descriptiveBinding()
  const release = await readDescriptiveRelease(binding)
  const fact = `${binding.table} VERSION AS OF ${release.fact_delta_version}`
  const historySql = `DESCRIBE HISTORY ${binding.table} LIMIT 1`
  const before = (await executeDatabricksStatement(historySql, { rowLimit: 1 })).rows[0]?.version
  const end = include2026 ? '2027-01-01' : '2026-01-01'
  const population = `(${DASHBOARD_POPULATION.predicate}) AND date_delivered >= DATE '2017-01-01' AND date_delivered < DATE '${end}'`
  const measures = `COUNT(*) AS records,
    SUM(CASE WHEN is_net_sales_eligible THEN 1 ELSE 0 END) AS revenue_records,
    SUM(CASE WHEN is_net_sales_eligible THEN CAST(net_sales AS DECIMAL(30,6)) END) AS revenue,
    SUM(CASE WHEN is_net_sales_eligible AND net_sales > 0 THEN CAST(net_sales AS DECIMAL(30,6)) ELSE 0 END) AS positive_revenue,
    SUM(CASE WHEN is_net_sales_eligible AND net_sales < 0 THEN CAST(net_sales AS DECIMAL(30,6)) ELSE 0 END) AS negative_revenue,
    SUM(CASE WHEN is_quantity_observation_eligible THEN 1 ELSE 0 END) AS quantity_records,
    SUM(CASE WHEN is_quantity_observation_eligible THEN CAST(quantity AS DECIMAL(30,6)) END) AS recorded_quantity,
    SUM(CASE WHEN is_quantity_observation_eligible AND quantity < 0 THEN 1 ELSE 0 END) AS negative_quantity_records`
  const queries = {
    products: `SELECT product_key, normalized_product, source_data_status, ${measures},
      COUNT(DISTINCT month_start) AS active_record_months,
      MIN(CAST(date_delivered AS DATE)) AS first_date, MAX(CAST(date_delivered AS DATE)) AS last_date
      FROM ${fact} WHERE ${population}
      GROUP BY product_key, normalized_product, source_data_status ORDER BY product_key, source_data_status`,
    product_years: `SELECT product_key, normalized_product, calendar_year AS year, source_data_status, ${measures},
      COUNT(DISTINCT month_start) AS active_record_months
      FROM ${fact} WHERE ${population}
      GROUP BY product_key, normalized_product, calendar_year, source_data_status
      ORDER BY product_key, year, source_data_status`,
    area_years: `SELECT normalized_area, calendar_year AS year, source_data_status, ${measures},
      COUNT(DISTINCT month_start) AS active_record_months
      FROM ${fact} WHERE ${population} GROUP BY normalized_area, calendar_year, source_data_status
      ORDER BY normalized_area, year, source_data_status`,
    controls: `SELECT calendar_year AS year, source_data_status, ${measures},
      COUNT(DISTINCT month_start) AS observed_company_months
      FROM ${fact} WHERE ${population} GROUP BY calendar_year, source_data_status ORDER BY year, source_data_status`,
    company_months: `SELECT CAST(month_start AS DATE) AS month, ${measures}
      FROM ${fact} WHERE ${population} GROUP BY month_start ORDER BY month`,
    pilot: `SELECT CAST(month_start AS DATE) AS month, normalized_area, source_data_status, ${measures}
      FROM ${fact} WHERE ${population} AND normalized_product = 'TRIVASC 35MG MR'
      GROUP BY month_start, normalized_area, source_data_status ORDER BY month, normalized_area, source_data_status`,
    mappings: `SELECT DISTINCT normalized_area, proposed_area_type, territory, mapped_province,
      is_geographic_territory_approved, area_mapping_status, area_evidence_status
      FROM ${fact} WHERE ${population} ORDER BY normalized_area`,
    ...(include2026 ? { comparison_months: `SELECT product_key, normalized_product,
      CAST(month_start AS DATE) AS month, source_data_status, ${measures}
      FROM ${fact} WHERE ${population} AND calendar_year IN (2025, 2026)
      GROUP BY product_key, normalized_product, month_start, source_data_status
      ORDER BY product_key, month, source_data_status` } : {}),
  }
  const results: Record<string, unknown> = {}
  // Keep read concurrency bounded while other project tasks may use this warehouse.
  for (const [name, sql] of Object.entries(queries)) {
    const result = await executeDatabricksStatement(sql, { rowLimit: 50000 })
    assert.ok(result.rows.length < 50000, `${name}: extraction reached row limit`)
    results[name] = { sql, sql_sha256: createHash('sha256').update(sql).digest('hex'), ...result }
  }
  assert.deepEqual(await readDescriptiveRelease({ ...binding, version: release.fact_delta_version }), release,
    'Release identity or publication changed during extraction')
  const after = (await executeDatabricksStatement(historySql, { rowLimit: 1 })).rows[0]?.version
  assert.ok(before != null && before === after, 'Fact changed during extraction')
  const receipt = { schema_version: 1, generated_at: new Date().toISOString(), timezone: 'Asia/Manila',
    status: 'read_only_so2_recorded_sales_not_objective_acceptance', study_start: '2017-01-01', study_end: '2025-12-31',
    analysis_end: include2026 ? '2026-12-31' : '2025-12-31', includes_2026_observations: include2026,
    source: 'databricks', release, population: DASHBOARD_POPULATION, warehouse_writes: 0,
    source_latest_version_before: before, source_latest_version_after: after,
    extractor_sha256: createHash('sha256').update(readFileSync(resolve('scripts/extract-so2-priorities.ts'))).digest('hex'),
    queries: results }
  const content = JSON.stringify(receipt, null, 2) + '\n'
  mkdirSync(output, { recursive: true })
  writeFileSync(resolve(output, 'source.json'), content, { flag: 'wx' })
  writeFileSync(resolve(output, 'source.sha256'), createHash('sha256').update(content).digest('hex') + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ status: receipt.status, output, counts: Object.fromEntries(
    Object.entries(results).map(([name, result]) => [name, (result as { rows: unknown[] }).rows.length])), warehouse_writes: 0 }))
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'SO2 extraction failed'); process.exitCode = 1 })
