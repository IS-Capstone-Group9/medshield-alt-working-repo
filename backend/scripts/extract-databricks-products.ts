import 'dotenv/config'

import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { executeDatabricksStatement } from '../src/databricks'

const OUTPUT_DIRECTORY = path.resolve(
  __dirname,
  '..',
  '..',
  'outputs',
  'databricks',
)
const CSV_PATH = path.join(
  OUTPUT_DIRECTORY,
  'products_sales_extract.csv',
)
const JSON_PATH = path.join(
  OUTPUT_DIRECTORY,
  'products_sales_extract.json',
)

function csvCell(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }
  const str = String(value)
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

async function writeAtomically(filePath: string, contents: string): Promise<void> {
  const temporaryPath = `${filePath}.tmp`
  await writeFile(temporaryPath, contents, 'utf8')
  await rename(temporaryPath, filePath)
}

async function main(): Promise<void> {
  console.log('Extracting product-level sales records from Databricks Gold candidate views...')
  const query = `
    SELECT 
      product_name,
      SUM(transaction_count) AS total_transactions,
      ROUND(SUM(COALESCE(total_quantity_candidate, 0)), 2) AS total_quantity,
      ROUND(SUM(COALESCE(net_sales_candidate, 0)), 2) AS total_net_sales,
      ROUND(SUM(COALESCE(gross_margin_candidate, 0)), 2) AS total_gross_margin,
      ROUND(
        CASE 
          WHEN SUM(COALESCE(net_sales_candidate, 0)) > 0 
          THEN (SUM(COALESCE(gross_margin_candidate, 0)) / SUM(COALESCE(net_sales_candidate, 0))) * 100 
          ELSE 0 
        END, 
        2
      ) AS gross_margin_pct,
      MIN(calendar_year) AS first_year,
      MAX(calendar_year) AS last_year
    FROM workspace.medshield_gold.vw_dashboard_product_yearly_candidate
    GROUP BY product_name
    ORDER BY total_net_sales DESC
  `

  const result = await executeDatabricksStatement(query, { rowLimit: 10000 })
  const columns = [
    'product_name',
    'total_transactions',
    'total_quantity',
    'total_net_sales',
    'total_gross_margin',
    'gross_margin_pct',
    'first_year',
    'last_year',
  ]

  const csvRows = [
    columns.join(','),
    ...result.rows.map((row) =>
      columns.map((col) => csvCell(row[col])).join(','),
    ),
  ]

  const payload = {
    dataset: 'databricks_product_sales_extract',
    extracted_at: new Date().toISOString(),
    source_catalog: 'workspace',
    source_schema: 'medshield_gold',
    source_view: 'vw_dashboard_product_yearly_candidate',
    total_products: result.rows.length,
    products: result.rows,
  }

  await mkdir(OUTPUT_DIRECTORY, { recursive: true })
  await Promise.all([
    writeAtomically(CSV_PATH, `${csvRows.join('\n')}\n`),
    writeAtomically(JSON_PATH, `${JSON.stringify(payload, null, 2)}\n`),
  ])

  console.log(`Successfully extracted ${result.rows.length} products to:`)
  console.log(`- CSV: ${CSV_PATH}`)
  console.log(`- JSON: ${JSON_PATH}`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown extraction error'
  console.error(`Product extraction failed: ${message}`)
  process.exitCode = 1
})
