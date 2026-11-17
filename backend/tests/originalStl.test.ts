import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {deflateSync} from 'node:zlib'
import express from 'express'
import type {AddressInfo} from 'node:net'
import ts from 'typescript'
import {readOriginalStl,ORIGINAL_STL_BINDING,originalStlCanonical} from '../src/originalStl'
import {ITEMIZED_PREVIEW_BINDING as binding} from '../src/itemizedPreviewBinding'
import {withFinancialScope,currentFinancialScope} from '../src/financialScope'
import {readOriginalItemizedRelease} from '../src/originalItemizedSource'
import type {DatabricksStatementOptions,DatabricksStatementResult} from '../src/databricks'
import type {DescriptiveRelease} from '../src/descriptiveSource'

type Row=Record<string,string|null>
const input=JSON.parse(readFileSync(resolve(__dirname,'fixtures/original-stl-candidate.json'),'utf8')) as {candidate_rows:Row[];monthly_rows:Row[]}
const receipt=Buffer.from(originalStlCanonical(binding.expectedGoldReceipt))
const result=(rows:Row[]):DatabricksStatementResult=>({rows,columns:Object.keys(rows[0]??{})})
function fixture(options:{candidate?:Row[];monthly?:Row[];version?:string;sourceChange?:Partial<Row>}={}) {
  const calls:string[]=[]
  const execute=async(sql:string,_options?:DatabricksStatementOptions)=>{
    calls.push(sql);assert.ok(sql.startsWith('SELECT ')||sql.startsWith('DESCRIBE HISTORY '),'All reader operations are read-only')
    if(sql.startsWith('DESCRIBE HISTORY'))return result([{version:sql.includes('medshield_original_stl_')?(options.version??'0'):'0'}])
    if(sql.includes('payload_b64'))return result([{dataset_id:binding.datasetId,record_id:'gold_receipt',payload_sha256:binding.receiptSha256,payload_b64:deflateSync(receipt).toString('base64')}])
    if(sql.includes('AS invalid_rows'))return result([{records:String(binding.expectedRecords),unique_records:String(binding.expectedRecords),dataset_count:'1',dataset_id:binding.datasetId,policy_count:'1',policy_version:binding.policy,keys_sha256:binding.keysSha256,eligible_records:String(binding.expectedEligibleRecords),eligible_net:binding.expectedNet,invalid_rows:'0',...options.sourceChange}])
    if(sql.includes('SELECT row_id,'))return result(options.candidate??structuredClone(input.candidate_rows))
    if(sql.includes('AS matching_margin_revenue_php'))return result(options.monthly??structuredClone(input.monthly_rows))
    throw new Error('Unexpected isolated fixture query')
  }
  return {execute,calls}
}
async function activeRelease():Promise<DescriptiveRelease>{return readOriginalItemizedRelease(fixture().execute)}

test('immutable source, 202 saved records and live monthly controls yield 81 source-bound diagnostic components',async()=>{
  const f=fixture(),release=await activeRelease(),data=await readOriginalStl(release,f.execute)
  assert.equal(data.rows.length,81);assert.equal(data.calendar.length,120)
  assert.equal(data.rows[0].period,'2020-01');assert.equal(data.rows.at(-1)!.period,'2026-09')
  assert.ok(data.rows.every(row=>row.segment_start==='2020-01'&&row.segment_end==='2026-09'))
  assert.equal(data.source.checksum,ORIGINAL_STL_BINDING.recordsSha256)
  assert.equal(data.candidate.model_publication_approved,false);assert.equal(data.candidate.financial_release_approved,false)
  assert.equal(data.coverage.missing_source_months.length,10);assert.equal(data.coverage.outside_observed_source_months.length,3)
  assert.equal(data.calendar.filter(row=>row.net_sales_php===null).length,13)
  assert.equal(f.calls.length,7)
  assert.ok(f.calls.every(sql=>!sql.includes('_contract_candidates')&&!sql.includes('medshield_gold_source_20261022')))
  assert.ok(f.calls.filter(sql=>sql.startsWith('SELECT ')).every(sql=>sql.includes('VERSION AS OF 0')))
})

test('changed source or active identity cannot reuse candidate evidence',async()=>{
  const release=await activeRelease()
  for(const change of [{dataset_id:'different'},{source_table:'other'},{fact_delta_version:1},{product_master_sha256:'changed'}]) {
    const f=fixture();await assert.rejects(readOriginalStl({...release,...change},f.execute));assert.equal(f.calls.length,0)
  }
  for(const change of [{receipt_sha256:'changed'},{contracts_excluded:false},{financial_release_approved:true}]) {
    const f=fixture()
    await assert.rejects(readOriginalStl({...release,original_itemized:{...release.original_itemized!,...change}},f.execute))
    assert.equal(f.calls.length,0)
  }
  const f=fixture({sourceChange:{invalid_rows:'1'}})
  await assert.rejects(readOriginalStl(release,f.execute));assert.ok(f.calls.every(sql=>!sql.includes('medshield_original_stl_')))
})

test('changed candidate version, keys, payload, approval flags or counts fail without fallback',async()=>{
  const release=await activeRelease()
  await assert.rejects(readOriginalStl(release,fixture({version:'1'}).execute),/changed after staging/)
  const duplicate=structuredClone(input.candidate_rows);duplicate[0]=duplicate[1]
  const changed=structuredClone(input.candidate_rows);changed[0].payload_json+=' '
  const modifiedApproval=structuredClone(input.candidate_rows)
  const row=modifiedApproval.find(row=>row.record_type==='receipt')!
  const payload=JSON.parse(row.payload_json!);payload.model_publication_approved=true;row.payload_json=JSON.stringify(payload)
  for(const candidate of [duplicate,changed,modifiedApproval,input.candidate_rows.slice(1),[...input.candidate_rows,input.candidate_rows[0]]])
    await assert.rejects(readOriginalStl(release,fixture({candidate}).execute))
})

test('live monthly changes in money, matched margin basis, counts or coverage fail source parity',async()=>{
  const release=await activeRelease()
  for(const field of ['net_sales_php','supported_gross_profit_php','matching_margin_revenue_php','source_records']) {
    const monthly=structuredClone(input.monthly_rows);monthly[0][field]='1'
    await assert.rejects(readOriginalStl(release,fixture({monthly}).execute),/monthly inputs differ/)
  }
  await assert.rejects(readOriginalStl(release,fixture({monthly:input.monthly_rows.slice(1)}).execute))
})

test('required warehouse failure has no previous-source or local-value fallback',async()=>{
  const release=await activeRelease();const calls:string[]=[]
  await assert.rejects(readOriginalStl(release,async sql=>{calls.push(sql);throw new Error('warehouse offline')}),/warehouse offline/)
  assert.equal(calls.length,2) // The two source-history reads start together.
  assert.ok(calls.every(sql=>sql.startsWith('DESCRIBE HISTORY')&&!sql.includes('medshield_original_stl_')))
})

test('financial scope context never changes the independent itemized STL population',async()=>{
  const release=await activeRelease()
  await withFinancialScope('combined_unreconciled',async()=>{
    const f=fixture(),data=await readOriginalStl(release,f.execute)
    assert.equal(data.candidate.contracts_excluded,true);assert.equal(data.rows.length,81)
    assert.equal(currentFinancialScope(),'combined_unreconciled')
    assert.ok(!f.calls.some(sql=>sql.includes('_contract_candidates')))
  })
})

test('actual main STL branch selects the verified original reader and never the old STL tables',async()=>{
  const source=readFileSync(resolve(__dirname,'../src/databricksDashboard.ts'),'utf8')
  const body=source.slice(source.indexOf('export async function getDatabricksStl()')).replace(/^export /,'')
  const compiled=ts.transpileModule(body,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
  const release=await activeRelease(),data=await readOriginalStl(release,fixture().execute)
  const get=new Function('descriptiveRelease','readOriginalStl',compiled+';return getDatabricksStl')(
    async()=>release,async(actual:DescriptiveRelease)=>{assert.equal(actual,release);return data})
  assert.equal(await get(),data)
  const failed=new Function('descriptiveRelease','readOriginalStl',compiled+';return getDatabricksStl')(
    async()=>release,async()=>{throw new Error('candidate unavailable')})
  await assert.rejects(failed(),/candidate unavailable/)
})

test('existing HTTP STL route preserves authentication and safe 503 on provider failure',async()=>{
  const source=ts.createSourceFile('server.ts',readFileSync(resolve(__dirname,'../src/server.ts'),'utf8'),ts.ScriptTarget.Latest,true)
  const route=source.statements.find(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)
    &&node.expression.expression.getText(source)==='app.get'&&(node.expression.arguments[0] as ts.StringLiteral).text==='/api/seasonality/stl')!
  const code=ts.transpileModule(route.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
  const app=express(),release=await activeRelease(),data=await readOriginalStl(release,fixture().execute)
  let reads=0,offline=false
  new Function('app','requireAuth','getDatabricksStl',code)(app,(req:any,res:any,next:any)=>req.headers.authorization?next():res.sendStatus(401),async()=>{
    reads++;if(offline)throw new Error('private provider diagnostics');return data
  })
  const server=app.listen(0);await new Promise<void>(resolve=>server.once('listening',resolve))
  const url='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/api/seasonality/stl'
  try {
    assert.equal((await fetch(url)).status,401);assert.equal(reads,0)
    const response=await fetch(url,{headers:{authorization:'isolated-session'}})
    assert.equal(response.status,200);assert.equal((await response.json() as any).candidate.release_id,ORIGINAL_STL_BINDING.releaseId)
    offline=true
    const failed=await fetch(url,{headers:{authorization:'isolated-session'}})
    assert.equal(failed.status,503);const body=JSON.stringify(await failed.json());assert.ok(!body.includes('private provider'))
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
