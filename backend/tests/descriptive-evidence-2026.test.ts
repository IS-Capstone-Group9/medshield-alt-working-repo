import assert from 'node:assert/strict'
import test from 'node:test'
import { DASHBOARD_POPULATION, preparePredictiveInput, readReceiptRelease, readSourceAudit, receiptBinding, reconcileSourceAudit, type SourceAudit } from '../src/descriptiveEvidence'
import { SOURCE_REBUILD_POLICY } from '../src/descriptiveSource'

const dataset = 'a'.repeat(64), descriptiveHash = 'b'.repeat(64)
const schema = 'medshield_gold_source_20261022', source = `workspace.${schema}.sales_restart_fact_candidate`
const env = { DATABRICKS_DESCRIPTIVE_SCHEMA: schema, DATABRICKS_DESCRIPTIVE_FACT_VERSION: '0',
  DATABRICKS_DESCRIPTIVE_DATASET_ID: dataset, DATABRICKS_DESCRIPTIVE_POLICY_VERSION: SOURCE_REBUILD_POLICY }
const identity = { dataset_id: dataset, policy_version: SOURCE_REBUILD_POLICY, area_mapping_sha256: 'c'.repeat(64),
  product_master_sha256: 'd'.repeat(64), publication_status: 'PASS_CANDIDATE', fact_delta_version: 0, source_table: source,
  source_audit_table: 'workspace.medshield_audit_source_20261022.sales_restart_gold_publication_candidate',
  resolution_policy: 'independent_catalog_v1', transaction_evidence_sha256: 'e'.repeat(64), catalog_helper_sha256: 'f'.repeat(64) }
const row = (period: string, value: string, original: string, unreviewed: string, size: string) => ({ period, target_value: value,
  source_count: size, eligible_count: size, excluded_count: '0', excluded_amount: null, positive_sales: value, signed_returns: null,
  original_count: original, adjusted_count: '0', unreviewed_count: unreviewed, unknown_source_count: '0', independently_verified_count: '0',
  last_observed_date: period + '-20' })
const audit = (): SourceAudit => ({ total_count: 4, source_count: 3, observed_months: 2,
  rows: [row('2026-01', '100.10', '2', '0', '2'), row('2026-02', '25.00', '0', '1', '1')],
  source_review_counts: [{ source_data_status: 'ORIGINAL_SOURCE_EXPORT', total_count: 2, included_count: 2 },
    { source_data_status: 'UNREVIEWED_SOURCE_EXPORT', total_count: 2, included_count: 1 }], evidence_count_basis: 'source_data_status' })
const receipt = () => ({ schema_version: '1.1', generated_at: '2026-10-24T10:00:00Z', status: 'candidate_calculations_verified_not_publication_approval',
  source_table: source, source_audit_table: identity.source_audit_table, delta_version: 0, identity: { ...identity },
  population: { ...DASHBOARD_POPULATION }, source_count: 3, total_source_count: 4,
  source_review_counts: audit().source_review_counts, evidence_count_basis: 'source_data_status',
  snapshot: { totals: { total_transactions: 3, total_revenue: 125.1 },
    monthly: [{ period: '2026-01', revenue: 100.1, transaction_count: 2 }, { period: '2026-02', revenue: 25, transaction_count: 1 },
      { period: '2026-03', revenue: null, transaction_count: 0 }],
    year_summary: [{ year: '2026', revenue: 125.1, transactions: 3 }] } })

function reader(badAudit = false) {
  const statements: string[] = []
  const execute = async (sql: string) => {
    statements.push(sql)
    let rows: any[] = [], columns: string[] = []
    if (sql.startsWith('SELECT DISTINCT dataset_id')) rows = [{ dataset_id: dataset, policy_version: SOURCE_REBUILD_POLICY,
      area_mapping_sha256: identity.area_mapping_sha256, product_master_sha256: identity.product_master_sha256, publication_status: identity.publication_status }]
    else if (sql.startsWith('SELECT DISTINCT resolution_policy')) rows = [{ resolution_policy: identity.resolution_policy,
      transaction_evidence_sha256: identity.transaction_evidence_sha256, catalog_helper_sha256: identity.catalog_helper_sha256 }]
    else if (sql.startsWith('SELECT table_name')) {
      const gold = ['fact', 'dim_date', 'dim_area', 'dim_product', 'dim_canonical_product', 'monthly', 'yearly', 'area_yearly', 'product_yearly', 'business_product_yearly', 'territory_yearly', 'medical_monthly', 'external_input', 'contract_labels', 'label_partition']
      const quality = ['area_coverage', 'scope', 'provisional_year', 'gold_disposition', 'gold_quality', 'returns', 'contract_evidence']
      rows = [...gold.map(name => `workspace.${schema}.sales_restart_${name}_candidate`),
        ...quality.map(name => `workspace.medshield_audit_source_20261022.sales_restart_${name}_candidate`)].map(table_name => ({ table_name,
        saved_rows: table_name === source ? '4' : '0', status: badAudit ? 'FAIL' : 'PASS', dataset_id: dataset, policy_version: SOURCE_REBUILD_POLICY }))
    } else if (sql.startsWith('SELECT COUNT(*) AS records')) rows = [{ records: '4', unique_records: '4' }]
    else if (sql.startsWith('SELECT *')) columns = ['source_data_status', 'transaction_evidence', 'is_adjusted_source']
    else if (sql.startsWith('SELECT COUNT(*) AS total_count')) rows = [{ total_count: '4', source_count: '3', observed_months: '2' }]
    else if (sql.startsWith('SELECT DATE_FORMAT')) rows = audit().rows
    else if (sql.startsWith('SELECT COALESCE(source_data_status')) rows = audit().source_review_counts.map(row => ({ ...row, total_count: String(row.total_count), included_count: String(row.included_count) }))
    else assert.fail(`Unexpected mocked query: ${sql}`)
    return { rows, columns, statementId: 'fixture', rowCount: rows.length } as any
  }
  return { execute, statements }
}

test('receipt binds the configured immutable source, predicate and complete isolated audit', async () => {
  const mock = reader(), context = await readReceiptRelease(receipt(), env, false, mock.execute)
  assert.equal(context.release.source_table, source)
  assert.equal(context.release.fact_delta_version, 0)
  assert.equal(context.legacy, false)
  const actual = await readSourceAudit(context.release, context.population, mock.execute)
  assert.deepEqual(actual, audit())
  assert.ok(mock.statements.filter(sql => sql.includes(`FROM \`workspace\`.\`${schema}\``)).every(sql => sql.includes('VERSION AS OF 0')))
  const monthlySql = mock.statements.find(sql => sql.startsWith('SELECT DATE_FORMAT'))!
  assert.ok(monthlySql.includes(`WHERE ${DASHBOARD_POPULATION.predicate}`))
  assert.match(monthlySql, /source_data_status = 'ORIGINAL_SOURCE_EXPORT'/)
  assert.doesNotMatch(monthlySql, /WHEN NOT is_adjusted_source THEN 1/)
  await assert.rejects(readReceiptRelease(receipt(), env, false, reader(true).execute), /publication audit/)
})

test('receipt rejects wrong source, pin, policy, population and conflicting provenance', () => {
  const changes: any[] = [
    { source_table: 'workspace.medshield_gold.sales_restart_fact_candidate' },
    { source_table: source + '; SELECT secret' }, { delta_version: 1 }, { delta_version: '0' },
    { population: { ...DASHBOARD_POPULATION, predicate: 'TRUE' } },
    { population: { ...DASHBOARD_POPULATION, version: 'other' } },
    { identity: { ...identity, dataset_id: '9'.repeat(64) } },
    { identity: { ...identity, policy_version: 'other' } },
    { identity: { ...identity, fact_delta_version: 7 } },
  ]
  for (const change of changes) assert.throws(() => receiptBinding({ ...receipt(), ...change }, env))
})

test('independent reconciliation checks monthly, yearly, totals and source-review strata', () => {
  assert.equal(reconcileSourceAudit(receipt(), audit()).passed, true)
  for (const field of ['source_count', 'total_source_count']) assert.throws(() => reconcileSourceAudit({ ...receipt(), [field]: 99 }, audit()))
  const wrongMonth = receipt(); wrongMonth.snapshot.monthly[0].revenue = 99
  assert.throws(() => reconcileSourceAudit(wrongMonth, audit()), /Revenue 2026-01/)
  const wrongYear = receipt(); wrongYear.snapshot.year_summary[0].transactions = 4
  assert.throws(() => reconcileSourceAudit(wrongYear, audit()), /Yearly count/)
  const wrongReview = receipt(); wrongReview.source_review_counts[1].included_count = 2
  assert.throws(() => reconcileSourceAudit(wrongReview, audit()), /source review provenance/)
})

test('unreviewed observations remain separate and missing coverage never becomes training approval or zero', () => {
  const { input } = preparePredictiveInput(receipt(), descriptiveHash, audit(), DASHBOARD_POPULATION, null, new Date('2026-10-24T12:00:00Z'))
  assert.equal(input.manifest.training_approved, false)
  assert.equal(input.manifest.publication_approved, false)
  assert.equal(input.manifest.source_count, 3)
  assert.equal(input.manifest.total_source_count, 4)
  assert.equal(input.rows[1].unreviewed_count, '1')
  assert.equal(input.rows[1].original_count, '0')
  assert.equal(input.rows[0].calendar_closed, true)
  assert.equal(input.rows[0].period_closed, false)
  assert.equal(input.rows[0].coverage_status, 'unknown')
  assert.equal(input.rows[2].target_value, null)
  assert.equal(input.rows[2].value_status, 'missing')
  assert.ok(input.rows.every((row: any) => !row.eligible_for_evaluation && row.blockers.includes('training_acceptance_pending')))
})

test('only applicable coverage decisions can enable rows and contradictory zero is rejected', () => {
  const coverage = { dataset_id: dataset, fact_delta_version: 0, descriptive_receipt_sha256: descriptiveHash,
    reviewer: 'Fixture reviewer', reviewed_at: '2026-10-24T11:00:00Z', evidence_reference: 'fixture decision',
    training_approved: true, publication_approved: false, periods: { '2026-01': { period_closed: true, coverage_status: 'complete' } } }
  const { input } = preparePredictiveInput(receipt(), descriptiveHash, audit(), DASHBOARD_POPULATION, coverage, new Date('2026-10-24T12:00:00Z'))
  assert.equal(input.rows[0].eligible_for_evaluation, true)
  assert.equal(input.rows[0].eligible_for_publication, false)
  assert.equal(input.rows[1].eligible_for_evaluation, false)
  assert.throws(() => preparePredictiveInput(receipt(), descriptiveHash, audit(), DASHBOARD_POPULATION, { ...coverage, dataset_id: '9'.repeat(64) }), /dataset_id mismatch/)
  assert.throws(() => preparePredictiveInput(receipt(), descriptiveHash, audit(), DASHBOARD_POPULATION,
    { ...coverage, periods: { '2026-01': { period_closed: true, coverage_status: 'complete', confirmed_zero_activity: true } } }), /Zero decision contradicts/)
})

test('historical full-fact receipts are explicit and cannot masquerade as a new isolated receipt', () => {
  const historical: any = receipt()
  delete historical.population
  historical.source_table = 'workspace.medshield_gold.sales_restart_fact_candidate'
  historical.identity = { ...identity, policy_version: 'sales_restart_gold_v7_independent_catalog', source_table: historical.source_table }
  assert.throws(() => receiptBinding(historical, env), /legacy-receipt/)
  const selected = receiptBinding(historical, env, true)
  assert.equal(selected.population.predicate, 'TRUE')
  assert.equal(selected.population.version, 'legacy_full_fact_v1')
  assert.equal(selected.binding.schema, 'medshield_gold')
  assert.throws(() => receiptBinding({ ...historical, source_table: source, identity }, env, true), /original source/)
})

test('a current-month closure claim cannot create a confirmed zero before the calendar closes', () => {
  const current = receipt()
  current.snapshot.monthly[2].period = '2026-10'
  const coverage = { dataset_id: dataset, fact_delta_version: 0, descriptive_receipt_sha256: descriptiveHash,
    reviewer: 'Fixture reviewer', reviewed_at: '2026-10-24T11:00:00Z', evidence_reference: 'fixture decision',
    training_approved: false, publication_approved: false,
    periods: { '2026-10': { period_closed: true, coverage_status: 'complete', confirmed_zero_activity: true } } }
  assert.throws(() => preparePredictiveInput(current, descriptiveHash, audit(), DASHBOARD_POPULATION, coverage,
    new Date('2026-10-24T12:00:00Z')), /closed calendar period/)
})

test('explicit historical receipts normalize recorded string versions without rewriting approval bindings', () => {
  const historical: any = receipt()
  delete historical.population
  historical.delta_version = '20'
  historical.source_table = 'workspace.medshield_gold.sales_restart_fact_candidate'
  historical.identity = { ...identity, policy_version: 'sales_restart_gold_v7_independent_catalog',
    source_table: historical.source_table, fact_delta_version: 20 }
  assert.throws(() => receiptBinding(historical, env), /Delta version/)
  const context = receiptBinding(historical, env, true)
  assert.equal(context.binding.version, 20)
  const coverage = { dataset_id: dataset, fact_delta_version: 20, descriptive_receipt_sha256: descriptiveHash,
    reviewer: 'Fixture reviewer', reviewed_at: '2026-10-24T11:00:00Z', evidence_reference: 'fixture decision',
    training_approved: true, publication_approved: false, periods: { '2026-01': { period_closed: true, coverage_status: 'complete' } } }
  const { input } = preparePredictiveInput(historical, descriptiveHash, audit(), context.population, coverage,
    new Date('2026-10-24T12:00:00Z'), 'coverage-hash', true)
  assert.equal(input.manifest.fact_delta_version, 20)
  assert.equal(input.rows[0].eligible_for_evaluation, true)
  assert.equal(historical.delta_version, '20')
  for (const value of ['020', '20; DROP', '-1']) assert.throws(() => receiptBinding({ ...historical, delta_version: value }, env, true))
  assert.throws(() => receiptBinding({ ...receipt(), delta_version: '0' }, env, true), /Delta version/)
})
