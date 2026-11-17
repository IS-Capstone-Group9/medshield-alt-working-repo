import 'dotenv/config'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {descriptiveRelease,loadDatabricksDashboardSnapshot,getDatabricksSalesSummary,getDatabricksSalesStatus,
  getDatabricksSalesTransactions,getDatabricksSalesSectors,getDatabricksSalesDiagnostics,getDatabricksStl,
  getDatabricksSalesHeatmap,getDatabricksForecastValidation,getDatabricksPlanningShortlist} from '../src/databricksDashboard'
import {getItemizedPreview,decimalMicros} from '../src/itemizedPreview'
process.env.DATABRICKS_DESCRIPTIVE_ADAPTER='original_itemized_v1'
const output='../outputs/original_dashboard_20261026'
async function main(){
  mkdirSync(output,{recursive:true})
  const report:Record<string,unknown>={checked_at:new Date().toISOString(),warehouse_writes:0,mode:'module verification before profile activation'}
  let stage='release'
  try{
    const release=await descriptiveRelease()
    stage='snapshot and all-scope summary'
    const [snapshot,summary,status]=await Promise.all([loadDatabricksDashboardSnapshot(),getDatabricksSalesSummary({}),getDatabricksSalesStatus()])
    assert.equal(snapshot.totals.total_transactions,40171)
    assert.equal(summary.counts.rows,40171);assert.equal(summary.sums.net_cost,638015351.53)
    assert.equal(status.quality_summary.rows_accepted,40171)
    const near=(actual:number|null,expected:number)=>assert.ok(actual!=null&&Math.abs(actual-expected)<.000001)
    near(snapshot.totals.total_revenue,638015351.53)
    assert.equal(summary.sums.quantity,null)
    Object.assign(report,{release,all_scope:{records:summary.counts.rows,net:summary.sums.net_cost,gross_margin:summary.sums.net_income,quantity:summary.sums.quantity},years:snapshot.year_summary,monthly_points:snapshot.monthly.length})
    stage='filtered ledger and preview parity'
    const filters={year:'2025',category:'Medical' as const,area:'QUEZON'}
    const [selected,ledger,medicine,supply,equipment]=await Promise.all([
      getDatabricksSalesSummary(filters),getDatabricksSalesTransactions({...filters,page:1,pageSize:100}),
      getItemizedPreview({year:'2025',area:'QUEZON',category:'medicine'}),
      getItemizedPreview({year:'2025',area:'QUEZON',category:'medical_supply'}),
      getItemizedPreview({year:'2025',area:'QUEZON',category:'medical_equipment'})])
    const expected=[medicine,supply,equipment].reduce((sum,view)=>sum+decimalMicros(view.summary.net_sales??'0'),0n)
    near(selected.sums.net_cost,Number(expected)/1e6)
    assert.equal(ledger.pagination.total_rows,selected.counts.rows)
    assert.ok(ledger.rows.every(row=>row.year===2025&&row.raw_area==='QUEZON'&&row.is_quantity_observation_eligible===false))
    report.filtered={filters,rows:selected.counts.rows,net:selected.sums.net_cost,preview_net_match:true,ledger_match:true}
    stage='product and area catalog'
    const catalog=await getDatabricksSalesSectors('All')
    assert.equal(catalog.rows.length,40171)
    const catalogNet=catalog.rows.reduce((sum,row)=>sum+decimalMicros(String(row.revenue??0)),0n)
    report.catalog_controls={exact_net_micros:String(catalogNet),category_approved:catalog.rows.filter(row=>row.category_status==='approved').length,
      unapproved_identity:catalog.rows.filter(row=>row.identity_status==='needs_review').length,unknown_quantity:catalog.rows.filter(row=>row.observed_quantity===null).length}
    assert.equal(catalogNet,decimalMicros('638015351.53'),'Catalog exact signed net differs')
    assert.ok(catalog.rows.every(row=>row.identity_status==='needs_review'&&row.category_status==='approved'&&row.observed_quantity===null),'Catalog category, identity or unit status differs')
    report.catalog={records:catalog.rows.length,all_net_reconciled:true,categories_accepted:true,sku_units_unapproved:true}
    stage='diagnostic period and category filters'
    const diagnostic=await getDatabricksSalesDiagnostics({startDate:'2025-01-01',endDate:'2025-12-31',category:'Medical',area:'QUEZON'})
    report.diagnostic={source:diagnostic.source.view,scope:diagnostic.scope}
    stage='dependent capabilities'
    const stl=await getDatabricksStl()
    assert.equal(stl.rows.length,81);assert.equal(stl.release.dataset_id,release.dataset_id)
    await assert.rejects(getDatabricksSalesHeatmap(),/quantity heatmap unavailable/)
    const forecast=await getDatabricksForecastValidation({sector:'All'})
    assert.equal(forecast.source.release?.dataset_id,release.dataset_id)
    assert.equal(forecast.publication_status,'unpublished')
    const planning=await getDatabricksPlanningShortlist({sector:'All',territory:'all'})
    assert.ok(planning.products.every(row=>row.quantity===null))
    report.capabilities={old_stl_withheld:true,original_itemized_stl_connected:true,unapproved_physical_heatmap_withheld:true,net_benchmarks_recomputed:true,
      benchmark_status:forecast.status,benchmark_origin:forecast.origin,planning_source_bound:true,planning_quantities:null}
    report.status='PASS_ORIGINAL_DASHBOARD_MODULES'
  }catch(error){Object.assign(report,{status:'FAILED',stage,error_type:error instanceof Error?error.name:'unknown',provider_code:error instanceof Error?error.message.match(/HTTP \d{3}|\[[A-Z_\.]+\]/)?.[0]:undefined,assertion:error instanceof assert.AssertionError?error.message.split('\n')[0]:undefined});process.exitCode=1}
  writeFileSync(output+'/live-modules.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
}
main().catch(()=>{console.error('Could not retain dashboard verification report.');process.exitCode=1})
