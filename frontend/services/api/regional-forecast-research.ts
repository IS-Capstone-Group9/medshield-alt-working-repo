import Chart from 'chart.js/auto'
import {getJson} from './api-client'
import {validTournamentScores,type TournamentResearch} from './tournament-research'
type Stage='development'|'retrospective_audit'|'inspected_extension'
type RegionalPoint=TournamentResearch['points'][number]&{region:string;unit:string;target_source_records:number;target_unreviewed_source_records:number;training_window_unreviewed_records_in_current_snapshot:number}
type Region={region:string;status:string;expected_months:number;observed_eligible_months:number;missing_months:string[];observed_last_month:string|null;unreviewed_records_in_window:number;unit:string;territorial_unit_forecast_eligible:boolean;points:RegionalPoint[];groups:TournamentResearch['groups'];selections:TournamentResearch['selections']}
export type RegionalResearch=Omit<TournamentResearch,'source'|'points'|'groups'|'selections'>&{source:{dataset_id:string;fact_table:string;fact_version:number;policy_version:string;receipt_sha256:string;mapping_sha256:string;mapping_table:string;current_monthly_sha256:string;calendar_start:string;calendar_end:string;source_months:number;artifact_sha256:string;registration_sha256:string;storage_id:string;table:string;execution_at:string};regions:Region[]}
type RegionalView=RegionalResearch&Region
const stages:Stage[]=['development','retrospective_audit','inspected_extension']
const stageLabels={development:'Development origins: Dec 2022–Jun 2024',retrospective_audit:'Retrospective audit origins: Dec 2024–Jun 2025',inspected_extension:'Inspected extension origins: Dec 2025–Mar 2026'}
export function validRegionalResearch(input:unknown):input is RegionalResearch{
 try{
 const d=input as RegionalResearch,s=d.source
 if(d.schema_version!=='regional_php_research_review_v1'||d.status!=='evaluated_unpublished'||d.evidence_label!=='Forecast'
 ||[d.publication_approved,d.activation_allowed,d.financial_release_approved,d.operational_approval].some(v=>v!==false)
 ||s.dataset_id!=='e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10'||s.fact_version!==0
 ||s.fact_table!=='workspace.medshield_original_gold_20261026.original_fd95b9e3abab028c8e41_itemized_candidates'
 ||s.policy_version!=='original_source_layers_v1_candidate_only'||s.receipt_sha256!=='d69414d3bb72c706bba30f24489074e4677f403277e18c64bb8d2e643b0012dd'
 ||s.mapping_sha256!=='4c5f44013464395efa49c133f2d141646930f9437a23e60e8b05cf0298392df4'
 ||s.mapping_table!=='workspace.medshield_original_gold_20261026.regional_4c5f44013464395e_candidate'
 ||s.current_monthly_sha256!=='3c3732944ea115a3e12465bd48ee1d0322a503beb7c44e60a64e85b54cff586c'
 ||s.artifact_sha256!=='dbb21eef89a5a90ba68460650b4490fb5c2cd5694ff95351734abaab13e92ce1'
 ||s.registration_sha256!=='f1d38b475de2190519bc104b6ce80c575d3310594816b1ed01b7f8d9363da7ae'
 ||s.storage_id!=='regional_php_'+s.artifact_sha256||s.table!=='workspace.medshield_gold.fact_forecast_run_candidate'
 ||s.calendar_start!=='2017-01'||s.calendar_end!=='2026-09'||s.source_months!==107||!Number.isFinite(Date.parse(s.execution_at))
 ||d.scope.unit!=='PHP'||d.scope.contracts_excluded!==true||d.scope.buyers!=='all'||d.scope.company_coverage!=='unknown'
 ||d.scope.filter_policy!=='fixed_confirmed_delivery_regions_independent_of_analysis_filters'||d.scope.training_start!=='2020-01'||d.scope.source_end!=='2026-09'
 ||JSON.stringify(d.leads)!=='[1,3,6]'||JSON.stringify(d.stages)!==JSON.stringify(stages)
 ||d.models.length!==22||new Set(d.models).size!==22||!d.models.every(m=>/^[a-z0-9_.]+$/.test(m))
 ||!['last_value','seasonal_naive','mean_6'].every(m=>d.models.includes(m))||!d.limitations.every(v=>typeof v==='string')
 ||d.regions.length!==3||d.regions.map(r=>r.region).join('|')!=='CALABARZON|MIMAROPA|BICOL')return false
 for(const [index,r] of d.regions.entries()){
  if(r.expected_months!==81||r.observed_eligible_months!==[81,56,38][index]||r.unit!=='PHP'||r.territorial_unit_forecast_eligible!==false
  ||r.unreviewed_records_in_window!==[842,0,0][index]||r.observed_last_month!==['2026-09','2025-10','2023-09'][index]
  ||r.missing_months.length!==81-r.observed_eligible_months||new Set(r.missing_months).size!==r.missing_months.length
  ||!r.missing_months.every(m=>/^20(20|21|22|23|24|25|26)-(0[1-9]|1[0-2])$/.test(m)&&m<='2026-09'))return false
  if(index){if(r.status!=='unavailable_incomplete_registered_history'||r.points.length||r.groups.length||r.selections.length)return false;continue}
  if(r.status!=='eligible_financial_research'||r.points.length!==1980||r.groups.length!==198||r.selections.length!==3||!validTournamentScores({...d,...r}))return false
  for(const p of r.points){if(p.region!==r.region||p.unit!=='PHP'||![p.target_source_records,p.target_unreviewed_source_records,p.training_window_unreviewed_records_in_current_snapshot].every(n=>Number.isSafeInteger(n)&&n>=0)||p.target_source_records<=0||p.target_unreviewed_source_records>p.target_source_records)return false}
 }
 return true
 }catch{return false}
}
export function regionalCsvRecords(envelope:RegionalResearch,region:string,stage:Stage,lead:number,model:string){
 if(!validRegionalResearch(envelope))throw Error('Invalid regional review')
 const coverage=envelope.regions.find(r=>r.region===region);if(!coverage)throw Error('Invalid region')
 const d={...envelope,...coverage}
 if(d.region!=='CALABARZON'||d.status!=='eligible_financial_research'||!validTournamentScores(d)||!d.stages.includes(stage)||!d.leads.includes(lead)||!d.models.includes(model))throw Error('Invalid regional review')
 const group=d.groups.find(g=>g.stage===stage&&g.lead_months===lead&&g.model_id===model)!,selection=d.selections.find(s=>s.lead_months===lead)!
 const metadata={region:d.region,stage,lead_months:lead,model,unit:'PHP',evidence:'Forecast',group_scored_n:group.n,group_expected_n:group.expected_cases,group_complete:group.complete,group_mae_php:group.mae,group_wape_pct:group.wape,group_bias_php:group.bias,group_mase:group.mase,development_reference:selection.model_id,development_selection_status:selection.status,...d.source,contracts_excluded:true,buyers:'all',source_completeness:'unknown',registered_window_unreviewed_records:d.unreviewed_records_in_window,territorial_unit_forecast_eligible:false,publication_approved:false,activation_allowed:false,operational_approval:false,financial_release_approved:false}
 const rows=d.points.filter(p=>p.stage===stage&&p.lead_months===lead&&p.model_id===model).sort((a,b)=>a.origin_period.localeCompare(b.origin_period)).map(p=>({...metadata,origin_month:p.origin_period,target_month:p.target_period,actual_php:p.actual,prediction_php:p.prediction,prediction_minus_actual_php:p.prediction===null?null:p.prediction-p.actual,missing_reason:p.missing_reason,origin_training_mase_scale_php:p.mase_scale,mase_scale_lag_months:p.mase_scale_lag_months,target_source_records:p.target_source_records,target_unreviewed_source_records:p.target_unreviewed_source_records,training_window_unreviewed_records_in_current_snapshot:p.training_window_unreviewed_records_in_current_snapshot}))
 return [Object.keys(rows[0]),...rows.map(r=>Object.values(r))]
}
export function installRegionalForecastResearch(root:HTMLElement):()=>void{
  const host=root.querySelector<HTMLElement>('[data-forecast-validation]');if(!host)return()=>{}
  const panel=document.createElement('section');panel.className='chart-card regional-php-research';panel.setAttribute('aria-label','Regional PHP forecast research')
  panel.innerHTML=`<style>.regional-php-research{min-width:0;overflow-wrap:anywhere}.regional-php-research p{line-height:1.55}.regional-php-controls{display:flex;gap:12px;flex-wrap:wrap;margin:14px 0;align-items:end}.regional-php-controls label{font-size:12px}.regional-php-controls select{display:block;max-width:100%;padding:8px;background:var(--bg-card,#fff);color:var(--text-primary);border:1px solid var(--border);border-radius:6px}.regional-php-research .regional-php-scroll{overflow:auto;max-height:420px;max-width:100%}.regional-php-research th,.regional-php-research td{padding:10px;text-align:left;font-size:12px}.regional-php-research table{min-width:1100px}.regional-php-research td{white-space:nowrap}.regional-php-research th{white-space:normal;overflow-wrap:normal;min-width:70px}.regional-php-research button:disabled,.regional-php-research select:disabled{opacity:.5;cursor:not-allowed}.regional-php-research button:hover:not(:disabled){filter:brightness(.96)}.regional-php-research button:focus-visible,.regional-php-research select:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.regional-php-chart{position:relative;height:280px}@media(max-width:600px){.regional-php-controls label,.regional-php-controls button{width:100%}.regional-php-controls select{width:100%}.regional-php-chart{height:240px}}</style>
  <h2 class="chart-title">Regional PHP · Lead 1, 3 and 6 research</h2>
  <p>Confirmed delivery regions · Recorded itemized net sales · All buyers · Contracts excluded · PHP. Independent of Analysis filters. Model execution used retained history; current Gold is checked before display. This is retrospective research, with no operational activation.</p>
  <div class="regional-php-controls"><label>Confirmed delivery region<select data-regional-php-region disabled></select></label><label>Research window<select data-regional-php-stage disabled></select></label><label>Months ahead<select data-regional-php-lead disabled><option>1</option><option>3</option><option>6</option></select></label><label>Model<select data-regional-php-model disabled></select></label><button type="button" class="btn btn-secondary" data-regional-php-reload>Reload regional PHP research</button><button type="button" class="btn btn-secondary" data-regional-php-export disabled>Export regional PHP review</button></div>
  <p role="status" data-regional-php-status>Open Forecast to load the regional PHP review.</p><p data-regional-php-selection></p><p data-regional-php-metrics></p>
  <div class="regional-php-chart" hidden><canvas data-regional-php-chart aria-label="Recorded PHP sales and retrospective predictions; exact values in table"></canvas></div>
  <div class="regional-php-scroll" role="region" tabindex="0" aria-label="Regional PHP prediction table"><table class="cluster-table" data-regional-php-points></table></div>
  <details><summary>All models at this window and lead</summary><div class="regional-php-scroll" role="region" tabindex="0" aria-label="Regional PHP model comparison"><table class="cluster-table" data-regional-php-groups></table></div></details>
  <details><summary>Source and limitations</summary><p data-regional-php-source></p><p data-regional-php-limits></p></details>`
  host.before(panel)
  const el=<T extends HTMLElement>(name:string)=>panel.querySelector<T>('[data-regional-php-'+name+']')!
  const region=el<HTMLSelectElement>('region'),stage=el<HTMLSelectElement>('stage'),lead=el<HTMLSelectElement>('lead'),model=el<HTMLSelectElement>('model'),reload=el<HTMLButtonElement>('reload'),download=el<HTMLButtonElement>('export')
  let envelope:RegionalResearch|null=null;let data:RegionalView|null=null,chart:Chart|null=null,loading=false,loaded=false,disposed=false,sequence=0
  let requestController:AbortController|null=null
  const clear=()=>{envelope=null;data=null;region.disabled=true;region.replaceChildren();chart?.destroy();chart=null;el('chart').parentElement!.hidden=true;download.disabled=true;stage.disabled=true;lead.disabled=true;model.disabled=true;stage.replaceChildren();model.replaceChildren();for(const n of ['selection','metrics','points','groups','source','limits'])el(n).replaceChildren()}
  const table=(target:HTMLTableElement,headers:string[],rows:string[][])=>{target.replaceChildren();const head=target.createTHead().insertRow();for(const text of headers){const th=document.createElement('th');th.scope='col';th.textContent=text;head.append(th)}const body=target.createTBody();for(const row of rows){const tr=body.insertRow();for(const value of row)tr.insertCell().textContent=value}}
  const amount=(v:number|null)=>v===null?'Unavailable':v.toLocaleString('en-PH',{maximumFractionDigits:2})
  const render=()=>{
    if(!envelope)return
    const coverage=envelope.regions.find(r=>r.region===region.value)!
    data={...envelope,...coverage}
    if(coverage.status!=='eligible_financial_research'){
      chart?.destroy();chart=null;el('chart').parentElement!.hidden=true;download.disabled=true
      for(const n of ['selection','metrics','points','groups'])el(n).replaceChildren()
      el('status').textContent=`${coverage.region}: unavailable — ${coverage.observed_eligible_months}/81 eligible months. Missing history is not zero sales. No territorial unit forecast.`
      el('source').textContent=`Missing months: ${coverage.missing_months.join(', ')}. Last eligible month: ${coverage.observed_last_month}. Gold ${envelope.source.storage_id}`
      el('limits').textContent=envelope.limitations.join(' ')
      stage.disabled=true;lead.disabled=true;model.disabled=true;return
    }
    stage.disabled=false;lead.disabled=false;model.disabled=false
    const d=data,l=Number(lead.value),s=stage.value as Stage
    const selection=d.selections.find(v=>v.lead_months===l)!,g=d.groups.find(g=>g.stage===s&&g.lead_months===l&&g.model_id===model.value)!
    const points=d.points.filter(p=>p.stage===s&&p.lead_months===l&&p.model_id===model.value).sort((a,b)=>a.target_period.localeCompare(b.target_period))
    el('status').textContent=`${region.value} · ${coverage.observed_eligible_months}/81 eligible months · ${coverage.unreviewed_records_in_window} unreviewed source records in registered window · ${g.n}/${g.expected_cases} predictions available · ${l} month(s) ahead · ${stageLabels[s]}. Publication and operational approval are pending.`
    el('selection').textContent=`Development-only reference for lead ${l}: ${selection.model_id} · ${selection.status}. Frozen rule: MASE < 1, MAE below last-value and seasonal-naive baselines, absolute normalized bias ≤ 5%. Audit/extension results do not select a winner. Existing model selections remain unchanged.`
    el('metrics').textContent=`MAE PHP ${amount(g.mae)} · WAPE ${g.wape===null?'Unavailable':amount(g.wape)+'%'} · Signed bias PHP ${amount(g.bias)} · MASE ${amount(g.mase)}. Positive bias means overprediction. Origin-local seasonal-naive training scale; MASE < 1 alone does not establish holdout superiority.`
    table(el<HTMLTableElement>('points'),['Origin','Target','Lead','Recorded PHP','Predicted PHP','Prediction − actual PHP','Target source records','Target unreviewed records','Training unreviewed records','Availability'],points.map(p=>[p.origin_period,p.target_period,String(l),amount(p.actual),amount(p.prediction),amount(p.prediction===null?null:p.prediction-p.actual),String(p.target_source_records),String(p.target_unreviewed_source_records),String(p.training_window_unreviewed_records_in_current_snapshot),p.prediction===null?'Unavailable: '+p.missing_reason:'Retrospective prediction']))
    table(el<HTMLTableElement>('groups'),['Model','Scored / expected','Complete','MAE PHP','WAPE %','Bias PHP','MASE'],d.groups.filter(g=>g.stage===s&&g.lead_months===l).map(g=>[g.model_id,`${g.n}/${g.expected_cases}`,String(g.complete),amount(g.mae),amount(g.wape),amount(g.bias),amount(g.mase)]))
    chart?.destroy();el('chart').parentElement!.hidden=false
    chart=new Chart(el<HTMLCanvasElement>('chart'),{type:'line',data:{labels:points.map(p=>p.target_period),datasets:[{label:'Recorded net sales (PHP)',data:points.map(p=>p.actual),borderColor:'#335f78',spanGaps:false},{label:'Retrospective prediction (PHP)',data:points.map(p=>p.prediction),borderColor:'#a16d33',borderDash:[5,4],spanGaps:false}]},options:{responsive:true,maintainAspectRatio:false,animation:false,scales:{y:{title:{display:true,text:'PHP'}}}}})
    el('source').textContent=`Gold ${d.source.storage_id} · Dataset ${d.source.dataset_id} · Fact Delta ${d.source.fact_version} · Artifact SHA-256 ${d.source.artifact_sha256} · Mapping SHA-256 ${d.source.mapping_sha256} · Current monthly SHA-256 ${d.source.current_monthly_sha256} · Registration SHA-256 ${d.source.registration_sha256} · Execution ${d.source.execution_at}`
    el('limits').textContent=d.limitations.join(' ');download.disabled=false
  }
  const load=async()=>{
    if(disposed||loading)return;loading=true;loaded=true;reload.disabled=true;const request=++sequence;clear();el('status').textContent='Loading source-matched regional PHP research…'
    const controller=new AbortController();requestController=controller
    try{const value=await getJson<unknown>('/api/sales/regional-php-research',{signal:controller.signal});if(disposed||request!==sequence)return;if(!validRegionalResearch(value))throw Error('Invalid regional PHP review');envelope=value;data={...value,...value.regions[0]};for(const r of value.regions)region.add(new Option(r.region,r.region));region.value='CALABARZON';region.disabled=false;
      for(const s of stages)stage.add(new Option(stageLabels[s],s));stage.value='inspected_extension';lead.value='1';for(const m of data.models)model.add(new Option(m,m));model.value=data.selections[0].model_id;stage.disabled=false;lead.disabled=false;model.disabled=false;render()
    }catch{if(!disposed&&request===sequence){clear();el('status').textContent='Regional PHP research unavailable. Reload to retry; no substitute or previous results are shown.'}}
    finally{if(requestController===controller)requestController=null;if(!disposed&&request===sequence){loading=false;reload.disabled=false}}
  }
  const exportCsv=()=>{if(!data||download.disabled||loading)return;const records=regionalCsvRecords(envelope!,region.value,stage.value as Stage,Number(lead.value),model.value);const quote=(v:unknown)=>'"'+String(typeof v==='string'&&/^[=+@\t\r-]/.test(v)?"'"+v:v??'').replace(/"/g,'""')+'"';const url=URL.createObjectURL(new Blob(['\uFEFF'+records.map(r=>r.map(quote).join(',')).join('\r\n')+'\r\n'],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`medshield-regional-php-${region.value}-${stage.value}-lead-${lead.value}-${model.value}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  const invalidate=()=>{sequence++;requestController?.abort();requestController=null;loading=false;loaded=false;reload.disabled=false;clear();el('status').textContent='Source changed. Reload regional PHP research before review or export.'}
  const maybeLoad=()=>{if(!loaded&&host.closest('.page')?.classList.contains('active'))void load()}
  const observer=new MutationObserver(maybeLoad);observer.observe(host.closest('.page')??host,{attributes:true,attributeFilter:['class']})
  region.addEventListener('change',render);stage.addEventListener('change',render);lead.addEventListener('change',()=>{if(data)model.value=data.selections.find(s=>s.lead_months===Number(lead.value))!.model_id;render()});model.addEventListener('change',render);reload.addEventListener('click',()=>void load());download.addEventListener('click',exportCsv);root.addEventListener('medshield:source-reloaded',invalidate);maybeLoad()
  return()=>{disposed=true;sequence++;requestController?.abort();requestController=null;observer.disconnect();root.removeEventListener('medshield:source-reloaded',invalidate);clear();panel.remove()}
}
