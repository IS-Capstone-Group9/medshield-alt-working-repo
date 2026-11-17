/** Read-only metadata discovery; no business rows, table writes or approvals. */
import 'dotenv/config'
import {createHash} from 'node:crypto'
import {mkdirSync,writeFileSync} from 'node:fs'
import {executeDatabricksStatement} from '../src/databricks'

const directory='../outputs/operating_input_readiness_20261030'
const statement=`SELECT table_catalog, table_schema, table_name, column_name, data_type
FROM workspace.information_schema.columns
WHERE table_schema LIKE 'medshield%'
ORDER BY table_catalog, table_schema, table_name, ordinal_position
LIMIT 10001`

async function main(){
  mkdirSync(directory,{recursive:true})
  const result=await executeDatabricksStatement(statement,{rowLimit:10001,timeoutMs:60000})
  if(result.rows.length>=10001)throw new Error('Metadata safety bound reached; no complete-scope conclusion')
  const tables=new Map<string,{table:string;columns:Array<{name:string;type:string}>}>()
  for(const row of result.rows){
    const name=[row.table_catalog,row.table_schema,row.table_name].join('.')
    const table=tables.get(name)??{table:name,columns:[]}
    table.columns.push({name:String(row.column_name),type:String(row.data_type)})
    tables.set(name,table)
  }
  const data={status:'VISIBLE_MEDSHIELD_METADATA_INSPECTED',checked_at:new Date().toISOString(),
    scope:'workspace catalog, medshield-prefixed schemas visible to configured service identity',
    statement,statement_sha256:createHash('sha256').update(statement).digest('hex'),
    columns:result.rows.length,tables:[...tables.values()],
    business_rows_read:0,warehouse_writes:0,approvals_added:0,
    limitation:'Permissions and catalog/schema scope limit discovery; names/types alone cannot verify data content or operating readiness.'}
  writeFileSync(directory+'/warehouse-metadata.json',JSON.stringify(data,null,2)+'\n')
  console.log(JSON.stringify({status:data.status,tables:data.tables.length,columns:data.columns,warehouse_writes:0}))
}
main().catch(()=>{mkdirSync(directory,{recursive:true});writeFileSync(directory+'/warehouse-metadata.json',JSON.stringify({
  status:'METADATA_INSPECTION_UNAVAILABLE',checked_at:new Date().toISOString(),business_rows_read:0,warehouse_writes:0,
  limitation:'The scoped metadata request failed or exceeded its bound; no warehouse absence claim is supported.'},null,2)+'\n');
  console.error('Scoped metadata inspection unavailable; no credentials or provider error payload logged.');process.exitCode=1})
