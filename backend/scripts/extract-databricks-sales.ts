import 'dotenv/config'

import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { getDatabricksYearlyCandidateExtract } from '../src/databricks'

const OUTPUT_DIRECTORY = path.resolve(
  __dirname,
  '..',
  '..',
  'outputs',
  'databricks',
)
const CSV_PATH = path.join(
  OUTPUT_DIRECTORY,
  'gold_yearly_sales_candidate.csv',
)
const JSON_PATH = path.join(
  OUTPUT_DIRECTORY,
  'gold_yearly_sales_candidate.json',
)

function csvCell(value: string | null): string {
  if (value === null) {
    return ''
  }
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

async function writeAtomically(filePath: string, contents: string): Promise<void> {
  const temporaryPath = `${filePath}.tmp`
  await writeFile(temporaryPath, contents, 'utf8')
  await rename(temporaryPath, filePath)
}

async function main(): Promise<void> {
  const extract = await getDatabricksYearlyCandidateExtract()
  const columns = Object.keys(extract.rows[0] ?? {})
  if (columns.length === 0) {
    throw new Error('The validated Databricks extract did not contain any columns')
  }

  const csv = [
    columns.map(csvCell).join(','),
    ...extract.rows.map((row) =>
      columns.map((column) => csvCell(row[column] ?? null)).join(','),
    ),
  ].join('\n')

  const manifest = {
    dataset: 'gold_yearly_sales_candidate',
    layer: 'gold',
    publication_status: 'candidate_pending_finance_approval',
    ...extract,
  }

  await mkdir(OUTPUT_DIRECTORY, { recursive: true })
  await Promise.all([
    writeAtomically(CSV_PATH, `${csv}\n`),
    writeAtomically(JSON_PATH, `${JSON.stringify(manifest, null, 2)}\n`),
  ])

  console.log(
    JSON.stringify(
      {
        csv: CSV_PATH,
        json: JSON_PATH,
        rows: extract.rows.length,
        columns: columns.length,
        period: extract.period,
        source_transaction_count: extract.source_transaction_count,
        source_checksum: extract.source_checksum,
        checked_at: extract.checked_at,
      },
      null,
      2,
    ),
  )
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown extraction error'
  console.error(`Databricks sales extraction failed: ${message}`)
  process.exitCode = 1
})
