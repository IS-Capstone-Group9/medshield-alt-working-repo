/** Shares existing observed/matched-period calculations without changing the selected sector. */
export const OVERVIEW_TREND_COMPARISON_SCRIPT = String.raw`
function installOverviewTrendComparison(card) {
  if (document.getElementById('overviewTrendPanels')) return;
  installOverviewSectorControls();
  document.getElementById('overviewTrendMeasureSelect')?.closest('label')?.remove();
  document.getElementById('overviewTrendReading')?.remove();
  document.getElementById('overviewTrendReadCue')?.remove();
  document.getElementById('overviewTrendSummary')?.remove();
  card.id = 'overviewTrendComparison';
  const controls = document.createElement('label');
  controls.className = 'descriptive-measure-control';
  controls.innerHTML = 'Show in both graphs <select id="overviewTrendMeasureSelect"><option value="both">Sales and gross profit</option><option value="sales">Net sales</option><option value="profit">Gross profit</option></select>';
  card.querySelector('.chart-header').append(controls);
  controls.querySelector('select').addEventListener('change', event => {
    overviewTrendMeasure = event.target.value;
    renderOverviewTrendSelection();
  });
  const panels = document.createElement('div'); panels.id = 'overviewTrendPanels';
  panels.innerHTML = '<article id="overviewOverallPanel" class="overview-trend-panel" aria-labelledby="overviewOverallTitle">'
    + '<header class="overview-trend-panel-header"><h3 id="overviewOverallTitle">Overall · All sectors</h3><span class="overview-fixed-scope">Fixed reference</span></header>'
    + '<p id="overviewOverallCoverage" class="chart-subtitle"></p>'
    + '<div class="chart-wrap"><canvas id="overviewOverallChart" role="img"></canvas></div><p id="overviewOverallEmpty" class="overview-trend-empty" role="status" hidden></p>'
    + '<div class="overview-trend-actions"><button type="button" id="overviewOverallExport" class="btn btn-secondary">Export overall CSV</button></div>'
    + '<details class="overview-trend-values"><summary>Overall values and coverage</summary><p id="overviewOverallReading" class="analytical-finding"></p><div class="overview-trend-table-scroll" role="region" tabindex="0" aria-label="Overall trend values"><table id="overviewOverallTrendValues" class="product-table"></table></div></details></article>'
    + '<article id="overviewSelectedPanel" class="overview-trend-panel" aria-labelledby="overviewSelectedTitle">'
    + '<header class="overview-trend-panel-header"><h3 id="overviewSelectedTitle">Selected sector</h3></header>'
    + '<p id="overviewSelectedCoverage" class="chart-subtitle"></p>'
    + '<p id="overviewSelectedEmpty" class="overview-trend-empty" role="status" hidden></p><div class="overview-trend-actions"></div>'
    + '<details class="overview-trend-values"><summary>Sector values and coverage</summary><p id="overviewTrendReading" class="analytical-finding"></p><div class="overview-trend-table-scroll" role="region" tabindex="0" aria-label="Selected sector trend values"><table id="overviewSelectedTrendValues" class="product-table"></table></div></details></article>';
  const selected = panels.querySelector('#overviewSelectedPanel');
  selected.querySelector('.overview-trend-panel-header').append(document.getElementById('overviewBuyerSectorControl'));
  selected.querySelector('#overviewSelectedEmpty').before(document.getElementById('overviewBaselineChart').closest('.chart-wrap'));
  selected.querySelector('.overview-trend-actions').append(document.getElementById('overviewTrendExport'));
  const cue = document.createElement('p'); cue.id = 'overviewTrendReadCue'; cue.className = 'analytical-review-prompt';
  const help = document.createElement('details'); help.className = 'chart-method';
  const helpTitle = document.createElement('summary'); helpTitle.textContent = 'How to read these graphs';
  help.append(helpTitle, cue);
  const notes = card.querySelector('[data-overview-trend-notes]');
  if (notes) notes.before(panels, help); else card.append(panels, help);
  document.getElementById('overviewOverallExport').addEventListener('click', () => downloadOverviewCSV(overviewExportRows('All'), 'medshield-trend-All.csv'));
  const style = document.createElement('style');
  style.textContent = [
    '#overviewTrendComparison{min-width:0}',
    '#overviewTrendPanels{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-top:14px}',
    '#overviewTrendPanels .overview-trend-panel{min-width:0;padding:16px;border:1px solid var(--border,#c8d8e6);border-radius:10px;background:var(--bg-surface,#fff)}',
    '#overviewTrendPanels .overview-trend-panel-header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;min-height:66px}',
    '#overviewTrendPanels h3{font-size:15px;margin:0}',
    '#overviewTrendPanels label{display:grid;gap:5px;font-size:12px}',
    '#overviewTrendPanels select{max-width:100%;padding:7px;border:1px solid var(--border,#c8d8e6);border-radius:5px;background:var(--bg-surface,#fff);color:var(--text-primary)}',
    '#overviewTrendPanels .chart-subtitle{min-height:38px;margin:8px 0;line-height:1.5}',
    '#overviewTrendPanels .analytical-finding{font-size:12px;line-height:1.6;margin:10px 0}',
    '#overviewTrendPanels .chart-wrap{height:300px!important;min-height:0!important}',
    '#overviewTrendPanels .overview-fixed-scope{font-size:11px;color:var(--text-secondary)}',
    '#overviewTrendPanels .overview-trend-actions{margin-top:12px}',
    '#overviewTrendPanels .overview-trend-values{margin-top:12px;font-size:12px}',
    '#overviewTrendPanels summary{cursor:pointer;font-weight:600}',
    '#overviewTrendPanels .overview-trend-table-scroll{overflow:auto;max-height:280px;margin-top:8px}',
    '#overviewTrendPanels table{min-width:520px;width:100%;font-size:12px}',
    '#overviewTrendPanels th,#overviewTrendPanels td{padding:8px;text-align:right}',
    '#overviewTrendPanels th:first-child,#overviewTrendPanels td:first-child{text-align:left}',
    '#overviewTrendPanels .overview-trend-empty{min-height:300px;display:flex;align-items:center;justify-content:center;text-align:center;color:var(--text-secondary);font-size:13px;padding:20px;background:var(--bg-elevated,#f4f8fb);border-radius:8px}',
    '#overviewTrendPanels [hidden]{display:none!important}',
    '#overviewTrendPanels :focus-visible{outline:2px solid #D97706;outline-offset:2px}',
    '#overviewTrendReadCue{font-size:12px;line-height:1.6;margin-top:12px}',
    '@media(max-width:1000px){#overviewTrendPanels{grid-template-columns:minmax(0,1fr)}',
    '#overviewTrendPanels .analytical-finding{min-height:0}',
    '#overviewTrendPanels .chart-subtitle{min-height:0}',
    '}',
    '@media(max-width:540px){#overviewTrendPanels{gap:14px}',
    '#overviewTrendPanels .overview-trend-panel{padding:12px}',
    '#overviewTrendPanels .chart-wrap{height:260px!important}',
    '#overviewTrendPanels .overview-trend-panel-header{min-height:0}',
    '#overviewTrendComparison>.chart-header{gap:12px}',
    '#overviewTrendPanels .overview-trend-empty{min-height:260px}',
    '}'
  ].join('\n');
  card.append(style);
}

function overviewTrendDescription(rows, sector) {
  const describe = (metric, name) => {
    const observed = rows.filter(row => row.evidence === 'actual' && row[metric] != null && Number.isFinite(Number(row[metric])));
    if (!observed.length) return 'No recorded ' + name + ' in this selection.';
    const first = observed[0], last = observed[observed.length - 1];
    const pointLabel = period => descriptivePointLabel(period, sector);
    if (observed.length === 1) return pointLabel(first.period) + ' recorded ' + name + ': ' + formatCurrency(first[metric]) + '. Only one period observed.';
    if (descriptiveYearNeedsCoverageNote(first.period, sector) || descriptiveYearNeedsCoverageNote(last.period, sector)) return 'Recorded ' + name + ': ' + pointLabel(first.period) + ' ' + formatCurrency(first[metric]) + '; ' + pointLabel(last.period) + ' ' + formatCurrency(last[metric]) + '. Totals use client-provided records; compare years using matched recorded months.';
    const change = Number(last[metric]) - Number(first[metric]);
    return 'From ' + pointLabel(first.period) + ' to ' + pointLabel(last.period) + ', recorded ' + name + (change > 0 ? ' rose by ' : change < 0 ? ' fell by ' : ' was unchanged at ') + formatCurrency(change === 0 ? first[metric] : Math.abs(change)) + '.';
  };
  return overviewTrendMeasure === 'both' ? describe('revenue', 'sales') + ' ' + describe('income', 'gross profit')
    : overviewTrendMeasure === 'profit' ? describe('income', 'gross profit') : describe('revenue', 'sales');
}

function renderOverviewTrendComparison(chart, card) {
  installOverviewTrendComparison(card);
  const daily = descriptiveUsesDailyGrain();
  if (daily) overviewTrendMeasure = 'sales';
  const control = document.getElementById('overviewTrendMeasureSelect'); control.value = overviewTrendMeasure; control.disabled = daily;
  const allRows = getDescriptiveDisplayRows('All'), selectedRows = getDescriptiveDisplayRows();
  const allPrior = getDescriptivePriorDisplayRows('All'), selectedPrior = getDescriptivePriorDisplayRows();
  // A common time axis avoids moving periods when the selected sector has gaps.
  const labels = allRows.map(row => /^\d{4}$/.test(row.period) ? row.period : descriptivePointLabel(row.period));
  const allDatasets = chart.config.data.datasets.map(dataset => {
    const rows = dataset.label.startsWith('Prior-year') ? allPrior : allRows;
    const metric = dataset.label.includes('Gross Profit') ? 'income' : 'revenue';
    return descriptiveEvidenceLine({ ...dataset, data: rows.map(row => row[metric] ?? null) }, rows);
  });
  const configuration = chart.config.options;
  createChart('overviewOverallChart', {type:'line', data:{labels, datasets:allDatasets}, options:{...configuration,
    scales:{...configuration.scales}, plugins:{...configuration.plugins,legend:{...configuration.plugins.legend},tooltip:{...configuration.plugins.tooltip}}}});
  const overall = Chart.getChart(document.getElementById('overviewOverallChart'));
  const visibleValues = [];
  for (const current of [overall, chart]) {
    current.data.labels = labels;
    current.data.datasets.forEach((dataset, index) => {
      const profit = dataset.label.includes('Gross Profit');
      const visible = overviewTrendMeasure === 'both' || (overviewTrendMeasure === 'profit' ? profit : !profit);
      current.setDatasetVisibility(index, visible);
      if (visible) visibleValues.push(...dataset.data.filter(value => value != null && Number.isFinite(Number(value))).map(Number));
    });
  }
  const axisTitle = overviewTrendMeasure === 'both' ? 'Sales and gross profit (₱)' : overviewTrendMeasure === 'profit' ? 'Gross profit (₱)' : 'Net sales (₱)';
  for (const current of [overall, chart]) {
    current.options.scales.y = diagnosticAxis(visibleValues, axisTitle, getColor(), 'left', true);
    current.options.plugins.legend.display = current.data.datasets.filter((_, i) => current.isDatasetVisible(i)).length > 1;
    current.options.plugins.legend.labels.filter = item => current.isDatasetVisible(item.datasetIndex);
    current.options.plugins.legend.onClick = () => {};
    current.update('none');
  }
  for (const [prefix, sector, rows, prior, current] of [
    ['Overall','All',allRows,allPrior,overall], ['Selected',overviewBuyerSector,selectedRows,selectedPrior,chart]
  ]) {
    const observed = rows.filter(row => row.evidence === 'actual' && row.revenue != null).length;
    const profitObserved = rows.filter(row => row.evidence === 'actual' && row.income != null).length;
    const visible = current.data.datasets.some((dataset, i) => current.isDatasetVisible(i) && dataset.data.some(value => value != null));
    current.canvas.closest('.chart-wrap').hidden = !visible;
    const empty = document.getElementById('overview'+prefix+'Empty'); empty.hidden = visible;
    empty.textContent = observed ? 'No recorded values for this measure in ' + sector + '.' : 'No recorded observations for this selection · ' + sector + '.';
    const comparisonNote = comparisonMode !== 'yoy' ? '' : descriptiveUsesYearlyGrain()
      ? ' · matched observed month pairs' : ' · prior-year overlay; missing matches stay unavailable';
    const coverageNote = rows.some(row => (row.observed_months != null && row.observed_months < 12) || (row.profit_observed_months != null && row.profit_observed_months < 12)) ? ' · Year coverage varies' : '';
    document.getElementById('overview'+prefix+'Coverage').textContent = sector + ' · ' + descriptivePeriodLabel() + ' · Sales: ' + observed + '/' + rows.length + '; gross profit: ' + profitObserved + '/' + rows.length + ' periods observed' + comparisonNote + coverageNote;
    document.getElementById(prefix === 'Overall' ? 'overviewOverallReading' : 'overviewTrendReading').textContent = overviewTrendDescription(rows, sector);
    current.canvas.setAttribute('aria-label', sector + ': ' + axisTitle + ' over ' + descriptivePeriodLabel() + '. Shares the other graph’s peso scale. Exact values and coverage in the following table.');
    const table = document.getElementById('overview'+prefix+'TrendValues'); table.replaceChildren();
    const header = table.createTHead().insertRow();
    const headings = ['Period','Sector','Net sales','Gross profit','Coverage/status'];
    if (comparisonMode === 'yoy') headings.push('Prior period','Prior sales','Prior gross profit');
    headings.forEach(label => { const th = document.createElement('th'); th.scope='col'; th.textContent=label; header.append(th); });
    const body = table.createTBody();
    rows.forEach((row, index) => {
      const values = [descriptivePointLabel(row.period, sector),sector,diagnosticCurrency(row.revenue),diagnosticCurrency(row.income),
        (row.observed_months != null ? row.observed_months + '/12 observed sales months · ' : '') + (row.profit_observed_months != null ? row.profit_observed_months + '/12 profit months · ' : '') + row.evidence];
      if (comparisonMode === 'yoy') values.push(prior[index]?.period, diagnosticCurrency(prior[index]?.revenue ?? null), diagnosticCurrency(prior[index]?.income ?? null));
      const tr = body.insertRow(); values.forEach(value => tr.insertCell().textContent = value);
    });
    document.getElementById(prefix === 'Overall' ? 'overviewOverallExport' : 'overviewTrendExport').disabled = !rows.length;
  }
  const title = card.querySelector('.chart-title');
  const text = Array.from(title.childNodes).find(node => node.nodeType === 3);
  if (text) text.textContent = 'Overall and sector sales performance ';
  const subtitle = card.querySelector('.chart-subtitle');
  if (subtitle) subtitle.textContent = 'Same dates, measures and peso scale · Overall stays fixed while you select a sector.';
  document.getElementById('overviewSelectedTitle').textContent = overviewBuyerSector;
  document.getElementById('overviewTrendReadCue').textContent = (daily ? 'Daily detail shows sales only. ' : '')
    + 'Blue: net sales. Amber: gross profit before operating expenses. Both graphs share one peso scale, including signed adjustments. Totals use the client-provided records. Recorded sales/profit month counts and matched Y/Y populations are shown in the values tables. Months without records have no recorded value. Endpoint changes do not establish continuous growth or a cause.';
}
`;
