import 'dotenv/config'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { executeDatabricksStatement as execute } from '../src/databricks'

const hash = (value:string|Buffer)=>createHash('sha256').update(value).digest('hex')
async function main() {
  const [file, mode] = process.argv.slice(2)
  assert.ok(file && ['--prepare','--apply','--verify'].includes(mode), 'Use intake-plan.json --prepare|--apply|--verify')
  const raw=readFileSync(file), plan=JSON.parse(raw.toString('utf8'))
  assert.equal(hash(raw),readFileSync(file.replace(/\.json$/,'.sha256'),'utf8').trim())
  assert.equal(plan.schema_version,1)
  assert.equal(plan.namespace,'workspace.medshield_original_evidence_20261025')
  assert.match(plan.dataset_id,/^[a-f0-9]{64}$/)
  const names=['source_manifest','raw_lines','assessed_rows','itemized_observations','contract_evidence']
  assert.deepEqual(Object.keys(plan.controls).sort(),[...names].sort())
  assert.ok(plan.serving_activation===false && plan.models_fitted===false)
  const base=resolve(file,'..'), receipt=resolve(base,'sql-intake-receipts.jsonl')
  const namespace=plan.namespace, stage=namespace+'.intake_chunks_'+plan.dataset_id.slice(0,16)
  const run=async(sql:string,parameters:Array<{name:string;value:string;type:'STRING'}>=[])=>{
    const started_at=new Date().toISOString()
    try {
      const result=await execute(sql,{rowLimit:5000,timeoutMs:120000,parameters})
      appendFileSync(receipt,JSON.stringify({started_at,finished_at:new Date().toISOString(),sql_sha256:hash(sql),status:'SUCCEEDED'})+'\n')
      return result
    } catch(error) {
      appendFileSync(receipt,JSON.stringify({started_at,sql_sha256:hash(sql),status:'FAILED',reason:error instanceof Error?error.message:'Unknown error'})+'\n')
      throw error
    }
  }
  const chunks=plan.chunks as Array<{table:string;payload:string;chunk_id:number;payload_sha256:string}>
  assert.equal(new Set(chunks.map(c=>c.chunk_id)).size,chunks.length)
  for(const c of chunks){assert.ok(names.includes(c.table));assert.equal(hash(c.payload),c.payload_sha256);assert.ok(Number.isSafeInteger(c.chunk_id))}
  const preparation={prepared_at:new Date().toISOString(),plan_sha256:hash(raw),dataset_id:plan.dataset_id,
    namespace,stage,chunks:chunks.length,controls:plan.controls,execution:'SQL_only_equivalent_JSON_evidence_not_notebook_execution',
    overwrite:false,serving_activation:false,models_fitted:false}
  const preparedFile=resolve(base,'sql-intake-preparation.json')
  if(mode==='--prepare') {writeFileSync(preparedFile,JSON.stringify(preparation,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(preparation));return}
  assert.equal(JSON.parse(readFileSync(preparedFile,'utf8')).plan_sha256,hash(raw),'Preparation identity differs')
  if(mode==='--apply') {
    await run(`CREATE SCHEMA IF NOT EXISTS ${namespace}`)
    await run(`CREATE TABLE IF NOT EXISTS ${stage} (dataset_id STRING, table_name STRING, chunk_id BIGINT, payload STRING) USING DELTA`)
    const saved=(await run(`SELECT chunk_id, SHA2(payload,256) AS sha FROM ${stage}`)).rows
    assert.equal(new Set(saved.map(r=>r.chunk_id)).size,saved.length,'Duplicate staging chunk')
    for(const r of saved)assert.equal(chunks.find(c=>c.chunk_id===Number(r.chunk_id))?.payload_sha256,r.sha,'Existing staging evidence differs')
    const existing=new Set(saved.map(r=>Number(r.chunk_id)))
    const missing=chunks.filter(c=>!existing.has(c.chunk_id))
    // Each statement remains below Databricks' 16 MiB query limit. A stage retry
    // reads its immutable chunk identities first; inserts cannot rewrite evidence.
    for(let offset=0;offset<missing.length;offset+=32){
      const independent=[]
      for(let slot=offset;slot<Math.min(offset+32,missing.length);slot+=4){
        const batch=missing.slice(slot,Math.min(slot+4,missing.length))
        const relation=batch.map((c,i)=>`SELECT '${plan.dataset_id}' AS dataset_id, '${c.table}' AS table_name, CAST(${c.chunk_id} AS BIGINT) AS chunk_id, :payload${i} AS payload`).join(' UNION ALL ')
        const statement=`INSERT INTO ${stage} ${relation}`
        assert.ok(Buffer.byteLength(statement)<16*1024*1024)
        assert.ok(batch.reduce((n,c)=>n+c.payload.length,0)<1048576)
        independent.push(run(statement,batch.map((c,i)=>({name:`payload${i}`,value:c.payload,type:'STRING'}))))
      }
      const outcomes=await Promise.allSettled(independent)
      const failed=outcomes.find(r=>r.status==='rejected')
      if(failed?.status==='rejected')throw failed.reason
      console.log(JSON.stringify({staged_chunks:Math.min(offset+32,missing.length),missing_chunks:missing.length}))
    }
  }
  const staged=(await run(`SELECT chunk_id, SHA2(payload,256) AS sha FROM ${stage}`)).rows
  assert.equal(staged.length,chunks.length);assert.equal(new Set(staged.map(r=>r.chunk_id)).size,chunks.length)
  for(const r of staged)assert.equal(chunks[Number(r.chunk_id)].payload_sha256,r.sha)
  const verified:Record<string,unknown>={}
  for(const name of names){
    const table=namespace+'.'+name
    if(mode==='--apply')await run(`CREATE TABLE IF NOT EXISTS ${table} USING DELTA AS SELECT dataset_id, EXPLODE(FROM_JSON(payload, 'ARRAY<STRING>')) AS record_json FROM ${stage} WHERE table_name='${name}'`)
    const observed=(await run(`SELECT COUNT(*) AS records, COUNT(DISTINCT dataset_id) AS datasets, MIN(dataset_id) AS dataset_id, SHA2(CONCAT_WS('|',SORT_ARRAY(COLLECT_LIST(SHA2(record_json,256)))),256) AS record_hashes_sha256 FROM ${table}`)).rows[0]
    assert.equal(Number(observed.records),plan.controls[name].rows,`${name}: count differs`)
    assert.equal(observed.record_hashes_sha256,plan.controls[name].record_hashes_sha256,`${name}: exact JSON multiset differs`)
    assert.equal(observed.datasets,'1');assert.equal(observed.dataset_id,plan.dataset_id)
    verified[name]={...observed,history:(await run(`DESCRIBE HISTORY ${table} LIMIT 1`)).rows}
  }
  const output={status:'PASS_ORIGINAL_EVIDENCE_SQL',verified_at:new Date().toISOString(),...preparation,tables:verified,
    limitation:'Spark notebook not executed; identical notebook JSON evidence parsed locally and persisted/read back through authorized SQL.',
    contract_counts:'All ten files assessed; do not equate the all-year contract-candidate count with the three-file correction ledger.'}
  writeFileSync(resolve(base,`sql-intake-${mode.slice(2)}-${Date.now()}.json`),JSON.stringify(output,null,2)+'\n',{flag:'wx'})
  console.log(JSON.stringify({status:output.status,dataset_id:plan.dataset_id,tables:Object.keys(verified)}))
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Original evidence intake failed');process.exitCode=1})
