export const PRODUCT_PRIORITIZATION_SCRIPT = String.raw`
function configureProductYearControls(pageName) {
 const yoy=document.getElementById('btnYoyYear');
 if(yoy)yoy.style.display=pageName==='products'?'none':'';
 if(pageName==='products' && comparisonMode==='yoy')setComparisonMode('single');
}
function renderProductPrioritizationTimeline() {
 const page=document.getElementById('page-products');
 if(!page || !page.classList.contains('active') || !salesSectorsData)return;
 const allYears=selectedYear==='all', rows=salesSectorsData.rows.filter(r=>allYears||r.period.slice(0,4)===String(selectedYear));
 const totals=new Map();rows.forEach(r=>{const v=totals.get(r.product)||{revenue:0,quantity:0};v.revenue+=Number(r.revenue)||0;v.quantity+=Number(r.quantity)||0;totals.set(r.product,v);});
 const products=[...totals.entries()].sort((a,b)=>b[1].revenue-a[1].revenue).slice(0,10), top=new Set(products.map(p=>p[0]));
 const labels=allYears?[...new Set(rows.map(r=>r.period.slice(0,4)))].sort():['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 const key=r=>allYears?r.period.slice(0,4):['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(r.period.slice(5,7))-1];
 const series=new Map();rows.filter(r=>top.has(r.product)).forEach(r=>{const k=r.product+'|'+key(r);series.set(k,(series.get(k)||0)+(Number(r.revenue)||0));});
 const palette=['#335F78','#D49A23','#1D8096','#7A5C99','#3B8C6E','#A45A52','#607D8B','#8C6D31','#526D82','#9A6F85'];
 const replace=(id,config)=>{const canvas=document.getElementById(id),old=canvas&&Chart.getChart(canvas);if(old)old.destroy();if(canvas)new Chart(canvas,config);};
 const grand=[...totals.values()].reduce((n,p)=>n+p.revenue,0);let cumulative=0;const ranked=products.map(([name,v])=>{cumulative+=v.revenue;const pct=grand?100*cumulative/grand:0;return {name,...v,abc:pct<=80?'A':pct<=95?'B':'C',cumulative:pct};});
 replace('productBarChart',{type:'bar',data:{labels:ranked.map(p=>p.name),datasets:[{label:'Net sales revenue',data:ranked.map(p=>p.revenue),backgroundColor:'#335F78',yAxisID:'y'},{type:'line',label:'Cumulative revenue (%)',data:ranked.map(p=>p.cumulative),borderColor:'#D49A23',backgroundColor:'#D49A23',pointRadius:3,yAxisID:'pct'}]},options:{responsive:true,maintainAspectRatio:false,scales:{x:{title:{display:true,text:'Products ranked by revenue'}},y:{title:{display:true,text:'Net sales revenue (₱)'}},pct:{position:'right',min:0,max:100,title:{display:true,text:'Cumulative revenue (%)'},grid:{drawOnChartArea:false}}}}});
 const classes=['A','B','C'].map(c=>ranked.filter(p=>p.abc===c).reduce((n,p)=>n+p.revenue,0));
 replace('abcChart',{type:'doughnut',data:{labels:['Class A','Class B','Class C'],datasets:[{data:classes,backgroundColor:['#335F78','#D49A23','#9AAAB5']}]},options:{responsive:true,maintainAspectRatio:false}});
 replace('productBubbleChart',{type:'bubble',data:{datasets:ranked.map((p,i)=>({label:p.name,data:[{x:p.revenue,y:p.quantity,r:Math.max(5,Math.min(22,5+18*(p.revenue/(grand||1))))}],backgroundColor:palette[i]+'AA'}))},options:{responsive:true,maintainAspectRatio:false,scales:{x:{title:{display:true,text:'Net sales revenue (₱)'}},y:{title:{display:true,text:'Delivered source units'}}}}});
 replace('paretoCurveChart',{type:'line',data:{labels,datasets:products.map((p,i)=>({label:p[0],data:labels.map(l=>series.get(p[0]+'|'+l)||0),borderColor:palette[i],backgroundColor:palette[i],pointRadius:2,tension:.2}))},options:{responsive:true,maintainAspectRatio:false,scales:{x:{title:{display:true,text:allYears?'Year':'Month'}},y:{title:{display:true,text:'Net sales revenue (₱)'}}}}});
 const table=document.getElementById('productTable');if(table)table.innerHTML='<thead><tr><th>Product</th><th>Net sales (₱)</th><th>Delivered units</th><th>ABC</th><th>Cumulative %</th></tr></thead><tbody>'+ranked.map(p=>'<tr><td>'+String(p.name).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</td><td>'+p.revenue.toLocaleString('en-PH',{maximumFractionDigits:2})+'</td><td>'+p.quantity.toLocaleString('en-PH',{maximumFractionDigits:2})+'</td><td>'+p.abc+'</td><td>'+p.cumulative.toFixed(2)+'</td></tr>').join('')+'</tbody>';
 const mainTitle=page.querySelector('.chart-grid-2 .chart-title');if(mainTitle)mainTitle.textContent='Product Revenue Pareto';
 const mainSub=page.querySelector('.chart-grid-2 .chart-subtitle');if(mainSub)mainSub.textContent='Ranked net sales bars with cumulative revenue contribution';
 const trendCanvas=document.getElementById('paretoCurveChart'),trendCard=trendCanvas&&trendCanvas.closest('.chart-card');if(trendCard){const title=trendCard.querySelector('.chart-title'),sub=trendCard.querySelector('.chart-subtitle');if(title)title.textContent='Leading Product Revenue Trend';if(sub)sub.textContent=allYears?'Yearly revenue by leading product':'Monthly revenue by leading product for '+selectedYear;}
}
document.addEventListener('change',function(event){const id=event.target&&event.target.id;if(id==='topbarYearSelect')setTimeout(renderProductPrioritizationTimeline,0);});
`
