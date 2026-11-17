import assert from 'node:assert/strict'
import {executeDatabricksStatement} from './databricks'
import {descriptiveBinding,readDescriptiveRelease,type DescriptiveRelease} from './descriptiveSource'
import {ITEMIZED_PREVIEW_BINDING as binding} from './itemizedPreviewBinding'
import {originalResearchDigest as hash} from './originalResearch'

export const ABC_RESEARCH_BINDING={table:'workspace.medshield_gold.fact_forecast_run_candidate',
  artifactSha256:'5620b4d9af3b79258d0f687b00d102e7e3ea3625c78d70906c0ec460ba453dac',
  storageId:'abc_5620b4d9af3b79258d0f687b00d102e7e3ea3625c78d70906c0ec460ba453dac',
  protocolSha256:'8a31987c3be5578c4570f65b80697a329332254e4e46ec71d5e3c4c91d1b972a',
  predictionsSha256:'492ebc33956d1ed8abaf4db2f3b1e50f1df97b8ca7eaf990caf16cf900d5c222'} as const
export const ABC_CLASSES=['A','B','C'] as const
export const ABC_MODELS=['majority','prior_abc','xgb_depth_2','xgb_depth_3'] as const
export const ABC_STAGES=['development_validation','retrospective_test_2025','partial_2026_extension'] as const
export const ABC_COHORTS=['all','no_prior_observation','prior_ineligible_only','low_history_1_to_6_observed_months','more_than_6_observed_months'] as const
type Json=Record<string,any>
type Row=Record<string,string|null>
export type AbcCase={stage:string;model_id:string;product_key:string;target_year:number;cohort:string;
  actual:string;predicted:string;raw_uncalibrated_probabilities:number[]|null;prior_history_available:boolean}

export function abcMetrics(rows:Array<Pick<AbcCase,'actual'|'predicted'>>){
  const matrix=ABC_CLASSES.map(a=>ABC_CLASSES.map(p=>rows.filter(r=>r.actual===a&&r.predicted===p).length))
  const per_class=Object.fromEntries(ABC_CLASSES.map((label,i)=>{
    const tp=matrix[i][i],support=matrix[i].reduce((a,b)=>a+b,0),predicted=matrix.reduce((sum,r)=>sum+r[i],0)
    return [label,{support,predicted,precision:predicted?tp/predicted:null,recall:support?tp/support:null,f1:support+predicted?2*tp/(support+predicted):null}]
  }))
  const values=Object.values(per_class),f1=values.flatMap(v=>v.f1===null?[]:[v.f1]),recall=values.flatMap(v=>v.recall===null?[]:[v.recall])
  return {samples:rows.length,class_order:[...ABC_CLASSES],confusion_matrix:matrix,per_class,
    macro_f1:f1.length?f1.reduce((a,b)=>a+b,0)/f1.length:null,
    macro_f1_defined_classes:ABC_CLASSES.filter(c=>per_class[c].f1!==null),
    balanced_accuracy:recall.length?recall.reduce((a,b)=>a+b,0)/recall.length:null,
    accuracy:rows.length?matrix.reduce((s,r,i)=>s+r[i],0)/rows.length:null}
}
function packageOf(raw:string):Json{
  assert.ok(Buffer.byteLength(raw)<=1_000_000);assert.equal(hash(raw),ABC_RESEARCH_BINDING.artifactSha256)
  const p=JSON.parse(raw)
  assert.equal(p.schema_version,'abc_research_package_v1');assert.equal(p.label_policy,'original_abc_label_v1')
  assert.equal(p.input_artifact_sha256['protocol.json'],ABC_RESEARCH_BINDING.protocolSha256)
  assert.equal(p.input_artifact_sha256['predictions.json'],ABC_RESEARCH_BINDING.predictionsSha256)
  for(const flag of ['publication_approved','model_publication_approved','activation_allowed','unit_approval','product_identity_approved'])assert.equal(p[flag],false)
  return p
}
export function abcSourceStatements(raw:string){
  const p=packageOf(raw)
  return Object.fromEntries(Object.entries<Json>(p.source_checks).map(([name,q])=>{
    assert.ok(['product_years','comparison_months'].includes(name));assert.equal(hash(q.sql),q.sql_sha256)
    assert.ok(q.sql.includes('VERSION AS OF 0')&&q.sql.startsWith('SELECT '))
    return [name,q.sql as string]
  }))
}
const near=(a:number|null,b:unknown)=>assert.ok(a===null?b===null:typeof b==='number'&&Number.isFinite(b)&&Math.abs(a-b)<=1e-12,'Stored ABC score differs')
export function validateAbcResearch(raw:string,release:DescriptiveRelease,inputs:Record<string,Row[]>){
  const p=packageOf(raw),pin=ABC_RESEARCH_BINDING
  assert.equal(release.source_table,binding.itemizedTable);assert.equal(release.dataset_id,binding.datasetId)
  assert.equal(release.fact_delta_version,0);assert.equal(release.policy_version,binding.policy)
  assert.equal(release.product_master_sha256,binding.expectedGoldReceipt.accepted_master_sha256)
  assert.equal(release.area_mapping_sha256,null);assert.equal(release.financial_publication,undefined)
  assert.ok(release.original_itemized)
  for(const [key,value] of Object.entries({batch_id:binding.batchId,dataset_id:binding.datasetId,source_table:binding.itemizedTable,
    delta_version:0,policy_version:binding.policy,receipt_sha256:binding.receiptSha256,source_keys_sha256:binding.keysSha256,
    contracts_excluded:true,financial_release_approved:false,unit_approval:false,forecast_approval:false})){
    assert.equal((release.original_itemized as Json)[key],value);assert.equal(p.source_identity.original_itemized[key],value)
  }
  assert.deepEqual(Object.keys(inputs).sort(),['comparison_months','product_years'])
  for(const [name,q] of Object.entries<Json>(p.source_checks)){
    const rows=inputs[name];assert.equal(rows.length,q.rows)
    assert.equal(hash(JSON.stringify(rows.map(r=>q.columns.map((field:string)=>r[field])))),q.values_sha256,'Current Gold ABC inputs differ')
  }
  const members=p.members as Json[];assert.equal(members.length,433)
  const membership=new Map(members.map(m=>[m.product_key+'|'+m.target_year,m]));assert.equal(membership.size,433)
  for(const m of members){
    assert.equal(hash(m.recorded_label),m.product_key)
    assert.equal(m.feature_year,m.target_year-1);assert.equal(m.feature_cutoff,`${m.feature_year}-12-31`)
    assert.ok(ABC_STAGES.includes(m.stage));assert.ok(ABC_COHORTS.includes(m.cohort)&&m.cohort!=='all')
    assert.equal(m.target_year,m.stage==='development_validation'?2024:m.stage==='retrospective_test_2025'?2025:2026)
    assert.equal(m.target_window_end,m.target_year===2026?'2026-09-30':`${m.target_year}-12-31`)
    assert.ok(ABC_CLASSES.includes(m.target_abc));assert.equal(m.eligible_for_three_class_evaluation,true)
  }
  const cases=p.cases as AbcCase[];assert.equal(cases.length,1032)
  const seen=new Set<string>()
  for(const c of cases){
    const m=membership.get(c.product_key+'|'+c.target_year);assert.ok(m)
    assert.equal(c.stage,m.stage);assert.equal(c.actual,m.target_abc);assert.equal(c.cohort,m.cohort)
    assert.equal(c.prior_history_available,m.features.prior_label_observed)
    assert.ok(ABC_MODELS.includes(c.model_id as typeof ABC_MODELS[number])&&ABC_CLASSES.includes(c.predicted as 'A'|'B'|'C'))
    assert.ok(c.stage==='development_validation'||['majority','prior_abc'].includes(c.model_id),'Held-out challenger was not evaluated')
    const key=[c.stage,c.model_id,c.product_key,c.target_year].join('|');assert.ok(!seen.has(key));seen.add(key)
    if(c.model_id.startsWith('xgb_'))assert.ok(c.raw_uncalibrated_probabilities?.length===3&&c.raw_uncalibrated_probabilities.every(v=>Number.isFinite(v)&&v>=0&&v<=1)&&Math.abs(c.raw_uncalibrated_probabilities.reduce((a,b)=>a+b,0)-1)<1e-5)
    else assert.equal(c.raw_uncalibrated_probabilities,null)
  }
  const groups=ABC_STAGES.flatMap(stage=>ABC_MODELS.flatMap(model=>{
    const all=cases.filter(c=>c.stage===stage&&c.model_id===model)
    if(!all.length)return []
    assert.equal(all.length,stage==='development_validation'?83:stage==='retrospective_test_2025'?140:210)
    return ABC_COHORTS.map(cohort=>{
      const rows=cohort==='all'?all:all.filter(r=>r.cohort===cohort),metrics=abcMetrics(rows)
      const saved=p.scores.filter((s:Json)=>s.stage===stage&&s.model_id===model&&s.cohort===cohort)
      assert.equal(saved.length,1);assert.deepEqual(saved[0].confusion_matrix,metrics.confusion_matrix)
      assert.equal(saved[0].samples,metrics.samples)
      for(const k of ['macro_f1','balanced_accuracy','accuracy'] as const)near(metrics[k],saved[0][k])
      for(const label of ABC_CLASSES){
        const a=metrics.per_class[label],b=saved[0].per_class[label]
        assert.equal(a.support,b.support);assert.equal(a.predicted,b.predicted)
        for(const k of ['precision','recall','f1'] as const)near(a[k],b[k])
      }
      near(rows.length/all.length,saved[0].coverage_of_stage)
      return {stage,model_id:model,cohort,coverage_of_stage:rows.length/all.length,...metrics}
    })
  }))
  assert.equal(groups.length,40);assert.equal(p.scores.length,40)
  const validation=groups.filter(g=>g.stage==='development_validation'&&g.cohort==='all')
  const best=validation.filter(g=>['majority','prior_abc'].includes(g.model_id)).sort((a,b)=>b.macro_f1!-a.macro_f1!||ABC_MODELS.indexOf(a.model_id)-ABC_MODELS.indexOf(b.model_id))[0]
  const eligible=validation.filter(g=>g.model_id.startsWith('xgb_')&&g.macro_f1!+1e-12>=best.macro_f1!+.02&&g.per_class.A.recall!+1e-12>=best.per_class.A.recall!)
    .sort((a,b)=>b.macro_f1!-a.macro_f1!||ABC_MODELS.indexOf(a.model_id)-ABC_MODELS.indexOf(b.model_id))
  assert.equal(p.selection.model_id,eligible[0]?.model_id??best.model_id)
  assert.equal(p.selection.best_baseline,best.model_id);assert.equal(p.selection.stage,'development_validation');assert.equal(p.selection.test_used,false)
  return {schema_version:'abc_research_review_v1' as const,status:'evaluated_unpublished' as const,evidence_label:'Derived' as const,
    publication_approved:false,model_publication_approved:false,activation_allowed:false,product_identity_approved:false,unit_approval:false,
    source:{dataset_id:binding.datasetId,fact_table:binding.itemizedTable,fact_version:0,policy_version:binding.policy,
      receipt_sha256:binding.receiptSha256,source_keys_sha256:binding.keysSha256,artifact_sha256:pin.artifactSha256,
      protocol_sha256:pin.protocolSha256,predictions_sha256:pin.predictionsSha256,source_capture_sha256:p.source_capture_sha256 as string,
      storage_id:pin.storageId,input_controls:Object.fromEntries(Object.entries<Json>(p.source_checks).map(([name,q])=>[name,{rows:q.rows,values_sha256:q.values_sha256,sql_sha256:q.sql_sha256}]))},
    scope:{contracts_excluded:true,buyers:'all',unit:'source_label_financial_ABC',label_policy:p.label_policy as string,
      filter_policy:'fixed_research_scope_independent_of_analysis_filters',company_coverage:'unknown'},
    models:[...ABC_MODELS],stages:[...ABC_STAGES],cohorts:[...ABC_COHORTS],selection:p.selection,
    groups,cases:cases.map(c=>({...c,recorded_label:membership.get(c.product_key+'|'+c.target_year)!.recorded_label as string,
      feature_cutoff:membership.get(c.product_key+'|'+c.target_year)!.feature_cutoff as string,
      target_provenance:membership.get(c.product_key+'|'+c.target_year)!.target_provenance as string[],
      feature_provenance:membership.get(c.product_key+'|'+c.target_year)!.feature_provenance as string[],
      target_window_end:membership.get(c.product_key+'|'+c.target_year)!.target_window_end as string})),
    exclusions:p.exclusions,calibration_status:p.calibration_status as string,limitations:p.limitations as string[]}
}

export async function readAbcResearch(execute=executeDatabricksStatement,releaseReader=()=>readDescriptiveRelease(descriptiveBinding())){
  const release=await releaseReader();assert.ok(release.original_itemized)
  const pin=ABC_RESEARCH_BINDING
  const saved=await execute(`SELECT run_id,artifact_hash,payload_json FROM ${pin.table} WHERE run_id=:candidate_id`,
    {rowLimit:2,parameters:[{name:'candidate_id',value:pin.storageId,type:'STRING'}]})
  assert.equal(saved.rows.length,1);const row=saved.rows[0]
  assert.equal(row.run_id,pin.storageId);assert.equal(row.artifact_hash,pin.artifactSha256);assert.equal(typeof row.payload_json,'string')
  const statements=abcSourceStatements(row.payload_json!)
  const inputs=Object.fromEntries(await Promise.all(Object.entries(statements).map(async([name,sql])=>[name,(await execute(sql,{rowLimit:15_000})).rows])))
  return validateAbcResearch(row.payload_json!,release,inputs)
}
