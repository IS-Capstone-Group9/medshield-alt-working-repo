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
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const api=client('http://127.0.0.1:'+server.address().port)
 const sourceEvents=[],sourceRoot={dataset:{sourceState:'loading'},querySelector:()=>null,dispatchEvent:event=>{sourceEvents.push(event.type);return true}}
 const window={},nodes={forecastSector:{value:'Unknown'}},document={getElementById:id=>nodes[id],querySelector:()=>sourceRoot}
 const scope={scope:'exclude_contracts',revision:0},financial={financialScopeSelection:()=>({...scope}),financialSelectionIsCurrent:selection=>selection.revision===scope.revision}
 const service={};vm.runInNewContext(transpile('dashboard.service'),{exports:service,require:name=>name==='./api-client'?api:financial,console})
 const createInteractions=transport=>{const module={};vm.runInNewContext(transpile('dashboard-interactions'),{exports:module,require:name=>name==='./api-client'?transport:name==='@/lib/api'?service:name==='./financial-scope'?financial:new Proxy({},{get:()=>()=>{}}),window,document,AbortController,URLSearchParams,Event,CustomEvent,console});return module}
 const interactions=createInteractions(api)
 const source=()=>{const release={financial_scope:{id:scope.scope},synthetic_qa_only:true};return {snapshot:{data_status:{source:'databricks',mode:'live',release},totals:{total_revenue:0,total_income:null,total_transactions:0,avg_margin:null},monthly:[{period:'2026-01',revenue:0,income:null}],year_summary:[{year:'2026',revenue:0,income:null}],by_area:[{area:'Synthetic QA',revenue:0,income:null}],top_products:[{product:'Synthetic QA',revenue:0,income:null}],seasonality:[{month:'Jan',avg_revenue:0}]},sectors:{source:{release}}}}
 const finish=(index,body,status=200)=>{responses[index].writeHead(status,{'Content-Type':'application/json'});responses[index].end(JSON.stringify(body))}
 const families=[['heatmap','refreshSalesHeatmap','setSalesHeatmapData'],['sectors','refreshSalesSectors','setSalesSectorsData'],['forecast','refreshForecastValidation','setForecastValidationData'],['research','refreshPredictiveResearch','setPredictiveResearchData'],['regression','refreshExternalRegression','setExternalRegressionData']]
 try{
  for(const [name,method,handler] of families){
   const applied=[];window[handler]=(...args)=>applied.push(args)
   let index=arrivals.length,pending=interactions[method](),record=await nextArrival(index)
   interactions.resetDashboardDeferredLoads();assert.equal(await timeout(pending,name+' reset'),false);await closed(record)
   assert.equal(applied.length,1,'cancel cannot render unavailable/data');receipts.push(name+': reset closes pending HTTP without applying')
   index=arrivals.length;pending=interactions[method]();record=await nextArrival(index)
   const next=arrivals.length,replacement=interactions[method]();await nextArrival(next)
   assert.equal(await timeout(pending,name+' replacement'),false);await closed(record)
   finish(next,{synthetic_qa:name,observed:0,missing:null});assert.equal(await replacement,true);assert.equal(applied.at(-1)[0].synthetic_qa,name)
   receipts.push(name+': replacement closes old HTTP and current request recovers')
  }
  nodes.forecastSector.value='All'
  let index=arrivals.length,pending=interactions.refreshForecastValidation(),record=await nextArrival(index)
  assert.ok(record.path.startsWith('/api/forecasts?'));const count=arrivals.length
  interactions.resetDashboardDeferredLoads();assert.equal(await timeout(pending,'published forecast cancellation'),false);await closed(record)
  assert.equal(arrivals.length,count,'cancelled publication cannot launch benchmark');receipts.push('published forecast reset sends no retrospective follow-up')
  // Genuine publication failure retains the separately labeled benchmark path.
  index=arrivals.length;pending=interactions.refreshForecastValidation();await nextArrival(index)
  const benchmarkIndex=arrivals.length;finish(index,{error:'Synthetic publication outage'},503)
  const benchmark=await nextArrival(benchmarkIndex);assert.ok(benchmark.path.startsWith('/api/sales/forecast-validation?'))
  finish(benchmarkIndex,{limitations:[],synthetic_qa:true});assert.equal(await pending,true);receipts.push('genuine publication outage still loads the separate retrospective benchmark')
  nodes.forecastSector.value='Unknown'
  // Production cache/deduplication cannot retain aborted generation success.
  interactions.resetDashboardDeferredLoads();index=arrivals.length;pending=interactions.refreshDashboardModulesForPage('territory')
  assert.equal(pending,interactions.refreshDashboardModulesForPage('territory'));record=await nextArrival(index)
  interactions.resetDashboardDeferredLoads();assert.equal(await pending,false);await closed(record)
  index=arrivals.length;pending=interactions.refreshDashboardModulesForPage('territory');await nextArrival(index);finish(index,{synthetic_qa:'fresh generation'});assert.equal(await pending,true)
  const cachedCount=arrivals.length;assert.equal(await interactions.refreshDashboardModulesForPage('territory'),true);assert.equal(arrivals.length,cachedCount);receipts.push('deferred page deduplicates, resets without caching cancellation, and caches successful recovery')
  interactions.resetDashboardDeferredLoads();const savedHandler=window.setSalesSectorsData;delete window.setSalesSectorsData
  const missingCount=arrivals.length;assert.equal(await interactions.refreshDashboardModulesForPage('territory'),false);assert.equal(arrivals.length,missingCount)
  window.setSalesSectorsData=savedHandler;index=arrivals.length;pending=interactions.refreshDashboardModulesForPage('territory');await nextArrival(index);finish(index,{synthetic_qa:'installed later'});assert.equal(await pending,true);receipts.push('missing handler sends no HTTP and does not poison deferred cache')
  interactions.resetDashboardDeferredLoads()
  // A transport may ignore abort (e.g. an already-settled provider). Generations
  // and handler identity remain required even when physical cancellation fails.
  const ignoreAbort=createInteractions({...api,getJson:url=>api.getJson(url)})
  for(const [name,method,handler] of families){
   const applied=[];window[handler]=(...args)=>applied.push(args)
   index=arrivals.length;pending=ignoreAbort[method]();await nextArrival(index);ignoreAbort.resetDashboardDeferredLoads();finish(index,{stale:true});assert.equal(await pending,false);assert.equal(applied.length,1)
   index=arrivals.length;pending=ignoreAbort[method]();await nextArrival(index);window[handler]=()=>{throw Error('replacement handler must not receive old request')}
   finish(index,{error:'Synthetic old failure'},503);assert.equal(await pending,false);assert.equal(applied.length,2);receipts.push(name+': unabortable late data and replaced-handler failure remain stale')
  }
  // Replacing one common family cannot abort a different common family.
  for(const [, ,handler] of families)window[handler]=()=>{}
  index=arrivals.length;const other=interactions.refreshSalesSectors();const otherRecord=await nextArrival(index),otherIndex=index
  index=arrivals.length;pending=interactions.refreshSalesHeatmap();record=await nextArrival(index)
  const next=arrivals.length,replacement=interactions.refreshSalesHeatmap();await nextArrival(next);await pending;await closed(record)
  assert.equal(otherRecord.closed,false);finish(otherIndex,{other_family:true});assert.equal(await other,true);finish(next,{new_heatmap:true});assert.equal(await replacement,true);receipts.push('heatmap replacement preserves a sector request')
  index=arrivals.length;const unowned=api.getJson('/unrelated-panel'),unownedRecord=await nextArrival(index)
  interactions.resetDashboardDeferredLoads();assert.equal(unownedRecord.closed,false);finish(index,{unowned:true});assert.equal((await unowned).unowned,true);receipts.push('dashboard-owned reset preserves unrelated client request')
  const patches=[],sectors=[];window.applyDatasetPatch=value=>patches.push(value);window.setOverviewSectorData=value=>sectors.push(value)
  index=arrivals.length;pending=interactions.refreshDashboardFromGateway();record=await nextArrival(index);interactions.resetDashboardDeferredLoads()
  assert.equal(await timeout(pending,'main source reset'),false);await closed(record);assert.equal(patches.length,0);assert.equal(sectors.length,0);receipts.push('main source reset closes transport and cannot apply')
  index=arrivals.length;pending=interactions.refreshDashboardFromGateway();record=await nextArrival(index)
  const mainIndex=arrivals.length,mainReplacement=interactions.refreshDashboardFromGateway();await nextArrival(mainIndex)
  assert.equal(await timeout(pending,'main source replacement'),false);await closed(record);finish(mainIndex,source());assert.equal(await mainReplacement,true);assert.equal(patches.at(-1).monthly[0].revenue,0);assert.deepEqual(sourceEvents,['medshield:source-ready']);receipts.push('main source replacement cancels old HTTP and preserves real zero/null contract')
  index=arrivals.length;pending=interactions.refreshDashboardFromGateway();await nextArrival(index);scope.revision++;finish(index,{error:'Synthetic old failure'},503)
  assert.equal(await pending,false);assert.equal(patches.length,1);receipts.push('superseded selection suppresses old source failure')
  index=arrivals.length;pending=interactions.refreshDashboardFromGateway();await nextArrival(index);finish(index,{error:'Synthetic current failure'},503)
  await assert.rejects(pending,error=>error.status===503);assert.deepEqual(sourceEvents,['medshield:source-ready','medshield:source-error']);receipts.push('current source failure still rejects for unavailable UI')
  index=arrivals.length;pending=interactions.refreshDashboardFromGateway();await nextArrival(index);finish(index,{snapshot:{data_status:{source:'local',mode:'demo'}},sectors:{}})
  await assert.rejects(pending,/live Databricks data contract/);assert.equal(patches.length,1);receipts.push('non-live source remains fail-closed; no rendered replacement')
  index=arrivals.length;pending=interactions.refreshDashboardFromGateway();await nextArrival(index);const mismatched=source();mismatched.sectors.source.release={...mismatched.sectors.source.release,synthetic_qa_only:'different identity'};finish(index,mismatched)
  await assert.rejects(pending,/source releases differ/);assert.equal(patches.length,1);receipts.push('cross-release source/sector mismatch cannot apply data')
  const report={status:'PASS_REAL_LOOPBACK_COMMON_CANCELLATION',checks:receipts,requests:arrivals,scope:'real Node HTTP/fetch and compiled production client/dashboard reader/common loaders; synthetic loopback source only, renderer spies; not browser network/warehouse job/all-panel/role/hosted acceptance'}
  if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
 }finally{interactions.resetDashboardDeferredLoads();for(const response of responses)response.destroy();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
}
main().catch(error=>{console.error(error);process.exitCode=1})
