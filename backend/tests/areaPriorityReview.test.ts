import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {buildAreaPriorityReview} from '../src/areaPriorityReview'
import express from 'express'
import type {AddressInfo} from 'node:net'
import ts from 'typescript'

const regional=JSON.parse(readFileSync('../outputs/so1_regional_completion_20261029/actual-response.json','utf8'))
const rows=JSON.parse(readFileSync('../outputs/so1_regional_connection_20261027/source.json','utf8')).rows
test('pinned controls produce conserving confirmed and unallocated area-month records',()=>{
  const data=buildAreaPriorityReview(regional,rows)
  assert.equal(data.area_months.length,1032)
  assert.equal(data.area_months.reduce((sum,row)=>sum+row.records,0),40171)
  assert.equal(data.area_months.find(row=>row.area==='HOSPITAL')?.region,'UNALLOCATED')
  assert.equal(data.area_months.find(row=>row.area==='QUEZON')?.region,'CALABARZON')
  assert.equal(data.account_identity_available,false)
  assert.equal(data.forecast_approved,false)
})
test('changed, missing or duplicated source controls are rejected before delivery',()=>{
  for(const change of [(copy:typeof rows)=>copy.pop(),(copy:typeof rows)=>copy.push(copy[0]),(copy:typeof rows)=>copy[0].net_sales_php='1.000000']){
    const copy=structuredClone(rows);change(copy);assert.throws(()=>buildAreaPriorityReview(regional,copy))
  }
})
test('actual confirmed-area route authenticates, rejects query overrides and fails safely',async()=>{
  const file=readFileSync('src/server.ts','utf8'),ast=ts.createSourceFile('server.ts',file,ts.ScriptTarget.Latest,true)
  const route=ast.statements.find(statement=>ts.isExpressionStatement(statement)&&ts.isCallExpression(statement.expression)
    &&statement.expression.expression.getText(ast)==='app.get'&&(statement.expression.arguments[0] as ts.StringLiteral).text==='/api/sales/confirmed-area-priority')!
  const code=ts.transpileModule(route.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
  const app=express();let calls=0,offline=false
  new Function('app','requireAuth','readAreaPriorityReview',code)(app,(req:any,res:any,next:any)=>req.headers.authorization?next():res.sendStatus(401),async()=>{calls++;if(offline)throw Error('private warehouse detail');return buildAreaPriorityReview(regional,rows)})
  const server=app.listen(0);await new Promise<void>(resolve=>server.once('listening',resolve))
  const url='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/api/sales/confirmed-area-priority',headers={authorization:'isolated-test'}
  try{
    assert.equal((await fetch(url)).status,401)
    for(const query of ['?region=HOSPITAL','?year=2026','?financial_scope=combined'])assert.equal((await fetch(url+query,{headers})).status,400)
    assert.equal(calls,0);assert.equal((await fetch(url,{headers})).status,200)
    offline=true;const failed=await fetch(url,{headers});assert.equal(failed.status,503)
    const body=JSON.stringify(await failed.json());assert.ok(!body.includes('private warehouse'));assert.match(body,/No substitute/)
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
