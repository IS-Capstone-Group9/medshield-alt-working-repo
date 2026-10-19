/** Diagnostic accounting contributions locate change; they do not establish cause. */
export type DiagnosticRow = Record<string, string | null>
export type DiagnosticParameter = { name: string; value: string; type: 'STRING' | 'DATE' }
export class SalesDiagnosticInputError extends Error {
  readonly status = 400
}

export interface DiagnosticScope {
  start_date: string
  end_date: string
  prior_start_date: string
  prior_end_date: string
  product_id: string | null
  area: string | null
  sector: string
  region: string | null
  territory: string | null
  category: string
}

function dateValue(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new SalesDiagnosticInputError(`${name} must be YYYY-MM-DD`)
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (year < 2017 || date.toISOString().slice(0, 10) !== value) throw new SalesDiagnosticInputError(`${name} must be a valid date from 2017 onward`)
  return value
}

function optionalLabel(value: unknown, name: string): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || !value.trim() || value.length > 200 || /[\u0000-\u001f]/.test(value)) throw new SalesDiagnosticInputError(`${name} is invalid`)
  return value.trim()
}

export function previousYearDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year - 1, month, 0)).getUTCDate()
  return `${year - 1}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
}

function monthNumber(value: string): number {
  return Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7)) - 1
}

export function diagnosticMonths(scope: DiagnosticScope): string[] {
  const result: string[] = []
  for (let value = monthNumber(scope.start_date); value <= monthNumber(scope.end_date); value++) {
    result.push(`${Math.floor(value / 12)}-${String(value % 12 + 1).padStart(2, '0')}`)
  }
  return result
}

export interface DiagnosticInput {startDate?: unknown; endDate?: unknown; productId?: unknown; area?: unknown; sector?: unknown; region?: unknown; territory?: unknown; category?: unknown}
export function parseDiagnosticFilters(input: DiagnosticInput) {
  const product = optionalLabel(input.productId, 'product_id')
  if (product && !/^(RAW|SKU):.+/.test(product)) throw new SalesDiagnosticInputError('product_id must be a canonical RAW: or SKU: group')
  const area = optionalLabel(input.area, 'area')
  const sector = input.sector === undefined ? 'All' : input.sector
  if (typeof sector !== 'string' || !['All', 'Government', 'Private', 'Internal', 'Unknown'].includes(sector)) throw new SalesDiagnosticInputError('sector is invalid')
  const category = input.category === undefined ? 'All' : input.category
  if (typeof category !== 'string' || !['All','Medical','Non-Medical','Unclassified'].includes(category)) throw new SalesDiagnosticInputError('category is invalid')
  return {product_id: product, area, sector, region:optionalLabel(input.region,'region'), territory:optionalLabel(input.territory,'territory'), category}
}

export function parseDiagnosticScope(input: DiagnosticInput): DiagnosticScope {
  const start = dateValue(input.startDate, 'start_date')
  const end = dateValue(input.endDate, 'end_date')
  if (start > end) throw new SalesDiagnosticInputError('start_date must not follow end_date')
  if (monthNumber(end) - monthNumber(start) >= 1200) throw new SalesDiagnosticInputError('Diagnostic scope must be shorter than 100 years')
  return { start_date: start, end_date: end, prior_start_date: previousYearDate(start), prior_end_date: previousYearDate(end), ...parseDiagnosticFilters(input) }
}

export function diagnosticFilter(scope: ReturnType<typeof parseDiagnosticFilters>, expressions: { product: string; sector: string; area?: string; region?: string; territory?: string; category?: string }) {
  const clauses: string[] = []
  const parameters: DiagnosticParameter[] = []
  if (scope.product_id) {
    clauses.push(`${expressions.product} = :diagnostic_product`)
    parameters.push({name: 'diagnostic_product', value: scope.product_id, type: 'STRING'})
  }
  if (scope.area) {
    clauses.push(`${expressions.area || 'normalized_area'} = :diagnostic_area`)
    parameters.push({name: 'diagnostic_area', value: scope.area, type: 'STRING'})
  }
  if (scope.sector !== 'All') {
    clauses.push(`${expressions.sector} = :diagnostic_sector`)
    parameters.push({name: 'diagnostic_sector', value: scope.sector, type: 'STRING'})
  }
  for (const name of ['region','territory'] as const) {
    if (scope[name]) {
      if (!expressions[name]) throw new Error(`Missing ${name} SQL expression`)
      clauses.push(`${expressions[name]} = :diagnostic_${name}`)
      parameters.push({name:`diagnostic_${name}`, value:scope[name], type:'STRING'})
    }
  }
  if (scope.category !== 'All') {
    if (!expressions.category) throw new Error('Missing category SQL expression')
    clauses.push(`${expressions.category} = :diagnostic_category`)
    parameters.push({name:'diagnostic_category', value:scope.category, type:'STRING'})
  }
  return {where: clauses.length ? clauses.join(' AND ') : 'TRUE', parameters}
}

const MEASURES = `COUNT(*) AS row_count,
  SUM(CASE WHEN is_net_sales_eligible AND net_sales IS NOT NULL THEN 1 ELSE 0 END) AS net_sales_eligible_rows,
  SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS revenue,
  SUM(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END) AS income,
  SUM(CASE WHEN is_gross_margin_eligible THEN net_sales END) AS margin_revenue_basis,
  SUM(CASE WHEN is_gross_margin_eligible THEN 1 ELSE 0 END) AS gross_margin_eligible_rows,
  SUM(CASE WHEN diagnostic_evidence = 'original_source_detail' THEN 1 ELSE 0 END) AS original_source_rows,
  SUM(CASE WHEN diagnostic_evidence = 'adjusted_estimated_source' THEN 1 ELSE 0 END) AS adjusted_estimated_rows,
  SUM(CASE WHEN COALESCE(diagnostic_identity, 'needs_review') <> 'approved' THEN 1 ELSE 0 END) AS unresolved_product_rows,
  SUM(CASE WHEN is_net_sales_eligible AND net_sales < 0 THEN net_sales ELSE 0 END) AS negative_sales`

/** Caller supplies only trusted schema expressions. Every external value is bound. */
export function diagnosticStatement(scope: DiagnosticScope, sql: {fact: string; population: string; product: string; title: string; sector: string; region: string; territory: string; category: string; identity: string; evidence: string}) {
  const filter = diagnosticFilter(scope, {product:'diagnostic_product', sector:'diagnostic_sector', region:'diagnostic_region', territory:'diagnostic_territory', category:'diagnostic_category'})
  const parameters: DiagnosticParameter[] = [
    {name:'diagnostic_start', value:scope.start_date, type:'DATE'},
    {name:'diagnostic_end', value:scope.end_date, type:'DATE'},
    {name:'diagnostic_prior_start', value:scope.prior_start_date, type:'DATE'},
    {name:'diagnostic_prior_end', value:scope.prior_end_date, type:'DATE'},
    ...filter.parameters,
  ]
  // Boundary dates are already clamped. UNION ALL preserves overlapping scopes
  // as separate populations when a selection is longer than one year.
  const base = `WITH source AS (
    SELECT *, ${sql.product} AS diagnostic_product, ${sql.title} AS diagnostic_title,
      ${sql.sector} AS diagnostic_sector, ${sql.identity} AS diagnostic_identity,
      ${sql.region} AS diagnostic_region, ${sql.territory} AS diagnostic_territory,
      ${sql.category} AS diagnostic_category,
      ${sql.evidence} AS diagnostic_evidence
    FROM ${sql.fact} WHERE ${sql.population}
      AND ((date_delivered BETWEEN :diagnostic_start AND :diagnostic_end)
        OR (date_delivered BETWEEN :diagnostic_prior_start AND :diagnostic_prior_end))
  ), slices AS (
    SELECT *, 'current' AS side, DATE_FORMAT(date_delivered, 'yyyy-MM') AS aligned_period
      FROM source WHERE date_delivered BETWEEN :diagnostic_start AND :diagnostic_end
    UNION ALL
    SELECT *, 'prior' AS side, DATE_FORMAT(ADD_MONTHS(date_delivered, 12), 'yyyy-MM') AS aligned_period
      FROM source WHERE date_delivered BETWEEN :diagnostic_prior_start AND :diagnostic_prior_end
  ), paired AS (
    SELECT aligned_period FROM slices GROUP BY aligned_period
      HAVING SUM(CASE WHEN side = 'current' AND is_net_sales_eligible AND net_sales IS NOT NULL THEN 1 ELSE 0 END) > 0
         AND SUM(CASE WHEN side = 'prior' AND is_net_sales_eligible AND net_sales IS NOT NULL THEN 1 ELSE 0 END) > 0
  ), scoped AS (SELECT * FROM slices WHERE ${filter.where}),
  matched AS (SELECT scoped.* FROM scoped INNER JOIN paired USING (aligned_period))`
  const partitions = [
    `SELECT 'coverage' AS dimension, aligned_period AS group_key, aligned_period AS label, side, ${MEASURES} FROM slices GROUP BY aligned_period, side`,
    `SELECT 'month' AS dimension, aligned_period AS group_key, aligned_period AS label, side, ${MEASURES} FROM scoped GROUP BY aligned_period, side`,
    `SELECT 'total' AS dimension, 'total' AS group_key, 'Selected scope' AS label, side, ${MEASURES} FROM matched GROUP BY side`,
    `SELECT 'product' AS dimension, diagnostic_product AS group_key, MAX(diagnostic_title) AS label, side, ${MEASURES} FROM matched GROUP BY diagnostic_product, side`,
    `SELECT 'area' AS dimension, COALESCE(normalized_area, 'Unknown') AS group_key, COALESCE(normalized_area, 'Unknown') AS label, side, ${MEASURES} FROM matched GROUP BY normalized_area, side`,
    `SELECT 'sector' AS dimension, diagnostic_sector AS group_key, diagnostic_sector AS label, side, ${MEASURES} FROM matched GROUP BY diagnostic_sector, side`,
    `SELECT 'evidence' AS dimension, COALESCE(diagnostic_evidence, 'unclassified_evidence') AS group_key, COALESCE(diagnostic_evidence, 'unclassified_evidence') AS label, side, ${MEASURES} FROM matched GROUP BY diagnostic_evidence, side`,
  ]
  return {statement: `${base}\n${partitions.join('\nUNION ALL\n')}\nORDER BY dimension, group_key, side`, parameters}
}

// Warehouse decimals have six places. Fixed point preserves signed cancellation
// and reconciliation across the full grouped population before JSON conversion.
function fixed(value: string | null | undefined): bigint | null {
  if (value == null) return null
  const match = /^(-?)(\d+)(?:\.(\d{1,6}))?$/.exec(value)
  if (!match) throw new Error('Invalid diagnostic financial amount')
  const amount = BigInt(match[2]) * 1_000_000n + BigInt((match[3] || '').padEnd(6, '0'))
  return match[1] ? -amount : amount
}
function amount(value: bigint | null): number | null {
  if (value === null) return null
  const result = Number(value) / 1_000_000
  if (!Number.isFinite(result)) throw new Error('Diagnostic financial amount exceeds numeric range')
  return result
}
function count(row: DiagnosticRow | undefined, key: string): number { return Number(row?.[key] || 0) }
function accountingRevenue(row: DiagnosticRow | undefined, available: boolean): bigint | null {
  if (!available) return null
  if (!row || count(row,'net_sales_eligible_rows') === 0) return 0n
  const revenue = fixed(row.revenue)
  if (revenue === null) throw new Error('Eligible diagnostic sales amount is unavailable')
  return revenue
}
function financial(row: DiagnosticRow | undefined, available: boolean) {
  const revenue = row ? fixed(row.revenue) : available ? 0n : null
  const income = row ? fixed(row.income) : available ? 0n : null
  const basis = row ? fixed(row.margin_revenue_basis) : available ? 0n : null
  return {revenue: amount(revenue), income: amount(income), margin_revenue_basis: amount(basis),
    margin_pct: basis !== null && basis > 0n && income !== null ? Number(income) / Number(basis) * 100 : null,
    rows:count(row,'row_count'), net_sales_eligible_rows:count(row,'net_sales_eligible_rows'),
    gross_margin_eligible_rows:count(row,'gross_margin_eligible_rows'), original_source_rows:count(row,'original_source_rows'),
    adjusted_estimated_rows:count(row,'adjusted_estimated_rows'), unresolved_product_rows:count(row,'unresolved_product_rows'),
    negative_sales:amount(row ? fixed(row.negative_sales) : available ? 0n : null)}
}

export function buildSalesDiagnostics(scope: DiagnosticScope, rows: DiagnosticRow[]) {
  const months = diagnosticMonths(scope)
  const coverageRows = rows.filter(row => row.dimension === 'coverage')
  const coverage = (month: string, side: string) => coverageRows.find(row => row.group_key === month && row.side === side)
  const observed = (month: string, side: string) => count(coverage(month,side),'net_sales_eligible_rows') > 0
  const matched = months.filter(month => observed(month,'current') && observed(month,'prior'))
  const matchedSet = new Set(matched)
  const totalCurrent = rows.find(row => row.dimension === 'total' && row.side === 'current')
  const totalPrior = rows.find(row => row.dimension === 'total' && row.side === 'prior')
  const currentFixed = accountingRevenue(totalCurrent, matched.length > 0)
  const priorFixed = accountingRevenue(totalPrior, matched.length > 0)
  const deltaFixed = currentFixed !== null && priorFixed !== null ? currentFixed - priorFixed : null
  const current = financial(totalCurrent, matched.length > 0)
  const prior = financial(totalPrior, matched.length > 0)
  const partitions = (dimension: string) => {
    const partition = rows.filter(row => row.dimension === dimension)
    const keys = dimension === 'month' ? months : [...new Set(partition.map(row => row.group_key!))]
    let partitionSum = 0n
    const result = keys.map(key => {
      const a = partition.find(row => row.group_key === key && row.side === 'current')
      const b = partition.find(row => row.group_key === key && row.side === 'prior')
      const currentAvailable = dimension === 'month' ? observed(key,'current') : matched.length > 0
      const priorAvailable = dimension === 'month' ? observed(key,'prior') : matched.length > 0
      const currentAmount = accountingRevenue(a,currentAvailable)
      const priorAmount = accountingRevenue(b,priorAvailable)
      const paired = dimension === 'month' ? matchedSet.has(key) : matched.length > 0
      const delta = paired && currentAmount !== null && priorAmount !== null ? currentAmount - priorAmount : null
      if (delta !== null) partitionSum += delta
      return {key, label:a?.label || b?.label || key, current:amount(currentAmount), prior:amount(priorAmount), delta:amount(delta),
        contribution_pct:delta !== null && deltaFixed !== null && deltaFixed !== 0n ? Number(delta) / Number(deltaFixed) * 100 : null,
        comparison_status:paired ? delta === null ? 'financial_unavailable' : 'matched' : 'unmatched',
        current_financial:financial(a,currentAvailable), prior_financial:financial(b,priorAvailable),
        identity_status:dimension === 'product' ? count(a,'unresolved_product_rows') + count(b,'unresolved_product_rows') ? 'needs_review' : 'approved' : undefined}
    })
    if (deltaFixed !== null && partitionSum !== deltaFixed) throw new Error(`Diagnostic ${dimension} partition does not reconcile`)
    return dimension === 'month' ? result : result.sort((a,b) => Math.abs(b.delta || 0) - Math.abs(a.delta || 0) || a.key.localeCompare(b.key))
  }
  const contributions = {month:partitions('month'), product:partitions('product'), area:partitions('area'), sector:partitions('sector'),
    evidence:rows.some(row => row.dimension === 'evidence') ? partitions('evidence') : []}
  const missingCurrent = months.filter(month => !observed(month,'current'))
  const missingPrior = months.filter(month => !observed(month,'prior'))
  const lastDay = new Date(Date.UTC(Number(scope.end_date.slice(0,4)), Number(scope.end_date.slice(5,7)), 0)).getUTCDate()
  const partial = [...new Set([...(scope.start_date.endsWith('-01') ? [] : [scope.start_date.slice(0,7)]), ...(Number(scope.end_date.slice(8)) === lastDay ? [] : [scope.end_date.slice(0,7)])])]
  return {scope, totals:{current:amount(currentFixed), prior:amount(priorFixed), delta:amount(deltaFixed),
    growth_pct:deltaFixed !== null && priorFixed !== null && priorFixed > 0n ? Number(deltaFixed) / Number(priorFixed) * 100 : null,
    current_rows:current.rows, prior_rows:prior.rows, current_eligible_rows:current.net_sales_eligible_rows, prior_eligible_rows:prior.net_sales_eligible_rows,
    matched_months:matched.length, expected_months:months.length, current_financial:current, prior_financial:prior,
    comparison_status:!matched.length ? 'no_matched_months' : matched.length < months.length ? 'partial_matched_coverage' : currentFixed === null || priorFixed === null ? 'financial_unavailable' : 'matched'},
    coverage:{missing_current_months:missingCurrent, missing_prior_months:missingPrior, unmatched_months:months.filter(month => !matchedSet.has(month)),
      partial_boundary_months:partial, coverage_status:missingCurrent.length || missingPrior.length ? 'activity_gaps' : 'recorded_activity_not_completeness_attestation'},
    contributions, causal_status:'unverified' as const,
    limitations:[
      'Signed contributions locate changes in eligible recorded sales; they do not prove a cause.',
      'Company periods with no eligible sales evidence remain unavailable. Group absence in matched observed company periods is an accounting zero, not proof of zero real demand.',
      'Buyer sector is a proposed classification; source area labels do not establish individual buyer identity or approved geography.',
      'Adjusted/estimated source transactions remain labeled; unresolved reporting groups are not verified medicine SKUs.',
      'Price, medicine units, disease, stockouts, supplier delay, expiry and contract explanations require independently linked evidence.',
      'Transaction gross profit uses only its matching eligible revenue basis; company net profit is unavailable.',
      'Comparison includes only matched company periods and exact selected boundary dates; recorded activity does not certify complete submissions.',
    ]}
}
