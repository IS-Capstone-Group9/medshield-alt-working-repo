export type SectorDay = {
  sector: string; date: string; period: string; revenue: number | null; income: number | null
  margin_revenue_basis: number | null; row_count?: number; original_source_rows?: number; adjusted_estimated_rows?: number
}

export function overviewSectorMonths(rows: SectorDay[], sector: string) {
  const totals = new Map<string, SectorDay>()
  for (const row of rows) {
    if (row.sector !== sector) continue
    const current = totals.get(row.period) ?? { sector, date: row.period, period: row.period, revenue: null, income: null, margin_revenue_basis: null }
    for (const metric of ['revenue', 'income', 'margin_revenue_basis'] as const) {
      if (row[metric] != null && Number.isFinite(row[metric])) current[metric] = (current[metric] ?? 0) + row[metric]!
    }
    totals.set(row.period, current)
  }
  return [...totals.values()].sort((a,b)=>a.period.localeCompare(b.period)).map(row=>({...row,evidence:'actual'}))
}

export const OVERVIEW_SECTOR_SCRIPT = `const overviewSectorMonths = ${overviewSectorMonths.toString()};` + String.raw`
let overviewSectorData = null;
let overviewBuyerSector = 'All';
const overviewStudy = { startYear: 2017, endYear: 2025, label: 'Study period · 2017–2025' };
function overviewStudyActive() { return dashboardPageIsActive('overview') && descriptivePeriod === 'all'; }
function overviewScopedDays(sector = overviewBuyerSector) { return (overviewSectorData?.daily || []).filter(row => row.sector === sector); }
function overviewScopedMonths(sector = overviewBuyerSector) { return overviewSectorMonths(overviewSectorData?.daily || [], sector); }
function setOverviewSectorData(data) {
  if (!data || !Array.isArray(data.daily) || !data.source?.release) throw new Error('Buyer-sector source is unavailable');
  if (!overviewSectorData) overviewBuyerSector = 'Government';
  overviewSectorData = data;
}
function getOverviewComparisonScope() {
  const base = getDiagnosticScope();
  if (!base) return null;
  const year = base.end_date.slice(0,4);
  return { ...base, start_date: base.start_date > year + '-01-01' ? base.start_date : year + '-01-01', sector: overviewBuyerSector };
}
function overviewPeriodMargin(row) {
  return row.income != null && Number.isFinite(Number(row.income)) && row.margin_revenue_basis != null && Number(row.margin_revenue_basis) > 0
    ? Number(row.income) / Number(row.margin_revenue_basis) * 100 : null;
}
function overviewExportRows(sector = overviewBuyerSector) {
  const prior = getDescriptivePriorDisplayRows(sector);
  return getDescriptiveDisplayRows(sector).map((row, index) => ({ period: row.period, sector, net_sales: row.revenue,
    gross_profit: row.income, margin_revenue_basis: row.margin_revenue_basis ?? null, gross_margin_pct: overviewPeriodMargin(row),
    observation_status: row.evidence, observed_months: row.observed_months ?? null,
    profit_observed_months: row.profit_observed_months ?? null,
    prior_period: comparisonMode === 'yoy' ? prior[index]?.period : null,
    prior_net_sales: comparisonMode === 'yoy' ? prior[index]?.revenue ?? null : null,
    prior_gross_profit: comparisonMode === 'yoy' ? prior[index]?.income ?? null : null,
    comparison_mode: comparisonMode, displayed_measure: overviewTrendMeasure,
    mapping_status: 'proposed_review_pending',
    dataset_id: DATA.release?.dataset_id, fact_version: DATA.release?.fact_delta_version, policy_version: DATA.release?.policy_version,
    study_scope: 'Study 2017–2025', selected_period: descriptivePeriodLabel(), pending_actuals: '2026 data not yet confirmed' }));
}
function downloadOverviewCSV(rows, filename) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const cell = value => '"' + String(value == null ? '' : value).replace(/"/g,'""') + '"';
  const csv = [keys, ...rows.map(row => keys.map(key => row[key]))].map(row => row.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8'}));
  const link = document.createElement('a'); link.href=url; link.download=filename; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function installOverviewSectorControls() {
  const page = document.getElementById('page-overview');
  if (!page || document.getElementById('overviewBuyerSector')) return;
  const panel = document.createElement('section'); panel.id='overviewSectorControls'; panel.className='chart-card';
  panel.setAttribute('aria-label','Overview buyer sector and study scope');
  panel.innerHTML='<div class="diagnostic-controls"><label id="overviewBuyerSectorControl">Buyer sector <select id="overviewBuyerSector"><option>Government</option><option>Private</option><option>Internal</option><option>Unknown</option></select></label><strong id="overviewStudyPeriod">Study period · 2017–2025</strong><button type="button" class="btn btn-secondary" id="overviewTrendExport">Export sector CSV</button></div><p id="overviewSectorScope" role="status"></p><p>Buyer mapping · Review pending · 2026 actuals pending</p><details class="chart-method"><summary>Data and buyer mapping notes</summary><p>Totals use the client-provided sales records. Recorded sales and profit month counts are shown in the values tables. 2026 actual sales are pending client confirmation.</p><p>Buyer assignments are proposed and review pending. Geographic labels such as Quezon and Batangas currently map to Private; this does not verify individual buyer ownership. Original and adjusted-source records retain their provenance.</p></details>';
  const target = page.querySelector('.kpi-grid') || page.firstChild; target.before(panel);
  document.getElementById('overviewBuyerSector').value = overviewBuyerSector === 'All' ? 'Government' : overviewBuyerSector;
  const change = () => { overviewBuyerSector = document.getElementById('overviewBuyerSector').value; refreshComparison(); };
  panel.querySelectorAll('select').forEach(select=>select.addEventListener('change',change));
  document.getElementById('overviewTrendExport').addEventListener('click',()=>downloadOverviewCSV(overviewExportRows(),'medshield-trend-'+overviewBuyerSector+'.csv'));
}
function renderOverviewSectorScope() {
  installOverviewSectorControls();
  const status=document.getElementById('overviewSectorScope');
  if(status) status.textContent=overviewBuyerSector+' · '+descriptivePeriodLabel()+' · KPIs, margin and calendar follow this sector.';
  const button=document.getElementById('overviewTrendExport'); if(button)button.disabled=!overviewSectorData;
  const scope = getOverviewComparisonScope();
  if(scope) window.dispatchEvent(new CustomEvent('medshield:overview-scope',{detail:scope}));
}
`
