import 'dotenv/config'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {executeDatabricksStatement as execute} from '../src/databricks'
import {descriptiveBinding,readDescriptiveRelease} from '../src/descriptiveSource'
import {originalResearchDigest as hash} from '../src/originalResearch'
import {ABC_RESEARCH_BINDING as pin,abcSourceStatements,validateAbcResearch} from '../src/abcResearch'

async function main(){
  const [input,output,mode]=process.argv.slice(2)
  assert.ok(input&&output&&['--prepare','--apply','--verify'].includes(mode),'Usage: stage-abc-research.ts artifact.json output --prepare|--apply|--verify')
  const raw=readFileSync(input,'utf8');assert.equal(hash(raw),pin.artifactSha256)
  const statements=abcSourceStatements(raw),release=await readDescriptiveRelease(descriptiveBinding())
  const inputs=Object.fromEntries(await Promise.all(Object.entries(statements).map(async([name,sql])=>[name,(await execute(sql,{rowLimit:15_000})).rows])))
  const validated=validateAbcResearch(raw,release,inputs)
  const sql=`SELECT run_id,artifact_hash,payload_json FROM ${pin.table} WHERE run_id=:candidate_id`
  const parameters=[{name:'candidate_id',value:pin.storageId,type:'STRING' as const}]
  const existing=await execute(sql,{rowLimit:2,parameters})
  assert.ok(existing.rows.length<=1&&existing.rows.every(r=>r.run_id===pin.storageId&&r.artifact_hash===pin.artifactSha256&&r.payload_json===raw),'Immutable ABC candidate conflict')
  const plan={mode:'research_candidate_only',table:pin.table,storage_id:pin.storageId,artifact_sha256:pin.artifactSha256,
    protocol_sha256:pin.protocolSha256,dataset_id:release.dataset_id,fact_table:release.source_table,fact_version:0,
    source_fact_modified:false,model_pointer_modified:false,publication_approved:false}
  const dir=resolve(output);mkdirSync(dir,{recursive:true});const planPath=resolve(dir,'stage-plan.json')
  if(mode==='--prepare'){
    writeFileSync(planPath,JSON.stringify(plan,null,2)+'\n',{flag:'wx'})
    console.log(JSON.stringify({status:'PREPARED_ABC_RESEARCH_CANDIDATE',...plan}));return
  }
  assert.deepEqual(JSON.parse(readFileSync(planPath,'utf8')),plan)
  let inserted=false
  if(mode==='--apply'&&!existing.rows.length){
    const row={run_id:pin.storageId,model_id:'prior_abc',dataset_id:release.dataset_id!,
      input_hash:validated.source.source_capture_sha256,code_hash:hash(readFileSync('../services/analytics_service/jobs/package_abc_research.py','utf8')),
      artifact_hash:pin.artifactSha256,training_cutoff:'2025-12-31',payload_json:raw}
    const fields=Object.keys(row) as (keyof typeof row)[]
    await execute(`MERGE INTO ${pin.table} t USING (SELECT ${fields.map(f=>':'+f+' AS '+f).join(',')}) s ON t.run_id=s.run_id WHEN NOT MATCHED THEN INSERT (${fields.join(',')}) VALUES (${fields.map(f=>'s.'+f).join(',')})`,
      {parameters:fields.map(name=>({name,value:row[name],type:'STRING'}))})
    inserted=true
  }
  const saved=await execute(sql,{rowLimit:2,parameters});assert.equal(saved.rows.length,1)
  assert.ok(saved.rows[0].run_id===pin.storageId&&saved.rows[0].artifact_hash===pin.artifactSha256&&saved.rows[0].payload_json===raw,'Exact ABC readback differs')
  validateAbcResearch(saved.rows[0].payload_json!,release,inputs)
  if(mode==='--verify'){
    writeFileSync(resolve(dir,'response.json'),JSON.stringify(validated,null,2)+'\n',{flag:'wx'})
    writeFileSync(resolve(dir,'inputs.json'),JSON.stringify(inputs,null,2)+'\n',{flag:'wx'})
  }
  const receipt={status:'PASS_ABC_RESEARCH_CANDIDATE_READBACK',...plan,new_candidate_row_inserted:inserted,
    cases:validated.cases.length,groups:validated.groups.length,checked_at:new Date().toISOString()}
  const name=mode==='--verify'?'stage-verification.json':existsSync(resolve(dir,'stage-receipt.json'))?'stage-retry-'+Date.now()+'.json':'stage-receipt.json'
  writeFileSync(resolve(dir,name),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'})
  console.log(JSON.stringify(receipt))
}
main().catch(()=>{console.error('ABC research candidate operation failed validation; no model activation performed.');process.exitCode=1})
