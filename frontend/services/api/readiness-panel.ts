import {getJson} from './api-client'
import {PANEL_CSS, esc, monthLabel, onPageOpen, peso, pesoShort} from './panel-kit'

type Track = {period: string; delivered_by_day20_php: number; usual_share_by_day20: number; mean6_php: number; estimate_php: number; actual_php: number}
export type ReadinessData = {latest_period: string; next_period: string; day20: {track: Track[]; wape_pct: number | null; reference_wape_pct: number | null; weight: number}
  government_range: {for_period: string; p10_php: number; p90_php: number; months_with_large_order: number; window_months: number; recent: {period: string; government_large_php: number}[]}
  registered: {day20_wape_pct: number; reference_wape_pct: number; day20_bias_pct: number; range_coverage_pct: number[]}; source: {dataset_id: string}}

/** Forecast page: day-20 month-end estimate track record and government large-order readiness range (both passed tests). */
export function installReadinessPanel(root: HTMLElement) {
  const host = root.querySelector<HTMLElement>('#page-forecast')
  if (!host) return () => {}
  const panel = document.createElement('section')
  panel.className = 'chart-card'; panel.id = 'readinessPanel'
  panel.innerHTML = `<style>${PANEL_CSS('readinessPanel')}
    #readinessPanel .rd-chart{display:grid;gap:6px;margin:var(--space-2) 0}
    #readinessPanel .rd-row{display:grid;grid-template-columns:5.5rem minmax(0,1fr) 6.5rem;gap:var(--space-2);align-items:center;font-size:12px}
    #readinessPanel .rd-track{position:relative;height:16px;border-radius:3px;background:color-mix(in srgb,var(--text-secondary) 10%,transparent)}
    #readinessPanel .rd-act{position:absolute;inset:3px auto 3px 0;border-radius:2px;background:color-mix(in srgb,var(--accent) 35%,transparent)}
    #readinessPanel .rd-est{position:absolute;top:0;bottom:0;width:3px;background:var(--accent)}
    #readinessPanel .rd-ref{position:absolute;top:0;bottom:0;width:2px;background:#a06a12}
    #readinessPanel .rd-legend{display:flex;flex-wrap:wrap;gap:var(--space-3);font-size:11px;color:var(--text-secondary)}
    #readinessPanel .rd-legend i{display:inline-block;width:12px;height:8px;margin-right:4px;vertical-align:middle;border-radius:2px}
    #readinessPanel .rd-bars{display:flex;align-items:flex-end;gap:4px;height:90px;margin:var(--space-2) 0;padding:0 2px;border-bottom:1px solid var(--border);position:relative}
    #readinessPanel .rd-bars span{flex:1;background:var(--accent);border-radius:2px 2px 0 0;min-height:1px}
    #readinessPanel .rd-band{position:absolute;left:0;right:0;border-top:2px dashed #2f7d5b}
    @media(max-width:650px){#readinessPanel .rd-row{grid-template-columns:4.5rem minmax(0,1fr) 5rem}}</style>
    <h2 class="chart-title">Month-end estimate and tender readiness</h2>
    <p class="pk-lead">Two outputs that passed their tests: an estimate of the month's total from sales up to day 20, and how much large government orders to be ready for. Planning aids, not purchase orders.</p>
    <p id="readinessStatus" role="status">Open Forecast Modeling to load readiness outputs.</p>
    <div id="readinessBody" hidden>
      <div class="pk-cards" id="readinessCards"></div>
      <h3>Day-20 estimate vs actual, last 12 months <span class="pk-tag pk-pass">Passed test</span></h3>
      <div class="rd-legend" aria-hidden="true"><span><i style="background:color-mix(in srgb,var(--accent) 35%,transparent)"></i>Actual month total</span><span><i style="background:var(--accent);width:3px"></i>Day-20 estimate</span><span><i style="background:#a06a12;width:2px"></i>Forecast before the month (mean_6)</span></div>
      <div class="rd-chart" id="readinessTrack" role="list" aria-label="Day-20 estimate against actual by month"></div>
      <p class="pk-lead" id="readinessTrackNote"></p>
      <h3>Large government orders, last 12 months <span class="pk-tag pk-pass">Passed test</span></h3>
      <div class="rd-bars" id="readinessGovBars" role="img"></div>
      <p class="pk-lead" id="readinessGovNote"></p>
      <details><summary>How these are calculated</summary><p class="pk-lead">Day-20 estimate = 0.75 × (sales delivered by day 20 ÷ the usual share delivered by day 20 over the previous 24 months) + 0.25 × the six-month average. Tested on 2024-01 to 2026-09: 28.8% error vs 41.8% for the six-month average, bias −2.3%. The government range is the 10th–90th percentile of the last 24 months' large government order totals (orders of ₱500,000 or more, months without one counted as zero); it covered 77.8% and 78.8% of months in its two test periods. It is a floor for readiness, not a cap.</p></details>
      <p class="pk-lead" id="readinessSource" style="font-size:11px"></p>
    </div>`
  ;(host.querySelector<HTMLElement>('#forecastOutlook') ?? host).append(panel)
  const el = (id: string) => panel.querySelector<HTMLElement>('#readiness' + id)!
  let loaded = false, disposed = false, controller: AbortController | null = null
  const render = (v: ReadinessData) => {
    const last = v.day20.track.at(-1), g = v.government_range
    const card = (label: string, value: string, note: string) => `<div class="pk-card"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`
    el('Cards').innerHTML = (last ? card(`Day-20 estimate, ${monthLabel(last.period)}`, pesoShort(last.estimate_php), `Actual ${pesoShort(last.actual_php)} · ${last.estimate_php >= last.actual_php ? '+' : ''}${(100 * (last.estimate_php - last.actual_php) / last.actual_php).toFixed(0)}%`) : '')
      + card('Estimate error, last 12 months', v.day20.wape_pct === null ? '—' : v.day20.wape_pct.toFixed(1) + '%', `Six-month average: ${v.day20.reference_wape_pct === null ? '—' : v.day20.reference_wape_pct.toFixed(1) + '%'}`)
      + card(`Government tenders, ${monthLabel(g.for_period)}`, `up to ${pesoShort(g.p90_php)}`, `Be ready for ${peso(g.p10_php)}–${peso(g.p90_php)} · large order in ${g.months_with_large_order} of ${g.window_months} months`)
    const max = Math.max(1, ...v.day20.track.flatMap(t => [t.actual_php, t.estimate_php, t.mean6_php]))
    const x = (n: number) => `${Math.max(0, Math.min(100, 100 * n / max)).toFixed(1)}%`
    el('Track').innerHTML = v.day20.track.map(t => `<div class="rd-row" role="listitem" aria-label="${monthLabel(t.period)}: estimate ${peso(t.estimate_php)}, actual ${peso(t.actual_php)}, six-month average ${peso(t.mean6_php)}">
      <span>${monthLabel(t.period)}</span><span class="rd-track" aria-hidden="true"><span class="rd-act" style="width:${x(t.actual_php)}"></span><span class="rd-ref" style="left:${x(t.mean6_php)}"></span><span class="rd-est" style="left:${x(t.estimate_php)}"></span></span>
      <span class="num" style="text-align:right">${pesoShort(t.actual_php)}</span></div>`).join('')
    el('TrackNote').textContent = 'The blue mark should sit near the end of the shaded bar. In months with large tenders the six-month average (amber) falls far short; the day-20 estimate catches most of the jump.'
    const gmax = Math.max(1, g.p90_php, ...g.recent.map(r => r.government_large_php))
    el('GovBars').innerHTML = g.recent.map(r => `<span title="${monthLabel(r.period)}: ${peso(r.government_large_php)}" style="height:${(100 * r.government_large_php / gmax).toFixed(1)}%"></span>`).join('')
      + `<span class="rd-band" style="bottom:${(100 * g.p90_php / gmax).toFixed(1)}%" aria-hidden="true"></span>`
    el('GovBars').setAttribute('aria-label', `Government large-order totals, last 12 months: ${g.recent.map(r => `${monthLabel(r.period)} ${pesoShort(r.government_large_php)}`).join(', ')}. Readiness ceiling ${pesoShort(g.p90_php)}.`)
    el('GovNote').innerHTML = `Bars are monthly totals of large government orders; the dashed line is the readiness amount (${esc(peso(g.p90_php))}). About 1 month in 5 can go above it, so treat it as the minimum to be ready for.`
    el('Source').textContent = `Source: Gold sales dataset ${v.source.dataset_id.slice(0, 12)}…, latest month ${monthLabel(v.latest_period)}. Candidate outputs; not purchase orders.`
    el('Body').hidden = false; el('Status').hidden = true
  }
  const load = async () => {
    if (disposed || loaded) return
    loaded = true; controller = new AbortController(); el('Status').hidden = false; el('Status').textContent = 'Loading readiness outputs…'
    try { const v = await getJson<ReadinessData>('/api/sales/readiness', {signal: controller.signal}); if (!disposed) render(v) }
    catch { if (disposed || controller.signal.aborted) return; loaded = false; el('Body').hidden = true; el('Status').textContent = 'Readiness outputs unavailable (Gold sales could not be verified). No substitute values were used.' }
  }
  const off = onPageOpen(root, host, 'forecast', () => void load())
  return () => { disposed = true; controller?.abort(); off(); panel.remove() }
}
