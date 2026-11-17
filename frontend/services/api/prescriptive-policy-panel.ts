import {getJson} from './api-client'

type PolicyFamily = {family: string; xyz_class: string; service_target: number; monthly_demand_php: number; safety_stock_php: number
  order_up_to_php: number; months_of_cover: number}
type ClassSummary = {family_months: number; cycle_service: number; fill_rate: number | null}
type PolicyData = {origin_period: string; class_year: number; lead_days: number; families: PolicyFamily[]
  totals: {families: number; monthly_demand_php: number; safety_stock_php: number; order_up_to_php: number}
  backtest: ClassSummary & {first_origin: string; last_origin: string; pooled_target: number; by_class: Record<string, ClassSummary>
    uniform_rule: {months_of_cover: number; stock_saving: number} | null}
  mapping: {sha256: string}}

const peso = (value: number) => '₱' + Math.round(value).toLocaleString('en-PH')
const pct = (value: number | null) => value === null ? '—' : (100 * value).toFixed(1) + '%'
const CLASS_NAME: Record<string, string> = {X: 'steady', Y: 'variable', Z: 'erratic'}
const csvCell = (value: string | number) => { const s = String(value); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

/** O4 candidate: stock levels from tested models (queued re-test R6). Pesos at sales value, never purchase orders. */
export function installPrescriptivePolicyPanel(root: HTMLElement) {
  const host = root.querySelector<HTMLElement>('#page-inventory')
  if (!host) return () => {}
  const panel = document.createElement('section')
  panel.className = 'chart-card'
  panel.id = 'stockPolicy'
  panel.innerHTML = `<style>
    #stockPolicy{min-width:0}#stockPolicy [hidden]{display:none!important}#stockPolicy .policy-scroll{overflow:auto;max-width:100%;margin:var(--space-3) 0}
    #stockPolicy th,#stockPolicy td{padding:var(--space-2) var(--space-3);font-size:12px;white-space:nowrap}
    #stockPolicy th:first-child,#stockPolicy td:first-child{min-width:180px;max-width:260px;white-space:normal;overflow-wrap:anywhere}
    #stockPolicy p{line-height:1.5;margin:var(--space-2) 0}
    #stockPolicy .policy-controls,#stockPolicy .policy-pagination{display:flex;gap:var(--space-3);flex-wrap:wrap;align-items:center;margin:var(--space-3) 0}
    #stockPolicy label{display:inline-grid;gap:var(--space-1);font-size:12px;font-weight:600;color:var(--text-secondary);max-width:100%}
    #stockPolicy select{height:var(--control-h);max-width:100%;padding:var(--space-1) var(--space-2);border:1px solid var(--border);border-radius:var(--radius-control);background:var(--bg-card,#fff);color:var(--text-primary)}
    #stockPolicy .policy-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-3);margin:var(--space-3) 0}
    #stockPolicy .policy-card{padding:var(--space-3) var(--space-4);border:1px solid var(--border);border-radius:var(--radius-card);min-width:0}
    #stockPolicy .policy-card span{display:block;font-size:12px;font-weight:600;color:var(--text-secondary)}
    #stockPolicy .policy-card strong{display:block;font-size:20px;margin-top:var(--space-1);color:var(--text-primary);overflow-wrap:anywhere}
    #stockPolicy .policy-card small{display:block;font-size:11px;color:var(--text-secondary);margin-top:2px}
    #stockPolicy details{margin:var(--space-3) 0}#stockPolicy summary{cursor:pointer;font-weight:600;padding:var(--space-2) 0}
    #stockPolicy :is(button,select,summary):focus-visible{outline:2px solid var(--accent);outline-offset:2px}
    #stockPolicy .policy-hero{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,2fr);gap:var(--space-4);align-items:stretch;margin:var(--space-3) 0}
    #stockPolicy .policy-hero-main{padding:var(--space-4);border-radius:var(--radius-card);background:color-mix(in srgb,var(--accent) 10%,transparent);border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);min-width:0}
    #stockPolicy .policy-hero-main span{display:block;font-size:12px;font-weight:600;color:var(--text-secondary)}
    #stockPolicy .policy-hero-main strong{display:block;font-size:32px;line-height:1.15;margin:var(--space-1) 0;color:var(--text-primary);overflow-wrap:anywhere}
    #stockPolicy .policy-hero-main small{display:block;font-size:12px;color:var(--text-secondary);line-height:1.5}
    #stockPolicy .policy-hero .policy-cards{grid-template-columns:repeat(3,minmax(0,1fr));margin:0}
    #stockPolicy .policy-saving{margin-top:var(--space-2);font-weight:600;color:var(--text-primary)}
    #stockPolicy .policy-charts{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:var(--space-4);margin:var(--space-4) 0}
    #stockPolicy figure{margin:0;padding:var(--space-3) var(--space-4);border:1px solid var(--border);border-radius:var(--radius-card);min-width:0}
    #stockPolicy figcaption{font-weight:600;font-size:13px;color:var(--text-primary)}
    #stockPolicy figcaption small{display:block;font-weight:400;font-size:12px;color:var(--text-secondary);margin-top:2px}
    #stockPolicy .bar-row{display:grid;grid-template-columns:minmax(0,11rem) minmax(0,1fr) auto;gap:var(--space-2);align-items:center;font-size:12px;margin:6px 0}
    #stockPolicy .bar-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-primary)}
    #stockPolicy .bar-track{position:relative;height:14px;border-radius:3px;background:color-mix(in srgb,var(--text-secondary) 12%,transparent);overflow:hidden}
    #stockPolicy .bar-fill{position:absolute;inset:0 auto 0 0;display:flex;border-radius:3px;overflow:hidden}
    #stockPolicy .bar-safety{background:var(--accent)}#stockPolicy .bar-cycle{background:color-mix(in srgb,var(--accent) 40%,transparent)}
    #stockPolicy .bar-target{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--text-primary)}
    #stockPolicy .bar-value{font-variant-numeric:tabular-nums;color:var(--text-secondary);white-space:nowrap}
    #stockPolicy .cls{display:inline-block;min-width:1.4em;margin-right:6px;padding:0 4px;border-radius:3px;font-size:11px;font-weight:700;text-align:center;color:#fff}
    #stockPolicy .cls-X{background:#2f7d5b}#stockPolicy .cls-Y{background:#a06a12}#stockPolicy .cls-Z{background:#b23b3b}
    #stockPolicy .legend{display:flex;flex-wrap:wrap;gap:var(--space-3);font-size:11px;color:var(--text-secondary);margin-top:var(--space-2)}
    #stockPolicy .legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}
    @media(max-width:1100px){#stockPolicy .policy-hero,#stockPolicy .policy-charts{grid-template-columns:1fr}}
    @media(max-width:900px){#stockPolicy .policy-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:650px){#stockPolicy .policy-cards,#stockPolicy .policy-hero .policy-cards{grid-template-columns:1fr}#stockPolicy .bar-row{grid-template-columns:minmax(0,7rem) minmax(0,1fr) auto}}</style>
    <h2 class="chart-title">Recommended stock levels from sales history</h2>
    <p>Candidate for review · not a purchase order. Suggested stock levels for high-value product families, in pesos, not packs.</p>
    <details><summary>How these levels are set</summary><p>Expected demand is the six-month average (the forecast no other model beat). Safety stock covers the family's own past forecast misses: 95% of months for steady and variable families, 90% for erratic ones. The supplier lead time is an assumption until the company confirms it.</p></details>
    <div class="policy-controls">
      <label>Supplier lead time (assumption)<select id="stockPolicyLead"><option value="7">7 days</option><option value="14" selected>14 days</option><option value="30">30 days</option></select></label>
      <button type="button" class="btn btn-secondary" id="stockPolicyExport" disabled>Export CSV</button>
    </div>
    <p id="stockPolicyStatus" role="status">Open Prescriptive Planning to load recommended stock levels.</p>
    <div class="policy-hero" id="stockPolicyHeroRow" hidden>
      <div class="policy-hero-main" id="stockPolicyHero"></div>
      <div class="policy-cards" id="stockPolicyCards" hidden></div>
    </div>
    <div class="policy-charts" id="stockPolicyCharts" hidden>
      <figure><figcaption>Stock to hold by family<small>Largest families first. Dark part is safety stock; light part covers demand over the review period and lead time.</small></figcaption>
        <div id="stockPolicyFamilyBars" role="list" aria-label="Stock to hold by product family"></div>
        <div class="legend"><span><i class="bar-safety"></i>Safety stock</span><span><i class="bar-cycle"></i>Demand cover</span><span><b class="cls cls-X">X</b>steady</span><span><b class="cls cls-Y">Y</b>variable</span><span><b class="cls cls-Z">Z</b>erratic</span></div>
      </figure>
      <figure><figcaption>Share of demand value covered, past months<small>Bar is the result; black line is the service target. Erratic families fall short because large institutional orders are too big to stock against.</small></figcaption>
        <div id="stockPolicyClassBars" role="list" aria-label="Share of demand value covered by steadiness class"></div>
      </figure>
    </div>
    <p id="stockPolicyBacktest" hidden></p>
    <details id="stockPolicyBacktestMore" hidden><summary>How the past-months test worked</summary><p id="stockPolicyBacktestDetail"></p></details>
    <details id="stockPolicyFamilyDetails" hidden><summary>Stock levels by family</summary>
      <div class="policy-scroll table-responsive-wrap" tabindex="0" role="region" aria-label="Recommended stock level per product family"><table id="stockPolicyTable" class="product-table"></table></div>
      <div class="policy-pagination"><p id="stockPolicyFamilyStatus" role="status" aria-live="polite"></p><button type="button" class="btn btn-secondary" id="stockPolicyFamilyPrevious" aria-controls="stockPolicyTable" disabled>Previous families</button><button type="button" class="btn btn-secondary" id="stockPolicyFamilyNext" aria-controls="stockPolicyTable" disabled>Next families</button></div>
    </details>`
  const anchor = host.querySelector(':scope > [data-planning]')
  if (anchor) anchor.before(panel); else host.prepend(panel)
  const el = <T extends HTMLElement>(id: string) => panel.querySelector<T>('#stockPolicy' + id)!
  const lead = el<HTMLSelectElement>('Lead'), exportButton = el<HTMLButtonElement>('Export')
  let data: PolicyData | null = null, loadedLead = '', disposed = false, controller: AbortController | null = null
  const pageSize = 10
  let familyPage = 0

  const renderFamilies = () => {
    if (!data) return
    const start = familyPage * pageSize, end = Math.min(start + pageSize, data.families.length)
    const table = el<HTMLTableElement>('Table'); table.replaceChildren()
    const head = table.createTHead().insertRow()
    for (const [label, num] of [['Family', false], ['Steadiness', false], ['Target', true], ['Expected monthly demand', true], ['Safety stock', true], ['Stock to hold', true], ['Months of cover', true]] as const) {
      const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; th.classList.toggle('num', num); head.append(th)
    }
    const body = table.createTBody()
    for (const f of data.families.slice(start, end)) {
      const tr = body.insertRow()
      ;[[f.family, false], [`${f.xyz_class} (${CLASS_NAME[f.xyz_class]})`, false], [pct(f.service_target), true], [peso(f.monthly_demand_php), true],
        [peso(f.safety_stock_php), true], [peso(f.order_up_to_php), true], [f.months_of_cover.toFixed(1), true]].forEach(([text, num]) => {
        const td = tr.insertCell(); td.textContent = String(text); td.classList.toggle('num', Boolean(num))
      })
    }
    el('FamilyStatus').textContent = data.families.length ? `Showing ${start + 1}–${end} of ${data.families.length} families` : 'No families available.'
    el<HTMLButtonElement>('FamilyPrevious').disabled = familyPage === 0
    el<HTMLButtonElement>('FamilyNext').disabled = end >= data.families.length
  }
  const clear = () => {
    data = null; familyPage = 0; exportButton.disabled = true
    for (const id of ['HeroRow', 'Cards', 'Charts', 'Backtest', 'BacktestMore', 'FamilyDetails']) el(id).hidden = true
    for (const id of ['Hero', 'Cards', 'FamilyBars', 'ClassBars', 'Backtest', 'BacktestDetail', 'Table', 'FamilyStatus']) el(id).replaceChildren()
    el<HTMLButtonElement>('FamilyPrevious').disabled = true; el<HTMLButtonElement>('FamilyNext').disabled = true
  }
  const render = (value: PolicyData) => {
    data = value
    const t = value.totals, b = value.backtest
    const node = (tag: string, cls = '', text = '') => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n }
    const counts = ['X', 'Y', 'Z'].map(x => `${value.families.filter(f => f.xyz_class === x).length} ${CLASS_NAME[x]}`).join(' · ')
    const cover = t.monthly_demand_php > 0 ? t.order_up_to_php / t.monthly_demand_php : null
    const hero = el('Hero')
    hero.replaceChildren(node('span', '', 'Stock to hold (order up to), at sales value'), node('strong', '', peso(t.order_up_to_php)),
      node('small', '', cover === null ? 'Months of cover unavailable.' : `About ${cover.toFixed(1)} months of expected demand, at a ${value.lead_days}-day lead time (assumption).`))
    if (b.uniform_rule) hero.append(node('small', 'policy-saving', `${pct(b.uniform_rule.stock_saving)} less stock than a single "keep ${b.uniform_rule.months_of_cover.toFixed(1)} months" rule at the same coverage (exploratory).`))
    const cards = el('Cards')
    cards.replaceChildren(...([['Families', String(t.families), counts], ['Expected monthly demand', peso(t.monthly_demand_php), 'Six-month average'],
      ['Safety stock', peso(t.safety_stock_php), 'Covers past forecast misses']] as const).map(([label, val, note]) => {
      const card = node('div', 'policy-card'); card.append(node('span', '', label), node('strong', '', val), node('small', '', note)); return card
    }))
    cards.hidden = false; el('HeroRow').hidden = false

    const top = [...value.families].sort((a, c) => c.order_up_to_php - a.order_up_to_php).slice(0, 10)
    const max = top[0]?.order_up_to_php || 1
    el('FamilyBars').replaceChildren(...top.map(f => {
      const row = node('div', 'bar-row'); row.setAttribute('role', 'listitem')
      const label = node('span', 'bar-label'); label.title = f.family; label.append(node('b', `cls cls-${f.xyz_class}`, f.xyz_class), document.createTextNode(f.family))
      const track = node('span', 'bar-track'), fill = node('span', 'bar-fill'); fill.style.width = `${(100 * f.order_up_to_php / max).toFixed(2)}%`
      const safety = Math.min(1, Math.max(0, f.safety_stock_php / (f.order_up_to_php || 1)))
      const s = node('span', 'bar-safety'); s.style.width = `${(100 * safety).toFixed(2)}%`; const c = node('span', 'bar-cycle'); c.style.flex = '1'
      fill.append(s, c); track.append(fill); track.setAttribute('aria-hidden', 'true')
      const share = t.order_up_to_php > 0 ? ` · ${(100 * f.order_up_to_php / t.order_up_to_php).toFixed(0)}%` : ''
      row.append(label, track, node('span', 'bar-value', peso(f.order_up_to_php) + share))
      row.setAttribute('aria-label', `${f.family}, ${CLASS_NAME[f.xyz_class]}: stock to hold ${peso(f.order_up_to_php)}, safety stock ${peso(f.safety_stock_php)}`)
      return row
    }))
    if (value.families.length > top.length) el('FamilyBars').append(node('p', 'bar-value', `Top ${top.length} of ${value.families.length} families. Open "Stock levels by family" for all.`))
    el('ClassBars').replaceChildren(...Object.entries(b.by_class).map(([x, s]) => {
      const target = value.families.find(f => f.xyz_class === x)?.service_target ?? null
      const row = node('div', 'bar-row'); row.setAttribute('role', 'listitem')
      const label = node('span', 'bar-label'); label.append(node('b', `cls cls-${x}`, x), document.createTextNode(CLASS_NAME[x] ?? x))
      const track = node('span', 'bar-track'); track.setAttribute('aria-hidden', 'true')
      const fill = node('span', 'bar-fill'); fill.style.width = `${(100 * (s.fill_rate ?? 0)).toFixed(2)}%`; const f = node('span', 'bar-safety'); f.style.flex = '1'; fill.append(f); track.append(fill)
      if (target !== null) { const mark = node('span', 'bar-target'); mark.style.left = `calc(${(100 * target).toFixed(2)}% - 1px)`; track.append(mark) }
      row.append(label, track, node('span', 'bar-value', pct(s.fill_rate)))
      row.setAttribute('aria-label', `${CLASS_NAME[x] ?? x} families: ${pct(s.fill_rate)} of demand value covered${target === null ? '' : `, target ${pct(target)}`}`)
      return row
    }))
    if (!Object.keys(b.by_class).length) el('ClassBars').append(node('p', 'bar-value', 'Coverage by class is unavailable for this result.'))
    el('Charts').hidden = false
    const classes = Object.entries(b.by_class).map(([x, s]) => `${CLASS_NAME[x] ?? x} families ${pct(s.fill_rate)}`).join(', ')
    const uniform = b.uniform_rule ? ` A single "keep k months of stock" rule would need ${b.uniform_rule.months_of_cover.toFixed(1)} months of stock for the same coverage; these levels hold ${pct(b.uniform_rule.stock_saving)} less.` : ''
    el('Backtest').textContent = `Tested on past months: these levels covered ${pct(b.cycle_service)} of months (target ${pct(b.pooled_target)}). Exploratory; to be re-tested on new months.`; el('BacktestDetail').textContent = `Checked ${b.first_origin} to ${b.last_origin}, ${b.family_months.toLocaleString('en-PH')} family-months, using only data known at each date. Share of demand value covered: ${classes}.${uniform} Erratic families are often driven by large institutional orders that stock cannot cover; plan those from advance notice and the large-order signal on the Forecast page.`
    el('Backtest').hidden = false; el('BacktestMore').hidden = false; el('FamilyDetails').hidden = false
    renderFamilies()
    exportButton.disabled = false
    el('Status').textContent = `As of ${value.origin_period} · classes from ${value.class_year} · ${value.lead_days}-day lead time · family mapping ${value.mapping.sha256.slice(0, 12)}… (candidate, not yet confirmed by the catalog owner).`
  }
  const load = async () => {
    if (disposed || loadedLead === lead.value) return
    controller?.abort(); controller = new AbortController(); const signal = controller.signal, wanted = lead.value
    loadedLead = wanted; clear(); el('Status').textContent = 'Loading recommended stock levels…'
    try { const value = await getJson<PolicyData>(`/api/sales/prescriptive-policy?lead_days=${wanted}`, {signal}); if (!disposed && !signal.aborted) render(value) }
    catch {
      if (disposed || signal.aborted) return
      loadedLead = ''; clear()
      el('Status').textContent = 'Recommended stock levels unavailable (the family mapping or Gold sales could not be verified). No substitute values were used.'
    }
  }
  const exportCsv = () => {
    if (!data || exportButton.disabled) return
    const header = ['family', 'steadiness_class', 'service_target', 'expected_monthly_demand_php', 'safety_stock_php', 'order_up_to_php', 'months_of_cover', 'as_of', 'lead_days_assumption', 'status']
    const lines = [header.join(','), ...data.families.map(f => [f.family, f.xyz_class, f.service_target, f.monthly_demand_php.toFixed(2), f.safety_stock_php.toFixed(2),
      f.order_up_to_php.toFixed(2), f.months_of_cover.toFixed(2), data!.origin_period, data!.lead_days, 'candidate_not_a_purchase_order'].map(csvCell).join(','))]
    const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], {type: 'text/csv;charset=utf-8'}))
    const a = document.createElement('a'); a.href = url; a.download = `medshield_stock_levels_${data.origin_period}_${data.lead_days}d.csv`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  lead.addEventListener('change', () => void load())
  exportButton.addEventListener('click', exportCsv)
  el('FamilyPrevious').addEventListener('click', () => { if (familyPage > 0) { familyPage--; renderFamilies() } })
  el('FamilyNext').addEventListener('click', () => { if (data && (familyPage + 1) * pageSize < data.families.length) { familyPage++; renderFamilies() } })
  const activate = (event: Event) => {
    if (event.type === 'keydown' && !['Enter', ' '].includes((event as KeyboardEvent).key)) return
    if ((event.target as HTMLElement)?.closest?.('[data-dashboard-page="inventory"]')) void load()
  }
  root.addEventListener('click', activate); root.addEventListener('keydown', activate)
  if (host.classList.contains('active')) void load()
  return () => { disposed = true; controller?.abort(); root.removeEventListener('click', activate); root.removeEventListener('keydown', activate); panel.remove() }
}
