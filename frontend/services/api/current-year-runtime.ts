export const CURRENT_YEAR_SCRIPT = String.raw`
function dashboardCalendar() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month) };
}

function dashboardRawMonthlyRows() {
  const totals = new Map();
  (DATA.monthly || []).forEach(row => {
    const period = String(row.period || '');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return;
    if (!Number.isFinite(Number(row.revenue)) || !Number.isFinite(Number(row.income))) return;
    const current = totals.get(period) || { period, revenue: 0, income: 0, evidence: 'actual' };
    current.revenue += Number(row.revenue);
    current.income += Number(row.income);
    totals.set(period, current);
  });
  return [...totals.values()].sort((left, right) => left.period.localeCompare(right.period));
}

function dashboardMonthlyRows() {
  const actualRows = dashboardRawMonthlyRows();
  const byPeriod = new Map(actualRows.map(row => [row.period, row]));
  const calendar = dashboardCalendar();
  const priorYears = [...new Set(actualRows.map(row => Number(row.period.slice(0, 4))))]
    .filter(year => year < calendar.year).sort((left, right) => right - left);

  for (let month = 1; month <= calendar.month; month++) {
    const suffix = '-' + String(month).padStart(2, '0');
    const period = String(calendar.year) + suffix;
    if (byPeriod.has(period)) continue;
    const sourceYear = priorYears.find(year => byPeriod.has(String(year) + suffix));
    if (!sourceYear) continue;
    const source = byPeriod.get(String(sourceYear) + suffix);
    byPeriod.set(period, {
      period,
      revenue: source.revenue,
      income: source.income,
      evidence: 'estimate',
      estimate_method: 'seasonal_naive_prior_year',
      source_period: String(sourceYear) + suffix
    });
  }

  return [...byPeriod.values()].sort((left, right) => left.period.localeCompare(right.period));
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
      label: String(calendar.year) + ' est. through ' + new Intl.DateTimeFormat('en-PH', { month: 'short' }).format(new Date(2000, calendar.month - 1, 1)),
      revenue: currentMonths.reduce((sum, row) => sum + Number(row.revenue), 0),
      income: currentMonths.reduce((sum, row) => sum + Number(row.income), 0),
      transactions: null,
      evidence: currentMonths.some(row => row.evidence === 'estimate') ? 'estimate' : 'actual_ytd'
    });
  }
  return rows.sort((left, right) => Number(left.year) - Number(right.year));
}

function diagnosticMarginRows() {
  return getDescriptiveMonthlyRows()
    .map(row => ({ year: descriptivePointLabel(row.period), revenue: row.revenue, income: row.income }));
}
`
