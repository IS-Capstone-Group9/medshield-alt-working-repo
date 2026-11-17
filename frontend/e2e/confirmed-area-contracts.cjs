// Compiled isolated DOM/model verification; not a substitute for browser QA.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('../node_modules/typescript')
const root=path.resolve(__dirname,'../..'),out=process.env.MEDSHIELD_AREA_TEST_OUTPUT?path.resolve(process.env.MEDSHIELD_AREA_TEST_OUTPUT):path.join(root,'outputs/so2_area_completion_20261029')
fs.mkdirSync(out,{recursive:true})
const original=JSON.parse(fs.readFileSync(path.join(root,'outputs/so2_area_completion_20261029/actual-response.json'),'utf8')),plain=x=>JSON.parse(JSON.stringify(x))
const compile=(name,scope)=>vm.runInContext(ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api',name+'.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,vm.createContext(scope))
const regional={};compile('regional-sales-model',{exports:regional})
const model={};compile('area-priority-model',{exports:model,require:()=>regional})
let panel,response=original,offline=false,hold=null;const blobs=[],downloads=[]
class NodeModel{
 constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.textContent='';this.value='';this.disabled=false}
 set innerHTML(text){this.html=text;this.ids={};for(const match of text.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"[^>]*>/g)){const node=this.ids[match[2]]=new NodeModel(match[1]);node.disabled=match[0].includes(' disabled');if(match[2]==='areaReviewRegion')node.value='ALL'}}
 querySelector(selector){return this.ids?.[selector.slice(1)]??null} append(...nodes){this.children.push(...nodes)}setAttribute(){}
 add(node){this.children.push(node);if(this.children.length===1)this.value=node.value}replaceChildren(){this.children=[];this.textContent=''}
 addEventListener(name,fn){this.listeners[name]=fn}removeEventListener(name){delete this.listeners[name]}
 createTHead(){const row=new NodeModel('thead');this.append(row);return row}createTBody(){const row=new NodeModel('tbody');this.append(row);return row}
 insertRow(){const row=new NodeModel('tr');this.append(row);return row}insertCell(){const row=new NodeModel('td');this.append(row);return row}
 click(){if(this.tag==='a')downloads.push(this.download);return this.listeners.click?.()}remove(){this.removed=true}
}
const legacy={hidden:false,style:{getPropertyValue:()=>'',getPropertyPriority:()=>'',setProperty(){},removeProperty(){}}}
const host={querySelector:()=>legacy,prepend:value=>{panel=value},classList:{contains:()=>false}},events={}
const rootModel={querySelector:()=>host,addEventListener:(name,fn)=>events[name]=fn,removeEventListener:name=>delete events[name]}
const api={};compile('area-priority-panel',{exports:api,require:name=>name==='./area-priority-model'?model:name==='./regional-sales-model'?regional:{getJson:async endpoint=>{assert.equal(endpoint,'/api/sales/confirmed-area-priority');if(hold)await hold;if(offline)throw Error('offline');return response}},
 document:{createElement:tag=>new NodeModel(tag)},Option:class{constructor(text,value){this.textContent=text;this.value=value}},Blob:class{constructor(parts){this.parts=parts;blobs.push(this)}},URL:{createObjectURL:()=> 'isolated-export',revokeObjectURL(){}},setTimeout:()=>0})
const el=id=>panel.querySelector('#areaReview'+id),settle=()=>new Promise(resolve=>setImmediate(resolve)),rows=table=>table.children[1].children.map(row=>row.children.map(cell=>cell.textContent))
const money=value=>value===null?'Unavailable':'₱'+Number(value).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})
async function main(){
 assert.equal(model.validAreaPriority(original),true)
 const mutations=[d=>d.forecast_approved=true,d=>d.account_identity_available=true,d=>d.area_months[0].region='CALABARZON',d=>d.area_months[0].net_sales_php='1.000000',d=>d.area_months.push(d.area_months[0]),d=>d.area_months[0].margin_eligible_records=9999]
 for(const mutate of mutations){const bad=structuredClone(original);mutate(bad);assert.equal(model.validAreaPriority(bad),false)}
 const dispose=api.installAreaPriorityPanel(rootModel);assert.equal(legacy.hidden,true);assert.equal(el('Export').disabled,true)
 events.keydown({type:'keydown',key:'Enter',target:{closest:()=>true}});await settle();assert.equal(el('Year').value,'2026');assert.equal(el('Region').value,'ALL')
 el('Region').value='ALL'
 const years=['all',...new Set(original.area_months.map(row=>row.period.slice(0,4)))].sort((a,b)=>a==='all'?-1:b==='all'?1:a.localeCompare(b)),views=[]
 let csvRows=0
 for(const year of years)for(const region of ['ALL','CALABARZON','MIMAROPA','BICOL']){
  el('Year').value=year;el('Region').value=region;el('Year').listeners.change()
  const view=plain(model.areaPriorityView(original,year,region));views.push(view)
  assert.equal(el('Company').textContent,money(view.company.net_sales_php));assert.equal(el('Confirmed').textContent,money(view.confirmed.net_sales_php))
  const table=rows(el('Table')),changes=rows(el('Changes'))
  assert.equal(table.length,view.rows.length)
  const leading=view.rows.filter(row=>row.net_sales_php!==null&&Number(row.net_sales_php)>0).slice(0,3)
  assert.equal(el('Actions').children.length,leading.length)
  leading.forEach((row,index)=>{const action=model.areaRecommendation(row,year),card=el('Actions').children[index];assert.equal(card.children[0].textContent,row.area+' · '+action.action);assert.equal(card.children[1].textContent,'Recorded net sales: '+money(row.net_sales_php));assert.equal(card.children[2].textContent,'Suggested owner: '+action.owner);assert.equal(card.children[3].textContent,'Next check: '+action.follow_up);assert.equal(card.children[4].tag,'details');assert.equal(card.children[4].children[0].textContent,'Sales evidence');assert.equal(card.children[4].children[1].textContent,action.reason)})
  view.rows.forEach((row,i)=>{assert.equal(table[i][0],row.area);assert.equal(table[i][2],money(row.net_sales_php));assert.equal(table[i][4],row.abc);assert.equal(changes[i][7],money(row.change));assert.equal(changes[i][9],row.lastRecordedMonth);csvRows++})
  el('Export').click();const csv=model.areaPriorityCsv(original,year,region);assert.equal(blobs.at(-1).parts[0],csv);assert.ok(downloads.at(-1).includes(region+'-'+year))
  fs.writeFileSync(path.join(out,'compiled-'+region+'-'+year+'.csv'),csv)
  if(view.rows.every(row=>row.records===0))assert.match(el('Takeaway').textContent,/No positive-net/)
 }
 // Exact threshold crossing, returns and nulls without floating-point cutoffs.
 const mapped=original.regional.mappings.slice(0,4),base=original.area_months[0]
 const synthetic={...original,regional:{...original.regional,mappings:mapped},area_months:mapped.map((m,i)=>({...base,area:m.recorded_label,region:m.region,period:'2026-01',net_sales_php:['80.000000','15.000000','5.000000','-10.000000'][i]}))}
 const boundary=plain(model.areaPriorityView(synthetic,'2026'))
 assert.deepEqual(boundary.rows.map(row=>row.abc),['A','B','C','Nonpositive'])
 const noPrior=boundary.rows[0];assert.equal(noPrior.change,null);assert.equal(noPrior.growth_pct,null)
 assert.equal(boundary.positive_area_total_php,'100.000000');assert.ok(boundary.confirmed_share_pct===100)
 // Policy cases use independent expected actions, including misleading apparent growth.
 const sample=boundary.rows[0],action=(patch,year='2026')=>plain(model.areaRecommendation({...sample,...patch},year))
 assert.equal(action({records:0,net_sales_php:null}).code,'confirm_reporting')
 assert.equal(action({net_sales_php:null}).code,'confirm_reporting')
 assert.equal(action({net_sales_php:'0.000000'}).code,'review_adjustments')
 assert.equal(action({net_sales_php:'-10.000000'}).code,'review_adjustments')
 const decline=action({abc:'A',change:'-20.000000',previous:'100.000000',current:'80.000000',matched:[{month:'01'},{month:'02'}]})
 assert.equal(decline.code,'investigate_decline');assert.match(decline.reason,/2 observed month pairs/);assert.match(decline.follow_up,/No cause is inferred/)
 assert.equal(action({abc:'A',change:null}).code,'protect_service')
 assert.equal(action({abc:'C',change:'1.000000'}).code,'review_opportunities')
 assert.match(action({change:null},'all').reason,/full recorded history/)
 assert.equal(decline.status,'review_recommendation_not_purchase_instruction');assert.equal(decline.policy,'observed_area_sales_follow_up_v1')
 assert.match(model.areaPriorityCsv(original,'2026'),/recommendation_policy/)
 assert.ok(model.areaPriorityCsv(synthetic,'2026').includes('"-10.000000"'))
 const formula=structuredClone(synthetic);formula.regional.mappings[0].recorded_label='=DANGEROUS()';formula.area_months[0].area='=DANGEROUS()'
 assert.ok(model.areaPriorityCsv(formula,'2026').includes('"\'=DANGEROUS()"'))
 synthetic.area_months[0].net_sales_php='=1';assert.throws(()=>model.areaPriorityView(synthetic,'2026'))
 assert.throws(()=>model.areaPriorityView(original,'2026','HOSPITAL'))
 offline=true;el('Reload').click();assert.equal(el('Export').disabled,true);assert.equal(el('Company').textContent,'Unavailable');assert.equal(el('Table').children.length,0);assert.equal(el('Actions').children.length,0);await settle();assert.match(el('Status').textContent,/unavailable/)
 offline=false;response={...original,forecast_approved:true};el('Reload').click();await settle();assert.equal(el('Export').disabled,true)
 response=original;el('Reload').click();await settle();assert.equal(el('Export').disabled,false);dispose();assert.equal(panel.removed,true);assert.equal(legacy.hidden,false)
 let resolve;hold=new Promise(done=>resolve=done);const stop=api.installAreaPriorityPanel(rootModel);events.click({type:'click',target:{closest:()=>true}});stop();resolve();await settle();assert.equal(el('Table').children.length,0)
 fs.writeFileSync(path.join(out,'test-views.json'),JSON.stringify(views,null,2)+'\n')
 const report={status:'PASS_COMPILED_CONFIRMED_AREA_TABLE_CSV',views:views.length,area_rows_compared:csvRows,csv_exports:views.length,invalid_contract_cases:mutations.length,source_failure_clearing:true,recommendation_policy_cases:true,leading_area_actions:true,recovery:true,disposal_race:true,keyboard_activation:true,threshold_returns_missing_cases:true,visual_browser_review:'unverified; isolated DOM model'}
 fs.writeFileSync(path.join(out,'frontend-check.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
}
main().catch(error=>{console.error(error);process.exitCode=1})
