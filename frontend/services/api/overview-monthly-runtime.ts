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

const RESPONSIVE_OVERVIEW_CHART = `  const overviewUsesAnnualSummary = comparisonMode === 'single' && selectedYear === 'all';
  const overviewCanvas = document.getElementById('overviewBaselineChart');
  const overviewCard = overviewCanvas ? overviewCanvas.closest('.chart-card') : null;
  const overviewTitle = overviewCard ? overviewCard.querySelector('.chart-title') : null;
  const overviewSubtitle = overviewCard ? overviewCard.querySelector('.chart-subtitle') : null;
  const overviewBadge = overviewCard ? overviewCard.querySelector('.chart-badge') : null;
  const overviewTitleNode = overviewTitle ? Array.from(overviewTitle.childNodes).find((node) => node.nodeType === 3) : null;

  if (overviewUsesAnnualSummary) {
    if (overviewTitleNode) overviewTitleNode.textContent = 'Annual Net Sales Revenue & Gross Profit ';
    if (overviewSubtitle) overviewSubtitle.textContent = '2017–' + dashboardCalendar().year + ' annual totals; current-year estimate stops at the current month and yields to uploaded actuals';
    if (overviewBadge) overviewBadge.textContent = 'Annual Summary';
  } else if (comparisonMode === 'yoy') {
    if (overviewTitleNode) overviewTitleNode.textContent = 'Monthly Net Sales Revenue — Y/Y Comparison ';
    if (overviewSubtitle) overviewSubtitle.textContent = 'January–December alignment for ' + yoyTargetYear + ' and ' + yoyBaseYear;
    if (overviewBadge) overviewBadge.textContent = 'Monthly Comparison';
  } else {
    if (overviewTitleNode) overviewTitleNode.textContent = 'Monthly Net Sales Revenue & Gross Profit ';
    if (overviewSubtitle) overviewSubtitle.textContent = 'January–December performance for ' + selectedYear;
    if (overviewBadge) overviewBadge.textContent = 'Monthly Detail';
  }

  createChart('overviewBaselineChart', overviewUsesAnnualSummary ? {
    type: 'bar',
    data: {
      labels: yearRowsForMode.map((row) => row.label || row.year),
      datasets: [
        { label: 'Net Sales Revenue', data: yearRowsForMode.map((row) => row.revenue), backgroundColor: getColor(0.88), borderRadius: 6 },
        { label: 'Gross Profit', data: yearRowsForMode.map((row) => row.income), backgroundColor: getAmber(0.8), borderRadius: 6 }
      ]
    },
    options: opts
  } : {
    type: 'line',
    data: {
      labels: monthlyDataForMode.labels,
      datasets: monthlyDataForMode.datasets
    },
    options: { ...opts, plugins: { ...opts.plugins, legend: { position: 'bottom' } } }
  });

  if (overviewCanvas) {
    overviewCanvas.setAttribute('aria-label', overviewUsesAnnualSummary
      ? 'Bar chart showing annual net sales revenue and gross profit across all available years.'
      : comparisonMode === 'yoy'
        ? 'Line chart comparing monthly net sales revenue for ' + yoyTargetYear + ' and ' + yoyBaseYear + '.'
        : 'Line chart showing monthly net sales revenue and gross profit for ' + selectedYear + '.');
  }`

export function patchOverviewMonthlyChart(script: string): string {
  const withCurrentYearRows = script
    .replace(
      'return diagnosticYears().map(year => DATA.year_summary.find(row => String(row.year) === String(year))',
      'return diagnosticYears().map(year => dashboardAnnualRows().find(row => String(row.year) === String(year))',
    )
    .replace('const rows = DATA.monthly.map((row) => ({ ...row }));', 'const rows = dashboardMonthlyRows();')
    .replace('const marginRows = yearRowsForMode;', 'const marginRows = diagnosticMarginRows();')
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
