export function appendTableSkeletonRows(table: HTMLTableElement, columns: number) {
  const body = table.createTBody()
  body.className = 'table-loading-rows'
  body.setAttribute('aria-hidden', 'true')

  for (let index = 0; index < 5; index++) {
    const cell = body.insertRow().insertCell()
    cell.colSpan = columns
    const placeholder = document.createElement('span')
    placeholder.className = 'skeleton skeleton-table-row'
    cell.append(placeholder)
  }
}
