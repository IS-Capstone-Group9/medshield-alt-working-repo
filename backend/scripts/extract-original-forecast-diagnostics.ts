import 'dotenv/config'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {executeDatabricksStatement} from '../src/databricks'
import {readItemizedPreviewSource} from '../src/itemizedPreview'
import {ITEMIZED_PREVIEW_BINDING as binding} from '../src/itemizedPreviewBinding'
import {ORIGINAL_RESEARCH_MONTHLY_SQL,ORIGINAL_RESEARCH_BINDING as pin,originalResearchDigest} from '../src/originalResearch'

async function main(){
  const output=resolve(process.argv[2]??'../outputs/original_forecast_diagnosis_20261027/input')
  const source=await readItemizedPreviewSource()
  const table=binding.itemizedTable.split('.').map(part=>'`'+part+'`').join('.')
  const query=`WITH ranked AS (
    SELECT DATE_FORMAT(date_delivered,'yyyy-MM') AS month, date_delivered,net_sales,
      is_net_sales_technically_eligible AS eligible,
      ROW_NUMBER() OVER(PARTITION BY DATE_FORMAT(date_delivered,'yyyy-MM')
        ORDER BY CASE WHEN is_net_sales_technically_eligible AND net_sales>0 THEN net_sales ELSE 0 END DESC,source_record_id) AS positive_rank
    FROM ${table} VERSION AS OF 0 WHERE record_kind='itemized_sale')
    SELECT month,COUNT(*) AS source_records,COUNT_IF(eligible) AS net_eligible_records,
      COUNT_IF(eligible AND net_sales>0) AS positive_records,
      COUNT_IF(eligible AND net_sales<0) AS negative_records,
      COUNT_IF(eligible AND net_sales=0) AS zero_records,
      CAST(SUM(CASE WHEN eligible THEN net_sales ELSE 0 END) AS STRING) AS net_sales_php,
      CAST(SUM(CASE WHEN eligible AND net_sales>0 THEN net_sales ELSE 0 END) AS STRING) AS positive_net_php,
      CAST(SUM(CASE WHEN eligible AND net_sales<0 THEN net_sales ELSE 0 END) AS STRING) AS negative_net_php,
      CAST(SUM(CASE WHEN eligible AND net_sales>0 AND positive_rank<=5 THEN net_sales ELSE 0 END) AS STRING) AS top5_positive_net_php,
      CAST(MAX(CASE WHEN eligible THEN net_sales END) AS STRING) AS maximum_eligible_line_php,
      CAST(MIN(CASE WHEN eligible THEN net_sales END) AS STRING) AS minimum_eligible_line_php,
      TO_JSON(SORT_ARRAY(COLLECT_SET(CASE WHEN eligible THEN DATE_FORMAT(date_delivered,'yyyy-MM-dd') END))) AS eligible_dates_json
    FROM ranked GROUP BY month ORDER BY month`
  const [monthly,signals]=await Promise.all([
    executeDatabricksStatement(ORIGINAL_RESEARCH_MONTHLY_SQL,{rowLimit:2400}),
    executeDatabricksStatement(query,{rowLimit:2400}),
  ])
  assert.equal(monthly.rows.length,107);assert.equal(signals.rows.length,107)
  const payload={schema_version:'original_itemized_diagnostic_input_v1',source_identity:source,
    extraction_time:new Date().toISOString(),monthly:monthly.rows,signals:signals.rows,
    monthly_logical_sha256:pin.monthlySha256,contracts_excluded:true,
    source_completeness:'unknown',warehouse_writes:0,
    note:'Read-only aggregate evidence. Negative monetary adjustments do not prove physical returns. Source date presence does not establish reporting completeness.'}
  mkdirSync(output,{recursive:true})
  const raw=JSON.stringify(payload,null,2)+'\n',hash=originalResearchDigest(raw)
  writeFileSync(resolve(output,'source.json'),raw,{flag:'wx'})
  writeFileSync(resolve(output,'source.sha256'),hash+'\n',{flag:'wx'})
  console.log(JSON.stringify({status:'PASS_ORIGINAL_DIAGNOSTIC_EXTRACT',months:signals.rows.length,source_sha256:hash,warehouse_writes:0}))
}
main().catch(()=>{console.error('Original diagnostic aggregate extraction failed; no source or table writes.');process.exitCode=1})
