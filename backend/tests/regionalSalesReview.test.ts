import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import express from 'express'
import type {AddressInfo} from 'node:net'
import ts from 'typescript'
import {validateRegionalReview,readRegionalReview,REGIONAL_BINDING as pin} from '../src/regionalSalesReview'
const source=JSON.parse(readFileSync('../outputs/so1_regional_connection_20261027/source.json','utf8'))
const raw=readFileSync('../outputs/so1_regional_connection_20261027/mapping.json','utf8'),release=source.release,rows=source.rows
const saved={mapping_sha256:pin.mappingSha256,payload_json:raw}
test('nine confirmed labels allocate once; unallocated plus regions conserve all original finances',()=>{
  const data=validateRegionalReview(raw,release,rows)
  assert.equal(data.company.records,40171);assert.equal(data.company.net_sales_php,'638015351.530000')
  assert.equal(data.coverage.mapped_records,19455);assert.equal(data.coverage.mapped_signed_net_sales_php,'115614895.770000')
  assert.equal(data.summaries.find(r=>r.region==='UNALLOCATED')!.net_sales_php,'522400455.760000')
  assert.equal(data.summaries.find(r=>r.region==='CALABARZON')!.gross_profit_php,'52098289.160000')
  assert.equal(data.summaries.length,4);assert.equal(data.mappings.length,9);assert.equal(data.unallocated_labels.length,13)
  for(const label of ['GOVERNMENT','HOSPITAL','BICOL','MINDORO'])assert.ok(data.unallocated_labels.includes(label))
  assert.equal(data.scope.forecast_approved,false);assert.equal(data.scope.external_join_approved,false)
})
for(const [label,edit] of Object.entries({version:(r:any)=>r.fact_delta_version=1,
  table:(r:any)=>r.source_table='workspace.wrong.fact',approval:(r:any)=>r.original_itemized.forecast_approval=true,
  receipt:(r:any)=>r.original_itemized.receipt_sha256='0'.repeat(64),
  master:(r:any)=>r.product_master_sha256='0'.repeat(64)})){
  test('changed regional source '+label+' rejects',()=>{const r=structuredClone(release);edit(r);assert.throws(()=>validateRegionalReview(raw,r,rows))})
}
test('changed or duplicate mapping, source group or cancelling source amounts fail closed',()=>{
  const mapping=JSON.parse(raw);mapping.mappings.push(mapping.mappings[0]);assert.throws(()=>validateRegionalReview(JSON.stringify(mapping),release,rows))
  assert.throws(()=>validateRegionalReview(raw,release,rows.slice(1)))
  const change=structuredClone(rows);change[0].net_sales_php='1.000000';change[1].net_sales_php='-1.000000'
  assert.throws(()=>validateRegionalReview(raw,release,change))
})
test('candidate reader validates immutable version, single row and source; unavailable never substitutes',async()=>{
  const execute=async(sql:string)=>({rows:sql.startsWith('DESCRIBE')?[{version:'0'}]:sql.startsWith('SELECT mapping')?[saved]:rows} as any)
  assert.equal((await readRegionalReview(execute,async()=>release)).coverage.confirmed_labels,9)
  for(const candidates of [[],[saved,saved],[{...saved,mapping_sha256:'0'.repeat(64)}]]){
    await assert.rejects(readRegionalReview(async(sql:string)=>({rows:sql.startsWith('DESCRIBE')?[{version:'0'}]:sql.startsWith('SELECT mapping')?candidates:rows} as any),async()=>release))
  }
  await assert.rejects(readRegionalReview(async(sql:string)=>({rows:sql.startsWith('DESCRIBE')?[{version:'1'}]:sql.startsWith('SELECT mapping')?[saved]:rows} as any),async()=>release))
  await assert.rejects(readRegionalReview(async()=>{throw Error('warehouse offline')},async()=>release))
})
test('actual regional route authenticates, refuses all filters and returns safe 503',async()=>{
  const text=readFileSync('src/server.ts','utf8'),ast=ts.createSourceFile('server.ts',text,ts.ScriptTarget.Latest,true)
  const route=ast.statements.find(n=>ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&n.expression.expression.getText(ast)==='app.get'&&(n.expression.arguments[0] as ts.StringLiteral).text==='/api/sales/regional-source-review')!
  const code=ts.transpileModule(route.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
  const app=express();let calls=0,offline=false
  new Function('app','requireAuth','readRegionalReview',code)(app,(req:any,res:any,next:any)=>req.headers.authorization?next():res.sendStatus(401),async()=>{calls++;if(offline)throw Error('private warehouse detail');return validateRegionalReview(raw,release,rows)})
  const server=app.listen(0);await new Promise<void>(resolve=>server.once('listening',resolve))
  const url='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/api/sales/regional-source-review',headers={authorization:'isolated-test'}
  try{
    assert.equal((await fetch(url)).status,401)
    for(const query of ['?region=BICOL','?year=2026','?financial_scope=combined_unreconciled'])assert.equal((await fetch(url+query,{headers})).status,400)
    assert.equal(calls,0);assert.equal((await fetch(url,{headers})).status,200)
    offline=true;const failed=await fetch(url,{headers});assert.equal(failed.status,503);const body=JSON.stringify(await failed.json());assert.ok(!body.includes('private warehouse'));assert.match(body,/No substitute/)
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
