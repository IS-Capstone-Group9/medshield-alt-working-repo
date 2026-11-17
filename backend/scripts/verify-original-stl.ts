import 'dotenv/config'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {descriptiveRelease,getDatabricksStl} from '../src/databricksDashboard'
import {readOriginalStl,ORIGINAL_STL_BINDING} from '../src/originalStl'

const output='../outputs/original_stl_connection_20261027'
async function main(){
  mkdirSync(output,{recursive:true})
  const report:Record<string,unknown>={checked_at:new Date().toISOString(),mode:'independent read-only gateway module against actual Databricks',warehouse_writes:0}
  try {
    const release=await descriptiveRelease()
    const data=await readOriginalStl(release)
    const served=await getDatabricksStl()
    assert.deepEqual(served,data,'Main gateway STL branch differs from the validated reader')
    assert.equal(data.rows.length,81);assert.equal(data.calendar.length,120)
    assert.equal(data.rows[0].period,'2020-01');assert.equal(data.rows.at(-1)!.period,'2026-09')
    assert.equal(data.source.checksum,ORIGINAL_STL_BINDING.recordsSha256)
    assert.equal(data.candidate.model_publication_approved,false)
    assert.equal(data.candidate.financial_release_approved,false)
    writeFileSync(output+'/actual-response.json',JSON.stringify(data,null,2)+'\n')
    Object.assign(report,{status:'PASS_ORIGINAL_STL_LIVE_READBACK',candidate:data.candidate,
      source_dataset:release.dataset_id,coverage:data.coverage,first_component:data.rows[0],last_component:data.rows.at(-1),
      parameters:data.parameters,readback_record_hash_verified:true,current_gold_monthly_hash_verified:true,
      gateway_branch_match:true,model_publication_approved:false,financial_release_approved:false})
  } catch(error) {
    Object.assign(report,{status:'FAILED',error_type:error instanceof Error?error.name:'unknown',error:error instanceof Error?error.message.slice(0,1200):'Unknown'})
    process.exitCode=1
  }
  writeFileSync(output+'/live-verification.json',JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report,null,2))
}
main().catch(()=>{console.error('Could not retain original STL verification');process.exitCode=1})
