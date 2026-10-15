import { SalesSummary, SalesDatasetStatus } from '@/lib/api'

export function formatSalesValue(value: unknown, type: 'text' | 'number' | 'money' | 'percent' = 'text') {
  if (value === null || value === undefined || value === '') return '-'
  if (type === 'number') return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 })
  if (type === 'money') {
    return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (type === 'percent') return `${(Number(value) * 100).toFixed(2)}%`
  return String(value)
}

export function renderSalesComputation(root: HTMLElement, summary: SalesSummary, mode: 'overview' | 'sum' | 'average' | 'count') {
  const grid = root.querySelector<HTMLElement>('#salesComputationGrid')
  if (!grid) return

  const money = (val: number | null | undefined) => val == null ? 'Unavailable' : formatSalesValue(val, 'money')
  const number = (val: number | null | undefined) => val == null ? 'Unavailable' : formatSalesValue(val, 'number')
  const percent = (val: number | null | undefined) => val == null ? 'Unavailable' : formatSalesValue(val, 'percent')
  const revenue = summary.sums.net_cost
  const profit = summary.sums.net_income
  const margin = 'gross_margin_rate' in summary
    ? (summary.gross_margin_rate == null ? null : summary.gross_margin_rate / 100)
    : revenue != null && profit != null && Number.isFinite(revenue) && Number.isFinite(profit) && revenue > 0
      ? profit / revenue
      : null
  
  const cards =
    mode === 'sum'
      ? [
          ['Units Sold (Source Units)', number(summary.sums.quantity)],
          ['Net Sales Revenue (₱)', money(summary.sums.net_cost)],
          ['Gross Profit (₱)', money(summary.sums.net_income)],
          ['Acquisition Cost (₱)', money(summary.sums.total_trade_price)],
        ]
      : mode === 'average'
        ? [
            ['Avg Units Sold per Row (Source)', number(summary.averages.quantity)],
            ['Avg Selling Price (₱)', money(summary.averages.unit_cost)],
            ['Avg Gross Profit per Row (₱)', money(summary.averages.net_income)],
            ['Gross Margin % (Weighted)', percent(margin)],
          ]
        : mode === 'count'
          ? [
              ['Filtered Rows', number(summary.counts.rows)],
              ['Accepted Rows', number(summary.counts.accepted_rows)],
              ['Source product labels', number(summary.counts.sku_count)],
              ['DR Numbers', number(summary.counts.unique_dr_numbers)],
            ]
          : [
              ['Net Sales Revenue (₱)', money(summary.sums.net_cost)],
              ['Gross Profit (₱)', money(summary.sums.net_income)],
              ['Gross Margin % (Weighted)', percent(margin)],
              ['Top Area', summary.top.area || '-'],
            ]

  grid.replaceChildren()
  for (const [label, value] of cards) {
    const card = document.createElement('div')
    card.className = 'sales-status-card'
    const title = document.createElement('div')
    title.className = 'sales-status-label'
    title.textContent = label
    const amount = document.createElement('div')
    amount.className = 'sales-status-value'
    amount.textContent = value
    card.append(title, amount)
    grid.appendChild(card)
  }

  const reconciliation = root.querySelector<HTMLElement>('#salesFinancialReconciliation')
  if (reconciliation) {
    const check = summary.financial_reconciliation
    reconciliation.textContent = check
      ? `Workbook gross profit minus (net sales − acquisition cost): ₱${money(check.delta)}. ${check.mismatched_rows} of ${check.checked_rows} accepted rows differ by more than ₱0.01. Source values are retained for review.`
      : 'Financial reconciliation is unavailable from this data service.'
  }
  const reconciliationStatus = root.querySelector<HTMLElement>('#salesReconciliationStatus')
  if (reconciliationStatus) {
    const check = summary.financial_reconciliation
    reconciliationStatus.textContent = check
      ? check.mismatched_rows > 0 ? `${check.mismatched_rows.toLocaleString()} rows to reconcile` : 'No reconciliation differences'
      : 'Reconciliation unavailable'
    reconciliationStatus.classList.toggle('has-differences', Boolean(check && check.mismatched_rows > 0))
  }
}

export function renderSalesDatasetStatus(root: HTMLElement, status: SalesDatasetStatus) {
  const summary = status.quality_summary
  const badge = root.querySelector<HTMLElement>('#salesDatasetBadge')
  const note = root.querySelector<HTMLElement>('#salesPipelineNote')
  const source = root.querySelector<HTMLElement>('#salesDatasetSource')
  const yearSelect = root.querySelector<HTMLSelectElement>('#salesDataYear')
  if (badge) badge.textContent = `Databricks Gold · ${status.cleaning_status === 'databricks_gold_candidate' ? 'Candidate' : status.cleaning_status}`
  if (source) source.textContent = `Source: ${status.source_file}. Quality status: ${status.cleaning_status}.`
  if (note) {
    note.textContent =
      `${summary.rows_accepted.toLocaleString()} accepted of ${summary.rows_extracted.toLocaleString()} extracted rows` +
      ` | ${summary.rows_with_warnings.toLocaleString()} warnings` +
      ` | ${summary.rows_rejected.toLocaleString()} rejected` +
      ` | ${status.canonical_columns.length} columns matched`
  }
  if (yearSelect) {
    const current = yearSelect.value || 'all'
    yearSelect.replaceChildren(new Option('All Years', 'all'))
    for (const year of Object.keys(summary.years).sort().reverse()) {
      yearSelect.add(new Option(year, year))
    }
    yearSelect.value = Array.from(yearSelect.options).some((option) => option.value === current)
      ? current
      : 'all'
  }
}
