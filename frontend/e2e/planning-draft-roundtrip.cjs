// Isolated DOM event model, not a signed-in browser walkthrough.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('../node_modules/typescript')
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.argv[2]||path.join(root,'outputs/weighted_allocation_20261029'))
const legacy=JSON.parse(fs.readFileSync(path.join(root,'outputs/so5_workflow_review_20261029/full-draft.json'),'utf8'))
const fields=['demand','stock','reserve','pack','pack_cost','max_packs','annual_demand','order_cost','holding_cost','lead_days','on_order','backorders','revenue_score','growth_score','outbreak_score','shelf_life_days','policy_input_reference','unit_label']
class Node{constructor(){this.listeners={};this.value='';this.checked=true;this.children={};this.style={}}setAttribute(){}querySelector(key){return this.children[key]??=new Node()}addEventListener(name,fn){this.listeners[name]=fn}click(){this.listeners.click?.()}remove(){}}
const nodes={},inputs=legacy.request.items.map(row=>Object.fromEntries(fields.map(f=>[f,{value:row[f]??''}])))
for(const id of ['planHorizon','planBudget','planMinimum','planPurchaseCapacity','planCapacityUnit','planAllocationMethod','planRevenueWeight','planGrowthWeight','planOutbreakWeight','planAcknowledged'])nodes['#'+id]=new Node()
nodes['#planHorizon'].value=legacy.request.horizon;nodes['#planBudget'].value=legacy.request.budget;nodes['#planMinimum'].value=legacy.request.minimum_pct
const current=()=>({...legacy.request,acknowledged:false,horizon:nodes['#planHorizon'].value,budget:nodes['#planBudget'].value,minimum_pct:nodes['#planMinimum'].value,
 allocation_method:nodes['#planAllocationMethod'].value,revenue_weight:nodes['#planRevenueWeight'].value,growth_weight:nodes['#planGrowthWeight'].value,outbreak_weight:nodes['#planOutbreakWeight'].value,
 items:legacy.request.items.map((row,i)=>({product:row.product,...Object.fromEntries(fields.map(f=>[f,inputs[i][f].value]))}))})
nodes['#planAllocationMethod'].value='weighted';nodes['#planRevenueWeight'].value='50';nodes['#planGrowthWeight'].value='50';nodes['#planOutbreakWeight'].value='0'
inputs[0].revenue_score.value='100';inputs[0].growth_score.value='0';inputs[0].outbreak_score.value=''
inputs[0].shelf_life_days.value='0';inputs[0].policy_input_reference.value='Synthetic input reference'
let panel,invalidations=0;const blobs=[]
const table={closest:()=>({after:p=>panel=p})}
const host={querySelector:selector=>{if(selector==='#planInputs')return table;if(nodes[selector])return nodes[selector];const m=/data-plan-index="(\d+)".*data-plan-field="([^"]+)"/.exec(selector);return m?inputs[Number(m[1])][m[2]]:null}}
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api/planning-drafts.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,
 {exports:api,window:{getPlanningRequest:current,invalidatePlan:()=>invalidations++},document:{createElement:()=>new Node()},Blob:class{constructor(parts){blobs.push(parts.join(''))}},URL:{createObjectURL:()=>'',revokeObjectURL(){}},setTimeout:fn=>fn()})
async function main(){
 const stop=api.installPlanningDrafts(host),file=panel.querySelector('[data-draft-file]')
 panel.querySelector('[data-draft-save]').click();const saved=JSON.parse(blobs.at(-1));assert.equal(saved.request.allocation_method,'weighted');assert.equal(saved.request.outbreak_weight,'0');assert.equal(saved.request.items[0].outbreak_score,'')
 const load=async draft=>{file.files=[{size:JSON.stringify(draft).length,text:async()=>JSON.stringify(draft)}];file.listeners.change();await new Promise(resolve=>setImmediate(resolve))}
 await load(legacy);assert.equal(nodes['#planAllocationMethod'].value,'balanced');assert.equal(nodes['#planRevenueWeight'].value,'');assert.equal(inputs[0].revenue_score.value,'');assert.equal(inputs[0].outbreak_score.value,'');assert.equal(nodes['#planAcknowledged'].checked,false)
 assert.equal(inputs[0].shelf_life_days.value,'');assert.equal(inputs[0].policy_input_reference.value,'')
 await load(saved);assert.equal(nodes['#planAllocationMethod'].value,'weighted');assert.equal(nodes['#planOutbreakWeight'].value,'0');assert.equal(inputs[0].revenue_score.value,'100');assert.equal(inputs[0].growth_score.value,'0');assert.equal(inputs[0].outbreak_score.value,'')
 assert.equal(inputs[0].shelf_life_days.value,'0');assert.equal(inputs[0].policy_input_reference.value,'Synthetic input reference')
 const before=JSON.stringify(current()),bad=structuredClone(saved);bad.request.checksum='different';await load(bad);assert.equal(JSON.stringify(current()),before);assert.equal(invalidations,2)
 stop();const report={status:'PASS_ISOLATED_WEIGHTED_DRAFT_ROUNDTRIP',weighted_save_load:true,legacy_load_clears_new_fields:true,blank_risk_not_zero:true,invalid_source_preserves_inputs:true,acknowledgment_cleared:true,actual_browser:false}
 fs.writeFileSync(path.join(out,'draft-roundtrip.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
}
main().catch(error=>{console.error(error);process.exitCode=1})
