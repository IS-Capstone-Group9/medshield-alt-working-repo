/** Activity coverage is a count of observed months, not proof of complete reporting. */
export function overviewDescriptiveSummary(
  rows: Array<{ period?: unknown; revenue?: unknown; missing?: unknown; evidence?: unknown }>,
  selectedMonths: string[],
) {
  const eligibleMonths = [...new Set(selectedMonths)]
    .filter(period => /^\d{4}-(0[1-9]|1[0-2])$/.test(period)).sort()
  const allowed = new Set(eligibleMonths)
  const totals = new Map<string, number>()
  for (const row of rows) {
    const period = String(row.period || '').slice(0, 7)
    if (!allowed.has(period) || row.missing || row.evidence === 'estimate'
      || row.evidence === 'unavailable' || row.revenue == null || row.revenue === '') continue
    const revenue = Number(row.revenue)
    if (!Number.isFinite(revenue)) continue
    totals.set(period, (totals.get(period) || 0) + revenue)
  }
  const averages = Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, '0')
    const observations = [...totals.entries()].filter(([period]) => period.slice(5, 7) === month)
    return {
      month,
      count: observations.length,
      revenue: observations.length
        ? observations.reduce((sum, [, value]) => sum + value, 0) / observations.length : null,
    }
  })
  const years = [...new Set(eligibleMonths.map(period => period.slice(0, 4)))]
  const coverage = years.map(year => {
    const periods = eligibleMonths.filter(period => period.startsWith(year + '-'))
    const observed = periods.filter(period => totals.has(period)).length
    return { year, observed, unavailable: periods.length - observed, total: periods.length }
  })
  return { months: [...totals.entries()].map(([period, revenue]) => ({ period, revenue })), averages, coverage }
}

/** Compare only observed monthly pairs; a nonpositive prior total has no percentage. */
export function overviewMatchedGrowth(
  currentRows: Array<{ period?: unknown; revenue?: unknown; missing?: unknown; evidence?: unknown }>,
  priorRows: Array<{ period?: unknown; revenue?: unknown; missing?: unknown; evidence?: unknown }>,
) {
  const observed = (rows: typeof currentRows) => rows.filter(row => !row.missing
    && row.evidence !== 'estimate' && row.evidence !== 'unavailable'
    && /^\d{4}-\d{2}$/.test(String(row.period)) && row.revenue != null
    && row.revenue !== '' && Number.isFinite(Number(row.revenue)))
  const current = observed(currentRows)
  const prior = new Map(observed(priorRows).map(row => [String(row.period), Number(row.revenue)]))
  const pairs = current.flatMap(row => {
    const period = String(row.period)
    const previousPeriod = String(Number(period.slice(0, 4)) - 1) + period.slice(4)
    return prior.has(previousPeriod) ? [{ current: Number(row.revenue), previous: prior.get(previousPeriod)! }] : []
  })
  const currentTotal = pairs.reduce((sum, row) => sum + row.current, 0)
  const previousTotal = pairs.reduce((sum, row) => sum + row.previous, 0)
  return { count: pairs.length, available: current.length, current: currentTotal, previous: previousTotal,
    rate: pairs.length && previousTotal > 0 ? (currentTotal - previousTotal) / previousTotal * 100 : null }
}

export const OVERVIEW_ANALYTICS_SCRIPT = `const overviewDescriptiveSummary = ${overviewDescriptiveSummary.toString()};\nconst overviewMatchedGrowth = ${overviewMatchedGrowth.toString()};` + String.raw`
let overviewTrendMeasure = 'both';

function renderOverviewTrendSelection() {
  const canvas = document.getElementById('overviewBaselineChart');
  const chart = canvas && Chart.getChart(canvas);
  const card = canvas?.closest('.chart-card');
  if (!chart || !card) return;
  if (typeof overviewSectorData !== 'undefined' && overviewSectorData) {
    renderOverviewTrendComparison(chart, card);
    return;
  }
  let select = document.getElementById('overviewTrendMeasureSelect');
  if (!select) {
    const control = document.createElement('label');
    control.className = 'descriptive-measure-control';
    control.innerHTML = 'Show <select id="overviewTrendMeasureSelect"><option value="sales">Net sales</option><option value="profit">Gross profit</option><option value="both">Sales and gross profit</option></select>';
    card.querySelector('.chart-header').append(control);
    select = control.querySelector('select');
    select.addEventListener('change', () => { overviewTrendMeasure = select.value; renderOverviewTrendSelection(); });
    const finding = document.createElement('p'); finding.id = 'overviewTrendReading'; finding.className = 'analytical-finding'; finding.setAttribute('aria-live', 'polite');
    const values = document.createElement('details'); values.id = 'overviewTrendSummary'; values.className = 'chart-method';
    const heading = document.createElement('summary'); heading.textContent = 'Trend summary and reading notes';
    values.append(heading, finding);
    card.querySelector('.chart-wrap').after(values);
    const cue = document.createElement('p'); cue.id = 'overviewTrendReadCue'; cue.className = 'analytical-review-prompt';
    values.append(cue);
  }
  const daily = descriptiveUsesDailyGrain();
  if (daily) overviewTrendMeasure = 'sales';
  select.value = overviewTrendMeasure;
  select.disabled = daily;
  const visibleValues = [];
  chart.data.datasets.forEach((dataset, index) => {
    const profit = dataset.label.includes('Gross Profit');
    const visible = overviewTrendMeasure === 'both' || (overviewTrendMeasure === 'profit' ? profit : !profit);
    chart.setDatasetVisibility(index, visible);
    if (visible) visibleValues.push(...dataset.data.filter(value => value != null && Number.isFinite(Number(value))).map(Number));
  });
  const axisTitle = overviewTrendMeasure === 'both' ? 'Sales and gross profit (₱)' : overviewTrendMeasure === 'profit' ? 'Gross profit (₱)' : 'Net sales (₱)';
  chart.options.scales.y = diagnosticAxis(visibleValues, axisTitle, getColor(), 'left', true);
  chart.options.plugins.legend.display = chart.data.datasets.filter((_, index) => chart.isDatasetVisible(index)).length > 1;
  // The selector controls visibility, bounds and narrative together. The legend is a key.
  chart.options.plugins.legend.labels.filter = item => chart.isDatasetVisible(item.datasetIndex);
  chart.options.plugins.legend.onClick = () => {};
  chart.update('none');
  const rows = getDescriptiveDisplayRows();
  const describe = (metric, name) => {
    const observed = rows.filter(row => row.evidence === 'actual' && row[metric] != null && Number.isFinite(Number(row[metric])));
    if (!observed.length) return 'No recorded ' + name + ' in this selection; estimates cannot establish an observed trend.';
    const first = observed[0], last = observed[observed.length - 1];
    if (observed.length === 1) return 'Only one period has recorded ' + name + ' (' + descriptivePointLabel(first.period) + '): ' + formatCurrency(first[metric]) + '. More observations are needed to describe movement.';
    if (descriptiveYearNeedsCoverageNote(first.period) || descriptiveYearNeedsCoverageNote(last.period)) return 'Recorded ' + name + ' totals: ' + descriptivePointLabel(first.period) + ' ' + formatCurrency(first[metric]) + '; ' + descriptivePointLabel(last.period) + ' ' + formatCurrency(last[metric]) + '. Totals use client-provided records; compare years using matched recorded months.';
    const change = Number(last[metric]) - Number(first[metric]);
    return 'From ' + descriptivePointLabel(first.period) + ' to ' + descriptivePointLabel(last.period) + ', recorded ' + name + (change > 0 ? ' rose by ' : change < 0 ? ' fell by ' : ' was unchanged at ') + formatCurrency(change === 0 ? first[metric] : Math.abs(change)) + '.';
  };
  document.getElementById('overviewTrendReading').textContent = overviewTrendMeasure === 'both'
    ? describe('revenue', 'sales') + ' ' + describe('income', 'gross profit')
    : overviewTrendMeasure === 'profit' ? describe('income', 'gross profit') : describe('revenue', 'sales');
  document.getElementById('overviewTrendReadCue').textContent = (daily ? 'Daily detail shows sales only. ' : 'Both measures use the same peso scale. ')
    + (typeof overviewSectorData!=='undefined'&&overviewSectorData?'Observed records only; unavailable gaps stay blank. ':'Dashed sections and triangles are gap estimates; unavailable gaps stay blank. ')+'Endpoint change does not imply continuous growth or explain a cause.';
  const title = card.querySelector('.chart-title');
  const titleText = title && Array.from(title.childNodes).find(node => node.nodeType === 3);
  if (titleText) titleText.textContent = overviewTrendMeasure === 'profit' ? 'How did gross profit change? ' : overviewTrendMeasure === 'both' ? 'How did sales and gross profit change? ' : 'How did sales change? ';
  canvas.setAttribute('aria-label', axisTitle + ' over ' + descriptivePeriodLabel() + '; observed values and labeled gap estimates');
}

function installOverviewDecisionLayout(page) {
  const grid = page.querySelector('.kpi-grid');
  if (!grid || document.getElementById('kpiOverviewGrossProfit')) return;
  const revenueCard = document.getElementById('kpiOverviewTotalRevenue')?.closest('.kpi-card');
  if (!revenueCard) return;
  grid.replaceChildren(revenueCard);
  revenueCard.querySelector('.kpi-sub')?.remove();
  revenueCard.querySelector('.kpi-tag')?.remove();
  grid.classList.add('overview-decision-kpis');
  revenueCard.querySelector('.kpi-label').textContent = 'Net sales';
  for (const [id, title, note] of [
    ['GrossProfit', 'Gross profit', 'Before operating expenses'],
    ['MatchedGrowth', 'Change vs last year', 'Matched observations only'],
    ['ObservationCoverage', 'Months with records', 'Observed / selected elapsed months']
  ]) {
    const card = document.createElement('section'); card.className = 'kpi-card';
    card.innerHTML = '<div class="kpi-label">'+title+'</div><div class="kpi-value" id="kpiOverview'+id+'">Unavailable</div><p class="overview-kpi-note" id="overview'+id+'Note">'+note+'</p>';
    grid.append(card);
  }
  const status = document.createElement('aside'); status.id = 'overviewPublicationStrip';
  status.className = 'overview-publication-strip'; status.setAttribute('aria-label', 'Evidence and publication status');
  status.innerHTML = '<span><strong>Sales</strong> · Candidate</span><span class="kpi-card-forecast"><strong>Forecast</strong> · Unpublished</span><span><strong>Planning</strong> · Scenarios only</span><details><summary>Publication limits</summary><p>Sales business approval is pending. No approved trained forecast or live disease alert is published. Disease and weather joins await approval. Planning requires reviewed operational assumptions and does not execute purchases.</p></details>';
  grid.before(status);
  const summary = document.createElement('section'); summary.id = 'overviewOutputSummary'; summary.className = 'analytical-output-summary';
  summary.innerHTML = '<p id="overviewDecisionFinding" class="analytical-output-takeaway"></p><p id="overviewDecisionReview" class="analytical-output-review"></p>';
  grid.after(summary);
  const period = document.createElement('p'); period.id = 'overviewPeriodCaption'; period.className = 'analytical-output-scope';
  summary.before(period);
  for (const title of ['Evidence and publication status', 'Planning review', 'Model Publication Status', 'Active Decision Focus']) {
    const heading = Array.from(page.querySelectorAll('.chart-title')).find(node => node.textContent.trim() === title);
    const card = heading?.closest('.chart-card'); const parent = card?.parentElement;
    if (card) card.remove();
    if (parent?.classList.contains('chart-grid-2') && !parent.children.length) parent.remove();
  }
}

function renderOverviewDecisionSummary(page, summary, source) {
  installOverviewDecisionLayout(page);
  page.querySelector('#kpiOverviewTotalRevenue').closest('.kpi-card').querySelector('.kpi-label').textContent = 'Net sales';
  document.getElementById('overviewPeriodCaption').textContent = (typeof overviewBuyerSector === 'undefined' ? '' : overviewBuyerSector + ' · ') + descriptivePeriodLabel();
  const observed = getDescriptiveMonthlyRows().filter(row => !descriptiveIsFuturePeriod(row.period) && Number.isFinite(Number(row.revenue)));
  const independentProfit = typeof overviewSectorData !== 'undefined' && overviewSectorData;
  const profitRows = independentProfit ? getDescriptiveSourceRows().filter(row => descriptivePeriodIncludes(row.period)
    && !descriptiveIsFuturePeriod(row.period) && row.income != null && Number.isFinite(Number(row.income))) : observed;
  const hasProfit = independentProfit ? profitRows.length > 0 : observed.length > 0 && observed.every(row => row.income != null && Number.isFinite(Number(row.income)));
  document.getElementById('kpiOverviewTotalRevenue').textContent = observed.length ? formatCurrency(observed.reduce((sum,row)=>sum+Number(row.revenue),0)) : 'No observations';
  document.getElementById('kpiOverviewGrossProfit').textContent = hasProfit
    ? formatCurrency(profitRows.reduce((sum,row) => sum + Number(row.income),0)) : 'Unavailable';
  document.getElementById('overviewGrossProfitNote').textContent = hasProfit
    ? 'Before operating expenses · ' + profitRows.length + (independentProfit ? ' periods with eligible profit; sales coverage may differ' : ' observed source periods')
    : 'Complete profit values are required for all observed sales periods.';
  const elapsed = summary.coverage.reduce((sum,row) => sum + row.total,0);
  const count = summary.coverage.reduce((sum,row) => sum + row.observed,0);
  document.getElementById('kpiOverviewObservationCoverage').textContent = elapsed ? count + '/' + elapsed : 'Unavailable';
  document.getElementById('overviewObservationCoverageNote').textContent = count + ' of ' + elapsed + ' selected months have records. Within-month completeness is unverified.';
  const priorSource = descriptivePeriod === 'custom'
    ? descriptiveCustomMonthlyRows(shiftIsoYear(customDateStart,-1), shiftIsoYear(customDateEnd,-1)) : dashboardMonthlyRows();
  // A current-month snapshot may be partial; do not compare it to last year's full month.
  const growth = overviewMatchedGrowth(source.filter(row => String(row.period) < descriptivePhtDate().slice(0,7)), priorSource);
  const growthValue = document.getElementById('kpiOverviewMatchedGrowth');
  const growthNote = document.getElementById('overviewMatchedGrowthNote');
  growthValue.textContent = descriptivePeriod === 'all' ? '—' : growth.rate == null ? 'Unavailable'
    : (growth.rate > 0 ? '+' : '') + growth.rate.toFixed(1) + '%';
  growthNote.textContent = descriptivePeriod === 'all'
    ? 'Select a bounded period to compare with the same dates one year earlier.'
    : growth.count + '/' + growth.available + ' observed month pairs matched · ' + (growth.count ? formatCurrency(growth.previous) + ' → ' + formatCurrency(growth.current) : 'No prior-year matches')
      + (growth.count && growth.previous <= 0 ? '. Percentage requires positive prior sales.' : '') + '. Open current month and estimates excluded; custom boundary months may be partial.';
  const best = [...summary.months].sort((a,b) => b.revenue-a.revenue)[0];
  document.getElementById('overviewDecisionFinding').textContent = best
    ? count + '/' + elapsed + ' selected elapsed months have observed sales. ' + best.period + ' has the highest observed monthly net sales (' + formatCurrency(best.revenue) + ').'
    : 'No observed monthly sales are available in the selected period.';
  document.getElementById('overviewDecisionReview').textContent = elapsed > count
    ? 'Next review: inspect ' + (elapsed-count) + ' month' + (elapsed-count === 1 ? '' : 's') + ' without records before comparing activity across years. Missing values are excluded from totals.'
    : 'Next review: confirm reporting completeness and candidate approval before using these historical patterns for planning.';
}

function renderOverviewAnalytics() {
  if (!dashboardPageIsActive('overview')) return;
  const page = document.getElementById('page-overview');
  let section = document.getElementById('overviewAnalyticalViews');
  if (!section) {
    section = document.createElement('section');
    section.id = 'overviewAnalyticalViews';
    section.className = 'overview-analytical-views';
    section.setAttribute('aria-label', 'Observed sales patterns and coverage');
    section.innerHTML = '<details id="overviewPatternDetails" class="chart-card"><summary>Explore monthly averages and coverage</summary><div class="overview-descriptive-grid">'
      + '<section class="chart-card" aria-labelledby="overviewMonthAverageTitle"><div class="chart-header"><div><h2 class="chart-title" id="overviewMonthAverageTitle">Average sales by calendar month</h2><p class="chart-subtitle" id="overviewMonthAverageNote"></p></div></div><div class="chart-wrap overview-summary-chart"><canvas id="overviewMonthAverageChart" role="img" aria-label="Average observed net sales by calendar month; values and sample counts in the table below"></canvas></div><p id="overviewMonthAverageEmpty" class="overview-empty-note" role="status" hidden></p><details class="overview-chart-notes"><summary>Method and observed month counts</summary><p>Each bar is the mean of observed year-month net-sales totals in the selected period. Sample counts may differ. Zero and negative sales are retained; missing months and gap estimates are excluded. Partial-month totals can affect comparisons. This describes sales activity and does not establish recurring seasonality or disease effects. Display grain and Y/Y matching do not change this selected-scope summary.</p><div class="overview-summary-table"><table id="overviewMonthAverageTable" class="product-table" aria-label="Calendar-month average sales and observed sample counts"></table></div></details></section>'
      + '<section class="chart-card" aria-labelledby="overviewCoverageTitle"><div class="chart-header"><div><h2 class="chart-title" id="overviewCoverageTitle">Observed months by year</h2><p class="chart-subtitle" id="overviewCoverageNote"></p></div></div><div class="chart-wrap overview-summary-chart"><canvas id="overviewCoverageChart" role="img" aria-label="Observed and unavailable months by year within the selected elapsed period; exact counts in the table below"></canvas></div><p id="overviewCoverageEmpty" class="overview-empty-note" role="status" hidden></p><details class="overview-chart-notes"><summary>Coverage denominator and values</summary><p>Each denominator counts calendar months intersecting the selected period through the current Philippine month. Future months are excluded. A month is observed when it has a finite source net-sales total, including zero or negative sales. Current and boundary months may be partial. These counts do not prove complete reporting within a month. Display grain and Y/Y matching do not change this selected-scope summary.</p><div class="overview-summary-table"><table id="overviewCoverageTable" class="product-table" aria-label="Observed and unavailable month counts with selected-period denominators"></table></div></details></section></div></details>'
      + '<div class="chart-card"><div class="chart-header"><div><h2 class="chart-title">Monthly sales calendar</h2><p class="chart-subtitle" id="overviewCalendarNote"></p></div></div><div id="overviewSalesCalendar"></div><p class="overview-calendar-key"><span>Blue: sales</span><span>Red: negative sales</span><span>White: zero</span><span>Gray: unavailable</span></p><details class="overview-chart-notes"><summary>How to read this calendar</summary><p>Monthly net sales use the same color scale across the selection. Darker cells show larger absolute amounts. Select a month for its value. Estimates are excluded. Gray cells have no observation in the selected scope. Partial months and coverage differences can affect comparisons; this is not a seasonality index. Display grain and Y/Y matching do not change this selected-scope calendar.</p><p id="overviewCalendarMethod"></p></details></div>'
      + '<section id="overviewProfitExplore" class="chart-card overview-profit-explore"><div class="chart-header"><div><h2 class="chart-title">How did gross margin change over time?</h2><p class="chart-subtitle" id="overviewProfitNote"></p></div></div><div class="chart-wrap"><canvas id="overviewMarginChart" role="img" aria-label="Chronological gross-margin percentage; exact sector, period, financial basis and coverage in the table below"></canvas></div><details class="chart-method"><summary>Margin calculation, values and coverage</summary><p id="overviewProfitMethod" class="overview-chart-notes"></p><div class="overview-summary-table" tabindex="0" role="region" aria-label="Scrollable trend values"><table id="overviewTrendValues" class="product-table" aria-label="Selected sector trend values and coverage"></table></div></details></section>';
    section.querySelectorAll('#overviewProfitExplore, #overviewPatternDetails').forEach(details => details.addEventListener('toggle', event => {
      if (event.target.open) requestAnimationFrame(() => {
        event.target.querySelectorAll('canvas').forEach(canvas => {
          const chart = Chart.getChart(canvas);
          if (chart && chart.canvas && chart.canvas.isConnected) chart.resize();
        });
      });
    }));
    const trendCard = document.getElementById('overviewBaselineChart')?.closest('.chart-card');
    if (document.getElementById('overviewSectorComparison')) document.getElementById('overviewSectorComparison').after(section);
    else if (trendCard) trendCard.after(section);
    else page.append(section);
  }
  const monthlySource = descriptivePeriod === 'custom' ? descriptiveCustomMonthlyRows(customDateStart, customDateEnd) : dashboardMonthlyRows();
  const source = monthlySource.filter(row => descriptivePeriodIncludes(row.period)
    && !descriptiveIsFuturePeriod(row.period) && !row.missing && row.evidence !== 'estimate'
    && row.revenue != null && Number.isFinite(Number(row.revenue)));
  const years = [...new Set(descriptiveAxisPeriods().map(period => String(period).slice(0, 4)))]
    .filter(year => /^\d{4}$/.test(year) && !descriptiveIsFuturePeriod(year));
  const selectedMonths = years.flatMap(year => Array.from({length:12}, (_, index) => year + '-' + String(index + 1).padStart(2, '0')))
    .filter(period => descriptivePeriodIncludes(period) && !descriptiveIsFuturePeriod(period));
  const summary = overviewDescriptiveSummary(source, selectedMonths);
  renderOverviewDecisionSummary(page, summary, source);
  const months = new Map(summary.months.map(row => [row.period, row.revenue]));
  const calendar = document.getElementById('overviewSalesCalendar');
  calendar.replaceChildren();
  const max = Math.max(0, ...Array.from(months.values()).map(value => Math.abs(value)));
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const compactMoney = value => new Intl.NumberFormat('en-PH', {style:'currency',currency:'PHP',notation:'compact',maximumFractionDigits:1}).format(value);
  const drawSummary = (id, hasValues, configuration, emptyId, message) => {
    const canvas = document.getElementById(id);
    const wrap = canvas.closest('.chart-wrap');
    wrap.hidden = !hasValues;
    const empty = document.getElementById(emptyId); empty.hidden = hasValues; empty.textContent = hasValues ? '' : message;
    if (hasValues) createChart(id, configuration);
    else { const chart = Chart.getChart(canvas); if (chart) chart.destroy(); }
  };
  document.getElementById('overviewMonthAverageNote').textContent = months.size + ' observed months · estimates excluded';
  drawSummary('overviewMonthAverageChart', months.size > 0, {
    type:'bar', data:{labels:names,datasets:[{label:'Average observed net sales (₱)',data:summary.averages.map(row=>row.revenue),backgroundColor:summary.averages.map(row=>row.revenue < 0 ? '#C0392B' : '#1E3A5F'),borderRadius:3}]},
    options: {
      responsive:true, maintainAspectRatio:false, animation:false,
      plugins: {legend:{display:false},tooltip:{callbacks:{
        label:context=>context.raw == null ? 'No observed month' : 'Average: '+formatCurrency(context.raw),
        afterLabel:context=>summary.averages[context.dataIndex].count+' observed year-months'
      }}},
      scales: {x:{grid:{display:false}},y:{beginAtZero:true,ticks:{callback:compactMoney},title:{display:true,text:'Average net sales (₱)'}}}
    }
  }, 'overviewMonthAverageEmpty', 'No observed net sales in this selection. Missing months are excluded from averages.');
  document.getElementById('overviewMonthAverageTable').innerHTML = '<thead><tr><th scope="col">Calendar month</th><th scope="col">Mean net sales</th><th scope="col">Observed months</th></tr></thead><tbody>'+summary.averages.map((row,index)=>'<tr><th scope="row">'+names[index]+'</th><td>'+(row.revenue == null ? 'Unavailable' : formatCurrency(row.revenue))+'</td><td>'+row.count+'</td></tr>').join('')+'</tbody>';
  const selectedMonthCount = summary.coverage.reduce((sum,row)=>sum+row.total,0);
  const observedMonthCount = summary.coverage.reduce((sum,row)=>sum+row.observed,0);
  document.getElementById('overviewCoverageNote').textContent = observedMonthCount+'/'+selectedMonthCount+' selected elapsed months observed';
  drawSummary('overviewCoverageChart', selectedMonthCount > 0, {
    type:'bar', data:{labels:summary.coverage.map(row=>row.year+(row.year===descriptivePhtDate().slice(0,4)?' YTD':row.total<12?' · selected months':'')),datasets:[{label:'Observed',data:summary.coverage.map(row=>row.observed),backgroundColor:'#1E3A5F',borderRadius:2},{label:'Unavailable',data:summary.coverage.map(row=>row.unavailable),backgroundColor:'#CBD5E1',borderRadius:2}]},
    options: {
      responsive:true, maintainAspectRatio:false, animation:false,
      plugins: {legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:8,font:{size:11}}},tooltip:{callbacks:{afterLabel:context=>{
        const row=summary.coverage[context.dataIndex];return row.observed+'/'+row.total+' selected elapsed months observed';
      }}}},
      scales: {x:{stacked:true,grid:{display:false},ticks:{maxRotation:0}},y:{stacked:true,beginAtZero:true,max:12,ticks:{stepSize:3},title:{display:true,text:'Selected calendar months'}}}
    }
  }, 'overviewCoverageEmpty', 'No elapsed calendar months fall within this selection. Future months are excluded.');
  document.getElementById('overviewCoverageTable').innerHTML = '<thead><tr><th scope="col">Year</th><th scope="col">Observed</th><th scope="col">Unavailable</th><th scope="col">Selected elapsed months</th></tr></thead><tbody>'+summary.coverage.map(row=>'<tr><th scope="row">'+row.year+'</th><td>'+row.observed+'</td><td>'+row.unavailable+'</td><td>'+row.total+'</td></tr>').join('')+'</tbody>';
  const table = document.createElement('table');
  table.style.cssText = 'width:100%;min-width:480px;border-collapse:separate;border-spacing:3px;font-size:11px';
  table.setAttribute('aria-label', 'Observed monthly net sales calendar');
  const header = table.createTHead().insertRow();
  ['Year', ...names].forEach(name => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = name; header.append(th); });
  const body = table.createTBody();
  years.forEach(year => {
    const tr = body.insertRow();
    const th = document.createElement('th'); th.scope = 'row'; th.textContent = year; tr.append(th);
    names.forEach((name, index) => {
      const period = year + '-' + String(index + 1).padStart(2, '0');
      const value = months.get(period);
      const cell = tr.insertCell();
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = value == null ? '–' : value === 0 ? '0' : '';
      const caption = period + ': ' + (value == null ? 'No observation in selected scope' : formatCurrency(value) + ' observed net sales');
      button.title = caption; button.setAttribute('aria-label', caption);
      button.style.cssText = 'width:100%;min-height:30px;border:1px solid #d5dfe9;border-radius:4px;cursor:help;color:#1a2b3c';
      button.style.background = value == null ? '#e2e8f0' : value === 0 ? '#ffffff'
        : value < 0 ? 'rgba(192,57,43,' + (0.12 + 0.65 * Math.abs(value) / max) + ')'
        : 'rgba(14,165,233,' + (0.12 + 0.65 * value / max) + ')';
      button.onclick = () => {
        document.getElementById('overviewCalendarValue').textContent = caption;
        if (value != null) openDiagnosticDrilldown({ period, label: period });
      };
      cell.append(button);
    });
  });
  calendar.append(table);
  table.style.display = months.size ? '' : 'none';
  section.querySelector('.overview-calendar-key').style.display = months.size ? '' : 'none';
  const detail = document.createElement('p'); detail.id = 'overviewCalendarValue'; detail.className = 'chart-subtitle';
  detail.setAttribute('aria-live', 'polite'); detail.textContent = months.size ? 'Select a month to inspect its observed net sales.' : 'Try a period with observed sales.'; calendar.append(detail);
  const highest = [...months.entries()].sort((a,b) => b[1] - a[1])[0];
  document.getElementById('overviewCalendarNote').textContent = highest
    ? 'Highest observed month: ' + highest[0] + ' · ' + formatCurrency(highest[1])
    : 'No observed monthly sales in this selection.';
  document.getElementById('overviewCalendarMethod').textContent = descriptivePeriodLabel() + '. Observed sales only; partial periods may affect comparisons.';

  const values = getDescriptiveDisplayRows();
  const rates = values.map(row=>typeof overviewPeriodMargin==='function'?overviewPeriodMargin(row):null);
  const count = rates.filter(value=>value!=null).length;
  const sector = typeof overviewBuyerSector==='undefined'?'All':overviewBuyerSector;
  document.getElementById('overviewProfitNote').textContent = sector+' · '+descriptivePeriodLabel()+' · '+count+'/'+values.length+' periods have an interpretable margin';
  document.getElementById('overviewProfitMethod').textContent = 'Gross profit ÷ net sales from the same margin-eligible records × 100, before operating expenses. Missing or nonpositive denominators stay unavailable. Signed adjustments are retained. Recorded-month coverage and selected dates remain visible; this does not explain a business cause.';
  createChart('overviewMarginChart', {
    type:'line', data:{labels:values.map(row=>descriptivePointLabel(row.period)),datasets:[{label:'Gross margin (%)',data:rates,borderColor:'#1E3A5F',pointRadius:3,tension:0,spanGaps:false,fill:false}]},
    options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:context=>context.raw==null?'Unavailable':Number(context.raw).toFixed(2)+'%'}}},scales:{y:{title:{display:true,text:'Gross margin (%)'},ticks:{callback:value=>value+'%'}}}}
  });
  const marginTable=document.getElementById('overviewTrendValues'); marginTable.replaceChildren();
  const marginHeader=marginTable.createTHead().insertRow();
  ['Period','Sector','Net sales','Gross profit','Margin revenue basis','Gross margin','Coverage/status'].forEach(value=>{const th=document.createElement('th');th.scope='col';th.textContent=value;marginHeader.append(th);});
  const marginBody=marginTable.createTBody();
  values.forEach((row,index)=>{
    const tr=marginBody.insertRow();
    [descriptivePointLabel(row.period),sector,row.revenue==null?'Unavailable':formatCurrency(row.revenue),row.income==null?'Unavailable':formatCurrency(row.income),row.margin_revenue_basis==null?'Unavailable':formatCurrency(row.margin_revenue_basis),rates[index]==null?'Unavailable':rates[index].toFixed(2)+'%',(row.observed_months!=null?row.observed_months+'/12 observed months (sales) · ':'')+(row.profit_observed_months!=null?row.profit_observed_months+'/12 profit months · ':'')+(row.evidence||'unavailable')].forEach(value=>tr.insertCell().textContent=value);
  });
  if(typeof renderOverviewSectorScope==='function')renderOverviewSectorScope();
}
`

export const OVERVIEW_ANALYTICS_STYLE = `
#overviewAnalyticalViews { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; margin-bottom: 20px; }
#overviewAnalyticalViews > .chart-card { min-width: 0; min-height: 0; margin-bottom: 0; }
#overviewPatternDetails > summary { cursor: pointer; font-size: 13px; font-weight: 700; color: var(--text-primary); }
#overviewPatternDetails .overview-descriptive-grid { margin-top: 18px; }
#overviewAnalyticalViews .overview-descriptive-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
#overviewAnalyticalViews .overview-descriptive-grid > .chart-card { min-width: 0; min-height: 0; margin-bottom: 0; }
#overviewAnalyticalViews .overview-summary-chart { height: 250px !important; min-height: 0 !important; }
#overviewAnalyticalViews [hidden] { display: none !important; }
#overviewAnalyticalViews .overview-summary-table { max-height: 300px; overflow: auto; margin-top: 12px; }
#overviewAnalyticalViews .overview-summary-table table { min-width: 340px; }
#overviewAnalyticalViews .overview-empty-note { padding: 18px 0; color: var(--text-secondary); font-size: 12px; line-height: 1.5; }
#overviewSalesCalendar { max-height: 360px; overflow: auto; }
.overview-calendar-key + .overview-chart-notes { margin-top: 10px; }
.overview-calendar-key { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 11px; color: var(--text-secondary); margin-top: 10px; }
.overview-chart-notes { margin-top: 12px; color: var(--text-secondary); font-size: 12px; line-height: 1.6; }
.overview-chart-notes summary { cursor: pointer; font-weight: 600; }
.overview-chart-notes p { margin-top: 8px; max-width: 90ch; }
#overviewProfitExplore > summary { cursor: pointer; font-size: 13px; font-weight: 700; color: var(--text-primary); }
.overview-profit-content { margin-top: 18px; }
#overviewProfitExplore .chart-wrap { height: 320px !important; min-height: 0 !important; }
#page-overview .chart-card:has(#overviewBaselineChart) .chart-wrap { height: clamp(280px, 30vw, 380px) !important; min-height: 0 !important; }
@media (max-width: 900px) {
  #overviewAnalyticalViews .overview-descriptive-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 540px) {
  #overviewAnalyticalViews .overview-summary-chart { height: 230px !important; }
  #overviewProfitExplore .chart-wrap { height: 260px !important; }
  #page-overview .chart-card:has(#overviewBaselineChart) .chart-wrap { height: 280px !important; }
}
`
