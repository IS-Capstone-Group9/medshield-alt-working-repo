import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import express from 'express'
import type {AddressInfo} from 'node:net'
import ts from 'typescript'
import {withFinancialScope} from '../src/financialScope'
import {validateOriginalResearch,readOriginalResearch,ORIGINAL_RESEARCH_BINDING as pin,originalResearchStorageId} from '../src/originalResearch'
import {ITEMIZED_PREVIEW_BINDING as binding} from '../src/itemizedPreviewBinding'

const input=JSON.parse(readFileSync('../outputs/original_forecast_evaluation_20261027/input/source.json','utf8'))
const raw=readFileSync('../outputs/original_forecast_evaluation_20261027/run/evaluation.json','utf8')
const release={dataset_id:binding.datasetId,source_table:binding.itemizedTable,fact_delta_version:0,
  policy_version:binding.policy,product_master_sha256:binding.expectedGoldReceipt.accepted_master_sha256,
  area_mapping_sha256:null,publication_status:'candidate',original_itemized:input.source_identity}
const row={run_id:originalResearchStorageId,artifact_hash:pin.artifactSha256,payload_json:raw}

test('original Gold-bound research exposes all 21 models and 441 audit cases with no future projections',()=>{
  const result=validateOriginalResearch(raw,release,input.monthly)
  assert.equal(result.comparisons.length,21);assert.equal(result.points.length,441)
  assert.equal(result.selection.model_id,'last_value');assert.equal(result.activation_allowed,false)
  assert.equal(result.publication_approved,false);assert.equal(result.financial_release_approved,false)
  assert.equal(result.scope.contracts_excluded,true);assert.equal(result.scope.company_coverage,'unknown')
  assert.deepEqual(result.available_stages,['retrospective_extension_2026','retrospective_audit'])
  const selected=result.comparisons.find(row=>row.model_id==='last_value')! as any
  assert.ok(Math.abs(selected.retrospective_extension_2026.wape-47.852264690394215)<1e-9)
  assert.ok(Math.abs(selected.retrospective_audit.wape-57.47319117423072)<1e-9)
  assert.ok(result.points.every((point:any)=>point.actual!==null&&point.stage!=='future'))
})

for(const [label,edit] of Object.entries({version:(r:any)=>r.fact_delta_version=1,
  source:(r:any)=>r.source_table='workspace.wrong.fact',approval:(r:any)=>r.original_itemized.forecast_approval=true,
  receipt:(r:any)=>r.original_itemized.receipt_sha256='0'.repeat(64),
  category:(r:any)=>r.product_master_sha256='0'.repeat(64)})){
  test('mismatched '+label+' fails closed',()=>{
    const changed=structuredClone(release);edit(changed)
    assert.throws(()=>validateOriginalResearch(raw,changed,input.monthly))
  })
}
test('changed Gold target history, missing month and saved payload reject without substitution',()=>{
  const changed=structuredClone(input.monthly);changed[0].net_sales_php='1'
  assert.throws(()=>validateOriginalResearch(raw,release,changed))
  assert.throws(()=>validateOriginalResearch(raw,release,input.monthly.slice(1)))
  const run=JSON.parse(raw);run.evaluations[0].metrics.wape=0
  assert.throws(()=>validateOriginalResearch(JSON.stringify(run),release,input.monthly))
})
test('reader uses only named candidate/Gold reads and rejects missing, duplicate or altered candidate rows',async()=>{
  const execute=async(sql:string)=>({rows:sql.includes('GROUP BY')?input.monthly:[row]} as any)
  const result=await readOriginalResearch(release,execute)
  assert.equal(result.points.length,441)
  for(const rows of [[],[row,row],[{...row,artifact_hash:'0'.repeat(64)}]]){
    await assert.rejects(readOriginalResearch(release,async(sql:string)=>({rows:sql.includes('GROUP BY')?input.monthly:rows} as any)))
  }
  await assert.rejects(readOriginalResearch(release,async()=>{throw Error('warehouse unavailable')}),/warehouse unavailable/)
  await assert.rejects(readOriginalResearch({...release,original_itemized:undefined},execute))
})

test('combined Financial scope never brings contracts into the research population',async()=>{
  const calls:string[]=[]
  await withFinancialScope('combined_unreconciled',async()=>{
    const result=await readOriginalResearch(release,async(sql:string)=>{
      calls.push(sql);return {rows:sql.includes('GROUP BY')?input.monthly:[row]} as any
    })
    assert.equal(result.scope.contracts_excluded,true)
  })
  assert.equal(calls.length,2);assert.ok(calls.every(sql=>!sql.includes('_contract_candidates')))
})

test('current-source selector chooses original reader only for the active original adapter',async()=>{
  const source=readFileSync('src/originalResearch.ts','utf8')
  const body=source.slice(source.indexOf('export async function readCurrentSourceResearch()')).replace(/^export /,'')
  const code=ts.transpileModule(body,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
  let selected:any={adapter:'original_itemized_v1'},original=0,legacy=0
  const read=new Function('descriptiveBinding','readDescriptiveRelease','readOriginalResearch','readExtensionResearch',code+';return readCurrentSourceResearch')(
    ()=>selected,async()=>release,async()=>{original++;return 'original'},async()=>{legacy++;return 'legacy'})
  assert.equal(await read(),'original');assert.equal(original,1);assert.equal(legacy,0)
  selected={};assert.equal(await read(),'legacy');assert.equal(original,1);assert.equal(legacy,1)
})

test('actual route enforces auth, fixed scope, source-matched response and safe 503 on source failure',async()=>{
  const source=ts.createSourceFile('server.ts',readFileSync('src/server.ts','utf8'),ts.ScriptTarget.Latest,true)
  const route=source.statements.find(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&
    node.expression.expression.getText(source)==='app.get'&&(node.expression.arguments[0] as ts.StringLiteral).text==='/api/sales/current-source-research')!
  const code=ts.transpileModule(route.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
  const app=express(),data=validateOriginalResearch(raw,release,input.monthly)
  let reads=0,offline=false
  new Function('app','requireAuth','readCurrentSourceResearch',code)(app,
    (req:any,res:any,next:any)=>req.headers.authorization?next():res.sendStatus(401),
    async()=>{reads++;if(offline)throw Error('private warehouse diagnostics');return data})
  const server=app.listen(0);await new Promise<void>(resolve=>server.once('listening',resolve))
  const url='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/api/sales/current-source-research'
  const headers={authorization:'isolated-test'}
  try{
    assert.equal((await fetch(url)).status,401);assert.equal(reads,0)
    for(const query of ['?financial_scope=combined_unreconciled','?year=2026','?sector=All']){
      assert.equal((await fetch(url+query,{headers})).status,400)
    }
    assert.equal(reads,0)
    const response=await fetch(url,{headers});assert.equal(response.status,200)
    assert.equal((await response.json() as any).source.artifact_sha256,pin.artifactSha256)
    offline=true;const failed=await fetch(url,{headers});assert.equal(failed.status,503)
    const body=JSON.stringify(await failed.json());assert.ok(!body.includes('private warehouse'))
    assert.match(body,/No substitute results/)
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
