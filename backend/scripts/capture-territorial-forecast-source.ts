import 'dotenv/config'
import assert from 'node:assert/strict'
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {createHash} from 'node:crypto'
import {executeDatabricksStatement as execute} from '../src/databricks'
import {descriptiveBinding,readDescriptiveRelease} from '../src/descriptiveSource'
import {readRegionalReview} from '../src/regionalSalesReview'
import {UNIT_RESEARCH_BINDING,UNIT_RESEARCH_SQL,validateUnitResearch} from '../src/unitBaselineResearch'
import {ITEMIZED_PREVIEW_BINDING as binding} from '../src/itemizedPreviewBinding'

async function main(){
  const directory=resolve(process.argv[2]??'../outputs/wp4_territorial_research_20261031/source')
  assert.ok(!existsSync(directory),'Use a new capture destination')
  const started_at=new Date().toISOString()
  const release=await readDescriptiveRelease(descriptiveBinding({DATABRICKS_DESCRIPTIVE_ADAPTER:'original_itemized_v1'}))
  const unitSql=`SELECT run_id,artifact_hash,payload_json FROM ${UNIT_RESEARCH_BINDING.table} WHERE run_id=:id`
  const eligibilitySql=`SELECT area,COUNT(*) AS records,COUNT_IF(source_unit_approved) AS approved_unit_records,
    COUNT_IF(forecast_eligible) AS forecast_eligible_records FROM ${binding.itemizedTable} VERSION AS OF 0
    WHERE record_kind='itemized_sale' GROUP BY area ORDER BY area`
  const [regional,saved,unitRows,eligibility]=await Promise.all([
    readRegionalReview(undefined,async()=>release),
    execute(unitSql,{rowLimit:2,parameters:[{name:'id',value:UNIT_RESEARCH_BINDING.storageId,type:'STRING'}]}),
    execute(UNIT_RESEARCH_SQL,{rowLimit:100}),execute(eligibilitySql,{rowLimit:100}),
  ])
  assert.equal(saved.rows.length,1);assert.equal(saved.rows[0].artifact_hash,UNIT_RESEARCH_BINDING.artifactSha256)
  const raw=saved.rows[0].payload_json;assert.equal(typeof raw,'string')
  const unit=validateUnitResearch(raw!,release,unitRows.rows)
  assert.equal(eligibility.rows.reduce((n,r)=>n+Number(r.records),0),binding.expectedRecords)
  assert.ok(eligibility.rows.every(r=>r.area&&['records','approved_unit_records','forecast_eligible_records'].every(k=>/^\d+$/.test(r[k]??''))))
  const artifact=JSON.parse(raw!)
  assert.equal(artifact.confirmation.applied_raw_area,'HOSPITAL')
  mkdirSync(directory,{recursive:true})
  const save=(name:string,value:unknown)=>writeFileSync(resolve(directory,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'})
  save('financial.json',regional);save('unit-review.json',unit)
  save('unit-confirmation.json',artifact.confirmation)
  save('unit-eligibility.json',{sql:eligibilitySql,rows:eligibility.rows})
  const files=['scripts/capture-territorial-forecast-source.ts','src/regionalSalesReview.ts','src/unitBaselineResearch.ts','src/itemizedPreviewBinding.ts']
  save('capture.json',{status:'PASS_READ_ONLY_TERRITORIAL_FORECAST_SOURCE',started_at,finished_at:new Date().toISOString(),
    source:regional.source,unit_artifact_sha256:UNIT_RESEARCH_BINDING.artifactSha256,
    warehouse_writes:0,approvals_created:0,code_sha256:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]))})
  console.log(JSON.stringify({status:'PASS_READ_ONLY_TERRITORIAL_FORECAST_SOURCE',months:regional.months.length,
    source_records:binding.expectedRecords,approved_unit_records:eligibility.rows.reduce((s,r)=>s+Number(r.approved_unit_records),0),
    forecast_eligible_records:eligibility.rows.reduce((s,r)=>s+Number(r.forecast_eligible_records),0),unit_scope:unit.scope,warehouse_writes:0}))
}
main().catch(()=>{console.error('Territorial source capture failed validation; no substitution or source write.');process.exitCode=1})
