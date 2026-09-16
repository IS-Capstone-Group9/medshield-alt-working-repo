// Runs inside the existing dashboard closure, sharing DATA and filter state.
// Calculations live here so the chart, explanatory table and export use identical rows.
export const SALES_DIAGNOSTICS_SCRIPT = String.raw`
function historicalPeriod(period) {
  return /^(201[7-9]|202[0-5])-(0[1-9]|1[0-2])$/.test(String(period));
}

function syncHistoricalYearControls() {
  const years = [...new Set(DATA.year_summary.map(r=>Number(r.year)).concat(DATA.monthly.map(r=>Number(r.period.slice(0,4)))))]
    .filter(y=>Number.isInteger(y)&&y>=2017&&y<=2025).sort((a,b)=>a-b).map(String);
  // Keep requested in-range empty years empty rather than silently broadening scope.
  if(selectedYear!=='all' && !/^(201[7-9]|202[0-5])$/.test(selectedYear)) selectedYear='all';
  const options = Array.from({length:9},(_,i)=>String(2017+i));
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
  const years = [...new Set(DATA.year_summary.map(row => Number(row.year))
    .concat(DATA.monthly.map(row => Number(String(row.period).slice(0, 4)))))]
    .filter(year => Number.isInteger(year) && year >= 2017 && year <= 2025).sort((a, b) => a - b);
  if (!years.length) return [];
  const start = comparisonMode === 'yoy' ? Math.min(Number(yoyBaseYear), Number(yoyTargetYear))
    : selectedYear === 'all' ? years[0] : Number(selectedYear);
  const end = comparisonMode === 'yoy' ? Math.max(Number(yoyBaseYear), Number(yoyTargetYear))
    : selectedYear === 'all' ? years[years.length - 1] : Number(selectedYear);
  if (!Number.isInteger(start) || !Number.isInteger(end) || end < start || start < 2017 || end > 2025) return [];
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function diagnosticMonths() {
  const months = new Map();
  DATA.monthly.forEach(row => {
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
  const years = diagnosticYears(), months = diagnosticMonths();
  const periods = years.flatMap(year => Array.from({ length: 12 }, (_, i) => year + '-' + String(i + 1).padStart(2, '0')));
  const revenue = periods.map(period => months.get(period)?.revenue ?? null);
  const profit = periods.map(period => months.get(period)?.income ?? null);
  const predictedRevenue = diagnosticPredictions(periods, months, 'revenue');
  const predictedProfit = diagnosticPredictions(periods, months, 'income');
  const predictedCount = predictedRevenue.filter(value => value != null).length;
  const annual=getYearRowsForMode().filter(r=>!r.missing);
  const totalRevenue=annual.reduce((n,r)=>n+r.revenue,0), totalProfit=annual.reduce((n,r)=>n+r.income,0);
  const cards=document.querySelectorAll('#page-overview .kpi-grid .kpi-card');
  const summaries=[
    ['Selected net sales',annual.length?diagnosticCurrency(totalRevenue):'Unavailable','Selected calendar years: '+years.join(', ')],
    ['Selected gross profit',annual.length?diagnosticCurrency(totalProfit):'Unavailable','Workbook profit before operating expenses; reconciliation required'],
    ['Selected gross margin',totalRevenue?diagnosticRate(totalProfit/totalRevenue*100):'Unavailable','Total gross profit ÷ total net sales'],
    ['Observed monthly coverage',periods.filter(p=>months.has(p)).length+' / '+periods.length,
      predictedCount + ' unavailable months shown as predictions; excluded from totals']
  ];
  cards.forEach((card,i)=>{if(!summaries[i])return;card.classList.add('kpi-card-ai');const [label,value,note]=summaries[i];
    const l=card.querySelector('.kpi-label'),v=card.querySelector('.kpi-value');if(l)l.textContent=label;if(v)v.textContent=value;
    const sub=card.querySelector('.kpi-sub')||card.querySelector('.kpi-tag');if(sub)sub.textContent=note;
  });
  const overviewCard=document.getElementById('overviewBaselineChart')?.closest('.chart-card');
  if(overviewCard) {
    const caption=overviewCard.querySelector('.chart-subtitle');
    if(caption)caption.textContent='Selected calendar years: '+years.join(', ')+'. Historical net sales and workbook gross profit; actual-data window 2017–2025.';
    const status=overviewCard.querySelector('.status-pill');
    if(status)status.textContent='Historical · reconciliation required';
  }
  const subtitle = document.getElementById('salesComparisonSubtitle');
  if (subtitle) subtitle.textContent = (years.length ? years[0] + '–' + years[years.length - 1] : 'No selected years')
    + ' · Solid circles are observed. Dashed triangles are predicted by interpolation and are excluded from totals.';
  createChart('revenueDetailChart', {
    type: 'line',
    data: {
      labels: periods,
      datasets: [
        { label: 'Net Sales Revenue', data: revenue, yAxisID: 'revenue', borderColor: getColor(), backgroundColor: getColor(), borderWidth: 2.5, pointRadius: 2, tension: 0, fill: false, spanGaps: false },
        { label: 'Gross Profit', data: profit, yAxisID: 'grossProfit', borderColor: getAmber(), backgroundColor: getAmber(), borderWidth: 2, pointRadius: 2, tension: 0, fill: false, spanGaps: false },
        { label: 'Predicted Net Sales Revenue', data: predictedRevenue, yAxisID: 'revenue', borderColor: 'rgba(124,58,237,0.9)', backgroundColor: 'rgba(124,58,237,0.9)', borderWidth: 2, borderDash: [6, 4], pointStyle: 'triangle', pointRadius: 4, tension: 0, fill: false, spanGaps: false },
        { label: 'Predicted Gross Profit', data: predictedProfit, yAxisID: 'grossProfit', borderColor: 'rgba(219,39,119,0.9)', backgroundColor: 'rgba(219,39,119,0.9)', borderWidth: 2, borderDash: [6, 4], pointStyle: 'triangle', pointRadius: 4, tension: 0, fill: false, spanGaps: false }
      ]
    },
    options: {
      ...opts,
      plugins: { ...opts.plugins, legend: { ...opts.plugins.legend, position: 'bottom' }, tooltip: {
        ...opts.plugins.tooltip, callbacks: { label: context => context.dataset.label + ': ' + diagnosticCurrency(context.raw) }
      } },
      scales: {
        x: { ...opts.scales.x, ticks: { ...opts.scales.x.ticks, maxTicksLimit: 18, callback: function(value) { return monthLabel(this.getLabelForValue(value)); } } },
        revenue: diagnosticAxis(revenue, 'Net sales revenue (₱)', getColor(), 'left', true),
        grossProfit: diagnosticAxis(profit, 'Gross profit (₱)', getAmber(), 'right', false)
      }
    }
  });

  // Calendar-year YoY never uses the previous array row. Matching observed months
  // avoids treating unreported months as zeros or comparing partial to full years.
  const baseline = comparisonMode === 'yoy' ? Number(yoyBaseYear)
    : selectedYear === 'all' ? years[0] : Number(selectedYear) - 1;
  const rows = years.map(year => ({ year, yoy: diagnosticComparison(months, year, year - 1), baseline: diagnosticComparison(months, year, baseline) }));
  const targetYear = comparisonMode === 'yoy' ? Number(yoyTargetYear) : years[years.length - 1];
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
      labels: rows.map(row => String(row.year)),
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
            return row ? [String(row.year - 1) + ': ' + diagnosticCurrency(row.yoy.previous), String(row.year) + ': ' + diagnosticCurrency(row.yoy.current), diagnosticCoverage(row.yoy.covered)] : [];
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
    ['Year', 'YoY compared months', 'Prior-year net sales (₱)', 'Current net sales (₱)', 'YoY change (₱)', 'YoY growth (%)', 'Change vs ' + baseline + ' (₱)', 'Growth vs ' + baseline + ' (%)', 'Baseline compared months'].forEach(label => {
      const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; head.appendChild(th);
    });
    const body = table.createTBody();
    rows.forEach(row => {
      const tr = body.insertRow();
      [row.year, diagnosticCoverage(row.yoy.covered), diagnosticCurrency(row.yoy.previous), diagnosticCurrency(row.yoy.current), diagnosticCurrency(row.yoy.delta), diagnosticRate(row.yoy.rate), diagnosticCurrency(row.baseline.delta), diagnosticRate(row.baseline.rate), diagnosticCoverage(row.baseline.covered)].forEach(value => { tr.insertCell().textContent = String(value); });
    });
  }
}
`
