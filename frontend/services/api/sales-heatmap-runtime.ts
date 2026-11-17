export const SALES_HEATMAP_MARKUP = `
<div class="chart-card" data-sales-heatmap style="margin-bottom:20px;">
  <style>
    [data-sales-heatmap] {min-width:0;width:100%;}
    [data-sales-heatmap] label {display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:600;min-width:0;}
    [data-sales-heatmap] select,[data-sales-heatmap] button,[data-sales-heatmap] input {font:inherit;color:var(--text-primary);background:white;border:1px solid var(--border);border-radius:6px;padding:8px;max-width:100%;}
    [data-sales-heatmap] button {cursor:pointer;white-space:nowrap;}
    [data-sales-heatmap] button:hover {background:var(--bg-elevated);}
    [data-sales-heatmap] :is(select,button,input,summary,td):focus-visible {outline:2px solid #1E3A5F;outline-offset:2px;}
    [data-sales-heatmap] :disabled {opacity:.5;cursor:not-allowed;}
    [data-sales-heatmap] .chart-title {overflow-wrap:anywhere;}
    [data-sales-heatmap] [hidden] {display:none !important;}
    [data-sales-heatmap] .quantity-summary {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;border-block:1px solid var(--border);padding:18px 0;margin:16px 0;}
    [data-sales-heatmap] .quantity-summary dt {font-size:11px;color:var(--text-secondary);margin-bottom:6px;}
    [data-sales-heatmap] .quantity-summary dd {margin:0;font-size:24px;font-weight:650;font-variant-numeric:tabular-nums;line-height:1.2;}
    [data-sales-heatmap] .quantity-summary small {display:block;font-size:11px;color:var(--text-secondary);margin-top:6px;}
    [data-sales-heatmap] .quantity-empty {padding:30px 20px;border:1px dashed var(--border);border-radius:8px;background:#F8FAFC;text-align:center;margin-top:16px;}
    [data-sales-heatmap] .quantity-empty strong {display:block;font-size:15px;margin-bottom:8px;}
    [data-sales-heatmap] .quantity-empty p {margin:0 auto;max-width:520px;line-height:1.6;font-size:12px;color:var(--text-secondary);}
    [data-sales-heatmap] .quantity-plot {height:300px;background:white;border:0;border-radius:0;padding:4px 0;}
    [data-sales-heatmap] .quantity-toolbar {display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;}
    [data-sales-heatmap] .quantity-picker {position:relative;width:320px;max-width:100%;}
    [data-sales-heatmap] .quantity-picker > summary {border:1px solid var(--border);border-radius:6px;padding:10px 12px;cursor:pointer;overflow-wrap:anywhere;}
    [data-sales-heatmap] .quantity-picker > summary[aria-disabled="true"] {opacity:.5;cursor:not-allowed;}
    [data-sales-heatmap] .quantity-picker-panel {position:absolute;top:calc(100% + 6px);left:0;z-index:20;width:400px;max-width:calc(100vw - 64px);background:white;border:1px solid var(--border);border-radius:8px;box-shadow:0 6px 18px #1E3A5F1A;padding:12px;}
    [data-sales-heatmap] .quantity-picker-panel input {width:100%;font-size:13px;}
    [data-sales-heatmap] .quantity-picker-panel label {margin-bottom:10px;}
    [data-sales-heatmap] .quantity-product-list {max-height:288px;overflow-y:auto;overscroll-behavior:contain;margin-top:8px;}
    [data-sales-heatmap] .quantity-product-list button {display:block;text-align:left;width:100%;white-space:normal;border:0;border-radius:4px;min-height:48px;padding:8px;overflow-wrap:anywhere;}
    [data-sales-heatmap] .quantity-product-list button[aria-pressed="true"] {background:#EEF4FA;}
    [data-sales-heatmap] .quantity-product-list strong {display:block;font-weight:600;font-size:12px;}
    [data-sales-heatmap] .quantity-product-list small {display:block;color:var(--text-secondary);font-size:11px;margin-top:3px;}
    [data-sales-heatmap] .quantity-filter-details > summary {cursor:pointer;font-size:12px;}
    [data-sales-heatmap] .quantity-filter-fields {display:flex;flex-wrap:wrap;gap:12px;margin:10px 0;}
    [data-sales-heatmap] .quantity-active-scope {font-size:12px;color:var(--text-secondary);overflow-wrap:anywhere;}
    @media(max-width:600px) {[data-sales-heatmap] .quantity-summary {gap:12px;}[data-sales-heatmap] .quantity-summary dd {font-size:19px;}[data-sales-heatmap] .quantity-plot {height:260px;}}
  </style>
  <div class="chart-header"><div><div class="chart-title" id="salesHeatmapTitle">Monthly units sold</div>
    <div class="chart-subtitle">One product per view. Category narrows the product list; different pack sizes are not added together.</div></div>
    <button type="button" onclick="exportSalesHeatmapCSV()">Export CSV</button></div>
  <div class="quantity-toolbar">
    <details class="quantity-picker" id="quantityProductPicker">
      <summary aria-disabled="true">Product: <strong id="quantitySelectedProduct">Loading…</strong></summary>
      <div class="quantity-picker-panel">
        <label for="quantityProductSearch">Find a product<input id="quantityProductSearch" type="search" placeholder="Search name, strength or pack…" autocomplete="off" aria-controls="quantityProductResults"></label>
        <label>Category <select id="heatmapCategory" onchange="changeHeatmapCategory()"></select></label>
        <p id="quantityProductCount" class="chart-subtitle" role="status"></p>
        <div id="quantityProductResults" class="quantity-product-list" role="group" aria-label="Matching products"></div>
      </div>
    </details>
    <select id="heatmapProduct" onchange="renderSalesHeatmap()" aria-label="Selected product" hidden tabindex="-1"></select>
    <span id="quantityActiveScope" class="quantity-active-scope"></span>
    <details class="quantity-filter-details" id="quantityMoreFilters"><summary>More filters</summary><div class="quantity-filter-fields">
    <label>Sales area <select id="heatmapArea" onchange="renderSalesHeatmap()" style="max-width:200px;"></select></label>
    <label>Measure <select id="heatmapMeasure" onchange="renderSalesHeatmap()"><option value="units">Original-source units</option><option value="estimated">Adjusted-source units</option><option value="unreviewed">Unreviewed-source units</option><option value="verified">Independently verified units</option><option value="index">Within-year index</option></select></label>
    </div></details>
  </div>
  <p class="chart-subtitle" id="heatmapStatus" role="status">Loading product-level quantities…</p>
  <dl id="quantitySummary" class="quantity-summary" hidden>
    <div><dt id="quantityTotalLabel">Recorded total</dt><dd id="quantityTotal">—</dd><small id="quantityTotalNote"></small></div>
    <div><dt id="quantityAverageLabel">Average per recorded month</dt><dd id="quantityAverage">—</dd><small id="quantityAverageNote"></small></div>
    <div><dt>Recorded coverage</dt><dd id="quantityCoverage">—</dd><small id="quantityCoverageNote"></small></div>
  </dl>
  <p id="heatmapInsight" style="margin:12px 0;" aria-live="polite"></p>
  <div id="quantityEmpty" class="quantity-empty" hidden><strong id="quantityEmptyTitle"></strong><p id="quantityEmptyHelp"></p></div>
  <p id="quantityTrendMeaning" class="chart-subtitle" hidden></p>
  <div id="quantityPlot" class="chart-wrap quantity-plot" hidden><canvas id="quantityTrendChart" aria-label="Monthly units sold for the selected product" role="img"></canvas></div>
  <details style="margin-top:12px;" id="quantityHeatmapDetail"><summary>Inspect exact quantities and heatmap</summary>
    <div id="revenueHeatmapGrid" style="overflow-x:auto;margin-top:12px;min-height:36px;"></div>
    <p id="heatmapLegend" class="chart-subtitle" style="margin:12px 0;"></p>
  </details>
  <details style="margin-top:12px;"><summary>Source and calculation</summary><p id="heatmapSource" style="margin-top:8px;"></p>
    <p>Quantities are recorded source units for the selected source label; pack equivalence and medical SKU identity are not verified. Unobserved months remain unavailable. Original-source, adjusted-source and unreviewed-source quantities are separate selections. Unreviewed source units do not establish approved medicine demand. File-level adjusted provenance does not mean every row was substituted. Verified services are excluded from physical quantities. A within-year index divides each month by that year's monthly mean and requires all 12 observed months and a positive mean. It describes relative intensity; it does not prove recurring seasonality.</p>
  </details>
</div>`

export const SALES_HEATMAP_SCRIPT = String.raw`
let salesHeatmapData = null;
let salesHeatmapView = [];
let quantityProductCoverage = new Map();

function quantityRowsInScope() {
  const daily=descriptiveUsesDailyGrain(), custom=descriptivePeriod==='custom';
  const useDaily=(daily || custom) && Array.isArray(salesHeatmapData.daily) && salesHeatmapData.daily.length>0;
  const rows=useDaily?salesHeatmapData.daily:salesHeatmapData.monthly;
  const area=document.getElementById('heatmapArea').value;
  return rows.filter(row=>(area==='all' || row.area===area) && descriptivePeriodIncludes(row.period) && (!custom || useDaily || (String(row.period)+'-01'>=customDateStart && new Date(Date.UTC(Number(row.period.slice(0,4)),Number(row.period.slice(5,7)),0)).toISOString().slice(0,10)<=customDateEnd)));
}

function quantitySourceValue(row) {
  const measure=document.getElementById('heatmapMeasure').value;
  return measure==='unreviewed'?row.unreviewed_quantity:measure==='estimated'?row.estimated_quantity:measure==='verified'?row.verified_quantity:row.quantity;
}

function updateQuantityProductResults() {
  if (!salesHeatmapData) return;
  const search=document.getElementById('quantityProductSearch').value.trim().toLocaleLowerCase();
  const category=document.getElementById('heatmapCategory').value;
  const selected=document.getElementById('heatmapProduct').value;
  const matches=salesHeatmapData.products.filter(product=>(category==='all' || product.category===category) && search.split(/\s+/).every(term=>[product.label,product.id,product.pack_size,...(product.original_aliases||[])].join(' ').toLocaleLowerCase().includes(term))).sort((a,b)=>Number(b.label.toLocaleLowerCase().startsWith(search))-Number(a.label.toLocaleLowerCase().startsWith(search)) || a.label.localeCompare(b.label,undefined,{numeric:true}));
  const labelCounts=new Map();matches.forEach(product=>labelCounts.set(product.label,(labelCounts.get(product.label)||0)+1));
  const periods=descriptiveAxisPeriods();
  const grain=descriptiveUsesYearlyGrain()?'years':descriptiveUsesDailyGrain()?'days':'months';
  const results=document.getElementById('quantityProductResults');
  document.getElementById('quantityProductCount').textContent=matches.length?matches.length+' matching product'+(matches.length===1?'':'s'):'No matching products. Try another name or category.';
  results.replaceChildren(...matches.map(product=>{
    const button=document.createElement('button');button.type='button';button.dataset.product=product.id;
    button.setAttribute('aria-pressed',String(product.id===selected));
    const name=document.createElement('strong');name.textContent=product.label;
    const detail=document.createElement('small');
    const count=quantityProductCoverage.get(product.id)?.size||0;
    const identity=[product.pack_size, labelCounts.get(product.label)>1?product.id:''].filter(Boolean).join(' · ');
    detail.textContent=(identity?identity+' · ':'')+(count?count+' of '+periods.length+' '+grain+' recorded':'No records in this scope');
    button.append(name,detail);
    button.addEventListener('click',()=>{
      document.getElementById('heatmapProduct').value=product.id;
      renderSalesHeatmap();
      document.getElementById('quantityProductPicker').open=false;
      document.querySelector('#quantityProductPicker > summary').focus();
    });
    return button;
  }));
}

function setupQuantityProductPicker() {
  const picker=document.getElementById('quantityProductPicker');
  if (!picker || picker.dataset.bound) return;
  picker.dataset.bound='true';
  const search=document.getElementById('quantityProductSearch');
  const summary=picker.querySelector('summary');
  summary.addEventListener('click',event=>{
    if(!salesHeatmapData){event.preventDefault();return;}
    if(!picker.open){search.value='';updateQuantityProductResults();}
  });
  picker.addEventListener('toggle',()=>{
    if(!picker.open)return;
    search.focus();
  });
  search.addEventListener('input',updateQuantityProductResults);
  picker.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();picker.open=false;summary.focus();return;}
    const buttons=[...picker.querySelectorAll('#quantityProductResults button')];
    const index=buttons.indexOf(document.activeElement);
    if(event.key==='ArrowDown' || event.key==='ArrowUp') {
      if(document.activeElement!==search && index<0)return;
      event.preventDefault();
      const next=index<0?(event.key==='ArrowDown'?0:buttons.length-1):(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
      buttons[next]?.focus();
    } else if(event.key==='Enter' && document.activeElement===search){event.preventDefault();buttons[0]?.click();}
  });
  picker.addEventListener('focusout',event=>{if(event.relatedTarget && !picker.contains(event.relatedTarget))picker.open=false;});
  document.addEventListener('click',event=>{if(!picker.contains(event.target))picker.open=false;});
}

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
  if(data) data={...data,monthly:data.monthly.filter(r=>historicalPeriod(r.period))};
  salesHeatmapData = data;
  setupQuantityProductPicker();
  document.querySelectorAll('[data-sales-heatmap] select,[data-sales-heatmap] button,[data-sales-heatmap] input').forEach(control=>control.disabled=!data);
  document.querySelector('#quantityProductPicker > summary').setAttribute('aria-disabled',String(!data));
  if (!data) {
    document.getElementById('quantityProductPicker').open=false;
    document.getElementById('quantitySelectedProduct').textContent='Unavailable';
    document.getElementById('quantityActiveScope').textContent='';
    document.getElementById('quantityProductResults').replaceChildren();
    document.getElementById('quantityProductCount').textContent='';
    quantityProductCoverage.clear();
    document.getElementById('quantitySummary').hidden = true;
    document.getElementById('quantityPlot').hidden = true;
    document.getElementById('quantityTrendMeaning').hidden = true;
    document.getElementById('quantityHeatmapDetail').hidden = true;
    document.getElementById('quantityEmpty').hidden = false;
    document.getElementById('quantityEmptyTitle').textContent = 'Product quantities unavailable';
    document.getElementById('quantityEmptyHelp').textContent = 'Reload after the sales service is available.';
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
  const categories = [...new Set(['Medical','Non-Medical','Unclassified',...data.products.map(product => product.category)])].sort();
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
  const evidenceLabel = measure === 'unreviewed' ? 'unreviewed-source' : measure === 'estimated' ? 'adjusted-source' : measure === 'verified' ? 'independently verified' : 'original-source';
  const daily = descriptiveUsesDailyGrain();
  const yearly = descriptiveUsesYearlyGrain();
  const sourceRows = quantityRowsInScope();
  const totals = new Map();
  const axisPeriods=new Set(descriptiveAxisPeriods());
  quantityProductCoverage=new Map();
  sourceRows.forEach(row => {
    const period = yearly ? String(row.period).slice(0,4) : daily ? row.period : String(row.period).slice(0,7);
    const value = quantitySourceValue(row);
    if (value == null) return;
    if(axisPeriods.has(period)) {
      if(!quantityProductCoverage.has(row.product))quantityProductCoverage.set(row.product,new Set());
      quantityProductCoverage.get(row.product).add(period);
    }
    if(row.product!==productId)return;
    const total = totals.get(period) || {quantity:0,rows:0};
    total.quantity += value; total.rows += row.row_count; totals.set(period,total);
  });
  const duplicateLabel=product && salesHeatmapData.products.some(other=>other.id!==product.id && other.label===product.label);
  document.getElementById('quantitySelectedProduct').textContent=product?product.label+(duplicateLabel?' · '+[product.pack_size,product.id].filter(Boolean).join(' · '):''):'Choose a product';
  document.getElementById('quantityActiveScope').textContent=(area==='all'?'All sales areas':area)+' · '+document.getElementById('heatmapMeasure').selectedOptions[0].textContent;
  updateQuantityProductResults();
  const periods = descriptiveAxisPeriods();
  const observed = periods.filter(period => totals.has(period));
  const mean = !daily && !yearly && periods.length === 12 && new Set(periods.map(p=>p.slice(0,4))).size === 1 && observed.length === 12
    ? observed.reduce((sum,period)=>sum+totals.get(period).quantity,0)/periods.length : null;
  salesHeatmapView = periods.map(period => {
    const entry = totals.get(period), quantity = entry ? entry.quantity : null;
    return {period, quantity, rows:entry?.rows || 0, value:measure!=='index' ? quantity : mean > 0 && quantity !== null ? quantity/mean : null};
  });
  const format = value => value === null ? '—' : value.toLocaleString('en-PH',{maximumFractionDigits:measure==='units'?2:2});
  const unit = measure!=='index' ? (product?.unit || 'source units') : '× selected-year monthly mean';
  document.getElementById('salesHeatmapTitle').textContent = (yearly?'Yearly':daily?'Daily':'Monthly') + (measure==='index'?' within-year index':measure==='unreviewed'?' unreviewed-source units':measure==='estimated'?' adjusted-source units':measure==='verified'?' independently verified units':' original-source units');
  const max = Math.max(0,...salesHeatmapView.map(row=>Math.abs(row.value??0)));
  const grid = document.getElementById('revenueHeatmapGrid');
  const table = document.createElement('table'); table.className='product-table'; table.style.minWidth='780px';
  const header = table.createTHead().insertRow();
  const scopeHeader=document.createElement('th');scopeHeader.textContent=descriptivePeriodLabel();scopeHeader.scope='col';header.appendChild(scopeHeader);
  periods.forEach(period=> { const th=document.createElement('th');th.textContent=descriptivePointLabel(period);th.scope='col';header.appendChild(th); });
  const body=table.createTBody();
  const tr=body.insertRow();const rowLabel=document.createElement('th');rowLabel.scope='row';rowLabel.textContent=measure!=='index'?'Units':'Index';tr.appendChild(rowLabel);
  salesHeatmapView.forEach(row=>{
      const td=tr.insertCell(); const ratio=max>0 && row.value!==null?Math.abs(row.value)/max:0;
      td.textContent=format(row.value);td.dataset.period=row.period;td.dataset.value=row.value===null?'':String(row.value);
      td.style.padding='10px 7px';td.style.textAlign='center';td.style.border='2px solid white';
      td.style.background=row.value===null?'#E5E7EB':row.value===0?'#FFFFFF':row.value<0?(ratio>.5?'#9F352E':ratio>.25?'#E6A49E':'#FCE9E7'):ratio>.75?'#1E3A5F':ratio>.5?'#3D6688':ratio>.25?'#9CB7CC':'#EAF2F8';
      td.style.color=ratio>.5 && row.value!==null?'white':'#1A2B3C';
      td.tabIndex=0;
      const tooltip=row.period+': '+(row.value===null?'Unavailable':format(row.value)+' '+unit)+'; '+(row.quantity===null?'no observed records':row.quantity+' source units; '+row.rows+' records');
      td.title=tooltip;td.setAttribute('aria-label',tooltip);
      td.addEventListener('focus',()=>document.getElementById('heatmapStatus').textContent=tooltip);
  });
  grid.replaceChildren(table);
  const observedView=salesHeatmapView.filter(row=>row.quantity!==null);
  const displayedView=salesHeatmapView.filter(row=>row.value!==null);
  const peak=displayedView.reduce((best,row)=>!best||row.value>best.value?row:best,null);
  document.getElementById('heatmapStatus').textContent=(product?.label || 'No product')+' · '+observedView.length+' of '+salesHeatmapView.length+' '+(yearly?'years':daily?'days':'months')+' have '+evidenceLabel+' records. '+(product?.category||'Unclassified')+'; '+(area==='all'?'all sales areas':area)+'.';
  document.getElementById('heatmapLegend').textContent='Blue: positive; red: negative; darker means larger absolute value, up to '+format(max)+' '+unit+' in this selection. White: recorded zero; gray: unavailable. Negative quantities may reflect returns or corrections; inspect the records. '+(measure==='index'?'Index requires one complete year at monthly grain; switch to Monthly and select one full year.':'');
  document.getElementById('heatmapInsight').textContent=measure==='index'
    ? peak ? 'Highest within-year index: '+peak.period+', '+format(peak.value)+'× the selected year’s monthly average. This describes relative sales intensity, not recurring seasonality or a disease surge.'
      : 'Within-year index is unavailable. Select one complete year at monthly grain with 12 observed months and a positive average.'
    : peak ? 'Highest '+evidenceLabel+' quantity: '+peak.period+', '+peak.quantity.toLocaleString('en-PH')+' source units. This is a sales-volume observation, not evidence of a disease surge.' : 'No '+evidenceLabel+' quantities match these filters.';
  const source=salesHeatmapData.source;
  document.getElementById('heatmapSource').textContent=source.file+' · Snapshot: '+(source.generated_at||'unknown')+' · '+source.included_rows+' included records; '+Object.entries(source.excluded).map(([key,value])=>key+': '+value).join(', ')+'. Mapping: '+(product?.mapping_status||'unmapped')+'. '+(product?.pack_size?'Source pack label: '+product.pack_size+'. ':'')+'Identity: '+(product?.identity_status || 'needs_review')+'; item kind: '+(product?.item_kind || 'unknown')+'; aliases: '+(product?.original_aliases || []).join('; ')+'. Adjusted provenance is file-level. Aliases are not merged without approval. Shared historical period: '+descriptivePeriodLabel()+'.';
  const chronological=salesHeatmapView.slice().sort((a,b)=>a.period.localeCompare(b.period));
  const indexMode=measure==='index';
  const grain=yearly?'year':daily?'day':'month';
  const total=observedView.length ? observedView.reduce((sum,row)=>sum+row.quantity,0) : null;
  const average=displayedView.length ? displayedView.reduce((sum,row)=>sum+row.value,0)/displayedView.length : null;
  const setText=(id,text)=>document.getElementById(id).textContent=text;
  document.getElementById('quantitySummary').hidden=false;
  setText('quantityTotalLabel',indexMode?'Highest index':'Recorded total');
  setText('quantityTotal',format(indexMode ? peak?.value ?? null : total)+(indexMode && peak?'×':''));
  setText('quantityTotalNote',indexMode ? peak ? descriptivePointLabel(peak.period) : 'Complete year required' : 'Source units · '+(observedView.length<periods.length?'partial coverage':'selected period'));
  setText('quantityAverageLabel',indexMode?'Average index':'Average per recorded '+grain);
  setText('quantityAverage',format(average)+(indexMode && average!==null?'×':''));
  setText('quantityAverageNote',indexMode?'1× = selected-year monthly mean':'Source units · missing '+grain+'s excluded');
  setText('quantityCoverage',observedView.length+' / '+periods.length);
  setText('quantityCoverageNote',grain+'s with '+evidenceLabel+' records');
  const hasValues=displayedView.length>0;
  document.getElementById('quantityPlot').hidden=!hasValues;
  document.getElementById('quantityTrendMeaning').hidden=!hasValues;
  document.getElementById('quantityHeatmapDetail').hidden=!hasValues;
  document.getElementById('quantityEmpty').hidden=hasValues;
  setText('quantityEmptyTitle',indexMode?'A complete year is needed':'No '+evidenceLabel+' quantities in this selection');
  setText('quantityEmptyHelp',indexMode?'Select monthly grouping and one full year with 12 recorded months and a positive average.':'Try another period, product, sales area or source measure. Missing records are unavailable, not zero; source measures are kept separate.');
  document.getElementById('heatmapInsight').hidden=!hasValues;
  document.getElementById('quantityTrendMeaning').textContent=indexMode?'Within-year index: 1× = the selected year’s monthly average. A complete year is required; this is not proof of recurring seasonality. The line and heatmap use the same measure.':'Recorded source-unit quantities for one product; missing periods stay blank. Negative values remain visible. Open the heatmap for exact values.';
  document.getElementById('quantityTrendChart').setAttribute('aria-label',(indexMode?'Within-year quantity index':'Recorded source-unit quantities')+' for '+(product?.label||'selected product')+'; '+descriptivePeriodLabel());
  if (!hasValues) { Chart.getChart(document.getElementById('quantityTrendChart'))?.destroy(); return; }
  if (!indexMode) document.getElementById('quantityTrendMeaning').textContent='Blue: positive quantities · Red: negative quantities. Missing periods stay blank; recorded zero remains 0 in the exact values. Source units are not pack-normalized.';
  createChart('quantityTrendChart', {type:indexMode?'line':'bar',data:{labels:chronological.map(row=>row.period),datasets:[{label:indexMode?'Within-year index':evidenceLabel+' units',data:chronological.map(row=>row.value),backgroundColor:chronological.map(row=>row.value<0?'#B4534B':'#365D80'),borderColor:'#1E3A5F',borderRadius:indexMode?0:3,maxBarThickness:48,pointRadius:chronological.length>60?1.5:3,tension:0,spanGaps:false}]},options:{...baseChartOptions(),plugins:{...baseChartOptions().plugins,legend:{display:false},tooltip:{callbacks:{title:contexts=>(product?.label||'Selected product')+' · '+chronological[contexts[0]?.dataIndex]?.period,label:context=>context.raw===null?'Unavailable':Number(context.raw).toLocaleString('en-PH')+(indexMode?' × monthly mean':' source units')}}},scales:{x:{grid:{display:false},ticks:{autoSkip:true,maxTicksLimit:window.innerWidth<600?5:12,maxRotation:0,callback:(value,index)=>descriptivePointLabel(chronological[index]?.period || '')}},y:{beginAtZero:true,border:{display:false},grid:{color:context=>context.tick.value===0?'#94A3B8':'#EEF2F6'},title:{display:true,text:indexMode?'Index (× monthly mean)':'Source units'},ticks:{callback:value=>Number(value).toLocaleString('en-PH',{notation:'compact',maximumFractionDigits:1})}}}}});
}

function exportSalesHeatmapCSV() {
  if (!salesHeatmapData || !salesHeatmapView.length) return;
  const product=document.getElementById('heatmapProduct').value, area=document.getElementById('heatmapArea').value, measure=document.getElementById('heatmapMeasure').value;
  const metadata=salesHeatmapData.products.find(p=>p.id===product)||{}, release=salesHeatmapData.source.release||{};
  const rows=[['Product','Category','Sales area','Period','Units sold (source units)','Measure','Displayed value','Source records','Source','Identity status','Item kind','Packaging unit','Pack count','Contained unit','Original aliases','Quantity provenance','Dataset ID','Fact Delta version','Mapping hash','Resolution policy','Canonical title','Unit','Transaction lineage','Transaction evidence hash','Catalog helper hash'],...salesHeatmapView.map(row=>[product,metadata.category || 'Unclassified',area,row.period,row.quantity??'',measure,row.value??'',row.rows,salesHeatmapData.source.file,metadata.identity_status||'needs_review',metadata.item_kind||'unknown',metadata.packaging_unit||'Unknown',metadata.pack_count||'',metadata.contained_unit||'',(metadata.original_aliases||[]).join('; '),measure==='unreviewed'?'unreviewed_source_detail':measure==='estimated'?'adjusted_estimated_source':measure==='verified'?'independently_verified_detail':'original_source_detail',release.dataset_id||'',release.fact_delta_version??'',release.product_master_sha256||'',metadata.resolution_policy||'legacy_unresolved',metadata.label||'',metadata.unit||'Unknown',(metadata.transaction_lineage||[]).join('; '),release.transaction_evidence_sha256||'',release.catalog_helper_sha256||''])];
  const csv=analyticalScopeCsv(rows,release).map(row=>row.map(value=>{
    let text=String(value); if (typeof value === 'string' && /^[=+@\-\t\r]/.test(text)) text="'"+text;
    return '"'+text.replace(/"/g,'""')+'"';
  }).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([String.fromCharCode(65279),csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=(descriptiveUsesYearlyGrain()?'yearly':descriptiveUsesDailyGrain()?'daily':'monthly')+'-product-quantities.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
`
