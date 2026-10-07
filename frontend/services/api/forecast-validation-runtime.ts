export const FORECAST_VALIDATION_MARKUP = String.raw`
<style>
[data-forecast-validation] { margin-top: 10px; max-width: 100%; box-sizing: border-box; overflow-x: hidden; }
[data-forecast-validation] canvas { max-width: 100%; }
[data-forecast-validation] .forecast-controls { display: flex; gap: 14px; flex-wrap: wrap; margin: 16px 0; align-items: flex-end; max-width: 100%; }
[data-forecast-validation] label { font-size: 11px; font-weight: 700; color: var(--text-secondary); max-width: 100%; }
[data-forecast-validation] select, [data-forecast-validation] input[type="text"] { display: block; width: 100%; max-width: 240px; box-sizing: border-box; padding: 7px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-card,#fff); color: var(--text-primary); font-size: 12px; margin-top: 4px; }
[data-forecast-validation] p { line-height: 1.6; margin: 10px 0; word-break: break-word; }
[data-forecast-validation] .forecast-hero-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 16px 0; }
[data-forecast-validation] .forecast-hero-card { padding: 14px 16px; border: 1px solid var(--border); border-radius: 8px; background: #FFFFFF; box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04); }
[data-forecast-validation] .forecast-hero-card .hero-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
[data-forecast-validation] .forecast-hero-card .hero-val { font-size: 20px; font-weight: 800; color: var(--text-primary); margin: 4px 0 2px 0; }
[data-forecast-validation] .forecast-hero-card .hero-sub { font-size: 11px; color: var(--text-secondary); }
[data-forecast-validation] .decomp-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 16px 0; }
[data-forecast-validation] .decomp-card { background: #FFFFFF; border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04); }
[data-forecast-validation] .decomp-title { font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
[data-forecast-validation] .decomp-val { font-size: 16px; font-weight: 800; color: var(--accent,#0ea5e9); margin-bottom: 2px; }
[data-forecast-validation] .decomp-desc { font-size: 11px; color: var(--text-muted); line-height: 1.4; }
@media(max-width:900px){[data-forecast-validation] .forecast-hero-grid{grid-template-columns:repeat(2,minmax(0,1fr))}[data-forecast-validation] .decomp-grid{grid-template-columns:1fr}}
@media(max-width:600px){[data-forecast-validation] .forecast-hero-grid{grid-template-columns:1fr}[data-forecast-validation] .chart-header{flex-wrap:wrap}[data-forecast-validation] select{max-width:100%}}
</style>
<div class="chart-card" data-forecast-validation>
  <div class="chart-header"><div><div class="chart-title">Monthly forecast evidence</div><div class="chart-subtitle">Observed sales, historical evaluation and publication status</div></div><button class="btn btn-secondary" id="forecastExport" onclick="exportForecastValidationCSV()" disabled>Export displayed evidence CSV</button></div>
  <div class="forecast-controls">
    <label>Buyer scope<select id="forecastSector" onchange="changeForecastScope('sector')"><option>All</option><option>Government</option><option>Private</option><option>Internal</option><option>Unknown</option></select></label>
    <label>Product scope<select id="forecastProduct" onchange="changeForecastScope('product')"><option value="">All products — revenue only</option></select></label>
    <label>Target measure<select id="forecastMetric" onchange="changeForecastScope('metric')"><option value="revenue">Recorded net sales (₱)</option><option value="quantity">Delivered source units — eligibility required</option></select></label>
    <label>Model<select id="forecastModel" onchange="renderForecastValidation()"><option value="">Unavailable</option></select></label>
    <label>Display window<select id="forecastHorizon" onchange="renderForecastValidation()"><option value="3">3 months from current month</option><option value="6">6 months from current month</option><option value="12" selected>12 months from current month</option></select></label>
  </div>
  <section class="analytical-output-summary" aria-label="Forecast finding and evidence quality">
    <p class="analytical-output-takeaway" id="forecastTakeaway">Loading forecast evidence…</p>
    <p class="analytical-output-scope" id="forecastStatus" role="status">Validation status unavailable</p>
    <p class="analytical-output-scope" id="forecastWindow"></p>
    <p class="analytical-output-review" id="forecastReview">Review validation and publication status before using any prediction.</p>
  </section>
  <p class="chart-subtitle" id="forecastAssumptions">Historical error is retrospective evidence. Revenue measures commercial sales; source units require product eligibility.</p>
  <div class="forecast-hero-grid" id="forecastMetrics">
    <div class="forecast-hero-card"><div class="hero-label">MAE</div><div class="hero-val" id="kpiForecastMae">Unavailable</div><div class="hero-sub">Mean absolute error in target units</div></div>
    <div class="forecast-hero-card"><div class="hero-label">WAPE</div><div class="hero-val" id="kpiForecastWape">Unavailable</div><div class="hero-sub">Absolute error / absolute actuals</div></div>
    <div class="forecast-hero-card"><div class="hero-label">RMSE</div><div class="hero-val" id="kpiForecastRmse">Unavailable</div><div class="hero-sub">Root mean squared error</div></div>
    <div class="forecast-hero-card"><div class="hero-label">Signed bias</div><div class="hero-val" id="kpiForecastBias">Unavailable</div><div class="hero-sub">Prediction minus actual in target units</div></div>
  </div>
  <p class="chart-subtitle" id="forecastEvaluationScope"></p>
  <div class="chart-wrap forecast-chart-wrap chart-hero" style="position:relative"><canvas id="forecastChart" role="img" aria-label="Observed actuals, historical backtests and available future predictions"></canvas></div>
  <p class="chart-subtitle" id="forecastBandNote"></p>
  <h3 class="chart-title">Historical model comparison</h3>
  <p class="chart-subtitle">Compare errors on common evaluation keys. A lower historical error does not establish future accuracy or model approval.</p>
  <div style="overflow-x:auto"><table id="forecastBenchmarkTable" class="product-table" aria-label="Models compared on common evaluation keys"></table></div>
  <details><summary>Backtest error and bias by forecast lead</summary><div style="overflow-x:auto"><table id="forecastLeadTable" class="product-table"></table></div></details>
  <details><summary>Displayed monthly evidence, origins and leads</summary><div style="overflow-x:auto"><table id="forecastEvidenceTable" class="product-table"></table></div></details>
  <details class="analytical-output-notes"><summary>Validation methods, coverage and source</summary>
    <p id="forecastCoverage"></p><p id="forecastSource"></p>
    <p>Revenue is a commercial measure. It does not establish medicine demand, stock positions or procurement requirements. Disease/weather effects and model decomposition are unavailable unless separately published.</p>
  </details>
</div>
`;

export const FORECAST_VALIDATION_SCRIPT = String.raw`
let forecastValidationData = null;
let forecastValidationExport = [];
let forecastValidationModel = '';

function changeForecastScope(field) {
  const el = id => document.getElementById(id);
  if (field === 'sector') { el('forecastProduct').value = ''; el('forecastMetric').value = 'revenue'; }
  window.dispatchEvent(new CustomEvent('medshield:forecast-change'));
}

function setForecastValidationData(data, error) {
  const period = value => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  const asOf = data?.source?.as_of?.slice(0, 7);
  if (data && (!Array.isArray(data.actuals) || data.actuals.some(r => !period(r.period) || (asOf && r.period >= asOf)) || (data.origin && (!period(data.origin) || (asOf && data.origin >= asOf))))) {
    data = null;
    error = 'Forecast evidence rejected: actuals must be valid closed calendar months before the source as-of month.';
  }
  forecastValidationData = data && data.views && data.scope && data.source && data.models ? data : null;
  if (forecastValidationData) {
    ['sector', 'metric'].forEach(key => {
      const control = document.getElementById(key === 'sector' ? 'forecastSector' : 'forecastMetric');
      if ([...control.options].some(option => option.value === data.scope[key])) control.value = data.scope[key];
    });
    const product = document.getElementById('forecastProduct');
    product.replaceChildren(new Option('All products — revenue only', ''));
    (data.products || []).forEach(p => product.add(new Option(p, p)));
    product.value = data.scope.product || '';
  }
  renderForecastValidation(error);
}

function renderForecastValidation(error) {
  const el = id => document.getElementById(id);
  if (!el('forecastStatus')) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const fmt = value => finite(value) ? value.toLocaleString('en-PH', {maximumFractionDigits: 2}) : 'Unavailable';
  ['forecastChart', 'overviewForecastChart'].forEach(id => { const canvas = el(id); if (canvas) Chart.getChart(canvas)?.destroy(); });
  ['forecastWindow','forecastBandNote','forecastEvaluationScope','forecastCoverage','forecastBenchmarkTable','forecastLeadTable','forecastEvidenceTable','forecastSource','forecastAssumptions'].forEach(id => { if(el(id)) el(id).textContent = ''; });
  el('forecastTakeaway').textContent = 'Forecast evidence unavailable.';
  el('forecastReview').textContent = 'Review validation and publication status before using any prediction.';
  ['kpiForecastMae','kpiForecastWape','kpiForecastRmse','kpiForecastBias'].forEach(id => el(id).textContent = 'Unavailable');
  forecastValidationExport = [];
  forecastValidationModel = '';
  el('forecastExport').disabled = true;
  const data = forecastValidationData;
  if (!data) {
    el('forecastModel').replaceChildren(new Option('Unavailable', ''));
    el('forecastStatus').textContent = error || 'Forecast evidence unavailable. No example forecasts substituted.';
    el('forecastReview').textContent = 'Restore source evidence before evaluating or using a forecast.';
    if (el('overviewForecastStatus')) el('overviewForecastStatus').textContent = el('forecastStatus').textContent;
    return;
  }
  const h = Number(el('forecastHorizon').value);
  const view = data.views[String(h)];
  const previous = el('forecastModel').value;
  el('forecastModel').replaceChildren();
  Object.keys(view?.models || {}).forEach(key => el('forecastModel').add(new Option(data.models[key] || key, key)));
  if (view?.models[previous]) el('forecastModel').value = previous;
  const key = el('forecastModel').value;
  forecastValidationModel = key;
  const name = data.models[key] || key;
  const protocol = view?.evaluation_protocol || data.evaluation_protocol || 'Unavailable';
  const scope = data.scope.sector + ' · ' + (data.scope.product || 'All products') + ' · ' + data.scope.unit;
  const approved = data.status === 'published' && data.publication_status === 'approved' && !!data.run_id && !!data.release_id;
  el('forecastStatus').textContent = (approved ? 'Approved published forecast' : data.status === 'published' ? 'Published model evidence — approval not established' : view?.models[key] ? 'Retrospective benchmark evidence' : 'No eligible forecast evidence') + ' · ' + (data.publication_status || 'Publication status unavailable') + ' · ' + scope;
  el('forecastReview').textContent = approved ? 'Review supported leads, intervals and source freshness before applying the published forecast.' : 'Review benchmark errors and reporting coverage. No approved published forecast is established for this scope.';
  el('forecastAssumptions').textContent = 'Monthly ' + data.scope.unit + ' · ' + scope + ' · historical errors are retrospective, not a guarantee of future accuracy. ' + (data.scope.metric === 'revenue' || data.scope.unit === 'PHP' ? 'Revenue does not establish medicine demand or stock requirements.' : 'Delivered source units remain specific to the eligible product and its source packaging.');
  if (el('overviewForecastStatus')) el('overviewForecastStatus').textContent = el('forecastStatus').textContent;
  el('forecastSource').textContent = 'Source: ' + (data.source.file || 'Unavailable') + ' · checksum ' + (data.source.checksum || 'Unavailable') + ' · reporting coverage: ' + (data.reporting_coverage_status || 'Unavailable') + ' · ' + (data.limitations || []).join(' ');
  if (!view || !view.models[key]) {
    el('forecastTakeaway').textContent = 'No eligible model evidence for this scope.';
    el('forecastWindow').textContent = 'No eligible model evidence for this scope. ' + (data.limitations || []).join(' ');
    return;
  }
  const result = view.models[key];
  const future = result.forecast || [];
  const backtest = result.backtest || [];
  const history = data.actuals.slice(-24);
  const monthNo = p => { const [year, month] = p.split('-').map(Number); return year * 12 + month - 1; };
  const periodName = n => Math.floor(n / 12) + '-' + String(n % 12 + 1).padStart(2, '0');
  const periods = [...history, ...backtest, ...future].map(r => r.period).sort();
  const all = [];
  if (periods.length) for (let n = monthNo(periods[0]), last = monthNo(periods.at(-1)); n <= last; n++) all.push(periodName(n));
  const actual = new Map(history.map(r => [r.period, r.actual]));
  const past = new Map(backtest.map(r => [r.period, r]));
  const next = new Map(future.map(r => [r.period, r]));
  const points = (map, field) => all.map(p => finite(map.get(p)?.[field]) ? map.get(p)[field] : null);
  const lead = p => p.lead ?? p.lead_months ?? (p.origin ? monthNo(p.period) - monthNo(p.origin) : null);
  el('forecastWindow').textContent = (future.length ? future[0].period + ' to ' + future.at(-1).period + ' · ' + h + ' displayed months · true forecast leads ' + lead(future[0]) + '–' + lead(future.at(-1)) : 'No future points published') + ' · last actual ' + (data.last_actual_period || data.origin || 'Unavailable') + ' · ' + (data.months_since_origin ?? 'Unavailable') + ' closed months behind source as-of ' + data.source.as_of + '.';
  const datasets = [
    {label:'Observed actuals (' + data.scope.unit + ')',data:all.map(p => finite(actual.get(p)) ? actual.get(p) : null),borderColor:'#1E3A5F',pointRadius:3},
    {label:name + ' historical backtest',data:points(past,'prediction'),borderColor:'#D97706',borderDash:[5,4],pointRadius:3},
    {label:name + ' future prediction',data:points(next,'prediction'),borderColor:'#0EA5E9',borderDash:[6,3],pointRadius:3}
  ];
  // Only draw bounds accompanied by an explicit supported interval definition.
  const supported = p => finite(p.lower) && finite(p.upper) && p.lower <= p.upper && !p.interval_reason && (p.interval_level || p.interval?.nominal_level);
  if (future.some(supported)) {
    datasets.push({label:'Published interval upper',data:all.map(p => supported(next.get(p) || {}) ? next.get(p).upper : null),borderColor:'transparent',backgroundColor:'rgba(14,165,233,0.16)',fill:'+1',pointRadius:0});
    datasets.push({label:'Published interval lower',data:all.map(p => supported(next.get(p) || {}) ? next.get(p).lower : null),borderColor:'transparent',pointRadius:0});
  }
  const compact = value => Number(value).toLocaleString('en-PH',{notation:'compact',maximumFractionDigits:1});
  const options = {responsive:true,maintainAspectRatio:false,spanGaps:false,interaction:{mode:'index',intersect:false},scales:{x:{ticks:{maxTicksLimit:window.innerWidth < 600 ? 7 : 14,maxRotation:0},title:{display:true,text:'Calendar month'}},y:{ticks:{callback:compact},title:{display:true,text:data.scope.unit}}},plugins:{legend:{position:'bottom',labels:{boxWidth:12,font:{size:11}}},tooltip:{callbacks:{label:context => context.dataset.label + ': ' + fmt(context.raw)}}}};
  ['forecastChart','overviewForecastChart'].forEach(id => { if(el(id)) new Chart(el(id), {type:'line',data:{labels:all,datasets:datasets.map(d => ({...d}))},options}); });
  const m = result.metrics || {};
  const futureCount = future.filter(p => finite(p.prediction)).length;
  el('forecastTakeaway').textContent = name + ': ' + (finite(m.wape) ? fmt(m.wape) + '% historical WAPE across ' + (m.n ?? 0) + ' scored observations' : 'historical WAPE unavailable') + '. ' + (futureCount ? futureCount + '/' + future.length + ' displayed future months have prediction values.' : 'No prediction values are available for the displayed future window.');
  el('forecastChart').setAttribute('aria-label', name + ' · monthly ' + data.scope.unit + ' · ' + scope + ' · observed values, historical backtest and future prediction evidence');
  el('kpiForecastMae').textContent = fmt(m.mae);
  el('kpiForecastWape').textContent = finite(m.wape) ? fmt(m.wape) + '%' : 'Unavailable';
  el('kpiForecastRmse').textContent = fmt(m.rmse);
  el('kpiForecastBias').textContent = fmt(m.bias);
  el('forecastEvaluationScope').textContent = 'Protocol: ' + protocol + ' · training cutoff ' + (view.training_end || 'Unavailable') + ' · evaluation ' + view.evaluation_start + ' to ' + view.evaluation_end + ' · ' + (m.n ?? 0) + ' scored observations. Missing actuals stay unavailable.';
  el('forecastBandNote').textContent = future.filter(supported).length + '/' + future.length + ' future points have supported published intervals. ' + [...new Set(future.map(p => p.interval_reason).filter(Boolean))].join('; ');
  el('forecastCoverage').textContent = 'Measured interval coverage: ' + fmt(result.band_coverage?.percent) + (finite(result.band_coverage?.percent) ? '%' : '') + ' · scored interval observations: ' + (result.band_coverage?.n ?? 0) + ' · exact common evaluation keys: ' + (view.common_scored_months ?? 'Unavailable') + '.';
  el('forecastEvaluationScope').textContent += ' ' + (view.comparison_label || '');
  el('forecastBenchmarkTable').innerHTML = '<thead><tr><th>Model</th><th>Common observations</th><th>MAE</th><th>RMSE</th><th>WAPE (%)</th><th>Signed bias</th><th>Selection</th></tr></thead><tbody>' + Object.entries(view.comparisons || view.models).map(([model, value]) => { const c = value.comparison_metrics || {}; return '<tr><td>' + esc(data.models[model] || model) + '</td><td>' + fmt(c.n) + '</td><td>' + fmt(c.mae) + '</td><td>' + fmt(c.rmse) + '</td><td>' + fmt(c.wape) + '</td><td>' + fmt(c.bias) + '</td><td>' + esc(value.selection_reason || 'Exploratory benchmark; no champion approval') + '</td></tr>'; }).join('') + '</tbody>';
  el('forecastLeadTable').innerHTML = '<thead><tr><th>Lead</th><th>Target month</th><th>Absolute error</th><th>Signed error</th><th>Scored observations</th></tr></thead><tbody>' + backtest.map(p => { const valid = finite(p.actual) && finite(p.prediction); const error = valid ? p.prediction - p.actual : null; return '<tr><td>' + fmt(lead(p)) + '</td><td>' + esc(p.period) + '</td><td>' + fmt(valid ? Math.abs(error) : null) + '</td><td>' + fmt(error) + '</td><td>' + (valid ? 1 : 0) + '</td></tr>'; }).join('') + '</tbody>';
  forecastValidationExport = all.map(period => {
    const point = next.get(period) || past.get(period);
    return {period,phase:next.has(period) ? 'Future prediction' : past.has(period) ? 'Historical backtest' : actual.has(period) ? 'Historical actual' : 'Missing history',actual:actual.has(period) ? actual.get(period) : null,prediction:point?.prediction ?? null,lower:point && supported(point) ? point.lower : null,upper:point && supported(point) ? point.upper : null,origin:point?.origin || '',lead:point ? lead(point) : null,samples:point?.band_sample_count ?? null,interval_level:point?.interval_level ?? point?.interval?.nominal_level ?? null,reason:point?.missing_reason || '',interval_reason:point?.interval_reason || '',model:key,protocol};
  });
  el('forecastEvidenceTable').innerHTML = '<thead><tr><th>Month</th><th>Evidence</th><th>Actual</th><th>Prediction</th><th>Lower</th><th>Upper</th><th>Origin</th><th>Lead</th><th>Unavailable reason</th></tr></thead><tbody>' + forecastValidationExport.map(r => '<tr><td>' + esc(r.period) + '</td><td>' + r.phase + '</td><td>' + fmt(r.actual) + '</td><td>' + fmt(r.prediction) + '</td><td>' + fmt(r.lower) + '</td><td>' + fmt(r.upper) + '</td><td>' + esc(r.origin) + '</td><td>' + fmt(r.lead) + '</td><td>' + esc([r.reason,r.interval_reason].filter(Boolean).join('; ')) + '</td></tr>').join('') + '</tbody>';
  el('forecastExport').disabled = !forecastValidationExport.length;
}

function exportForecastValidationCSV() {
  if (!forecastValidationData || !forecastValidationExport.length) return;
  const d = forecastValidationData;
  const h = document.getElementById('forecastHorizon').value;
  const quote = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const safe = v => typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
  const rows = [['period','evidence_type','actual','prediction','lower','upper','origin','lead_months','interval_sample_count','interval_level','missing_reason','interval_reason','model','evaluation_protocol','sector','product','unit','display_horizon_months','source_checksum','run_id','release_id','publication_status'], ...forecastValidationExport.map(r => [r.period,r.phase,r.actual,r.prediction,r.lower,r.upper,r.origin,r.lead,r.samples,r.interval_level,r.reason,r.interval_reason,r.model,r.protocol,d.scope.sector,d.scope.product,d.scope.unit,h,d.source.checksum,d.run_id,d.release_id,d.publication_status])];
  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(v => quote(safe(v))).join(',')).join('\r\n')], {type:'text/csv;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = 'medshield-forecast-evidence-' + h + '-months.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}
`;
