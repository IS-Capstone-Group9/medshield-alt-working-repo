// Production handlers in an isolated DOM; native QA is separate.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict')
const ts=require('../node_modules/typescript'),root=path.resolve(__dirname,'../..')
const fixture=JSON.parse(fs.readFileSync(path.resolve(process.argv[2]),'utf8'))
class NodeModel{
 constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.textContent='';this.disabled=false;this.value='';this.classList={contains:()=>false}}
 set innerHTML(html){this.selectors={};for(const m of html.matchAll(/<([a-z]+)[^>]*\b(data-abc-[a-z-]+)[^>]*>/g)){const n=new NodeModel(m[1]);n.disabled=/\bdisabled\b/.test(m[0]);this.selectors['['+m[2]+']']=n}}
 querySelector(s){return this.selectors?.[s]??null}setAttribute(){}append(...nodes){this.children.push(...nodes)}
 replaceChildren(){this.children=[];this.textContent='';if(this.tag==='select')this.value=''}add(n){this.children.push(n)}
 addEventListener(n,f){this.listeners[n]=f}removeEventListener(n){delete this.listeners[n]}
 createTHead(){const n=new NodeModel('thead');this.append(n);return n}createTBody(){const n=new NodeModel('tbody');this.append(n);return n}
 insertRow(){const n=new NodeModel('tr');this.append(n);return n}insertCell(){const n=new NodeModel('td');this.append(n);return n}
 click(){return this.listeners.click?.()}change(value){this.value=value;this.listeners.change?.()}remove(){this.removed=true}
}
let panel,calls=0,hold,offline=false,malformed=false
const events={},blobs=[],host=new NodeModel('host');host.append=n=>panel=n
const rootModel={querySelector:()=>host,addEventListener:(n,f)=>events[n]=f,removeEventListener:n=>delete events[n]}
const api={getJson:async()=>{calls++;if(hold)await hold;if(offline)throw Error('outage');return malformed?{...fixture,activation_allowed:true}:fixture}}
const model={},panelModule={};const common={AbortController,document:{createElement:t=>new NodeModel(t)},Option:class{constructor(text,value){this.text=text;this.value=value}},
 MutationObserver:class{observe(){}disconnect(){}},Blob:class{constructor(parts){blobs.push(parts.join(''))}},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},setTimeout:()=>{}}
const compile=(name,exports,require)=>vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api/'+name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{...common,exports,require})
compile('abc-research-model',model,()=>({}));compile('abc-research-panel',panelModule,n=>n==='./abc-research-model'?model:api)
const el=n=>panel.querySelector('[data-abc-'+n+']'),settle=()=>new Promise(r=>setImmediate(r))
const table=n=>el(n).children[1]?.children.map(r=>r.children.map(c=>c.textContent))??[]
async function main(){
 const dispose=panelModule.installAbcResearch(rootModel);assert.equal(calls,0);assert.equal(el('metric-export').disabled,true)
 el('reload').click();await settle();assert.equal(el('metric-export').disabled,false)
 const captures=[],out=process.argv[3]?path.resolve(process.argv[3]):null;if(out)fs.mkdirSync(out,{recursive:true})
 for(const stage of fixture.stages)for(const method of fixture.models)for(const cohort of fixture.cohorts){
  el('stage').change(stage);el('model').change(method);el('cohort').change(cohort)
  const view=model.abcReviewView(fixture,stage,method,cohort),prefix=`${stage}-${method}-${cohort}`
  const before=blobs.length;el('metric-export').click();assert.equal(blobs.length,before+1)
  assert.equal(blobs.at(-1),model.abcCsv(model.abcMetricCsvRecords(fixture,stage,method,cohort)))
  const metricsFile=prefix+'-metrics.csv';if(out)fs.writeFileSync(path.join(out,metricsFile),blobs.at(-1),{flag:'wx'})
  const count=blobs.length;el('case-export').click()
  assert.equal(el('case-export').disabled,view.cases.length===0);assert.equal(blobs.length,count+(view.cases.length?1:0))
  let casesFile=null
  if(view.cases.length){assert.equal(blobs.at(-1),model.abcCsv(model.abcCaseCsvRecords(fixture,stage,method,cohort)));casesFile=prefix+'-cases.csv';if(out)fs.writeFileSync(path.join(out,casesFile),blobs.at(-1),{flag:'wx'})}
  assert.equal(table('matrix').length,3);assert.equal(table('classes').length,3);assert.equal(table('cases').length,view.cases.length)
  if(view.group===null)assert.match(el('status').textContent,/not evaluated/)
  else if(view.group.samples===0)assert.match(el('status').textContent,/No evaluated labels/)
  captures.push({stage,model:method,cohort,evaluation_status:view.status,metricsFile,casesFile,status:el('status').textContent,metrics:el('metrics').textContent,matrix:table('matrix'),classes:table('classes'),cases:table('cases')})
 }
 if(out)fs.writeFileSync(path.join(out,'views.json'),JSON.stringify(captures,null,2),{flag:'wx'})
 events['medshield:source-reloaded']();assert.equal(el('metric-export').disabled,true);assert.equal(el('case-export').disabled,true);assert.equal(table('matrix').length,0)
 el('reload').click();await settle();assert.equal(el('metric-export').disabled,false)
 malformed=true;el('reload').click();await settle();assert.equal(el('metric-export').disabled,true);assert.equal(table('cases').length,0)
 malformed=false;offline=true;el('reload').click();await settle();assert.equal(el('case-export').disabled,true)
 offline=false;el('reload').click();await settle();assert.equal(el('metric-export').disabled,false)
 let release;hold=new Promise(r=>release=r);el('reload').click();assert.equal(el('reload').disabled,true);assert.equal(el('metric-export').disabled,true)
 const count=calls;el('reload').click();assert.equal(calls,count)
 events['medshield:source-reloaded']();hold=null;el('reload').click();await settle();release();await settle();assert.equal(el('metric-export').disabled,false)
 let finish;hold=new Promise(r=>finish=r);el('reload').click();dispose();finish();await settle();assert.equal(panel.removed,true);assert.equal(el('case-export').disabled,true);assert.equal(table('cases').length,0)
 console.log(JSON.stringify({status:'PASS_COMPILED_ABC_HANDLERS',views:captures.length,model_not_evaluated:captures.filter(c=>c.evaluation_status==='model_not_evaluated').length,empty_cohorts:captures.filter(c=>c.evaluation_status==='empty_evaluated_cohort').length,
  checks:['API/matrix/classes/case/CSV parity','all 60 stage/model/cohort scopes','unassessed and empty distinction','source invalidation','malformed/outage clearing and recovery','concurrency','invalidation race','disposal'],native_browser:'not claimed'}))
}main().catch(e=>{console.error(e);process.exitCode=1})
