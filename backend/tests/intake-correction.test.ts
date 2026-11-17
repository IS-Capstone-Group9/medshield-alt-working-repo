import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import express from 'express'
import { CorrectionReviewError, parseCorrectionRequest, reconcileCorrection } from '../src/intakeCorrection'
import { createIntakeService, INTAKE_COLUMNS } from '../src/salesIngestion'
import { salesIngestionRouter } from '../src/salesIngestionRoutes'
import { verifyCorrectionReview } from '../src/correctionReviewIntegrity'

const request = (extra = {}) => parseCorrectionRequest({ corrected_ingestion_id: 'b'.repeat(64), period_start: '2026-10', period_end: '2026-10', complete_period_asserted: true, ...extra })
const row = (id: string, date: string, net: string, profit = '', product = 'TEST') => [id, date, 'DR1', product, 'TEST AREA', '1', net, profit]
const rows = (...r: string[][]) => [[...INTAKE_COLUMNS], ...r]
test('whole-period subtraction/addition retains outside rows and signed/unknown controls', () => {
  const value = reconcileCorrection(rows(row('1','2026-09-01','100.00','20'),row('2','2026-10-01','10','2'),row('3','2026-10-02','-2')), rows(row('x','2026-10-01','12','3'),row('y','2026-10-02','-2')), request())
  assert.deepEqual(value.controls.before, {record_count:3,net_sales_php:'108.00',gross_profit_known_php:'22.00',gross_profit_known_records:2,gross_profit_missing_records:1})
  assert.deepEqual(value.controls.removed, {record_count:2,net_sales_php:'8.00',gross_profit_known_php:'2.00',gross_profit_known_records:1,gross_profit_missing_records:1})
  assert.equal(value.controls.added.net_sales_php,'10.00');assert.equal(value.controls.after.net_sales_php,'110.00')
  assert.deepEqual(value.scope_comparison,{unchanged_records:1,removed_records:1,added_records:1})
  assert.equal(value.monthly[0].removed.record_count,0);assert.equal(value.monthly[0].after.net_sales_php,'100.00')
  assert.equal(value.controls.after.gross_profit_missing_records,1)
})
test('100 independently generated signed-money cases reconcile row-count and monthly controls', () => {
  for(let seed=1;seed<=100;seed++){
    const retainedCents=seed*123,oldCents=seed*17-800,newCents=seed*37-900
    const value=reconcileCorrection(rows(row('1','2026-09-01',(retainedCents/100).toFixed(2)),row('2','2026-10-01',(oldCents/100).toFixed(2))),rows(row('x','2026-10-01',(newCents/100).toFixed(2))),request())
    assert.equal(value.controls.after.net_sales_php,((retainedCents+newCents)/100).toFixed(2))
    assert.equal(value.controls.before.net_sales_php,((retainedCents+oldCents)/100).toFixed(2))
    assert.equal(value.controls.after.record_count,2)
    assert.deepEqual(value.monthly.map(m=>m.month),['2026-09','2026-10'])
  }
})
test('exact decimal totals above Number precision and repeated source records are preserved',()=>{
  const old=rows(row('1','2026-10-01','99999999999999.99'),row('2','2026-10-01','99999999999999.99'))
  const next=rows(row('x','2026-10-01','99999999999999.99'),row('y','2026-10-01','99999999999999.99'),row('z','2026-10-01','0.01','0'))
  const value=reconcileCorrection(old,next,request())
  assert.equal(value.controls.before.net_sales_php,'199999999999999.98');assert.equal(value.controls.after.net_sales_php,'199999999999999.99')
  assert.deepEqual(value.scope_comparison,{unchanged_records:2,removed_records:0,added_records:1})
  assert.equal(value.controls.after.gross_profit_known_records,1);assert.equal(value.controls.after.gross_profit_missing_records,2)
})
test('observed month union preserves gaps, earlier/future years and full declared replacement',()=>{
  const value=reconcileCorrection(rows(row('1','2017-01-01','1'),row('2','2026-10-01','2'),row('3','2031-01-01','3')),rows(row('x','2026-12-01','4')),request({period_end:'2026-12'}))
  assert.deepEqual(value.monthly.map(m=>m.month),['2017-01','2026-10','2026-12','2031-01']);assert.equal(value.controls.after.net_sales_php,'8.00')
  assert.equal(value.monthly[1].after.record_count,0)
})
for(const [name,extra]of Object.entries({unasserted:{complete_period_asserted:false},id:{corrected_ingestion_id:'../x'},month:{period_start:'2026-13'},reverse:{period_start:'2026-12'},tooWide:{period_end:'2126-10'},old:{period_start:'2016-12'},extra:{approved:true}}))
  test(`request rejects ${name}`,()=>assert.throws(()=>request(extra),CorrectionReviewError))
test('out-of-scope correction, empty prior period and duplicate references fail closed',()=>{
  const old=rows(row('1','2026-10-01','1'))
  assert.throws(()=>reconcileCorrection(old,rows(row('x','2026-11-01','1')),request()),/outside/)
  assert.throws(()=>reconcileCorrection(rows(row('1','2026-09-01','1')),old,request()),/no previous/)
  assert.throws(()=>reconcileCorrection(old,rows(row('x','2026-10-01','1'),row('x','2026-10-02','1')),request()),/duplicate/)
})
test('observed-month response limit rejects oversized history rather than truncating it',()=>{
  const history=Array.from({length:1201},(_,i)=>row(String(i),`${2017+Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}-01`,'1'))
  assert.throws(()=>reconcileCorrection(rows(...history),rows(row('x','2017-01-01','2')),request({period_start:'2017-01',period_end:'2017-01'})),/no history has been truncated/)
})
for(const [name,index,value] of [['date',1,'2026-02-30'],['money',6,'1.001'],['quantity',5,'NaN'],['profit',7,'1e3'],['missing product',3,'']] as const)
  test(`row revalidation rejects ${name}`,()=>{const changed=row('x','2026-10-01','1');changed[index]=value;assert.throws(()=>reconcileCorrection(rows(row('1','2026-10-01','1')),rows(changed),request()),CorrectionReviewError)})

const sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex')
function fixture(){
  const files=new Map<string,Buffer>(),methods:string[]=[],caches:(string|undefined)[]=[]
  const config={host:'https://fixture.invalid',token:'never-emit-fixture-secret',volume:'/Volumes/test/intake/private',jobId:7}
  const put=(r:string[][],net:string,account=1)=>{
    const csv=Buffer.from(r.map(c=>c.join(',')).join('\r\n')+'\r\n'),source=sha(csv),id=sha(`client_sales_csv_v1:${account}:${source}`)
    const manifest={schema_version:1,ingestion_id:id,account_id:account,policy_version:'client_sales_csv_v1',source_sha256:source,source_bytes:csv.length,record_count:r.length-1}
    const report={schema_version:1,ingestion_id:id,source_sha256:source,policy_version:'client_sales_csv_v1',candidate_only:true,published:false,category_reference_sha256:'a'.repeat(64),status:'READY_FOR_APPROVAL',counts:{received:r.length-1,accepted:r.length-1,rejected:0,category_review:0},net_sales_candidate:net,reports:{issues:{sha256:'c'.repeat(64),bytes:1},classifications:{sha256:'d'.repeat(64),bytes:1}}}
    const prefix=`${config.volume}/submissions/${id}/`
    files.set(prefix+'manifest.json',Buffer.from(JSON.stringify(manifest)));files.set(prefix+'report.json',Buffer.from(JSON.stringify(report)));files.set(prefix+'source.csv',csv)
    return{id,prefix,report}
  }
  const previous=put(rows(row('1','2026-09-01','100'),row('2','2026-10-01','8')),'108')
  const corrected=put(rows(row('x','2026-10-01','10')),'10')
  const send=(async(url:string,init:RequestInit={})=>{methods.push(init.method??'GET');caches.push(init.cache);const file=files.get(decodeURIComponent(new URL(url).pathname.slice('/api/2.0/fs/files'.length)));return file?new Response(new Uint8Array(file)):new Response(null,{status:404})}) as typeof fetch
  const service=createIntakeService(config,send)
  const body=()=>request({corrected_ingestion_id:corrected.id})
  return{files,methods,caches,config,send,service,previous,corrected,put,body}
}
test('actual service binds exact source identities and deterministic proposal without any provider writes',async()=>{
  const f=fixture(),value=await f.service.correctionReview(f.previous.id,{account_id:1,role:'analyst'},f.body())
  assert.equal(value.controls.after.net_sales_php,'110.00');assert.equal(value.release_authorized,false);assert.equal(value.published,false)
  const{plan_sha256,...unsigned}=value;assert.equal(plan_sha256,sha(JSON.stringify(unsigned)))
  assert.equal(verifyCorrectionReview(JSON.parse(JSON.stringify(value))).status,'PASS_LOCAL_REVIEW_INTEGRITY')
  assert.deepEqual(await f.service.correctionReview(f.previous.id,{account_id:1,role:'analyst'},f.body()),value)
  assert.ok(f.methods.every(m=>m==='GET'));assert.ok(!JSON.stringify(value).includes('TEST AREA'));assert.ok(!JSON.stringify(value).includes(f.config.token))
})
test('source recheck reads both candidates again and returns only scoped point-in-time false-release receipt',async()=>{
  const f=fixture(),actor={account_id:1,role:'analyst'},value=await f.service.correctionReview(f.previous.id,actor,f.body()),before=f.methods.length
  const checked=await f.service.revalidateCorrectionReview(f.previous.id,actor,value)
  assert.equal(f.methods.length-before,6)
  assert.ok(f.caches.every(cache=>cache==='no-store'))
  assert.equal(checked.status,'MATCHES_CURRENT_CANDIDATE_CONTROLS');assert.equal(checked.plan_sha256,value.plan_sha256)
  assert.equal(checked.verification_scope,'intake_candidate_sources_and_correction_controls')
  assert.equal(checked.source_revalidated,true);assert.equal(checked.completeness_verified,false);assert.equal(checked.serving_release_verified,false);assert.equal(checked.release_authorized,false);assert.equal(checked.published,false)
  assert.equal(new Date(checked.checked_at).toISOString(),checked.checked_at)
  assert.ok(f.methods.every(m=>m==='GET'));assert.ok(!JSON.stringify(checked).includes('TEST AREA'));assert.ok(!JSON.stringify(checked).includes(f.config.token))
})
test('a self-consistently rehashed invented handoff passes local integrity but fails fresh-source comparison',async()=>{
  const f=fixture(),actor={account_id:1,role:'analyst'},saved=await f.service.correctionReview(f.previous.id,actor,f.body())
  const forged=JSON.parse(JSON.stringify(saved))
  forged.controls.before.net_sales_php='109.00';forged.controls.after.net_sales_php='111.00';forged.monthly[0].before.net_sales_php='101.00';forged.monthly[0].after.net_sales_php='101.00'
  const{plan_sha256,...unsigned}=forged;forged.plan_sha256=sha(JSON.stringify(unsigned))
  assert.equal(verifyCorrectionReview(forged).status,'PASS_LOCAL_REVIEW_INTEGRITY')
  await assert.rejects(()=>f.service.revalidateCorrectionReview(f.previous.id,actor,forged),(e:any)=>e.status===409&&e.code==='INGESTION_CORRECTION_CHANGED')
  assert.ok(f.methods.every(m=>m==='GET'))
})
for(const defect of ['source-changed','category-changed','report-missing','wrong-owner','bad-digest','wrong-path'] as const)test(`source recheck rejects ${defect} without publication`,async()=>{
  const f=fixture(),actor={account_id:1,role:'analyst'},saved=await f.service.correctionReview(f.previous.id,actor,f.body()),before=f.methods.length
  let requestActor=actor,id=f.previous.id
  if(defect==='source-changed')f.files.set(f.corrected.prefix+'source.csv',Buffer.from('changed'))
  if(defect==='category-changed')for(const item of [f.previous,f.corrected]){item.report.category_reference_sha256='f'.repeat(64);f.files.set(item.prefix+'report.json',Buffer.from(JSON.stringify(item.report)))}
  if(defect==='report-missing')f.files.delete(f.corrected.prefix+'report.json')
  if(defect==='wrong-owner')requestActor={account_id:2,role:'analyst'}
  if(defect==='bad-digest')saved.plan_sha256='0'.repeat(64)
  if(defect==='wrong-path')id=f.corrected.id
  await assert.rejects(()=>f.service.revalidateCorrectionReview(id,requestActor,saved))
  if(defect==='bad-digest'||defect==='wrong-path')assert.equal(f.methods.length,before)
  assert.ok(f.methods.every(m=>m==='GET'))
})
for(const defect of ['owner','same','missing-report','rejected','reference','source-bytes','report-money','cross-owner'] as const)test(`service rejects ${defect}`,async()=>{
  const f=fixture();let actor={account_id:1,role:'analyst'},body=f.body()
  if(defect==='owner')actor={account_id:2,role:'analyst'}
  if(defect==='same')body={...body,corrected_ingestion_id:f.previous.id}
  if(defect==='missing-report')f.files.delete(f.corrected.prefix+'report.json')
  if(defect==='source-bytes')f.files.set(f.corrected.prefix+'source.csv',Buffer.from('changed'))
  if(defect==='rejected'){f.corrected.report.counts.rejected=1;f.corrected.report.counts.accepted=0;f.corrected.report.status='NEEDS_REVIEW'}
  if(defect==='reference')f.corrected.report.category_reference_sha256='e'.repeat(64)
  if(defect==='report-money')f.corrected.report.net_sales_candidate='999'
  if(defect==='cross-owner'){actor={account_id:1,role:'admin'};body={...body,corrected_ingestion_id:f.put(rows(row('z','2026-10-01','12')),'12',2).id}}
  if(!['missing-report','cross-owner'].includes(defect))f.files.set(f.corrected.prefix+'report.json',Buffer.from(JSON.stringify(f.corrected.report)))
  await assert.rejects(()=>f.service.correctionReview(f.previous.id,actor,body));assert.ok(f.methods.every(m=>m==='GET'))
})
test('actual HTTP correction route enforces auth/role, JSON bounds and zero provider writes',async t=>{
  const f=fixture(),savedFetch=global.fetch,keys=['DATABRICKS_INGESTION_ENABLED','DATABRICKS_HOST','DATABRICKS_INGESTION_TOKEN','DATABRICKS_INGESTION_VOLUME','DATABRICKS_INGESTION_JOB_ID'],saved=keys.map(k=>process.env[k])
  Object.assign(process.env,{DATABRICKS_INGESTION_ENABLED:'true',DATABRICKS_HOST:f.config.host,DATABRICKS_INGESTION_TOKEN:f.config.token,DATABRICKS_INGESTION_VOLUME:f.config.volume,DATABRICKS_INGESTION_JOB_ID:'7'})
  global.fetch=f.send
  const app=express();app.use('/intake',salesIngestionRouter((req:any,res,next)=>{if(!req.headers.authorization){res.sendStatus(401);return}req.user={account_id:1,role:req.headers.authorization};next()},(req:any,res,next)=>{if(req.user.role==='viewer'){res.sendStatus(403);return}next()},async()=>{throw Error('read-only correction must not request submission audit')}))
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address();assert.ok(address&&typeof address!=='string')
  t.after(async()=>{global.fetch=savedFetch;keys.forEach((k,i)=>saved[i]===undefined?delete process.env[k]:process.env[k]=saved[i]);await new Promise<void>(resolve=>server.close(()=>resolve()))})
  const url=`http://127.0.0.1:${address.port}/intake/${f.previous.id}/correction-review`,headers={Authorization:'analyst','Content-Type':'application/json'}
  assert.equal((await savedFetch(url,{method:'POST',body:'{}'})).status,401)
  assert.equal((await savedFetch(url,{method:'POST',headers:{...headers,Authorization:'viewer'},body:'{}'})).status,403)
  assert.equal((await savedFetch(url,{method:'POST',headers,body:'{bad-json'})).status,400)
  assert.equal((await savedFetch(url,{method:'POST',headers,body:JSON.stringify({huge:'x'.repeat(5000)})})).status,413)
  assert.equal((await savedFetch(url+'?publish=true',{method:'POST',headers,body:JSON.stringify(f.body())})).status,400)
  const result=await savedFetch(url,{method:'POST',headers,body:JSON.stringify(f.body())});assert.equal(result.status,200);const review=await result.json();assert.equal(review.controls.after.net_sales_php,'110.00')
  const recheck=url+'/revalidate'
  assert.equal((await savedFetch(recheck,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(review)})).status,401)
  assert.equal((await savedFetch(recheck,{method:'POST',headers:{...headers,Authorization:'viewer'},body:JSON.stringify(review)})).status,403)
  assert.equal((await savedFetch(recheck,{method:'POST',headers,body:'{bad'})).status,400)
  assert.equal((await savedFetch(recheck,{method:'POST',headers,body:JSON.stringify({large:'x'.repeat(2*1024*1024)})})).status,413)
  assert.equal((await savedFetch(recheck+'?publish=true',{method:'POST',headers,body:JSON.stringify(review)})).status,400)
  const verified=await savedFetch(recheck,{method:'POST',headers,body:JSON.stringify(review)});assert.equal(verified.status,200);assert.equal((await verified.json()).source_revalidated,true)
  assert.ok(f.methods.every(m=>m==='GET'))
})
