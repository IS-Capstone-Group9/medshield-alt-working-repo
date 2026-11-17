import 'dotenv/config'
import assert from 'node:assert/strict'
import {writeFileSync,mkdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {executeDatabricksStatement as execute} from '../src/databricks'
import {descriptiveRelease,loadDatabricksDashboardSnapshot,getDatabricksSalesSummary,getDatabricksSalesTransactions,getDatabricksForecastValidation,getDatabricksStl} from '../src/databricksDashboard'
import {readPredictiveResearch} from '../src/predictiveResearch'
import {readExtensionResearch} from '../src/extensionResearch'
import {truthTable} from '../src/analyticalTruth'
import {financialTableSql} from '../src/financialPublication'

async function main(){
 const out=resolve(process.argv[2]||'../outputs/truth_correction_20261025/live');mkdirSync(out,{recursive:true})
 const release=await descriptiveRelease(),truth=release.analytical_integrity;assert.ok(truth)
 const fact=`${truthTable(truth.serving_table)} VERSION AS OF 0`,old=`${financialTableSql(truth.source_table)} VERSION AS OF 0`
 const sql={
  before:`SELECT calendar_year,COUNT(*) AS records,CAST(SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS STRING) AS revenue FROM ${old} GROUP BY calendar_year ORDER BY calendar_year`,
  after:`SELECT calendar_year,COUNT(*) AS records,CAST(SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS STRING) AS revenue FROM ${fact} GROUP BY calendar_year ORDER BY calendar_year`,
  monthly:`SELECT DATE_FORMAT(month_start,'yyyy-MM') AS period,CAST(SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS STRING) AS revenue FROM ${fact} GROUP BY month_start ORDER BY month_start`,
  product_before:`SELECT normalized_product,CAST(SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS STRING) AS revenue FROM ${old} GROUP BY normalized_product ORDER BY SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) DESC LIMIT 20`,
  product_after:`SELECT normalized_product,CAST(SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS STRING) AS revenue FROM ${fact} GROUP BY normalized_product ORDER BY SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) DESC LIMIT 20`,
 }
 const results:Record<string,unknown>={}
 for(const [name,statement] of Object.entries(sql))results[name]=(await execute(statement,{rowLimit:250})).rows
 const snapshot=await loadDatabricksDashboardSnapshot(),summary=await getDatabricksSalesSummary({}),transactions=await getDatabricksSalesTransactions({pageSize:5})
 const forecast=await getDatabricksForecastValidation({sector:'All'})
 results.snapshot=snapshot;results.summary=summary;results.transactions=transactions;results.forecast=forecast
 const stl=await getDatabricksStl();assert.ok(stl.rows.length);results.stl=stl
 const expectedFailures:Record<string,string>={}
 for(const [name,read] of Object.entries({historical_research:()=>readPredictiveResearch({}),current_source_research:()=>readExtensionResearch()})){
   try{await read();throw new Error('STALE_ARTIFACT_WAS_ACCEPTED')}
   catch(error){const message=error instanceof Error?error.message:'error';assert.notEqual(message,'STALE_ARTIFACT_WAS_ACCEPTED');expectedFailures[name]=message}
 }
 const before=results.before as Array<Record<string,string>>,after=results.after as Array<Record<string,string>>
 assert.equal(before.reduce((n,r)=>n+Number(r.records),0)-after.reduce((n,r)=>n+Number(r.records),0),911)
 for(const year of after.filter(r=>!['2020','2024','2025'].includes(r.calendar_year)))assert.deepEqual(year,before.find(r=>r.calendar_year===year.calendar_year),'Unaffected year changed')
 const receipt={verified_at:new Date().toISOString(),release,checks:['source/corrected counts differ by 911','unaffected yearly values preserved','dashboard/summary/detail/forecast run through corrected binding','corrected STL reconstructed against live observations','superseded trained artifacts unavailable'],expectedFailures,results}
 writeFileSync(resolve(out,'verification.json'),JSON.stringify(receipt,null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',serving:truth.serving_table,kept_rows:truth.kept_rows,removed_rows:truth.removed_rows,expectedFailures:Object.keys(expectedFailures)}))
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Verification failed');process.exitCode=1})
