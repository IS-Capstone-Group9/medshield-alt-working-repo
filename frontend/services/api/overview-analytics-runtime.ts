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
function installOverviewDecisionLayout(page) {
  const grid = page.querySelector('.kpi-grid');
  if (!grid || document.getElementById('kpiOverviewGrossProfit')) return;
  const revenueCard = document.getElementById('kpiOverviewTotalRevenue')?.closest('.kpi-card');
  if (!revenueCard) return;
  grid.replaceChildren(revenueCard);
  grid.classList.add('overview-decision-kpis');
  for (const [id, title, note] of [
    ['GrossProfit', 'Observed gross profit', 'Before operating expenses'],
    ['MatchedGrowth', 'Matched-period sales growth', 'Versus the same period one year earlier'],
    ['ObservationCoverage', 'Observed month coverage', 'Observed / selected elapsed months']
  ]) {
    const card = document.createElement('section'); card.className = 'kpi-card';
    card.innerHTML = '<div class="kpi-label">'+title+'</div><div class="kpi-value" id="kpiOverview'+id+'">Unavailable</div><p class="overview-kpi-note" id="overview'+id+'Note">'+note+'</p>';
    grid.append(card);
  }
  const status = document.createElement('aside'); status.id = 'overviewPublicationStrip';
  status.className = 'overview-publication-strip'; status.setAttribute('aria-label', 'Evidence and publication status');
  status.innerHTML = '<span><strong>Sales</strong> · Gold candidate; business approval pending</span><span class="kpi-card-forecast"><strong>Forecast</strong> · Not published</span><span><strong>Planning</strong> · reviewed scenarios only</span><details><summary>Publication limits</summary><p>No approved trained forecast or live disease alert is published. Disease and weather joins await approval. Planning requires reviewed operational assumptions and does not execute purchases.</p></details>';
  grid.before(status);
  const summary = document.createElement('section'); summary.id = 'overviewOutputSummary'; summary.className = 'analytical-output-summary';
  summary.innerHTML = '<p id="overviewDecisionFinding" class="analytical-output-takeaway"></p><p id="overviewDecisionReview" class="analytical-output-review"></p>';
  grid.after(summary);
  for (const title of ['Evidence and publication status', 'Planning review', 'Model Publication Status', 'Active Decision Focus']) {
    const heading = Array.from(page.querySelectorAll('.chart-title')).find(node => node.textContent.trim() === title);
    const card = heading?.closest('.chart-card'); const parent = card?.parentElement;
    if (card) card.remove();
    if (parent?.classList.contains('chart-grid-2') && !parent.children.length) parent.remove();
  }
}

function renderOverviewDecisionSummary(page, summary, source) {
  installOverviewDecisionLayout(page);
  const observed = getDescriptiveMonthlyRows().filter(row => !descriptiveIsFuturePeriod(row.period) && Number.isFinite(Number(row.revenue)));
  const hasProfit = observed.length > 0 && observed.every(row => row.income != null && Number.isFinite(Number(row.income)));
  document.getElementById('kpiOverviewGrossProfit').textContent = hasProfit
    ? formatCurrency(observed.reduce((sum,row) => sum + Number(row.income),0)) : 'Unavailable';
  document.getElementById('overviewGrossProfitNote').textContent = hasProfit
    ? 'Before operating expenses · ' + observed.length + ' observed source periods'
    : 'Complete profit values are required for all observed sales periods.';
  const elapsed = summary.coverage.reduce((sum,row) => sum + row.total,0);
  const count = summary.coverage.reduce((sum,row) => sum + row.observed,0);
  document.getElementById('kpiOverviewObservationCoverage').textContent = elapsed ? count + '/' + elapsed : 'Unavailable';
  document.getElementById('overviewObservationCoverageNote').textContent = 'Selected elapsed calendar months · ' + (elapsed-count) + ' unavailable. Within-month completeness is unverified.';
  const priorSource = descriptivePeriod === 'custom'
    ? descriptiveCustomMonthlyRows(shiftIsoYear(customDateStart,-1), shiftIsoYear(customDateEnd,-1)) : dashboardMonthlyRows();
  // A current-month snapshot may be partial; do not compare it to last year's full month.
  const growth = overviewMatchedGrowth(source.filter(row => String(row.period) < descriptivePhtDate().slice(0,7)), priorSource);
  const growthValue = document.getElementById('kpiOverviewMatchedGrowth');
  const growthNote = document.getElementById('overviewMatchedGrowthNote');
  growthValue.textContent = descriptivePeriod === 'all' ? 'Choose a period' : growth.rate == null ? 'Unavailable'
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
    ? 'Next review: inspect the ' + (elapsed-count) + ' unavailable months before comparing activity across years. Missing values are excluded from totals.'
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
    section.innerHTML = '<div class="overview-descriptive-grid">'
      + '<section class="chart-card" aria-labelledby="overviewMonthAverageTitle"><div class="chart-header"><div><h2 class="chart-title" id="overviewMonthAverageTitle">Average sales by calendar month</h2><p class="chart-subtitle" id="overviewMonthAverageNote"></p></div></div><div class="chart-wrap overview-summary-chart"><canvas id="overviewMonthAverageChart" role="img" aria-label="Average observed net sales by calendar month; values and sample counts in the table below"></canvas></div><p id="overviewMonthAverageEmpty" class="overview-empty-note" role="status" hidden></p><details class="overview-chart-notes"><summary>Method and observed month counts</summary><p>Each bar is the mean of observed year-month net-sales totals in the selected period. Sample counts may differ. Zero and negative sales are retained; missing months and gap estimates are excluded. Partial-month totals can affect comparisons. This describes sales activity and does not establish recurring seasonality or disease effects. Display grain and Y/Y matching do not change this selected-scope summary.</p><div class="overview-summary-table"><table id="overviewMonthAverageTable" class="product-table" aria-label="Calendar-month average sales and observed sample counts"></table></div></details></section>'
      + '<section class="chart-card" aria-labelledby="overviewCoverageTitle"><div class="chart-header"><div><h2 class="chart-title" id="overviewCoverageTitle">Observed months by year</h2><p class="chart-subtitle" id="overviewCoverageNote"></p></div></div><div class="chart-wrap overview-summary-chart"><canvas id="overviewCoverageChart" role="img" aria-label="Observed and unavailable months by year within the selected elapsed period; exact counts in the table below"></canvas></div><p id="overviewCoverageEmpty" class="overview-empty-note" role="status" hidden></p><details class="overview-chart-notes"><summary>Coverage denominator and values</summary><p>Each denominator counts calendar months intersecting the selected period through the current Philippine month. Future months are excluded. A month is observed when it has a finite source net-sales total, including zero or negative sales. Current and boundary months may be partial. These counts do not prove complete reporting within a month. Display grain and Y/Y matching do not change this selected-scope summary.</p><div class="overview-summary-table"><table id="overviewCoverageTable" class="product-table" aria-label="Observed and unavailable month counts with selected-period denominators"></table></div></details></section></div>'
      + '<div class="chart-card"><div class="chart-header"><div><h2 class="chart-title">Monthly sales calendar</h2><p class="chart-subtitle" id="overviewCalendarNote"></p></div></div><div id="overviewSalesCalendar"></div><p class="overview-calendar-key"><span>Blue: sales</span><span>Red: negative sales</span><span>White: zero</span><span>Gray: unavailable</span></p><details class="overview-chart-notes"><summary>How to read this calendar</summary><p>Monthly net sales use the same color scale across the selection. Darker cells show larger absolute amounts. Select a month for its value. Estimates are excluded. Gray cells have no observation in the selected scope. Partial months and coverage differences can affect comparisons; this is not a seasonality index. Display grain and Y/Y matching do not change this selected-scope calendar.</p><p id="overviewCalendarMethod"></p></details></div>'
      + '<details id="overviewProfitExplore" class="chart-card overview-profit-explore"><summary>Explore sales and profit</summary><div class="overview-profit-content"><div class="chart-header"><div><h2 class="chart-title">Sales and gross profit</h2><p class="chart-subtitle" id="overviewProfitNote"></p></div></div><div class="chart-wrap"><canvas id="overviewProfitScatter" role="img" aria-label="Observed net sales versus gross profit by period"></canvas></div><details class="overview-chart-notes"><summary>What these points represent</summary><p id="overviewProfitMethod"></p></details></div></details>';
    section.querySelector('#overviewProfitExplore').addEventListener('toggle', event => {
      if (event.target.open) requestAnimationFrame(() => {
        const chart = Chart.getChart(document.getElementById('overviewProfitScatter'));
        if (chart && chart.canvas && chart.canvas.isConnected) chart.resize();
      });
    });
    const trendCard = document.getElementById('overviewBaselineChart')?.closest('.chart-card');
    if (trendCard) trendCard.after(section);
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

  const points = getDescriptiveDisplayRows().filter(row => row.evidence === 'actual' && row.revenue != null && row.income != null
    && Number.isFinite(Number(row.revenue)) && Number.isFinite(Number(row.income)))
    .map(row => ({ x: Number(row.revenue), y: Number(row.income), period: row.period, observedMonths: row.observed_months }));
  const largestSales = [...points].sort((a,b) => b.x - a.x)[0];
  const largestProfit = [...points].sort((a,b) => b.y - a.y)[0];
  document.getElementById('overviewProfitNote').textContent = points.length
    ? points.length + ' observed periods · gross profit before operating expenses'
    : 'No periods with both sales and gross profit.';
  document.getElementById('overviewProfitMethod').textContent = points.length + ' observed periods with both measures. Estimates and unavailable profit are excluded. '
    + descriptivePeriodLabel() + '. ' + (largestSales ? 'Highest sales: ' + largestSales.period + '; highest gross profit: ' + largestProfit.period + '. ' : '')
    + (comparisonMode === 'yoy' && descriptiveUsesYearlyGrain() ? 'Y/Y mode uses matched observed months. ' : '')
    + 'Gross profit is before operating expenses. Partial periods remain partial; this does not establish causality.';
  createChart('overviewProfitScatter', {
    type: 'scatter', data: { datasets: [{ label: 'Observed periods', data: points, backgroundColor: '#0ea5e9', pointRadius: 5, pointHoverRadius: 7 }] },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        title: items => items.length ? items[0].raw.period + (items[0].raw.observedMonths != null ? ' · ' + items[0].raw.observedMonths + '/12 observed months' : '') : '',
        label: context => ['Net sales: ' + formatCurrency(context.raw.x), 'Gross profit: ' + formatCurrency(context.raw.y)]
      } } },
      scales: {
        x: { type: 'linear', beginAtZero: true, title: { display: true, text: 'Net sales (₱)' }, ticks: { callback: value => new Intl.NumberFormat('en-PH', {style:'currency',currency:'PHP',notation:'compact'}).format(value) } },
        y: { type: 'linear', beginAtZero: true, title: { display: true, text: 'Gross profit (₱)' }, ticks: { callback: value => new Intl.NumberFormat('en-PH', {style:'currency',currency:'PHP',notation:'compact'}).format(value) } }
      }
    }
  });
  const wrap = document.getElementById('overviewProfitScatter').closest('.chart-wrap');
  wrap.style.display = points.length ? '' : 'none';
  if (!points.length) { wrap.dataset.state = 'empty'; wrap.dataset.emptyMessage = 'No observed periods with both net sales and gross profit.'; }
}
`

export const OVERVIEW_ANALYTICS_STYLE = `
#overviewAnalyticalViews { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; margin-bottom: 20px; }
#overviewAnalyticalViews > .chart-card { min-width: 0; min-height: 0; margin-bottom: 0; }
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
