/** Read-only catalog/API reconciliation against the reviewed predecessor. */
import 'dotenv/config'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {descriptiveRelease,getDatabricksSalesSectors,getDatabricksSalesHeatmap} from '../src/databricksDashboard'
import {executeDatabricksStatement} from '../src/databricks'
import {catalogProducts} from '../src/catalogContract'

async function main() {
  const release=await descriptiveRelease()
  const table='workspace.medshield_gold.sales_restart_fact_candidate'
  const fact=`${table} VERSION AS OF ${release.fact_delta_version}`
  const checks: Record<string,unknown>={}
  const queries: unknown[]=[]
  async function query(sql:string) {
    const result=await executeDatabricksStatement(sql,{rowLimit:1000,timeoutMs:120000})
    queries.push({sql,rows:result.rows})
    return result.rows
  }
  const baseline=16
  const fields=['product_key','product_raw','quantity','net_sales','gross_sales','gross_margin_amount','total_acquisition_cost',
    'date_delivered','is_net_sales_eligible','is_gross_sales_eligible','is_gross_margin_eligible','is_acquisition_cost_eligible',
    'is_quantity_observation_eligible','source_file_sha256','is_adjusted_source']
  const differences=await query(`SELECT COUNT(*) AS n FROM ${table} VERSION AS OF ${baseline} b FULL OUTER JOIN ${fact} f ON b.source_record_id=f.source_record_id
    WHERE b.source_record_id IS NULL OR f.source_record_id IS NULL OR ${fields.map(f=>`NOT(b.${f} <=> f.${f})`).join(' OR ')}`)
  assert.equal(differences[0].n,'0')
  checks.source_financial_eligibility='PASS exact source-record comparison'
  const duplicate=await query(`SELECT source_record_id FROM ${fact} GROUP BY source_record_id HAVING COUNT(*)<>1`)
  assert.equal(duplicate.length,0)
  const monthly=await query(`SELECT CAST(month_start AS STRING) AS period, COUNT(*) AS records, SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales FROM ${fact} GROUP BY month_start ORDER BY month_start`)
  checks.monthly=monthly
  if(release.policy_version==='sales_restart_gold_v7_independent_catalog') {
    const bad=await query(`SELECT COUNT(*) AS n FROM ${fact} WHERE is_approved_medical_demand_eligible AND
      (transaction_evidence='adjusted_estimated_source' OR identity_status<>'approved' OR item_kind<>'physical_product' OR NOT forecast_eligible)`)
    assert.equal(bad[0].n,'0')
    const partitions=await query(`WITH p AS (SELECT month_start,display_category,SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS revenue FROM ${fact} GROUP BY ALL),
      c AS (SELECT month_start,SUM(revenue) AS revenue FROM p GROUP BY month_start),
      t AS (SELECT month_start,SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS revenue FROM ${fact} GROUP BY month_start)
      SELECT COUNT(*) AS n FROM c FULL OUTER JOIN t USING(month_start) WHERE NOT(c.revenue <=> t.revenue)`)
    assert.equal(partitions[0].n,'0')
    checks.warehouse_catalog='PASS'
  } else checks.warehouse_catalog='NOT_DEPLOYED: legacy release compatibility only'
  const data=await getDatabricksSalesSectors()
  const heatmap=await getDatabricksSalesHeatmap()
  const products=catalogProducts(data.rows,'All',50000)
  assert.equal(data.source.release?.fact_delta_version,release.fact_delta_version)
  assert.equal(heatmap.source.release?.fact_delta_version,release.fact_delta_version)
  const total=data.rows.reduce((n,r)=>n+(r.revenue??0),0)
  assert.ok(Math.abs(total-Number(monthly.reduce((n,r)=>n+Number(r.net_sales||0),0)))<.01)
  assert.ok(Math.abs(total-products.products.reduce((n,r)=>n+(r.revenue??0),0))<.01)
  assert.ok(data.rows.every(r=>/^(SKU|RAW):.+/.test(r.canonical_group_id||'')))
  const categoryTotal=['Medical','Non-Medical','Unclassified'].reduce((n,category)=>n+catalogProducts(data.rows,category,50000).products.reduce((s,r)=>s+(r.revenue??0),0),0)
  assert.ok(Math.abs(total-categoryTotal)<.01)
  assert.ok(heatmap.daily.filter(r=>r.transaction_evidence==='adjusted_estimated_source').every(r=>r.quantity===null))
  checks.api={status:'PASS',net_sales:total,records:data.rows.reduce((n,r)=>n+r.row_count,0),product_groups:products.product_count,
    unresolved_revenue:products.unresolved_revenue,heatmap_rows:heatmap.daily.length}
  const output=resolve('../outputs/catalog_validation',new Date().toISOString().replace(/[:.]/g,'-'))
  mkdirSync(output,{recursive:true})
  const payload=JSON.stringify({release,baseline,checks,queries,mode:'read-only',approved:false},null,2)+'\n'
  writeFileSync(resolve(output,'evidence.json'),payload)
  writeFileSync(resolve(output,'evidence.sha256'),createHash('sha256').update(payload).digest('hex')+'\n')
  console.log(JSON.stringify({output,release,checks:{...checks,monthly:monthly.length+' months'}},null,2))
}
main().catch(error=>{console.error(error);process.exitCode=1})
