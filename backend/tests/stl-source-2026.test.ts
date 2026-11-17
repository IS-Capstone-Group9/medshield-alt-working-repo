import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import ts from 'typescript'
import { OBSERVED_FACT } from '../src/databricksDashboard'
import { descriptiveSiblingTable, SOURCE_REBUILD_POLICY, type DescriptiveRelease } from '../src/descriptiveSource'

const release: DescriptiveRelease = { dataset_id: 'a'.repeat(64), policy_version: SOURCE_REBUILD_POLICY,
  area_mapping_sha256: 'b'.repeat(64), product_master_sha256: 'c'.repeat(64), fact_delta_version: 0,
  publication_status: 'CANDIDATE_PENDING_BUSINESS_AND_PRODUCT_MASTER_REVIEW',
  transaction_evidence_sha256: 'd'.repeat(64), catalog_helper_sha256: 'e'.repeat(64),
  source_table: 'workspace.medshield_gold_source_20261022.sales_restart_fact_candidate' }
const parameters = {method:'STL',metric:'eligible_net_sales_php',period:12,seasonal_window:13,robust:true,
  minimum_contiguous_months:36,missing_policy:'no_imputation_split_at_gaps'}
const row = () => ({dataset_id:release.dataset_id,policy_version:release.policy_version,
  area_mapping_sha256:release.area_mapping_sha256,product_master_sha256:release.product_master_sha256,
  fact_delta_version:'0',source_table:release.source_table,transaction_evidence_sha256:release.transaction_evidence_sha256,
  catalog_helper_sha256:release.catalog_helper_sha256,population_version:'dashboard_observed_fact_v1',
  population_sha256:createHash('sha256').update(OBSERVED_FACT).digest('hex'),
  parameters_json:JSON.stringify(parameters),input_sha256:'f'.repeat(64),publication_status:'CANDIDATE_PENDING_BUSINESS_REVIEW',
  period:'2020-01',observed:'100',trend:'90',seasonal:'9',residual:'1',segment_start:'2020-01',segment_end:'2022-12'})

/** Compile the actual exported reader with injected query/release boundaries. */
function reader(selected: DescriptiveRelease, rows: Record<string, any>[]) {
  const source = readFileSync(resolve(__dirname, '../src/databricksDashboard.ts'), 'utf8')
  const body = source.slice(source.indexOf('export async function getDatabricksStl()')).replace(/^export /, '')
  const js = ts.transpileModule(body, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
  const statements: string[] = []
  const get = new Function('descriptiveRelease','query','sqlString','nullableNumber','DatabricksSourceUnavailableError',
    'descriptiveSiblingTable','createHash','OBSERVED_FACT','databricksSource',js+';return getDatabricksStl')(
      async()=>selected, async(sql:string)=>{statements.push(sql);return rows}, (value:string)=>`'${value}'`,
      (value:unknown)=>value == null ? null : Number(value), Error, descriptiveSiblingTable, createHash, OBSERVED_FACT,
      ()=>({source:'mocked-boundary'}))
  return {get,statements}
}

test('new-source STL reads its isolated sibling and retains identity plus population parameters', async()=>{
  const mock=reader(release,[row()]), result=await mock.get()
  assert.match(mock.statements[0],/FROM `workspace`\.`medshield_gold_source_20261022`\.`sales_restart_stl_candidate`/)
  assert.match(mock.statements[0],/WHERE fact_delta_version = 0/)
  assert.match(mock.statements[0],/source_table, population_version, population_sha256/)
  assert.equal(result.release,release)
  assert.equal(result.rows[0].observed,100)
  assert.deepEqual(result.parameters,parameters)
})

test('missing new-source STL fails independently rather than reading the old table',async()=>{
  const mock=reader(release,[])
  await assert.rejects(mock.get(),/No published STL/)
  assert.equal(mock.statements.length,1)
  assert.ok(mock.statements[0].includes('`medshield_gold_source_20261022`'))
  assert.ok(!mock.statements[0].includes('FROM `workspace`.`medshield_gold`.'))
})

test('STL rejects source, population, reference, duplicate and arithmetic mismatches',async()=>{
  for(const change of [
    {dataset_id:'9'.repeat(64)},{policy_version:'other'},{fact_delta_version:'1'},
    {source_table:'workspace.medshield_gold.sales_restart_fact_candidate'},
    {population_version:'other'},{population_sha256:'9'.repeat(64)},
    {transaction_evidence_sha256:'9'.repeat(64)},{catalog_helper_sha256:'9'.repeat(64)},
    {parameters_json:JSON.stringify({...parameters,period:7})},{residual:'2'},
  ])await assert.rejects(reader(release,[{...row(),...change}]).get())
  await assert.rejects(reader(release,[row(),row()]).get(),/Ambiguous/)
})

test('original-source STL remains compatible while unsupported sibling paths are rejected',async()=>{
  const legacy={...release,source_table:'workspace.medshield_gold.sales_restart_fact_candidate',policy_version:'sales_restart_gold_v7_independent_catalog',fact_delta_version:20}
  const oldRow={...row(),policy_version:legacy.policy_version,fact_delta_version:'20'}
  delete (oldRow as any).source_table
  delete (oldRow as any).population_version
  delete (oldRow as any).population_sha256
  const mock=reader(legacy,[oldRow])
  await mock.get()
  assert.match(mock.statements[0],/FROM `workspace`\.`medshield_gold`\.`sales_restart_stl_candidate`/)
  assert.ok(!mock.statements[0].includes(', source_table, population_version'))
  for(const source_table of ['workspace.other.sales_restart_fact_candidate',release.source_table+';DROP TABLE x',undefined])
    assert.throws(()=>descriptiveSiblingTable({...release,source_table},'sales_restart_stl_candidate'))
  assert.throws(()=>descriptiveSiblingTable(release,'sales_restart_stl_candidate;DROP'))
})
