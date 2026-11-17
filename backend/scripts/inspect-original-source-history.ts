import 'dotenv/config'
import {mkdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {executeDatabricksStatement} from '../src/databricks'
import {ITEMIZED_PREVIEW_BINDING as pin} from '../src/itemizedPreviewBinding'

async function main(){
  const histories=[]
  for(const table of [pin.itemizedTable,pin.receiptTable]){
    const result=await executeDatabricksStatement(`DESCRIBE HISTORY ${table.split('.').map(p=>'`'+p+'`').join('.')} LIMIT 5`,{rowLimit:5})
    histories.push({table,rows:result.rows.map(row=>({version:row.version,timestamp:row.timestamp,operation:row.operation,
      operation_metrics:row.operationMetrics??null}))})
  }
  const directory=resolve('../outputs/wp3_regional_anomaly_ledgers_20261030');mkdirSync(directory,{recursive:true})
  const result={status:'READ_ONLY_ORIGINAL_SOURCE_HISTORY_DIAGNOSIS',checked_at:new Date().toISOString(),expected_latest_version:0,
    dataset_id:pin.datasetId,policy_version:pin.policy,histories,warehouse_writes:0,source_guard_relaxed:false}
  writeFileSync(resolve(directory,'history-diagnosis.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'})
  console.log(JSON.stringify(result))
}
main().catch(()=>{console.error('READ_ONLY_HISTORY_UNAVAILABLE');process.exitCode=1})
