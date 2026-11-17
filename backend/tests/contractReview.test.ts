import assert from 'node:assert/strict'
import test from 'node:test'
import {createHash} from 'node:crypto'
import {deflateSync} from 'node:zlib'
import express,{type RequestHandler} from 'express'
import type {AddressInfo} from 'node:net'
import {getContractReview,getContractReviewCsv} from '../src/contractReview'
import {contractReviewRouter} from '../src/contractReviewRoutes'
import {ITEMIZED_PREVIEW_BINDING as binding} from '../src/itemizedPreviewBinding'
import {ItemizedPreviewInputError} from '../src/itemizedPreview'
import type {DatabricksStatementOptions,DatabricksStatementResult} from '../src/databricks'
type Row=Record<string,string|null>
const pin={keysSha256:'d'.repeat(64),expectedRecords:2,expectedEligibleRecords:1,expectedNet:'9.00'}
const canonical=(value:unknown):string=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>JSON.stringify(key)+':'+canonical(value)).join(',')+'}':JSON.stringify(value)
const body=Buffer.from(canonical(binding.expectedGoldReceipt))
const summary={records:'2',net_eligible_records:'1',net_sales:'9.000000',signed_returns:'0.000000',first_delivery_date:'2025-01-01',last_delivery_date:'2025-03-01'}
const result=(rows:Row[]):DatabricksStatementResult=>({rows,columns:Object.keys(rows[0]??{})})
function fixture(changes:Partial<Row>={},version='0') {
  const calls:{sql:string;options?:DatabricksStatementOptions}[]=[]
  const execute=async(sql:string,options?:DatabricksStatementOptions)=>{
    calls.push({sql,options})
    if(sql.startsWith('DESCRIBE HISTORY')) return result([{version:sql.includes('_contract_candidates')?version:'0'}])
    if(sql.includes('payload_b64')) return result([{dataset_id:binding.datasetId,record_id:'gold_receipt',payload_sha256:binding.receiptSha256,payload_b64:deflateSync(body).toString('base64')}])
    if(sql.includes('AS invalid_rows')) return result([{records:String(binding.expectedRecords),unique_records:String(binding.expectedRecords),dataset_count:'1',dataset_id:binding.datasetId,policy_count:'1',policy_version:binding.policy,keys_sha256:binding.keysSha256,eligible_records:String(binding.expectedEligibleRecords),eligible_net:binding.expectedNet,invalid_rows:'0'}])
    if(sql.includes('AS invalid_contracts')) return result([{records:'2',unique_records:'2',datasets:'1',dataset_id:binding.datasetId,policies:'1',policy_version:binding.policy,keys_sha256:pin.keysSha256,eligible_records:'1',eligible_net:'9.000000',invalid_contracts:'0',...changes}])
    if(sql.includes('SELECT DISTINCT')) return result([{year:'2025'}])
    if(sql.includes('GROUP BY')) return result([{period:'2025-01',...summary}])
    if(sql.includes('first_delivery_date')) return result([{...summary}])
    throw new Error('Unexpected fixture SQL')
  }
  return {execute,calls}
}
test('separate contract review uses immutable contract measures and never combines itemized net',async()=>{
  assert.equal(createHash('sha256').update(body).digest('hex'),binding.receiptSha256)
  const f=fixture(), review=await getContractReview({},f.execute,binding,pin)
  assert.equal(review.summary.net_sales,'9.000000')
  assert.equal(review.source.excluded_from_itemized_totals,true)
  assert.equal(review.source.additive_to_itemized,'unverified')
  assert.equal(review.source.physical_quantity,null)
  assert.equal(review.source.financial_release_approved,false)
  assert.equal(review.source.forecast_approval,false)
  assert.ok(!('products' in review))
  const measures=f.calls.filter(call=>call.sql.includes('GROUP BY')||call.sql.includes('first_delivery_date'))
  assert.ok(measures.every(call=>call.sql.includes('_contract_candidates` VERSION AS OF 0')&&!call.sql.includes('_financial_candidates')))
})
test('product, area, combined scope, arrays and product export fail before warehouse reads',async()=>{
  const f=fixture()
  for(const input of [{area:'all'},{category:'medicine'},{scope:'combined'},{year:['2025']},{year:'2016'}])
    await assert.rejects(getContractReview(input,f.execute,binding,pin),ItemizedPreviewInputError)
  await assert.rejects(getContractReviewCsv('products',{},f.execute,binding,pin),ItemizedPreviewInputError)
  assert.equal(f.calls.length,0)
})
test('changed source, fabricated itemization/approval, duplicate keys and net mismatch fail closed',async()=>{
  for(const change of [{keys_sha256:'e'.repeat(64)},{records:'3'},{unique_records:'1'},{eligible_net:'10'},{invalid_contracts:'1'},{dataset_id:'other'},{eligible_records:'2'}]) {
    const f=fixture(change)
    await assert.rejects(getContractReview({},f.execute,binding,pin))
    assert.ok(!f.calls.some(call=>call.sql.includes('GROUP BY')))
  }
  await assert.rejects(getContractReview({},fixture({},'1').execute,binding,pin),/changed after staging/)
  await assert.rejects(getContractReview({},async()=>{throw new Error('offline')},binding,pin),/offline/)
})
test('year-only parameters and contract CSV carry scope, no added revenue or invented product detail',async()=>{
  const f=fixture(),csv=await getContractReviewCsv('monthly',{year:'2025'},f.execute,binding,pin)
  assert.ok(csv.csv.startsWith('\uFEFF'))
  assert.ok(csv.csv.includes('"9.000000"'))
  assert.ok(csv.csv.includes('"contract_summary_review_only","true","unverified","unavailable","unavailable","false"'))
  assert.ok(csv.csv.includes('"Quantity unit approved","Forecast approved"'))
  const measures=f.calls.filter(call=>call.sql.includes('GROUP BY')||call.sql.includes('first_delivery_date'))
  for(const call of measures) assert.deepEqual(call.options?.parameters,[{name:'start_date',value:'2025-01-01',type:'DATE'},{name:'end_date',value:'2026-01-01',type:'DATE'}])
})
test('contract endpoints require auth/role, reject unknown input and suppress provider diagnostics',async()=>{
  let reads=0
  const auth:RequestHandler=(req,res,next)=>req.headers.authorization?next():void res.sendStatus(401)
  const role:RequestHandler=(req,res,next)=>req.headers.authorization==='Bearer analyst'?next():void res.sendStatus(403)
  const app=express();app.use('/review',contractReviewRouter(auth,role,{
    preview:async input=>{reads++;if(input.category)throw new ItemizedPreviewInputError('Year only');throw new Error('private diagnostic')},
    csv:async()=>{reads++;throw new Error('private diagnostic')},
  }))
  const server=app.listen(0,'127.0.0.1')
  try{
    await new Promise<void>(resolve=>server.once('listening',resolve))
    const url='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/review'
    for(const path of ['', '/export?view=monthly']){
      assert.equal((await fetch(url+path)).status,401)
      assert.equal((await fetch(url+path,{headers:{Authorization:'Bearer viewer'}})).status,403)
    }
    assert.equal(reads,0)
    const response=await fetch(url,{headers:{Authorization:'Bearer analyst'}})
    assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store')
    assert.ok(!(await response.text()).includes('private diagnostic'))
    assert.equal((await fetch(url+'?category=medicine',{headers:{Authorization:'Bearer analyst'}})).status,400)
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
