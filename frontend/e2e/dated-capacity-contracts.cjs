// Compiled production handlers and real gateway functions; synthetic inputs, isolated DOM.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),ts=require('../node_modules/typescript')
const {reviewDatedPlan}=require('../../backend/src/datedPlanReview.ts'),{selectDatedPlan}=require('../../backend/src/datedPlanSelection.ts')
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.argv[2]||path.join(root,'outputs/wp9_dated_capacity_ui_20261030'))
if(fs.existsSync(path.join(out,'results.json')))throw Error('Use a new evidence directory')
fs.mkdirSync(out,{recursive:true})
let panel,current={checksum:'synthetic_dated_capacity',scope:{sector:'All',territory:'all'},items:[{product:'Synthetic A'},{product:'Synthetic B'}]},sourceDown=false
class Node{
 constructor(){this.nodes=[];this.children={};this.listeners={};this.style={};this.disabled=false;this.textContent='';this.value=''}
 setAttribute(){} querySelector(s){return this.children[s]??=new Node()} closest(){return {after:p=>panel=p}}
 addEventListener(n,fn){this.listeners[n]=fn} replaceChildren(){this.nodes=[]} append(...nodes){this.nodes.push(...nodes)}
 click(){if(!this.disabled)this.listeners.click?.()} remove(){this.removed=true}
}
const api={},events={},blobs=[],passed=[],captures=[]
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api/operating-input-review.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{
 AbortController,exports:api,document:{createElement:()=>new Node()},window:{getPlanningRequest:()=>{if(sourceDown)throw Error('Source unavailable');return current},addEventListener:(n,fn)=>events[n]=fn,removeEventListener:n=>delete events[n]},
 Blob:class{constructor(parts){blobs.push(parts.join(''))}},URL:{createObjectURL:()=>'',revokeObjectURL(){}},setTimeout:fn=>fn(),Intl,Date
})
const today=api.manilaToday(),next=new Date(Date.parse(today)+86400000).toISOString().slice(0,10)
function fixture(cap){return {schema_version:1,classification:'entered_unverified_operating_snapshot',as_of:today,input_reference:'Synthetic capacity QA',checksum:current.checksum,scope:current.scope,purchase_budget:100,
 ...(cap===undefined?{}:{purchase_capacity_units:cap,capacity_unit_label:'ampoules'}),products:current.items.map((p,i)=>({product:p.product,unit_label:'ampoules',stock_total:0,protected_reserve:0,batches:[],receipts:[],horizon_end:next,
 demand_calendar:[{date:today,units:i?4:3},{date:next,units:0}],proposed_receipts:[{receipt_id:'candidate',units:i?4:3,expected_on:today,expires_on:'2099-01-01'}],
 purchase_constraints:{units_per_pack:i?2:3,pack_cost:i?2:3,supplier_max_packs:2,maximum_projected_expired_units:0,minimum_fulfillment_pct:0,selection_max_packs:2,selection_weight:100}}))}}
const shortlist=()=>({source:{checksum:current.checksum},scope:current.scope,products:current.items})
let mutateFixed=r=>r,mutateSelect=r=>r,pending=null
const reviewSignals=[],selectSignals=[]
const dispose=api.installOperatingInputReview(new Node(),async (body,options)=>{
 reviewSignals.push(options.signal)
 if(pending)return pending(body)
 return mutateFixed(structuredClone(reviewDatedPlan(body,shortlist(),today)))
},async (body,options)=>{selectSignals.push(options.signal);return mutateSelect(structuredClone(selectDatedPlan(body,shortlist(),today)))})
const el=s=>panel.querySelector(s),file=el('[data-supply-file]'),exportButton=el('[data-supply-export]'),fixed=panel.nodes.find(n=>n.textContent==='Check dated plan against budget and limits'),select=panel.nodes.find(n=>n.textContent==='Select dated purchase quantities')
const tick=()=>new Promise(resolve=>setImmediate(resolve)),allText=n=>n.textContent+' '+n.nodes.map(allText).join(' ')
async function load(data){file.files=[{size:JSON.stringify(data).length,text:async()=>JSON.stringify(data)}];file.listeners.change();await tick()}
function exported(){const before=blobs.length;exportButton.click();assert.equal(blobs.length,before+1);return JSON.parse(blobs.at(-1))}
async function check(name,fn){await fn();passed.push(name)}
async function main(){
 await check('Template omits optional cap and explains explicit zero/no conversion',()=>{el('[data-supply-template]').click();const t=JSON.parse(blobs.at(-1));assert.ok(!Object.hasOwn(t,'purchase_capacity_units'));assert.match(t.capacity_help,/zero is a real zero/);assert.match(t.capacity_help,/no automatic conversion/);assert.equal(t.products[0].unit_label,'')})
 for(const cap of [undefined,0,2,5,7,20])await check('Actual fixed/select handlers, full packs and export cap '+cap,async()=>{
  const snapshot=fixture(cap);await load(snapshot);assert.equal(exportButton.disabled,false);fixed.click();await tick();select.click();await tick()
  const record=exported(),r=record.server_dated_plan_review,s=record.server_dated_purchase_selection
  assert.ok(r);assert.ok(s);assert.equal(s.status,'DATED_SELECTION_RESULT');assert.deepEqual(record.entered_snapshot,snapshot)
  const used=s.rows.reduce((sum,row)=>sum+row.proposed_packs*row.constraints.units_per_pack,0)
  if(cap===undefined){assert.equal(r.purchase_capacity,null);assert.equal(s.purchase_capacity,null);assert.match(allText(panel),/capacity not applied/)}
  else{
   assert.equal(record.purchase_capacity_constraint.units,cap);assert.equal(r.purchase_capacity.used_units,7);assert.equal(r.purchase_capacity.remaining_units,cap-7)
   assert.equal(r.status,cap<7?'DATED_FIXED_PLAN_INFEASIBLE':'DATED_FIXED_PLAN_FEASIBLE');assert.equal(s.purchase_capacity.units,cap);assert.equal(s.purchase_capacity.used_units,used);assert.equal(s.purchase_capacity.remaining_units,cap-used);assert.ok(used<=cap)
   assert.equal(used,cap<3?cap===2?2:0:cap===5?5:7)
   assert.match(allText(panel),new RegExp('Purchase capacity: '+used+' / '+cap))
  }
  captures.push({name:'capacity '+cap,snapshot,record})
 })
 const invalid=[['null',d=>d.purchase_capacity_units=null],['string',d=>d.purchase_capacity_units='5'],['boolean',d=>d.purchase_capacity_units=false],['fraction',d=>d.purchase_capacity_units=1.5],['negative',d=>d.purchase_capacity_units=-1],['large',d=>d.purchase_capacity_units=1e9+1],['missing label',d=>delete d.capacity_unit_label],['mixed unit',d=>d.products[1].unit_label='boxes'],['orphan label',d=>delete d.purchase_capacity_units]]
 for(const [name,change]of invalid)await check('Invalid input rejected before server: '+name,async()=>{const d=fixture(5);change(d);await load(d);assert.equal(exportButton.disabled,true);assert.equal(fixed.disabled,true);assert.equal(select.disabled,true)})
 await check('Trimmed units/fixed-product text preserve existing selection identity boundary',async()=>{const d=fixture(5);d.capacity_unit_label=' ampoules ';d.products[0].unit_label=' ampoules ';d.products[0].product=' '+d.products[0].product+' ';await load(d);fixed.click();select.click();await tick();const r=exported();assert.equal(r.server_dated_plan_review.purchase_capacity.unit_label,'ampoules');assert.equal(r.server_dated_purchase_selection,null);d.products[0].product=d.products[0].product.trim();await load(d);select.click();await tick();assert.equal(exported().server_dated_purchase_selection.purchase_capacity.unit_label,'ampoules')})
 await check('Fixed review shows simultaneous capacity/budget/expiry/service conflicts',async()=>{
  const d=fixture(5);d.purchase_budget=0;for(const p of d.products){p.demand_calendar[0].units=0;p.demand_calendar[1].units=10;p.proposed_receipts[0].expires_on=next;p.purchase_constraints.minimum_fulfillment_pct=100}
  await load(d);fixed.click();await tick();const r=exported().server_dated_plan_review;assert.equal(r.status,'DATED_FIXED_PLAN_INFEASIBLE')
  for(const word of ['capacity exceeded','budget exceeded','expiry limit exceeded','fulfillment minimum not met'])assert.ok(allText(panel).includes(word))
  captures.push({name:'simultaneous conflicts',snapshot:d,record:exported()})
 })
 await check('Minimum service cannot fit zero capacity; no false selection',async()=>{const d=fixture(0);d.products.forEach(p=>p.purchase_constraints.minimum_fulfillment_pct=100);await load(d);select.click();await tick();const r=exported().server_dated_purchase_selection;assert.equal(r.status,'DATED_SELECTION_INFEASIBLE');assert.equal(r.purchase_capacity_constraint.units,0);assert.match(allText(panel),/no feasible selected plan/);captures.push({name:'infeasible minimum',snapshot:d,record:exported()})})
 const mutations=[['missing',r=>delete r.purchase_capacity],['cap',r=>r.purchase_capacity.units=6],['label',r=>r.purchase_capacity.unit_label='boxes'],['used',r=>r.purchase_capacity.used_units++],['remaining',r=>r.purchase_capacity.remaining_units++],['evidence',r=>r.purchase_capacity.evidence_label='Observed'],['storage',r=>r.purchase_capacity.physical_storage_verified=true],['pack',r=>r.rows[0].constraints.units_per_pack++],['units',r=>r.rows[0].unit_label='boxes'],['duplicate',r=>r.rows[1]=r.rows[0]]]
 for(const [name,change]of mutations)for(const selection of [false,true])await check('Reject inconsistent '+(selection?'selection ':'fixed ')+name,async()=>{
  await load(fixture(5));const mutate=r=>{change(r);return r};if(selection)mutateSelect=mutate;else mutateFixed=mutate
  ;(selection?select:fixed).click();await tick();assert.equal(exported()[selection?'server_dated_purchase_selection':'server_dated_plan_review'],null);assert.match(allText(panel),/No (previous selection|prior server result) substituted/)
  mutateFixed=r=>r;mutateSelect=r=>r
 })
 for(const [name,change]of [
  ['missing constraint',r=>delete r.purchase_capacity_constraint],['wrong constraint',r=>r.purchase_capacity_constraint.units=7],['missing selected snapshot',r=>delete r.selected_snapshot],['changed snapshot cap',r=>r.selected_snapshot.purchase_capacity_units=7],
  ['selected receipt units',r=>r.selected_snapshot.products[0].proposed_receipts[0].units++],['changed arrival',r=>r.selected_snapshot.products[0].proposed_receipts[0].expected_on=next],['changed budget',r=>r.selected_snapshot.purchase_budget=500],['missing full readback',r=>delete r.full_plan_verification_status],
  ['over capacity',r=>{r.rows[0].proposed_packs=2;r.purchase_capacity.used_units=8;r.purchase_capacity.remaining_units=-3}],['wrong pack domain',r=>r.rows[0].proposed_packs=3]
 ])await check('Reject selected input inconsistency: '+name,async()=>{await load(fixture(5));mutateSelect=r=>{change(r);return r};select.click();await tick();assert.equal(exported().server_dated_purchase_selection,null);mutateSelect=r=>r})
 await check('Fixed violation cannot claim feasibility or omit conflict',async()=>{for(const change of [r=>r.status='DATED_FIXED_PLAN_FEASIBLE',r=>r.conflicts=[]]){await load(fixture(5));mutateFixed=r=>{change(r);return r};fixed.click();await tick();assert.equal(exported().server_dated_plan_review,null)}mutateFixed=r=>r})
 await check('Reordered JSON properties preserve valid selected-input parity',async()=>{await load(fixture(5));const reorder=v=>Array.isArray(v)?v.map(reorder):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,value])=>[k,reorder(value)])):v;mutateSelect=r=>reorder(r);select.click();await tick();assert.ok(exported().server_dated_purchase_selection);mutateSelect=r=>r})
 await check('Legacy omitted capacity response still works and labels unavailable',async()=>{await load(fixture());mutateFixed=r=>{delete r.purchase_capacity;return r};fixed.click();await tick();assert.ok(exported().server_dated_plan_review);assert.match(allText(panel),/legacy response/);mutateFixed=r=>r})
 await check('Unrequested response cap rejected',async()=>{await load(fixture());mutateFixed=r=>({...r,purchase_capacity:{units:5}});fixed.click();await tick();assert.equal(exported().server_dated_plan_review,null);mutateFixed=r=>r})
 await check('Changed/imported input clears both previous results',async()=>{await load(fixture(5));fixed.click();select.click();await tick();await load(fixture(0));const r=exported();assert.equal(r.server_dated_plan_review,null);assert.equal(r.server_dated_purchase_selection,null);assert.equal(r.purchase_capacity_constraint.units,0)})
 await check('Planning/source invalidation clears results and prevents exports',async()=>{await load(fixture(5));fixed.click();select.click();await tick();events['medshield:plan-invalidated']();assert.equal(exportButton.disabled,true);assert.equal(fixed.disabled,true);assert.equal(select.disabled,true);assert.equal(el('[data-supply-findings]').nodes.length,0)})
 await check('Source failure and changed source detected at export',async()=>{for(const failure of [true,false]){await load(fixture(5));if(failure)sourceDown=true;else current={...current,checksum:'changed'};const n=blobs.length;exportButton.click();assert.equal(blobs.length,n);assert.equal(exportButton.disabled,true);sourceDown=false;current={...current,checksum:'synthetic_dated_capacity'}}})
 await check('In-flight gateway result discarded after invalidation',async()=>{await load(fixture(5));let done;pending=body=>new Promise(resolve=>done=()=>resolve(reviewDatedPlan(body,shortlist(),today)));fixed.click();const signal=reviewSignals.at(-1);assert.equal(signal.aborted,false);events['medshield:plan-invalidated']();assert.equal(signal.aborted,true);done();await tick();assert.equal(exportButton.disabled,true);assert.equal(fixed.disabled,true);pending=null})
 await check('Unit text remains literal text and JSON in summaries/export',async()=>{const d=fixture(5);d.capacity_unit_label='<img src=x onerror=alert(1)>';d.products.forEach(p=>p.unit_label=d.capacity_unit_label);await load(d);fixed.click();await tick();assert.equal(exported().purchase_capacity_constraint.unit_label,d.capacity_unit_label);assert.ok(allText(panel).includes(d.capacity_unit_label))})
 await check('Owned review/select signals survive each other and abort on input invalidation',async()=>{await load(fixture(5));fixed.click();select.click();await tick();const r=reviewSignals.at(-1),s=selectSignals.at(-1);assert.equal(r.aborted,false);assert.equal(s.aborted,false);events['medshield:plan-invalidated']();assert.equal(r.aborted,true);assert.equal(s.aborted,true);assert.equal(exportButton.disabled,true)})
 dispose()
 fs.writeFileSync(path.join(out,'captures.json'),JSON.stringify(captures,null,2)+'\n')
 const files=['frontend/services/api/operating-input-review.ts','frontend/e2e/dated-capacity-contracts.cjs','backend/src/datedPlanReview.ts','backend/src/datedPlanSelection.ts']
 const report={status:'PASS_COMPILED_DATED_CAPACITY_UI_GATEWAY',checked_at:new Date().toISOString(),cases:passed.length,checks:passed,code_sha256:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')])),actual_browser:false,source_inputs_verified:false,full_wp9_complete:false}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cases:report.cases}))
}
main().catch(e=>{console.error(e);process.exitCode=1})
