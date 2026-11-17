import {getJson} from './api-client'
import {PANEL_CSS, esc, onPageOpen} from './panel-kit'

type Status = 'kept' | 'failed' | 'waiting' | 'benchmark'
type Model = {name: string; layer: string; status: Status; result: string; use: string; evidence: string}
type Register = {version: string; counts: Record<Status, number>; total: number; models: Model[]; note: string}
const LABEL: Record<Status, string> = {kept: 'In use', failed: 'Failed test', waiting: 'Waiting for new months', benchmark: 'Benchmark (lost)'}
const TAG: Record<Status, string> = {kept: 'pk-pass', failed: 'pk-fail', waiting: 'pk-wait', benchmark: ''}

/** Forecast page: every model tested, with its result and status, filterable and searchable. */
export function installModelRegisterPanel(root: HTMLElement) {
  const host = root.querySelector<HTMLElement>('#page-forecast')
  if (!host) return () => {}
  const panel = document.createElement('section')
  panel.className = 'chart-card'; panel.id = 'modelRegister'
  panel.innerHTML = `<style>${PANEL_CSS('modelRegister')}
    #modelRegister .mr-controls{display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:center;margin:var(--space-3) 0}
    #modelRegister td:first-child{min-width:12rem;font-weight:600}#modelRegister td.mr-use{color:var(--text-secondary)}
    #modelRegister .mr-count{font-variant-numeric:tabular-nums;opacity:.85;margin-left:4px}</style>
    <h2 class="chart-title">Models tested</h2>
    <p class="pk-lead">Every model MedShield tried, what it scored against its rule, and whether it is used. Failed and benchmark models are kept here on purpose: they show why the simpler methods were chosen.</p>
    <p id="modelRegisterStatus" role="status">Open Forecast Modeling to load the model list.</p>
    <div id="modelRegisterBody" hidden>
      <div class="pk-cards" id="modelRegisterCards"></div>
      <div class="mr-controls"><div class="pk-seg" id="modelRegisterFilter" role="group" aria-label="Filter by status"></div>
        <label style="font-size:12px;font-weight:600;color:var(--text-secondary)">Search <input type="search" id="modelRegisterSearch" placeholder="e.g. forecast, weather"></label></div>
      <p id="modelRegisterShown" class="pk-lead" aria-live="polite"></p>
      <div class="pk-scroll" tabindex="0" role="region" aria-label="Models tested table"><table><thead><tr><th scope="col">Model</th><th scope="col">Layer</th><th scope="col">Status</th><th scope="col">Result against its rule</th><th scope="col">Used for</th></tr></thead><tbody id="modelRegisterRows"></tbody></table></div>
      <p class="pk-lead" id="modelRegisterNote" style="font-size:11px"></p>
    </div>`
  ;(host.querySelector<HTMLElement>('#forecastAccuracy') ?? host).append(panel)
  const el = (id: string) => panel.querySelector<HTMLElement>('#modelRegister' + id)!
  const search = el('Search') as HTMLInputElement
  let data: Register | null = null, filter: Status | 'all' = 'all', loaded = false, disposed = false, controller: AbortController | null = null
  const renderRows = () => {
    if (!data) return
    const term = search.value.trim().toLowerCase()
    const rows = data.models.filter(m => (filter === 'all' || m.status === filter) && (!term || `${m.name} ${m.layer} ${m.result} ${m.use}`.toLowerCase().includes(term)))
    el('Rows').innerHTML = rows.map(m => `<tr><td>${esc(m.name)}</td><td>${esc(m.layer)}</td><td><span class="pk-tag ${TAG[m.status]}">${LABEL[m.status]}</span></td><td>${esc(m.result)}</td><td class="mr-use">${esc(m.use)}</td></tr>`).join('')
      || '<tr><td colspan="5">No models match.</td></tr>'
    el('Shown').textContent = `Showing ${rows.length} of ${data.total} models.`
    el('Filter').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)))
  }
  const render = (v: Register) => {
    data = v
    const card = (label: string, n: number, note: string) => `<div class="pk-card"><span>${label}</span><strong>${n}</strong><small>${note}</small></div>`
    el('Cards').innerHTML = card('In use', v.counts.kept, 'Passed their test') + card('Failed test', v.counts.failed, 'Reported as findings')
      + card('Benchmarks', v.counts.benchmark, 'Lost to the simple average') + card('Waiting', v.counts.waiting, 'Need new months of data')
    el('Filter').innerHTML = (['all', 'kept', 'failed', 'benchmark', 'waiting'] as const).map(s =>
      `<button type="button" data-filter="${s}">${s === 'all' ? 'All' : LABEL[s]}<span class="mr-count">${s === 'all' ? v.total : v.counts[s]}</span></button>`).join('')
    el('Note').textContent = `${v.note} Register version ${v.version}; full evidence in docs/MODEL_REGISTER.md.`
    renderRows(); el('Body').hidden = false; el('Status').hidden = true
  }
  el('Filter').addEventListener('click', e => { const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-filter]'); if (b) { filter = b.dataset.filter as Status | 'all'; renderRows() } })
  search.addEventListener('input', renderRows)
  const load = async () => {
    if (disposed || loaded) return
    loaded = true; controller = new AbortController(); el('Status').hidden = false; el('Status').textContent = 'Loading the model list…'
    try { const v = await getJson<Register>('/api/models/register', {signal: controller.signal}); if (!disposed) render(v) }
    catch { if (disposed || controller.signal.aborted) return; loaded = false; el('Status').textContent = 'Model list unavailable. Please try again.' }
  }
  const off = onPageOpen(root, host, 'forecast', () => void load())
  return () => { disposed = true; controller?.abort(); off(); panel.remove() }
}
