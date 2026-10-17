import { salesMonthlyMovement } from './sales-movement-view'
import { installSalesOutputSections } from './sales-output-sections'

// Runs inside the existing dashboard closure, sharing DATA and filter state.
// Calculations live here so the chart, explanatory table and export use identical rows.
export const SALES_DIAGNOSTICS_SCRIPT = String.raw`
const diagnosticMonthlyMovement = ${salesMonthlyMovement.toString()};
const installSalesOutputSections = ${installSalesOutputSections.toString()};

function installSalesMeasureControls() {
  const trendCard = document.getElementById('revenueDetailChart')?.closest('.chart-card');
  const growthCard = document.getElementById('growthChart')?.closest('.chart-card');
  for (const [card, id, label, choices] of [
    [trendCard, 'salesTrendMeasureSelect', 'Show', [['sales','Net sales'],['profit','Gross profit'],['both','Sales and gross profit']]],
    [growthCard, 'salesGrowthMeasureSelect', 'Show change in', [['percent','Percent (%)'],['pesos','Pesos (₱)']]]
  ]) {
    if (!card || document.getElementById(id)) continue;
    const control = document.createElement('label'); control.className = 'sales-measure-control';
    control.style.cssText = 'display:flex;align-items:center;flex-wrap:wrap;gap:8px;font-size:12px;margin-bottom:12px;';
    control.append(document.createTextNode(label));
    const select = document.createElement('select'); select.id = id; select.className = 'sales-secondary-button';
    select.style.cssText = 'max-width:100%;font:inherit;color:var(--text-primary);background:white;border:1px solid var(--border);border-radius:6px;padding:7px 9px;';
    select.append(...choices.map(([value,text]) => new Option(text,value)));
    select.addEventListener('change', () => renderSalesDiagnostics(baseChartOptions()));
    control.append(select); card.querySelector('.chart-header')?.after(control);
  }
  for (const [card, id] of [[trendCard,'salesTrendReadCue'],[growthCard,'salesGrowthReadCue']]) {
    if (!card || document.getElementById(id)) continue;
    const cue = document.createElement('p'); cue.id = id; cue.className = 'chart-subtitle';
    cue.style.margin = '10px 0'; card.querySelector('.chart-wrap')?.before(cue);
  }
  if (trendCard && !document.getElementById('salesTrendReading')) {
    const reading = document.createElement('p'); reading.id = 'salesTrendReading'; reading.setAttribute('aria-live','polite');
    reading.style.margin = '12px 0'; trendCard.querySelector('.chart-wrap')?.before(reading);
  }
  const marginCard = document.getElementById('marginChart')?.closest('.chart-card');
  if (marginCard && !document.getElementById('salesMarginDetails')) {
    const grid = marginCard.closest('.chart-grid-2');
    if (grid) grid.style.gridTemplateColumns = 'minmax(0,1fr)';
    const detail = document.createElement('details'); detail.id = 'salesMarginDetails'; detail.className = 'chart-card chart-method';
    const heading = document.createElement('summary'); heading.textContent = 'Inspect gross margin';
    marginCard.before(detail); detail.append(heading, marginCard);
    marginCard.style.cssText = 'border:0;box-shadow:none;padding:12px 0 0;margin:0;';
    detail.addEventListener('toggle', () => { if (detail.open) Chart.getChart(document.getElementById('marginChart'))?.resize(); });
  }
  const table = document.getElementById('salesGrowthTable');
  if (table && !document.getElementById('salesGrowthDetails')) {
    const wrap = table.parentElement;
    const note = wrap.previousElementSibling;
    const detail = document.createElement('details'); detail.id = 'salesGrowthDetails'; detail.className = 'chart-method';
    const heading = document.createElement('summary'); heading.textContent = 'Exact matched-period values and coverage';
    wrap.before(detail); detail.append(heading);
    if (note?.classList.contains('chart-subtitle')) detail.append(note);
    detail.append(wrap);
  }
}

function salesTrendReading(rows, metric) {
  const observed = rows.filter(row => row.evidence !== 'estimate' && row[metric] != null && Number.isFinite(Number(row[metric])));
  const label = metric === 'income' ? 'gross profit' : 'sales';
  if (observed.length < 2) return 'At least two recorded points are needed to describe the direction of ' + label + '.';
  const first = observed[0], last = observed[observed.length - 1], delta = Number(last[metric]) - Number(first[metric]);
  if (/Partial|YTD/.test(descriptivePointLabel(first.period) + ' ' + descriptivePointLabel(last.period))) return 'Recorded ' + label + ' totals: ' + descriptivePointLabel(first.period) + ' ' + diagnosticCurrency(first[metric]) + '; ' + descriptivePointLabel(last.period) + ' ' + diagnosticCurrency(last[metric]) + '. Incomplete-year coverage; this is not a like-for-like growth comparison.';
  return 'From ' + descriptivePointLabel(first.period) + ' to ' + descriptivePointLabel(last.period) + ', recorded ' + label
    + (delta === 0 ? ' stayed at ' + diagnosticCurrency(first[metric]) : (delta > 0 ? ' rose by ' : ' fell by ') + diagnosticCurrency(Math.abs(delta)))
    + '. This compares the endpoints; it does not describe every intervening period.';
}

function renderSalesMovement(opts) {
  const host = document.getElementById('page-revenue');
  if (!host) return;
  let card = document.getElementById('salesMovementCard');
  if (!card) {
    card = document.createElement('section'); card.id = 'salesMovementCard'; card.className = 'chart-card';
    card.innerHTML = '<div class="chart-header"><div><h2 class="chart-title">Month-to-month net sales change</h2><p class="chart-subtitle" id="salesMovementCaption"></p></div></div><div class="chart-wrap descriptive-movement-wrap"><canvas id="salesMovementChart" role="img" aria-label="Net sales change between adjacent observed full calendar months"></canvas></div><details class="chart-method"><summary>Calculation and exact values</summary><p>Current month minus the preceding calendar month, in pesos. Both months must be observed within the selection. Estimates, missing months, current incomplete months and partial custom boundary months are excluded. This monthly view is independent of display grain and YoY matching. Percent change requires a positive preceding-month total; it is shown in the table and tooltip.</p><div class="table-responsive-wrap"><table id="salesMovementTable" class="product-table"></table></div></details>';
    const comparison = document.getElementById('revenueDetailChart')?.closest('.chart-card');
    if (comparison) comparison.insertAdjacentElement('afterend', card); else host.append(card);
  }
  const source = descriptivePeriod === 'custom' ? descriptiveCustomMonthlyRows(customDateStart, customDateEnd) : dashboardMonthlyRows();
  const history = dashboardRawMonthlyRows().map(row => String(row.period)).filter(period => /^\d{4}-\d{2}$/.test(period)).sort();
  const start = descriptivePeriod === 'custom' ? customDateStart.slice(0,7) : history[0];
  const end = descriptivePeriod === 'custom' ? customDateEnd.slice(0,7) : history[history.length-1];
  const periods = [];
  if (start && end) for (let period = start; period <= end; period = shiftIsoPeriod(period, 1)) {
    const monthEnd = new Date(Date.UTC(Number(period.slice(0,4)), Number(period.slice(5,7)), 0)).toISOString().slice(0,10);
    if (!descriptivePeriodIncludes(period) || monthEnd >= descriptivePhtDate()) continue;
    if (descriptivePeriod === 'custom' && (period + '-01' < customDateStart || monthEnd > customDateEnd)) continue;
    periods.push(period);
  }
  const rows = diagnosticMonthlyMovement(source, periods);
  const matches = rows.filter(row => row.delta !== null);
  document.getElementById('salesMovementCaption').textContent = matches.length
    ? matches.length + ' adjacent observed month pairs · ' + descriptivePeriodLabel() + '. Blue = increase; red = decrease.'
    : 'No adjacent observed full-month pairs in this selection. Missing months remain unavailable.';
  const movementCanvas = document.getElementById('salesMovementChart');
  movementCanvas.closest('.chart-wrap').hidden = !matches.length;
  if (!matches.length) Chart.getChart(movementCanvas)?.destroy();
  else createChart('salesMovementChart', { type:'bar', data:{labels:rows.map(row=>row.period),datasets:[{label:'Month-to-month change (₱)',data:rows.map(row=>row.delta),backgroundColor:rows.map(row=>row.delta < 0 ? getRed(.8) : getColor(.8)),borderRadius:3}]}, options:{...opts,plugins:{...opts.plugins,legend:{display:false},tooltip:{callbacks:{label:context=>diagnosticCurrency(context.raw),afterBody:contexts=>{const row=rows[contexts[0]?.dataIndex];return row ? [row.previousPeriod+': '+diagnosticCurrency(row.previous),row.period+': '+diagnosticCurrency(row.current),'Change: '+diagnosticRate(row.rate)] : [];}}}},scales:{x:{ticks:{autoSkip:true,maxTicksLimit:window.innerWidth < 600 ? 6 : 12,maxRotation:0}},y:diagnosticAxis(rows.map(row=>row.delta),'Net sales change (₱)',getColor(),'left',true)}} });
  const table = document.getElementById('salesMovementTable'); table.replaceChildren();
  const head = table.createTHead().insertRow();
  ['Month','Previous month','Previous sales (₱)','Current sales (₱)','Change (₱)','Change (%)'].forEach(label=>{const th=document.createElement('th');th.scope='col';th.textContent=label;head.append(th);});
  const body=table.createTBody(); rows.forEach(row=>{const tr=body.insertRow();[row.period,row.previousPeriod,diagnosticCurrency(row.previous),diagnosticCurrency(row.current),diagnosticCurrency(row.delta),diagnosticRate(row.rate)].forEach(value=>tr.insertCell().textContent=String(value));});
}
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
    select.replaceChildren(...(all?[new Option('All available years','all')]:[]), ...options.map(y=>new Option(y+(years.includes(y)?'':' — no snapshot rows'),y)));
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

const diagnosticCurrencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', maximumFractionDigits: 2
});

function diagnosticCurrency(value) {
  return value == null ? 'Unavailable' : diagnosticCurrencyFormatter.format(value);
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
  installSalesOutputSections(document);
  installSalesMeasureControls();
  const outputScope = document.getElementById('salesOutputScope');
  if (outputScope) outputScope.textContent = descriptivePeriodLabel() + ' · Money in Philippine pesos · Shared filters apply across sections; STL states its independent scope.';
  const grainLabel = descriptiveUsesYearlyGrain() ? 'Yearly' : descriptiveUsesDailyGrain() ? 'Daily' : 'Monthly';
  const salesTitle = document.getElementById('salesComparisonSubtitle')?.parentElement?.querySelector('.chart-title');
  const trendSelect = document.getElementById('salesTrendMeasureSelect');
  const daily = descriptiveUsesDailyGrain();
  if (trendSelect) {
    trendSelect.disabled = daily;
    if (daily) trendSelect.value = 'sales';
  }
  const trendMeasure = trendSelect?.value || 'sales';
  const trendLabel = trendMeasure === 'profit' ? 'Gross Profit' : trendMeasure === 'both' ? 'Net Sales and Gross Profit' : 'Net Sales';
  if (salesTitle) salesTitle.textContent = grainLabel + ' ' + trendLabel;
  const marginCard = document.getElementById('marginChart')?.closest('.chart-card');
  const marginTitle = marginCard?.querySelector('.chart-title');
  if (marginTitle) marginTitle.textContent = grainLabel + ' Gross Margin %';
  const marginCaption = marginCard?.querySelector('.chart-subtitle');
  if (marginCaption) marginCaption.textContent = 'Gross profit ÷ revenue from the same margin-eligible records. Missing or nonpositive denominators are unavailable.';

  const definitions = document.querySelector('[data-metric-definitions]');
  const marginDefinition = definitions && [...definitions.querySelectorAll('p')].find(p => p.textContent.startsWith('Gross margin %'));
  if (marginDefinition) marginDefinition.textContent = 'Gross margin % = gross profit ÷ net sales for the same margin-eligible transactions × 100; transaction percentages are not averaged. A missing or nonpositive denominator means unavailable. Revenue-only rows are excluded from this rate.';
  const selectedRows = getDescriptiveDisplayRows();
  const priorDisplayRows = getDescriptivePriorDisplayRows();
  const yearly = descriptiveUsesYearlyGrain();
  const priorPeriod = descriptivePreviousPeriod;
  const revenue = selectedRows.map(row => row.revenue == null ? null : row.revenue);
  const profit = selectedRows.map(row => row.income == null ? null : row.income);
  const detailLabels = selectedRows.map(row => descriptivePointLabel(row.period));
  const detailPeriods = selectedRows.map(row => String(row.period));
  const observedMonths = new Map(selectedRows
    .filter(row => row.revenue != null || row.income != null)
    .map(row => [String(row.period), { revenue: row.revenue, income: row.income }]));
  const predictedRevenue = selectedRows.map(row => row.evidence === 'estimate' ? row.revenue : null);
  const predictedProfit = selectedRows.map(row => row.evidence === 'estimate' ? row.income : null);
  const predictedCount = predictedRevenue.filter(value => value != null).length;
  const dailyUnavailable = descriptiveUsesDailyGrain() && selectedRows.every(row => row.revenue == null);
  const detailDatasets = [
    { label: 'Net Sales Revenue', data: revenue, yAxisID: 'revenue', borderColor: getColor(), backgroundColor: getColor(.08), borderWidth: 2.5, pointRadius: descriptiveUsesDailyGrain() ? 1.5 : 3, tension: .25, fill: false, spanGaps: false },
    { label: 'Gross Profit', data: profit, yAxisID: 'grossProfit', borderColor: getAmber(), backgroundColor: getAmber(.08), borderWidth: 2.2, pointRadius: descriptiveUsesDailyGrain() ? 1.5 : 3, tension: .25, fill: false, spanGaps: false }
  ];
  if (comparisonMode === 'yoy') {
    for (const [metric, label, color] of [['revenue','Net Sales Revenue',getColor(.5)],['income','Gross Profit',getAmber(.5)]]) {
      detailDatasets.push({ label: 'Prior-year ' + label,
        data: priorDisplayRows.map(row => row[metric] == null ? null : row[metric]),
        yAxisID: 'revenue', borderColor: color, backgroundColor: 'transparent', borderDash: [2, 3],
        borderWidth: 2, pointRadius: 3, tension: 0, fill: false, spanGaps: false });
    }
  }
  detailDatasets.forEach(dataset => Object.assign(dataset, descriptiveEvidenceLine(dataset,
    dataset.label.startsWith('Prior-year') ? priorDisplayRows : selectedRows)));
  if (descriptiveUsesDailyGrain()) {
    for (let index = detailDatasets.length - 1; index >= 0; index--) {
      if (detailDatasets[index].label.includes('Gross Profit')) detailDatasets.splice(index, 1);
    }
  }
  // Both financial metrics use pesos. One shared scale preserves their magnitude,
  // and its bounds include comparison and gap-estimate series as well as actuals.
  detailDatasets.forEach(dataset => {
    dataset.yAxisID = 'revenue'; dataset.tension = 0;
    dataset.hidden = trendMeasure !== 'both' && (dataset.label.includes('Gross Profit') ? trendMeasure !== 'profit' : trendMeasure === 'profit');
  });
  const detailScales = {
    x: opts.scales.x,
    revenue: diagnosticAxis(detailDatasets.filter(dataset => !dataset.hidden).flatMap(dataset => dataset.data), trendLabel + ' (₱)', getColor(), 'left', true)
  };
  const trendCue = document.getElementById('salesTrendReadCue');
  if (trendCue) trendCue.textContent = 'Higher points mean larger peso amounts; gaps stay blank when records are unavailable.'
    + (trendMeasure === 'both' ? ' Sales and gross profit share one peso scale.' : '')
    + (daily ? ' Daily views show sales only; dated gross-profit evidence is unavailable.' : '');
  const trendReading = document.getElementById('salesTrendReading');
  if (trendReading) trendReading.textContent = trendMeasure === 'both'
    ? salesTrendReading(selectedRows,'revenue') + ' ' + salesTrendReading(selectedRows,'income')
    : salesTrendReading(selectedRows, trendMeasure === 'profit' ? 'income' : 'revenue');

  const subtitle = document.getElementById('salesComparisonSubtitle');
  if (subtitle) subtitle.textContent = dailyUnavailable
    ? 'Daily transaction data is unavailable for the selected period; monthly totals are not expanded into synthetic days.'
    : (yearly
      ? 'Annual revenue and gross profit for ' + descriptivePeriodLabel() + '; totals use only observed source months and incomplete latest years are identified.'
      : (descriptiveUsesDailyGrain() ? 'Daily' : 'Monthly') + ' revenue and gross profit for ' + descriptivePeriodLabel() + '; gaps mean unavailable observations, not zero sales.')
      + (predictedCount ? ' Connected dashed sections and triangle points are weighted gap estimates and are excluded from observed totals and YoY.' : '');
  if (subtitle && descriptivePeriod === 'custom' && !descriptiveUsesDailyGrain()) subtitle.textContent += ' Historical partial months require dated transactions; whole-month totals are not assigned to partial dates.';
  if (subtitle && yearly && comparisonMode === 'yoy') subtitle.textContent += ' Both yearly lines use only matched observed months; KPI totals retain the full selected observed scope.';
  if (subtitle && descriptiveUsesDailyGrain() && priorDisplayRows.some(row => row.alignment_note)) subtitle.textContent += ' Leap-day alignment counts each prior-year day once; duplicate matches are unavailable.';
  if (subtitle) subtitle.textContent += ' ' + descriptiveTrendSummary(selectedRows);
  if (subtitle) {
    const card = subtitle.closest('.chart-card');
    let notes = card?.querySelector('#salesComparisonMethod');
    if (card && !notes) {
      notes = document.createElement('details'); notes.id = 'salesComparisonMethod'; notes.className = 'chart-method';
      const heading = document.createElement('summary'); heading.textContent = 'Scope and calculation notes';
      const text = document.createElement('p'); notes.append(heading, text); card.append(notes);
    }
    if (notes) notes.querySelector('p').textContent = subtitle.textContent;
    subtitle.textContent = dailyUnavailable ? 'Daily observations are unavailable for this selection.'
      : descriptivePeriodLabel() + ' · Values in pesos; blank periods are unavailable.'
        + (predictedCount ? ' Dashed sections and triangles mark gap estimates.' : '')
        + (yearly && comparisonMode === 'yoy' ? ' Yearly lines use matched observed months.' : '')
        + (descriptiveUsesDailyGrain() && priorDisplayRows.some(row => row.alignment_note) ? ' Leap-day alignment counts each prior-year day once.' : '');
  }
  createChart('revenueDetailChart', {
    type: 'line',
    data: { labels: detailLabels, datasets: detailDatasets },
    options: {
      ...opts,
      plugins: {
        ...opts.plugins,
        legend: {
          position: 'top',
          align: 'start',
          onClick: () => {},
          labels: { usePointStyle: true, boxWidth: 8, padding: 14, font: { size: 11 },
            filter: item => !detailDatasets[item.datasetIndex]?.hidden }
        },
        tooltip: {
          ...opts.plugins.tooltip,
          callbacks: { label: descriptiveEvidenceTooltip }
        }
      },
      scales: {
        ...detailScales,
        x: {
          ...detailScales.x,
          ticks: {
            ...((detailScales.x && detailScales.x.ticks) || {}),
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: window.innerWidth < 600 ? 5 : 12
          }
        }
      }
    }
  });

  const rows = selectedRows.map((row, index) => {
    const previousPeriod = priorPeriod(String(row.period));
    if (yearly) {
      const { current, previous, matchedMonths } = descriptiveYearComparison(row.period);
      const delta = matchedMonths ? current - previous : null;
      return { label: descriptivePointLabel(row.period) + ' · ' + matchedMonths + '/12 months matched', period: String(row.period), previousPeriod,
        current: matchedMonths ? current : null, previous: matchedMonths ? previous : null,
        delta, rate: delta != null && previous > 0 ? delta / previous * 100 : null };
    }
    const previous = priorDisplayRows[index];
    const hasCurrent = row.evidence !== 'estimate' && row.revenue != null && Number.isFinite(Number(row.revenue));
    const hasPrevious = previous && previous.evidence !== 'estimate' && previous.revenue != null && Number.isFinite(Number(previous.revenue));
    const delta = hasCurrent && hasPrevious ? Number(row.revenue) - Number(previous.revenue) : null;
    return {
      label: descriptivePointLabel(row.period), period: String(row.period), previousPeriod,
      current: hasCurrent ? Number(row.revenue) : null, previous: hasPrevious ? Number(previous.revenue) : null,
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
    ? descriptivePeriodLabel() + ' versus the same calendar periods one year earlier: ' + diagnosticCurrency(previousTotal) + ' → ' + diagnosticCurrency(currentTotal) + '; change ' + diagnosticCurrency(totalDelta) + ' (' + diagnosticRate(totalRate) + '). ' + matched.length + '/' + rows.length + ' periods matched.' + (yearly ? ' Annual comparisons include only months observed in both years; see each year’s matched coverage.' : '')
    : 'No same-period prior-year observations are available for ' + descriptivePeriodLabel() + '.';
  if (summary && yearly) summary.textContent = descriptivePeriodLabel() + ': Annual comparisons include only months observed in both years. Each year uses its preceding year. ' + matched.length + '/' + rows.length + ' yearly comparisons available. The table states the matched coverage; comparisons are not summed into an all-history growth rate.';
  const growthMeasure = document.getElementById('salesGrowthMeasureSelect')?.value || 'percent';
  const growthPercent = growthMeasure === 'percent';
  const growthValues = rows.map(row => growthPercent ? row.rate : row.delta);
  const growthCard = document.getElementById('growthChart')?.closest('.chart-card');
  const growthTitle = growthCard?.querySelector('.chart-title');
  if (growthTitle) growthTitle.textContent = growthPercent ? 'Year-over-year sales change (%)' : 'Year-over-year sales change (₱)';
  const growthCaption = growthCard?.querySelector('.chart-subtitle');
  if (growthCaption) growthCaption.textContent = 'Same calendar periods in consecutive years, using only observations available in both.';
  const growthCue = document.getElementById('salesGrowthReadCue');
  if (growthCue) growthCue.textContent = 'Above zero: sales increased. Below zero: sales decreased. Blank: the comparison is unavailable.'
    + (growthPercent ? ' Percent change also requires positive prior-year sales; inspect pesos or the exact values for other baselines.' : ' Peso change remains available for matched zero or negative baselines.');
  createChart('growthChart', {
    type: 'bar',
    data: {
      labels: rows.map(row => descriptivePointLabel(row.period)),
      datasets: [{ label: growthPercent ? 'YoY net sales growth (%)' : 'YoY net sales change (₱)',
        data: growthValues, yAxisID: 'growth', backgroundColor: growthValues.map(value => value < 0 ? getRed(.8) : getColor(.8)), borderRadius: 4 }]
    },
    options: {
      ...opts,
      plugins: {
        ...opts.plugins,
        legend: {
          position: 'top',
          align: 'start',
          labels: { usePointStyle: true, boxWidth: 8, padding: 12, font: { size: 11 } }
        },
        tooltip: {
          ...opts.plugins.tooltip, callbacks: {
            label: context => context.dataset.label + ': ' + (growthPercent ? diagnosticRate(context.raw) : diagnosticCurrency(context.raw)),
            afterBody: contexts => {
              const row = rows[contexts[0]?.dataIndex];
              return row ? [row.previousPeriod + ': ' + diagnosticCurrency(row.previous), row.period + ': ' + diagnosticCurrency(row.current), 'Change: ' + diagnosticCurrency(row.delta), 'Growth: ' + diagnosticRate(row.rate), ...(yearly ? [row.label] : [])] : [];
            }
          }
        }
      },
      scales: {
        x: {
          ...opts.scales.x,
          ticks: {
            ...((opts.scales.x && opts.scales.x.ticks) || {}),
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: window.innerWidth < 600 ? 5 : 10
          }
        },
        growth: growthPercent
          ? { type: 'linear', position: 'left', beginAtZero: true, ticks: { callback: value => Number(value).toLocaleString('en-PH', { maximumFractionDigits: 1 }) + '%' }, title: { display: true, text: 'YoY net sales growth (%)' } }
          : diagnosticAxis(growthValues, 'YoY net sales change (₱)', getColor(), 'left', true)
      }
    }
  });

  renderSalesMovement(opts);
  const table = document.getElementById('salesGrowthTable');
  if (table) {
    table.replaceChildren();
    const head = table.createTHead().insertRow();
    [(yearly ? 'Year' : (descriptiveUsesDailyGrain() ? 'Day' : 'Month')), 'Current period', 'Prior-year period', 'Prior-year net sales (₱)', 'Current net sales (₱)', 'Change (₱)', 'Growth (%)'].forEach(label => {
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
