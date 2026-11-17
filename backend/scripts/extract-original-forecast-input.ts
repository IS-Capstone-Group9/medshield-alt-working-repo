import 'dotenv/config'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {createHash} from 'node:crypto'
import {executeDatabricksStatement} from '../src/databricks'
import {readItemizedPreviewSource,decimalMicros} from '../src/itemizedPreview'
import {ITEMIZED_PREVIEW_BINDING as binding} from '../src/itemizedPreviewBinding'
import {ORIGINAL_STL_BINDING} from '../src/originalStl'

async function main(){
  const output=resolve(process.argv[2]??'../outputs/original_forecast_evaluation_20261027/input')
  const source=await readItemizedPreviewSource()
  const table=binding.itemizedTable.split('.').map(part=>'`'+part+'`').join('.')
  const measures=`COUNT(*) AS source_records, COUNT_IF(is_net_sales_technically_eligible) AS net_eligible_records,
    CAST(SUM(CASE WHEN is_net_sales_technically_eligible THEN net_sales END) AS STRING) AS net_sales_php,
    CAST(SUM(CASE WHEN is_gross_margin_technically_eligible THEN gross_margin_amount END) AS STRING) AS supported_gross_profit_php,
    CAST(SUM(CASE WHEN is_gross_margin_technically_eligible THEN net_sales END) AS STRING) AS matching_margin_revenue_php`
  const [monthly,annual]=await Promise.all([
    executeDatabricksStatement(`SELECT DATE_FORMAT(date_delivered,'yyyy-MM') AS month, ${measures} FROM ${table} VERSION AS OF 0
      WHERE record_kind='itemized_sale' GROUP BY DATE_FORMAT(date_delivered,'yyyy-MM') ORDER BY month`,{rowLimit:2400}),
    executeDatabricksStatement(`SELECT CAST(YEAR(date_delivered) AS STRING) AS year, ${measures} FROM ${table} VERSION AS OF 0
      WHERE record_kind='itemized_sale' GROUP BY YEAR(date_delivered) ORDER BY year`,{rowLimit:200}),
  ])
  const six=(value:string|null)=>{const n=decimalMicros(value??''),absolute=n<0n?-n:n;return(n<0n?'-':'')+String(absolute/1_000_000n)+'.'+String(absolute%1_000_000n).padStart(6,'0')}
  const digest=createHash('sha256').update(JSON.stringify(monthly.rows.map(row=>[row.month,row.source_records,row.net_eligible_records,
    six(row.net_sales_php),six(row.supported_gross_profit_php),six(row.matching_margin_revenue_php)]))).digest('hex')
  assert.equal(digest,ORIGINAL_STL_BINDING.monthlySha256,'Monthly values differ from the verified original source')
  assert.equal(monthly.rows.length,107);assert.equal(new Set(monthly.rows.map(row=>row.month)).size,107)
  assert.equal(annual.rows.length,10)
  for(const year of annual.rows){
    const months=monthly.rows.filter(row=>row.month?.startsWith(year.year!+'-'))
    for(const field of ['source_records','net_eligible_records'])assert.equal(months.reduce((sum,row)=>sum+BigInt(row[field]!),0n),BigInt(year[field]!))
    for(const field of ['net_sales_php','supported_gross_profit_php','matching_margin_revenue_php'])
      assert.equal(months.reduce((sum,row)=>sum+decimalMicros(row[field]!),0n),decimalMicros(year[field]!))
  }
  assert.equal(monthly.rows.reduce((sum,row)=>sum+Number(row.source_records),0),40171)
  assert.equal(monthly.rows.reduce((sum,row)=>sum+Number(row.net_eligible_records),0),39286)
  assert.equal(monthly.rows.reduce((sum,row)=>sum+decimalMicros(row.net_sales_php!),0n),decimalMicros(binding.expectedNet))
  const payload={schema_version:'original_itemized_forecast_input_v1',extracted_at:new Date().toISOString(),
    source:'databricks',warehouse_writes:0,source_identity:source,monthly_logical_sha256:digest,
    monthly:monthly.rows,annual:annual.rows,source_completeness:'unknown',contracts_excluded:true,
    training_scope:'user_authorized_offline_recorded_itemized_php_research',financial_release_approved:false,model_publication_approved:false,
    note:'Monthly aggregate input only. No fitted STL, future observations, external regressors or inferred physical demand features.'}
  mkdirSync(output,{recursive:true})
  const raw=JSON.stringify(payload,null,2)+'\n',sha=createHash('sha256').update(raw).digest('hex')
  writeFileSync(resolve(output,'source.json'),raw,{flag:'wx'});writeFileSync(resolve(output,'source.sha256'),sha+'\n',{flag:'wx'})
  console.log(JSON.stringify({status:'PASS_ORIGINAL_FORECAST_INPUT',output,source_sha256:sha,monthly_logical_sha256:digest,months:monthly.rows.length,warehouse_writes:0}))
}
main().catch(error=>{console.error(error instanceof assert.AssertionError?error.message:'Original forecast input extraction failed; no fitting or publication performed.');process.exitCode=1})
