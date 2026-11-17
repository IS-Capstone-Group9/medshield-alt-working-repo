export const ABC_CLASSES=['A','B','C'] as const
export const ABC_MODELS=['majority','prior_abc','xgb_depth_2','xgb_depth_3'] as const
export const ABC_STAGES=['development_validation','retrospective_test_2025','partial_2026_extension'] as const
export const ABC_COHORTS=['all','no_prior_observation','prior_ineligible_only','low_history_1_to_6_observed_months','more_than_6_observed_months'] as const
export type AbcCase={stage:string;model_id:string;product_key:string;target_year:number;cohort:string;actual:string;predicted:string;
  raw_uncalibrated_probabilities:number[]|null;prior_history_available:boolean;recorded_label:string;feature_cutoff:string;target_window_end:string;target_provenance:string[];feature_provenance:string[]}
type Detail={support:number;predicted:number;precision:number|null;recall:number|null;f1:number|null}
export type AbcGroup={stage:string;model_id:string;cohort:string;coverage_of_stage:number;samples:number;class_order:string[];
  confusion_matrix:number[][];per_class:Record<string,Detail>;macro_f1:number|null;balanced_accuracy:number|null;accuracy:number|null}
export type AbcResearch={schema_version:string;status:string;evidence_label:string;publication_approved:boolean;model_publication_approved:boolean;
  activation_allowed:boolean;product_identity_approved:boolean;unit_approval:boolean;
  source:{dataset_id:string;fact_table:string;fact_version:number;policy_version:string;receipt_sha256:string;source_keys_sha256:string;
    artifact_sha256:string;protocol_sha256:string;predictions_sha256:string;source_capture_sha256:string;storage_id:string;
    input_controls:Record<string,{rows:number;values_sha256:string;sql_sha256:string}>};
  scope:{contracts_excluded:boolean;buyers:string;unit:string;label_policy:string;filter_policy:string;company_coverage:string};
  models:string[];stages:string[];cohorts:string[];selection:{model_id:string;best_baseline:string;stage:string;test_used:boolean;reason:string};
  groups:AbcGroup[];cases:AbcCase[];exclusions:Array<{stage:string;unclassified:number}>;calibration_status:string;limitations:string[]}
export function clientAbcMetrics(rows:Array<Pick<AbcCase,'actual'|'predicted'>>){
  const counts=ABC_CLASSES.map(a=>ABC_CLASSES.map(p=>rows.filter(r=>r.actual===a&&r.predicted===p).length))
  const detail=Object.fromEntries(ABC_CLASSES.map((c,i)=>{
    const support=counts[i].reduce((a,b)=>a+b,0),predicted=counts.reduce((s,r)=>s+r[i],0),tp=counts[i][i]
    return [c,{support,predicted,precision:predicted?tp/predicted:null,recall:support?tp/support:null,f1:support+predicted?2*tp/(support+predicted):null}]
  }))
  const fs=Object.values(detail).flatMap(v=>v.f1===null?[]:[v.f1]),rs=Object.values(detail).flatMap(v=>v.recall===null?[]:[v.recall])
  return {samples:rows.length,confusion_matrix:counts,per_class:detail,
    macro_f1:fs.length?fs.reduce((a,b)=>a+b,0)/fs.length:null,balanced_accuracy:rs.length?rs.reduce((a,b)=>a+b,0)/rs.length:null,
    accuracy:rows.length?counts.reduce((s,r,i)=>s+r[i],0)/rows.length:null}
}
const same=(a:number|null,b:number|null)=>a===null?b===null:typeof b==='number'&&Number.isFinite(b)&&Math.abs(a-b)<=1e-12
const hash=(s:unknown)=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s)
export function validAbcResearch(input:unknown):input is AbcResearch{
  try{
    const d=input as AbcResearch,s=d?.source
    if(d?.schema_version!=='abc_research_review_v1'||d.status!=='evaluated_unpublished'||d.evidence_label!=='Derived'
      ||[d.publication_approved,d.model_publication_approved,d.activation_allowed,d.product_identity_approved,d.unit_approval].some(v=>v!==false)
      ||s?.dataset_id!=='e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10'
      ||s.fact_table!=='workspace.medshield_original_gold_20261026.original_fd95b9e3abab028c8e41_itemized_candidates'||s.fact_version!==0
      ||s.policy_version!=='original_source_layers_v1_candidate_only'||s.receipt_sha256!=='d69414d3bb72c706bba30f24489074e4677f403277e18c64bb8d2e643b0012dd'
      ||s.source_keys_sha256!=='da74cc50c67e22fd33928f5ca3faaebc3e21a6e1b76f7f169829bf6515d8c580'
      ||s.artifact_sha256!=='5620b4d9af3b79258d0f687b00d102e7e3ea3625c78d70906c0ec460ba453dac'
      ||s.protocol_sha256!=='8a31987c3be5578c4570f65b80697a329332254e4e46ec71d5e3c4c91d1b972a'
      ||s.predictions_sha256!=='492ebc33956d1ed8abaf4db2f3b1e50f1df97b8ca7eaf990caf16cf900d5c222'
      ||s.source_capture_sha256!=='9c48b9da2353d184420f1c5dea0713b7360d09130520e44d87384ef88f531673'
      ||s.storage_id!=='abc_'+s.artifact_sha256)return false
    for(const [name,n,digest] of [['product_years',8872,'4e5e6617592b49f8d4c421d204867fe21294c996431ea647101bbed341d3ffc4'],['comparison_months',4182,'ce6a6fe652ae3e43d99ae032c4323564a499a5fc0df938e8291d8c6729fd09a7']] as const){
      const c=s.input_controls[name];if(c?.rows!==n||c.values_sha256!==digest||!hash(c.sql_sha256))return false
    }
    if(d.scope?.contracts_excluded!==true||d.scope.buyers!=='all'||d.scope.unit!=='source_label_financial_ABC'||d.scope.label_policy!=='original_abc_label_v1'
      ||d.scope.company_coverage!=='unknown'||d.scope.filter_policy!=='fixed_research_scope_independent_of_analysis_filters'
      ||JSON.stringify(d.models)!==JSON.stringify(ABC_MODELS)||JSON.stringify(d.stages)!==JSON.stringify(ABC_STAGES)||JSON.stringify(d.cohorts)!==JSON.stringify(ABC_COHORTS)
      ||!Array.isArray(d.cases)||d.cases.length!==1032||!Array.isArray(d.groups)||d.groups.length!==40
      ||d.calibration_status!=='unavailable_selected_baseline_has_no_heldout_probabilities'||!Array.isArray(d.limitations)||!d.limitations.every(v=>typeof v==='string'))return false
    const seen=new Set<string>(),labels=new Map<string,string>(),actuals=new Map<string,string>()
    for(const c of d.cases){
      if(!ABC_STAGES.includes(c.stage as typeof ABC_STAGES[number])||!ABC_MODELS.includes(c.model_id as typeof ABC_MODELS[number])
        ||!ABC_CLASSES.includes(c.actual as 'A'|'B'|'C')||!ABC_CLASSES.includes(c.predicted as 'A'|'B'|'C')
        ||!ABC_COHORTS.slice(1).includes(c.cohort as typeof ABC_COHORTS[1])||!hash(c.product_key)||typeof c.recorded_label!=='string'||!c.recorded_label.trim()
        ||c.recorded_label.length>1000||/[\u0000-\u001f]/.test(c.recorded_label)||typeof c.prior_history_available!=='boolean')return false
      const year=c.stage==='development_validation'?2024:c.stage==='retrospective_test_2025'?2025:2026
      for(const values of [c.target_provenance,c.feature_provenance])if(!Array.isArray(values)||new Set(values).size!==values.length||!values.every(v=>['ORIGINAL_SOURCE_EXPORT','UNREVIEWED_SOURCE_EXPORT'].includes(v)))return false
      if(!c.target_provenance.length||(c.feature_provenance.length>0)!==c.prior_history_available)return false
      if(c.target_year!==year||c.feature_cutoff!==`${year-1}-12-31`||c.target_window_end!==(year===2026?'2026-09-30':`${year}-12-31`)
        ||c.stage!=='development_validation'&&!['majority','prior_abc'].includes(c.model_id))return false
      const key=[c.stage,c.model_id,c.product_key,c.target_year].join('|');if(seen.has(key))return false;seen.add(key)
      if(labels.has(c.product_key)&&labels.get(c.product_key)!==c.recorded_label)return false;labels.set(c.product_key,c.recorded_label)
      const a=c.product_key+'|'+year;if(actuals.has(a)&&actuals.get(a)!==c.actual)return false;actuals.set(a,c.actual)
      if(c.model_id.startsWith('xgb_')){if(!Array.isArray(c.raw_uncalibrated_probabilities)||c.raw_uncalibrated_probabilities.length!==3||!c.raw_uncalibrated_probabilities.every(v=>Number.isFinite(v)&&v>=0&&v<=1)||Math.abs(c.raw_uncalibrated_probabilities.reduce((a,b)=>a+b,0)-1)>=1e-5)return false}
      else if(c.raw_uncalibrated_probabilities!==null)return false
    }
    const groupKeys=new Set<string>()
    for(const g of d.groups){
      if(!ABC_STAGES.includes(g.stage as typeof ABC_STAGES[number])||!ABC_MODELS.includes(g.model_id as typeof ABC_MODELS[number])||!ABC_COHORTS.includes(g.cohort as typeof ABC_COHORTS[number]))return false
      const key=[g.stage,g.model_id,g.cohort].join('|');if(groupKeys.has(key))return false;groupKeys.add(key)
      const all=d.cases.filter(c=>c.stage===g.stage&&c.model_id===g.model_id)
      if(all.length!==(g.stage==='development_validation'?83:g.stage==='retrospective_test_2025'?140:210))return false
      const rows=g.cohort==='all'?all:all.filter(c=>c.cohort===g.cohort),m=clientAbcMetrics(rows)
      if(g.samples!==rows.length||!same(g.coverage_of_stage,rows.length/all.length)||JSON.stringify(g.class_order)!=='["A","B","C"]'
        ||JSON.stringify(g.confusion_matrix)!==JSON.stringify(m.confusion_matrix)||!(['macro_f1','balanced_accuracy','accuracy'] as const).every(k=>same(g[k],m[k])))return false
      for(const label of ABC_CLASSES){const a=g.per_class[label],b=m.per_class[label];if(a?.support!==b.support||a.predicted!==b.predicted||!(['precision','recall','f1'] as const).every(k=>same(a[k],b[k])))return false}
    }
    for(const stage of ABC_STAGES)for(const model of ABC_MODELS){
      const evaluated=stage==='development_validation'||['majority','prior_abc'].includes(model)
      for(const cohort of ABC_COHORTS)if(groupKeys.has([stage,model,cohort].join('|'))!==evaluated)return false
    }
    const validation=d.groups.filter(g=>g.stage==='development_validation'&&g.cohort==='all')
    const best=validation.filter(g=>['majority','prior_abc'].includes(g.model_id)).sort((a,b)=>b.macro_f1!-a.macro_f1!||(a.model_id<b.model_id?-1:1))[0]
    const eligible=validation.filter(g=>g.model_id.startsWith('xgb_')&&g.macro_f1!+1e-12>=best.macro_f1!+.02&&g.per_class.A.recall!+1e-12>=best.per_class.A.recall!)
      .sort((a,b)=>b.macro_f1!-a.macro_f1!||(a.model_id<b.model_id?-1:1))
    if(d.selection?.model_id!==(eligible[0]?.model_id??best.model_id)||d.selection.best_baseline!==best.model_id||d.selection.stage!=='development_validation'||d.selection.test_used!==false)return false
    return true
  }catch{return false}
}
export function abcReviewView(d:AbcResearch,stage:string,model:string,cohort:string){
  if(!validAbcResearch(d)||!d.stages.includes(stage)||!d.models.includes(model)||!d.cohorts.includes(cohort))throw Error('Invalid ABC review')
  const group=d.groups.find(g=>g.stage===stage&&g.model_id===model&&g.cohort===cohort)??null
  return {group,status:group===null?'model_not_evaluated':group.samples===0?'empty_evaluated_cohort':'evaluated',
    cases:d.cases.filter(c=>c.stage===stage&&c.model_id===model&&(cohort==='all'||c.cohort===cohort))}
}
const identity=(d:AbcResearch)=>[d.source.dataset_id,d.source.fact_table,d.source.fact_version,d.source.policy_version,d.scope.label_policy,d.source.artifact_sha256,d.source.protocol_sha256,d.source.predictions_sha256,d.source.source_capture_sha256,d.source.storage_id,'Derived',false,false,false,false,false]
const identityHeader=['dataset_id','fact_table','fact_version','source_policy','label_policy','artifact_sha256','protocol_sha256','predictions_sha256','source_capture_sha256','storage_id','evidence','publication_approved','model_publication_approved','activation_allowed','product_identity_approved','unit_approval']
export function abcMetricCsvRecords(d:AbcResearch,stage:string,model:string,cohort:string){
  const {group:g,status,cases}=abcReviewView(d,stage,model,cohort)
  const target=g?cases.filter(c=>c.target_provenance.includes('UNREVIEWED_SOURCE_EXPORT')).length:null
  const features=g?cases.filter(c=>c.feature_provenance.includes('UNREVIEWED_SOURCE_EXPORT')).length:null
  return [['stage','model','cohort','evaluation_status','class','support','predicted_count','precision','recall','f1','samples','coverage_of_stage','macro_f1','balanced_accuracy','accuracy','development_reference','calibration_status',...identityHeader,'labels_with_unreviewed_target','labels_with_unreviewed_features'],
    ...ABC_CLASSES.map(label=>[stage,model,cohort,status,label,g?.per_class[label].support??null,g?.per_class[label].predicted??null,g?.per_class[label].precision??null,g?.per_class[label].recall??null,g?.per_class[label].f1??null,g?.samples??null,g?.coverage_of_stage??null,g?.macro_f1??null,g?.balanced_accuracy??null,g?.accuracy??null,d.selection.model_id,d.calibration_status,...identity(d),target,features])]
}
export function abcCaseCsvRecords(d:AbcResearch,stage:string,model:string,cohort:string){
  const v=abcReviewView(d,stage,model,cohort);if(!v.cases.length)throw Error('No evaluated ABC cases')
  return [['stage','model','cohort_filter','source_cohort','product_key','recorded_source_label','target_year','feature_cutoff','target_window_end','actual_abc','predicted_abc','prior_history_available','raw_uncalibrated_prob_A','raw_uncalibrated_prob_B','raw_uncalibrated_prob_C',...identityHeader,'target_source_statuses','feature_source_statuses'],
    ...v.cases.map(c=>[stage,model,cohort,c.cohort,c.product_key,c.recorded_label,c.target_year,c.feature_cutoff,c.target_window_end,c.actual,c.predicted,c.prior_history_available,...(c.raw_uncalibrated_probabilities??[null,null,null]),...identity(d),c.target_provenance.join(';'),c.feature_provenance.join(';')])]
}
export function abcCsv(records:unknown[][]){
  const quote=(v:unknown)=>'"'+(typeof v==='string'&&/^[=+@\-\t\r]/.test(v)?"'":'')+String(v??'').replace(/"/g,'""')+'"'
  return '\uFEFF'+records.map(r=>r.map(quote).join(',')).join('\r\n')+'\r\n'
}
