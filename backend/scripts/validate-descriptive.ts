import 'dotenv/config'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { descriptiveRelease, loadDatabricksDashboardSnapshot, getDatabricksSalesSummary, getDatabricksStl } from '../src/databricksDashboard'
import { executeDatabricksStatement } from '../src/databricks'
import { descriptiveBinding, readDescriptiveRelease } from '../src/descriptiveSource'
import { DASHBOARD_POPULATION, readSourceAudit, reconcileSourceAudit } from '../src/descriptiveEvidence'

async function main() {
  const args = process.argv.slice(2)
  assert.ok(args.every(arg => arg === '--require-stl'), 'Usage: validate-descriptive.ts [--require-stl]')
  const requireStl = args.includes('--require-stl')
  const binding = descriptiveBinding()
  const release = await descriptiveRelease()
  const fact = release.source_table!
  const before = (await executeDatabricksStatement(`DESCRIBE HISTORY ${binding.table} LIMIT 1`, { rowLimit: 1 })).rows[0]
  const [snapshot, summary, audit] = await Promise.all([loadDatabricksDashboardSnapshot(), getDatabricksSalesSummary({}), readSourceAudit(release)])
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
  let stl: Awaited<ReturnType<typeof getDatabricksStl>> | null = null
  let stlCapability: { status: string; required: boolean; reason: string | null } = { status: 'available_verified', required: requireStl, reason: null }
  try {
    stl = await getDatabricksStl()
    assert.deepEqual(stl.release, release, 'STL must match the audited release identity')
    assert.equal(stl.parameters.period, 12, 'annual STL cycle')
    assert.equal(stl.parameters.missing_policy, 'no_imputation_split_at_gaps')
    for (const row of stl.rows) {
      const observed = snapshot.monthly.find(month => month.period === row.period)
      assert.ok(observed && observed.revenue != null && !observed.missing, 'STL months must be observed')
      close(row.observed!, observed.revenue!, 'STL input matches dashboard revenue')
      assert.ok(Math.abs(row.observed! - row.trend! - row.seasonal! - row.residual!) < 0.000001, 'STL reconstruction')
    }
  } catch (error) {
    if (requireStl) throw error
    stl = null
    stlCapability = { status: 'unavailable', required: false, reason: error instanceof Error ? error.message : 'STL could not be verified' }
  }
  const after = (await executeDatabricksStatement(`DESCRIBE HISTORY ${binding.table} LIMIT 1`, { rowLimit: 1 })).rows[0]
  assert.ok(before?.version != null && before.version === after?.version, 'fact version must remain stable during validation')
  assert.deepEqual(await readDescriptiveRelease({ ...binding, version: release.fact_delta_version }), release, 'Publication identity/audit changed during validation')
  assert.deepEqual(snapshot.data_status.release, release, 'Gateway release must match audited fact identity and pin')
  const evidence = { schema_version: '1.1', generated_at: new Date().toISOString(), status: 'candidate_calculations_verified_not_publication_approval',
    source_table: fact, source_audit_table: release.source_audit_table, delta_version: release.fact_delta_version, identity: release,
    latest_version_before: Number(before.version), latest_version_after: Number(after.version),
    population: DASHBOARD_POPULATION, source_count: audit.source_count, total_source_count: audit.total_count,
    source_review_counts: audit.source_review_counts, evidence_count_basis: audit.evidence_count_basis,
    snapshot, summary, stl, stl_capability: stlCapability }
  const reconciliation = reconcileSourceAudit(evidence, audit)
  const out = resolve('..', 'outputs', 'descriptive_validation', evidence.generated_at.replace(/[:.]/g, '-'))
  mkdirSync(out, { recursive: true })
  const body = JSON.stringify(evidence, null, 2) + '\n'
  writeFileSync(resolve(out, 'evidence.json'), body)
  writeFileSync(resolve(out, 'evidence.sha256'), createHash('sha256').update(body).digest('hex') + '\n')
  writeFileSync(resolve(out, 'reconciliation.json'), JSON.stringify(reconciliation, null, 2) + '\n')
  console.log(JSON.stringify({ output: out, source_table: fact, population: DASHBOARD_POPULATION.version,
    source_count: audit.source_count, total_source_count: audit.total_count, revenue: snapshot.totals.total_revenue,
    margin: snapshot.totals.avg_margin, delta_version: release.fact_delta_version, stl_capability: stlCapability,
    stl_months: stl?.rows.length ?? 0, stl_start: stl?.rows[0]?.period ?? null, stl_end: stl?.rows.at(-1)?.period ?? null,
    margin_revenue_basis: snapshot.totals.margin_revenue_basis, missing_months: snapshot.monthly.filter(row => row.missing).map(row => row.period),
    ranked_product_labels: snapshot.top_products.length }, null, 2))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
