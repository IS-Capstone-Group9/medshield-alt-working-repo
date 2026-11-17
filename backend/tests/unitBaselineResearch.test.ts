import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import express from 'express'
import type {AddressInfo} from 'node:net'
import ts from 'typescript'
import {validateUnitResearch,readUnitResearch,UNIT_RESEARCH_BINDING as pin} from '../src/unitBaselineResearch'

const raw=readFileSync('../outputs/bupiright_research_connection_20261027/artifact.json','utf8')
const artifact=JSON.parse(raw),release=artifact.source_release,rows=artifact.source_rows
const row={run_id:pin.storageId,artifact_hash:pin.artifactSha256,payload_json:raw}
test('unit research conserves confirmed channel scope, all cases and false activation',()=>{
  const data=validateUnitResearch(raw,release,rows)
  assert.equal(data.points.length,40);assert.equal(data.metrics.length,8)
  assert.equal(data.scope.recorded_channel,'HOSPITAL');assert.equal(data.scope.unit,'ampoules')
  assert.equal(data.scope.geography_status,'channel_not_verified_delivery_territory')
  assert.equal(data.operational_forecasting_approved,false);assert.equal(data.activation_allowed,false)
  assert.equal(data.research_display_authorized,true);assert.equal(data.selected_method,null)
  assert.equal(data.metrics.find(m=>m.method==='seasonal_naive_12'&&m.lead===1)!.wape,31.6)
  assert.equal(data.metrics.find(m=>m.method==='seasonal_naive_12'&&m.lead===3)!.wape,30)
  assert.equal(data.evidence.unreviewed_source_records,13)
})
for(const [label,edit] of Object.entries({version:(r:any)=>r.fact_delta_version=1,
  source:(r:any)=>r.source_table='workspace.wrong.fact',approval:(r:any)=>r.original_itemized.forecast_approval=true,
  receipt:(r:any)=>r.original_itemized.receipt_sha256='0'.repeat(64),
  category:(r:any)=>r.product_master_sha256='0'.repeat(64)})){
  test('unit reader rejects changed '+label,()=>{const r=structuredClone(release);edit(r);assert.throws(()=>validateUnitResearch(raw,r,rows))})
}
test('changed row, duplicate/missing source evidence or changed package rejects',()=>{
  const changed=structuredClone(rows);changed[0].recorded_quantity='999'
  assert.throws(()=>validateUnitResearch(raw,release,changed))
  assert.throws(()=>validateUnitResearch(raw,release,rows.slice(1)))
  assert.throws(()=>validateUnitResearch(raw,release,[...rows,rows[0]]))
  const altered=JSON.parse(raw);altered.operational_forecasting_approved=true
  assert.throws(()=>validateUnitResearch(JSON.stringify(altered),release,rows))
})
test('actual candidate reader refuses duplicate/missing rows, wrong hash and unavailable warehouse',async()=>{
  const execute=async(sql:string)=>({rows:sql.includes('SELECT run_id')?[row]:rows} as any)
  assert.equal((await readUnitResearch(execute,async()=>release)).points.length,40)
  for(const saved of [[],[row,row],[{...row,artifact_hash:'0'.repeat(64)}]]){
    await assert.rejects(readUnitResearch(async(sql:string)=>({rows:sql.includes('SELECT run_id')?saved:rows} as any),async()=>release))
  }
  await assert.rejects(readUnitResearch(async()=>{throw Error('warehouse unavailable')},async()=>release))
})
test('actual HTTP route enforces auth and fixed scope, safe unavailability and no substitute',async()=>{
  const source=ts.createSourceFile('server.ts',readFileSync('src/server.ts','utf8'),ts.ScriptTarget.Latest,true)
  const route=source.statements.find(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&
    node.expression.expression.getText(source)==='app.get'&&(node.expression.arguments[0] as ts.StringLiteral).text==='/api/sales/unit-baseline-research')!
  const code=ts.transpileModule(route.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
  const app=express();let reads=0,offline=false
  new Function('app','requireAuth','readUnitResearch',code)(app,(req:any,res:any,next:any)=>req.headers.authorization?next():res.sendStatus(401),async()=>{
    reads++;if(offline)throw Error('private diagnostic');return validateUnitResearch(raw,release,rows)
  })
  const server=app.listen(0);await new Promise<void>(resolve=>server.once('listening',resolve))
  const url='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/api/sales/unit-baseline-research',headers={authorization:'isolated-test'}
  try{
    assert.equal((await fetch(url)).status,401);assert.equal(reads,0)
    for(const query of ['?year=2026','?channel=GOVERNMENT','?financial_scope=combined_unreconciled','?lead=1'])assert.equal((await fetch(url+query,{headers})).status,400)
    assert.equal(reads,0);const ok=await fetch(url,{headers});assert.equal(ok.status,200)
    assert.equal((await ok.json() as any).scope.recorded_channel,'HOSPITAL')
    offline=true;const failed=await fetch(url,{headers});assert.equal(failed.status,503)
    const body=JSON.stringify(await failed.json());assert.ok(!body.includes('private diagnostic'));assert.match(body,/No substitute results/)
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
