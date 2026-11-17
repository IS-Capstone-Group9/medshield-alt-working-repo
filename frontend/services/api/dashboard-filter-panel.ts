/** Move the shared historical filters into the content without replacing controls. */
export function installDashboardFilterPanel(root: HTMLElement) {
  const filters = root.querySelector<HTMLElement>('#filterBar')
  const content = root.querySelector<HTMLElement>('.content')
  if (!filters || !content) return

  filters.classList.add('dashboard-filter-panel')
  filters.setAttribute('role', 'region')
  filters.setAttribute('aria-labelledby', 'dashboardFilterTitle')
  if (!filters.querySelector('#dashboardFilterTitle')) {
    const heading = document.createElement('h2')
    heading.id = 'dashboardFilterTitle'
    heading.textContent = 'Analysis filters'
    filters.prepend(heading)
  }

  const labels: Record<string, string> = {
    analysisScopeSelect: 'Data range',
    descriptivePeriodSelect: 'Date range',
    descriptiveComparisonSelect: 'Chart comparison',
    chartGranularitySelect: 'Chart interval',
  }
  if (!filters.querySelector('#dashboardFilterSummary')) {
    const summary = document.createElement('p')
    summary.id = 'dashboardFilterSummary'
    summary.setAttribute('role','status')
    filters.append(summary)
  }
  const dateRange = filters.querySelector('#customDateRangeWrap')
  if (dateRange && !filters.querySelector('#customDateError')) {
    const error = document.createElement('p')
    error.id = 'customDateError'
    error.setAttribute('role','alert')
    dateRange.append(error)
  }
  const optionLabels: Record<string, Record<string,string>> = {
    analysisScopeSelect: {extended:'All available years',capstone:'Study · Jan 2017–Sep 2026'},
    descriptivePeriodSelect: {all:'All recorded dates'},
    descriptiveComparisonSelect: {single:'No prior-year overlay',yoy:'Same dates last year'},
    chartGranularitySelect: {auto:'Automatic',monthly:'Monthly',yearly:'Yearly'},
  }
  for (const [id, title] of Object.entries(labels)) {
    const select = filters.querySelector<HTMLSelectElement>(`#${id}`)
    if (select) for (const option of select.options) option.textContent = optionLabels[id]?.[option.value] || option.textContent
    if (!select || select.closest('.dashboard-filter-field')) continue
    filters.querySelector(`label[for="${id}"]`)?.remove()
    const field = document.createElement('div')
    field.className = 'dashboard-filter-field'
    const label = document.createElement('label')
    label.htmlFor = id
    label.textContent = title
    select.setAttribute('aria-label', title)
    select.before(field)
    field.append(label, select)
  }
  for (const id of ['customDateStart', 'customDateEnd']) {
    const input = filters.querySelector<HTMLInputElement>(`#${id}`)
    const label = filters.querySelector<HTMLLabelElement>(`label[for="${id}"]`)
    if (!input || !label || input.closest('.dashboard-filter-field')) continue
    const field = document.createElement('div')
    field.className = 'dashboard-filter-field'
    input.before(field)
    field.append(label, input)
  }
  content.prepend(filters)
  let welcome = content.querySelector<HTMLElement>('#overviewWelcomeHeading')
  if (!welcome) {
    welcome = document.createElement('h1')
    welcome.id = 'overviewWelcomeHeading'
    welcome.className = 'overview-welcome'
    welcome.textContent = 'Recorded sales overview'
  }
  content.prepend(welcome)
}

export const DASHBOARD_FILTER_PANEL_STYLE = `
.overview-welcome { display: none; }
.content:has(#page-overview.active) > .overview-welcome { display: block; position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
#filterBar.dashboard-filter-panel {
  width: 100%; min-width: 0; flex-direction: column; align-items: stretch;
  gap: var(--space-2, 8px); padding: var(--space-3, 12px) var(--space-4, 16px); margin-bottom: var(--space-3, 12px);
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); box-shadow: var(--shadow-xs);
}
.content:has(#page-territory.active) > #filterBar { display: none !important; }
.dashboard-filter-panel h2 { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
#filterBar.dashboard-filter-panel .comparison-selector {
  display: flex; flex-wrap: wrap; align-items: flex-end;
  gap: var(--space-2, 8px) var(--space-3, 12px); width: 100%; padding: 0; background: transparent; border: 0;
}
.dashboard-filter-panel #descriptiveComparisonWrap { display: contents !important; }
.sales-scope-control { flex: 1.6 1 300px; display: flex; align-items: end; flex-wrap: wrap; gap: var(--space-2, 8px) var(--space-3, 12px); min-width: 0; }
.sales-scope-control label { display: flex; flex: 1 1 180px; flex-direction: column; gap: var(--space-1, 4px); font-size: 12px; font-weight: 600; color: var(--text-secondary); min-width: 0; max-width: 100%; }
.sales-scope-control p { flex: 1 1 100%; font-size: 12px; color: var(--text-secondary); margin: 0; line-height: 1.5; }
.sales-scope-control p[data-scope-state="guidance"] { display: none; }
.sales-scope-control .topbar-select { width: 100%; min-width: 0; max-width: 100%; min-height: 38px; flex: none; }
.sales-scope-control .btn { min-height: 38px; }
.sales-scope-control :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.sales-scope-ledger { margin-bottom: var(--space-3, 12px); }
.financial-scope-context { display: none; align-items: baseline; flex-wrap: wrap; gap: var(--space-1, 4px) var(--space-3, 12px); margin: 0 0 var(--space-3, 12px); font-size: 12px; line-height: 1.5; }
.content:has(#page-overview.active) > .financial-scope-context:has(#salesScopeContextStatus:not(:empty)),
.content:has(#page-overview.active) > .financial-scope-context:has(.sales-scope-warning:not([hidden])),
.content:has(#page-revenue.active) > .financial-scope-context:has(#salesScopeContextStatus:not(:empty)),
.content:has(#page-revenue.active) > .financial-scope-context:has(.sales-scope-warning:not([hidden])) { display: flex; }
.financial-scope-badge { font-weight: 600; color: var(--text-secondary); }
.sales-scope-warning { color: var(--warning, #8a5200); }
.sales-scope-control p.sales-scope-warning { flex-basis: 100%; color: var(--warning, #8a5200); }
.financial-scope-context [hidden], .sales-scope-control [hidden] { display: none !important; }
#salesScopeContextStatus:empty { display: none; }
.dashboard-filter-field { flex: 1 1 150px; min-width: 0; }
.dashboard-filter-field[hidden] { display: none !important; }
#dashboardFilterSummary { color: var(--text-secondary); font-size: 12px; line-height: 1.5; margin: 0; }
#customDateError { flex-basis: 100%; color: var(--danger, #b91c1c); font-size: 12px; }
#customDateError:empty { display: none; }
.dashboard-filter-panel .dashboard-filter-field label {
  display: block; margin-bottom: var(--space-1, 4px); font-size: 12px; font-weight: 600;
  color: var(--text-secondary);
}
#filterBar.dashboard-filter-panel .topbar-select {
  width: 100%; min-width: 0; max-width: 100%; min-height: 38px;
  background: var(--bg-surface); color: var(--text-primary);
  border: 1px solid var(--border-strong); border-radius: 6px; padding: 8px 10px;
}
#filterBar.dashboard-filter-panel .topbar-select:focus-visible {
  outline: 2px solid var(--accent); outline-offset: 2px;
}
.dashboard-filter-panel #customDateRangeWrap { flex: 1 1 100%; flex-wrap: wrap; gap: var(--space-3, 12px); }
.dashboard-filter-panel #customDateRangeWrap .dashboard-filter-field { flex: 1 1 200px; }
#filterBar #customDateRangeWrap .custom-date-label { color: var(--text-secondary); line-height: 1.5; }
.dashboard-filter-panel #customDateRangeWrap input { width: 100% !important; }
@media (max-width: 540px) {
  #filterBar.dashboard-filter-panel { padding: var(--space-3, 12px); }
  .dashboard-filter-field { flex-basis: calc(50% - 6px); }
  #filterBar.dashboard-filter-panel .topbar-select { font-size: 12px; padding: 7px 5px; }
}
.source-ingestion-steps { padding-left: 22px; margin: 16px 0; line-height: 1.8; }
.data-freshness-bar > details { min-width: 0; }
.data-freshness-bar > details p { overflow-wrap: anywhere; }
.nav-item:focus-visible { outline: 2px solid #F4BE47; outline-offset: -2px; }
.analytics-reading-guide { margin: 0 0 var(--space-3, 12px); padding: var(--space-2, 8px) var(--space-4, 16px); border-radius: var(--radius-md); background: var(--bg-surface-2, #eef3f7); min-width: 0; }
.analytics-reading-guide > summary { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1, 4px) var(--space-3, 12px); list-style: none; cursor: pointer; font-size: 13px; line-height: 1.5; color: var(--text-secondary); }
.analytics-reading-guide > summary::-webkit-details-marker { display: none; }
.analytics-reading-guide > summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.analytics-reading-guide__types { display: inline-flex; flex-wrap: wrap; gap: var(--space-1, 4px); }
.analytics-evidence-tag { padding: 0 var(--space-2, 8px); border: 1px solid var(--border-strong, var(--border)); border-radius: 999px; background: var(--bg-surface); font-size: 12px; font-weight: 600; line-height: 20px; color: var(--text-primary); white-space: nowrap; }
.analytics-reading-guide__limit { flex: 1 1 320px; min-width: 0; }
.analytics-reading-guide__more { font-weight: 600; color: var(--accent); white-space: nowrap; }
.analytics-reading-guide[open] > summary { margin-bottom: var(--space-2, 8px); }
.analytics-reading-guide > .chart-title { margin: 0 0 var(--space-1, 4px); }
.analytics-reading-guide > .chart-subtitle { margin: var(--space-1, 4px) 0 0; }
.analytical-section { margin: 16px 0; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-surface); padding: 12px 16px; min-width: 0; }
.analytical-section > summary { cursor: pointer; font-weight: 600; }
.analytical-section > .chart-card { margin-bottom: 0; border: 0; box-shadow: none; padding: 16px 0 0; }
@media (max-width: 540px) {
  #page-overview .overview-decision-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 10px; }
  #page-overview .overview-decision-kpis .kpi-card { padding: 14px 10px; }
  #page-overview .overview-decision-kpis .kpi-value { font-size: clamp(12px, 3.8vw, 18px) !important; word-break: normal !important; overflow-wrap: normal; }
  #page-overview .overview-decision-kpis .kpi-label { font-size: 9px; }
}
`
