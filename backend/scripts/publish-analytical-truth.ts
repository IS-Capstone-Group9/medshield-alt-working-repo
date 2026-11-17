import 'dotenv/config'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { executeDatabricksStatement as execute } from '../src/databricks'
import { descriptiveBinding, readDescriptiveRelease } from '../src/descriptiveSource'
import { databricksLiteral as literal } from '../src/databricksLiteral'
import { truthHash, truthTable, validateTruthManifest, readAnalyticalTruth, type TruthManifest } from '../src/analyticalTruth'
import { financialTableSql } from '../src/financialPublication'

async function main() {
  const [mode,correctionFile,outDir]=process.argv.slice(2)
  assert.ok(['--prepare','--apply','--verify'].includes(mode) && correctionFile && outDir,'Use --prepare|--apply|--verify correction.json output-directory')
  const output=resolve(outDir); mkdirSync(output,{recursive:true})
  const raw=readFileSync(resolve(correctionFile),'utf8'), input=JSON.parse(raw)
  assert.equal(input.schema_version,1); assert.equal(input.policy,'original_itemized_sales_v1')
  const ids=input.excluded.map((r:{source_record_id:string})=>r.source_record_id).sort() as string[]
  assert.ok(ids.length && new Set(ids).size===ids.length && ids.every(id=>/^[a-f0-9]{64}$/.test(id)))
  const source=await readDescriptiveRelease(descriptiveBinding())
  assert.ok(source.financial_publication,'Correction requires the pinned accepted financial source as predecessor')
  const table=source.financial_publication.serving_table, fact=`${financialTableSql(table)} VERSION AS OF 0`
  const base=table.split('.').slice(0,2).join('.'), correctionHash=truthHash(raw)
  const id='truth_'+truthHash(correctionHash+'|'+table+'|'+source.dataset_id).slice(0,16)
  const names={fact:base+'.'+id+'_fact',excluded:base+'.'+id+'_excluded',manifest:base+'.'+id+'_manifest',contracts:base+'.'+id+'_contracts'}
  const idValues=ids.map(value=>`('${value}')`).join(',') // strict SHA-256 alphabet checked above
  const excludeRelation=`(SELECT * FROM VALUES ${idValues} AS keys(source_record_id))`
  const kept=`SELECT f.* FROM ${fact} f LEFT ANTI JOIN ${excludeRelation} e ON f.source_record_id=e.source_record_id`
  const controls=async (from:string)=>(await execute(`SELECT COUNT(*) AS records, COUNT(DISTINCT source_record_id) AS unique_records, SHA2(CONCAT_WS('|', SORT_ARRAY(COLLECT_LIST(source_record_id))),256) AS keys_sha256 FROM ${from}`,{rowLimit:1})).rows[0]
  const before=await controls(fact), after=await controls(`(${kept})`)
  assert.equal(before.records,before.unique_records); assert.equal(after.records,after.unique_records)
  const manifest:TruthManifest={schema_version:1,policy:input.policy,id,source_dataset:source.dataset_id,
    source_fact_version:source.fact_delta_version,source_table:table,source_publication_id:source.financial_publication.publication_id,
    correction_sha256:correctionHash,serving_table:names.fact,excluded_table:names.excluded,contracts_table:names.contracts,
    source_rows:Number(before.records),removed_rows:Number(before.records)-Number(after.records),kept_rows:Number(after.records),excluded_keys:ids.length,
    source_keys_sha256:before.keys_sha256!,kept_keys_sha256:after.keys_sha256!,contract_rows:input.contracts.length,
    original_source_hashes:Object.fromEntries(input.source_files.map((r:{source_workbook:string;original_sha256:string})=>[r.source_workbook,r.original_sha256])),
    scope:'itemized_product_sales',status:'source_corrected_research_not_new_business_approval'}
  validateTruthManifest(manifest,source,id)
  const body=JSON.stringify(manifest)+'\n', hash=truthHash(body)
  // Store only anonymous contracts and permitted aggregate amounts, never medicine units or counterparties.
  const contracts=input.contracts.map((r:Record<string,unknown>)=>`SELECT ${literal(JSON.stringify(r))} AS contract_json`).join(' UNION ALL ')
  const statements=[
    `CREATE TABLE IF NOT EXISTS ${truthTable(names.excluded)} USING DELTA AS SELECT source_record_id FROM ${excludeRelation}`,
    `CREATE TABLE IF NOT EXISTS ${truthTable(names.fact)} USING DELTA AS ${kept}`,
    `CREATE TABLE IF NOT EXISTS ${truthTable(names.contracts)} USING DELTA AS ${contracts}`,
    `CREATE TABLE IF NOT EXISTS ${truthTable(names.manifest)} USING DELTA AS SELECT ${literal(body)} AS manifest_json`,
  ]
  for (const [name,value] of [['manifest.json',body],['manifest.sha256',hash+'\n'],['publication.sql',statements.join(';\n\n')+';\n']] as const) {
    const path=resolve(output,name)
    if(existsSync(path)) assert.equal(readFileSync(path,'utf8'),value,'Prepared correction changed; retain old evidence and use another output')
    else writeFileSync(path,value)
  }
  if(mode==='--prepare'){console.log(JSON.stringify({...manifest,execution_status:'prepared',manifest_sha256:hash}));return}
  if(mode==='--apply') for(const statement of statements.slice(0,3)) await execute(statement,{rowLimit:1})
  const serving=`${truthTable(names.fact)} VERSION AS OF 0`
  for (const [left,right] of [[kept,`SELECT * FROM ${serving}`],[`SELECT * FROM ${serving}`,kept]]) {
    const differences=(await execute(`SELECT COUNT(*) AS differences FROM ((${left}) EXCEPT ALL (${right}))`,{rowLimit:1})).rows[0]
    assert.equal(Number(differences?.differences),0,'Corrected values differ from original-matched source subset')
  }
  const forbidden=(await execute(`SELECT COUNT(*) AS records FROM ${serving} f INNER JOIN ${truthTable(names.excluded)} VERSION AS OF 0 e ON f.source_record_id=e.source_record_id`,{rowLimit:1})).rows[0]
  assert.equal(Number(forbidden.records),0,'Replacement observations leaked into corrected fact')
  const contractRead=(await execute(`SELECT contract_json FROM ${truthTable(names.contracts)} VERSION AS OF 0`,{rowLimit:1000})).rows.map(r=>r.contract_json).sort()
  assert.deepEqual(contractRead,input.contracts.map((r:unknown)=>JSON.stringify(r)).sort(),'Original contract evidence differs')
  if(mode==='--apply') await execute(statements[3],{rowLimit:1})
  const activation={DATABRICKS_TRUTH_RELEASE_ID:id,DATABRICKS_TRUTH_MANIFEST_SHA256:hash}
  await readAnalyticalTruth(source,execute,activation)
  const report={verified_at:new Date().toISOString(),mode,manifest,activation,exact_multiset_parity:true,excluded_overlap:0,anonymous_contracts_verified:true}
  writeFileSync(resolve(output,`receipt-${Date.now()}.json`),JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report))
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Analytical correction failed');process.exitCode=1})
