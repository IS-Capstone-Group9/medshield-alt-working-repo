import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync,writeFileSync} from 'node:fs'
import 'dotenv/config'
import {executeDatabricksStatement as execute} from '../src/databricks'
import {ITEMIZED_PREVIEW_BINDING as binding} from '../src/itemizedPreviewBinding'
import {assertMetadataOnlySourceHistory,readItemizedPreviewSource} from '../src/itemizedPreview'

const table=binding.itemizedTable
const quoted=table.split('.').map(part=>'`'+part+'`').join('.')
export const retentionSql=`ALTER TABLE ${quoted} SET TBLPROPERTIES ('delta.logRetentionDuration' = 'interval 365 days', 'delta.deletedFileRetentionDuration' = 'interval 365 days')`
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
type Row=Record<string,string|null>
type Plan={schema_version:1;table:string;dataset_id:string;source_version:0;history:Row[];properties:Row[];sql:string;plan_sha256?:string}

export function validatePlan(plan:Plan){
  assert.equal(plan.schema_version,1);assert.equal(plan.table,table)
  assert.equal(plan.dataset_id,binding.datasetId);assert.equal(plan.source_version,0)
  assert.equal(plan.sql,retentionSql,'Maintenance SQL differs from the allowlisted metadata change')
  assert.ok(Array.isArray(plan.properties));validateHistory(plan.history)
  const {plan_sha256,...content}=plan
  assert.equal(plan_sha256,digest(content),'Maintenance plan integrity differs')
}
export function validateHistory(history:Row[]){
  assert.ok(history.length>0,'Missing original source history')
  const latest=Number(history[0].version)
  assertMetadataOnlySourceHistory(history,latest)
  assert.equal(history.at(-1)?.operation,'CREATE TABLE AS SELECT','Original staging operation differs')
}
async function inspect(){
  const rows=(await execute(`DESCRIBE HISTORY ${quoted} LIMIT 26`,{rowLimit:26})).rows
  const history=rows.map(({version,timestamp,operation})=>({version,timestamp,operation}))
  validateHistory(history)
  const properties=(await execute(`SHOW TBLPROPERTIES ${quoted}`,{rowLimit:100})).rows
    .filter(row=>row.key==='delta.logRetentionDuration'||row.key==='delta.deletedFileRetentionDuration')
    .sort((a,b)=>String(a.key).localeCompare(String(b.key)))
  return {history,properties}
}
const desired=(properties:Row[])=>properties.length===2&&properties.every(row=>row.value==='interval 365 days')

export async function run(mode:string,filename:string){
  assert.ok(mode==='prepare'||mode==='apply','Use prepare or apply')
  assert.ok(filename,'Provide a plan path')
  const before=await inspect()
  // Maintenance-only preflight: bounded metadata history proves unchanged data;
  // current receipt/key/policy/financial controls must agree before changing retention.
  // This executor is never installed in dashboard requests or used as a fallback.
  const source=await readItemizedPreviewSource((sql,options)=>execute(sql.replaceAll(' VERSION AS OF 0',''),options))
  if(mode==='prepare'){
    const content:Plan={schema_version:1,table,dataset_id:source.dataset_id,source_version:0,...before,sql:retentionSql}
    const plan={...content,plan_sha256:digest(content)}
    writeFileSync(filename,JSON.stringify(plan,null,2),{flag:'wx'})
    return {status:'PREPARED_METADATA_ONLY',table,plan_sha256:plan.plan_sha256,already_configured:desired(before.properties)}
  }
  const plan:Plan=JSON.parse(readFileSync(filename,'utf8'));validatePlan(plan)
  let changed=false
  if(!desired(before.properties)){
    assert.ok(Number(before.history[0].version)<25,'Maintenance would exceed the bounded source-history review')
    assert.deepEqual(before.history,plan.history,'History changed after preparation; prepare a new plan')
    assert.deepEqual(before.properties,plan.properties,'Retention changed after preparation; prepare a new plan')
    await execute(retentionSql,{rowLimit:1});changed=true
  }
  const after=await inspect()
  assert.ok(desired(after.properties),'Retention property readback differs')
  if(changed){
    assert.equal(Number(after.history[0].version),Number(before.history[0].version)+1)
    assert.equal(after.history[0].operation,'SET TBLPROPERTIES')
    assert.deepEqual(after.history.slice(1),before.history,'Unexpected concurrent history change')
  }
  const verified=await readItemizedPreviewSource()
  const result={checked_at:new Date().toISOString(),status:'PASS_PINNED_ORIGINAL_RETENTION',changed,table,
    dataset_id:verified.dataset_id,source_version:verified.delta_version,receipt_sha256:verified.receipt_sha256,
    source_keys_sha256:verified.source_keys_sha256,before,after,plan_sha256:plan.plan_sha256,
    retained_days:365,publication_changed:false,analytical_data_changed:false}
  writeFileSync(filename+`.verified-${Date.now()}.json`,JSON.stringify(result,null,2),{flag:'wx'})
  return result
}
if(require.main===module){
  run(process.argv[2],process.argv[3]).then(result=>console.log(JSON.stringify(result)))
    .catch(error=>{console.error(error instanceof assert.AssertionError?error.message:'Retention operation failed; inspect provider/configuration securely.');process.exitCode=1})
}
