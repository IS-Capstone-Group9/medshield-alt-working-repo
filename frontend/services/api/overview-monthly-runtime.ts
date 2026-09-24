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

  createChart('overviewBaselineChart', {
    type: 'line',
    data: {
      labels: monthlyDataForMode.labels,
      datasets: monthlyDataForMode.datasets
    },
    options: { ...opts, plugins: { ...opts.plugins, legend: { position: 'bottom' } } }
  });

  if (overviewCanvas) {
    overviewCanvas.setAttribute('aria-label', descriptiveUsesDailyGrain()
      ? 'Line chart showing daily net sales revenue for ' + descriptivePeriodLabel() + ' when transaction dates are available.'
      : 'Line chart showing ' + (descriptiveUsesYearlyGrain() ? 'yearly' : 'monthly') + ' net sales revenue and gross profit for ' + descriptivePeriodLabel() + '.');
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
