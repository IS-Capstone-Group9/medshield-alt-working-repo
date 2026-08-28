import { SalesSummary, SalesPage, SalesDatasetStatus } from '@/lib/api'

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

  const money = (val: number | undefined) => formatSalesValue(val ?? 0, 'money')
  const number = (val: number | undefined) => formatSalesValue(val ?? 0, 'number')
  const percent = (val: number | undefined) => formatSalesValue(val ?? 0, 'percent')
  
  const cards =
    mode === 'sum'
      ? [
          ['Quantity', number(summary.sums.quantity)],
          ['Net CP', money(summary.sums.net_cost)],
          ['Gross Profit', money(summary.sums.net_income)],
          ['Total TP', money(summary.sums.total_trade_price)],
        ]
      : mode === 'average'
        ? [
            ['Avg Quantity', number(summary.averages.quantity)],
            ['Avg Unit CP', money(summary.averages.unit_cost)],
            ['Avg Gross Profit', money(summary.averages.net_income)],
            ['Avg Margin', percent(summary.averages.margin_pct)],
          ]
        : mode === 'count'
          ? [
              ['Filtered Rows', number(summary.counts.rows)],
              ['Accepted Rows', number(summary.counts.accepted_rows)],
              ['SKUs', number(summary.counts.sku_count)],
              ['DR Numbers', number(summary.counts.unique_dr_numbers)],
            ]
          : [
              ['Net CP', money(summary.sums.net_cost)],
              ['Gross Profit', money(summary.sums.net_income)],
              ['Average Margin', percent(summary.averages.margin_pct)],
              ['Top Area', summary.top.area || '-'],
            ]

  grid.innerHTML = cards
    .map(([label, value]) => `
      <div class="sales-status-card">
        <div class="sales-status-label">${label}</div>
        <div class="sales-status-value">${value}</div>
      </div>
    `)
    .join('')
}

export function renderSalesDatasetStatus(root: HTMLElement, status: SalesDatasetStatus) {
  const summary = status.quality_summary
  const badge = root.querySelector<HTMLElement>('#salesDatasetBadge')
  const note = root.querySelector<HTMLElement>('#salesPipelineNote')
  const yearSelect = root.querySelector<HTMLSelectElement>('#salesDataYear')
  if (badge) badge.textContent = `${status.source_file} - ${status.cleaning_status}`
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
