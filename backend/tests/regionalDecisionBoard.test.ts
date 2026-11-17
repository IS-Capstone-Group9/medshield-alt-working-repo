import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import express from 'express'
import type {AddressInfo} from 'node:net'
import ts from 'typescript'
import vm from 'node:vm'
import {validateRegionalStl} from '../src/regionalStlReview'
import {buildRegionalDecisionBoard,readRegionalDecisionBoard} from '../src/regionalDecisionBoard'
const model:any={}
const compiled=ts.transpileModule(readFileSync('../frontend/services/api/regional-decision-board.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
vm.runInNewContext(compiled,{exports:model,require:()=>({getJson:()=>{throw Error('Unexpected request')}})})
const {validRegionalDecisionBoard,regionalDecisionBoardCsv}=model

const source=JSON.parse(readFileSync('../outputs/so1_regional_stl_20261028/source.json','utf8'))
const raw=readFileSync('../outputs/so1_regional_stl_20261028/analysis.json','utf8')
const stl=validateRegionalStl(raw,source)

test('board reconciles retained regional finances and keeps unsupported domains unavailable',()=>{
  const result=buildRegionalDecisionBoard(source,stl)
  assert.equal(result.rows.length,18)
  assert.equal(validRegionalDecisionBoard(result),true)
  const financial=result.rows.find(r=>r.region==='CALABARZON'&&r.domain==='sales_and_seasonality')!
  assert.ok(Math.abs(financial.matched_yoy_pct!-2.21)<.005)
  assert.equal(financial.matched_months.length,9)
  assert.equal(result.rows.filter(r=>r.domain!=='sales_and_seasonality').every(r=>r.status==='unavailable'),true)
  assert.equal(result.rows.find(r=>r.region==='MIMAROPA'&&r.domain==='sales_and_seasonality')!.matched_yoy_pct,null)
  assert.match(regionalDecisionBoardCsv(result),/OFFICIAL_LIVE_BULLETIN_UNAVAILABLE/)
  assert.match(regionalDecisionBoardCsv(result),new RegExp(source.source.policy_version))
  const changed=structuredClone(result);changed.records[0][4]='incorrect'
  assert.equal(validRegionalDecisionBoard(changed),false)
})

test('board requires identical source and propagates source failures without fallback',async()=>{
  const changed=structuredClone(stl);changed.source.dataset_id='different'
  assert.throws(()=>buildRegionalDecisionBoard(source,changed))
  let stlReads=0
  await assert.rejects(readRegionalDecisionBoard(async()=>{throw Error('offline')},async()=>{stlReads++;return stl}))
  assert.equal(stlReads,0)
  const result=await readRegionalDecisionBoard(async()=>source,async current=>{assert.equal(current,source);return stl})
  assert.equal(result.rows.length,18)
})

test('actual decision board route authenticates, rejects filters and hides upstream detail',async()=>{
  const ast=ts.createSourceFile('server.ts',readFileSync('src/server.ts','utf8'),ts.ScriptTarget.Latest,true)
  const route=ast.statements.find(n=>ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&n.expression.expression.getText(ast)==='app.get'&&(n.expression.arguments[0] as ts.StringLiteral).text==='/api/sales/regional-decision-board')!
  const code=ts.transpileModule(route.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
  const app=express();let calls=0,offline=false
  new Function('app','requireAuth','readRegionalDecisionBoard',code)(app,(req:any,res:any,next:any)=>req.headers.authorization?next():res.sendStatus(401),async()=>{calls++;if(offline)throw Error('private-detail');return buildRegionalDecisionBoard(source,stl)})
  const server=app.listen(0);await new Promise<void>(resolve=>server.once('listening',resolve))
  const url='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/api/sales/regional-decision-board',headers={authorization:'fixture'}
  try{
    assert.equal((await fetch(url)).status,401)
    assert.equal((await fetch(url+'?year=2026',{headers})).status,400);assert.equal(calls,0)
    assert.equal((await fetch(url,{headers})).status,200)
    offline=true;const failed=await fetch(url,{headers});assert.equal(failed.status,503)
    assert.ok(!JSON.stringify(await failed.json()).includes('private-detail'))
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
