import { parseCsvRecords, normalizeCsvHeader, extractCsvYear } from '@/lib/utils/csv-parser'

export const CSV_TABLE_PAGE_SIZE = 25
export const CSV_TABLE_MAX_BYTES = 10 * 1024 * 1024
export const CSV_TABLE_MAX_ROWS = 50_000
export const CSV_TABLE_MAX_COLUMNS = 50

export type CsvTableRow = {
  values: string[]
  year: string | null
}

export type CsvTableState = {
  fileName: string
  headers: string[]
  rows: CsvTableRow[]
  selectedYear: string
  search: string
  page: number
}

export function renderUploadedDataTable(root: HTMLElement, state: CsvTableState) {
  const table = root.querySelector<HTMLTableElement>('#uploadedDataTable')
  const status = root.querySelector<HTMLElement>('#uploadedDataStatus')
  const pageLabel = root.querySelector<HTMLElement>('#uploadedDataPage')
  const previous = root.querySelector<HTMLButtonElement>('#uploadedDataPrevious')
  const next = root.querySelector<HTMLButtonElement>('#uploadedDataNext')
  if (!table || !status || !pageLabel || !previous || !next) return

  const search = state.search.trim().toLowerCase()
  const filteredRows = state.rows.filter((row) => {
    if (state.selectedYear !== 'all' && row.year !== state.selectedYear) return false
    return !search || row.values.some((value) => value.toLowerCase().includes(search))
  })
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / CSV_TABLE_PAGE_SIZE))
  state.page = Math.min(Math.max(state.page, 1), pageCount)
  const firstIndex = (state.page - 1) * CSV_TABLE_PAGE_SIZE
  const pageRows = filteredRows.slice(firstIndex, firstIndex + CSV_TABLE_PAGE_SIZE)

  table.replaceChildren()
  const head = table.createTHead()
  const headerRow = head.insertRow()
  for (const header of state.headers) {
    const cell = document.createElement('th')
    cell.scope = 'col'
    cell.textContent = header
    headerRow.appendChild(cell)
  }

  const body = table.createTBody()
  if (!pageRows.length) {
    const row = body.insertRow()
    const cell = row.insertCell()
    cell.colSpan = state.headers.length
    cell.className = 'uploaded-data-empty'
    cell.textContent = 'No rows match the selected year and search.'
  } else {
    for (const csvRow of pageRows) {
      const row = body.insertRow()
      for (const value of csvRow.values) {
        const cell = row.insertCell()
        cell.textContent = value || '-'
      }
    }
  }

  const visibleStart = filteredRows.length ? firstIndex + 1 : 0
  const visibleEnd = Math.min(firstIndex + CSV_TABLE_PAGE_SIZE, filteredRows.length)
  status.style.color = ''
  status.textContent = `Showing ${visibleStart}-${visibleEnd} of ${filteredRows.length.toLocaleString()} rows.`
  pageLabel.textContent = `Page ${filteredRows.length ? state.page : 0} of ${filteredRows.length ? pageCount : 0}`
  previous.disabled = state.page <= 1 || !filteredRows.length
  next.disabled = state.page >= pageCount || !filteredRows.length
}

export async function loadUploadedCsvTable(root: HTMLElement, file: File, state: CsvTableState) {
  if (file.size > CSV_TABLE_MAX_BYTES) {
    throw new Error('CSV is larger than the 10 MB table-view limit.')
  }

  const records = parseCsvRecords(await file.text())
  if (records.length < 2) throw new Error('CSV must contain a header and at least one data row.')

  const headers = records[0].map(normalizeCsvHeader)
  if (headers.length > CSV_TABLE_MAX_COLUMNS) {
    throw new Error(`CSV has more than ${CSV_TABLE_MAX_COLUMNS} columns.`)
  }

  const dataRecords = records.slice(1)
  if (dataRecords.length > CSV_TABLE_MAX_ROWS) {
    throw new Error(`CSV has more than ${CSV_TABLE_MAX_ROWS.toLocaleString()} rows.`)
  }

  state.fileName = file.name
  state.headers = headers
  state.rows = dataRecords.map((record) => {
    const values = headers.map((_, index) => record[index] ?? '')
    return { values, year: extractCsvYear(headers, values) }
  })
  state.selectedYear = 'all'
  state.search = ''
  state.page = 1

  const years = Array.from(
    new Set(state.rows.map((row) => row.year).filter((year): year is string => Boolean(year))),
  ).sort((left, right) => Number(right) - Number(left))
  
  const yearSelect = root.querySelector<HTMLSelectElement>('#uploadedDataYear')
  const searchInput = root.querySelector<HTMLInputElement>('#uploadedDataSearch')
  const fileLabel = root.querySelector<HTMLElement>('#uploadedDataFile')

  if (yearSelect) {
    yearSelect.replaceChildren(new Option('All Years', 'all'))
    for (const year of years) yearSelect.add(new Option(year, year))
    yearSelect.disabled = false
    yearSelect.value = 'all'
  }
  if (searchInput) {
    searchInput.disabled = false
    searchInput.value = ''
  }
  if (fileLabel) fileLabel.textContent = `${file.name} - ${state.rows.length.toLocaleString()} rows`

  renderUploadedDataTable(root, state)
}
