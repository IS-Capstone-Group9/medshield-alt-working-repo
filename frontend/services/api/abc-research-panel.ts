import {getJson} from './api-client'
import {ABC_CLASSES,ABC_STAGES,ABC_MODELS,ABC_COHORTS,abcReviewView,abcCaseCsvRecords,abcMetricCsvRecords,abcCsv,validAbcResearch,type AbcResearch} from './abc-research-model'

/** Classification scores describe evaluated labels, not calibrated future confidence. */
export function abcUnderstanding(d:Pick<AbcResearch,'selection'|'groups'>,stage:string,model:string,cohort:string,view:ReturnType<typeof abcReviewView>){
  const group=view.group
  const name=(id:string)=>id==='prior_abc'?'Carry forward prior ABC':id==='majority'?'Most common class':id.replaceAll('_',' ')
  const score=(value:number|null|undefined)=>typeof value==='number'&&Number.isFinite(value)?value.toFixed(3):'Unavailable'
  const rate=(value:number|null|undefined)=>typeof value==='number'&&Number.isFinite(value)?(value*100).toFixed(2)+'%':'Unavailable'
  const baseline=d.groups.find(g=>g.stage===stage&&g.model_id===d.selection.best_baseline&&g.cohort===cohort)
  const windows=[...new Set(view.cases.map(row=>row.target_window_end))].sort()
  return {
    summary:`Predicts next-year sales-contribution classes A/B/C for recorded source labels, not medicine quantities or clinical priority. ${name(model)}: macro-F1 ${score(group?.macro_f1)}; A recall ${rate(group?.per_class.A.recall)} across ${group?.samples??0} evaluated labels. ${view.status==='model_not_evaluated'?'This model has no result for the selected period.':'Historical research only; future reliability is not established.'}`,
    detail:`Selected period: ${stage.replaceAll('_',' ')}; cohort: ${cohort.replaceAll('_',' ')}; target window ends ${windows.at(-1)??'Unavailable'}. Partial 2026 covers January–September and is not annualized. Development reference: ${name(d.selection.model_id)}; later results do not change it. The same-period/cohort ${name(d.selection.best_baseline)} baseline has macro-F1 ${score(baseline?.macro_f1)}. Macro-F1 balances class precision and recall; A recall is the share of actual A labels found. Missing classes or unevaluated models remain unavailable, not zero. Scores do not provide calibrated confidence for an individual label. Model owner reviews A-class misses and class support; source owner verifies product identity before operational use.`,
  }
}

export function installAbcResearch(root:HTMLElement):()=>void{
  const host=root.querySelector<HTMLElement>('#page-products');if(!host)return()=>{}
  const panel=document.createElement('section');panel.className='chart-card abc-research';panel.setAttribute('aria-label','ABC classifier research review');panel.setAttribute('data-abc-research','')
  panel.innerHTML=`<style>.abc-research{min-width:0;overflow-wrap:anywhere}.abc-research p{line-height:1.55}.abc-controls{display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin:14px 0}.abc-controls label{font-size:12px}.abc-controls select{display:block;max-width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-card,#fff);color:var(--text-primary)}.abc-scroll{overflow:auto;max-height:420px;max-width:100%}.abc-research th,.abc-research td{padding:10px;font-size:12px;text-align:left;vertical-align:top;white-space:normal;overflow-wrap:anywhere}.abc-research button:disabled,.abc-research select:disabled{opacity:.5;cursor:not-allowed}.abc-research button:hover:not(:disabled){filter:brightness(.96)}.abc-research button:focus-visible,.abc-research select:focus-visible{outline:2px solid var(--accent);outline-offset:3px}@media(max-width:600px){.abc-controls label,.abc-controls button,.abc-controls select{width:100%}}</style>
  <h2 class="chart-title">ABC classifier · Retrospective research</h2>
  <p>Next-year financial ABC for recorded source labels · All buyers · Contracts excluded. Independent of Analysis filters. This experiment differs from the observed ABC concentration chart. Exact label groups are not verified SKU families or clinical priorities.</p>
  <div class="abc-controls"><label>Research period<select data-abc-stage disabled></select></label><label>Research model<select data-abc-model disabled></select></label><label>Prior-history cohort<select data-abc-cohort disabled></select></label><button type="button" class="btn btn-secondary" data-abc-reload>Reload ABC research</button><button type="button" class="btn btn-secondary" data-abc-metric-export disabled>Export ABC metrics</button><button type="button" class="btn btn-secondary" data-abc-case-export disabled>Export evaluated labels</button></div>
  <p role="status" data-abc-status>Open Product Prioritization to load ABC research.</p>
  <div data-abc-understandingbox hidden role="note" aria-label="How to use the ABC evidence"><p data-abc-understanding></p><details><summary>What does this result mean for priorities?</summary><p data-abc-understandingdetail></p></details></div>
  <p data-abc-selection></p><p data-abc-metrics></p>
  <h3>Confusion counts · Rows are actual, columns are predicted</h3><div class="abc-scroll" role="region" tabindex="0" aria-label="ABC confusion counts"><table class="cluster-table" data-abc-matrix></table></div>
  <h3>Class performance and support</h3><div class="abc-scroll" role="region" tabindex="0" aria-label="ABC per-class performance"><table class="cluster-table" data-abc-classes></table></div>
  <details><summary>Evaluated source labels</summary><div class="abc-scroll" role="region" tabindex="0" aria-label="ABC evaluated source labels"><table class="cluster-table" data-abc-cases></table></div></details>
  <p>Selected-baseline held-out probability calibration is unavailable. XGBoost probabilities exist only for development validation and remain raw and uncalibrated. No held-out challenger result is inferred.</p><p data-abc-source></p><p data-abc-limits></p>`
  host.append(panel)
  const el=<T extends HTMLElement>(n:string)=>panel.querySelector<T>('[data-abc-'+n+']')!
  const stage=el<HTMLSelectElement>('stage'),model=el<HTMLSelectElement>('model'),cohort=el<HTMLSelectElement>('cohort'),reload=el<HTMLButtonElement>('reload'),metricsExport=el<HTMLButtonElement>('metric-export'),caseExport=el<HTMLButtonElement>('case-export')
  let data:AbcResearch|null=null,loading=false,loaded=false,disposed=false,sequence=0
  const clear=()=>{data=null;el('understandingbox').hidden=true;metricsExport.disabled=true;caseExport.disabled=true;for(const s of [stage,model,cohort]){s.disabled=true;s.replaceChildren()}for(const n of ['understanding','understandingdetail','selection','metrics','matrix','classes','cases','source','limits'])el(n).replaceChildren()}
  const table=(target:HTMLTableElement,head:string[],rows:string[][])=>{target.replaceChildren();const h=target.createTHead().insertRow();for(const label of head){const th=document.createElement('th');th.scope='col';th.textContent=label;h.append(th)}const body=target.createTBody();for(const row of rows){const tr=body.insertRow();for(const value of row)tr.insertCell().textContent=value}}
  const rate=(v:number|null|undefined)=>v==null?'Unavailable':(v*100).toFixed(2)+'%'
  const render=()=>{
    if(!data)return
    const d=data,v=abcReviewView(d,stage.value,model.value,cohort.value),g=v.group
    const understanding=abcUnderstanding(d,stage.value,model.value,cohort.value,v)
    el('understanding').textContent=understanding.summary;el('understandingdetail').textContent=understanding.detail;el('understandingbox').hidden=false
    el('status').textContent=v.status==='model_not_evaluated'?'This model was not evaluated for this period. No held-out challenger result is available.':v.status==='empty_evaluated_cohort'?'No evaluated labels in this prior-history cohort. Metrics remain unavailable; support is zero.':`${g!.samples} evaluated labels · ${rate(g!.coverage_of_stage)} of this stage/model population. Research only; model publication is pending.`
    el('selection').textContent=`Development-selected baseline: ${d.selection.model_id}. Frozen 2024 validation rule requires macro-F1 gain ≥ 0.02 and no lower A recall. Later periods do not change selection. Missing prior observations are not zero sales; cohort membership is retrospective, not verified catalog cold-start.`
    el('metrics').textContent=`Macro-F1 ${rate(g?.macro_f1)} · Balanced accuracy ${rate(g?.balanced_accuracy)} · Accuracy ${rate(g?.accuracy)}. Partial 2026 covers January–September; it is not annualized. Two unclassified 2025 test labels were excluded from three-class evaluation. Labels with unreviewed-export provenance in this view: target ${g?v.cases.filter(c=>c.target_provenance.includes('UNREVIEWED_SOURCE_EXPORT')).length:'unavailable'}; prior features ${g?v.cases.filter(c=>c.feature_provenance.includes('UNREVIEWED_SOURCE_EXPORT')).length:'unavailable'}. These are label cases, not transaction counts.`
    table(el<HTMLTableElement>('matrix'),['Actual \\ predicted','A','B','C'],ABC_CLASSES.map((c,i)=>[c,...ABC_CLASSES.map((_,j)=>g?String(g.confusion_matrix[i][j]):'Unavailable')]))
    table(el<HTMLTableElement>('classes'),['Class','Actual support','Predicted count','Precision','Recall','F1'],ABC_CLASSES.map(c=>[c,g?String(g.per_class[c].support):'Unavailable',g?String(g.per_class[c].predicted):'Unavailable',rate(g?.per_class[c].precision),rate(g?.per_class[c].recall),rate(g?.per_class[c].f1)]))
    table(el<HTMLTableElement>('cases'),['Recorded source label','Prior-history cohort','Feature cutoff','Target window end','Actual ABC','Predicted ABC','Target source status','Feature source status'],v.cases.map(c=>[c.recorded_label,c.cohort,c.feature_cutoff,c.target_window_end,c.actual,c.predicted,c.target_provenance.join(';'),c.feature_provenance.join(';')||'No prior observation']))
    el('source').textContent=`Gold ${d.source.storage_id} · Dataset ${d.source.dataset_id} · Fact Delta ${d.source.fact_version} · Protocol SHA-256 ${d.source.protocol_sha256} · Artifact SHA-256 ${d.source.artifact_sha256}`
    el('limits').textContent=d.limitations.join(' ');metricsExport.disabled=false;caseExport.disabled=!v.cases.length
  }
  let loadController: AbortController | null = null
  const load=async()=>{
    if(disposed||loading)return;loading=true;loadController?.abort();loadController=new AbortController();loaded=true;reload.disabled=true;const request=++sequence;clear();el('status').textContent='Loading source-matched ABC research…'
    try{const value=await getJson<unknown>('/api/sales/abc-research',{signal:loadController.signal});if(disposed||request!==sequence)return;if(!validAbcResearch(value))throw Error('Invalid ABC research');data=value
      for(const v of ABC_STAGES)stage.add(new Option(v.replaceAll('_',' '),v));for(const v of ABC_MODELS)model.add(new Option(v,v));for(const v of ABC_COHORTS)cohort.add(new Option(v.replaceAll('_',' '),v))
      stage.value='retrospective_test_2025';model.value=value.selection.model_id;cohort.value='all';for(const s of [stage,model,cohort])s.disabled=false;render()
    }catch{if(!disposed&&request===sequence){clear();el('status').textContent='ABC research unavailable. Reload to retry; no substitute or previous values are shown.'}}
    finally{if(!disposed&&request===sequence){loading=false;reload.disabled=false}}
  }
  const download=(kind:'metrics'|'cases')=>{if(!data||loading||(kind==='metrics'?metricsExport:caseExport).disabled)return;const records=(kind==='metrics'?abcMetricCsvRecords:abcCaseCsvRecords)(data,stage.value,model.value,cohort.value);const url=URL.createObjectURL(new Blob([abcCsv(records)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`medshield-abc-${kind}-${stage.value}-${model.value}-${cohort.value}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  const invalidate=()=>{loadController?.abort();sequence++;loading=false;loaded=false;reload.disabled=false;clear();el('status').textContent='Source changed. Reload ABC research before review or export.'}
  const maybeLoad=()=>{if(!loaded&&host.classList.contains('active'))void load()}
  const observer=new MutationObserver(maybeLoad);observer.observe(host,{attributes:true,attributeFilter:['class']})
  for(const s of [stage,model,cohort])s.addEventListener('change',render)
  reload.addEventListener('click',()=>void load());metricsExport.addEventListener('click',()=>download('metrics'));caseExport.addEventListener('click',()=>download('cases'));root.addEventListener('medshield:source-reloaded',invalidate);maybeLoad()
  return()=>{disposed=true;loadController?.abort();sequence++;observer.disconnect();root.removeEventListener('medshield:source-reloaded',invalidate);clear();panel.remove()}
}
