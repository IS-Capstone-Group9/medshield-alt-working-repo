const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('../node_modules/typescript')
const root=path.resolve(__dirname,'../..'),api={}
const labels={};new Function('exports',ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api/product-chart-view.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(labels)
new Function('exports','require',ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api/prescriptive-planning-runtime.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(api,()=>labels)
const ast=ts.createSourceFile('runtime.js',api.PLANNING_SCRIPT,ts.ScriptTarget.Latest,true)
const render=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='setPlanningData').getText(ast)
class Element{
 constructor(id){this.id=id;this.children=[];this.value='';this.disabled=false;this.classList={remove(){}}}
 replaceChildren(...nodes){this.children=nodes}
 set value(v){this.selected=this.id==='planTerritory'&&!this.children.some(o=>o.value===v)?'':v}get value(){return this.selected}
}
const nodes={},node=id=>nodes[id]??=new Element(id)
const scope={document:{getElementById:node},Chart:class{static getChart(){return null}},Option:class{constructor(text,value){this.text=text;this.value=value;this.disabled=false}},clearPlanningResult(){node('planExport').disabled=true},window:{innerWidth:1200},planningChartRows(){}}
vm.createContext(scope);vm.runInContext('let planningData=null;'+render,scope)
let cases=0
for(const [territory,territories,unavailable] of [['Quezon',[],true],['all',[],false],['Quezon',['Quezon','Other'],false],['Unlisted',['Quezon'],true]]){
 scope.payload={products:[],source:{checksum:'synthetic-renderer-only',excluded:{}},scope:{sector:'All',territory},territories,period_start:null,period_end:null}
 vm.runInContext('setPlanningData(payload)',scope)
 assert.equal(node('planTerritory').value,territory,'Requested scope must remain selected')
 const choice=node('planTerritory').children.find(o=>o.value===territory);assert.ok(choice)
 assert.equal(choice.disabled,unavailable)
 if(unavailable)assert.match(choice.text,/unavailable in current source/)
 assert.ok(node('planScope').textContent.includes(territory));assert.equal(node('planSolve').disabled,true);assert.equal(node('planExport').disabled,true);assert.equal(node('planAcknowledged').checked,false);cases++
}
console.log(JSON.stringify({status:'PASS_COMPILED_PLANNING_SCOPE_RECOVERY',cases,unavailable_scope_preserved:true,no_automatic_all_scope:true,source:'synthetic contract fixture; actual renderer'}))
