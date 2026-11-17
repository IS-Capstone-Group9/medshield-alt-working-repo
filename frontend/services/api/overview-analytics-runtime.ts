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
  chart.options.scales.y = diagnosticAxis(visibleValues, axisTitle, 'left', true);
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

function renderOverviewPredictiveSummary() {
  const output = document.getElementById('overview-predictive-output');
  const limit = document.getElementById('overview-predictive-limit');
  if (!output || !limit) return;
  const forecastCanvas = document.getElementById('overviewForecastChart');
  const hasPlot = forecastCanvas && Boolean(Chart.getChart(forecastCanvas));
  if (forecastCanvas) forecastCanvas.closest('.overview-inline-chart').hidden = !hasPlot;
  if (hasPlot) Chart.getChart(forecastCanvas).resize();
  const empty = document.getElementById('overview-predictive-empty');
  if (empty) empty.hidden = hasPlot;
  const loaded = typeof forecastValidationData !== 'undefined' && forecastValidationData;
  const loading = typeof forecastValidationState !== 'undefined' && forecastValidationState === 'loading';
  output.setAttribute('aria-busy', String(loading));
  output.textContent = loaded ? document.getElementById('forecastTakeaway').textContent
    : document.getElementById('forecastStatus').textContent;
  if (loaded) {
    const result = loaded.views[document.getElementById('forecastHorizon').value]?.models?.[document.getElementById('forecastModel').value];
    const metrics = result?.metrics;
    if (Number.isFinite(metrics?.wape)) output.textContent = 'Past forecasts missed by ' + metrics.wape.toLocaleString('en-PH', {maximumFractionDigits: 1})
      + '% of the observed total (' + (metrics.n ?? 0) + ' scored observations checked). Historical WAPE; future accuracy is not established.';
  }
  if (empty) empty.textContent = loading ? 'Loading (can take up to a minute)' : loaded ? 'No numerical evidence for this chart.' : output.textContent;
  limit.textContent = 'Independent Forecast Modeling scope; Overview filters do not change it. Chart shows up to 18 recent calendar months; full history remains in Forecast Modeling and CSV. ' + (loaded
    ? document.getElementById('forecastStatus').textContent
    : 'No approved published forecast is established by this overview. Research and baseline estimates require separate model acceptance.');
  if (loaded) {
    const model = document.getElementById('forecastModel').value;
    const horizon = document.getElementById('forecastHorizon').value;
    const result = loaded.views[horizon]?.models?.[model];
    const approved = loaded.status === 'published' && loaded.publication_status === 'approved' && loaded.run_id && loaded.release_id;
    const estimates = approved ? [] : result?.candidate_estimates || [];
    const first = (estimates.length ? estimates : result?.forecast || []).find(point => typeof point.prediction === 'number' && Number.isFinite(point.prediction));
    if (first) limit.textContent += ' First available ' + (estimates.length ? 'unpublished baseline estimate' : approved ? 'published prediction' : 'unapproved prediction')
      + ': ' + first.period + ' · ' + first.prediction.toLocaleString('en-PH', { maximumFractionDigits: 2 }) + ' ' + loaded.scope.unit + '.';
  }
}

function renderOverviewAnalyticsSections(page, summary) {
  let sections = document.getElementById('overviewAnalyticsSections');
  if (!sections) {
    sections = document.createElement('div');
    sections.id = 'overviewAnalyticsSections';
    sections.className = 'overview-analytics-grid';
    for (const [key, title, question, chartLabel, action] of [
      ['descriptive', 'Descriptive', 'What happened?', 'Monthly net sales', 'Explore current metrics and trends'],
      ['diagnostic', 'Diagnostic', 'What changed, and what needs investigation?', 'Monthly sales change', 'Investigate recorded change'],
      ['predictive', 'Predictive', 'What could happen next?', 'Forecast evidence chart', 'Review forecasts'],
      ['prescriptive', 'Prescriptive', 'What should we review or do next?', 'Sales-record coverage', 'Review planning assumptions']
    ]) {
      const card = document.createElement('section');
      card.className = 'chart-card overview-analytics-card';
      card.setAttribute('aria-labelledby', 'overview-' + key + '-title');
      const triggerId = 'overview-' + key + '-chart-toggle';
      const detail = document.createElement('section');
      detail.className = 'chart-card overview-analytics-detail';
      detail.id = 'overview-' + key + '-detail';
      detail.hidden = true;
      detail.setAttribute('aria-labelledby', triggerId);

      card.innerHTML = '<h2 id="overview-' + key + '-title">' + title + '</h2>'
        + '<p class="overview-analytics-output" id="overview-' + key + '-output"></p>'
        + '<button type="button" class="overview-analytics-toggle" id="' + triggerId + '" aria-expanded="false" aria-controls="' + detail.id + '">' + chartLabel + '</button>';
      detail.innerHTML = '<p class="overview-analytics-question">' + question + '</p>'
        + '<div class="overview-inline-chart" hidden><canvas id="' + (key === 'predictive' ? 'overviewForecastChart' : 'overview-' + key + '-chart') + '" role="img" aria-label="' + title + ' analytics chart; scope and interpretation below"></canvas></div>'
        + '<p class="overview-inline-empty" id="overview-' + key + '-empty" role="status">Source evidence unavailable for this chart.</p>'
        + '<div class="overview-analytics-notes"><strong>Scope and interpretation</strong><p class="overview-analytics-limit" id="overview-' + key + '-limit"></p></div>'
        + '<div class="overview-analytics-actions"><button type="button" class="overview-analytics-action">' + action + '</button></div>';

      if (key === 'prescriptive') {
        const tile = document.createElement('div');
        tile.className = 'overview-coverage-tile';
        tile.innerHTML = '<p id="overview-coverage-count" style="font-size:24px;font-weight:700;margin:16px 0 8px"></p><progress id="overview-prescriptive-chart" aria-label="Selected elapsed months with sales records" style="width:100%;height:10px;accent-color:#1E3A5F"></progress><p>Observed sales records; this does not certify complete reporting.</p>';
        detail.querySelector('.overview-inline-chart').replaceWith(tile);
        detail.querySelector('.overview-inline-empty').remove();
      }

      const actions = detail.querySelector('.overview-analytics-actions');
      actions.querySelector('button').addEventListener('click', () => {
        if (key === 'descriptive') {
          document.getElementById('overviewBaselineChart')?.closest('.chart-card')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
          document.getElementById('overviewTrendMeasureSelect')?.focus({ preventScroll: true });
        } else if (key === 'diagnostic') {
          openDiagnosticDrilldown();
        } else {
          const destination = key === 'predictive' ? 'forecast' : 'inventory';
          const nav = page.closest('.medshield-root')?.querySelector('.nav-item[onclick*="\'' + destination + '\'"]');
          showPage(destination, nav);
        }
      });
      if (key === 'predictive') {
        const load = document.createElement('button');
        load.type = 'button'; load.className = 'overview-analytics-action'; load.textContent = 'Refresh forecast chart';
        load.addEventListener('click', () => window.dispatchEvent(new CustomEvent('medshield:forecast-change')));
        actions.append(load);
      }

      const trigger = card.querySelector('button');
      trigger.addEventListener('click', () => {
        const previous = sections.querySelector('.overview-analytics-toggle[aria-expanded="true"]');
        if (previous) {
          document.getElementById(previous.getAttribute('aria-controls')).hidden = true;
          previous.setAttribute('aria-expanded', 'false');
        }
        if (previous === trigger) return;
        detail.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        const canvas = detail.querySelector('canvas');
        if (canvas) requestAnimationFrame(() => Chart.getChart(canvas)?.resize());
      });
      // Keep the panel next in keyboard order. The grid places it after the card's visual row.
      sections.append(card, detail);
    }
    page.querySelector('.overview-decision-kpis').after(sections);
    if (typeof renderForecastValidation === 'function') renderForecastValidation();
  }
  const output = key => document.getElementById('overview-' + key + '-output');
  const limit = key => document.getElementById('overview-' + key + '-limit');
  const observed = summary.months.length;
  const total = summary.coverage.reduce((sum, row) => sum + row.total, 0);
  const missing = total - observed;
  const scope = (typeof overviewBuyerSector === 'undefined' ? 'All' : overviewBuyerSector) + ' · ' + descriptivePeriodLabel();
  output('descriptive').textContent = observed
    ? document.getElementById('kpiOverviewTotalRevenue').textContent + ' recorded net sales · ' + observed + '/' + total + ' months observed.'
    : 'Recorded metrics unavailable for this selection.';
  limit('descriptive').textContent = scope + '. Trends, gross margin and coverage below use the selected financial scope; estimates are excluded.';

  // Compare adjacent closed months only: a gap or an open month is not a change.
  const closed = summary.months.filter(row => row.period < descriptivePhtDate().slice(0, 7)).sort((a, b) => a.period.localeCompare(b.period));
  const monthIndex = period => Number(period.slice(0, 4)) * 12 + Number(period.slice(5, 7));
  const changes = closed.slice(1).flatMap((row, index) => monthIndex(row.period) - monthIndex(closed[index].period) === 1
    ? [{ from: closed[index], to: row, change: row.revenue - closed[index].revenue }] : []);
  const largest = changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
  const draw = (key, labels, datasets, axis, hasValues) => {
    const canvas = document.getElementById('overview-' + key + '-chart');
    canvas.closest('.overview-inline-chart').hidden = !hasValues;
    document.getElementById('overview-' + key + '-empty').hidden = hasValues;
    if (!hasValues) { Chart.getChart(canvas)?.destroy(); return; }
    canvas.setAttribute('aria-label', key === 'diagnostic' ? 'Adjacent closed-month net-sales changes in pesos. Missing months excluded; not verified causes.'
      : 'Observed monthly net sales in pesos; missing months remain gaps.');
    createChart(canvas.id, { type: key === 'descriptive' ? 'line' : 'bar', data: { labels, datasets },
      options: { responsive: true, maintainAspectRatio: false, animation: false, spanGaps: false,
        plugins: { legend: { display: false } },
        datasets: { bar: { maxBarThickness: 48 } },
        scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 6, maxRotation: 0 } },
          y: { beginAtZero: true, title: { display: true, text: axis } } } } });
  };
  const periods = summary.coverage.flatMap(row => Array.from({length: 12}, (_, index) => row.year + '-' + String(index + 1).padStart(2, '0')))
    .filter(period => descriptivePeriodIncludes(period) && !descriptiveIsFuturePeriod(period));
  const sales = new Map(summary.months.map(row => [row.period, row.revenue]));
  draw('descriptive', periods, [{ label: 'Observed net sales (₱)', data: periods.map(period => sales.get(period) ?? null), borderColor: '#1E3A5F', backgroundColor: '#1E3A5F', pointRadius: 2, tension: 0 }], 'Net sales (₱)', observed > 0);
  const chronological = [...changes].sort((a, b) => a.to.period.localeCompare(b.to.period));
  draw('diagnostic', chronological.map(row => row.to.period), [{ label: 'Change vs preceding month (₱)', data: chronological.map(row => row.change), backgroundColor: chronological.map(row => row.change < 0 ? '#B45309' : '#1E3A5F'), borderRadius: 3 }], 'Change (₱)', changes.length > 0);
  document.getElementById('overview-coverage-count').textContent = observed + ' of ' + total + ' months observed';
  const coverageBar = document.getElementById('overview-prescriptive-chart');
  coverageBar.max = total || 1;
  coverageBar.value = observed;
  coverageBar.setAttribute('aria-valuetext', observed + ' of ' + total + ' months observed');
  coverageBar.hidden = !total;
  document.getElementById('overview-prescriptive-chart').setAttribute('aria-description', 'Data-readiness review only; not an inventory allocation or procurement recommendation.');
  output('diagnostic').textContent = largest
    ? 'Largest adjacent-month sales change: ' + largest.from.period + ' → ' + largest.to.period + ' · ' + (largest.change > 0 ? '+' : '') + formatCurrency(largest.change) + '.'
    : 'No adjacent closed-month observations to compare in this selection.';
  limit('diagnostic').textContent = scope + '. This localizes a recorded change, not its business cause. Investigate itemized product and area contributions; contract amounts cannot establish itemized drivers. Partial boundary months can affect comparisons.';

  renderOverviewPredictiveSummary();

  output('prescriptive').textContent = !observed
    ? 'Restore source evidence or select a period with recorded sales before planning.'
    : missing > 0 ? 'Review ' + missing + (missing === 1 ? ' month' : ' months') + ' without sales records before interpreting trends or setting a planning scenario.'
    : 'Review the largest recorded changes and validate stock, supplier, lead-time and expiry inputs before comparing planning scenarios.';
  limit('prescriptive').textContent = 'Review guidance based on selected coverage, not an optimized order. Prescriptive Planning has its own scope and entered assumptions. Scenarios do not authorize procurement or execute purchases.';
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
    ['ObservationCoverage', 'Sales record coverage', 'Months with sales / selected months']
  ]) {
    const card = document.createElement('section'); card.className = 'kpi-card';
    card.innerHTML = '<div class="kpi-label">'+title+'</div><div class="kpi-value" id="kpiOverview'+id+'">Unavailable</div><p class="overview-kpi-note" id="overview'+id+'Note">'+note+'</p>';
    grid.append(card);
  }
  const status = document.createElement('footer'); status.id = 'overviewPublicationStrip';
  status.className = 'overview-publication-strip'; status.setAttribute('aria-label', 'Evidence and publication status');
  status.innerHTML = '<span data-financial-status><strong>Sales</strong> · Candidate</span><span class="kpi-card-forecast"><strong>Forecast</strong> · Unpublished</span><span><strong>Planning</strong> · Scenarios only</span><details><summary>Publication limits</summary><p data-publication-limits>Sales approval is being checked. Historical disease and weather context is available in Sales Diagnostics. Forecast publication and operational planning retain their separate requirements.</p></details>';
  grid.after(status);
  for (const title of ['Evidence and publication status', 'Planning review', 'Model Publication Status', 'Active Decision Focus']) {
    const heading = Array.from(page.querySelectorAll('.chart-title')).find(node => node.textContent.trim() === title);
    const card = heading?.closest('.chart-card'); const parent = card?.parentElement;
    if (card) card.remove();
    if (parent?.classList.contains('chart-grid-2') && !parent.children.length) parent.remove();
  }
}

function renderOverviewDecisionSummary(page, summary, source) {
  installOverviewDecisionLayout(page);
  const approved = page.closest('.medshield-root')?.dataset.financialPublication === 'approved';
  page.querySelector('[data-financial-status]').textContent = approved ? 'Sales · Financial scope approved' : 'Sales · Candidate';
  page.querySelector('[data-publication-limits]').textContent = (approved
    ? 'Descriptive financial reporting is approved. Product identity and derived mappings retain their separate review status. '
    : 'Sales business approval is pending. ') + 'Historical DOH and PAGASA observations and NASA POWER monthly proxies are available in Sales Diagnostics. Forecast research remains unpublished; external model joins require a separate supported methodology. Planning uses reviewed scenario assumptions and does not execute purchases.';
  page.querySelector('#kpiOverviewTotalRevenue').closest('.kpi-card').querySelector('.kpi-label').textContent = 'Net sales';
  if (page.closest('.medshield-root')?.dataset.analyticalScope === 'itemized_product_sales') {
    page.querySelector('[data-financial-status]').textContent = 'Sales · Original itemized records';
    page.querySelector('[data-publication-limits]').textContent = 'Itemized product sales only. Contracts without product details and unmatched replacement rows are excluded. These are not complete company totals. Earlier stored forecasts and STL require reevaluation on this corrected population. Product units and planning inputs retain their separate review requirements.';
    page.querySelector('#kpiOverviewTotalRevenue').closest('.kpi-card').querySelector('.kpi-label').textContent = 'Itemized net sales';
  }
  const finance=DATA.release?.financial_scope;
  if(finance) {
    page.querySelector('[data-financial-status]').textContent='Financial scope · '+finance.label;
    page.querySelector('[data-publication-limits]').textContent=finance.note+' Product, area, diagnostic and model analyses retain their itemized population and independent acceptance requirements.';
    page.querySelector('#kpiOverviewTotalRevenue').closest('.kpi-card').querySelector('.kpi-label').textContent=finance.unreconciled?'Recorded net amount — unreconciled':finance.id==='contracts'?'Recorded contract net amount':'Itemized net sales';
    page.querySelector('#kpiOverviewGrossProfit').closest('.kpi-card').querySelector('.kpi-label').textContent=finance.unreconciled?'Supported gross profit — unreconciled':finance.id==='contracts'?'Supported contract gross profit':'Gross profit';
  }
  const observed = getDescriptiveMonthlyRows().filter(row => !descriptiveIsFuturePeriod(row.period) && row.revenue != null && Number.isFinite(Number(row.revenue)));
  const independentProfit = typeof overviewSectorData !== 'undefined' && overviewSectorData;
  const profitRows = independentProfit ? getDescriptiveSourceRows().filter(row => descriptivePeriodIncludes(row.period)
    && !descriptiveIsFuturePeriod(row.period) && row.income != null && Number.isFinite(Number(row.income))) : observed;
  const hasProfit = independentProfit ? profitRows.length > 0 : observed.length > 0 && observed.every(row => row.income != null && Number.isFinite(Number(row.income)));
  const scopeLabel = (independentProfit ? overviewBuyerSector + ' · ' : '') + descriptivePeriodLabel();
  const salesNote = document.getElementById('overviewRevenueEvidence');
  if (salesNote) {
    const existing = salesNote.textContent || '';
    const estimateStart = existing.indexOf('Gap estimate:');
    salesNote.textContent = scopeLabel + ' · ' + (estimateStart >= 0 ? existing.slice(estimateStart) : 'Recorded net sales; gap estimates excluded');
  }
  document.getElementById('kpiOverviewTotalRevenue').textContent = observed.length ? formatCurrency(observed.reduce((sum,row)=>sum+Number(row.revenue),0)) : 'No observations';
  document.getElementById('kpiOverviewGrossProfit').textContent = hasProfit
    ? formatCurrency(profitRows.reduce((sum,row) => sum + Number(row.income),0)) : 'Unavailable';
  document.getElementById('overviewGrossProfitNote').textContent = hasProfit
    ? scopeLabel + ' · Before operating expenses · ' + profitRows.length + (independentProfit ? ' periods with eligible profit; sales coverage may differ' : ' observed source periods')
    : 'Complete profit values are required for all observed sales periods.';
  const elapsed = summary.coverage.reduce((sum,row) => sum + row.total,0);
  const count = summary.coverage.reduce((sum,row) => sum + row.observed,0);
  document.getElementById('kpiOverviewObservationCoverage').textContent = elapsed ? count + '/' + elapsed : 'Unavailable';
  document.getElementById('overviewObservationCoverageNote').textContent = (elapsed ? (count / elapsed * 100).toFixed(1) + '% of selected months · ' + (elapsed-count) + (elapsed-count === 1 ? ' month' : ' months') + ' without sales records. ' : 'No elapsed months in this selection. ') + 'Record presence does not verify complete monthly reporting.';
  const priorSource = descriptivePeriod === 'custom'
    ? descriptiveCustomMonthlyRows(shiftIsoYear(customDateStart,-1), shiftIsoYear(customDateEnd,-1)) : dashboardMonthlyRows();
  // A current-month snapshot may be partial; do not compare it to last year's full month.
  const closedRows = source.filter(row => String(row.period) < descriptivePhtDate().slice(0,7));
  const latestYear = closedRows.map(row => String(row.period).slice(0,4)).sort().at(-1);
  // All-time totals have no single prior year. Give this card an explicit latest-year scope.
  const growthRows = descriptivePeriod === 'all' ? closedRows.filter(row => String(row.period).startsWith(latestYear + '-')) : closedRows;
  const growth = overviewMatchedGrowth(growthRows, priorSource);
  const growthValue = document.getElementById('kpiOverviewMatchedGrowth');
  const growthNote = document.getElementById('overviewMatchedGrowthNote');
  growthValue.closest('.kpi-card').querySelector('.kpi-label').textContent = descriptivePeriod === 'all' ? 'Latest-year sales growth' : 'Sales growth vs prior year';
  growthValue.textContent = growth.rate == null ? 'Unavailable'
    : (growth.rate > 0 ? '+' : '') + growth.rate.toFixed(1) + '%';
  const comparisonScope = descriptivePeriod === 'all' ? (latestYear ? latestYear + ' vs ' + (Number(latestYear)-1) + ' · ' : '') : 'Selected dates vs one year earlier · ';
  growthNote.textContent = comparisonScope + growth.count + '/' + growth.available + ' observed month pairs matched · ' + (growth.count ? formatCurrency(growth.previous) + ' → ' + formatCurrency(growth.current) + ' (' + (growth.current-growth.previous > 0 ? '+' : '') + formatCurrency(growth.current-growth.previous) + ')' : 'No prior-year matches')
      + (growth.count && growth.previous <= 0 ? '. Percentage requires positive prior sales.' : '') + '. Open current month and estimates excluded.' + (descriptivePeriod === 'custom' ? ' Boundary months use selected dates only.' : '');

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
    section.innerHTML = '<section id="overviewPatternDetails" class="chart-card" aria-labelledby="overviewPatternTitle"><h2 id="overviewPatternTitle" class="chart-title">Monthly averages and coverage</h2><div class="overview-descriptive-grid">'
      + '<section class="chart-card" aria-labelledby="overviewMonthAverageTitle"><div class="chart-header"><div><h2 class="chart-title" id="overviewMonthAverageTitle">Average sales by calendar month</h2><p class="chart-subtitle" id="overviewMonthAverageNote"></p></div></div><div class="chart-wrap overview-summary-chart"><canvas id="overviewMonthAverageChart" role="img" aria-label="Average observed net sales by calendar month; values and sample counts in the table below"></canvas></div><p id="overviewMonthAverageEmpty" class="overview-empty-note" role="status" hidden></p><details class="overview-chart-notes"><summary>Method and observed month counts</summary><p>Each bar is the mean of observed year-month net-sales totals in the selected period. Sample counts may differ. Zero and negative sales are retained; missing months and gap estimates are excluded. Partial-month totals can affect comparisons. This describes sales activity and does not establish recurring seasonality or disease effects. Display grain and Y/Y matching do not change this selected-scope summary.</p><div class="overview-summary-table"><table id="overviewMonthAverageTable" class="product-table" aria-label="Calendar-month average sales and observed sample counts"></table></div></details></section>'
      + '<section class="chart-card" aria-labelledby="overviewCoverageTitle"><div class="chart-header"><div><h2 class="chart-title" id="overviewCoverageTitle">Observed months by year</h2><p class="chart-subtitle" id="overviewCoverageNote"></p></div></div><div class="chart-wrap overview-summary-chart"><canvas id="overviewCoverageChart" role="img" aria-label="Observed and unavailable months by year within the selected elapsed period; exact counts in the table below"></canvas></div><p id="overviewCoverageEmpty" class="overview-empty-note" role="status" hidden></p><details class="overview-chart-notes"><summary>Coverage denominator and values</summary><p>Each denominator counts calendar months intersecting the selected period through the current Philippine month. Future months are excluded. A month is observed when it has a finite source net-sales total, including zero or negative sales. Current and boundary months may be partial. These counts do not prove complete reporting within a month. Display grain and Y/Y matching do not change this selected-scope summary.</p><div class="overview-summary-table"><table id="overviewCoverageTable" class="product-table" aria-label="Observed and unavailable month counts with selected-period denominators"></table></div></details></section></div></section>'
      + '<div class="chart-card"><div class="chart-header"><div><h2 class="chart-title">Monthly sales calendar</h2><p class="chart-subtitle" id="overviewCalendarNote"></p></div></div><div id="overviewSalesCalendar"></div><p class="overview-calendar-key"><span>Blue: sales</span><span>Red: negative sales</span><span>White: zero</span><span>Gray: unavailable</span></p><details class="overview-chart-notes"><summary>How to read this calendar</summary><p>Monthly net sales use the same color scale across the selection. Darker cells show larger absolute amounts. Select a month for its value. Estimates are excluded. Gray cells have no observation in the selected scope. Partial months and coverage differences can affect comparisons; this is not a seasonality index. Display grain and Y/Y matching do not change this selected-scope calendar.</p><p id="overviewCalendarMethod"></p></details></div>'
      + '<section id="overviewProfitExplore" class="chart-card overview-profit-explore"><div class="chart-header"><div><h2 class="chart-title">How did gross margin change over time?</h2><p class="chart-subtitle" id="overviewProfitNote"></p></div></div><div class="chart-wrap"><canvas id="overviewMarginChart" role="img" aria-label="Chronological gross-margin percentage; exact sector, period, financial basis and coverage in the table below"></canvas></div><details class="chart-method"><summary>Margin calculation, values and coverage</summary><p id="overviewProfitMethod" class="overview-chart-notes"></p><div class="overview-summary-table" tabindex="0" role="region" aria-label="Scrollable trend values"><table id="overviewTrendValues" class="product-table" aria-label="Selected sector trend values and coverage"></table></div></details></section>';
    const details = document.createElement('details');
    details.id = 'overviewSalesDetails';
    details.className = 'dashboard-supporting-evidence';
    details.setAttribute('name', 'overview-sales-evidence');
    const label = document.createElement('summary');
    label.textContent = 'More sales patterns and coverage';
    details.append(label, section);
    page.append(details);
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
  renderOverviewAnalyticsSections(page, summary);
  const trendCard = document.getElementById('overviewBaselineChart')?.closest('.chart-card');
  const analyticsSections = document.getElementById('overviewAnalyticsSections');
  const publicationStrip = document.getElementById('overviewPublicationStrip');
  if (trendCard && publicationStrip && publicationStrip.parentElement !== trendCard) trendCard.append(publicationStrip);
  // Moving a card that is already in place would detach it and drop focus from its controls.
  if (trendCard && analyticsSections && analyticsSections.previousElementSibling !== trendCard) analyticsSections.before(trendCard);
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
      plugins: {legend:{labels:{usePointStyle:true,boxWidth:8}},tooltip:{callbacks:{afterLabel:context=>{
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
#page-overview.active { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-3, 12px); }
#page-overview > * { min-width: 0; margin-bottom: 0 !important; }
#page-overview .overview-analytics-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
#page-overview .overview-analytics-card { display: flex; flex-direction: column; align-items: stretch; gap: 8px; min-width: 0; margin: 0; padding: 16px; overflow-wrap: anywhere; }
.overview-analytics-card header { display: flex; flex-direction: column; gap: 6px; }
.overview-analytics-card h2 { margin: 0; font-size: 16px; line-height: 1.3; color: var(--text-primary); }
.overview-analytics-card p { margin: 0; line-height: 1.6; }
#page-overview .overview-inline-chart { position: relative; height: 240px; min-height: 240px; min-width: 0; margin: 8px 0; }
#page-overview .overview-inline-chart canvas { max-width: 100%; }
#page-overview .overview-inline-empty { display: flex; align-items: center; justify-content: center; min-height: 240px; padding: 24px; text-align: center; background: var(--bg-elevated, #F3F6FA); border: 1px dashed var(--border); border-radius: 8px; font-size: 13px; color: var(--text-secondary); }
#page-overview .overview-analytics-card [hidden] { display: none !important; }
.overview-analytics-notes { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
.overview-analytics-notes summary { cursor: pointer; font-weight: 600; }
.overview-analytics-notes p { padding-top: 8px; }
.overview-analytics-question { font-size: 12px; color: var(--text-secondary); }
.overview-chart-caption { font-size: 12px; color: var(--text-secondary); font-weight: 600; }
.overview-analytics-output { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.overview-analytics-limit { font-size: 12px; color: var(--text-secondary); }
.overview-analytics-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; }
.overview-analytics-action { align-self: flex-start; padding: 10px 14px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-surface); color: var(--text-primary); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; text-align: left; }
.overview-analytics-action:hover { border-color: var(--text-secondary); }
.overview-analytics-action:focus-visible { outline: 2px solid #D97706; outline-offset: 3px; }
#page-overview .overview-decision-kpis { gap: var(--space-3, 12px); grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
#page-overview .overview-decision-kpis .kpi-card { min-width: 0; padding: var(--space-3, 12px) var(--space-4, 16px); }
@media (max-width: 1231px) { #page-overview .overview-decision-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
#overviewAnalyticalViews { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; margin-bottom: 20px; }
#overviewAnalyticalViews > .chart-card { min-width: 0; min-height: 0; margin-bottom: 0; }
#overviewPatternTitle { font-size: 13px; font-weight: 700; color: var(--text-primary); }
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
#page-overview .chart-card:has(#overviewBaselineChart) .chart-wrap { height: 300px !important; min-height: 0 !important; }
#overviewTrendComparison > .chart-header .chart-subtitle { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 900px) {
  #page-overview .overview-analytics-grid { grid-template-columns: minmax(0, 1fr); gap: 20px; }
  #overviewAnalyticalViews .overview-descriptive-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 540px) {
  #page-overview.active { gap: 20px; }
  #page-overview .overview-analytics-card { padding: 16px; }
  #overviewAnalyticalViews .overview-summary-chart { height: 230px !important; }
  #overviewProfitExplore .chart-wrap { height: 260px !important; }
  #page-overview .chart-card:has(#overviewBaselineChart) .chart-wrap { height: 280px !important; }
}
`
