import 'dotenv/config'
import {mkdirSync,writeFileSync} from 'node:fs'
import {readRegionalReview} from '../src/regionalSalesReview'
async function main(){
  const source=await readRegionalReview()
  mkdirSync('../outputs/so1_regional_stl_20261028',{recursive:true})
  writeFileSync('../outputs/so1_regional_stl_20261028/source.json',JSON.stringify(source,null,2)+'\n',{flag:'wx'})
  console.log(JSON.stringify({status:'PASS_FRESH_REGIONAL_STL_INPUT',source:source.source,warehouse_writes:0}))
}
main().catch(e=>{console.error(e instanceof Error?e.message.slice(0,250):'Regional input failed');process.exitCode=1})
