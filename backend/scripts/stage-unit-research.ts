import 'dotenv/config'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {executeDatabricksStatement as execute} from '../src/databricks'
import {databricksLiteral} from '../src/databricksLiteral'
import {descriptiveBinding,readDescriptiveRelease} from '../src/descriptiveSource'
import {UNIT_RESEARCH_BINDING as pin,UNIT_RESEARCH_SQL,validateUnitResearch,unitResearchHash} from '../src/unitBaselineResearch'

async function main(){
  const [mode]=process.argv.slice(2);assert.ok(['--prepare','--apply','--verify'].includes(mode))
  const directory=resolve('../outputs/bupiright_research_connection_20261027')
  const raw=readFileSync(resolve(directory,'artifact.json'),'utf8')
  const release=await readDescriptiveRelease(descriptiveBinding())
  const current=await execute(UNIT_RESEARCH_SQL,{rowLimit:100})
  const response=validateUnitResearch(raw,release,current.rows)
  const sql=`SELECT run_id,artifact_hash,payload_json FROM ${pin.table} WHERE run_id=:candidate_id`
  const parameters=[{name:'candidate_id',value:pin.storageId,type:'STRING' as const}]
  const existing=await execute(sql,{rowLimit:2,parameters})
  assert.ok(existing.rows.length<=1&&existing.rows.every(r=>r.run_id===pin.storageId&&r.artifact_hash===pin.artifactSha256&&r.payload_json===raw),'Immutable candidate conflict')
  const plan={table:pin.table,storage_id:pin.storageId,artifact_sha256:pin.artifactSha256,dataset_id:release.dataset_id,
    source_table:release.source_table,source_version:0,research_display_authorized:true,operational_forecasting_approved:false,
    model_pointer_modified:false,source_tables_modified:false}
  if(mode==='--prepare'){
    writeFileSync(resolve(directory,'stage-plan.json'),JSON.stringify(plan,null,2)+'\n',{flag:'wx'})
    console.log(JSON.stringify({status:'PREPARED_UNIT_RESEARCH_CANDIDATE',...plan}));return
  }
  assert.deepEqual(JSON.parse(readFileSync(resolve(directory,'stage-plan.json'),'utf8')),plan)
  let inserted=false
  if(mode==='--apply'&&!existing.rows.length){
    const row={run_id:pin.storageId,model_id:'bupiright_baselines_no_selection',dataset_id:release.dataset_id,
      input_hash:JSON.parse(raw).candidate.source_sha256,code_hash:JSON.parse(raw).results.evaluator_sha256,
      artifact_hash:pin.artifactSha256,training_cutoff:'2026-08-01',payload_json:raw}
    const fields=Object.keys(row) as (keyof typeof row)[]
    await execute(`MERGE INTO ${pin.table} t USING (SELECT ${fields.map(f=>`${databricksLiteral(row[f]!)} AS ${f}`).join(',')}) s ON t.run_id=s.run_id WHEN NOT MATCHED THEN INSERT (${fields.join(',')}) VALUES (${fields.map(f=>'s.'+f).join(',')})`)
    inserted=true
  }
  const readback=await execute(sql,{rowLimit:2,parameters})
  assert.equal(readback.rows.length,1);assert.equal(readback.rows[0].payload_json,raw)
  assert.equal(readback.rows[0].artifact_hash,pin.artifactSha256)
  const result=validateUnitResearch(readback.rows[0].payload_json!,release,current.rows)
  assert.equal(unitResearchHash(raw),pin.artifactSha256)
  writeFileSync(resolve(directory,'actual-response.json'),JSON.stringify(result,null,2)+'\n')
  const receipt={status:'PASS_UNIT_RESEARCH_CANDIDATE_READBACK',...plan,new_candidate_row_inserted:inserted,
    checked_at:new Date().toISOString(),source_records:response.evidence.source_records,scored_predictions:response.points.length}
  const name=mode==='--verify'?'stage-verification.json':existsSync(resolve(directory,'stage-receipt.json'))?'stage-retry-'+Date.now()+'.json':'stage-receipt.json'
  writeFileSync(resolve(directory,name),JSON.stringify(receipt,null,2)+'\n')
  console.log(JSON.stringify(receipt))
}
main().catch(error=>{console.error('Unit research operation failed: '+(error instanceof Error?error.message.slice(0,250):'Unknown error'));process.exitCode=1})
