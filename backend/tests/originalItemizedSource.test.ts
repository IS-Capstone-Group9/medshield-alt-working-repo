import assert from 'node:assert/strict'
import test from 'node:test'
import {deflateSync} from 'node:zlib'
import {EventEmitter} from 'node:events'
import type {Request, Response as ExpressResponse, NextFunction} from 'express'
import {ITEMIZED_PREVIEW_BINDING as pin} from '../src/itemizedPreviewBinding'
import {descriptiveBinding,readDescriptiveRelease} from '../src/descriptiveSource'
import {originalItemizedFactSql,readOriginalItemizedRelease} from '../src/originalItemizedSource'
import {requestContextMiddleware,withoutRequestCancellation} from '../src/requestContext'
import {catalogProjection} from '../src/catalogContract'
import {requireUncorrectedResearchEligible} from '../src/analyticalTruth'
import {readPredictiveRelease} from '../src/predictiveRelease'
import {readPredictiveResearch} from '../src/predictiveResearch'
import {readExtensionResearch} from '../src/extensionResearch'
import {readSo1Diagnostics} from '../src/so1Diagnostics'
import type {DatabricksStatementResult} from '../src/databricks'
const canonical=(value:unknown):string=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>JSON.stringify(key)+':'+canonical(value)).join(',')+'}':JSON.stringify(value)
function fixture(invalid='0'){
  const calls:string[]=[]
  const execute=async(sql:string):Promise<DatabricksStatementResult>=>{
    calls.push(sql)
    let row:Record<string,string|null>
    if(sql.startsWith('DESCRIBE HISTORY'))row={version:'0'}
    else if(sql.includes('payload_b64'))row={dataset_id:pin.datasetId,record_id:'gold_receipt',payload_sha256:pin.receiptSha256,payload_b64:deflateSync(Buffer.from(canonical(pin.expectedGoldReceipt))).toString('base64')}
    else if(sql.includes('invalid_rows'))row={records:String(pin.expectedRecords),unique_records:String(pin.expectedRecords),dataset_count:'1',dataset_id:pin.datasetId,policy_count:'1',policy_version:pin.policy,keys_sha256:pin.keysSha256,eligible_records:String(pin.expectedEligibleRecords),eligible_net:pin.expectedNet,invalid_rows:invalid}
    else throw new Error('Unexpected source query')
    return {rows:[row],columns:Object.keys(row)}
  }
  return {execute,calls}
}
test('explicit original adapter binds the source and cannot inherit previous financial approval',async()=>{
  const binding=descriptiveBinding({DATABRICKS_DESCRIPTIVE_ADAPTER:'original_itemized_v1',DATABRICKS_FINANCIAL_RELEASE_ID:'historical',DATABRICKS_TRUTH_RELEASE_ID:'historical'})
  const f=fixture(),release=await readDescriptiveRelease(binding,f.execute)
  assert.equal(release.source_table,pin.itemizedTable);assert.equal(release.dataset_id,pin.datasetId)
  assert.equal(release.financial_publication,undefined);assert.equal(release.analytical_integrity,undefined)
  assert.equal(release.area_mapping_sha256,null)
  assert.equal(release.product_master_sha256,pin.expectedGoldReceipt.accepted_master_sha256)
  assert.equal(release.original_itemized?.financial_release_approved,false)
  assert.equal(release.original_itemized?.unit_approval,false)
  assert.equal(release.original_itemized?.application_connection,'main_dashboard_candidate')
  assert.ok(!release.original_itemized?.note.includes('Preview only'))
  assert.equal(f.calls.length,4)
})
test('original adapter rejects unknown configuration and mismatched original source without fallback',async()=>{
  assert.throws(()=>descriptiveBinding({DATABRICKS_DESCRIPTIVE_ADAPTER:'unknown'}))
  await assert.rejects(readDescriptiveRelease(descriptiveBinding({DATABRICKS_DESCRIPTIVE_ADAPTER:'original_itemized_v1'}),fixture('1').execute))
  await assert.rejects(readDescriptiveRelease(descriptiveBinding({DATABRICKS_DESCRIPTIVE_ADAPTER:'original_itemized_v1'}),async()=>{throw new Error('offline')}),/offline/)
})

test('overlapping HTTP readers share fresh original validation across a caller disconnect', async () => {
  const f = fixture()
  const env = {DATABRICKS_HOST:'https://source.fixture.invalid', DATABRICKS_TOKEN:'fixture-token', DATABRICKS_SQL_WAREHOUSE_ID:'fixture-id'}
  const saved = Object.fromEntries(Object.keys(env).map(name => [name, process.env[name]]))
  const savedFetch = globalThis.fetch
  Object.assign(process.env, env)
  let proceed!: () => void, began!: () => void
  const gate = new Promise<void>(resolve => { proceed = resolve })
  const started = new Promise<void>(resolve => { began = resolve })
  let unavailable = false
  globalThis.fetch = (async (_input, init) => {
    const {statement} = JSON.parse(String(init?.body))
    const result = await f.execute(statement)
    began()
    await gate
    assert.equal(init?.signal?.aborted, false)
    if (unavailable) return Response.json({}, {status:503})
    return Response.json({statement_id:'fixture', status:{state:'SUCCEEDED'},
      manifest:{total_row_count:result.rows.length, schema:{columns:result.columns.map((name, position) => ({name, position}))}},
      result:{data_array:result.rows.map(row => result.columns.map(name => row[name]))}})
  }) as typeof fetch
  function request(abandoned = false) {
    const req = new EventEmitter()
    const res = Object.assign(new EventEmitter(), {writableEnded:false, json() { return this }, setHeader() {}})
    const release = new Promise<Awaited<ReturnType<typeof readOriginalItemizedRelease>>>((resolve, reject) => {
      const next = (() => {
        if (abandoned) res.emit('close')
        readOriginalItemizedRelease().then(resolve, reject)
      }) as NextFunction
      requestContextMiddleware(req as unknown as Request, res as unknown as ExpressResponse, next)
    })
    return {res, release}
  }
  try {
    await assert.rejects(request(true).release, /disconnected/)
    assert.equal(f.calls.length, 0)
    const first = request()
    await started
    const second = request()
    const background = withoutRequestCancellation(() => readOriginalItemizedRelease())
    first.res.emit('close')
    proceed()
    const [a,b,c] = await Promise.all([first.release,second.release,background])
    assert.equal(a, b)
    assert.equal(a, c)
    assert.equal(a.dataset_id, pin.datasetId)
    assert.equal(f.calls.length, 4)

    unavailable = true
    const failed = await Promise.allSettled([request().release,request().release])
    assert.ok(failed.every(r => r.status === 'rejected' && /HTTP 503/.test(String(r.reason))))
    assert.equal(f.calls.length, 6, 'A completed success cannot substitute for a failed fresh read')

    unavailable = false
    assert.equal((await request().release).dataset_id, pin.datasetId)
    assert.equal(f.calls.length, 10, 'A failed shared read must be evicted')
  } finally {
    proceed()
    globalThis.fetch = savedFetch
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  }
})
test('compatibility projection aliases recorded fields and preserves unsupported facts as unavailable',async()=>{
  const release=await readDescriptiveRelease(descriptiveBinding({DATABRICKS_DESCRIPTIVE_ADAPTER:'original_itemized_v1'}),fixture().execute)
  const sql=originalItemizedFactSql(release)
  assert.ok(sql.includes('f.recorded_quantity AS quantity'))
  assert.ok(sql.includes('FALSE AS is_quantity_observation_eligible'))
  assert.ok(sql.includes('CAST(NULL AS STRING) AS unit_of_measure'))
  assert.ok(sql.includes('FALSE AS is_geographic_territory_approved'))
  assert.ok(sql.includes('CAST(NULL AS DECIMAL(24,6)) AS unit_selling_price'))
  assert.ok(sql.includes('f.is_net_sales_technically_eligible AS is_net_sales_eligible'))
  assert.ok(!sql.includes('_financial_candidates')&&!sql.includes('_contract_candidates'))
  assert.throws(()=>originalItemizedFactSql({...release,source_table:'other'}))
  const catalog=catalogProjection(release.policy_version)
  assert.ok(catalog.includes("'needs_review' AS identity_status, category_status"))
  assert.ok(catalog.includes("'accepted_categories_only_original_source_v1'"))
})
test('stored models cannot appear current under a different connected original dataset',()=>{
  const previous=process.env.DATABRICKS_DESCRIPTIVE_ADAPTER
  process.env.DATABRICKS_DESCRIPTIVE_ADAPTER='original_itemized_v1'
  try{
    assert.throws(()=>requireUncorrectedResearchEligible('different-dataset'),/does not match the connected original Gold/)
    assert.doesNotThrow(()=>requireUncorrectedResearchEligible(pin.datasetId))
  }finally{
    if(previous===undefined)delete process.env.DATABRICKS_DESCRIPTIVE_ADAPTER
    else process.env.DATABRICKS_DESCRIPTIVE_ADAPTER=previous
  }
})
test('old trained releases and frozen research stay unavailable until a full original itemized publication contract exists',async()=>{
  const previous=process.env.DATABRICKS_DESCRIPTIVE_ADAPTER
  process.env.DATABRICKS_DESCRIPTIVE_ADAPTER='original_itemized_v1'
  let reads=0
  const execute=async()=>{reads++;throw new Error('Legacy model query must not run')}
  try{
    const trained=await readPredictiveRelease({schema_version:'2'},execute)
    assert.equal(trained.status,'unpublished');assert.deepEqual(trained.points,[])
    await assert.rejects(readPredictiveResearch({},execute))
    const sourceFixture=fixture()
    const release=await readDescriptiveRelease(descriptiveBinding({DATABRICKS_DESCRIPTIVE_ADAPTER:'original_itemized_v1'}),sourceFixture.execute)
    await assert.rejects(readExtensionResearch(execute,async()=>release,'a'.repeat(64)))
    await assert.rejects(readSo1Diagnostics({},{DATABRICKS_DESCRIPTIVE_ADAPTER:'original_itemized_v1',DATABRICKS_SO1_SHA256:'a'.repeat(64)},async(sql)=>sql.includes('a'.repeat(16))?execute():sql.startsWith('SELECT record_key,')?{rows:[{record_key:'!manifest',payload_json:'{}',payload_sha256:pin.receiptSha256},{record_key:'COMPANY',payload_json:'{}',payload_sha256:pin.receiptSha256}],columns:[]}:sourceFixture.execute(sql)),/checksum mismatch|manifest mismatch/)
    assert.equal(reads,0)
  }finally{
    if(previous===undefined)delete process.env.DATABRICKS_DESCRIPTIVE_ADAPTER
    else process.env.DATABRICKS_DESCRIPTIVE_ADAPTER=previous
  }
})

// ---- warehouse fact source (decision 014)
import {itemizedFactSource,verifyWarehouseCopy,warehouseCopyTables} from '../src/originalItemizedSource'
test('fact source defaults to gold and validates warehouse settings', () => {
  assert.deepEqual(itemizedFactSource({}), {mode:'gold'})
  assert.deepEqual(itemizedFactSource({DATABRICKS_ITEMIZED_SOURCE:'warehouse',DATABRICKS_WAREHOUSE_RELEASE_ID:'5df98130b9ec13ef'}), {mode:'warehouse',releaseId:'5df98130b9ec13ef'})
  for (const env of [{DATABRICKS_ITEMIZED_SOURCE:'warehouse'},{DATABRICKS_ITEMIZED_SOURCE:'warehouse',DATABRICKS_WAREHOUSE_RELEASE_ID:'x; DROP'},{DATABRICKS_ITEMIZED_SOURCE:'other'}])
    assert.throws(() => itemizedFactSource(env as any))
})
test('warehouse mode reads the release copies with the same projection', () => {
  const env = process.env
  process.env = {...env, DATABRICKS_ITEMIZED_SOURCE:'warehouse', DATABRICKS_WAREHOUSE_RELEASE_ID:'5df98130b9ec13ef'}
  try {
    const release = {original_itemized:{}, source_table:'workspace.medshield_original_gold_20261026.original_fd95b9e3abab028c8e41_itemized_candidates', fact_delta_version:0} as any
    const sql = originalItemizedFactSql(release, 'combined_unreconciled')
    const {itemized, contracts} = warehouseCopyTables('5df98130b9ec13ef')
    assert.ok(sql.includes('`' + itemized.split('.').join('`.`') + '`') && sql.includes('`' + contracts.split('.').join('`.`') + '`'))
    assert.ok(!sql.includes('original_gold_20261026'))
  } finally { process.env = env }
})
test('a copy that differs from gold, or a stale release, is refused, never served', async () => {
  const fake = (same: string, head = '5df98130b9ec13ef') => (async (sql: string) => ({rows: sql.includes('release_pointer') ? [{release_id: head}] : [{same}]})) as any
  await verifyWarehouseCopy('5df98130b9ec13ef', fake('true'))
  await assert.rejects(verifyWarehouseCopy('5df98130b9ec13ef', fake('false')), /differs from pinned Gold/)
  await assert.rejects(verifyWarehouseCopy('5df98130b9ec13ef', fake('true', 'aaaaaaaaaaaaaaaa')), /not the current release/)
  await assert.rejects(verifyWarehouseCopy('5df98130b9ec13ef', (async () => ({rows: []})) as any), /not the current release/)
})
