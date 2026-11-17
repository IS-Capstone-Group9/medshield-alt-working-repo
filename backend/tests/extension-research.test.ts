import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {extensionDigest, validateExtensionResearch, readExtensionResearch} from '../src/extensionResearch'

const raw=readFileSync('../outputs/analytics_completion_20261024/evaluated/164d72c531ff068749b43ae976f47584013d8aa465359d6f8b28ed9dbad37fbd/extension-run.json','utf8')
const run=JSON.parse(raw), manifest=run.base_run.manifest
const release={dataset_id:manifest.dataset_id,source_table:manifest.source_table,fact_delta_version:manifest.fact_delta_version,policy_version:manifest.transformation_policy,product_master_sha256:manifest.catalog_mapping_version,area_mapping_sha256:manifest.geography_mapping_version,publication_status:manifest.source_publication_status}
test('current-source research retains frozen selection and all identical-case errors; future has no actual/error',()=>{
  const data=validateExtensionResearch(raw,extensionDigest(raw),release)
  assert.equal(data.comparisons.length,15);assert.equal(data.points.length,327)
  assert.equal(data.selection.model_id,'last_value');assert.equal(data.publication_approved,false);assert.equal(data.activation_allowed,false)
  const selected=data.comparisons.find(r=>r.model_id==='last_value')!
  assert.ok(Math.abs(selected.retrospective_extension_2026.wape-56.95645198143696)<1e-9)
  assert.equal(selected.retrospective_audit.n,12);assert.equal(selected.retrospective_extension_2026.n,9)
  assert.equal(data.points.filter(p=>p.stage==='future').length,12)
  assert.ok(data.points.filter(p=>p.stage==='future').every(p=>p.actual===null && p.prediction===26054378.81))
})
test('changed source/hash, selected policy, duplicate/changed cases, fabricated scores and future actuals fail closed',()=>{
  assert.throws(()=>validateExtensionResearch(raw,'0'.repeat(64),release))
  assert.throws(()=>validateExtensionResearch(raw,extensionDigest(raw),{...release,fact_delta_version:1}))
  const edits=[(r:any)=>r.publication_approved=true,(r:any)=>r.selection.model_id='mean_6',(r:any)=>r.predictions[0].actual=1,(r:any)=>r.predictions[0].target_period='2026-02',(r:any)=>r.evaluations[0].metrics.wape=1,(r:any)=>r.base_run.predictions.find((p:any)=>p.stage==='future').actual=0,(r:any)=>r.predictions.pop()]
  for(const edit of edits){const r=JSON.parse(raw);edit(r);const changed=JSON.stringify(r);assert.throws(()=>validateExtensionResearch(changed,extensionDigest(changed),release))}
})
test('Gold reader accepts only one pinned payload and propagates warehouse failures without local fallback',async()=>{
  const hash=extensionDigest(raw),row={run_id:`extension_${hash}`,artifact_hash:hash,payload_json:raw}
  const execute=async(sql:string)=>{assert.match(sql,/WHERE run_id = 'extension_[a-f0-9]{64}'/);return {rows:[row]} as any}
  await assert.rejects(readExtensionResearch(execute,async()=>release,hash),/superseded contract allocations/)
  await assert.rejects(readExtensionResearch(async()=>({rows:[]} as any),async()=>release,hash))
  await assert.rejects(readExtensionResearch(async()=>({rows:[row,row]} as any),async()=>release,hash))
  await assert.rejects(readExtensionResearch(async()=>{throw Error('warehouse unavailable')},async()=>release,hash))
  await assert.rejects(readExtensionResearch(execute,async()=>release,'bad'))
})
