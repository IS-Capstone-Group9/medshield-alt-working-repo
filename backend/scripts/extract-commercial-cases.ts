import 'dotenv/config'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {executeDatabricksStatement} from '../src/databricks'
import {databricksLiteral} from '../src/databricksLiteral'
import {readOriginalItemizedRelease} from '../src/originalItemizedSource'
import {ITEMIZED_PREVIEW_BINDING} from '../src/itemizedPreviewBinding'

async function main(){
  const output=resolve('../outputs/commercial_case_review_20261027')
  const viewsPath=resolve('../outputs/product_commercial_review_20261027/test-views.json')
  const viewsBytes=readFileSync(viewsPath),view=JSON.parse(viewsBytes.toString())['y2026|Medical']
  const cases=new Map<string,{id:string;label:string;focuses:string[];expected:Record<string,unknown>}>()
  for(const [focus,limit] of [['declines',3],['negative_profit',100],['margin_gaps',3]] as const){
    for(const id of view.queues[focus].slice(0,limit)){
      const product=view.model.products.find((r:{id:string})=>r.id===id)
      assert.ok(product,'Missing flagged product')
      const item:{id:string;label:string;focuses:string[];expected:Record<string,unknown>}=cases.get(id)??{id,label:product.name,focuses:[],expected:product}
      item.focuses.push(focus);cases.set(id,item)
    }
  }
  assert.equal(cases.size,8,'Changed triage cohort requires explicit case review')
  const release=await readOriginalItemizedRelease()
  assert.equal(release.dataset_id,ITEMIZED_PREVIEW_BINDING.datasetId)
  const table=ITEMIZED_PREVIEW_BINDING.itemizedTable.split('.').map(p=>'`'+p+'`').join('.')
  const population=`record_kind='itemized_sale' AND normalized_product IN (${[...cases.values()].map(c=>databricksLiteral(c.label)).join(',')})
    AND ((date_delivered BETWEEN DATE '2025-01-01' AND DATE '2025-09-30')
      OR (date_delivered BETWEEN DATE '2026-01-01' AND DATE '2026-09-30'))`
  const detailSql=`SELECT source_record_id,source_workbook,source_file_sha256,source_row_number,
    product_key,normalized_product,CAST(date_delivered AS STRING) AS date,source_data_status,
    CAST(gross_sales AS STRING) AS gross_sales,CAST(discount_amount AS STRING) AS discount_amount,
    CAST(net_sales AS STRING) AS net_sales,CAST(acquisition_cost AS STRING) AS acquisition_cost,
    CAST(gross_margin_amount AS STRING) AS gross_margin_amount,
    is_net_sales_technically_eligible,is_acquisition_cost_technically_eligible,is_gross_margin_technically_eligible,
    quality_rule_codes_json FROM ${table} VERSION AS OF 0 WHERE ${population}
    ORDER BY normalized_product,date_delivered,source_record_id`
  const controlsSql=`SELECT normalized_product,YEAR(date_delivered) AS year,COUNT(*) AS records,
    SUM(CASE WHEN is_net_sales_technically_eligible THEN 1 ELSE 0 END) AS net_records,
    CAST(SUM(CASE WHEN is_net_sales_technically_eligible THEN net_sales END) AS STRING) AS net_sales,
    SUM(CASE WHEN is_gross_margin_technically_eligible THEN 1 ELSE 0 END) AS margin_records,
    CAST(SUM(CASE WHEN is_gross_margin_technically_eligible THEN gross_margin_amount END) AS STRING) AS gross_profit,
    CAST(SUM(CASE WHEN is_gross_margin_technically_eligible THEN net_sales END) AS STRING) AS margin_basis
    FROM ${table} VERSION AS OF 0 WHERE ${population} GROUP BY normalized_product,YEAR(date_delivered)
    ORDER BY normalized_product,year`
  const detail=await executeDatabricksStatement(detailSql,{rowLimit:10000})
  assert.ok(detail.rows.length>0&&detail.rows.length<10000,'Incomplete case extraction')
  const controls=await executeDatabricksStatement(controlsSql,{rowLimit:100})
  assert.ok(controls.rows.length<100,'Truncated case controls')
  assert.equal(new Set(detail.rows.map(r=>r.source_record_id)).size,detail.rows.length,'Repeated extraction key')
  assert.deepEqual(await readOriginalItemizedRelease(),release,'Original release changed during case extraction')
  const receipt={status:'READ_ONLY_COMMERCIAL_CASE_SOURCE',generated_at:new Date().toISOString(),release,
    population,cases:[...cases.values()],detail,controls,
    detail_sql:detailSql,controls_sql:controlsSql,
    review_views_sha256:createHash('sha256').update(viewsBytes).digest('hex'),
    extractor_sha256:createHash('sha256').update(readFileSync(resolve('scripts/extract-commercial-cases.ts'))).digest('hex'),
    warehouse_writes:0,source_files_modified:false,approvals_created:0,models_trained:0}
  const bytes=JSON.stringify(receipt,null,2)+'\n'
  mkdirSync(output,{recursive:true})
  writeFileSync(resolve(output,'source.json'),bytes,{flag:'wx'})
  writeFileSync(resolve(output,'source.sha256'),createHash('sha256').update(bytes).digest('hex')+'\n',{flag:'wx'})
  console.log(JSON.stringify({status:receipt.status,cases:cases.size,source_records:detail.rows.length,control_groups:controls.rows.length,warehouse_writes:0}))
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Case extraction failed');process.exitCode=1})
