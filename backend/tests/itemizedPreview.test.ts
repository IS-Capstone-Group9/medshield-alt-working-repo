import assert from 'node:assert/strict'
import test from 'node:test'
import {createHash} from 'node:crypto'
import {deflateSync} from 'node:zlib'
import express, {type RequestHandler} from 'express'
import type {AddressInfo} from 'node:net'
import {decimalMicros, getItemizedPreview, getItemizedPreviewCsv, parseItemizedFilters,
  readItemizedPreviewSource, ItemizedPreviewInputError, type ItemizedBinding} from '../src/itemizedPreview'
import {itemizedPreviewRouter} from '../src/itemizedPreviewRoutes'
import type {DatabricksStatementOptions, DatabricksStatementResult} from '../src/databricks'

const hash = (text: string | Buffer) => createHash('sha256').update(text).digest('hex')
const body = Buffer.from(JSON.stringify({record_id:'gold_receipt', fixture:true}))
const binding: ItemizedBinding = {
  batchId:'original_' + 'a'.repeat(20), datasetId:'b'.repeat(64), policy:'original_source_layers_v1_candidate_only',
  receiptTable:'workspace.medshield_original_gold_20261026.original_' + 'a'.repeat(20) + '_receipt',
  itemizedTable:'workspace.medshield_original_gold_20261026.original_' + 'a'.repeat(20) + '_itemized_candidates',
  receiptSha256:hash(body), keysSha256:hash('first|second'), expectedRecords:2, expectedEligibleRecords:2,
  expectedNet:'90.000000', expectedGoldReceipt:JSON.parse(body.toString()),
}
type Row = Record<string, string | null>
const summary: Row = {records:'2', net_eligible_records:'2', net_sales:'90.000000', positive_sales:'100.000000',
  signed_returns:'-10.000000', gross_margin:'20.000000', margin_sales_basis:'100.000000', margin_pct:'20.0000',
  first_delivery_date:'2026-01-01',last_delivery_date:'2026-03-02'}
const result = (rows: Row[]): DatabricksStatementResult => ({rows,columns:Object.keys(rows[0] ?? {})})
function fixture(changes: Partial<Row> = {}, version = '0') {
  const calls: {sql:string; options?:DatabricksStatementOptions}[] = []
  const execute = async (sql: string, options?: DatabricksStatementOptions) => {
    calls.push({sql, options})
    if (sql.startsWith('DESCRIBE HISTORY')) return result([{version}])
    if (sql.includes('SELECT dataset_id, record_id')) return result([{dataset_id:binding.datasetId, record_id:'gold_receipt',
      payload_sha256:binding.receiptSha256,payload_b64:deflateSync(body).toString('base64')}])
    if (sql.includes('AS invalid_rows')) return result([{records:'2', unique_records:'2',dataset_count:'1',dataset_id:binding.datasetId,
      policy_count:'1', policy_version:binding.policy, keys_sha256:binding.keysSha256,eligible_records:'2',eligible_net:'90.00', invalid_rows:'0',...changes}])
    if (sql.includes('SELECT DISTINCT')) return result([{year:'2026',area:"O'Brien"}])
    if (sql.includes('source_workbook')) return result([{source_record_id:'second',source_workbook:'fixture.csv', source_file_sha256:'c'.repeat(64),
      source_row_number:'2',date_delivered:'2026-03-02',area:"O'Brien",product:'=HYPERLINK("test")',category:'medicine',
      recorded_quantity:'-1.000000',net_sales:'-10.000000',net_eligible:'true',gross_margin:null,margin_eligible:'false',
      category_status:'approved',quantity_unit:null,source_unit_approved:'false',forecast_eligible:'false',financial_release_approved:'false',quality_rule_codes_json:'[]'}])
    if (sql.includes('GROUP BY DATE_FORMAT')) return result([{...summary,period:'2026-01'}])
    if (sql.includes('GROUP BY normalized_product')) return result([{...summary,product:'fixture label',category:'medicine'}])
    if (sql.includes('first_delivery_date')) return result([{...summary}])
    throw new Error('Unexpected fixture SQL')
  }
  return {calls, execute}
}

test('filters reject arrays, objects, unknown keys and invalid scopes before any provider read', async () => {
  for (const input of [{year:['2026']},{area:{}},{category:'contract'},{year:'2016'},{year:"2026' OR 1=1"},{x:'all'},{area:'\u0000'}]) {
    assert.throws(() => parseItemizedFilters(input), ItemizedPreviewInputError)
  }
  const f = fixture()
  await assert.rejects(getItemizedPreview({category:'contract'}, f.execute, binding),ItemizedPreviewInputError)
  await assert.rejects(getItemizedPreviewCsv(['monthly'], {}, f.execute, binding),ItemizedPreviewInputError)
  assert.equal(f.calls.length, 0)
})

test('exact decimal controls preserve signed cents and six-place precision', () => {
  assert.equal(decimalMicros('90.00'),90_000_000n)
  assert.equal(decimalMicros('-0.000001'),-1n)
  assert.equal(decimalMicros('638015351.530000'),638015351530000n)
  for (const invalid of ['NaN','1e6','1.0000001','+2','']) assert.throws(()=>decimalMicros(invalid))
})

test('receipt, exact record keys, eligibility and signed net are pinned before measures', async () => {
  const f = fixture()
  const source = await readItemizedPreviewSource(f.execute,binding)
  assert.equal(source.contracts_excluded,true)
  assert.equal(source.complete_company_sales,false)
  assert.equal(source.financial_release_approved,false)
  assert.equal(source.live_serving_changed,false)
  assert.equal(f.calls.length,4)
  assert.ok(f.calls.every(call=>!(/\b(?:CREATE|INSERT|UPDATE|DELETE|MERGE|DROP)\b/i.test(call.sql))))
})

test('modified version, keys, totals, contracts or approvals fail closed', async () => {
  for (const changes of [{records:'3'},{unique_records:'1'},{keys_sha256:hash('other')},{eligible_net:'90.000001'},
    {eligible_records:'1'},{dataset_count:'2'},{policy_version:'other'},{invalid_rows:'1'}]) {
    const f = fixture(changes)
    await assert.rejects(getItemizedPreview({},f.execute,binding))
    assert.ok(!f.calls.some(call=>call.sql.includes('GROUP BY')))
  }
  await assert.rejects(readItemizedPreviewSource(fixture({},'1').execute,binding),/changed after staging/)
  await assert.rejects(readItemizedPreviewSource(fixture().execute,{...binding,receiptSha256:hash('tampered')}))
  const original = fixture().execute
  await assert.rejects(readItemizedPreviewSource(async(sql,options)=>{
    const output = await original(sql,options)
    if (sql.includes('payload_b64')) output.rows[0].payload_b64 = deflateSync(Buffer.from('changed')).toString('base64')
    return output
  },binding),/checksum differs/)
  await assert.rejects(getItemizedPreview({},async()=>{throw new Error('offline')},binding),/offline/)
})

test('empty exports fail explicitly and cannot produce a context-free file', async()=>{
  const original = fixture().execute
  await assert.rejects(getItemizedPreviewCsv('records',{},async(sql,options)=>
    sql.includes('SELECT source_record_id,') ? result([]) : original(sql,options),binding),/No itemized records/)
})

test('valid filter values are SQL parameters and monetary/margin populations stay explicit', async () => {
  const f = fixture(), filters = {year:'2026',area:"O'Brien",category:'medicine'}
  const preview = await getItemizedPreview(filters,f.execute,binding)
  assert.deepEqual(preview.filters,filters)
  assert.equal(preview.summary.net_sales,'90.000000')
  assert.equal(preview.summary.signed_returns,'-10.000000')
  assert.deepEqual(preview.monthly.map(row=>row.period),['2026-01']) // no invented missing-month zeros
  const measures = f.calls.filter(call=>call.sql.includes('GROUP BY') || call.sql.includes('first_delivery_date'))
  assert.equal(measures.length,3)
  for (const call of measures) {
    assert.ok(!call.sql.includes("O'Brien"))
    assert.deepEqual(call.options?.parameters,[{name:'start_date',value:'2026-01-01',type:'DATE'},
      {name:'end_date',value:'2027-01-01',type:'DATE'},{name:'area',value:"O'Brien",type:'STRING'},{name:'category',value:'medicine',type:'STRING'}])
    assert.ok(call.sql.includes('WHEN f.is_gross_margin_technically_eligible THEN f.net_sales END'))
    assert.ok(call.sql.includes('THEN f.net_sales END')) // no eligible values remain NULL
  }
  assert.match(measures[2].sql,/ORDER BY SUM\(CASE/) // numeric contribution ordering
})

test('CSV retains signed values, prevents formulas, and includes scope and matching filters', async () => {
  const f = fixture(), filters = {year:'2026',area:"O'Brien",category:'medicine'}
  const csv = await getItemizedPreviewCsv('records',filters,f.execute,binding)
  assert.ok(csv.csv.startsWith('\uFEFF'))
  assert.ok(csv.csv.includes('"\'=HYPERLINK(""test"")"'))
  assert.ok(csv.csv.includes('"-10.000000"'))
  assert.ok(!csv.csv.includes("'-10.000000"))
  assert.ok(csv.csv.includes('"original_itemized_sales_contracts_excluded","true","false","false","false","false","2026","O\'Brien","medicine"'))
  assert.ok(csv.csv.includes('"quantity_unit","source_unit_approved","forecast_eligible","financial_release_approved"'))
  const call = f.calls.at(-1)!
  assert.equal(call.options?.parameters?.find(p=>p.name==='area')?.value,"O'Brien")
  assert.equal(call.options?.rowLimit,45000)
})

test('HTTP routes enforce auth and role before queries, preserve safe failures and never cache exports', async () => {
  let reads = 0
  const auth: RequestHandler = (req,res,next)=>req.headers.authorization ? next() : void res.sendStatus(401)
  const role: RequestHandler = (req,res,next)=>req.headers.authorization === 'Bearer analyst' ? next() : void res.sendStatus(403)
  const app = express()
  app.use('/api/sales/itemized-preview',itemizedPreviewRouter(auth,role,{
    preview: async input=>{reads++;parseItemizedFilters(input);throw new Error('private warehouse diagnostic')},
    csv: async ()=>{reads++;return {csv:'fixture',filename:'fixture.csv'}},
  }))
  const server = app.listen(0,'127.0.0.1')
  try {
    await new Promise<void>(resolve=>server.once('listening',resolve))
    const url = 'http://127.0.0.1:' + (server.address() as AddressInfo).port + '/api/sales/itemized-preview'
    for (const endpoint of ['', '/export?view=records']) {
      assert.equal((await fetch(url+endpoint)).status,401)
      assert.equal((await fetch(url+endpoint,{headers:{Authorization:'Bearer viewer'}})).status,403)
    }
    assert.equal(reads,0)
    const response = await fetch(url,{headers:{Authorization:'Bearer analyst'}})
    assert.equal(response.status,503)
    assert.equal(response.headers.get('cache-control'),'no-store')
    assert.ok(!(await response.text()).includes('private warehouse diagnostic'))
    const invalid = await fetch(url+'?year=2016',{headers:{Authorization:'Bearer analyst'}})
    assert.equal(invalid.status,400)
    const csv = await fetch(url+'/export?view=records',{headers:{Authorization:'Bearer analyst'}})
    assert.equal(csv.status,200)
    assert.equal(csv.headers.get('cache-control'),'no-store')
    assert.match(csv.headers.get('content-disposition')!,/attachment/)
  } finally {await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
