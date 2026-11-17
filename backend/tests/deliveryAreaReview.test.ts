import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {validateRegionalReview} from '../src/regionalSalesReview'
import {readDeliveryAreaReview} from '../src/deliveryAreaReview'
import {validateAreaStl,readAreaStl,AREA_STL_BINDING} from '../src/deliveryAreaStl'
import {areaRows,deliveryAreaView,deliveryAreaCsv,validDeliveryAreaData,type DeliveryAreaData} from '../../frontend/services/api/delivery-area-model'
const data:DeliveryAreaData=JSON.parse(readFileSync('../outputs/delivery_area_20261102/live-source.json','utf8'))
const stl=readFileSync('../outputs/delivery_area_20261102/stl-analysis.json','utf8')
const retained=JSON.parse(readFileSync('../outputs/so1_regional_connection_20261027/source.json','utf8'))
const mapping=readFileSync('../outputs/so1_regional_connection_20261027/mapping.json','utf8')
const validated=validateRegionalReview(mapping,retained.release,retained.rows)

test('one validated read conserves every area/region/company; Cavite rollup replaces members',async()=>{
 const review=await readDeliveryAreaReview(async()=>validated)
 assert.equal(review.area_months.length,1032);assert.ok(validDeliveryAreaData(review as DeliveryAreaData));assert.deepEqual(review.area_months,data.area_months)
 assert.equal(review.coverage.length,10);assert.equal(review.study_comparison.common_matched_months.length,9)
 assert.equal(review.study_comparison.areas[0].target.net_sales_php,'4176874.210000')
 assert.equal(review.study_comparison.areas[0].base.net_sales_php,'2869780.210000')
 assert.equal(review.study_comparison.areas[0].target.margin_revenue_basis_php,'3569877.490000')
 const rollup=areaRows(data,'CAVITE PROVINCE'),parts=data.area_months.filter(r=>['CAVITE','LOWER CAVITE'].includes(r.area))
 const total=(rows:any[])=>rows.reduce((s,r)=>s+BigInt((r.net_sales_php??'0.000000').replace('.','')),0n)
 assert.equal(total(rollup),total(parts));assert.equal(rollup.filter(r=>r.net_sales_php!==null).length,65)
 const changed=structuredClone(data);changed.area_months[0].records++;assert.equal(validDeliveryAreaData(changed),false)
})
test('Jan–Sep partial year common months, paired margin and explicit October–December gaps',()=>{
 const v=deliveryAreaView(data,['QUEZON','BATANGAS'],'2026','2025',9)
 assert.equal(v.common.length,9);assert.equal(v.matched.length,9)
 assert.equal(v.areas[1].summary.net_sales_php,'1602265.300000')
 for(const a of v.areas)assert.equal(a.margin_pct,100*Number(a.summary.gross_profit_php)/Number(a.summary.margin_revenue_basis_php))
 const full=deliveryAreaView(data,['QUEZON','BATANGAS'],'2026','2025',12)
 assert.equal(full.excluded.length,3);assert.equal(full.areas[0].months.at(-1)!.row,null);assert.equal(deliveryAreaCsv(data,full).length,25)
})
test('historical view intersects observations instead of ranking unequal lifetime totals',()=>{
 const v=deliveryAreaView(data,['QUEZON','ALBAY'],'history','2025')
 assert.equal(v.areas[1].observed,25);assert.ok(v.common.length<103);assert.equal(v.matched.length,0)
 assert.notEqual(v.areas[0].summary.net_sales_php,validated.area_summaries.find(r=>r.recorded_label==='QUEZON')!.net_sales_php)
})
test('hand-solvable missing/zero and paired populations with absent base-year peer',()=>{
 const fixture=structuredClone(data)
 const row=(area:string,period:string,net:string|null,profit:string|null,basis:string|null)=>({area,region:'CALABARZON',period,records:2,net_eligible_records:net===null?0:2,margin_eligible_records:profit===null?0:1,unreviewed_records:0,net_sales_php:net,gross_profit_php:profit,margin_revenue_basis_php:basis})
 fixture.area_months=[row('QUEZON','2026-01','100.000000','10.000000','50.000000'),row('BATANGAS','2026-01','0.000000',null,null),row('QUEZON','2025-01','80.000000',null,null)]
 const v=deliveryAreaView(fixture,['QUEZON','BATANGAS'],'2026','2025',2)
 assert.deepEqual(v.common,['2026-01']);assert.equal(v.matched.length,0);assert.equal(v.areas[0].margin_pct,20);assert.equal(v.areas[1].summary.net_sales_php,'0.000000');assert.equal(v.areas[1].months[1].row,null)
})
test('separate STL source-bound windows reconstruct; weak seasonality retained; mutations reject',()=>{
 const result=validateAreaStl(stl,validated);assert.equal(result.diagnostic_fits,3)
 assert.deepEqual(result.series.filter((s:any)=>s.fitted_segments.length).map((s:any)=>[s.area,s.fitted_segments[0].months]),[['QUEZON',76],['BATANGAS',81],['CAVITE PROVINCE',38]])
 assert.equal(result.series[0].fitted_segments[0].seasonal_strength,0)
 assert.throws(()=>validateAreaStl(stl.replace('2020-06','2020-05'),validated))
 const changed=structuredClone(validated);changed.area_months.find(r=>r.area==='QUEZON'&&r.period==='2026-01')!.net_sales_php='1.000000';assert.throws(()=>validateAreaStl(stl,changed))
})
test('warehouse failure and wrong candidate version fail closed without local/regional fallback',async()=>{
 await assert.rejects(readDeliveryAreaReview(async()=>{throw Error('source unavailable')}))
 await assert.rejects(readAreaStl(async()=>{throw Error('warehouse unavailable')},async()=>validated))
 await assert.rejects(readAreaStl(async(sql:string)=>({rows:sql.startsWith('DESCRIBE')?[{version:'1'}]:[{artifact_sha256:AREA_STL_BINDING.artifactSha256,payload_json:stl}]} as any),async()=>validated))
})

for(const [routePath,readerName,response] of [
 ['/api/sales/delivery-area-review','readDeliveryAreaReview',data],
 ['/api/sales/delivery-area-stl','readAreaStl',validateAreaStl(stl,validated)],
] as const)test('actual protected route success, query rejection and safe outage '+routePath,async()=>{
 const express=(await import('express')).default,ts=(await import('typescript')).default
 const text=readFileSync('src/server.ts','utf8'),ast=ts.createSourceFile('server.ts',text,ts.ScriptTarget.Latest,true)
 const route=ast.statements.find(n=>ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&n.expression.expression.getText(ast)==='app.get'&&(n.expression.arguments[0] as import('typescript').StringLiteral).text===routePath)!
 const code=ts.transpileModule(route.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
 const app=express();let calls=0,offline=false
 new Function('app','requireAuth',readerName,code)(app,(req:any,res:any,next:any)=>req.headers.authorization?next():res.sendStatus(401),async()=>{calls++;if(offline)throw Error('private warehouse detail');return response})
 const server=app.listen(0);await new Promise<void>(resolve=>server.once('listening',resolve))
 const url='http://127.0.0.1:'+(server.address() as import('node:net').AddressInfo).port+routePath,headers={authorization:'isolated-test'}
 try{assert.equal((await fetch(url)).status,401);assert.equal((await fetch(url+'?year=2026',{headers})).status,400);assert.equal(calls,0);const success=await fetch(url,{headers});assert.equal(success.status,200);assert.equal(success.headers.get('cache-control'),'no-store');offline=true;const failed=await fetch(url,{headers});assert.equal(failed.status,503);assert.ok(!JSON.stringify(await failed.json()).includes('private warehouse'))}finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
