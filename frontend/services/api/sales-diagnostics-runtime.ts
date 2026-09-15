// Runs inside the existing dashboard closure, sharing DATA and filter state.
// Calculations live here so the chart, explanatory table and export use identical rows.
export const SALES_DIAGNOSTICS_SCRIPT = String.raw`
function exportSalesGrowthCSV() {
  const table = document.getElementById('salesGrowthTable');
  if (!table) return;
  const csv = Array.from(table.rows).map(row => Array.from(row.cells)
    .map(cell => '"' + cell.textContent.replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'net-sales-growth.csv';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function diagnosticYears() {
  const calendar = dashboardCalendar();
  const years = [...new Set(dashboardAnnualRows().map(row => Number(row.year))
    .concat(dashboardMonthlyRows().map(row => Number(String(row.period).slice(0, 4)))))]
    .filter(year => Number.isInteger(year) && year >= 2017 && year <= calendar.year).sort((a, b) => a - b);
  if (!years.length) return [];
  if (comparisonMode === 'single' && selectedYear === 'all') return years;
  const selected = comparisonMode === 'yoy'
    ? [Number(yoyTargetYear), Number(yoyBaseYear)]
    : [Number(selectedYear)];
  return [...new Set(selected)].filter(year => years.includes(year));
}

function diagnosticMonths() {
  const months = new Map();
  dashboardMonthlyRows().forEach(row => {
    const period = String(row.period);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return;
    if (row.revenue == null || row.income == null || !Number.isFinite(Number(row.revenue)) || !Number.isFinite(Number(row.income))) return;
    const total = months.get(period) || { revenue: 0, income: 0 };
    total.revenue += Number(row.revenue);
    total.income += Number(row.income);
    months.set(period, total);
  });
  return months;
}

function diagnosticComparison(months, year, baseYear) {
  const covered = [];
  let current = 0, previous = 0;
  for (let month = 1; month <= 12; month++) {
    const suffix = '-' + String(month).padStart(2, '0');
    const target = months.get(year + suffix), base = months.get(baseYear + suffix);
    if (target && base) {
      covered.push(month);
      current += target.revenue;
      previous += base.revenue;
    }
  }
  if (!covered.length) return { current: null, previous: null, delta: null, rate: null, covered };
  const delta = current - previous;
  return { current, previous, delta, rate: previous > 0 ? delta / previous * 100 : null, covered };
}

function diagnosticCoverage(covered) {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return covered.length === 12 ? 'Jan–Dec (12/12 observed months)'
    : covered.length ? covered.map(month => names[month - 1]).join(', ') + ' (' + covered.length + '/12 matched months)'
    : 'No matching observed months';
}

function diagnosticCurrency(value) {
  return value == null ? 'Unavailable' : new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP', maximumFractionDigits: 2
  }).format(value);
}

function diagnosticRate(value) {
  return value == null ? 'Unavailable' : value.toFixed(1) + '%';
}

function diagnosticAxis(values, title, color, position, grid) {
  const finite = values.filter(value => value != null && Number.isFinite(value));
  const low = Math.min(0, ...finite), high = Math.max(0, ...finite);
  const rawStep = (high - low || 1) / 5;
  const power = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = [1, 2, 2.5, 5, 10].find(value => value * power >= rawStep) * power;
  return {
    type: 'linear', position, beginAtZero: true,
    min: Math.floor(low / step) * step,
    max: Math.ceil(high / step) * step || step,
    grid: { drawOnChartArea: grid },
    ticks: { color, stepSize: step, callback: value => formatCompactCurrency(Number(value)) },
    title: { display: true, text: title, color }
  };
}

function renderSalesDiagnostics(opts) {
  const years = diagnosticYears(), months = diagnosticMonths();
  const allYearsMode = comparisonMode === 'single' && selectedYear === 'all';
  const annual = dashboardAnnualRows().filter(row => Number(row.year) >= 2017 && Number(row.year) <= dashboardCalendar().year);
  const calendar = dashboardCalendar();
  const currentYear = calendar.year;
  const allMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const selectedCalendarYears = comparisonMode === 'yoy'
    ? [Number(yoyTargetYear), Number(yoyBaseYear)]
    : [Number(selectedYear)];
  const monthNames = !allYearsMode && selectedCalendarYears.includes(currentYear)
    ? allMonthNames.slice(0, calendar.month)
    : allMonthNames;
  const periodFor = (year, month) => String(year) + '-' + String(month).padStart(2, '0');
  const yearLabel = year => Number(year) === currentYear ? String(year) + ' (Actual + Estimate)' : String(year);
  let detailLabels, detailDatasets, detailScales;

  if (allYearsMode) {
    const revenue = annual.map(row => row.revenue);
    const profit = annual.map(row => row.income);
    detailLabels = annual.map(row => row.label || row.year);
    detailDatasets = [
      { label: 'Net Sales Revenue', data: revenue, yAxisID: 'revenue', backgroundColor: getColor(.82), borderColor: getColor(), borderWidth: 1.5, borderRadius: 4 },
      { label: 'Gross Profit', data: profit, yAxisID: 'grossProfit', backgroundColor: getAmber(.76), borderColor: getAmber(), borderWidth: 1.5, borderRadius: 4 }
    ];
    detailScales = {
      x: opts.scales.x,
      revenue: diagnosticAxis(revenue, 'Net sales revenue (₱)', getColor(), 'left', true),
      grossProfit: diagnosticAxis(profit, 'Gross profit (₱)', getAmber(), 'right', false)
    };
  } else if (comparisonMode === 'yoy') {
    const target = Number(yoyTargetYear), base = Number(yoyBaseYear);
    const targetRevenue = monthNames.map((_, index) => months.get(periodFor(target, index + 1))?.revenue ?? null);
    const baseRevenue = monthNames.map((_, index) => months.get(periodFor(base, index + 1))?.revenue ?? null);
    detailLabels = monthNames;
    detailDatasets = [
      { label: 'Revenue ' + yearLabel(target), data: targetRevenue, yAxisID: 'revenue', borderColor: getBlue(), backgroundColor: getBlue(.08), borderWidth: 2.3, pointRadius: 3, tension: .25, fill: false, spanGaps: false },
      { label: 'Revenue ' + yearLabel(base), data: baseRevenue, yAxisID: 'revenue', borderColor: getColor(), backgroundColor: getColor(.08), borderWidth: 2.3, pointRadius: 3, tension: .25, fill: false, spanGaps: false }
    ];
    detailScales = { x: opts.scales.x, revenue: diagnosticAxis([...targetRevenue, ...baseRevenue], 'Net sales revenue (₱)', getColor(), 'left', true) };
  } else {
    const year = Number(selectedYear);
    const revenue = monthNames.map((_, index) => months.get(periodFor(year, index + 1))?.revenue ?? null);
    const profit = monthNames.map((_, index) => months.get(periodFor(year, index + 1))?.income ?? null);
    detailLabels = monthNames;
    detailDatasets = [
      { label: 'Net Sales Revenue ' + yearLabel(year), data: revenue, yAxisID: 'revenue', borderColor: getColor(), backgroundColor: getColor(.08), borderWidth: 2.5, pointRadius: 3, tension: .25, fill: false, spanGaps: false },
      { label: 'Gross Profit ' + yearLabel(year), data: profit, yAxisID: 'grossProfit', borderColor: getAmber(), backgroundColor: getAmber(.08), borderWidth: 2.2, pointRadius: 3, tension: .25, fill: false, spanGaps: false }
    ];
    detailScales = {
      x: opts.scales.x,
      revenue: diagnosticAxis(revenue, 'Net sales revenue (₱)', getColor(), 'left', true),
      grossProfit: diagnosticAxis(profit, 'Gross profit (₱)', getAmber(), 'right', false)
    };
  }

  const subtitle = document.getElementById('salesComparisonSubtitle');
  if (subtitle) subtitle.textContent = allYearsMode
    ? '2017–' + currentYear + ' annual comparison; current-year estimate stops at the current month and yields to uploaded actuals.'
    : comparisonMode === 'yoy'
      ? 'Monthly revenue comparison for ' + yoyTargetYear + ' and ' + yoyBaseYear + '; gaps mean unavailable months, not zero sales.'
      : 'January–December revenue and gross profit for ' + selectedYear + '; gaps mean unavailable months, not zero sales.';
  createChart('revenueDetailChart', {
    type: allYearsMode ? 'bar' : 'line',
    data: { labels: detailLabels, datasets: detailDatasets },
    options: {
      ...opts,
      plugins: { ...opts.plugins, legend: { ...opts.plugins.legend, position: 'bottom' }, tooltip: {
        ...opts.plugins.tooltip, callbacks: { label: context => context.dataset.label + ': ' + diagnosticCurrency(context.raw) }
      } },
      scales: detailScales
    }
  });

  // Calendar-year YoY never uses the previous array row. Matching observed months
  // avoids treating unreported months as zeros or comparing partial to full years.
  const baseline = comparisonMode === 'yoy' ? Number(yoyBaseYear)
    : allYearsMode ? years[0] : Number(selectedYear) - 1;
  const targetYear = comparisonMode === 'yoy' ? Number(yoyTargetYear) : years[years.length - 1];
  const rows = allYearsMode
    ? years.map(year => ({ label: String(year), year, yoy: diagnosticComparison(months, year, year - 1), baseline: diagnosticComparison(months, year, baseline) }))
    : monthNames.map((label, index) => {
        const month = index + 1;
        const current = months.get(periodFor(targetYear, month));
        const previous = months.get(periodFor(baseline, month));
        const delta = current && previous ? current.revenue - previous.revenue : null;
        return { label, year: targetYear, yoy: { current: current?.revenue ?? null, previous: previous?.revenue ?? null,
          delta, rate: delta !== null && previous.revenue > 0 ? delta / previous.revenue * 100 : null,
          covered: current && previous ? [month] : [] }, baseline: { delta, rate: delta !== null && previous.revenue > 0 ? delta / previous.revenue * 100 : null, covered: current && previous ? [month] : [] } };
      });
  const baselineComparison = diagnosticComparison(months, targetYear, baseline);
  const summary = document.getElementById('salesGrowthSummary');
  if (summary) summary.textContent = 'Net sales revenue change: ' + targetYear + ' vs baseline ' + baseline + ': '
    + diagnosticCurrency(baselineComparison.previous) + ' → ' + diagnosticCurrency(baselineComparison.current)
    + '; change ' + diagnosticCurrency(baselineComparison.delta) + ' (' + diagnosticRate(baselineComparison.rate) + '). '
    + diagnosticCoverage(baselineComparison.covered) + '. Change from baseline is not a sum of annual growth rates.';
  if (summary && !years.length) summary.textContent = 'No monthly sales periods are available for comparison.';
  createChart('growthChart', {
    type: 'bar',
    data: {
      labels: rows.map(row => row.label),
      datasets: [
        { label: 'YoY net sales growth (%)', data: rows.map(row => row.yoy.rate), yAxisID: 'growthRate', backgroundColor: rows.map(row => row.yoy.rate < 0 ? getRed(.8) : getColor(.8)), borderRadius: 4 },
        { type: 'line', label: 'YoY net sales change (₱)', data: rows.map(row => row.yoy.delta), yAxisID: 'pesoChange', borderColor: getAmber(), backgroundColor: getAmber(), pointRadius: 3, tension: 0, spanGaps: false }
      ]
    },
    options: {
      ...opts,
      plugins: { ...opts.plugins, legend: { ...opts.plugins.legend, position: 'bottom' }, tooltip: {
        ...opts.plugins.tooltip, callbacks: {
          label: context => context.dataset.label + ': ' + (context.dataset.yAxisID === 'growthRate' ? diagnosticRate(context.raw) : diagnosticCurrency(context.raw)),
          afterBody: contexts => {
            const row = rows[contexts[0]?.dataIndex];
            return row ? [String(baseline) + ': ' + diagnosticCurrency(row.yoy.previous), String(targetYear) + ': ' + diagnosticCurrency(row.yoy.current), diagnosticCoverage(row.yoy.covered)] : [];
          }
        }
      } },
      scales: {
        x: opts.scales.x,
        growthRate: { type: 'linear', position: 'left', beginAtZero: true, ticks: { callback: value => Number(value).toLocaleString('en-PH', { maximumFractionDigits: 1 }) + '%' }, title: { display: true, text: 'YoY net sales growth (%)' } },
        pesoChange: diagnosticAxis(rows.map(row => row.yoy.delta), 'YoY net sales change (₱)', getAmber(), 'right', false)
      }
    }
  });

  const table = document.getElementById('salesGrowthTable');
  if (table) {
    table.replaceChildren();
    const head = table.createTHead().insertRow();
    [(allYearsMode ? 'Year' : 'Month'), 'Compared periods', 'Baseline net sales (₱)', 'Current net sales (₱)', 'Change (₱)', 'Growth (%)', 'Change vs ' + baseline + ' (₱)', 'Growth vs ' + baseline + ' (%)', 'Coverage'].forEach(label => {
      const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; head.appendChild(th);
    });
    const body = table.createTBody();
    rows.forEach(row => {
      const tr = body.insertRow();
      [row.label, diagnosticCoverage(row.yoy.covered), diagnosticCurrency(row.yoy.previous), diagnosticCurrency(row.yoy.current), diagnosticCurrency(row.yoy.delta), diagnosticRate(row.yoy.rate), diagnosticCurrency(row.baseline.delta), diagnosticRate(row.baseline.rate), diagnosticCoverage(row.baseline.covered)].forEach(value => { tr.insertCell().textContent = String(value); });
    });
  }
}
`
