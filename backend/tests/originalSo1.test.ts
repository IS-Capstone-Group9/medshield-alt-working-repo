import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {deflateSync} from 'node:zlib'
import {decodeSo1Rows,readSo1Diagnostics,so1Hash,so1View,validateSo1Package,so1Contributions,so1Table} from '../src/so1Diagnostics'
import {ORIGINAL_SO1_SHA256 as hash} from '../src/originalSo1Binding'
import {ITEMIZED_PREVIEW_BINDING as binding} from '../src/itemizedPreviewBinding'
import {originalStlCanonical} from '../src/originalStl'
import {withFinancialScope} from '../src/financialScope'
import express from 'express'
import ts from 'typescript'
import type {AddressInfo} from 'node:net'
import {So1InputError} from '../src/so1Diagnostics'
const raw=readFileSync('../outputs/original_so1_20261027/payload.json','utf8'),payload=JSON.parse(raw)
const source=JSON.parse(readFileSync('../outputs/original_so1_20261027/input/source.json','utf8'))
const {series,...metadata}=payload
const rows=[{record_key:'!manifest',payload_json:JSON.stringify({package_sha256:hash,metadata,areas:series.map((s:any)=>s.area)})},
  ...series.map((s:any)=>({record_key:s.area,payload_json:JSON.stringify(s)}))].map(row=>({...row,payload_sha256:so1Hash(row.payload_json)}))
const controls=source.queries.monthly_control.rows.map((row:any)=>({normalized_area:row.normalized_area,period:row.month.slice(0,7),records:row.records,eligible_records:row.eligible_records,adjusted_records:'0',revenue:row.revenue}))
const financialRows=JSON.parse(readFileSync('../outputs/so1_financial_scope_20261027/financial-source.json','utf8'))
function fixture(changes:{version?:string;rows?:any[];controls?:any[];invalid?:string}={}){
  const calls:string[]=[]
  const execute=async(sql:string)=>{
    calls.push(sql)
    if(sql.startsWith('DESCRIBE HISTORY'))return {rows:[{version:sql.includes('so1_')?(changes.version??'0'):'0'}],columns:[]}
    if(sql.includes('payload_b64'))return {rows:[{dataset_id:binding.datasetId,record_id:'gold_receipt',payload_sha256:binding.receiptSha256,payload_b64:deflateSync(Buffer.from(originalStlCanonical(binding.expectedGoldReceipt))).toString('base64')}],columns:[]}
    if(sql.includes('AS invalid_rows'))return {rows:[{records:String(binding.expectedRecords),unique_records:String(binding.expectedRecords),dataset_count:'1',dataset_id:binding.datasetId,policy_count:'1',policy_version:binding.policy,keys_sha256:binding.keysSha256,eligible_records:String(binding.expectedEligibleRecords),eligible_net:binding.expectedNet,invalid_rows:changes.invalid??'0'}],columns:[]}
    if(sql.includes('SELECT record_key,'))return {rows:changes.rows??rows,columns:[]}
    if(sql.startsWith('SELECT area AS normalized_area'))return {rows:financialRows,columns:[]}
    if(sql.startsWith('SELECT normalized_area,'))return {rows:changes.controls??controls,columns:[]}
    throw Error('Unexpected fixture query')
  }
  return {execute,calls}
}
test('original package reconstructs exact source-bound company and all recorded labels without geographic approval',()=>{
  assert.equal(so1Hash(raw),hash);assert.equal(validateSo1Package(payload,payload.release),payload)
  assert.deepEqual(decodeSo1Rows(rows,hash,payload.release),payload)
  assert.equal(payload.series.length,23)
  const view=so1View(payload,hash,{area:'GOVERNMENT',year:'2026'})
  assert.equal(view.scope.contracts_excluded,true);assert.equal(view.mapping?.is_geographic_territory_approved,'false')
  assert.equal(view.mapping?.mapped_region,null);assert.equal(view.months.length,9)
  assert.equal(view.options.areas.length,23)
  assert.match(so1Table(payload.release,hash),/medshield_original_gold_20261026/)
})
test('matched observed-month YoY and signed label bridge conserve recorded company change',()=>{
  const view=so1View(payload,hash,{year:'2026'})
  assert.equal(view.yoy[0].common_months.length,9)
  assert.ok(Math.abs(view.yoy[0].change!-75699529.53)<.000001)
  const contribution=so1Contributions(payload,'2026')
  assert.equal(contribution.length,22)
  assert.ok(Math.abs(contribution.reduce((sum,row)=>sum+row.change,0)-view.yoy[0].change!)<.000001)
  assert.ok(contribution.some(row=>row.missing_label_months.length>0))
  assert.ok(contribution.every(row=>row.basis.includes('not_verified_zero_sales')))
})
test('signed contribution identity handles negative adjustments and missing-label observations without a zero-sales claim',()=>{
  const months=(a:number|null,b:number|null)=>[{period:'2025-01',revenue:a},{period:'2026-01',revenue:b}]
  const p={series:[{area:'COMPANY',months:months(100,80)},{area:'A',months:months(80,90)},{area:'B',months:months(20,-10)}]} as any
  const bridge=so1Contributions(p,'2026')
  assert.deepEqual(bridge.map(r=>r.change),[10,-30]);assert.equal(bridge[0].company_change,-20)
  p.series[0].months[1].revenue=90;p.series[2].months[1].revenue=null
  const missing=so1Contributions(p,'2026')
  assert.equal(missing[1].change,-20);assert.deepEqual(missing[1].missing_label_months,['2026-01'])
  assert.match(missing[1].basis,/not_verified_zero_sales/)
})
test('original source cannot inherit approved mapping, adjusted records or changed master identity',()=>{
  for(const edit of [(p:any)=>p.series[1].mapping.mapped_region='V',(p:any)=>p.series[1].mapping.is_geographic_territory_approved='true',
    (p:any)=>p.series[1].months[0].adjusted_records=1]){
    const p=structuredClone(payload);edit(p);assert.throws(()=>validateSo1Package(p,p.release))
  }
  assert.throws(()=>validateSo1Package(payload,{...payload.release,product_master_sha256:'0'.repeat(64)}))
})
test('actual original reader uses Delta0 source/candidate and is independent of financial scope',async()=>{
  const f=fixture()
  const data=await withFinancialScope('combined_unreconciled',()=>readSo1Diagnostics({area:'QUEZON',year:'2026'},
    {DATABRICKS_DESCRIPTIVE_ADAPTER:'original_itemized_v1'},f.execute))
  assert.equal(data.checksum,hash);assert.equal(data.source.rows,1032)
  assert.ok(f.calls.every(sql=>!sql.includes('_contract_candidates')&&!sql.includes('medshield_gold_source_20261022')))
  assert.ok(data.components.every(row=>row.period.startsWith('2026-')))
})
test('changed candidate/version/source population and unavailable warehouse fail without old-source fallback',async()=>{
  const changed=structuredClone(controls);changed[0].revenue='1'
  for(const input of [{version:'1'},{rows:rows.slice(1)},{rows:[...rows,rows[1]]},{controls:changed},{invalid:'1'}]){
    await assert.rejects(readSo1Diagnostics({}, {DATABRICKS_DESCRIPTIVE_ADAPTER:'original_itemized_v1'},fixture(input).execute))
  }
  await assert.rejects(readSo1Diagnostics({}, {DATABRICKS_DESCRIPTIVE_ADAPTER:'original_itemized_v1'},async()=>{throw Error('warehouse offline')}))
})
test('actual SO1 route enforces auth, safe failure and fixed-scope validation',async()=>{
  const source=ts.createSourceFile('server.ts',readFileSync('src/server.ts','utf8'),ts.ScriptTarget.Latest,true)
  const route=source.statements.find(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&
    node.expression.expression.getText(source)==='app.get'&&(node.expression.arguments[0] as ts.StringLiteral).text==='/api/sales/so1')!
  const code=ts.transpileModule(route.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
  const app=express();let offline=false,reads=0
  new Function('app','requireAuth','readSo1Diagnostics','So1InputError',code)(app,
    (req:any,res:any,next:any)=>req.headers.authorization?next():res.sendStatus(401),async(input:any)=>{
      reads++;if(offline)throw Error('private warehouse diagnostics');return so1View(payload,hash,input)
    },So1InputError)
  const server=app.listen(0);await new Promise<void>(resolve=>server.once('listening',resolve))
  const url='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/api/sales/so1',headers={authorization:'isolated-test'}
  try{
    assert.equal((await fetch(url)).status,401);assert.equal(reads,0)
    assert.equal((await fetch(url+'?financial_scope=combined_unreconciled',{headers})).status,400)
    const response=await fetch(url+'?area=GOVERNMENT&year=2026',{headers});assert.equal(response.status,200)
    assert.equal((await response.json() as any).scope.geographic_approval,'unapproved_recorded_labels_only')
    offline=true;const failed=await fetch(url,{headers});assert.equal(failed.status,503)
    assert.ok(!JSON.stringify(await failed.json()).includes('private warehouse'))
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
