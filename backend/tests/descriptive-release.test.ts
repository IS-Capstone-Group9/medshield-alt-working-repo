import assert from 'node:assert/strict'
import {test} from 'node:test'
import {descriptiveRelease,getDatabricksSalesSectors} from '../src/databricksDashboard'

test('concurrent requests pin one fact version and all detail reads use it',async()=>{
 process.env.DATABRICKS_HOST='https://example.invalid';process.env.DATABRICKS_TOKEN='test-only';process.env.DATABRICKS_SQL_WAREHOUSE_ID='test';delete process.env.DATABRICKS_DESCRIPTIVE_FACT_VERSION
 const original=globalThis.fetch; const statements:string[]=[]
 globalThis.fetch=async(_input, init)=>{
  const sql=JSON.parse(String(init?.body)).statement;statements.push(sql)
  let row:Record<string,string> = {}
  if(sql.startsWith('DESCRIBE HISTORY'))row={version:'15'}
  else if(sql.startsWith('SELECT DISTINCT dataset_id'))row={dataset_id:'dataset',policy_version:'policy',area_mapping_sha256:'area',product_master_sha256:'product',publication_status:'CANDIDATE'}
  const keys=Object.keys(row)
  return new Response(JSON.stringify({statement_id:'test',status:{state:'SUCCEEDED'},manifest:{total_row_count:keys.length?1:0,schema:{columns:keys.map((name,position)=>({name,position}))}},result:{data_array:keys.length?[keys.map(k=>row[k])]:[]}}),{status:200})
 }
 try {
  const [a,b]=await Promise.all([descriptiveRelease(),descriptiveRelease()])
  assert.equal(a.fact_delta_version,15);assert.deepEqual(a,b)
  await getDatabricksSalesSectors()
  assert.equal(statements.filter(s=>s.startsWith('DESCRIBE HISTORY')).length,1)
  assert.ok(statements.filter(s=>s.includes('FROM')&&s.includes('sales_restart_fact_candidate')).every(s=>s.includes('VERSION AS OF 15')))
 }finally{globalThis.fetch=original}
})
