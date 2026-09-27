import 'dotenv/config'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { executeDatabricksStatement } from '../src/databricks'
import { validateCoverage } from '../src/predictiveCoverage'

// Read-only, version-pinned audit extract. Never imported by the dashboard.
async function main() {
  const receiptPath = process.argv[2]
  assert.ok(receiptPath, 'Usage: extract-predictive-input.ts <descriptive evidence.json> [coverage.json]')
  const body = readFileSync(receiptPath, 'utf8')
  const hash = createHash('sha256').update(body).digest('hex')
  assert.equal(readFileSync(receiptPath.replace(/\.json$/, '.sha256'), 'utf8').trim(), hash)
  const receipt = JSON.parse(body)
  const version = Number(receipt.delta_version)
  assert.ok(Number.isSafeInteger(version) && version >= 0)
  const fact = 'workspace.medshield_gold.sales_restart_fact_candidate'
  assert.equal(receipt.source_table, fact)
  const source = `${fact} VERSION AS OF ${version}`
  const columns = (await executeDatabricksStatement(`SELECT * FROM ${source} LIMIT 0`, { rowLimit: 1 })).columns
  const verifiedCount = columns.includes('transaction_evidence') ? "COUNT(CASE WHEN transaction_evidence = 'independently_verified_detail' THEN 1 END)" : 'CAST(NULL AS BIGINT)'
  const identity = (await executeDatabricksStatement(`SELECT DISTINCT dataset_id, policy_version, area_mapping_sha256, product_master_sha256 FROM ${source}`, { rowLimit: 2 })).rows
  assert.equal(identity.length, 1)
  for (const key of ['dataset_id', 'policy_version', 'area_mapping_sha256', 'product_master_sha256']) assert.equal(identity[0][key], receipt.identity[key], key)
  const count = (await executeDatabricksStatement(`SELECT COUNT(*) AS n, COUNT(DISTINCT date_format(date_delivered, 'yyyy-MM')) AS months FROM ${source}`, { rowLimit: 1 })).rows[0]
  const limit = Number(count.months)
  assert.ok(limit > 0 && limit <= 12000, 'Monthly extraction safety bound exceeded')
  const rows = (await executeDatabricksStatement(`SELECT date_format(date_delivered, 'yyyy-MM') AS period,
    CAST(SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS STRING) AS target_value,
    COUNT(*) AS source_count,
    COUNT(CASE WHEN is_net_sales_eligible THEN 1 END) AS eligible_count,
    COUNT(CASE WHEN NOT is_net_sales_eligible OR is_net_sales_eligible IS NULL THEN 1 END) AS excluded_count,
    CAST(SUM(CASE WHEN NOT is_net_sales_eligible OR is_net_sales_eligible IS NULL THEN net_sales END) AS STRING) AS excluded_amount,
    CAST(SUM(CASE WHEN is_net_sales_eligible AND net_sales > 0 THEN net_sales END) AS STRING) AS positive_sales,
    CAST(SUM(CASE WHEN is_net_sales_eligible AND net_sales < 0 THEN net_sales END) AS STRING) AS signed_returns,
    COUNT(CASE WHEN NOT is_adjusted_source THEN 1 END) AS original_count,
    COUNT(CASE WHEN is_adjusted_source THEN 1 END) AS adjusted_count,
    ${verifiedCount} AS independently_verified_count,
    MAX(date_delivered) AS last_observed_date
    FROM ${source} GROUP BY date_format(date_delivered, 'yyyy-MM') ORDER BY period`, { rowLimit: limit })).rows
  assert.equal(rows.length, limit, 'Monthly count reconciliation')
  assert.equal(rows.reduce((s, r) => s + Number(r.source_count), 0), Number(count.n))
  assert.equal(Number(count.n), receipt.snapshot.totals.total_transactions)
  const cents = (v: unknown) => Math.round(Number(v) * 100)
  const reconciliation = rows.map(row => {
    const expected = receipt.snapshot.monthly.find((r: any) => r.period === row.period)
    assert.ok(expected, `Missing descriptive month ${row.period}`)
    assert.equal(row.target_value == null, expected.revenue == null)
    if (row.target_value != null) assert.equal(cents(row.target_value), cents(expected.revenue), `Revenue ${row.period}`)
    return { period: row.period, amount_decimal: row.target_value, descriptive_amount: expected.revenue, passed: true }
  })
  const yearly = [...new Set(rows.map(r => String(r.period).slice(0, 4)))].map(year => ({ year,
    amount_cents: rows.filter(r => String(r.period).startsWith(year)).reduce((s, r) => s + (r.target_value == null ? 0 : cents(r.target_value)), 0),
    descriptive_cents: receipt.snapshot.monthly.filter((r: any) => r.period.startsWith(year)).reduce((s: number, r: any) => s + (r.revenue == null ? 0 : cents(r.revenue)), 0) }))
  yearly.forEach(r => assert.equal(r.amount_cents, r.descriptive_cents))
  assert.equal(yearly.reduce((s, r) => s + r.amount_cents, 0), cents(receipt.snapshot.totals.total_revenue))
  const coverageBody = process.argv[3] ? readFileSync(process.argv[3], 'utf8') : null
  const coverage = coverageBody ? JSON.parse(coverageBody) : null
  if (coverage) {
    validateCoverage(coverage, { dataset_id: identity[0].dataset_id, fact_delta_version: version, descriptive_receipt_sha256: hash }, receipt.snapshot.monthly.map((r: any) => r.period))
  }
  const now = new Date().toISOString()
  const current = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).format(new Date())
  const currentPeriod = current.match(/^\d{4}-\d{2}$/) ? current : new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).format(new Date())
  const monthly = receipt.snapshot.monthly.map((expected: any) => {
    const row = rows.find(r => r.period === expected.period)
    const entry = coverage?.periods?.[expected.period]
    const closed = expected.period < currentPeriod && entry?.period_closed === true
    const complete = entry?.coverage_status === 'complete'
    const observed = row?.target_value != null
    const confirmedZero = !row && complete && entry?.confirmed_zero_activity === true
    const value = observed ? Number(row.target_value) : confirmedZero ? 0 : null
    const blockers = [!closed && 'period_close_unverified', !complete && 'reporting_coverage_unverified', coverage?.training_approved !== true && 'training_acceptance_pending', value == null && 'target_unavailable'].filter(Boolean)
    return { ...row, series_id: 'company:net_sales:PHP', target_name: 'net_sales', grain: 'company_month', scope: 'company', unit: 'PHP',
      period: expected.period, target_value: value, target_value_decimal: row?.target_value ?? (confirmedZero ? '0.00' : null),
      period_closed: closed, calendar_closed: expected.period < currentPeriod, coverage_status: entry?.coverage_status ?? 'unknown',
      value_status: confirmedZero ? 'confirmed_zero' : !row ? 'missing' : !observed ? 'ineligible' : entry?.coverage_status === 'partial' ? 'partial' : value === 0 ? 'recorded_zero' : 'observed',
      eligible_for_evaluation: blockers.length === 0, eligible_for_publication: blockers.length === 0 && coverage?.publication_approved === true,
      missing_reason: value == null ? (!row ? 'missing_history' : 'ineligible_measure') : null, blockers }
  })
  const manifest = { dataset_id: identity[0].dataset_id, source_checksum: hash, fact_delta_version: version,
    transformation_policy: identity[0].policy_version, catalog_mapping_version: identity[0].product_master_sha256,
    geography_mapping_version: identity[0].area_mapping_sha256, accepted_descriptive_release_id: hash,
    extracted_at: now, source_available_at: receipt.generated_at, source_table: fact, source_count: Number(count.n),
    reconciliation_passed: true, training_approved: coverage?.training_approved === true,
    publication_approved: coverage?.publication_approved === true, coverage_receipt_sha256: coverageBody ? createHash('sha256').update(coverageBody).digest('hex') : null,
    coverage_review: coverage ? { reviewer: coverage.reviewer, reviewed_at: coverage.reviewed_at, evidence_reference: coverage.evidence_reference } : null,
    revision_policy: 'retrospective_revised_snapshot_no_historical_availability_vintages',
    source_publication_status: receipt.identity.publication_status }
  const out = resolve('..', 'outputs', 'predictive_validation', now.replace(/[:.]/g, '-'))
  mkdirSync(out, { recursive: true })
  const input = JSON.stringify({ schema_version: '1.0', manifest, rows: monthly }, null, 2) + '\n'
  writeFileSync(resolve(out, 'input.json'), input)
  writeFileSync(resolve(out, 'input.sha256'), createHash('sha256').update(input).digest('hex') + '\n')
  writeFileSync(resolve(out, 'reconciliation.json'), JSON.stringify({ monthly: reconciliation, yearly, passed: true }, null, 2))
  writeFileSync(resolve(out, 'eligibility.json'), JSON.stringify(monthly.map((r: any) => ({ period: r.period, eligible: r.eligible_for_evaluation, blockers: r.blockers })), null, 2))
  writeFileSync(resolve(out, 'exclusions.json'), JSON.stringify(rows.map(r => ({ period: r.period, count: r.excluded_count, amount: r.excluded_amount })), null, 2))
  console.log(JSON.stringify({ output: out, periods: monthly.length, source_count: Number(count.n), training_approved: manifest.training_approved }))
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
