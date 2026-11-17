// Production installer lifetime probes with deliberately unabortable deferred responses.
// DOM/Chart/auth are isolated models; no live analytics or identity acceptance.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('../node_modules/typescript')
const repo=path.resolve(__dirname,'../..'),sourceRoot=process.env.QA_SOURCE_ROOT?path.resolve(process.env.QA_SOURCE_ROOT):repo
const results=[]
class Node {
 constructor(tag='div'){this.tag=tag;this.children=[];this.listeners={};this.nodes={};this.style={getPropertyValue:()=>'',getPropertyPriority:()=>'',setProperty(){},removeProperty(){}};this.classList={contains:()=>false,add(){},remove(){}};this.textContent='';this.value='all';this.disabled=false;this.isConnected=true;this.parentElement={hidden:true};this.dataset={}}
 get innerHTML(){return this.html}
 set innerHTML(s){this.html=s;for(const m of s.matchAll(/<([a-z]+)[^>]*(?:id="([^"]+)"|\b(data-(?:abc|tournament|decision-board)[\w-]+))[^>]*>/g)){let n=new Node(m[1]);n.disabled=/\bdisabled\b/.test(m[0]);this.nodes[m[2]?'#'+m[2]:'['+m[3]+']']=n}}
 querySelector(s){return this.nodes[s]??=new Node()}querySelectorAll(){return []}setAttribute(){}removeAttribute(){}
 append(...n){this.children.push(...n)}prepend(...n){this.children.unshift(...n)}before(n){this.children.push(n)}after(n){this.children.push(n)}
 replaceChildren(){this.children=[];this.textContent=''}add(n){this.children.push(n)}insertBefore(n){this.children.push(n)}
 createTHead(){const n=new Node();this.append(n);return n}createTBody(){const n=new Node();this.append(n);return n}insertRow(){return this.createTBody()}insertCell(){return this.createTBody()}
 click(){this.listeners.click?.();this.onclick?.()}
 closest(){return this}addEventListener(n,f){this.listeners[n]=f}removeEventListener(n){delete this.listeners[n]}remove(){this.removed=true;this.isConnected=false}scrollIntoView(){}
}
const configurations=[['abc-research-panel','installAbcResearch'],['tournament-research','installTournamentResearch'],['unit-research-panel','installUnitResearchPanel'],['area-priority-panel','installAreaPriorityPanel'],['historical-comparison-panel','installHistoricalComparisonPanel'],['regional-decision-board','installRegionalDecisionBoard'],['regional-sales-panel','installRegionalSalesPanel'],['so1-panel','installSo1Panel'],['current-research-panel','installCurrentResearchPanel'],['current-research-panel','installCurrentResearchPanel',{rolling:true}],['stl-panel','installStlPanel'],['diagnostic-panel','installDiagnosticPanel'],['overview-sector-comparison','installOverviewSectorComparison']]
const tick=()=>new Promise(r=>setImmediate(r))
async function probe([file,install,options]){
 const root=new Node(),created=[],calls=[],observers=[],windowEvents={};let exports={}
 const api={getJson:(url,options={})=>new Promise((resolve,reject)=>calls.push({url,signal:options.signal,resolve,reject})),getSalesDiagnostics:(scope,options)=>api.getJson('/diagnostics',options)}
 const modules={};const context=vm.createContext({exports,AbortController,URL,URLSearchParams,Intl,Date,console,setTimeout:()=>{},Blob,Option:class{constructor(text,value){this.textContent=text;this.value=value}},
 document:{createElement:tag=>{const n=new Node(tag);created.push(n);return n}},window:{addEventListener:(n,f)=>windowEvents[n]=f,removeEventListener:n=>delete windowEvents[n],innerWidth:1440},
 MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this)}observe(){}disconnect(){this.disconnected=true}},require:n=>{if(n==='chart.js/auto')return{__esModule:true,default:class{destroy(){}resize(){}}};if(n==='./api-client'||n==='./diagnostics.service')return api;if(n.startsWith('./'))return load(n.slice(2));return{};}})
 function load(name){if(modules[name])return modules[name];const previous=context.exports;context.exports={};const src=fs.readFileSync(path.join(sourceRoot,'frontend/services/api',name+'.ts'),'utf8');vm.runInContext('(function(exports,require){'+ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText+'\n})(exports,require)',context);const out=context.exports;modules[name]=out;context.exports=previous;return out}
 exports=load(file)
 const dispose=exports[install](root,options)
 const start=()=>{
  for(const el of created)for(const [selector,node] of Object.entries(el.nodes))if(/reload|load/i.test(selector)){node.listeners.click?.();node.onclick?.()}
  root.listeners['medshield:sales-output-change']?.({detail:{name:file==='historical-comparison-panel'?'external':'so1'}})
  root.listeners.click?.({type:'click',target:{closest:()=>true}})
  for(const observer of observers){root.classList.contains=()=>true;observer.fn()}
  windowEvents['medshield:overview-scope']?.({detail:{start_date:'2025-01-01',end_date:calls.length?'2025-11-30':'2025-12-31'}})
  windowEvents['medshield:diagnostic-open']?.({detail:{start_date:'2025-01-01',end_date:'2025-12-31'}})
 }
 start();await tick();assert.ok(calls.length,file+' issued a request')
 const first=calls.at(-1);assert.ok(first.signal,file+' supplies owned AbortSignal')
 // Failure remains explicit, then a fresh current request can recover to loading.
 first.reject(Error('Synthetic current outage'));await tick()
 assert.ok(created.some(n=>/unavailable|Synthetic current outage/i.test(n.textContent)||Object.values(n.nodes).some(v=>/unavailable|Synthetic current outage/i.test(v.textContent))),file+' explicit failure')
 if(file==='stl-panel'){dispose();assert.equal(first.signal.aborted,true);const remount=exports[install](root,options),pending=calls.at(-1);assert.notEqual(pending,first);assert.equal(pending.signal.aborted,false);remount();assert.equal(pending.signal.aborted,true);const texts=()=>created.map(n=>[n.textContent,...Object.values(n.nodes).map(v=>v.textContent)]),after=JSON.stringify(texts());pending.resolve({});await tick();assert.equal(JSON.stringify(texts()),after);results.push({file,options,checks:['owned signal','explicit current failure','remount starts fresh request','pending disposal abort','ignored-abort late response rejected']});return}
 start();await tick();let pending=calls.filter(c=>c!==first).at(-1);assert.ok(pending,file+' current recovery request');assert.equal(pending.signal.aborted,false)
 if(root.listeners['medshield:source-reloaded']){
  const old=pending;root.listeners['medshield:source-reloaded']();assert.equal(old.signal.aborted,true,file+' source invalidation aborts');start();await tick();pending=calls.at(-1);assert.notEqual(pending,old);assert.equal(pending.signal.aborted,false);const loadingText=JSON.stringify(created.map(n=>[n.textContent,...Object.values(n.nodes).map(v=>v.textContent)]));old.reject(Error('Synthetic stale outage'));await tick();assert.equal(JSON.stringify(created.map(n=>[n.textContent,...Object.values(n.nodes).map(v=>v.textContent)])),loadingText,file+' old failure does not overwrite new loading state')
 }
 const texts=()=>created.map(n=>[n.textContent,...Object.values(n.nodes).map(v=>v.textContent)])
 dispose();assert.equal(pending.signal.aborted,true,file+' disposal aborts pending work');const after=JSON.stringify(texts())
 for(const call of calls)call.resolve({}) // Deliberately ignores abort; must not write error/loading to old nodes.
 await tick();assert.equal(JSON.stringify(texts()),after,file+' late response has no DOM writes after disposal')
 const count=calls.length;for(const observer of observers)assert.ok(observer.disconnected);assert.ok(count>0)
 results.push({file,options,checks:['owned signal','explicit current failure','recovery request','pending disposal abort','ignored-abort late response rejected','observer disposal']})
}
(async()=>{for(const c of configurations)await probe(c);const report={status:'PASS',scope:'compiled production installers; isolated DOM/Chart and deferred unabortable transport; no live or native acceptance',results};if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(report,null,2));console.log(JSON.stringify(report))})().catch(e=>{console.error(e);process.exitCode=1})

