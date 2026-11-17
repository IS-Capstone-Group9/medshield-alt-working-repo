import {getJson} from './api-client'

type Family = {family: string; abc_xyz: string; net_php: number; share_pct: number; months_with_sales: number; cv: number; handling: string}
type FamilyData = {year: number; families: Family[]; grid: Record<string, {families: number; share_pct: number}>
  mapping: {sha256: string; review_status: string}}

const peso = (value: number) => '₱' + Math.round(value).toLocaleString('en-PH')
const ORDER = ['AX', 'AY', 'AZ', 'BX', 'BY', 'BZ', 'CX', 'CY', 'CZ']

/** Candidate family ABC–XYZ (decision 015). Presentation only; handling notes are suggestions, not stock rules. */
export function installFamilyAbcPanel(root: HTMLElement) {
  const host = root.querySelector<HTMLElement>('#page-products')
  if (!host) return () => {}
  const panel = document.createElement('section')
  panel.className = 'chart-card'
  panel.id = 'familyAbc'
  // Without this marker the Products page cleanup removes the panel as if it were a sample table.
  panel.setAttribute('data-runtime-panel', '')
  panel.innerHTML = `<style>
    #familyAbc{padding:20px}#familyAbc .family-scroll{overflow:auto;max-width:100%;margin:10px 0}
    #familyAbc th,#familyAbc td{padding:8px 10px;font-size:12px;white-space:nowrap}#familyAbc td.wrap{white-space:normal;min-width:220px;text-align:left}#familyAbc th:last-child{text-align:left}
    #familyAbc label{display:inline-grid;gap:4px;margin:8px 0}#familyAbc select{padding:6px;border:1px solid var(--border);border-radius:5px;background:var(--bg-card,#fff);color:var(--text-primary)}
    #familyAbc h3{margin:18px 0 6px}@media(max-width:650px){#familyAbc{padding:14px}}</style>
    <h2>Product families by value and steadiness (ABC–XYZ)</h2>
    <p>Candidate · AI-reviewed family mapping, not yet confirmed by the catalog owner. A/B/C = share of the year's sales (top 80%, next 15%, rest). X/Y/Z = how steady monthly sales were (steady, variable, erratic). This is a financial view, not clinical importance; handling notes are suggestions to review, not stock rules.</p>
    <p id="familyAbcStatus" role="status">Open Products to load family classes.</p>
    <div class="family-scroll" tabindex="0" role="region" aria-label="Families and sales share by class"><table id="familyAbcGrid" class="product-table"></table></div>
    <h3>Families in a class</h3>
    <label>Class<select id="familyAbcClass" disabled></select></label>
    <div class="family-scroll" tabindex="0" role="region" aria-label="Families in the selected class"><table id="familyAbcTable" class="product-table"></table></div>`
  const guide = host.querySelector(':scope > [data-analytics-reading]')
  if (guide) guide.after(panel); else host.prepend(panel)
  const el = <T extends HTMLElement>(id: string) => panel.querySelector<T>('#familyAbc' + id)!
  const select = el<HTMLSelectElement>('Class')
  let data: FamilyData | null = null, loaded = false, disposed = false, controller: AbortController | null = null

  const fill = (table: HTMLTableElement, headers: [string, boolean][], rows: string[][], wrapColumn = -1) => {
    table.replaceChildren()
    const head = table.createTHead().insertRow()
    for (const [label, num] of headers) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; th.classList.toggle('num', num); head.append(th) }
    const body = table.createTBody()
    for (const row of rows) {
      const tr = body.insertRow()
      row.forEach((value, i) => { const td = tr.insertCell(); td.textContent = value; td.classList.toggle('num', headers[i][1]); td.classList.toggle('wrap', i === wrapColumn) })
    }
  }
  const renderClass = () => {
    if (!data) return
    const list = data.families.filter(f => f.abc_xyz === select.value)
    fill(el('Table'), [['Family', false], ['Sales', true], ['Share', true], ['Months with sales', true], ['Steadiness (CV)', true], ['Suggested handling', false]],
      list.slice(0, 50).map(f => [f.family, peso(f.net_php), f.share_pct.toFixed(2) + '%', String(f.months_with_sales), f.cv.toFixed(2), f.handling]), 5)
  }
  const render = (value: FamilyData) => {
    data = value
    const present = ORDER.filter(c => value.grid[c])
    fill(el('Grid'), [['Class', false], ['Families', true], ['Share of sales', true], ['Suggested handling', false]],
      present.map(c => [c, String(value.grid[c].families), value.grid[c].share_pct.toFixed(1) + '%', value.families.find(f => f.abc_xyz === c)!.handling]), 3)
    select.replaceChildren(...present.map(c => new Option(`${c} (${value.grid[c].families})`, c)))
    select.value = present[0]; select.disabled = false; renderClass()
    el('Status').textContent = `${value.year} calendar year · ${value.families.length} families with positive sales · mapping ${value.mapping.sha256.slice(0, 12)}… · up to 50 families listed per class.`
  }
  const load = async () => {
    if (loaded || disposed) return
    loaded = true; controller = new AbortController(); el('Status').textContent = 'Loading family classes…'
    try { render(await getJson<FamilyData>('/api/sales/family-abc-xyz', {signal: controller.signal})) }
    catch { if (!disposed && !controller.signal.aborted) { loaded = false; el('Status').textContent = 'Family classes unavailable (the reviewed family mapping or Gold sales could not be verified). No substitute classes were used.' } }
  }
  select.addEventListener('change', renderClass)
  const activate = (event: Event) => {
    if (event.type === 'keydown' && !['Enter', ' '].includes((event as KeyboardEvent).key)) return
    if ((event.target as HTMLElement)?.closest?.('[data-dashboard-page="products"]')) void load()
  }
  root.addEventListener('click', activate); root.addEventListener('keydown', activate)
  if (host.classList.contains('active')) void load()
  return () => { disposed = true; controller?.abort(); root.removeEventListener('click', activate); root.removeEventListener('keydown', activate); panel.remove() }
}
