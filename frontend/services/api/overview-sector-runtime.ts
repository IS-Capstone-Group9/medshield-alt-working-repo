export type SectorDay = {
  sector: string; date: string; period: string; revenue: number | null; income: number | null
  margin_revenue_basis: number | null; row_count?: number; original_source_rows?: number; adjusted_estimated_rows?: number; unreviewed_source_rows?: number
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
const overviewStudy = { startYear: 2017, endYear: 2026, label: 'Study · Jan 2017–Sep 2026 (partial 2026)' };
function overviewStudyActive() { return dashboardPageIsActive('overview') && descriptivePeriod === 'all' && Boolean(overviewSectorData); }
function overviewScopedDays(sector = overviewBuyerSector) { if(dashboardPageIsActive('revenue')) sector='All'; return (overviewSectorData?.daily || []).filter(row => row.sector === sector); }
function overviewScopedMonths(sector = overviewBuyerSector) { if(dashboardPageIsActive('revenue')) sector='All'; return overviewSectorMonths(overviewSectorData?.daily || [], sector); }
function setOverviewSectorData(data) {
  if (!data || !Array.isArray(data.daily) || !data.source?.release) throw new Error('Buyer-sector source is unavailable');
  if (!overviewSectorData || data.source.release.financial_scope?.id !== 'itemized') overviewBuyerSector = 'All';
  overviewSectorData = data;
  const start = data.observations?.start, end = data.observations?.end;
  if (/^\d{4}-\d{2}-\d{2}$/.test(start || '') && /^\d{4}-\d{2}-\d{2}$/.test(end || '') && end >= start) {
    overviewStudy.startYear = Number(start.slice(0,4)); overviewStudy.endYear = Number(end.slice(0,4));
    overviewStudy.label = 'Recorded data · ' + overviewStudy.startYear + '–' + overviewStudy.endYear;
  }
}
function getOverviewComparisonScope() {
  const base = getDiagnosticScope();
  if (!base) return null;
  const year = base.end_date.slice(0,4);
  return { ...base, start_date: descriptivePeriod === 'all' && base.start_date < year + '-01-01' ? year + '-01-01' : base.start_date, sector: overviewBuyerSector };
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
    study_scope: document.getElementById('analysisScopeSelect')?.value === 'capstone' ? 'Study Jan 2017–Sep 2026' : 'All available years', selected_period: descriptivePeriodLabel(), recorded_data_scope: overviewStudy.label,
    study_start: '2017-01-01', study_end: '2026-09-30', study_2026_status: 'partial_january_september', missing_observation_policy: 'unavailable_not_zero',
    source_review_status: overviewSectorData?.observations?.source_review_status || 'existing_source_contract' }));
}
function downloadOverviewCSV(rows, filename) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const cell = value => '"' + String(value == null ? '' : value).replace(/"/g,'""') + '"';
  const csv = analyticalScopeCsv([keys, ...rows.map(row => keys.map(key => row[key]))],DATA.release).map(row => row.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8'}));
  const link = document.createElement('a'); link.href=url; link.download=filename; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function installOverviewSectorControls() {
  const page = document.getElementById('page-overview');
  if (!page || document.getElementById('overviewBuyerSector')) return;
  const panel = document.createElement('section'); panel.id='overviewSectorControls'; panel.className='chart-card';
  panel.setAttribute('aria-label','Overview buyer sector and study scope');
  panel.innerHTML='<div class="diagnostic-controls"><label id="overviewBuyerSectorControl">Buyer sector <select id="overviewBuyerSector"><option value="All">All sectors</option><option>Government</option><option>Private</option><option>Internal</option></select></label><strong id="overviewStudyPeriod">Study · Jan 2017–Sep 2026 (partial 2026)</strong><button type="button" class="btn btn-secondary" id="overviewTrendExport">Export sector CSV</button></div><p id="overviewSectorScope" role="status"></p><p>Buyer mapping · Review pending · Study ends September 2026</p><details class="chart-method"><summary>Data and buyer mapping notes</summary><p>Totals use the client-provided sales records. Recorded sales and profit month counts are shown in the values tables. The study includes January–September 2026 only; missing observations remain unavailable, not zero. Recorded coverage does not establish complete company sales.</p><p>Buyer assignments are proposed and review pending. Geographic labels such as Quezon and Batangas currently map to Private; this does not verify individual buyer ownership. Original and adjusted-source records retain their provenance.</p></details>';
  const notes = page.querySelector('[data-overview-trend-notes]');
  if (notes) {
    panel.classList.remove('chart-card');
    notes.append(panel);
  } else {
    const target = page.querySelector('.kpi-grid') || page.firstChild; target.before(panel);
  }
  document.getElementById('overviewBuyerSector').value = overviewBuyerSector;
  const change = () => { overviewBuyerSector = document.getElementById('overviewBuyerSector').value; refreshComparison(); };
  panel.querySelectorAll('select').forEach(select=>select.addEventListener('change',change));
  document.getElementById('overviewTrendExport').addEventListener('click',()=>downloadOverviewCSV(overviewExportRows(),'medshield-trend-'+overviewBuyerSector+'.csv'));
}
function renderOverviewSectorScope() {
  installOverviewSectorControls();
  const period = document.getElementById('overviewStudyPeriod'); if (period) period.textContent = overviewStudy.label;
  const panel = document.getElementById('overviewSectorControls');
  if (panel && overviewSectorData?.observations) {
    const notes = panel.querySelectorAll(':scope > p');
    if (notes[1]) notes[1].textContent = 'Buyer mapping · Review pending' + (overviewSectorData.observations.source_review_status === 'includes_unreviewed_source' ? ' · New source includes records awaiting review' : '');
    const detail = panel.querySelector('details p');
    if (detail) detail.textContent = 'Totals use recorded delivery dates. Current study: January 2017–September 2026; 2026 is partial and missing months remain unavailable. Source observations are descriptive candidates; reporting completeness and new product labels remain subject to review.';
  }
  const buyer=document.getElementById('overviewBuyerSector');
  if(buyer) {buyer.disabled=overviewSectorData?.source?.release?.financial_scope?.id!=='itemized';buyer.value=overviewBuyerSector;}
  const status=document.getElementById('overviewSectorScope');
  if(status) status.textContent=(overviewSectorData?.source?.release?.financial_scope?.label || 'Itemized')+' · '+overviewBuyerSector+' · '+descriptivePeriodLabel()+' · Financial KPIs, margin and calendar share this scope. Contract buyer allocation is unavailable.';
  const button=document.getElementById('overviewTrendExport'); if(button)button.disabled=!overviewSectorData;
  const scope = getOverviewComparisonScope();
  if(scope) window.dispatchEvent(new CustomEvent('medshield:overview-scope',{detail:scope}));
}
`
