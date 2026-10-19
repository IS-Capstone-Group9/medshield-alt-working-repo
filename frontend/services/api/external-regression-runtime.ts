export const EXTERNAL_REGRESSION_MARKUP = String.raw`
<style>
[data-external-regression]{margin-top:20px;padding:20px;min-width:0;overflow-wrap:anywhere}
[data-external-regression] .reg-controls{display:flex;flex-wrap:wrap;gap:14px;margin:18px 0}
[data-external-regression] label{font-size:12px;font-weight:600;max-width:100%}
[data-external-regression] select{display:block;padding:8px;border:1px solid var(--border);border-radius:6px;max-width:260px;background:var(--bg-card,#fff);color:var(--text-primary)}
[data-external-regression] p{margin:12px 0;line-height:1.6}
[data-external-regression] .reg-charts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;margin:20px 0}
[data-external-regression] h3{font-size:14px;margin-bottom:10px}
[data-external-regression] .reg-wrap{height:280px;min-width:0}
[data-external-regression] .reg-charts>div{min-width:0}
[data-external-regression] canvas{max-width:100%}
[data-external-regression] [hidden]{display:none!important}
@media(max-width:900px){[data-external-regression] .reg-charts{grid-template-columns:1fr}}
@media(max-width:700px){[data-external-regression] .chart-header{flex-wrap:wrap}[data-external-regression] select{max-width:100%}}
</style>
<div class="chart-card" data-external-regression>
 <div class="chart-header"><div><div class="chart-title">DOH &amp; weather: context and regression</div><div class="chart-subtitle">Inspect sales beside earlier disease and weather observations; review model readiness before interpreting predictions.</div></div><button id="regExport" class="btn btn-secondary" onclick="exportExternalRegressionCSV()" disabled>Export regression CSV</button></div>
 <div class="reg-controls">
 <label>Buyer cluster<select id="regSector" onchange="changeRegressionScope('sector')"><option>Unknown</option><option>Government</option><option selected>Private</option><option>Internal</option></select></label>
 <label>Territory<select id="regTerritory" onchange="changeRegressionScope('territory')"><option>Quezon</option><option>Batangas</option><option>Cavite</option><option>Laguna</option><option>Marinduque</option><option>Camarines Norte</option><option>Camarines Sur</option></select></label>
 <label>Measure<select id="regMetric" onchange="changeRegressionScope('metric')"><option value="revenue">Net sales (₱)</option><option value="quantity">Delivered quantity</option></select></label>
 <label>Product<select id="regProduct" onchange="changeRegressionScope('product')"><option value="">All products — revenue only</option></select></label>
 <label>External model<select id="regMode" onchange="changeRegressionScope('mode')"><option value="disease">Disease only</option><option value="rainfall">Rainfall only</option><option value="combined">Disease + rainfall</option></select></label>
 <label>Disease<select id="regDisease" onchange="changeRegressionScope('disease')"><option>Dengue</option><option>Leptospirosis</option><option>Cholera</option><option>Typhoid Fever</option></select></label>
 <label>Disease lag (months)<select id="regLag" onchange="changeRegressionScope('lag')"><option>1</option><option>2</option><option>3</option><option>6</option><option>8</option><option>12</option></select></label>
 <label>Weather source<select id="regProvider" onchange="changeRegressionScope('provider')"><option value="PAGASA">PAGASA via Databricks</option></select></label>
 <label>Rainfall lag (months)<select id="regRainLag" onchange="changeRegressionScope('rainfall_lag')"><option>1</option><option>2</option><option>3</option><option>6</option><option>8</option><option>12</option></select></label>
 </div>
 <p id="regStatus" role="status">Loading source readiness…</p><p id="regScope"></p><p id="regCoverage"></p>
 <section id="regContext" hidden aria-label="Historical external context">
 <h3>Sales and earlier external observations · 2017–2025</h3>
 <p id="regContextSummary" role="status"></p><details><summary>Interpretation and source limits</summary><p id="regContextNotes"></p></details>
 <p>Each external point shows the selected earlier month aligned with the sales month. Separate axes retain pesos, reported cases and millimetres. Co-observation does not establish a cause or an approved model join.</p>
 <div class="reg-charts" id="regContextCharts"></div>
 <button id="regContextExport" class="btn btn-secondary" onclick="exportExternalContextCSV()" disabled>Export displayed context CSV</button>
 <details><summary>Monthly context values and mapping status</summary><div style="overflow-x:auto;max-height:420px"><table class="product-table" id="regContextTable"></table></div></details>
 </section>
 <p>Regression estimates conditional associations, not causality. Revenue is a financial target; use one product's delivered units to investigate fulfilled demand. Different drug families and pack sizes are not interchangeable.</p>
 <p id="regResult"></p>
 <div class="reg-charts" id="regCharts" hidden>
  <div><h3>Holdout: predicted versus actual</h3><div class="reg-wrap"><canvas id="regPredictionChart"></canvas></div></div>
  <div><h3>Earlier signal coefficient</h3><div class="reg-wrap"><canvas id="regCoefficientChart"></canvas></div></div>
 </div>
 <div style="overflow-x:auto"><table class="product-table" id="regMetrics"></table></div>
 <details style="margin-top:16px"><summary>Source readiness and coverage</summary><div style="overflow-x:auto"><table class="product-table" id="regSources"></table></div></details>
 <details style="margin-top:16px"><summary>Holdout observations and residuals</summary><div style="overflow-x:auto"><table class="product-table" id="regEvidence"></table></div></details>
 <details style="margin-top:16px"><summary>Model specification and limits</summary>
 <p>Sales-only regression: intercept + time trend + annual sine/cosine seasonality + previous-month sales. The augmented regression adds the selected earlier disease count (per 100 cases), rainfall (per 100 mm), or both. A lag of 8 means March's signal is paired with November's sales.</p>
 <p>At least 36 matched pre-holdout months and 6 observations in the last 12 calendar months are required. Both models use identical training and evaluation observations. Each held-out month is predicted using an expanding fit ending before that month; this is one-month rolling evaluation, not a fixed 12-month forecast. No missing observations are imputed as zero.</p>
 <p>The coefficient chart uses the initial training fit before the holdout. It shows the change in the target associated with 100 additional cases or 100 mm rainfall, holding the other model inputs fixed. It has no causal interpretation or significance claim. Raw linear predictions, including negatives, are retained for evaluation.</p>
 <p>DOH onset counts are final retrospective data; reporting/revision timestamps are unavailable. Any improvement is therefore retrospective, not verified real-time forecast skill. Choosing lags after viewing holdout results makes the result exploratory; no lag search or automatic model promotion is performed. PAGASA observations use Databricks-published station metadata and remain unavailable for regression until territory mappings are approved.</p>
 <p id="regSourceHash"></p>
 </details>
</div>`

export const EXTERNAL_REGRESSION_SCRIPT = String.raw`
let externalRegressionData=null;
function changeRegressionScope(field){
 const el=id=>document.getElementById(id);
 if(field==='sector'||field==='territory')el('regProduct').value='';
 if(field==='product'&&!el('regProduct').value)el('regMetric').value='revenue';
 window.dispatchEvent(new CustomEvent('medshield:regression-change'));
}
function setExternalRegressionData(data,error){
 externalRegressionData=data&&data.scope&&data.coverage&&Array.isArray(data.sources)&&Array.isArray(data.evaluation)?data:null;
 if(externalRegressionData){
  Object.entries({regSector:"sector",regMetric:"metric",regMode:"mode",regDisease:"disease",regLag:"lag",regProvider:"provider",regRainLag:"rainfall_lag"}).forEach(([id,key])=>{const input=document.getElementById(id);if(input)input.value=String(data.scope[key]);});
  const territory=document.getElementById('regTerritory');if(territory&&Array.isArray(data.territories)){territory.replaceChildren();[...new Set([...data.territories,data.scope.territory])].sort().forEach(t=>territory.add(new Option(t,t)));territory.value=data.scope.territory;}
  const select=document.getElementById('regProduct');if(select){select.replaceChildren();select.add(new Option('All products — revenue only',''));data.products.forEach(p=>select.add(new Option(p,p)));select.value=data.scope.product;}
 }
 renderExternalRegression(error);
}
function renderExternalRegression(error){
 const el=id=>document.getElementById(id);if(!el('regStatus'))return;
 const fmt=v=>v===null||v===undefined?'Unavailable':Number(v).toLocaleString('en-PH',{maximumFractionDigits:2});
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 ['regContextSales','regContextSignal0','regContextSignal1','regPredictionChart','regCoefficientChart'].forEach(id=>{const chart=Chart.getChart(el(id));if(chart)chart.destroy();});
 ['regScope','regCoverage','regResult','regMetrics','regSources','regEvidence','regSourceHash'].forEach(id=>el(id).textContent='');
 el('regCharts').hidden=true;el('regExport').disabled=true;el('regContext').hidden=true;el('regContextExport').disabled=true;el('regContextTable').textContent='';el('regContextCharts').textContent='';el('regContextSummary').textContent='';el('regContextNotes').textContent='';
 const mode=el('regMode').value;
 ['regDisease','regLag'].forEach(id=>el(id).disabled=mode==='rainfall');
 ['regProvider','regRainLag'].forEach(id=>el(id).disabled=mode==='disease');
 const d=externalRegressionData;
 if(!d){el('regStatus').textContent=error||'Regression evidence unavailable; no sample results substituted.';return;}
 const s=d.scope,c=d.coverage;
 renderExternalContext();
 el('regStatus').textContent=(d.status==='blocked'?'Not estimable: ':'Exploratory: ')+d.reason;
 el('regScope').textContent=s.sector+' ownership · '+s.territory+' · '+(s.product||'All products')+' · '+s.unit+'. '+(s.mode==='rainfall'?'':s.disease+' lag '+s.lag+' months. ')+(s.mode==='disease'?'':s.provider+' rainfall lag '+s.rainfall_lag+' months.');
 el('regCoverage').textContent=c.sales_months+' observed sales months · '+(c.matched_months||0)+' approved model-aligned months · '+(c.training_months||0)+' initial training · '+(c.holdout_months||0)+' holdout. '+c.signals.map(r=>r.provider+' '+r.signal+': '+r.months+' join-ready signal months').join(' · ');
 el('regSources').innerHTML='<thead><tr><th>Provider</th><th>Readiness</th><th>Source</th></tr></thead><tbody>'+d.sources.map(r=>'<tr><td>'+esc(r.provider)+'</td><td>'+esc(r.status)+'</td><td>'+esc(r.file)+'</td></tr>').join('')+'</tbody>';
 el('regSourceHash').textContent='Sales checksum: '+d.sales_source.checksum+'. '+d.sources.filter(r=>r.checksum).map(r=>r.provider+' checksum: '+r.checksum).join('. ');
 if(d.status!=='exploratory')return;
 const gain=d.mae_improvement_pct;
 el('regResult').textContent=(gain===null?'MAE comparison unavailable.':Math.abs(gain).toFixed(2)+'% '+(gain>=0?'lower':'higher')+' holdout MAE with external signals.')+' Evaluation: '+c.evaluation_start+' to '+c.evaluation_end+' ('+d.evaluation.length+' paired months). '+(gain<0?'The external model performed worse than the sales-only regression.':'This retrospective result does not certify future performance.');
 el('regCharts').hidden=false;
 const points=d.evaluation;const extent=points.flatMap(r=>[r.actual,r.baseline,r.augmented]);const low=Math.min(...extent),high=Math.max(...extent);
 new Chart(el('regPredictionChart'),{type:'scatter',data:{datasets:[{label:'Sales-only',data:points.map(r=>({x:r.actual,y:r.baseline,period:r.period})),backgroundColor:'#BD8212'},{label:'With external signal(s)',data:points.map(r=>({x:r.actual,y:r.augmented,period:r.period})),backgroundColor:'#335F78'},{label:'Perfect prediction',data:[{x:low,y:low},{x:high,y:high}],showLine:true,borderColor:'#999',borderDash:[4,4],pointRadius:0}]},options:{responsive:true,maintainAspectRatio:false,scales:{x:{min:low,max:high,title:{display:true,text:'Actual '+s.unit}},y:{min:low,max:high,title:{display:true,text:'Predicted '+s.unit}}},plugins:{tooltip:{callbacks:{afterLabel:context=>context.raw.period||''}}}}});
 new Chart(el('regCoefficientChart'),{type:'bar',data:{labels:d.coefficients.map(r=>r.predictor),datasets:[{label:'Conditional coefficient ('+s.unit+')',data:d.coefficients.map(r=>r.coefficient),backgroundColor:'#335F78'}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,title:{display:true,text:s.unit+' per stated input increment'}}},plugins:{legend:{display:false}}}});
 el('regMetrics').innerHTML='<thead><tr><th>Model</th><th>Paired months</th><th>MAE ('+esc(s.unit)+')</th><th>RMSE</th><th>WAPE (%)</th><th>Bias</th></tr></thead><tbody>'+['baseline','augmented'].map(k=>{const m=d.metrics[k];return '<tr><td>'+(k==='baseline'?'Sales-only regression':'With external signal(s)')+'</td><td>'+m.n+'</td><td>'+fmt(m.mae)+'</td><td>'+fmt(m.rmse)+'</td><td>'+fmt(m.wape)+'</td><td>'+fmt(m.bias)+'</td></tr>';}).join('')+'</tbody>';
 el('regEvidence').innerHTML='<thead><tr><th>Target month</th><th>External month(s)</th><th>Actual</th><th>Sales-only</th><th>Augmented</th><th>Residual (actual − predicted)</th></tr></thead><tbody>'+points.map(r=>'<tr><td>'+esc(r.period)+'</td><td>'+esc(r.signal_period)+'</td><td>'+fmt(r.actual)+'</td><td>'+fmt(r.baseline)+'</td><td>'+fmt(r.augmented)+'</td><td>'+fmt(r.residual)+'</td></tr>').join('')+'</tbody>';
 el('regExport').disabled=false;
}

function renderExternalContext(){
 const d=externalRegressionData,c=d&&d.context;if(!c||!Array.isArray(c.rows))return;
 const el=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const fmt=v=>v===null?'Unavailable':Number(v).toLocaleString('en-PH',{maximumFractionDigits:2});
 el('regContext').hidden=false;el('regContextExport').disabled=false;
 el('regContextSummary').textContent=d.scope.sector+' · '+d.scope.territory+' · '+(d.scope.product||'All products')+' · '+c.sales_months+'/108 months with net sales · '+c.coobserved_months+' co-observed months · '+c.join_ready_months+' with approved joins. Candidate context; buyer assignments and external mappings require review.'+(!c.sales_months?' No eligible net sales for this buyer/product/territory; unassigned geography stays unallocated.':'');
 el('regContextNotes').textContent=c.limitations.join(' ');
 const chart=(id,title,unit,values,color)=>{
  const card=document.createElement('div'),h=document.createElement('h3'),wrap=document.createElement('div'),canvas=document.createElement('canvas');
  h.textContent=title;wrap.className='reg-wrap';canvas.id=id;canvas.setAttribute('aria-label',title+'; values in monthly context table');canvas.setAttribute('role','img');wrap.append(canvas);card.append(h,wrap);el('regContextCharts').append(card);
  new Chart(canvas,{type:'line',data:{labels:c.rows.map(r=>r.period),datasets:[{label:unit,data:values,borderColor:color,backgroundColor:color,pointRadius:2,spanGaps:false}]},options:{responsive:true,maintainAspectRatio:false,scales:{x:{ticks:{maxTicksLimit:9}},y:{title:{display:true,text:unit}}},plugins:{legend:{display:false}}}});
 };
 chart('regContextSales','Recorded net sales','₱ net sales',c.rows.map(r=>r.sales),'#203d60');
 const descriptors=c.rows[0]?.signals||[];
 descriptors.forEach((s,i)=>chart('regContextSignal'+i,(s.provider==='DOH'?'Reported '+s.signal+' cases':s.provider+' rainfall')+' · '+s.lag+' month'+(s.lag===1?'':'s')+' earlier',s.unit,c.rows.map(r=>r.signals[i].value),'#bd8b18'));
 el('regContextTable').innerHTML='<thead><tr><th scope="col">Sales month</th><th scope="col">Net sales (₱)</th><th scope="col">Source rows: original / adjusted</th>'+descriptors.map(s=>'<th scope="col">'+esc(s.provider+' '+s.signal+' ('+s.unit+')')+'</th>').join('')+'</tr></thead><tbody>'+c.rows.map(r=>'<tr><th scope="row">'+esc(r.period)+'</th><td>'+fmt(r.sales)+'</td><td>'+fmt(r.original_source_rows??null)+' / '+fmt(r.adjusted_estimated_rows??null)+'</td>'+r.signals.map(s=>'<td>'+fmt(s.value)+' · '+esc(s.period)+' · '+esc(s.mapping_status)+' · '+esc(s.observation_status)+(s.station?' · '+esc(s.station):'')+'</td>').join('')+'</tr>').join('')+'</tbody>';
}
function exportExternalContextCSV(){
 const d=externalRegressionData,c=d&&d.context;if(!c||!Array.isArray(c.rows))return;
 const safe=v=>typeof v==='string'&&/^[=+\-@\t\r]/.test(v)?"'"+v:v;
 const q=v=>'"'+String(safe(v)??'').replace(/"/g,'""')+'"';
 const headers=['sales_month','net_sales_php','sector','territory','product','context_status','checksum','source_rows','original_source_rows','adjusted_estimated_rows','sales_dataset_id','fact_delta_version','sales_policy'];
 const descriptors=c.rows[0]?.signals||[];
 descriptors.forEach((s,i)=>headers.push(...['provider','signal','unit','lag_months','signal_month','value','mapping_status','observation_status','station','join_ready','source_dataset_version','external_dataset_id'].map(k=>'signal_'+(i+1)+'_'+k)));
 const rows=[headers,...c.rows.map(r=>[r.period,r.sales,d.scope.sector,d.scope.territory,d.scope.product,c.status,c.checksum,r.source_rows,r.original_source_rows,r.adjusted_estimated_rows,d.sales_source.release?.dataset_id,d.sales_source.release?.fact_delta_version,d.sales_source.release?.policy_version,...r.signals.flatMap(s=>[s.provider,s.signal,s.unit,s.lag,s.period,s.value,s.mapping_status,s.observation_status,s.station,s.join_ready,s.source_dataset_version,s.external_dataset_id])])];
 const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='external-context.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function exportExternalRegressionCSV(){
 const d=externalRegressionData;if(!d||d.status!=='exploratory')return;
 const safe=v=>/^[=+\-@\t\r]/.test(String(v))?"'"+v:v;
 const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const rows=[['month','external_months','training_end','actual','sales_only','augmented','residual','territory','sector','product','unit','mode','disease','disease_lag','weather_provider','rainfall_lag','sales_checksum'],...d.evaluation.map(r=>[r.period,r.signal_period,r.training_end,r.actual,r.baseline,r.augmented,r.residual,d.scope.territory,d.scope.sector,safe(d.scope.product),d.scope.unit,d.scope.mode,d.scope.disease,d.scope.lag,d.scope.provider,d.scope.rainfall_lag,d.sales_source.checksum])];
 const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='external-regression.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
`
