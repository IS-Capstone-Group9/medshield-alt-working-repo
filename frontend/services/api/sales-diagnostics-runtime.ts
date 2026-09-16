// Runs inside the existing dashboard closure, sharing DATA and filter state.
// Calculations live here so the chart, explanatory table and export use identical rows.
export const SALES_DIAGNOSTICS_SCRIPT = String.raw`
function historicalPeriod(period) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(period));
  return Boolean(match && Number(match[1]) >= 2017 && Number(match[1]) <= dashboardCalendar().year);
}

function syncHistoricalYearControls() {
  const years = [...new Set(DATA.year_summary.map(r=>Number(r.year)).concat(DATA.monthly.map(r=>Number(r.period.slice(0,4)))))]
    .filter(y=>Number.isInteger(y)&&y>=2017&&y<=dashboardCalendar().year).sort((a,b)=>a-b).map(String);
  // Keep requested in-range empty years empty rather than silently broadening scope.
  if(selectedYear!=='all' && (!/^\d{4}$/.test(selectedYear)||Number(selectedYear)<2017||Number(selectedYear)>dashboardCalendar().year)) selectedYear='all';
  const options = Array.from({length:dashboardCalendar().year-2016},(_,i)=>String(2017+i));
  for(const [id,value,all] of [['topbarYearSelect',selectedYear,true],['yoyBaseYearSelect',yoyBaseYear,false],['yoyTargetYearSelect',yoyTargetYear,false]]) {
    const select=document.getElementById(id); if(!select)continue;
    select.replaceChildren(...(all?[new Option('All years (2017–2025)','all')]:[]), ...options.map(y=>new Option(y+(years.includes(y)?'':' — no snapshot rows'),y)));
    select.value=String(value);
  }
}

function calendarRevenueSeries() {
  const years=diagnosticYears(), months=diagnosticMonths();
  const periods=years.flatMap(y=>Array.from({length:12},(_,i)=>y+'-'+String(i+1).padStart(2,'0')));
  return {labels:periods, datasets:[{label:'Net sales revenue (₱)',data:periods.map(p=>months.get(p)?.revenue??null),borderColor:getColor(),backgroundColor:getColor(.15),pointRadius:2,tension:0,spanGaps:false,fill:false}]};
}

function labelUnfilteredAggregates() {
  for(const id of ['areaDonut','productBarChart','abcChart','productTable','productBubbleChart','paretoCurveChart']) {
    const card=document.getElementById(id)?.closest('.chart-card');if(!card)continue;
    let note=card.querySelector('[data-aggregate-scope]');
    if(!note){note=document.createElement('p');note.dataset.aggregateScope='';note.className='chart-subtitle';card.prepend(note);}
    note.textContent='Pre-aggregated source totals; year breakdown unavailable. The year filter does not apply. Date-range reconciliation is required before treating these as 2017–2025-only totals.';
  }
}

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
    if (!historicalPeriod(period)) return;
    if (row.revenue == null || row.income == null || !Number.isFinite(Number(row.revenue)) || !Number.isFinite(Number(row.income))) return;
    const total = months.get(period) || { revenue: 0, income: 0 };
    total.revenue += Number(row.revenue);
    total.income += Number(row.income);
    months.set(period, total);
  });
  return months;
}

function diagnosticPredictions(periods, months, metric) {
  const observed = periods.map(period => months.get(period)?.[metric] ?? null);
  return observed.map((value, index) => {
    if (value != null) return null;
    let before = index - 1, after = index + 1;
    while (before >= 0 && observed[before] == null) before--;
    while (after < observed.length && observed[after] == null) after++;
    if (before >= 0 && after < observed.length) {
      const progress = (index - before) / (after - before);
      return observed[before] + (observed[after] - observed[before]) * progress;
    }
    if (before >= 0) return observed[before];
    if (after < observed.length) return observed[after];
    return null;
  });
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
  const priorDisplayRows = getDescriptivePriorDisplayRows();
  const priorPeriod = period => descriptiveUsesDailyGrain()
    ? String(Number(period.slice(0, 4)) - 1) + period.slice(4)
    : String(Number(period.slice(0, 4)) - 1) + period.slice(4, 7);
  const revenue = selectedRows.map(row => row.revenue == null ? null : row.revenue);
  const profit = selectedRows.map(row => row.income == null ? null : row.income);
  const detailLabels = selectedRows.map(row => descriptivePointLabel(row.period));
  const detailPeriods = selectedRows.map(row => String(row.period));
  const observedMonths = new Map(selectedRows
    .filter(row => row.revenue != null || row.income != null)
    .map(row => [String(row.period), { revenue: row.revenue, income: row.income }]));
  const predictedRevenue = diagnosticPredictions(detailPeriods, observedMonths, 'revenue');
  const predictedProfit = diagnosticPredictions(detailPeriods, observedMonths, 'income');
  const predictedCount = predictedRevenue.filter(value => value != null).length;
  const dailyUnavailable = descriptiveUsesDailyGrain() && selectedRows.every(row => row.revenue == null);
  const detailDatasets = [
    { label: 'Net Sales Revenue · ' + descriptivePeriodLabel(), data: revenue, yAxisID: 'revenue', borderColor: getColor(), backgroundColor: getColor(.08), borderWidth: 2.5, pointRadius: descriptiveUsesDailyGrain() ? 1.5 : 3, tension: .25, fill: false, spanGaps: false },
    { label: 'Gross Profit · ' + descriptivePeriodLabel(), data: profit, yAxisID: 'grossProfit', borderColor: getAmber(), backgroundColor: getAmber(.08), borderWidth: 2.2, pointRadius: descriptiveUsesDailyGrain() ? 1.5 : 3, tension: .25, fill: false, spanGaps: false }
  ];
  detailDatasets.push({ label: 'Predicted Net Sales Revenue', data: predictedRevenue, yAxisID: 'revenue', borderColor: 'rgba(124,58,237,0.9)', backgroundColor: 'rgba(124,58,237,0.9)', borderWidth: 2, borderDash: [6, 4], pointStyle: 'triangle', pointRadius: 4, tension: 0, fill: false, spanGaps: false });
  if (!descriptiveUsesDailyGrain()) detailDatasets.push({ label: 'Predicted Gross Profit', data: predictedProfit, yAxisID: 'grossProfit', borderColor: 'rgba(219,39,119,0.9)', backgroundColor: 'rgba(219,39,119,0.9)', borderWidth: 2, borderDash: [6, 4], pointStyle: 'triangle', pointRadius: 4, tension: 0, fill: false, spanGaps: false });
  if (comparisonMode === 'yoy') {
    detailDatasets.push(
      { label: 'Prior-year Net Sales Revenue', data: priorDisplayRows.map(row => row.revenue), yAxisID: 'revenue', borderColor: getColor(.5), backgroundColor: 'transparent', borderDash: [7, 5], borderWidth: 2, pointRadius: descriptiveUsesDailyGrain() ? 1 : 2, tension: .25, fill: false, spanGaps: false },
      { label: 'Prior-year Gross Profit', data: priorDisplayRows.map(row => row.income), yAxisID: 'grossProfit', borderColor: getAmber(.5), backgroundColor: 'transparent', borderDash: [7, 5], borderWidth: 2, pointRadius: descriptiveUsesDailyGrain() ? 1 : 2, tension: .25, fill: false, spanGaps: false }
    );
  }
  if (descriptiveUsesDailyGrain()) {
    for (let index = detailDatasets.length - 1; index >= 0; index--) {
      if (detailDatasets[index].label.includes('Gross Profit')) detailDatasets.splice(index, 1);
    }
  }
  const detailScales = {
    x: opts.scales.x,
    revenue: diagnosticAxis(revenue, 'Net sales revenue (₱)', getColor(), 'left', true),
    ...(descriptiveUsesDailyGrain() ? {} : { grossProfit: diagnosticAxis(profit, 'Gross profit (₱)', getAmber(), 'right', false) })
  };

  const subtitle = document.getElementById('salesComparisonSubtitle');
  if (subtitle) subtitle.textContent = dailyUnavailable
    ? 'Daily transaction data is unavailable for the last 30 days; monthly totals are not expanded into synthetic days.'
    : (descriptiveUsesDailyGrain() ? 'Daily' : 'Monthly') + ' revenue and gross profit for ' + descriptivePeriodLabel() + '; gaps mean unavailable observations, not zero sales.' + (predictedCount ? ' Dashed triangles are interpolated predictions and are excluded from totals.' : '');
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

  const rows = selectedRows.map((row, index) => {
    const previousPeriod = priorPeriod(String(row.period));
    const previous = priorDisplayRows[index];
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
    [(descriptiveUsesDailyGrain() ? 'Day' : 'Month'), 'Current period', 'Prior-year period', 'Prior-year net sales (₱)', 'Current net sales (₱)', 'Change (₱)', 'Growth (%)'].forEach(label => {
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
