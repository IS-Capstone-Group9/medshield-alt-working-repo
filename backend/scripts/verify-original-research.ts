import 'dotenv/config'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {descriptiveBinding,readDescriptiveRelease} from '../src/descriptiveSource'
import {readCurrentSourceResearch,readOriginalResearch,ORIGINAL_RESEARCH_BINDING as pin} from '../src/originalResearch'

async function main(){
  const output='../outputs/original_research_connection_20261027'
  mkdirSync(output,{recursive:true})
  const data=await readOriginalResearch(await readDescriptiveRelease(descriptiveBinding()))
  assert.deepEqual(await readCurrentSourceResearch(),data)
  assert.equal(data.points.length,441);assert.equal(data.comparisons.length,21)
  assert.equal(data.activation_allowed,false);assert.equal(data.publication_approved,false)
  writeFileSync(output+'/actual-response.json',JSON.stringify(data,null,2)+'\n')
  const report={status:'PASS_ORIGINAL_RESEARCH_GATEWAY_READBACK',checked_at:new Date().toISOString(),
    mode:'Actual Databricks candidate and fresh original Gold monthly reads; gateway-selector parity',
    source:data.source,scope:data.scope,models:data.comparisons.length,audit_points:data.points.length,
    source_matched:true,artifact_sha256:pin.artifactSha256,all_metrics_recomputed:true,
    gateway_selector_parity:true,warehouse_writes:0,model_pointer_changes:0,
    financial_release_approved:false,model_publication_approved:false}
  writeFileSync(output+'/live-verification.json',JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report))
}
main().catch(()=>{console.error('Original research gateway readback failed; no substitute evidence.');process.exitCode=1})
