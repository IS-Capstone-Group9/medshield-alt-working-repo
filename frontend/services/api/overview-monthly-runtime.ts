const SINGLE_YEAR_DATASET_SOURCE = `        {
          label: 'Revenue ' + selectedYear,
          data: yearRows.map((row) => row.revenue),
          borderColor: getColor(),
          backgroundColor: getColor(0.12),
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 2
        }`

const SINGLE_YEAR_MONTHLY_DATASETS = `        {
          label: 'Net Sales Revenue ' + selectedYear + (Number(selectedYear) === dashboardCalendar().year ? ' (Actual + Estimate)' : ''),
          data: yearRows.map((row) => row.revenue),
          borderColor: getColor(),
          backgroundColor: getColor(0.12),
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 2
        },
        {
          label: 'Gross Profit ' + selectedYear + (Number(selectedYear) === dashboardCalendar().year ? ' (Actual + Estimate)' : ''),
          data: yearRows.map((row) => row.income),
          borderColor: getAmber(),
          backgroundColor: getAmber(0.08),
          fill: false,
          tension: 0.35,
          borderWidth: 2.2,
          pointRadius: 2
        }`

const ANNUAL_OVERVIEW_CHART_SOURCE = `  createChart('overviewBaselineChart', {
    type: 'bar',
    data: {
      labels: yearRowsForMode.map((row) => row.year),
      datasets: [
        { label: 'Net Sales Revenue', data: yearRowsForMode.map((row) => row.revenue), backgroundColor: getColor(0.88), borderRadius: 6 },
        { label: 'Gross Profit', data: yearRowsForMode.map((row) => row.income), backgroundColor: getAmber(0.8), borderRadius: 6 }
      ]
    },
    options: opts
  });`

const RESPONSIVE_OVERVIEW_CHART = `  const overviewRows = getDescriptiveDisplayRows();
  const overviewCanvas = document.getElementById('overviewBaselineChart');
  const overviewCard = overviewCanvas ? overviewCanvas.closest('.chart-card') : null;
  const overviewTitle = overviewCard ? overviewCard.querySelector('.chart-title') : null;
  const overviewSubtitle = overviewCard ? overviewCard.querySelector('.chart-subtitle') : null;
  const overviewBadge = overviewCard ? overviewCard.querySelector('.chart-badge') : null;
  const overviewTitleNode = overviewTitle ? Array.from(overviewTitle.childNodes).find((node) => node.nodeType === 3) : null;

  if (overviewTitleNode) overviewTitleNode.textContent = descriptiveUsesDailyGrain()
    ? 'Daily Net Sales Revenue '
    : descriptiveUsesYearlyGrain()
      ? 'Yearly Net Sales Revenue & Gross Profit '
      : 'Monthly Net Sales Revenue & Gross Profit ';
  const overviewEstimatedCount = overviewRows.filter(row => row.evidence === 'estimate').length;
  if (overviewSubtitle) overviewSubtitle.textContent = overviewRows.some(row => row.revenue != null)
    ? descriptivePeriodLabel() + '; ' + overviewEstimatedCount + ' weighted estimate' + (overviewEstimatedCount === 1 ? '' : 's') + '; uploaded actuals take precedence'
    : descriptiveUsesDailyGrain()
      ? 'Daily data unavailable for ' + descriptivePeriodLabel() + '; monthly totals are not divided into invented daily values'
      : 'No monthly observations are available for ' + descriptivePeriodLabel();
  if (overviewBadge) overviewBadge.textContent = comparisonMode === 'yoy'
    ? 'Y/Y Compare'
    : descriptiveUsesDailyGrain() ? 'Daily Detail' : descriptiveUsesYearlyGrain() ? 'Yearly Detail' : 'Monthly Detail';

  const observedSourcePeriods = DATA.monthly.filter(row => row.revenue != null && !row.missing && row.evidence !== 'estimate').map(row => String(row.period)).sort();
  if (overviewSubtitle && observedSourcePeriods.length) overviewSubtitle.textContent += '; source coverage ' + observedSourcePeriods[0] + '–' + observedSourcePeriods[observedSourcePeriods.length - 1];
  if (overviewSubtitle && descriptivePeriod === 'custom' && !descriptiveUsesDailyGrain()) overviewSubtitle.textContent += '; historical partial months require dated transactions';
  if (overviewSubtitle) overviewSubtitle.textContent += '; ' + overviewRows.filter(row => row.evidence === 'actual').length + '/' + overviewRows.length + ' displayed periods observed';
  if (overviewSubtitle && comparisonMode === 'yoy' && descriptiveUsesYearlyGrain()) overviewSubtitle.textContent += '; chart compares matched observed months; KPI retains full selected observed scope';
  if (overviewSubtitle) overviewSubtitle.textContent += '. ' + descriptiveTrendSummary(overviewRows);
  const overviewPriorRows = getDescriptivePriorDisplayRows();
  const overviewDatasets = monthlyDataForMode.datasets.map(dataset => {
    const evidenceRows = dataset.label.startsWith('Prior-year') ? overviewPriorRows : overviewRows;
    return descriptiveEvidenceLine({ ...dataset, label: dataset.label.split(' · ')[0] }, evidenceRows);
  });
  if (overviewSubtitle && overviewRows.concat(overviewPriorRows).some(row => row.evidence === 'estimate')) overviewSubtitle.textContent += ' Connected dashed sections and triangles identify estimates; observed totals exclude them.';
  if (overviewCard && overviewSubtitle) {
    let notes = overviewCard.querySelector('[data-overview-trend-notes]');
    if (!notes) {
      notes = document.createElement('details');
      notes.className = 'overview-chart-notes';
      notes.dataset.overviewTrendNotes = 'true';
      notes.innerHTML = '<summary>Data coverage and comparison notes</summary><p></p>';
      overviewCard.append(notes);
    }
    notes.querySelector('p').textContent = overviewSubtitle.textContent;
    overviewSubtitle.textContent = descriptivePeriodLabel() + ' · ' + overviewRows.filter(row => row.evidence === 'actual').length + '/' + overviewRows.length + ' periods observed.'
      + (overviewEstimatedCount ? ' Dashed lines and triangles mark estimates; totals exclude them.' : ' Observed sales and gross profit.');
  }

  createChart('overviewBaselineChart', {
    type: 'line',
    data: {
      labels: monthlyDataForMode.labels,
      datasets: overviewDatasets
    },
    options: { ...opts, plugins: { ...opts.plugins, legend: { position: 'bottom' }, tooltip: { ...opts.plugins.tooltip, callbacks: { label: descriptiveEvidenceTooltip } } } }
  });

  if (overviewCanvas) {
    overviewCanvas.setAttribute('aria-label', descriptiveUsesDailyGrain()
      ? 'Line chart showing daily net sales revenue for ' + descriptivePeriodLabel() + ' when transaction dates are available.'
      : 'Line chart showing ' + (descriptiveUsesYearlyGrain() ? 'yearly' : 'monthly') + ' net sales revenue and gross profit for ' + descriptivePeriodLabel() + '.');
  }
  renderOverviewTrendSelection();
  renderOverviewAnalytics();`

export function patchOverviewMonthlyChart(script: string): string {
  const withCurrentYearRows = script
    .replace(/function normalizeMonthlyRows\(rows\) \{[\s\S]*?\n\}\n\nfunction toNumber/, `function normalizeMonthlyRows(rows) {
  return (rows || []).filter(row => historicalPeriod(row.period)).map(row => ({
    ...row,
    revenue: row.revenue == null ? null : toNumber(row.revenue),
    income: row.income == null ? null : toNumber(row.income),
    margin_revenue_basis: row.margin_revenue_basis == null ? null : toNumber(row.margin_revenue_basis)
  }));
}

function toNumber`)
    .replace(
      'return diagnosticYears().map(year => DATA.year_summary.find(row => String(row.year) === String(year))',
      'return diagnosticYears().map(year => dashboardAnnualRows().find(row => String(row.year) === String(year))',
    )
    .replace('const rows = DATA.monthly.map((row) => ({ ...row }));', 'const rows = dashboardMonthlyRows();')
    .replace('const marginRows = yearRowsForMode;', 'const marginRows = diagnosticMarginRows();')
    .replace('const revenue = Number(row.revenue);\n    const grossProfit = Number(row.income);', 'const revenue = row.revenue;\n    const grossProfit = row.income;')
    .replace("label: 'Revenue ' + yearA + ' (Compare)'", "label: 'Revenue ' + yearA + (Number(yearA) === dashboardCalendar().year ? ' (Actual + Estimate)' : '') + ' (Compare)'")
    .replace("label: 'Revenue ' + yearB + ' (Base)'", "label: 'Revenue ' + yearB + (Number(yearB) === dashboardCalendar().year ? ' (Actual + Estimate)' : '') + ' (Base)'")
  const withMonthlyProfit = withCurrentYearRows.replace(SINGLE_YEAR_DATASET_SOURCE, SINGLE_YEAR_MONTHLY_DATASETS)
  if (withMonthlyProfit === script) {
    throw new Error('Unable to patch the single-year monthly Overview dataset.')
  }

  const patched = withMonthlyProfit.replace(ANNUAL_OVERVIEW_CHART_SOURCE, RESPONSIVE_OVERVIEW_CHART)
  if (patched === withMonthlyProfit) {
    throw new Error('Unable to patch the Overview chart granularity.')
  }
  return patched
}
