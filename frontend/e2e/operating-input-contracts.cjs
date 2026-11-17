const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('../node_modules/typescript')
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.argv[2]||path.join(root,'outputs/operating_snapshot_review_20261029'));fs.mkdirSync(out,{recursive:true})
class Node{constructor(){this.children={};this.nodes=[];this.listeners={};this.style={};this.disabled=false;this.textContent='';this.value=''}setAttribute(){}querySelector(s){return this.children[s]??=new Node()}closest(){return{after:p=>panel=p}}addEventListener(n,f){this.listeners[n]=f}replaceChildren(){this.nodes=[]}append(...nodes){this.nodes.push(...nodes)}click(){this.listeners.click?.()}remove(){this.removed=true}}
const nodes=new Node(),events={},blobs=[],api={};let panel,sourceDown=false,current={checksum:'test-source',scope:{sector:'All',territory:'all'},items:[{product:'Synthetic A',stock:'5',reserve:'1'}]}
const scope={AbortController,exports:api,document:{createElement:()=>new Node()},window:{getPlanningRequest:()=>{if(sourceDown)throw Error('unavailable');return current},addEventListener:(n,f)=>events[n]=f,removeEventListener:n=>delete events[n]},Blob:class{constructor(parts){blobs.push(parts.join(''))}},URL:{createObjectURL:()=>'',revokeObjectURL(){}},setTimeout:fn=>fn(),Intl,Date}
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api/operating-input-review.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,scope)
const snapshot={schema_version:1,classification:'entered_unverified_operating_snapshot',as_of:'2026-10-29',input_reference:'Synthetic QA ledger',checksum:'test-source',scope:current.scope,
 products:[{product:'Synthetic A',unit_label:'entered units',stock_total:12,protected_reserve:1,batches:[
 {batch_id:'released',units:5,received_on:'2026-10-01',expires_on:'2026-11-01',disposition:'released'},
 {batch_id:'expired',units:4,received_on:'2026-10-01',expires_on:'2026-10-29',disposition:'released'},
 {batch_id:'held',units:3,received_on:'2026-10-01',expires_on:'2026-12-01',disposition:'quarantined'}],
 receipts:[{receipt_id:'R1',units:7,expected_on:'2026-10-30',expires_on:'2027-01-01'}]}]}
const review=api.reviewOperatingInputs(snapshot,current,'2026-10-29'),r=review.products[0]
assert.equal(r.released_unexpired_units,5);assert.equal(r.expired_as_of_units,4);assert.equal(r.held_unexpired_units,3);assert.equal(r.available_after_reserve_units,4);assert.equal(r.entered_expected_receipt_units,7);assert.equal(r.mismatches.length,0)
assert.equal(review.planning_values_changed,false);assert.equal(review.source_documents_verified,false);assert.equal(review.procurement_execution_approved,false)
const mutations=[d=>d.schema_version=2,d=>d.classification='approved',d=>d.as_of='2026-10-30',d=>d.as_of='2026-02-30',d=>d.input_reference='',d=>d.checksum='other',d=>d.scope={sector:'other',territory:'all'},d=>d.products.push(d.products[0]),d=>d.products[0].product='other',d=>d.products[0].unit_label='',d=>d.products[0].stock_total=11,d=>d.products[0].protected_reserve=6,d=>d.products[0].batches[0].units=false,d=>d.products[0].batches[0].units=1.5,d=>d.products[0].batches[0].received_on='2026-10-30',d=>d.products[0].batches[0].expires_on='2026-10-01',d=>d.products[0].batches[0].disposition='unknown',d=>d.products[0].batches[1].batch_id='released',d=>d.products[0].receipts[0].expected_on='2026-10-28',d=>d.products[0].receipts[0].expires_on='2026-10-30',d=>d.products[0].receipts[0].units=0,d=>d.products[0].receipts.push(d.products[0].receipts[0]),d=>d.products[0].batches=Array(101).fill(d.products[0].batches[0]),d=>d.products[0].stock_total=null]
for(const mutate of mutations){const bad=structuredClone(snapshot);mutate(bad);assert.throws(()=>api.reviewOperatingInputs(bad,current,'2026-10-29'))}
const zero=structuredClone(snapshot);Object.assign(zero.products[0],{stock_total:0,protected_reserve:0,batches:[],receipts:[]});assert.equal(api.reviewOperatingInputs(zero,current,'2026-10-29').products[0].released_unexpired_units,0)
const older=structuredClone(snapshot);older.as_of='2026-10-28';assert.equal(api.reviewOperatingInputs(older,current,'2026-10-29').snapshot_age_days,1)
const mismatch=api.reviewOperatingInputs(snapshot,{...current,items:[{product:'Synthetic A',stock:'12',reserve:'2'}]},'2026-10-29');assert.equal(mismatch.products[0].mismatches.length,2)
const template=api.operatingTemplate(current,'2026-10-29');assert.equal(template.products[0].stock_total,null);assert.throws(()=>api.reviewOperatingInputs(template,current,'2026-10-29'))
const grid=[]
for(const released of [0,1,50])for(const held of [0,2,7])for(const expired of [0,3])for(const inbound of [0,11]){
 const input=structuredClone(snapshot),p=input.products[0];p.batches[0].units=released;p.batches[1].units=expired;p.batches[2].units=held;p.stock_total=released+held+expired;p.protected_reserve=Math.min(1,released);p.receipts=inbound?[{...p.receipts[0],units:inbound}]:[]
 const control={...current,items:[{product:'Synthetic A',stock:String(released),reserve:String(Math.min(1,released))}]}
 grid.push({input,review:api.reviewOperatingInputs(input,control,'2026-10-29')})
}
async function main(){
 let failServer=false,selectProof='optimal';const requests=[]
 const dispose=api.installOperatingInputReview(nodes,async body=>{requests.push(body);if(failServer)throw Error('Server unavailable');return {status:'DATED_FIXED_PLAN_FEASIBLE',checksum:'test-source',spend_php:'10.00',budget_php:'20.00',conflicts:[],objective_optimized:false,procurement_execution_approved:false,source_inputs_verified:false,expiry_outcome_measured:false}},async body=>{requests.push(body);if(failServer)throw Error('Selection unavailable');return {status:'DATED_SELECTION_RESULT',checksum:'test-source',proof_status:selectProof,spend_php:'10.00',budget_php:'20.00',weighted_fulfillment_pct:50,absolute_gap_pp:selectProof==='optimal'?0:.001,rows:[{product:'Synthetic A',proposed_packs:2}],conflicts:[],procurement_execution_approved:false,source_inputs_verified:false,expiry_outcome_measured:false}}),el=s=>panel.querySelector(s),file=el('[data-supply-file]'),exportButton=el('[data-supply-export]')
 const importFile=async(data,size=100)=>{file.files=[{size,text:async()=>JSON.stringify(data)}];file.listeners.change();await new Promise(resolve=>setImmediate(resolve))}
 assert.equal(exportButton.disabled,true)
 el('[data-supply-template]').click();assert.equal(JSON.parse(blobs.at(-1)).products[0].stock_total,null)
 const today=api.manilaToday(),dated=structuredClone(snapshot);dated.as_of=today;dated.products[0].batches.forEach(b=>{if(b.expires_on<today)b.expires_on=today})
 // Fixed test date is passed for arithmetic; UI snapshots are re-dated to the actual Manila day.
 dated.products[0].receipts[0].expected_on=today;dated.products[0].receipts[0].expires_on='2099-01-01'
 dated.products[0].batches[0].expires_on='2099-01-01';dated.products[0].batches[2].expires_on='2099-01-01'
 dated.products[0].horizon_end=today;dated.products[0].demand_calendar=[{date:today,units:8}]
 dated.products[0].proposed_receipts=[{receipt_id:'candidate',units:2,expected_on:today,expires_on:'2099-01-01'}]
 await importFile(dated);assert.equal(exportButton.disabled,false);assert.equal(el('[data-supply-findings]').nodes.length,1)
 exportButton.click();assert.equal(JSON.parse(blobs.at(-1)).source_documents_verified,false);assert.equal(JSON.parse(blobs.at(-1)).products[0].timeline.fulfilled_units,8)
 assert.equal(JSON.parse(blobs.at(-1)).products[0].purchase_comparison.proposed_lot_results[0].units,2)
 const allText=node=>node.textContent+' '+node.nodes.map(allText).join(' ')
 assert.ok(allText(el('[data-supply-findings]')).includes('individual effects must not be summed'))
 const serverButton=panel.nodes.find(node=>node.textContent==='Check dated plan against budget and limits')
 assert.equal(serverButton.disabled,false);serverButton.click();await new Promise(resolve=>setImmediate(resolve));exportButton.click()
 assert.equal(requests[0].acknowledged,true);assert.equal(JSON.parse(blobs.at(-1)).server_dated_plan_review.status,'DATED_FIXED_PLAN_FEASIBLE')
 failServer=true;serverButton.click();await new Promise(resolve=>setImmediate(resolve));exportButton.click();assert.equal(JSON.parse(blobs.at(-1)).server_dated_plan_review,null)
 assert.ok(allText(panel).includes('No prior server result substituted'));failServer=false
 const selectButton=panel.nodes.find(node=>node.textContent==='Select dated purchase quantities')
 assert.equal(selectButton.disabled,false);selectButton.click();await new Promise(resolve=>setImmediate(resolve));exportButton.click()
 assert.equal(JSON.parse(blobs.at(-1)).server_dated_purchase_selection.proof_status,'optimal');assert.ok(allText(panel).includes('Optimal within the entered quantity domain'))
 selectProof='feasible_bound';selectButton.click();await new Promise(resolve=>setImmediate(resolve));assert.ok(allText(panel).includes('optimality not proved'));assert.ok(allText(panel).includes('<0.01'))
 failServer=true;selectButton.click();await new Promise(resolve=>setImmediate(resolve));exportButton.click();assert.equal(JSON.parse(blobs.at(-1)).server_dated_purchase_selection,null);failServer=false
 await importFile({...dated,checksum:'wrong'});assert.equal(exportButton.disabled,true);assert.equal(el('[data-supply-findings]').nodes.length,0)
 await importFile(dated,250001);assert.equal(exportButton.disabled,true)
 await importFile(dated);events['medshield:plan-invalidated']();assert.equal(exportButton.disabled,true)
 await importFile(dated);current={...current,checksum:'changed'};exportButton.click();assert.equal(exportButton.disabled,true);current={...current,checksum:'test-source'}
 await importFile(dated);sourceDown=true;exportButton.click();assert.equal(exportButton.disabled,true);sourceDown=false
 let resolve;file.files=[{size:100,text:()=>new Promise(done=>resolve=done)}];file.listeners.change();dispose();resolve(JSON.stringify(dated));await new Promise(done=>setImmediate(done));assert.equal(panel.removed,true);assert.equal(exportButton.disabled,true)
 fs.writeFileSync(path.join(out,'synthetic-snapshot.json'),JSON.stringify(snapshot,null,2)+'\n');fs.writeFileSync(path.join(out,'synthetic-review.json'),JSON.stringify(review,null,2)+'\n')
 fs.writeFileSync(path.join(out,'grid.json'),JSON.stringify(grid,null,2)+'\n')
 const report={status:'PASS_OPERATING_SNAPSHOT_MODEL_AND_ISOLATED_UI',invalid_cases_rejected:mutations.length,zero_unknown_date_and_balance_cases:true,template_import_export:true,failure_clears_stale_values:true,scope_source_invalidation:true,disposal_race:true,inputs_not_changed:true,actual_browser:false,source_documents_verified:false}
 fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
}
main().catch(e=>{console.error(e);process.exitCode=1})
