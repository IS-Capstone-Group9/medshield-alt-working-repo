import test from 'node:test'
import assert from 'node:assert/strict'
import {planningEvidenceChecksum} from '../src/planningEvidence'
import {solvePlanningScenario} from '../src/planningScenario'
import type {DescriptiveRelease} from '../src/descriptiveSource'

const release:DescriptiveRelease={source_table:'workspace.medshield_gold_source_20261022.sales_restart_fact_candidate',dataset_id:'a'.repeat(64),fact_delta_version:0,policy_version:'v8',product_master_sha256:'b'.repeat(64),area_mapping_sha256:'c'.repeat(64),publication_status:'candidate'}
const scope={sector:'All',territory:'Quezon'},rows=[{product:'A',revenue:'100.00',quantity:'10',observed_months:'12'}]
const hash=(r=release,s=scope,start='2025-10',end='2026-09',data=rows)=>planningEvidenceChecksum(r,s,start,end,data)
test('planning identity is stable for identical evidence, but binds release, scope, window, mappings and ranking population',()=>{
  assert.equal(hash(),hash({...release},{...scope},'2025-10','2026-09',structuredClone(rows)))
  const alternatives=[hash({...release,fact_delta_version:1}),hash({...release,dataset_id:'d'.repeat(64)}),hash({...release,source_table:'workspace.medshield_gold.sales_restart_fact_candidate'}),hash({...release,policy_version:'v9'}),hash({...release,product_master_sha256:'e'.repeat(64)}),hash({...release,area_mapping_sha256:'f'.repeat(64)}),hash(release,{sector:'Private',territory:'Quezon'}),hash(release,{sector:'All',territory:'Albay'}),hash(release,scope,'2025-09'),hash(release,scope,'2025-10','2026-08'),hash(release,scope,'2025-10','2026-09',[{...rows[0],quantity:'11'}])]
  for(const candidate of alternatives)assert.notEqual(candidate,hash())
  assert.equal(new Set(alternatives).size,alternatives.length)
  assert.throws(()=>planningEvidenceChecksum(undefined,scope,null,null,[]),/release identity/)
})
test('publication manifest changes invalidate the checksum even with identical underlying totals',()=>{
  const financial={status:'approved',scope:'descriptive_company_financial_history_and_source_label_commercial_reporting',publication_id:'financial_a',manifest_sha256:'1'.repeat(64),serving_table:'approved_fact',serving_version:0,reviewer:{name:'reviewer',role:'COO'},decision_date:'2026-10-25',population_sha256:'2'.repeat(64),limitations:[],excluded_approvals:[]} as const
  const r={...release,financial_publication:financial} as DescriptiveRelease
  assert.notEqual(hash(r),hash())
  assert.notEqual(hash(r),hash({...r,financial_publication:{...r.financial_publication!,manifest_sha256:'3'.repeat(64)}}))
  assert.notEqual(hash(r),hash({...r,financial_publication:{...r.financial_publication!,serving_table:'other_fact'}}))
})
test('same-source allocation retains hand-solvable results while changed release rejects old assumptions',()=>{
  const checksum=hash(),shortlist={source:{checksum},scope,products:[{product:'A'}]}
  const body={acknowledged:true,checksum,horizon:3,budget:10,minimum_pct:0,items:[{product:'A',demand:10,stock:0,reserve:0,pack:1,pack_cost:1,max_packs:10}]}
  const solved=solvePlanningScenario(body,shortlist)
  assert.equal(solved.status,'scenario_allocation');assert.equal(solved.spent,10);assert.equal(solved.rows[0].fulfilled,10)
  assert.throws(()=>solvePlanningScenario(body,{...shortlist,source:{checksum:hash({...release,fact_delta_version:1})}}),/source changed/)
})

test('original-source correction invalidates older drafts even for identical ranking values',()=>{
 const corrected={...release,analytical_integrity:{id:'truth_0123456789abcdef',manifest_sha256:'f'.repeat(64),serving_table:'corrected_fact'}} as DescriptiveRelease
 assert.notEqual(hash(corrected),hash(release))
 assert.notEqual(hash(corrected),hash({...corrected,analytical_integrity:{...corrected.analytical_integrity!,manifest_sha256:'e'.repeat(64)}}))
})
