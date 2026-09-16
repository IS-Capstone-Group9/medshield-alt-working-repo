export const SALES_SECTORS_MARKUP = String.raw`
<style>
[data-sector-analysis] p {line-height:1.6;margin:12px 0;color:var(--text-secondary)}
[data-sector-analysis] select {display:block;max-width:280px;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-card,#fff);color:var(--text-primary)}
[data-sector-analysis] label {font-size:12px;font-weight:600}
[data-sector-analysis] .area-section-eyebrow {font-size:10px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:#D97706;margin-bottom:5px}
[data-sector-analysis] .sector-controls {display:flex;gap:16px;flex-wrap:wrap;margin:16px 0;padding:14px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated,#f8fafc)}
[data-sector-analysis] .sector-governance {display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0}
[data-sector-analysis] .sector-governance div {padding:10px 12px;border:1px solid var(--border);border-radius:7px;background:#fff}
[data-sector-analysis] .sector-governance span {display:block;font-size:9px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--text-muted)}
[data-sector-analysis] .sector-governance strong {display:block;margin-top:4px;font-size:13px;color:var(--text-primary)}
[data-sector-analysis] .sector-chart-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin:20px 0}
[data-sector-analysis] .sector-chart-panel {padding:14px;border:1px solid var(--border);border-radius:8px;background:#fff}
[data-sector-analysis] h3 {font-size:14px;margin-bottom:12px}
@media(max-width:900px){[data-sector-analysis] .sector-chart-grid{grid-template-columns:1fr}[data-sector-analysis] .sector-governance{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
<div class="chart-card" style="margin-bottom:20px" data-sector-analysis>
 <div class="area-section-eyebrow">01 · Buyer channel and territory profiling</div>
 <div class="chart-title">Buyer ownership &amp; geographic distribution</div>
 <p>Evaluates institutional buyer clusters across CALABARZON, MIMAROPA, and Bicol. Government covers national government, public hospitals, and explicitly named LGUs. Private covers generic provincial accounts, private hospitals, pharmacies, and individual sales accounts. Internal covers MedShield business lines; unmatched records remain Unknown.</p>
 <div class="sector-controls" role="group" aria-label="Buyer ownership and geographic distribution filters">
 <label>Buyer cluster <select id="sectorCluster" onchange="renderSalesSectors()"><option>Government</option><option>Private</option><option>Internal</option><option>Unknown</option></select></label>
 <label>Product scope <select id="sectorProduct" onchange="renderSalesSectors()"></select></label>
 <label>Distribution by <select id="sectorDimension" onchange="renderSalesSectors()"><option value="territory">Geography</option><option value="channel">Customer channel</option></select></label>
 </div>
 <p id="sectorStatus" role="status">Loading buyer classifications…</p>
 <p id="sectorCoverage"></p>
 <p id="sectorScope"></p>
 <div class="sector-governance" aria-label="Selected area data coverage">
  <div><span>Weighted records</span><strong id="sectorWeightedCount">Unavailable</strong></div>
  <div><span>Observed share</span><strong id="sectorObservedRatio">Unavailable</strong></div>
  <div><span>Estimated share</span><strong id="sectorEstimatedRatio">Unavailable</strong></div>
  <div><span>Display grain</span><strong id="sectorPeriodGrain">Unavailable</strong></div>
 </div>
 <div class="sector-chart-grid">
 <div class="sector-chart-panel"><h3>Net sales revenue share (%)</h3><div style="height:280px"><canvas id="sectorRevenueChart" role="img" aria-label="Net sales revenue share by selected distribution dimension"></canvas></div></div>
 <div class="sector-chart-panel"><h3>Delivered quantity share (%)</h3><div style="height:280px"><canvas id="sectorQuantityChart" role="img" aria-label="Delivered quantity share by selected distribution dimension"></canvas></div></div>
 </div>
 <div style="overflow:auto"><table class="product-table" id="sectorProfileTable" style="min-height:36px"></table></div>
 <p>Shares use only the selected cluster, period and product. Select one product to compare revenue and quantity on the same population. Source units are not interchangeable across products. Delivered sales do not measure unmet market demand.</p>
 <p>Explicit institutional wording takes precedence over generic geography. No assumption is made about equitable allocation or MedShield's control of purchasing decisions.</p>
 <details class="sector-provenance"><summary>Classification and source evidence</summary><p id="sectorSource"></p><p>Generic province labels represent private sales accounts unless the source explicitly names an LGU or government institution. MedShield business-line labels are isolated as Internal. Unmatched labels remain Unknown.</p></details>
</div>`

export const SALES_SECTORS_SCRIPT = String.raw`
let salesSectorsData = null;
function setSalesSectorsData(data, error) {
 salesSectorsData = data && Array.isArray(data.rows) && data.source ? {...data,rows:data.rows.filter(r=>historicalPeriod(r.period))} : null;
 renderSalesSectors(error);
 if(descriptiveUsesDailyGrain() && typeof buildCharts==='function')buildCharts();
}
function renderSalesSectors(error) {
 const el = id => document.getElementById(id);
 if (!el('sectorStatus')) return;
 const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 ['sectorRevenueChart','sectorQuantityChart'].forEach(id => { const chart = Chart.getChart(el(id)); if(chart) chart.destroy(); });
 ['sectorCoverage','sectorScope','sectorProfileTable','sectorSource'].forEach(id => el(id).textContent = '');
 ['sectorWeightedCount','sectorObservedRatio','sectorEstimatedRatio','sectorPeriodGrain'].forEach(id => el(id).textContent = 'Unavailable');
 ['sectorCluster','sectorProduct','sectorDimension'].forEach(id => el(id).disabled = !salesSectorsData);
 if(!salesSectorsData) { el('sectorStatus').textContent = error || 'Buyer analysis unavailable; no demo values substituted.'; return; }
 const select = el('sectorProduct'), prior = select.value;
 const products = [...new Set(salesSectorsData.rows.map(r=>r.product))].sort();
 select.innerHTML = '<option value="">All products — revenue only</option>' + products.map(p=>'<option value="'+esc(p)+'">'+esc(p)+'</option>').join('');
 select.value = products.includes(prior) ? prior : '';
 const product = select.value, sector = el('sectorCluster').value, dimension = el('sectorDimension').value;
 const allScope = getDescriptiveDetailedRows().filter(r=>!product || r.product===product);
 const scope = allScope;
 const rows = scope.filter(r=>r.sector===sector);
 const groups = new Map();
 rows.forEach(r=>{const key=String(r[dimension]||'Unassigned'),estimated=r.evidence==='estimate'; const g=groups.get(key)||{label:key,revenue:0,quantity:0,count:0,revenueObserved:0,revenueEstimated:0,quantityObserved:0,quantityEstimated:0};const revenue=Number(r.revenue)||0,quantity=Number(r.quantity)||0;g.revenue+=revenue;g.quantity+=quantity;g.count+=Number(r.row_count)||0;g[estimated?'revenueEstimated':'revenueObserved']+=revenue;g[estimated?'quantityEstimated':'quantityObserved']+=quantity;groups.set(key,g);});
 const values=[...groups.values()].sort((a,b)=>b.revenue-a.revenue);
 const total=values.reduce((a,v)=>({revenue:a.revenue+v.revenue,quantity:a.quantity+v.quantity}),{revenue:0,quantity:0});
 const validRevenue=total.revenue>0 && values.every(v=>v.revenue>=0);
 const share=(v,k)=>k==='revenue' ? (validRevenue ? v/total.revenue*100:null) : (product && total.quantity>0 ? v/total.quantity*100:null);
 const fmt=v=>v===null?'Unavailable':Number(v).toLocaleString('en-PH',{maximumFractionDigits:2});
 const fmtPct=v=>v===null?'Unavailable':Number(v).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
 const weightedCount=rows.reduce((n,r)=>n+(Number(r.row_count)||0),0);
 const estimatedWeight=rows.filter(r=>r.evidence==='estimate').reduce((n,r)=>n+(Number(r.row_count)||0),0);
 const observedWeight=Math.max(0,weightedCount-estimatedWeight);
 const observedRatio=weightedCount?observedWeight/weightedCount*100:0;
 const estimatedRatio=weightedCount?estimatedWeight/weightedCount*100:0;
 const grain=descriptiveUsesYearlyGrain()?'Yearly':(descriptiveUsesDailyGrain()?'Daily':'Monthly');
 el('sectorStatus').textContent=rows.length ? sector+' · '+weightedCount.toLocaleString(undefined,{maximumFractionDigits:0})+' weighted record equivalents · '+observedWeight.toLocaleString(undefined,{maximumFractionDigits:0})+' observed / '+estimatedWeight.toLocaleString(undefined,{maximumFractionDigits:0})+' estimated' : 'No '+sector.toLowerCase()+' records in this scope. Ownership must be established before drawing a sector conclusion.';
 el('sectorWeightedCount').textContent=weightedCount.toLocaleString(undefined,{maximumFractionDigits:0});
 el('sectorObservedRatio').textContent=fmtPct(observedRatio);
 el('sectorEstimatedRatio').textContent=fmtPct(estimatedRatio);
 el('sectorPeriodGrain').textContent=grain;
 el('sectorCoverage').textContent=['Government','Private','Internal','Unknown'].map(s=>s+': '+scope.filter(r=>r.sector===s).reduce((n,r)=>n+(Number(r.row_count)||0),0).toLocaleString()+' records').join(' · ')+' (classification coverage, not market share)';
 el('sectorScope').textContent=descriptivePeriodLabel()+' · '+grain.toLowerCase()+' grain · '+(product||'All products; quantity comparison unavailable')+' · '+(dimension==='territory'?'Geography':'Customer channel')+'. '+(!validRevenue && rows.length?'Revenue shares unavailable for nonpositive totals or negative group values.':'');
 ['revenue','quantity'].forEach(k=>{
  const available=k==='revenue'?validRevenue:!!product && total.quantity>0;
  if(!available)return;
  const observedKey=k+'Observed',estimatedKey=k+'Estimated';
  const observedColor=k==='revenue'?'#1E3A5F':'#D97706',estimatedColor=k==='revenue'?'#8EA6B8':'#F4C56A';
  new Chart(el(k==='revenue'?'sectorRevenueChart':'sectorQuantityChart'),{type:'bar',data:{labels:values.map(v=>v.label),datasets:[{label:'Observed '+(k==='revenue'?'revenue':'quantity')+' share',data:values.map(v=>share(v[observedKey],k)),backgroundColor:observedColor,borderColor:observedColor,borderWidth:1},{label:'Estimated '+(k==='revenue'?'revenue':'quantity')+' share',data:values.map(v=>share(v[estimatedKey],k)),backgroundColor:estimatedColor,borderColor:estimatedColor,borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,scales:{x:{stacked:true,ticks:{autoSkip:false,maxRotation:45,minRotation:35}},y:{stacked:true,min:0,max:100,title:{display:true,text:'Share within selected cluster (%)'},ticks:{callback:value=>Number(value).toFixed(0)+'%'}}},plugins:{legend:{display:true,position:'bottom'},tooltip:{callbacks:{label:context=>context.dataset.label+': '+Number(context.parsed.y).toFixed(2)+'%'}}}}});
  });
 el('sectorProfileTable').innerHTML='<caption class="sr-only">Buyer cluster distribution profile for '+esc(descriptivePeriodLabel())+'</caption><thead><tr><th scope="col">'+ (dimension==='territory'?'Geography':'Customer channel')+'</th><th scope="col">Net sales (₱)</th><th scope="col">Revenue share (%)</th><th scope="col">Delivered source units</th><th scope="col">Quantity share (%)</th></tr></thead><tbody>'+(values.length?values.map(v=>'<tr><td>'+esc(v.label)+'</td><td>'+fmt(v.revenue)+'</td><td>'+fmtPct(share(v.revenue,'revenue'))+'</td><td>'+ (product?fmt(v.quantity):'Select one product')+'</td><td>'+fmtPct(share(v.quantity,'quantity'))+'</td></tr>').join(''):'<tr><td colspan="5">No classified records are available for this selection.</td></tr>')+'</tbody>';
 el('sectorSource').textContent='Source: '+salesSectorsData.source.file+' · SHA-256: '+(salesSectorsData.source.checksum||'unavailable')+' · excluded: '+JSON.stringify(salesSectorsData.source.excluded)+'. Classification evidence: '+([...new Set(rows.map(r=>r.basis))].filter(Boolean).join('; ')||'Unavailable')+'.';
 if(typeof renderProductPrioritizationTimeline==='function')renderProductPrioritizationTimeline();
}
`
