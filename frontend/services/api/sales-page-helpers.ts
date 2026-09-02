import { SalesPage } from '@/lib/api'
import { formatSalesValue } from './sales-view-helpers'

export function renderSalesPage(root: HTMLElement, result: SalesPage) {
  const table = root.querySelector<HTMLTableElement>('#salesDataTable')
  const status = root.querySelector<HTMLElement>('#salesDataStatus')
  const pageLabel = root.querySelector<HTMLElement>('#salesDataPage')
  const previous = root.querySelector<HTMLButtonElement>('#salesDataPrevious')
  const next = root.querySelector<HTMLButtonElement>('#salesDataNext')
  if (!table || !status || !pageLabel || !previous || !next) return

  const compactColumns: Array<[string, keyof SalesPage['rows'][number], 'text' | 'number' | 'money' | 'percent']> = [
    ['Date', 'date_delivered', 'text'],
    ['Area', 'area', 'text'],
    ['Product', 'product', 'text'],
    ['Qty', 'quantity', 'number'],
    ['Acquisition Cost', 'total_trade_price', 'money'],
    ['Gross Profit', 'net_income', 'money'],
  ]
  const fullColumns: Array<[string, keyof SalesPage['rows'][number], 'text' | 'number' | 'money' | 'percent']> = [
    ['Area', 'area', 'text'],
    ['DR Number', 'dr_number', 'text'],
    ['Date Delivered', 'date_delivered', 'text'],
    ['Product', 'product', 'text'],
    ['Qty', 'quantity', 'number'],
    ['Selling Price (CP)', 'unit_cost', 'money'],
    ['Gross Sales (Total CP)', 'total_cost', 'money'],
    ['Discount', 'discount', 'money'],
    ['Net Sales (Net CP)', 'net_cost', 'money'],
    ['Acquisition/Unit (TP)', 'trade_price_unit', 'money'],
    ['Acquisition Cost (Total TP)', 'total_trade_price', 'money'],
    ['Gross Profit', 'net_income', 'money'],
    ['Gross Margin %', 'margin_pct', 'percent'],
  ]
  const detailLevel = root.querySelector<HTMLSelectElement>('#salesDataDetail')?.value === 'full' ? 'full' : 'compact'
  const columns = detailLevel === 'full' ? fullColumns : compactColumns
  table.replaceChildren()
  const head = table.createTHead()
  const headerRow = head.insertRow()
  for (const [label] of columns) {
    const cell = document.createElement('th')
    cell.scope = 'col'
    cell.textContent = label
    headerRow.appendChild(cell)
  }
  const qualityHeader = document.createElement('th')
  qualityHeader.scope = 'col'
  qualityHeader.textContent = 'Quality'
  headerRow.appendChild(qualityHeader)

  const body = table.createTBody()
  if (!result.rows.length) {
    const row = body.insertRow()
    const cell = row.insertCell()
    cell.colSpan = columns.length + 1
    cell.className = 'uploaded-data-empty'
    cell.textContent = 'No transactions match the selected filters.'
  } else {
    for (const item of result.rows) {
      const row = body.insertRow()
      for (const [, field, type] of columns) {
        row.insertCell().textContent = formatSalesValue(item[field], type)
      }
      const qualityCell = row.insertCell()
      const quality = document.createElement('span')
      quality.className = `sales-quality sales-quality-${item.quality_status}`
      quality.textContent = item.quality_status
      quality.title = item.quality_notes || 'No quality issue'
      qualityCell.appendChild(quality)
    }
  }

  const pagination = result.pagination
  const start = pagination.total_rows ? (pagination.page - 1) * pagination.page_size + 1 : 0
  const end = Math.min(pagination.page * pagination.page_size, pagination.total_rows)
  status.textContent = `Showing ${start}-${end} of ${pagination.total_rows.toLocaleString()} cleaned records.`
  pageLabel.textContent = `Page ${pagination.page_count ? pagination.page : 0} of ${pagination.page_count}`
  previous.disabled = pagination.page <= 1
  next.disabled = pagination.page_count === 0 || pagination.page >= pagination.page_count
}

export function setSalesViewError(root: HTMLElement, message: string) {
  const table = root.querySelector<HTMLTableElement>('#salesDataTable')
  const status = root.querySelector<HTMLElement>('#salesDataStatus')
  if (table) {
    table.replaceChildren()
    const body = table.createTBody()
    const row = body.insertRow()
    const cell = row.insertCell()
    cell.className = 'uploaded-data-empty'
    cell.textContent = message
  }
  if (status) status.textContent = message
}
