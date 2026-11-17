import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import express from 'express'
import type {AddressInfo} from 'node:net'
import ts from 'typescript'
import {abcMetrics,validateAbcResearch,readAbcResearch,ABC_RESEARCH_BINDING as pin} from '../src/abcResearch'
const raw=readFileSync('../outputs/wp6_abc_ui_20261031/artifact.json','utf8')
const original=JSON.parse(readFileSync('../outputs/original_so2_20261027/source.json','utf8'))
const release=original.release
const inputs={product_years:original.queries.product_years.rows,comparison_months:original.queries.comparison_months.rows}
const result=()=>validateAbcResearch(raw,release,inputs)
const saved={run_id:pin.storageId,artifact_hash:pin.artifactSha256,payload_json:raw}
test('hand-solvable confusion counts retain absent denominators and empty groups',()=>{
  const m=abcMetrics([{actual:'A',predicted:'A'},{actual:'A',predicted:'C'},{actual:'B',predicted:'A'}])
  assert.deepEqual(m.confusion_matrix,[[1,0,1],[1,0,0],[0,0,0]])
  assert.equal(m.per_class.A.precision,.5);assert.equal(m.per_class.A.recall,.5)
  assert.equal(m.per_class.B.precision,null);assert.equal(m.per_class.B.f1,0)
  assert.equal(m.per_class.C.recall,null);assert.equal(m.balanced_accuracy,.25)
  const empty=abcMetrics([]);assert.equal(empty.macro_f1,null);assert.equal(empty.accuracy,null)
})
test('actual retained cases reconcile selected baseline, complete cohorts and unassessed challengers',()=>{
  const d=result();assert.equal(d.cases.length,1032);assert.equal(d.groups.length,40);assert.equal(d.selection.model_id,'prior_abc')
  assert.equal(d.groups.find(g=>g.stage==='retrospective_test_2025'&&g.model_id==='prior_abc'&&g.cohort==='all')!.samples,140)
  assert.equal(d.groups.find(g=>g.stage==='partial_2026_extension'&&g.model_id==='prior_abc'&&g.cohort==='all')!.samples,210)
  assert.ok(!d.groups.some(g=>g.stage!=='development_validation'&&g.model_id.startsWith('xgb')))
  assert.equal(d.activation_allowed,false);assert.equal(d.product_identity_approved,false)
})
for(const [name,edit] of Object.entries({version:(r:any)=>r.fact_delta_version=1,source:(r:any)=>r.source_table='wrong',
  approval:(r:any)=>r.original_itemized.forecast_approval=true,receipt:(r:any)=>r.original_itemized.receipt_sha256='0'.repeat(64),
  catalog:(r:any)=>r.product_master_sha256='0'.repeat(64)})){
  test('source '+name+' mismatch fails closed',()=>{const r=structuredClone(release);edit(r);assert.throws(()=>validateAbcResearch(raw,r,inputs))})
}
test('missing, duplicated or changed aggregate groups and altered payload reject',()=>{
  const a=structuredClone(inputs);a.product_years[0].revenue='0'
  for(const changed of [a,{...inputs,product_years:inputs.product_years.slice(1)},
    {...inputs,comparison_months:[...inputs.comparison_months.slice(1),inputs.comparison_months[1]]}])assert.throws(()=>validateAbcResearch(raw,release,changed))
  assert.throws(()=>validateAbcResearch(raw+' ',release,inputs))
})
test('reader gets one exact Gold candidate and validates both source queries; outage never substitutes',async()=>{
  const execute=async(sql:string)=>({rows:sql.includes('payload_json')?[saved]:sql.includes(' AS year')?inputs.product_years:inputs.comparison_months} as any)
  assert.equal((await readAbcResearch(execute,async()=>release)).cases.length,1032)
  for(const rows of [[],[saved,saved],[{...saved,artifact_hash:'bad'}],[{...saved,run_id:'wrong'}]])await assert.rejects(readAbcResearch(async()=>({rows} as any),async()=>release))
  await assert.rejects(readAbcResearch(async()=>{throw Error('outage')},async()=>release),/outage/)
})
test('actual route denies unauthenticated access, rejects filters and masks provider failures',async()=>{
  const source=ts.createSourceFile('server.ts',readFileSync('src/server.ts','utf8'),ts.ScriptTarget.Latest,true)
  const route=source.statements.find(n=>ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&n.expression.expression.getText(source)==='app.get'&&(n.expression.arguments[0] as ts.StringLiteral).text==='/api/sales/abc-research')!
  const code=ts.transpileModule(route.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
  const app=express();let count=0,offline=false
  new Function('app','requireAuth','readAbcResearch',code)(app,(req:any,res:any,next:any)=>req.headers.authorization?next():res.sendStatus(401),async()=>{count++;if(offline)throw Error('private');return result()})
  const server=app.listen(0);await new Promise<void>(r=>server.once('listening',r));const url='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/api/sales/abc-research'
  try{assert.equal((await fetch(url)).status,401);const headers={authorization:'fixture'}
    for(const query of ['?year=2026','?cohort=all','?model=prior_abc','?financial_scope=combined_unreconciled'])assert.equal((await fetch(url+query,{headers})).status,400)
    assert.equal(count,0);assert.equal((await fetch(url,{headers})).status,200)
    offline=true;const r=await fetch(url,{headers});assert.equal(r.status,503);assert.ok(!JSON.stringify(await r.json()).includes('private'))
  }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()))}
})
function frontend(){const exports:any={};const code=ts.transpileModule(readFileSync('../frontend/services/api/abc-research-model.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;new Function('exports',code)(exports);return exports}
test('actual Product cleanup preserves marked research tables while removing illustrative tables',()=>{
  const code=readFileSync('../frontend/services/api/descriptive-products-runtime.ts','utf8')
  const start=code.indexOf("  page.querySelectorAll('table').forEach(table => {")
  const end=code.indexOf('  const hasSource',start);assert.ok(start>=0&&end>start)
  let removed=0,preserved=0
  const research={id:'',closest:(s:string)=>s==='[data-abc-research]'?{}:{remove:()=>preserved++},remove:()=>preserved++}
  const illustrative={id:'old',closest:(s:string)=>s==='.chart-card'?{remove:()=>removed++}:null,remove:()=>removed++}
  const production={id:'productTable',closest:()=>null,remove:()=>preserved++}
  new Function('page',code.slice(start,end))({querySelectorAll:()=>[research,illustrative,production]})
  assert.equal(removed,1);assert.equal(preserved,0)
})
test('compiled frontend validates actual gateway, all 60 review scopes and both CSV types',()=>{
  const f=frontend(),d=result();assert.equal(f.validAbcResearch(d),true)
  for(const stage of d.stages)for(const model of d.models)for(const cohort of d.cohorts){
    const v=f.abcReviewView(d,stage,model,cohort);assert.equal(f.abcMetricCsvRecords(d,stage,model,cohort).length,4)
    if(v.cases.length)assert.equal(f.abcCaseCsvRecords(d,stage,model,cohort).length,v.cases.length+1)
    else assert.throws(()=>f.abcCaseCsvRecords(d,stage,model,cohort))
  }
  assert.equal(f.abcReviewView(d,'retrospective_test_2025','xgb_depth_2','all').status,'model_not_evaluated')
  assert.equal(f.abcReviewView(d,'retrospective_test_2025','prior_abc','prior_ineligible_only').status,'empty_evaluated_cohort')
  assert.match(f.abcCsv([['=formula','@cmd','ordinary']]),/"'=formula","'@cmd","ordinary"/)
})
test('frontend rejects false metrics, identities, dates, unavailable-cohort zeros, selection and missing cases',()=>{
  const f=frontend()
  for(const edit of [(d:any)=>d.groups[0].macro_f1=1,(d:any)=>d.groups[0].per_class.A.precision=1,(d:any)=>d.groups[0].confusion_matrix[0][0]++,
    (d:any)=>d.cases.pop(),(d:any)=>d.cases[0]=d.cases[1],(d:any)=>d.cases[0].feature_cutoff='2026-12-31',
    (d:any)=>d.cases[0].raw_uncalibrated_probabilities=[.2,.3,.5],(d:any)=>d.source.artifact_sha256='bad',
    (d:any)=>d.activation_allowed=true,(d:any)=>d.selection.model_id='xgb_depth_2',
    (d:any)=>d.cases[0].target_provenance=[],(d:any)=>d.cases[0].feature_provenance=['FAKE_APPROVED_SOURCE'],
    (d:any)=>d.groups.find((g:any)=>g.samples===0).macro_f1=0]){
    const d=result();edit(d);assert.equal(f.validAbcResearch(d),false)
  }
})
