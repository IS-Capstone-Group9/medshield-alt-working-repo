import test from 'node:test'
import assert from 'node:assert/strict'
import { financialHash, financialNames, readFinancialPublication, validateFinancialManifest, type FinancialManifest, FINANCIAL_SCOPE } from '../src/financialPublication'
import { descriptiveBinding, type DescriptiveRelease } from '../src/descriptiveSource'

const id = 'financial_'+'a'.repeat(16)
const source: DescriptiveRelease = {dataset_id:'b'.repeat(64),policy_version:'sales_restart_gold_v8_isolated_source_rebuild',area_mapping_sha256:'c'.repeat(64),product_master_sha256:'d'.repeat(64),publication_status:'CANDIDATE',fact_delta_version:0,source_table:'workspace.medshield_gold_source_20261022.sales_restart_fact_candidate'}
const manifest = (): FinancialManifest => ({schema_version:'1',publication_id:id,scope:FINANCIAL_SCOPE,source,
  population:{version:'dashboard_observed_fact_v1',predicate:'is_analysis_candidate = TRUE',predicate_sha256:financialHash('is_analysis_candidate = TRUE')},
  decision_sha256:'e'.repeat(64),evidence_sha256:'f'.repeat(64),reviewed_packet_sha256:'1'.repeat(64),reviewer:{name:'Authorized reviewer',role:'COO'},decision_date:'2026-10-25',limitations:['Review restrictions retained'],excluded_approvals:['canonical_medicine_identity_and_units','external_disease_weather_joins','trained_model_publication','live_disease_alerts','operational_procurement','academic_scope_amendment'],serving_table:financialNames('medshield_gold_source_20261022',id).serving,serving_version:0,expected_rows:3})
function reader(value=manifest(), rows=3) {
  const body=JSON.stringify(value)+'\n'
  const execute=async(sql:string)=>({rows:sql.includes('manifest_json')?[{manifest_json:body}]:[{records:String(rows),unique_records:String(rows)}]})
  return {execute:execute as any,digest:financialHash(body)}
}
test('approved finance contract is source/hash/count bound and does not approve model or procurement',async()=>{
  const m=reader();const result=await readFinancialPublication(source,id,m.digest,m.execute)
  assert.equal(result.status,'approved');assert.equal(result.scope,FINANCIAL_SCOPE)
  assert.equal(result.serving_version,0);assert.ok(result.excluded_approvals.includes('trained_model_publication'))
  assert.equal(source.publication_status,'CANDIDATE')
})
test('rejects tampering, wrong source, population, serving scope and cardinality',async()=>{
  const m=reader();await assert.rejects(readFinancialPublication(source,id,'0'.repeat(64),m.execute),/checksum/)
  await assert.rejects(readFinancialPublication({...source,dataset_id:'2'.repeat(64)},id,m.digest,m.execute),/identity/)
  const bad=manifest();bad.population.predicate='TRUE';assert.throws(()=>validateFinancialManifest(bad,source,id))
  const other=manifest();other.serving_table='workspace.medshield_gold_source_20261022.other';assert.throws(()=>validateFinancialManifest(other,source,id))
  const count=reader(manifest(),2);await assert.rejects(readFinancialPublication(source,id,count.digest,count.execute),/population/)
  const missing=async()=>({rows:[]});await assert.rejects(readFinancialPublication(source,id,m.digest,missing as any),/Ambiguous/)
  const unsupported=manifest();unsupported.excluded_approvals=[];assert.throws(()=>validateFinancialManifest(unsupported,source,id),/separate acceptance/)
})
test('configuration is paired and research/candidate mode remains the default',()=>{
  assert.equal(descriptiveBinding({}).financialId,undefined)
  const env={DATABRICKS_DESCRIPTIVE_SCHEMA:'medshield_gold_source_20261022',DATABRICKS_DESCRIPTIVE_FACT_VERSION:'0',DATABRICKS_DESCRIPTIVE_DATASET_ID:'b'.repeat(64),DATABRICKS_DESCRIPTIVE_POLICY_VERSION:'sales_restart_gold_v8_isolated_source_rebuild'}
  assert.throws(()=>descriptiveBinding({...env,DATABRICKS_FINANCIAL_RELEASE_ID:id}),/checksum/)
  assert.throws(()=>financialNames('medshield_gold_source_20261022',"bad';DROP"))
  assert.equal(descriptiveBinding({...env,DATABRICKS_FINANCIAL_RELEASE_ID:id,DATABRICKS_FINANCIAL_MANIFEST_SHA256:'a'.repeat(64)}).financialId,id)
})
