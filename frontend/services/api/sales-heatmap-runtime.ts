export const SALES_HEATMAP_MARKUP = `
<div class="chart-card" data-sales-heatmap style="margin-bottom:20px;">
  <style>
    [data-sales-heatmap] label {display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:600;min-width:0;}
    [data-sales-heatmap] select,[data-sales-heatmap] button {font:inherit;color:var(--text-primary);background:white;border:1px solid var(--border);border-radius:6px;padding:8px;max-width:100%;}
    [data-sales-heatmap] button {cursor:pointer;white-space:nowrap;}
    [data-sales-heatmap] button:hover {background:var(--bg-elevated);}
    [data-sales-heatmap] :is(select,button,td):focus-visible {outline:2px solid #1E3A5F;outline-offset:2px;}
    [data-sales-heatmap] :disabled {opacity:.5;cursor:not-allowed;}
    [data-sales-heatmap] .chart-title {overflow-wrap:anywhere;}
  </style>
  <div class="chart-header"><div><div class="chart-title" id="salesHeatmapTitle">Monthly units sold</div>
    <div class="chart-subtitle">One product per view. Category narrows the product list; different pack sizes are not added together.</div></div>
    <button type="button" onclick="exportSalesHeatmapCSV()">Export CSV</button></div>
  <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
    <label>Category <select id="heatmapCategory" onchange="changeHeatmapCategory()" style="max-width:240px;"></select></label>
    <label>Product <select id="heatmapProduct" onchange="renderSalesHeatmap()" style="max-width:320px;"></select></label>
    <label>Sales area <select id="heatmapArea" onchange="renderSalesHeatmap()" style="max-width:200px;"></select></label>
    <label>Measure <select id="heatmapMeasure" onchange="renderSalesHeatmap()"><option value="units">Units sold</option><option value="index">Within-year index</option></select></label>
  </div>
  <p class="chart-subtitle" id="heatmapStatus" role="status">Loading product-level quantities…</p>
  <div id="revenueHeatmapGrid" style="overflow-x:auto;margin-top:12px;"></div>
  <p id="heatmapLegend" class="chart-subtitle" style="margin:12px 0;"></p>
  <p id="heatmapInsight" style="margin:12px 0;" aria-live="polite"></p>
  <div class="chart-wrap h260"><canvas id="quantityTrendChart" aria-label="Monthly units sold for the selected product" role="img"></canvas></div>
  <details style="margin-top:12px;"><summary>Source and calculation</summary><p id="heatmapSource" style="margin-top:8px;"></p>
    <p>Units sold are fulfilled delivered quantities. Unobserved months remain unavailable. Estimated allocations and dates are excluded. A within-year index divides each month by that year's monthly mean and requires all 12 observed months and a positive mean. It describes relative intensity; it does not prove recurring seasonality.</p>
  </details>
</div>`

export const SALES_HEATMAP_SCRIPT = String.raw`
let salesHeatmapData = null;
let salesHeatmapView = [];

function heatmapOptions(id, entries, preferred) {
  const select = document.getElementById(id);
  if (!select) return;
  select.replaceChildren(...entries.map(entry => new Option(entry.label, entry.value)));
  select.value = entries.some(entry => entry.value === preferred) ? preferred : entries[0]?.value || '';
}

function setSalesHeatmapData(data, error) {
  const status = document.getElementById('heatmapStatus');
  if (!status) return;
  if (data && (!Array.isArray(data.products) || !Array.isArray(data.monthly) || !data.source)) {
    data=null; error='Product quantity response is invalid.';
  }
  salesHeatmapData = data;
  document.querySelectorAll('[data-sales-heatmap] select,[data-sales-heatmap] button').forEach(control=>control.disabled=!data);
  if (!data) {
    salesHeatmapView = [];
    document.getElementById('revenueHeatmapGrid')?.replaceChildren();
    document.getElementById('heatmapInsight').textContent = '';
    document.getElementById('heatmapLegend').textContent = '';
    document.getElementById('heatmapSource').textContent = '';
    document.getElementById('salesHeatmapTitle').textContent = 'Monthly units sold';
    const canvas = document.getElementById('quantityTrendChart');
    if (canvas) Chart.getChart(canvas)?.destroy();
    if (status) status.textContent = error || 'Product quantities are unavailable. Reload after the sales service is available.';
    return;
  }
  const previousCategory = document.getElementById('heatmapCategory')?.value;
  const categories = [...new Set(data.products.map(product => product.category))].sort();
  heatmapOptions('heatmapCategory', [{value:'all',label:'All categories'}, ...categories.map(value => ({value,label:value}))], previousCategory || 'all');
  const areas = [...new Set(data.monthly.map(row => row.area))].sort();
  heatmapOptions('heatmapArea', [{value:'all',label:'All sales areas'}, ...areas.map(value => ({value,label:value}))], document.getElementById('heatmapArea')?.value);
  changeHeatmapCategory();
}

function changeHeatmapCategory() {
  if (!salesHeatmapData) return;
  const category = document.getElementById('heatmapCategory').value;
  const eligible = salesHeatmapData.products.filter(product => category === 'all' || product.category === category);
  const counts = new Map();
  salesHeatmapData.monthly.forEach(row => counts.set(row.product, (counts.get(row.product) || 0) + row.row_count));
  const defaultProduct = eligible.slice().sort((a,b) => (counts.get(b.id)||0) - (counts.get(a.id)||0))[0]?.id;
  const previous = document.getElementById('heatmapProduct').value;
  heatmapOptions('heatmapProduct', eligible.map(product => ({value:product.id,label:product.label})), eligible.some(p=>p.id===previous) ? previous : defaultProduct);
  renderSalesHeatmap();
}

function renderSalesHeatmap() {
  if (!salesHeatmapData || !document.getElementById('heatmapProduct')) return;
  const productId = document.getElementById('heatmapProduct').value;
  const product = salesHeatmapData.products.find(product => product.id === productId);
  const area = document.getElementById('heatmapArea').value;
  const measure = document.getElementById('heatmapMeasure').value;
  const daily = descriptiveUsesDailyGrain();
  const custom = descriptivePeriod === 'custom';
  const hasDailySource = Array.isArray(salesHeatmapData.daily) && salesHeatmapData.daily.length > 0;
  const useDailySource = (daily || custom) && hasDailySource;
  const sourceRows = useDailySource ? (Array.isArray(salesHeatmapData.daily) ? salesHeatmapData.daily : []) : salesHeatmapData.monthly;
  const totals = new Map();
  sourceRows.filter(row => row.product === productId && (area === 'all' || row.area === area) && descriptivePeriodIncludes(row.period)).forEach(row => {
    const period = daily ? row.period : String(row.period).slice(0,7);
    const total = totals.get(period) || {quantity:0,rows:0};
    total.quantity += row.quantity; total.rows += row.row_count; totals.set(period,total);
  });
  const periods = descriptiveAxisPeriods();
  const observed = periods.filter(period => totals.has(period));
  const mean = !daily && observed.length === periods.length && periods.length > 0
    ? observed.reduce((sum,period)=>sum+totals.get(period).quantity,0)/periods.length : null;
  salesHeatmapView = periods.map(period => {
    const entry = totals.get(period), quantity = entry ? entry.quantity : null;
    return {period, quantity, rows:entry?.rows || 0, value:measure==='units' ? quantity : mean > 0 && quantity !== null ? quantity/mean : null};
  });
  const format = value => value === null ? '—' : value.toLocaleString('en-PH',{maximumFractionDigits:measure==='units'?2:2});
  const unit = measure==='units' ? 'source units' : '× selected-year monthly mean';
  document.getElementById('salesHeatmapTitle').textContent = (daily?'Daily':'Monthly') + (measure==='units'?' units sold':' within-year index') + ' — ' + (product?.label || 'No product');
  const max = Math.max(0,...salesHeatmapView.map(row=>row.value??0));
  const grid = document.getElementById('revenueHeatmapGrid');
  const table = document.createElement('table'); table.className='product-table'; table.style.minWidth='780px';
  const header = table.createTHead().insertRow();
  const scopeHeader=document.createElement('th');scopeHeader.textContent=descriptivePeriodLabel();scopeHeader.scope='col';header.appendChild(scopeHeader);
  periods.forEach(period=> { const th=document.createElement('th');th.textContent=descriptivePointLabel(period);th.scope='col';header.appendChild(th); });
  const body=table.createTBody();
  const tr=body.insertRow();const rowLabel=document.createElement('th');rowLabel.scope='row';rowLabel.textContent=measure==='units'?'Units':'Index';tr.appendChild(rowLabel);
  salesHeatmapView.forEach(row=>{
      const td=tr.insertCell(); const ratio=max>0 && row.value!==null?row.value/max:0;
      td.textContent=format(row.value);td.dataset.period=row.period;td.dataset.value=row.value===null?'':String(row.value);
      td.style.padding='10px 7px';td.style.textAlign='center';td.style.border='2px solid white';
      td.style.background=row.value===null?'#E5E7EB':ratio>.75?'#1E3A5F':ratio>.5?'#3D6688':ratio>.25?'#9CB7CC':'#EAF2F8';
      td.style.color=ratio>.5 && row.value!==null?'white':'#1A2B3C';
      td.tabIndex=0;
      const tooltip=row.period+': '+(row.value===null?'Unavailable':format(row.value)+' '+unit)+'; '+(row.quantity===null?'no observed records':row.quantity+' source units; '+row.rows+' records');
      td.title=tooltip;td.setAttribute('aria-label',tooltip);
      td.addEventListener('focus',()=>document.getElementById('heatmapStatus').textContent=tooltip);
  });
  grid.replaceChildren(table);
  const observedView=salesHeatmapView.filter(row=>row.quantity!==null);
  const peak=observedView.reduce((best,row)=>!best||row.quantity>best.quantity?row:best,null);
  document.getElementById('heatmapStatus').textContent=observedView.length+' of '+salesHeatmapView.length+' '+(daily?'days':'months')+' have observed records. '+(product?.category||'Unclassified')+'; '+(area==='all'?'all sales areas':area)+'.';
  document.getElementById('heatmapLegend').textContent='Light to dark: 0–'+format(max)+' '+unit+' for this selection. Gray: unavailable; recorded zero: 0. '+(measure==='index'?'Index is unavailable for incomplete years.':'');
  document.getElementById('heatmapInsight').textContent=peak ? 'Highest observed quantity: '+peak.period+', '+peak.quantity.toLocaleString('en-PH')+' source units. This is a sales-volume observation, not evidence of a disease surge.' : 'No observed product quantities match these filters.';
  const source=salesHeatmapData.source;
  document.getElementById('heatmapSource').textContent=source.file+' · Snapshot: '+(source.generated_at||'unknown')+' · '+source.included_rows+' included records; '+Object.entries(source.excluded).map(([key,value])=>key+': '+value).join(', ')+'. Mapping: '+(product?.mapping_status||'unmapped')+'. '+(product?.pack_size?'Source pack label: '+product.pack_size+'. ':'')+'Aliases are not merged without approval. Shared historical period: '+descriptivePeriodLabel()+'.';
  const chronological=salesHeatmapView.slice().sort((a,b)=>a.period.localeCompare(b.period));
  createChart('quantityTrendChart', {type:'line',data:{labels:chronological.map(row=>row.period),datasets:[{label:'Units sold (source units)',data:chronological.map(row=>row.quantity),borderColor:'#1E3A5F',pointRadius:3,tension:0,spanGaps:false}]},options:{...baseChartOptions(),plugins:{...baseChartOptions().plugins,tooltip:{callbacks:{label:context=>context.raw===null?'Unavailable':Number(context.raw).toLocaleString('en-PH')+' source units'}}},scales:{x:{ticks:{maxTicksLimit:16}},y:{beginAtZero:true,title:{display:true,text:'Units sold (source units)'},ticks:{callback:value=>Number(value).toLocaleString('en-PH')}}}}});
}

function exportSalesHeatmapCSV() {
  if (!salesHeatmapData || !salesHeatmapView.length) return;
  const product=document.getElementById('heatmapProduct').value, area=document.getElementById('heatmapArea').value, measure=document.getElementById('heatmapMeasure').value;
  const rows=[['Product','Category','Sales area','Period','Units sold (source units)','Measure','Displayed value','Observed rows','Source'],...salesHeatmapView.map(row=>[product,document.getElementById('heatmapCategory').value,area,row.period,row.quantity??'',measure,row.value??'',row.rows,salesHeatmapData.source.file])];
  const csv=rows.map(row=>row.map(value=>{
    let text=String(value); if (/^[=+@\-\t\r]/.test(text)) text="'"+text;
    return '"'+text.replace(/"/g,'""')+'"';
  }).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([String.fromCharCode(65279),csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=(descriptiveUsesDailyGrain()?'daily':'monthly')+'-product-quantities.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
`
