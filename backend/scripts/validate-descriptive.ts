import 'dotenv/config'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { loadDatabricksDashboardSnapshot, getDatabricksSalesSummary, getDatabricksStl } from '../src/databricksDashboard'
import { executeDatabricksStatement } from '../src/databricks'

async function main() {
  const fact = 'workspace.medshield_gold.sales_restart_fact_candidate'
  const before = (await executeDatabricksStatement(`DESCRIBE HISTORY ${fact} LIMIT 1`, { rowLimit: 1 })).rows[0]
  const identity = (await executeDatabricksStatement(`SELECT DISTINCT dataset_id, policy_version, area_mapping_sha256, product_master_sha256, publication_status FROM ${fact}`, { rowLimit: 10 })).rows
  assert.equal(identity.length, 1, 'single dataset and policy identity')
  const [snapshot, summary] = await Promise.all([loadDatabricksDashboardSnapshot(), getDatabricksSalesSummary({})])
  const close = (a: number | null, b: number | null, label: string) => {
    assert.ok(a != null && b != null && Number.isFinite(a) && Number.isFinite(b), `${label}: measurements must be observed`)
    assert.ok(Math.abs(a - b) < 0.01, `${label}: ${a} vs ${b}`)
  }
  close(snapshot.monthly.reduce((sum, row) => sum + (row.revenue ?? 0), 0), snapshot.totals.total_revenue, 'monthly/yearly revenue')
  close(snapshot.totals.total_revenue, summary.sums.net_cost, 'snapshot/filtered summary revenue')
  close(snapshot.totals.avg_margin!, summary.gross_margin_rate!, 'common population margin')
  for (const row of snapshot.monthly) {
    if (!row.has_sales_activity) {
      assert.equal(row.revenue, null, 'missing month must not be zero')
      assert.equal(row.income, null)
      assert.equal(row.missing, true)
    }
  }
  for (const season of snapshot.seasonality) {
    const observed = snapshot.monthly.filter(row => row.revenue != null && new Date(`${row.period}-01T00:00:00Z`).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }) === season.month)
    assert.equal(season.observed_month_count, observed.length)
    close(season.avg_revenue!, observed.reduce((sum, row) => sum + row.revenue!, 0) / observed.length, 'observed seasonal mean')
  }
  const stl = await getDatabricksStl()
  assert.equal(stl.release.fact_delta_version, Number(before.version), 'STL must match the audited fact version')
  assert.equal(stl.parameters.period, 12, 'annual STL cycle')
  assert.equal(stl.parameters.missing_policy, 'no_imputation_split_at_gaps')
  for (const row of stl.rows) {
    const observed = snapshot.monthly.find(month => month.period === row.period)
    assert.ok(observed && observed.revenue != null && !observed.missing, 'STL months must be observed')
    close(row.observed!, observed.revenue!, 'STL input matches dashboard revenue')
    assert.ok(Math.abs(row.observed! - row.trend! - row.seasonal! - row.residual!) < 0.000001, 'STL reconstruction')
  }
  const after = (await executeDatabricksStatement(`DESCRIBE HISTORY ${fact} LIMIT 1`, { rowLimit: 1 })).rows[0]
  assert.ok(before?.version != null && before.version === after?.version, 'fact version must remain stable during validation')
  assert.equal(snapshot.data_status.release?.fact_delta_version, Number(before.version), 'gateway pin must match audited fact version')
  assert.equal(snapshot.data_status.release?.dataset_id, identity[0].dataset_id, 'gateway identity must match audit')
  const evidence = { generated_at: new Date().toISOString(), status: 'candidate_calculations_verified_not_publication_approval', source_table: fact, delta_version: before.version, identity: identity[0], snapshot, summary, stl }
  const out = resolve('..', 'outputs', 'descriptive_validation', evidence.generated_at.replace(/[:.]/g, '-'))
  mkdirSync(out, { recursive: true })
  const body = JSON.stringify(evidence, null, 2) + '\n'
  writeFileSync(resolve(out, 'evidence.json'), body)
  writeFileSync(resolve(out, 'evidence.sha256'), createHash('sha256').update(body).digest('hex') + '\n')
  console.log(JSON.stringify({ output: out, revenue: snapshot.totals.total_revenue, margin: snapshot.totals.avg_margin, delta_version: before.version, stl_months: stl.rows.length, stl_start: stl.rows[0].period, stl_end: stl.rows[stl.rows.length-1].period, margin_revenue_basis: snapshot.totals.margin_revenue_basis, missing_months: snapshot.monthly.filter(row => row.missing).map(row => row.period), abc: snapshot.top_products.map(row => ({ product: row.product, abc: row.abc, share: row.pct_of_total })) }, null, 2))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
