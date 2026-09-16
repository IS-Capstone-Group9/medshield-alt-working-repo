export const FORECAST_VALIDATION_MARKUP = String.raw`
<style>
[data-forecast-validation] canvas{max-width:100%}
[data-forecast-validation] .forecast-controls{display:flex;gap:16px;flex-wrap:wrap;margin:18px 0}
[data-forecast-validation] label{font-size:12px;font-weight:600}
[data-forecast-validation] select{display:block;max-width:260px;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-card,#fff);color:var(--text-primary)}
[data-forecast-validation] p{line-height:1.6;margin:12px 0}
[data-forecast-validation] .forecast-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0}
[data-forecast-validation] .forecast-metrics div{padding:12px;border:1px solid var(--border);border-radius:8px}
[data-forecast-validation] .forecast-metrics strong{display:block;font-size:21px;margin:6px 0}
@media(max-width:700px){[data-forecast-validation] .forecast-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}[data-forecast-validation] .chart-header{flex-wrap:wrap}[data-forecast-validation] select{max-width:100%}[data-forecast-validation] label{max-width:100%}}
</style>
<div class="chart-card" data-forecast-validation>
 <div class="chart-header"><div><div class="chart-title">Actual sales &amp; forecast validation</div><div class="chart-subtitle">Draft sales-only benchmarks · no approved champion model</div></div><button class="btn btn-secondary" id="forecastExport" onclick="exportForecastValidationCSV()" disabled>Export forecast CSV</button></div>
 <div class="forecast-controls">
  <label>Buyer cluster<select id="forecastSector" onchange="changeForecastScope('sector')"><option>Government</option><option>Private</option><option>Unknown</option></select></label>
  <label>Product<select id="forecastProduct" onchange="changeForecastScope('product')"><option value="">All products — revenue only</option></select></label>
  <label>Measure<select id="forecastMetric" onchange="changeForecastScope('metric')"><option value="revenue">Net sales (₱)</option><option value="quantity">Delivered quantity</option></select></label>
  <label>Baseline model<select id="forecastModel" onchange="renderForecastValidation()"><option value="seasonal_naive">Seasonal naive</option><option value="last_value">Last observed value</option></select></label>
  <label>Forecast horizon<select id="forecastHorizon" onchange="renderForecastValidation()"><option value="3">Next 3 months</option><option value="6">Next 6 months</option><option value="12" selected>Next 12 months</option></select></label>
 </div>
 <p id="forecastStatus" role="status">Loading forecast evidence…</p>
 <p id="forecastWindow"></p>
 <div style="height:360px"><canvas id="forecastChart" aria-label="Actual sales, retrospective holdout predictions and future baseline forecast"></canvas></div>
 <p id="forecastBandNote"></p>
 <p id="forecastEvaluationScope"></p>
 <div class="forecast-metrics" id="forecastMetrics"></div>
 <p id="forecastCoverage"></p>
 <div style="overflow-x:auto"><table id="forecastBenchmarkTable" class="product-table" aria-label="Baseline comparison on identical observed holdout months"></table></div>
 <details style="margin-top:18px"><summary>Monthly values and forecast origins</summary><div style="overflow-x:auto"><table id="forecastEvidenceTable" class="product-table"></table></div></details>
 <details style="margin-top:14px"><summary>Method, source and limitations</summary>
 <p>Seasonal naive repeats the same calendar month from the prior year and requires 24 observed training months. Last observed value repeats the latest training observation and requires two. Missing months remain gaps. Product quantities use one raw product identity; they measure fulfilled sales, not unmet demand.</p>
 <p>The historical holdout is withheld before generating its predictions. These are retrospective backtests computed now, not forecasts archived at the time. Future forecasts use all available closed-month observations. The topbar year filter applies to descriptive pages; this view uses its own training cutoff and horizon.</p>
 <p>MAE is mean absolute error; RMSE gives more weight to large misses; WAPE is total absolute error divided by total absolute actual sales; bias is prediction minus actual (positive means overprediction). WAPE is unavailable when the actual total is zero. Observed records do not certify complete monthly sales or a complete annual holdout.</p>
 <p>Shaded bands use the 90th percentile of historical absolute errors separately at each forecast lead, requiring at least 12 prior error observations. They are empirical error ranges, not calibrated 90% confidence intervals. Historical-band calibration uses only data available before the holdout; measured holdout coverage is shown separately.</p>
 <p id="forecastSource"></p>
 </details>
</div>`

export const FORECAST_VALIDATION_SCRIPT = String.raw`
let forecastValidationData = null;
let forecastValidationExport = [];
function changeForecastScope(field) {
 const el=id=>document.getElementById(id);
 if(field==='sector') { el('forecastProduct').value=''; el('forecastMetric').value='revenue'; }
 if(!el('forecastProduct').value && el('forecastMetric').value==='quantity') {
  if(field==='metric' && el('forecastProduct').options.length>1) el('forecastProduct').selectedIndex=1;
  else el('forecastMetric').value='revenue';
 }
 window.dispatchEvent(new CustomEvent('medshield:forecast-change'));
}
function setForecastValidationData(data,error) {
 if(data && (data.actuals?.some(r=>!historicalPeriod(r.period)) || (data.origin&&!historicalPeriod(data.origin)))) {
  data=null;error='Forecast evidence rejected: actual sales must be within 2017–2025.';
 }
 forecastValidationData=data && Array.isArray(data.actuals) && data.views && data.scope && data.source ? data : null;
 if(forecastValidationData) {
  const el=document.getElementById('forecastProduct');
  if(el) { el.replaceChildren(); const all=new Option('All products — revenue only','');el.add(all);data.products.forEach(p=>el.add(new Option(p,p)));el.value=data.scope.product; }
 }
 renderForecastValidation(error);
}
function renderForecastValidation(error) {
 const el=id=>document.getElementById(id);
 if(!el('forecastStatus'))return;
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=v=>v===null||v===undefined?'Unavailable':Number(v).toLocaleString('en-PH',{maximumFractionDigits:2});
 ['forecastChart','overviewForecastChart'].forEach(id=>{const canvas=el(id);const chart=canvas && Chart.getChart(canvas);if(chart)chart.destroy();});
 ['forecastWindow','forecastBandNote','forecastEvaluationScope','forecastMetrics','forecastCoverage','forecastBenchmarkTable','forecastEvidenceTable','forecastSource'].forEach(id=>el(id).textContent='');
 forecastValidationExport=[];el('forecastExport').disabled=true;
 const data=forecastValidationData;
 if(!data){el('forecastStatus').textContent=error||'Forecast evidence unavailable. No example forecasts substituted.';if(el('overviewForecastStatus'))el('overviewForecastStatus').textContent=el('forecastStatus').textContent;return;}
 const h=Number(el('forecastHorizon').value), model=el('forecastModel').value, view=data.views[String(h)];
 const scope=data.scope.sector+' · '+(data.scope.product||'All products')+' · '+data.scope.unit;
 el('forecastStatus').textContent=data.status+' · '+scope;
 if(el('overviewForecastStatus'))el('overviewForecastStatus').textContent=scope+' · Draft baseline · '+(data.origin?'data through '+data.origin:'No observed data');
 if(!view){el('forecastWindow').textContent='No observed closed-month sales for this buyer cluster. Private ownership requires approved mappings.';return;}
 const result=view.models[model], future=result.forecast, backtest=result.backtest;
 const history=data.actuals.slice(-24), all=[...history.map(r=>r.period),...future.map(r=>r.period)];
 const actual=new Map(history.map(r=>[r.period,r.actual])), past=new Map(backtest.map(r=>[r.period,r])), next=new Map(future.map(r=>[r.period,r]));
 const points=(map,key)=>all.map(p=>map.has(p)?map.get(p)[key]:null);
 el('forecastWindow').textContent='Forecast: '+future[0].period+' to '+future[future.length-1].period+' · trained through '+data.origin+' ('+data.observed_months+' observed months). '+(data.months_since_origin>0?'Sales history is '+data.months_since_origin+' closed months behind '+data.source.as_of+'; this is not a current-month outlook.':'')+' '+(future.every(r=>r.prediction===null)?'Insufficient training history for this model.':'');
 const datasets=[
  {label:'Future lower error range',data:points(next,'lower'),borderColor:'transparent',pointRadius:0},
  {label:'Future upper error range',data:points(next,'upper'),borderColor:'transparent',backgroundColor:'rgba(51,95,120,0.14)',fill:'-1',pointRadius:0},
  {label:'Holdout lower error range',data:points(past,'lower'),borderColor:'transparent',pointRadius:0},
  {label:'Holdout upper error range',data:points(past,'upper'),borderColor:'transparent',backgroundColor:'rgba(212,154,35,0.12)',fill:'-1',pointRadius:0},
  {label:'Actual sales ('+data.scope.unit+')',data:all.map(p=>actual.has(p)?actual.get(p):null),borderColor:'#273E55',backgroundColor:'#273E55',borderWidth:2.5,pointRadius:2},
  {label:'Retrospective holdout prediction',data:points(past,'prediction'),borderColor:'#BD8212',backgroundColor:'#BD8212',borderDash:[5,4],borderWidth:2,pointRadius:2},
  {label:data.models[model]+' forecast',data:points(next,'prediction'),borderColor:'#1D8096',backgroundColor:'#1D8096',borderDash:[7,4],borderWidth:2.5,pointRadius:2}
 ];
 const options={responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},spanGaps:false,scales:{x:{ticks:{maxTicksLimit:12,maxRotation:40},title:{display:true,text:'Calendar month (YYYY-MM)'}},y:{title:{display:true,text:data.scope.unit}}},plugins:{legend:{labels:{filter:item=>!item.text.includes('error range')}}}};
 new Chart(el('forecastChart'),{type:'line',data:{labels:all,datasets},options});
 if(el('overviewForecastChart'))new Chart(el('overviewForecastChart'),{type:'line',data:{labels:all,datasets:datasets.map(d=>({...d}))},options});
 const bands=future.filter(p=>p.lower!==null).length;
 el('forecastBandNote').textContent='Empirical error bands available for '+bands+'/'+h+' future months; each lead needs 12 prior errors. These bands have no guaranteed coverage.';
 el('forecastEvaluationScope').textContent='Retrospective holdout: '+view.evaluation_start+' to '+view.evaluation_end+' · training stops '+view.training_end+'. '+result.metrics.n+'/'+h+' calendar months scored for '+data.models[model]+'. Missing actuals are excluded, never filled with zero.';
 const m=result.metrics;
 el('forecastMetrics').innerHTML=[['MAE',m.mae,data.scope.unit],['RMSE',m.rmse,data.scope.unit],['WAPE',m.wape,'%'],['Bias',m.bias,data.scope.unit]].map(([label,value,unit])=>'<div>'+label+'<strong>'+fmt(value)+'</strong><small>'+esc(unit)+'</small></div>').join('');
 el('forecastCoverage').textContent='Holdout error-band coverage: '+(result.band_coverage.percent===null?'Unavailable':fmt(result.band_coverage.percent)+'%')+' across '+result.band_coverage.n+' scored months with bands. Benchmark comparison below uses '+view.common_scored_months+' identical observed months; no model is automatically promoted.';
 el('forecastBenchmarkTable').innerHTML='<thead><tr><th>Baseline</th><th>Common months</th><th>MAE</th><th>RMSE</th><th>WAPE (%)</th><th>Bias</th></tr></thead><tbody>'+Object.entries(view.models).map(([key,value])=>{const s=value.comparison_metrics;return '<tr><td>'+esc(data.models[key])+'</td><td>'+s.n+'</td><td>'+fmt(s.mae)+'</td><td>'+fmt(s.rmse)+'</td><td>'+fmt(s.wape)+'</td><td>'+fmt(s.bias)+'</td></tr>';}).join('')+'</tbody>';
 forecastValidationExport=all.map(period=>{const point=next.get(period)||past.get(period);return {period,actual:actual.has(period)?actual.get(period):null,prediction:point?point.prediction:null,lower:point?point.lower:null,upper:point?point.upper:null,origin:point?point.origin:'',phase:next.has(period)?'Future forecast':past.has(period)?'Retrospective holdout':'Historical actual',samples:point?point.band_sample_count:null};});
 el('forecastEvidenceTable').innerHTML='<thead><tr><th>Month</th><th>Evidence type</th><th>Actual</th><th>Prediction</th><th>Lower range</th><th>Upper range</th><th>Origin</th></tr></thead><tbody>'+forecastValidationExport.map(r=>'<tr><td>'+r.period+'</td><td>'+r.phase+'</td><td>'+fmt(r.actual)+'</td><td>'+fmt(r.prediction)+'</td><td>'+fmt(r.lower)+'</td><td>'+fmt(r.upper)+'</td><td>'+r.origin+'</td></tr>').join('')+'</tbody>';
 el('forecastSource').textContent=data.source.file+' · checksum '+data.source.checksum+' · '+data.source.scoped_rows+' scoped observed records · excluded current/future-month records: '+data.source.excluded_not_closed+'. Source exclusions: '+JSON.stringify(data.source.excluded)+'. Raw-product and buyer-ownership mappings remain provisional where unapproved.';
 el('forecastExport').disabled=false;
}
function exportForecastValidationCSV() {
 if(!forecastValidationData || !forecastValidationExport.length)return;
 const d=forecastValidationData, model=document.getElementById('forecastModel').value, h=document.getElementById('forecastHorizon').value;
 const quote=v=>'"'+String(v===null||v===undefined?'':v).replace(/"/g,'""')+'"';
 const textCell=v=>/^[=+\-@\t\r]/.test(String(v))?"'"+v:v;
 const rows=[['period','evidence_type','actual','prediction','lower_error_range','upper_error_range','forecast_origin','prior_error_count','sector','product','unit','model','horizon_months','source_checksum'],...forecastValidationExport.map(r=>[r.period,r.phase,r.actual,r.prediction,r.lower,r.upper,r.origin,r.samples,d.scope.sector,textCell(d.scope.product),d.scope.unit,model,h,d.source.checksum])];
 const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='forecast-validation-'+h+'-months.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
`
