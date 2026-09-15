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
  const selectedRows = getDescriptiveDisplayRows();
  const sourceRows = getDescriptiveSourceRows();
  const sourceByPeriod = new Map(sourceRows.map(row => [String(row.period), row]));
  const priorPeriod = period => descriptivePeriod === '30d'
    ? String(Number(period.slice(0, 4)) - 1) + period.slice(4)
    : String(Number(period.slice(0, 4)) - 1) + period.slice(4, 7);
  const revenue = selectedRows.map(row => row.revenue == null ? null : row.revenue);
  const profit = selectedRows.map(row => row.income == null ? null : row.income);
  const detailLabels = selectedRows.map(row => descriptivePointLabel(row.period));
  const dailyUnavailable = descriptivePeriod === '30d' && selectedRows.every(row => row.revenue == null);
  const detailDatasets = [
    { label: 'Net Sales Revenue · ' + descriptivePeriodLabel(), data: revenue, yAxisID: 'revenue', borderColor: getColor(), backgroundColor: getColor(.08), borderWidth: 2.5, pointRadius: descriptivePeriod === '30d' ? 1.5 : 3, tension: .25, fill: false, spanGaps: false },
    { label: 'Gross Profit · ' + descriptivePeriodLabel(), data: profit, yAxisID: 'grossProfit', borderColor: getAmber(), backgroundColor: getAmber(.08), borderWidth: 2.2, pointRadius: descriptivePeriod === '30d' ? 1.5 : 3, tension: .25, fill: false, spanGaps: false }
  ];
  if (descriptivePeriod === '30d') detailDatasets.splice(1, 1);
  const detailScales = {
    x: opts.scales.x,
    revenue: diagnosticAxis(revenue, 'Net sales revenue (₱)', getColor(), 'left', true),
    ...(descriptivePeriod === '30d' ? {} : { grossProfit: diagnosticAxis(profit, 'Gross profit (₱)', getAmber(), 'right', false) })
  };

  const subtitle = document.getElementById('salesComparisonSubtitle');
  if (subtitle) subtitle.textContent = dailyUnavailable
    ? 'Daily transaction data is unavailable for the last 30 days; monthly totals are not expanded into synthetic days.'
    : (descriptivePeriod === '30d' ? 'Daily' : 'Monthly') + ' revenue and gross profit for ' + descriptivePeriodLabel() + '; gaps mean unavailable observations, not zero sales.';
  createChart('revenueDetailChart', {
    type: 'line',
    data: { labels: detailLabels, datasets: detailDatasets },
    options: {
      ...opts,
      plugins: { ...opts.plugins, legend: { ...opts.plugins.legend, position: 'bottom' }, tooltip: {
        ...opts.plugins.tooltip, callbacks: { label: context => context.dataset.label + ': ' + diagnosticCurrency(context.raw) }
      } },
      scales: detailScales
    }
  });

  const rows = selectedRows.map(row => {
    const previousPeriod = priorPeriod(String(row.period));
    const previous = sourceByPeriod.get(previousPeriod);
    const hasCurrent = row.revenue != null && Number.isFinite(Number(row.revenue));
    const delta = hasCurrent && previous ? Number(row.revenue) - Number(previous.revenue) : null;
    return {
      label: descriptivePointLabel(row.period), period: String(row.period), previousPeriod,
      current: hasCurrent ? Number(row.revenue) : null, previous: previous ? Number(previous.revenue) : null,
      delta, rate: delta !== null && Number(previous.revenue) > 0 ? delta / Number(previous.revenue) * 100 : null
    };
  });
  const matched = rows.filter(row => row.current !== null && row.previous !== null);
  const currentTotal = matched.reduce((sum, row) => sum + Number(row.current), 0);
  const previousTotal = matched.reduce((sum, row) => sum + Number(row.previous), 0);
  const totalDelta = matched.length ? currentTotal - previousTotal : null;
  const totalRate = totalDelta !== null && previousTotal > 0 ? totalDelta / previousTotal * 100 : null;
  const summary = document.getElementById('salesGrowthSummary');
  if (summary) summary.textContent = matched.length
    ? descriptivePeriodLabel() + ' versus the same calendar periods one year earlier: ' + diagnosticCurrency(previousTotal) + ' → ' + diagnosticCurrency(currentTotal) + '; change ' + diagnosticCurrency(totalDelta) + ' (' + diagnosticRate(totalRate) + '). ' + matched.length + '/' + rows.length + ' periods matched.'
    : 'No same-period prior-year observations are available for ' + descriptivePeriodLabel() + '.';
  createChart('growthChart', {
    type: 'bar',
    data: {
      labels: rows.map(row => row.label),
      datasets: [
        { label: 'YoY net sales growth (%)', data: rows.map(row => row.rate), yAxisID: 'growthRate', backgroundColor: rows.map(row => row.rate < 0 ? getRed(.8) : getColor(.8)), borderRadius: 4 },
        { type: 'line', label: 'YoY net sales change (₱)', data: rows.map(row => row.delta), yAxisID: 'pesoChange', borderColor: getAmber(), backgroundColor: getAmber(), pointRadius: 3, tension: 0, spanGaps: false }
      ]
    },
    options: {
      ...opts,
      plugins: { ...opts.plugins, legend: { ...opts.plugins.legend, position: 'bottom' }, tooltip: {
        ...opts.plugins.tooltip, callbacks: {
          label: context => context.dataset.label + ': ' + (context.dataset.yAxisID === 'growthRate' ? diagnosticRate(context.raw) : diagnosticCurrency(context.raw)),
          afterBody: contexts => {
            const row = rows[contexts[0]?.dataIndex];
            return row ? [row.previousPeriod + ': ' + diagnosticCurrency(row.previous), row.period + ': ' + diagnosticCurrency(row.current)] : [];
          }
        }
      } },
      scales: {
        x: opts.scales.x,
        growthRate: { type: 'linear', position: 'left', beginAtZero: true, ticks: { callback: value => Number(value).toLocaleString('en-PH', { maximumFractionDigits: 1 }) + '%' }, title: { display: true, text: 'YoY net sales growth (%)' } },
        pesoChange: diagnosticAxis(rows.map(row => row.delta), 'YoY net sales change (₱)', getAmber(), 'right', false)
      }
    }
  });

  const table = document.getElementById('salesGrowthTable');
  if (table) {
    table.replaceChildren();
    const head = table.createTHead().insertRow();
    [(descriptivePeriod === '30d' ? 'Day' : 'Month'), 'Current period', 'Prior-year period', 'Prior-year net sales (₱)', 'Current net sales (₱)', 'Change (₱)', 'Growth (%)'].forEach(label => {
      const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; head.appendChild(th);
    });
    const body = table.createTBody();
    rows.forEach(row => {
      const tr = body.insertRow();
      [row.label, row.period, row.previousPeriod, diagnosticCurrency(row.previous), diagnosticCurrency(row.current), diagnosticCurrency(row.delta), diagnosticRate(row.rate)].forEach(value => { tr.insertCell().textContent = String(value); });
    });
  }
}
`
