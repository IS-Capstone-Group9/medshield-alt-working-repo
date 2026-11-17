// Compiled sandbox verification; no browser or source substitution.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('../node_modules/typescript')
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.argv[2]||path.join(root,'outputs/so4_baseline_review_20261029'))
fs.mkdirSync(out,{recursive:true})
const cases=JSON.parse(fs.readFileSync(process.argv[3]||path.join(out,'scenarios.json'),'utf8'))
if(process.argv[4]){const stress=JSON.parse(fs.readFileSync(process.argv[4],'utf8'));cases.push({name:'bounded-stress',request:stress.request,result:stress.result})}
const compile=(file,scope)=>vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api',file+'.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,scope)
const labels={};compile('product-chart-view',{exports:labels})
const api={};compile('prescriptive-planning-runtime',{exports:api,require:()=>labels})
const nodes={},blobs=[],charts=new Map()
for(const [,id]of api.PLANNING_MARKUP.matchAll(/id="([^"]+)"/g)){
 let text='',html='';nodes[id]={disabled:false,hidden:false,checked:true,closest:()=>({style:{setProperty(){}}})}
 Object.defineProperties(nodes[id],{textContent:{get:()=>text,set:value=>{text=value;html=''}},innerHTML:{get:()=>html,set:value=>{html=value;text=''}}})
}
class Chart{constructor(node,config){this.config=config;charts.set(node,this)}destroy(){for(const [n,c]of charts)if(c===this)charts.delete(n)}static getChart(node){return charts.get(node)}}
const scope={document:{getElementById:id=>nodes[id],createElement:()=>({click(){}})},window:{innerWidth:1309,dispatchEvent(){}},Chart,CustomEvent:class{},Blob:class{constructor(parts){blobs.push(parts.join(''))}},URL:{createObjectURL:()=>'',revokeObjectURL(){}},setTimeout(){}}
vm.createContext(scope);vm.runInContext(api.PLANNING_SCRIPT,scope)
let solved=0
for(const entry of cases){
 scope.result=entry.result;vm.runInContext('setPlanningResult(result)',scope)
 if(entry.result.status!=='scenario_allocation'){assert.equal(nodes.planExport.disabled,true);assert.equal(nodes.planCalculatedResults.hidden,true);assert.equal(nodes.planBaselineTable.textContent,'');continue}
 solved++
 assert.equal(nodes.planExport.disabled,false);assert.equal(nodes.planCalculatedResults.hidden,false)
 assert.match(nodes.planBaselineSummary.textContent,/Compared with no new purchases/)
 for(const row of entry.result.rows){assert.ok(nodes.planBaselineTable.innerHTML.includes(row.product));for(const reason of row.unmet_reasons)assert.ok(nodes.planBaselineTable.innerHTML.includes(reason))}
 for(const row of entry.result.rows){const p=row.inventory_policy;if(p){assert.ok(nodes.planPolicyTable.innerHTML.includes(p.recommendation));assert.ok(nodes.planPolicyTable.innerHTML.includes(String(p.reorder_point_units)))}else assert.ok(nodes.planPolicyTable.innerHTML.includes('Optional policy inputs not entered'))}
 for(const row of entry.result.rows){const f=row.inventory_policy?.feasibility;if(f){assert.ok(nodes.planFeasibilityTable.innerHTML.includes(f.lead_review));assert.ok(nodes.planFeasibilityTable.innerHTML.includes(row.expiry_screen.review))}}
 assert.ok(nodes.planFeasibilitySummary.textContent.includes(entry.result.rows.filter(row=>row.expiry_screen?.status==='exceeds_gross_capacity').length+' purchase lots exceed'))
 assert.equal(charts.get(nodes.planFulfillmentChart).config.data.datasets.length,2)
 assert.equal(nodes.kpiPlanExpiryRate.textContent,'Unavailable')
 if(entry.result.optimization){assert.match(nodes.planOptimizationSummary.textContent,entry.result.optimization.proof_status==='optimal'?/Optimal for the entered/:/optimality not proved/);assert.ok(nodes.planResults.innerHTML.includes('Entered priority'))}
 if(entry.result.optimization?.absolute_gap_pp>0&&entry.result.optimization.absolute_gap_pp<.01)assert.ok(nodes.planOptimizationSummary.textContent.includes('<0.01'))
 vm.runInContext('exportPlanningCSV()',scope);fs.writeFileSync(path.join(out,'compiled-'+entry.name+'.csv'),blobs.at(-1))
}
const legacy=structuredClone(cases[0].result);delete legacy.baseline_mean_fulfillment_pct;scope.result=legacy;vm.runInContext('setPlanningResult(result)',scope);assert.match(nodes.planBaselineSummary.textContent,/unavailable/)
scope.result=cases[0].result;vm.runInContext('setPlanningResult(result); invalidatePlan(true)',scope)
assert.equal(nodes.planAcknowledged.checked,false);assert.equal(nodes.planExport.disabled,true);assert.equal(nodes.planCalculatedResults.hidden,true);assert.equal(nodes.planBaselineSummary.textContent,'');assert.equal(nodes.planBaselineTable.textContent,'');assert.equal(nodes.planPolicyTable.innerHTML,'');assert.equal(charts.has(nodes.planFulfillmentChart),false)
assert.equal(nodes.planFeasibilityTable.innerHTML,'')
assert.equal(nodes.planFeasibilitySummary.textContent,'')
vm.runInContext("setPlanningResult(null,'Unavailable')",scope);assert.equal(nodes.planResultStatus.textContent,'Unavailable')
const weightedCase=cases.find(entry=>entry.result.optimization)
if(weightedCase){
 scope.result=structuredClone(weightedCase.result);scope.result.optimization.proof_status='feasible_bound';scope.result.optimization.upper_bound_pct=100;scope.result.optimization.absolute_gap_pp=100-scope.result.optimization.weighted_fulfillment_pct
 vm.runInContext('setPlanningResult(result)',scope);assert.match(nodes.planOptimizationSummary.textContent,/optimality not proved/)
 vm.runInContext('invalidatePlan(true)',scope);assert.equal(nodes.planOptimizationSummary.textContent,'')
}
const policyCase=cases.find(entry=>entry.request?.items.some(row=>row.annual_demand!==undefined))
if(policyCase){
 const request=policyCase.request;scope.payload={scope:request.scope,source:{checksum:request.checksum},products:request.items.map(row=>({product:row.product}))}
 nodes.planHorizon.value=String(request.horizon);nodes.planBudget.value=String(request.budget);nodes.planMinimum.value=String(request.minimum_pct);nodes.planAcknowledged.checked=true
 nodes.planAllocationMethod.value=request.allocation_method??'balanced';nodes.planRevenueWeight.value=String(request.revenue_weight??'');nodes.planGrowthWeight.value=String(request.growth_weight??'');nodes.planOutbreakWeight.value=String(request.outbreak_weight??'')
 scope.document.querySelectorAll=selector=>{const i=Number(/data-plan-index="(\d+)"/.exec(selector)[1]);return Object.entries(request.items[i]).filter(([field])=>field!=='product').map(([field,value])=>({dataset:{planField:field},value:String(value)}))}
 vm.runInContext('planningData=payload;capturedRequest=getPlanningRequest()',scope)
 assert.equal(scope.capturedRequest.items[0].on_order,'0');assert.equal(scope.capturedRequest.items[0].backorders,'0');assert.equal(scope.capturedRequest.items[0].annual_demand,'365')
 if(request.allocation_method==='weighted'){assert.equal(scope.capturedRequest.revenue_weight,'50');assert.equal(scope.capturedRequest.outbreak_weight,'0');assert.equal(scope.capturedRequest.items[0].outbreak_score,'')}
}
const report={status:'PASS_COMPILED_PLANNING_BASELINE',cases:cases.length,solved_exports:solved,legacy_baseline_unavailable:true,input_invalidation_clears_results:true,infeasible_clears_results:true,source_error_clears_results:true,expiry_unavailable:true,visual_scope:'isolated model; live evidence separate'}
fs.writeFileSync(path.join(out,'frontend-check.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
