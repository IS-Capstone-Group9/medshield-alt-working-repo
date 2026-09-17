export const PRODUCT_PRIORITIZATION_SCRIPT = String.raw`
let productCohortPercent=5;
function configureProductYearControls(pageName) {
 const filterBar=document.getElementById('filterBar');
 if(filterBar&&pageName==='products')filterBar.style.display='flex';
 const yearWrap=document.getElementById('singleYearWrap');
 if(yearWrap)yearWrap.style.display='none';
 const rangeWrap=document.getElementById('customDateRangeWrap');
 if(rangeWrap)rangeWrap.style.display=descriptivePeriod==='custom'?'flex':'none';
 const compareWrap=document.getElementById('descriptiveComparisonWrap');
 const supportsComparison=pageName==='overview'||pageName==='revenue';
 if(compareWrap)compareWrap.style.display=supportsComparison?'inline-flex':'none';
 if(!supportsComparison&&comparisonMode!=='single'){
  comparisonMode='single';
  const compareSelect=document.getElementById('descriptiveComparisonSelect');
  if(compareSelect)compareSelect.value='single';
 }
}
function renderProductPrioritizationTimeline() {
 const page=document.getElementById('page-products');
 if(!page || !page.classList.contains('active') || !salesSectorsData)return;
 const daily=descriptiveUsesDailyGrain();
 const yearly=descriptiveUsesYearlyGrain();
 const allRows=getDescriptiveDetailedRows();
 const actualRows=allRows.filter(row=>row.evidence!=='estimate');
 const rows=actualRows.length?actualRows:allRows;
 const isEstimated=!actualRows.length&&allRows.length>0;
 const totals=new Map();rows.forEach(r=>{const product=String(r.product||'').trim();if(!product)return;const v=totals.get(product)||{revenue:0,quantity:0};v.revenue+=Number(r.revenue)||0;v.quantity+=Number(r.quantity)||0;totals.set(product,v);});
 const positive=[...totals.entries()].filter(([,value])=>value.revenue>0).sort((a,b)=>b[1].revenue-a[1].revenue);
 const grand=positive.reduce((sum,[,value])=>sum+value.revenue,0);
 let cumulative=0;
 const portfolio=positive.map(([name,value],index)=>{const before=cumulative;cumulative+=value.revenue;return {name,...value,rank:index+1,revenueShare:grand?100*value.revenue/grand:0,cumulative:grand?100*cumulative/grand:0,abc:before<grand*.8?'A':before<grand*.95?'B':'C'};});
 const cohortRate=[5,10,20].includes(Number(productCohortPercent))?Number(productCohortPercent):5;
 const focusCohortCount=portfolio.length?Math.max(1,Math.ceil(portfolio.length*cohortRate/100)):0;
 const focusCohort=portfolio.slice(0,focusCohortCount);
 const chartLimit=10;
 const ranked=focusCohort.slice(0,chartLimit), top=new Set(ranked.map(product=>product.name));
 const shortlistRevenue=ranked.reduce((sum,product)=>sum+product.revenue,0);
 const shortlistShare=grand?100*shortlistRevenue/grand:0;
 const focusRevenue=focusCohort.reduce((sum,product)=>sum+product.revenue,0);
 const focusShare=grand?100*focusRevenue/grand:0;
 const keys=descriptiveAxisPeriods();
 const labels=keys.map(descriptivePointLabel);
 const key=r=>yearly?String(r.period||r.date||'').slice(0,4):(daily?r.date:r.period);
 const series=new Map();rows.filter(r=>top.has(r.product)).forEach(r=>{const k=r.product+'|'+key(r);series.set(k,(series.get(k)||0)+(Number(r.revenue)||0));});
 const palette=['#335F78','#D49A23','#1D8096','#7A5C99','#3B8C6E'];
 const replace=(id,config)=>{const canvas=document.getElementById(id),old=canvas&&Chart.getChart(canvas);if(old)old.destroy();if(canvas)new Chart(canvas,config);};
 replace('productBarChart',{type:'bar',data:{labels:ranked.map(p=>p.name),datasets:[{label:'Net sales revenue',data:ranked.map(p=>p.revenue),backgroundColor:'#335F78',yAxisID:'y'},{type:'line',label:'Cumulative portfolio revenue (%)',data:ranked.map(p=>p.cumulative),borderColor:'#D49A23',backgroundColor:'#D49A23',pointRadius:4,yAxisID:'pct'}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{tooltip:{callbacks:{label:context=>context.dataset.yAxisID==='pct'?context.dataset.label+': '+Number(context.parsed.y).toFixed(2)+'%':context.dataset.label+': ₱'+Number(context.parsed.y).toLocaleString('en-PH',{maximumFractionDigits:2})}}},scales:{x:{title:{display:true,text:'Focus products ranked by revenue'},ticks:{autoSkip:false,maxRotation:45,minRotation:35}},y:{beginAtZero:true,title:{display:true,text:'Net sales revenue (₱)'}},pct:{position:'right',min:0,max:100,ticks:{callback:value=>Number(value).toFixed(0)+'%'},title:{display:true,text:'Cumulative share of all product revenue (%)'},grid:{drawOnChartArea:false}}}}});
 const focusMix=[focusRevenue,Math.max(0,grand-focusRevenue)];
 replace('abcChart',{type:'doughnut',data:{labels:['Top '+cohortRate+'% cohort · '+focusShare.toFixed(2)+'% of revenue','Remaining '+(100-cohortRate)+'% · '+(100-focusShare).toFixed(2)+'% of revenue'],datasets:[{data:focusMix,backgroundColor:['#D49A23','#CBD5DF'],borderColor:['#B77912','#AAB9C5'],borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:context=>context.label+': ₱'+Number(context.raw).toLocaleString('en-PH',{maximumFractionDigits:2})}}}}});
 const chartColor=index=>palette[index]||'hsl('+Math.round(index*137.508%360)+' 48% 42%)';
 const chartFill=index=>palette[index]?palette[index]+'B8':'hsl('+Math.round(index*137.508%360)+' 48% 42% / .72)';
 const largestShare=ranked.length?ranked[0].revenueShare:1;
 replace('productBubbleChart',{type:'bubble',data:{datasets:ranked.map((p,i)=>({label:p.name,data:[{x:p.revenue,y:p.quantity,r:Math.max(6,Math.min(22,6+16*(p.revenueShare/largestShare)))}],backgroundColor:chartFill(i),borderColor:chartColor(i)}))},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,title:{display:true,text:'Net sales revenue (₱)'}},y:{beginAtZero:true,title:{display:true,text:'Delivered source units (not pack-normalized)'}}}}});
 replace('paretoCurveChart',{type:'line',data:{labels,datasets:ranked.map((p,i)=>({label:p.name,data:keys.map(k=>series.has(p.name+'|'+k)?series.get(p.name+'|'+k):null),borderColor:chartColor(i),backgroundColor:chartColor(i),pointRadius:daily?1:3,tension:yearly?0:.2,spanGaps:false}))},options:{responsive:true,maintainAspectRatio:false,animation:false,scales:{x:{title:{display:true,text:yearly?'Year':(daily?'Day':'Month')}},y:{beginAtZero:true,title:{display:true,text:'Net sales revenue (₱)'}}}}});
 const escape=value=>String(value).replace(/[&<>]/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[character]));
 const table=document.getElementById('productTable');if(table){table.dataset.priorityMode='top'+cohortRate;table.innerHTML='<thead><tr><th>Rank</th><th>Top-'+cohortRate+'% focus product</th><th>Net sales (₱)</th><th>Revenue share</th><th>Cumulative portfolio share</th><th>Delivered units</th></tr></thead><tbody>'+(focusCohort.length?focusCohort.map(p=>'<tr><td>'+p.rank+'</td><td>'+escape(p.name)+'</td><td>'+p.revenue.toLocaleString('en-PH',{maximumFractionDigits:2})+'</td><td>'+p.revenueShare.toFixed(2)+'%</td><td>'+p.cumulative.toFixed(2)+'%</td><td>'+p.quantity.toLocaleString('en-PH',{maximumFractionDigits:2})+'</td></tr>').join(''):'<tr><td colspan="6">No positive-revenue products are available for this period.</td></tr>')+'</tbody>';}
 let scope=document.getElementById('productPriorityScope');if(!scope){scope=document.createElement('div');scope.id='productPriorityScope';scope.className='product-priority-scope';scope.setAttribute('role','note');const firstGrid=page.querySelector('.chart-grid-2');page.insertBefore(scope,firstGrid);}
 const capApplied=focusCohortCount>chartLimit;
 scope.innerHTML='<div class="product-priority-toolbar"><div><div class="product-priority-scope-title">Dynamic Pareto product cohort</div><div class="product-priority-toolbar-note">Ranked by observed net sales revenue in the selected historical period.</div></div><label for="productCohortSelect">Focus cohort<select id="productCohortSelect" aria-label="Select top product percentage"><option value="5"'+(cohortRate===5?' selected':'')+'>Top 5%</option><option value="10"'+(cohortRate===10?' selected':'')+'>Top 10%</option><option value="20"'+(cohortRate===20?' selected':'')+'>Top 20%</option></select></label></div><div>The top <strong>'+cohortRate+'%</strong> contains <strong>'+focusCohortCount+' of '+portfolio.length+' positive-revenue products</strong> and represents <strong>'+focusShare.toFixed(2)+'%</strong> of observed positive-product net sales for '+escape(descriptivePeriodLabel())+'. '+(capApplied?'The charts show the ten highest-ranked products; the table includes the complete cohort.':'All focus-cohort products are shown in the charts and table.')+' The charted leaders account for '+shortlistShare.toFixed(2)+'% of portfolio revenue.</div><div class="product-priority-boundary">Descriptive only: this ranking uses observed product records within the selected period; gap-fill estimates do not determine cohort membership. It does not prescribe order quantities. If the client confirms that the future objective is maximizing forecast-demand fulfillment under budget, pack, supplier, and product constraints, solve that separately with linear programming in Prescriptive Planning.</div>';
 const updateCard=(canvasId,titleText,subtitleText)=>{const canvas=document.getElementById(canvasId),card=canvas&&canvas.closest('.chart-card');if(!card)return;const title=card.querySelector('.chart-title'),subtitle=card.querySelector('.chart-subtitle');if(title)title.textContent=titleText;if(subtitle)subtitle.textContent=subtitleText;};
 updateCard('productBarChart','Top '+cohortRate+'% Pareto Leaders','Highest-ranked products within the selected top-'+cohortRate+'% cohort; the line shows cumulative share of total portfolio revenue.');
 updateCard('abcChart','Top '+cohortRate+'% Cohort Revenue Contribution','Revenue captured by the complete top-'+cohortRate+'% product cohort compared with the remaining '+(100-cohortRate)+'% of positive-revenue products.');
 updateCard('productBubbleChart','Shortlist Revenue vs Delivered Units','Revenue concentration versus fulfilled source units; pack sizes are not normalized, so quantities are not directly interchangeable.');
 updateCard('paretoCurveChart','Shortlist Revenue Trend',(yearly?'Annual':(daily?'Daily':'Monthly'))+' net sales revenue for the Pareto focus products during '+descriptivePeriodLabel()+'. Missing observations remain gaps.');
 const tableCard=table&&table.closest('.chart-card');if(tableCard){const title=tableCard.querySelector('.chart-title'),subtitle=tableCard.querySelector('.chart-subtitle');if(title)title.textContent='Top '+cohortRate+'% Focus Product Performance';if(subtitle)subtitle.textContent='Complete selected cohort ranked by observed net sales revenue for the current period.';}
 const insight=page.querySelector('.dss-insight-card');if(insight){const badge=insight.querySelector('.insight-badge'),title=insight.querySelector('.insight-title'),body=title&&title.nextElementSibling;if(badge)badge.textContent='Dynamic Pareto interpretation';if(title)title.textContent='Top '+cohortRate+'% focus changes with the selected period';if(body)body.innerHTML=focusCohortCount?'<strong>'+focusCohortCount+' products</strong> form the current top-'+cohortRate+'% cohort and contribute <strong>'+focusShare.toFixed(2)+'% of observed positive-product net sales</strong>. Use this as a descriptive review shortlist, not an automatic replenishment instruction.':'No observed positive-revenue products fall inside this period. Choose a period that overlaps the available transaction dates.';}
 const subtitle=document.getElementById('topbar-sub');if(subtitle)subtitle.textContent='Dynamic top-'+cohortRate+'% Pareto focus by selected historical period';
 const barCanvas=document.getElementById('productBarChart'),donutCanvas=document.getElementById('abcChart');if(barCanvas)barCanvas.setAttribute('aria-label','Pareto chart of the visible top-'+cohortRate+'-percent product leaders and their cumulative portfolio revenue percentages.');if(donutCanvas)donutCanvas.setAttribute('aria-label','Doughnut chart comparing revenue from the complete top-'+cohortRate+'-percent product cohort with the remaining products.');
}
function watchProductPriorityTable() {
 const table=document.getElementById('productTable');if(!table||table.dataset.priorityWatcher==='true')return;
 table.dataset.priorityWatcher='true';
 new MutationObserver(function(){const page=document.getElementById('page-products'),firstHeader=table.querySelector('th');if(page&&page.classList.contains('active')&&(!firstHeader||firstHeader.textContent.trim()!=='Rank'))setTimeout(renderProductPrioritizationTimeline,0);}).observe(table,{childList:true,subtree:true});
}
setTimeout(watchProductPriorityTable,0);
document.addEventListener('change',function(event){const id=event.target&&event.target.id;if(id==='productCohortSelect'){productCohortPercent=Number(event.target.value)||5;setTimeout(renderProductPrioritizationTimeline,0);}if(id==='descriptivePeriodSelect'||id==='customDateStart'||id==='customDateEnd')setTimeout(renderProductPrioritizationTimeline,0);});
`
