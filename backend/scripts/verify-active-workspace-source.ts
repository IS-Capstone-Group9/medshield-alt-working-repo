/** Fresh read-only Gold validation for the active local workspace audit. */
import 'dotenv/config'
import {mkdirSync,writeFileSync} from 'node:fs'
import {executeDatabricksStatement} from '../src/databricks'
import {readItemizedPreviewSource} from '../src/itemizedPreview'

async function main(){
  const directory='../outputs/databricks_updated_2_validation_20261030'
  mkdirSync(directory,{recursive:true})
  let aggregate:Record<string,string|null>|undefined
  let statements=0
  const source=await readItemizedPreviewSource(async(sql,options)=>{
    if(!/^\s*(SELECT\b|DESCRIBE HISTORY\b)/i.test(sql))throw Error('Read-only source validation required')
    const result=await executeDatabricksStatement(sql,options)
    statements++
    if(result.rows.length===1&&'eligible_net' in result.rows[0]&&'records' in result.rows[0])aggregate=result.rows[0]
    return result
  })
  if(!aggregate)throw Error('Expected actual aggregate controls')
  const report={status:'PASS_FRESH_ORIGINAL_GOLD_SOURCE',checked_at:new Date().toISOString(),
    source,actual_controls:aggregate,read_only_statements:statements,warehouse_writes:0,
    source_files_modified:false,approvals_added:0,models_trained:0}
  writeFileSync(directory+'/live-gold.json',JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify({status:report.status,records:aggregate.records,eligible_records:aggregate.eligible_records,
    eligible_net:aggregate.eligible_net,delta_version:source.delta_version,warehouse_writes:0}))
}
main().catch(()=>{console.error('Active source validation failed; provider payload and credentials not logged.');process.exitCode=1})
