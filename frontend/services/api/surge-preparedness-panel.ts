import {getJson} from './api-client'

type CalendarRow = {disease: string; geography: string; seasonal_index: (number | null)[]; surge_months: number[]; total_cases_2021_2025: number; pandemic_flag: boolean}
type AlertRow = {alert: string; hit_rate_alert: number | null; hit_rate_no_alert: number | null; p_holm: number; useful: boolean; alert_months: number}
type Scenario = {category: string; diseases: string[]; surge_months: number[]; months_used: number; mean_routine_php: number | null; extra_stock_php: Record<string, number | null>}
export type SurgeData = {preparedness_window_months: number[]; surge_index_rule: number; calendar: CalendarRow[]; alerts: AlertRow[]; alert_note: string; scenarios: Scenario[]; uplifts: number[]
  weather: {cyclones_entering_par_by_month: number[]; cyclones_total: number; rainfall_mm_mean_by_month: (number | null)[]; wet_months: number[]; rainfall_stations: string}
  source: {payload_sha256: string; dataset_id: string}}
type Level = 'high' | 'medium' | 'low'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const CATEGORY: Record<string, string> = {ANTIBACTERIAL: 'Antibacterials', ANALGESIC_ANTIPYRETIC: 'Fever and pain', RESPIRATORY: 'Respiratory', CRITICAL_CARE: 'Critical care', ANTIPROTOZOAL: 'Antiprotozoals'}
const GEOS: [string, string][] = [['Territory', 'All three regions'], ['CALABARZON', 'CALABARZON'], ['MIMAROPA', 'MIMAROPA'], ['Bicol', 'Bicol']]
const LEVEL_TEXT: Record<Level, string> = {high: 'High risk', medium: 'Watch', low: 'Low risk'}
const MAJOR_CASES = 5000
const peso = (v: number | null | undefined) => v === null || v === undefined ? '—' : '₱' + Math.round(v).toLocaleString('en-PH')
const pct = (v: number | null) => v === null ? '—' : (100 * v).toFixed(0) + '%'
const list = (ms: number[]) => ms.length ? ms.map(m => MON[m - 1]).join(', ') : 'none'
const csvCell = (value: string | number) => { const s = String(value); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]!))

/** Pure: what peaks in month m (1-12) for one area, and how risky the month is. */
export function monthOutlook(data: SurgeData, geo: string, m: number) {
  const rule = data.surge_index_rule
  const peaks = data.calendar.filter(c => c.geography === geo && !c.pandemic_flag && (c.seasonal_index[m - 1] ?? 0) >= rule)
    .map(c => ({disease: c.disease, index: c.seasonal_index[m - 1]!, major: c.total_cases_2021_2025 >= MAJOR_CASES}))
    .sort((a, b) => b.index - a.index)
  const typhoons = data.weather.cyclones_entering_par_by_month[m - 1] ?? 0, rain = data.weather.rainfall_mm_mean_by_month[m - 1] ?? null
  const wet = data.weather.wet_months.includes(m), stormy = typhoons >= 8
  const major = peaks.some(p => p.major)
  const level: Level = major && (wet || stormy) ? 'high' : peaks.length || wet || stormy ? 'medium' : 'low'
  const products = data.scenarios.filter(s => s.surge_months.includes(m))
  return {peaks, typhoons, rain, wet, stormy, level, products}
}

/** Disease- and weather-informed preparedness: observed calendar, retrospective alert results, assumed uplift scenario. */
export function installSurgePreparednessPanel(root: HTMLElement, now = () => new Date()) {
  const host = root.querySelector<HTMLElement>('#page-inventory')
  if (!host) return () => {}
  const panel = document.createElement('section')
  panel.className = 'surge-prep'; panel.id = 'surgePrep'; panel.setAttribute('aria-labelledby', 'surgePrepTitle')
  panel.innerHTML = `<style>
    #surgePrep{--hi:#b23b3b;--md:#a06a12;--lo:#2f7d5b;min-width:0;margin-top:var(--space-5,24px);padding-top:var(--space-4,16px);border-top:1px solid var(--border)}
    #surgePrep p{line-height:1.5;margin:var(--space-2) 0}#surgePrep h3{font-size:14px;margin:var(--space-4) 0 var(--space-2)}
    #surgePrep .sp-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:var(--space-3);align-items:end}
    #surgePrep .sp-lead{color:var(--text-secondary);font-size:13px;max-width:72ch}
    #surgePrep .tag{display:inline-block;font-size:11px;font-weight:700;padding:1px 6px;border-radius:999px;border:1px solid var(--border);color:var(--text-secondary);white-space:nowrap}
    #surgePrep .tag-obs{border-color:color-mix(in srgb,var(--lo) 50%,transparent);color:var(--lo)}
    #surgePrep .tag-scn{border-color:color-mix(in srgb,var(--md) 50%,transparent);color:var(--md)}
    #surgePrep label{display:inline-grid;gap:var(--space-1);font-size:12px;font-weight:600;color:var(--text-secondary)}
    #surgePrep select{height:var(--control-h);padding:var(--space-1) var(--space-2);border:1px solid var(--border);border-radius:var(--radius-control);background:var(--bg-card,#fff);color:var(--text-primary)}
    #surgePrep .sp-status{display:flex;gap:var(--space-3);align-items:center;padding:var(--space-3) var(--space-4);border-radius:var(--radius-card);border:1px solid var(--border);margin:var(--space-3) 0;border-left-width:6px}
    #surgePrep .sp-status[data-level=high]{border-left-color:var(--hi);background:color-mix(in srgb,var(--hi) 7%,transparent)}
    #surgePrep .sp-status[data-level=medium]{border-left-color:var(--md);background:color-mix(in srgb,var(--md) 7%,transparent)}
    #surgePrep .sp-status[data-level=low]{border-left-color:var(--lo);background:color-mix(in srgb,var(--lo) 7%,transparent)}
    #surgePrep .sp-status strong{display:block;font-size:16px;color:var(--text-primary)}#surgePrep .sp-status small{display:block;color:var(--text-secondary);font-size:12px;margin-top:2px}
    #surgePrep .dot{flex:none;width:12px;height:12px;border-radius:50%}
    #surgePrep [data-level=high] .dot,#surgePrep .lv-high{background:var(--hi)}#surgePrep [data-level=medium] .dot,#surgePrep .lv-medium{background:var(--md)}#surgePrep [data-level=low] .dot,#surgePrep .lv-low{background:var(--lo)}
    #surgePrep .sp-months{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:4px;margin:var(--space-2) 0}
    #surgePrep .sp-month{position:relative;display:grid;gap:4px;justify-items:center;padding:6px 2px 8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-card,#fff);color:var(--text-primary);cursor:pointer;font:inherit;font-size:12px;font-weight:600;min-width:0}
    #surgePrep .sp-month:hover{border-color:var(--accent)}
    #surgePrep .sp-month[aria-pressed=true]{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 35%,transparent);background:color-mix(in srgb,var(--accent) 8%,var(--bg-card,#fff))}
    #surgePrep .sp-month .bar{width:70%;height:6px;border-radius:3px}
    #surgePrep .sp-month .now{position:absolute;top:-8px;font-size:9px;font-weight:700;padding:0 4px;border-radius:4px;background:var(--accent);color:#fff}
    #surgePrep .sp-legend{display:flex;flex-wrap:wrap;gap:var(--space-3);font-size:11px;color:var(--text-secondary)}
    #surgePrep .sp-legend i{display:inline-block;width:14px;height:6px;border-radius:3px;margin-right:4px;vertical-align:middle}
    #surgePrep .sp-detail{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-3);margin:var(--space-3) 0}
    #surgePrep .sp-card{padding:var(--space-3) var(--space-4);border:1px solid var(--border);border-radius:var(--radius-card);min-width:0}
    #surgePrep .sp-card h4{margin:0 0 var(--space-2);font-size:12px;color:var(--text-secondary);font-weight:600;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
    #surgePrep .sp-card ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
    #surgePrep .sp-card li{display:flex;justify-content:space-between;gap:var(--space-2);font-size:13px}
    #surgePrep .sp-card li span:last-child{color:var(--text-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}
    #surgePrep .sp-empty{color:var(--text-secondary);font-size:13px}
    #surgePrep .seg{display:inline-flex;border:1px solid var(--border);border-radius:var(--radius-control);overflow:hidden}
    #surgePrep .seg button{border:0;background:transparent;padding:6px 14px;font:inherit;font-size:13px;font-weight:600;color:var(--text-secondary);cursor:pointer}
    #surgePrep .seg button+button{border-left:1px solid var(--border)}
    #surgePrep .seg button[aria-checked=true]{background:var(--accent);color:#fff}
    #surgePrep .sp-controls{display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:center;margin:var(--space-2) 0}
    #surgePrep .sp-bars{display:grid;gap:8px;margin:var(--space-3) 0}
    #surgePrep .sp-bar{display:grid;grid-template-columns:minmax(0,9rem) minmax(0,1fr) minmax(5.5rem,auto);gap:var(--space-2);align-items:center;font-size:13px;padding:4px 6px;border-radius:6px}
    #surgePrep .sp-bar[data-active=true]{background:color-mix(in srgb,var(--accent) 9%,transparent)}
    #surgePrep .sp-bar small{display:block;font-size:11px;color:var(--text-secondary)}
    #surgePrep .track{display:block;height:12px;border-radius:3px;background:color-mix(in srgb,var(--text-secondary) 12%,transparent);overflow:hidden}
    #surgePrep .fill{display:block;height:100%;border-radius:3px;background:var(--accent);transition:width .25s ease}
    #surgePrep .sp-bar[data-active=false] .fill{background:color-mix(in srgb,var(--accent) 45%,transparent)}
    #surgePrep .val{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
    #surgePrep .sp-total{font-size:13px;color:var(--text-secondary)}#surgePrep .sp-total strong{color:var(--text-primary)}
    #surgePrep details{margin:var(--space-2) 0;border:1px solid var(--border);border-radius:var(--radius-card);padding:0 var(--space-3)}
    #surgePrep summary{cursor:pointer;font-weight:600;padding:var(--space-2) 0;font-size:13px}
    #surgePrep .sp-scroll{overflow:auto;max-width:100%;margin:var(--space-2) 0}
    #surgePrep table{border-collapse:collapse;font-size:12px}#surgePrep th,#surgePrep td{padding:4px 6px;text-align:center;white-space:nowrap;border-bottom:1px solid var(--border)}
    #surgePrep th[scope=row]{text-align:left}
    #surgePrep td.hot{background:color-mix(in srgb,var(--hi) 30%,transparent);font-weight:700}#surgePrep td.warm{background:color-mix(in srgb,var(--md) 14%,transparent)}
    #surgePrep td.sel,#surgePrep th.sel{outline:2px solid var(--accent);outline-offset:-2px}
    #surgePrep :is(button,select,summary):focus-visible{outline:2px solid var(--accent);outline-offset:2px}
    @media(max-width:900px){#surgePrep .sp-detail{grid-template-columns:1fr}}
    @media(max-width:650px){#surgePrep .sp-months{grid-template-columns:repeat(6,minmax(0,1fr));row-gap:12px}#surgePrep .sp-bar{grid-template-columns:minmax(0,1fr) minmax(5.5rem,auto)}#surgePrep .sp-bar .track{grid-column:1/-1;grid-row:2}}
    @media(prefers-reduced-motion:reduce){#surgePrep .fill{transition:none}}</style>
    <div class="sp-head"><div>
      <h2 class="chart-title" id="surgePrepTitle">Outbreak and typhoon season</h2>
      <p class="sp-lead">When outbreaks and typhoons usually hit, and how much extra stock a buffer would take. This helps you prepare; it does not predict sales.</p></div>
      <label>Area<select id="surgePrepGeo">${GEOS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label></div>
    <p id="surgePrepStatus" role="status">Open Prescriptive Planning to load the season calendar.</p>
    <div id="surgePrepBody" hidden>
      <div class="sp-status" id="surgePrepNow" data-level="low"><span class="dot" aria-hidden="true"></span><div><strong id="surgePrepNowTitle"></strong><small id="surgePrepNowText"></small></div></div>
      <h3>Pick a month <span class="tag tag-obs">Observed</span></h3>
      <div class="sp-months" id="surgePrepMonths" role="group" aria-label="Months"></div>
      <div class="sp-legend" aria-hidden="true"><span><i class="lv-high"></i>High risk: major outbreak and rainy or typhoon month</span><span><i class="lv-medium"></i>Watch: any outbreak peak, heavy rain or many typhoons</span><span><i class="lv-low"></i>Low risk</span></div>
      <div class="sp-detail" id="surgePrepDetail" aria-live="polite"></div>
      <h3>Extra stock if you add a buffer <span class="tag tag-scn">Scenario</span></h3>
      <div class="sp-controls"><span id="surgePrepUpliftLabel" style="font-size:12px;font-weight:600;color:var(--text-secondary)">Buffer size</span>
        <div class="seg" role="radiogroup" aria-labelledby="surgePrepUpliftLabel" id="surgePrepUplift"></div>
        <button type="button" class="btn btn-secondary" id="surgePrepExport" disabled>Export CSV</button></div>
      <div class="sp-bars" id="surgePrepBars" role="list" aria-label="Extra stock by product category"></div>
      <p class="sp-total" id="surgePrepTotal"></p>
      <p class="sp-lead">Extra stock = buffer × one month of usual routine sales in that category's outbreak months (large institutional orders left out). Shown at sales value in pesos, not packs or purchase cost. Highlighted rows matter in the selected month. Company-wide sales; not split by region.</p>
      <details id="surgePrepCalDetails"><summary>Full outbreak and weather calendar</summary>
        <div class="sp-scroll"><table id="surgePrepCalendar"></table></div>
        <p class="sp-lead">Each cell compares the month with an average month (1.0 = average); red cells are 1.2 or more. DOH weekly cases 2021–2025. <span id="surgePrepWeatherNote"></span> COVID-19 follows pandemic waves and is left out of the risk levels.</p></details>
      <details id="surgePrepAlertDetails"><summary>Did past alerts come before sales rose? <span class="tag">Retrospective</span></summary>
        <div class="sp-scroll"><table id="surgePrepAlerts"></table></div><p class="sp-lead" id="surgePrepAlertNote"></p></details>
      <p class="sp-lead" id="surgePrepSource" style="font-size:11px"></p>
    </div>`
  ;(host.querySelector<HTMLElement>('#stockPolicy') ?? host).append(panel)
  const el = <T extends HTMLElement = HTMLElement>(id: string) => panel.querySelector<T>('#surgePrep' + id)!
  const geo = el<HTMLSelectElement>('Geo'), exportButton = el<HTMLButtonElement>('Export')
  const current = now().getMonth() + 1
  let data: SurgeData | null = null, loaded = false, disposed = false, controller: AbortController | null = null, month = current, uplift = ''

  const renderNow = () => {
    if (!data) return
    const o = monthOutlook(data, geo.value, current), box = el('Now')
    box.dataset.level = o.level
    const peaks = o.peaks.map(p => p.disease).join(', ')
    let next = ''
    if (o.level === 'low') for (let k = 1; k <= 12; k++) { const m = (current - 1 + k) % 12 + 1; if (monthOutlook(data, geo.value, m).level !== 'low') { next = ` Next watch month: ${MONTH[m - 1]} (in ${k} month${k > 1 ? 's' : ''}).`; break } }
    el('NowTitle').textContent = `This month (${MONTH[current - 1]}): ${LEVEL_TEXT[o.level]}`
    el('NowText').textContent = (peaks ? `${peaks} usually peak${o.peaks.length === 1 ? 's' : ''} now.` : 'No outbreak usually peaks now.')
      + (o.wet ? ' Rainy month.' : '') + (o.stormy ? ` Typhoon season (${o.typhoons} entered PAR in this month, 2021–2024).` : '') + next
  }
  const renderMonths = () => {
    if (!data) return
    el('Months').replaceChildren(...MON.map((name, i) => {
      const m = i + 1, o = monthOutlook(data!, geo.value, m), b = document.createElement('button')
      b.type = 'button'; b.className = 'sp-month'; b.dataset.month = String(m); b.dataset.level = o.level
      b.setAttribute('aria-pressed', String(m === month))
      b.setAttribute('aria-label', `${MONTH[i]}: ${LEVEL_TEXT[o.level]}${m === current ? ', this month' : ''}`)
      b.title = `${MONTH[i]} · ${LEVEL_TEXT[o.level]}${o.peaks.length ? ' · ' + o.peaks.map(p => p.disease).join(', ') : ''}`
      b.innerHTML = `${m === current ? '<span class="now" aria-hidden="true">Now</span>' : ''}<span>${name}</span><span class="bar lv-${o.level}" aria-hidden="true"></span>`
      return b
    }))
  }
  const renderDetail = () => {
    if (!data) return
    const o = monthOutlook(data, geo.value, month), u = uplift
    const card = (title: string, tag: string, body: string) => `<div class="sp-card"><h4>${title} ${tag}</h4>${body}</div>`
    const peaks = o.peaks.length ? `<ul>${o.peaks.map(p => `<li><span>${esc(p.disease)}</span><span>${p.index.toFixed(1)}× usual</span></li>`).join('')}</ul>` : '<p class="sp-empty">No outbreak usually peaks this month.</p>'
    const weather = `<ul><li><span>Typhoons</span><span>${o.typhoons} entered PAR, 2021–24${o.stormy ? ' · peak' : ''}</span></li><li><span>Rainfall</span><span>${o.rain === null ? '—' : Math.round(o.rain) + ' mm'}${o.wet ? ' · rainy' : ''}</span></li></ul>`
    const products = o.products.length ? `<ul>${o.products.map(s => `<li><span>${esc(CATEGORY[s.category] ?? s.category)}</span><span>+${peso(s.extra_stock_php[u])}</span></li>`).join('')}</ul>` : '<p class="sp-empty">No linked product category this month.</p>'
    el('Detail').innerHTML = card(`${MONTH[month - 1]} · outbreaks usually peaking`, '<span class="tag tag-obs">Observed</span>', peaks)
      + card('Weather', '<span class="tag tag-obs">Observed</span>', weather) + card(`Products to review (+${u}% buffer)`, '<span class="tag tag-scn">Scenario</span>', products)
  }
  const renderBars = () => {
    if (!data) return
    const u = uplift, rows = [...data.scenarios].sort((a, b) => (b.extra_stock_php[u] ?? -1) - (a.extra_stock_php[u] ?? -1))
    const max = Math.max(1, ...rows.map(s => s.extra_stock_php[u] ?? 0))
    el('Bars').replaceChildren(...rows.map(s => {
      const v = s.extra_stock_php[u] ?? null, active = s.surge_months.includes(month), row = document.createElement('div')
      row.className = 'sp-bar'; row.setAttribute('role', 'listitem'); row.dataset.active = String(active)
      const name = CATEGORY[s.category] ?? s.category
      row.innerHTML = `<span>${esc(name)}<small>${list(s.surge_months)}</small></span><span class="track" aria-hidden="true"><span class="fill" style="width:${v === null ? 0 : (100 * v / max).toFixed(1)}%"></span></span><span class="val">${peso(v)}</span>`
      row.setAttribute('aria-label', `${name}: extra stock ${peso(v)} at +${u}%, outbreak months ${list(s.surge_months)}${active ? ', relevant in ' + MONTH[month - 1] : ''}`)
      return row
    }))
    const sel = data.scenarios.filter(s => s.surge_months.includes(month)).reduce((n, s) => n + (s.extra_stock_php[u] ?? 0), 0)
    el('Total').innerHTML = `In <strong>${MONTH[month - 1]}</strong>, a +${u}% buffer on the highlighted categories is about <strong>${peso(sel)}</strong> of extra stock.`
  }
  const renderCalendar = () => {
    if (!data) return
    const head = `<thead><tr><th scope="col">Disease</th>${MON.map((m, i) => `<th scope="col" class="${i + 1 === month ? 'sel' : ''}">${m}</th>`).join('')}</tr></thead>`
    const rows = data.calendar.filter(c => c.geography === geo.value).sort((a, b) => b.total_cases_2021_2025 - a.total_cases_2021_2025)
    const cell = (cls: string, i: number, v: string) => `<td class="${cls}${i + 1 === month ? ' sel' : ''}">${v}</td>`
    const w = data.weather
    el('Calendar').innerHTML = head + '<tbody>' + rows.map(c => `<tr><th scope="row">${esc(c.disease)}${c.pandemic_flag ? ' (pandemic)' : ''}</th>${c.seasonal_index.map((v, i) =>
      cell(v !== null && v >= data!.surge_index_rule ? 'hot' : v !== null && v >= 1 ? 'warm' : '', i, v === null ? '—' : v.toFixed(1))).join('')}</tr>`).join('')
      + `<tr><th scope="row">Typhoons (count)</th>${w.cyclones_entering_par_by_month.map((n, i) => cell(n >= 8 ? 'hot' : n >= 4 ? 'warm' : '', i, String(n))).join('')}</tr>`
      + `<tr><th scope="row">Rainfall (mm)</th>${w.rainfall_mm_mean_by_month.map((r, i) => cell(w.wet_months.includes(i + 1) ? 'hot' : '', i, r === null ? '—' : String(Math.round(r)))).join('')}</tr></tbody>`
  }
  const renderAll = () => { renderNow(); renderMonths(); renderDetail(); renderBars(); renderCalendar() }
  const select = (m: number, focus = false) => {
    month = m; renderMonths(); renderDetail(); renderBars(); renderCalendar()
    if (focus) el('Months').querySelector<HTMLButtonElement>(`[data-month="${m}"]`)?.focus()
  }
  const render = (v: SurgeData) => {
    data = v; uplift = String(v.uplifts[1] ?? v.uplifts[0])
    el('Uplift').replaceChildren(...v.uplifts.map(u => {
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.uplift = String(u); b.textContent = `+${u}%`; return b
    }))
    const syncUplift = () => el('Uplift').querySelectorAll<HTMLButtonElement>('button').forEach(b => { const on = b.dataset.uplift === uplift; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1 })
    syncUplift(); (el('Uplift') as HTMLElement & {sync?: () => void}).sync = syncUplift
    el('WeatherNote').textContent = `${v.weather.cyclones_total} tropical cyclones entered PAR in 2021–2024 (PAGASA). Rainfall from ${v.weather.rainfall_stations}, an approximation for the regions.`
    el('Alerts').innerHTML = `<thead><tr><th scope="col">Alert</th><th scope="col">Alert months</th><th scope="col">Sales rose after alert</th><th scope="col">Sales rose otherwise</th><th scope="col">Reliable signal?</th></tr></thead><tbody>`
      + v.alerts.map(a => `<tr><th scope="row">${esc(a.alert)}</th><td>${a.alert_months}</td><td>${pct(a.hit_rate_alert)}</td><td>${pct(a.hit_rate_no_alert)}</td><td>${a.useful ? 'No: rule passed but trend-driven' : 'No'}</td></tr>`).join('') + '</tbody>'
    el('AlertNote').textContent = v.alert_note
    renderAll(); el('Body').hidden = false; exportButton.disabled = false
    el('Status').textContent = ''; el('Status').hidden = true
    el('Source').textContent = `Source: candidate calendar ${v.source.payload_sha256.slice(0, 12)}… · sales dataset ${v.source.dataset_id}. Planning aid, not a purchase order.`
  }
  const load = async () => {
    if (disposed || loaded) return
    controller?.abort(); controller = new AbortController(); const signal = controller.signal
    loaded = true; el('Status').hidden = false; el('Status').textContent = 'Loading the season calendar…'
    try { const v = await getJson<SurgeData>('/api/sales/surge-preparedness', {signal}); if (!disposed && !signal.aborted) render(v) }
    catch {
      if (disposed || signal.aborted) return
      loaded = false; data = null; el('Body').hidden = true; exportButton.disabled = true
      el('Status').textContent = 'Season calendar unavailable (the saved calendar, mappings or Gold sales could not be verified). No substitute values were used.'
    }
  }
  const exportCsv = () => {
    if (!data) return
    const lines = [['category', 'outbreak_months', 'linked_diseases', 'months_used', 'base_routine_php_per_month', ...data.uplifts.map(u => `extra_stock_php_plus_${u}pct`), 'evidence_type'].join(','),
      ...data.scenarios.map(s => [s.category, list(s.surge_months), s.diseases.join(' '), s.months_used, s.mean_routine_php === null ? '' : s.mean_routine_php.toFixed(2),
        ...data!.uplifts.map(u => { const x = s.extra_stock_php[String(u)]; return x === null || x === undefined ? '' : x.toFixed(2) }), 'scenario_assumed_uplift_not_a_purchase_order'].map(csvCell).join(','))]
    const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], {type: 'text/csv;charset=utf-8'}))
    const a = document.createElement('a'); a.href = url; a.download = 'medshield_surge_preparedness_scenario.csv'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  el('Months').addEventListener('click', e => { const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-month]'); if (b) select(Number(b.dataset.month)) })
  el('Months').addEventListener('keydown', e => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-month]'); if (!b) return
    const step = {ArrowRight: 1, ArrowLeft: -1, Home: 0, End: 0}[e.key]; if (step === undefined) return
    e.preventDefault(); const m = e.key === 'Home' ? 1 : e.key === 'End' ? 12 : (Number(b.dataset.month) - 1 + step + 12) % 12 + 1; select(m, true)
  })
  const pickUplift = (b: HTMLButtonElement | null, focus = false) => {
    if (!b?.dataset.uplift) return
    uplift = b.dataset.uplift; (el('Uplift') as HTMLElement & {sync?: () => void}).sync?.(); renderDetail(); renderBars(); if (focus) b.focus()
  }
  el('Uplift').addEventListener('click', e => pickUplift((e.target as HTMLElement).closest('button')))
  el('Uplift').addEventListener('keydown', e => {
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return
    e.preventDefault(); const bs = [...el('Uplift').querySelectorAll<HTMLButtonElement>('button')], i = bs.findIndex(b => b.dataset.uplift === uplift)
    pickUplift(bs[(i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length], true)
  })
  geo.addEventListener('change', renderAll); exportButton.addEventListener('click', exportCsv)
  const activate = (event: Event) => {
    if (event.type === 'keydown' && !['Enter', ' '].includes((event as KeyboardEvent).key)) return
    if ((event.target as HTMLElement)?.closest?.('[data-dashboard-page="inventory"]')) void load()
  }
  root.addEventListener('click', activate); root.addEventListener('keydown', activate)
  if (host.classList.contains('active')) void load()
  return () => { disposed = true; controller?.abort(); root.removeEventListener('click', activate); root.removeEventListener('keydown', activate); panel.remove() }
}
