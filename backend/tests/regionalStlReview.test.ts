import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import express from 'express'
import type {AddressInfo} from 'node:net'
import ts from 'typescript'
import {readRegionalStl,validateRegionalStl,REGIONAL_STL_BINDING as pin} from '../src/regionalStlReview'
const directory='../outputs/so1_regional_stl_20261028/',raw=readFileSync(directory+'analysis.json','utf8'),source=JSON.parse(readFileSync(directory+'source.json','utf8'))
const row={artifact_sha256:pin.artifactSha256,payload_json:raw}
test('supported regional components reconstruct and shorter regional runs remain unfitted',()=>{
  const data=validateRegionalStl(raw,source)
  assert.deepEqual(data.series.map((s:any)=>s.components.length),[81,0,0]);assert.equal(data.forecast_approved,false)
  assert.equal(data.series[0].matched_change.recorded_change_php,'124708.290000')
})
for(const [name,edit] of Object.entries({dataset:(s:any)=>s.source.dataset_id='bad',mapping:(s:any)=>s.source.mapping_sha256='bad',approval:(s:any)=>s.scope.forecast_approved=true,
  observation:(s:any)=>s.months[0].net_sales_php='1.000000'})){
  test('changed regional STL '+name+' fails closed',()=>{const s=structuredClone(source);edit(s);assert.throws(()=>validateRegionalStl(raw,s))})
}
test('payload/component mutation cannot bypass the immutable artifact binding',()=>{
  const changed=JSON.parse(raw);changed.series[0].components[0].trend_php=0
  assert.throws(()=>validateRegionalStl(JSON.stringify(changed),source))
})
test('reader rejects missing/duplicate/versioned candidate or warehouse failure',async()=>{
  const exec=async(sql:string)=>({rows:sql.startsWith('DESCRIBE')?[{version:'0'}]:[row]} as any)
  assert.equal((await readRegionalStl(exec,async()=>source)).series[0].components.length,81)
  for(const saved of [[],[row,row],[{...row,artifact_sha256:'bad'}]])await assert.rejects(readRegionalStl(async(sql:string)=>({rows:sql.startsWith('DESCRIBE')?[{version:'0'}]:saved} as any),async()=>source))
  await assert.rejects(readRegionalStl(async(sql:string)=>({rows:sql.startsWith('DESCRIBE')?[{version:'1'}]:[row]} as any),async()=>source))
  await assert.rejects(readRegionalStl(async()=>{throw Error('offline')},async()=>source))
})
test('actual route requires authentication, refuses filters and returns safe 503',async()=>{
  const ast=ts.createSourceFile('server.ts',readFileSync('src/server.ts','utf8'),ts.ScriptTarget.Latest,true)
  const route=ast.statements.find(n=>ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&n.expression.expression.getText(ast)==='app.get'&&(n.expression.arguments[0] as ts.StringLiteral).text==='/api/sales/regional-stl-review')!
  const code=ts.transpileModule(route.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
  const app=express();let calls=0,offline=false
  new Function('app','requireAuth','readRegionalStl',code)(app,(req:any,res:any,next:any)=>req.headers.authorization?next():res.sendStatus(401),async()=>{calls++;if(offline)throw Error('private detail');return validateRegionalStl(raw,source)})
  const server=app.listen(0);await new Promise<void>(resolve=>server.once('listening',resolve))
  const url='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/api/sales/regional-stl-review',headers={authorization:'isolated-test'}
  try{
    assert.equal((await fetch(url)).status,401)
    for(const query of ['?region=BICOL','?year=2026','?financial_scope=combined_unreconciled'])assert.equal((await fetch(url+query,{headers})).status,400)
    assert.equal(calls,0);assert.equal((await fetch(url,{headers})).status,200)
    offline=true;const failed=await fetch(url,{headers});assert.equal(failed.status,503);assert.ok(!JSON.stringify(await failed.json()).includes('private detail'))
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
