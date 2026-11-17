import {getJson} from './api-client'
import Chart from 'chart.js/auto'
import {researchRobustness,ROBUSTNESS_POLICY} from './unit-research-robustness'

type Point={method:string;origin:string;target_month:string;lead:number;actual:number;prediction:number;error:number}
type Metric={method:string;lead:number;n:number;mae:number;rmse:number;wape:number|null;bias:number}
export type UnitResearch={status:string;research_display_authorized:boolean;operational_forecasting_approved:boolean;activation_allowed:boolean;selected_method:null;
  scope:{product:string;labels:string[];recorded_channel:string;unit:string;contracts_excluded:boolean;geography_status:string;filter_policy:string};
  source:{dataset_id:string;fact_table:string;fact_version:number;policy_version:string;receipt_sha256:string;artifact_sha256:string;storage_id:string;confirmation_sha256:string;protocol_sha256:string};
  evidence:{source_records:number;observed_months:number;recent_contiguous_months:number;unreviewed_source_records:number;unit_confirmation:string;research_window_start:string;research_window_end:string};
  metrics:Metric[];points:Point[];limitations:string[]}
const methods=['last_value','mean_3','mean_6','seasonal_naive_12']
const names:Record<string,string>={last_value:'Last value',mean_3:'Three-month mean',mean_6:'Six-month mean',seasonal_naive_12:'Seasonal naive (12 months)'}
const number=(n:number)=>n.toLocaleString('en-PH',{maximumFractionDigits:2,minimumFractionDigits:2})
const monthIndex=(m:string)=>Number(m.slice(0,4))*12+Number(m.slice(5,7))-1
export function validUnitResearch(data:UnitResearch){
  try{
  const finite=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)
  const valid=data?.status==='unit_baseline_research'&&data.research_display_authorized===true
    &&data.operational_forecasting_approved===false&&data.activation_allowed===false&&data.selected_method===null
    &&data.scope?.product==='BUPIRIGHT 4 mL'&&data.scope.recorded_channel==='HOSPITAL'&&data.scope.unit==='ampoules'
    &&data.scope.contracts_excluded===true&&data.scope.geography_status==='channel_not_verified_delivery_territory'
    &&data.scope.filter_policy==='fixed_research_scope_independent_of_analysis_filters'
    &&data.source?.fact_version===0&&data.source.policy_version==='original_source_layers_v1_candidate_only'
    &&[data.source.dataset_id,data.source.receipt_sha256,data.source.artifact_sha256,data.source.confirmation_sha256,data.source.protocol_sha256].every(h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h))
    &&data.evidence?.recent_contiguous_months===18&&data.evidence.observed_months===35&&data.evidence.source_records===50&&data.evidence.unreviewed_source_records===13
    &&data.evidence.research_window_start==='2025-04'&&data.evidence.research_window_end==='2026-09'
    &&Array.isArray(data.metrics)&&data.metrics.length===8&&Array.isArray(data.points)&&data.points.length===40
    &&[1,3].every(lead=>methods.every(method=>{
      const metrics=data.metrics.filter(m=>m.lead===lead&&m.method===method),points=data.points.filter(p=>p.lead===lead&&p.method===method)
      return metrics.length===1&&metrics[0].n===(lead===1?6:4)&&points.length===metrics[0].n
        &&[metrics[0].mae,metrics[0].rmse,metrics[0].bias].every(finite)&&(metrics[0].wape===null||finite(metrics[0].wape))
        &&points.every(p=>[p.actual,p.prediction,p.error].every(finite)&&/^\d{4}-(0[1-9]|1[0-2])$/.test(p.origin)&&/^\d{4}-(0[1-9]|1[0-2])$/.test(p.target_month)&&p.target_month<=data.evidence.research_window_end&&monthIndex(p.target_month)-monthIndex(p.origin)===lead&&Math.abs(p.error-(p.prediction-p.actual))<1e-9)
        &&new Set(points.map(p=>p.origin)).size===points.length
    }))&&Array.isArray(data.limitations)&&data.limitations.length>0
  if(!valid)return false
  const close=(actual:number,expected:number)=>Math.abs(actual-expected)<=1e-8*Math.max(1,Math.abs(expected))
  return [1,3].every(lead=>{
    const baseline=data.points.filter(point=>point.lead===lead&&point.method==='last_value').sort((a,b)=>a.origin.localeCompare(b.origin))
    return methods.every(method=>{
      const points=data.points.filter(point=>point.lead===lead&&point.method===method).sort((a,b)=>a.origin.localeCompare(b.origin)),metric=data.metrics.find(metric=>metric.lead===lead&&metric.method===method)!
      if(points.some((point,index)=>point.origin!==baseline[index].origin||point.target_month!==baseline[index].target_month||point.actual!==baseline[index].actual))return false
      const absolute=points.reduce((sum,point)=>sum+Math.abs(point.error),0),actual=points.reduce((sum,point)=>sum+Math.abs(point.actual),0)
      return metric.mae>=0&&metric.rmse>=0&&(metric.wape===null||metric.wape>=0)
        &&close(metric.mae,absolute/points.length)&&close(metric.rmse,Math.sqrt(points.reduce((sum,point)=>sum+point.error**2,0)/points.length))
        &&close(metric.bias,points.reduce((sum,point)=>sum+point.error,0)/points.length)
        &&(actual===0?metric.wape===null:metric.wape!==null&&close(metric.wape,100*absolute/actual))
    })
  })
  }catch{return false}
}
/** Historical error readout only; never selects or activates an operational model. */
export function unitResearchReadout(data:UnitResearch,lead:number){
  if(![1,3].includes(lead))throw Error('Unsupported research lead')
  const metrics=data.metrics.filter(metric=>metric.lead===lead),lowest=Math.min(...metrics.map(metric=>metric.mae))
  const lowestMaeMethods=metrics.filter(metric=>Math.abs(metric.mae-lowest)<1e-9).map(metric=>metric.method)
  const points=data.points.filter(point=>point.lead===lead&&point.method==='last_value').sort((a,b)=>a.origin.localeCompare(b.origin))
  const latestOrigin=points.at(-1)!.origin,latestTarget=points.at(-1)!.target_month
  return {lead,scoredMonths:points.length,lowestMaeMethods,lowestMae:lowest,
    firstOrigin:points[0].origin,latestOrigin,firstTarget:points[0].target_month,latestTarget,
    sourceEnd:data.evidence.research_window_end,requestedTarget:'2026-12',
    decemberLeadFromSourceEnd:monthIndex('2026-12')-monthIndex(data.evidence.research_window_end),
    decemberPredictionAvailable:data.points.some(point=>point.target_month==='2026-12'),
    operationalForecastingApproved:false,selectedOperationalMethod:null}
}
/** The selected chart baseline is an inspection choice, never an operational selection. */
export function unitUnderstanding(data:UnitResearch,lead:number,method:string){
  const metric=data.metrics.find(row=>row.lead===lead&&row.method===method)
  const points=data.points.filter(point=>point.lead===lead&&point.method===method).sort((a,b)=>a.target_month.localeCompare(b.target_month))
  const amount=(value:number|null|undefined)=>typeof value==='number'&&Number.isFinite(value)?number(value):'Unavailable'
  return {
    summary:`Predicts recorded fulfilled ampoules for ${data.scope.product} in the ${data.scope.recorded_channel} channel. ${names[method]??method} at ${lead} month(s) ahead: average absolute miss ${amount(metric?.mae)} ampoules across ${metric?.n??0} historical target months. One product/channel pilot; operational forecasting is not approved.`,
    detail:`Scored target months: ${points[0]?.target_month??'Unavailable'}–${points.at(-1)?.target_month??'Unavailable'}; source history ends ${data.evidence.research_window_end}. Current chart baseline: ${names[method]??method}; changing it only changes the historical comparison. WAPE ${metric?.wape==null?'Unavailable':amount(metric.wape)+'%'} is aggregate absolute error relative to recorded ampoules, not percent correct. A short retrospective comparison does not establish reliability for other medicines or future months. No operational method is selected. Model owner reviews prospective errors; source owner verifies product/unit coverage and inventory, supplier, lead-time and expiry inputs before operating use.`,
  }
}
export function unitResearchCsvRecords(data:UnitResearch,lead:number){
  const readout=unitResearchReadout(data,lead)
  const robustness=researchRobustness(data.points,lead)
  return [['method','origin_month','target_month','lead_months','actual_ampoules','prediction_ampoules','absolute_error_ampoules','signed_error_ampoules',
    'product','recorded_channel','unit','geography_status','research_display_authorized','operational_forecasting_approved','dataset_id','source_table','source_delta_version','artifact_sha256','confirmation_sha256','protocol_sha256','unreviewed_source_records','evaluation_design',
    'scored_target_months','cohort_MAE_ampoules','cohort_RMSE_ampoules','cohort_WAPE_percent','cohort_mean_signed_error_ampoules',
    'evaluation_origin_start','evaluation_origin_end','evaluation_target_start','evaluation_target_end','source_observation_end','requested_original_target','requested_target_lead_from_source_end','requested_target_prediction_available','selected_operational_method','policy_version',
    'robustness_policy','paired_reference_method','better_than_reference_targets','tied_with_reference_targets','worse_than_reference_targets','underpredicted_targets','overpredicted_targets','exact_targets','largest_absolute_error_ampoules','largest_error_target_months','omit_one_target_MAE_min_ampoules','omit_one_target_MAE_max_ampoules','lowest_MAE_after_omission_count','omission_cases'],
  ...data.points.filter(p=>p.lead===lead).map(p=>{const metric=data.metrics.find(m=>m.method===p.method&&m.lead===lead)!,review=robustness.rows.find(row=>row.method===p.method)!;return [p.method,p.origin,p.target_month,p.lead,p.actual,p.prediction,Math.abs(p.error),p.error,
    data.scope.product,data.scope.recorded_channel,data.scope.unit,data.scope.geography_status,true,false,data.source.dataset_id,data.source.fact_table,data.source.fact_version,
    data.source.artifact_sha256,data.source.confirmation_sha256,data.source.protocol_sha256,data.evidence.unreviewed_source_records,'conditional_retrospective_not_asof_or_untouched_holdout',
    metric.n,metric.mae,metric.rmse,metric.wape,metric.bias,readout.firstOrigin,readout.latestOrigin,readout.firstTarget,readout.latestTarget,
    readout.sourceEnd,readout.requestedTarget,readout.decemberLeadFromSourceEnd,readout.decemberPredictionAvailable,null,data.source.policy_version,
    ROBUSTNESS_POLICY,'last_value',review.betterThanLast,review.tiedWithLast,review.worseThanLast,review.underpredictions,review.overpredictions,review.exactPredictions,review.worstAbsoluteError,review.worstTargets.join(';'),review.omitOneMaeMin,review.omitOneMaeMax,review.lowestAfterOmission,review.n]})]
}

export function installUnitResearchPanel(root:HTMLElement):()=>void{
  const existing=root.querySelector<HTMLElement>('[data-forecast-validation]');if(!existing)return()=>{}
  const panel=document.createElement('section');panel.className='chart-card unit-research';panel.setAttribute('aria-label','BUPIRIGHT HOSPITAL channel research review')
  panel.innerHTML=`<style>.unit-research{min-width:0;overflow-wrap:anywhere}.unit-research p{line-height:1.6}.unit-research .unit-controls{display:flex;flex-wrap:wrap;align-items:end;gap:12px;margin:14px 0}.unit-research select{padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-card,#fff);color:var(--text-primary)}.unit-research .unit-scroll{overflow-x:auto;max-width:100%}.unit-research .unit-scroll:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.unit-research th,.unit-research td{padding:10px;font-size:12px;white-space:nowrap}#unitResearchRobustness{min-width:720px}#unitResearchRobustness th{white-space:normal;max-width:190px}.unit-research button:focus-visible,.unit-research select:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.unit-research button:disabled,.unit-research select:disabled{opacity:.55;cursor:not-allowed}@media(max-width:600px){.unit-research{padding:14px}.unit-research .unit-controls label{width:100%}}</style>
    <h2 class="chart-title">BUPIRIGHT unit research · HOSPITAL channel</h2>
    <p>Recorded fulfilled ampoules · Contracts excluded · Independent of Analysis filters. HOSPITAL is a recorded channel, not a verified delivery territory.</p>
    <p><strong>Research display authorized. Operational forecasting is not approved.</strong> No operational model is selected and no future forecast or reorder instruction is supplied.</p>
    <p id="unitResearchStatus" role="status">Open Forecast to load the comparison.</p>
    <div id="unitResearchUnderstandingBox" hidden role="note" aria-label="How to use the medicine-unit evidence"><p id="unitResearchUnderstanding"></p><details><summary>What does this result mean for medicine units?</summary><p id="unitResearchUnderstandingDetail"></p></details></div>
    <div class="unit-controls"><label>Forecast lead <select id="unitResearchLead" disabled><option value="1">1 month ahead</option><option value="3">3 months ahead</option></select></label><button id="unitResearchReload" type="button" class="btn btn-secondary">Reload comparison</button><button id="unitResearchExport" type="button" class="btn btn-secondary" disabled>Export comparison CSV</button></div>
    <p id="unitResearchCoverage"></p><p>MAE, RMSE and bias are in ampoules. WAPE is aggregate absolute error relative to actual recorded ampoules. Positive bias means overprediction. The comparison CSV includes all four baselines at the selected lead.</p>
    <p id="unitResearchTakeaway"></p><p id="unitResearchCalendar"></p>
    <div class="unit-scroll" tabindex="0" role="region" aria-label="Unit research baseline errors"><table id="unitResearchMetrics" class="product-table" aria-label="Baseline errors by method"></table></div>
    <details><summary>How consistent was the comparison?</summary><p id="unitResearchRobustnessSummary"></p><p>Better/tied/worse compares absolute errors with Last value on the same scored months. Underprediction means prediction below recorded ampoules. Each omission removes one scored month while keeping all predictions fixed; this is an influence check, not refitting, cross-validation, a confidence interval or a future forecast. Ties use 0.000000001 ampoule tolerance and are counted for every tied method.</p><div class="unit-scroll" tabindex="0" role="region" aria-label="Unit research scored-month sensitivity"><table id="unitResearchRobustness" class="product-table" aria-label="Paired errors and scored-month sensitivity"></table></div></details>
    <details id="unitResearchChartDetails"><summary>Compare recorded ampoules with a historical baseline</summary><label>Chart baseline <select id="unitResearchMethod" disabled><option value="last_value">Last value</option><option value="mean_3">Three-month mean</option><option value="mean_6">Six-month mean</option><option value="seasonal_naive_12">Seasonal naive (12 months)</option></select></label><p>Retrospective scored targets only. Choosing a chart baseline does not select an operational model. The exact values and errors follow below.</p><div id="unitResearchChartWrap" style="height:280px;position:relative" hidden><canvas id="unitResearchChart" role="img" aria-label="Recorded ampoules and historical baseline predictions on the same scored target months"></canvas></div></details>
    <details><summary>Exact predictions and errors</summary><div class="unit-scroll" tabindex="0" role="region" aria-label="Unit research historical predictions"><table id="unitResearchPoints" class="product-table" aria-label="Historical predictions and errors"></table></div></details>
    <details><summary>Source, unit evidence and limitations</summary><p id="unitResearchSource"></p><p id="unitResearchLimits"></p></details>`
  existing.before(panel)
  const el=<T extends HTMLElement>(id:string)=>panel.querySelector<T>('#'+id)!
  const lead=el<HTMLSelectElement>('unitResearchLead'),download=el<HTMLButtonElement>('unitResearchExport'),method=el<HTMLSelectElement>('unitResearchMethod')
  let data:UnitResearch|null=null,disposed=false,loaded=false,loading=false,sequence=0,chart:Chart|null=null
  const table=(target:HTMLTableElement,headers:string[],rows:string[][])=>{
    target.replaceChildren();const header=target.createTHead().insertRow()
    for(const label of headers){const th=document.createElement('th');th.textContent=label;th.scope='col';header.append(th)}
    const body=target.createTBody();for(const row of rows){const tr=body.insertRow();for(const value of row)tr.insertCell().textContent=value}
  }
  const clear=()=>{data=null;download.disabled=true;lead.disabled=true;method.disabled=true;chart?.destroy();chart=null;el('unitResearchChartWrap').hidden=true;el('unitResearchUnderstandingBox').hidden=true;for(const id of ['unitResearchUnderstanding','unitResearchUnderstandingDetail','unitResearchCoverage','unitResearchMetrics','unitResearchPoints','unitResearchSource','unitResearchLimits','unitResearchTakeaway','unitResearchCalendar','unitResearchRobustness','unitResearchRobustnessSummary'])el(id).replaceChildren()}
  const renderChart=()=>{
    chart?.destroy();chart=null;el('unitResearchChartWrap').hidden=true
    if(!data)return
    if(!methods.includes(method.value))method.value='last_value'
    const understanding=unitUnderstanding(data,Number(lead.value),method.value)
    el('unitResearchUnderstanding').textContent=understanding.summary;el('unitResearchUnderstandingDetail').textContent=understanding.detail;el('unitResearchUnderstandingBox').hidden=false
    const points=data.points.filter(point=>point.lead===Number(lead.value)&&point.method===method.value).sort((a,b)=>a.target_month.localeCompare(b.target_month))
    const first=monthIndex(points[0].target_month),last=monthIndex(points.at(-1)!.target_month)
    const months=Array.from({length:last-first+1},(_,offset)=>{const i=first+offset;return Math.floor(i/12)+'-'+String(i%12+1).padStart(2,'0')}),lookup=new Map(points.map(point=>[point.target_month,point]))
    el('unitResearchChart').setAttribute('aria-label',`Recorded ampoules and ${names[method.value]} historical predictions at lead ${lead.value}; retrospective scored targets only`)
    chart=new Chart(el<HTMLCanvasElement>('unitResearchChart'),{type:'line',data:{labels:months,datasets:[
      {label:'Recorded ampoules',data:months.map(month=>lookup.get(month)?.actual??null),borderColor:'#335f78',spanGaps:false},
      {label:'Historical baseline',data:months.map(month=>lookup.get(month)?.prediction??null),borderColor:'#a16d33',borderDash:[5,4],spanGaps:false}]},
      options:{responsive:true,maintainAspectRatio:false,animation:false,scales:{y:{title:{display:true,text:'Recorded ampoules'}}}}})
    el('unitResearchChartWrap').hidden=false;method.disabled=false
  }
  const render=()=>{
    if(!data)return
    if(!['1','3'].includes(lead.value))lead.value='1'
    const n=Number(lead.value),metrics=data.metrics.filter(m=>m.lead===n),points=data.points.filter(p=>p.lead===n)
    const readout=unitResearchReadout(data,n)
    const robustness=researchRobustness(data.points,n)
    el('unitResearchStatus').textContent=`Conditional retrospective review · ${metrics[0].n} observed target months per method · Small evaluation; no operational approval.`
    el('unitResearchCoverage').textContent=`${data.evidence.recent_contiguous_months} contiguous months, ${data.evidence.research_window_start}–${data.evidence.research_window_end}. ${data.evidence.source_records} source records in the full 35-observed-month scope; ${data.evidence.unreviewed_source_records} retain unreviewed-export status. User confirmed the two labels and one-ampoule / box-of-one billing basis.`
    el('unitResearchTakeaway').textContent=`At ${n} month${n===1?'':'s'} ahead, ${readout.lowestMaeMethods.map(method=>names[method]).join(' / ')} had the lowest observed MAE: ${number(readout.lowestMae)} ampoules across ${readout.scoredMonths} scored months. This is a small conditional historical comparison, not a selected or approved forecasting method.`
    el('unitResearchCalendar').textContent=`Evaluated origins: ${readout.firstOrigin}–${readout.latestOrigin}; scored targets: ${readout.firstTarget}–${readout.latestTarget}. Source observations end ${readout.sourceEnd}. December 2026 is ${readout.decemberLeadFromSourceEnd} calendar months after that source endpoint, but this artifact supplies no December prediction. Lead coverage and source availability do not establish operational validity.`
    table(el<HTMLTableElement>('unitResearchMetrics'),['Baseline','Scored months','MAE (ampoules)','RMSE (ampoules)','WAPE','Bias (ampoules)'],metrics.map(m=>[names[m.method],String(m.n),number(m.mae),number(m.rmse),m.wape===null?'Unavailable':number(m.wape)+'%',number(m.bias)]))
    el('unitResearchRobustnessSummary').textContent=`Only ${robustness.n} scored months. ${readout.lowestMaeMethods.map(method=>{const row=robustness.rows.find(row=>row.method===method)!;return names[method]+' remains among the lowest-MAE methods in '+row.lowestAfterOmission+'/'+row.n+' checks that omit one scored month (ties included)'}).join('; ')}. Small-sample stability does not establish future performance or operational approval.`
    table(el<HTMLTableElement>('unitResearchRobustness'),['Baseline','Better / tied / worse than Last value','Under / over / exact','Largest miss (ampoules)','MAE after one scored month omitted','Lowest MAE after omission'],robustness.rows.map(row=>[names[row.method],row.method==='last_value'?'Reference':`${row.betterThanLast} / ${row.tiedWithLast} / ${row.worseThanLast}`,`${row.underpredictions} / ${row.overpredictions} / ${row.exactPredictions}`,number(row.worstAbsoluteError),number(row.omitOneMaeMin)+'–'+number(row.omitOneMaeMax),`${row.lowestAfterOmission} / ${row.n} (ties included)`]))
    table(el<HTMLTableElement>('unitResearchPoints'),['Baseline','Origin','Target','Actual (ampoules)','Prediction (ampoules)','Absolute error','Signed error'],points.map(p=>[names[p.method],p.origin,p.target_month,number(p.actual),number(p.prediction),number(Math.abs(p.error)),number(p.error)]))
    el('unitResearchSource').textContent=`${data.scope.labels.join(' + ')} · ${data.evidence.unit_confirmation} Gold ${data.source.fact_table} @ ${data.source.fact_version} · Dataset ${data.source.dataset_id} · Artifact ${data.source.artifact_sha256} · Confirmation ${data.source.confirmation_sha256} · Protocol ${data.source.protocol_sha256}.`
    el('unitResearchLimits').textContent=data.limitations.join(' ');lead.disabled=false;download.disabled=false;renderChart()
  }
  let loadController: AbortController | null = null
  const load=async()=>{
    if(disposed||loading)return;loading=true;loadController?.abort();loadController=new AbortController();loaded=true;const request=++sequence;clear();el('unitResearchStatus').textContent='Loading source-matched unit research…'
    try{const value=await getJson<UnitResearch>('/api/sales/unit-baseline-research',{signal:loadController.signal});if(disposed||request!==sequence)return;if(!validUnitResearch(value))throw Error('Invalid unit evidence');data=value;render()}
    catch{if(!disposed&&request===sequence){clear();el('unitResearchStatus').textContent='Unit research unavailable. Reload to retry; no substitute results were used.'}}
    finally{if(!disposed&&request===sequence)loading=false}
  }
  lead.addEventListener('change',render);el('unitResearchReload').addEventListener('click',()=>void load())
  method.addEventListener('change',renderChart);el('unitResearchChartDetails').addEventListener('toggle',()=>chart?.resize())
  download.addEventListener('click',()=>{
    if(!data||download.disabled)return
    const quote=(v:unknown)=>'"'+String(v??'').replace(/"/g,'""')+'"'
    const records=unitResearchCsvRecords(data,Number(lead.value)),url=URL.createObjectURL(new Blob(['\uFEFF'+records.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}))
    const a=document.createElement('a');a.href=url;a.download=`medshield-bupiright-HOSPITAL-research-lead-${lead.value}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
  })
  const maybeLoad=()=>{if(!loaded&&existing.closest('.page')?.classList.contains('active'))void load()}
  const invalidate=()=>{loadController?.abort();sequence++;loading=false;loaded=false;clear();el('unitResearchStatus').textContent='Source changed. Reload unit research before review or export.'}
  root.addEventListener?.('medshield:source-reloaded',invalidate)
  const observer=new MutationObserver(maybeLoad);observer.observe(existing.closest('.page')??existing,{attributes:true,attributeFilter:['class']});maybeLoad()
  return()=>{disposed=true;loadController?.abort();sequence++;observer.disconnect();root.removeEventListener?.('medshield:source-reloaded',invalidate);chart?.destroy();panel.remove()}
}
