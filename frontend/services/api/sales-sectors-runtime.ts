export const SALES_SECTORS_MARKUP = String.raw`
<style>
[data-sector-analysis] p {line-height:1.6;margin:12px 0;color:var(--text-secondary)}
[data-sector-analysis] select {display:block;max-width:280px;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-card,#fff);color:var(--text-primary)}
[data-sector-analysis] label {font-size:12px;font-weight:600}
[data-sector-analysis] .sector-chart-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin:20px 0}
[data-sector-analysis] h3 {font-size:14px;margin-bottom:12px}
@media(max-width:900px){[data-sector-analysis] .sector-chart-grid{grid-template-columns:1fr}}
</style>
<div class="chart-card" style="margin-bottom:20px" data-sector-analysis>
 <div class="chart-title">Buyer ownership &amp; geographic distribution</div>
 <p>Government covers national government, public hospitals, and explicitly named LGUs. Private covers generic provincial accounts, private hospitals, pharmacies, and individual sales accounts. Internal covers MedShield business lines; unmatched records remain Unknown.</p>
 <div style="display:flex;gap:16px;flex-wrap:wrap;margin:16px 0">
 <label>Buyer cluster <select id="sectorCluster" onchange="renderSalesSectors()"><option>Government</option><option>Private</option><option>Internal</option><option>Unknown</option></select></label>
 <label>Product scope <select id="sectorProduct" onchange="renderSalesSectors()"></select></label>
 <label>Distribution by <select id="sectorDimension" onchange="renderSalesSectors()"><option value="territory">Geography</option><option value="channel">Customer channel</option></select></label>
 </div>
 <p id="sectorStatus" role="status">Loading buyer classifications…</p>
 <p id="sectorCoverage"></p>
 <p id="sectorScope"></p>
 <div class="sector-chart-grid">
 <div><h3>Net sales revenue share (%)</h3><div style="height:280px"><canvas id="sectorRevenueChart"></canvas></div></div>
 <div><h3>Delivered quantity share (%)</h3><div style="height:280px"><canvas id="sectorQuantityChart"></canvas></div></div>
 </div>
 <div style="overflow:auto"><table class="product-table" id="sectorProfileTable" style="min-height:36px"></table></div>
 <p>Shares use only the selected cluster, period and product. Select one product to compare revenue and quantity on the same population. Source units are not interchangeable across products. Delivered sales do not measure unmet market demand.</p>
 <p>Explicit institutional wording takes precedence over generic geography. No assumption is made about equitable allocation or MedShield's control of purchasing decisions.</p>
 <details><summary>Classification and source evidence</summary><p id="sectorSource"></p><p>Generic province labels represent private sales accounts unless the source explicitly names an LGU or government institution. MedShield business-line labels are isolated as Internal. Unmatched labels remain Unknown.</p></details>
</div>`

export const SALES_SECTORS_SCRIPT = String.raw`
let salesSectorsData = null;
function setSalesSectorsData(data, error) {
 salesSectorsData = data && Array.isArray(data.rows) && data.source ? data : null;
 renderSalesSectors(error);
 if(descriptiveUsesDailyGrain() && typeof buildCharts==='function')buildCharts();
}
function renderSalesSectors(error) {
 const el = id => document.getElementById(id);
 if (!el('sectorStatus')) return;
 const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 ['sectorRevenueChart','sectorQuantityChart'].forEach(id => { const chart = Chart.getChart(el(id)); if(chart) chart.destroy(); });
 ['sectorCoverage','sectorScope','sectorProfileTable','sectorSource'].forEach(id => el(id).textContent = '');
 ['sectorCluster','sectorProduct','sectorDimension'].forEach(id => el(id).disabled = !salesSectorsData);
 if(!salesSectorsData) { el('sectorStatus').textContent = error || 'Buyer analysis unavailable; no demo values substituted.'; return; }
 const select = el('sectorProduct'), prior = select.value;
 const products = [...new Set(salesSectorsData.rows.map(r=>r.product))].sort();
 select.innerHTML = '<option value="">All products — revenue only</option>' + products.map(p=>'<option value="'+esc(p)+'">'+esc(p)+'</option>').join('');
 select.value = products.includes(prior) ? prior : '';
 const product = select.value, sector = el('sectorCluster').value, dimension = el('sectorDimension').value;
 const allScope = getDescriptiveDetailedRows().filter(r=>!product || r.product===product);
 const actualScope = allScope.filter(r=>r.evidence!=='estimate');
 const scope = actualScope.length ? actualScope : allScope;
 const rows = scope.filter(r=>r.sector===sector);
 const groups = new Map();
 rows.forEach(r=>{const key=r[dimension]; const g=groups.get(key)||{label:key,revenue:0,quantity:0,count:0};g.revenue+=r.revenue;g.quantity+=r.quantity;g.count+=r.row_count;groups.set(key,g);});
 const values=[...groups.values()].sort((a,b)=>b.revenue-a.revenue);
 const total=values.reduce((a,v)=>({revenue:a.revenue+v.revenue,quantity:a.quantity+v.quantity}),{revenue:0,quantity:0});
 const validRevenue=total.revenue>0 && values.every(v=>v.revenue>=0);
 const share=(v,k)=>k==='revenue' ? (validRevenue ? v/total.revenue*100:null) : (product && total.quantity>0 ? v/total.quantity*100:null);
 const fmt=v=>v===null?'Unavailable':v.toLocaleString('en-PH',{maximumFractionDigits:2});
 const estimatedRows=rows.filter(r=>r.evidence==='estimate').length;
 el('sectorStatus').textContent=rows.length ? sector+' · '+rows.reduce((n,r)=>n+r.row_count,0).toLocaleString(undefined,{maximumFractionDigits:0})+' weighted record equivalents · '+estimatedRows+' estimated rows' : 'No '+sector.toLowerCase()+' records in this scope. Ownership must be established before drawing a sector conclusion.';
 el('sectorCoverage').textContent=['Government','Private','Internal','Unknown'].map(s=>s+': '+scope.filter(r=>r.sector===s).reduce((n,r)=>n+r.row_count,0).toLocaleString()+' records').join(' · ')+' (classification coverage, not market share)';
 el('sectorScope').textContent=descriptivePeriodLabel()+' · '+(descriptiveUsesDailyGrain()?'daily transaction grain':'monthly grain')+' · '+(product||'All products; quantity comparison unavailable')+' · '+(dimension==='territory'?'Geography':'Customer channel')+'. '+(!validRevenue && rows.length?'Revenue shares unavailable for nonpositive totals or negative group values.':'');
 ['revenue','quantity'].forEach(k=>{
  const available=k==='revenue'?validRevenue:!!product && total.quantity>0;
  if(!available)return;
  new Chart(el(k==='revenue'?'sectorRevenueChart':'sectorQuantityChart'),{type:'bar',data:{labels:values.map(v=>v.label),datasets:[{label:sector+' '+(k==='revenue'?'net sales':'delivered quantity')+' share (%)',data:values.map(v=>share(v[k],k)),backgroundColor:k==='revenue'?'#335F78':'#D49A23'}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{min:0,max:100,title:{display:true,text:'Share within selected cluster (%)'}}},plugins:{legend:{display:false}}}});
 });
 el('sectorProfileTable').innerHTML='<thead><tr><th>'+ (dimension==='territory'?'Geography':'Customer channel')+'</th><th>Net sales (₱)</th><th>Revenue share (%)</th><th>Delivered source units</th><th>Quantity share (%)</th></tr></thead><tbody>'+values.map(v=>'<tr><td>'+esc(v.label)+'</td><td>'+fmt(v.revenue)+'</td><td>'+fmt(share(v.revenue,'revenue'))+'</td><td>'+ (product?fmt(v.quantity):'Select one product')+'</td><td>'+fmt(share(v.quantity,'quantity'))+'</td></tr>').join('')+'</tbody>';
 el('sectorSource').textContent=salesSectorsData.source.file+' · checksum '+(salesSectorsData.source.checksum||'unavailable')+' · excluded '+JSON.stringify(salesSectorsData.source.excluded)+'. Classification evidence: '+[...new Set(rows.map(r=>r.basis))].join('; ');
 if(typeof renderProductPrioritizationTimeline==='function')renderProductPrioritizationTimeline();
}
`
