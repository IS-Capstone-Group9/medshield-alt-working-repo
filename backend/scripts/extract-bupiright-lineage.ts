import 'dotenv/config'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {executeDatabricksStatement} from '../src/databricks'
import {readOriginalItemizedRelease} from '../src/originalItemizedSource'
import {ITEMIZED_PREVIEW_BINDING} from '../src/itemizedPreviewBinding'

async function main(){
  const output=resolve('../outputs/bupiright_lineage_20261027')
  const release=await readOriginalItemizedRelease()
  assert.equal(release.dataset_id,ITEMIZED_PREVIEW_BINDING.datasetId)
  const table=ITEMIZED_PREVIEW_BINDING.itemizedTable.split('.').map(p=>'`'+p+'`').join('.')+' VERSION AS OF 0'
  // Discovery roots only: these are not an identity mapping or clinical equivalence.
  const predicate="record_kind='itemized_sale' AND (normalized_product LIKE '%BUPIR%' OR normalized_product LIKE '%BUPIL%' OR normalized_product LIKE '%BUPIV%')"
  const queries={
    controls:`SELECT normalized_product,product_category,area AS raw_area,YEAR(date_delivered) AS year,
      COUNT(*) AS records,CAST(SUM(CASE WHEN is_net_sales_technically_eligible THEN net_sales END) AS STRING) AS eligible_net_sales
      FROM ${table} WHERE ${predicate} GROUP BY normalized_product,product_category,area,YEAR(date_delivered)
      ORDER BY normalized_product,product_category,raw_area,year`,
    detail:`SELECT source_record_id,source_workbook,source_file_sha256,source_row_number,
      product_key,normalized_product,product_category,area AS raw_area,CAST(date_delivered AS STRING) AS date,
      CAST(recorded_quantity AS STRING) AS recorded_quantity,CAST(gross_sales AS STRING) AS gross_sales,
      CAST(net_sales AS STRING) AS net_sales,CAST(acquisition_cost AS STRING) AS acquisition_cost,
      is_gross_sales_technically_eligible,is_net_sales_technically_eligible,is_acquisition_cost_technically_eligible,
      source_data_status,source_unit_approved,quantity_unit,CAST(physical_quantity AS STRING) AS physical_quantity,
      forecast_eligible,quality_rule_codes_json FROM ${table} WHERE ${predicate}
      ORDER BY normalized_product,raw_area,date_delivered,source_record_id`,
  }
  const results:Record<string,unknown>={}
  for(const [name,sql] of Object.entries(queries)){
    const result=await executeDatabricksStatement(sql,{rowLimit:10000})
    assert.ok(result.rows.length<10000,'Extraction reached bound')
    results[name]={sql,sql_sha256:createHash('sha256').update(sql).digest('hex'),...result}
  }
  assert.deepEqual(await readOriginalItemizedRelease(),release)
  const evidencePaths=['outputs/original_medicine_screen_20261027/source.json',
    'outputs/catalog_preparation/product_evidence/price_list_tables.json',
    'outputs/descriptive_closure_20261017/unit-review-decisions.json']
  const receipt={status:'READ_ONLY_LABEL_LINEAGE_REVIEW',generated_at:new Date().toISOString(),release,queries:results,
    evidence_sha256:Object.fromEntries(evidencePaths.map(p=>[p,createHash('sha256').update(readFileSync(resolve('..',p))).digest('hex')])),
    extractor_sha256:createHash('sha256').update(readFileSync(resolve('scripts/extract-bupiright-lineage.ts'))).digest('hex'),
    contracts_excluded:true,warehouse_writes:0,approvals_created:0,models_trained:0,aliases_merged:0}
  const bytes=JSON.stringify(receipt,null,2)+'\n'
  mkdirSync(output,{recursive:true});writeFileSync(resolve(output,'source.json'),bytes,{flag:'wx'})
  writeFileSync(resolve(output,'source.sha256'),createHash('sha256').update(bytes).digest('hex')+'\n',{flag:'wx'})
  console.log(JSON.stringify({status:receipt.status,query_rows:Object.fromEntries(Object.entries(results).map(([k,v])=>[k,(v as {rows:unknown[]}).rows.length])),warehouse_writes:0}))
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Lineage capture failed');process.exitCode=1})
