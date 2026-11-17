import Chart from 'chart.js/auto'
import { getJson } from './api-client'
import type { So1Response } from './so1-types'

/** Source-bound diagnostics with explicit independent all-buyers filters. */
export function installSo1Panel(root: HTMLElement): () => void {
  const host = root.querySelector('[data-sales-output-panel="so1"]')
  if (!host) return () => {}
  const section = document.createElement('section'); section.id = 'so1Panel'; section.className = 'chart-card so1-panel'
  section.innerHTML = `<style>
  #salesOutputSections,[data-sales-output-panel="so1"]{min-width:0;max-width:100%}.so1-panel{min-width:0;max-width:100%;overflow-wrap:anywhere}.so1-panel .so1-controls{display:flex;gap:14px;align-items:end;flex-wrap:wrap;margin:16px 0}
  .so1-panel label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600}.so1-panel select{max-width:100%;min-height:38px;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-card);color:inherit}
  .so1-panel .so1-chart{height:290px;min-width:0;margin:16px 0}.so1-panel .so1-scroll{overflow:auto;max-height:350px;max-width:100%;margin:12px 0}
  .so1-panel table{width:100%;white-space:nowrap;font-size:12px}.so1-panel h3{font-size:15px;margin:22px 0 10px}.so1-panel p{line-height:1.6}
  .so1-panel .so1-warning{border-left:3px solid #B7791F;padding:10px 14px;background:#FFFAEB;color:#734A13}.so1-panel [hidden]{display:none!important}
  .so1-panel select:focus-visible,.so1-panel button:focus-visible{outline:2px solid #365D80;outline-offset:3px}.so1-panel button:disabled{opacity:.5;cursor:not-allowed}
  @media(max-width:600px){.so1-panel{padding:14px!important}.so1-panel .so1-controls>label{width:100%}.so1-panel .so1-chart{height:250px}}
  </style>
  <details id="so1AnalystDetails"><summary style="cursor:pointer;font-weight:600;padding:8px 0">Company and recorded-area detail</summary>
  <h2 class="chart-title">Company and recorded-area history</h2>
  <p>Recorded monthly sales are the main result. Geographic source labels retain their review limits; channel sales are not assigned to guessed locations.</p>
  <div class="so1-controls"><label>Recorded area label / company<select id="so1Area"><option value="COMPANY">Company · all recorded areas</option></select></label>
  <label>Year<select id="so1Year"><option value="all">All available history</option></select></label>
  <button type="button" class="btn btn-secondary" id="so1Reload">Reload source</button>
  <button type="button" class="btn btn-secondary" id="so1Export" disabled>Export monthly baseline</button></div>
  <p id="so1Status" role="status">Open this tab to load validated territorial diagnostics.</p>
  <div id="so1Result" hidden><p id="so1Scope"></p><p id="so1Mapping"></p><p id="so1Summary"></p><p id="so1FinancialSummary"></p><p>Gross margin uses gross profit and net sales from the same margin-eligible records. Missing costs stay unsupported; gross profit is before operating expenses, not net profit.</p>
  <div class="so1-chart"><canvas id="so1MonthlyChart" role="img" aria-label="Recorded monthly sales and primary historical trend; exact values in the monthly table"></canvas></div>
  <details><summary>Monthly values and source coverage</summary><div class="so1-scroll"><table id="so1MonthlyTable" aria-label="Monthly recorded sales and source evidence"></table></div></details>
  <h3>Year-over-year · matching recorded months</h3><p>Each pair uses only months recorded in both years. No-entry months stay unavailable; record presence does not independently establish completeness.</p>
  <div class="so1-scroll"><table id="so1YoyTable" aria-label="Territorial matching-month year-over-year"></table></div>
  <h3>Gross profit · matching margin-supported months</h3><button type="button" class="btn btn-secondary" id="so1FinancialExport" disabled>Export matched profit comparisons</button><div class="so1-scroll"><table id="so1FinancialYoyTable" aria-label="Gross profit and same-population margin year-over-year"></table></div><h3>Signed company change by recorded label</h3><p>Company-common recorded months only, independent of selected area. No recorded contribution for an absent label does not prove zero actual sales. Unknown and channel labels stay separate.</p>
  <button type="button" class="btn btn-secondary" id="so1ContributionExport" disabled>Export signed contributions</button>
  <div class="so1-scroll"><table id="so1ContributionTable" aria-label="Signed company change contribution by original recorded label"></table></div>
  <h3>Daily assumption and sensitivity</h3><p class="so1-warning">A blank date is not verified zero actual sales. Daily fits use a separate assumed-zero calendar; whole missing months and ineligible-only dates stay unknown.</p>
  <p id="so1DailyCounts"></p><label>Continuous fitting window<select id="so1Segment"></select></label>
  <p id="so1DailyStatus" role="status"></p><div id="so1DailyContent" hidden><p id="so1Sensitivity"></p><p id="so1Context" class="so1-warning"></p>
  <div class="so1-chart"><canvas id="so1DailyChart" role="img" aria-label="Same-month trends from monthly primary, daily assumed zero and hypothetical missed-sales stress"></canvas></div>
  <button type="button" class="btn btn-secondary" id="so1DailyExport">Export daily comparison values</button>
  <details><summary>Exact monthly sums of daily components</summary><div class="so1-scroll"><table id="so1DailyTable" aria-label="Conditional daily trend comparison in PHP per month"></table></div></details></div>
  <details><summary>Source identity, scope and interpretation</summary><p id="so1Source"></p><p id="so1Limits"></p></details></div></details>`
  host.append(section)
  section.querySelector('#so1AnalystDetails')?.addEventListener('toggle', () => { monthlyChart?.resize(); dailyChart?.resize() })
  const el = <T extends HTMLElement>(id: string) => section.querySelector<T>('#' + id)!
  const area = el<HTMLSelectElement>('so1Area'), year = el<HTMLSelectElement>('so1Year'), segment = el<HTMLSelectElement>('so1Segment')
  const exportButton = el<HTMLButtonElement>('so1Export')
  let data: So1Response | null = null, disposed = false, sequence = 0, monthlyChart: Chart | null = null, dailyChart: Chart | null = null
  const money = (value: number | null) => value === null ? 'Unavailable' : value.toLocaleString('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 })
  const pct = (value: number | null) => value === null ? 'Unavailable' : value.toFixed(2) + '%'
  function table(id: string, headers: string[], rows: string[][]) {
    const target = el<HTMLTableElement>(id); target.replaceChildren()
    const heading = target.createTHead().insertRow()
    headers.forEach(text => { const cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = text; heading.append(cell) })
    const body = target.createTBody(); rows.forEach(row => { const tr = body.insertRow(); row.forEach(text => { tr.insertCell().textContent = text }) })
  }
  function chart(canvasId: string, labels: string[], datasets: { label: string; values: (number | null)[]; color: string }[]) {
    return new Chart(el<HTMLCanvasElement>(canvasId), { type: 'line', data: { labels, datasets: datasets.map(s => ({ label: s.label, data: s.values,
      borderColor: s.color, backgroundColor: s.color, borderWidth: 2, pointRadius: 1, spanGaps: false })) }, options: { responsive: true,
      maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { boxWidth: 10 } }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + money(c.raw as number | null) } } },
      scales: { x: { ticks: { maxTicksLimit: innerWidth < 600 ? 5 : 10, maxRotation: 0 } },
        y: { title: { display: true, text: 'Recorded sales / fitted component (PHP per month)' }, ticks: { callback: n => '₱' + Number(n).toLocaleString('en-PH', { notation: 'compact' }) } } } } })
  }
  function clear() {
    monthlyChart?.destroy(); dailyChart?.destroy(); monthlyChart = dailyChart = null
    for (const id of ['so1MonthlyTable', 'so1YoyTable', 'so1DailyTable','so1ContributionTable','so1FinancialYoyTable']) el(id).replaceChildren()
    el<HTMLButtonElement>('so1ContributionExport').disabled=true;el<HTMLButtonElement>('so1FinancialExport').disabled=true
    el('so1FinancialSummary').textContent='';el('so1Result').hidden = true; el('so1DailyContent').hidden = true; exportButton.disabled = true
    segment.replaceChildren(); segment.disabled = true
  }
  function csv(name: string, headers: string[], rows: unknown[][]) {
    const raw = [headers, ...rows].map(row => row.map(value => '"' + (value == null ? '' : String(value)).replace(/"/g, '""') + '"').join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF' + raw], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const identity = () => [data!.scope.area, data!.scope.year, 'All', data!.release.dataset_id, data!.release.fact_delta_version, data!.checksum, data!.source_sha256, data!.candidate_status,data!.scope.contracts_excluded??'see_source',data!.scope.geographic_approval??'see_source_mapping',data!.scope.contracts_excluded===true?false:'see_source_publication',false,data!.source.financial?.policy??'',data!.source.financial?.rows_sha256??'',data!.source.financial?.table??'']
  const identityHeaders = ['area', 'selected_year', 'buyer_scope', 'dataset_id', 'fact_version', 'diagnostic_sha256', 'source_sha256', 'diagnostic_status','contracts_excluded','geographic_approval','financial_release_approved','model_publication_approved','financial_metric_policy','financial_rows_sha256','financial_source_table']
  function renderDaily() {
    dailyChart?.destroy(); dailyChart = null; el('so1DailyContent').hidden = true; el('so1DailyTable').replaceChildren()
    if (!data) return
    const comparison = data.comparisons.find(c => c.segment_id === segment.value)
    if (!comparison) { el('so1DailyStatus').textContent = 'No daily fit has enough contiguous complete history in this selected scope. Monthly recorded sales remain available.'; return }
    const points = data.components.filter(p => p.comparison_segment === comparison.segment_id)
    const labels = [...new Set(points.map(p => p.period))].sort()
    if (!labels.length) { el('so1DailyStatus').textContent = 'No fitted months in the selected year.'; return }
    const find = (scenario: string, period: string) => points.find(p => p.scenario === scenario && p.period === period)
    const zero = comparison.zero_vs_missing_sale_stress
    el('so1DailyContent').hidden = false
    el('so1DailyStatus').textContent = 'Fixed historical fit: ' + comparison.start + '–' + comparison.end + '. Displayed months: ' + labels[0] + '–' + labels.at(-1) + '. Year selection filters this fit; it does not refit.'
    el('so1Sensitivity').textContent = 'Hypothetical missed-sales stress adds 10% of the same-window positive recorded weekday median on assumed-zero dates. Whole-window hypothetical revenue increase: ' + pct(comparison.stress_uplift_pct) +
      '. Daily trend: ' + zero.reference.trend_direction + ' → ' + zero.candidate.trend_direction + '; seasonal peak month: ' + zero.reference.seasonal_peak_month + ' → ' + zero.candidate.seasonal_peak_month + '. These are assumptions, not recovered sales.'
    const context = comparison.monthly_fit_context_check
    el('so1Context').textContent = 'Fitting-window check: monthly full-history context ' + context.reference.trend_direction + ' (peak ' + context.reference.seasonal_peak_month + ') versus shorter-window monthly refit ' + context.candidate.trend_direction + ' (peak ' + context.candidate.seasonal_peak_month + '). ' +
      (context.material_flags.length ? 'Interpretation changes with fitting context; do not claim one stable pattern.' : 'This check does not establish forecast skill or completeness.')
    dailyChart = chart('so1DailyChart', labels, [
      { label: 'Monthly trend · same fitting months', values: labels.map(p => find('matched_monthly_primary', p)?.trend ?? null), color: '#365D80' },
      { label: 'Daily assumed-zero trend · monthly sum', values: labels.map(p => find('daily_zero_aggregated', p)?.trend ?? null), color: '#B7791F' },
      { label: 'Hypothetical missed-sales stress trend', values: labels.map(p => find('daily_stress_aggregated', p)?.trend ?? null), color: '#80518D' },
    ])
    table('so1DailyTable', ['Month', 'Recorded sales', 'Monthly trend · same window', 'Daily assumed-zero trend', 'Hypothetical stress trend'], labels.map(p => [p, money(find('matched_monthly_primary', p)?.observed ?? null),
      money(find('matched_monthly_primary', p)?.trend ?? null), money(find('daily_zero_aggregated', p)?.trend ?? null), money(find('daily_stress_aggregated', p)?.trend ?? null)]))
  }
  function render() {
    clear(); if (!data) return
    el('so1Result').hidden = false; exportButton.disabled = false
    el('so1Status').textContent = 'Validated Databricks diagnostics loaded · conditional research, not original-objective or model approval.'
    el('so1Scope').textContent = data.scope.area + ' · ' + data.scope.start + '–' + data.scope.end + ' · All buyer groups. These selectors are independent of the topbar buyer/date filters.'
    const mappingNote = data.mapping?.area_evidence_status === 'LEGACY_APPROVAL_NOT_REVALIDATED' ? 'Inherited mapping; source-owner revalidation pending' : data.mapping?.area_evidence_status === 'PROPOSED_NOT_OWNER_APPROVED' ? 'Proposed mapping; not approved' : 'Geographic evidence unresolved'
    el('so1Mapping').textContent = data.mapping ? 'Recorded source label · ' + (data.mapping.mapped_region || 'Region unavailable') + ' · ' + mappingNote + '. This is not complete verified regional attribution.' : 'Company includes channel and geographically unallocated sales; it is not a regional total.'
    const observed = data.months.filter(m => m.revenue !== null)
    el('so1Summary').textContent = money(observed.reduce((n, m) => n + m.revenue!, 0)) + ' recorded eligible sales · ' + observed.length + '/' + data.months.length + ' recorded months. Missing observations stay unavailable.'
    const fin=data.financial_summary
    el('so1FinancialSummary').textContent=fin?'Supported gross profit '+money(fin.gross_profit_php)+' · Matching margin revenue '+money(fin.margin_revenue_basis_php)+' · Gross margin '+pct(fin.margin_pct)+' · '+fin.margin_eligible_records+' margin-eligible records ('+pct(fin.margin_record_coverage_pct)+' of retained records).':'Supported profit and matching margin basis unavailable in this diagnostic source.'
    const primary = data.components.filter(p => p.scenario === 'monthly_primary')
    monthlyChart = chart('so1MonthlyChart', data.months.map(m => m.period), [
      { label: 'Recorded monthly sales', values: data.months.map(m => m.revenue), color: '#94A3B8' },
      { label: 'Primary monthly STL trend', values: data.months.map(m => primary.find(p => p.period === m.period)?.trend ?? null), color: '#365D80' },
    ])
    table('so1MonthlyTable', ['Month', 'Recorded sales', 'Eligible / retained records', 'Adjusted-source records', 'Primary monthly trend','Supported gross profit','Matching margin revenue','Gross margin','Margin-eligible records'], data.months.map(m => [m.period, money(m.revenue), m.eligible_records + ' / ' + m.records,
      String(m.adjusted_records), money(primary.find(p => p.period === m.period)?.trend ?? null),money(m.gross_profit_php??null),money(m.margin_revenue_basis_php??null),pct(m.margin_pct??null),String(m.margin_eligible_records??0)]))
    table('so1YoyTable', ['Comparison', 'Matched months', 'Base recorded sales', 'Target recorded sales', 'Change', 'Growth'], data.yoy.map(r => [r.base_year + ' → ' + r.target_year, r.common_months.join(', ') || 'None',
      money(r.base_revenue), money(r.target_revenue), money(r.change), pct(r.growth_pct)]))
    el<HTMLButtonElement>('so1FinancialExport').disabled=!data.financial_yoy?.length
    table('so1FinancialYoyTable',['Comparison','Margin-supported common months','Base gross profit','Target gross profit','Profit change','Base margin','Target margin'],(data.financial_yoy??[]).map(r=>[r.base_year+' → '+r.target_year,r.common_margin_months.join(', ')||'None',money(r.base.gross_profit_php),money(r.target.gross_profit_php),money(r.gross_profit_change_php),pct(r.base.margin_pct),pct(r.target.margin_pct)]))
    table('so1ContributionTable',['Comparison','Recorded label','Common months','Base recorded amount','Target recorded amount','Signed change','Missing label months'],(data.contributions??[]).map(r=>[r.base_year+' → '+r.target_year,r.area,r.common_months.join(', '),money(r.base_revenue),money(r.target_revenue),money(r.change),r.missing_label_months.join(', ')||'None']))
    el<HTMLButtonElement>('so1ContributionExport').disabled=!data.contributions?.length
    const counts = data.daily_months
    const sum = (key: 'days' | 'recorded_eligible_revenue' | 'assumed_zero_no_recorded_transaction' | 'unknown_whole_month' | 'unknown_ineligible_revenue') => counts.reduce((n, r) => n + (r[key] ?? 0), 0)
    el('so1DailyCounts').textContent = 'Selected calendar: ' + sum('recorded_eligible_revenue') + ' revenue-recorded dates · ' + sum('assumed_zero_no_recorded_transaction') + ' assumed-zero no-entry dates · ' +
      (sum('unknown_whole_month') + sum('unknown_ineligible_revenue')) + ' unknown dates. Original blank values are retained separately; no verified absence of actual sales is inferred.'
    for (const comparison of data.comparisons) { const option = document.createElement('option'); option.value = comparison.segment_id; option.textContent = comparison.start + '–' + comparison.end; segment.append(option) }
    segment.disabled = data.comparisons.length === 0
    el('so1Source').textContent = 'Diagnostic ' + data.checksum + ' · source dataset ' + data.release.dataset_id + ' · fact version ' + data.release.fact_delta_version + ' · ' + data.source.table + ' version ' + data.source.version
    el('so1Limits').textContent = data.interpretation + ' ' + data.limits.join(' ')
    renderDaily()
  }
  let loadController: AbortController | null = null
  async function load() {
    if(disposed)return
    loadController?.abort();loadController=new AbortController()
    const request = ++sequence, expectedArea = area.value, expectedYear = year.value
    data = null; clear(); el('so1Status').textContent = 'Loading validated Databricks territory diagnostics…'
    try {
      const response = await getJson<So1Response>('/api/sales/so1?area=' + encodeURIComponent(expectedArea) + '&year=' + encodeURIComponent(expectedYear),{signal:loadController.signal})
      if (disposed || request !== sequence) return
      if (response.schema_version !== 'medshield.so1.view.v1' || response.scope.area !== expectedArea || response.scope.year !== expectedYear || response.scope.buyer_scope !== 'All' ||
        response.source.system_of_record !== 'databricks' || response.source.source_reconciled !== true || !response.months.length) throw Error('Wrong SO1 source/scope')
      data = response
      area.replaceChildren(); for (const row of data.options.areas) { const option = document.createElement('option'); option.value = row.area; option.textContent = row.area === 'COMPANY' ? 'Company · all recorded areas' : row.area; area.append(option) }; area.value = expectedArea
      year.replaceChildren(); const all = document.createElement('option'); all.value = 'all'; all.textContent = 'All available history'; year.append(all)
      data.options.years.forEach(y => { const option = document.createElement('option'); option.value = y; option.textContent = y; year.append(option) }); year.value = expectedYear
      render()
    } catch { if (!disposed && request === sequence) { data = null; clear(); el('so1Status').textContent = 'Territory diagnostics are unavailable from Databricks for this source. No offline or substitute values were used.' } }
  }
  function exportMonthly() {
    if (!data) return
    csv('medshield-territory-baseline-' + area.value + '-' + year.value + '.csv', ['month', 'recorded_revenue_php', 'retained_records', 'eligible_records', 'adjusted_source_records', 'monthly_trend_php', ...identityHeaders,'supported_gross_profit_php','matching_margin_revenue_php','margin_eligible_records','gross_margin_pct','margin_record_coverage_pct'],
      data.months.map(m => [m.period, m.revenue, m.records, m.eligible_records, m.adjusted_records, data!.components.find(p => p.scenario === 'monthly_primary' && p.period === m.period)?.trend ?? null, ...identity(),m.gross_profit_php??null,m.margin_revenue_basis_php??null,m.margin_eligible_records??null,m.margin_pct??null,m.margin_record_coverage_pct??null]))
  }
  function exportDaily() {
    if (!data) return
    csv('medshield-conditional-daily-' + area.value + '-' + year.value + '.csv', ['month', 'scenario', 'observed_or_hypothetical_php', 'trend_php_per_month', 'seasonal_php_per_month', 'residual_php_per_month',
      'whole_fitting_window', 'assumed_zero_dates_in_month', 'unknown_dates_in_month', 'interpretation', ...identityHeaders],
      data.components.filter(p => p.comparison_segment === segment.value).map(p => {
        const flags = data!.daily_months.find(r => r.period === p.period)
        return [p.period, p.scenario, p.observed, p.trend, p.seasonal, p.residual, p.comparison_segment, flags?.assumed_zero_no_recorded_transaction ?? 0,
          (flags?.unknown_whole_month ?? 0) + (flags?.unknown_ineligible_revenue ?? 0), 'conditional_diagnostic_not_verified_actual_sales', ...identity()]
      }))
  }
  const activate = (event: Event) => { if ((event as CustomEvent).detail?.name === 'so1') { if (!data) void load(); else { monthlyChart?.resize(); dailyChart?.resize() } } }
  root.addEventListener('medshield:sales-output-change', activate)
  el('so1FinancialExport').addEventListener('click',()=>{if(!data?.financial_yoy?.length)return;csv('medshield-matched-profit-'+area.value+'-'+year.value+'.csv',['base_year','target_year','common_margin_months','base_supported_gross_profit_php','base_matching_margin_revenue_php','base_margin_pct','base_margin_eligible_records','target_supported_gross_profit_php','target_matching_margin_revenue_php','target_margin_pct','target_margin_eligible_records','supported_profit_change_php',...identityHeaders],data.financial_yoy.map(r=>[r.base_year,r.target_year,r.common_margin_months.join(';'),r.base.gross_profit_php,r.base.margin_revenue_basis_php,r.base.margin_pct,r.base.margin_eligible_records,r.target.gross_profit_php,r.target.margin_revenue_basis_php,r.target.margin_pct,r.target.margin_eligible_records,r.gross_profit_change_php,...identity()]))})
  el('so1ContributionExport').addEventListener('click',()=>{if(!data?.contributions?.length)return;csv('medshield-company-signed-contributions-'+year.value+'.csv',['comparison_base_year','comparison_target_year','recorded_label','company_common_months','base_recorded_php','target_recorded_php','signed_change_php','company_signed_change_php','missing_label_months','basis',...identityHeaders],data.contributions.map(r=>[r.base_year,r.target_year,r.area,r.common_months.join(';'),r.base_revenue,r.target_revenue,r.change,r.company_change,r.missing_label_months.join(';'),r.basis,...identity()]))});area.addEventListener('change', load); year.addEventListener('change', load); segment.addEventListener('change', renderDaily)
  el('so1Reload').addEventListener('click', load); exportButton.addEventListener('click', exportMonthly); el('so1DailyExport').addEventListener('click', exportDaily)
  return () => { disposed = true;loadController?.abort(); ++sequence; clear(); root.removeEventListener('medshield:sales-output-change', activate); section.remove() }
}
