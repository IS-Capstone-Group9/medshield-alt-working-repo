import assert from 'node:assert/strict'
import {executeDatabricksStatement} from './databricks'
import {truthHash,truthTable} from './analyticalTruth'
import type {DescriptiveRelease} from './descriptiveSource'

/** Separate immutable diagnostic; never rebind the old full-population STL. */
export async function readTruthStl(release:DescriptiveRelease,execute=executeDatabricksStatement,expected=process.env.DATABRICKS_TRUTH_STL_SHA256){
 const truth=release.analytical_integrity;assert.ok(truth,'Corrected source required')
 assert.match(expected??'',/^[a-f0-9]{64}$/,'Corrected STL has not been published')
 const table=truth.serving_table.replace(/_fact$/,'_stl')
 const saved=(await execute(`SELECT payload_json FROM ${truthTable(table)} VERSION AS OF 0`,{rowLimit:2})).rows
 assert.equal(saved.length,1,'Ambiguous corrected STL');const raw=saved[0].payload_json!
 assert.equal(truthHash(raw),expected,'Corrected STL checksum differs')
 const p=JSON.parse(raw)
 assert.equal(p.schema_version,'truth.monthly_stl.v1');assert.equal(p.source_integrity_id,truth.id)
 assert.equal(p.source_integrity_sha256,truth.manifest_sha256);assert.equal(p.source_table,truth.serving_table)
 for(const [key,value]of Object.entries({method:'STL',period:12,seasonal_window:13,robust:true,minimum_contiguous_months:36,missing_policy:'no_imputation_split_at_gaps'}))assert.equal(p.parameters[key],value)
 assert.ok(Array.isArray(p.rows)&&p.rows.length&&p.rows.length<=2400)
 assert.equal(new Set(p.rows.map((r:any)=>r.period)).size,p.rows.length)
 const observed=(await execute(`SELECT DATE_FORMAT(month_start,'yyyy-MM') AS period,CAST(SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS STRING) AS revenue FROM ${truthTable(truth.serving_table)} VERSION AS OF 0 GROUP BY month_start ORDER BY month_start`,{rowLimit:2400})).rows
 const source=new Map(observed.map(r=>[r.period,r.revenue===null?null:Number(r.revenue)]))
 for(const r of p.input_rows){const actual=source.get(r.period)??null;assert.equal(r.missing,actual===null);assert.equal(r.revenue,actual)}
 for(const r of p.rows){
  assert.equal(r.observed,source.get(r.period));assert.ok([r.observed,r.trend,r.seasonal,r.residual].every(Number.isFinite))
  assert.ok(Math.abs(r.observed-r.trend-r.seasonal-r.residual)<=0.000001,'Corrected STL does not reconstruct source')
 }
 return {method:'STL',metric:'Itemized eligible net sales (PHP)',release,parameters:p.parameters,rows:p.rows,
         source:{system_of_record:'databricks',view:table,checksum:expected,release,analytical_scope:'itemized_product_sales'}}
}
