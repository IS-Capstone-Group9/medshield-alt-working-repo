import Chart from 'chart.js/auto'
import {getJson} from './api-client'

const metrics=[
  {key:'sales',label:'Recorded Quezon net sales',unit:'PHP',color:'#335f78'},
  {key:'disease',label:'DOH Dengue surveillance cases',unit:'reported cases',color:'#95632d'},
  {key:'tayabas',label:'PAGASA Tayabas station rainfall',unit:'mm',color:'#287f8d'},
  {key:'alabat',label:'PAGASA Alabat station rainfall',unit:'mm',color:'#6d6990'},
  {key:'nasa',label:'NASA POWER rainfall proxy',unit:'mm',color:'#668442'},
] as const
type Key=typeof metrics[number]['key']
type Row={period:string}&Record<Key,number|null>
type Coverage={key:Key;observed_months:number;total_months:number;first_period:string|null;last_period:string|null}
export type HistoricalComparison={scope:{territory:string;buyer_scope:string;start:string;end:string;alignment:string};rows:Row[];coverage:Coverage[];
  coobserved_months:number;checksum:string;loaded_at:string;interpretation:string;limitations:string[];
  release:{dataset_id:string;fact_delta_version:number;policy_version:string;financial_publication?:{publication_id:string;manifest_sha256:string}};
  sources:{sales:{table:string;version:number;dataset_id:string};doh:{table:string;checksum:string;identities:string[]};pagasa:{table:string;version:number;checksum:string};nasa:{table:string;checksum:string;last_fetched_at:string|null}}}

export function historicalComparisonCsv(data:HistoricalComparison,year:string) {
  const rows=data.rows.filter(row=>year==='all'||row.period.startsWith(year+'-'))
  const fields=['period','quezon_net_sales_php','doh_dengue_reported_cases','pagasa_tayabas_rainfall_mm','pagasa_alabat_rainfall_mm','nasa_power_proxy_rainfall_mm',
    'territory','buyer_scope','selected_year','alignment','dataset_id','source_fact_version','financial_publication_id','financial_manifest_sha256',
    'sales_serving_table','sales_serving_version','doh_source','doh_checksum','pagasa_source','pagasa_version','pagasa_checksum','nasa_source','nasa_checksum','nasa_last_fetched_at','context_checksum','model_use']
  const quote=(value:unknown)=>'"'+String(value==null?'':value).replace(/"/g,'""')+'"'
  return '\uFEFF'+[fields,...rows.map(row=>[row.period,...metrics.map(m=>row[m.key]),data.scope.territory,data.scope.buyer_scope,year,data.scope.alignment,
    data.release.dataset_id,data.release.fact_delta_version,data.release.financial_publication?.publication_id??'',data.release.financial_publication?.manifest_sha256??'',
    data.sources.sales.table,data.sources.sales.version,data.sources.doh.table,data.sources.doh.checksum,data.sources.pagasa.table,data.sources.pagasa.version,
    data.sources.pagasa.checksum,data.sources.nasa.table,data.sources.nasa.checksum,data.sources.nasa.last_fetched_at,data.checksum,'historical_context_only'])].map(r=>r.map(quote).join(',')).join('\r\n')
}

export function installHistoricalComparisonPanel(root:HTMLElement):()=>void {
  const host=root.querySelector<HTMLElement>('[data-sales-output-panel="external"]')
  if(!host)return()=>{}
  const section=document.createElement('section');section.id='historicalComparisonPanel';section.className='chart-card historical-comparison'
  section.innerHTML=`<style>
  .historical-comparison{min-width:0;padding:18px;overflow-wrap:anywhere}
  .historical-comparison .history-controls{display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin:12px 0}
  .historical-comparison label{font-size:12px;font-weight:600}.historical-comparison select{display:block;padding:8px;margin-top:6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-card);color:var(--text-primary)}
  .historical-comparison p{line-height:1.6;margin:10px 0}.historical-comparison .history-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin:18px 0}
  .historical-comparison .history-metric{min-width:0;padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-card)}
  .historical-comparison h3{font-size:14px;margin:0 0 6px}.historical-comparison .history-canvas{height:210px;min-width:0}
  .historical-comparison .history-table-wrap{overflow:auto;max-height:440px;max-width:100%}.historical-comparison table{white-space:nowrap;font-size:12px;width:100%}
  .historical-comparison details{margin:12px 0}.historical-comparison [hidden]{display:none!important}
  @media(max-width:800px){.historical-comparison .history-grid{grid-template-columns:1fr}.historical-comparison{padding:12px}}
  </style>
  <div class="chart-title">How do recorded sales, disease and weather vary over time?</div>
  <p>Quezon · All buyer groups · Historical monthly observations. Sources share calendar months; each keeps its own units and geographic limits.</p>
  <div class="history-controls"><label>Historical year<select id="historicalContextYear"><option value="all">Study · 2017–2025</option>${Array.from({length:9},(_,i)=>'<option>'+String(2017+i)+'</option>').join('')}</select></label>
  <button type="button" class="btn btn-secondary" id="historicalContextReload">Reload sources</button><button type="button" class="btn btn-secondary" id="historicalContextExport" disabled>Export comparison CSV</button></div>
  <p id="historicalContextStatus" role="status">Open this tab to load the historical sources.</p>
  <div id="historicalContextResult" hidden><p id="historicalContextSummary"></p><p id="historicalContextScope"></p>
  <div class="history-grid" id="historicalContextCharts"></div>
  <details><summary>Exact monthly values</summary><div class="history-table-wrap"><table class="product-table" id="historicalContextTable" aria-label="Historical sales disease and weather values"></table></div></details>
  <details><summary>Source coverage and interpretation</summary><p id="historicalContextNotes"></p><div id="historicalContextSources"></div></details></div>`
  host.append(section)
  const element=<T extends HTMLElement>(id:string)=>section.querySelector<T>('#'+id)!
  const select=element<HTMLSelectElement>('historicalContextYear'),exportButton=element<HTMLButtonElement>('historicalContextExport')
  const charts:Chart[]=[]
  let disposed=false,sequence=0,data:HistoricalComparison|null=null
  const clear=()=>{charts.splice(0).forEach(chart=>chart.destroy());element('historicalContextCharts').replaceChildren();element('historicalContextTable').replaceChildren();element('historicalContextSources').replaceChildren();element('historicalContextSummary').textContent='';element('historicalContextScope').textContent='';element('historicalContextNotes').textContent='';element('historicalContextResult').hidden=true;exportButton.disabled=true}
  const formatted=(value:number|null,money=false)=>value==null?'Unavailable':(money?'₱':'')+value.toLocaleString('en-PH',{minimumFractionDigits:money?2:0,maximumFractionDigits:2})
  function render() {
    clear();if(!data)return
    const rows=data.rows.filter(row=>select.value==='all'||row.period.startsWith(select.value+'-'))
    element('historicalContextResult').hidden=false
    element('historicalContextStatus').textContent='Historical sources loaded · No live alerts or model predictions.'
    element('historicalContextSummary').textContent=rows.length+' calendar months · '+rows.filter(r=>r.sales!=null&&r.disease!=null&&r.tayabas!=null).length+' with recorded sales, Dengue and Tayabas rainfall. Missing observations stay unavailable.'
    element('historicalContextScope').textContent='Same-month comparison · '+(rows[0]?.period??'Unavailable')+' to '+(rows.at(-1)?.period??'Unavailable')+' · Quezon · All buyers. Topbar filters do not change this pilot.'
    element('historicalContextNotes').textContent=data.interpretation+' '+data.limitations.join(' ')
    for(const metric of metrics){
      const card=document.createElement('section');card.className='history-metric';card.setAttribute('aria-label',metric.label)
      const title=document.createElement('h3');title.textContent=metric.label
      const note=document.createElement('p');const count=rows.filter(row=>row[metric.key]!=null).length
      note.textContent=count+'/'+rows.length+' observed months · '+metric.unit
      const wrap=document.createElement('div');wrap.className='history-canvas'
      const canvas=document.createElement('canvas');canvas.id='historicalChart-'+metric.key;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',metric.label+' in '+metric.unit+'; exact monthly values in the table')
      wrap.append(canvas);card.append(title,note)
      element('historicalContextCharts').append(card)
      if(count){
        card.append(wrap)
        charts.push(new Chart(canvas,{
          type:'line',
          data:{labels:rows.map(r=>r.period),datasets:[{
            label:metric.label+' ('+metric.unit+')',data:rows.map(r=>r[metric.key]),
            borderColor:metric.color,backgroundColor:metric.color,
            pointRadius:rows.length>12?0:2,borderWidth:2,spanGaps:false,
          }]},
          options:{responsive:true,maintainAspectRatio:false,animation:false,
            plugins:{legend:{display:false},tooltip:{callbacks:{label:context=>metric.label+': '+formatted(context.parsed.y,metric.key==='sales')+' '+(metric.key==='sales'?'':metric.unit)}}},
            scales:{x:{ticks:{maxTicksLimit:6,maxRotation:0}},y:{title:{display:true,text:metric.unit},ticks:{callback:value=>Number(value).toLocaleString('en-PH',{notation:'compact',maximumFractionDigits:1})}}},
          },
        }))
      }
      else{const empty=document.createElement('p');empty.textContent='No observations from this source in the selected year.';card.append(empty)}
    }
    const table=element<HTMLTableElement>('historicalContextTable'),head=table.createTHead().insertRow()
    for(const label of ['Month',...metrics.map(m=>m.label+' ('+m.unit+')')]){const th=document.createElement('th');th.scope='col';th.textContent=label;head.append(th)}
    const body=table.createTBody()
    for(const row of rows){const tr=body.insertRow();tr.insertCell().textContent=row.period;for(const m of metrics)tr.insertCell().textContent=formatted(row[m.key],m.key==='sales')}
    const sources=element('historicalContextSources')
    for(const metric of metrics){const coverage=data.coverage.find(c=>c.key===metric.key);const p=document.createElement('p');p.textContent=metric.label+': '+(coverage?.first_period??'Unavailable')+' to '+(coverage?.last_period??'Unavailable')+' · '+(coverage?.observed_months??0)+'/108 observed study months.';sources.append(p)}
    const identity=document.createElement('p');identity.textContent='Sales dataset '+data.release.dataset_id+' · source fact '+data.release.fact_delta_version+' · financial release '+(data.release.financial_publication?.publication_id??'candidate')+'. PAGASA version '+data.sources.pagasa.version+'. Context checksum '+data.checksum+'. NASA last fetched '+(data.sources.nasa.last_fetched_at??'Unavailable')+'.';sources.append(identity)
    exportButton.disabled=false
  }
  let loadController: AbortController | null = null
  async function refresh(){
    if(disposed)return
    loadController?.abort();loadController=new AbortController()
    const request=++sequence;data=null;clear();element('historicalContextStatus').textContent='Loading historical sources from Databricks…'
    try{
      const value=await getJson<HistoricalComparison>('/api/sales/historical-context',{signal:loadController.signal})
      if(disposed||request!==sequence)return
      if(value.scope?.territory!=='Quezon'||value.scope.buyer_scope!=='All'||value.scope.start!=='2017-01'||value.scope.end!=='2025-12'||value.scope.alignment!=='same_calendar_month'||value.rows?.length!==108||!value.sources||!value.release)throw new Error('Invalid historical contract')
      const expected=Array.from({length:108},(_,i)=>(2017+Math.floor(i/12))+'-'+String(i%12+1).padStart(2,'0'))
      if(value.rows.some((row,i)=>row.period!==expected[i]||metrics.some(m=>row[m.key]!==null&&(typeof row[m.key]!=='number'||!Number.isFinite(row[m.key])))))throw new Error('Invalid historical values')
      data=value;render()
    }catch{if(!disposed&&request===sequence){data=null;clear();element('historicalContextStatus').textContent='Historical comparison unavailable from Databricks. Reload sources to retry; no cached or sample observations are substituted.'}}
  }
  const onYear=()=>render(),onReload=()=>{void refresh()},onTab=(event:Event)=>{if((event as CustomEvent).detail?.name!=='external')return;if(data)charts.forEach(c=>c.resize());else void refresh()}
  const onExport=()=>{if(!data)return;const url=URL.createObjectURL(new Blob([historicalComparisonCsv(data,select.value)],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='medshield-historical-Quezon-'+select.value+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  select.addEventListener('change',onYear);exportButton.addEventListener('click',onExport);element('historicalContextReload').addEventListener('click',onReload)
  root.addEventListener('medshield:sales-output-change',onTab)
  return()=>{disposed=true;loadController?.abort();++sequence;clear();select.removeEventListener('change',onYear);exportButton.removeEventListener('click',onExport);element('historicalContextReload').removeEventListener('click',onReload);root.removeEventListener('medshield:sales-output-change',onTab);section.remove()}
}
