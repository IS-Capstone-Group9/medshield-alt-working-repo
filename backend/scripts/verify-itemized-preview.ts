import 'dotenv/config'
import assert from 'node:assert/strict'
import {writeFileSync} from 'node:fs'
import {getItemizedPreview, decimalMicros} from '../src/itemizedPreview'
import {executeDatabricksStatement} from '../src/databricks'

async function main() {
  const output = '../outputs/itemized_integration_20261026/live-read.json'
  const report: Record<string, unknown> = {checked_at: new Date().toISOString(), read_only: true, live_source_changed: false}
  let stage = 'source validation'
  try {
    const preview = await getItemizedPreview({}, async (sql, options) => {
      stage = sql.startsWith('DESCRIBE HISTORY') ? 'Delta history' : sql.includes('payload_b64') ? 'Gold receipt' : sql.includes('invalid_rows') ? 'Gold controls' : 'Gold measures'
      return executeDatabricksStatement(sql, options)
    })
    const sum = (rows: typeof preview.monthly, key: string) => rows.reduce((total, row) => total + decimalMicros(row[key] ?? '0'), 0n)
    assert.equal(sum(preview.monthly, 'net_sales'), decimalMicros(preview.summary.net_sales!))
    assert.equal(sum(preview.products, 'net_sales'), decimalMicros(preview.summary.net_sales!))
    assert.equal(preview.summary.records, '40171')
    Object.assign(report, {status: 'PASS_LIVE_GOLD_PREVIEW', source: preview.source, summary: preview.summary,
      observed_month_groups: preview.monthly.length, product_groups: preview.products.length, years: preview.available_years,
      net_conservation: true, authenticated_http_browser: 'not_tested_by_this_script'})
  } catch (error) {
    // Provider errors may include source labels. Retain only the bounded error class and a sanitized description.
    Object.assign(report, {status: 'UNVERIFIED_LIVE_GOLD_PREVIEW', error_type: error instanceof Error ? error.name : 'unknown',
      reason: 'Warehouse source validation or read failed. No fallback or serving change.',
      stage, provider_code: error instanceof Error ? error.message.match(/HTTP \d{3}|\[[A-Z_\.]+\]|DATABRICKS_[A-Z_]+ is not configured/)?.[0] ?? 'unclassified' : 'unknown',
      assertion: error instanceof assert.AssertionError ? String(error.message).split('\n')[0] : undefined})
    process.exitCode = 1
  }
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report))
}
main().catch(() => {console.error('Preview verification could not write its report.'); process.exitCode = 1})
