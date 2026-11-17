import assert from 'node:assert/strict'
import {executeDatabricksStatement} from './databricks'
import {readRegionalReview,REGIONAL_SOURCE_SQL,regionalHash} from './regionalSalesReview'

/** Same pinned area-month controls and confirmed mapping as SO1; no inferred geography. */
export function buildAreaPriorityReview(regional:Awaited<ReturnType<typeof readRegionalReview>>,rows:Array<Record<string,string|null>>) {
  assert.equal(regionalHash(JSON.stringify(rows)),regional.source.current_monthly_sha256)
  const mapping=new Map(regional.mappings.map((row:{recorded_label:string;region:string})=>[row.recorded_label,row.region]))
  return {status:'confirmed_area_priority_review',regional,
    area_months:rows.map(row=>({area:row.normalized_area!,region:mapping.get(row.normalized_area!)??'UNALLOCATED',period:row.period!,
      records:Number(row.records),net_eligible_records:Number(row.net_eligible_records),margin_eligible_records:Number(row.margin_eligible_records),
      unreviewed_records:Number(row.unreviewed_records),net_sales_php:row.net_sales_php,gross_profit_php:row.gross_profit_php,margin_revenue_basis_php:row.margin_revenue_basis_php})),
    interpretation:'observed_signed_area_net_abc_not_predictive_not_inventory_slow_movers',
    account_identity_available:false,forecast_approved:false}
}
export async function readAreaPriorityReview() {
  const regional=await readRegionalReview()
  const raw=await executeDatabricksStatement(REGIONAL_SOURCE_SQL,{rowLimit:3000})
  return buildAreaPriorityReview(regional,raw.rows)
}
