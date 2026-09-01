import { createHash } from 'node:crypto'

const YEARLY_DASHBOARD_VIEW = 'vw_dashboard_yearly_sales_candidate'
const EXPECTED_YEARS = Object.freeze([2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025])
const CANDIDATE_FINANCIAL_STATUS = 'CANDIDATE_PENDING_FINANCE_APPROVAL'

const YEARLY_CANDIDATE_COLUMNS = Object.freeze([
  'calendar_year',
  'first_delivery_date',
  'last_delivery_date',
  'calendar_month_count',
  'active_month_count',
  'zero_activity_month_count',
  'month_activity_status',
  'transaction_count',
  'distinct_dr_count',
  'distinct_area_count',
  'distinct_product_count',
  'warning_transaction_count',
  'fully_eligible_transaction_count',
  'partially_eligible_transaction_count',
  'dimension_only_transaction_count',
  'source_year_mismatch_count',
  'negative_quantity_review_count',
  'financial_formula_warning_count',
  'quantity_eligible_transaction_count',
  'gross_sales_eligible_transaction_count',
  'net_sales_eligible_transaction_count',
  'transfer_value_eligible_transaction_count',
  'gross_margin_eligible_transaction_count',
  'total_quantity_candidate',
  'gross_sales_candidate',
  'net_sales_candidate',
  'transfer_value_candidate',
  'gross_margin_candidate',
  'weighted_gross_margin_pct_candidate',
  'warning_transaction_rate',
  'fully_eligible_transaction_rate',
  'quantity_coverage_rate',
  'net_sales_coverage_rate',
  'gross_margin_coverage_rate',
  'previous_calendar_year',
  'previous_transaction_count',
  'previous_total_quantity_candidate',
  'previous_gross_sales_candidate',
  'previous_net_sales_candidate',
  'previous_gross_margin_candidate',
  'transaction_count_yoy_pct',
  'quantity_yoy_pct_candidate',
  'gross_sales_yoy_pct_candidate',
  'net_sales_yoy_pct_candidate',
  'gross_margin_yoy_pct_candidate',
  'yoy_comparison_status',
  'financial_definition_status',
] as const)

type StatementState =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED'
  | 'CLOSED'

interface StatementResponse {
  statement_id?: string
  status?: {
    state?: StatementState
    error?: {
      error_code?: string
      message?: string
    }
  }
  manifest?: {
    total_row_count?: number
    truncated?: boolean
    schema?: {
      columns?: Array<{
        name: string
        position: number
        type_name?: string
      }>
    }
  }
  result?: {
    data_array?: Array<Array<string | null>>
  }
}

export type DatabricksYearlyCandidateRow = Record<
  (typeof YEARLY_CANDIDATE_COLUMNS)[number],
  string | null
>

export interface DatabricksConnectionStatus {
  connected: true
  source: {
    catalog: string
    schema: string
    view: string
  }
  period: {
    minimum_year: number
    maximum_year: number
    year_count: number
  }
  row_count: number
  checked_at: string
}

export interface DatabricksYearlyCandidateExtract {
  rows: DatabricksYearlyCandidateRow[]
  source: DatabricksConnectionStatus['source']
  period: DatabricksConnectionStatus['period']
  source_transaction_count: number
  source_checksum: string
  checked_at: string
}

interface DatabricksConfiguration {
  host: string
  token: string
  warehouseId: string
  catalog: string
  schema: string
}

interface InlineStatementResult {
  rows: Record<string, string | null>[]
  columns: string[]
}

const TERMINAL_STATES = new Set<StatementState>([
  'SUCCEEDED',
  'FAILED',
  'CANCELED',
  'CLOSED',
])

export class DatabricksYearlyValidationError extends Error {
  readonly code = 'DATABRICKS_YEARLY_VALIDATION_FAILED'

  constructor(message: string) {
    super(message)
    this.name = 'DatabricksYearlyValidationError'
  }
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

function safeIdentifier(name: string, value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`${name} contains unsupported characters`)
  }
  return value
}

function normalizeHost(rawHost: string): string {
  const value = /^https?:\/\//i.test(rawHost) ? rawHost : `https://${rawHost}`
  const url = new URL(value)
  if (url.protocol !== 'https:') {
    throw new Error('DATABRICKS_HOST must use HTTPS')
  }
  return url.origin
}

function configuration(): DatabricksConfiguration {
  return {
    host: normalizeHost(requiredEnvironment('DATABRICKS_HOST')),
    token: requiredEnvironment('DATABRICKS_TOKEN'),
    warehouseId: requiredEnvironment('DATABRICKS_SQL_WAREHOUSE_ID'),
    catalog: safeIdentifier(
      'DATABRICKS_CATALOG',
      process.env.DATABRICKS_CATALOG?.trim() || 'workspace',
    ),
    schema: safeIdentifier(
      'DATABRICKS_SCHEMA',
      process.env.DATABRICKS_SCHEMA?.trim() || 'medshield_gold',
    ),
  }
}

function yearlyCandidateConfiguration(): DatabricksConfiguration {
  const config = configuration()
  if (config.catalog !== 'workspace' || config.schema !== 'medshield_gold') {
    throw new Error(
      'The yearly pilot is allowlisted only for workspace.medshield_gold',
    )
  }
  return config
}

export function databricksConfigured(): boolean {
  return Boolean(
    process.env.DATABRICKS_HOST?.trim() &&
      process.env.DATABRICKS_TOKEN?.trim() &&
      process.env.DATABRICKS_SQL_WAREHOUSE_ID?.trim(),
  )
}

async function databricksFetch(
  url: string,
  token: string,
  init: RequestInit,
  timeoutMs = 55_000,
): Promise<StatementResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  headers.set('Content-Type', 'application/json')

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    })
    const body = (await response.json().catch(() => ({}))) as StatementResponse
    if (!response.ok) {
      throw new Error(`Databricks request returned HTTP ${response.status}`)
    }
    return body
  } finally {
    clearTimeout(timeout)
  }
}

function statementError(response: StatementResponse): Error {
  const state = response.status?.state ?? 'UNKNOWN'
  const code = response.status?.error?.error_code
  const message = response.status?.error?.message
  const detail = [state, code, message].filter(Boolean).join(': ')
  return new Error(`Databricks SQL statement did not succeed${detail ? ` (${detail})` : ''}`)
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function executeInlineStatement(statement: string): Promise<InlineStatementResult> {
  const config = configuration()
  const endpoint = `${config.host}/api/2.0/sql/statements`
  const rowLimit = 100
  let response = await databricksFetch(endpoint, config.token, {
    method: 'POST',
    body: JSON.stringify({
      warehouse_id: config.warehouseId,
      catalog: config.catalog,
      schema: config.schema,
      statement,
      wait_timeout: '50s',
      on_wait_timeout: 'CONTINUE',
      format: 'JSON_ARRAY',
      disposition: 'INLINE',
      row_limit: rowLimit,
    }),
  })

  const deadline = Date.now() + 60_000
  while (
    response.status?.state &&
    !TERMINAL_STATES.has(response.status.state) &&
    Date.now() < deadline
  ) {
    if (!response.statement_id) {
      throw new Error('Databricks did not return a statement ID')
    }
    await delay(750)
    response = await databricksFetch(
      `${endpoint}/${encodeURIComponent(response.statement_id)}`,
      config.token,
      { method: 'GET' },
      15_000,
    )
  }

  if (response.status?.state !== 'SUCCEEDED') {
    throw statementError(response)
  }
  if (
    response.manifest?.truncated === true ||
    (response.manifest?.total_row_count ?? 0) > rowLimit
  ) {
    throw new Error('Databricks returned a truncated inline result')
  }

  const manifestColumns = [...(response.manifest?.schema?.columns ?? [])].sort(
    (left, right) => left.position - right.position,
  )
  if (manifestColumns.length === 0) {
    throw new Error('Databricks did not return a result schema')
  }

  const data = response.result?.data_array ?? []
  return {
    columns: manifestColumns.map((column) => column.name),
    rows: data.map((values) =>
      Object.fromEntries(
        manifestColumns.map((column, index) => [column.name, values[index] ?? null]),
      ),
    ),
  }
}

function numberValue(row: Record<string, string | null>, column: string): number {
  const rawValue = row[column]
  if (rawValue === null || rawValue.trim() === '') {
    throw new DatabricksYearlyValidationError(`Gold column ${column} is missing`)
  }
  const value = Number(rawValue)
  if (!Number.isFinite(value)) {
    throw new DatabricksYearlyValidationError(`Gold column ${column} is not numeric`)
  }
  return value
}

function validateExpectedColumns(actualColumns: string[]): void {
  if (
    actualColumns.length !== YEARLY_CANDIDATE_COLUMNS.length ||
    actualColumns.some((column, index) => column !== YEARLY_CANDIDATE_COLUMNS[index])
  ) {
    throw new DatabricksYearlyValidationError(
      'The Databricks yearly Gold view no longer matches the approved 47-column contract',
    )
  }
}

export async function getDatabricksConnectionStatus(): Promise<DatabricksConnectionStatus> {
  const config = yearlyCandidateConfiguration()
  const qualifiedView = `\`${config.catalog}\`.\`${config.schema}\`.\`${YEARLY_DASHBOARD_VIEW}\``
  const result = await executeInlineStatement(`
    SELECT
      COUNT(*) AS row_count,
      COUNT(DISTINCT calendar_year) AS year_count,
      MIN(calendar_year) AS minimum_year,
      MAX(calendar_year) AS maximum_year
    FROM ${qualifiedView}
  `)
  const row = result.rows[0]
  if (!row) {
    throw new Error('Databricks yearly dashboard view returned no status row')
  }

  const rowCount = Number(row.row_count)
  const yearCount = Number(row.year_count)
  const minimumYear = Number(row.minimum_year)
  const maximumYear = Number(row.maximum_year)
  if (![rowCount, yearCount, minimumYear, maximumYear].every(Number.isFinite)) {
    throw new Error('Databricks yearly dashboard status returned invalid numeric values')
  }

  return {
    connected: true,
    source: {
      catalog: config.catalog,
      schema: config.schema,
      view: YEARLY_DASHBOARD_VIEW,
    },
    period: {
      minimum_year: minimumYear,
      maximum_year: maximumYear,
      year_count: yearCount,
    },
    row_count: rowCount,
    checked_at: new Date().toISOString(),
  }
}

export async function getDatabricksYearlyCandidateExtract(): Promise<DatabricksYearlyCandidateExtract> {
  const config = yearlyCandidateConfiguration()
  const qualifiedView = `\`${config.catalog}\`.\`${config.schema}\`.\`${YEARLY_DASHBOARD_VIEW}\``
  const result = await executeInlineStatement(`
    SELECT
      ${YEARLY_CANDIDATE_COLUMNS.map((column) => `\`${column}\``).join(',\n      ')}
    FROM ${qualifiedView}
    ORDER BY calendar_year
  `)

  validateExpectedColumns(result.columns)
  if (result.rows.length !== EXPECTED_YEARS.length) {
    throw new DatabricksYearlyValidationError(
      `Expected 9 Gold yearly rows but received ${result.rows.length}`,
    )
  }

  const years = result.rows.map((row) => numberValue(row, 'calendar_year'))
  if (years.some((year, index) => year !== EXPECTED_YEARS[index])) {
    throw new DatabricksYearlyValidationError(
      'Gold yearly rows must contain each year from 2017 through 2025 exactly once',
    )
  }

  const transactionCounts = result.rows.map((row) => numberValue(row, 'transaction_count'))
  if (transactionCounts.some((count) => !Number.isSafeInteger(count) || count < 0)) {
    throw new DatabricksYearlyValidationError(
      'Every Gold yearly transaction count must be a non-negative integer',
    )
  }
  const sourceTransactionCount = transactionCounts.reduce((total, count) => total + count, 0)

  for (const row of result.rows) {
    const calendarMonthCount = numberValue(row, 'calendar_month_count')
    const activeMonthCount = numberValue(row, 'active_month_count')
    const zeroActivityMonthCount = numberValue(row, 'zero_activity_month_count')
    if (calendarMonthCount !== 12 || activeMonthCount + zeroActivityMonthCount !== 12) {
      throw new DatabricksYearlyValidationError(
        `Year ${row.calendar_year} does not reconcile to a 12-month calendar scaffold`,
      )
    }
    if (row.financial_definition_status !== CANDIDATE_FINANCIAL_STATUS) {
      throw new DatabricksYearlyValidationError(
        `Year ${row.calendar_year} is not labeled as a candidate financial definition`,
      )
    }
  }

  const rows = result.rows as DatabricksYearlyCandidateRow[]
  const checkedAt = new Date().toISOString()
  return {
    rows,
    source: {
      catalog: config.catalog,
      schema: config.schema,
      view: YEARLY_DASHBOARD_VIEW,
    },
    period: {
      minimum_year: EXPECTED_YEARS[0],
      maximum_year: EXPECTED_YEARS[EXPECTED_YEARS.length - 1],
      year_count: EXPECTED_YEARS.length,
    },
    source_transaction_count: sourceTransactionCount,
    source_checksum: createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
    checked_at: checkedAt,
  }
}
