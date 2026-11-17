import {getJson} from './api-client'

type Year = {year: number; net_php: number
  order_size: {documents: number; mean_php: number; median_php: number; band_share_pct: Record<string, number>} | null
  channel_share_pct: Record<string, number>; category: {category: string; share_pct: number; margin_pct: number | null}[]
  portfolio: {continuing: number; new: number; lost: number; new_net_share_pct: number; lost_prior_net_share_pct: number} | null
  concentration: {families: number; top10_share_pct: number; hhi: number}
  returns: {negative_lines: number; share_of_positive_pct: number | null}; discount_rate_pct: number | null
  timing: {months: number; median_by_day10_pct: number; median_by_day20_pct: number} | null}
type Descriptive = {source: {dataset_id: string; fact_version: number; total_php: number}; channel_labels: string[]; latest_year_months: number; years: Year[]; notes: {channel: string; margin: string}}
type ProfileRow = {category: string; share_all_sales_pct: number; current_net_php: number; large_share_pct: number; routine_cv: number | null; active_months: number
  planning_class: string; mixed: boolean; plan: string; new_product_share_pct: number | null; routine_wape_current_pct: number | null}
type Profile = {source: {dataset_id: string; fact_version: number; category_mapping_scope: string}; windows: {current: string[]; earlier: string[]}; profile: ProfileRow[]
  current_sales_by_class_pct: Record<string, number>
  check: {categories: number; forecast_order_holds: boolean | null; same_class: number; stability_pct: number | null; usable_planning_guide: boolean
    by_earlier_class: Record<string, {categories: number; median_wape_pct: number | null}>}
  registered: {seasonal_categories: string; disease_links: string}}

const peso = (v: number | null | undefined) => v === null || v === undefined || !Number.isFinite(v) ? 'Unavailable' : '₱' + Math.round(v).toLocaleString('en-PH')
const pct = (v: number | null | undefined, d = 1) => v === null || v === undefined ? '–' : v.toFixed(d) + '%'
const NAMES: Record<string, string> = {ANTIBACTERIAL: 'Antibacterials', VACCINE_IMMUNE_SERUM: 'Vaccines and immune sera', OBSTETRIC: 'Childbirth medicines', CRITICAL_CARE: 'Critical care',
  GI_ACID_ANTISPASMODIC: 'Stomach acid and cramps', CARDIOVASCULAR: 'Heart medicines', VITAMINS_MINERALS: 'Vitamins and minerals', ANAESTHETIC: 'Anaesthetics', MEDICAL_SUPPLY: 'Medical supplies',
  ANTICOAGULANT: 'Blood thinners', NON_MEDICAL: 'Non-medical goods', RENAL_ANEMIA: 'Kidney and anaemia', RESPIRATORY: 'Respiratory medicines', ANALGESIC_ANTIPYRETIC: 'Pain and fever',
  ANTIPROTOZOAL: 'Metronidazole and similar', CNS: 'Epilepsy medicines', DIABETES: 'Diabetes medicines', ANTIVIRAL: 'Antivirals', ANTISEPTIC: 'Antiseptics', PPE_INFECTION_CONTROL: 'Protective gear',
  MEDICAL_EQUIPMENT: 'Medical equipment', NOT_CLASSIFIED: 'Other products (not classified)'}
const CLASS: Record<string, string> = {LARGE_ORDER: 'Mostly large orders', ERRATIC: 'Erratic', UNEVEN: 'Uneven', STEADY: 'Steady'}
const STYLE = `.dp-panel{min-width:0}.dp-panel .dp-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:var(--space-3);margin:var(--space-3) 0}
  .dp-panel dt{font-size:12px;color:var(--text-secondary)}.dp-panel dd{margin:var(--space-1) 0;font-size:20px;font-weight:600}
  .dp-panel .dp-scroll{overflow:auto;max-width:100%;margin:var(--space-3) 0}.dp-panel th,.dp-panel td{padding:var(--space-2) var(--space-3);font-size:12px;white-space:nowrap}
  .dp-panel td:first-child,.dp-panel th:first-child{white-space:normal;overflow-wrap:anywhere;min-width:110px}.dp-panel p{margin:var(--space-2) 0;line-height:1.5}
  .dp-panel details{margin:var(--space-3) 0}.dp-panel summary{cursor:pointer;font-weight:600;padding:var(--space-2) 0}.dp-panel summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}`

function table(el: HTMLTableElement, head: [string, boolean][], rows: (string | number)[][]) {
  el.replaceChildren()
  const tr = el.createTHead().insertRow()
  for (const [label, numeric] of head) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; th.classList.toggle('num', numeric); tr.append(th) }
  const body = el.createTBody()
  for (const row of rows) { const r = body.insertRow(); row.forEach((v, i) => { const td = r.insertCell(); td.textContent = String(v); td.classList.toggle('num', head[i]?.[1] ?? false) }) }
}
const scroll = (id: string, label: string) => `<div class="dp-scroll table-responsive-wrap" tabindex="0" role="region" aria-label="${label}"><table id="${id}" class="product-table"></table></div>`
function section(id: string, title: string, html: string) {
  const panel = document.createElement('section'); panel.className = 'chart-card dp-panel'; panel.id = id; panel.setAttribute('data-runtime-panel', '')
  panel.innerHTML = `<style>${STYLE}</style><h2 class="chart-title">${title}</h2>${html}`; return panel
}

/**
 * Yearly sales structure (descriptive views D1-D8) on Sales Diagnostics and the demand profile per product group on
 * Products. Both read live Gold through the gateway and show an explicit unavailable state on failure. The demand
 * profile is a description: its registered check did not find the classes stable enough to be a planning rule.
 */
export function installDescriptiveProfilePanels(root: HTMLElement) {
  const revenue = root.querySelector<HTMLElement>('#page-revenue'), products = root.querySelector<HTMLElement>('#page-products'), panels: HTMLElement[] = []
  const structure = section('dpStructure', 'How sales are made up, year by year', `
    <p>Counts and shares taken straight from the sales records. Contracts are excluded and missing months are not counted as zero.</p>
    <p id="dpStructureStatus" role="status">Open Sales Diagnostics to load the yearly structure.</p>
    <dl class="dp-metrics"><div><dt>Typical order value (median)</dt><dd id="dpMedian">Unavailable</dd></div>
      <div><dt>Sales from orders of ₱500K and over</dt><dd id="dpLarge">Unavailable</dd></div>
      <div><dt>Sales from products new that year</dt><dd id="dpNew">Unavailable</dd></div>
      <div><dt>Top 10 products' share of sales</dt><dd id="dpTop10">Unavailable</dd></div></dl>
    <h3>Order size and timing</h3>${scroll('dpOrders', 'Order size and within-month timing by year')}
    <h3>Products: new, lost and concentration</h3>${scroll('dpPortfolio', 'Product turnover and concentration by year')}
    <details><summary>Sales by buyer label</summary><p id="dpChannelNote"></p>${scroll('dpChannels', 'Share of sales by recorded label')}</details>
    <details><summary>Sales and margin by product type</summary><p id="dpMarginNote"></p>${scroll('dpCategories', 'Share of sales and gross margin by product type')}</details>
    <details><summary>Returns and discounts</summary>${scroll('dpReturns', 'Returns and discounts by year')}</details>
    <p class="chart-subtitle"><strong>Limit:</strong> recorded figures only. The latest year may be partial, so compare it with care.</p>`)
  const profile = section('dpProfile', 'How each product group behaves', `
    <p>For each product group: how much comes from large orders, how steady the regular sales are, and what that suggests for planning.</p>
    <p id="dpProfileStatus" role="status">Open Products to load the profile.</p>
    <dl class="dp-metrics"><div><dt>Sales in groups driven by large orders</dt><dd id="dpClassLarge">Unavailable</dd></div>
      <div><dt>Sales in steady groups</dt><dd id="dpClassSteady">Unavailable</dd></div>
      <div><dt>Groups that kept the same class</dt><dd id="dpStability">Unavailable</dd></div>
      <div><dt>Seasonal groups · disease links found</dt><dd id="dpTests">Unavailable</dd></div></dl>
    <p id="dpProfileNote"></p>
    ${scroll('dpProfileTable', 'Demand profile by product group')}
    <p class="chart-subtitle"><strong>Limit:</strong> a description of the last 24 months, not a planning rule. Product groups come from a candidate mapping inferred from product names and not yet confirmed by the client. Nothing here authorizes a purchase.</p>`)
  if (revenue) { revenue.append(structure); panels.push(structure) }
  if (products) { products.append(profile); panels.push(profile) }
  const q = (id: string) => root.querySelector<HTMLElement>('#' + id)
  const controller = new AbortController(); let disposed = false

  const renderStructure = (d: Descriptive) => {
    const ys = d.years, last = ys.at(-1)!, first = ys[0], lastFull = d.latest_year_months < 12 && ys.length > 1 ? ys.at(-2)! : last
    const big = (y: Year) => y.order_size?.band_share_pct['₱500K and over']
    q('dpMedian')!.textContent = `${peso(first.order_size?.median_php)} → ${peso(last.order_size?.median_php)} (${first.year}–${last.year})`
    q('dpLarge')!.textContent = `${pct(big(first), 0)} → ${pct(big(last), 0)}`
    q('dpNew')!.textContent = `${pct(lastFull.portfolio?.new_net_share_pct, 0)} in ${lastFull.year}`
    q('dpTop10')!.textContent = `${pct(last.concentration.top10_share_pct, 0)} in ${last.year}`
    const bands = Object.keys(last.order_size?.band_share_pct ?? {})
    table(q('dpOrders') as HTMLTableElement, [['Year', false], ['Orders', true], ['Typical order', true], ['Average order', true], ...bands.map(b => [b, true] as [string, boolean]), ['Delivered by day 20', true]],
      ys.map(y => [String(y.year), y.order_size?.documents.toLocaleString() ?? '–', peso(y.order_size?.median_php), peso(y.order_size?.mean_php), ...bands.map(b => pct(y.order_size?.band_share_pct[b], 0)), pct(y.timing?.median_by_day20_pct, 0)]))
    table(q('dpPortfolio') as HTMLTableElement, [['Year', false], ['Products sold', true], ['New', true], ['Lost', true], ['Sales from new products', true], ['Top 10 share', true]],
      ys.map(y => [String(y.year), y.concentration.families.toLocaleString(), y.portfolio ? String(y.portfolio.new) : '–', y.portfolio ? String(y.portfolio.lost) : '–', pct(y.portfolio?.new_net_share_pct, 0), pct(y.concentration.top10_share_pct, 0)]))
    table(q('dpChannels') as HTMLTableElement, [['Year', false], ...d.channel_labels.map(l => [l.charAt(0) + l.slice(1).toLowerCase(), true] as [string, boolean])],
      ys.map(y => [String(y.year), ...d.channel_labels.map(l => pct(y.channel_share_pct[l] ?? 0, 0))]))
    const cats = [...new Set(ys.flatMap(y => y.category.map(c => c.category)))]
    table(q('dpCategories') as HTMLTableElement, [['Year', false], ...cats.map(c => [c.replace(/_/g, ' ') + ': share · margin', true] as [string, boolean])],
      ys.map(y => [String(y.year), ...cats.map(c => { const v = y.category.find(k => k.category === c); return v ? `${pct(v.share_pct, 0)} · ${pct(v.margin_pct, 0)}` : '–' })]))
    table(q('dpReturns') as HTMLTableElement, [['Year', false], ['Return lines', true], ['Returns vs sales', true], ['Discount rate', true]],
      ys.map(y => [String(y.year), y.returns.negative_lines.toLocaleString(), pct(y.returns.share_of_positive_pct), pct(y.discount_rate_pct)]))
    q('dpChannelNote')!.textContent = d.notes.channel; q('dpMarginNote')!.textContent = d.notes.margin
    q('dpStructureStatus')!.textContent = `Live from Gold · dataset ${d.source.dataset_id.slice(0, 12)}… v${d.source.fact_version} · ${peso(d.source.total_php)} recorded net · ${last.year} covers ${d.latest_year_months} month${d.latest_year_months === 1 ? '' : 's'}.`
  }
  const renderProfile = (d: Profile) => {
    q('dpClassLarge')!.textContent = pct(d.current_sales_by_class_pct.LARGE_ORDER ?? 0, 0); q('dpClassSteady')!.textContent = pct(d.current_sales_by_class_pct.STEADY ?? 0, 0)
    q('dpStability')!.textContent = `${d.check.same_class} of ${d.check.categories}`; q('dpTests')!.textContent = `${d.registered.seasonal_categories} · ${d.registered.disease_links}`
    const u = d.check.by_earlier_class
    q('dpProfileNote')!.textContent = `Checked on past data: groups classed as uneven in ${d.windows.earlier[0]} to ${d.windows.earlier[1]} were later forecast with ${pct(u.UNEVEN?.median_wape_pct, 0)} error and erratic ones with ${pct(u.ERRATIC?.median_wape_pct, 0)}, so the classes do rank how forecastable a group is. But only ${d.check.same_class} of ${d.check.categories} groups kept their class (${pct(d.check.stability_pct, 0)}; the bar was 60%), mostly because groups moved to large orders. ${d.check.usable_planning_guide ? 'The classes passed as a planning guide.' : 'Treat the suggestion column as a reading of recent behaviour, not a rule.'}`
    table(q('dpProfileTable') as HTMLTableElement, [['Product group', false], ['Share of all sales', true], ['Sales, last 24 months', true], ['From large orders', true], ['Regular sales', false], ['Months with regular sales', true], ['From new products, last 12 months', true], ['What it suggests', false]],
      d.profile.map(p => [NAMES[p.category] ?? p.category, pct(p.share_all_sales_pct), peso(p.current_net_php), pct(p.large_share_pct, 0), CLASS[p.planning_class] ?? p.planning_class,
        `${p.active_months} of 24`, pct(p.new_product_share_pct, 0), p.plan + (p.mixed ? '; also keep ready for large orders' : '')]))
    q('dpProfileStatus')!.textContent = `Live from Gold · dataset ${d.source.dataset_id.slice(0, 12)}… v${d.source.fact_version} · ${d.windows.current[0]} to ${d.windows.current[1]} · ${d.source.category_mapping_scope}. Description only.`
  }
  const loader = <T,>(statusId: string, url: string, render: (d: T) => void, label: string) => () => {
    const el = q(statusId); if (!el || el.dataset.loaded === 'true' || el.dataset.loading === 'true') return
    el.dataset.loading = 'true'; el.textContent = 'Loading from Gold…'
    getJson<T>(url, {signal: controller.signal}).then(d => { if (disposed) return; render(d); el.dataset.loaded = 'true' })
      .catch(() => { if (!disposed && !controller.signal.aborted) el.textContent = `${label} unavailable. Reopen the page to retry; no substitute values were used.` })
      .finally(() => { delete el.dataset.loading })
  }
  const loadStructure = loader<Descriptive>('dpStructureStatus', '/api/sales/descriptive-extensions', renderStructure, 'Yearly sales structure')
  const loadProfile = loader<Profile>('dpProfileStatus', '/api/sales/demand-profile', renderProfile, 'Demand profile')
  const activate = (event: Event) => {
    if (event.type === 'keydown' && !['Enter', ' '].includes((event as KeyboardEvent).key)) return
    const nav = (event.target as HTMLElement)?.closest?.('[data-dashboard-page]')?.getAttribute('data-dashboard-page')
    if (nav === 'revenue') loadStructure(); else if (nav === 'products') loadProfile()
  }
  root.addEventListener('click', activate); root.addEventListener('keydown', activate)
  if (revenue?.classList.contains('active')) loadStructure()
  if (products?.classList.contains('active')) loadProfile()
  return () => { disposed = true; controller.abort(); root.removeEventListener('click', activate); root.removeEventListener('keydown', activate); panels.forEach(p => p.remove()) }
}
