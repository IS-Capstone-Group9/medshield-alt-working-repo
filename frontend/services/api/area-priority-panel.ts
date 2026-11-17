import {getJson} from './api-client'
import { appendTableSkeletonRows } from './dashboard-loading'
import {areaPriorityView,areaPriorityCsv,areaRecommendation,validAreaPriority,type AreaPriorityData} from './area-priority-model'
import {REGION_NAMES} from './regional-sales-model'

const money=(value:string|null)=>value===null?'Unavailable':'₱'+Number(value).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})
const percent=(value:number|null)=>value===null?'Unavailable':value.toFixed(2)+'%'
export function installAreaPriorityPanel(root:HTMLElement){
  const host=root.querySelector<HTMLElement>('#page-territory')
  if(!host)return()=>{}
  const legacy=host.querySelector<HTMLElement>('[data-sector-analysis]'),wasHidden=legacy?.hidden
  const previousDisplay=legacy?.style.getPropertyValue('display')??'',previousPriority=legacy?.style.getPropertyPriority('display')??''
  if(legacy){legacy.hidden=true;legacy.style.setProperty('display','none','important')}
  const panel=document.createElement('section');panel.className='chart-card';panel.id='confirmedAreaReview'
  panel.innerHTML=`<style>
    #confirmedAreaReview{padding:20px}#confirmedAreaReview .area-review-controls{display:flex;gap:14px;flex-wrap:wrap;align-items:end;margin:16px 0}
    #confirmedAreaReview label{display:grid;gap:5px}#confirmedAreaReview select{padding:8px;background:var(--bg-card,#fff);color:var(--text-primary);border:1px solid var(--border);border-radius:5px}
    #confirmedAreaReview .area-review-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}#confirmedAreaReview dd{margin:5px 0;font-size:21px;font-weight:600}
    #confirmedAreaReview .area-review-scroll{overflow:auto;max-width:100%;margin:12px 0}#confirmedAreaReview th,#confirmedAreaReview td{padding:10px;font-size:12px;white-space:nowrap}
    #confirmedAreaReview details{margin:16px 0}#confirmedAreaReview summary{cursor:pointer;font-weight:600;padding:8px 0}#confirmedAreaReview button:focus-visible,#confirmedAreaReview select:focus-visible{outline:2px solid var(--accent)}
    #confirmedAreaReview .area-review-actions{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));margin:12px 0}#confirmedAreaReview .area-review-actions article{border:1px solid var(--border);border-radius:6px;padding:14px;min-width:0;overflow-wrap:anywhere}#confirmedAreaReview .area-review-actions h4{margin:0 0 8px}#confirmedAreaReview .area-review-actions p{margin:8px 0;line-height:1.5}
    @media(max-width:650px){#confirmedAreaReview .area-review-metrics{grid-template-columns:1fr}#confirmedAreaReview{padding:14px}}
    </style><h2>Which delivery areas contribute most?</h2>
    <p>Original itemized sales · Contracts excluded · All buyers and products. Only confirmed delivery labels are ranked.</p>
    <p id="areaReviewStatus" role="status">Open Area Prioritization to load confirmed delivery evidence.</p>
    <div class="area-review-controls"><label>Year<select id="areaReviewYear" disabled></select></label><label>Region<select id="areaReviewRegion" disabled><option value="ALL">All confirmed regions</option><option value="CALABARZON">CALABARZON</option><option value="MIMAROPA">MIMAROPA</option><option value="BICOL">Bicol</option></select></label><button id="areaReviewReload" type="button" class="btn btn-secondary">Reload source</button><button id="areaReviewExport" type="button" class="btn btn-secondary" disabled>Export area findings</button></div>
    <dl class="area-review-metrics"><div><dt>All recorded itemized net · selected year</dt><dd id="areaReviewCompany">Unavailable</dd></div><div><dt>Confirmed regional net · selected year</dt><dd id="areaReviewConfirmed">Unavailable</dd></div><div><dt>Confirmed share of recorded net</dt><dd id="areaReviewShare">Unavailable</dd></div></dl>
    <p id="areaReviewAllocation" class="dashboard-visually-hidden"></p><p id="areaReviewTakeaway" class="dashboard-visually-hidden"></p>
    <div class="area-review-scroll" tabindex="0" role="region" aria-label="Confirmed delivery area ranking"><table id="areaReviewTable" class="product-table"></table></div>
    <section aria-labelledby="areaReviewActionsHeading"><h3 id="areaReviewActionsHeading">Recommended next actions</h3><p>Sales follow-ups for up to three areas with positive net sales. Benefits are unmeasured.</p><div id="areaReviewActions" class="area-review-actions"></div></section>
    <section aria-labelledby="areaReviewSignalsHeading"><h3 id="areaReviewSignalsHeading">Rainfall severity by area (proxy)</h3><p>RSI is the NASA POWER rainfall severity proxy approved on 10 November 2026. It is context for planning reviews, not observed rainfall, demand or a forecast input. Disease intensity (DII) is withheld until its DOH territory mapping is approved.</p><p id="areaReviewSignalStatus" role="status">Loads with the area source.</p><div class="area-review-scroll" tabindex="0" role="region" aria-label="Rainfall severity by delivery area"><table id="areaReviewSignals" class="product-table"></table></div></section>
    <details><summary>Matching-month growth and cost support</summary><p>Each area compares its own matching observed months. Different month sets cannot be combined into a company growth figure or a like-for-like regional ranking. Missing records are not zero demand. Gross profit is before operating expenses and uses its matching supported revenue.</p><div class="area-review-scroll"><table id="areaReviewChanges" class="product-table"></table></div></details>
    <details><summary>Unallocated labels and evidence limits</summary><p>Allocation cards cover all labels in the selected year, independently of the region ranking filter. Signed shares may exceed 100% with offsetting returns.</p><p>These amounts remain outside the confirmed-area ranks. A channel or label resembling a region does not establish delivery geography.</p><div class="area-review-scroll"><table id="areaReviewUnallocated" class="product-table"></table></div><p id="areaReviewSource"></p><p>Observed ABC uses each area's positive selected-period signed net total, sorted descending with label ties in alphabetical order. The row crossing 80% stays A; the row crossing 95% stays B. Negative and zero totals remain visible but are not assigned A/B/C. Returns are retained in signed net; this concentration basis is not positive transaction sales. ABC is descriptive, not the XGBoost research classifier. Reporting completeness, client identities, stocking availability and business causes are unknown. No clinical, procurement or forecast approval follows.</p></details>`
  const guide = host.querySelector(':scope > [data-analytics-reading]')
  if (guide) guide.after(panel)
  else host.prepend(panel)
  const el=<T extends HTMLElement>(id:string)=>panel.querySelector<T>('#areaReview'+id)!
  const year=el<HTMLSelectElement>('Year'),region=el<HTMLSelectElement>('Region'),download=el<HTMLButtonElement>('Export')
  let data:AreaPriorityData|null=null,disposed=false,loading=false,sequence=0
  const table = (target: HTMLTableElement, headers: string[], rows: string[][], numericColumns: number[]) => {
    target.replaceChildren()
    const head = target.createTHead().insertRow()
    headers.forEach((label, index) => {
      const th = document.createElement('th')
      th.scope = 'col'
      th.textContent = label
      th.classList.toggle('num', numericColumns.includes(index))
      head.append(th)
    })
    const body = target.createTBody()
    for (const row of rows) {
      const tr = body.insertRow()
      row.forEach((value, index) => {
        const td = tr.insertCell()
        td.textContent = value
        td.classList.toggle('num', numericColumns.includes(index))
      })
    }
  }
  const clear=()=>{data=null;year.disabled=true;region.disabled=true;download.disabled=true;for(const id of ['Company','Confirmed','Share'])el(id).textContent='Unavailable';for(const id of ['Allocation','Takeaway','Table','Changes','Unallocated','Source','Actions'])el(id).replaceChildren()}
  const render=()=>{
    if(!data)return
    const view=areaPriorityView(data,year.value,region.value),positive=view.rows.filter(row=>row.abc==='A'),positiveRows=view.rows.filter(row=>['A','B','C'].includes(row.abc))
    const share=positive.reduce((sum,row)=>sum+(row.share_pct??0),0)
    el('Status').textContent=`${year.value==='all'?'Full recorded history':year.value} · ${region.value==='ALL'?'All confirmed regions':REGION_NAMES[region.value]} · Source through ${data.regional.source.calendar_end}. Observed financial review; no forecast approval.`
    el('Company').textContent=money(view.company.net_sales_php);el('Confirmed').textContent=money(view.confirmed.net_sales_php);el('Share').textContent=percent(view.confirmed_share_pct)
    el('Allocation').textContent=`Unallocated recorded net: ${money(view.unallocated.net_sales_php)}. Assigned records: ${view.confirmed.records.toLocaleString()} / ${view.company.records.toLocaleString()}. This is allocation, not completeness.`
    el('Takeaway').textContent=positiveRows.length?`${positive.length} of ${positiveRows.length} positive-net confirmed labels contribute ${percent(share)} of positive area net. Review them first; this does not instruct capital or stock changes.`:'No positive-net confirmed area observations in this selection. Missing values remain unavailable; choose another year or inspect unallocated labels.'
    table(el<HTMLTableElement>('Table'),['Delivery label','Region','Recorded net sales','Positive-area share','Observed ABC'],view.rows.map(row=>[row.area,REGION_NAMES[row.region],money(row.net_sales_php),percent(row.share_pct),row.abc]),[2,3])
    const actions=el('Actions');actions.replaceChildren()
    const leading=view.rows.filter(row=>row.net_sales_php!==null&&Number(row.net_sales_php)>0).slice(0,3)
    for(const row of leading){
      const recommendation=areaRecommendation(row,year.value),card=document.createElement('article'),title=document.createElement('h4')
      title.textContent=row.area+' · '+recommendation.action;card.append(title)
      for(const text of ['Recorded net sales: '+money(row.net_sales_php),'Suggested owner: '+recommendation.owner,'Next check: '+recommendation.follow_up]){const paragraph=document.createElement('p');paragraph.textContent=text;card.append(paragraph)}
      const evidence=document.createElement('details'),evidenceTitle=document.createElement('summary'),reason=document.createElement('p')
      evidenceTitle.textContent='Sales evidence';reason.textContent=recommendation.reason;evidence.append(evidenceTitle,reason);card.append(evidence)
      actions.append(card)
    }
    if(!leading.length)actions.textContent='Confirm reporting and eligible sales before recommending an area sales target. Missing observations are not zero demand.'
    table(el<HTMLTableElement>('Changes'),['Delivery label','Supported gross profit','Matching margin revenue','Supported / retained records','Matched months','Prior net','Current net','Change','Growth','Last recorded month'],view.rows.map(row=>[row.area,money(row.gross_profit_php),money(row.margin_revenue_basis_php),row.margin_eligible_records+' / '+row.records,year.value==='all'?'Select a year':row.matched.map(pair=>pair.month).join(', ')||'Unavailable',money(row.previous),money(row.current),money(row.change),percent(row.growth_pct),row.lastRecordedMonth??'Unavailable']),[1,2,3,5,6,7,8])
    table(el<HTMLTableElement>('Unallocated'),['Raw label','Recorded net sales','Retained records'],view.unresolved.map(row=>[row.area,money(row.net_sales_php),String(row.records)]),[1,2])
    const source=data.regional.source
    el('Source').textContent=`Gold ${source.fact_table} @ ${source.fact_version}; dataset ${source.dataset_id}; mapping ${source.mapping_sha256}; monthly controls ${source.current_monthly_sha256}. Nine delivery-label confirmations are retained; channel labels are not promoted to geography. Financial publication and forecasting remain unapproved.`
    year.disabled=false;region.disabled=false;download.disabled=false
    renderSignals()
  }
  type SignalData={release_id:string;rsi:{area:string;month:string;rsi:number}[];dii_pending:{area:string}[]}
  let signals:SignalData|null=null,signalError=false
  const renderSignals=()=>{
    const target=el<HTMLTableElement>('Signals'),status=el('SignalStatus')
    if(signalError){target.replaceChildren();status.textContent='Rainfall severity unavailable. No substitute values were used.';return}
    if(!signals||!data)return
    // RSI uses full province names (CAMARINES NORTE); delivery labels can be abbreviated (CAM NORTE), so match on province.
    const regionOf=new Map(data.regional.mappings.map((row:{recorded_label:string;region:string;province?:string})=>[(row.province??row.recorded_label).toUpperCase(),row.region]))
    const areas=[...new Set(signals.rsi.map(row=>row.area))].filter(area=>region.value==='ALL'||regionOf.get(area)===region.value).sort()
    const rows=areas.map(area=>{
      const all=signals!.rsi.filter(row=>row.area===area),picked=year.value==='all'?all:all.filter(row=>row.month.startsWith(year.value))
      const mean=(list:typeof all)=>list.reduce((sum,row)=>sum+row.rsi,0)/list.length
      if(!picked.length)return [area,REGION_NAMES[regionOf.get(area)??'']??'Unconfirmed','0','Unavailable','Unavailable','Unavailable',mean(all).toFixed(3)]
      const peak=picked.reduce((top,row)=>row.rsi>top.rsi?row:top)
      return [area,REGION_NAMES[regionOf.get(area)??'']??'Unconfirmed',String(picked.length),mean(picked).toFixed(3),peak.rsi.toFixed(3),peak.month,mean(all).toFixed(3)]
    })
    // Own table build so this section does not depend on the shared helper's signature.
    target.replaceChildren();const signalHead=target.createTHead().insertRow()
    ;['Delivery label','Region','Months with RSI','Average RSI','Peak RSI','Peak month','All-years average'].forEach((label,index)=>{const th=document.createElement('th');th.scope='col';th.textContent=label;th.classList.toggle('num',[2,3,4,6].includes(index));signalHead.append(th)})
    const signalBody=target.createTBody();for(const row of rows){const tr=signalBody.insertRow();row.forEach((value,index)=>{const td=tr.insertCell();td.textContent=value;td.classList.toggle('num',[2,3,4,6].includes(index))})}
    const months=signals.rsi.map(row=>row.month).sort()
    status.textContent=`Warehouse release ${signals.release_id} · RSI ${months[0]} to ${months.at(-1)} · ${areas.length} areas. Areas without a mapped territory show no RSI. DII withheld for ${signals.dii_pending.length} areas pending mapping approval.`
  }
  const loadSignals=async(signal:AbortSignal)=>{
    signals=null;signalError=false;el('SignalStatus').textContent='Loading rainfall severity…'
    try{signals=await getJson<SignalData>('/api/sales/territory-signals',{signal});if(!Array.isArray(signals?.rsi)||!signals.rsi.length)throw Error('Invalid signals')}
    catch{if(signal.aborted)return;signals=null;signalError=true}
    if(!disposed)renderSignals()
  }
  let loadController: AbortController | null = null
  const load=async()=>{
    if(disposed||loading)return
    loading=true;loadController?.abort();loadController=new AbortController();const request=++sequence,previousYear=year.value;clear();el('Status').textContent='Loading confirmed area source…'
    panel.setAttribute('aria-busy', 'true')
    const metrics = panel.querySelectorAll('.area-review-metrics dd')
    metrics.forEach(metric => metric.classList.add('skeleton', 'skeleton-value'))
    appendTableSkeletonRows(el<HTMLTableElement>('Table'), 1)
    void loadSignals(loadController.signal)
    try{
      const value=await getJson<AreaPriorityData>('/api/sales/confirmed-area-priority',{signal:loadController.signal})
      if(disposed||request!==sequence)return
      if(!validAreaPriority(value))throw Error('Invalid area source')
      data=value;year.replaceChildren();year.add(new Option('Full recorded history','all'))
      const years=[...new Set(value.area_months.map(row=>row.period.slice(0,4)))].sort();for(const value of years)year.add(new Option(value,value))
      year.value=previousYear==='all'||years.includes(previousYear)?previousYear:years.at(-1)!
      render()
    }catch{if(!disposed&&request===sequence){clear();el('Status').textContent='Confirmed area review unavailable. Reload to retry; no legacy, local or demonstration values were substituted.'}}
    finally {
      if (!disposed && request === sequence) {
        loading = false
        panel.removeAttribute('aria-busy')
        metrics.forEach(metric => metric.classList.remove('skeleton', 'skeleton-value'))
      }
    }
  }
  year.addEventListener('change',render);region.addEventListener('change',render);el('Reload').addEventListener('click',()=>void load())
  download.addEventListener('click',()=>{if(!data||download.disabled)return;const url=URL.createObjectURL(new Blob([areaPriorityCsv(data,year.value,region.value)],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`medshield-confirmed-areas-${region.value}-${year.value}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)})
  const activate=(event:Event)=>{if(event.type==='keydown'&&!['Enter',' '].includes((event as KeyboardEvent).key))return;if((event.target as HTMLElement)?.closest?.('[data-dashboard-page="territory"]')&&!data)void load()}
  root.addEventListener('click',activate)
  root.addEventListener('keydown',activate)
  if(host.classList.contains('active'))void load()
  return()=>{disposed=true;loadController?.abort();sequence++;root.removeEventListener('click',activate);root.removeEventListener('keydown',activate);panel.remove();if(legacy){legacy.hidden=wasHidden??false;if(previousDisplay)legacy.style.setProperty('display',previousDisplay,previousPriority);else legacy.style.removeProperty('display')}}
}
