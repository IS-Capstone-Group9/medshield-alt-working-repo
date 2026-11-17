import {getJson} from './api-client'
import {PANEL_CSS, esc, monthLabel, onPageOpen, peso, pesoShort} from './panel-kit'
import {monthOutlook, type SurgeData} from './surge-preparedness-panel'
import type {ReadinessData} from './readiness-panel'

type Policy = {origin_period: string; lead_days: number; totals: {families: number; monthly_demand_php: number; safety_stock_php: number; order_up_to_php: number}
  families: {family: string; xyz_class: string; order_up_to_php: number}[]}
const CATEGORY: Record<string, string> = {ANTIBACTERIAL: 'Antibacterials', ANALGESIC_ANTIPYRETIC: 'Fever and pain', RESPIRATORY: 'Respiratory', CRITICAL_CARE: 'Critical care', ANTIPROTOZOAL: 'Antiprotozoals'}
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Overview page: one printable page for management combining season risk, readiness and stock levels. */
export function installManagementSummaryPanel(root: HTMLElement, now = () => new Date()) {
  const host = root.querySelector<HTMLElement>('#page-overview')
  if (!host) return () => {}
  const panel = document.createElement('section')
  panel.className = 'chart-card'; panel.id = 'mgmtSummary'
  panel.innerHTML = `<style>${PANEL_CSS('mgmtSummary')}
    #mgmtSummary .ms-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:var(--space-3);align-items:center}
    #mgmtSummary .ms-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-3);margin:var(--space-3) 0}
    #mgmtSummary .ms-box{padding:var(--space-3) var(--space-4);border:1px solid var(--border);border-radius:var(--radius-card);min-width:0}
    #mgmtSummary .ms-box h3{margin:0 0 var(--space-2);font-size:13px;color:var(--text-secondary)}
    #mgmtSummary .ms-box strong.big{display:block;font-size:20px;color:var(--text-primary)}
    #mgmtSummary .ms-box ul{margin:var(--space-2) 0 0;padding-left:1.1rem;font-size:13px;line-height:1.6}
    #mgmtSummary .ms-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:middle}
    #mgmtSummary .lv-high{background:#b23b3b}#mgmtSummary .lv-medium{background:#a06a12}#mgmtSummary .lv-low{background:#2f7d5b}
    #mgmtSummary .ms-missing{color:var(--text-secondary);font-size:13px}
    @media(max-width:800px){#mgmtSummary .ms-grid{grid-template-columns:1fr}}
    @media print{body *{visibility:hidden!important}#mgmtSummary,#mgmtSummary *{visibility:visible!important}#mgmtSummary{position:absolute;inset:0 auto auto 0;width:100%;border:0!important;box-shadow:none!important}#mgmtSummaryPrint{display:none!important}}</style>
    <div class="ms-head"><div><h2 class="chart-title">Management summary</h2><p class="pk-lead" id="mgmtSummaryDate"></p></div>
      <button type="button" class="btn btn-secondary" id="mgmtSummaryPrint" disabled>Print or save as PDF</button></div>
    <p id="mgmtSummaryStatus" role="status">Open Overview to load the summary.</p>
    <div class="ms-grid" id="mgmtSummaryGrid" hidden>
      <div class="ms-box" id="mgmtSummarySeason"></div><div class="ms-box" id="mgmtSummaryMonth"></div>
      <div class="ms-box" id="mgmtSummaryTender"></div><div class="ms-box" id="mgmtSummaryStock"></div>
    </div>
    <p class="pk-lead" id="mgmtSummaryFoot" style="font-size:11px" hidden>Planning aid built from MedShield's Gold sales, DOH and PAGASA data. Estimates and scenarios are labelled; nothing here is a purchase order. Disease and weather inform preparation; they do not change the forecast.</p>`
  host.append(panel)
  const el = (id: string) => panel.querySelector<HTMLElement>('#mgmtSummary' + id)!
  let loaded = false, disposed = false, controller: AbortController | null = null
  const missing = (title: string) => `<h3>${title}</h3><p class="ms-missing">Unavailable right now; no substitute values shown.</p>`
  const load = async () => {
    if (disposed || loaded) return
    loaded = true; controller = new AbortController(); const signal = controller.signal
    el('Status').hidden = false; el('Status').textContent = 'Loading the summary…'
    const [surge, ready, policy] = await Promise.allSettled([getJson<SurgeData>('/api/sales/surge-preparedness', {signal}), getJson<ReadinessData>('/api/sales/readiness', {signal}), getJson<Policy>('/api/sales/prescriptive-policy?lead_days=14', {signal})])
    if (disposed || signal.aborted) return
    const m = now().getMonth() + 1
    el('Date').textContent = `Prepared ${now().toLocaleDateString('en-PH', {year: 'numeric', month: 'long', day: 'numeric'})}`
    if (surge.status === 'fulfilled') {
      const o = monthOutlook(surge.value, 'Territory', m), label = {high: 'High risk', medium: 'Watch', low: 'Low risk'}[o.level]
      el('Season').innerHTML = `<h3>This month's season risk</h3><strong class="big"><span class="ms-dot lv-${o.level}" aria-hidden="true"></span>${MONTH[m - 1]}: ${label}</strong><ul>${o.peaks.length ? `<li>Usually peaking: ${esc(o.peaks.map(p => p.disease).join(', '))}</li>` : '<li>No outbreak usually peaks now</li>'}${o.wet ? '<li>Rainy month</li>' : ''}${o.stormy ? `<li>Typhoon season (${o.typhoons} entered PAR in this month, 2021–2024)</li>` : ''}</ul>`
      const total = o.products.reduce((n, s) => n + (s.extra_stock_php['40'] ?? 0), 0)
      el('Month').innerHTML = `<h3>Products to review this month</h3>${o.products.length ? `<strong class="big">${pesoShort(total)} extra stock at +40%</strong><ul>${o.products.map(s => `<li>${esc(CATEGORY[s.category] ?? s.category)}: +${peso(s.extra_stock_php['40'])}</li>`).join('')}</ul>` : '<p class="ms-missing">No linked product category this month.</p>'}`
    } else { el('Season').innerHTML = missing("This month's season risk"); el('Month').innerHTML = missing('Products to review this month') }
    if (ready.status === 'fulfilled') {
      const r = ready.value, last = r.day20.track.at(-1), g = r.government_range
      el('Tender').innerHTML = `<h3>Sales and tender readiness</h3><strong class="big">Be ready for up to ${pesoShort(g.p90_php)} in government tenders (${monthLabel(g.for_period)})</strong><ul>${last ? `<li>Latest month ${monthLabel(last.period)}: ${pesoShort(last.actual_php)} (day-20 estimate ${pesoShort(last.estimate_php)})</li>` : ''}<li>Day-20 estimate error, last 12 months: ${r.day20.wape_pct?.toFixed(1) ?? '—'}% vs ${r.day20.reference_wape_pct?.toFixed(1) ?? '—'}% for the six-month average</li><li>Large government order in ${g.months_with_large_order} of the last ${g.window_months} months</li></ul>`
    } else el('Tender').innerHTML = missing('Sales and tender readiness')
    if (policy.status === 'fulfilled') {
      const p = policy.value, top = [...p.families].sort((a, b) => b.order_up_to_php - a.order_up_to_php).slice(0, 3)
      el('Stock').innerHTML = `<h3>Recommended stock levels (${p.lead_days}-day lead time)</h3><strong class="big">${pesoShort(p.totals.order_up_to_php)} for ${p.totals.families} key product families</strong><ul><li>Expected monthly demand ${pesoShort(p.totals.monthly_demand_php)}; safety stock ${pesoShort(p.totals.safety_stock_php)}</li><li>Largest: ${esc(top.map(f => f.family).join(', '))}</li><li>At sales value, as of ${monthLabel(p.origin_period)}; candidate, not a purchase order</li></ul>`
    } else el('Stock').innerHTML = missing('Recommended stock levels')
    el('Grid').hidden = false; el('Foot').hidden = false; el('Status').hidden = true; (el('Print') as HTMLButtonElement).disabled = false
  }
  el('Print').addEventListener('click', () => window.print())
  const off = onPageOpen(root, host, 'overview', () => void load())
  return () => { disposed = true; controller?.abort(); off(); panel.remove() }
}
