import 'dotenv/config'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {executeDatabricksStatement as execute} from '../src/databricks'
import {databricksLiteral} from '../src/databricksLiteral'
import {descriptiveBinding,readDescriptiveRelease} from '../src/descriptiveSource'
import {originalResearchDigest,ORIGINAL_RESEARCH_MONTHLY_SQL} from '../src/originalResearch'
import {TOURNAMENT_BINDING as pin,validateTournamentResearch} from '../src/tournamentResearch'
const originalResearchStorageId=pin.storageId

async function main(){
  const [input,output,mode]=process.argv.slice(2)
  assert.ok(input&&output&&['--prepare','--apply','--verify'].includes(mode),'Usage: stage-tournament-research.ts evaluation.json output --prepare|--apply|--verify')
  const raw=readFileSync(input,'utf8'),run=JSON.parse(raw)
  assert.equal(originalResearchDigest(raw),pin.artifactSha256)
  const registered=readFileSync(resolve(dirname(input),'registration.json'),'utf8')
  assert.equal(originalResearchDigest(registered),pin.registrationSha256)
  const registration=JSON.parse(registered)
  assert.deepEqual(registration.protocol,run.protocol)
  assert.equal(registration.source_sha256,run.source_sha256)
  assert.deepEqual(registration.code_sha256,run.code_sha256)
  for(const [name,hash] of Object.entries(registration.code_sha256)){
    assert.match(name,/^services[\\/]analytics_service[\\/][a-z_\\/]+\.py$/)
    assert.equal(originalResearchDigest(readFileSync(resolve('..',name),'utf8')),hash,'Registered source code differs')
  }
  const release=await readDescriptiveRelease(descriptiveBinding())
  const monthly=await execute(ORIGINAL_RESEARCH_MONTHLY_SQL,{rowLimit:2400})
  const validated=validateTournamentResearch(raw,release,monthly.rows)
  const existingSql=`SELECT run_id,artifact_hash,payload_json FROM ${pin.table} WHERE run_id=:candidate_id`
  const parameters=[{name:'candidate_id',value:originalResearchStorageId,type:'STRING' as const}]
  const existing=await execute(existingSql,{rowLimit:2,parameters})
  assert.ok(existing.rows.length<=1&&existing.rows.every(row=>row.run_id===originalResearchStorageId&&row.artifact_hash===pin.artifactSha256&&row.payload_json===raw),'Immutable candidate conflict')
  const plan={mode:'research_candidate_only',table:pin.table,storage_id:originalResearchStorageId,
    artifact_sha256:pin.artifactSha256,run_id:pin.registrationSha256,dataset_id:release.dataset_id,
    source_table:release.source_table,source_version:0,input_sha256:run.source_sha256,
    protocol_sha256:originalResearchDigest(JSON.stringify(run.protocol)),model_pointer_modified:false,publication_approved:false}
  const directory=resolve(output);mkdirSync(directory,{recursive:true})
  if(mode==='--prepare'){
    const target=resolve(directory,'stage-plan.json');assert.ok(!existsSync(target),'Preserve prior preparation')
    writeFileSync(target,JSON.stringify(plan,null,2)+'\n',{flag:'wx'})
    console.log(JSON.stringify({status:'PREPARED_TOURNAMENT_RESEARCH_CANDIDATE',...plan}));return
  }
  assert.deepEqual(JSON.parse(readFileSync(resolve(directory,'stage-plan.json'),'utf8')),plan,'Prepared identity differs')
  let inserted=false
  if(mode==='--apply'&&!existing.rows.length){
    const row={run_id:originalResearchStorageId,model_id:'lead_specific_research_only',dataset_id:release.dataset_id,
      input_hash:run.source_sha256,code_hash:originalResearchDigest(JSON.stringify(run.code_sha256)),
      artifact_hash:pin.artifactSha256,training_cutoff:'2026-03-01',payload_json:raw}
    const fields=Object.keys(row) as (keyof typeof row)[]
    // Statement API limits combined named parameters to 1 MiB. Preserve the exact
    // large artifact through the existing byte-preserving publication path.
    await execute(`MERGE INTO ${pin.table} t USING (SELECT ${fields.map(f=>`${f==='payload_json'?databricksLiteral(row[f]):':'+f} AS ${f}`).join(',')}) s ON t.run_id=s.run_id WHEN NOT MATCHED THEN INSERT (${fields.join(',')}) VALUES (${fields.map(f=>'s.'+f).join(',')})`,
      {parameters:fields.filter(name=>name!=='payload_json').map(name=>({name,value:row[name]!,type:'STRING'}))})
    inserted=true
  }
  const readback=await execute(existingSql,{rowLimit:2,parameters})
  assert.equal(readback.rows.length,1);assert.equal(readback.rows[0].artifact_hash,pin.artifactSha256)
  assert.equal(readback.rows[0].payload_json,raw)
  validateTournamentResearch(readback.rows[0].payload_json!,release,monthly.rows)
  const receipt={status:'PASS_TOURNAMENT_RESEARCH_CANDIDATE_READBACK',...plan,
    new_candidate_row_inserted:inserted,models:validated.models.length,score_groups:validated.groups.length,
    original_evaluation_points:run.predictions.length,checked_at:new Date().toISOString()}
  if(mode==='--verify'){
    writeFileSync(resolve(directory,'response.json'),JSON.stringify(validated,null,2)+'\n',{flag:'wx'})
    writeFileSync(resolve(directory,'monthly.json'),JSON.stringify(monthly.rows,null,2)+'\n',{flag:'wx'})
  }
  const receiptName=mode==='--verify'?'stage-verification.json':existsSync(resolve(directory,'stage-receipt.json'))?'stage-retry-'+Date.now()+'.json':'stage-receipt.json'
  writeFileSync(resolve(directory,receiptName),JSON.stringify(receipt,null,2)+'\n')
  console.log(JSON.stringify(receipt))
}
main().catch(error=>{
  // Keep bounded diagnostics, never request bodies or credentials.
  const detail=error instanceof Error?error.message.slice(0,600):'Unknown error'
  console.error('Tournament research candidate operation failed; no model activation performed. '+detail)
  process.exitCode=1
})
