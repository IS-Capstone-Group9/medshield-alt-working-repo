import 'dotenv/config'

import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { executeDatabricksStatement } from '../src/databricks'

const OUTPUT_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'outputs',
  'product_grouping_2017_2025',
  'databricks_product_grain_audit.json',
)

const queries = {
  fact: `
    SELECT
      COUNT(*) AS rows,
      COUNT(DISTINCT normalized_product) AS products,
      SUM(CASE WHEN is_provisional_product_demand_eligible THEN 1 ELSE 0 END) AS provisional_rows,
      SUM(CASE WHEN is_contract_label THEN 1 ELSE 0 END) AS contract_rows
    FROM workspace.medshield_gold.sales_restart_fact_candidate
  `,
  dashboard_product_view: `
    SELECT
      COUNT(*) AS product_year_rows,
      COUNT(DISTINCT product_name) AS products,
      SUM(transaction_count) AS transactions,
      ROUND(SUM(COALESCE(net_sales_candidate, 0)), 2) AS net_sales
    FROM workspace.medshield_gold.vw_dashboard_product_yearly_candidate
  `,
  business_product_mart: `
    SELECT
      COUNT(*) AS product_year_rows,
      COUNT(DISTINCT normalized_product) AS products,
      SUM(transaction_count) AS transactions,
      ROUND(SUM(COALESCE(net_sales, 0)), 2) AS net_sales
    FROM workspace.medshield_gold.sales_restart_business_product_yearly_candidate
  `,
  provisional_product_mart: `
    SELECT
      COUNT(*) AS product_year_rows,
      COUNT(DISTINCT normalized_product) AS products,
      SUM(transaction_count) AS transactions,
      ROUND(SUM(COALESCE(net_sales, 0)), 2) AS net_sales
    FROM workspace.medshield_gold.sales_restart_product_yearly_candidate
  `,
  product_scope: `
    SELECT
      product_scope_status,
      COUNT(*) AS rows,
      ROUND(SUM(COALESCE(net_sales, 0)), 2) AS net_sales
    FROM workspace.medshield_gold.sales_restart_fact_candidate
    GROUP BY product_scope_status
    ORDER BY rows DESC
  `,
  product_scope_by_year: `
    SELECT
      calendar_year,
      product_scope_status,
      COUNT(*) AS rows,
      ROUND(SUM(COALESCE(net_sales, 0)), 2) AS net_sales
    FROM workspace.medshield_gold.sales_restart_fact_candidate
    GROUP BY calendar_year, product_scope_status
    ORDER BY calendar_year, product_scope_status
  `,
  government_by_year: `
    SELECT
      calendar_year,
      COUNT(*) AS rows,
      ROUND(SUM(COALESCE(net_sales, 0)), 2) AS net_sales,
      COUNT(DISTINCT normalized_product) AS products,
      SUM(CASE WHEN is_contract_label THEN 1 ELSE 0 END) AS contract_rows,
      SUM(CASE WHEN is_geographic_territory_approved THEN 1 ELSE 0 END) AS approved_territory_rows
    FROM workspace.medshield_gold.sales_restart_fact_candidate
    WHERE normalized_area = 'GOVERNMENT'
    GROUP BY calendar_year
    ORDER BY calendar_year
  `,
}

async function writeAtomically(contents: string): Promise<void> {
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  const temporaryPath = `${OUTPUT_PATH}.tmp`
  await writeFile(temporaryPath, contents, 'utf8')
  await rename(temporaryPath, OUTPUT_PATH)
}

async function main(): Promise<void> {
  const results: Record<string, unknown> = {}
  for (const [name, statement] of Object.entries(queries)) {
    try {
      const result = await executeDatabricksStatement(statement, { rowLimit: 100 })
      results[name] = name === 'product_scope'
        || name === 'product_scope_by_year'
        || name === 'government_by_year'
        ? result.rows
        : (result.rows[0] ?? null)
    } catch (error) {
      results[name] = {
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  const payload = {
    checked_at: new Date().toISOString(),
    period: '2017-2025',
    results,
  }
  await writeAtomically(`${JSON.stringify(payload, null, 2)}\n`)
  console.log(JSON.stringify(payload, null, 2))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
