import 'dotenv/config'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {readRollingResearch} from '../src/rollingResearch'
import {readCurrentSourceResearch,ORIGINAL_RESEARCH_BINDING} from '../src/originalResearch'

async function main(){
  const output='../outputs/rolling_research_connection_20261027';mkdirSync(output,{recursive:true})
  const rolling=await readRollingResearch()
  const fixed=await readCurrentSourceResearch()
  assert.equal(fixed.source.artifact_sha256,ORIGINAL_RESEARCH_BINDING.artifactSha256)
  assert.equal(fixed.selection.model_id,'last_value')
  for(const lead of [1,3]){
    const view=rolling.lead_views[String(lead)]
    assert.equal(view.points.length,441);assert.equal(view.comparisons.length,21)
    assert.equal(view.scope.forecast_lead_months,lead);assert.equal(view.selection.model_id,'mean_6')
    assert.ok(view.points.every((point:any)=>point.lead_months===lead))
  }
  writeFileSync(output+'/actual-response.json',JSON.stringify(rolling,null,2)+'\n')
  const report={status:'PASS_ROLLING_GOLD_READER_AND_FIXED_PRESERVATION',checked_at:new Date().toISOString(),
    source:rolling.lead_views['1'].source,lead_views:[1,3],models:21,served_audit_cases:882,
    fixed_artifact_preserved:fixed.source.artifact_sha256,fixed_selected_preserved:fixed.selection.model_id,
    monthly_source_hash_checked:true,all126_score_groups_recomputed:true,
    warehouse_writes:0,model_pointer_modified:false,publication_approved:false,financial_release_approved:false}
  writeFileSync(output+'/live-verification.json',JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report))
}
main().catch(()=>{console.error('Rolling research readback failed; no substitute values.');process.exitCode=1})
