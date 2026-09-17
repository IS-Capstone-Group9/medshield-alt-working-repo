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
  'covered_areas_extract.csv',
)
const JSON_PATH = path.join(
  OUTPUT_DIRECTORY,
  'covered_areas_extract.json',
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
  console.log('Extracting covered areas and regional metrics from Databricks...')

  const query = `
    SELECT 
      d.normalized_area AS area_name,
      d.area_label,
      d.proposed_area_type AS area_type,
      d.territory,
      COALESCE(NULLIF(d.mapped_region, ''), 'Non-Geographic / Unmapped') AS mapped_region,
      COALESCE(NULLIF(d.mapped_province, ''), '-') AS mapped_province,
      COALESCE(NULLIF(d.mapped_city_municipality, ''), '-') AS mapped_city_municipality,
      d.is_geographic_territory_approved,
      d.source_record_count AS total_transactions,
      d.first_observed_delivery,
      d.last_observed_delivery,
      ROUND(COALESCE(s.total_quantity, 0), 2) AS total_quantity,
      ROUND(COALESCE(s.total_net_sales, 0), 2) AS total_net_sales,
      ROUND(COALESCE(s.total_gross_margin, 0), 2) AS total_gross_margin,
      ROUND(
        CASE 
          WHEN COALESCE(s.total_net_sales, 0) > 0 
          THEN (COALESCE(s.total_gross_margin, 0) / s.total_net_sales) * 100 
          ELSE 0 
        END, 
        2
      ) AS gross_margin_pct
    FROM workspace.medshield_gold.sales_restart_dim_area_candidate d
    LEFT JOIN (
      SELECT 
        area_key,
        SUM(COALESCE(total_quantity_candidate, 0)) AS total_quantity,
        SUM(COALESCE(net_sales_candidate, 0)) AS total_net_sales,
        SUM(COALESCE(gross_margin_candidate, 0)) AS total_gross_margin
      FROM workspace.medshield_gold.vw_dashboard_area_yearly_candidate
      GROUP BY area_key
    ) s ON d.area_key = s.area_key
    ORDER BY 
      CASE WHEN d.proposed_area_type = 'territory' THEN 1 ELSE 2 END,
      total_net_sales DESC
  `

  const result = await executeDatabricksStatement(query, { rowLimit: 100 })
  const columns = [
    'area_name',
    'area_label',
    'area_type',
    'territory',
    'mapped_region',
    'mapped_province',
    'mapped_city_municipality',
    'is_geographic_territory_approved',
    'total_transactions',
    'first_observed_delivery',
    'last_observed_delivery',
    'total_quantity',
    'total_net_sales',
    'total_gross_margin',
    'gross_margin_pct',
  ]

  const csvRows = [
    columns.join(','),
    ...result.rows.map((row) =>
      columns.map((col) => csvCell(row[col])).join(','),
    ),
  ]

  const payload = {
    dataset: 'databricks_covered_areas_extract',
    extracted_at: new Date().toISOString(),
    source_catalog: 'workspace',
    source_schema: 'medshield_gold',
    source_tables: [
      'sales_restart_dim_area_candidate',
      'vw_dashboard_area_yearly_candidate',
    ],
    total_areas: result.rows.length,
    geographic_territories: result.rows.filter((r) => r.area_type === 'territory'),
    non_geographic_channels: result.rows.filter((r) => r.area_type !== 'territory'),
    data: result.rows,
  }

  await mkdir(OUTPUT_DIRECTORY, { recursive: true })
  await Promise.all([
    writeAtomically(CSV_PATH, `${csvRows.join('\n')}\n`),
    writeAtomically(JSON_PATH, `${JSON.stringify(payload, null, 2)}\n`),
  ])

  console.log(`Successfully extracted ${result.rows.length} areas to:`)
  console.log(`- CSV: ${CSV_PATH}`)
  console.log(`- JSON: ${JSON_PATH}`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown extraction error'
  console.error(`Area extraction failed: ${message}`)
  process.exitCode = 1
})
