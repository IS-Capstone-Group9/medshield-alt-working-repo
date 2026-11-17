import 'dotenv/config'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {writeFileSync} from 'node:fs'
import {executeDatabricksStatement} from '../src/databricks'
import {readDescriptiveRelease,descriptiveBinding} from '../src/descriptiveSource'
import {SO1_FINANCIAL_SQL} from '../src/so1Financial'

async function main(){
  const release=await readDescriptiveRelease(descriptiveBinding());assert.ok(release.original_itemized)
  const sql=SO1_FINANCIAL_SQL.replace('COUNT(*) AS records,',"COUNT(*) AS records,COUNT_IF(source_data_status='UNREVIEWED_SOURCE_EXPORT') AS unreviewed_records,")
  const result=await executeDatabricksStatement(sql,{rowLimit:3000});assert.ok(result.rows.length<3000)
  assert.deepEqual(await readDescriptiveRelease(descriptiveBinding()),release)
  const rowsHash=createHash('sha256').update(JSON.stringify(result.rows)).digest('hex')
  const source={status:'READ_ONLY_REGIONAL_SOURCE_CONTROL',generated_at:new Date().toISOString(),release,sql,
    sql_sha256:createHash('sha256').update(sql).digest('hex'),rows_sha256:rowsHash,...result,warehouse_writes:0}
  writeFileSync('../outputs/so1_regional_connection_20261027/source.json',JSON.stringify(source,null,2)+'\n',{flag:'wx'})
  console.log(JSON.stringify({status:source.status,rows:result.rows.length,rows_sha256:rowsHash}))
}
main().catch(error=>{console.error(error instanceof Error?error.message.slice(0,250):'Regional extraction failed');process.exitCode=1})
