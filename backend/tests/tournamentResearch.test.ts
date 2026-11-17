import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import express from 'express'
import type {AddressInfo} from 'node:net'
import ts from 'typescript'
import {validateTournamentResearch,readTournamentResearch,TOURNAMENT_BINDING as pin} from '../src/tournamentResearch'
import {ITEMIZED_PREVIEW_BINDING as binding} from '../src/itemizedPreviewBinding'

const raw=readFileSync('../outputs/wp4_new_tournament_20261030/results.json','utf8')
const input=JSON.parse(readFileSync('../outputs/wp4_forecast_tournament_20261030/source.json','utf8'))
const release={dataset_id:binding.datasetId,source_table:binding.itemizedTable,fact_delta_version:0,
  policy_version:binding.policy,product_master_sha256:binding.expectedGoldReceipt.accepted_master_sha256,
  area_mapping_sha256:null,publication_status:'candidate',original_itemized:input.source_identity}
const row={run_id:pin.storageId,artifact_hash:pin.artifactSha256,payload_json:raw}
const result=()=>validateTournamentResearch(raw,release,input.monthly)

test('actual tournament reconciles 1980 points, 198 groups, lead-specific selection and unavailable recipes',()=>{
  const d=result();assert.equal(d.points.length,1980);assert.equal(d.groups.length,198)
  assert.equal(d.groups.filter(g=>g.complete).length,117)
  assert.deepEqual(d.selections.map(s=>s.model_id),['mean_6','seasonal_naive','seasonal_naive'])
  assert.equal(d.groups.filter(g=>g.n===0).length,81)
  assert.equal(d.activation_allowed,false);assert.equal(d.operational_approval,false)
  assert.equal(d.financial_release_approved,false);assert.equal(d.publication_approved,false)
  assert.ok(d.points.every(p=>p.actual!==null&&p.stage!=='future'))
  for(const lead of [1,3,6]){
    const g=d.groups.find(g=>g.stage==='inspected_extension'&&g.lead_months===lead&&g.model_id==='mean_6')!
    assert.equal(g.n,4);assert.ok(g.mae!>0&&g.mase!>0)
  }
})
for(const [name,mutate] of Object.entries({dataset:(r:any)=>r.dataset_id='wrong',version:(r:any)=>r.fact_delta_version=1,
  receipt:(r:any)=>r.original_itemized.receipt_sha256='0'.repeat(64),approval:(r:any)=>r.original_itemized.forecast_approval=true,
  product:(r:any)=>r.product_master_sha256='0'.repeat(64),policy:(r:any)=>r.policy_version='other'})){
  test('rejects changed '+name+' before returning research',()=>{
    const r=structuredClone(release);mutate(r);assert.throws(()=>validateTournamentResearch(raw,r,input.monthly))
  })
}
test('changed monthly inputs, incomplete months, duplicate months and altered payload reject',()=>{
  const m=structuredClone(input.monthly);m[0].net_sales_php='0'
  for(const rows of [m,input.monthly.slice(1),[...input.monthly.slice(1),input.monthly[1]]])assert.throws(()=>validateTournamentResearch(raw,release,rows))
  assert.throws(()=>validateTournamentResearch(raw+' ',release,input.monthly))
})
test('reader accepts only one immutable Gold candidate and propagates unavailable sources',async()=>{
  const execute=async(sql:string)=>({rows:sql.includes('GROUP BY')?input.monthly:[row]} as any)
  assert.equal((await readTournamentResearch(execute,async()=>release)).points.length,1980)
  for(const rows of [[],[row,row],[{...row,run_id:'wrong'}],[{...row,artifact_hash:'0'.repeat(64)}]]){
    await assert.rejects(readTournamentResearch(async(sql:string)=>({rows:sql.includes('GROUP BY')?input.monthly:rows} as any),async()=>release))
  }
  await assert.rejects(readTournamentResearch(async()=>{throw Error('offline')},async()=>release),/offline/)
})
test('actual authenticated route rejects all filters and returns safe source failure',async()=>{
  const source=ts.createSourceFile('server.ts',readFileSync('src/server.ts','utf8'),ts.ScriptTarget.Latest,true)
  const route=source.statements.find(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)
    &&node.expression.expression.getText(source)==='app.get'&&(node.expression.arguments[0] as ts.StringLiteral).text==='/api/sales/tournament-research')!
  const code=ts.transpileModule(route.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
  const app=express();let reads=0,offline=false
  new Function('app','requireAuth','readTournamentResearch',code)(app,(req:any,res:any,next:any)=>req.headers.authorization?next():res.sendStatus(401),async()=>{reads++;if(offline)throw Error('private');return result()})
  const server=app.listen(0);await new Promise<void>(r=>server.once('listening',r));const url='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/api/sales/tournament-research'
  try{
    assert.equal((await fetch(url)).status,401);assert.equal(reads,0)
    const headers={authorization:'fixture'}
    for(const q of ['?year=2026','?lead=6','?sector=All','?financial_scope=combined_unreconciled'])assert.equal((await fetch(url+q,{headers})).status,400)
    assert.equal(reads,0);assert.equal((await fetch(url,{headers})).status,200)
    offline=true;const r=await fetch(url,{headers});assert.equal(r.status,503);assert.ok(!JSON.stringify(await r.json()).includes('private'))
  }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()))}
})

function frontend(){
  const code=ts.transpileModule(readFileSync('../frontend/services/api/tournament-research.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
  const exports:any={};new Function('exports','require',code)(exports,()=>({}));return exports
}
test('compiled actual frontend validates gateway response and exports every stage/model/lead',()=>{
  const f=frontend(),d=result();assert.equal(f.validTournamentResearch(d),true)
  for(const stage of d.stages)for(const lead of d.leads)for(const model of d.models){
    const records=f.tournamentCsvRecords(d,stage,lead,model)
    assert.equal(records.length,d.groups.find(g=>g.stage===stage&&g.lead_months===lead&&g.model_id===model)!.expected_cases+1)
    assert.ok(records.slice(1).every((r:any[])=>r[1]===lead&&r[2]===model&&r.slice(-4).every(v=>v===false)))
  }
})
test('frontend rejects score, selection, calendar, missing/duplicate cases, approval and source inconsistencies',()=>{
  const f=frontend()
  const edits=[(d:any)=>d.groups[0].mae=0,(d:any)=>d.selections[0].model_id='last_value',
    (d:any)=>d.points[0].target_period='2026-09',(d:any)=>d.points.pop(),(d:any)=>d.points[0]=d.points[1],
    (d:any)=>d.points[0].actual=0,(d:any)=>d.points[0].mase_scale=0,(d:any)=>d.publication_approved=true,
    (d:any)=>d.source.artifact_sha256='0'.repeat(64),(d:any)=>d.scope.unit='ampoules',
    (d:any)=>d.groups[0].complete=false,(d:any)=>d.points[0].prediction=null]
  for(const edit of edits){const d=result();edit(d);assert.equal(f.validTournamentResearch(d),false);assert.throws(()=>f.tournamentCsvRecords(d,'inspected_extension',1,'mean_6'))}
})
