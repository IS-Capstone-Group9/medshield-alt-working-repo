import 'dotenv/config'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {inflateSync} from 'node:zlib'
import {executeDatabricksStatement} from '../src/databricks'
import {readOriginalItemizedRelease} from '../src/originalItemizedSource'

async function main(){
  const previousPath=resolve('../outputs/regional_june_review_20261028/source.json'),previousBytes=readFileSync(previousPath),previous=JSON.parse(previousBytes.toString())
  const release=await readOriginalItemizedRelease();assert.deepEqual(release,previous.release)
  const silver='workspace.medshield_original_silver_20261026.original_fd95b9e3abab028c8e41_assessed_rows'
  const gold=release.source_table;assert.equal(gold,'workspace.medshield_original_gold_20261026.original_fd95b9e3abab028c8e41_itemized_candidates')
  const sql=`SELECT s.record_id,s.payload_sha256,s.payload_b64 FROM ${silver} VERSION AS OF 0 s
    INNER JOIN ${gold} VERSION AS OF 0 g ON s.record_id=g.source_record_id
    WHERE g.record_kind='itemized_sale' AND g.area IN ('BATANGAS','CAVITE','LAGUNA','LOWER CAVITE','QUEZON')
    AND ((g.date_delivered BETWEEN DATE '2025-06-01' AND DATE '2025-06-30') OR
    (g.date_delivered BETWEEN DATE '2026-06-01' AND DATE '2026-06-30')) ORDER BY s.record_id`
  const result=await executeDatabricksStatement(sql,{rowLimit:1000});assert.equal(result.rows.length,344)
  const expected=new Map<string,any>(previous.detail.rows.map((r:any)=>[r.source_record_id,r]))
  const rows=result.rows.map(saved=>{
    assert.equal(typeof saved.payload_b64,'string');const bytes=inflateSync(Buffer.from(saved.payload_b64!,'base64'),{maxOutputLength:2*1024*1024})
    assert.equal(createHash('sha256').update(bytes).digest('hex'),saved.payload_sha256)
    const row=JSON.parse(bytes.toString()),goldRow=expected.get(saved.record_id!);assert.ok(goldRow)
    assert.equal(row.source_record_id,saved.record_id);assert.equal(row.source_file_sha256,goldRow.source_file_sha256)
    assert.equal(row.source_row_number,Number(goldRow.source_row_number));assert.equal(row.product,goldRow.normalized_product)
    assert.equal(row.area,goldRow.area);assert.equal(row.date_delivered,goldRow.date)
    assert.deepEqual([...row.quality_rule_codes].sort(),JSON.parse(goldRow.quality_rule_codes_json).sort())
    return {source_record_id:row.source_record_id,source_workbook:row.source_workbook,source_file_sha256:row.source_file_sha256,
      source_row_number:row.source_row_number,silver_payload_sha256:saved.payload_sha256,source_layout:row.source_layout,
      area:row.area,product:row.product,date_delivered:row.date_delivered,source_month_raw:row.source_layout==='modern_grouped_17'?row.raw_fields[0]:null,
      entry_date_raw:row.source_layout==='modern_grouped_17'?row.raw_fields[1]:null,date_delivered_raw:row.date_delivered_raw,
      quantity:row.quantity,quantity_secondary:row.quantity_secondary_candidate,unit_acquisition_cost:row.unit_acquisition_cost,
      total_acquisition_cost:row.total_acquisition_cost,net_sales:row.net_sales,gross_margin_amount:row.gross_margin_amount,
      quality_rule_codes:row.quality_rule_codes}
  })
  assert.equal(new Set(rows.map(r=>r.source_record_id)).size,344)
  assert.deepEqual(await readOriginalItemizedRelease(),release)
  const directory=resolve('../outputs/june_source_validation_20261028');mkdirSync(directory,{recursive:true})
  const report={status:'READ_ONLY_JUNE_SILVER_LINEAGE',generated_at:new Date().toISOString(),release,silver_table:silver,silver_version:0,sql,
    june_gold_capture_sha256:createHash('sha256').update(previousBytes).digest('hex'),
    extractor_sha256:createHash('sha256').update(readFileSync(resolve('scripts/extract-june-silver-review.ts'))).digest('hex'),
    rows,warehouse_writes:0,source_files_modified:false,approvals_created:0}
  const bytes=JSON.stringify(report,null,2)+'\n';writeFileSync(resolve(directory,'silver-source.json'),bytes,{flag:'wx'})
  writeFileSync(resolve(directory,'silver-source.sha256'),createHash('sha256').update(bytes).digest('hex')+'\n',{flag:'wx'})
  console.log(JSON.stringify({status:report.status,rows:rows.length,warehouse_writes:0}))
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Silver lineage read failed');process.exitCode=1})
