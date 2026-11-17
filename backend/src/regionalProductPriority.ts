import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {executeDatabricksStatement} from './databricks'
import {databricksLiteral} from './databricksLiteral'
import {decimalMicros} from './itemizedPreview'
import {ITEMIZED_PREVIEW_BINDING as binding} from './itemizedPreviewBinding'
import {microsText, REGIONAL_BINDING, type readRegionalReview} from './regionalSalesReview'

type Financial = Awaited<ReturnType<typeof readRegionalReview>>
type Row = Record<string,string|null>
export const PRIORITY_POLICY = 'matched_regional_recorded_product_net_sales_v1'
const REGIONS = ['CALABARZON','MIMAROPA','BICOL'] as const
type Region = typeof REGIONS[number]
export type PriorityProduct = {
  product:string; target_net_sales_php:string; base_net_sales_php:string|null;
  change_php:string|null; target_records:number; base_records:number;
  target_observed_months:number; base_observed_months:number;
}
export type RegionalProductPriority = {
  schema_version:'regional_recorded_product_priority_v1'; policy:string;
  source:Financial['source']; query_sha256:string; aggregate_sha256:string;
  base_year:number; target_year:number;
  product_identity_approved:false; units_approved:false; clinical_priority:false;
  financial_publication_approved:false; procurement_execution_approved:false;
  regions:Array<{
    region:Region; status:'available'|'unavailable'; matched_months:string[];
    base_net_sales_php:string|null; target_net_sales_php:string|null;
    base_unreviewed_records:number|null; target_unreviewed_records:number|null;
    positive_product_net_sales_php:string|null; nonpositive_product_net_sales_php:string|null;
    recorded_products:number; positive_products:number; top_products:PriorityProduct[];
  }>;
}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex')
const integer=(v:string|null)=>{assert.match(v??'',/^\d+$/);const n=Number(v);assert.ok(Number.isSafeInteger(n));return n}

function sourceCheck(financial:Financial){
  assert.equal(financial.status,'user_confirmed_regional_financial_review')
  assert.equal(financial.source.dataset_id,binding.datasetId)
  assert.equal(financial.source.fact_table,binding.itemizedTable)
  assert.equal(financial.source.fact_version,0)
  assert.equal(financial.source.policy_version,binding.policy)
  assert.equal(financial.source.mapping_sha256,REGIONAL_BINDING.mappingSha256)
  assert.equal(financial.source.current_monthly_sha256,REGIONAL_BINDING.monthlySha256)
  assert.equal(financial.scope.contracts_excluded,true)
  assert.equal(financial.scope.financial_publication_approved,false)
  assert.match(financial.source.calendar_end,/^\d{4}-(0[1-9]|1[0-2])$/)
  assert.equal(financial.mappings.length,9)
  assert.equal(new Set(financial.mappings.map((m:{recorded_label:string})=>m.recorded_label)).size,9)
  assert.ok(financial.mappings.every((m:{region:string})=>REGIONS.includes(m.region as Region)))
}

/** Read only the pinned fact; SQL values are encoded literals, never identifiers. */
export function regionalProductPrioritySql(financial:Financial){
  sourceCheck(financial)
  const year=Number(financial.source.calendar_end.slice(0,4))
  assert.ok(year>=2017&&year<9999)
  return `SELECT area,DATE_FORMAT(date_delivered,'yyyy-MM') AS period,normalized_product AS product,
    COUNT(*) AS records,COUNT_IF(is_net_sales_technically_eligible) AS net_eligible_records,
    COUNT_IF(is_gross_margin_technically_eligible) AS margin_eligible_records,
    COUNT_IF(source_data_status='UNREVIEWED_SOURCE_EXPORT') AS unreviewed_records,
    CAST(SUM(CASE WHEN is_net_sales_technically_eligible THEN net_sales END) AS STRING) AS net_sales_php,
    CAST(SUM(CASE WHEN is_gross_margin_technically_eligible THEN gross_margin_amount END) AS STRING) AS gross_profit_php,
    CAST(SUM(CASE WHEN is_gross_margin_technically_eligible THEN net_sales END) AS STRING) AS margin_revenue_basis_php,
    COUNT_IF(is_gross_margin_technically_eligible AND (gross_margin_amount IS NULL OR net_sales IS NULL)) AS invalid_margin_pairs
    FROM ${binding.itemizedTable.split('.').map(p=>'`'+p+'`').join('.')} VERSION AS OF 0
    WHERE record_kind='itemized_sale' AND area IN (${financial.mappings.map((m:{recorded_label:string})=>databricksLiteral(m.recorded_label)).join(',')})
    AND date_delivered>=CAST(${databricksLiteral((year-1)+'-01-01')} AS DATE)
    AND date_delivered<CAST(${databricksLiteral((year+1)+'-01-01')} AS DATE)
    GROUP BY area,DATE_FORMAT(date_delivered,'yyyy-MM'),normalized_product ORDER BY area,period,product`
}

/** Reconcile complete regional/month controls before ranking any recorded product label. */
export function validateRegionalProductPriority(financial:Financial,rows:Row[]):RegionalProductPriority{
  const sql=regionalProductPrioritySql(financial),targetYear=Number(financial.source.calendar_end.slice(0,4)),baseYear=targetYear-1
  assert.ok(rows.length<50_000)
  const mapping=new Map<string,Region>(financial.mappings.map((m:{recorded_label:string;region:Region})=>[m.recorded_label,m.region]))
  type Detail={region:Region;period:string;product:string|null;net_eligible_records:number;net_sales_php:string|null}
  const detail:Detail[]=[],seen=new Set<string>()
  const controls=new Map<string,{records:number;net_eligible_records:number;margin_eligible_records:number;unreviewed_records:number;net:bigint;profit:bigint;basis:bigint}>()
  for(const row of rows){
    assert.ok(row.area&&mapping.has(row.area));assert.match(row.period??'',/^\d{4}-(0[1-9]|1[0-2])$/)
    assert.ok([baseYear,targetYear].includes(Number(row.period!.slice(0,4))))
    const region=mapping.get(row.area!)!,key=JSON.stringify([row.area,row.period,row.product]);assert.ok(!seen.has(key));seen.add(key)
    const records=integer(row.records),net=integer(row.net_eligible_records),margin=integer(row.margin_eligible_records),unreviewed=integer(row.unreviewed_records)
    assert.ok(records>0&&net<=records&&margin<=net&&unreviewed<=records);assert.equal(integer(row.invalid_margin_pairs),0)
    assert.equal(row.net_sales_php===null,net===0);assert.equal(row.gross_profit_php===null,margin===0);assert.equal(row.margin_revenue_basis_php===null,margin===0)
    assert.ok(row.product===null||typeof row.product==='string'&&row.product.length<=1000&&!/[\u0000-\u001f]/.test(row.product))
    if(net)assert.ok(typeof row.product==='string'&&row.product.trim().length>0)
    const c=controls.get(region+'|'+row.period)??{records:0,net_eligible_records:0,margin_eligible_records:0,unreviewed_records:0,net:0n,profit:0n,basis:0n}
    c.records+=records;c.net_eligible_records+=net;c.margin_eligible_records+=margin;c.unreviewed_records+=unreviewed
    c.net+=row.net_sales_php===null?0n:decimalMicros(row.net_sales_php)
    c.profit+=row.gross_profit_php===null?0n:decimalMicros(row.gross_profit_php)
    c.basis+=row.margin_revenue_basis_php===null?0n:decimalMicros(row.margin_revenue_basis_php)
    controls.set(region+'|'+row.period,c)
    detail.push({region,period:row.period!,product:row.product,net_eligible_records:net,net_sales_php:row.net_sales_php})
  }
  const expected=financial.months.filter(m=>REGIONS.includes(m.region as Region)&&[baseYear,targetYear].includes(Number(m.period.slice(0,4))))
  assert.equal(controls.size,expected.length)
  for(const month of expected){
    const c=controls.get(month.region+'|'+month.period);assert.ok(c)
    for(const field of ['records','net_eligible_records','margin_eligible_records','unreviewed_records'] as const)assert.equal(c[field],month[field])
    for(const [field,total] of [['net_sales_php',c.net],['gross_profit_php',c.profit],['margin_revenue_basis_php',c.basis]] as const){
      const actual=month[field];assert.equal(actual===null?null:decimalMicros(actual),actual===null?null:total)
    }
  }
  const regions=REGIONS.map(region=>{
    const available=expected.filter(m=>m.region===region&&m.net_sales_php!==null)
    const base=new Set(available.filter(m=>m.period.startsWith(baseYear+'-')).map(m=>m.period.slice(5)))
    const matched=available.filter(m=>m.period.startsWith(targetYear+'-')&&base.has(m.period.slice(5))).map(m=>m.period.slice(5)).sort()
    const products=new Map<string,Detail[]>()
    for(const d of detail.filter(d=>d.region===region&&d.net_eligible_records>0&&matched.includes(d.period.slice(5)))){
      const list=products.get(d.product!)??[];list.push(d);products.set(d.product!,list)
    }
    const aggregate=[...products].map(([product,values])=>{
      const summarise=(year:number)=>{const v=values.filter(d=>d.period.startsWith(year+'-'));return {net:v.length?v.reduce((sum,d)=>sum+decimalMicros(d.net_sales_php!),0n):null,records:v.reduce((sum,d)=>sum+d.net_eligible_records,0),months:new Set(v.map(d=>d.period)).size}}
      return {product,base:summarise(baseYear),target:summarise(targetYear)}
    })
    const positive=aggregate.filter(p=>p.target.net!==null&&p.target.net>0n).sort((a,b)=>a.target.net===b.target.net?a.product<b.product?-1:a.product>b.product?1:0:a.target.net!>b.target.net!?-1:1)
    const sum=(year:number)=>{const ms=available.filter(m=>m.period.startsWith(year+'-')&&matched.includes(m.period.slice(5)));return matched.length?microsText(ms.reduce((s,m)=>s+decimalMicros(m.net_sales_php!),0n)):null}
    const unreviewed=(year:number)=>matched.length?expected.filter(m=>m.region===region&&m.period.startsWith(year+'-')&&matched.includes(m.period.slice(5))).reduce((sum,m)=>sum+m.unreviewed_records,0):null
    return {region,status:matched.length&&positive.length?'available' as const:'unavailable' as const,matched_months:matched,
      base_net_sales_php:sum(baseYear),target_net_sales_php:sum(targetYear),
      base_unreviewed_records:unreviewed(baseYear),target_unreviewed_records:unreviewed(targetYear),
      positive_product_net_sales_php:matched.length?microsText(positive.reduce((s,p)=>s+p.target.net!,0n)):null,
      nonpositive_product_net_sales_php:matched.length?microsText(aggregate.filter(p=>p.target.net!==null&&p.target.net<=0n).reduce((s,p)=>s+p.target.net!,0n)):null,
      recorded_products:aggregate.length,positive_products:positive.length,
      top_products:positive.slice(0,5).map(p=>({product:p.product,target_net_sales_php:microsText(p.target.net!),base_net_sales_php:p.base.net===null?null:microsText(p.base.net),
        change_php:p.base.net===null?null:microsText(p.target.net!-p.base.net),target_records:p.target.records,base_records:p.base.records,target_observed_months:p.target.months,base_observed_months:p.base.months}))}
  })
  return {schema_version:'regional_recorded_product_priority_v1',policy:PRIORITY_POLICY,source:{...financial.source},query_sha256:hash(sql),aggregate_sha256:hash(JSON.stringify(rows)),base_year:baseYear,target_year:targetYear,
    product_identity_approved:false,units_approved:false,clinical_priority:false,financial_publication_approved:false,procurement_execution_approved:false,regions}
}

export async function readRegionalProductPriority(financial:Financial,execute=executeDatabricksStatement){
  const rows=await execute(regionalProductPrioritySql(financial),{rowLimit:50_000})
  return validateRegionalProductPriority(financial,rows.rows)
}
