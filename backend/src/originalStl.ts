import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {executeDatabricksStatement} from './databricks'
import type {DescriptiveRelease} from './descriptiveSource'
import {decimalMicros,readItemizedPreviewSource} from './itemizedPreview'
import {ITEMIZED_PREVIEW_BINDING} from './itemizedPreviewBinding'

// Validation pins only. Every analytical value is read from Databricks, never these files.
export const ORIGINAL_STL_BINDING={
  table:'workspace.medshield_original_stl_20261027.stl_05e9c3c65268387a93bb136b_candidate',
  releaseId:'stl_05e9c3c65268387a93bb136b',
  packageSha256:'05e9c3c65268387a93bb136b71a0b85dd50ed61acf45184d4e3f64b829d0ac13',
  recordsSha256:'8b686b4e1cdc6e5e9d822e1e1f75faa3e1f64ddc0eab71d207f0348af49f8173',
  monthlySha256:'9d087afd9dce2ee41da1701d34cbb0083d92d5b5b24dc8aac6471d83e5ed8d0e',
  policy:'original_itemized_stl_export_candidate_v1',version:0,
} as const
const columns=['row_id','record_type','period','release_id','dataset_id','policy_version','payload_sha256','payload_json']
const hash=(text:string)=>createHash('sha256').update(text).digest('hex')
export function originalStlCanonical(value:unknown):string {
  if(Array.isArray(value))return '['+value.map(originalStlCanonical).join(',')+']'
  if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,item])=>JSON.stringify(key)+':'+originalStlCanonical(item)).join(',')+'}'
  return JSON.stringify(value)
}
function six(value:string|null|undefined) {
  const amount=decimalMicros(value??''),absolute=amount<0n?-amount:amount
  return (amount<0n?'-':'')+String(absolute/1_000_000n)+'.'+String(absolute%1_000_000n).padStart(6,'0')
}
function ordinal(period:string) {
  assert.match(period,/^\d{4}-(0[1-9]|1[0-2])$/)
  return Number(period.slice(0,4))*12+Number(period.slice(5))-1
}
function number(value:unknown) {
  assert.equal(typeof value,'string');assert.match(value as string,/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/)
  const parsed=Number(value);assert.ok(Number.isFinite(parsed));return parsed
}

/** Immutable diagnostic candidate. Full current source/monthly checks precede serving. */
export async function readOriginalStl(release:DescriptiveRelease,execute=executeDatabricksStatement) {
  const pin=ORIGINAL_STL_BINDING,binding=ITEMIZED_PREVIEW_BINDING
  assert.ok(release.original_itemized,'Original itemized source is required')
  assert.equal(release.dataset_id,binding.datasetId);assert.equal(release.policy_version,binding.policy)
  assert.equal(release.source_table,binding.itemizedTable);assert.equal(release.fact_delta_version,0)
  assert.equal(release.product_master_sha256,binding.expectedGoldReceipt.accepted_master_sha256)
  assert.equal(release.area_mapping_sha256,null);assert.equal(release.financial_publication,undefined)
  for(const [field,expected] of Object.entries({batch_id:binding.batchId,dataset_id:binding.datasetId,
    source_table:binding.itemizedTable,delta_version:0,receipt_sha256:binding.receiptSha256,source_keys_sha256:binding.keysSha256,
    contracts_excluded:true,financial_release_approved:false,unit_approval:false,forecast_approval:false}))
    assert.equal((release.original_itemized as Record<string,unknown>)[field],expected,'Original source metadata differs: '+field)
  const original=await readItemizedPreviewSource(execute)
  assert.equal(original.dataset_id,release.dataset_id)
  const table=pin.table.split('.').map(part=>'`'+part+'`').join('.')
  const fact=binding.itemizedTable.split('.').map(part=>'`'+part+'`').join('.')
  const [history,saved,monthly]=await Promise.all([
    execute(`DESCRIBE HISTORY ${table} LIMIT 1`,{rowLimit:1}),
    execute(`SELECT ${columns.join(',')} FROM ${table} VERSION AS OF 0 ORDER BY row_id`,{rowLimit:203}),
    execute(`SELECT DATE_FORMAT(date_delivered,'yyyy-MM') AS month, COUNT(*) AS source_records,
      COUNT_IF(is_net_sales_technically_eligible) AS net_eligible_records,
      CAST(SUM(CASE WHEN is_net_sales_technically_eligible THEN net_sales END) AS STRING) AS net_sales_php,
      CAST(SUM(CASE WHEN is_gross_margin_technically_eligible THEN gross_margin_amount END) AS STRING) AS supported_gross_profit_php,
      CAST(SUM(CASE WHEN is_gross_margin_technically_eligible THEN net_sales END) AS STRING) AS matching_margin_revenue_php
      FROM ${fact} VERSION AS OF 0 WHERE record_kind='itemized_sale'
      GROUP BY DATE_FORMAT(date_delivered,'yyyy-MM') ORDER BY month`,{rowLimit:2400}),
  ])
  assert.equal(history.rows.length,1);assert.equal(history.rows[0].version,'0','STL candidate changed after staging')
  assert.equal(saved.rows.length,202);assert.equal(new Set(saved.rows.map(row=>row.row_id)).size,202)
  assert.ok(saved.rows.every(row=>Object.keys(row).length===columns.length&&columns.every(key=>key in row)))
  assert.equal(hash(originalStlCanonical(saved.rows)),pin.recordsSha256,'Stored STL record checksum differs')
  const groups:{calendar:any[];component:any[];receipt:any[]}={calendar:[],component:[],receipt:[]}
  for(const row of saved.rows) {
    assert.equal(row.release_id,pin.releaseId);assert.equal(row.dataset_id,binding.datasetId);assert.equal(row.policy_version,pin.policy)
    assert.equal(typeof row.payload_json,'string');assert.ok(row.payload_json!.length<20_000)
    assert.equal(hash(row.payload_json!),row.payload_sha256,'STL payload checksum differs')
    assert.ok(row.record_type==='calendar'||row.record_type==='component'||row.record_type==='receipt')
    const value=JSON.parse(row.payload_json!)
    assert.equal(row.period,value.period??null);assert.equal(row.row_id,row.record_type+':'+(row.period??'metadata'))
    groups[row.record_type as keyof typeof groups].push(value)
  }
  assert.equal(groups.calendar.length,120);assert.equal(groups.component.length,81);assert.equal(groups.receipt.length,1)
  const receipt=groups.receipt[0]
  assert.equal(receipt.package_sha256,pin.packageSha256);assert.equal(receipt.release_id,pin.releaseId)
  assert.deepEqual(receipt.source,{source_table:binding.itemizedTable,source_delta_version:0,dataset_id:binding.datasetId,
    policy:binding.policy,receipt_sha256:binding.receiptSha256,monthly_sha256:pin.monthlySha256})
  assert.equal(receipt.policy,pin.policy);assert.equal(receipt.contracts_excluded,true)
  assert.equal(receipt.retrospective_diagnostic_only,true);assert.equal(receipt.origin_safe_forecast_feature,false)
  for(const field of ['approved_for_live_serving','financial_release_approved','model_publication_approved'])assert.equal(receipt[field],false)
  assert.deepEqual(receipt.method,{name:'STL',period:12,seasonal_window:13,robust:true,minimum_contiguous_months:36,
    missing_policy:'no_imputation_split_at_gaps',statsmodels_version:'0.14.6',numpy_version:'2.3.4'})
  assert.equal(monthly.rows.length,107);assert.equal(new Set(monthly.rows.map(row=>row.month)).size,107)
  const canonicalMonths=monthly.rows.map(row=>{
    ordinal(row.month!);for(const field of ['source_records','net_eligible_records'])assert.match(row[field]??'',/^\d+$/)
    return [row.month,row.source_records,row.net_eligible_records,six(row.net_sales_php),six(row.supported_gross_profit_php),six(row.matching_margin_revenue_php)]
  })
  assert.equal(hash(JSON.stringify(canonicalMonths)),pin.monthlySha256,'Live Gold monthly inputs differ from the STL source')
  const observed=new Map(monthly.rows.map(row=>[row.month!,row.net_sales_php!]))
  const first=monthly.rows[0].month!,last=monthly.rows.at(-1)!.month!
  const firstIndex=Number(first.slice(0,4))*12
  const runs:string[][]=[];let run:string[]=[]
  for(const [index,row] of groups.calendar.entries()) {
    const month=firstIndex+index,period=Math.floor(month/12)+'-'+String(month%12+1).padStart(2,'0')
    assert.equal(row.period,period)
    const amount=observed.get(period)
    if(amount!==undefined) {
      assert.equal(row.status,'observed_source_month');assert.equal(decimalMicros(row.net_sales_php),decimalMicros(amount));run.push(period)
    } else {
      assert.equal(row.net_sales_php,null)
      assert.equal(row.status,period<first||period>last?'outside_observed_source_range':'missing_source_month')
      if(run.length){runs.push(run);run=[]}
    }
  }
  if(run.length)runs.push(run)
  const eligible=runs.filter(segment=>segment.length>=36)
  assert.deepEqual(groups.component.map(row=>row.period),eligible.flat())
  const rows=groups.component.map(row=>{
    const values={observed:number(row.observed),trend:number(row.trend),seasonal:number(row.seasonal),residual:number(row.residual)}
    assert.equal(decimalMicros(row.observed),decimalMicros(observed.get(row.period)!))
    assert.ok(Math.abs(values.observed-values.trend-values.seasonal-values.residual)<=.000001,'STL components do not reconstruct observed net')
    const segment=eligible.find(periods=>periods.includes(row.period))!
    return {period:row.period as string,...values,segment_start:segment[0],segment_end:segment.at(-1)!}
  })
  const candidate={release_id:pin.releaseId,table:pin.table,delta_version:0,package_sha256:pin.packageSha256,
    records_sha256:pin.recordsSha256,monthly_sha256:pin.monthlySha256,publication_status:'candidate_not_approved',
    contracts_excluded:true,retrospective_diagnostic_only:true,model_publication_approved:false,financial_release_approved:false}
  return {method:'STL',metric:'Itemized eligible signed net sales (PHP)',release,
    parameters:{method:'STL',metric:'eligible_net_sales_php',...receipt.method},rows,calendar:groups.calendar,
    coverage:{observed_months:107,calendar_months:120,fitted_months:rows.length,
      missing_source_months:groups.calendar.filter(row=>row.status==='missing_source_month').map(row=>row.period),
      outside_observed_source_months:groups.calendar.filter(row=>row.status==='outside_observed_source_range').map(row=>row.period),
      short_segments:runs.filter(segment=>segment.length<36).map(periods=>({start:periods[0],end:periods.at(-1),months:periods.length}))},
    candidate,source:{system_of_record:'databricks',view:pin.table,checksum:pin.recordsSha256,release,
      analytical_scope:'original_itemized_sales_contracts_excluded',candidate_only:true,stl_candidate:candidate,
      note:'Itemized-only retrospective diagnostic candidate. Full qualifying history; independent of financial/date filters. No forecast or financial approval.'}}
}
