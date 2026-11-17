import 'dotenv/config'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {executeDatabricksStatement as execute} from '../src/databricks'
import {databricksLiteral} from '../src/databricksLiteral'
import {readRegionalReview,regionalHash} from '../src/regionalSalesReview'
import {REGIONAL_STL_BINDING as pin,validateRegionalStl} from '../src/regionalStlReview'
async function main(){
  const [mode]=process.argv.slice(2);assert.ok(['--prepare','--apply','--verify'].includes(mode))
  const directory='../outputs/so1_regional_stl_20261028/',raw=readFileSync(directory+'analysis.json','utf8')
  assert.equal(regionalHash(readFileSync('../services/analytics_service/regional_stl.py','utf8')),JSON.parse(raw).analyzer_sha256)
  const current=await readRegionalReview(),result=validateRegionalStl(raw,current)
  const [catalog,schema,name]=pin.table.split('.'),tables=await execute(`SHOW TABLES IN ${catalog}.${schema} LIKE '${name}'`,{rowLimit:2})
  assert.ok(tables.rows.length<=1)
  if(tables.rows.length){const saved=await execute(`SELECT artifact_sha256,payload_json FROM ${pin.table}`,{rowLimit:2});assert.equal(saved.rows.length,1);assert.equal(saved.rows[0].payload_json,raw);assert.equal(saved.rows[0].artifact_sha256,pin.artifactSha256)}
  const plan={table:pin.table,artifact_sha256:pin.artifactSha256,mapping_sha256:current.source.mapping_sha256,source_monthly_sha256:current.source.current_monthly_sha256,source_version:0,forecast_approved:false,source_tables_modified:false}
  if(mode==='--prepare'){writeFileSync(directory+'stage-plan.json',JSON.stringify(plan,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:'PREPARED_REGIONAL_STL',...plan}));return}
  assert.deepEqual(JSON.parse(readFileSync(directory+'stage-plan.json','utf8')),plan)
  let created=false
  if(mode==='--apply'&&!tables.rows.length){await execute(`CREATE TABLE ${pin.table} USING DELTA AS SELECT ${databricksLiteral(pin.artifactSha256)} AS artifact_sha256,${databricksLiteral(raw)} AS payload_json`);created=true}
  const saved=await execute(`SELECT artifact_sha256,payload_json FROM ${pin.table}`,{rowLimit:2}),history=await execute(`DESCRIBE HISTORY ${pin.table} LIMIT 1`,{rowLimit:1})
  assert.equal(history.rows[0]?.version,'0');assert.equal(saved.rows.length,1);assert.equal(saved.rows[0].artifact_sha256,pin.artifactSha256);assert.equal(saved.rows[0].payload_json,raw)
  validateRegionalStl(saved.rows[0].payload_json!,current)
  writeFileSync(directory+'actual-response.json',JSON.stringify(result,null,2)+'\n')
  const receipt={status:'PASS_REGIONAL_STL_READBACK',...plan,new_candidate_table_created:created,candidate_version:0,checked_at:new Date().toISOString(),components:result.series.reduce((n:number,s:any)=>n+s.components.length,0)}
  writeFileSync(directory+(mode==='--verify'?'stage-verification.json':existsSync(directory+'stage-receipt.json')?'stage-retry-'+Date.now()+'.json':'stage-receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt))
}
main().catch(e=>{console.error(e instanceof Error?e.message.slice(0,250):'Regional STL staging failed');process.exitCode=1})
