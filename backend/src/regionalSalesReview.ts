import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {executeDatabricksStatement} from './databricks'
import {descriptiveBinding,readDescriptiveRelease,type DescriptiveRelease} from './descriptiveSource'
import {ITEMIZED_PREVIEW_BINDING as source} from './itemizedPreviewBinding'
import {SO1_FINANCIAL_SQL} from './so1Financial'
import {decimalMicros} from './itemizedPreview'

export const REGIONAL_BINDING={
  table:'workspace.medshield_original_gold_20261026.regional_4c5f44013464395e_candidate',
  mappingSha256:'4c5f44013464395efa49c133f2d141646930f9437a23e60e8b05cf0298392df4',
  monthlySha256:'3c3732944ea115a3e12465bd48ee1d0322a503beb7c44e60a64e85b54cff586c',
} as const
export const REGIONAL_SOURCE_SQL=SO1_FINANCIAL_SQL.replace('COUNT(*) AS records,',"COUNT(*) AS records,COUNT_IF(source_data_status='UNREVIEWED_SOURCE_EXPORT') AS unreviewed_records,")
export const regionalHash=(raw:string)=>createHash('sha256').update(raw).digest('hex')
type Json=Record<string,any>
type Row=Record<string,string|null>
export type RegionalMonth={region:string;period:string;records:number;net_eligible_records:number;margin_eligible_records:number;unreviewed_records:number;
  net_sales_php:string|null;gross_profit_php:string|null;margin_revenue_basis_php:string|null}
export function microsText(n:bigint){const a=n<0n?-n:n;return(n<0n?'-':'')+String(a/1000000n)+'.'+String(a%1000000n).padStart(6,'0')}
function integer(value:string|null){assert.match(value??'',/^\d+$/);const n=Number(value);assert.ok(Number.isSafeInteger(n));return n}
function total(rows:RegionalMonth[],region:string,period='all'):RegionalMonth{
  const records=rows.reduce((s,r)=>s+r.records,0),net=rows.reduce((s,r)=>s+r.net_eligible_records,0),margin=rows.reduce((s,r)=>s+r.margin_eligible_records,0)
  const sum=(key:'net_sales_php'|'gross_profit_php'|'margin_revenue_basis_php')=>microsText(rows.reduce((s,r)=>s+(r[key]===null?0n:decimalMicros(r[key]!)),0n))
  return {region,period,records,net_eligible_records:net,margin_eligible_records:margin,unreviewed_records:rows.reduce((s,r)=>s+r.unreviewed_records,0),
    net_sales_php:net?sum('net_sales_php'):null,gross_profit_php:margin?sum('gross_profit_php'):null,margin_revenue_basis_php:margin?sum('margin_revenue_basis_php'):null}
}
export function validateRegionalReview(raw:string,release:DescriptiveRelease,rows:Row[]){
  assert.ok(Buffer.byteLength(raw)<30_000);assert.equal(regionalHash(raw),REGIONAL_BINDING.mappingSha256)
  const mapping:Json=JSON.parse(raw)
  assert.equal(mapping.schema_version,'original_regional_delivery_mapping_v1')
  assert.ok(release.original_itemized)
  assert.equal(release.dataset_id,source.datasetId);assert.equal(release.source_table,source.itemizedTable)
  assert.equal(release.fact_delta_version,0);assert.equal(release.policy_version,source.policy)
  assert.equal(release.product_master_sha256,source.expectedGoldReceipt.accepted_master_sha256)
  assert.equal(release.area_mapping_sha256,null)
  for(const [key,value] of Object.entries({receipt_sha256:source.receiptSha256,source_keys_sha256:source.keysSha256,
    contracts_excluded:true,financial_release_approved:false,forecast_approval:false,unit_approval:false}))assert.equal((release.original_itemized as Json)[key],value)
  assert.equal(mapping.dataset_id,source.datasetId);assert.equal(mapping.source_table,source.itemizedTable);assert.equal(mapping.source_delta_version,0)
  assert.equal(mapping.mappings.length,9);assert.equal(new Set(mapping.mappings.map((m:Json)=>m.recorded_label)).size,9)
  assert.equal(mapping.forecast_approved,false);assert.equal(mapping.external_join_approved,false);assert.equal(mapping.financial_publication_approved,false)
  assert.equal(rows.length,1032)
  assert.equal(regionalHash(JSON.stringify(rows)),REGIONAL_BINDING.monthlySha256)
  const assignments=new Map<string,string>(mapping.mappings.map((m:Json)=>{assert.equal(m.delivery_meaning,'user_confirmed');assert.ok(['CALABARZON','MIMAROPA','BICOL'].includes(m.region));return[m.recorded_label,m.region]}))
  const seen=new Set<string>(),labels=new Set<string>(),groups=new Map<string,RegionalMonth[]>(),rawAreas=new Map<string,RegionalMonth[]>()
  for(const row of rows){
    assert.ok(row.normalized_area);assert.match(row.period??'',/^\d{4}-(0[1-9]|1[0-2])$/)
    const key=row.normalized_area+'|'+row.period;assert.ok(!seen.has(key));seen.add(key);labels.add(row.normalized_area)
    const region=assignments.get(row.normalized_area)??'UNALLOCATED',n=integer(row.records),eligible=integer(row.net_eligible_records),margin=integer(row.margin_eligible_records),unreviewed=integer(row.unreviewed_records)
    assert.ok(n>0&&eligible<=n&&margin<=eligible&&unreviewed<=n);assert.equal(integer(row.invalid_margin_pairs),0)
    assert.equal(row.net_sales_php===null,eligible===0);assert.equal(row.gross_profit_php===null,margin===0);assert.equal(row.margin_revenue_basis_php===null,margin===0)
    for(const field of ['net_sales_php','gross_profit_php','margin_revenue_basis_php'])if(row[field]!==null)decimalMicros(row[field]!)
    const value:RegionalMonth={region,period:row.period!,records:n,net_eligible_records:eligible,margin_eligible_records:margin,unreviewed_records:unreviewed,
      net_sales_php:row.net_sales_php,gross_profit_php:row.gross_profit_php,margin_revenue_basis_php:row.margin_revenue_basis_php}
    const group=groups.get(region+'|'+row.period)??[];group.push(value);groups.set(region+'|'+row.period,group)
    const area=rawAreas.get(row.normalized_area)??[];area.push(value);rawAreas.set(row.normalized_area,area)
  }
  assert.equal(labels.size,22);for(const label of assignments.keys())assert.ok(labels.has(label))
  const months=[...groups.values()].map(rs=>total(rs,rs[0].region,rs[0].period)).sort((a,b)=>a.region.localeCompare(b.region)||a.period.localeCompare(b.period))
  const company=total(months,'ALL')
  assert.equal(company.records,source.expectedRecords);assert.equal(company.net_eligible_records,source.expectedEligibleRecords)
  assert.equal(decimalMicros(company.net_sales_php!),decimalMicros(source.expectedNet))
  assert.equal(company.margin_eligible_records,36798)
  assert.equal(decimalMicros(company.gross_profit_php!),decimalMicros('334666271.550000'))
  assert.equal(decimalMicros(company.margin_revenue_basis_php!),decimalMicros('566954921.920000'))
  const periods=[...new Set(months.map(m=>m.period))].sort(),regions=['CALABARZON','MIMAROPA','BICOL','UNALLOCATED']
  const summaries=regions.map(r=>total(months.filter(m=>m.region===r),r))
  const mapped=total(months.filter(m=>m.region!=='UNALLOCATED'),'CONFIRMED')
  return {status:'user_confirmed_regional_financial_review',scope:{unit:'PHP',contracts_excluded:true,source_completeness:'unknown',
    filter_policy:'fixed_itemized_all_buyers_independent_of_analysis_filters',mapping_evidence:'direct_user_delivery_label_confirmation',
    financial_publication_approved:false,forecast_approved:false,external_join_approved:false},
    source:{dataset_id:source.datasetId,fact_table:source.itemizedTable,fact_version:0,policy_version:source.policy,
      receipt_sha256:source.receiptSha256,mapping_sha256:REGIONAL_BINDING.mappingSha256,mapping_table:REGIONAL_BINDING.table,
      current_monthly_sha256:regionalHash(JSON.stringify(rows)),calendar_start:periods[0],calendar_end:periods.at(-1)!,source_months:periods.length},
    mappings:mapping.mappings,unallocated_labels:[...labels].filter(l=>!assignments.has(l)).sort(),company,summaries,months,
    area_summaries:[...rawAreas].map(([area,rs])=>({recorded_label:area,...total(rs,rs[0].region)})),
    area_months:[...rawAreas].flatMap(([area,rs])=>rs.map(row=>({area,...row}))),
    coverage:{confirmed_labels:9,total_labels:22,mapped_records:mapped.records,retained_records:company.records,
      mapped_eligible_records:mapped.net_eligible_records,eligible_records:company.net_eligible_records,
      mapped_record_pct:100*mapped.records/company.records,mapped_signed_net_sales_php:mapped.net_sales_php},
    limitations:[...mapping.limitations,'Unallocated is an accounting bucket, not a fourth region. Missing regional months remain unavailable, not zero sales.','Regional sums describe these recorded itemized deliveries, not complete regional markets or company sales.'],
  }
}

export async function readRegionalReview(execute=executeDatabricksStatement,releaseReader=()=>readDescriptiveRelease(descriptiveBinding())){
  const release=await releaseReader()
  const [saved,current,history]=await Promise.all([
    execute(`SELECT mapping_sha256,payload_json FROM ${REGIONAL_BINDING.table}`,{rowLimit:2}),
    execute(REGIONAL_SOURCE_SQL,{rowLimit:3000}),
    execute(`DESCRIBE HISTORY ${REGIONAL_BINDING.table} LIMIT 1`,{rowLimit:1}),
  ])
  assert.equal(history.rows[0]?.version,'0');assert.equal(saved.rows.length,1)
  assert.equal(saved.rows[0].mapping_sha256,REGIONAL_BINDING.mappingSha256)
  assert.equal(typeof saved.rows[0].payload_json,'string')
  return validateRegionalReview(saved.rows[0].payload_json!,release,current.rows)
}
