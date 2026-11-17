// Actual compiled functions with an isolated DOM model; no browser/session access.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict')
const ts=require('../node_modules/typescript'),root=path.resolve(__dirname,'../..')
const output=path.resolve(process.argv[2]||path.join(root,'outputs/commercial_case_review_20261027'))
const inputPath=path.resolve(process.argv[3]||path.join(root,'outputs/product_commercial_review_20261027/live-input.json'))
fs.mkdirSync(output,{recursive:true})
const input=JSON.parse(fs.readFileSync(inputPath,'utf8')),views=JSON.parse(fs.readFileSync(process.argv[4]||output+'/test-views.json','utf8'))
const cache=new Map()
function moduleAt(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file)
 const exports={};cache.set(file,exports)
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
 vm.runInNewContext(code,{exports,require:name=>moduleAt(name.startsWith('@/')?path.join(root,'frontend',name.slice(2)+'.ts'):path.resolve(path.dirname(file),name+'.ts'))},{filename:file})
 return exports
}
const runtime=moduleAt(root+'/frontend/services/api/product-commercial-runtime.ts').PRODUCT_COMMERCIAL_SCRIPT
const recommend=moduleAt(root+'/frontend/services/api/product-commercial-review.ts').productCommercialRecommendation
const prototype={revenue:100,grossProfit:10,marginBasis:100,marginCoveragePct:100,change:null}
for(const [patch,expected] of [[{revenue:null},'confirm_sales_evidence'],[{revenue:0},'review_signed_adjustments'],[{revenue:-1},'review_signed_adjustments'],
 [{grossProfit:-1},'review_negative_profit'],[{change:-1},'investigate_sales_decline'],[{marginCoveragePct:null},'confirm_margin_support'],
 [{grossProfit:null},'confirm_margin_support'],[{marginBasis:null},'confirm_margin_support'],[{marginCoveragePct:99.99},'reconcile_margin_gaps'],[{},'review_service_requirements']]){
 const action=recommend({...prototype,...patch});assert.equal(action.code,expected);assert.equal(action.status,'review_recommendation_not_purchase_instruction')
}
assert.equal(recommend({...prototype,grossProfit:-1,change:-2,marginCoveragePct:50}).code,'review_negative_profit')
assert.equal(recommend({...prototype,change:-2,marginCoveragePct:50}).code,'investigate_sales_decline')
class NodeModel{
 constructor(tag){this.tag=tag;this.children=[];this.textContent='';this.attributes={}}
 get parentElement(){return this.parent}
 get nextElementSibling(){return this.parent?.children[this.parent.children.indexOf(this)+1]}
 append(...nodes){for(const n of nodes){n.remove?.();n.parent=this;this.children.push(n)}}
 replaceChildren(...nodes){for(const n of this.children)n.parent=null;this.children=[];this.textContent='';this.append(...nodes)}
 remove(){if(this.parent){this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null}}
 after(node){node.remove();const at=this.parent.children.indexOf(this);this.parent.children.splice(at+1,0,node);node.parent=this.parent}
 setAttribute(name,value){this.attributes[name]=String(value)}
 add(node){this.append(node);if(node.selected)this.value=node.value}
 focus(){this.focused=true}
 click(){if(this.tag==='a')downloads.push(this.download);return this.onclick?.()}
 createCaption(){const n=new NodeModel('caption');this.append(n);return n}
 createTHead(){const n=new NodeModel('thead');this.append(n);return n}
 createTBody(){const n=new NodeModel('tbody');this.append(n);return n}
 insertRow(){const n=new NodeModel('tr');this.append(n);return n}
 insertCell(){const n=new NodeModel('td');this.append(n);return n}
}
const host=new NodeModel('host'),scope=new NodeModel('scope');host.append(scope)
function find(node,predicate){if(predicate(node))return node;for(const child of node.children){const hit=find(child,predicate);if(hit)return hit}}
const el=id=>find(host,n=>n.id===id),texts=n=>n.textContent+n.children.map(texts).join(' ')
const blobs=[],downloads=[],inspections=[]
const context=vm.createContext({console,document:{createElement:tag=>new NodeModel(tag),getElementById:el},
 Option:class extends NodeModel{constructor(text,value,_default,selected){super('option');this.textContent=text;this.value=value;this.selected=selected}},
 formatCurrency:value=>'₱'+Number(value).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2}),
 descriptivePeriodLabel:()=> 'Isolated selected period',openDiagnosticDrilldown:filter=>inspections.push(filter),
 Blob:class{constructor(parts){this.parts=parts;blobs.push(this)}},URL:{createObjectURL:()=> 'isolated-export',revokeObjectURL(){}},
 setTimeout:fn=>fn(),scopeCard:scope,sourceRows:input.rows,release:input.release})
vm.runInContext(runtime,context)
function render(view,available=true){
 Object.assign(context,{selectedRows:view.scope?input.rows.filter(r=>r.date>=view.scope.start_date&&r.date<=view.scope.end_date):input.rows,
  category:view.category,dateScope:view.scope,available})
 vm.runInContext('renderProductCommercialReview(scopeCard,selectedRows,sourceRows,category,dateScope,release,available)',context)
}
function parseCsv(text){
 const lines=[],row=[];let value='',quoted=false
 for(let i=0;i<text.length;i++){
  const c=text[i]
  if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++}else quoted=!quoted}
  else if(!quoted&&c===','){row.push(value);value=''}
  else if(!quoted&&c==='\r'&&text[i+1]==='\n'){row.push(value);lines.push([...row]);row.length=0;value='';i++}
  else value+=c
 }
 row.push(value);lines.push(row);return lines
}
let combinations=0,csvRows=0,inspectCases=0
for(const view of Object.values(views)){
 render(view)
 for(const focus of ['contributors','declines','negative_profit','margin_gaps']){
  el('productCommercialFocus').value=focus;el('productCommercialFocus').onchange()
  assert.ok(el('productCommercialFocus').focused)
  const queue=view.queues[focus],section=el('productCommercialReview'),model=view.model
  const metrics=find(section,n=>n.tag==='dl').children.map(n=>n.children[1].textContent)
  assert.equal(metrics[0],model.summary.revenue==null?'Unavailable':context.formatCurrency(model.summary.revenue))
  assert.equal(metrics[1],model.summary.grossProfit==null?'Unavailable':context.formatCurrency(model.summary.grossProfit))
  assert.ok(!texts(section).includes('NaN'));assert.ok(!texts(section).includes('Infinity'))
  const table=el('productCommercialReviewTable'),body=find(table,n=>n.tag==='tbody')
  const actions=el('productCommercialActions'),list=find(actions,n=>n.tag==='ol')
  if(queue.length){
   assert.equal(list.children.length,Math.min(3,queue.length))
   queue.slice(0,3).forEach((id,index)=>{const row=model.products.find(r=>r.id===id),action=recommend(row),item=list.children[index];assert.equal(item.children[0].textContent,row.name+' — '+action.action);assert.equal(item.children[2].textContent,'Suggested owner: '+action.owner);assert.equal(item.children[3].textContent,'Next check: '+action.followUp);assert.equal(item.children[4].tag,'details');assert.equal(item.children[4].children[0].textContent,'Sales evidence');assert.equal(item.children[4].children[1].textContent,action.reason)})
  }else assert.ok(texts(actions).includes('No labels meet this focus'))
  assert.equal(body.children.length,queue.length?Math.min(15,queue.length):1)
  const exportButton=find(section,n=>n.textContent==='Export review rows')
  assert.equal(exportButton.disabled,!queue.length)
  if(queue.length){
   const product=model.products.find(r=>r.id===queue[0]);assert.equal(body.children[0].children[0].textContent,product.name)
   const button=find(body.children[0],n=>n.tag==='button');button.click();assert.equal(inspections.at(-1).product_id,product.id);inspectCases++
   exportButton.click();assert.equal(downloads.at(-1),'medshield-commercial-review.csv')
   const csv=parseCsv(blobs.at(-1).parts.join('').replace(/^\uFEFF/,''))
   assert.equal(csv.length,queue.length+1)
   const columns=Object.fromEntries(csv[0].map((name,i)=>[name,i]))
   for(let i=0;i<queue.length;i++){
    const row=model.products.find(r=>r.id===queue[i]),cells=csv[i+1]
    assert.equal(cells.length,csv[0].length)
    assert.equal(cells[columns['Reporting ID']],/^\s*[=+@-]/.test(row.id)?"'"+row.id:row.id)
    for(const [column,field] of [['Net sales PHP','revenue'],['Supported gross profit PHP','grossProfit'],['Matching margin revenue PHP','marginBasis'],['Margin percent','marginPct'],['Recorded change PHP','change'],['Growth percent','growthPct'],['Net sales without margin support PHP','netWithoutMarginSupport']])
     assert.equal(cells[columns[column]],row[field]==null?'':String(row[field]))
    assert.equal(cells[columns['Dataset ID']],input.release.dataset_id)
    assert.equal(cells[columns['Source status']],row.sourceStatus)
    assert.equal(cells[columns['Source table']],input.release.source_table)
    assert.equal(cells[columns['Contracts excluded']],'true');assert.equal(cells[columns['Publication approved']],'false')
    const action=recommend(row)
    for(const [column,key] of [['Recommendation code','code'],['Recommended action','action'],['Recommendation reason','reason'],['Suggested owner','owner'],['Follow-up check','followUp'],['Recommendation status','status'],['Recommendation policy','policy']])assert.equal(cells[columns[column]],action[key])
   }
   fs.writeFileSync(path.join(output,'export-'+combinations+'.csv'),blobs.at(-1).parts.join(''))
   csvRows+=queue.length
  }
  combinations++
 }
}
render(Object.values(views)[0],false)
assert.ok(!el('productCommercialReviewTable'));assert.ok(!el('productCommercialActions'));assert.ok(texts(el('productCommercialReview')).includes('loading or unavailable'))
render(Object.values(views)[0],true)
assert.ok(el('productCommercialReviewTable'))
// Literal label rendering and spreadsheet-formula protection are separate from live numerical checks.
context.sourceRows=[{product:'=2+2',date:'2026-01-01',period:'2026-01',revenue:1,positive_sales:1,returns_value:0,row_count:1}]
context.selectedRows=context.sourceRows;context.category='All';context.dateScope=null;context.available=true
vm.runInContext("productCommercialFocus='contributors';renderProductCommercialReview(scopeCard,selectedRows,sourceRows,category,dateScope,release,available)",context)
find(el('productCommercialReview'),n=>n.textContent==='Export review rows').click()
assert.equal(parseCsv(blobs.at(-1).parts.join('').replace(/^\uFEFF/,''))[1][0],"'=2+2")
// Integration: compile the actual engine and validate the combined execution script.
const engine=moduleAt(root+'/frontend/services/api/dashboard-engine.ts')
new Function(engine.getExecutableDashboardScript())
const script=engine.getExecutableDashboardScript()
assert.ok(script.includes('renderProductCommercialReview(tableCard || analyticalLayout, rows, source, productCategory'))
assert.equal(el('productCommercialDetails').tag,'details')
assert.ok(script.includes("table.id !== 'productCommercialReviewTable'"))
const report={status:'PASS_PRODUCT_COMMERCIAL_COMPILED_DOM_TABLE_CSV',scope_focus_combinations:combinations,csv_rows:csvRows,
 inspect_cases:inspectCases,policy_boundary_cases:12,leading_actions_match:true,action_exports_match:true,unavailable_clears_stale_values:true,recovery:true,full_engine_syntax:true,warehouse_writes:0,
 note:'Compiled isolated DOM model; signed-in visual/responsive review not established.'}
fs.writeFileSync(output+'/compiled-ui-verification.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report))
