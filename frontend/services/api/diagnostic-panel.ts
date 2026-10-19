import Chart from 'chart.js/auto'
import { getSalesDiagnostics } from './diagnostics.service'
import type { DiagnosticContribution, DiagnosticDimension, DiagnosticScope, SalesDiagnostics } from '@/types/diagnostics.types'

const money = (value: number | null) => value == null ? 'Unavailable' : value.toLocaleString('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 })
const rate = (value: number | null) => value == null ? 'Unavailable' : `${value.toFixed(2)}%`
const dimensions: DiagnosticDimension[] = ['month', 'product', 'area', 'sector']
const hypotheses = [
  ['Contract or buyer change', 'Contracts, purchase orders and account records linked to source transactions.'],
  ['Price or product mix change', 'Reviewed product identities, comparable packaging/units, invoices and discount agreements.'],
  ['Stock or supplier constraint', 'Dated inventory, lost orders, deliveries and supplier lead times.'],
  ['Disease or weather effect', 'Approved geographic and temporal joins, uncertainty and competing explanations.'],
]

/** Every signed partition must explain the same matched-period difference. */
export function diagnosticReconciliation(data: SalesDiagnostics): boolean {
  if (data.totals.delta == null) return true
  return dimensions.every(key => Math.abs(data.contributions[key].reduce((sum, row) => sum + (row.delta ?? 0), 0) - data.totals.delta!) <= 0.02)
}

function narrowScope(scope: DiagnosticScope, dimension: DiagnosticDimension, row: DiagnosticContribution): DiagnosticScope {
  if (dimension !== 'month') return { ...scope, [dimension === 'product' ? 'product_id' : dimension]: row.key, label: row.label }
  const end = new Date(Date.UTC(Number(row.key.slice(0, 4)), Number(row.key.slice(5, 7)), 0)).toISOString().slice(0, 10)
  return { ...scope, start_date: [scope.start_date, row.key + '-01'].sort().at(-1)!, end_date: [scope.end_date, end].sort()[0], label: row.label }
}

export function installDiagnosticPanel(root: HTMLElement): () => void {
  const host = root.querySelector('#page-revenue')
  if (!host) return () => {}
  const section = document.createElement('section')
  section.id = 'salesDiagnosticInvestigation'; section.className = 'chart-card'
  section.innerHTML = `<h2>Sales change investigation</h2>
    <p>Selected range versus the same dates one year earlier. Choose an observed chart point or inspect a date range. Contributions explain where a recorded change occurred; underlying business causes need supporting evidence.</p>
    <div class="diagnostic-controls"><label>From <input id="diagnosticStart" type="date"></label><label>Through <input id="diagnosticEnd" type="date"></label>
      <button type="button" class="btn btn-secondary" id="diagnosticRun">Analyze dates</button><button type="button" class="btn btn-secondary" id="diagnosticScope">Use dashboard dates</button></div>
    <p id="diagnosticBreadcrumb" aria-live="polite"></p>
    <div class="diagnostic-controls"><button type="button" class="btn btn-secondary" id="diagnosticBack" disabled>Back one level</button><button type="button" class="btn btn-secondary" id="diagnosticRetry" hidden>Retry</button></div>
    <p id="diagnosticStatus" role="status">Select a recorded period to start an investigation.</p>
    <div id="diagnosticResults" hidden></div>`
  host.append(section)
  const style = document.createElement('style')
  style.textContent = `#salesDiagnosticInvestigation{margin-block:20px;min-width:0;scroll-margin-top:90px}#salesDiagnosticInvestigation [hidden]{display:none!important} .diagnostic-controls{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-block:12px}.diagnostic-controls label{display:grid;gap:4px}.diagnostic-controls input{padding:6px;max-width:100%}#diagnosticResults table{width:100%;border-collapse:collapse;font-size:12px}#diagnosticResults th,#diagnosticResults td{padding:8px;text-align:left;border-bottom:1px solid #d5dfe9}#diagnosticResults .diagnostic-scroll{overflow:auto;max-height:420px}#diagnosticResults .diagnostic-metrics{display:flex;flex-wrap:wrap;gap:20px;margin-block:16px}#diagnosticResults .diagnostic-metrics strong{display:block}#diagnosticResults textarea{width:100%;box-sizing:border-box;min-height:75px}#diagnosticResults .diagnostic-chart{position:relative;height:310px}#diagnosticBreadcrumb{overflow-wrap:anywhere}`
  section.append(style)
  const find = <T extends HTMLElement>(id: string) => section.querySelector<T>('#' + id)!
  let disposed = false, revision = 0, scope: DiagnosticScope | null = null, result: SalesDiagnostics | null = null
  let chart: Chart | null = null, dimension: DiagnosticDimension = 'month', page = 1, investigationNotes = ''
  const history: DiagnosticScope[] = []
  const destroyChart = () => { chart?.destroy(); chart = null }
  const status = find('diagnosticStatus'), results = find('diagnosticResults')
  const activate = () => {
    root.querySelector<HTMLElement>('[data-dashboard-page="revenue"]')?.click()
    root.querySelector<HTMLButtonElement>('[data-sales-output-tab="diagnostics"]')?.click()
    section.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }
  const request = async (next: DiagnosticScope, remember = true) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next.start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(next.end_date) || next.start_date > next.end_date) {
      status.textContent = 'Choose valid dates with From on or before Through.'; return
    }
    if (remember && scope) history.push(scope)
    investigationNotes = ''
    scope = { ...next }; result = null; page = 1
    const requestRevision = ++revision
    destroyChart(); results.hidden = true; results.replaceChildren()
    find<HTMLButtonElement>('diagnosticBack').disabled = history.length === 0
    find<HTMLButtonElement>('diagnosticRetry').hidden = true
    find<HTMLInputElement>('diagnosticStart').value = scope.start_date; find<HTMLInputElement>('diagnosticEnd').value = scope.end_date
    find('diagnosticBreadcrumb').textContent = [scope.start_date + ' – ' + scope.end_date, scope.product_id && 'Product ID: ' + scope.product_id, scope.label, scope.area && 'Raw area: ' + scope.area, scope.sector && 'Buyer sector: ' + scope.sector, scope.region, scope.territory, scope.category].filter(Boolean).join(' › ')
    status.textContent = 'Loading version-bound contribution evidence…'; section.setAttribute('aria-busy', 'true')
    try {
      const data = await getSalesDiagnostics(scope)
      if (disposed || revision !== requestRevision) return
      if (scope.expected_release && !Object.keys(scope.expected_release).every(key => JSON.stringify(data.release[key]) === JSON.stringify(scope!.expected_release![key]))) {
        throw new Error('The source release changed since these charts loaded. Refresh the dashboard before investigating this selection.')
      }
      if (!diagnosticReconciliation(data)) throw new Error('Contribution totals do not reconcile. Investigation withheld; retry or review the source release.')
      result = data; status.textContent = 'Recorded contribution evidence loaded. Business causes remain unverified.'
      render()
    } catch (error) {
      if (disposed || revision !== requestRevision) return
      result = null; destroyChart(); results.hidden = true; results.replaceChildren()
      status.textContent = error instanceof Error ? error.message : 'Diagnostic evidence is unavailable.'
      find<HTMLButtonElement>('diagnosticRetry').hidden = false
    } finally { if (!disposed && revision === requestRevision) section.removeAttribute('aria-busy') }
  }
  const button = (label: string, action: () => void) => {
    const node = document.createElement('button'); node.type = 'button'; node.className = 'btn btn-secondary'; node.textContent = label; node.onclick = action; return node
  }
  const paragraph = (text: string) => { const node = document.createElement('p'); node.textContent = text; return node }
  const ledger = (ledgerScope: DiagnosticScope, label: string) => {
    window.dispatchEvent(new CustomEvent('medshield:transactions-open', { detail: { ...ledgerScope, label, release: result!.release } }))
  }
  const render = () => {
    if (!result || !scope) return
    const data = result, currentScope = scope
    destroyChart(); results.replaceChildren(); results.hidden = false
    const metrics = document.createElement('div'); metrics.className = 'diagnostic-metrics'
    for (const [label, value] of [['Prior net sales', money(data.totals.prior)], ['Current net sales', money(data.totals.current)], ['Signed change', money(data.totals.delta)], ['Growth on positive prior sales', rate(data.totals.growth_pct)]]) {
      const card = document.createElement('div'); card.textContent = label; const strong = document.createElement('strong'); strong.textContent = value; card.append(strong); metrics.append(card)
    }
    results.append(metrics, paragraph(`Matched company months: ${data.totals.matched_months}/${data.totals.expected_months}. Same date boundaries one year earlier: ${data.scope.prior_start_date} – ${data.scope.prior_end_date}. Missing company periods are excluded from both sides, not treated as zero.`))
    if (data.scope.prior_end_date >= data.scope.start_date) results.append(paragraph('These multi-year comparison windows overlap. The change compares two selected windows; it is not a sum of annual growth rates or an independent annual growth rate. Select one year or month for a year-over-year investigation.'))
    results.append(paragraph(`Coverage: ${data.coverage.coverage_status}. Unmatched current-aligned months: ${data.coverage.unmatched_months.join(', ') || 'none'}. Partial boundaries: ${data.coverage.partial_boundary_months.join(', ') || 'none'}.`))
    const financial = data.totals.current_financial
    results.append(paragraph(`Current eligible gross profit: ${money(financial.income)}; margin basis: ${money(financial.margin_revenue_basis)}; weighted gross margin: ${rate(financial.margin_pct)}. Net-sales eligible rows: ${financial.net_sales_eligible_rows}/${financial.rows}; gross-margin eligible rows: ${financial.gross_margin_eligible_rows}/${financial.rows}. Original source rows: ${financial.original_source_rows}; adjusted/estimated rows: ${financial.adjusted_estimated_rows}; unresolved product rows: ${financial.unresolved_product_rows}. These are row counts, not revenue shares.`))
    const source = paragraph(`Dataset ${data.release.dataset_id} · Fact version ${data.release.fact_delta_version} · Policy ${data.release.policy_version}. Candidate evidence; business acceptance is separate.`); source.id = 'diagnosticRelease'; results.append(source)
    if(data.contributions.evidence?.length){
      const split=document.createElement('details'),title=document.createElement('summary');title.textContent='Original versus adjusted source financial contributions';split.append(title)
      for(const row of data.contributions.evidence)split.append(paragraph(`${row.label}: prior ${money(row.prior)}; current ${money(row.current)}; signed change ${money(row.delta)}. These financial amounts retain their source evidence status.`))
      results.append(split)
    }
    const actions = document.createElement('div'); actions.className = 'diagnostic-controls'
    actions.append(button('Current transactions', () => ledger(currentScope, 'Current investigation scope')), button('Prior transactions', () => ledger({ ...currentScope, start_date: data.scope.prior_start_date, end_date: data.scope.prior_end_date }, 'Prior investigation scope')))
    results.append(actions, paragraph('The transaction view includes all retained rows in these exact dates and dimensions, including unmatched periods and rows excluded from financial metrics. Its raw totals may differ from the matched eligible comparison above.'))
    const picker = document.createElement('select'); picker.id = 'diagnosticDimension'; picker.setAttribute('aria-label', 'Contribution dimension')
    for (const key of dimensions) { const option = document.createElement('option'); option.value = key; option.textContent = key === 'area' ? 'Raw area' : key === 'sector' ? 'Buyer sector' : key; option.selected = key === dimension; picker.append(option) }
    picker.onchange = () => { dimension = picker.value as DiagnosticDimension; page = 1; render() }; results.append(picker)
    const rows = [...data.contributions[dimension]].sort((a,b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0) || a.key.localeCompare(b.key))
    const chartRows = rows.filter(row => row.delta != null).slice(0, 12)
    const chartWrap = document.createElement('div'); chartWrap.className = 'diagnostic-chart'; const canvas = document.createElement('canvas'); canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Largest signed sales contributions; exact values and inspection controls in the table'); chartWrap.append(canvas); results.append(chartWrap)
    if (chartRows.length) chart = new Chart(canvas, { type: 'bar', data: { labels: chartRows.map(row => row.label), datasets: [{ label: 'Contribution to matched net-sales change (₱)', data: chartRows.map(row => row.delta), backgroundColor: chartRows.map(row => (row.delta ?? 0) < 0 ? '#C0392B' : '#1E3A5F') }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false, onClick: (_, elements) => { const row = chartRows[elements[0]?.index]; if (row) void request(narrowScope(currentScope, dimension, row)) }, scales: { x: { ticks: { callback: value => money(Number(value)) } }, y: { ticks: { callback: function(value) { const label = this.getLabelForValue(Number(value)); return label.length > 35 ? label.slice(0, 32) + '…' : label } } } }, plugins: { legend: { display: false } } } })
    else chartWrap.hidden = true
    results.append(paragraph(`Each dimension sums to ${money(data.totals.delta)}. Signed contributions include negative offsets. Percentages use the full signed change before ranking and are unavailable when the change is zero; they can exceed 100%. Chart shows up to 12 groups; table/export includes all ${rows.length}.`))
    const scroll = document.createElement('div'); scroll.className = 'diagnostic-scroll'; scroll.tabIndex = 0; scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', 'Scrollable contribution evidence'); const table = document.createElement('table'); table.id = 'diagnosticContributionTable'
    const header = table.createTHead().insertRow(); for (const name of ['Group','Prior (₱)','Current (₱)','Change (₱)','Signed contribution %','Evidence','Inspect']) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = name; header.append(th) }
    const body = table.createTBody()
    for (const row of rows.slice((page - 1) * 50, page * 50)) {
      const tr = body.insertRow(); for (const value of [row.label, money(row.prior), money(row.current), money(row.delta), rate(row.contribution_pct), row.comparison_status + (row.identity_status ? ' · identity ' + row.identity_status : '')]) tr.insertCell().textContent = value
      tr.insertCell().append(button('Inspect ' + row.label, () => void request(narrowScope(currentScope, dimension, row))))
    }
    scroll.append(table); results.append(scroll)
    const pages = document.createElement('div'); pages.className = 'diagnostic-controls'
    const previous = button('Previous groups', () => { page--; render() }); previous.disabled = page <= 1
    const next = button('Next groups', () => { page++; render() }); next.disabled = page * 50 >= rows.length
    pages.append(previous, paragraph(`Page ${page} of ${Math.max(1, Math.ceil(rows.length / 50))}`), next); results.append(pages)
    const causeTitle = document.createElement('h3'); causeTitle.textContent = 'Root-cause evidence review'; results.append(causeTitle, paragraph('Status: unverified. The contribution bridge supports an accounting explanation. No underlying business cause has been verified by these sales records.'))
    const list = document.createElement('ul'); for (const [hypothesis, evidence] of hypotheses) { const item = document.createElement('li'); item.textContent = `${hypothesis} — needs evidence: ${evidence}`; list.append(item) }; results.append(list)
    const noteLabel = document.createElement('label'); noteLabel.textContent = 'Investigation notes, evidence references and review owner (unverified; included in export only)'
    const notes = document.createElement('textarea'); notes.id = 'diagnosticNotes'; notes.value = investigationNotes; notes.oninput = () => { investigationNotes = notes.value }; noteLabel.append(notes); results.append(noteLabel)
    for (const limitation of data.limitations) results.append(paragraph(limitation))
    results.append(button('Export investigation evidence', () => {
      const exportData = { ...data, investigation: { status: 'unverified', notes: notes.value, exported_at: new Date().toISOString(), required_evidence: hypotheses } }
      const url = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `medshield-diagnostics-${data.scope.start_date}-${data.scope.end_date}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    }))
  }
  const useDashboardScope = () => { const selected = (window as any).getDiagnosticScope?.(); if (selected) { history.length = 0; scope = null; activate(); void request(selected, false) } }
  find('diagnosticScope').onclick = useDashboardScope
  find('diagnosticRun').onclick = () => { activate(); void request({ ...scope, start_date: find<HTMLInputElement>('diagnosticStart').value, end_date: find<HTMLInputElement>('diagnosticEnd').value }) }
  find('diagnosticRetry').onclick = () => { if (scope) void request(scope, false) }
  find('diagnosticBack').onclick = () => { const previous = history.pop(); if (previous) void request(previous, false) }
  const open = (event: Event) => { history.length = 0; scope = null; activate(); void request((event as CustomEvent<DiagnosticScope>).detail, false) }
  window.addEventListener('medshield:diagnostic-open', open)
  const shortcuts: HTMLElement[] = []
  for (const pageId of ['overview', 'products', 'territory']) {
    const target = root.querySelector('#page-' + pageId); if (!target) continue
    const shortcut = button('Investigate company sales for selected dates', useDashboardScope); target.prepend(shortcut); shortcuts.push(shortcut)
  }
  return () => { disposed = true; revision++; destroyChart(); window.removeEventListener('medshield:diagnostic-open', open); section.remove(); shortcuts.forEach(node => node.remove()) }
}
