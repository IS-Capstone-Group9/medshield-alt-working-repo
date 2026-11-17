// Real loopback HTTP/fetch + compiled production client/events. No external calls.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),http=require('node:http'),assert=require('node:assert/strict')
const ts=require('../node_modules/typescript'),root=path.resolve(__dirname,'../..'),receipts=[]
const transpile=name=>ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const timeout=(promise,label)=>{let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Deadline: '+label)),2500)})]).finally(()=>clearTimeout(timer))}
let arrivals=[],waiters=[],responses=[]
const server=http.createServer((req,res)=>{
 const record={path:req.url,closed:false,complete:false};arrivals.push(record);responses.push(res)
 res.on('close',()=>{record.closed=true;record.complete=res.writableEnded})
 if(req.url.startsWith('/success')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({observed:0,missing:null}));return}
 if(req.url==='/failure-html'){res.writeHead(503,{'Content-Type':'text/html'});res.end('<html>Synthetic unavailable</html>');return}
 if(req.url==='/empty-error'){res.writeHead(502);res.end();return}
 if(req.url==='/empty-success'){res.writeHead(200);res.end();return}
 if(req.url.startsWith('/failure')){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Synthetic unavailable',code:'QA_UNAVAILABLE'}));return}
 if(req.url.includes('body-pending')){res.writeHead(200,{'Content-Type':'application/json'});res.flushHeaders();res.write('{')}
 for(const waiter of waiters.splice(0))waiter()
})
const nextArrival=async count=>{while(arrivals.length<=count)await timeout(new Promise(resolve=>waiters.push(resolve)),'server arrival');return arrivals[count]}
const closed=async record=>{for(let i=0;i<30&&!record.closed;i++)await new Promise(resolve=>setTimeout(resolve,10));assert.equal(record.closed,true,'owned request connection closes');assert.equal(record.complete,false,'cancelled response did not finish')}
function client(base,{auth=async()=>null,configured=false}={}){
 const api={};vm.runInNewContext(transpile('api-client'),{exports:api,require:name=>name.includes('supabase')?{isSupabaseBrowserConfigured:()=>configured,getSupabaseAccessToken:auth}:{getStoredToken:()=>null},process:{env:{NEXT_PUBLIC_API_BASE_URL:base}},fetch,Headers,URL,console});return api
}
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port,api=client(base)
 try{
  assert.deepEqual(JSON.parse(JSON.stringify(await api.getJson('/success'))),{observed:0,missing:null})
  await assert.rejects(api.getJson('/failure?private=synthetic'),error=>error.status===503&&error.code==='QA_UNAVAILABLE'&&!error.message.includes('private='));receipts.push('existing success/error contracts')
  for(const [url,status] of [['/failure-html',503],['/empty-error',502]])await assert.rejects(api.getJson(url),error=>error.status===status&&error.path===url)
  assert.equal(JSON.stringify(await api.authenticatedJson('/empty-success',{method:'POST'})),'{}');receipts.push('non-JSON/empty error status and un-aborted empty POST compatibility')
  for(const [name,request] of [['GET before headers',signal=>api.getJson('/pending-get',{signal})],['GET body',signal=>api.getJson('/body-pending-get',{signal})],['POST body',signal=>api.authenticatedJson('/body-pending-post',{method:'POST',signal})]]){
   const controller=new AbortController(),index=arrivals.length,pending=request(controller.signal);const observed=await nextArrival(index);controller.abort()
   await assert.rejects(timeout(pending,name),error=>error.name==='AbortError');await closed(observed);receipts.push(name+' aborts real HTTP and rejects')
  }
  let releaseAuth;const heldAuth=new Promise(resolve=>releaseAuth=resolve),authApi=client(base,{configured:true,auth:()=>heldAuth}),controller=new AbortController(),count=arrivals.length
  const pending=authApi.getJson('/never-sent',{signal:controller.signal});controller.abort();releaseAuth('synthetic QA token')
  await assert.rejects(timeout(pending,'pre-auth abort'),error=>error.name==='AbortError');assert.equal(arrivals.length,count);receipts.push('abort while awaiting auth sends no HTTP')
  // Production Planning events own only their requests; no global client registry.
  const window=new EventTarget(),applies=[],results=[],nodes={planSector:{value:'All'},planTerritory:{value:'all'}}
  window.setPlanningData=(...args)=>applies.push(args);window.setPlanningResult=(...args)=>results.push(args);window.getPlanningRequest=()=>({synthetic_qa:true})
  const document={getElementById:id=>nodes[id],querySelector:()=>null},interactions={}
  vm.runInNewContext(transpile('dashboard-interactions'),{exports:interactions,require:name=>name==='./api-client'?api:new Proxy({},{get:()=>()=>{}}),window,document,AbortController,URLSearchParams,console})
  const listeners=[];interactions.installCommonInteractions({querySelector:()=>null},listeners)
  let index=arrivals.length,first=interactions.refreshPlanning(),old=await nextArrival(index);nodes.planTerritory.value='synthetic-new-scope'
  index=arrivals.length;const second=interactions.refreshPlanning(),newer=await nextArrival(index);await timeout(first,'replaced shortlist');await closed(old)
  // Settle the current request with an explicit synthetic shape; renderer is a spy.
  responses[index].end(JSON.stringify({synthetic_scope:'new'}));assert.equal(await second,true);assert.equal(applies.at(-1)[0].synthetic_scope,'new');receipts.push('scope replacement aborts old shortlist and permits recovery')
  index=arrivals.length;window.dispatchEvent(new Event('medshield:planning-solve'));const solve=await nextArrival(index);window.dispatchEvent(new Event('medshield:plan-invalidated'));await closed(solve);assert.equal(results.length,0);receipts.push('input invalidation aborts solve without result restoration')
  index=arrivals.length;const load=interactions.refreshPlanning(),teardown=await nextArrival(index);interactions.resetDashboardDeferredLoads();await timeout(load,'teardown shortlist');await closed(teardown);receipts.push('dashboard reset aborts owned shortlist')
  index=arrivals.length;window.dispatchEvent(new Event('medshield:planning-solve'));const closingSolve=await nextArrival(index);interactions.resetDashboardDeferredLoads();await closed(closingSolve);assert.equal(results.length,0);receipts.push('dashboard reset aborts owned solve')
  index=arrivals.length;const unowned=api.getJson('/unrelated-panel');const unownedRecord=await nextArrival(index),unownedIndex=index
  index=arrivals.length;const owned=interactions.refreshPlanning(),ownedRecord=await nextArrival(index);interactions.resetDashboardDeferredLoads();await owned;await closed(ownedRecord)
  assert.equal(unownedRecord.closed,false,'Planning reset cannot cancel another panel request');responses[unownedIndex].end(JSON.stringify({other_panel:true}));assert.equal((await unowned).other_panel,true);receipts.push('unrelated panel transport survives Planning reset')
  for(const record of listeners)record.target.removeEventListener(record.type,record.listener,record.options)
  const report={status:'PASS_REAL_LOOPBACK_REQUEST_CANCELLATION',checks:receipts,requests:arrivals.map(({path,closed,complete})=>({path,closed,complete})),scope:'actual Node fetch/HTTP and compiled production client/Planning events; synthetic local auth/source only; not browser/warehouse job cancellation or hosted rollback'}
  if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
 }finally{for(const res of responses)res.destroy();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
}
main().catch(error=>{console.error(error);process.exitCode=1})
