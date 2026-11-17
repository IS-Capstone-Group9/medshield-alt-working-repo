import Chart from 'chart.js/auto'
import {getJson} from './api-client'

type Stage='development'|'retrospective_audit'|'inspected_extension'
type Point={model_id:string;stage:Stage;origin_period:string;target_period:string;lead_months:number;actual:number;
  prediction:number|null;missing_reason:string|null;mase_scale:number;mase_scale_lag_months:number}
type Group={model_id:string;stage:Stage;lead_months:number;expected_cases:number;complete:boolean;n:number;
  mae:number|null;rmse:number|null;wape:number|null;bias:number|null;normalized_bias:number|null;mase:number|null}
export type TournamentResearch={schema_version:string;status:string;evidence_label:string;publication_approved:boolean;
  activation_allowed:boolean;financial_release_approved:boolean;operational_approval:boolean;
  source:{dataset_id:string;fact_table:string;fact_version:number;policy_version:string;receipt_sha256:string;
    monthly_sha256:string;artifact_sha256:string;registration_sha256:string;input_sha256:string;storage_id:string;table:string;execution_at:string};
  scope:{unit:string;contracts_excluded:boolean;buyers:string;company_coverage:string;filter_policy:string;training_start:string;source_end:string};
  models:string[];leads:number[];stages:Stage[];selections:Array<{lead_months:number;model_id:string;status:string;publication_approved:boolean}>;
  groups:Group[];points:Point[];limitations:string[]}
const stages:Stage[]=['development','retrospective_audit','inspected_extension']
const stageLabels={development:'Development origins: Dec 2022–Jun 2024',retrospective_audit:'Retrospective audit origins: Dec 2024–Jun 2025',inspected_extension:'Inspected extension origins: Dec 2025–Mar 2026'}
const counts={development:19,retrospective_audit:7,inspected_extension:4}
const starts={development:'2022-12',retrospective_audit:'2024-12',inspected_extension:'2025-12'}
const month=(s:string)=>/^\d{4}-(0[1-9]|1[0-2])$/.test(s)?Number(s.slice(0,4))*12+Number(s.slice(5))-1:NaN
const near=(a:number|null,b:number|null)=>a===null?b===null:typeof b==='number'&&Number.isFinite(b)&&Math.abs(a-b)<=Math.max(1e-7,Math.abs(a)*1e-10)
const hash=(s:unknown)=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s)
export function tournamentScore(points:Point[]){
  const valid=points.filter(p=>p.prediction!==null),n=valid.length,total=valid.reduce((s,p)=>s+Math.abs(p.actual),0)
  const errors=valid.map(p=>p.prediction!-p.actual),absolute=errors.reduce((s,e)=>s+Math.abs(e),0),signed=errors.reduce((s,e)=>s+e,0)
  return {n,mae:n?absolute/n:null,rmse:n?Math.sqrt(errors.reduce((s,e)=>s+e*e,0)/n):null,
    wape:total?absolute/total*100:null,bias:n?signed/n:null,normalized_bias:total?signed/total*100:null,
    mase:n?valid.reduce((s,p)=>s+Math.abs(p.prediction!-p.actual)/p.mase_scale,0)/n:null}
}
export function validTournamentResearch(input:unknown):input is TournamentResearch{
  try{
    const d=input as TournamentResearch,s=d?.source
    if(d?.schema_version!=='tournament_research_review_v1'||d.status!=='evaluated_unpublished'||d.evidence_label!=='Forecast'
      ||[d.publication_approved,d.activation_allowed,d.financial_release_approved,d.operational_approval].some(v=>v!==false)
      ||s?.dataset_id!=='e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10'
      ||s.fact_table!=='workspace.medshield_original_gold_20261026.original_fd95b9e3abab028c8e41_itemized_candidates'||s.fact_version!==0
      ||s.policy_version!=='original_source_layers_v1_candidate_only'||s.table!=='workspace.medshield_gold.fact_forecast_run_candidate'
      ||s.artifact_sha256!=='6f48c17c1e581864a42b5e34acc0747eff008fc7e8b87155e8bab0562d92055d'
      ||s.registration_sha256!=='de9493b198e85768cbdbd42ea05ebb52618c51fd93cae020cc086d2eecc03c65'
      ||s.monthly_sha256!=='9d087afd9dce2ee41da1701d34cbb0083d92d5b5b24dc8aac6471d83e5ed8d0e'
      ||s.input_sha256!=='5720ef1276e29c131b2f16b01efb3f0c313e6108b55ff92b4ab540a057c61957'
      ||s.receipt_sha256!=='d69414d3bb72c706bba30f24489074e4677f403277e18c64bb8d2e643b0012dd'
      ||s.storage_id!=='tournament_'+s.artifact_sha256||!Number.isFinite(Date.parse(s.execution_at))
      ||!Object.entries(s).filter(([k])=>k.endsWith('sha256')).every(([,v])=>hash(v)))return false
    if(d.scope?.unit!=='PHP'||d.scope.contracts_excluded!==true||d.scope.buyers!=='all'||d.scope.company_coverage!=='unknown'
      ||d.scope.filter_policy!=='fixed_itemized_all_buyers_independent_of_dashboard_filters'||d.scope.training_start!=='2020-01'||d.scope.source_end!=='2026-09'
      ||JSON.stringify(d.leads)!=='[1,3,6]'||JSON.stringify(d.stages)!==JSON.stringify(stages)
      ||!Array.isArray(d.models)||d.models.length!==22||new Set(d.models).size!==22||!d.models.every(m=>typeof m==='string'&&/^[a-z0-9_.]+$/.test(m))
      ||!['last_value','seasonal_naive','mean_6'].every(m=>d.models.includes(m))
      ||!Array.isArray(d.points)||d.points.length!==1980||!Array.isArray(d.groups)||d.groups.length!==198
      ||!Array.isArray(d.limitations)||!d.limitations.every(v=>typeof v==='string')||!Array.isArray(d.selections)||d.selections.length!==3)return false
    return validTournamentScores(d)
  }catch{return false}
}
/** Shared calendar, score and development-selection validation for PHP research panels. */
export function validTournamentScores(d:Pick<TournamentResearch,'points'|'models'|'leads'|'stages'|'groups'|'selections'>):boolean{
 try{
    const seen=new Set<string>(),actuals=new Map<string,number>()
    for(const p of d.points){
      if(!p||!d.models.includes(p.model_id)||!stages.includes(p.stage)||!d.leads.includes(p.lead_months)
        ||!Number.isFinite(p.actual)||p.prediction!==null&&!Number.isFinite(p.prediction)
        ||p.prediction===null&&(typeof p.missing_reason!=='string'||!p.missing_reason)
        ||!Number.isFinite(p.mase_scale)||p.mase_scale<=0||p.mase_scale_lag_months!==12
        ||month(p.target_period)-month(p.origin_period)!==p.lead_months
        ||!Number.isInteger(month(p.origin_period)-month(starts[p.stage]))||month(p.origin_period)<month(starts[p.stage])
        ||month(p.origin_period)>=month(starts[p.stage])+counts[p.stage])return false
      const key=[p.stage,p.lead_months,p.model_id,p.origin_period].join('|');if(seen.has(key))return false;seen.add(key)
      if(actuals.has(p.target_period)&&actuals.get(p.target_period)!==p.actual)return false;actuals.set(p.target_period,p.actual)
    }
    const groupKeys=new Set<string>()
    for(const g of d.groups){
      if(!g||!d.models.includes(g.model_id)||!stages.includes(g.stage)||!d.leads.includes(g.lead_months)||g.expected_cases!==counts[g.stage])return false
      const key=[g.stage,g.lead_months,g.model_id].join('|');if(groupKeys.has(key))return false;groupKeys.add(key)
      const points=d.points.filter(p=>p.stage===g.stage&&p.lead_months===g.lead_months&&p.model_id===g.model_id)
      const score=tournamentScore(points)
      if(points.length!==g.expected_cases||score.n!==g.n||g.complete!==(g.n===g.expected_cases)
        ||!(['mae','rmse','wape','bias','normalized_bias','mase'] as const).every(k=>near(score[k],g[k])))return false
    }
    for(const lead of d.leads){
      const selection=d.selections.filter(s=>s.lead_months===lead);if(selection.length!==1||selection[0].publication_approved!==false)return false
      const groups=d.groups.filter(g=>g.stage==='development'&&g.lead_months===lead&&g.complete)
      const last=groups.find(g=>g.model_id==='last_value'),season=groups.find(g=>g.model_id==='seasonal_naive');if(!last||!season)return false
      const eligible=groups.filter(g=>!['last_value','seasonal_naive'].includes(g.model_id)&&g.mase!==null&&g.mase<1&&g.mae!==null
        &&g.mae<last.mae!&&g.mae<season.mae!&&g.normalized_bias!==null&&Math.abs(g.normalized_bias)<=5).sort((a,b)=>a.mae!-b.mae!||(a.model_id<b.model_id?-1:1))
      if(selection[0].model_id!==(eligible[0]?.model_id??'seasonal_naive')||selection[0].status!==(eligible.length?'RESEARCH_RULE_CHALLENGER_SELECTED':'NO_PROMOTION_RETAIN_BASELINE'))return false
    }
    return true
  }catch{return false}
}

export function tournamentCsvRecords(d:TournamentResearch,stage:Stage,lead:number,model:string){
  if(!validTournamentResearch(d)||!d.stages.includes(stage)||!d.leads.includes(lead)||!d.models.includes(model))throw Error('Invalid tournament review')
  const g=d.groups.find(g=>g.stage===stage&&g.lead_months===lead&&g.model_id===model)!
  const selected=d.selections.find(s=>s.lead_months===lead)!
  return [['stage','lead_months','model','origin_month','target_month','actual_php','prediction_php','prediction_minus_actual_php','missing_reason',
    'origin_training_mase_scale_php','mase_scale_lag_months','group_scored_n','group_expected_n','group_complete','group_mae_php','group_wape_pct','group_bias_php','group_mase',
    'development_reference','development_selection_status','evidence','dataset_id','fact_table','fact_version','source_policy','monthly_sha256','input_sha256','artifact_sha256','registration_sha256',
    'storage_id','source_execution_at','unit','contracts_excluded','buyers','company_coverage','publication_approved','activation_allowed','operational_approval','financial_release_approved'],
    ...d.points.filter(p=>p.stage===stage&&p.lead_months===lead&&p.model_id===model).sort((a,b)=>a.origin_period.localeCompare(b.origin_period)).map(p=>[
      stage,lead,model,p.origin_period,p.target_period,p.actual,p.prediction,p.prediction===null?null:p.prediction-p.actual,p.missing_reason,p.mase_scale,p.mase_scale_lag_months,
      g.n,g.expected_cases,g.complete,g.mae,g.wape,g.bias,g.mase,selected.model_id,selected.status,'Forecast',d.source.dataset_id,d.source.fact_table,d.source.fact_version,d.source.policy_version,
      d.source.monthly_sha256,d.source.input_sha256,d.source.artifact_sha256,d.source.registration_sha256,d.source.storage_id,d.source.execution_at,'PHP',true,'all','unknown',false,false,false,false])]
}

/** Explain the displayed, already-validated historical group without granting model approval. */
export function tournamentUnderstanding(d:TournamentResearch,stage:Stage,lead:number,model:string){
  const group=d.groups.find(g=>g.stage===stage&&g.lead_months===lead&&g.model_id===model)
  const points=d.points.filter(p=>p.stage===stage&&p.lead_months===lead&&p.model_id===model)
  const targets=points.map(p=>p.target_period).sort(),choice=d.selections.find(s=>s.lead_months===lead)
  const money=(value:number|null|undefined)=>typeof value==='number'&&Number.isFinite(value)?'₱'+value.toLocaleString('en-PH',{maximumFractionDigits:2,minimumFractionDigits:2}):'Unavailable'
  const reference=(id:string)=>money(d.groups.find(g=>g.stage===stage&&g.lead_months===lead&&g.model_id===id)?.mae)
  return {
    summary:`Predicts monthly recorded itemized sales in pesos, not medicine units. ${model.replaceAll('_',' ')} at ${lead} month(s) ahead: average absolute miss ${money(group?.mae)} across ${group?.n??0}/${group?.expected_cases??0} historical predictions. Research only; future reliability is not established.`,
    detail:`Scored target months: ${targets[0]??'Unavailable'}–${targets.at(-1)??'Unavailable'}; source history ends ${d.scope.source_end}. At this same window and lead, Last value MAE is ${reference('last_value')} and Seasonal naive MAE is ${reference('seasonal_naive')}. Compare complete matching cases; unavailable predictions are not zero error. Development reference: ${choice?.model_id.replaceAll('_',' ')??'Unavailable'} (${choice?.status==='NO_PROMOTION_RETAIN_BASELINE'?'baseline retained; no challenger qualified':'research-rule selection only'}). Later audit and extension results do not select a new winner. WAPE measures total absolute error relative to actual sales; it is not a percent-correct score. This excludes contracts and does not establish complete company sales. Model owner reviews prospective errors and source coverage before any operating forecast is approved.`,
  }
}

export function installTournamentResearch(root:HTMLElement):()=>void{
  const host=root.querySelector<HTMLElement>('[data-forecast-validation]');if(!host)return()=>{}
  const panel=document.createElement('section');panel.className='chart-card tournament-research';panel.setAttribute('aria-label','Lead 1, 3 and 6 PHP tournament research')
  panel.innerHTML=`<style>.tournament-research{min-width:0;overflow-wrap:anywhere}.tournament-research p{line-height:1.55}.tournament-controls{display:flex;gap:12px;flex-wrap:wrap;margin:14px 0;align-items:end}.tournament-controls label{font-size:12px}.tournament-controls select{display:block;max-width:100%;padding:8px;background:var(--bg-card,#fff);color:var(--text-primary);border:1px solid var(--border);border-radius:6px}.tournament-research .tournament-scroll{overflow:auto;max-height:420px;max-width:100%}.tournament-research th,.tournament-research td{padding:10px;text-align:left;font-size:12px}.tournament-research .tournament-scroll table{min-width:800px;width:100%}.tournament-research .tournament-scroll td{white-space:nowrap}.tournament-research th{white-space:normal}.tournament-research button:disabled,.tournament-research select:disabled{opacity:.5;cursor:not-allowed}.tournament-research button:hover:not(:disabled){filter:brightness(.96)}.tournament-research button:focus-visible,.tournament-research select:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.tournament-chart{position:relative;height:280px}@media(max-width:600px){.tournament-controls label,.tournament-controls button{width:100%}.tournament-controls select{width:100%}.tournament-chart{height:240px}}</style>
  <h2 class="chart-title">Lead 1, 3 and 6 · PHP forecast research</h2>
  <p>Recorded itemized net sales · All buyers · Contracts excluded · PHP. Independent of Analysis filters. Model execution used retained history; current Gold is checked before display. This is retrospective research, with no operational activation.</p>
  <div class="tournament-controls"><label>Research window<select data-tournament-stage disabled></select></label><label>Months ahead<select data-tournament-lead disabled><option>1</option><option>3</option><option>6</option></select></label><label>Model<select data-tournament-model disabled></select></label><button type="button" class="btn btn-secondary" data-tournament-reload>Reload tournament research</button><button type="button" class="btn btn-secondary" data-tournament-export disabled>Export tournament review</button></div>
  <p role="status" data-tournament-status>Open Forecast to load the tournament review.</p>
  <div data-tournament-understandingbox hidden role="note" aria-label="How to use the sales forecast evidence"><p data-tournament-understanding></p><details><summary>What does this result mean for planning?</summary><p data-tournament-understandingdetail></p></details></div>
  <p data-tournament-selection></p><p data-tournament-metrics></p>
  <div class="tournament-chart" hidden><canvas data-tournament-chart aria-label="Recorded PHP sales and retrospective predictions; exact values in table"></canvas></div>
  <p>Scroll tables sideways on narrow screens to read every column. Keyboard users can focus a table region and use the arrow keys.</p>
  <div class="tournament-scroll" role="region" tabindex="0" aria-label="Tournament prediction table"><table class="cluster-table" data-tournament-points></table></div>
  <details><summary>All models at this window and lead</summary><div class="tournament-scroll" role="region" tabindex="0" aria-label="Tournament model comparison"><table class="cluster-table" data-tournament-groups></table></div></details>
  <details><summary>Source and limitations</summary><p data-tournament-source></p><p data-tournament-limits></p></details>`
  host.before(panel)
  const el=<T extends HTMLElement>(name:string)=>panel.querySelector<T>('[data-tournament-'+name+']')!
  const stage=el<HTMLSelectElement>('stage'),lead=el<HTMLSelectElement>('lead'),model=el<HTMLSelectElement>('model'),reload=el<HTMLButtonElement>('reload'),download=el<HTMLButtonElement>('export')
  let data:TournamentResearch|null=null,chart:Chart|null=null,loading=false,loaded=false,disposed=false,sequence=0
  const clear=()=>{data=null;chart?.destroy();chart=null;el('chart').parentElement!.hidden=true;el('understandingbox').hidden=true;download.disabled=true;stage.disabled=true;lead.disabled=true;model.disabled=true;stage.replaceChildren();model.replaceChildren();for(const n of ['understanding','understandingdetail','selection','metrics','points','groups','source','limits'])el(n).replaceChildren()}
  const table=(target:HTMLTableElement,headers:string[],rows:string[][])=>{target.replaceChildren();const head=target.createTHead().insertRow();for(const text of headers){const th=document.createElement('th');th.scope='col';th.textContent=text;head.append(th)}const body=target.createTBody();for(const row of rows){const tr=body.insertRow();for(const value of row)tr.insertCell().textContent=value}}
  const amount=(v:number|null)=>v===null?'Unavailable':v.toLocaleString('en-PH',{maximumFractionDigits:2})
  const render=()=>{
    if(!data)return
    const d=data,l=Number(lead.value),s=stage.value as Stage
    const selection=d.selections.find(v=>v.lead_months===l)!,g=d.groups.find(g=>g.stage===s&&g.lead_months===l&&g.model_id===model.value)!
    const points=d.points.filter(p=>p.stage===s&&p.lead_months===l&&p.model_id===model.value).sort((a,b)=>a.target_period.localeCompare(b.target_period))
    const understanding=tournamentUnderstanding(d,s,l,model.value)
    el('understanding').textContent=understanding.summary;el('understandingdetail').textContent=understanding.detail;el('understandingbox').hidden=false
    el('status').textContent=`${g.n}/${g.expected_cases} predictions available · ${l} month(s) ahead · ${stageLabels[s]}. Publication and operational approval are pending.`
    el('selection').textContent=`Development-only reference for lead ${l}: ${selection.model_id} · ${selection.status}. Frozen rule: MASE < 1, MAE below last-value and seasonal-naive baselines, absolute normalized bias ≤ 5%. Audit/extension results do not select a winner. Existing model selections remain unchanged.`
    el('metrics').textContent=`MAE PHP ${amount(g.mae)} · WAPE ${g.wape===null?'Unavailable':amount(g.wape)+'%'} · Signed bias PHP ${amount(g.bias)} · MASE ${amount(g.mase)}. Positive bias means overprediction. Origin-local seasonal-naive training scale; MASE < 1 alone does not establish holdout superiority.`
    table(el<HTMLTableElement>('points'),['Origin','Target','Lead','Recorded PHP','Predicted PHP','Prediction − actual PHP','Availability'],points.map(p=>[p.origin_period,p.target_period,String(l),amount(p.actual),amount(p.prediction),amount(p.prediction===null?null:p.prediction-p.actual),p.prediction===null?'Unavailable: '+p.missing_reason:'Retrospective prediction']))
    table(el<HTMLTableElement>('groups'),['Model','Scored / expected','Complete','MAE PHP','WAPE %','Bias PHP','MASE'],d.groups.filter(g=>g.stage===s&&g.lead_months===l).map(g=>[g.model_id,`${g.n}/${g.expected_cases}`,String(g.complete),amount(g.mae),amount(g.wape),amount(g.bias),amount(g.mase)]))
    chart?.destroy();el('chart').parentElement!.hidden=false
    chart=new Chart(el<HTMLCanvasElement>('chart'),{type:'line',data:{labels:points.map(p=>p.target_period),datasets:[{label:'Recorded net sales (PHP)',data:points.map(p=>p.actual),borderColor:'#335f78',spanGaps:false},{label:'Retrospective prediction (PHP)',data:points.map(p=>p.prediction),borderColor:'#a16d33',borderDash:[5,4],spanGaps:false}]},options:{responsive:true,maintainAspectRatio:false,animation:false,scales:{y:{title:{display:true,text:'PHP'}}}}})
    el('source').textContent=`Gold ${d.source.storage_id} · Dataset ${d.source.dataset_id} · Fact Delta ${d.source.fact_version} · Artifact SHA-256 ${d.source.artifact_sha256} · Registration SHA-256 ${d.source.registration_sha256} · Execution ${d.source.execution_at}`
    el('limits').textContent=d.limitations.join(' ');download.disabled=false
  }
  let loadController: AbortController | null = null
  const load=async()=>{
    if(disposed||loading)return;loading=true;loadController?.abort();loadController=new AbortController();loaded=true;reload.disabled=true;const request=++sequence;clear();el('status').textContent='Loading source-matched tournament research…'
    try{const value=await getJson<unknown>('/api/sales/tournament-research',{signal:loadController.signal});if(disposed||request!==sequence)return;if(!validTournamentResearch(value))throw Error('Invalid tournament');data=value;
      for(const s of stages)stage.add(new Option(stageLabels[s],s));stage.value='development';lead.value='1';for(const m of data.models)model.add(new Option(m,m));model.value=data.selections[0].model_id;stage.disabled=false;lead.disabled=false;model.disabled=false;render()
    }catch{if(!disposed&&request===sequence){clear();el('status').textContent='Tournament research unavailable. Reload to retry; no substitute or previous results are shown.'}}
    finally{if(!disposed&&request===sequence){loading=false;reload.disabled=false}}
  }
  const exportCsv=()=>{if(!data||download.disabled||loading)return;const records=tournamentCsvRecords(data,stage.value as Stage,Number(lead.value),model.value);const quote=(v:unknown)=>'"'+String(v??'').replace(/"/g,'""')+'"';const url=URL.createObjectURL(new Blob(['\uFEFF'+records.map(r=>r.map(quote).join(',')).join('\r\n')+'\r\n'],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`medshield-tournament-${stage.value}-lead-${lead.value}-${model.value}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  const invalidate=()=>{loadController?.abort();sequence++;loading=false;loaded=false;reload.disabled=false;clear();el('status').textContent='Source changed. Reload tournament research before review or export.'}
  const maybeLoad=()=>{if(!loaded&&host.closest('.page')?.classList.contains('active'))void load()}
  const observer=new MutationObserver(maybeLoad);observer.observe(host.closest('.page')??host,{attributes:true,attributeFilter:['class']})
  stage.addEventListener('change',render);lead.addEventListener('change',()=>{if(data)model.value=data.selections.find(s=>s.lead_months===Number(lead.value))!.model_id;render()});model.addEventListener('change',render);reload.addEventListener('click',()=>void load());download.addEventListener('click',exportCsv);root.addEventListener('medshield:source-reloaded',invalidate);maybeLoad()
  return()=>{disposed=true;loadController?.abort();sequence++;observer.disconnect();root.removeEventListener('medshield:source-reloaded',invalidate);clear();panel.remove()}
}
