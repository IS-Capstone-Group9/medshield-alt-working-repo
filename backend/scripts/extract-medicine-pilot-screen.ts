import 'dotenv/config'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {executeDatabricksStatement} from '../src/databricks'
import {readOriginalItemizedRelease} from '../src/originalItemizedSource'
import {ITEMIZED_PREVIEW_BINDING} from '../src/itemizedPreviewBinding'

async function main(){
  const output=resolve('../outputs/original_medicine_screen_20261027')
  const release=await readOriginalItemizedRelease()
  assert.equal(release.dataset_id,ITEMIZED_PREVIEW_BINDING.datasetId)
  const table=ITEMIZED_PREVIEW_BINDING.itemizedTable.split('.').map(p=>'`'+p+'`').join('.')
  const base=`${table} VERSION AS OF 0`
  const measures=`COUNT(*) AS records,
    SUM(CASE WHEN is_net_sales_technically_eligible THEN 1 ELSE 0 END) AS net_records,
    CAST(SUM(CASE WHEN is_net_sales_technically_eligible THEN net_sales END) AS STRING) AS net_sales,
    SUM(CASE WHEN recorded_quantity > 0 THEN 1 ELSE 0 END) AS positive_quantity_records,
    SUM(CASE WHEN recorded_quantity < 0 THEN 1 ELSE 0 END) AS negative_quantity_records,
    SUM(CASE WHEN recorded_quantity = 0 THEN 1 ELSE 0 END) AS zero_quantity_records,
    SUM(CASE WHEN recorded_quantity IS NULL THEN 1 ELSE 0 END) AS missing_quantity_records,
    SUM(CASE WHEN source_unit_approved THEN 1 ELSE 0 END) AS unit_approved_records,
    SUM(CASE WHEN physical_quantity IS NOT NULL THEN 1 ELSE 0 END) AS physical_quantity_records,
    SUM(CASE WHEN forecast_eligible THEN 1 ELSE 0 END) AS forecast_eligible_records,
    SUM(CASE WHEN source_data_status='UNREVIEWED_SOURCE_EXPORT' THEN 1 ELSE 0 END) AS unreviewed_records`
  const queries={
    all_source:`SELECT ${measures},CAST(MIN(date_delivered) AS STRING) AS first_date,CAST(MAX(date_delivered) AS STRING) AS last_date FROM ${base}`,
    categories:`SELECT product_category,${measures} FROM ${base} GROUP BY product_category ORDER BY product_category`,
    medicine_controls:`SELECT YEAR(date_delivered) AS year,${measures} FROM ${base}
      WHERE record_kind='itemized_sale' AND product_category='medicine' GROUP BY YEAR(date_delivered) ORDER BY year`,
    medicine_months:`SELECT product_key,normalized_product,area AS raw_area,
      DATE_FORMAT(date_delivered,'yyyy-MM') AS month,${measures} FROM ${base}
      WHERE record_kind='itemized_sale' AND product_category='medicine'
      GROUP BY product_key,normalized_product,area,DATE_FORMAT(date_delivered,'yyyy-MM')
      ORDER BY product_key,raw_area,month`,
    trivasc_detail:`SELECT source_record_id,source_workbook,source_file_sha256,source_row_number,
      normalized_product,area AS raw_area,CAST(date_delivered AS STRING) AS date,
      CAST(recorded_quantity AS STRING) AS recorded_quantity,
      CAST(gross_sales AS STRING) AS gross_sales,CAST(net_sales AS STRING) AS net_sales,
      CAST(acquisition_cost AS STRING) AS acquisition_cost,
      is_gross_sales_technically_eligible,is_net_sales_technically_eligible,is_acquisition_cost_technically_eligible,
      source_data_status,source_unit_approved,quality_rule_codes_json FROM ${base}
      WHERE record_kind='itemized_sale' AND normalized_product IN ('TRIVASC 35MG MR','TRIVASC 35MG')
      ORDER BY normalized_product,raw_area,date_delivered,source_record_id`,
  }
  const results:Record<string,unknown>={}
  for(const [name,sql] of Object.entries(queries)){
    const result=await executeDatabricksStatement(sql,{rowLimit:50000})
    assert.ok(result.rows.length<50000,name+': reached extraction bound')
    results[name]={sql,sql_sha256:createHash('sha256').update(sql).digest('hex'),...result}
  }
  assert.deepEqual(await readOriginalItemizedRelease(),release,'Original source changed during screen')
  const evidencePaths=['outputs/descriptive_closure_20261017/unit-review-decisions.json',
    'outputs/descriptive_closure_20261017/batch-unit-evidence.json',
    'outputs/pilot_evidence_step3_20261017/box-price-comparison.json',
    'outputs/trivasc_box_forecast_20261025/results.json','outputs/trivasc_box_forecast_20261025/README.md']
  const evidence=Object.fromEntries(evidencePaths.map(path=>[path,createHash('sha256').update(readFileSync(resolve('..',path))).digest('hex')]))
  const receipt={status:'READ_ONLY_ORIGINAL_MEDICINE_HISTORY_AND_UNIT_SCREEN',generated_at:new Date().toISOString(),release,
    queries:results,evidence_sha256:evidence,extractor_sha256:createHash('sha256').update(readFileSync(resolve('scripts/extract-medicine-pilot-screen.ts'))).digest('hex'),
    contracts_excluded:true,geography_status:'exact_recorded_area_not_verified_territory',warehouse_writes:0,
    source_files_modified:false,approvals_created:0,models_trained:0}
  const bytes=JSON.stringify(receipt,null,2)+'\n'
  mkdirSync(output,{recursive:true});writeFileSync(resolve(output,'source.json'),bytes,{flag:'wx'})
  writeFileSync(resolve(output,'source.sha256'),createHash('sha256').update(bytes).digest('hex')+'\n',{flag:'wx'})
  console.log(JSON.stringify({status:receipt.status,query_rows:Object.fromEntries(Object.entries(results).map(([k,v])=>[k,(v as {rows:unknown[]}).rows.length])),warehouse_writes:0}))
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Medicine screen failed');process.exitCode=1})
