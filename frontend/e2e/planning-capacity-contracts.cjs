// Actual compiled renderer/draft handlers + actual gateway solver; isolated DOM, not native browser QA.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),ts=require('../node_modules/typescript')
const {solvePlanningScenario}=require('../../backend/src/planningScenario.ts')
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.argv[2]||path.join(root,'outputs/wp9_capacity_ui_20261030'))
fs.mkdirSync(out,{recursive:true})
const compile=(name,scope)=>vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope)
const labels={},api={},drafts={};compile('product-chart-view',{exports:labels});compile('prescriptive-planning-runtime',{exports:api,require:()=>labels})
let panel;const nodes={},inputs={},blobs=[],charts=new Map(),passed=[]
class Node{
 constructor(){this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.listeners={};this.children={};this.style={};this.classList={remove(){},add(){}};this.text='';this.html=''}
 set textContent(v){this.text=v;this.html=''}get textContent(){return this.text}
 set innerHTML(v){this.html=v;this.text=''}get innerHTML(){return this.html}
 closest(){return {style:{setProperty(){}},after(p){panel=p}}}
 replaceChildren(){}setAttribute(){}remove(){}
 querySelector(key){return this.children[key]??=new Node()}
 addEventListener(name,fn){this.listeners[name]=fn}removeEventListener(name){delete this.listeners[name]}
 click(){this.listeners.click?.()}
}
const node=id=>nodes[id]??=new Node()
class Chart{constructor(n,config){this.node=n;this.config=config;charts.set(n,this)}destroy(){charts.delete(this.node)}static getChart(n){return charts.get(n)}}
const document={getElementById:node,createElement:()=>new Node(),querySelectorAll(selector){const m=/data-plan-index="(\d+)"/.exec(selector);return m?Object.values(inputs[m[1]]||{}):[]}}
const browser={innerWidth:1200,dispatchEvent(){}}
const environment={document,window:browser,Chart,Option:class{},CustomEvent:class{},Blob:class{constructor(parts){blobs.push(parts.join(''))}},URL:{createObjectURL:()=>'',revokeObjectURL(){}},setTimeout(){}}
const scope=vm.createContext(environment);vm.runInContext(api.PLANNING_SCRIPT,scope)
for(const [,id]of api.PLANNING_MARKUP.matchAll(/id="([^"]+)"/g))node(id)
const productNames=['Synthetic A','Synthetic B']
const source={scope:{sector:'All',territory:'all'},territories:[],source:{checksum:'synthetic_capacity_ui',file:'explicit synthetic fixture',excluded:{}},period_start:'2025-10',period_end:'2026-09',eligible_products:2,shortlist_share_pct:100,excluded_nonpositive_products:0,
 products:productNames.map((product,i)=>({product,revenue:1000-i*100,revenue_share_pct:50,quantity:null,observed_months:12}))}
function renderSource(){scope.payload=source;vm.runInContext('setPlanningData(payload)',scope)
 for(const [,index,field] of node('planInputs').innerHTML.matchAll(/data-plan-index="(\d+)" data-plan-field="([^"]+)"/g)){
  inputs[index]??={};inputs[index][field]={value:'',dataset:{planField:field}}
 }
}
function check(name,fn){fn();passed.push(name)}
function fill(){node('planHorizon').value='1';node('planBudget').value='100';node('planMinimum').value='0';node('planAllocationMethod').value='weighted';node('planRevenueWeight').value='100';node('planGrowthWeight').value='0';node('planOutbreakWeight').value='0';node('planAcknowledged').checked=true
 for(let i=0;i<2;i++)for(const [key,value]of Object.entries({demand:i?'3':'4',stock:'0',reserve:'0',pack:i?'1':'2',pack_cost:'1',max_packs:i?'3':'2',revenue_score:i?'60':'100'}))inputs[i][key].value=value
}
function cap(value,label='ampoules'){node('planPurchaseCapacity').value=value;node('planCapacityUnit').value=label;for(const group of Object.values(inputs))group.unit_label.value=label}
function request(forDraft=false){return JSON.parse(JSON.stringify(scope.getPlanningRequest(forDraft)))}
function solve(){node('planAcknowledged').checked=true;const body=request();return solvePlanningScenario(body,{source:source.source,scope:source.scope,products:source.products})}
function render(result){scope.result=result;vm.runInContext('setPlanningResult(result)',scope)}
function exportRows(filename){vm.runInContext('exportPlanningCSV()',scope);const text=blobs.at(-1);fs.writeFileSync(path.join(out,filename),text)
 const records=text.replace(/^\uFEFF/,'').split('\r\n').filter(Boolean).map(line=>[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replace(/""/g,'"')))
 const [header,...rows]=records;assert.ok(rows.every(r=>r.length===header.length));return rows.map(row=>Object.fromEntries(header.map((key,i)=>[key,row[i]])))
}
check('Blank controls and product units; no forecast/source values prefilled',()=>{renderSource();assert.equal(node('planPurchaseCapacity').value,'');assert.equal(node('planCapacityUnit').value,'');assert.ok(Object.values(inputs).every(g=>g.unit_label.value===''));assert.match(api.PLANNING_MARKUP,/Optional shared purchase capacity/);assert.ok(!/id="planPurchaseCapacity"[^>]*\bvalue=/.test(api.PLANNING_MARKUP))})
fill()
check('Blank cap omitted from API while partial draft preserves its unit text',()=>{node('planCapacityUnit').value='unfinished unit';const body=request();assert.ok(!Object.hasOwn(body,'purchase_capacity_units'));assert.ok(!Object.hasOwn(body,'capacity_unit_label'));assert.equal(request(true).purchase_capacity_units,'');assert.equal(request(true).capacity_unit_label,'unfinished unit')})
const fixtures=[]
for(const value of ['0','3'])check('Gateway/UI/CSV parity for explicit capacity '+value,()=>{
 cap(value);const body=request(),result=solve();fixtures.push({request:body,result});assert.equal(body.purchase_capacity_units,value);render(result)
 assert.equal(node('planCalculatedResults').hidden,false);assert.equal(node('planExport').disabled,false)
 assert.ok(node('planCapacitySummary').textContent.includes('Assumed purchase cap: '+value+' ampoules'))
 const rows=exportRows('capacity-'+value+'.csv');for(const row of rows){assert.equal(row.capacity_constraint_status,'applied');assert.equal(row.shared_purchase_capacity_units,value);assert.equal(Number(row.capacity_used_units),result.purchase_capacity.used_units);assert.equal(row.capacity_evidence_label,'Assumed');assert.equal(row.physical_storage_verified,'false')}
})
for(const mutation of ['missing','units','unit_label','used_units','physical_storage_verified','evidence_label'])check('Mismatched capacity response clears result/export: '+mutation,()=>{
 cap('3');const bad=structuredClone(fixtures[1].result)
 if(mutation==='missing')delete bad.purchase_capacity
 else bad.purchase_capacity[mutation]=mutation==='unit_label'?'boxes':mutation==='physical_storage_verified'?true:mutation==='evidence_label'?'Observed':999
 render(bad);assert.equal(node('planCalculatedResults').hidden,true);assert.equal(node('planExport').disabled,true);assert.match(node('planResultStatus').textContent,/does not match/);assert.equal(node('planCapacitySummary').textContent,'')
})
check('Changed inputs clear capacity result and acknowledgment',()=>{cap('3');render(fixtures[1].result);vm.runInContext('invalidatePlan(true)',scope);assert.equal(node('planAcknowledged').checked,false);assert.equal(node('planCapacitySummary').textContent,'');assert.equal(node('planExport').disabled,true)})
check('Uncapped and legacy responses are distinguished in UI/export',()=>{node('planPurchaseCapacity').value='';const result=solve();render(result);assert.match(node('planCapacitySummary').textContent,/No shared/);assert.equal(exportRows('uncapped.csv')[0].capacity_constraint_status,'not_applied');delete result.purchase_capacity;render(result);assert.match(node('planCapacitySummary').textContent,/unavailable/);assert.equal(exportRows('legacy.csv')[0].capacity_constraint_status,'unavailable')})
check('Unit labels use textContent and spreadsheet formula escaping',()=>{cap('3','=SUM(1,1)');render(solve());assert.ok(node('planCapacitySummary').textContent.includes('=SUM(1,1)'));assert.equal(node('planCapacitySummary').innerHTML,'');assert.equal(exportRows('formula-safe-unit.csv')[0].capacity_unit_label,"'=SUM(1,1)")})
check('Source replacement and failure clear capacity fields/results',()=>{cap('3');render(solve());renderSource();assert.equal(node('planPurchaseCapacity').value,'');assert.equal(node('planCapacityUnit').value,'');assert.equal(node('planCapacitySummary').textContent,'');cap('3');vm.runInContext("setPlanningData(null,'Source unavailable')",scope);assert.equal(node('planPurchaseCapacity').value,'');assert.equal(node('planInputs').innerHTML,'');assert.equal(node('planExport').disabled,true)})
renderSource();fill();cap('0')
browser.getPlanningRequest=forDraft=>scope.getPlanningRequest(forDraft);browser.invalidatePlan=()=>vm.runInContext('invalidatePlan()',scope)
compile('planning-drafts',{exports:drafts,...environment})
const host={querySelector(selector){if(selector.startsWith('#'))return node(selector.slice(1));const m=/data-plan-index="(\d+)".*data-plan-field="([^"]+)"/.exec(selector);return m?inputs[m[1]][m[2]]:null}}
async function main(){
 const stop=drafts.installPlanningDrafts(host),file=panel.querySelector('[data-draft-file]')
 const load=async draft=>{file.files=[{size:JSON.stringify(draft).length,text:async()=>JSON.stringify(draft)}];file.listeners.change();await new Promise(resolve=>setImmediate(resolve))}
 panel.querySelector('[data-draft-save]').click();const saved=JSON.parse(blobs.at(-1))
 check('Draft save preserves zero, units and false acknowledgment',()=>{assert.equal(saved.request.purchase_capacity_units,'0');assert.equal(saved.request.capacity_unit_label,'ampoules');assert.ok(saved.request.items.every(i=>i.unit_label==='ampoules'));assert.equal(saved.request.acknowledged,false)})
 cap('8','boxes');await load(saved)
 check('Draft load restores capacity/units and clears calculated results',()=>{assert.equal(node('planPurchaseCapacity').value,'0');assert.equal(node('planCapacityUnit').value,'ampoules');assert.ok(Object.values(inputs).every(g=>g.unit_label.value==='ampoules'));assert.equal(node('planAcknowledged').checked,false);assert.equal(node('planExport').disabled,true)})
 const legacy=structuredClone(saved);delete legacy.request.purchase_capacity_units;delete legacy.request.capacity_unit_label;for(const row of legacy.request.items)delete row.unit_label
 await load(legacy)
 check('Legacy draft clears all new capacity/unit fields',()=>{assert.equal(node('planPurchaseCapacity').value,'');assert.equal(node('planCapacityUnit').value,'');assert.ok(Object.values(inputs).every(g=>g.unit_label.value===''))})
 const partial=structuredClone(saved);partial.request.purchase_capacity_units='';partial.request.capacity_unit_label='unfinished unit';for(const row of partial.request.items)row.unit_label=''
 await load(partial)
 check('Incomplete unit declaration roundtrip preserved without enabling cap',()=>{assert.equal(request(true).capacity_unit_label,'unfinished unit');assert.equal(request(true).purchase_capacity_units,'');assert.ok(!Object.hasOwn(request(),'purchase_capacity_units'))})
 for(const value of [null,true,'-1','1.5','Infinity','1000000001'])check('Draft rejects invalid capacity '+JSON.stringify(value),()=>{const bad=structuredClone(saved);bad.request.purchase_capacity_units=value;assert.throws(()=>drafts.validatePlanningDraft(bad,request()))})
 for(const field of ['capacity_unit_label','unit_label'])for(const value of [null,{},'x'.repeat(81),'line\nbreak'])check('Draft rejects invalid '+field+' '+JSON.stringify(value),()=>{const bad=structuredClone(saved);if(field==='unit_label')bad.request.items[0][field]=value;else bad.request[field]=value;assert.throws(()=>drafts.validatePlanningDraft(bad,request()))})
 const foreign=structuredClone(saved);foreign.request.checksum='different';const before=JSON.stringify(request(true));await load(foreign)
 check('Foreign-source draft leaves current assumptions unchanged',()=>assert.equal(JSON.stringify(request(true)),before))
 stop();fs.writeFileSync(path.join(out,'gateway-fixtures.json'),JSON.stringify(fixtures,null,2)+'\n')
 const names=['frontend/services/api/prescriptive-planning-runtime.ts','frontend/services/api/planning-drafts.ts','backend/src/planningScenario.ts','backend/src/weightedPlanning.ts','frontend/e2e/planning-capacity-contracts.cjs']
 const code_sha256=Object.fromEntries(names.map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex')]))
 const report={status:'PASS_COMPILED_CAPACITY_UI_DRAFT_API_CSV',checked_at:new Date().toISOString(),cases:passed.length,checks:passed,code_sha256,actual_browser:false,operational_approval:false}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cases:report.cases,actual_browser:false}))
}
main().catch(error=>{console.error(error);process.exitCode=1})
