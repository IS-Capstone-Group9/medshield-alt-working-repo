import assert from 'node:assert/strict'
import {executeDatabricksStatement, type DatabricksStatementOptions} from './databricks'
import {decimalMicros, ItemizedPreviewInputError, parseItemizedFilters, readItemizedPreviewSource,
  type ItemizedBinding} from './itemizedPreview'
import {ITEMIZED_PREVIEW_BINDING} from './itemizedPreviewBinding'
import {CONTRACT_REVIEW_BINDING} from './contractReviewBinding'

type Execute = typeof executeDatabricksStatement
type ContractBinding = {keysSha256:string;expectedRecords:number;expectedEligibleRecords:number;expectedNet:string}
const metrics = `COUNT(*) AS records, COUNT(CASE WHEN f.is_net_sales_technically_eligible THEN 1 END) AS net_eligible_records,
  CAST(SUM(CASE WHEN f.is_net_sales_technically_eligible THEN f.net_sales END) AS STRING) AS net_sales,
  CAST(SUM(CASE WHEN f.is_net_sales_technically_eligible THEN CASE WHEN f.net_sales < 0 THEN f.net_sales ELSE 0 END END) AS STRING) AS signed_returns`

function yearFilter(input: Record<string,unknown>) {
  if (Object.keys(input).some(key=>key!=='year')) throw new ItemizedPreviewInputError('Contract review supports delivery year only; product and area details are unavailable')
  return parseItemizedFilters(input).year
}
export async function readContractReviewSource(execute:Execute=executeDatabricksStatement,binding:ItemizedBinding=ITEMIZED_PREVIEW_BINDING,pin:ContractBinding=CONTRACT_REVIEW_BINDING) {
  const reference = await readItemizedPreviewSource(execute,binding)
  const table = binding.itemizedTable.replace(/_itemized_candidates$/,'_contract_candidates')
  const quoted = table.split('.').map(part=>'`'+part+'`').join('.')
  const history = await execute(`DESCRIBE HISTORY ${quoted} LIMIT 1`,{rowLimit:1})
  assert.equal(history.rows.length,1); assert.equal(history.rows[0].version,'0','Contract source changed after staging')
  const rows = (await execute(`SELECT COUNT(*) AS records, COUNT(DISTINCT source_record_id) AS unique_records,
    COUNT(DISTINCT dataset_id) AS datasets, MIN(dataset_id) AS dataset_id,
    COUNT(DISTINCT policy_version) AS policies, MIN(policy_version) AS policy_version,
    SHA2(CONCAT_WS('|', SORT_ARRAY(COLLECT_LIST(source_record_id))), 256) AS keys_sha256,
    COUNT(CASE WHEN is_net_sales_technically_eligible THEN 1 END) AS eligible_records,
    CAST(SUM(CASE WHEN is_net_sales_technically_eligible THEN net_sales END) AS STRING) AS eligible_net,
    SUM(CASE WHEN NOT (record_kind <=> 'contract_summary') OR normalized_product IS NOT NULL OR product_key IS NOT NULL
      OR product_category IS NOT NULL OR recorded_quantity IS NOT NULL OR physical_quantity IS NOT NULL OR quantity_unit IS NOT NULL
      OR area IS NOT NULL OR dr_number IS NOT NULL OR NOT (contract_product_breakdown <=> 'unavailable')
      OR NOT (category_status <=> 'not_applicable_contract') OR is_net_sales_technically_eligible IS NULL
      OR (is_net_sales_technically_eligible AND net_sales IS NULL)
      OR NOT (forecast_eligible <=> FALSE) OR NOT (source_unit_approved <=> FALSE)
      OR NOT (financial_release_approved <=> FALSE) THEN 1 ELSE 0 END) AS invalid_contracts
    FROM ${quoted} VERSION AS OF 0`,{rowLimit:1})).rows
  assert.equal(rows.length,1)
  const row=rows[0]
  assert.equal(row.records,String(pin.expectedRecords));assert.equal(row.unique_records,row.records)
  assert.equal(row.datasets,'1');assert.equal(row.dataset_id,binding.datasetId)
  assert.equal(row.policies,'1');assert.equal(row.policy_version,binding.policy)
  assert.equal(row.keys_sha256,pin.keysSha256,'Contract source keys differ')
  assert.equal(row.eligible_records,String(pin.expectedEligibleRecords))
  assert.equal(decimalMicros(row.eligible_net??''),decimalMicros(pin.expectedNet))
  assert.equal(row.invalid_contracts,'0','Contract evidence contains itemization or unexpected approvals')
  return {quoted,source:{...reference, source_table:table,source_keys_sha256:pin.keysSha256,
    scope:'contract_summary_review_only',contracts_excluded:false,excluded_from_itemized_totals:true,
    additive_to_itemized:'unverified',product_breakdown:'unavailable',physical_quantity:null,
    note:'Contract summaries — separate financial review. Not added to itemized totals; overlap remains unresolved. Product details and physical quantities are unavailable.'}}
}
async function readRows(input:Record<string,unknown>,execute:Execute,binding:ItemizedBinding,pin:ContractBinding) {
  const year=yearFilter(input), {quoted,source}=await readContractReviewSource(execute,binding,pin)
  const where=year==='all'?'':'WHERE f.date_delivered >= :start_date AND f.date_delivered < :end_date'
  const parameters:NonNullable<DatabricksStatementOptions['parameters']>=year==='all'?[]:[
    {name:'start_date',value:year+'-01-01',type:'DATE'},{name:'end_date',value:String(Number(year)+1)+'-01-01',type:'DATE'}]
  const from=`FROM ${quoted} VERSION AS OF 0 AS f ${where}`
  const [summary,monthly,years]=await Promise.all([
    execute(`SELECT ${metrics}, MIN(f.date_delivered) AS first_delivery_date, MAX(f.date_delivered) AS last_delivery_date ${from}`,{rowLimit:1,parameters}),
    execute(`SELECT DATE_FORMAT(f.date_delivered,'yyyy-MM') AS period, ${metrics} ${from} GROUP BY DATE_FORMAT(f.date_delivered,'yyyy-MM') ORDER BY period`,{rowLimit:2400,parameters}),
    execute(`SELECT DISTINCT CAST(YEAR(date_delivered) AS STRING) AS year FROM ${quoted} VERSION AS OF 0 ORDER BY year`,{rowLimit:1000})])
  assert.equal(summary.rows.length,1)
  return {source,filters:{year},summary:summary.rows[0],monthly:monthly.rows,available_years:years.rows.map(row=>row.year).filter((year):year is string=>!!year)}
}
export async function getContractReview(input:Record<string,unknown>,execute:Execute=executeDatabricksStatement,
  binding:ItemizedBinding=ITEMIZED_PREVIEW_BINDING,pin:ContractBinding=CONTRACT_REVIEW_BINDING) {
  return readRows(input,execute,binding,pin)
}
export async function getContractReviewCsv(view:unknown,input:Record<string,unknown>,execute:Execute=executeDatabricksStatement,
  binding:ItemizedBinding=ITEMIZED_PREVIEW_BINDING,pin:ContractBinding=CONTRACT_REVIEW_BINDING) {
  if(view!=='monthly') throw new ItemizedPreviewInputError('Contract review exports monthly financial summaries only')
  const review=await readRows(input,execute,binding,pin)
  if(!review.monthly.length) throw new ItemizedPreviewInputError('No contract records match this delivery year')
  const fields=['period','records','net_eligible_records','net_sales','signed_returns']
  const metadata=['Sales scope','Excluded from itemized totals','Additive to itemized','Product breakdown','Physical quantity','Financial release approved','Quantity unit approved','Forecast approved','Dataset ID','Source batch','Gold table','Delta version','Receipt SHA256','Year filter']
  const values=[review.source.scope,true,'unverified','unavailable','unavailable',false,false,false,review.source.dataset_id,review.source.batch_id,review.source.source_table,0,review.source.receipt_sha256,review.filters.year]
  const cell=(value:unknown)=>'"'+String(value??'').replace(/"/g,'""')+'"'
  return {filename:'medshield-contract-review-monthly.csv',csv:'\uFEFF'+[[...fields,...metadata],...review.monthly.map(row=>[...fields.map(field=>row[field]),...values])].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n'}
}
