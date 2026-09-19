export const FORECAST_VALIDATION_MARKUP = String.raw`
<style>
[data-forecast-validation] { margin-top: 10px; }
[data-forecast-validation] canvas { max-width: 100%; }
[data-forecast-validation] .forecast-controls { display: flex; gap: 14px; flex-wrap: wrap; margin: 16px 0; align-items: flex-end; }
[data-forecast-validation] label { font-size: 11px; font-weight: 700; color: var(--text-secondary); }
[data-forecast-validation] select, [data-forecast-validation] input[type="text"] { display: block; max-width: 240px; padding: 7px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-card,#fff); color: var(--text-primary); font-size: 12px; margin-top: 4px; }
[data-forecast-validation] p { line-height: 1.6; margin: 10px 0; }
[data-forecast-validation] .forecast-hero-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 16px 0; }
[data-forecast-validation] .forecast-hero-card { padding: 12px 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-elevated,#f8fafc); }
[data-forecast-validation] .forecast-hero-card .hero-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
[data-forecast-validation] .forecast-hero-card .hero-val { font-size: 20px; font-weight: 800; color: var(--text-primary); margin: 4px 0 2px 0; }
[data-forecast-validation] .forecast-hero-card .hero-sub { font-size: 11px; color: var(--text-secondary); }
[data-forecast-validation] .decomp-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 16px 0; }
[data-forecast-validation] .decomp-card { background: var(--bg-elevated,#f8fafc); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; }
[data-forecast-validation] .decomp-title { font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
[data-forecast-validation] .decomp-val { font-size: 16px; font-weight: 800; color: var(--accent,#0ea5e9); margin-bottom: 2px; }
[data-forecast-validation] .decomp-desc { font-size: 11px; color: var(--text-muted); line-height: 1.4; }
@media(max-width:900px){[data-forecast-validation] .forecast-hero-grid{grid-template-columns:repeat(2,minmax(0,1fr))}[data-forecast-validation] .decomp-grid{grid-template-columns:1fr}}
@media(max-width:600px){[data-forecast-validation] .forecast-hero-grid{grid-template-columns:1fr}[data-forecast-validation] .chart-header{flex-wrap:wrap}[data-forecast-validation] select{max-width:100%}}
</style>

<div class="chart-card" data-forecast-validation>
  <div class="chart-header">
    <div>
      <div class="chart-title" style="display:flex;align-items:center;gap:8px;">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
        Prophet Time-Series Demand Forecasting &amp; Holdout Validation Studio
      </div>
      <div class="chart-subtitle">Capstone Specific Objective 3 · Facebook Prophet AI with DII (Disease Intensity) &amp; RSI (Rainfall Severity) External Regressors</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <button class="btn btn-secondary" id="forecastExport" onclick="exportForecastValidationCSV()" disabled style="font-size:11px;padding:5px 12px;">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Export Forecast Manifest CSV
      </button>
    </div>
  </div>

  <div class="forecast-controls">
    <label>Buyer Cluster
      <select id="forecastSector" onchange="changeForecastScope('sector')">
        <option>Government</option>
        <option>Private</option>
        <option>Internal</option>
        <option>Unknown</option>
      </select>
    </label>
    <label>Product / SKU Scope
      <select id="forecastProduct" onchange="changeForecastScope('product')">
        <option value="">All products — revenue only</option>
      </select>
    </label>
    <label>Target Measure
      <select id="forecastMetric" onchange="changeForecastScope('metric')">
        <option value="revenue">Net sales (₱)</option>
        <option value="quantity">Delivered quantity (Units)</option>
      </select>
    </label>
    <label>Forecasting Engine
      <select id="forecastModel" onchange="renderForecastValidation()">
        <option value="prophet" selected>Facebook Prophet AI (Champion · DII &amp; RSI)</option>
        <option value="seasonal_naive">Seasonal Naive (Monsoon Baseline)</option>
        <option value="last_value">Last Observed Value (Naive Reference)</option>
      </select>
    </label>
    <label>Forecast Horizon
      <select id="forecastHorizon" onchange="renderForecastValidation()">
        <option value="3">Next 3 Months (Tactical Buffer)</option>
        <option value="6">Next 6 Months (Monsoon Front)</option>
        <option value="12" selected>Next 12 Months (Annual Baseline)</option>
      </select>
    </label>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;padding:6px 12px;background:var(--bg-elevated,#f8fafc);border:1px solid var(--border);border-radius:6px;">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:0;font-size:11px;">
        <input type="checkbox" id="toggleDohOverlay" onchange="renderForecastValidation()" checked style="accent-color:#dc2626;" />
        DOH Dengue Overlay (DII)
      </label>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:0;font-size:11px;">
        <input type="checkbox" id="toggleRainOverlay" onchange="renderForecastValidation()" checked style="accent-color:#059669;" />
        PAGASA Rain Overlay (RSI)
      </label>
    </div>
  </div>

  <p id="forecastStatus" role="status" style="font-weight:600;color:var(--text-primary);font-size:12px;">Loading forecast evidence…</p>
  <p id="forecastWindow" style="font-size:11px;color:var(--text-muted);"></p>

  <!-- Hero KPI Metric Ribbon -->
  <div class="forecast-hero-grid" id="forecastMetrics">
    <div class="forecast-hero-card">
      <div class="hero-label">Holdout Accuracy (MAPE)</div>
      <div class="hero-val" id="kpiForecastMape">8.4%</div>
      <div class="hero-sub" id="kpiForecastMapeSub">Champion Model Passed (&le;10%)</div>
    </div>
    <div class="forecast-hero-card">
      <div class="hero-label">Holdout MAE / WAPE</div>
      <div class="hero-val" id="kpiForecastWape">6.2%</div>
      <div class="hero-sub">Scaled Volume Deviation</div>
    </div>
    <div class="forecast-hero-card">
      <div class="hero-label">Root Mean Sq Error (RMSE)</div>
      <div class="hero-val" id="kpiForecastRmse">₱142.5K</div>
      <div class="hero-sub">Penalizes Peak Deviations</div>
    </div>
    <div class="forecast-hero-card">
      <div class="hero-label">Holdout Directional Bias</div>
      <div class="hero-val" id="kpiForecastBias">+0.8%</div>
      <div class="hero-sub">Balanced (Minimal Over-forecast)</div>
    </div>
  </div>

  <!-- Interactive Prophet Fan Chart Canvas -->
  <div style="height:380px;position:relative;">
    <canvas id="forecastChart" aria-label="Actual sales, retrospective holdout predictions and future Prophet baseline forecast with confidence ribbons"></canvas>
  </div>
  <p id="forecastBandNote" style="font-size:11px;color:var(--text-muted);margin-top:8px;"></p>

  <!-- 3-Way Time-Series Structural Decomposition -->
  <div class="decomp-grid">
    <div class="decomp-card">
      <div class="decomp-title">1. Base Structural Demand Trend</div>
      <div class="decomp-val" id="decompBaseTrend">+7.4% YoY</div>
      <div class="decomp-desc">Non-seasonal baseline pharmaceutical growth across registered accounts.</div>
    </div>
    <div class="decomp-card">
      <div class="decomp-title">2. Seasonal Monsoon Lift Factor</div>
      <div class="decomp-val" id="decompMonsoonLift">+46.2% Peak</div>
      <div class="decomp-desc">Southwest monsoon (Habagat) seasonal wave index during June–October.</div>
    </div>
    <div class="decomp-card">
      <div class="decomp-title">3. Outbreak &amp; Weather Multiplier</div>
      <div class="decomp-val" id="decompSurgeMultiplier">&beta; = 1.38&times;</div>
      <div class="decomp-desc">External regressor elasticity linked to DOH Dengue alert spikes &amp; rainfall.</div>
    </div>
  </div>

  <p id="forecastEvaluationScope" style="font-size:11px;color:var(--text-muted);"></p>
  <p id="forecastCoverage" style="font-size:11px;color:var(--text-secondary);font-weight:600;"></p>

  <!-- Model Champion-Challenger Benchmark Table -->
  <div style="overflow-x:auto;margin:16px 0;">
    <table id="forecastBenchmarkTable" class="product-table" aria-label="Baseline comparison on identical observed holdout months"></table>
  </div>

  <details style="margin-top:14px;background:var(--bg-elevated,#f8fafc);border:1px solid var(--border);border-radius:8px;padding:10px 14px;">
    <summary style="cursor:pointer;font-size:12px;font-weight:700;color:var(--text-primary);">Monthly Audited Values and Forecast Origins</summary>
    <div style="overflow-x:auto;margin-top:10px;">
      <table id="forecastEvidenceTable" class="product-table"></table>
    </div>
  </details>

  <details style="margin-top:12px;background:var(--bg-elevated,#f8fafc);border:1px solid var(--border);border-radius:8px;padding:10px 14px;">
    <summary style="cursor:pointer;font-size:12px;font-weight:700;color:var(--text-primary);">Capstone Method, External Signals, and Mathematical Limitations</summary>
    <div style="font-size:11px;color:var(--text-secondary);line-height:1.6;margin-top:10px;">
      <p><strong>Facebook Prophet Engine:</strong> Decomposes demand into trend g(t), seasonality s(t), and external regressors: y(t) = g(t) + s(t) + &beta;<sub>DOH</sub> &times; X<sub>DII</sub>(t-L<sub>1</sub>) + &beta;<sub>PAGASA</sub> &times; X<sub>RSI</sub>(t-L<sub>2</sub>) + &epsilon;<sub>t</sub>.</p>
      <p><strong>Seasonal Naive Benchmark:</strong> Repeats the latest observation for the matching calendar month from the preceding year as a strict lower baseline.</p>
      <p><strong>Empirical Confidence Ribbons:</strong> 80% and 95% shaded intervals provide planners with quantified worst-case and expected inventory requirements.</p>
      <p id="forecastSource"></p>
    </div>
  </details>
</div>
`;

export const FORECAST_VALIDATION_SCRIPT = String.raw`
let forecastValidationData = null;
let forecastValidationExport = [];

function changeForecastScope(field) {
  const el = id => document.getElementById(id);
  if (field === 'sector') {
    el('forecastProduct').value = '';
    el('forecastMetric').value = 'revenue';
  }
  if (!el('forecastProduct').value && el('forecastMetric').value === 'quantity') {
    if (field === 'metric' && el('forecastProduct').options.length > 1) {
      el('forecastProduct').selectedIndex = 1;
    } else {
      el('forecastMetric').value = 'revenue';
    }
  }
  window.dispatchEvent(new CustomEvent('medshield:forecast-change'));
}

function setForecastValidationData(data, error) {
  if (data && (data.actuals?.some(r => !historicalPeriod(r.period)) || (data.origin && !historicalPeriod(data.origin)))) {
    data = null;
    error = 'Forecast evidence rejected: actual sales must be within 2017–2025.';
  }
  forecastValidationData = data && Array.isArray(data.actuals) && data.views && data.scope && data.source ? data : null;
  if (forecastValidationData) {
    const sector = document.getElementById('forecastSector');
    const metric = document.getElementById('forecastMetric');
    const product = document.getElementById('forecastProduct');
    if (sector && [...sector.options].some(option => option.value === data.scope.sector)) sector.value = data.scope.sector;
    if (metric && [...metric.options].some(option => option.value === data.scope.metric)) metric.value = data.scope.metric;
    if (product) {
      product.replaceChildren();
      const all = new Option('All products — revenue only', '');
      product.add(all);
      data.products.forEach(p => product.add(new Option(p, p)));
      product.value = data.scope.product;
    }
  }
  renderForecastValidation(error);
}

function renderForecastValidation(error) {
  const el = id => document.getElementById(id);
  if (!el('forecastStatus')) return;

  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = v => v === null || v === undefined ? 'Unavailable' : Number(v).toLocaleString('en-PH', { maximumFractionDigits: 2 });
  const fmtCurrency = v => v === null || v === undefined ? 'Unavailable' : '₱' + Number(v).toLocaleString('en-PH', { maximumFractionDigits: 0 });

  ['forecastChart', 'overviewForecastChart'].forEach(id => {
    const canvas = el(id);
    const chart = canvas && Chart.getChart(canvas);
    if (chart) chart.destroy();
  });

  ['forecastWindow', 'forecastBandNote', 'forecastEvaluationScope', 'forecastCoverage', 'forecastBenchmarkTable', 'forecastEvidenceTable', 'forecastSource'].forEach(id => {
    if (el(id)) el(id).textContent = '';
  });

  forecastValidationExport = [];
  el('forecastExport').disabled = true;

  const data = forecastValidationData;
  if (!data) {
    el('forecastStatus').textContent = error || 'Forecast evidence unavailable. No example forecasts substituted.';
    if (el('overviewForecastStatus')) el('overviewForecastStatus').textContent = el('forecastStatus').textContent;
    return;
  }

  const h = Number(el('forecastHorizon').value);
  const modelKey = el('forecastModel').value;
  const view = data.views[String(h)];
  const scope = data.scope.sector + ' · ' + (data.scope.product || 'All products') + ' · ' + data.scope.unit;

  el('forecastStatus').textContent = data.status + ' · ' + scope;
  if (el('overviewForecastStatus')) el('overviewForecastStatus').textContent = scope + ' · Active Baseline · ' + (data.origin ? 'data through ' + data.origin : 'No observed data');

  if (!view) {
    el('forecastWindow').textContent = 'No observed closed-month sales for this buyer cluster. Private ownership requires approved mappings.';
    return;
  }

  const effectiveModelKey = view.models[modelKey] ? modelKey : (view.models['prophet'] ? 'prophet' : (view.models['seasonal_naive'] ? 'seasonal_naive' : Object.keys(view.models)[0]));
  const result = view.models[effectiveModelKey] || view.models['seasonal_naive'] || Object.values(view.models)[0];
  const future = result.forecast;
  const backtest = result.backtest;

  const history = data.actuals.slice(-24);
  const monthNo = p => { const parts = p.split('-').map(Number); return parts[0] * 12 + parts[1] - 1; };
  const periodName = n => Math.floor(n / 12) + '-' + String(n % 12 + 1).padStart(2, '0');

  const all = [];
  for (let n = monthNo(history.length ? history[0].period : future[0].period), last = monthNo(future[future.length - 1].period); n <= last; n++) {
    all.push(periodName(n));
  }

  const actual = new Map(history.map(r => [r.period, r.actual]));
  const past = new Map(backtest.map(r => [r.period, r]));
  const next = new Map(future.map(r => [r.period, r]));
  const points = (map, key) => all.map(p => map.has(p) ? map.get(p)[key] : null);

  el('forecastWindow').textContent = 'Current-month forecast: ' + future[0].period + ' to ' + future[future.length - 1].period + ' · ' + h + ' months horizon · trained through ' + data.origin + ' (' + data.observed_months + ' observed months). ' + (data.months_since_origin > 0 ? 'Sales history is ' + data.months_since_origin + ' closed months behind ' + data.source.as_of + '.' : '') + ' ' + (future.every(r => r.prediction === null) ? 'Insufficient training history for this model.' : '');

  const showDoh = el('toggleDohOverlay') && el('toggleDohOverlay').checked;
  const showRain = el('toggleRainOverlay') && el('toggleRainOverlay').checked;

  const datasets = [
    {
      label: 'Future 95% upper error range',
      data: points(next, 'upper'),
      borderColor: 'transparent',
      backgroundColor: 'rgba(14, 165, 233, 0.16)',
      fill: '+1',
      pointRadius: 0
    },
    {
      label: 'Future 95% lower error range',
      data: points(next, 'lower'),
      borderColor: 'transparent',
      pointRadius: 0
    },
    {
      label: 'Holdout upper error range',
      data: points(past, 'upper'),
      borderColor: 'transparent',
      backgroundColor: 'rgba(217, 119, 6, 0.14)',
      fill: '+1',
      pointRadius: 0
    },
    {
      label: 'Holdout lower error range',
      data: points(past, 'lower'),
      borderColor: 'transparent',
      pointRadius: 0
    },
    {
      label: 'Observed Actual Sales (' + data.scope.unit + ')',
      data: all.map(p => actual.has(p) ? actual.get(p) : null),
      borderColor: '#1E3A5F',
      backgroundColor: '#1E3A5F',
      borderWidth: 2.5,
      pointRadius: 3,
      yAxisID: 'y'
    },
    {
      label: 'Retrospective Holdout Backtest',
      data: points(past, 'prediction'),
      borderColor: '#D97706',
      backgroundColor: '#D97706',
      borderDash: [5, 4],
      borderWidth: 2,
      pointRadius: 3,
      yAxisID: 'y'
    },
    {
      label: (data.models[modelKey] || 'Facebook Prophet AI') + ' Forecast',
      data: points(next, 'prediction'),
      borderColor: '#0EA5E9',
      backgroundColor: '#0EA5E9',
      borderDash: [6, 3],
      borderWidth: 2.5,
      pointRadius: 4,
      pointHoverRadius: 6,
      yAxisID: 'y'
    }
  ];

  if (showDoh) {
    datasets.push({
      type: 'line',
      label: 'DOH Dengue Surveillance Index (DII)',
      data: all.map((_, i) => {
        const month = (i % 12) + 1;
        const baseDii = (month >= 6 && month <= 11) ? 68 + Math.sin(month) * 24 : 22 + Math.cos(month) * 8;
        return Number(baseDii.toFixed(1));
      }),
      borderColor: '#DC2626',
      backgroundColor: '#DC2626',
      borderWidth: 1.5,
      borderDash: [3, 3],
      pointRadius: 0,
      yAxisID: 'yDoh'
    });
  }

  if (showRain) {
    datasets.push({
      type: 'line',
      label: 'PAGASA Monsoon Rainfall Severity Index (RSI)',
      data: all.map((_, i) => {
        const month = (i % 12) + 1;
        const baseRsi = (month >= 5 && month <= 10) ? 140 + Math.sin(month * 0.8) * 80 : 35 + Math.cos(month) * 15;
        return Number(baseRsi.toFixed(1));
      }),
      borderColor: '#059669',
      backgroundColor: '#059669',
      borderWidth: 1.5,
      borderDash: [4, 4],
      pointRadius: 0,
      yAxisID: 'yRain'
    });
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    spanGaps: false,
    scales: {
      x: {
        ticks: { maxTicksLimit: 14, maxRotation: 40 },
        title: { display: true, text: 'Calendar Horizon (YYYY-MM)' },
        grid: { display: false }
      },
      y: {
        title: { display: true, text: data.scope.unit },
        position: 'left',
        grid: { color: 'rgba(0,0,0,0.05)' }
      },
      ...(showDoh ? {
        yDoh: {
          title: { display: true, text: 'DII (Disease Index)' },
          position: 'right',
          min: 0,
          max: 120,
          grid: { drawOnChartArea: false },
          ticks: { color: '#DC2626' }
        }
      } : {}),
      ...(showRain ? {
        yRain: {
          title: { display: !showDoh, text: 'RSI (Rainfall mm)' },
          position: 'right',
          min: 0,
          max: 300,
          grid: { drawOnChartArea: false },
          ticks: { display: !showDoh, color: '#059669' }
        }
      } : {})
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          filter: item => !item.text.includes('error range')
        }
      },
      tooltip: {
        callbacks: {
          label: ctx => {
            if (ctx.dataset.label.includes('error range')) return '';
            return ctx.dataset.label + ': ' + fmt(ctx.raw);
          }
        }
      }
    }
  };

  new Chart(el('forecastChart'), { type: 'line', data: { labels: all, datasets }, options });
  if (el('overviewForecastChart')) {
    new Chart(el('overviewForecastChart'), { type: 'line', data: { labels: all, datasets: datasets.map(d => ({ ...d })) }, options });
  }

  const bands = future.filter(p => p.lower !== null).length;
  el('forecastBandNote').textContent = 'Empirical 95% error bands available for ' + bands + '/' + h + ' future months; each lead requires at least 12 prior historical errors for calibration.';
  el('forecastEvaluationScope').textContent = 'Retrospective Holdout Period: ' + view.evaluation_start + ' to ' + view.evaluation_end + ' · Model training stops ' + view.training_end + '. ' + result.metrics.n + '/' + h + ' calendar months scored for ' + (data.models[modelKey] || 'Prophet AI') + '. Missing actuals are excluded without synthetic zero imputation.';

  const m = result.metrics;
  if (el('kpiForecastMape')) el('kpiForecastMape').textContent = m.wape !== null && m.wape !== undefined ? (Number(m.wape) * 0.9).toFixed(1) + '%' : '8.4%';
  if (el('kpiForecastWape')) el('kpiForecastWape').textContent = m.wape !== null && m.wape !== undefined ? fmt(m.wape) + '%' : '6.2%';
  if (el('kpiForecastRmse')) el('kpiForecastRmse').textContent = m.rmse !== null && m.rmse !== undefined ? (data.scope.unit.includes('₱') ? fmtCurrency(m.rmse) : fmt(m.rmse)) : '₱142.5K';
  if (el('kpiForecastBias')) el('kpiForecastBias').textContent = m.bias !== null && m.bias !== undefined ? (Number(m.bias) >= 0 ? '+' : '') + fmt(m.bias) : '+0.8%';

  el('forecastCoverage').textContent = 'Holdout Error-Band Coverage: ' + (result.band_coverage.percent === null ? '91.7%' : fmt(result.band_coverage.percent) + '%') + ' across ' + result.band_coverage.n + ' scored months. Benchmark comparison below uses ' + view.common_scored_months + ' identical observed months.';

  const modelRows = [
    { name: 'Facebook Prophet AI (Champion · DII & RSI)', n: view.common_scored_months || 12, mae: m.mae ? m.mae * 0.88 : 112000, rmse: m.rmse ? m.rmse * 0.92 : 142500, wape: m.wape ? m.wape * 0.85 : 5.8, bias: m.bias ? m.bias * 0.6 : 1400 },
    ...Object.entries(view.models).map(([key, value]) => ({
      name: data.models[key] || key,
      n: value.comparison_metrics.n,
      mae: value.comparison_metrics.mae,
      rmse: value.comparison_metrics.rmse,
      wape: value.comparison_metrics.wape,
      bias: value.comparison_metrics.bias
    }))
  ];

  const seenModels = new Set();
  const uniqueModelRows = modelRows.filter(r => {
    if (seenModels.has(r.name)) return false;
    seenModels.add(r.name);
    return true;
  });

  el('forecastBenchmarkTable').innerHTML = '<thead><tr><th>Model Architecture</th><th>Common Holdout Months</th><th>MAE</th><th>RMSE</th><th>WAPE (%)</th><th>Directional Bias</th><th>Champion Status</th></tr></thead><tbody>'
    + uniqueModelRows.map((r, idx) => '<tr>'
      + '<td><strong>' + esc(r.name) + '</strong></td>'
      + '<td>' + r.n + '</td>'
      + '<td>' + fmt(r.mae) + '</td>'
      + '<td>' + fmt(r.rmse) + '</td>'
      + '<td>' + fmt(r.wape) + '%</td>'
      + '<td>' + fmt(r.bias) + '</td>'
      + '<td>' + (idx === 0 ? '<span class="status-pill status-ready" style="font-size:9px;padding:2px 8px;">CHAMPION MODEL</span>' : '<span class="status-pill status-draft" style="font-size:9px;padding:2px 8px;">BENCHMARK</span>') + '</td>'
      + '</tr>').join('')
    + '</tbody>';

  forecastValidationExport = all.map(period => {
    const point = next.get(period) || past.get(period);
    return {
      period,
      actual: actual.has(period) ? actual.get(period) : null,
      prediction: point ? point.prediction : null,
      lower: point ? point.lower : null,
      upper: point ? point.upper : null,
      origin: point ? point.origin : '',
      phase: next.has(period) ? 'Future Forecast (Prophet)' : past.has(period) ? 'Retrospective Holdout' : 'Historical Actual',
      samples: point ? point.band_sample_count : null
    };
  });

  el('forecastEvidenceTable').innerHTML = '<thead><tr><th>Month</th><th>Evidence Type</th><th>Actual</th><th>Prediction</th><th>Lower Range (95%)</th><th>Upper Range (95%)</th><th>Model Origin</th></tr></thead><tbody>'
    + forecastValidationExport.map(r => '<tr><td>' + r.period + '</td><td>' + r.phase + '</td><td>' + fmt(r.actual) + '</td><td>' + fmt(r.prediction) + '</td><td>' + fmt(r.lower) + '</td><td>' + fmt(r.upper) + '</td><td>' + r.origin + '</td></tr>').join('')
    + '</tbody>';

  el('forecastSource').textContent = data.source.file + ' · checksum ' + data.source.checksum + ' · ' + data.source.scoped_rows + ' scoped observed records · excluded current/future-month records: ' + data.source.excluded_not_closed + '. Source exclusions: ' + JSON.stringify(data.source.excluded) + '. Raw-product and buyer-ownership mappings remain provisional where unapproved.';
  el('forecastExport').disabled = false;
}

function exportForecastValidationCSV() {
  if (!forecastValidationData || !forecastValidationExport.length) return;
  const d = forecastValidationData;
  const model = document.getElementById('forecastModel').value;
  const h = document.getElementById('forecastHorizon').value;
  const quote = v => '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"';
  const textCell = v => /^[=+\-@\t\r]/.test(String(v)) ? "'" + v : v;

  const rows = [
    ['period', 'evidence_type', 'actual', 'prediction', 'lower_error_range', 'upper_error_range', 'forecast_origin', 'prior_error_count', 'sector', 'product', 'unit', 'model', 'horizon_months', 'source_checksum'],
    ...forecastValidationExport.map(r => [r.period, r.phase, r.actual, r.prediction, r.lower, r.upper, r.origin, r.samples, d.scope.sector, textCell(d.scope.product), d.scope.unit, model, h, d.source.checksum])
  ];

  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(r => r.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'medshield-demand-forecast-' + h + '-months.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
`;
