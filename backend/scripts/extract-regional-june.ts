import 'dotenv/config'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {executeDatabricksStatement} from '../src/databricks'
import {readOriginalItemizedRelease} from '../src/originalItemizedSource'
import {ITEMIZED_PREVIEW_BINDING} from '../src/itemizedPreviewBinding'

// Read-only June comparison; recorded labels are the previously confirmed CALABARZON cohort.
async function main(){
  const release=await readOriginalItemizedRelease()
  assert.equal(release.dataset_id,ITEMIZED_PREVIEW_BINDING.datasetId)
  const table=ITEMIZED_PREVIEW_BINDING.itemizedTable.split('.').map(p=>'`'+p+'`').join('.')
  const population=`record_kind='itemized_sale' AND area IN ('BATANGAS','CAVITE','LAGUNA','LOWER CAVITE','QUEZON') AND
    ((date_delivered BETWEEN DATE '2025-06-01' AND DATE '2025-06-30') OR
     (date_delivered BETWEEN DATE '2026-06-01' AND DATE '2026-06-30'))`
  const detailSql=`SELECT source_record_id,source_workbook,source_file_sha256,source_row_number,area,
    normalized_product,CAST(date_delivered AS STRING) AS date,source_data_status,
    CAST(net_sales AS STRING) AS net_sales,CAST(acquisition_cost AS STRING) AS acquisition_cost,
    CAST(gross_margin_amount AS STRING) AS gross_margin_amount,
    is_net_sales_technically_eligible,is_gross_margin_technically_eligible,quality_rule_codes_json
    FROM ${table} VERSION AS OF 0 WHERE ${population} ORDER BY date_delivered,area,source_record_id`
  const controlsSql=`SELECT area,YEAR(date_delivered) AS year,COUNT(*) AS records,
    SUM(CASE WHEN is_net_sales_technically_eligible THEN 1 ELSE 0 END) AS net_records,
    CAST(SUM(CASE WHEN is_net_sales_technically_eligible THEN net_sales END) AS STRING) AS net_sales,
    SUM(CASE WHEN is_gross_margin_technically_eligible THEN 1 ELSE 0 END) AS margin_records,
    CAST(SUM(CASE WHEN is_gross_margin_technically_eligible THEN gross_margin_amount END) AS STRING) AS gross_profit,
    CAST(SUM(CASE WHEN is_gross_margin_technically_eligible THEN net_sales END) AS STRING) AS margin_basis
    FROM ${table} VERSION AS OF 0 WHERE ${population} GROUP BY area,YEAR(date_delivered) ORDER BY area,year`
  const detail=await executeDatabricksStatement(detailSql,{rowLimit:10000})
  const controls=await executeDatabricksStatement(controlsSql,{rowLimit:100})
  assert.ok(detail.rows.length>0&&detail.rows.length<10000)
  assert.ok(controls.rows.length>0&&controls.rows.length<100)
  assert.equal(new Set(detail.rows.map(r=>r.source_record_id)).size,detail.rows.length)
  assert.deepEqual(await readOriginalItemizedRelease(),release)
  const output=resolve('../outputs/regional_june_review_20261028');mkdirSync(output,{recursive:true})
  const receipt={status:'READ_ONLY_REGIONAL_JUNE_REVIEW',generated_at:new Date().toISOString(),release,population,
    detail,controls,detail_sql:detailSql,controls_sql:controlsSql,
    extractor_sha256:createHash('sha256').update(readFileSync(resolve('scripts/extract-regional-june.ts'))).digest('hex'),
    warehouse_writes:0,source_files_modified:false,approvals_created:0,models_trained:0}
  const bytes=JSON.stringify(receipt,null,2)+'\n'
  writeFileSync(resolve(output,'source.json'),bytes,{flag:'wx'})
  writeFileSync(resolve(output,'source.sha256'),createHash('sha256').update(bytes).digest('hex')+'\n',{flag:'wx'})
  console.log(JSON.stringify({status:receipt.status,records:detail.rows.length,control_groups:controls.rows.length,warehouse_writes:0}))
}
main().catch(error=>{console.error(error instanceof Error?error.message:'June extraction failed');process.exitCode=1})
