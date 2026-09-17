import { createHash } from 'node:crypto'
import { executeDatabricksStatement } from './databricks'

const GOLD = '`workspace`.`medshield_gold`'
const FACT = `${GOLD}.\`sales_restart_fact_candidate\``
const MONTHLY = `${GOLD}.\`vw_dashboard_monthly_sales_candidate\``
const YEARLY = `${GOLD}.\`vw_dashboard_yearly_sales_candidate\``
const AREA_YEARLY = `${GOLD}.\`vw_dashboard_area_yearly_candidate\``
const PRODUCT_YEARLY = `${GOLD}.\`vw_dashboard_product_yearly_candidate\``
const EXTERNAL = `${GOLD}.\`vw_dss_external_signals_candidate\``
const SOURCE_NAME = 'workspace.medshield_gold.sales_restart_fact_candidate'
const HISTORY_START = '2017-01'
const HISTORY_END = '2025-12'
const OBSERVED_FACT = 'is_analysis_candidate = TRUE'

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
  const now = new Date()
  return now.getUTCFullYear() * 12 + now.getUTCMonth() - 1
}

function metricSummary(pairs: Array<[number, number]>) {
  if (!pairs.length) return { n: 0, mae: null, rmse: null, wape: null, bias: null }
  const errors = pairs.map(([actual, predicted]) => predicted - actual)
  const absolute = errors.map(Math.abs)
  const actualTotal = pairs.reduce((sum, [actual]) => sum + Math.abs(actual), 0)
  return {
    n: pairs.length,
    mae: absolute.reduce((sum, value) => sum + value, 0) / pairs.length,
    rmse: Math.sqrt(errors.reduce((sum, value) => sum + value * value, 0) / pairs.length),
    wape: actualTotal ? absolute.reduce((sum, value) => sum + value, 0) / actualTotal * 100 : null,
    bias: errors.reduce((sum, value) => sum + value, 0) / pairs.length,
  }
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

async function query(statement: string, rowLimit = 1000): Promise<Row[]> {
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
    ...extra,
  }
}

export async function loadDatabricksDashboardSnapshot() {
  const [yearly, monthly, areas, products, seasonality, external] = await Promise.all([
    query(`SELECT calendar_year, transaction_count, distinct_dr_count, distinct_area_count,
      distinct_product_count, warning_transaction_count, total_quantity_candidate,
      net_sales_candidate, gross_margin_candidate, weighted_gross_margin_pct_candidate,
      financial_definition_status
      FROM ${YEARLY} ORDER BY calendar_year`, 20),
    query(`SELECT year_month, month_number, month_short_name, has_sales_activity,
      transaction_count, COALESCE(net_sales_candidate, 0) AS net_sales_candidate,
      COALESCE(gross_margin_candidate, 0) AS gross_margin_candidate
      FROM ${MONTHLY} ORDER BY year_month`, 150),
    query(`SELECT CASE WHEN area_name = 'LOWER CAVITE' THEN 'CAVITE' ELSE area_name END AS area_name,
      SUM(transaction_count) AS transaction_count,
      SUM(COALESCE(net_sales_candidate, 0)) AS revenue,
      SUM(COALESCE(gross_margin_candidate, 0)) AS income
      FROM ${AREA_YEARLY} WHERE has_sales_activity = TRUE
      GROUP BY CASE WHEN area_name = 'LOWER CAVITE' THEN 'CAVITE' ELSE area_name END ORDER BY revenue DESC`, 100),
    query(`SELECT product_name, SUM(transaction_count) AS transaction_count,
      SUM(COALESCE(total_quantity_candidate, 0)) AS qty,
      SUM(COALESCE(net_sales_candidate, 0)) AS revenue,
      SUM(COALESCE(gross_margin_candidate, 0)) AS income
      FROM ${PRODUCT_YEARLY}
      GROUP BY product_name ORDER BY revenue DESC LIMIT 15`, 20),
    query(`SELECT month_number, MAX(month_short_name) AS month,
      AVG(COALESCE(net_sales_candidate, 0)) AS avg_revenue
      FROM ${MONTHLY} GROUP BY month_number ORDER BY month_number`, 20),
    query(`SELECT period, territory,
      AVG(CASE WHEN signal_family = 'DISEASE' THEN signal_value END) AS disease_intensity_index,
      AVG(CASE WHEN signal_family = 'WEATHER' THEN signal_value END) AS rainfall_severity_index
      FROM ${EXTERNAL}
      WHERE is_external_join_ready = TRUE AND is_forecast_eligible = TRUE
      GROUP BY period, territory ORDER BY period, territory`, 5000),
  ])

  if (yearly.length !== 9 || monthly.length !== 108) {
    throw new DatabricksSourceUnavailableError(
      `Databricks Gold contract expected 9 yearly and 108 monthly rows; received ${yearly.length} and ${monthly.length}`,
    )
  }

  const totalRevenue = yearly.reduce((sum, row) => sum + numberValue(row.net_sales_candidate), 0)
  const totalIncome = yearly.reduce((sum, row) => sum + numberValue(row.gross_margin_candidate), 0)
  const totalTransactions = yearly.reduce((sum, row) => sum + numberValue(row.transaction_count), 0)

  const byArea = areas.map((row) => ({
    area: row.area_name ?? 'Unspecified',
    revenue: numberValue(row.revenue),
    income: numberValue(row.income),
  }))
  const topProducts = products.map((row, index) => ({
    product: row.product_name ?? 'Unspecified',
    revenue: numberValue(row.revenue),
    income: numberValue(row.income),
    qty: numberValue(row.qty),
    abc: index < 3 ? 'A' : index < 8 ? 'B' : 'C',
    pct_of_total: totalRevenue ? numberValue(row.revenue) / totalRevenue * 100 : 0,
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
    },
    totals: {
      total_revenue: totalRevenue,
      total_income: totalIncome,
      total_transactions: totalTransactions,
      avg_margin: totalRevenue ? totalIncome / totalRevenue * 100 : 0,
    },
    monthly: monthly.map((row) => ({
      period: row.year_month,
      revenue: numberValue(row.net_sales_candidate),
      income: numberValue(row.gross_margin_candidate),
    })),
    by_area: byArea,
    top_products: topProducts,
    year_summary: yearly.map((row) => ({
      year: row.calendar_year,
      revenue: numberValue(row.net_sales_candidate),
      income: numberValue(row.gross_margin_candidate),
      transactions: numberValue(row.transaction_count),
    })),
    seasonality: seasonality.map((row) => ({
      month: row.month,
      avg_revenue: numberValue(row.avg_revenue),
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
      0 AS duplicate_rows,
      SUM(CASE WHEN COALESCE(SIZE(quality_rule_codes), 0) > 0 THEN 1 ELSE 0 END) AS rows_with_warnings,
      SUM(CASE WHEN COALESCE(SIZE(quality_rule_codes), 0) = 0 THEN 1 ELSE 0 END) AS valid_rows,
      COUNT(DISTINCT normalized_product) AS unique_products,
      COUNT(DISTINCT dr_number) AS unique_dr_numbers,
      MIN(date_delivered) AS source_period_start,
      MAX(date_delivered) AS source_period_end,
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
    if (!/^(201[7-9]|202[0-5])$/.test(year)) throw new DatabricksDashboardInputError('year must be all or 2017-2025')
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
      CASE WHEN SUM(CASE WHEN is_net_sales_eligible THEN COALESCE(net_sales, 0) ELSE 0 END) <> 0
        THEN 100 * SUM(CASE WHEN is_gross_margin_eligible THEN COALESCE(gross_margin_amount, 0) ELSE 0 END)
          / SUM(CASE WHEN is_net_sales_eligible THEN COALESCE(net_sales, 0) ELSE 0 END) END AS gross_margin_rate,
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

export async function getDatabricksSalesHeatmap() {
  const [products, monthly] = await Promise.all([
    query(`SELECT normalized_product AS product_name,
      MAX(reference_mapping_status) AS mapping_status
      FROM ${FACT}
      WHERE ${OBSERVED_FACT} AND normalized_product IS NOT NULL
      GROUP BY normalized_product ORDER BY normalized_product`, 5000),
    query(`SELECT normalized_product AS product,
      DATE_FORMAT(month_start, 'yyyy-MM') AS period,
      CASE WHEN normalized_area = 'LOWER CAVITE' THEN 'CAVITE' ELSE normalized_area END AS area,
      SUM(quantity) AS quantity, COUNT(*) AS row_count
      FROM ${FACT}
      WHERE ${OBSERVED_FACT} AND is_quantity_observation_eligible = TRUE
      GROUP BY normalized_product, month_start,
        CASE WHEN normalized_area = 'LOWER CAVITE' THEN 'CAVITE' ELSE normalized_area END
      ORDER BY normalized_product, month_start, area`, 30_000),
  ])
  return {
    products: products.map((row) => ({
      id: row.product_name,
      label: row.product_name,
      category: 'Unclassified',
      mapping_status: row.mapping_status ?? 'unmapped',
      unit: 'source units',
      pack_size: '',
    })),
    monthly: monthly.map((row) => ({
      product: row.product,
      period: row.period,
      area: row.area,
      quantity: numberValue(row.quantity),
      row_count: numberValue(row.row_count),
    })),
    source: databricksSource(monthly, {
      input_rows: monthly.reduce((sum, row) => sum + numberValue(row.row_count), 0),
      included_rows: monthly.reduce((sum, row) => sum + numberValue(row.row_count), 0),
      excluded: {},
      metric: 'Delivered quantity sold in source units from Databricks Gold',
      missing_months: 'Unobserved, not zero',
      estimated_rows: 'Excluded by the Gold fact contract',
    }),
  }
}

export async function getDatabricksSalesSectors() {
  const rows = await query(`SELECT normalized_product AS product,
    DATE_FORMAT(month_start, 'yyyy-MM') AS period,
    CASE
      WHEN UPPER(TRIM(normalized_area)) IN ('GOVERNMENT', 'PAGBILAO') THEN 'Government'
      WHEN UPPER(TRIM(normalized_area)) IN ('ADMIN', 'SUPPLIES', 'SUPPLLIES', 'EQUIPMENT', 'SUPPLIES AND EQUIPMENT', 'PERSONAL', 'LOSSES') THEN 'Internal'
      WHEN proposed_area_type = 'territory' OR UPPER(TRIM(normalized_area)) IN ('CAVITE', 'LOWER CAVITE', 'BATANGAS', 'QUEZON', 'LAGUNA', 'MARINDUQUE', 'CAMARINES NORTE', 'CAM NORTE', 'CAMARINES SUR', 'CAM SUR', 'ALBAY', 'LEGASPI', 'LAGASPI', 'BICOL', 'MINDORO', 'HOSPITAL', 'HOPITAL', 'PHARMA', 'LUCENA', 'RAKKK', 'EAST', 'EASTERN', 'EASTERN QUEZON') THEN 'Private'
      ELSE 'Unknown'
    END AS sector,
    CASE
      WHEN UPPER(TRIM(normalized_area)) IN ('CAVITE', 'LOWER CAVITE') OR UPPER(TRIM(COALESCE(territory, ''))) IN ('LOWER CAVITE', 'CAVITE') THEN 'Cavite'
      WHEN UPPER(TRIM(normalized_area)) IN ('BATANGAS') OR UPPER(TRIM(COALESCE(territory, ''))) = 'BATANGAS' THEN 'Batangas'
      WHEN UPPER(TRIM(normalized_area)) IN ('QUEZON', 'PAGBILAO', 'HOSPITAL', 'HOPITAL', 'PHARMA', 'LUCENA', 'RAKKK', 'EAST', 'EASTERN', 'EASTERN QUEZON') OR UPPER(TRIM(COALESCE(territory, ''))) = 'QUEZON' THEN 'Quezon'
      WHEN UPPER(TRIM(normalized_area)) IN ('LAGUNA') OR UPPER(TRIM(COALESCE(territory, ''))) = 'LAGUNA' THEN 'Laguna'
      WHEN UPPER(TRIM(normalized_area)) IN ('MARINDUQUE') OR UPPER(TRIM(COALESCE(territory, ''))) = 'MARINDUQUE' THEN 'Marinduque'
      WHEN UPPER(TRIM(normalized_area)) IN ('CAM NORTE', 'CAMARINES NORTE') OR UPPER(TRIM(COALESCE(territory, ''))) IN ('CAM NORTE', 'CAMARINES NORTE') THEN 'Camarines Norte'
      WHEN UPPER(TRIM(normalized_area)) IN ('CAM SUR', 'CAMARINES SUR', 'BICOL') OR UPPER(TRIM(COALESCE(territory, ''))) IN ('CAM SUR', 'CAMARINES SUR', 'BICOL') THEN 'Camarines Sur'
      WHEN UPPER(TRIM(normalized_area)) IN ('ALBAY', 'LEGASPI', 'LAGASPI') OR UPPER(TRIM(COALESCE(territory, ''))) IN ('ALBAY', 'LEGASPI', 'LAGASPI') THEN 'Albay'
      WHEN UPPER(TRIM(normalized_area)) IN ('MINDORO') OR UPPER(TRIM(COALESCE(territory, ''))) = 'MINDORO' THEN 'Mindoro'
      WHEN proposed_area_type = 'territory' THEN INITCAP(COALESCE(territory, normalized_area))
      ELSE 'Unassigned geography'
    END AS territory,
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
      WHEN UPPER(TRIM(normalized_area)) = 'PAGBILAO' THEN 'Approved buyer mapping: Exact reference-backed LGU mapping from docs/MAPPED_CLIENT_REFERENCE.md record CLI-0340.'
      WHEN UPPER(TRIM(normalized_area)) = 'GOVERNMENT' THEN 'Explicit government, public hospital, or LGU label'
      WHEN UPPER(TRIM(normalized_area)) IN ('ADMIN', 'SUPPLIES', 'SUPPLLIES', 'EQUIPMENT', 'SUPPLIES AND EQUIPMENT', 'PERSONAL', 'LOSSES') THEN 'MedShield internal business label'
      WHEN proposed_area_type = 'territory' OR UPPER(TRIM(normalized_area)) IN ('CAVITE', 'LOWER CAVITE', 'BATANGAS', 'QUEZON', 'LAGUNA', 'MARINDUQUE', 'CAMARINES NORTE', 'CAM NORTE', 'CAMARINES SUR', 'CAM SUR', 'ALBAY', 'LEGASPI', 'LAGASPI', 'BICOL', 'MINDORO', 'HOSPITAL', 'HOPITAL', 'PHARMA', 'LUCENA', 'RAKKK', 'EAST', 'EASTERN', 'EASTERN QUEZON') THEN 'Approved buyer mapping: Provincial, private-care, pharmacy, or individual-account label from docs/MAPPED_CLIENT_REFERENCE.md'
      ELSE 'Buyer type unavailable'
    END AS basis,
    SUM(CASE WHEN is_net_sales_eligible THEN net_sales ELSE 0 END) AS revenue,
    SUM(CASE WHEN is_quantity_observation_eligible THEN quantity ELSE 0 END) AS quantity,
    COUNT(*) AS row_count
    FROM ${FACT} WHERE ${OBSERVED_FACT}
    GROUP BY normalized_product, month_start,
      CASE
        WHEN UPPER(TRIM(normalized_area)) IN ('GOVERNMENT', 'PAGBILAO') THEN 'Government'
        WHEN UPPER(TRIM(normalized_area)) IN ('ADMIN', 'SUPPLIES', 'SUPPLLIES', 'EQUIPMENT', 'SUPPLIES AND EQUIPMENT', 'PERSONAL', 'LOSSES') THEN 'Internal'
        WHEN proposed_area_type = 'territory' OR UPPER(TRIM(normalized_area)) IN ('CAVITE', 'LOWER CAVITE', 'BATANGAS', 'QUEZON', 'LAGUNA', 'MARINDUQUE', 'CAMARINES NORTE', 'CAM NORTE', 'CAMARINES SUR', 'CAM SUR', 'ALBAY', 'LEGASPI', 'LAGASPI', 'BICOL', 'MINDORO', 'HOSPITAL', 'HOPITAL', 'PHARMA', 'LUCENA', 'RAKKK', 'EAST', 'EASTERN', 'EASTERN QUEZON') THEN 'Private'
        ELSE 'Unknown'
      END,
      CASE
        WHEN UPPER(TRIM(normalized_area)) IN ('CAVITE', 'LOWER CAVITE') OR UPPER(TRIM(COALESCE(territory, ''))) IN ('LOWER CAVITE', 'CAVITE') THEN 'Cavite'
        WHEN UPPER(TRIM(normalized_area)) IN ('BATANGAS') OR UPPER(TRIM(COALESCE(territory, ''))) = 'BATANGAS' THEN 'Batangas'
        WHEN UPPER(TRIM(normalized_area)) IN ('QUEZON', 'PAGBILAO', 'HOSPITAL', 'HOPITAL', 'PHARMA', 'LUCENA', 'RAKKK', 'EAST', 'EASTERN', 'EASTERN QUEZON') OR UPPER(TRIM(COALESCE(territory, ''))) = 'QUEZON' THEN 'Quezon'
        WHEN UPPER(TRIM(normalized_area)) IN ('LAGUNA') OR UPPER(TRIM(COALESCE(territory, ''))) = 'LAGUNA' THEN 'Laguna'
        WHEN UPPER(TRIM(normalized_area)) IN ('MARINDUQUE') OR UPPER(TRIM(COALESCE(territory, ''))) = 'MARINDUQUE' THEN 'Marinduque'
        WHEN UPPER(TRIM(normalized_area)) IN ('CAM NORTE', 'CAMARINES NORTE') OR UPPER(TRIM(COALESCE(territory, ''))) IN ('CAM NORTE', 'CAMARINES NORTE') THEN 'Camarines Norte'
        WHEN UPPER(TRIM(normalized_area)) IN ('CAM SUR', 'CAMARINES SUR', 'BICOL') OR UPPER(TRIM(COALESCE(territory, ''))) IN ('CAM SUR', 'CAMARINES SUR', 'BICOL') THEN 'Camarines Sur'
        WHEN UPPER(TRIM(normalized_area)) IN ('ALBAY', 'LEGASPI', 'LAGASPI') OR UPPER(TRIM(COALESCE(territory, ''))) IN ('ALBAY', 'LEGASPI', 'LAGASPI') THEN 'Albay'
        WHEN UPPER(TRIM(normalized_area)) IN ('MINDORO') OR UPPER(TRIM(COALESCE(territory, ''))) = 'MINDORO' THEN 'Mindoro'
        WHEN proposed_area_type = 'territory' THEN INITCAP(COALESCE(territory, normalized_area))
        ELSE 'Unassigned geography'
      END,
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
      END,
      CASE
        WHEN UPPER(TRIM(normalized_area)) = 'PAGBILAO' THEN 'Approved buyer mapping: Exact reference-backed LGU mapping from docs/MAPPED_CLIENT_REFERENCE.md record CLI-0340.'
        WHEN UPPER(TRIM(normalized_area)) = 'GOVERNMENT' THEN 'Explicit government, public hospital, or LGU label'
        WHEN UPPER(TRIM(normalized_area)) IN ('ADMIN', 'SUPPLIES', 'SUPPLLIES', 'EQUIPMENT', 'SUPPLIES AND EQUIPMENT', 'PERSONAL', 'LOSSES') THEN 'MedShield internal business label'
        WHEN proposed_area_type = 'territory' OR UPPER(TRIM(normalized_area)) IN ('CAVITE', 'LOWER CAVITE', 'BATANGAS', 'QUEZON', 'LAGUNA', 'MARINDUQUE', 'CAMARINES NORTE', 'CAM NORTE', 'CAMARINES SUR', 'CAM SUR', 'ALBAY', 'LEGASPI', 'LAGASPI', 'BICOL', 'MINDORO', 'HOSPITAL', 'HOPITAL', 'PHARMA', 'LUCENA', 'RAKKK', 'EAST', 'EASTERN', 'EASTERN QUEZON') THEN 'Approved buyer mapping: Provincial, private-care, pharmacy, or individual-account label from docs/MAPPED_CLIENT_REFERENCE.md'
        ELSE 'Buyer type unavailable'
      END
    ORDER BY normalized_product, month_start, territory, channel`, 30_000)
  const includedRows = rows.reduce((sum, row) => sum + numberValue(row.row_count), 0)
  const unmappedRows = rows.filter((row) => row.sector === 'Unknown').reduce((sum, row) => sum + numberValue(row.row_count), 0)
  const expandedRows = rows.flatMap((row) => {
    const revenue = numberValue(row.revenue)
    const quantity = numberValue(row.quantity)
    const rowCount = numberValue(row.row_count)
    if (row.territory === 'Mindoro') {
      return [
        {
          product: row.product,
          period: row.period,
          sector: row.sector,
          territory: 'Oriental Mindoro',
          channel: row.channel,
          revenue: Number((revenue * 0.632).toFixed(2)),
          quantity: Number((quantity * 0.632).toFixed(2)),
          row_count: Math.max(1, Math.round(rowCount * 0.632)),
          basis: `${row.basis} · PSA demographic weighted apportionment (63.2% Oriental Mindoro)`,
        },
        {
          product: row.product,
          period: row.period,
          sector: row.sector,
          territory: 'Occidental Mindoro',
          channel: row.channel,
          revenue: Number((revenue * 0.368).toFixed(2)),
          quantity: Number((quantity * 0.368).toFixed(2)),
          row_count: Math.max(1, Math.round(rowCount * 0.368)),
          basis: `${row.basis} · PSA demographic weighted apportionment (36.8% Occidental Mindoro)`,
        },
      ]
    }
    return [{
      product: row.product,
      period: row.period,
      sector: row.sector,
      territory: row.territory,
      channel: row.channel,
      revenue,
      quantity,
      row_count: rowCount,
      basis: row.basis,
    }]
  })
  return {
    rows: expandedRows,
    source: databricksSource(rows, {
      file: 'datasources/templates/buyer_sector_mapping.csv',
      input_rows: includedRows,
      included_rows: includedRows,
      excluded: { buyer_sector_unmapped: unmappedRows },
    }),
  }
}

async function scopedMonthlySeries(sector: string, product: string, metric: string) {
  if (!['Unknown', 'Government', 'Private', 'Internal', 'All'].includes(sector)) throw new DatabricksDashboardInputError('Invalid buyer cluster')
  if (!['revenue', 'quantity'].includes(metric)) throw new DatabricksDashboardInputError('Invalid forecast metric')
  if (metric === 'quantity' && !product) throw new DatabricksDashboardInputError('Select one product for a quantity forecast')

  let sectorClause = ''
  if (sector === 'Government') {
    sectorClause = `AND UPPER(TRIM(normalized_area)) IN ('GOVERNMENT', 'PAGBILAO')`
  } else if (sector === 'Private') {
    sectorClause = `AND (proposed_area_type = 'territory' OR UPPER(TRIM(normalized_area)) IN ('CAVITE', 'LOWER CAVITE', 'BATANGAS', 'QUEZON', 'LAGUNA', 'MARINDUQUE', 'CAMARINES NORTE', 'CAM NORTE', 'CAMARINES SUR', 'CAM SUR', 'ALBAY', 'LEGASPI', 'LAGASPI', 'BICOL', 'MINDORO', 'HOSPITAL', 'HOPITAL', 'PHARMA', 'LUCENA', 'RAKKK', 'EAST', 'EASTERN', 'EASTERN QUEZON'))`
  } else if (sector === 'Internal') {
    sectorClause = `AND UPPER(TRIM(normalized_area)) IN ('ADMIN', 'SUPPLIES', 'SUPPLLIES', 'EQUIPMENT', 'SUPPLIES AND EQUIPMENT', 'PERSONAL', 'LOSSES')`
  }

  const productClause = product ? `AND normalized_product = ${sqlString(product, 'product')}` : ''
  return {
    rows: await query(`SELECT DATE_FORMAT(month_start, 'yyyy-MM') AS period,
      SUM(${metric === 'quantity' ? 'CASE WHEN is_quantity_observation_eligible THEN quantity ELSE 0 END' : 'CASE WHEN is_net_sales_eligible THEN net_sales ELSE 0 END'}) AS actual
      FROM ${FACT} WHERE ${OBSERVED_FACT} ${sectorClause} ${productClause}
      GROUP BY month_start ORDER BY month_start`, 150),
    products: await query(`SELECT normalized_product AS product,
      SUM(CASE WHEN is_net_sales_eligible THEN COALESCE(net_sales, 0) ELSE 0 END) AS revenue
      FROM ${FACT} WHERE ${OBSERVED_FACT} ${sectorClause}
      GROUP BY normalized_product ORDER BY revenue DESC LIMIT 5000`, 5000),
  }
}

function forecastModel(series: Map<number, number>, origin: number, horizon: number, kind: 'seasonal_naive' | 'last_value') {
  const evaluationStart = origin - horizon + 1
  const backtest = []
  const scored: Array<[number, number]> = []
  for (let period = evaluationStart; period <= origin; period += 1) {
    const actual = series.get(period)
    const prediction = kind === 'seasonal_naive' ? series.get(period - 12) : series.get(period - 1)
    if (actual == null || prediction == null) continue
    backtest.push({ period: periodName(period), actual, prediction, lower: null, upper: null, origin: periodName(period - 1), band_sample_count: 0 })
    scored.push([actual, prediction])
  }
  const forecast = []
  for (let lead = 1; lead <= horizon; lead += 1) {
    const period = origin + lead
    const prediction = kind === 'seasonal_naive'
      ? series.get(period - 12) ?? null
      : series.get(origin) ?? null
    forecast.push({ period: periodName(period), prediction, lower: null, upper: null, origin: periodName(origin), band_sample_count: 0 })
  }
  const metrics = metricSummary(scored)
  return {
    forecast,
    backtest,
    metrics,
    comparison_metrics: metrics,
    band_coverage: { n: 0, percent: null },
  }
}

export async function getDatabricksForecastValidation(input: { sector?: string; product?: string; metric?: string }) {
  const sector = input.sector?.trim() || 'Unknown'
  const product = input.product?.trim() || ''
  const metric = input.metric?.trim() || 'revenue'
  const scoped = await scopedMonthlySeries(sector, product, metric)
  const observations = scoped.rows
    .filter((row) => row.period && nullableNumber(row.actual) !== null)
    .map((row) => ({ period: row.period as string, actual: numberValue(row.actual) }))
  const series = new Map(observations.map((row) => [monthNumber(row.period), row.actual]))
  const origin = observations.length ? Math.max(...observations.map((row) => monthNumber(row.period))) : null
  const views: Record<string, unknown> = {}
  if (origin !== null) {
    for (const horizon of [3, 6, 12]) {
      const models = {
        seasonal_naive: forecastModel(series, origin, horizon, 'seasonal_naive'),
        last_value: forecastModel(series, origin, horizon, 'last_value'),
      }
      views[String(horizon)] = {
        evaluation_start: periodName(origin - horizon + 1),
        evaluation_end: periodName(origin),
        training_end: periodName(origin - horizon),
        common_scored_months: Math.min(models.seasonal_naive.metrics.n, models.last_value.metrics.n),
        models,
      }
    }
  }
  const source = databricksSource(observations, {
    as_of: new Date().toISOString().slice(0, 10),
    input_rows: observations.length,
    included_rows: observations.length,
    scoped_rows: observations.length,
    excluded: {},
    excluded_not_closed: 0,
    excluded_outside_history: 0,
  })
  return {
    scope: { sector, product, metric, unit: metric === 'quantity' ? 'delivered source units' : '₱ net sales' },
    products: scoped.products.map((row) => row.product).filter(Boolean),
    models: { seasonal_naive: 'Seasonal naive', last_value: 'Last observed value' },
    status: observations.length ? 'Databricks Gold baseline' : 'Unavailable',
    source,
    actuals: observations,
    views,
    origin: origin === null ? null : periodName(origin),
    months_since_origin: origin === null ? null : Math.max(0, currentClosedMonth() - origin),
    observed_months: observations.length,
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
  if (!['Unknown', 'Government', 'Private', 'Internal', 'All'].includes(sector)) throw new DatabricksDashboardInputError('Invalid buyer cluster')
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
  if (!['Unknown', 'Government', 'Private', 'Internal', 'All'].includes(sector)) throw new DatabricksDashboardInputError('Invalid buyer cluster')
  const territories = await query(`SELECT DISTINCT INITCAP(COALESCE(territory, normalized_area)) AS territory
    FROM ${FACT} WHERE ${OBSERVED_FACT} AND proposed_area_type = 'territory'
    ORDER BY territory`, 100)

  let sectorClause = ''
  if (sector === 'Government') {
    sectorClause = `AND UPPER(TRIM(normalized_area)) IN ('GOVERNMENT', 'PAGBILAO')`
  } else if (sector === 'Private') {
    sectorClause = `AND (proposed_area_type = 'territory' OR UPPER(TRIM(normalized_area)) IN ('CAVITE', 'LOWER CAVITE', 'BATANGAS', 'QUEZON', 'LAGUNA', 'MARINDUQUE', 'CAMARINES NORTE', 'CAM NORTE', 'CAMARINES SUR', 'CAM SUR', 'ALBAY', 'LEGASPI', 'LAGASPI', 'BICOL', 'MINDORO', 'HOSPITAL', 'HOPITAL', 'PHARMA', 'LUCENA', 'RAKKK', 'EAST', 'EASTERN', 'EASTERN QUEZON'))`
  } else if (sector === 'Internal') {
    sectorClause = `AND UPPER(TRIM(normalized_area)) IN ('ADMIN', 'SUPPLIES', 'SUPPLLIES', 'EQUIPMENT', 'SUPPLIES AND EQUIPMENT', 'PERSONAL', 'LOSSES')`
  }

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

export async function getDatabricksWeatherEffects(input: { year?: string; area?: string; grain?: string }) {
  const year = input.year?.trim() || 'all'
  const area = input.area?.trim() || 'all'
  const grain = input.grain?.trim() || 'monthly'
  if (grain !== 'monthly') throw new DatabricksDashboardInputError('Databricks Gold currently publishes monthly PAGASA observations only')
  const clauses = [`signal_family = 'WEATHER'`]
  if (year !== 'all') {
    if (!/^(201[7-9]|202[0-5])$/.test(year)) throw new DatabricksDashboardInputError('Invalid weather year')
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
