// Executes compiled production handlers with isolated DOM/HTTP; not native evidence.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict')
const ts=require('../node_modules/typescript'),root=path.resolve(__dirname,'../..')
const fixture=JSON.parse(fs.readFileSync(path.resolve(process.argv[2]),'utf8'))
class NodeModel{
 constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.textContent='';this.disabled=false;this.value='';this.parentElement={hidden:true}}
 set innerHTML(html){this.selectors={};for(const m of html.matchAll(/<([a-z]+)[^>]*\b(data-regional-php-[a-z]+)[^>]*>/g)){const node=new NodeModel(m[1]);node.disabled=/\bdisabled\b/.test(m[0]);this.selectors['['+m[2]+']']=node}}
 querySelector(s){return this.selectors?.[s]??null}setAttribute(){}append(...nodes){this.children.push(...nodes)}
 replaceChildren(){this.children=[];this.textContent='';if(this.tag==='select')this.value=''}
 add(n){this.children.push(n)}addEventListener(n,f){this.listeners[n]=f}removeEventListener(n){delete this.listeners[n]}
 createTHead(){const n=new NodeModel('thead');this.append(n);return n}createTBody(){const n=new NodeModel('tbody');this.append(n);return n}
 insertRow(){const n=new NodeModel('tr');this.append(n);return n}insertCell(){const n=new NodeModel('td');this.append(n);return n}
 click(){return this.listeners.click?.()}change(value){this.value=value;return this.listeners.change?.()}remove(){this.removed=true}
}
let panel,calls=0,hold,offline=false,malformed=false,lastChart
const signals=[]
const events={},blobs=[]
const host={before:n=>panel=n,closest:()=>({classList:{contains:()=>false}})}
const rootModel={querySelector:()=>host,addEventListener:(n,f)=>events[n]=f,removeEventListener:n=>delete events[n]}
class Chart{constructor(canvas,config){lastChart=config}destroy(){}}
const api={getJson:async(_path,options)=>{calls++;signals.push(options.signal);if(hold)await hold;if(offline)throw Error('outage');return malformed?{...fixture,publication_approved:true}:fixture}}
const shared={};new Function('exports','require',ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api/tournament-research.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(shared,()=>({}));
const exportsModel={};const context=vm.createContext({exports:exportsModel,require:n=>n==='chart.js/auto'?{default:Chart}:n==='./tournament-research'?shared:api,
 document:{createElement:t=>new NodeModel(t)},AbortController,Option:class{constructor(text,value){this.text=text;this.value=value}},
 MutationObserver:class{observe(){}disconnect(){}},Blob:class{constructor(parts){blobs.push(parts.join(''))}},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},setTimeout:()=>{}})
vm.runInContext(ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api/regional-forecast-research.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context)
const el=n=>panel.querySelector('[data-regional-php-'+n+']'),settle=()=>new Promise(r=>setImmediate(r))
const table=n=>el(n).children[1]?.children.map(row=>row.children.map(cell=>cell.textContent))??[]
async function main(){
 const dispose=exportsModel.installRegionalForecastResearch(rootModel);assert.equal(calls,0);assert.equal(el('export').disabled,true)
 el('reload').click();await settle();assert.equal(el('export').disabled,false)
 const captures=[];const out=process.argv[3]?path.resolve(process.argv[3]):null;if(out)fs.mkdirSync(out,{recursive:true})
 for(const stage of fixture.stages)for(const lead of fixture.leads)for(const model of fixture.models){
  el('stage').change(stage);el('lead').change(String(lead));el('model').change(model)
  const rows=exportsModel.regionalCsvRecords(fixture,'CALABARZON',stage,lead,model)
  const expected=fixture.regions[0].points.filter(p=>p.stage===stage&&p.lead_months===lead&&p.model_id===model).sort((a,b)=>a.target_period.localeCompare(b.target_period))
  assert.equal(table('points').length,expected.length);assert.equal(table('groups').length,22)
  assert.deepEqual(Array.from(lastChart.data.datasets[0].data),expected.map(p=>p.actual))
  assert.deepEqual(Array.from(lastChart.data.datasets[1].data),expected.map(p=>p.prediction))
  const before=blobs.length;el('export').click();assert.equal(blobs.length,before+1)
  const quote=v=>'"'+String(typeof v==='string'&&/^[=+@\t\r-]/.test(v)?"'"+v:v??'').replace(/"/g,'""')+'"'
  assert.equal(blobs.at(-1),'\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\r\n')+'\r\n')
  const filename=`${stage}-${lead}-${model}.csv`
  if(out)fs.writeFileSync(path.join(out,filename),blobs.at(-1),{flag:'wx'})
  captures.push({stage,lead,model,filename,rows:table('points'),groups:table('groups'),metrics:el('metrics').textContent,selection:el('selection').textContent,chart:lastChart.data})
 }
 if(out)fs.writeFileSync(path.join(out,'cases.json'),JSON.stringify(captures,null,2),{flag:'wx'})
 for(const region of ['MIMAROPA','BICOL']){el('region').change(region);assert.match(el('status').textContent,/unavailable/);assert.equal(el('export').disabled,true);assert.equal(table('points').length,0);assert.equal(el('model').disabled,true)}
 el('region').change('CALABARZON');assert.equal(el('export').disabled,false);assert.equal(table('points').length,4)
 events['medshield:source-reloaded']();assert.equal(el('export').disabled,true);assert.equal(table('points').length,0)
 const previous=blobs.length;el('export').click();assert.equal(blobs.length,previous)
 el('reload').click();await settle();assert.equal(el('export').disabled,false)
 malformed=true;el('reload').click();await settle();assert.equal(el('export').disabled,true);assert.equal(table('points').length,0)
 malformed=false;offline=true;el('reload').click();await settle();assert.equal(el('export').disabled,true)
 offline=false;el('reload').click();await settle();assert.equal(el('export').disabled,false)
 let release;hold=new Promise(r=>release=r);el('reload').click();assert.equal(el('reload').disabled,true);assert.equal(el('export').disabled,true)
 const count=calls;el('reload').click();assert.equal(calls,count)
 const heldSignal=signals.at(-1);events['medshield:source-reloaded']();assert.equal(heldSignal.aborted,true);hold=null;el('reload').click();await settle();assert.equal(el('export').disabled,false)
 release();await settle();assert.equal(el('export').disabled,false)
 let finish;hold=new Promise(r=>finish=r);el('reload').click();const closingSignal=signals.at(-1);dispose();assert.equal(closingSignal.aborted,true);finish();await settle()
 assert.equal(panel.removed,true);assert.equal(table('points').length,0);assert.equal(el('export').disabled,true)
 console.log(JSON.stringify({status:'PASS_COMPILED_REGIONAL_PHP_HANDLERS',views:captures.length,exported_points:captures.reduce((s,c)=>s+c.rows.length,0),checks:['actual gateway/chart/table/export parity','stage/lead/model changes','missing models remain null','source invalidation','malformed/source failure clearing and recovery','concurrency','invalidation race','disposal'],native_browser:'not claimed'}))
}main().catch(e=>{console.error(e);process.exitCode=1})
