import {getJson} from './api-client'

type StreamMonth = {period: string; base_php: number; large_php: number; large_documents: number; total_php: number}
type Score = {cases: number; wape_pct: number; bias_pct: number} | null
type StreamData = {threshold_php: number; months: StreamMonth[]; source: {dataset_id: string; fact_version: number}
  totals: {base_php: number; large_php: number; total_php: number; large_documents: number}
  base_next_month_reference_php: number | null; retrospective_lead1: {base: Score; total: Score}
  large_order_patterns?: {area: string; documents: number; net_php: number; months_with_large: number; recent24_share_pct: number
    median_gap_recorded_months: number | null; last_month: string; typical_large_php: number | null}[]}

const peso = (value: number | null) => value === null ? 'Unavailable' : '₱' + Math.round(value).toLocaleString('en-PH')
const pct = (value: number) => value.toFixed(1) + '%'

/** Presentation of the D3 split: routine base flow vs large orders. Recorded months only; no forecast approval. */
export function installSalesStreamsPanel(root: HTMLElement) {
  const host = root.querySelector<HTMLElement>('#page-forecast')
  if (!host) return () => {}
  const panel = document.createElement('section')
  panel.className = 'chart-card'
  panel.id = 'salesStreams'
  panel.innerHTML = `<style>
    #salesStreams{padding:20px}#salesStreams .streams-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:14px;margin:14px 0}
    #salesStreams dd{margin:5px 0;font-size:20px;font-weight:600}#salesStreams .streams-scroll{overflow:auto;max-width:100%}
    #salesStreams th,#salesStreams td{padding:8px 10px;font-size:12px;white-space:nowrap}#salesStreams .streams-bar{display:flex;height:10px;min-width:120px;border-radius:3px;overflow:hidden;background:var(--border)}
    #salesStreams .streams-bar span:first-child{background:var(--accent,#2563eb)}#salesStreams .streams-bar span:last-child{background:repeating-linear-gradient(45deg,var(--text-secondary,#64748b) 0 3px,transparent 3px 6px)}
    #salesStreams h3{margin:22px 0 6px}@media(max-width:650px){#salesStreams{padding:14px}}</style>
    <h2>Routine sales and large orders</h2>
    <p>Original itemized sales, contracts excluded. A delivery document of ₱500,000 or more counts as a large order. Routine sales follow a steadier pattern and suit replenishment planning; large orders arrive irregularly and need a dated order or tender list, not a statistical forecast.</p>
    <p id="salesStreamsStatus" role="status">Open Forecast to load the split.</p>
    <dl class="streams-metrics">
      <div><dt>Routine share of recorded net</dt><dd id="salesStreamsShare">Unavailable</dd></div>
      <div><dt>Large orders recorded</dt><dd id="salesStreamsDocs">Unavailable</dd></div>
      <div><dt>Routine next-month reference (6-month mean)</dt><dd id="salesStreamsRef">Unavailable</dd></div>
      <div><dt>Past 1-month error: routine vs total</dt><dd id="salesStreamsError">Unavailable</dd></div></dl>
    <div class="streams-scroll" tabindex="0" role="region" aria-label="Routine and large-order sales by month"><table id="salesStreamsTable" class="product-table"></table></div>
    <h3>How often large orders came, by channel or area</h3>
    <p>Share of the last 24 recorded months with at least one large order, from past records only. Labels are channels or delivery areas, not verified buyers. Use this to keep stock and cash ready, not as a prediction: in a retrospective check it was only a weak guide to whether an order came the next month, and order amounts were not predictable (85–95% error).</p>
    <div class="streams-scroll" tabindex="0" role="region" aria-label="Large-order frequency by label"><table id="salesStreamsPatterns" class="product-table"></table></div>
    <p class="chart-subtitle"><strong>Limit:</strong> the reference is an average of recorded months, not an approved forecast or a purchase quantity. Past error is retrospective, over recorded months only; months without records are not zero sales.</p>`
  const guide = host.querySelector(':scope > [data-analytics-reading]')
  if (guide) guide.after(panel); else host.prepend(panel)
  const el = (id: string) => panel.querySelector<HTMLElement>('#salesStreams' + id)!
  let loaded = false, disposed = false, controller: AbortController | null = null

  const render = (data: StreamData) => {
    const {totals, retrospective_lead1: r} = data
    el('Share').textContent = pct(100 * totals.base_php / totals.total_php)
    el('Docs').textContent = `${totals.large_documents.toLocaleString()} · ${pct(100 * totals.large_php / totals.total_php)} of net`
    el('Ref').textContent = peso(data.base_next_month_reference_php)
    el('Error').textContent = r.base && r.total ? `${pct(r.base.wape_pct)} vs ${pct(r.total.wape_pct)}` : 'Unavailable'
    const table = el('Table') as HTMLTableElement
    table.replaceChildren()
    const head = table.createTHead().insertRow()
    for (const [label, num] of [['Month', false], ['Routine sales', true], ['Large orders', true], ['Large documents', true], ['Recorded net', true], ['Mix', false]] as const) {
      const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; th.classList.toggle('num', num); head.append(th)
    }
    const body = table.createTBody()
    for (const month of data.months.slice(-12).reverse()) {
      const tr = body.insertRow()
      for (const [value, num] of [[month.period, false], [peso(month.base_php), true], [peso(month.large_php), true], [String(month.large_documents), true], [peso(month.total_php), true]] as const) {
        const td = tr.insertCell(); td.textContent = value; td.classList.toggle('num', num)
      }
      const bar = document.createElement('div'), baseSpan = document.createElement('span'), largeSpan = document.createElement('span')
      const share = month.total_php > 0 ? Math.max(0, Math.min(100, 100 * month.base_php / month.total_php)) : 0
      bar.className = 'streams-bar'; bar.title = `Routine ${pct(share)}`; bar.setAttribute('aria-label', `Routine ${pct(share)} of recorded net`)
      baseSpan.style.width = share + '%'; largeSpan.style.width = (100 - share) + '%'
      bar.append(baseSpan, largeSpan); tr.insertCell().append(bar)
    }
    const patterns = el('Patterns') as HTMLTableElement
    patterns.replaceChildren()
    const patternHead = patterns.createTHead().insertRow()
    for (const [label, num] of [['Label', false], ['Large orders', true], ['Months with large orders, last 24', true], ['Usual gap (recorded months)', true], ['Last large order', false], ['Average large-order month, last 24', true]] as const) {
      const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; th.classList.toggle('num', num); patternHead.append(th)
    }
    const patternBody = patterns.createTBody()
    for (const row of data.large_order_patterns ?? []) {
      const tr = patternBody.insertRow()
      for (const [value, num] of [[row.area, false], [String(row.documents), true], [pct(row.recent24_share_pct), true],
        [row.median_gap_recorded_months === null ? 'Single occurrence' : String(row.median_gap_recorded_months), true], [row.last_month, false],
        [row.typical_large_php === null ? 'None in last 24' : peso(row.typical_large_php), true]] as const) {
        const td = tr.insertCell(); td.textContent = value; td.classList.toggle('num', num)
      }
    }
    const first = data.months[0]?.period, last = data.months.at(-1)?.period
    el('Status').textContent = `${data.months.length} recorded months, ${first} to ${last} · last 12 shown · dataset ${data.source.dataset_id.slice(0, 12)}… v${data.source.fact_version}. Retrospective; no forecast approval.`
  }
  const load = async () => {
    if (loaded || disposed) return
    loaded = true; controller = new AbortController(); el('Status').textContent = 'Loading routine and large-order split…'
    try { render(await getJson<StreamData>('/api/sales/sales-streams', {signal: controller.signal})) }
    catch { if (!disposed && !controller.signal.aborted) { loaded = false; el('Status').textContent = 'Routine and large-order split unavailable. Reopen Forecast to retry; no substitute values were used.' } }
  }
  const activate = (event: Event) => {
    if (event.type === 'keydown' && !['Enter', ' '].includes((event as KeyboardEvent).key)) return
    if ((event.target as HTMLElement)?.closest?.('[data-dashboard-page="forecast"]')) void load()
  }
  root.addEventListener('click', activate); root.addEventListener('keydown', activate)
  if (host.classList.contains('active')) void load()
  return () => { disposed = true; controller?.abort(); root.removeEventListener('click', activate); root.removeEventListener('keydown', activate); panel.remove() }
}
