export const SALES_SECTORS_MARKUP = String.raw`
<style>
[data-sector-analysis] {margin-bottom:20px}
[data-sector-analysis] p {line-height:1.55;color:var(--text-secondary)}
[data-sector-analysis] .area-section-eyebrow {font-size:10px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:#D97706;margin-bottom:5px}
[data-sector-analysis] .area-priority-header {display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
[data-sector-analysis] .area-priority-intro {max-width:760px;margin-top:7px;font-size:12px}
[data-sector-analysis] .area-filter-grid {display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:12px;margin:18px 0;padding:14px;border:1px solid var(--border);border-radius:9px;background:var(--bg-elevated,#f8fafc)}
[data-sector-analysis] label {font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted)}
[data-sector-analysis] select {display:block;width:100%;margin-top:5px;padding:8px 10px;border:1px solid var(--border);border-radius:7px;background:var(--bg-card,#fff);color:var(--text-primary);font:600 12px var(--font-body)}
[data-sector-analysis] select:focus-visible {outline:2px solid rgba(245,158,11,.35);outline-offset:1px;border-color:#D97706}
[data-sector-analysis] select:disabled {cursor:not-allowed;opacity:.58}
[data-sector-analysis] .area-evidence-strip {display:grid;grid-template-columns:minmax(220px,1.6fr) repeat(3,minmax(140px,1fr));gap:1px;overflow:hidden;margin:0 0 14px;border:1px solid var(--border);border-radius:9px;background:var(--border)}
[data-sector-analysis] .area-evidence-item {padding:11px 13px;background:#fff}
[data-sector-analysis] .area-evidence-item:first-child {background:#F8FAFC}
[data-sector-analysis] .area-evidence-item span {display:block;font-size:9px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--text-muted)}
[data-sector-analysis] .area-evidence-item strong {display:block;margin-top:3px;font-size:12px;color:var(--text-primary)}
[data-sector-analysis] .area-kpi-grid {display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 18px}
[data-sector-analysis] .area-kpi {min-height:105px;padding:14px 15px;border:1px solid var(--border);border-radius:9px;background:#fff}
[data-sector-analysis] .area-kpi-label {font-size:9px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--text-muted)}
[data-sector-analysis] .area-kpi-value {margin-top:7px;font-size:20px;font-weight:800;color:var(--text-primary);letter-spacing:-.02em}
[data-sector-analysis] .area-kpi-note {margin-top:4px;font-size:10px;line-height:1.4;color:var(--text-muted)}
[data-sector-analysis] .area-chart-grid {display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:16px;margin:0 0 18px}
[data-sector-analysis] .area-chart-panel {min-width:0;padding:15px;border:1px solid var(--border);border-radius:9px;background:#fff}
[data-sector-analysis] .area-chart-panel h3 {margin:0;font-size:13px;color:var(--text-primary)}
[data-sector-analysis] .area-chart-panel p {margin:4px 0 10px;font-size:10px}
[data-sector-analysis] .area-chart-wrap {height:310px}
[data-sector-analysis] .area-table-wrap {overflow:auto;border:1px solid var(--border);border-radius:9px}
[data-sector-analysis] #sectorProfileTable {margin:0;min-width:1050px}
[data-sector-analysis] #sectorProfileTable th {position:sticky;top:0;z-index:1;background:var(--bg-elevated,#f8fafc);white-space:nowrap}
[data-sector-analysis] #sectorProfileTable td {vertical-align:middle}
[data-sector-analysis] .area-rank {font-weight:800;color:#1E3A5F}
[data-sector-analysis] .area-score {font-weight:800;color:#D97706}
[data-sector-analysis] .area-confidence {display:inline-flex;padding:2px 7px;border-radius:999px;font-size:9px;font-weight:800;white-space:nowrap}
[data-sector-analysis] .area-confidence.observed {background:#ECFDF5;color:#0D7045}
[data-sector-analysis] .area-confidence.mixed {background:#FFFBEB;color:#A15C05}
[data-sector-analysis] .area-confidence.estimated {background:#EFF6FF;color:#1E3A5F}
[data-sector-analysis] .area-empty {padding:28px 16px;text-align:center;color:var(--text-muted)}
[data-sector-analysis] .area-method {margin-top:14px;padding:11px 13px;border:1px solid var(--border);border-radius:8px;background:#F8FAFC;font-size:11px}
[data-sector-analysis] .area-method summary {cursor:pointer;font-weight:800;color:var(--text-primary)}
[data-sector-analysis] .area-method p {margin:8px 0 0;font-size:11px}
@media(max-width:1050px){[data-sector-analysis] .area-evidence-strip{grid-template-columns:repeat(2,minmax(0,1fr))}[data-sector-analysis] .area-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}[data-sector-analysis] .area-chart-grid{grid-template-columns:1fr}}
@media(max-width:680px){[data-sector-analysis] .area-filter-grid,[data-sector-analysis] .area-evidence-strip,[data-sector-analysis] .area-kpi-grid{grid-template-columns:1fr}[data-sector-analysis] .area-chart-wrap{height:280px}}
</style>
<section class="chart-card" data-sector-analysis aria-labelledby="areaPriorityTitle">
 <div class="area-priority-header">
  <div>
   <div class="area-section-eyebrow">01 · Geographic commercial prioritization</div>
   <div class="chart-title" id="areaPriorityTitle">Where should commercial attention focus?</div>
   <p class="area-priority-intro">Ranks mapped geographic areas using selected-period net sales value and active-period coverage. Buyer ownership is a filter and composition measure—it is never treated as a territory.</p>
  </div>
  <span class="status-pill status-draft">Candidate · review required</span>
 </div>
 <div class="area-filter-grid" role="group" aria-label="Area prioritization filters">
  <label>Buyer cluster<select id="sectorCluster" onchange="renderSalesSectors()"><option value="All">All clusters</option><option>Government</option><option>Private</option><option>Internal</option><option>Unknown</option></select></label>
  <label>Product scope<select id="sectorProduct" onchange="renderSalesSectors()"></select></label>
  <label>Evidence<select id="sectorEvidence" onchange="renderSalesSectors()"><option value="all">Actual + gap estimates</option><option value="actual">Actual only</option></select></label>
 </div>
 <p id="sectorStatus" role="status" aria-live="polite">Loading area evidence…</p>
 <div class="area-evidence-strip" aria-label="Area data quality summary">
  <div class="area-evidence-item"><span>Selected scope</span><strong id="sectorScope">Unavailable</strong></div>
  <div class="area-evidence-item"><span>Geography coverage</span><strong id="areaMappingCoverage">Unavailable</strong></div>
  <div class="area-evidence-item"><span>Actual revenue</span><strong id="areaActualRevenue">Unavailable</strong></div>
  <div class="area-evidence-item"><span>Estimated revenue</span><strong id="areaEstimatedRevenue">Unavailable</strong></div>
 </div>
 <div class="area-kpi-grid" aria-label="Area prioritization key metrics">
  <div class="area-kpi"><div class="area-kpi-label">Ranked areas</div><div class="area-kpi-value" id="areaRankedCount">—</div><div class="area-kpi-note">Mapped areas with positive selected-period revenue</div></div>
  <div class="area-kpi"><div class="area-kpi-label">Mapped net sales</div><div class="area-kpi-value" id="areaMappedRevenue">—</div><div class="area-kpi-note" id="areaMappedRevenueNote">Actual and estimated values shown separately</div></div>
  <div class="area-kpi"><div class="area-kpi-label">Leading area</div><div class="area-kpi-value" id="areaLeadingArea">—</div><div class="area-kpi-note" id="areaLeadingShare">No ranked area</div></div>
  <div class="area-kpi"><div class="area-kpi-label">Top-three concentration</div><div class="area-kpi-value" id="areaTopThreeShare">—</div><div class="area-kpi-note">Share of mapped positive revenue</div></div>
 </div>
 <div class="area-chart-grid">
  <section class="area-chart-panel" aria-labelledby="areaRankChartTitle"><h3 id="areaRankChartTitle">Area priority ranking</h3><p>Bars separate actual transactions from recency-weighted gap estimates.</p><div class="area-chart-wrap"><canvas id="sectorRevenueChart" role="img" aria-label="Ranked area revenue split between actual and estimated evidence"></canvas></div></section>
  <section class="area-chart-panel" aria-labelledby="areaParetoTitle"><h3 id="areaParetoTitle">Area revenue concentration</h3><p>Revenue bars with cumulative share and an 80% reference line.</p><div class="area-chart-wrap"><canvas id="sectorParetoChart" role="img" aria-label="Area revenue Pareto chart"></canvas></div></section>
 </div>
 <div class="area-table-wrap"><table class="product-table" id="sectorProfileTable"><caption class="sr-only">Selected-period geographic commercial priority ranking</caption></table></div>
 <details class="area-method"><summary>How ranking and evidence are calculated</summary><p><strong>Commercial priority score:</strong> <span id="areaScoreMethod">60% sales-value scale + 40% active-period coverage</span>. The score describes historical commercial presence; it is not an inventory allocation instruction.</p><p><strong>Actual:</strong> included source transactions. <strong>Gap estimate:</strong> a missing selected calendar period filled from available same-calendar history using recency weights. Estimated contract allocations and other flagged estimated source rows remain excluded by the sales service.</p><p id="sectorSource">Source evidence unavailable.</p></details>
</section>`

export const SALES_SECTORS_SCRIPT = String.raw`
let salesSectorsData = null;
let areaPrioritySalesWeight = 60;
let areaPriorityCoverageWeight = 40;
function setAreaPriorityWeights(salesWeight, coverageWeight) {
 const sales = Math.max(0, Math.min(100, Math.round(Number(salesWeight) || 0)));
 const requestedCoverage = Math.max(0, Math.min(100, Math.round(Number(coverageWeight) || 0)));
 areaPrioritySalesWeight = sales;
 areaPriorityCoverageWeight = sales + requestedCoverage === 100 ? requestedCoverage : 100 - sales;
 renderSalesSectors();
}
function setSalesSectorsData(data, error) {
 salesSectorsData = data && Array.isArray(data.rows) && data.source ? {...data,rows:data.rows.filter(r=>historicalPeriod(r.period))} : null;
 renderSalesSectors(error);
 if(descriptiveUsesDailyGrain() && typeof buildCharts==='function')buildCharts();
}
function renderSalesSectors(error) {
 const el = id => document.getElementById(id);
 if (!el('sectorStatus')) return;
 const esc = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
 const fmtCurrency = value => Number(value||0).toLocaleString('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0});
 const fmtCompact = value => new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',notation:'compact',maximumFractionDigits:1}).format(Number(value||0));
 const fmtPct = value => Number(value||0).toLocaleString('en-PH',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
 ['sectorRevenueChart','sectorParetoChart'].forEach(id => { const canvas=el(id),chart=canvas&&Chart.getChart(canvas);if(chart)chart.destroy(); });
 ['sectorScope','areaMappingCoverage','areaActualRevenue','areaEstimatedRevenue','areaRankedCount','areaMappedRevenue','areaLeadingArea','areaLeadingShare','areaTopThreeShare'].forEach(id=>{if(el(id))el(id).textContent='Unavailable';});
 if(el('sectorProfileTable'))el('sectorProfileTable').innerHTML='';
 ['sectorCluster','sectorProduct','sectorEvidence'].forEach(id=>{if(el(id))el(id).disabled=!salesSectorsData;});
 if(!salesSectorsData) { el('sectorStatus').textContent=error||'Area prioritization is unavailable; no demonstration values were substituted.';if(el('sectorSource'))el('sectorSource').textContent='Source evidence unavailable.';return; }

 const productSelect=el('sectorProduct'),priorProduct=productSelect.value;
 const products=[...new Set(salesSectorsData.rows.map(row=>row.product).filter(Boolean))].sort();
 productSelect.innerHTML='<option value="">All products</option>'+products.map(product=>'<option value="'+esc(product)+'">'+esc(product)+'</option>').join('');
 productSelect.value=products.includes(priorProduct)?priorProduct:'';
 const product=productSelect.value,cluster=el('sectorCluster').value||'All',evidence=el('sectorEvidence').value||'all';
 const detailed=getDescriptiveDetailedRows();
 const productRows=detailed.filter(row=>!product||row.product===product);
 const clusterRows=productRows.filter(row=>cluster==='All'||row.sector===cluster);
 const scopeRows=clusterRows.filter(row=>evidence==='all'||row.evidence!=='estimate');
 const isMapped=row=>{const area=String(row.territory||'').trim().toLowerCase();return area&&area!=='unassigned geography'&&area!=='unknown'&&area!=='unmapped';};
 const periodKey=row=>descriptiveUsesYearlyGrain()?String(row.period||row.date||'').slice(0,4):(descriptiveUsesDailyGrain()?String(row.date||row.period||''):String(row.period||''));
 const weightedCount=rows=>rows.reduce((total,row)=>total+(Number(row.row_count)||0),0);
 const revenueTotal=rows=>rows.reduce((total,row)=>total+(Number(row.revenue)||0),0);
 const mappedRows=scopeRows.filter(isMapped),unmappedRows=scopeRows.filter(row=>!isMapped(row));
 const groups=new Map();
 mappedRows.forEach(row=>{
  const area=String(row.territory).trim(),current=groups.get(area)||{area,revenue:0,actual:0,estimated:0,rowCount:0,periods:new Set(),clusters:{Government:0,Private:0,Internal:0,Unknown:0}};
  const revenue=Number(row.revenue)||0,estimated=row.evidence==='estimate';
  current.revenue+=revenue;current[estimated?'estimated':'actual']+=revenue;current.rowCount+=Number(row.row_count)||0;
  if(periodKey(row))current.periods.add(periodKey(row));
  const ownership=['Government','Private','Internal','Unknown'].includes(row.sector)?row.sector:'Unknown';
  current.clusters[ownership]+=revenue;groups.set(area,current);
 });
 const positive=[...groups.values()].filter(row=>row.revenue>0).sort((left,right)=>right.revenue-left.revenue||left.area.localeCompare(right.area));
 const maximumRevenue=positive.reduce((maximum,row)=>Math.max(maximum,row.revenue),0);
 const availablePeriods=Math.max(1,descriptiveAxisPeriods().length||new Set(scopeRows.map(periodKey).filter(Boolean)).size);
 positive.forEach(row=>{row.salesScore=maximumRevenue?Math.max(0,row.revenue)/maximumRevenue*100:0;row.coverageScore=Math.min(100,row.periods.size/availablePeriods*100);row.score=row.salesScore*areaPrioritySalesWeight/100+row.coverageScore*areaPriorityCoverageWeight/100;});
 const ranked=[...positive].sort((left,right)=>right.score-left.score||right.revenue-left.revenue||left.area.localeCompare(right.area));
 const mappedRevenue=positive.reduce((total,row)=>total+row.revenue,0),actualRevenue=scopeRows.filter(row=>row.evidence!=='estimate').reduce((total,row)=>total+(Number(row.revenue)||0),0),estimatedRevenue=scopeRows.filter(row=>row.evidence==='estimate').reduce((total,row)=>total+(Number(row.revenue)||0),0);
 const allWeight=weightedCount(scopeRows),mappedWeight=weightedCount(mappedRows),mappingCoverage=allWeight?mappedWeight/allWeight*100:0,unmappedRevenue=revenueTotal(unmappedRows);
 const topThree=ranked.slice(0,3).reduce((total,row)=>total+row.revenue,0),leading=ranked[0];

 el('sectorScope').textContent=descriptivePeriodLabel()+' · '+(cluster==='All'?'All buyer clusters':cluster)+' · '+(product||'All products')+' · '+(evidence==='actual'?'Actual only':'Actual + estimates');
 el('areaMappingCoverage').textContent=fmtPct(mappingCoverage)+' mapped';
 el('areaActualRevenue').textContent=fmtCompact(actualRevenue);
 el('areaEstimatedRevenue').textContent=fmtCompact(estimatedRevenue);
 el('areaRankedCount').textContent=String(ranked.length);
 el('areaMappedRevenue').textContent=fmtCompact(mappedRevenue);
 el('areaMappedRevenueNote').textContent=fmtCompact(Math.max(0,unmappedRevenue))+' remains outside ranked geography';
 el('areaLeadingArea').textContent=leading?leading.area:'No area';
 el('areaLeadingShare').textContent=leading&&mappedRevenue>0?fmtPct(leading.revenue/mappedRevenue*100)+' of mapped revenue':'No ranked area';
 el('areaTopThreeShare').textContent=mappedRevenue>0?fmtPct(topThree/mappedRevenue*100):'Unavailable';
 if(el('areaScoreMethod'))el('areaScoreMethod').textContent=areaPrioritySalesWeight+'% sales-value scale + '+areaPriorityCoverageWeight+'% active-period coverage';
 el('sectorStatus').textContent=ranked.length
  ? ranked.length+' mapped areas ranked · '+weightedCount(mappedRows).toLocaleString(undefined,{maximumFractionDigits:0})+' weighted record equivalents · score uses '+areaPrioritySalesWeight+'% sales value and '+areaPriorityCoverageWeight+'% active-period coverage.'
  : 'No mapped area with positive revenue is available for this selection. Buyer ownership and geographic mapping must be established before ranking.';

 if(ranked.length){
  new Chart(el('sectorRevenueChart'),{type:'bar',data:{labels:ranked.map(row=>row.area),datasets:[{label:'Actual net sales',data:ranked.map(row=>row.actual),backgroundColor:'#1E3A5F',borderColor:'#1E3A5F',borderWidth:1},{label:'Gap estimate',data:ranked.map(row=>row.estimated),backgroundColor:'#AFC1CF',borderColor:'#8198AA',borderWidth:1}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},scales:{x:{stacked:true,beginAtZero:true,title:{display:true,text:'Net sales revenue (₱)'},ticks:{callback:value=>fmtCompact(value)}},y:{stacked:true,grid:{display:false}}},plugins:{legend:{display:true,position:'bottom'},tooltip:{callbacks:{label:context=>context.dataset.label+': '+fmtCurrency(context.raw)}}}}});
  let cumulative=0;const paretoRows=[...positive];
  const cumulativeShare=paretoRows.map(row=>{cumulative+=row.revenue;return mappedRevenue>0?cumulative/mappedRevenue*100:0;});
  new Chart(el('sectorParetoChart'),{data:{labels:paretoRows.map(row=>row.area),datasets:[{type:'bar',label:'Mapped net sales',data:paretoRows.map(row=>row.revenue),backgroundColor:'#D6E1E9',borderColor:'#7890A2',borderWidth:1,yAxisID:'revenue'},{type:'line',label:'Cumulative share',data:cumulativeShare,borderColor:'#D97706',backgroundColor:'#D97706',pointRadius:3,pointHoverRadius:5,tension:.18,yAxisID:'share'},{type:'line',label:'80% reference',data:paretoRows.map(()=>80),borderColor:'#9CA3AF',borderDash:[5,5],borderWidth:1,pointRadius:0,yAxisID:'share'}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},scales:{x:{grid:{display:false},ticks:{autoSkip:false,maxRotation:45,minRotation:25}},revenue:{type:'linear',position:'left',beginAtZero:true,ticks:{callback:value=>fmtCompact(value)}},share:{type:'linear',position:'right',min:0,max:100,grid:{drawOnChartArea:false},ticks:{callback:value=>value+'%'}}},plugins:{legend:{display:true,position:'bottom'},tooltip:{callbacks:{label:context=>context.dataset.yAxisID==='share'?context.dataset.label+': '+fmtPct(context.raw):context.dataset.label+': '+fmtCurrency(context.raw)}}}}});
 }

 const rowsHtml=ranked.map((row,index)=>{
  const estimatedShare=row.revenue?Math.max(0,row.estimated)/row.revenue*100:0;
  const confidence=estimatedShare<=.01?['Observed','observed']:estimatedShare>=99.99?['Estimated','estimated']:['Mixed','mixed'];
  const ownershipTotal=['Government','Private','Internal','Unknown'].reduce((total,key)=>total+Math.max(0,row.clusters[key]),0);
  const ownership=['Government','Private','Internal','Unknown'].filter(key=>row.clusters[key]>0).map(key=>key+' '+fmtPct(ownershipTotal?row.clusters[key]/ownershipTotal*100:0)).join(' · ')||'Unavailable';
  return '<tr><td class="area-rank">#'+(index+1)+'</td><td><strong>'+esc(row.area)+'</strong></td><td class="area-score">'+row.score.toFixed(1)+'</td><td>'+fmtCurrency(row.actual)+'</td><td>'+fmtCurrency(row.estimated)+'</td><td>'+fmtPct(mappedRevenue?row.revenue/mappedRevenue*100:0)+'</td><td>'+row.periods.size+' / '+availablePeriods+'</td><td>'+esc(ownership)+'</td><td><span class="area-confidence '+confidence[1]+'">'+confidence[0]+'</span></td></tr>';
 }).join('');
 el('sectorProfileTable').innerHTML='<caption class="sr-only">Area commercial priority ranking for '+esc(descriptivePeriodLabel())+'</caption><thead><tr><th scope="col">Rank</th><th scope="col">Geographic area</th><th scope="col">Score</th><th scope="col">Actual sales</th><th scope="col">Estimated</th><th scope="col">Revenue share</th><th scope="col">Active periods</th><th scope="col">Buyer composition</th><th scope="col">Evidence</th></tr></thead><tbody>'+(rowsHtml||'<tr><td class="area-empty" colspan="9">No ranked geography is available for this selection.</td></tr>')+'</tbody>';
 el('sectorSource').textContent='Source: '+salesSectorsData.source.file+' · SHA-256: '+(salesSectorsData.source.checksum||'unavailable')+' · service exclusions: '+JSON.stringify(salesSectorsData.source.excluded||{})+'. Classification evidence in the selected scope: '+([...new Set(scopeRows.map(row=>row.basis))].filter(Boolean).join('; ')||'Unavailable')+'.';
 if(typeof renderProductPrioritizationTimeline==='function')renderProductPrioritizationTimeline();
}
`
