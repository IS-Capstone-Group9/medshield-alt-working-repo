import Chart from 'chart.js/auto'
import {getJson} from './api-client'
import {REGION_NAMES,regionalView,regionalCoverage,regionalComparisons,regionalComparisonCsvRecords,regionalJuneReview,regionalCsvRecords,regionalTotalsCsvRecords,validRegionalData,validRegionalStl,regionalStlCsvRecords,regionalStlStrengths,type RegionalData,type RegionalStl} from './regional-sales-model'

const money=(v:string|null)=>v===null?'Unavailable':'₱'+Number(v).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})
const pct=(v:number|null)=>v===null?'Unavailable':v.toFixed(2)+'%'
export function installRegionalSalesPanel(root:HTMLElement):()=>void{
  const host=root.querySelector<HTMLElement>('[data-sales-output-panel="so1"]');if(!host)return()=>{}
  const panel=document.createElement('section');panel.className='chart-card regional-review';panel.setAttribute('aria-label','User-confirmed regional sales review')
  panel.innerHTML=`<style>.regional-review{min-width:0;overflow-wrap:anywhere}.regional-review p{line-height:1.6}.regional-review .regional-controls{display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin:14px 0}.regional-review select{padding:8px;max-width:100%;border:1px solid var(--border);border-radius:6px;background:var(--bg-card,#fff);color:inherit}.regional-review .regional-scroll{overflow-x:auto;max-width:100%}.regional-review .regional-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:16px 0}.regional-review .regional-kpis div{padding:14px;border:1px solid var(--border);border-radius:6px}.regional-review .regional-kpis dt{font-size:12px;margin-bottom:6px}.regional-review .regional-kpis dd{font-size:22px;font-weight:600;margin:0}.regional-review details{margin:16px 0}.regional-review summary{cursor:pointer;font-weight:600;padding:8px 0}.regional-review th,.regional-review td{padding:10px;font-size:12px;white-space:nowrap}.regional-review .regional-chart{height:280px;position:relative;margin:16px 0}.regional-review button:focus-visible,.regional-review select:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.regional-review button:disabled,.regional-review select:disabled{opacity:.55;cursor:not-allowed}@media(max-width:600px){.regional-review .regional-kpis{grid-template-columns:1fr}.regional-review{padding:14px}.regional-review .regional-controls label{width:100%}.regional-review .regional-chart{height:230px}}</style>
    <h2 class="chart-title">Regional sales</h2>
    <p>Recorded itemized deliveries · Contracts excluded · All buyers. Choose a region and year below; Analysis filters do not apply here.</p>
    <p><strong>Partial coverage.</strong> Only confirmed delivery labels are grouped into regions. Unconfirmed/channel labels stay unallocated. Research review; financial and model publication remain unapproved.</p>
    <p id="regionalStatus" role="status">Open Territory baseline to load regional review.</p>
    <div class="regional-controls"><label>Region <select id="regionalRegion" disabled><option value="CALABARZON">CALABARZON</option><option value="MIMAROPA">MIMAROPA</option><option value="BICOL">Bicol</option><option value="UNALLOCATED">Unallocated labels</option><option value="ALL">All recorded itemized sales</option></select></label><label>Year <select id="regionalYear" disabled></select></label><button id="regionalReload" type="button" class="btn btn-secondary">Reload regions</button></div>
    <dl class="regional-kpis" aria-label="Selected regional results"><div><dt>Net sales</dt><dd id="regionalNet">Unavailable</dd></div><div><dt>Supported gross profit</dt><dd id="regionalProfit">Unavailable</dd></div><div><dt>Gross margin</dt><dd id="regionalMargin">Unavailable</dd></div></dl>
    <p id="regionalTakeaway"></p><p id="regionalQuality"></p><p id="regionalCoverage"></p>
    <p>Gross profit is before operating expenses. Margin uses only records with supported costs; it is not net profit.</p>
    <details><summary>Compare regional totals and export data</summary><div class="regional-controls"><button id="regionalExport" type="button" class="btn btn-secondary" disabled>Export selected monthly values</button><button id="regionalTotalsExport" type="button" class="btn btn-secondary" disabled>Export regional totals</button><button id="regionalComparisonExport" type="button" class="btn btn-secondary" disabled>Export regional findings</button></div><p id="regionalSummary"></p><p id="regionalYoy"></p><h3>How did each region change?</h3><p>Each region compares only months with eligible recorded sales in both years. Month sets can differ between regions; do not add these changes into a company change or use them to rank regional performance. Missing observations do not mean zero demand.</p><div class="regional-scroll"><table id="regionalComparisons" class="product-table" aria-label="Regional matching-month comparisons"></table></div><h3>Selected-period totals</h3><div class="regional-scroll"><table id="regionalTotals" class="product-table" aria-label="Regional and unallocated totals"></table></div></details>
    <div id="regionalChartWrap" class="regional-chart" hidden><canvas id="regionalChart" role="img" aria-label="Selected region recorded monthly net sales in pesos"></canvas></div>
    <details id="regionalJuneReview" hidden><summary>What do the June 2026 records show?</summary><p id="regionalJuneAmounts"></p><p id="regionalJuneCosts"></p><p id="regionalJuneDates"></p><p>These figures describe recorded deliveries. They do not establish why sales changed or prove complete regional demand.</p></details>
    <details><summary>Exact monthly values and missing periods</summary><div class="regional-scroll"><table id="regionalMonths" class="product-table" aria-label="Selected regional monthly values"></table></div></details>
    <details><summary>Delivery labels, source and limitations</summary><p id="regionalUnallocated"></p><p id="regionalMappings"></p><p id="regionalSource"></p><p id="regionalLimits"></p></details>
    <details id="regionalSeasonalDetails"><summary>Explore historical patterns · research detail</summary><h3>Retrospective regional seasonality</h3><p>Recorded net sales in PHP. Full-segment STL uses later observations; components are diagnostic, not forecast-time inputs or evidence of disease/weather causes. Missing months are never filled.</p>
    <button id="regionalStlLoad" type="button" class="btn btn-secondary" disabled>Load seasonal decomposition</button> <button id="regionalStlExport" type="button" class="btn btn-secondary" disabled>Export selected components</button>
    <p id="regionalStlStatus" role="status">Load decomposition after regional sales are available.</p><p id="regionalStlChange"></p>
    <p>Strength uses the whole fitted segment (0–1), independently of the selected display year. It describes the recorded series; it does not establish a cause or future predictability.</p><div class="regional-scroll"><table id="regionalStlStrength" class="product-table" aria-label="Full-segment retrospective STL strength"></table></div>
    <div id="regionalStlChartWrap" class="regional-chart" hidden><canvas id="regionalStlChart" role="img" aria-label="Retrospective regional trend seasonal and residual components in pesos"></canvas></div>
    <details><summary>Exact fitted components and limitations</summary><div class="regional-scroll"><table id="regionalStlPoints" class="product-table"></table></div><p id="regionalStlLimits"></p></details></details>`
  host.prepend(panel)
  const el=<T extends HTMLElement>(id:string)=>panel.querySelector<T>('#'+id)!
  const region=el<HTMLSelectElement>('regionalRegion'),year=el<HTMLSelectElement>('regionalYear'),download=el<HTMLButtonElement>('regionalExport'),totalsDownload=el<HTMLButtonElement>('regionalTotalsExport'),findingsDownload=el<HTMLButtonElement>('regionalComparisonExport')
  let data:RegionalData|null=null,chart:Chart|null=null,stl:RegionalStl|null=null,stlChart:Chart|null=null,stlSequence=0,disposed=false,loaded=false,loading=false,sequence=0
  const table=(target:HTMLTableElement,headers:string[],rows:string[][])=>{
    target.replaceChildren();const head=target.createTHead().insertRow();for(const label of headers){const th=document.createElement('th');th.textContent=label;th.scope='col';head.append(th)}
    const body=target.createTBody();for(const row of rows){const tr=body.insertRow();for(const value of row)tr.insertCell().textContent=value}
  }
  let stlController:AbortController|null=null
  const clearStl=()=>{stlController?.abort();++stlSequence;stl=null;stlChart?.destroy();stlChart=null;el('regionalStlChartWrap').hidden=true;el<HTMLButtonElement>('regionalStlExport').disabled=true;for(const id of ['regionalStlChange','regionalStlPoints','regionalStlLimits','regionalStlStrength'])el(id).replaceChildren()}
  const clear=()=>{for(const id of ['regionalNet','regionalProfit','regionalMargin'])el(id).textContent='Unavailable';data=null;chart?.destroy();chart=null;clearStl();stlSequence++;el<HTMLButtonElement>('regionalStlLoad').disabled=true;el('regionalStlStatus').textContent='Load decomposition after regional sales are available.';el('regionalChartWrap').hidden=true;download.disabled=true;totalsDownload.disabled=true;findingsDownload.disabled=true;region.disabled=true;year.disabled=true;
    el('regionalJuneReview').hidden=true
    for(const id of ['regionalJuneAmounts','regionalJuneCosts','regionalJuneDates','regionalTakeaway','regionalQuality','regionalUnallocated','regionalCoverage','regionalSummary','regionalYoy','regionalComparisons','regionalTotals','regionalMonths','regionalMappings','regionalSource','regionalLimits'])el(id).replaceChildren()}
  const renderStl=()=>{
    if(!data||!stl)return
    stlChart?.destroy();stlChart=null;el('regionalStlChartWrap').hidden=true;el('regionalStlChange').replaceChildren();el('regionalStlPoints').replaceChildren();el('regionalStlStrength').replaceChildren();el<HTMLButtonElement>('regionalStlExport').disabled=true
    const series=stl.series.find(s=>s.region===region.value),points=series?.components.filter(p=>year.value==='all'||p.period.startsWith(year.value+'-'))??[]
    el('regionalStlLimits').textContent=stl.limitations.join(' ')
    if(!series){el('regionalStlStatus').textContent='Choose a confirmed region for decomposition. No company or unallocated fit is substituted.';return}
    if(!points.length){el('regionalStlStatus').textContent=`No fitted components in this selection. Maximum contiguous observed history: ${series.maximum_contiguous_observed_months} months; the method requires 36. Qualifying segments: ${series.fitted_segments.map(s=>s.start+'–'+s.end).join(', ')||'none'}.`;return}
    el('regionalStlStatus').textContent=`${REGION_NAMES[region.value]} · ${points.length} fitted monthly components in this selection · Retrospective diagnostic only; no forecast approval.`
    table(el<HTMLTableElement>('regionalStlStrength'),['Full fitting segment','Months','Trend strength','Seasonal strength','Evidence'],regionalStlStrengths(stl).filter(s=>s.region===region.value).map(s=>[s.start+'–'+s.end,String(s.months),s.trend_strength===null?'Unavailable':s.trend_strength.toFixed(4),s.seasonal_strength===null?'Unavailable':s.seasonal_strength.toFixed(4),'Derived']))
    const bridge=series.matched_change
    if(bridge&&(year.value==='all'||year.value==='2026'))el('regionalStlChange').textContent=`Jan–Sep 2025 → 2026 recorded net change ${money(bridge.recorded_change_php)}: trend change ${money(String(bridge.component_changes_php.trend_php))}, seasonal change ${money(String(bridge.component_changes_php.seasonal_php))}, residual change ${money(String(bridge.component_changes_php.residual_php))}. This accounting bridge is not a causal explanation.`
    table(el<HTMLTableElement>('regionalStlPoints'),['Month','Recorded net','Trend','Seasonal','Residual','Whole fitting segment'],points.map(p=>[p.period,money(p.observed_net_sales_php),money(String(p.trend_php)),money(String(p.seasonal_php)),money(String(p.residual_php)),p.segment_start+'–'+p.segment_end]))
    const periods=regionalView(data,region.value,year.value).months.map(m=>m.period),lookup=new Map(points.map(p=>[p.period,p]))
    stlChart=new Chart(el<HTMLCanvasElement>('regionalStlChart'),{type:'line',data:{labels:periods,datasets:[['trend_php','Trend','#335f78'],['seasonal_php','Seasonal','#a16d33'],['residual_php','Residual','#677975']].map(([key,label,color])=>({label:label+' (PHP)',data:periods.map(m=>lookup.get(m)?.[key as 'trend_php'|'seasonal_php'|'residual_php']??null),borderColor:color,spanGaps:false}))},options:{responsive:true,maintainAspectRatio:false,animation:false,scales:{y:{title:{display:true,text:'PHP'}}}}})
    el('regionalStlChartWrap').hidden=false;el<HTMLButtonElement>('regionalStlExport').disabled=false
  }
  const render=()=>{
    if(!data)return
    if(!REGION_NAMES[region.value])region.value='CALABARZON'
    const view=regionalView(data,region.value,year.value),summary=view.summary
    const june=regionalJuneReview(data,region.value,year.value)
    el('regionalJuneReview').hidden=!june
    for(const id of ['regionalJuneAmounts','regionalJuneCosts','regionalJuneDates'])el(id).replaceChildren()
    if(june){
      el('regionalJuneAmounts').textContent=`CALABARZON · June only: recorded net sales ${money(june.previous.net_sales_php)} in 2025 → ${money(june.current.net_sales_php)} in 2026; signed change ${money(june.change)}. This is a monthly comparison, separate from the full selected-year totals above.`
      el('regionalJuneCosts').textContent=`June 2026 contains ${june.current.records} records, including ${june.current.unreviewed_records} from an unreviewed source export. Costs support ${june.current.margin_eligible_records} records; ${june.current.records-june.current.margin_eligible_records} records do not contribute supported gross profit. Supported gross profit: ${money(june.current.gross_profit_php)}. Net sales and gross profit use their own eligibility checks.`
      el('regionalJuneDates').textContent=june.sourceNoteMatches?'Source review found Quezon records with a June 9 delivery date and a separate August 18 DATE field. The recorded delivery date determines the sales month; the purpose of the separate DATE field is not established. No dates or amounts were changed.':'The reviewed date note does not match this source identity. Recorded monthly totals remain available; source-specific interpretation is unavailable.'
    }
    const margin=summary.gross_profit_php!==null&&summary.margin_revenue_basis_php!==null&&Number(summary.margin_revenue_basis_php)>0?100*Number(summary.gross_profit_php)/Number(summary.margin_revenue_basis_php):null
    const coverage=regionalCoverage(data,year.value)
    el('regionalStatus').textContent=`${REGION_NAMES[region.value]} · ${year.value==='all'?'Full observed history':year.value} · Source through ${data.source.calendar_end}.`
    el('regionalQuality').textContent=`Costs support ${summary.margin_eligible_records.toLocaleString()} of ${summary.records.toLocaleString()} records; ${summary.unreviewed_records.toLocaleString()} records are from an unreviewed source export.`
    el('regionalNet').textContent=money(summary.net_sales_php);el('regionalProfit').textContent=money(summary.gross_profit_php);el('regionalMargin').textContent=pct(margin)
    el('regionalTakeaway').textContent=year.value==='all'?'Select a year to compare sales with the previous year.':view.matched.length?`${REGION_NAMES[region.value]}: recorded net sales ${Number(view.change)<0?'fell':'rose'} ${money(String(Math.abs(Number(view.change))))} (${pct(view.growth_pct)}) against ${Number(year.value)-1}, using ${view.matched.length} months recorded in both years.`:'Year comparison unavailable: there are no matching eligible months in the previous year.'
    if(summary.records===0){
      const last=data.months.filter(month=>region.value==='ALL'||month.region===region.value).map(month=>month.period).sort().at(-1)
      el('regionalTakeaway').textContent=`No source records for ${REGION_NAMES[region.value]} in this selection. Last recorded month in the available history: ${last??'Unavailable'}. This does not establish zero sales or that deliveries stopped.`
    }
    el('regionalUnallocated').textContent='Unallocated labels: '+data.unallocated_labels.join(', ')+'.'
    el('regionalCoverage').textContent=`Across this selection, confirmed delivery regions account for ${money(coverage.confirmed.net_sales_php)} of ${money(coverage.company.net_sales_php)} recorded net sales (${pct(coverage.signed_net_share_pct)}). Unallocated labels: ${money(coverage.unallocated.net_sales_php)}. Assigned records: ${coverage.confirmed.records.toLocaleString()} / ${coverage.company.records.toLocaleString()}. This measures allocation, not reporting completeness.`
    el('regionalSummary').textContent=`Net sales ${money(summary.net_sales_php)} · Supported gross profit ${money(summary.gross_profit_php)} · Paired margin ${pct(margin)} · Margin-supported records ${summary.margin_eligible_records}/${summary.records} · ${summary.unreviewed_records} unreviewed-export records.`
    el('regionalYoy').textContent=year.value==='all'?'Select a year for matching-observed-month YoY.':view.matched.length?`${Number(year.value)-1} → ${year.value}: ${view.matched.length} matching observed months (${view.matched.map(m=>m.month).join(', ')}). Net sales ${money(view.previous)} → ${money(view.current)}; change ${money(view.change)} (${pct(view.growth_pct)}). No absent regional month is treated as zero.`:'Matching-month YoY unavailable: no comparable eligible regional month pairs.'
    table(el<HTMLTableElement>('regionalTotals'),['Region / bucket','Retained records','Eligible net records','Net sales','Supported gross profit','Margin-supported records'],[...view.summaries,view.company].map(r=>[REGION_NAMES[r.region],String(r.records),String(r.net_eligible_records),money(r.net_sales_php),money(r.gross_profit_php),String(r.margin_eligible_records)]))
    table(el<HTMLTableElement>('regionalComparisons'),['Region','Months compared','Prior recorded net','Current recorded net','Change','Change %'],regionalComparisons(data,year.value).map(r=>[REGION_NAMES[r.region],year.value==='all'?'Select a year':r.matched.length?String(r.matched.length):'Unavailable',money(r.previous),money(r.current),money(r.change),pct(r.growth_pct)]))
    table(el<HTMLTableElement>('regionalMonths'),['Month','Observation status','Retained records','Net sales','Supported gross profit','Paired revenue basis','Unreviewed records'],view.months.map(m=>[m.period,m.status,String(m.records),money(m.net_sales_php),money(m.gross_profit_php),money(m.margin_revenue_basis_php),String(m.unreviewed_records)]))
    chart?.destroy();el('regionalChartWrap').hidden=false
    chart=new Chart(el<HTMLCanvasElement>('regionalChart'),{type:'line',data:{labels:view.months.map(m=>m.period),datasets:[{label:REGION_NAMES[region.value]+' recorded net sales (PHP)',data:view.months.map(m=>m.net_sales_php===null?null:Number(m.net_sales_php)),borderColor:'#335f78',spanGaps:false}]},options:{responsive:true,maintainAspectRatio:false,animation:false,scales:{y:{title:{display:true,text:'PHP'}}}}})
    el('regionalMappings').textContent=data.mappings.map(m=>`${m.recorded_label} → ${m.province} → ${m.region}`).join('; ')+'. Confirmation: Adrian, 27 October 2026. Province-region membership checked against PSA PSGC.'
    el('regionalSource').textContent=`Gold ${data.source.fact_table} @ ${data.source.fact_version}; dataset ${data.source.dataset_id}; mapping ${data.source.mapping_table} @ 0, SHA-256 ${data.source.mapping_sha256}; monthly controls ${data.source.current_monthly_sha256}.`
    el('regionalLimits').textContent=data.limitations.join(' ');region.disabled=false;year.disabled=false;download.disabled=false;totalsDownload.disabled=false;findingsDownload.disabled=false;el<HTMLButtonElement>('regionalStlLoad').disabled=false;renderStl()
  }
  let loadController: AbortController | null = null
  const load=async()=>{
    if(disposed||loading)return;loading=true;loadController?.abort();loadController=new AbortController();loaded=true;const request=++sequence,previousYear=year.value;clear();el('regionalStatus').textContent='Loading source-matched regional sales…'
    try{const value=await getJson<RegionalData>('/api/sales/regional-source-review',{signal:loadController.signal});if(disposed||request!==sequence)return;if(!validRegionalData(value))throw Error('Invalid regional source');data=value;
      const years=[...new Set(value.months.map(m=>m.period.slice(0,4)))].sort();year.replaceChildren();year.add(new Option('Full observed history','all'));for(const y of years)year.add(new Option(y,y));year.value=years.includes(previousYear)||previousYear==='all'?previousYear:years.at(-1)!;render()}
    catch{if(!disposed&&request===sequence){clear();el('regionalStatus').textContent='Regional review unavailable. Reload to retry; no substitute values were used.'}}
    finally{if(!disposed&&request===sequence)loading=false}
  }
  const exportCsv=(totals:boolean)=>{if(!data||download.disabled)return;const records=totals?regionalTotalsCsvRecords(data,year.value):regionalCsvRecords(data,region.value,year.value),quote=(v:unknown)=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const url=URL.createObjectURL(new Blob(['\uFEFF'+records.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`medshield-regional-${totals?'totals':region.value}-${year.value}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  findingsDownload.addEventListener('click',()=>{
    if(!data||findingsDownload.disabled)return
    const records=regionalComparisonCsvRecords(data,year.value),quote=(v:unknown)=>'"'+String(v??'').replace(/"/g,'""')+'"'
    const url=URL.createObjectURL(new Blob(['\uFEFF'+records.map(row=>row.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}))
    const link=document.createElement('a');link.href=url;link.download=`medshield-regional-findings-${year.value}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
  })
  el('regionalStlLoad').addEventListener('click',async()=>{
    if(!data)return;const current=data;clearStl();const request=stlSequence;stlController=new AbortController();el('regionalStlStatus').textContent='Loading source-matched decomposition…';el<HTMLButtonElement>('regionalStlLoad').disabled=true
    try{const value=await getJson<RegionalStl>('/api/sales/regional-stl-review',{signal:stlController.signal});if(disposed||request!==stlSequence||data!==current)return;if(!validRegionalStl(value,current))throw Error('Invalid STL source');stl=value;renderStl()}
    catch{if(!disposed&&request===stlSequence){clearStl();el('regionalStlStatus').textContent='Regional decomposition unavailable. No substitute components were used; recorded financial values remain separate.'}}
    finally{if(!disposed&&request===stlSequence&&data)el<HTMLButtonElement>('regionalStlLoad').disabled=false}
  })
  el('regionalStlExport').addEventListener('click',()=>{
    if(!stl||el<HTMLButtonElement>('regionalStlExport').disabled)return
    const records=regionalStlCsvRecords(stl,region.value,year.value),quote=(v:unknown)=>'"'+String(v??'').replace(/"/g,'""')+'"',url=URL.createObjectURL(new Blob(['\uFEFF'+records.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`medshield-regional-stl-${region.value}-${year.value}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
  })
  el('regionalSeasonalDetails').addEventListener('toggle',()=>{chart?.resize();stlChart?.resize()})
  region.addEventListener('change',render);year.addEventListener('change',render);download.addEventListener('click',()=>exportCsv(false));totalsDownload.addEventListener('click',()=>exportCsv(true));el('regionalReload').addEventListener('click',()=>void load())
  const activate=(event:Event)=>{if((event as CustomEvent).detail?.name==='so1'&&!loaded)void load();else chart?.resize()}
  root.addEventListener('medshield:sales-output-change',activate)
  return()=>{disposed=true;loadController?.abort();stlController?.abort();sequence++;stlSequence++;chart?.destroy();stlChart?.destroy();root.removeEventListener('medshield:sales-output-change',activate);panel.remove()}
}
