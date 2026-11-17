// Actual compiled shortlist renderer; isolated DOM, no browser or analytical fallback.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('../node_modules/typescript')
const root=path.resolve(__dirname,'../..'),api={},labels={}
const compile=(name,scope)=>vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope)
compile('product-chart-view',{exports:labels})
compile('prescriptive-planning-runtime',{exports:api,require:()=>labels})
const ast=ts.createSourceFile('runtime.js',api.PLANNING_SCRIPT,ts.ScriptTarget.Latest,true)
const render=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='setPlanningData').getText(ast)
const nodes={}
function node(id){return nodes[id]??=new class{
  constructor(){this.html='';this.text='';this.disabled=false;this.checked=true;this.classList={remove(){}}}
  set textContent(value){this.text=value;this.html=''}get textContent(){return this.text}
  set innerHTML(value){this.html=value;this.text=''}get innerHTML(){return this.html}
  replaceChildren(){}
}()}
let cleared=0
const scope={document:{getElementById:node},Chart:class{static getChart(){return null}},Option:class{},planningChartRows(){},clearPlanningResult(){cleared++;node('planExport').disabled=true},window:{innerWidth:1200}}
vm.createContext(scope);vm.runInContext('let planningData=null;'+render,scope)
const source=JSON.parse(fs.readFileSync(path.join(root,'outputs/so4_baseline_review_20261029/source.json'),'utf8'))
scope.payload=source;vm.runInContext('setPlanningData(payload)',scope)
const initial=node('planInputs').innerHTML
assert.ok(initial.includes('data-plan-field="demand"'))
assert.match(node('planScope').textContent,/Scenario inputs are separate/)
assert.equal(node('planAcknowledged').checked,false)
const changed=structuredClone(source)
changed.research_forecast={prediction:999999,activation_allowed:false}
changed.products=changed.products.map(p=>({...p,demand:999999,stock:999999,forecast:999999,pack:999999,pack_cost:999999}))
scope.payload=changed;vm.runInContext('setPlanningData(payload)',scope)
assert.equal(node('planInputs').innerHTML,initial,'Unrequested forecast/input fields must not prefill scenario assumptions')
const inputs=[...initial.matchAll(/<input\b[^>]*data-plan-field="[^"]+"[^>]*>/g)]
assert.ok(inputs.length>=source.products.length*6)
for(const [html]of inputs)assert.ok(!/\bvalue=/.test(html),'Scenario fields must start blank')
assert.equal(node('planExport').disabled,true)
vm.runInContext('setPlanningData(null,"Warehouse unavailable")',scope)
assert.equal(node('planInputs').innerHTML,'');assert.equal(node('planSolve').disabled,true)
assert.equal(node('planExport').disabled,true);assert.equal(node('planSourceStatus').textContent,'Warehouse unavailable')
assert.equal(cleared,3)
console.log(JSON.stringify({status:'PASS_PLANNING_RESEARCH_BOUNDARY',products:source.products.length,blank_inputs:inputs.length,forecast_fields_ignored:true,replacement_clears:true,source_failure_clears:true}))
