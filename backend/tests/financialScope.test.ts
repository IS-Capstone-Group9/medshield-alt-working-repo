import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {deflateSync} from 'node:zlib'
import vm from 'node:vm'
import ts from 'typescript'
import express from 'express'
import type {AddressInfo} from 'node:net'
import {authorizeFinancialScope,currentFinancialScope,financialScopeMetadata,parseFinancialScope,withFinancialScope,FinancialScopeError} from '../src/financialScope'
import {originalItemizedFactSql,validateCombinedFinancialSource} from '../src/originalItemizedSource'
import {ITEMIZED_PREVIEW_BINDING} from '../src/itemizedPreviewBinding'
import {CONTRACT_REVIEW_BINDING} from '../src/contractReviewBinding'
import {getDatabricksSalesSummary} from '../src/databricksDashboard'

test('strict scope parsing and contract role authorization precede provider access',()=>{
  assert.equal(parseFinancialScope(undefined),'itemized')
  for(const value of ['',null,[],['contracts'],{},'all','combined',"contracts' OR TRUE"])
    assert.throws(()=>parseFinancialScope(value),FinancialScopeError)
  for(const role of ['viewer','pharmacist',undefined]) {
    assert.equal(authorizeFinancialScope('itemized',role),'itemized')
    for(const scope of ['contracts','combined_unreconciled']) assert.throws(()=>authorizeFinancialScope(scope,role),(error:any)=>error.status===403)
  }
  for(const role of ['admin','analyst','ANALYST']) assert.equal(authorizeFinancialScope('combined_unreconciled',role),'combined_unreconciled')
})

test('concurrent users and nested itemized product readers never share mutable financial selection',async()=>{
  const gate=Promise.withResolvers<void>()
  const contracts=withFinancialScope('contracts',async()=>{await gate.promise;assert.equal(currentFinancialScope(),'contracts');return financialScopeMetadata()})
  const combined=withFinancialScope('combined_unreconciled',async()=>{
    await withFinancialScope('itemized',async()=>{await Promise.resolve();assert.equal(currentFinancialScope(),'itemized')})
    assert.equal(currentFinancialScope(),'combined_unreconciled');gate.resolve();return financialScopeMetadata()
  })
  const [c,b]=await Promise.all([contracts,combined])
  assert.equal(c.id,'contracts');assert.equal(b.id,'combined_unreconciled')
  assert.equal(b.unreconciled,true);assert.equal(b.additivity,'unverified');assert.equal(b.financial_release_approved,false)
  assert.equal(b.complete_company_sales,false);assert.equal(b.source_tables.length,2)
  assert.equal(currentFinancialScope(),'itemized')
})

test('typed SQL relations retain both grains, immutable versions, signed eligibility and unavailable units',()=>{
  const release:any={source_table:ITEMIZED_PREVIEW_BINDING.itemizedTable,fact_delta_version:0,original_itemized:{}}
  const itemized=originalItemizedFactSql(release),contracts=originalItemizedFactSql(release,'contracts'),combined=originalItemizedFactSql(release,'combined_unreconciled')
  assert.ok(itemized.includes('_itemized_candidates` VERSION AS OF 0')&&!itemized.includes('_contract_candidates`'))
  assert.ok(contracts.includes('_contract_candidates` VERSION AS OF 0')&&!contracts.includes('_itemized_candidates`'))
  assert.ok(combined.includes('UNION ALL'))
  for(const sql of [itemized,contracts,combined]) {
    assert.ok(sql.includes("f.record_kind = 'contract_summary'"))
    assert.ok(sql.includes('f.is_gross_margin_technically_eligible AS is_gross_margin_eligible'))
    assert.ok(sql.includes('FALSE AS is_quantity_observation_eligible'))
    assert.ok(!sql.includes('ABS(f.net_sales)'))
  }
})

test('contract dimension/search filters fail explicitly before SQL reads',async()=>{
  await withFinancialScope('combined_unreconciled',async()=>{
    for(const dimension of [{area:'QUEZON'},{category:'Medical'},{productId:'RAW:medicine'},{sector:'Government'},{territory:'Bicol'},{region:'IV-A'},{search:'medicine'}])
      await assert.rejects(getDatabricksSalesSummary(dimension),/details are unavailable/)
  })
})

test('combined relation validates both immutable partitions, key uniqueness and exact decimal conservation',async()=>{
  const binding=ITEMIZED_PREVIEW_BINDING,pin=CONTRACT_REVIEW_BINDING
  const canonical=(value:unknown):string=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>JSON.stringify(key)+':'+canonical(value)).join(',')+'}':JSON.stringify(value)
  const fixture=(override:Record<string,string>={})=>async(sql:string)=>{
    assert.ok(/^(SELECT|DESCRIBE HISTORY) /.test(sql),'Verification is read-only')
    let row:Record<string,string>
    if(sql.startsWith('DESCRIBE HISTORY')) row={version:'0'}
    else if(sql.includes('payload_b64')) row={dataset_id:binding.datasetId,record_id:'gold_receipt',payload_sha256:binding.receiptSha256,payload_b64:deflateSync(Buffer.from(canonical(binding.expectedGoldReceipt))).toString('base64')}
    else if(sql.includes('invalid_rows')) row={records:String(binding.expectedRecords),unique_records:String(binding.expectedRecords),dataset_count:'1',dataset_id:binding.datasetId,policy_count:'1',policy_version:binding.policy,keys_sha256:binding.keysSha256,eligible_records:String(binding.expectedEligibleRecords),eligible_net:binding.expectedNet,invalid_rows:'0'}
    else if(sql.includes('invalid_contracts')) row={records:String(pin.expectedRecords),unique_records:String(pin.expectedRecords),datasets:'1',dataset_id:binding.datasetId,policies:'1',policy_version:binding.policy,keys_sha256:pin.keysSha256,eligible_records:String(pin.expectedEligibleRecords),eligible_net:pin.expectedNet,invalid_contracts:'0'}
    else {assert.ok(sql.includes('UNION ALL'));row={records:'40523',unique_records:'40523',eligible_records:'39638',eligible_net:'756345601.480000',...override}}
    return {rows:[row],columns:Object.keys(row)}
  }
  assert.equal((await validateCombinedFinancialSource(fixture())).eligible_net,'756345601.480000')
  for(const change of [{unique_records:'40522'},{records:'40524'},{eligible_records:'39639'},{eligible_net:'756345601.480001'}])
    await assert.rejects(validateCombinedFinancialSource(fixture(change)),/conservation controls/)
})

test('snapshot cache and in-flight loads are keyed by scope; failed load is evicted',async()=>{
  let reads=0,fail=true
  const requestContext = await import('../src/requestContext')
  const context=vm.createContext({exports:{},Date,Map,require:(name:string)=>name==='./financialScope'?{currentFinancialScope}:name==='./requestContext'?requestContext:{loadDatabricksDashboardSnapshot:async()=>{
    reads++;const scope=currentFinancialScope();await Promise.resolve()
    if(scope==='contracts'&&fail) throw new Error('required source offline')
    return {scope}
  }},process:{env:{}}})
  vm.runInContext(ts.transpileModule(readFileSync('src/snapshot.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context)
  const load=context.exports.loadSnapshot
  const [a,b,c]=await Promise.all([withFinancialScope('itemized',load),withFinancialScope('combined_unreconciled',load),withFinancialScope('itemized',load)])
  assert.equal(a.scope,'itemized');assert.equal(b.scope,'combined_unreconciled');assert.equal(a,c);assert.equal(reads,2)
  await assert.rejects(withFinancialScope('contracts',load),/offline/)
  fail=false
  assert.equal((await withFinancialScope('contracts',load)).scope,'contracts');assert.equal(reads,4)
  assert.equal((await load()).scope,'itemized');assert.equal(reads,4)
})

test('actual financial route handlers enforce auth/role, preserve filters and expose no partial fallback',async()=>{
  const source=ts.createSourceFile('server.ts',readFileSync('src/server.ts','utf8'),ts.ScriptTarget.Latest,true)
  const paths=['/api/financial/dashboard','/api/sales/status','/api/sales/transactions','/api/sales/summary','/api/sales/financial-export']
  const routes=source.statements.filter(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)
    &&node.expression.expression.getText(source)==='app.get'&&paths.includes((node.expression.arguments[0] as ts.StringLiteral).text)).map(node=>node.getText(source))
  assert.equal(routes.length,5)
  let reads=0,outage=false
  const app=express()
  const read=async(input?:unknown)=>{reads++;await Promise.resolve();if(outage)throw new Error('offline');return {scope:currentFinancialScope(),input}}
  const context=vm.createContext({app,authorizeFinancialScope,withFinancialScope,FinancialScopeError,
    requireAuth:(req:any,res:any,next:any)=>{const role=req.headers.authorization;if(!role)return res.sendStatus(401);req.user={role};next()},
    loadSnapshot:read,getDatabricksSectorTrend:read,getDatabricksSalesStatus:read,getDatabricksSalesSummary:read,getDatabricksSalesTransactions:read,
    getDatabricksFinancialLedgerCsv:async(input:unknown)=>({filename:'ledger.csv',csv:JSON.stringify(await read(input))}),
    salesEvidenceQuery:(req:any)=>({startDate:req.query.start_date,endDate:req.query.end_date}),
    databricksDashboardFailure:(res:any)=>res.status(503).json({error:'Required Gold unavailable; no fallback'})})
  vm.runInContext(ts.transpileModule(routes.join('\n'),{compilerOptions:{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022}}).outputText,context)
  const server=app.listen(0);await new Promise<void>(resolve=>server.once('listening',resolve))
  const base='http://127.0.0.1:'+(server.address() as AddressInfo).port
  try {
    for(const path of paths) {
      assert.equal((await fetch(base+path)).status,401)
      assert.equal((await fetch(base+path+'?financial_scope=contracts',{headers:{authorization:'viewer'}})).status,403)
      assert.equal((await fetch(base+path+'?financial_scope=combined',{headers:{authorization:'analyst'}})).status,400)
      assert.equal((await fetch(base+path+'?financial_scope=contracts&financial_scope=itemized',{headers:{authorization:'analyst'}})).status,400)
    }
    assert.equal(reads,0)
    const responses=await Promise.all(['contracts','combined_unreconciled','itemized'].map(async scope=>{
      const response=await fetch(base+'/api/financial/dashboard?financial_scope='+scope,{headers:{authorization:'analyst'}})
      assert.equal(response.status,200);const data:any=await response.json();assert.equal(data.snapshot.scope,scope);assert.equal(data.sectors.scope,scope)
      return data
    }))
    assert.equal(responses.length,3)
    const csv=await fetch(base+'/api/sales/financial-export?financial_scope=combined_unreconciled&year=2025&start_date=2025-01-01',{headers:{authorization:'admin'}})
    assert.equal(csv.status,200);assert.equal(csv.headers.get('cache-control'),'no-store')
    const value=JSON.parse(await csv.text());assert.equal(value.scope,'combined_unreconciled');assert.equal(value.input.year,'2025');assert.equal(value.input.startDate,'2025-01-01')
    outage=true
    const unavailable=await fetch(base+'/api/financial/dashboard?financial_scope=contracts',{headers:{authorization:'analyst'}})
    assert.equal(unavailable.status,503);assert.ok(!JSON.stringify(await unavailable.json()).includes('snapshot'))
  } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
