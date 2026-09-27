import { benchmarkNames, benchmarkView, evaluationProtocol, manilaMonth, reconciledPages } from './forecastEvidence'
import { catalogProjection } from './catalogContract'
import { parseMonthlyYear } from './monthlyQuery'
import { createHash } from 'node:crypto'
import { executeDatabricksStatement } from './databricks'
import { revenueAbc, weightedMargin } from './descriptiveMetrics'

const GOLD = '`workspace`.`medshield_gold`'
const FACT = `${GOLD}.\`sales_restart_fact_candidate\``
const EXTERNAL = `${GOLD}.\`vw_dss_external_signals_candidate\``
const NASA_WEATHER = `${GOLD}.\`vw_weather_nasa_power_monthly_candidate\``
const SOURCE_NAME = 'workspace.medshield_gold.sales_restart_fact_candidate'
// One analytical population for every user-facing query. Source rows that are
// retained only as non-product evidence stay queryable in Gold, but never enter
// dashboard totals, product lists, forecasts, or downstream model inputs. The
// explicit patterns also cover four legacy rows whose labels predate the Gold
// prefix flag (two DR references, one PR reference, and one QMC amount label).
const NON_PRODUCT_LABEL = `(is_contract_label = TRUE OR UPPER(TRIM(normalized_product)) RLIKE
  '^(PAGBILAO|QMC|PPDC|TOURISM|PROVINCIAL[[:space:]]+TOURISM[[:space:]]+OFFICE|MARINDUQUE|GULANG[[:space:]]+GULANG|PESO|PESO[[:space:]]+PROVINCIAL|PHO|ABOITIZ|PADRE[[:space:]]+BURGOS|PPOC)([[:space:]]*#|[[:space:]]+[0-9])|^DR[[:space:]]*#|^PR[[:space:]]+[0-9]')`
const OBSERVED_FACT = `is_analysis_candidate = TRUE AND NOT ${NON_PRODUCT_LABEL}`

// M-1 fix: shared sector classification constants.
// These area lists define the proposed buyer grouping (CEO review pending).
// Change them here once and every sector-scoped query stays consistent.
const SECTOR_GOVERNMENT_AREAS = `'GOVERNMENT', 'PAGBILAO'`
const SECTOR_INTERNAL_AREAS = `'ADMIN', 'SUPPLIES', 'SUPPLLIES', 'EQUIPMENT', 'SUPPLIES AND EQUIPMENT', 'PERSONAL', 'LOSSES'`
const SECTOR_PRIVATE_AREAS = `'CAVITE', 'LOWER CAVITE', 'BATANGAS', 'QUEZON', 'LAGUNA', 'MARINDUQUE', 'CAMARINES NORTE', 'CAM NORTE', 'CAMARINES SUR', 'CAM SUR', 'ALBAY', 'LEGASPI', 'LAGASPI', 'BICOL', 'MINDORO', 'HOSPITAL', 'HOPITAL', 'PHARMA', 'LUCENA', 'RAKKK', 'EAST', 'EASTERN', 'EASTERN QUEZON'`
const VALID_SECTORS = ['Unknown', 'Government', 'Private', 'Internal', 'All'] as const

/** M-1 fix: single source of truth for sector WHERE clause fragments. */
function sectorWhereClause(sector: string): string {
  switch (sector) {
    case 'Government': return `AND UPPER(TRIM(normalized_area)) IN (${SECTOR_GOVERNMENT_AREAS})`
    case 'Private': return `AND (proposed_area_type = 'territory' OR UPPER(TRIM(normalized_area)) IN (${SECTOR_PRIVATE_AREAS}))`
    case 'Internal': return `AND UPPER(TRIM(normalized_area)) IN (${SECTOR_INTERNAL_AREAS})`
    default: return ''
  }
}

/** M-1 fix: validate sector input using the shared list. */
function validateSector(sector: string): void {
  if (!(VALID_SECTORS as readonly string[]).includes(sector)) {
    throw new DatabricksDashboardInputError('Invalid buyer cluster')
  }
}

// m-4 fix: shared LOWER CAVITE normalization SQL expression.
const CAVITE_NORMALIZE = `CASE WHEN normalized_area = 'LOWER CAVITE' THEN 'Cavite' ELSE normalized_area END`
const CAVITE_NORMALIZE_UPPER = `CASE WHEN normalized_area = 'LOWER CAVITE' THEN 'CAVITE' ELSE normalized_area END`

/** M-4 fix: validate year input dynamically instead of hardcoding 2017-2025. */
function validateYearFilter(year: string, label = 'year'): void {
  if (parseMonthlyYear(year) === null) {
    throw new DatabricksDashboardInputError(`${label} must be all or a four-digit year`)
  }
}

type Row = Record<string, string | null>

function positiveIntegerEnvironment(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isInteger(value) && value > 0 ? value : fallback
}

const QUERY_CACHE_TTL_MS = positiveIntegerEnvironment('DATABRICKS_QUERY_CACHE_TTL_MS', 60_000)
const QUERY_CONCURRENCY = positiveIntegerEnvironment('DATABRICKS_QUERY_CONCURRENCY', 3)
const queryCache = new Map<string, { rows: Row[]; expiresAt: number }>()
const queryLoads = new Map<string, Promise<Row[]>>()
const queryWaiters: Array<() => void> = []
let activeQueries = 0

async function acquireQuerySlot(): Promise<void> {
  if (activeQueries < QUERY_CONCURRENCY) {
    activeQueries += 1
    return
  }
  await new Promise<void>((resolve) => queryWaiters.push(resolve))
}

function releaseQuerySlot(): void {
  const next = queryWaiters.shift()
  if (next) next()
  else activeQueries = Math.max(0, activeQueries - 1)
}

function numberValue(value: string | null | undefined, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function nullableNumber(value: string | null | undefined): number | null {
  if (value == null || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function integerValue(value: unknown, label: string, minimum: number, maximum: number): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new DatabricksDashboardInputError(`${label} must be an integer from ${minimum} to ${maximum}`)
  }
  return parsed
}

function decimalValue(value: unknown, label: string, minimum: number, maximum: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new DatabricksDashboardInputError(`${label} must be from ${minimum} to ${maximum}`)
  }
  return parsed
}

function sqlString(value: string, label: string, maximumLength = 160): string {
  const normalized = value.trim()
  if (normalized.length > maximumLength || /[\u0000-\u001f]/.test(normalized)) {
    throw new DatabricksDashboardInputError(`${label} is invalid`)
  }
  return `'${normalized.replaceAll("'", "''")}'`
}

function checksum(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function monthNumber(period: string): number {
  const match = /^(\d{4})-(\d{2})$/.exec(period)
  if (!match) throw new DatabricksDashboardInputError(`Invalid month ${period}`)
  return Number(match[1]) * 12 + Number(match[2]) - 1
}

function periodName(value: number): string {
  const year = Math.floor(value / 12)
  const month = value % 12 + 1
  return `${year}-${String(month).padStart(2, '0')}`
}

function currentClosedMonth(): number {
  // m-2 fix: use PH timezone (UTC+8) instead of UTC for month-boundary correctness.
  const now = new Date(Date.now() + 8 * 3600_000)
  return now.getUTCFullYear() * 12 + now.getUTCMonth() - 1
}

export class DatabricksDashboardInputError extends Error {
  readonly status = 400
  constructor(message: string) {
    super(message)
    this.name = 'DatabricksDashboardInputError'
  }
}

export class DatabricksSourceUnavailableError extends Error {
  readonly status = 503
  readonly code = 'DATABRICKS_SOURCE_UNAVAILABLE'
  constructor(message: string) {
    super(message)
    this.name = 'DatabricksSourceUnavailableError'
  }
}

type DescriptiveRelease = { resolution_policy?: string; transaction_evidence_sha256?: string; catalog_helper_sha256?: string; fact_delta_version: number; dataset_id: string; policy_version: string; area_mapping_sha256: string; product_master_sha256: string; publication_status: string }
let releasePromise: Promise<DescriptiveRelease> | undefined
let activeRelease: DescriptiveRelease | undefined

/** Pin every descriptive fact read for this gateway process; activation requires a restart. */
export function descriptiveRelease(): Promise<DescriptiveRelease> {
  if (!releasePromise) releasePromise = (async () => {
    const configured = process.env.DATABRICKS_DESCRIPTIVE_FACT_VERSION
    if (configured !== undefined && !/^(0|[1-9][0-9]*)$/.test(configured)) throw new Error('Invalid descriptive fact version')
    const history = configured === undefined ? (await executeDatabricksStatement(`DESCRIBE HISTORY ${FACT} LIMIT 1`, {rowLimit: 1})).rows : []
    const version = Number(configured ?? history[0]?.version)
    if (!Number.isSafeInteger(version) || version < 0) throw new Error('No valid descriptive Delta version')
    const identity = (await executeDatabricksStatement(`SELECT DISTINCT dataset_id, policy_version, area_mapping_sha256, product_master_sha256, publication_status FROM ${FACT} VERSION AS OF ${version}`, {rowLimit: 2})).rows
    if (identity.length !== 1 || Object.values(identity[0]).some(v => !v)) throw new Error('Ambiguous descriptive release identity')
    let catalogIdentity: Row = {}
    if (identity[0].policy_version === 'sales_restart_gold_v7_independent_catalog') {
      const catalog = (await executeDatabricksStatement(`SELECT DISTINCT resolution_policy, transaction_evidence_sha256, catalog_helper_sha256 FROM ${FACT} VERSION AS OF ${version}`, {rowLimit:2})).rows
      if (catalog.length !== 1 || Object.values(catalog[0]).some(v => !v)) throw new Error('Ambiguous catalog release identity')
      catalogIdentity = catalog[0]
    }
    activeRelease = { ...identity[0], ...catalogIdentity, fact_delta_version: version } as DescriptiveRelease
    return activeRelease
  })().catch(error => { releasePromise = undefined; throw error })
  return releasePromise
}

async function query(statement: string, rowLimit = 1000): Promise<Row[]> {
  if (statement.includes(FACT)) {
    const release = await descriptiveRelease()
    statement = statement.replaceAll(FACT, `${FACT} VERSION AS OF ${release.fact_delta_version}`)
  }
  const cacheKey = `${rowLimit}:${statement}`
  const cached = queryCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.rows
  const existing = queryLoads.get(cacheKey)
  if (existing) return existing

  const load = (async () => {
    await acquireQuerySlot()
    try {
      const rows = (await executeDatabricksStatement(statement, { rowLimit })).rows
      queryCache.set(cacheKey, { rows, expiresAt: Date.now() + QUERY_CACHE_TTL_MS })
      return rows
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Databricks error'
      throw new DatabricksSourceUnavailableError(message)
    } finally {
      releaseQuerySlot()
    }
  })().finally(() => queryLoads.delete(cacheKey))

  queryLoads.set(cacheKey, load)
  return load
}

function databricksSource(rows: unknown, extra: Record<string, unknown> = {}) {
  return {
    file: SOURCE_NAME,
    view: SOURCE_NAME,
    checksum: checksum(rows),
    generated_at: new Date().toISOString(),
    system_of_record: 'databricks',
    release: activeRelease,
    ...extra,
  }
}

export async function loadDatabricksDashboardSnapshot() {
  const [yearly, monthly, areas, products, seasonality, external] = await Promise.all([
    query(`SELECT calendar_year,
      COUNT(*) AS transaction_count,
      COUNT(DISTINCT dr_number) AS distinct_dr_count,
      COUNT(DISTINCT normalized_area) AS distinct_area_count,
      COUNT(DISTINCT normalized_product) AS distinct_product_count,
      SUM(CASE WHEN COALESCE(SIZE(quality_rule_codes), 0) > 0 THEN 1 ELSE 0 END) AS warning_transaction_count,
      SUM(CASE WHEN is_quantity_observation_eligible THEN quantity END) AS total_quantity_candidate,
      SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales_candidate,
      SUM(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END) AS gross_margin_candidate,
      SUM(CASE WHEN is_gross_margin_eligible THEN net_sales END) AS margin_revenue_basis,
      CASE WHEN SUM(CASE WHEN is_gross_margin_eligible THEN net_sales END) <> 0
        THEN ROUND(100 * SUM(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END)
          / SUM(CASE WHEN is_gross_margin_eligible THEN net_sales END), 4) END AS weighted_gross_margin_pct_candidate,
      'DEFINITIONS_APPROVED_DATASET_RELEASE_PENDING' AS financial_definition_status
      FROM ${FACT} WHERE ${OBSERVED_FACT}
      GROUP BY calendar_year ORDER BY calendar_year`, 200),
    query(`WITH month_spine AS (
        SELECT EXPLODE(SEQUENCE(MAKE_DATE(MIN(calendar_year), 1, 1), MAKE_DATE(MAX(calendar_year), 12, 1), INTERVAL 1 MONTH)) AS month_start
        FROM ${FACT} WHERE ${OBSERVED_FACT}
      ), monthly_fact AS (
        SELECT month_start, COUNT(*) AS transaction_count,
          SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales_candidate,
          SUM(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END) AS gross_margin_candidate,
          SUM(CASE WHEN is_gross_margin_eligible THEN net_sales END) AS margin_revenue_basis
        FROM ${FACT} WHERE ${OBSERVED_FACT} GROUP BY month_start
      )
      SELECT DATE_FORMAT(s.month_start, 'yyyy-MM') AS year_month,
        MONTH(s.month_start) AS month_number,
        DATE_FORMAT(s.month_start, 'MMM') AS month_short_name,
        COALESCE(m.transaction_count, 0) > 0 AS has_sales_activity,
        COALESCE(m.transaction_count, 0) AS transaction_count,
        m.net_sales_candidate,
        m.gross_margin_candidate,
        m.margin_revenue_basis
      FROM month_spine AS s LEFT JOIN monthly_fact AS m USING (month_start)
      ORDER BY s.month_start`, 2400),
    query(`SELECT CASE WHEN normalized_area = 'LOWER CAVITE' THEN 'CAVITE' ELSE normalized_area END AS area_name,
      COUNT(*) AS transaction_count,
      SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS revenue,
      SUM(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END) AS income
      FROM ${FACT} WHERE ${OBSERVED_FACT}
      GROUP BY CASE WHEN normalized_area = 'LOWER CAVITE' THEN 'CAVITE' ELSE normalized_area END
      ORDER BY revenue DESC`, 100),
    query(`WITH product_totals AS (SELECT normalized_product AS product_name, COUNT(*) AS transaction_count,
      SUM(CASE WHEN is_quantity_observation_eligible THEN quantity END) AS qty,
      SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS revenue,
      SUM(CASE WHEN is_net_sales_eligible AND net_sales > 0 THEN net_sales ELSE 0 END) AS positive_sales,
      SUM(CASE WHEN is_net_sales_eligible AND net_sales < 0 THEN net_sales ELSE 0 END) AS returns_value,
      SUM(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END) AS income
      FROM ${FACT}
      WHERE ${OBSERVED_FACT}
        AND product_scope_status <> 'CONTRACT_LABEL_CANDIDATE'
        AND UPPER(normalized_product) NOT LIKE 'DR#%'
        AND UPPER(normalized_product) NOT LIKE 'DR #%TERMS%'
        AND UPPER(normalized_product) NOT RLIKE '^PR [0-9]'
      GROUP BY normalized_product)
      SELECT *, SUM(positive_sales) OVER () AS product_revenue_total,
        SUM(CASE WHEN revenue < 0 THEN 1 ELSE 0 END) OVER () AS negative_product_count,
        SUM(positive_sales) OVER (ORDER BY positive_sales DESC, product_name ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_revenue
      FROM product_totals ORDER BY positive_sales DESC, product_name LIMIT 100`, 100),
    query(`WITH monthly_fact AS (
        SELECT month_start, SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales_candidate
        FROM ${FACT} WHERE ${OBSERVED_FACT} GROUP BY month_start
      )
      SELECT MONTH(month_start) AS month_number,
        MAX(DATE_FORMAT(month_start, 'MMM')) AS month,
        AVG(net_sales_candidate) AS avg_revenue,
        COUNT(net_sales_candidate) AS observed_month_count
      FROM monthly_fact
      GROUP BY MONTH(month_start) ORDER BY month_number`, 20),
    query(`SELECT period, territory,
      AVG(CASE WHEN signal_family = 'DISEASE' THEN signal_value END) AS disease_intensity_index,
      AVG(CASE WHEN signal_family = 'WEATHER' THEN signal_value END) AS rainfall_severity_index
      FROM ${EXTERNAL}
      WHERE is_external_join_ready = TRUE AND is_forecast_eligible = TRUE
      GROUP BY period, territory ORDER BY period, territory`, 5000),
  ])

  if (!yearly.length || !monthly.length) {
    throw new DatabricksSourceUnavailableError(
      `Databricks Gold returned no usable yearly/monthly history: ${yearly.length} and ${monthly.length} rows`,
    )
  }

  const totalRevenue = yearly.reduce((sum, row) => sum + numberValue(row.net_sales_candidate), 0)
  const totalIncome = yearly.reduce((sum, row) => sum + numberValue(row.gross_margin_candidate), 0)
  const marginRevenueBasis = yearly.reduce((sum, row) => sum + numberValue(row.margin_revenue_basis), 0)
  const totalTransactions = yearly.reduce((sum, row) => sum + numberValue(row.transaction_count), 0)

  const byArea = areas.map((row) => ({
    area: row.area_name ?? 'Unspecified',
    revenue: numberValue(row.revenue),
    income: numberValue(row.income),
  }))
  const topProducts = products.map((row) => ({
    product: row.product_name ?? 'Unspecified',
    revenue: numberValue(row.revenue),
    income: numberValue(row.income),
    qty: numberValue(row.qty),
    abc: numberValue(row.positive_sales) > 0 ? revenueAbc(nullableNumber(row.cumulative_revenue), nullableNumber(row.product_revenue_total), 0) : 'Unclassified',
    positive_sales: numberValue(row.positive_sales),
    returns_value: numberValue(row.returns_value),
    abc_basis: 'positive_eligible_sales_full_population',
    abc_policy_status: 'CANDIDATE_PENDING_CEO_APPROVAL',
    product_identity_status: 'source_label_not_verified_sku',
    pct_of_total: numberValue(row.product_revenue_total)
      ? numberValue(row.positive_sales) / numberValue(row.product_revenue_total) * 100
      : 0,
  }))
  return {
    data_status: {
      source: 'databricks' as const,
      mode: 'live' as const,
      loaded_at: new Date().toISOString(),
      message: 'Live Databricks Gold candidate views; no local or bundled fallback is permitted.',
      catalog: 'workspace',
      schema: 'medshield_gold',
      candidate_only: true,
      release: activeRelease,
    },
    totals: {
      total_revenue: totalRevenue,
      total_income: totalIncome,
      total_transactions: totalTransactions,
      avg_margin: weightedMargin(totalIncome, marginRevenueBasis),
      margin_revenue_basis: marginRevenueBasis,
    },
    monthly: monthly.map((row) => ({
      period: row.year_month,
      revenue: nullableNumber(row.net_sales_candidate),
      income: nullableNumber(row.gross_margin_candidate),
      margin_revenue_basis: nullableNumber(row.margin_revenue_basis),
      transaction_count: numberValue(row.transaction_count),
      has_sales_activity: String(row.has_sales_activity).toLowerCase() === 'true',
      missing: nullableNumber(row.net_sales_candidate) == null,
    })),
    by_area: byArea,
    top_products: topProducts,
    year_summary: yearly.map((row) => ({
      year: row.calendar_year,
      revenue: numberValue(row.net_sales_candidate),
      income: numberValue(row.gross_margin_candidate),
      transactions: numberValue(row.transaction_count),
      margin_revenue_basis: nullableNumber(row.margin_revenue_basis),
    })),
    seasonality: seasonality.map((row) => ({
      month: row.month,
      avg_revenue: nullableNumber(row.avg_revenue),
      observed_month_count: numberValue(row.observed_month_count),
      method: 'observed_calendar_month_average_not_stl',
    })),
    forecasts: [],
    external_signals: external.map((row) => ({
      period: row.period,
      territory: row.territory,
      disease_intensity_index: nullableNumber(row.disease_intensity_index),
      rainfall_severity_index: nullableNumber(row.rainfall_severity_index),
    })),
    inventory_recommendations: [],
    regional_priorities: [],
    area_clusters: [],
    product_priorities: [],
    allocation_recommendations: [],
    product_region_matches: [],
    decision_alerts: [],
    model_evaluation: [],
  }
}

const canonicalColumns = [
  'area', 'dr_number', 'date_delivered', 'product', 'quantity', 'unit_cost',
  'total_cost', 'discount', 'net_cost', 'trade_price_unit', 'total_trade_price',
  'net_income', 'margin_pct',
]

export async function getDatabricksSalesStatus() {
  const [summaryRows, years] = await Promise.all([
    query(`SELECT COUNT(*) AS rows_extracted,
      SUM(CASE WHEN ${OBSERVED_FACT} THEN 1 ELSE 0 END) AS rows_accepted,
      (COUNT(*) - COUNT(DISTINCT source_record_id)) AS duplicate_rows,
      SUM(CASE WHEN ${OBSERVED_FACT} AND COALESCE(SIZE(quality_rule_codes), 0) > 0 THEN 1 ELSE 0 END) AS rows_with_warnings,
      SUM(CASE WHEN ${OBSERVED_FACT} AND COALESCE(SIZE(quality_rule_codes), 0) = 0 THEN 1 ELSE 0 END) AS valid_rows,
      COUNT(DISTINCT CASE WHEN ${OBSERVED_FACT} THEN normalized_product END) AS unique_products,
      COUNT(DISTINCT CASE WHEN ${OBSERVED_FACT} THEN dr_number END) AS unique_dr_numbers,
      MIN(CASE WHEN ${OBSERVED_FACT} THEN date_delivered END) AS source_period_start,
      MAX(CASE WHEN ${OBSERVED_FACT} THEN date_delivered END) AS source_period_end,
      MAX(gold_published_at) AS received_at
      FROM ${FACT}`, 5),
    query(`SELECT calendar_year, COUNT(*) AS rows FROM ${FACT}
      WHERE ${OBSERVED_FACT} GROUP BY calendar_year ORDER BY calendar_year`, 20),
  ])
  const summary = summaryRows[0]
  if (!summary) throw new DatabricksSourceUnavailableError('Databricks fact status returned no rows')
  const yearCounts = Object.fromEntries(years.map((row) => [String(row.calendar_year), numberValue(row.rows)]))
  const accepted = numberValue(summary.rows_accepted)
  const extracted = numberValue(summary.rows_extracted)
  const fingerprint = {
    accepted,
    extracted,
    years: yearCounts,
    received_at: summary.received_at,
  }
  return {
    dataset_name: 'Databricks Gold sales fact',
    source_file: SOURCE_NAME,
    source_files: [SOURCE_NAME],
    checksum: checksum(fingerprint),
    received_at: summary.received_at ?? new Date().toISOString(),
    cleaning_status: 'databricks_gold_candidate',
    quality_summary: {
      input_stage: 'databricks_gold',
      rows_extracted: extracted,
      rows_accepted: accepted,
      rows_rejected: extracted - accepted,
      rows_with_warnings: numberValue(summary.rows_with_warnings),
      duplicate_rows: numberValue(summary.duplicate_rows),
      valid_rows: numberValue(summary.valid_rows),
      years: yearCounts,
      source_period_start: summary.source_period_start,
      source_period_end: summary.source_period_end,
      standardizations: {},
      issues: {},
      columns_received: canonicalColumns,
      unique_products: numberValue(summary.unique_products),
      unique_dr_numbers: numberValue(summary.unique_dr_numbers),
      sku_count: numberValue(summary.unique_products),
      merge_strategy: 'Databricks Gold view',
      merged_years: Object.keys(yearCounts),
    },
    canonical_columns: canonicalColumns,
  }
}

function salesWhere(input: { year?: string; search?: string; qualityStatus?: string }) {
  const clauses = [OBSERVED_FACT]
  const year = input.year?.trim() || 'all'
  if (year !== 'all') {
    validateYearFilter(year)
    clauses.push(`calendar_year = ${Number(year)}`)
  }
  const quality = input.qualityStatus?.trim().toLowerCase() || 'all'
  if (!['all', 'valid', 'warning', 'rejected'].includes(quality)) {
    throw new DatabricksDashboardInputError('quality_status is invalid')
  }
  if (quality === 'rejected') clauses.push('FALSE')
  else if (quality === 'valid') clauses.push('COALESCE(SIZE(quality_rule_codes), 0) = 0')
  else if (quality === 'warning') clauses.push('COALESCE(SIZE(quality_rule_codes), 0) > 0')
  const search = input.search?.trim() || ''
  if (search) {
    const term = sqlString(`%${search.toLowerCase()}%`, 'search', 104)
    clauses.push(`(LOWER(COALESCE(normalized_area, '')) LIKE ${term} OR LOWER(COALESCE(normalized_product, '')) LIKE ${term} OR LOWER(COALESCE(dr_number, '')) LIKE ${term})`)
  }
  return { where: clauses.join(' AND '), year, search, quality }
}

export async function getDatabricksSalesTransactions(input: {
  year?: string
  page?: unknown
  pageSize?: unknown
  search?: string
  qualityStatus?: string
}) {
  const page = integerValue(input.page ?? 1, 'page', 1, 100_000)
  const pageSize = integerValue(input.pageSize ?? 25, 'page_size', 1, 100)
  const filters = salesWhere(input)
  const offset = (page - 1) * pageSize
  const [countRows, rows, metadata] = await Promise.all([
    query(`SELECT COUNT(*) AS total_rows FROM ${FACT} WHERE ${filters.where}`, 5),
    query(`SELECT calendar_year,
      CASE WHEN normalized_area = 'LOWER CAVITE' THEN 'Cavite' ELSE normalized_area END AS area,
      dr_number, date_delivered,
      normalized_product AS product, quantity,
      unit_selling_price AS contract_price_unit, gross_sales AS gross_contract_value,
      discount_amount, net_sales AS net_contract_value,
      unit_acquisition_cost AS transfer_price_unit,
      total_acquisition_cost AS total_transfer_price,
      gross_margin_amount, margin_pct AS gross_margin_pct,
      CASE WHEN COALESCE(SIZE(quality_rule_codes), 0) = 0 THEN 'VALID' ELSE 'WARNING' END AS quality_status,
      CONCAT_WS('; ', quality_rule_codes) AS quality_notes,
      source_layout AS source_sheet, raw_csv_line AS source_row_number
      FROM ${FACT} WHERE ${filters.where}
      ORDER BY date_delivered DESC, source_workbook, source_record_id
      LIMIT ${pageSize} OFFSET ${offset}`, pageSize + 1),
    getDatabricksSalesStatus(),
  ])
  const totalRows = numberValue(countRows[0]?.total_rows)
  return {
    metadata,
    rows: rows.map((row) => ({
      year: nullableNumber(row.calendar_year),
      area: row.area,
      dr_number: row.dr_number,
      date_delivered: row.date_delivered,
      product: row.product,
      quantity: numberValue(row.quantity),
      unit_cost: numberValue(row.contract_price_unit),
      total_cost: numberValue(row.gross_contract_value),
      discount: numberValue(row.discount_amount),
      net_cost: numberValue(row.net_contract_value),
      trade_price_unit: numberValue(row.transfer_price_unit),
      total_trade_price: numberValue(row.total_transfer_price),
      net_income: numberValue(row.gross_margin_amount),
      margin_pct: numberValue(row.gross_margin_pct),
      quality_status: String(row.quality_status ?? 'WARNING').toLowerCase(),
      quality_notes: row.quality_notes ?? '',
      source_sheet: row.source_sheet ?? '',
      source_row_number: numberValue(row.source_row_number),
    })),
    pagination: {
      page,
      page_size: pageSize,
      page_count: Math.ceil(totalRows / pageSize),
      total_rows: totalRows,
    },
    filters: { year: filters.year, search: filters.search, quality_status: filters.quality },
  }
}

export async function getDatabricksSalesSummary(input: {
  year?: string
  search?: string
  qualityStatus?: string
}) {
  const filters = salesWhere(input)
  const [summaryRows, topArea, topProduct] = await Promise.all([
    query(`SELECT COUNT(*) AS rows, COUNT(DISTINCT normalized_product) AS sku_count,
      COUNT(DISTINCT dr_number) AS unique_dr_numbers,
      COUNT(*) AS accepted_rows,
      SUM(CASE WHEN is_quantity_observation_eligible THEN COALESCE(quantity, 0) ELSE 0 END) AS quantity,
      SUM(CASE WHEN is_gross_sales_eligible THEN COALESCE(gross_sales, 0) ELSE 0 END) AS total_cost,
      SUM(CASE WHEN is_net_sales_eligible THEN COALESCE(net_sales, 0) ELSE 0 END) AS net_cost,
      SUM(CASE WHEN is_acquisition_cost_eligible THEN COALESCE(total_acquisition_cost, 0) ELSE 0 END) AS total_trade_price,
      SUM(CASE WHEN is_gross_margin_eligible THEN COALESCE(gross_margin_amount, 0) ELSE 0 END) AS net_income,
      AVG(CASE WHEN is_quantity_observation_eligible THEN quantity END) AS avg_quantity,
      AVG(CASE WHEN is_gross_sales_eligible THEN unit_selling_price END) AS avg_unit_cost,
      AVG(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END) AS avg_net_income,
      CASE WHEN SUM(CASE WHEN is_gross_margin_eligible THEN net_sales END) > 0
        THEN 100 * SUM(CASE WHEN is_gross_margin_eligible THEN COALESCE(gross_margin_amount, 0) ELSE 0 END)
          / SUM(CASE WHEN is_gross_margin_eligible THEN net_sales END) END AS gross_margin_rate,
      SUM(CASE WHEN is_net_sales_eligible AND is_acquisition_cost_eligible AND is_gross_margin_eligible
        AND ABS(COALESCE(net_sales, 0) - COALESCE(total_acquisition_cost, 0) - COALESCE(gross_margin_amount, 0)) > 0.01
        THEN 1 ELSE 0 END) AS mismatched_rows,
      SUM(CASE WHEN is_net_sales_eligible AND is_acquisition_cost_eligible AND is_gross_margin_eligible
        THEN 1 ELSE 0 END) AS checked_rows,
      SUM(CASE WHEN is_net_sales_eligible AND is_acquisition_cost_eligible AND is_gross_margin_eligible
        THEN COALESCE(net_sales, 0) - COALESCE(total_acquisition_cost, 0) - COALESCE(gross_margin_amount, 0)
        ELSE 0 END) AS reconciliation_delta
      FROM ${FACT} WHERE ${filters.where}`, 5),
    query(`SELECT CASE WHEN normalized_area = 'LOWER CAVITE' THEN 'Cavite' ELSE normalized_area END AS area FROM ${FACT} WHERE ${filters.where}
      GROUP BY CASE WHEN normalized_area = 'LOWER CAVITE' THEN 'Cavite' ELSE normalized_area END
      ORDER BY SUM(CASE WHEN is_net_sales_eligible THEN COALESCE(net_sales, 0) ELSE 0 END) DESC LIMIT 1`, 2),
    query(`SELECT normalized_product AS product FROM ${FACT} WHERE ${filters.where}
      GROUP BY normalized_product
      ORDER BY SUM(CASE WHEN is_net_sales_eligible THEN COALESCE(net_sales, 0) ELSE 0 END) DESC LIMIT 1`, 2),
  ])
  const row = summaryRows[0] ?? {}
  return {
    filters: { year: filters.year, search: filters.search, quality_status: filters.quality },
    counts: {
      rows: numberValue(row.rows),
      accepted_rows: numberValue(row.accepted_rows),
      sku_count: numberValue(row.sku_count),
      unique_dr_numbers: numberValue(row.unique_dr_numbers),
    },
    sums: {
      quantity: numberValue(row.quantity),
      total_cost: numberValue(row.total_cost),
      net_cost: numberValue(row.net_cost),
      total_trade_price: numberValue(row.total_trade_price),
      net_income: numberValue(row.net_income),
    },
    averages: {
      quantity: numberValue(row.avg_quantity),
      unit_cost: numberValue(row.avg_unit_cost),
      net_income: numberValue(row.avg_net_income),
      margin_pct: nullableNumber(row.gross_margin_rate),
    },
    gross_margin_rate: nullableNumber(row.gross_margin_rate),
    financial_reconciliation: {
      delta: numberValue(row.reconciliation_delta),
      checked_rows: numberValue(row.checked_rows),
      mismatched_rows: numberValue(row.mismatched_rows),
    },
    top: { area: topArea[0]?.area ?? '', product: topProduct[0]?.product ?? '' },
  }
}

export async function getDatabricksSalesHeatmap(category = 'All') {
  const sectors = await getDatabricksSalesSectors(category)
  const products = new Map<string, Record<string, unknown>>()
  const daily = sectors.rows.map(row => {
    const id = String(row.canonical_group_id)
    // Verified SKU contracts guarantee a sellable unit. RAW groups never cross source keys.
    products.set(id, { ...row, id, label: row.canonical_title, mapping_status: row.identity_status,
      unit: row.unit_of_measure || 'Unknown source unit', pack_size: row.pack_count,
      original_aliases: [...new Set([...(products.get(id)?.original_aliases as string[] || []), String(row.product_raw)])].sort(),
      transaction_lineage: [...new Set([...(products.get(id)?.transaction_lineage as string[] || []), String(row.transaction_evidence_lineage)])].sort() })
    return { product: id, period: row.date, area: row.area, quantity: row.item_kind === 'service' ? null : row.observed_quantity,
      estimated_quantity: row.item_kind === 'service' ? null : row.estimated_quantity,
      verified_quantity: row.item_kind === 'service' ? null : row.verified_quantity,
      row_count: row.quantity_rows, transaction_evidence: row.transaction_evidence }
  })
  const monthly = daily.map(row => ({ ...row, period: String(row.period).slice(0, 7) }))
  return { products: [...products.values()], monthly, daily,
    source: { ...sectors.source, metric: 'Original-source reported quantity; adjusted-source quantities shown separately; verified services excluded',
      estimated_rows: 'Included only in estimated_quantity; file-level provenance does not prove individual substitution',
      missing_months: 'Unobserved, not zero' } }
}

// Immutable fact-version data can be shared for the lifetime of this pinned process.
// Failed loads are evicted; no local/offline substitute is used.
let catalogLoad: ReturnType<typeof loadDatabricksCatalog> | undefined
export async function getDatabricksSalesSectors(category = 'All') {
  catalogLoad ??= loadDatabricksCatalog().catch(error => { catalogLoad = undefined; throw error })
  const data = await catalogLoad
  const rows = data.rows.filter(row => category === 'All' || row.category === category)
  return {...data, rows, coverage: {...data.coverage, category_scope: category,
    unresolved_records: rows.filter(r=>r.identity_status !== 'approved').reduce((n,r)=>n+r.row_count,0),
    unresolved_revenue: rows.filter(r=>r.identity_status !== 'approved').reduce((n,r)=>n+(r.revenue??0),0)},
    source: {...data.source, included_rows: rows.reduce((n,r)=>n+r.row_count,0)}}
}

async function loadDatabricksCatalog() {
  const category = 'All'
  const release = await descriptiveRelease()
  const catalogEnabled = release.policy_version === 'sales_restart_gold_v7_independent_catalog'
  const observedEvidence = catalogEnabled ? "transaction_evidence = 'original_source_detail'" : 'NOT is_adjusted_source'
  const estimatedEvidence = catalogEnabled ? "transaction_evidence = 'adjusted_estimated_source'" : 'is_adjusted_source'
  const verifiedEvidence = catalogEnabled ? "transaction_evidence = 'independently_verified_detail'" : 'FALSE'
  const catalogSql = `SELECT normalized_product AS product, product_key, product_raw, source_record_id,
    ${catalogProjection(release.policy_version)},
    DATE_FORMAT(month_start, 'yyyy-MM') AS period,
    CAST(date_delivered AS STRING) AS date,
    normalized_area AS area,
    area_mapping_status AS geography_mapping_status,
    area_evidence_status AS geography_evidence_status,
    CASE WHEN is_geographic_territory_approved THEN mapped_region ELSE 'Unknown' END AS region,
    source_data_status,
    source_adjustment_policy,
    'proposed' AS buyer_mapping_status,
    CASE
      WHEN UPPER(TRIM(normalized_area)) IN ('GOVERNMENT', 'PAGBILAO') THEN 'Government'
      WHEN UPPER(TRIM(normalized_area)) IN ('ADMIN', 'SUPPLIES', 'SUPPLLIES', 'EQUIPMENT', 'SUPPLIES AND EQUIPMENT', 'PERSONAL', 'LOSSES') THEN 'Internal'
      WHEN proposed_area_type = 'territory' OR UPPER(TRIM(normalized_area)) IN ('CAVITE', 'LOWER CAVITE', 'BATANGAS', 'QUEZON', 'LAGUNA', 'MARINDUQUE', 'CAMARINES NORTE', 'CAM NORTE', 'CAMARINES SUR', 'CAM SUR', 'ALBAY', 'LEGASPI', 'LAGASPI', 'BICOL', 'MINDORO', 'HOSPITAL', 'HOPITAL', 'PHARMA', 'LUCENA', 'RAKKK', 'EAST', 'EASTERN', 'EASTERN QUEZON') THEN 'Private'
      ELSE 'Unknown'
    END AS sector,
    CASE WHEN is_geographic_territory_approved THEN COALESCE(mapped_province, territory, normalized_area)
      ELSE 'Unassigned geography' END AS territory,
    CASE
      WHEN UPPER(TRIM(normalized_area)) = 'GOVERNMENT' THEN 'Government Bidding'
      WHEN UPPER(TRIM(normalized_area)) = 'PAGBILAO' THEN 'LGU'
      WHEN UPPER(TRIM(normalized_area)) IN ('HOSPITAL', 'HOPITAL', 'RAKKK') THEN 'Private Hospital'
      WHEN UPPER(TRIM(normalized_area)) = 'LUCENA' THEN 'Private Care'
      WHEN UPPER(TRIM(normalized_area)) IN ('PHARMA', 'BATANGAS', 'QUEZON', 'LAGUNA', 'MARINDUQUE', 'CAVITE', 'LOWER CAVITE', 'ALBAY', 'LEGASPI', 'LAGASPI', 'BICOL', 'CAM SUR', 'CAMARINES SUR', 'CAM NORTE', 'CAMARINES NORTE', 'MINDORO', 'EAST', 'EASTERN', 'EASTERN QUEZON') OR proposed_area_type = 'territory' THEN 'Retail Pharmacy'
      WHEN UPPER(TRIM(normalized_area)) = 'ADMIN' THEN 'Internal Admin'
      WHEN UPPER(TRIM(normalized_area)) IN ('SUPPLIES', 'SUPPLLIES', 'SUPPLIES AND EQUIPMENT') THEN 'Internal Supplies'
      WHEN UPPER(TRIM(normalized_area)) = 'EQUIPMENT' THEN 'Internal Equipment'
      WHEN UPPER(TRIM(normalized_area)) = 'PERSONAL' THEN 'Internal Personal'
      WHEN UPPER(TRIM(normalized_area)) = 'LOSSES' THEN 'Internal Losses'
      ELSE 'Unclassified channel'
    END AS channel,
    CASE
      WHEN UPPER(TRIM(normalized_area)) = 'PAGBILAO' THEN 'Proposed buyer mapping (CEO review pending): Exact reference-backed LGU mapping from docs/MAPPED_CLIENT_REFERENCE.md record CLI-0340.'
      WHEN UPPER(TRIM(normalized_area)) = 'GOVERNMENT' THEN 'Proposed buyer mapping (CEO review pending): National Government & DOH Central public bidding from docs/MAPPED_CLIENT_REFERENCE.md record CLI-0002.'
      WHEN UPPER(TRIM(normalized_area)) IN ('ADMIN', 'SUPPLIES', 'SUPPLLIES', 'EQUIPMENT', 'SUPPLIES AND EQUIPMENT', 'PERSONAL', 'LOSSES') THEN 'Proposed buyer mapping (CEO review pending): MedShield internal corporate administration from docs/MAPPED_CLIENT_REFERENCE.md record CLI-0001.'
      WHEN proposed_area_type = 'territory' OR UPPER(TRIM(normalized_area)) IN ('CAVITE', 'LOWER CAVITE', 'BATANGAS', 'QUEZON', 'LAGUNA', 'MARINDUQUE', 'CAMARINES NORTE', 'CAM NORTE', 'CAMARINES SUR', 'CAM SUR', 'ALBAY', 'LEGASPI', 'LAGASPI', 'BICOL', 'MINDORO', 'HOSPITAL', 'HOPITAL', 'PHARMA', 'LUCENA', 'RAKKK', 'EAST', 'EASTERN', 'EASTERN QUEZON') THEN 'Proposed buyer mapping (CEO review pending): Provincial, private-care, pharmacy, or individual-account label from docs/MAPPED_CLIENT_REFERENCE.md'
      ELSE 'Buyer type unavailable'
    END AS basis,
    CASE WHEN is_net_sales_eligible AND net_sales > 0 THEN net_sales ELSE 0 END AS positive_sales,
    CASE WHEN is_net_sales_eligible AND net_sales < 0 THEN net_sales ELSE 0 END AS returns_value,
    CASE WHEN is_net_sales_eligible THEN net_sales END AS revenue,
    CASE WHEN is_quantity_observation_eligible THEN quantity END AS quantity,
    CASE WHEN is_quantity_observation_eligible AND ${observedEvidence} THEN quantity END AS observed_quantity,
    CASE WHEN is_quantity_observation_eligible AND ${estimatedEvidence} THEN quantity END AS estimated_quantity,
    CASE WHEN is_quantity_observation_eligible AND ${verifiedEvidence} THEN quantity END AS verified_quantity,
    CASE WHEN is_quantity_observation_eligible THEN 1 ELSE 0 END AS quantity_rows,
    CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END AS income,
    CASE WHEN is_gross_margin_eligible THEN net_sales END AS margin_revenue_basis,
    1 AS row_count
    FROM ${FACT} WHERE ${OBSERVED_FACT}`
  // Bounded pages avoid Databricks INLINE byte limits without dropping records.
  const counts = await query(`SELECT calendar_year, COUNT(*) AS n FROM ${FACT} WHERE ${OBSERVED_FACT} GROUP BY calendar_year ORDER BY calendar_year`)
  const statements: string[] = []
  for (const count of counts) {
    const year = integerValue(count.calendar_year, 'calendar year', 1000, 9999)
    for (let offset = 0; offset < numberValue(count.n); offset += 2000) {
      statements.push(`${catalogSql} AND calendar_year = ${year} ORDER BY source_record_id LIMIT 2000 OFFSET ${offset}`)
    }
  }
  const pages = await Promise.all(statements.map(statement => query(statement, 2000)))
  const rows = pages.flat()
  if (rows.reduce((sum,row)=>sum+numberValue(row.row_count),0) !== counts.reduce((sum,row)=>sum+numberValue(row.n),0)) {
    throw new DatabricksSourceUnavailableError('Incomplete catalog fact retrieval')
  }
  const includedRows = rows.reduce((sum, row) => sum + numberValue(row.row_count), 0)
  return {
    rows: rows.filter(row => category === 'All' || row.category === category).map(row => ({
      ...row,
      canonical_group_id: row.canonical_group_id, canonical_title: row.canonical_title, canonical_sku: row.canonical_sku,
      category: row.category, identity_status: row.identity_status, item_kind: row.item_kind,
      packaging_unit: row.packaging_unit, pack_count: row.pack_count, contained_unit: row.contained_unit,
      unit_of_measure: row.unit_of_measure, product_raw: row.product_raw, product: row.product,
      date: row.date, period: row.period, area: row.area, transaction_evidence: row.transaction_evidence,
      transaction_evidence_lineage: row.transaction_evidence_lineage,
      observed_quantity: nullableNumber(row.observed_quantity),
      estimated_quantity: nullableNumber(row.estimated_quantity),
      verified_quantity: nullableNumber(row.verified_quantity),
      quantity_rows: numberValue(row.quantity_rows),
      positive_sales: numberValue(row.positive_sales),
      returns_value: numberValue(row.returns_value),
      revenue: row.revenue == null ? null : numberValue(row.revenue),
      quantity: row.quantity == null ? null : numberValue(row.quantity),
      income: row.income == null ? null : numberValue(row.income),
      margin_revenue_basis: row.margin_revenue_basis == null ? null : numberValue(row.margin_revenue_basis),
      row_count: numberValue(row.row_count),
      evidence: 'actual',
      product_evidence: row.source_data_status === 'ORIGINAL_SOURCE_EXPORT' ? 'source_label_unverified' : 'estimated_allocation_source',
    })),
    coverage: { unresolved_records: rows.filter(r=>r.identity_status !== 'approved').reduce((sum,r)=>sum+numberValue(r.row_count),0), unresolved_revenue: rows.filter(r=>r.identity_status !== 'approved').reduce((sum,r)=>sum+numberValue(r.revenue),0), category_scope: category, financial_scope: 'All valid item kinds, including services' },
    source: databricksSource(rows, {
      input_rows: includedRows, included_rows: includedRows,
      metric: 'Eligible recorded sales; proposed buyer grouping; only warehouse-approved geography',
      allocation_policy: 'No gateway geographic allocation; source product allocations retain provenance',
      excluded: {},
    }),
  }
}

async function scopedMonthlySeries(sector: string, product: string, metric: string) {
  validateSector(sector)
  if (!['revenue', 'quantity'].includes(metric)) throw new DatabricksDashboardInputError('Invalid forecast metric')
  if (metric === 'quantity' && !product) throw new DatabricksDashboardInputError('Select one product for a quantity forecast')
  // Use the same ordered proposed buyer mapping as /sales/sectors. It is not an approved territory mapping.
  const sectorExpression = `CASE
    WHEN UPPER(TRIM(normalized_area)) IN (${SECTOR_GOVERNMENT_AREAS}) THEN 'Government'
    WHEN UPPER(TRIM(normalized_area)) IN (${SECTOR_INTERNAL_AREAS}) THEN 'Internal'
    WHEN proposed_area_type = 'territory' OR UPPER(TRIM(normalized_area)) IN (${SECTOR_PRIVATE_AREAS}) THEN 'Private'
    ELSE 'Unknown' END`
  const sectorClause = sector === 'All' ? '' : `AND (${sectorExpression}) = ${sqlString(sector, 'sector')}`
  const productClause = product ? `AND normalized_product = ${sqlString(product, 'product')}` : ''
  const where = `${OBSERVED_FACT} ${sectorClause} ${productClause}`
  const eligible = metric === 'quantity' ? 'is_quantity_observation_eligible' : 'is_net_sales_eligible'
  const measure = metric === 'quantity' ? 'quantity' : 'net_sales'
  const firstOpen = periodName(manilaMonth())
  const counts = await query(`SELECT COUNT(DISTINCT month_start) AS months,
    COUNT(DISTINCT CASE WHEN month_start >= DATE '${firstOpen}-01' THEN month_start END) AS not_closed
    FROM ${FACT} WHERE ${where}`, 1)
  const count = numberValue(counts[0]?.months, -1)
  try {
    const rows = await reconciledPages(count, (offset, size) => query(`SELECT DATE_FORMAT(month_start, 'yyyy-MM') AS period,
      SUM(CASE WHEN ${eligible} THEN ${measure} END) AS actual,
      COUNT(*) AS source_rows, SUM(CASE WHEN ${eligible} AND ${measure} IS NOT NULL THEN 1 ELSE 0 END) AS eligible_rows
      FROM ${FACT} WHERE ${where}
      GROUP BY month_start ORDER BY month_start LIMIT ${size} OFFSET ${offset}`, size), row => String(row.period))
    // First release has no approved SKU scope. Do not enumerate thousands of raw
    // labels as selectable forecast products (or delay company evidence to do so).
    const products: Array<{ product: string }> = []
    return { rows, products, excludedNotClosed: numberValue(counts[0]?.not_closed) }
  } catch (error) {
    throw new DatabricksSourceUnavailableError(error instanceof Error ? error.message : 'Forecast extraction failed')
  }
}

export async function getDatabricksForecastValidation(input: { sector?: string; product?: string; metric?: string }) {
  const sector = input.sector?.trim() || 'All'
  const product = input.product?.trim() || ''
  const metric = input.metric?.trim() || 'revenue'
  const scoped = await scopedMonthlySeries(sector, product, metric)
  const closed = currentClosedMonth()
  const observations = scoped.rows.filter(row => row.period && monthNumber(row.period) <= closed)
    .map(row => ({ period: row.period as string, actual: nullableNumber(row.actual),
      missing_reason: nullableNumber(row.actual) === null ? 'ineligible_or_missing_measure' : null,
      reporting_coverage_status: 'unverified', period_closed: true }))
  const series = new Map(observations.filter(row => row.actual !== null).map(row => [monthNumber(row.period), row.actual!]))
  const origin = series.size ? Math.max(...series.keys()) : null
  const views: Record<string, unknown> = {}
  // Scope expansion requires separate approved catalog and mapping evidence.
  const scopeSupported = metric === 'revenue' && sector === 'All' && !product
  if (origin !== null && scopeSupported) {
    for (const horizon of [3, 6, 12]) views[String(horizon)] = benchmarkView(series, origin, horizon,
      'company', 'recorded_net_sales', closed + 1)
  }
  const limitations = ['Monthly reporting completeness is unverified; benchmarks are exploratory retrospective evidence.',
    'No approved predictive release or validated future lead range is available.',
    'Revised historical data does not reconstruct information available at historical origins.']
  if (!scopeSupported) limitations.push('This scope requires approved mapping, product identity, unit and coverage evidence before model evaluation.')
  const source = databricksSource(scoped.rows, {
    as_of: new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10),
    input_rows: scoped.rows.length, included_rows: observations.length, scoped_rows: scoped.rows.length,
    excluded: { not_closed: scoped.excludedNotClosed }, excluded_not_closed: scoped.excludedNotClosed,
    excluded_outside_history: 0, reporting_coverage_status: 'unverified',
    buyer_mapping_status: sector === 'All' ? 'not_applicable' : 'proposed_review_pending',
  })
  return {
    schema_version: 'forecast-validation.v2',
    scope: { sector, product, metric, unit: metric === 'quantity' ? 'delivered source units' : '₱ net sales' },
    products: scoped.products.map(row => row.product).filter(Boolean), models: scopeSupported ? benchmarkNames : {},
    status: !scopeSupported ? 'blocked' : observations.length ? 'exploratory' : 'empty',
    publication_status: 'unpublished', reporting_coverage_status: 'unverified', evaluation_protocol: evaluationProtocol,
    limitations, source, actuals: observations, views,
    origin: origin === null ? null : periodName(origin), last_actual_period: origin === null ? null : periodName(origin),
      months_since_origin: origin === null ? null : Math.max(0, closed - origin),
    observed_months: series.size, display_start: periodName(closed + 1), validated_lead_range: null,
  }
}
export async function getDatabricksExternalRegression(input: Record<string, string | undefined>) {
  const sector = input.sector?.trim() || 'Unknown'
  const territory = input.territory?.trim() || 'Quezon'
  const product = input.product?.trim() || ''
  const metric = input.metric?.trim() || 'revenue'
  const mode = input.mode?.trim() || 'disease'
  const provider = input.provider?.trim() || 'PAGASA'
  const disease = input.disease?.trim() || 'Dengue'
  const lag = integerValue(input.lag ?? 1, 'lag', 1, 12)
  const rainfallLag = integerValue(input.rainfall_lag ?? 1, 'rainfall_lag', 1, 12)
  validateSector(sector)
  if (!['revenue', 'quantity'].includes(metric)) throw new DatabricksDashboardInputError('Invalid metric')
  if (!['disease', 'rainfall', 'combined'].includes(mode)) throw new DatabricksDashboardInputError('Invalid external model')
  const [coverage, products, signals, territories] = await Promise.all([
    query(`SELECT COUNT(DISTINCT month_start) AS sales_months FROM ${FACT}
      WHERE ${OBSERVED_FACT} AND proposed_area_type = 'territory'
        AND UPPER(COALESCE(territory, normalized_area)) = UPPER(${sqlString(territory, 'territory')})`, 5),
    query(`SELECT normalized_product AS product,
      SUM(CASE WHEN is_net_sales_eligible THEN COALESCE(net_sales, 0) ELSE 0 END) AS revenue
      FROM ${FACT}
      WHERE ${OBSERVED_FACT} AND proposed_area_type = 'territory'
        AND UPPER(COALESCE(territory, normalized_area)) = UPPER(${sqlString(territory, 'territory')})
      GROUP BY normalized_product ORDER BY revenue DESC LIMIT 5000`, 5000),
    query(`SELECT source, signal, COUNT(*) AS months,
      SUM(CASE WHEN is_external_join_ready THEN 1 ELSE 0 END) AS ready_months
      FROM ${EXTERNAL} WHERE territory = ${sqlString(territory, 'territory')}
      GROUP BY source, signal ORDER BY source, signal`, 100),
    query(`SELECT DISTINCT INITCAP(COALESCE(territory, normalized_area)) AS territory
      FROM ${FACT} WHERE ${OBSERVED_FACT} AND proposed_area_type = 'territory'
      ORDER BY territory`, 100),
  ])
  const readyMonths = signals.reduce((sum, row) => sum + numberValue(row.ready_months), 0)
  return {
    status: 'blocked',
    reason: readyMonths === 0
      ? 'Databricks has no approved external territory joins. Regression remains unavailable until the mapping review is published.'
      : 'No approved Databricks regression model is published for this scope.',
    scope: { sector, territory, product, metric, mode, provider, disease, lag, rainfall_lag: rainfallLag, unit: metric === 'quantity' ? 'delivered source units' : '₱ net sales' },
    products: products.map((row) => row.product).filter(Boolean),
    territories: territories.map((row) => row.territory).filter(Boolean),
    sources: signals.map((row) => ({ provider: row.source, status: `${row.ready_months}/${row.months} Databricks months join-ready`, file: `workspace.medshield_gold.vw_dss_external_signals_candidate`, checksum: checksum(row) })),
    sales_source: databricksSource(coverage),
    coefficients: [],
    evaluation: [],
    metrics: {},
    coverage: {
      sales_months: numberValue(coverage[0]?.sales_months),
      matched_months: 0,
      training_months: 0,
      holdout_months: 0,
      signals: signals.map((row) => ({ provider: row.source, signal: row.signal, months: numberValue(row.ready_months) })),
    },
  }
}

export async function getDatabricksPlanningShortlist(input: { sector?: string; territory?: string }) {
  const sector = input.sector?.trim() || 'Unknown'
  const territory = input.territory?.trim() || 'all'
  validateSector(sector)
  const territories = await query(`SELECT DISTINCT INITCAP(COALESCE(territory, normalized_area)) AS territory
    FROM ${FACT} WHERE ${OBSERVED_FACT} AND proposed_area_type = 'territory'
    ORDER BY territory`, 100)

  const sectorClause = sectorWhereClause(sector)

  const territoryClause = territory === 'all'
    ? ''
    : `AND proposed_area_type = 'territory' AND UPPER(COALESCE(territory, normalized_area)) = UPPER(${sqlString(territory, 'territory')})`
  const bounds = await query(`SELECT DATE_FORMAT(MAX(month_start), 'yyyy-MM') AS period_end FROM ${FACT} WHERE ${OBSERVED_FACT} ${sectorClause} ${territoryClause}`, 5)
  const end = bounds[0]?.period_end
  if (!end) {
    return { scope: { sector, territory }, source: databricksSource([]), products: [], period_start: null, period_end: null, months_stale: null, eligible_products: 0, excluded_nonpositive_products: 0, shortlist_share_pct: 0, ranking_revenue: 0, territories: territories.map((row) => row.territory).filter(Boolean) }
  }
  const start = periodName(monthNumber(end) - 11)
  const productRows = await query(`SELECT normalized_product AS product,
    SUM(CASE WHEN is_net_sales_eligible THEN net_sales ELSE 0 END) AS revenue,
    SUM(CASE WHEN is_quantity_observation_eligible THEN quantity ELSE 0 END) AS quantity,
    COUNT(DISTINCT month_start) AS observed_months
    FROM ${FACT} WHERE ${OBSERVED_FACT} ${sectorClause} ${territoryClause}
      AND DATE_FORMAT(month_start, 'yyyy-MM') BETWEEN ${sqlString(start, 'period_start')} AND ${sqlString(end, 'period_end')}
    GROUP BY normalized_product ORDER BY revenue DESC`, 5000)
  const positive = productRows.filter((row) => numberValue(row.revenue) > 0)
  const rankingRevenue = positive.reduce((sum, row) => sum + numberValue(row.revenue), 0)
  const count = Math.min(5, Math.ceil(positive.length * 0.2))
  const selected = positive.slice(0, count)
  const source = databricksSource(productRows, { input_rows: productRows.length, included_rows: productRows.length, excluded: {} })
  return {
    scope: { sector, territory },
    source,
    products: selected.map((row) => ({ product: row.product, revenue: numberValue(row.revenue), quantity: numberValue(row.quantity), observed_months: numberValue(row.observed_months), revenue_share_pct: rankingRevenue ? numberValue(row.revenue) / rankingRevenue * 100 : 0 })),
    period_start: start,
    period_end: end,
    months_stale: Math.max(0, currentClosedMonth() - monthNumber(end)),
    eligible_products: positive.length,
    excluded_nonpositive_products: productRows.length - positive.length,
    shortlist_share_pct: rankingRevenue ? selected.reduce((sum, row) => sum + numberValue(row.revenue), 0) / rankingRevenue * 100 : 0,
    ranking_revenue: rankingRevenue,
    territories: territories.map((row) => row.territory).filter(Boolean),
  }
}

export async function solveDatabricksPlanningScenario(body: Record<string, unknown>) {
  if (body.acknowledged !== true) throw new DatabricksDashboardInputError('Confirm that inputs are scenario assumptions for review')
  const scope = body.scope as { sector?: string; territory?: string } | undefined
  if (!scope) throw new DatabricksDashboardInputError('Planning scope is required')
  const shortlist = await getDatabricksPlanningShortlist(scope)
  if (body.checksum !== shortlist.source.checksum) throw new DatabricksDashboardInputError('Databricks source changed; reload the shortlist')
  const horizon = integerValue(body.horizon, 'Planning horizon', 1, 12)
  if (![1, 3, 6, 12].includes(horizon)) throw new DatabricksDashboardInputError('Unsupported planning horizon')
  const budget = decimalValue(body.budget, 'Budget', 0, 1_000_000_000)
  const minimum = decimalValue(body.minimum_pct, 'Minimum fulfillment', 0, 100)
  const rawItems = body.items
  if (!Array.isArray(rawItems) || rawItems.length !== shortlist.products.length) throw new DatabricksDashboardInputError('Inputs must match the Databricks shortlist')
  const expected = new Set(shortlist.products.map((row) => row.product))
  const items = rawItems.map((raw) => {
    if (!raw || typeof raw !== 'object') throw new DatabricksDashboardInputError('Invalid planning item')
    const row = raw as Record<string, unknown>
    const product = String(row.product ?? '')
    if (!expected.has(product)) throw new DatabricksDashboardInputError('Planning product is not in the current Databricks shortlist')
    const demand = integerValue(row.demand, 'Demand', 1, 1_000_000_000)
    const stock = integerValue(row.stock, 'Stock', 0, 1_000_000_000)
    const reserve = integerValue(row.reserve, 'Protected stock', 0, stock)
    const pack = integerValue(row.pack, 'Units per pack', 1, 1_000_000_000)
    const packCost = decimalValue(row.pack_cost, 'Pack cost', 0.01, 1_000_000_000)
    const maxPacks = integerValue(row.max_packs, 'Supplier limit', 0, 100_000)
    return { product, demand, stock, reserve, pack, pack_cost_cents: Math.round(packCost * 100), max_packs: maxPacks, available: stock - reserve, purchase_packs: 0, fulfilled: 0 }
  })
  let remainingCents = Math.round(budget * 100)
  const conflicts: string[] = []
  for (const item of items) {
    const required = Math.ceil(item.demand * minimum / 100)
    const minimumPacks = Math.max(0, Math.ceil((required - item.available) / item.pack))
    if (minimumPacks > item.max_packs) conflicts.push(`${item.product}: supplier limit cannot meet minimum fulfillment`)
    const cost = minimumPacks * item.pack_cost_cents
    if (cost > remainingCents) conflicts.push(`${item.product}: budget cannot meet minimum fulfillment`)
    if (!conflicts.length) {
      item.purchase_packs = minimumPacks
      remainingCents -= cost
      item.fulfilled = Math.min(item.demand, item.available + minimumPacks * item.pack)
    }
  }
  if (conflicts.length) return { status: 'infeasible', conflicts, rows: [] }
  for (let step = 0; step < 100_000; step += 1) {
    const candidates = items
      .filter((item) => item.fulfilled < item.demand && item.purchase_packs < item.max_packs && item.pack_cost_cents <= remainingCents)
      .sort((left, right) => left.fulfilled / left.demand - right.fulfilled / right.demand || left.product.localeCompare(right.product))
    const item = candidates[0]
    if (!item) break
    item.purchase_packs += 1
    remainingCents -= item.pack_cost_cents
    item.fulfilled = Math.min(item.demand, item.available + item.purchase_packs * item.pack)
  }
  const rows = items.map((item) => {
    const purchaseUnits = item.purchase_packs * item.pack
    const spend = item.purchase_packs * item.pack_cost_cents / 100
    return {
      ...item,
      purchase_units: purchaseUnits,
      unmet: item.demand - item.fulfilled,
      fulfillment_pct: item.fulfilled / item.demand * 100,
      spend,
      ending_stock: item.stock + purchaseUnits - item.fulfilled,
      binding: [item.fulfilled === item.demand ? 'Demand satisfied' : '', item.purchase_packs === item.max_packs ? 'Supplier cap' : ''].filter(Boolean),
    }
  })
  const spent = rows.reduce((sum, row) => sum + row.spend, 0)
  return {
    status: 'scenario_allocation',
    rows,
    budget,
    spent,
    remaining: budget - spent,
    mean_fulfillment_pct: rows.reduce((sum, row) => sum + row.fulfillment_pct, 0) / Math.max(rows.length, 1),
    budget_binding: remainingCents === 0,
    assumptions: { horizon, minimum_pct: minimum, scope, checksum: body.checksum, objective: 'Balance product fulfillment under entered scenario constraints', status: 'Scenario only; Databricks supplies historical shortlist evidence' },
  }
}

function pearsonCorrelation(pairs: Array<[number, number]>): number | null {
  if (pairs.length < 3) return null
  const xMean = pairs.reduce((sum, [x]) => sum + x, 0) / pairs.length
  const yMean = pairs.reduce((sum, [, y]) => sum + y, 0) / pairs.length
  let numerator = 0
  let xSquares = 0
  let ySquares = 0
  for (const [x, y] of pairs) {
    const xDelta = x - xMean
    const yDelta = y - yMean
    numerator += xDelta * yDelta
    xSquares += xDelta * xDelta
    ySquares += yDelta * yDelta
  }
  const denominator = Math.sqrt(xSquares * ySquares)
  return denominator ? Number((numerator / denominator).toFixed(4)) : null
}

async function getNasaPowerWeatherEffects(year: string, area: string) {
  try {
    const available = await executeDatabricksStatement(
      "SHOW TABLES IN `workspace`.`medshield_gold` LIKE 'vw_weather_nasa_power_monthly_candidate'",
      { rowLimit: 5 },
    )
    if (!available.rows.length) {
      return {
        metadata: {
          provider: 'nasa_power', grain: 'monthly', period_start: null, period_end: null,
          rows_returned: 0, sales_matched_rows: 0,
          source: 'workspace.medshield_gold.vw_weather_nasa_power_monthly_candidate',
          system_of_record: 'databricks',
    release: activeRelease, status: 'not_refreshed',
        },
        summary: [{ periods: 0, sales_matched_periods: 0, rainfall_revenue_correlation: null }],
        rows: [],
      }
    }

    const clauses = ["weather.provider = 'nasa_power'"]
    if (year !== 'all') clauses.push(`YEAR(weather.period_start) = ${Number(year)}`)
    if (area !== 'all') clauses.push(`weather.territory = ${sqlString(area, 'area')}`)
    const result = await executeDatabricksStatement(`WITH monthly_sales AS (
      SELECT month_start AS period_start,
        COALESCE(territory, normalized_area) AS territory,
        SUM(CASE WHEN is_net_sales_eligible THEN net_sales ELSE 0 END) AS sales_revenue
      FROM ${FACT}
      WHERE ${OBSERVED_FACT} AND proposed_area_type = 'territory'
      GROUP BY month_start, COALESCE(territory, normalized_area)
    )
    SELECT DATE_FORMAT(weather.period_start, 'yyyy-MM') AS period,
      weather.territory, weather.provider, weather.rainfall_mm, weather.rainy_days,
      weather.avg_temperature_c, weather.avg_relative_humidity_pct,
      weather.max_wind_speed_kph, weather.rainfall_severity_proxy,
      weather.weather_alert_level, weather.fetched_at,
      sales.sales_revenue
    FROM ${NASA_WEATHER} AS weather
    LEFT JOIN monthly_sales AS sales
      ON sales.period_start = weather.period_start
        AND UPPER(sales.territory) = UPPER(weather.territory)
    WHERE ${clauses.join(' AND ')}
    ORDER BY weather.period_start, weather.territory`, { rowLimit: 5000, timeoutMs: 120_000 })

    const rows = result.rows.map((row) => ({
      period: row.period,
      area: row.territory,
      provider: row.provider,
      rainfall_mm: numberValue(row.rainfall_mm),
      rainy_days: numberValue(row.rainy_days),
      avg_temperature_c: nullableNumber(row.avg_temperature_c),
      avg_relative_humidity_pct: nullableNumber(row.avg_relative_humidity_pct),
      max_wind_speed_kph: nullableNumber(row.max_wind_speed_kph),
      rainfall_severity_proxy: numberValue(row.rainfall_severity_proxy),
      weather_alert_level: row.weather_alert_level ?? 'unavailable',
      sales_revenue: nullableNumber(row.sales_revenue),
      planning_demand_uplift_pct: null,
      fetched_at: row.fetched_at,
      mapping_status: row.sales_revenue == null ? 'weather_only' : 'territory_month_matched',
    }))
    const pairs = rows.flatMap((row) =>
      row.sales_revenue == null ? [] : [[row.rainfall_mm, row.sales_revenue] as [number, number]],
    )
    return {
      metadata: {
        provider: 'nasa_power', grain: 'monthly',
        period_start: rows[0]?.period ?? null,
        period_end: rows.at(-1)?.period ?? null,
        rows_returned: rows.length,
        sales_matched_rows: pairs.length,
        source: 'workspace.medshield_gold.vw_weather_nasa_power_monthly_candidate',
        system_of_record: 'databricks',
    release: activeRelease, status: 'live',
      },
      summary: [{
        periods: rows.length,
        sales_matched_periods: pairs.length,
        rainfall_revenue_correlation: pearsonCorrelation(pairs),
      }],
      rows,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Databricks error'
    throw new DatabricksSourceUnavailableError(message)
  }
}

export async function getDatabricksWeatherEffects(input: { year?: string; area?: string; grain?: string; provider?: string }) {
  const year = input.year?.trim() || 'all'
  const area = input.area?.trim() || 'all'
  const grain = input.grain?.trim() || 'monthly'
  const provider = input.provider?.trim() || 'PAGASA'
  if (grain !== 'monthly') throw new DatabricksDashboardInputError('Databricks Gold currently publishes monthly weather observations only')
  if (!['PAGASA', 'nasa_power'].includes(provider)) {
    throw new DatabricksDashboardInputError('Weather provider must be PAGASA or nasa_power')
  }
  if (year !== 'all') validateYearFilter(year, 'weather year')
  if (provider === 'nasa_power') return getNasaPowerWeatherEffects(year, area)

  const clauses = [`signal_family = 'WEATHER'`]
  if (year !== 'all') {
    clauses.push(`YEAR(period_start) = ${Number(year)}`)
  }
  if (area !== 'all') clauses.push(`territory = ${sqlString(area, 'area')}`)
  const rows = await query(`SELECT period, territory, source, signal_value, observation_status,
    mapping_status, is_external_join_ready FROM ${EXTERNAL}
    WHERE ${clauses.join(' AND ')} ORDER BY period, territory`, 5000)
  return {
    metadata: {
      provider: 'PAGASA', grain: 'monthly',
      period_start: rows[0]?.period ?? null,
      period_end: rows.at(-1)?.period ?? null,
      rows_returned: rows.length,
      sales_matched_rows: rows.filter((row) => row.is_external_join_ready === 'true').length,
      source: 'workspace.medshield_gold.vw_dss_external_signals_candidate',
      system_of_record: 'databricks',
    release: activeRelease, status: 'live',
    },
    summary: [{ periods: rows.length, sales_matched_periods: 0, rainfall_revenue_correlation: null }],
    rows: rows.map((row) => ({
      period: row.period,
      area: row.territory,
      provider: row.source,
      rainfall_mm: numberValue(row.signal_value),
      rainy_days: null,
      avg_temperature_c: null,
      avg_relative_humidity_pct: null,
      max_wind_speed_kph: null,
      rainfall_severity_proxy: numberValue(row.signal_value),
      weather_alert_level: row.observation_status ?? 'unavailable',
      sales_revenue: null,
      planning_demand_uplift_pct: null,
      mapping_status: row.mapping_status,
    })),
  }
}

/** Optional STL capability fails independently from financial reporting. */
export async function getDatabricksStl() {
  const release = await descriptiveRelease()
  const rows = await query(`SELECT period, observed, trend, seasonal, residual, segment_start, segment_end,
    dataset_id, policy_version, area_mapping_sha256, product_master_sha256, fact_delta_version, parameters_json, input_sha256, publication_status
    FROM ${GOLD}.sales_restart_stl_candidate
    WHERE fact_delta_version = ${release.fact_delta_version}
      AND dataset_id = ${sqlString(release.dataset_id, 'dataset')}
      AND policy_version = ${sqlString(release.policy_version, 'policy')}
    ORDER BY period`, 2400)
  if (!rows.length) throw new DatabricksSourceUnavailableError('No published STL for the active descriptive fact version')
  if (new Set(rows.map(row => row.input_sha256)).size !== 1 || new Set(rows.map(row => row.period)).size !== rows.length) throw new DatabricksSourceUnavailableError('Ambiguous STL publication')
  if (rows.some(row => row.area_mapping_sha256 !== release.area_mapping_sha256 || row.product_master_sha256 !== release.product_master_sha256) || new Set(rows.map(row => row.parameters_json)).size !== 1) throw new DatabricksSourceUnavailableError('STL mapping or parameter identity does not match the active release')
  const components = rows.map(row => ({ ...row, observed: nullableNumber(row.observed), trend: nullableNumber(row.trend), seasonal: nullableNumber(row.seasonal), residual: nullableNumber(row.residual) }))
  if (components.some(row => [row.observed, row.trend, row.seasonal, row.residual].some(v => v == null) || Math.abs(row.observed! - row.trend! - row.seasonal! - row.residual!) > 0.000001)) throw new DatabricksSourceUnavailableError('Invalid STL components')
  return { method: 'STL', metric: 'Eligible net sales (PHP)', release, parameters: JSON.parse(rows[0].parameters_json!), rows: components, source: databricksSource(rows) }
}
