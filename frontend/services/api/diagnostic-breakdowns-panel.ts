import {getJson} from './api-client'

type Drag = {family: string; share0: number; share1: number; margin0: number; margin1: number; mix: number; rate: number}
type Bridge = {from: number; to: number; matched_months: number; change_php: number; large_orders_php: number; continuing_families_php: number
  new_families_php: number; lost_families_php: number}
type Unusual = {period: string; flag: string; value_php: number; usual_php: number; cause: string; large_order_deviation_php?: number
  top_families: {family: string; deviation: number; new: boolean}[]}
type Survival = {families: number; year2_known: number; survival_y2_pct: number | null; survival_y3_pct: number | null
  value_retention_y2_pct: number | null; one_month_pct: number | null}
type Option = {window_months: number; percentile: number; holdout: {coverage_pct: number; mean_reserve_php: number; mean_unused_php: number; mean_shortfall_php: number}; next_month_php: number}
type Breakdowns = {
  source: {dataset_id: string; fact_version: number; total_php: number}
  margin: {coverage: {year: number; cost_coverage_pct: number}[]; headline: {from: number; to: number; margin0_pct: number; margin1_pct: number
    change_pts: number; mix_pts: number; rate_pts: number; biggest_drags: Drag[]}; year_on_year: {from: number; to: number; change_pts: number; mix_pts: number; rate_pts: number}[]}
  bridge: Bridge[]
  unusual: {months_scored: number; total: Unusual[]; routine: Unusual[]}
  survival: {by_cohort: (Survival & {cohort: number})[]; all: Survival
    early_repeat_signal: {consistent: boolean; yes: Survival; no: Survival}; large_order_start: {yes: Survival; no: Survival}}
  large_orders: {by_year: {year: number; months_recorded: number; months_with_large: number; documents: number; large_php: number; share_pct: number}[]
    size: {p50: number; p90: number; max: number; month_p10: number; month_p50: number; month_p90: number}
    calendar_timing_registered: {p_value: number}
    chance: {next_month_pct: number; usable: boolean; holdout: {brier: number; mean_predicted_pct: number; observed_pct: number}}
    range: {development_coverage_pct: number; holdout_coverage_pct: number; misses_above: number; next_month_low_php: number; next_month_high_php: number}
    tradeoff: {options: Option[]; selected_usable: boolean}}
  day20: {evaluation: {estimate: {cases: number; wape_pct: number; bias_pct: number}; reference: {wape_pct: number; bias_pct: number}}
    recent: {period: string; month_to_day20_php: number; estimate_php: number; reference_mean6_php: number; actual_php: number}[]}
}

const peso = (v: number | null | undefined) => v === null || v === undefined || !Number.isFinite(v) ? 'Unavailable' : '₱' + Math.round(v).toLocaleString('en-PH')
const mPeso = (v: number) => (v < 0 ? '−' : '+') + '₱' + (Math.abs(v) / 1e6).toFixed(1) + 'M'
const pct = (v: number | null | undefined, d = 1) => v === null || v === undefined ? 'Unavailable' : v.toFixed(d) + '%'
const pts = (v: number) => (v < 0 ? '−' : '+') + Math.abs(v).toFixed(1) + ' pts'
const STYLE = `.dx-panel{min-width:0}.dx-panel .dx-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:var(--space-3);margin:var(--space-3) 0}
  .dx-panel dt{font-size:12px;color:var(--text-secondary)}.dx-panel dd{margin:var(--space-1) 0;font-size:20px;font-weight:600}
  .dx-panel .dx-scroll{overflow:auto;max-width:100%;margin:var(--space-3) 0}.dx-panel th,.dx-panel td{padding:var(--space-2) var(--space-3);font-size:12px;white-space:nowrap}
  .dx-panel td:first-child,.dx-panel th:first-child{white-space:normal;overflow-wrap:anywhere;min-width:110px}
  .dx-panel p{margin:var(--space-2) 0;line-height:1.5}.dx-panel h3{margin:var(--space-4) 0 var(--space-2)}
  .dx-panel details{margin:var(--space-3) 0}.dx-panel summary{cursor:pointer;font-weight:600;padding:var(--space-2) 0}
  .dx-panel summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}`

function table(el: HTMLTableElement, head: [string, boolean][], rows: (string | number)[][]) {
  el.replaceChildren()
  const tr = el.createTHead().insertRow()
  for (const [label, numeric] of head) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; th.classList.toggle('num', numeric); tr.append(th) }
  const body = el.createTBody()
  for (const row of rows) { const r = body.insertRow(); row.forEach((v, i) => { const td = r.insertCell(); td.textContent = String(v); td.classList.toggle('num', head[i]?.[1] ?? false) }) }
}
function section(id: string, title: string, html: string) {
  const panel = document.createElement('section')
  panel.className = 'chart-card dx-panel'; panel.id = id; panel.setAttribute('data-runtime-panel', '')
  panel.innerHTML = `<style>${STYLE}</style><h2 class="chart-title">${title}</h2>${html}`
  return panel
}
const scroll = (id: string, label: string) => `<div class="dx-scroll table-responsive-wrap" tabindex="0" role="region" aria-label="${label}"><table id="${id}" class="product-table"></table></div>`
const LIMIT = '<p class="chart-subtitle"><strong>Limit:</strong> past records only, contracts excluded. These describe what happened; they are not forecasts and do not authorize purchases.</p>'

/**
 * Validated offline breakdowns (15 Nov 2026) served live from Gold through /api/sales/diagnostic-breakdowns:
 * Sales Diagnostics (margin, sales change, unusual months), Products (new-product survival), Forecast (large-order
 * readiness and day-20 estimate). One shared request; each page shows an explicit unavailable state on failure.
 */
export function installDiagnosticBreakdownsPanels(root: HTMLElement) {
  const pages = {revenue: root.querySelector<HTMLElement>('#page-revenue'), products: root.querySelector<HTMLElement>('#page-products'), forecast: root.querySelector<HTMLElement>('#page-forecast')}
  const panels: HTMLElement[] = []
  const place = (host: HTMLElement | null, panel: HTMLElement) => { if (!host) return; host.append(panel); panels.push(panel) }

  const diag = section('dxDiagnostics', 'Why sales and margin changed', `
    <p>Exact breakdowns of recorded sales: each part adds up to the total change.</p>
    <p id="dxDiagnosticsStatus" role="status">Open Sales Diagnostics to load the breakdowns.</p>
    <dl class="dx-metrics"><div><dt>Gross margin</dt><dd id="dxMargin">Unavailable</dd></div>
      <div><dt>From selling different products (mix)</dt><dd id="dxMix">Unavailable</dd></div>
      <div><dt>From lower margins on the same products (rate)</dt><dd id="dxRate">Unavailable</dd></div>
      <div><dt>Unusual months found</dt><dd id="dxUnusualCount">Unavailable</dd></div></dl>
    <p id="dxMarginNote"></p>
    <details><summary>Products that pulled margin down most</summary>${scroll('dxDrags', 'Biggest margin drags by product family')}</details>
    <details><summary>Margin change year by year</summary>${scroll('dxMarginYears', 'Year-on-year margin change')}</details>
    <h3>Where each year's sales change came from</h3>
    <p>Only months recorded in both years are compared. Large orders are deliveries of ₱500,000 or more; the rest is split by product family.</p>
    ${scroll('dxBridge', 'Sales change by source')}
    <h3>Unusual months</h3>
    <p>A month is unusual when it is far above or below the previous 12 months (3 or more robust standard deviations).</p>
    ${scroll('dxUnusual', 'Unusual months and their main cause')}${LIMIT}`)
  const surv = section('dxSurvival', 'How long new products keep selling', `
    <p>New product families first sold from 2020, followed from their first month. A family counts as still selling if it sold in that year.</p>
    <p id="dxSurvivalStatus" role="status">Open Products to load survival.</p>
    <dl class="dx-metrics"><div><dt>Still selling in year 2</dt><dd id="dxSurvY2">Unavailable</dd></div>
      <div><dt>Still selling in year 3</dt><dd id="dxSurvY3">Unavailable</dd></div>
      <div><dt>Sold in one month only</dt><dd id="dxSurvOne">Unavailable</dd></div>
      <div><dt>Year-2 survival if sold in 3 of first 6 months</dt><dd id="dxSurvSignal">Unavailable</dd></div></dl>
    <p id="dxSurvivalNote"></p>
    ${scroll('dxCohorts', 'Survival by year of introduction')}
    <p class="chart-subtitle"><strong>Limit:</strong> product families come from candidate mapping v1.1; unmerged label variants make products look newer and shorter-lived, especially in 2023. The 3-in-6 signal is a guide, not a forecast.</p>`)
  const ready = section('dxReadiness', 'Getting ready for large orders', `
    <p>Large orders cannot be predicted from past sales. This shows how often they come and how big they are, so cash, supplier credit and delivery capacity can be ready.</p>
    <p id="dxReadinessStatus" role="status">Open Forecast to load readiness.</p>
    <dl class="dx-metrics"><div><dt>Chance of a large order next month (a floor)</dt><dd id="dxChance">Unavailable</dd></div>
      <div><dt>Typical month with large orders</dt><dd id="dxTypical">Unavailable</dd></div>
      <div><dt>Next month's range, 10th–90th percentile (a floor)</dt><dd id="dxRange">Unavailable</dd></div>
      <div><dt>Day-20 estimate error vs 6-month mean</dt><dd id="dxDay20">Unavailable</dd></div></dl>
    <p id="dxReadinessNote"></p>
    <details><summary>Large orders by year</summary>${scroll('dxLargeYears', 'Large orders by year')}</details>
    <h3>How much to be ready for: choose a risk level</h3>
    <p>Each row is a rule based on past months, checked on January 2024 onward. Higher coverage leaves more unused on average. No rule is recommended: the rule picked in advance covered 69.7% of months, just under its 70% bar.</p>
    ${scroll('dxTradeoff', 'Readiness options and their past coverage')}
    <details><summary>Day-20 estimate of the month's total, last 12 months</summary>
      <p>By the 20th, sales so far and the usual share delivered by that day give an estimate of the month's total. It needs sales entered within days of delivery.</p>
      ${scroll('dxDay20Table', 'Day-20 estimates')}</details>${LIMIT}`)
  place(pages.revenue, diag); place(pages.products, surv); place(pages.forecast, ready)
  const q = (id: string) => root.querySelector<HTMLElement>('#' + id)

  let request: Promise<Breakdowns> | null = null, disposed = false
  const controller = new AbortController()
  const fetchOnce = () => request ??= getJson<Breakdowns>('/api/sales/diagnostic-breakdowns', {signal: controller.signal}).catch(error => { request = null; throw error })
  const stamp = (d: Breakdowns) => `Live from Gold · dataset ${d.source.dataset_id.slice(0, 12)}… v${d.source.fact_version} · ${peso(d.source.total_php)} recorded net. Retrospective.`

  const renderDiagnostics = (d: Breakdowns) => {
    const h = d.margin.headline, cov = new Map(d.margin.coverage.map(c => [c.year, c.cost_coverage_pct]))
    q('dxMargin')!.textContent = `${pct(h.margin0_pct)} → ${pct(h.margin1_pct)} (${h.from}–${h.to})`
    q('dxMix')!.textContent = pts(h.mix_pts); q('dxRate')!.textContent = pts(h.rate_pts)
    q('dxUnusualCount')!.textContent = `${d.unusual.total.length} of ${d.unusual.months_scored}`
    q('dxMarginNote')!.textContent = `Margin uses only sales with usable cost data: ${pct(cov.get(h.from))} of ${h.from} sales against ${pct(cov.get(h.to))} of ${h.to}. If the ${h.from} sales without cost had lower margins, the real fall is smaller.`
    table(q('dxDrags') as HTMLTableElement, [['Product family', false], ['Share of sales', true], ['Margin', true], ['Mix effect', true], ['Rate effect', true]],
      h.biggest_drags.map(x => [x.family, `${pct(x.share0)} → ${pct(x.share1)}`, `${pct(x.margin0, 0)} → ${pct(x.margin1, 0)}`, pts(x.mix), pts(x.rate)]))
    table(q('dxMarginYears') as HTMLTableElement, [['Years', false], ['Change', true], ['Mix', true], ['Rate', true]],
      d.margin.year_on_year.map(y => [`${y.from}→${y.to}`, pts(y.change_pts), pts(y.mix_pts), pts(y.rate_pts)]))
    table(q('dxBridge') as HTMLTableElement, [['Years (matched months)', false], ['Change', true], ['Large orders', true], ['Same products', true], ['New products', true], ['Lost products', true]],
      d.bridge.filter(b => b.matched_months >= 9).map(b => [`${b.from}→${b.to} (${b.matched_months})`, mPeso(b.change_php), mPeso(b.large_orders_php), mPeso(b.continuing_families_php), mPeso(b.new_families_php), mPeso(b.lost_families_php)]))
    table(q('dxUnusual') as HTMLTableElement, [['Month', false], ['High or low', false], ['Sales', true], ['Usual', true], ['Main cause', false], ['Products that moved most', false]],
      d.unusual.total.slice().reverse().map(u => [u.period, u.flag === 'HIGH' ? 'High' : 'Low', peso(u.value_php), peso(u.usual_php),
        u.value_php < 0.01 * u.usual_php ? 'Data gap (nearly empty month)' : u.cause.charAt(0) + u.cause.slice(1).toLowerCase(),
        u.top_families.map(t => t.family + (t.new ? ' (new)' : '')).join(', ')]))
    q('dxDiagnosticsStatus')!.textContent = stamp(d)
  }
  const renderSurvival = (d: Breakdowns) => {
    const s = d.survival, e = s.early_repeat_signal
    q('dxSurvY2')!.textContent = pct(s.all.survival_y2_pct); q('dxSurvY3')!.textContent = pct(s.all.survival_y3_pct)
    q('dxSurvOne')!.textContent = pct(s.all.one_month_pct)
    q('dxSurvSignal')!.textContent = `${pct(e.yes.survival_y2_pct)} vs ${pct(e.no.survival_y2_pct)}`
    q('dxSurvivalNote')!.textContent = `${s.all.year2_known.toLocaleString()} new families with a known second year. Sold in 3 of the first 6 months: ${e.consistent ? 'higher survival in every yearly group' : 'mixed across yearly groups'}. Products that started with a large order kept ${pct(s.large_order_start.yes.value_retention_y2_pct, 0)} of first-year sales in year 2, against ${pct(s.large_order_start.no.value_retention_y2_pct, 0)} for products that started with routine sales.`
    table(q('dxCohorts') as HTMLTableElement, [['First sold in', false], ['New families', true], ['Still selling, year 2', true], ['Still selling, year 3', true], ['Year-2 sales vs year 1', true], ['One month only', true]],
      s.by_cohort.map(c => [String(c.cohort), c.families.toLocaleString(), c.year2_known ? pct(c.survival_y2_pct) : 'Not yet known', c.survival_y3_pct === null ? 'Not yet known' : pct(c.survival_y3_pct),
        c.value_retention_y2_pct === null ? 'Not yet known' : pct(c.value_retention_y2_pct, 0), c.one_month_pct === null ? 'Not yet known' : pct(c.one_month_pct)]))
    q('dxSurvivalStatus')!.textContent = stamp(d)
  }
  const renderReadiness = (d: Breakdowns) => {
    const L = d.large_orders, day = d.day20.evaluation
    q('dxChance')!.textContent = pct(L.chance.next_month_pct, 0)
    q('dxTypical')!.textContent = peso(L.size.month_p50)
    q('dxRange')!.textContent = `${peso(L.range.next_month_low_php)} – ${peso(L.range.next_month_high_php)}`
    q('dxDay20')!.textContent = `${pct(day.estimate.wape_pct)} vs ${pct(day.reference.wape_pct)}`
    q('dxReadinessNote')!.textContent = `Both history-based estimates passed their checks narrowly and run low as large orders grow (chance: predicted ${pct(L.chance.holdout.mean_predicted_pct, 0)} vs ${pct(L.chance.holdout.observed_pct, 0)} observed; range: ${L.range.misses_above} misses, all above). One order is typically ${peso(L.size.p50)}; 1 in 10 is above ${peso(L.size.p90)}. Calendar month does not help: the registered test gave p = ${L.calendar_timing_registered.p_value}.`
    table(q('dxLargeYears') as HTMLTableElement, [['Year', false], ['Months with a large order', true], ['Large orders', true], ['Value', true], ['Share of sales', true]],
      L.by_year.map(y => [String(y.year), `${y.months_with_large} of ${y.months_recorded}`, String(y.documents), peso(y.large_php), pct(y.share_pct, 0)]))
    table(q('dxTradeoff') as HTMLTableElement, [['Be ready for', false], ['Months covered', true], ['Average amount', true], ['Average unused', true], ['Average shortfall', true], ['Amount for next month', true]],
      L.tradeoff.options.map(o => [`${o.percentile === 100 ? 'Highest' : o.percentile === 50 ? 'Median' : o.percentile + 'th percentile'} of last ${o.window_months} months`,
        pct(o.holdout.coverage_pct, 0), peso(o.holdout.mean_reserve_php), peso(o.holdout.mean_unused_php), peso(o.holdout.mean_shortfall_php), peso(o.next_month_php)]))
    table(q('dxDay20Table') as HTMLTableElement, [['Month', false], ['Sales to day 20', true], ['Day-20 estimate', true], ['6-month mean', true], ['Actual', true]],
      d.day20.recent.slice().reverse().map(r => [r.period, peso(r.month_to_day20_php), peso(r.estimate_php), peso(r.reference_mean6_php), peso(r.actual_php)]))
    q('dxReadinessStatus')!.textContent = stamp(d)
  }
  const pageLoad = (name: 'revenue' | 'products' | 'forecast') => {
    const [status, render, label] = name === 'revenue' ? ['dxDiagnosticsStatus', renderDiagnostics, 'Sales Diagnostics'] as const
      : name === 'products' ? ['dxSurvivalStatus', renderSurvival, 'Products'] as const : ['dxReadinessStatus', renderReadiness, 'Forecast'] as const
    const el = q(status); if (!el || el.dataset.loaded === 'true' || el.dataset.loading === 'true') return
    el.dataset.loading = 'true'; el.textContent = 'Loading live breakdowns…'
    fetchOnce().then(d => { if (disposed) return; render(d); el.dataset.loaded = 'true' })
      .catch(() => { if (!disposed && !controller.signal.aborted) el.textContent = `Breakdowns unavailable. Reopen ${label} to retry; no substitute values were used.` })
      .finally(() => { delete el.dataset.loading })
  }
  const activate = (event: Event) => {
    if (event.type === 'keydown' && !['Enter', ' '].includes((event as KeyboardEvent).key)) return
    const nav = (event.target as HTMLElement)?.closest?.('[data-dashboard-page]')?.getAttribute('data-dashboard-page')
    if (nav === 'revenue' || nav === 'products' || nav === 'forecast') pageLoad(nav)
  }
  root.addEventListener('click', activate); root.addEventListener('keydown', activate)
  for (const name of ['revenue', 'products', 'forecast'] as const) if (pages[name]?.classList.contains('active')) pageLoad(name)
  return () => { disposed = true; controller.abort(); root.removeEventListener('click', activate); root.removeEventListener('keydown', activate); panels.forEach(p => p.remove()) }
}
