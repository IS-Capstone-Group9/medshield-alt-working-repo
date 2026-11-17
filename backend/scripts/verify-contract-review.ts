import 'dotenv/config'
import assert from 'node:assert/strict'
import {writeFileSync} from 'node:fs'
import {getContractReview,getContractReviewCsv} from '../src/contractReview'
import {decimalMicros} from '../src/itemizedPreview'
async function main(){
  const report:Record<string,unknown>={checked_at:new Date().toISOString(),warehouse_writes:0,main_source_changed:false}
  try{
    const review=await getContractReview({}),csv=await getContractReviewCsv('monthly',{})
    assert.equal(review.summary.records,'352');assert.equal(review.summary.net_sales,'118330249.950000')
    const sum=review.monthly.reduce((total,row)=>total+decimalMicros(row.net_sales??'0'),0n)
    assert.equal(sum,decimalMicros(review.summary.net_sales!))
    assert.equal(csv.csv.split('\r\n').filter(Boolean).length,review.monthly.length+1)
    assert.ok(csv.csv.includes('"contract_summary_review_only","true","unverified","unavailable","unavailable","false"'))
    assert.ok(csv.csv.includes('"Quantity unit approved","Forecast approved"'))
    const selected=await getContractReview({year:'2024'})
    assert.ok(selected.monthly.every(row=>row.period?.startsWith('2024-')))
    Object.assign(report,{status:'PASS_LIVE_CONTRACT_REVIEW',source:review.source,summary:review.summary,
      monthly_groups:review.monthly.length,years:review.available_years,exact_monthly_conservation:true,
      csv_scope:true,csv_bytes:Buffer.byteLength(csv.csv),selected_year:{year:'2024',records:selected.summary.records,net:selected.summary.net_sales},
      authenticated_production_browser:false})
  }catch(error){Object.assign(report,{status:'UNVERIFIED',error_type:error instanceof Error?error.name:'unknown',provider_code:error instanceof Error?error.message.match(/HTTP \d{3}|\[[A-Z_\.]+\]/)?.[0]:undefined,assertion:error instanceof assert.AssertionError?error.message.split('\n')[0]:undefined});process.exitCode=1}
  writeFileSync('../outputs/sales_scope_20261026/live-contracts.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
}
main().catch(()=>{console.error('Could not retain contract verification report.');process.exitCode=1})
