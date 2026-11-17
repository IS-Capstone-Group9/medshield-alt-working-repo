import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readAnalyticalTruth,truthHash,truthTable,validateTruthManifest,requireUncorrectedResearchEligible, type TruthManifest} from '../src/analyticalTruth'
import type {DescriptiveRelease} from '../src/descriptiveSource'
const dataset='abb5af9adc151cc7a88b5e2241ea6d4d0a1c78bbd7875a10e66fa67c1353f94d'
const source='workspace.medshield_gold_source_20261022.financial_0123456789abcdef_fact'
const prefix='workspace.medshield_gold_source_20261022.truth_0123456789abcdef'
const release={dataset_id:dataset,fact_delta_version:0,source_table:'workspace.medshield_gold_source_20261022.sales_restart_fact_candidate',financial_publication:{serving_table:source,publication_id:'financial_0123456789abcdef'}} as DescriptiveRelease
const manifest:TruthManifest={schema_version:1,policy:'original_itemized_sales_v1',id:'truth_0123456789abcdef',source_dataset:dataset,source_fact_version:0,source_table:source,source_publication_id:'financial_0123456789abcdef',correction_sha256:'a'.repeat(64),serving_table:prefix+'_fact',excluded_table:prefix+'_excluded',contracts_table:prefix+'_contracts',source_rows:3,removed_rows:1,kept_rows:2,excluded_keys:1,source_keys_sha256:'b'.repeat(64),kept_keys_sha256:'c'.repeat(64),contract_rows:1,original_source_hashes:{'source.csv':'d'.repeat(64)},scope:'itemized_product_sales',status:'source_corrected_research_not_new_business_approval'}
test('affected dataset requires correction and unconfigured unrelated fixture remains compatible',async()=>{
 await assert.rejects(readAnalyticalTruth(release,(async()=>{throw Error('must not read')}) as any,{}),/correction is required/)
 assert.equal(await readAnalyticalTruth({...release,dataset_id:'unaffected'},undefined,{}),undefined)
})
test('source, counts, scope and output identifiers are bound',()=>{
 validateTruthManifest(manifest,release,manifest.id)
 for(const change of [{source_dataset:'bad'},{kept_rows:3},{source_table:'other'},{scope:'company'},{serving_table:prefix+'_wrong'}]) assert.throws(()=>validateTruthManifest({...manifest,...change} as TruthManifest,release,manifest.id))
 assert.throws(()=>truthTable('workspace.other.fact;DROP TABLE x'))
})
test('warehouse hash, unique keys and population count fail closed',async()=>{
 const body=JSON.stringify(manifest)+'\n',env={DATABRICKS_TRUTH_RELEASE_ID:manifest.id,DATABRICKS_TRUTH_MANIFEST_SHA256:truthHash(body)}
 const reader=(patch={})=>async(sql:string)=>({rows:sql.includes('manifest_json')?[{manifest_json:body}]:[{records:'2',unique_records:'2',keys_sha256:'c'.repeat(64),...patch}]}) as any
 assert.equal((await readAnalyticalTruth(release,reader(),env))?.scope,'itemized_product_sales')
 for(const patch of [{records:'3'},{unique_records:'1'},{keys_sha256:'e'.repeat(64)}]) await assert.rejects(readAnalyticalTruth(release,reader(patch),env))
 await assert.rejects(readAnalyticalTruth(release,reader(),{...env,DATABRICKS_TRUTH_MANIFEST_SHA256:'0'.repeat(64)}))
})
test('superseded research cannot be relabelled as corrected forecasts',()=>{
 assert.throws(()=>requireUncorrectedResearchEligible(dataset),/superseded contract allocations/)
 requireUncorrectedResearchEligible('new-corrected-dataset')
})
