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
    analysisScopeSelect: 'Analysis scope',
    descriptivePeriodSelect: 'Historical period',
    descriptiveComparisonSelect: 'Comparison',
    chartGranularitySelect: 'Chart granularity',
  }
  for (const [id, title] of Object.entries(labels)) {
    const select = filters.querySelector<HTMLSelectElement>(`#${id}`)
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
.overview-welcome { display: none; font-size: 22px; font-weight: 700; margin-bottom: 12px; color: var(--text-primary); }
.content:has(#page-overview.active) > .overview-welcome { display: block; }
#filterBar.dashboard-filter-panel {
  width: 100%; min-width: 0; flex-direction: column; align-items: stretch;
  gap: 8px; padding: 14px 16px; margin-bottom: 16px;
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); box-shadow: var(--shadow-xs);
}
.dashboard-filter-panel h2 { font-size: 13px; font-weight: 700; color: var(--text-primary); }
#filterBar.dashboard-filter-panel .comparison-selector {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px; width: 100%; padding: 0; background: transparent; border: 0;
}
.dashboard-filter-panel #descriptiveComparisonWrap { display: contents !important; }
.dashboard-filter-field { min-width: 0; }
.dashboard-filter-panel .dashboard-filter-field label {
  display: block; margin-bottom: 6px; font-size: 11px; font-weight: 600;
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
.dashboard-filter-panel #customDateRangeWrap { grid-column: 1 / -1; flex-wrap: wrap; gap: 12px; }
.dashboard-filter-panel #customDateRangeWrap .dashboard-filter-field { flex: 1 1 200px; }
#filterBar #customDateRangeWrap .custom-date-label { color: var(--text-secondary); line-height: 1.5; }
.dashboard-filter-panel #customDateRangeWrap input { width: 100% !important; }
@media (max-width: 1100px) {
  #filterBar.dashboard-filter-panel .comparison-selector { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 540px) {
  #filterBar.dashboard-filter-panel { padding: 12px; }
  #filterBar.dashboard-filter-panel .comparison-selector { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  #filterBar.dashboard-filter-panel .topbar-select { font-size: 11px; padding: 7px 5px; }
}
.source-ingestion-steps { padding-left: 22px; margin: 16px 0; line-height: 1.8; }
.data-freshness-bar > details { min-width: 0; }
.data-freshness-bar > details p { overflow-wrap: anywhere; }
.nav-item:focus-visible { outline: 2px solid #F4BE47; outline-offset: -2px; }
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
