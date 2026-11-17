import 'dotenv/config'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {executeDatabricksStatement as execute} from '../src/databricks'
import {databricksLiteral} from '../src/databricksLiteral'
import {readDescriptiveRelease,descriptiveBinding} from '../src/descriptiveSource'
import {REGIONAL_BINDING as pin,REGIONAL_SOURCE_SQL,validateRegionalReview} from '../src/regionalSalesReview'

async function main(){
  const [mode]=process.argv.slice(2);assert.ok(['--prepare','--apply','--verify'].includes(mode))
  const directory='../outputs/so1_regional_connection_20261027/'
  const raw=readFileSync(directory+'mapping.json','utf8')
  const release=await readDescriptiveRelease(descriptiveBinding())
  const current=await execute(REGIONAL_SOURCE_SQL,{rowLimit:3000})
  const response=validateRegionalReview(raw,release,current.rows)
  const [catalog,schema,name]=pin.table.split('.')
  const tables=await execute(`SHOW TABLES IN ${catalog}.${schema} LIKE '${name}'`,{rowLimit:2})
  assert.ok(tables.rows.length<=1)
  const exists=tables.rows.length===1
  if(exists){
    const saved=await execute(`SELECT mapping_sha256,payload_json FROM ${pin.table}`,{rowLimit:2})
    assert.equal(saved.rows.length,1);assert.equal(saved.rows[0].payload_json,raw);assert.equal(saved.rows[0].mapping_sha256,pin.mappingSha256)
    const history=await execute(`DESCRIBE HISTORY ${pin.table} LIMIT 1`,{rowLimit:1});assert.equal(history.rows[0]?.version,'0')
  }
  const plan={table:pin.table,mapping_sha256:pin.mappingSha256,source_monthly_sha256:pin.monthlySha256,
    dataset_id:release.dataset_id,source_table:release.source_table,source_version:0,confirmed_labels:9,
    scope:'user_confirmed_recorded_delivery_regional_financial_review',source_tables_modified:false,forecast_approved:false}
  if(mode==='--prepare'){
    writeFileSync(directory+'stage-plan.json',JSON.stringify(plan,null,2)+'\n',{flag:'wx'})
    console.log(JSON.stringify({status:'PREPARED_REGIONAL_MAPPING_CANDIDATE',...plan}));return
  }
  assert.deepEqual(JSON.parse(readFileSync(directory+'stage-plan.json','utf8')),plan)
  let created=false
  if(mode==='--apply'&&!exists){
    await execute(`CREATE TABLE ${pin.table} USING DELTA AS SELECT ${databricksLiteral(pin.mappingSha256)} AS mapping_sha256,${databricksLiteral(raw)} AS payload_json`)
    created=true
  }
  const saved=await execute(`SELECT mapping_sha256,payload_json FROM ${pin.table}`,{rowLimit:2})
  assert.equal(saved.rows.length,1);assert.equal(saved.rows[0].mapping_sha256,pin.mappingSha256);assert.equal(saved.rows[0].payload_json,raw)
  const history=await execute(`DESCRIBE HISTORY ${pin.table} LIMIT 1`,{rowLimit:1});assert.equal(history.rows[0]?.version,'0')
  validateRegionalReview(saved.rows[0].payload_json!,release,current.rows)
  writeFileSync(directory+'actual-response.json',JSON.stringify(response,null,2)+'\n')
  const receipt={status:'PASS_REGIONAL_MAPPING_READBACK',...plan,new_candidate_table_created:created,candidate_delta_version:0,
    source_monthly_groups:current.rows.length,checked_at:new Date().toISOString(),coverage:response.coverage,summaries:response.summaries}
  const target=mode==='--verify'?'stage-verification.json':existsSync(directory+'stage-receipt.json')?'stage-retry-'+Date.now()+'.json':'stage-receipt.json'
  writeFileSync(directory+target,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt))
}
main().catch(error=>{console.error('Regional candidate failed: '+(error instanceof Error?error.message.slice(0,250):'Unknown error'));process.exitCode=1})
