const LEGACY_FILTER_STATE = `let comparisonMode = 'single';
let selectedYear = 'all';`

const DESCRIPTIVE_FILTER_STATE = `let comparisonMode = 'single';
let descriptivePeriod = '12';
let selectedYear = String(new Date().getFullYear());`

const LEGACY_YEAR_ROWS = `function getYearRowsForMode() {
  return diagnosticYears().map(year => dashboardAnnualRows().find(row => String(row.year) === String(year))
    || { year: String(year), revenue: null, income: null, transactions: 0, missing: true });
}`

const DESCRIPTIVE_YEAR_ROWS = `function getYearRowsForMode() {
  const totals = new Map();
  getDescriptiveMonthlyRows().forEach(row => {
    const year = String(row.period).slice(0, 4);
    const total = totals.get(year) || { year, revenue: 0, income: 0, transactions: null };
    total.revenue += Number(row.revenue) || 0;
    if (row.income != null && Number.isFinite(Number(row.income))) total.income += Number(row.income);
    totals.set(year, total);
  });
  return [...totals.values()].sort((left, right) => Number(left.year) - Number(right.year));
}`

const DESCRIPTIVE_MONTH_ROWS = `function getMonthlyRowsForMode() {
  const rows = getDescriptiveDisplayRows();
  const scope = descriptivePeriodLabel();
  return {
    labels: rows.map(row => descriptivePointLabel(row.period)),
    datasets: [
      {
        label: 'Net Sales Revenue · ' + scope,
        data: rows.map(row => row.revenue),
        borderColor: getColor(),
        backgroundColor: getColor(0.12),
        fill: true,
        tension: 0.3,
        borderWidth: 2.5,
        pointRadius: descriptivePeriod === '30d' ? 1.5 : 3,
        spanGaps: false
      },
      {
        label: 'Gross Profit · ' + scope,
        data: rows.map(row => row.income == null ? null : row.income),
        borderColor: getAmber(),
        backgroundColor: getAmber(0.08),
        fill: false,
        tension: 0.3,
        borderWidth: 2.2,
        pointRadius: descriptivePeriod === '30d' ? 1.5 : 3,
        spanGaps: false
      }
    ].filter((_, index) => descriptivePeriod !== '30d' || index === 0)
  };
}`

const LEGACY_SELECTED_METRICS = `  const selectedRevenue = yearRowsForMode.reduce((sum, row) => sum + Number(row.revenue), 0);
  const selectedProfit = yearRowsForMode.reduce((sum, row) => sum + Number(row.income), 0);
  const selectedMargin = grossMarginPercent(selectedProfit, selectedRevenue);
  const hasAnnualValues = yearRowsForMode.some(row => !row.missing);`

const DESCRIPTIVE_SELECTED_METRICS = `  const descriptiveRows = getDescriptiveMonthlyRows();
  const selectedRevenue = descriptiveRows.reduce((sum, row) => sum + Number(row.revenue), 0);
  const incomeRows = descriptiveRows.filter(row => row.income != null && Number.isFinite(Number(row.income)));
  const selectedProfit = incomeRows.reduce((sum, row) => sum + Number(row.income), 0);
  const hasAnnualValues = descriptiveRows.length > 0;
  const hasProfitValues = incomeRows.length === descriptiveRows.length && descriptiveRows.length > 0;
  const selectedMargin = hasProfitValues ? grossMarginPercent(selectedProfit, selectedRevenue) : null;`

export const DESCRIPTIVE_PERIOD_SCRIPT = String.raw`
function descriptivePhtDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return String(values.year) + '-' + String(values.month) + '-' + String(values.day);
}

function shiftIsoPeriod(period, months) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(period));
  if (!match) return '';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1 + months, 1));
  return date.getUTCFullYear() + '-' + String(date.getUTCMonth() + 1).padStart(2, '0');
}

function shiftIsoDate(dateValue, days) {
  const date = new Date(String(dateValue) + 'T00:00:00Z');
  if (Number.isNaN(date.getTime())) return '';
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function descriptivePeriodIncludes(value) {
  const text = String(value || '');
  if (descriptivePeriod === 'custom') return text.slice(0, 4) === String(selectedYear);
  if (descriptivePeriod === '30d') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    const end = descriptivePhtDate(), start = shiftIsoDate(end, -29);
    return text >= start && text <= end;
  }
  const months = Number(descriptivePeriod);
  const calendar = dashboardCalendar();
  const end = String(calendar.year) + '-' + String(calendar.month).padStart(2, '0');
  const start = shiftIsoPeriod(end, -(months - 1));
  const month = text.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(month) && month >= start && month <= end;
}

function descriptiveDailySalesRows() {
  if (typeof salesSectorsData === 'undefined' || !salesSectorsData || !Array.isArray(salesSectorsData.rows)) return [];
  const totals = new Map();
  salesSectorsData.rows.forEach(row => {
    const date = String(row.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const total = totals.get(date) || { period: date, revenue: 0, income: null, evidence: 'actual' };
    total.revenue += Number(row.revenue) || 0;
    totals.set(date, total);
  });
  return [...totals.values()].sort((left, right) => left.period.localeCompare(right.period));
}

function getDescriptiveSourceRows() {
  return descriptivePeriod === '30d' ? descriptiveDailySalesRows() : dashboardMonthlyRows();
}

function getDescriptiveMonthlyRows() {
  return getDescriptiveSourceRows().filter(row => descriptivePeriodIncludes(row.period));
}

function descriptiveAxisPeriods() {
  if (descriptivePeriod === '30d') {
    const end = descriptivePhtDate();
    return Array.from({ length: 30 }, (_, index) => shiftIsoDate(end, index - 29));
  }
  if (descriptivePeriod === 'custom') {
    return Array.from({ length: 12 }, (_, index) => String(selectedYear) + '-' + String(index + 1).padStart(2, '0'));
  }
  const calendar = dashboardCalendar(), months = Number(descriptivePeriod);
  const end = String(calendar.year) + '-' + String(calendar.month).padStart(2, '0');
  const start = shiftIsoPeriod(end, -(months - 1));
  return Array.from({ length: months }, (_, index) => shiftIsoPeriod(start, index));
}

function getDescriptiveDisplayRows() {
  const source = new Map(getDescriptiveSourceRows().map(row => [String(row.period), row]));
  return descriptiveAxisPeriods().map(period => source.get(period) || {
    period, revenue: null, income: null, evidence: 'unavailable', missing: true
  });
}

function descriptivePeriodLabel() {
  if (descriptivePeriod === '30d') return 'Last 30 Days';
  if (descriptivePeriod === 'custom') return String(selectedYear);
  return 'Last ' + descriptivePeriod + ' Months';
}

function descriptivePointLabel(period) {
  const text = String(period);
  const date = new Date(text.length === 7 ? text + '-01T00:00:00Z' : text + 'T00:00:00Z');
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat('en-PH', descriptivePeriod === '30d'
    ? { month: 'short', day: 'numeric', timeZone: 'UTC' }
    : descriptivePeriod === 'custom'
      ? { month: 'short', timeZone: 'UTC' }
      : { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(date);
}

function setDescriptivePeriod(value) {
  descriptivePeriod = ['30d', '3', '6', '12', 'custom'].includes(String(value)) ? String(value) : '12';
  comparisonMode = 'single';
  const periodSelect = document.getElementById('descriptivePeriodSelect');
  if (periodSelect && periodSelect.value !== descriptivePeriod) periodSelect.value = descriptivePeriod;
  const yearWrap = document.getElementById('singleYearWrap');
  if (yearWrap) yearWrap.style.display = descriptivePeriod === 'custom' ? 'flex' : 'none';
  const yearSelect = document.getElementById('topbarYearSelect');
  if (descriptivePeriod === 'custom' && yearSelect && /^\d{4}$/.test(yearSelect.value)) selectedYear = yearSelect.value;
  refreshComparison();
  if (typeof renderProductPrioritizationTimeline === 'function') renderProductPrioritizationTimeline();
  if (typeof renderSalesSectors === 'function') renderSalesSectors();
  if (typeof renderSalesHeatmap === 'function') renderSalesHeatmap();
}
document.addEventListener('change', function(event) {
  if (event.target && event.target.id === 'descriptivePeriodSelect') setDescriptivePeriod(event.target.value);
});
`

export function patchDescriptivePeriodFilters(script: string): string {
  let patched = script.replace(LEGACY_FILTER_STATE, DESCRIPTIVE_FILTER_STATE)
  if (patched === script) throw new Error('Unable to initialize descriptive period state.')

  patched = patched.replace(LEGACY_YEAR_ROWS, DESCRIPTIVE_YEAR_ROWS)
  if (!patched.includes(DESCRIPTIVE_YEAR_ROWS)) throw new Error('Unable to patch descriptive KPI rows.')

  const monthlyPattern = /function getMonthlyRowsForMode\(\) \{[\s\S]*?\n\}\n\n\nfunction baseChartOptions\(\)/
  patched = patched.replace(monthlyPattern, `${DESCRIPTIVE_MONTH_ROWS}\n\n\nfunction baseChartOptions()`)
  if (!patched.includes(DESCRIPTIVE_MONTH_ROWS)) throw new Error('Unable to patch descriptive chart rows.')

  patched = patched.replace(LEGACY_SELECTED_METRICS, DESCRIPTIVE_SELECTED_METRICS)
    .replace("salesGrossProfit: hasAnnualValues ? formatCurrency(selectedProfit) : 'Unavailable'", "salesGrossProfit: hasProfitValues ? formatCurrency(selectedProfit) : 'Unavailable'")
    .replace(
      "  const periodNote = document.querySelector('[data-sales-metric-period]');",
      `  const overviewRevenue = document.getElementById('kpiOverviewTotalRevenue');
  if (overviewRevenue) overviewRevenue.textContent = hasAnnualValues ? formatCurrency(selectedRevenue) : 'Unavailable';
  const overviewRevenueCard = overviewRevenue ? overviewRevenue.closest('.kpi-card') : null;
  const overviewRevenueLabel = overviewRevenueCard ? overviewRevenueCard.querySelector('.kpi-label') : null;
  if (overviewRevenueLabel) overviewRevenueLabel.textContent = 'Net Sales Revenue · ' + descriptivePeriodLabel();
  const overviewGrowthTag = document.getElementById('kpiOverviewGrowthTag');
  if (overviewGrowthTag) overviewGrowthTag.textContent = descriptivePeriod === '30d' && !hasAnnualValues
    ? 'Daily transaction data unavailable'
    : 'Period-filtered historical view';
  const periodNote = document.querySelector('[data-sales-metric-period]');`,
    )
    .replace("if (periodNote) periodNote.textContent = 'Selected years: ' + yearRowsForMode.map(row => row.year).join(', ') + (yearRowsForMode.some(row => row.missing) ? ' · Missing annual values excluded from totals' : '');", "if (periodNote) periodNote.textContent = 'Selected period: ' + descriptivePeriodLabel() + (descriptiveRows.length ? '' : ' · No observations available');")
  if (!patched.includes(DESCRIPTIVE_SELECTED_METRICS)) throw new Error('Unable to patch descriptive KPI metrics.')
  return patched
}
