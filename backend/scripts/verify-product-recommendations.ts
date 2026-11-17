import 'dotenv/config'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {getDatabricksSalesSectors,descriptiveRelease} from '../src/databricksDashboard'

async function main(){
  const directory='../outputs/product_action_recommendations_20261029'
  const expected=JSON.parse(readFileSync('../outputs/product_commercial_review_20261027/live-input.json','utf8'))
  const release=await descriptiveRelease()
  assert.ok(release.original_itemized,'Current original itemized release required')
  const actual=await getDatabricksSalesSectors()
  const keys=['canonical_group_id','canonical_title','product','date','period','category','revenue','positive_sales','returns_value','income','margin_revenue_basis','row_count','evidence','source_data_status','product_evidence','transaction_evidence']
  const rows=actual.rows.map(row=>Object.fromEntries(keys.map(key=>[key,(row as unknown as Record<string,unknown>)[key]])))
  assert.deepEqual(rows,expected.rows,'Current product evidence differs from tested capture')
  for(const key of ['dataset_id','fact_delta_version','policy_version','source_table'] as const)assert.equal(release[key],expected.release[key])
  assert.deepEqual(await descriptiveRelease(),release,'Release changed during verification')
  mkdirSync(directory,{recursive:true})
  const report={status:'PASS_CURRENT_PRODUCT_SOURCE_MATCH',checked_at:new Date().toISOString(),source_records:rows.length,
    release,projected_rows_sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
    exact_tested_capture_match:true,warehouse_writes:0,models_trained:0,approvals_added:0}
  writeFileSync(directory+'/live-source.json',JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify({status:report.status,source_records:rows.length,warehouse_writes:0}))
}
main().catch(error=>{console.error(error instanceof Error?error.message.slice(0,180):'Product source check failed');process.exitCode=1})
