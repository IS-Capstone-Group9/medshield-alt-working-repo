import 'dotenv/config'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {executeDatabricksStatement} from '../src/databricks'
import {descriptiveBinding,readDescriptiveRelease} from '../src/descriptiveSource'
import {readRegionalReview} from '../src/regionalSalesReview'
import {readRegionalStl} from '../src/regionalStlReview'
import {readRegionalProductPriority} from '../src/regionalProductPriority'
import {buildRegionalDecisionBoard} from '../src/regionalDecisionBoard'

async function main(){
  const directory=resolve(process.argv[2]??'../outputs/wp2_regional_product_priority_20261030/live')
  assert.ok(!existsSync(directory),'Use a new output directory')
  const started_at=new Date().toISOString()
  const financial=await readRegionalReview(undefined,()=>readDescriptiveRelease(descriptiveBinding({DATABRICKS_DESCRIPTIVE_ADAPTER:'original_itemized_v1'})))
  console.log('READ_ONLY_PHASE: current_regional_source_validated')
  let aggregate:unknown=null
  const priority=await readRegionalProductPriority(financial,async(sql,options)=>{
    const result=await executeDatabricksStatement(sql,options)
    aggregate={sql,rows:result.rows};return result
  })
  const stl=await readRegionalStl(undefined,async()=>financial)
  const board=buildRegionalDecisionBoard(financial,stl,priority)
  mkdirSync(directory,{recursive:true})
  const save=(name:string,value:unknown)=>writeFileSync(resolve(directory,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'})
  save('financial.json',financial);save('aggregate.json',aggregate);save('priority.json',priority);save('board.json',board)
  const files=['src/regionalProductPriority.ts','src/regionalDecisionBoard.ts','scripts/capture-regional-product-priority.ts']
  save('capture.json',{status:'PASS_READ_ONLY_REGIONAL_RECORDED_PRODUCT_PRIORITY',started_at,finished_at:new Date().toISOString(),source:financial.source,
    query_sha256:priority.query_sha256,aggregate_sha256:priority.aggregate_sha256,warehouse_writes:0,approvals_created:0,
    code_sha256:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]))})
  console.log(JSON.stringify({status:'PASS_READ_ONLY_REGIONAL_RECORDED_PRODUCT_PRIORITY',regions:priority.regions.map(r=>({region:r.region,status:r.status,products:r.recorded_products,matched_months:r.matched_months.length})),warehouse_writes:0}))
}
main().catch(()=>{console.error('REGIONAL_PRODUCT_PRIORITY_CAPTURE_FAILED: source/configuration/contract unavailable; no substitute used');process.exitCode=1})
