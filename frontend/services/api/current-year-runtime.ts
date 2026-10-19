export const CURRENT_YEAR_SCRIPT = String.raw`
function dashboardCalendar() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month) };
}

function dashboardRawMonthlyRows(sector) {
  if (typeof overviewScopedMonths === 'function' && dashboardPageIsActive('overview') && overviewSectorData) {
    return overviewScopedMonths(sector).filter(row => ['revenue','income','margin_revenue_basis']
      .some(metric => row[metric] != null && Number.isFinite(Number(row[metric]))));
  }
  const totals = new Map();
  const source = DATA.monthly || [];
  source.forEach(row => {
    const period = String(row.period || '');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return;
    if (row.revenue == null || row.missing || !Number.isFinite(Number(row.revenue))) return;
    const current = totals.get(period) || { period, revenue: 0, income: 0, margin_revenue_basis: 0, evidence: 'actual' };
    current.revenue += Number(row.revenue);
    current.income = current.income == null || row.income == null || !Number.isFinite(Number(row.income))
      ? null : current.income + Number(row.income);
    current.margin_revenue_basis = current.margin_revenue_basis == null || row.margin_revenue_basis == null
      ? null : current.margin_revenue_basis + Number(row.margin_revenue_basis);
    totals.set(period, current);
  });
  return [...totals.values()].sort((left, right) => left.period.localeCompare(right.period));
}

function dashboardMonthlyRows(sector) {
  // Descriptive periods require source observations, including in a new year.
  // Forecasts belong to the separate model/research contract, never this series.
  return dashboardRawMonthlyRows(sector);
}

function dashboardAnnualRows() {
  const calendar = dashboardCalendar();
  const rows = (DATA.year_summary || [])
    .filter(row => Number(row.year) >= 2017 && Number(row.year) <= calendar.year && Number(row.year) !== calendar.year)
    .map(row => ({ ...row, evidence: 'actual' }));
  const currentMonths = dashboardMonthlyRows().filter(row => row.period.startsWith(String(calendar.year) + '-'));
  if (currentMonths.length) {
    rows.push({
      year: String(calendar.year),
      label: String(calendar.year) + ' YTD',
      revenue: currentMonths.reduce((sum, row) => sum + Number(row.revenue), 0),
      income: currentMonths.every(row => row.income != null)
        ? currentMonths.reduce((sum, row) => sum + Number(row.income), 0) : null,
      transactions: null,
      evidence: 'actual_ytd'
    });
  }
  return rows.sort((left, right) => Number(left.year) - Number(right.year));
}

function diagnosticMarginRows() {
  const totals = new Map();
  getDescriptiveMonthlyRows().forEach(row => {
    const period = descriptiveUsesYearlyGrain() ? String(row.period).slice(0,4) : row.period;
    const total = totals.get(period) || {revenue:0,income:0,complete:true};
    if (row.margin_revenue_basis == null || row.income == null) total.complete = false;
    else {total.revenue += Number(row.margin_revenue_basis); total.income += Number(row.income);}
    totals.set(period,total);
  });
  const result = descriptiveAxisPeriods().map(period => {
    const row = totals.get(period);
    return {year:descriptivePointLabel(period),revenue:row?.complete?row.revenue:null,income:row?.complete?row.income:null};
  });
  const available = result.map(row => ({ ...row, rate: grossMarginPercent(row.income, row.revenue) })).filter(row => row.rate != null);
  const caption = document.getElementById('marginChart')?.closest('.chart-card')?.querySelector('.chart-subtitle');
  if (caption) caption.textContent = 'Gross profit ÷ revenue from the same margin-eligible records, before operating expenses. '
    + (available.length ? available.length + '/' + result.length + ' periods have an interpretable margin. Latest: ' + available[available.length - 1].year + ', ' + available[available.length - 1].rate.toFixed(1) + '%.' : 'No interpretable margin in this selection.')
    + ' Missing or nonpositive denominators are unavailable.';
  return result;
}
`
