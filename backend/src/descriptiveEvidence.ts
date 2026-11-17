import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { OBSERVED_FACT } from './databricksDashboard'
import { executeDatabricksStatement } from './databricks'
import { descriptiveBinding, qualifiedTable, readDescriptiveRelease, SOURCE_REBUILD_POLICY, type DescriptiveBinding, type DescriptiveRelease } from './descriptiveSource'
import { validateCoverage } from './predictiveCoverage'

type Row = Record<string, string | null>
type Execute = typeof executeDatabricksStatement
export type PopulationContract = { version: string; predicate: string; predicate_sha256: string }
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
export const DASHBOARD_POPULATION: Readonly<PopulationContract> = Object.freeze({
  version: 'dashboard_observed_fact_v1', predicate: OBSERVED_FACT, predicate_sha256: hash(OBSERVED_FACT),
})
const LEGACY_POPULATION: PopulationContract = { version: 'legacy_full_fact_v1', predicate: 'TRUE', predicate_sha256: hash('TRUE') }
const identityFields = ['dataset_id', 'policy_version', 'area_mapping_sha256', 'product_master_sha256', 'publication_status'] as const

function receiptVersion(receipt: any, allowLegacy = false) {
  const legacy = allowLegacy && receipt.population === undefined
    && receipt.source_table === 'workspace.medshield_gold.sales_restart_fact_candidate'
    && receipt.identity?.policy_version !== SOURCE_REBUILD_POLICY
  const value = legacy && typeof receipt.delta_version === 'string' && /^(0|[1-9][0-9]*)$/.test(receipt.delta_version)
    ? Number(receipt.delta_version) : receipt.delta_version
  assert.ok(Number.isSafeInteger(value) && value >= 0, 'Invalid receipt Delta version')
  return value as number
}

/** Historical all-fact receipts require an explicit opt-in; new receipts bind the dashboard predicate. */
export function receiptBinding(receipt: any, env: NodeJS.ProcessEnv = process.env, allowLegacy = false) {
  assert.ok(receipt && receipt.status === 'candidate_calculations_verified_not_publication_approval', 'Unrecognized descriptive receipt')
  const match = /^workspace\.(medshield_gold(?:_source_\d{8})?)\.sales_restart_fact_candidate$/.exec(receipt.source_table)
  assert.ok(match, 'Invalid descriptive receipt source table')
  const version = receiptVersion(receipt, allowLegacy)
  assert.match(receipt.identity?.dataset_id ?? '', /^[a-f0-9]{64}$/, 'Invalid receipt dataset identity')
  for (const field of identityFields) assert.ok(typeof receipt.identity[field] === 'string' && receipt.identity[field], `Missing receipt ${field}`)
  assert.ok(typeof receipt.generated_at === 'string' && Number.isFinite(Date.parse(receipt.generated_at)), 'Invalid descriptive receipt timestamp')
  if (receipt.identity.source_table !== undefined) assert.equal(receipt.identity.source_table, receipt.source_table, 'Conflicting receipt source identity')
  if (receipt.identity.fact_delta_version !== undefined) assert.equal(receipt.identity.fact_delta_version, version, 'Conflicting receipt version identity')
  const legacy = receipt.population === undefined
  if (legacy) {
    assert.ok(allowLegacy && match[1] === 'medshield_gold' && receipt.identity.policy_version !== SOURCE_REBUILD_POLICY,
      'Historical full-fact receipt requires --legacy-receipt and the original source')
  } else {
    assert.deepEqual(receipt.population, DASHBOARD_POPULATION, 'Receipt dashboard population contract mismatch')
    const configured = descriptiveBinding(env)
    assert.equal(match[1], configured.schema, 'Receipt source conflicts with configured descriptive source')
    if (configured.version !== undefined) assert.equal(version, configured.version, 'Receipt pin conflicts with configured version')
    if (configured.dataset) assert.equal(receipt.identity.dataset_id, configured.dataset, 'Receipt dataset conflicts with configured dataset')
    if (configured.policy) assert.equal(receipt.identity.policy_version, configured.policy, 'Receipt policy conflicts with configured policy')
  }
  const schema = match[1]
  const binding: DescriptiveBinding = { schema, table: qualifiedTable(schema, 'sales_restart_fact_candidate'),
    version, dataset: receipt.identity.dataset_id, policy: receipt.identity.policy_version,
    ...(schema === 'medshield_gold' ? {} : { auditSchema: schema.replace('medshield_gold', 'medshield_audit') }) }
  return { binding, population: legacy ? LEGACY_POPULATION : DASHBOARD_POPULATION, legacy }
}

export async function readReceiptRelease(receipt: any, env: NodeJS.ProcessEnv = process.env, allowLegacy = false, execute: Execute = executeDatabricksStatement) {
  const context = receiptBinding(receipt, env, allowLegacy)
  const release = await readDescriptiveRelease(context.binding, execute)
  for (const field of identityFields) assert.equal(release[field], receipt.identity[field], `Receipt ${field} differs from pinned Gold`)
  if (!context.legacy) {
    for (const field of ['resolution_policy', 'transaction_evidence_sha256', 'catalog_helper_sha256'] as const)
      assert.equal(release[field], receipt.identity[field], `Receipt ${field} differs from pinned Gold`)
    assert.equal(receipt.source_audit_table ?? undefined, release.source_audit_table, 'Receipt publication-audit source mismatch')
  }
  return { ...context, release }
}

export type SourceAudit = { total_count: number; source_count: number; observed_months: number; rows: Row[];
  source_review_counts: { source_data_status: string; total_count: number; included_count: number }[];
  evidence_count_basis: string }
const count = (value: unknown, label: string) => {
  const number = Number(value)
  assert.ok(value !== null && value !== undefined && Number.isSafeInteger(number) && number >= 0, `Invalid ${label}`)
  return number
}
export function amountCents(value: unknown) {
  assert.ok((typeof value === 'number' || typeof value === 'string') && value !== '', 'Amount is unavailable')
  const amount = Number(value)
  assert.ok(Number.isFinite(amount) && Number.isSafeInteger(Math.round(amount * 100)), 'Amount is not a finite supported value')
  return Math.round(amount * 100)
}

/** Independent bounded aggregates over exactly one immutable fact and one declared population. */
export async function readSourceAudit(release: DescriptiveRelease, population: PopulationContract = DASHBOARD_POPULATION, execute: Execute = executeDatabricksStatement): Promise<SourceAudit> {
  assert.ok(JSON.stringify(population) === JSON.stringify(DASHBOARD_POPULATION)
    || JSON.stringify(population) === JSON.stringify(LEGACY_POPULATION), 'Unsupported source population')
  const match = /^workspace\.(medshield_gold(?:_source_\d{8})?)\.sales_restart_fact_candidate$/.exec(release.source_table ?? '')
  assert.ok(match, 'Invalid release source table')
  assert.ok(Number.isSafeInteger(release.fact_delta_version) && release.fact_delta_version >= 0, 'Invalid release pin')
  const source = `${qualifiedTable(match[1], 'sales_restart_fact_candidate')} VERSION AS OF ${release.fact_delta_version}`
  const columns = (await execute(`SELECT * FROM ${source} LIMIT 0`, { rowLimit: 1 })).columns
  const hasStatus = columns.includes('source_data_status')
  assert.ok(release.policy_version !== SOURCE_REBUILD_POLICY || hasStatus, 'Source-rebuild Gold requires source review provenance')
  const status = hasStatus ? "COALESCE(source_data_status, 'UNKNOWN_SOURCE_STATUS')"
    : "CASE WHEN is_adjusted_source THEN 'LEGACY_ADJUSTED_SOURCE_FLAG' WHEN NOT is_adjusted_source THEN 'LEGACY_ORIGINAL_SOURCE_FLAG' ELSE 'UNKNOWN_SOURCE_STATUS' END"
  const original = hasStatus ? "source_data_status = 'ORIGINAL_SOURCE_EXPORT'" : 'NOT is_adjusted_source'
  const adjusted = hasStatus ? "source_data_status = 'ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE'" : 'is_adjusted_source'
  const unreviewed = hasStatus ? "source_data_status = 'UNREVIEWED_SOURCE_EXPORT'" : 'FALSE'
  const verified = columns.includes('transaction_evidence') ? "COUNT(CASE WHEN transaction_evidence = 'independently_verified_detail' THEN 1 END)" : 'CAST(NULL AS BIGINT)'
  const counts = (await execute(`SELECT COUNT(*) AS total_count,
    COUNT(CASE WHEN ${population.predicate} THEN 1 END) AS source_count,
    COUNT(DISTINCT CASE WHEN ${population.predicate} THEN DATE_FORMAT(month_start, 'yyyy-MM') END) AS observed_months
    FROM ${source}`, { rowLimit: 1 })).rows[0]
  assert.ok(counts, 'Missing source population counts')
  const total_count = count(counts.total_count, 'total count'), source_count = count(counts.source_count, 'population count')
  const observed_months = count(counts.observed_months, 'observed month count')
  assert.ok(source_count <= total_count && observed_months > 0 && observed_months <= 2400, 'Source population exceeds extraction bound')
  const [monthly, review] = await Promise.all([
    execute(`SELECT DATE_FORMAT(month_start, 'yyyy-MM') AS period,
      CAST(SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS STRING) AS target_value,
      COUNT(*) AS source_count,
      COUNT(CASE WHEN is_net_sales_eligible THEN 1 END) AS eligible_count,
      COUNT(CASE WHEN NOT is_net_sales_eligible OR is_net_sales_eligible IS NULL THEN 1 END) AS excluded_count,
      CAST(SUM(CASE WHEN NOT is_net_sales_eligible OR is_net_sales_eligible IS NULL THEN net_sales END) AS STRING) AS excluded_amount,
      CAST(SUM(CASE WHEN is_net_sales_eligible AND net_sales > 0 THEN net_sales END) AS STRING) AS positive_sales,
      CAST(SUM(CASE WHEN is_net_sales_eligible AND net_sales < 0 THEN net_sales END) AS STRING) AS signed_returns,
      COUNT(CASE WHEN ${original} THEN 1 END) AS original_count,
      COUNT(CASE WHEN ${adjusted} THEN 1 END) AS adjusted_count,
      COUNT(CASE WHEN ${unreviewed} THEN 1 END) AS unreviewed_count,
      COUNT(CASE WHEN NOT COALESCE((${original}) OR (${adjusted}) OR (${unreviewed}), FALSE) THEN 1 END) AS unknown_source_count,
      ${verified} AS independently_verified_count,
      MAX(date_delivered) AS last_observed_date
      FROM ${source} WHERE ${population.predicate} GROUP BY month_start ORDER BY period`, { rowLimit: observed_months }),
    execute(`SELECT ${status} AS source_data_status, COUNT(*) AS total_count,
      COUNT(CASE WHEN ${population.predicate} THEN 1 END) AS included_count
      FROM ${source} GROUP BY ${status} ORDER BY source_data_status`, { rowLimit: 100 }),
  ])
  assert.equal(monthly.rows.length, observed_months, 'Monthly source count mismatch')
  assert.equal(new Set(monthly.rows.map(row => row.period)).size, observed_months, 'Duplicate source month')
  for (const row of monthly.rows) {
    assert.match(row.period ?? '', /^\d{4}-(0[1-9]|1[0-2])$/, 'Invalid monthly source key')
    assert.equal(count(row.original_count, 'original count') + count(row.adjusted_count, 'adjusted count')
      + count(row.unreviewed_count, 'unreviewed count') + count(row.unknown_source_count, 'unknown count'), count(row.source_count, 'monthly count'), 'Source evidence strata must partition monthly records')
    assert.equal(count(row.eligible_count, 'eligible count') + count(row.excluded_count, 'excluded count'), count(row.source_count, 'monthly count'))
  }
  assert.equal(monthly.rows.reduce((sum, row) => sum + count(row.source_count, 'monthly count'), 0), source_count)
  const source_review_counts = review.rows.map(row => ({ source_data_status: row.source_data_status!,
    total_count: count(row.total_count, 'review total'), included_count: count(row.included_count, 'review included count') }))
  assert.ok(source_review_counts.every(row => row.source_data_status && row.included_count <= row.total_count))
  assert.equal(new Set(source_review_counts.map(row => row.source_data_status)).size, source_review_counts.length)
  assert.equal(source_review_counts.reduce((sum, row) => sum + row.total_count, 0), total_count)
  assert.equal(source_review_counts.reduce((sum, row) => sum + row.included_count, 0), source_count)
  for (const [field, status] of [['original_count', hasStatus ? 'ORIGINAL_SOURCE_EXPORT' : 'LEGACY_ORIGINAL_SOURCE_FLAG'],
    ['adjusted_count', hasStatus ? 'ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE' : 'LEGACY_ADJUSTED_SOURCE_FLAG'],
    ['unreviewed_count', 'UNREVIEWED_SOURCE_EXPORT']]) {
    assert.equal(monthly.rows.reduce((sum, row) => sum + Number(row[field]), 0),
      source_review_counts.find(row => row.source_data_status === status)?.included_count ?? 0, `Monthly ${field} provenance mismatch`)
  }
  return { total_count, source_count, observed_months, rows: monthly.rows, source_review_counts,
    evidence_count_basis: hasStatus ? 'source_data_status' : 'legacy_is_adjusted_source_flag' }
}

export function reconcileSourceAudit(receipt: any, audit: SourceAudit, legacy = false) {
  const monthly = receipt.snapshot?.monthly
  assert.ok(Array.isArray(monthly) && monthly.length > 0 && monthly.length <= 2400, 'Missing bounded descriptive months')
  assert.equal(new Set(monthly.map((row: any) => row.period)).size, monthly.length, 'Duplicate descriptive month')
  const reconciliation = monthly.map((expected: any) => {
    assert.match(expected.period, /^\d{4}-(0[1-9]|1[0-2])$/, 'Invalid descriptive month')
    const row = audit.rows.find(row => row.period === expected.period)
    assert.equal(Number(expected.transaction_count), Number(row?.source_count ?? 0), `Record count ${expected.period}`)
    assert.equal(expected.revenue == null, row?.target_value == null, `Unavailable revenue ${expected.period}`)
    if (row?.target_value != null) assert.equal(amountCents(row.target_value), amountCents(expected.revenue), `Revenue ${expected.period}`)
    return { period: expected.period, source_count: Number(row?.source_count ?? 0), amount_decimal: row?.target_value ?? null, descriptive_amount: expected.revenue, passed: true }
  })
  assert.ok(audit.rows.every(row => monthly.some((expected: any) => expected.period === row.period)), 'Source month absent from descriptive receipt')
  assert.equal(audit.source_count, receipt.snapshot.totals.total_transactions, 'Total descriptive record count')
  const yearly = [...new Set<string>(monthly.map((row: any) => row.period.slice(0, 4)))].map(year => {
    const actual = audit.rows.filter(row => row.period!.startsWith(year))
    const amount_cents = actual.reduce((sum, row) => sum + (row.target_value == null ? 0 : amountCents(row.target_value)), 0)
    const expected = receipt.snapshot.year_summary?.find((row: any) => String(row.year) === year)
    assert.ok(expected, `Missing descriptive year ${year}`)
    assert.equal(actual.reduce((sum, row) => sum + Number(row.source_count), 0), Number(expected.transactions), `Yearly count ${year}`)
    if (actual.some(row => row.target_value != null)) assert.equal(amount_cents, amountCents(expected.revenue), `Yearly revenue ${year}`)
    else assert.equal(expected.revenue, null, `Unavailable yearly revenue ${year}`)
    return { year, amount_cents, descriptive_cents: expected.revenue == null ? null : amountCents(expected.revenue), passed: true }
  })
  assert.equal(yearly.length, receipt.snapshot.year_summary.length, 'Unexpected descriptive year')
  assert.equal(yearly.reduce((sum, row) => sum + row.amount_cents, 0), amountCents(receipt.snapshot.totals.total_revenue), 'Total descriptive revenue')
  if (!legacy) {
    assert.equal(receipt.source_count, audit.source_count, 'Receipt population count mismatch')
    assert.equal(receipt.total_source_count, audit.total_count, 'Receipt retained source count mismatch')
    assert.deepEqual(receipt.source_review_counts, audit.source_review_counts, 'Receipt source review provenance mismatch')
    assert.equal(receipt.evidence_count_basis, audit.evidence_count_basis, 'Receipt source evidence basis mismatch')
  }
  return { monthly: reconciliation, yearly, passed: true }
}

export function preparePredictiveInput(receipt: any, receiptHash: string, audit: SourceAudit, population: PopulationContract,
  coverage: any = null, now = new Date(), coverageHash: string | null = null, legacy = false) {
  const version = receiptVersion(receipt, legacy)
  const reconciliation = reconcileSourceAudit(receipt, audit, legacy)
  if (coverage) validateCoverage(coverage, { dataset_id: receipt.identity.dataset_id,
    fact_delta_version: version, descriptive_receipt_sha256: receiptHash }, receipt.snapshot.monthly.map((row: any) => row.period))
  const currentPeriod = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).format(now)
  const monthly = receipt.snapshot.monthly.map((expected: any) => {
    const row = audit.rows.find(row => row.period === expected.period), entry = coverage?.periods?.[expected.period]
    const closed = expected.period < currentPeriod && entry?.period_closed === true
    const complete = entry?.coverage_status === 'complete', observed = row?.target_value != null
    if (entry?.confirmed_zero_activity) assert.ok(closed, `Zero decision requires a closed calendar period: ${expected.period}`)
    if (entry?.confirmed_zero_activity && observed) assert.equal(amountCents(row!.target_value), 0, `Zero decision contradicts recorded amount: ${expected.period}`)
    const confirmedZero = !row && complete && entry?.confirmed_zero_activity === true
    const value = observed ? Number(row!.target_value) : confirmedZero ? 0 : null
    const blockers = [!closed && 'period_close_unverified', !complete && 'reporting_coverage_unverified',
      coverage?.training_approved !== true && 'training_acceptance_pending', value == null && 'target_unavailable'].filter(Boolean)
    return { ...row, series_id: 'company:net_sales:PHP', target_name: 'net_sales', grain: 'company_month', scope: 'company', unit: 'PHP',
      period: expected.period, target_value: value, target_value_decimal: row?.target_value ?? (confirmedZero ? '0.00' : null),
      period_closed: closed, calendar_closed: expected.period < currentPeriod, coverage_status: entry?.coverage_status ?? 'unknown',
      value_status: confirmedZero ? 'confirmed_zero' : !row ? 'missing' : !observed ? 'ineligible' : entry?.coverage_status === 'partial' ? 'partial' : value === 0 ? 'recorded_zero' : 'observed',
      eligible_for_evaluation: blockers.length === 0, eligible_for_publication: blockers.length === 0 && coverage?.publication_approved === true,
      missing_reason: value == null ? (!row ? 'missing_history' : 'ineligible_measure') : null, blockers }
  })
  const manifest = { dataset_id: receipt.identity.dataset_id, source_checksum: receiptHash, fact_delta_version: version,
    transformation_policy: receipt.identity.policy_version, catalog_mapping_version: receipt.identity.product_master_sha256,
    geography_mapping_version: receipt.identity.area_mapping_sha256, accepted_descriptive_release_id: receiptHash,
    extracted_at: now.toISOString(), source_available_at: receipt.generated_at, source_table: receipt.source_table,
    source_count: audit.source_count, total_source_count: audit.total_count, population, legacy_full_fact_receipt: legacy,
    source_review_counts: audit.source_review_counts, evidence_count_basis: audit.evidence_count_basis,
    reconciliation_passed: true, training_approved: coverage?.training_approved === true,
    publication_approved: coverage?.publication_approved === true, coverage_receipt_sha256: coverageHash,
    coverage_review: coverage ? { reviewer: coverage.reviewer, reviewed_at: coverage.reviewed_at, evidence_reference: coverage.evidence_reference } : null,
    revision_policy: 'retrospective_revised_snapshot_no_historical_availability_vintages', source_publication_status: receipt.identity.publication_status }
  return { input: { schema_version: '1.0', manifest, rows: monthly }, reconciliation }
}
