import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {executeDatabricksStatement} from './databricks'
import {ITEMIZED_PREVIEW_BINDING as binding} from './itemizedPreviewBinding'
import {decimalMicros} from './itemizedPreview'
import type {So1Package,So1Month,so1View} from './so1Diagnostics'

export type So1FinancialMonth={gross_profit_php:number|null;margin_revenue_basis_php:number|null;
  margin_eligible_records:number;margin_pct:number|null;margin_record_coverage_pct:number|null}
export const SO1_FINANCIAL_SQL=`SELECT area AS normalized_area,DATE_FORMAT(date_delivered,'yyyy-MM') AS period,
  COUNT(*) AS records,COUNT_IF(is_net_sales_technically_eligible) AS net_eligible_records,
  CAST(SUM(CASE WHEN is_net_sales_technically_eligible THEN net_sales END) AS STRING) AS net_sales_php,
  COUNT_IF(is_gross_margin_technically_eligible) AS margin_eligible_records,
  CAST(SUM(CASE WHEN is_gross_margin_technically_eligible THEN gross_margin_amount END) AS STRING) AS gross_profit_php,
  CAST(SUM(CASE WHEN is_gross_margin_technically_eligible THEN net_sales END) AS STRING) AS margin_revenue_basis_php,
  COUNT_IF(is_gross_margin_technically_eligible AND (gross_margin_amount IS NULL OR net_sales IS NULL)) AS invalid_margin_pairs
  FROM ${binding.itemizedTable.split('.').map(p=>'`'+p+'`').join('.')} VERSION AS OF 0
  WHERE record_kind='itemized_sale' GROUP BY area,DATE_FORMAT(date_delivered,'yyyy-MM') ORDER BY area,period`

type Row=Record<string,string|null>
function integer(value:string|null){assert.match(value??'',/^\d+$/);const n=Number(value);assert.ok(Number.isSafeInteger(n));return n}
function amount(value:string|null){if(value===null)return null;decimalMicros(value);const n=Number(value);assert.ok(Number.isFinite(n));return n}
export function summarizeSo1Financial(months:Array<So1Month&Partial<So1FinancialMonth>>){
  const observed=months.filter(row=>(row.margin_eligible_records??0)>0)
  const records=months.reduce((sum,row)=>sum+row.records,0)
  const eligible=months.reduce((sum,row)=>sum+(row.margin_eligible_records??0),0)
  const profit=observed.length?observed.reduce((sum,row)=>sum+row.gross_profit_php!,0):null
  const basis=observed.length?observed.reduce((sum,row)=>sum+row.margin_revenue_basis_php!,0):null
  return {gross_profit_php:profit,margin_revenue_basis_php:basis,margin_eligible_records:eligible,
    margin_pct:profit!==null&&basis!==null&&basis>0?100*profit/basis:null,
    margin_record_coverage_pct:records?100*eligible/records:null,
    formula:'100 * SUM(gross_profit on margin-eligible rows) / SUM(net_sales on the same margin-eligible rows)',
    scope:'Supported itemized gross profit before operating expenses; not net profit or complete company profitability.'}
}

/** Query Gold independently of saved decomposition; pair numerator and denominator before aggregation. */
export function reconcileSo1Financial(payload:So1Package,rows:Row[]){
  assert.ok(payload.release.original_itemized);assert.equal(payload.release.source_table,binding.itemizedTable)
  assert.equal(payload.release.fact_delta_version,0)
  const expected=new Map(payload.series.slice(1).flatMap(series=>series.months.filter(row=>row.records>0).map(row=>[series.area+'|'+row.period,row] as const)))
  assert.equal(rows.length,expected.size)
  const values=new Map<string,So1FinancialMonth>(),company=new Map<string,Row[]>()
  let profit=0n,basis=0n,totalRecords=0,totalEligible=0
  for(const row of rows){
    const key=row.normalized_area+'|'+row.period,target=expected.get(key)
    assert.ok(target&&!values.has(key),'Unexpected/duplicate financial source month')
    const records=integer(row.records),eligible=integer(row.margin_eligible_records)
    assert.equal(records,target.records);assert.equal(integer(row.net_eligible_records),target.eligible_records)
    assert.equal(integer(row.invalid_margin_pairs),0)
    if(row.net_sales_php===null)assert.equal(target.revenue,null)
    else assert.ok(target.revenue!==null&&Math.abs(Number(row.net_sales_php)-target.revenue)<.000001)
    assert.ok(eligible<=records)
    assert.equal(row.gross_profit_php===null,eligible===0);assert.equal(row.margin_revenue_basis_php===null,eligible===0)
    const p=amount(row.gross_profit_php),b=amount(row.margin_revenue_basis_php)
    values.set(key,{gross_profit_php:p,margin_revenue_basis_php:b,margin_eligible_records:eligible,
      margin_pct:p!==null&&b!==null&&b>0?100*p/b:null,margin_record_coverage_pct:100*eligible/records})
    if(row.gross_profit_php!==null)profit+=decimalMicros(row.gross_profit_php)
    if(row.margin_revenue_basis_php!==null)basis+=decimalMicros(row.margin_revenue_basis_php)
    totalRecords+=records;totalEligible+=eligible
    const list=company.get(row.period!)??[];list.push(row);company.set(row.period!,list)
  }
  assert.equal(profit,decimalMicros('334666271.550000'),'Original Gold supported gross profit differs')
  assert.equal(basis,decimalMicros('566954921.920000'),'Original Gold paired margin basis differs')
  assert.equal(totalRecords,binding.expectedRecords)
  assert.equal(totalEligible,36798,'Original Gold margin-supported record count differs')
  for(const [period,cohort] of company){
    const eligible=cohort.reduce((sum,row)=>sum+integer(row.margin_eligible_records),0)
    const present=cohort.filter(row=>row.gross_profit_php!==null)
    const p=present.length?present.reduce((sum,row)=>sum+Number(row.gross_profit_php),0):null
    const b=present.length?present.reduce((sum,row)=>sum+Number(row.margin_revenue_basis_php),0):null
    const records=cohort.reduce((sum,row)=>sum+integer(row.records),0)
    values.set('COMPANY|'+period,{gross_profit_php:p,margin_revenue_basis_php:b,margin_eligible_records:eligible,
      margin_pct:p!==null&&b!==null&&b>0?100*p/b:null,margin_record_coverage_pct:records?100*eligible/records:null})
  }
  const source={table:binding.itemizedTable,delta_version:0,policy:'so1_same_population_gross_margin_v1',
    sql_sha256:createHash('sha256').update(SO1_FINANCIAL_SQL).digest('hex'),
    rows_sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex'),rows:rows.length,
    margin_eligible_records:totalEligible,records:totalRecords,source_reconciled:true,
    contracts_excluded:true,financial_release_approved:false,model_publication_approved:false}
  return {values,source}
}
export async function readSo1Financial(payload:So1Package,execute=executeDatabricksStatement){
  return reconcileSo1Financial(payload,(await execute(SO1_FINANCIAL_SQL,{rowLimit:10001})).rows)
}
export const missingSo1Financial:So1FinancialMonth={gross_profit_php:null,margin_revenue_basis_php:null,
  margin_eligible_records:0,margin_pct:null,margin_record_coverage_pct:null}

export function enrichSo1Financial(view:ReturnType<typeof so1View>,payload:So1Package,financial:ReturnType<typeof reconcileSo1Financial>){
  const enrich=(row:So1Month)=>({...row,...(financial.values.get(view.scope.area+'|'+row.period)??missingSo1Financial)})
  const months=view.months.map(enrich)
  const series=payload.series.find(s=>s.area===view.scope.area)!.months.map(enrich)
  const financialYoy=view.yoy.map(pair=>{
    const common=Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')).filter(m=>
      (series.find(r=>r.period===pair.base_year+'-'+m)?.margin_eligible_records??0)>0&&
      (series.find(r=>r.period===pair.target_year+'-'+m)?.margin_eligible_records??0)>0)
    const base=summarizeSo1Financial(series.filter(r=>r.period.startsWith(pair.base_year+'-')&&common.includes(r.period.slice(5))))
    const target=summarizeSo1Financial(series.filter(r=>r.period.startsWith(pair.target_year+'-')&&common.includes(r.period.slice(5))))
    return {base_year:pair.base_year,target_year:pair.target_year,common_margin_months:common,base,target,
      gross_profit_change_php:base.gross_profit_php!==null&&target.gross_profit_php!==null?target.gross_profit_php-base.gross_profit_php:null}
  })
  return {...view,months,financial_summary:summarizeSo1Financial(months),financial_yoy:financialYoy}
}
