const LEGACY_FILTER_STATE = `let comparisonMode = 'single';
let selectedYear = 'all';`

const DESCRIPTIVE_FILTER_STATE = `let comparisonMode = 'single';
let descriptivePeriod = '12';
let descriptiveGranularity = 'auto';
let selectedYear = descriptivePhtDate().slice(0, 4);
let customDateStart = descriptivePhtDate().slice(0, 4) + '-01-01';
let customDateEnd = descriptivePhtDate();`

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
  const priorRows = getDescriptivePriorDisplayRows();
  const scope = descriptivePeriodLabel();
  const yoy = comparisonMode === 'yoy';
  const currentRevenue = {
    label: 'Net Sales Revenue · ' + scope,
    data: rows.map(row => row.revenue),
    borderColor: getColor(),
    backgroundColor: getColor(0.12),
    fill: true,
    tension: 0.3,
    borderWidth: 2.5,
    pointRadius: descriptiveUsesDailyGrain() ? 1.5 : 3,
    spanGaps: false
  };
  const currentProfit = {
    label: 'Gross Profit · ' + scope,
    data: rows.map(row => row.income == null ? null : row.income),
    borderColor: getAmber(),
    backgroundColor: getAmber(0.08),
    fill: false,
    tension: 0.3,
    borderWidth: 2.2,
    pointRadius: descriptiveUsesDailyGrain() ? 1.5 : 3,
    spanGaps: false
  };
  const priorRevenue = {
    label: 'Prior-year Net Sales Revenue',
    data: priorRows.map(row => row.revenue),
    borderColor: getColor(0.55),
    backgroundColor: 'transparent',
    borderDash: [7, 5],
    fill: false,
    tension: 0.3,
    borderWidth: 2,
    pointRadius: descriptiveUsesDailyGrain() ? 1 : 2,
    spanGaps: false
  };
  const priorProfit = {
    label: 'Prior-year Gross Profit',
    data: priorRows.map(row => row.income == null ? null : row.income),
    borderColor: getAmber(0.55),
    backgroundColor: 'transparent',
    borderDash: [7, 5],
    fill: false,
    tension: 0.3,
    borderWidth: 2,
    pointRadius: descriptiveUsesDailyGrain() ? 1 : 2,
    spanGaps: false
  };
  return {
    labels: rows.map(row => descriptivePointLabel(row.period)),
    datasets: (yoy
      ? [currentRevenue, priorRevenue, currentProfit, priorProfit]
      : [currentRevenue, currentProfit]
    ).filter(dataset => !descriptiveUsesDailyGrain() || !dataset.label.includes('Gross Profit'))
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
  const hasMarginBasis = descriptiveRows.length > 0 && descriptiveRows.every(row => row.margin_revenue_basis != null && Number.isFinite(Number(row.margin_revenue_basis)));
  const selectedMargin = hasProfitValues && hasMarginBasis ? grossMarginPercent(selectedProfit, descriptiveRows.reduce((sum, row) => sum + Number(row.margin_revenue_basis), 0)) : null;`

const LEGACY_SET_YEAR = `function setYear(year, targetEl) {
  var yearVal = typeof year === 'string' ? year : (targetEl && targetEl.value ? targetEl.value : 'all');
  selectedYear = yearVal;
  
  var selectEl = document.getElementById('topbarYearSelect');
  if (selectEl && selectEl.value !== yearVal) {
    selectEl.value = yearVal;
  }
  
  refreshComparison();
}`

const LEGACY_REFRESH_COMPARISON = `function refreshComparison() {
  buildCharts();
  buildTables();
}`

const RESPONSIVE_REFRESH_COMPARISON = `function refreshComparison() {
  buildCharts();
  const activePage = document.querySelector('.page.active');
  if (activePage && activePage.id === 'page-products') buildTables();
}`

const DESCRIPTIVE_SET_YEAR = `function setYear(year, targetEl) {
  var yearVal = typeof year === 'string' ? year : (targetEl && targetEl.value ? targetEl.value : String(new Date().getFullYear()));
  selectedYear = yearVal;
  var selectEl = document.getElementById('topbarYearSelect');
  if (selectEl && selectEl.value !== yearVal) selectEl.value = yearVal;
  if (descriptivePeriod === 'custom' && /^\\d{4}$/.test(yearVal)) {
    var requestedEnd = yearVal + '-12-31';
    setCustomDateRange(yearVal + '-01-01', requestedEnd > descriptivePhtDate() ? descriptivePhtDate() : requestedEnd);
    return;
  }
  refreshComparison();
}`

export const DESCRIPTIVE_PERIOD_SCRIPT = String.raw`
let descriptivePhtDateValue = '';
let descriptivePhtDateCheckedAt = 0;
const descriptivePointFormatters = {
  daily: new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
  monthly: new Intl.DateTimeFormat('en-PH', { month: 'short', year: '2-digit', timeZone: 'UTC' })
};

function descriptivePageIsActive(name) {
  const page = document.getElementById('page-' + name);
  return Boolean(page && page.classList.contains('active'));
}

function descriptivePhtDate() {
  const now = Date.now();
  if (descriptivePhtDateValue && now - descriptivePhtDateCheckedAt < 60000) return descriptivePhtDateValue;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  descriptivePhtDateValue = String(values.year) + '-' + String(values.month) + '-' + String(values.day);
  descriptivePhtDateCheckedAt = now;
  return descriptivePhtDateValue;
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

function shiftIsoYear(dateValue, years) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue));
  if (!match) return '';
  const targetYear = Number(match[1]) + years;
  const month = Number(match[2]);
  const day = Number(match[3]);
  const lastDay = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
  return String(targetYear) + '-' + String(month).padStart(2, '0') + '-' + String(Math.min(day, lastDay)).padStart(2, '0');
}

function descriptiveLatestObservedDate() {
  return descriptivePhtDate();
}

function descriptiveLatestObservedMonth() {
  return descriptivePhtDate().slice(0, 7);
}

function descriptiveCustomDayCount() {
  const start = new Date(String(customDateStart) + 'T00:00:00Z');
  const end = new Date(String(customDateEnd) + 'T00:00:00Z');
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

function descriptiveUsesDailyGrain() {
  return descriptiveGranularity === 'auto' && descriptivePeriod === 'custom' && descriptiveCustomDayCount() <= 31;
}

function descriptiveUsesYearlyGrain() {
  return descriptiveGranularity === 'yearly' || (descriptiveGranularity === 'auto' && descriptivePeriod === 'all');
}

function descriptivePeriodIncludes(value) {
  const text = String(value || '');
  if (descriptivePeriod === 'all') {
    const year = Number(text.slice(0, 4));
    return /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(text)
      && year >= 2017 && year <= Number(descriptivePhtDate().slice(0, 4));
  }
  if (descriptivePeriod === 'custom') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text >= customDateStart && text <= customDateEnd;
    const month = text.slice(0, 7);
    return /^\d{4}-\d{2}$/.test(month) && month >= customDateStart.slice(0, 7) && month <= customDateEnd.slice(0, 7);
  }
  const months = Number(descriptivePeriod);
  const end = descriptiveLatestObservedMonth();
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
    const total = totals.get(date) || { period: date, revenue: null, income: null, margin_revenue_basis: null, evidence: 'actual' };
    for (const metric of ['revenue', 'income', 'margin_revenue_basis']) {
      if (row[metric] != null && Number.isFinite(Number(row[metric]))) total[metric] = (total[metric] || 0) + Number(row[metric]);
    }
    totals.set(date, total);
  });
  return [...totals.values()].sort((left, right) => left.period.localeCompare(right.period));
}

function descriptiveCustomMonthlyRows(startDate, endDate) {
  const fullMonths = () => dashboardMonthlyRows().filter(row => {
    const period = String(row.period);
    const monthEnd = new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0)).toISOString().slice(0, 10);
    // A current month snapshot is YTD as of today; historical boundary months need exact dates.
    const currentYtd = period === descriptivePhtDate().slice(0, 7) && endDate === descriptivePhtDate();
    return period + '-01' >= startDate && (monthEnd <= endDate || currentYtd);
  });
  if (typeof salesSectorsData === 'undefined' || !salesSectorsData || !Array.isArray(salesSectorsData.rows)) {
    return fullMonths();
  }
  const totals = new Map();
  salesSectorsData.rows.forEach(row => {
    const date = String(row.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < startDate || date > endDate) return;
    const period = date.slice(0, 7);
    const total = totals.get(period) || { period, revenue: null, income: null, margin_revenue_basis: null, evidence: 'actual' };
    for (const metric of ['revenue', 'income', 'margin_revenue_basis']) {
      if (row[metric] != null && Number.isFinite(Number(row[metric]))) total[metric] = (total[metric] || 0) + Number(row[metric]);
    }
    totals.set(period, total);
  });
  if (!salesSectorsData.rows.some(row => /^\d{4}-\d{2}-\d{2}$/.test(String(row.date || "")))) return fullMonths();
  return [...totals.values()].sort((left, right) => left.period.localeCompare(right.period));
}

function descriptivePreviousPeriod(period) {
  const text = String(period || '');
  if (/^\d{4}$/.test(text)) return String(Number(text) - 1);
  return /^(\d{4})-(\d{2})(-\d{2})?$/.test(text)
    ? String(Number(text.slice(0, 4)) - 1) + text.slice(4)
    : '';
}

function descriptiveIsFuturePeriod(period) {
  const text = String(period || '');
  const today = descriptivePhtDate();
  if (/^\d{4}$/.test(text)) return text > today.slice(0, 4);
  return text.length === 7 ? text > today.slice(0, 7) : text > today;
}

function descriptiveDayDistance(left, right) {
  const leftDate = new Date(String(left) + 'T00:00:00Z');
  const rightDate = new Date(String(right) + 'T00:00:00Z');
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) return Infinity;
  return Math.abs(leftDate.getTime() - rightDate.getTime()) / 86400000;
}

function descriptiveWeightedEstimate(period, sourceRows) {
  const text = String(period || '');
  if (!/^(\d{4})-(\d{2})(-\d{2})?$/.test(text)) return null;
  if (descriptiveIsFuturePeriod(text)) return null;
  if (descriptivePeriod === 'custom' && text.length === 7) {
    const monthEnd = new Date(Date.UTC(Number(text.slice(0, 4)), Number(text.slice(5, 7)), 0)).toISOString().slice(0, 10);
    if (text + '-01' < customDateStart || monthEnd > customDateEnd) return null;
  }
  const byPeriod = new Map(sourceRows.map(row => [String(row.period), row]));
  let candidates = [1, 2, 3].map((yearsBack, index) => ({
    row: byPeriod.get(String(Number(text.slice(0, 4)) - yearsBack) + text.slice(4)),
    weight: [0.6, 0.3, 0.1][index]
  })).filter(candidate => candidate.row && candidate.row.revenue != null && candidate.row.evidence !== 'estimate' && Number.isFinite(Number(candidate.row.revenue)));
  if (!candidates.length && text.length === 10) {
    candidates = [1, 2, 3].flatMap((yearsBack, index) => {
      const target = String(Number(text.slice(0, 4)) - yearsBack) + text.slice(4);
      const nearest = sourceRows
        .map(row => ({ row, distance: descriptiveDayDistance(row.period, target) }))
        .filter(candidate => candidate.distance <= 7 && Number.isFinite(Number(candidate.row.revenue)))
        .sort((left, right) => left.distance - right.distance)[0];
      return nearest ? [{ row: nearest.row, weight: [0.6, 0.3, 0.1][index] / (1 + nearest.distance) }] : [];
    });
  }
  if (!candidates.length) return null;
  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  const incomeCandidates = candidates.filter(candidate => candidate.row.income != null && Number.isFinite(Number(candidate.row.income)));
  const incomeWeight = incomeCandidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  return {
    period: text,
    revenue: candidates.reduce((sum, candidate) => sum + Number(candidate.row.revenue) * candidate.weight, 0) / totalWeight,
    income: incomeWeight
      ? incomeCandidates.reduce((sum, candidate) => sum + Number(candidate.row.income) * candidate.weight, 0) / incomeWeight
      : null,
    evidence: 'estimate',
    estimate_method: 'recency_weighted_same_calendar_period',
    source_periods: candidates.map(candidate => String(candidate.row.period)),
    missing: false
  };
}

function getDescriptiveSourceRows() {
  if (descriptiveUsesDailyGrain()) return descriptiveDailySalesRows();
  if (descriptivePeriod === 'custom') return descriptiveCustomMonthlyRows(customDateStart, customDateEnd);
  return dashboardMonthlyRows();
}

function getDescriptiveDetailedRows() {
  if (typeof salesSectorsData === 'undefined' || !salesSectorsData || !Array.isArray(salesSectorsData.rows)) return [];
  return salesSectorsData.rows.filter(row => {
    const date = String(row.date || '');
    if (descriptiveUsesDailyGrain() && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    if (descriptivePeriod === 'custom' && !date) {
      const period = String(row.period || '');
      if (!/^\d{4}-\d{2}$/.test(period)) return false;
      const end = new Date(Date.UTC(Number(period.slice(0,4)), Number(period.slice(5,7)), 0)).toISOString().slice(0,10);
      if (period + '-01' < customDateStart || end > customDateEnd) return false;
    }
    return descriptivePeriodIncludes(date || row.period) && !descriptiveIsFuturePeriod(date || row.period);
  }).map(row => ({ ...row, evidence: row.evidence || 'actual' }));
}

function getDescriptiveAreaRows() {
  const totals = new Map();
  getDescriptiveDetailedRows().filter(row => row.evidence !== 'estimate').forEach(row => {
    const area = String(row.area || row.territory || 'Unknown');
    const total = totals.get(area) || { area, revenue: null, income: null, margin_revenue_basis: null, estimated: false };
    for (const metric of ['revenue', 'income', 'margin_revenue_basis']) {
      if (row[metric] != null && Number.isFinite(Number(row[metric]))) total[metric] = (total[metric] || 0) + Number(row[metric]);
    }
    totals.set(area, total);
  });
  return [...totals.values()].sort((left, right) => (right.revenue || 0) - (left.revenue || 0));
}

function getDescriptiveMonthlyRows() {
  return getDescriptiveSourceRows().filter(row => descriptivePeriodIncludes(row.period) && row.revenue != null && row.evidence !== 'estimate' && !row.missing);
}

function descriptiveAxisPeriods() {
  if (descriptiveUsesYearlyGrain()) {
    if (descriptivePeriod === 'custom') {
      const firstYear = Number(customDateStart.slice(0, 4));
      const lastYear = Number(customDateEnd.slice(0, 4));
      return Array.from({ length: lastYear - firstYear + 1 }, (_, index) => String(firstYear + index));
    }
    if (descriptivePeriod !== 'all') {
      const months = Number(descriptivePeriod);
      const end = descriptiveLatestObservedMonth();
      const start = shiftIsoPeriod(end, -(months - 1));
      const firstYear = Number(start.slice(0, 4));
      const lastYear = Number(end.slice(0, 4));
      return Array.from({ length: lastYear - firstYear + 1 }, (_, index) => String(firstYear + index));
    }
    const years = new Set();
    dashboardRawMonthlyRows().forEach(row => {
      const year = String(row.period || '').slice(0, 4);
      if (/^\d{4}$/.test(year) && !descriptiveIsFuturePeriod(year)) years.add(Number(year));
    });
    if (!years.size) {
      for (let y = 2017; y <= Number(descriptivePhtDate().slice(0, 4)); y++) years.add(y);
    }
    const observed = [...years].filter(Number.isInteger).sort((left, right) => left - right);
    if (!observed.length) return [];
    return Array.from({ length: observed[observed.length - 1] - observed[0] + 1 }, (_, index) => String(observed[0] + index));
  }
  if (descriptivePeriod === 'custom') {
    if (descriptiveUsesDailyGrain()) {
      return Array.from({ length: descriptiveCustomDayCount() }, (_, index) => shiftIsoDate(customDateStart, index));
    }
    const start = customDateStart.slice(0, 7), end = customDateEnd.slice(0, 7), periods = [];
    for (let period = start; period && period <= end; period = shiftIsoPeriod(period, 1)) periods.push(period);
    return periods;
  }
  if (descriptivePeriod === 'all') {
    const observed = dashboardRawMonthlyRows()
      .map(row => String(row.period || ''))
      .filter(period => /^\d{4}-\d{2}$/.test(period) && !descriptiveIsFuturePeriod(period))
      .sort();
    const start = observed[0] || '2017-01';
    const end = observed[observed.length - 1] || descriptiveLatestObservedMonth();
    const periods = [];
    for (let period = start; period && period <= end; period = shiftIsoPeriod(period, 1)) periods.push(period);
    return periods;
  }
  const months = Number(descriptivePeriod);
  const end = descriptiveLatestObservedMonth();
  const start = shiftIsoPeriod(end, -(months - 1));
  return Array.from({ length: months }, (_, index) => shiftIsoPeriod(start, index));
}

function getDescriptiveDisplayRows() {
  const sourceRows = getDescriptiveSourceRows();
  if (descriptiveUsesYearlyGrain()) {
    const totals = new Map();
    sourceRows.forEach(row => {
      const period = String(row.period || '');
      if (!/^\d{4}-\d{2}$/.test(period) || descriptiveIsFuturePeriod(period) || !descriptivePeriodIncludes(period) || row.revenue == null || row.evidence === 'estimate' || row.missing) return;
      const year = period.slice(0, 4);
      const total = totals.get(year) || { period: year, revenue: 0, income: 0, incomeComplete: true, observedMonths: new Set(), evidence: 'actual' };
      total.revenue += Number(row.revenue) || 0;
      if (row.income == null || !Number.isFinite(Number(row.income))) total.incomeComplete = false;
      else total.income += Number(row.income);
      total.observedMonths.add(period.slice(5, 7));
      totals.set(year, total);
    });
    return descriptiveAxisPeriods().map(period => {
      const total = totals.get(period);
      return total
        ? { period, revenue: total.revenue, income: total.incomeComplete ? total.income : null, evidence: 'actual', observed_months: total.observedMonths.size }
        : { period, revenue: null, income: null, evidence: 'unavailable', missing: true, observed_months: 0 };
    });
  }
  const source = new Map(sourceRows.map(row => [String(row.period), row]));
  const estimateRows = descriptivePeriod === 'custom' && !descriptiveUsesDailyGrain() ? dashboardMonthlyRows() : sourceRows;
  return descriptiveAxisPeriods().map(period => source.get(period)
    || descriptiveWeightedEstimate(period, estimateRows)
    || { period, revenue: null, income: null, evidence: 'unavailable', missing: true });
}

function getDescriptivePriorDisplayRows() {
  if (descriptiveUsesYearlyGrain()) {
    const annual = new Map(getDescriptiveDisplayRows().map(row => [String(row.period), row]));
    return descriptiveAxisPeriods().map(period => annual.get(String(Number(period) - 1))
      || { period: String(Number(period) - 1), revenue: null, income: null, evidence: 'unavailable', missing: true });
  }
  const sourceRows = descriptivePeriod === 'custom' && !descriptiveUsesDailyGrain()
    ? descriptiveCustomMonthlyRows(shiftIsoYear(customDateStart, -1), shiftIsoYear(customDateEnd, -1))
    : getDescriptiveSourceRows();
  const source = new Map(sourceRows.map(row => [String(row.period), row]));
  const estimateRows = descriptivePeriod === 'custom' && !descriptiveUsesDailyGrain() ? dashboardMonthlyRows() : sourceRows;
  return descriptiveAxisPeriods().map(period => {
    const priorPeriod = descriptivePreviousPeriod(period);
    return source.get(priorPeriod)
      || descriptiveWeightedEstimate(priorPeriod, estimateRows)
      || { period: priorPeriod, revenue: null, income: null, evidence: 'unavailable', missing: true };
  });
}

function descriptivePeriodLabel() {
  if (descriptiveUsesYearlyGrain()) {
    const years = descriptiveAxisPeriods();
    const scope = descriptivePeriod === 'all' ? 'All Time' : descriptivePeriod === 'custom' ? 'Custom Range' : 'Last ' + descriptivePeriod + ' Months';
    return years.length
      ? scope + ' · ' + years[0] + '–' + descriptiveYearLabel(years[years.length - 1]) + ' · Yearly'
      : scope + ' · Yearly';
  }
  if (descriptivePeriod === 'custom') {
    const formatter = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    return formatter.format(new Date(customDateStart + 'T00:00:00Z')) + ' – ' + formatter.format(new Date(customDateEnd + 'T00:00:00Z'));
  }
  const end = descriptiveLatestObservedMonth();
  const formatter = new Intl.DateTimeFormat('en-PH', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return 'Last ' + descriptivePeriod + ' Months · through ' + formatter.format(new Date(end + '-01T00:00:00Z'));
}

function descriptivePointLabel(period) {
  const text = String(period);
  if (/^\d{4}$/.test(text)) return descriptiveYearLabel(text);
  const date = new Date(text.length === 7 ? text + '-01T00:00:00Z' : text + 'T00:00:00Z');
  if (Number.isNaN(date.getTime())) return text;
  return (descriptiveUsesDailyGrain() ? descriptivePointFormatters.daily : descriptivePointFormatters.monthly).format(date);
}

function descriptiveYearLabel(yearValue) {
  const year = String(yearValue);
  const currentYear = descriptivePhtDate().slice(0, 4);
  if (year === currentYear) return year + ' YTD';
  const months = new Set(dashboardRawMonthlyRows().filter(row => String(row.period).startsWith(year + '-') && row.revenue != null && !row.missing && row.evidence !== 'estimate').map(row=>String(row.period).slice(5,7)));
  const bounded = descriptivePeriod === 'custom' && (customDateStart > year + '-01-01' || customDateEnd < year + '-12-31');
  return year + (months.size > 0 && (months.size < 12 || bounded) ? ' Partial' : '');
}

function setCustomDateRange(startValue, endValue) {
  const today = descriptivePhtDate();
  const minimum = '2017-01-01';
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(String(startValue))
    && /^\d{4}-\d{2}-\d{2}$/.test(String(endValue))
    && startValue >= minimum && startValue <= endValue && endValue <= today;
  const startInput = document.getElementById('customDateStart');
  const endInput = document.getElementById('customDateEnd');
  if (!valid) {
    if (startInput) startInput.value = customDateStart;
    if (endInput) endInput.value = customDateEnd;
    return false;
  }
  customDateStart = String(startValue);
  customDateEnd = String(endValue);
  selectedYear = customDateStart.slice(0, 4);
  if (startInput) {
    startInput.value = customDateStart;
    startInput.min = minimum;
    startInput.max = customDateEnd;
  }
  if (endInput) {
    endInput.value = customDateEnd;
    endInput.min = customDateStart;
    endInput.max = today;
  }
  if (descriptivePeriod === 'custom') {
    refreshComparison();
    if (descriptivePageIsActive('products') && typeof renderProductPrioritizationTimeline === 'function') renderProductPrioritizationTimeline();
  }
  return true;
}

function openCustomDateCalendar(input) {
  if (!input) return;
  try {
    input.focus({ preventScroll: true });
    if (typeof input.showPicker === 'function') input.showPicker();
  } catch (_) {
    input.focus({ preventScroll: true });
  }
}

function setDescriptivePeriod(value) {
  descriptivePeriod = ['3', '6', '12', 'all', 'custom'].includes(String(value)) ? String(value) : '12';
  const periodSelect = document.getElementById('descriptivePeriodSelect');
  if (periodSelect && periodSelect.value !== descriptivePeriod) periodSelect.value = descriptivePeriod;
  const yearWrap = document.getElementById('singleYearWrap');
  if (yearWrap) yearWrap.style.display = 'none';
  const rangeWrap = document.getElementById('customDateRangeWrap');
  if (rangeWrap) rangeWrap.style.display = descriptivePeriod === 'custom' ? 'flex' : 'none';
  if (descriptivePeriod === 'custom') openCustomDateCalendar(document.getElementById('customDateStart'));
  refreshComparison();
  if (descriptivePageIsActive('products') && typeof renderProductPrioritizationTimeline === 'function') renderProductPrioritizationTimeline();
}

function setDescriptiveGranularity(value) {
  descriptiveGranularity = ['auto', 'monthly', 'yearly'].includes(String(value)) ? String(value) : 'auto';
  const select = document.getElementById('chartGranularitySelect');
  if (select && select.value !== descriptiveGranularity) select.value = descriptiveGranularity;
  refreshComparison();
  if (typeof renderProductPrioritizationTimeline === 'function') renderProductPrioritizationTimeline();
  if (typeof renderSalesSectors === 'function') renderSalesSectors();
  if (typeof renderSalesHeatmap === 'function') renderSalesHeatmap();
}

function setDescriptiveComparisonMode(value) {
  comparisonMode = String(value) === 'yoy' ? 'yoy' : 'single';
  const select = document.getElementById('descriptiveComparisonSelect');
  if (select && select.value !== comparisonMode) select.value = comparisonMode;
  refreshComparison();
}
document.addEventListener('change', function(event) {
  if (event.target && event.target.id === 'descriptivePeriodSelect') setDescriptivePeriod(event.target.value);
  if (event.target && event.target.id === 'chartGranularitySelect') setDescriptiveGranularity(event.target.value);
  if (event.target && event.target.id === 'descriptiveComparisonSelect') setDescriptiveComparisonMode(event.target.value);
  if (event.target && (event.target.id === 'customDateStart' || event.target.id === 'customDateEnd')) {
    const start = document.getElementById('customDateStart');
    const end = document.getElementById('customDateEnd');
    if (start && end) {
      const updated = setCustomDateRange(start.value, end.value);
      if (updated && event.target.id === 'customDateStart') openCustomDateCalendar(end);
    }
  }
});
`

export function patchDescriptivePeriodFilters(script: string): string {
  let patched = script
    .replace(LEGACY_FILTER_STATE, DESCRIPTIVE_FILTER_STATE)
    .replace(
      "const FILTERBAR_PAGES = new Set(['overview', 'revenue']);",
      "const FILTERBAR_PAGES = new Set(['overview', 'revenue', 'products', 'territory']);",
    )
  if (patched === script) throw new Error('Unable to initialize descriptive period state.')

  patched = patched.replace(LEGACY_YEAR_ROWS, DESCRIPTIVE_YEAR_ROWS)
  if (!patched.includes(DESCRIPTIVE_YEAR_ROWS)) throw new Error('Unable to patch descriptive KPI rows.')

  patched = patched.replace(LEGACY_SET_YEAR, DESCRIPTIVE_SET_YEAR)
  if (!patched.includes(DESCRIPTIVE_SET_YEAR)) throw new Error('Unable to patch custom date compatibility.')

  patched = patched.replace(LEGACY_REFRESH_COMPARISON, RESPONSIVE_REFRESH_COMPARISON)
  if (!patched.includes(RESPONSIVE_REFRESH_COMPARISON)) throw new Error('Unable to patch responsive filter refresh.')

  const monthlyPattern = /function getMonthlyRowsForMode\(\) \{[\s\S]*?\}\n\nfunction baseChartOptions\(\)/
  patched = patched.replace(monthlyPattern, `${DESCRIPTIVE_MONTH_ROWS}\n\nfunction baseChartOptions()`)
  if (!patched.includes(DESCRIPTIVE_MONTH_ROWS)) throw new Error('Unable to patch descriptive chart rows.')

  patched = patched.replace(LEGACY_SELECTED_METRICS, DESCRIPTIVE_SELECTED_METRICS)
    .replace("salesGrossProfit: hasAnnualValues ? formatCurrency(selectedProfit) : 'Unavailable'", "salesGrossProfit: hasProfitValues ? formatCurrency(selectedProfit) : 'Unavailable'")
    .replace(
      "  const periodNote = document.querySelector('[data-sales-metric-period]');",
      `  const overviewRevenue = document.getElementById('kpiOverviewTotalRevenue');
  const overviewEvidenceRows = getDescriptiveDisplayRows();
  const overviewActualRows = overviewEvidenceRows.filter(row => row.evidence === 'actual' && row.revenue != null);
  const overviewEstimateRows = overviewEvidenceRows.filter(row => row.evidence === 'estimate' && row.revenue != null);
  const overviewActualRevenue = overviewActualRows.reduce((sum, row) => sum + Number(row.revenue), 0);
  const overviewEstimatedRevenue = overviewEstimateRows.reduce((sum, row) => sum + Number(row.revenue), 0);
  if (overviewRevenue) overviewRevenue.textContent = overviewActualRows.length ? formatCurrency(overviewActualRevenue) : 'No observations';
  const overviewRevenueCard = overviewRevenue ? overviewRevenue.closest('.kpi-card') : null;
  const overviewRevenueLabel = overviewRevenueCard ? overviewRevenueCard.querySelector('.kpi-label') : null;
  if (overviewRevenueLabel) overviewRevenueLabel.textContent = 'Observed Net Sales · ' + descriptivePeriodLabel();
  let overviewBreakdown = document.getElementById('overviewRevenueEvidence');
  if (!overviewBreakdown && overviewRevenue) {
    overviewBreakdown = document.createElement('div');
    overviewBreakdown.id = 'overviewRevenueEvidence';
    overviewBreakdown.style.cssText = 'font-size:12px;line-height:1.6;margin:8px 0;overflow-wrap:anywhere';
    overviewRevenue.insertAdjacentElement('afterend', overviewBreakdown);
  }
  if (overviewBreakdown) overviewBreakdown.textContent = overviewEstimateRows.length
    ? 'Gap estimate: ' + formatCurrency(overviewEstimatedRevenue) + ' · Combined: ' + formatCurrency(overviewActualRevenue + overviewEstimatedRevenue) + ' (actual + estimate)'
    : 'Observed sales only; no gap estimates included';
  const overviewGrowthTag = document.getElementById('kpiOverviewGrowthTag');
  if (overviewGrowthTag) overviewGrowthTag.textContent = descriptiveUsesDailyGrain() && !hasAnnualValues
    ? 'Daily transaction data unavailable'
    : 'Observed sales only';
  const periodNote = document.querySelector('[data-sales-metric-period]');`,
    )
    .replace("if (periodNote) periodNote.textContent = 'Selected years: ' + yearRowsForMode.map(row => row.year).join(', ') + (yearRowsForMode.some(row => row.missing) ? ' · Missing annual values excluded from totals' : '');", "if (periodNote) periodNote.textContent = 'Selected period: ' + descriptivePeriodLabel() + (descriptiveRows.length ? '' : ' · No observations available');")
  if (!patched.includes(DESCRIPTIVE_SELECTED_METRICS)) throw new Error('Unable to patch descriptive KPI metrics.')
  patched = patched
    .replace(
      'const monthlyDataForMode = getMonthlyRowsForMode();',
      'const monthlyDataForMode = getMonthlyRowsForMode();\n  const descriptiveAreaRows = getDescriptiveAreaRows();',
    )
    .replaceAll('DATA.by_area.map((row) => row.area)', 'descriptiveAreaRows.map((row) => row.area)')
    .replaceAll('DATA.by_area.map((row) => row.revenue)', 'descriptiveAreaRows.map((row) => row.revenue)')
    .replaceAll(
      '(DATA.by_area.length ? DATA.by_area : MOCK_BY_AREA)',
      'descriptiveAreaRows',
    )
  return patched
}
