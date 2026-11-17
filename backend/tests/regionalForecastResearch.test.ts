import test from 'node:test'
import assert from 'node:assert/strict'
import {existsSync,readFileSync} from 'node:fs'
import ts from 'typescript'
import express from 'express'
import type {AddressInfo} from 'node:net'
import {validateRegionalForecastResearch,reconcileRegionalForecastResearch,readRegionalForecastResearch,REGIONAL_FORECAST_BINDING as pin} from '../src/regionalForecastResearch'
const packet='../outputs/wp4_territorial_research_20261031'
const present=existsSync(packet+'/run/results.json')&&existsSync(packet+'/source/financial.json')
const raw=present?readFileSync(packet+'/run/results.json','utf8'):''
const financial=present?JSON.parse(readFileSync(packet+'/source/financial.json','utf8')):null
const result=()=>validateRegionalForecastResearch(raw,financial)
function frontend(){
 const load=(name:string,imports:any)=>{const exports:any={};new Function('exports','require',ts.transpileModule(readFileSync('../frontend/services/api/'+name+'.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(exports,imports);return exports}
 const shared=load('tournament-research',()=>({}));return load('regional-forecast-research',(name:string)=>name==='./tournament-research'?shared:{})
}
test('immutable byte pin rejects missing, malformed, changed and oversized artifacts without fallback',()=>{
 for(const payload of ['', '{}','null',' '.repeat(3_000_001)])assert.throws(()=>validateRegionalForecastResearch(payload,null as any))
})
test('reader rejects missing/duplicate/conflicting candidates and source/provider outages',async()=>{
 const row={run_id:pin.storageId,artifact_hash:pin.artifactSha256,payload_json:'{}'}
 for(const rows of [[],[row,row],[{...row,run_id:'wrong'}],[{...row,artifact_hash:'0'.repeat(64)}],[row]])await assert.rejects(readRegionalForecastResearch(async()=>({rows} as any),async()=>financial))
 await assert.rejects(readRegionalForecastResearch(async()=>{throw Error('offline')},async()=>financial),/offline/)
 let calls=0;await assert.rejects(readRegionalForecastResearch(async()=>{calls++;return {} as any},async()=>{throw Error('source offline')}),/source offline/);assert.equal(calls,0)
})
test('actual route enforces auth/fixed scope and sanitized source failure',async()=>{
 const source=ts.createSourceFile('server.ts',readFileSync('src/server.ts','utf8'),ts.ScriptTarget.Latest,true)
 const route=source.statements.find(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&node.expression.expression.getText(source)==='app.get'&&(node.expression.arguments[0] as ts.StringLiteral).text==='/api/sales/regional-php-research')!
 const code=ts.transpileModule(route.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
 const app=express();let reads=0,offline=false
 new Function('app','requireAuth','readRegionalForecastResearch',code)(app,(req:any,res:any,next:any)=>req.headers.authorization?next():res.sendStatus(401),async()=>{reads++;if(offline)throw Error('private-provider-detail');return {status:'fixture-route-only'}})
 const server=app.listen(0);await new Promise<void>(r=>server.once('listening',r));const url='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/api/sales/regional-php-research'
 try{assert.equal((await fetch(url)).status,401);assert.equal(reads,0);const headers={authorization:'fixture'}
 for(const q of ['?region=BICOL','?year=2026','?lead=6','?sector=All'])assert.equal((await fetch(url+q,{headers})).status,400)
 assert.equal(reads,0);assert.equal((await fetch(url,{headers})).status,200);offline=true;const r=await fetch(url,{headers});assert.equal(r.status,503);assert.ok(!JSON.stringify(await r.json()).includes('private-provider-detail'))
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()))}
})
test('actual retained regional artifact reconciles all cases and eligible/missing histories',{skip:!present},()=>{
 const d=result();assert.deepEqual(d.regions.map(r=>r.observed_eligible_months),[81,56,38]);assert.equal(d.regions[0].points.length,1980);assert.equal(d.regions[0].groups.length,198)
 assert.deepEqual(d.regions[0].selections.map(s=>s.model_id),['mean_6','mean_6','ridge_direct_a10']);assert.equal(d.regions[0].groups.filter(g=>g.complete).length,117)
 assert.equal(d.regions[1].points.length,0);assert.equal(d.operational_approval,false)
 const source=structuredClone(financial);source.months.find((r:any)=>r.region==='CALABARZON'&&r.period==='2023-01').net_sales_php='0.000000';assert.throws(()=>validateRegionalForecastResearch(raw,source))
})
test('reconciliation rejects altered actuals, calendars, source quality, scores, selection and missing history',{skip:!present},()=>{
 const edits=[(r:any)=>r.regions[0].predictions[0].actual=0,(r:any)=>r.regions[0].predictions[0].target_period='2026-09',
 (r:any)=>r.regions[0].predictions[0].target_source_records=0,(r:any)=>r.regions[0].predictions[0].target_unreviewed_source_records=99,
 (r:any)=>r.regions[0].predictions[0].training_window_unreviewed_records_in_current_snapshot=99,(r:any)=>r.regions[0].predictions[0].mase_scale=1,
 (r:any)=>r.regions[0].reports[0].common.mae=0,(r:any)=>r.regions[0].selections[0].model_id='last_value',
 (r:any)=>r.eligibility[1].observed_eligible_months=81,(r:any)=>r.publication_approved=true,(r:any)=>r.source.mapping_sha256='0'.repeat(64),
 (r:any)=>r.regions[0].predictions.pop(),(r:any)=>r.regions[0].predictions[0]=r.regions[0].predictions[1]]
 for(const edit of edits){const run=JSON.parse(raw);edit(run);assert.throws(()=>reconcileRegionalForecastResearch(run,financial))}
})
test('compiled frontend validates all 198 score views and rejects unsafe responses/exports',{skip:!present},()=>{
 const f=frontend(),d=result();assert.equal(f.validRegionalResearch(d),true)
 for(const stage of d.stages)for(const lead of d.leads)for(const model of d.models){const records=f.regionalCsvRecords(d,'CALABARZON',stage,lead,model);assert.equal(records.length,d.regions[0].groups.find(g=>g.stage===stage&&g.lead_months===lead&&g.model_id===model)!.expected_cases+1);assert.equal(records[0].includes('mapping_sha256'),true)}
 const edits=[(d:any)=>d.regions[0].groups[0].mae=0,(d:any)=>d.regions[0].selections[0].model_id='last_value',(d:any)=>d.regions[0].points.pop(),(d:any)=>d.regions[1].points=d.regions[0].points,
 (d:any)=>d.source.mapping_sha256='0'.repeat(64),(d:any)=>d.publication_approved=true,(d:any)=>d.regions[0].points[0].target_unreviewed_source_records=-1]
 for(const edit of edits){const changed=structuredClone(d);edit(changed);assert.equal(f.validRegionalResearch(changed),false);assert.throws(()=>f.regionalCsvRecords(changed,'CALABARZON','inspected_extension',1,'mean_6'))}
 for(const r of d.regions.slice(1))assert.throws(()=>f.regionalCsvRecords(d,r.region,'inspected_extension',1,'mean_6'))
})
