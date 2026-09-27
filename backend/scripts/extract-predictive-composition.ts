import 'dotenv/config'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { executeDatabricksStatement as execute } from '../src/databricks'

async function main() {
  const [path, output] = process.argv.slice(2)
  assert.ok(path && output, 'Usage: extract-predictive-composition.ts frozen-input.json output-directory')
  const raw = readFileSync(path, 'utf8'), input = JSON.parse(raw)
  const hash = createHash('sha256').update(raw).digest('hex')
  assert.equal(hash, readFileSync(path.replace(/\.json$/, '.sha256'), 'utf8').trim())
  const version = input.manifest.fact_delta_version
  assert.ok(Number.isSafeInteger(version) && version >= 0)
  const fact = `workspace.medshield_gold.sales_restart_fact_candidate VERSION AS OF ${version}`
  const identity = (await execute(`SELECT DISTINCT dataset_id FROM ${fact}`, { rowLimit: 2 })).rows
  assert.equal(identity.length, 1); assert.equal(identity[0].dataset_id, input.manifest.dataset_id)
  // Raw area is a source label, not an approved customer/territory identity.
  const dimensions: Record<string, string> = { source_workbook: 'source_workbook', source_provenance: 'source_data_status', raw_area: 'normalized_area', raw_product: 'normalized_product' }
  const groups: Record<string, any[]> = {}
  for (const [dimension, expression] of Object.entries(dimensions)) {
    const base = `SELECT date_format(date_delivered,'yyyy-MM') AS period, ${expression} AS label,
      COUNT(*) AS source_count, COUNT(CASE WHEN is_net_sales_eligible THEN 1 END) AS eligible_count,
      CAST(SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS STRING) AS net_sales,
      CAST(SUM(CASE WHEN is_net_sales_eligible AND net_sales>0 THEN net_sales END) AS STRING) AS positive_sales,
      CAST(SUM(CASE WHEN is_net_sales_eligible AND net_sales<0 THEN net_sales END) AS STRING) AS signed_returns
      FROM ${fact} GROUP BY date_format(date_delivered,'yyyy-MM'), ${expression}`
    const count = Number((await execute(`SELECT COUNT(*) AS n FROM (${base})`, { rowLimit: 1 })).rows[0].n)
    assert.ok(count <= 100000 && count > 0)
    const rows: any[] = []
    for (let offset = 0; offset < count; offset += 4000) {
      const page = (await execute(`${base} ORDER BY period, label NULLS FIRST LIMIT ${Math.min(4000, count-offset)} OFFSET ${offset}`, { rowLimit: Math.min(4000, count-offset) })).rows
      assert.equal(page.length, Math.min(4000, count-offset)); rows.push(...page)
    }
    assert.equal(new Set(rows.map(r => JSON.stringify([r.period, r.label]))).size, count)
    for (const month of input.rows) {
      const slice = rows.filter(r => r.period === month.period)
      assert.equal(slice.reduce((s,r) => s+Number(r.source_count),0), Number(month.source_count ?? 0))
      const cents = slice.reduce((s,r) => s+(r.net_sales == null ? 0 : Math.round(Number(r.net_sales)*100)),0)
      assert.equal(cents, month.target_value == null ? 0 : Math.round(month.target_value*100), `${dimension} ${month.period}`)
    }
    groups[dimension] = rows
  }
  mkdirSync(output, { recursive: true })
  const body = JSON.stringify({ extracted_at: new Date().toISOString(), input_sha256: hash, manifest: input.manifest, reconciliation: 'all_dimensions_match_monthly_counts_and_cents', groups }, null, 2)
  writeFileSync(resolve(output,'composition.json'), body)
  writeFileSync(resolve(output,'composition.sha256'), createHash('sha256').update(body).digest('hex'))
  console.log(JSON.stringify({ output, rows: Object.fromEntries(Object.entries(groups).map(([k,v]) => [k,v.length])), reconciliation: 'passed' }))
}
main().catch(error => { console.error(error.message); process.exitCode=1 })
