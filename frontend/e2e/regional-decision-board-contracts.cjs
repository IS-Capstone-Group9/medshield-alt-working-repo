// Compiled actual panel; isolated DOM and HTTP fixture, not native-browser evidence.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),ts=require('../node_modules/typescript')
const fixture=JSON.parse(fs.readFileSync(process.argv[2]?path.resolve(process.argv[2]):path.join(root,'outputs/wp14_decision_board_20261030/response.json'),'utf8'))
class NodeModel{
 constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.textContent='';this.disabled=false}
 set innerHTML(html){this.html=html;this.selectors={};for(const m of html.matchAll(/<([a-z]+)[^>]*\b(data-board-[a-z]+)[^>]*>/g)){const node=new NodeModel(m[1]);node.disabled=/\bdisabled\b/.test(m[0]);this.selectors['['+m[2]+']']=node}}
 querySelector(selector){return this.selectors?.[selector]??null}
 setAttribute(){} append(...nodes){this.children.push(...nodes)} replaceChildren(){this.children=[];this.textContent=''}
 addEventListener(name,fn){this.listeners[name]=fn} removeEventListener(name){delete this.listeners[name]}
 createTHead(){const n=new NodeModel('thead');this.append(n);return n}createTBody(){const n=new NodeModel('tbody');this.append(n);return n}
 insertRow(){const n=new NodeModel('tr');this.append(n);return n}insertCell(){const n=new NodeModel('td');this.append(n);return n}
 click(){return this.listeners.click?.()}remove(){this.removed=true}
}
let panel,offline=false,hold,calls=0;const events={},blobs=[]
const rootModel={querySelector:()=>({append:n=>{panel=n}}),addEventListener:(n,f)=>events[n]=f,removeEventListener:n=>delete events[n]}
const model={};const context=vm.createContext({AbortController,exports:model,require:()=>({getJson:async()=>{calls++;if(hold)await hold;if(offline)throw Error('outage');return fixture}}),
 document:{createElement:t=>new NodeModel(t)},Blob:class{constructor(parts){blobs.push(parts.join(''))}},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},setTimeout:()=>{}})
vm.runInContext(ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api/regional-decision-board.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context)
const el=n=>panel.querySelector('[data-board-'+n+']'),settle=()=>new Promise(r=>setImmediate(r))
async function main(){
 const dispose=model.installRegionalDecisionBoard(rootModel)
 assert.equal(el('export').disabled,true);assert.equal(calls,0)
 events['medshield:sales-output-change']({detail:{name:'so1'}});await settle()
 assert.equal(el('export').disabled,false);assert.equal(el('table').children[1].children.length,18)
 el('export').click();assert.equal(blobs[0],model.regionalDecisionBoardCsv(fixture))
 if(process.argv[3]){const out=path.resolve(process.argv[3]);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'board.csv'),blobs[0],{flag:'wx'});fs.writeFileSync(path.join(out,'rendered-table.json'),JSON.stringify(el('table').children[1].children.map(row=>row.children.map(cell=>cell.textContent)),null,2),{flag:'wx'})}
 events['medshield:source-reloaded']();assert.equal(el('export').disabled,true);assert.equal(el('table').children.length,0)
 events['medshield:sales-output-change']({detail:{name:'so1'}});await settle();assert.equal(el('export').disabled,false)
 if(fixture.product_priority){const hash=fixture.product_priority.query_sha256;fixture.product_priority.query_sha256='bad';await el('load').click();assert.equal(el('export').disabled,true);assert.equal(el('table').children.length,0);fixture.product_priority.query_sha256=hash;await el('load').click();assert.equal(el('export').disabled,false)}
 offline=true;await el('load').click();assert.equal(el('export').disabled,true);assert.equal(el('table').children.length,0)
 offline=false;await el('load').click();assert.equal(el('export').disabled,false)
 let release;hold=new Promise(r=>release=r);const pending=el('load').click();assert.equal(el('export').disabled,true)
 el('load').click();assert.equal(el('load').disabled,true);dispose();release();await pending
 assert.equal(panel.removed,true);assert.equal(el('table').children.length,0)
 console.log(JSON.stringify({status:'PASS_COMPILED_BOARD_STATES_AND_CSV',rows:18,checks:['API/table/CSV equality','source invalidation',...(fixture.product_priority?['invalid v2 priority rejection/recovery']:[]),'failure clears stale results','recovery','concurrent load lock','disposal race'],native_browser:'unverified'}))
}main().catch(e=>{console.error(e);process.exitCode=1})
