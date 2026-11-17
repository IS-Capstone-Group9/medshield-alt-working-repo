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
 const api={};vm.runInNewContext(transpile('api-client'),{exports:api,Error,require:name=>name.includes('supabase')?{isSupabaseBrowserConfigured:()=>configured,getSupabaseAccessToken:auth}:{getStoredToken:()=>null},process:{env:{NEXT_PUBLIC_API_BASE_URL:base}},fetch,Headers,URL,console});return api
}

async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const api=client('http://127.0.0.1:'+server.address().port)
 const financial={financialScopeSelection:()=>({scope:'exclude_contracts',revision:0}),financialSelectionIsCurrent:()=>true}
 function compile(name,deps){const out={};vm.runInNewContext(transpile(name),{exports:out,Error,require:deps,AbortController,URLSearchParams,fetch,Headers,console});return out}
 const sales=compile('sales.service',n=>n==='./api-client'?api:financial),weather=compile('weather.service',n=>n==='./api-client'?api:{})
 const weatherProvider={value:'PAGASA'},renders=[],status={textContent:''},table={replaceChildren(){}},rootNode={isConnected:true,querySelector:s=>s==='#weatherEffectStatus'?status:s==='#weatherEffectTable'?table:s==='#weatherProvider'?weatherProvider:null}
 const providerHelpers=compile('weather-provider-helpers',()=>({}))
 const interactions=compile('dashboard-interactions',n=>n==='./api-client'?api:n==='@/lib/api'?{...sales,...weather}:n==='./sales.service'?sales:n==='./financial-scope'?financial:n==='./weather-provider-helpers'?providerHelpers:new Proxy({},{get:(_,method)=>method==='renderWeatherEffects'?(_r,data)=>renders.push(['weather',data]):method==='renderSalesPage'?(_r,data)=>renders.push(['ledger',data]):()=>{}}))
 const finish=(i,body,status=200)=>{responses[i].writeHead(status,{'Content-Type':'application/json'});responses[i].end(JSON.stringify(body))}
 const release={financial_scope:{id:'exclude_contracts'}},state={page:1}
 const ledger=()=>interactions.loadSalesDataView(rootNode,state)
 const completeLedger=start=>{for(let i=start;i<start+3;i++)finish(i,{release,pagination:{page:1},synthetic_qa_only:true})}
 try{
  let i=arrivals.length,p=ledger();await nextArrival(i+2);interactions.resetDashboardDeferredLoads();await timeout(p,'ledger reset');for(const record of arrivals.slice(i))await closed(record);assert.equal(renders.length,0);receipts.push('ledger reset closes all three real HTTP reads; no stale render')
  i=arrivals.length;p=ledger();await nextArrival(i+2);let next=arrivals.length,replacement=ledger();await nextArrival(next+2);await timeout(p,'ledger replacement');for(const record of arrivals.slice(i,next))await closed(record);completeLedger(next);await replacement;assert.equal(renders.at(-1)[0],'ledger');receipts.push('ledger replacement aborts old group; current successful ledger recovers')
  i=arrivals.length;p=interactions.loadWeatherEffectView(rootNode);await nextArrival(i);next=arrivals.length;replacement=ledger();await nextArrival(next+2);completeLedger(next);await replacement;assert.equal(arrivals[i].closed,false);finish(i,{synthetic_qa_only:true});await p;assert.equal(renders.at(-1)[0],'weather');receipts.push('ledger replacement preserves unrelated weather transport')
  i=arrivals.length;p=interactions.loadWeatherEffectView(rootNode);await nextArrival(i);next=arrivals.length;replacement=interactions.loadWeatherEffectView(rootNode);await nextArrival(next);await p;await closed(arrivals[i]);finish(next,{error:'Synthetic weather unavailable'},503);await replacement;assert.match(status.textContent,/Synthetic weather unavailable/);receipts.push('weather replacement closes old read; genuine current error remains explicit')
  i=arrivals.length;p=interactions.loadWeatherEffectView(rootNode);await nextArrival(i);interactions.resetDashboardDeferredLoads();await p;await closed(arrivals[i]);receipts.push('weather teardown/reset closes owned HTTP')
  i=arrivals.length;p=interactions.loadSalesLedgerExport({});await nextArrival(i);interactions.cancelSalesViewRequests();assert.equal(await p,null);await closed(arrivals[i]);receipts.push('ledger input invalidation aborts pending export; returns no downloadable blob')
  i=arrivals.length;p=ledger();await nextArrival(i+2);finish(i,{error:'Synthetic ledger unavailable'},503);await assert.rejects(p,/Synthetic ledger unavailable/);for(const record of arrivals.slice(i+1))await closed(record);receipts.push('genuine ledger failure rejects and closes sibling HTTP reads')
  i=arrivals.length;p=ledger();await nextArrival(i+2);rootNode.isConnected=false;completeLedger(i);const before=renders.length;await p;assert.equal(renders.length,before);receipts.push('detached root rejects late successful ledger render')
  rootNode.isConnected=true;weatherProvider.value='nasa_power';i=arrivals.length;p=interactions.refreshSelectedWeatherData(rootNode);await nextArrival(i);assert.equal(arrivals[i].path,'/api/weather/refresh');const count=arrivals.length;interactions.cancelSelectedWeatherRefresh();await p;await closed(arrivals[i]);assert.equal(arrivals.length,count);receipts.push('weather refresh input invalidation aborts synthetic loopback POST without follow-up read; no live provider called')
  const report={status:'PASS_REAL_LOOPBACK_LEDGER_WEATHER',checks:receipts,requests:arrivals,scope:'compiled production clients/services/interactions, real ephemeral Node HTTP/fetch, synthetic source only and renderer spies; no live provider refresh, native network or warehouse-job claim'};if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(report,null,2));console.log(JSON.stringify(report))
 }finally{interactions.resetDashboardDeferredLoads();for(const r of responses)r.destroy();server.closeAllConnections();await new Promise(r=>server.close(r))}
}
main().catch(e=>{console.error(e);process.exitCode=1})
