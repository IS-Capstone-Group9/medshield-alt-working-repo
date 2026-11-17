// Compiled panel with isolated DOM/Chart models; never browser/session access or runtime fallback.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),output=path.join(root,'outputs/original_so1_20261027')
const ts=require('../node_modules/typescript'),views=JSON.parse(fs.readFileSync(output+'/test-views.json','utf8'))
let section,offline=false,wrong=false
const charts=[],blobs=[],downloads=[],listeners={}
class NodeModel{
 constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.textContent='';this.value='';this.disabled=false}
 set innerHTML(html){this.html=html;this.ids={};for(const match of html.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"/g)){const node=new NodeModel(match[1]);if(match[2]==='so1Area')node.value='COMPANY';if(match[2]==='so1Year')node.value='all';this.ids[match[2]]=node}}
 querySelector(selector){return this.ids?.[selector.slice(1)]}
 append(...nodes){this.children.push(...nodes);if(this.tag==='host')section=nodes[0];if(this.tag==='select'&&this.children.length===1)this.value=nodes[0].value}
 replaceChildren(){this.children=[];this.textContent='';this.value=''}
 addEventListener(event,fn){this.listeners[event]=fn}
 removeEventListener(){}
 createTHead(){const n=new NodeModel('thead');this.append(n);return n}
 createTBody(){const n=new NodeModel('tbody');this.append(n);return n}
 insertRow(){const n=new NodeModel('tr');this.append(n);return n}
 insertCell(){const n=new NodeModel('td');this.append(n);return n}
 click(){if(this.tag==='a')downloads.push(this.download);return this.listeners.click?.()}
 remove(){this.removed=true}
}
class ChartModel{constructor(canvas,config){this.canvas=canvas;this.config=config;charts.push(this)}destroy(){this.destroyed=true}resize(){}}
const host=new NodeModel('host'),rootModel={querySelector:()=>host,addEventListener:(name,fn)=>listeners[name]=fn,removeEventListener:name=>delete listeners[name]}
const moduleExports={}
const context=vm.createContext({AbortController,exports:moduleExports,require:name=>{
 if(name==='chart.js/auto')return{__esModule:true,default:ChartModel}
 assert.equal(name,'./api-client');return{getJson:async endpoint=>{
  const url=new URL(endpoint,'http://isolated.test'),a=url.searchParams.get('area'),y=url.searchParams.get('year')
  assert.equal(url.pathname,'/api/sales/so1');if(offline)throw Error('source unavailable')
  const data=views[a+'|'+y];assert.ok(data,'Available test view');return wrong?{...data,scope:{...data.scope,area:'WRONG'}}:data
 }}
},document:{createElement:tag=>new NodeModel(tag)},innerWidth:1100,Blob:class{constructor(parts){this.parts=parts;blobs.push(this)}},
 URL:class extends URL{static createObjectURL(){return'isolated-csv'}static revokeObjectURL(){}},setTimeout:()=>0})
const source=fs.readFileSync(path.join(root,'frontend/services/api/so1-panel.ts'),'utf8')
vm.runInContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,context)
const el=id=>section.ids[id],plain=value=>JSON.parse(JSON.stringify(value))
const settle=()=>new Promise(resolve=>setImmediate(resolve))
function csv(){return blobs.at(-1).parts.join('').replace(/^\uFEFF/,'').split('\r\n').map(line=>[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replace(/""/g,'"')))}
async function main(){
 const dispose=moduleExports.installSo1Panel(rootModel)
 listeners['medshield:sales-output-change']({detail:{name:'so1'}});await settle()
 assert.equal(el('so1Result').hidden,false)
 let scopes=0,monthlyCases=0,dailyWindows=0,contributionRows=0
 for(const option of views['COMPANY|all'].options.areas)for(const year of ['all','2026']){
  el('so1Area').value=option.area;el('so1Year').value=year;await el('so1Area').listeners.change()
  const data=views[option.area+'|'+year]
  assert.match(el('so1Status').textContent,/Validated Databricks/)
  if(option.area!=='COMPANY')assert.match(el('so1Mapping').textContent,/Region unavailable/)
  const monthly=charts.filter(c=>c.canvas===el('so1MonthlyChart')).at(-1)
  assert.deepEqual(plain(monthly.config.data.labels),data.months.map(row=>row.period))
  assert.deepEqual(plain(monthly.config.data.datasets[0].data),data.months.map(row=>row.revenue))
  assert.deepEqual(plain(monthly.config.data.datasets[1].data),data.months.map(m=>data.components.find(p=>p.period===m.period&&p.scenario==='monthly_primary')?.trend??null))
  const table=el('so1MonthlyTable').children.find(n=>n.tag==='tbody')
  assert.equal(table.children.length,data.months.length)
  el('so1Export').click();const exported=csv(),head=exported[0],at=name=>head.indexOf(name)
  assert.equal(exported.length,data.months.length+1)
  data.months.forEach((row,index)=>{
   const cells=exported[index+1]
   assert.equal(cells[at('month')],row.period)
   assert.equal(cells[at('recorded_revenue_php')],row.revenue===null?'':String(row.revenue))
   assert.equal(Number(cells[at('retained_records')]),row.records)
   assert.equal(cells[at('contracts_excluded')],'true');assert.equal(cells[at('geographic_approval')],'unapproved_recorded_labels_only')
   assert.equal(cells[at('financial_release_approved')],'false');assert.equal(cells[at('model_publication_approved')],'false')
   assert.equal(cells[at('diagnostic_sha256')],data.checksum)
  })
  el('so1ContributionExport').click();const bridge=csv(),h=bridge[0],index=name=>h.indexOf(name)
  assert.equal(bridge.length,(data.contributions?.length??0)+1)
  for(const [i,row] of data.contributions.entries()){
   assert.equal(bridge[i+1][index('recorded_label')],row.area)
   assert.equal(Number(bridge[i+1][index('signed_change_php')]),row.change)
   assert.equal(bridge[i+1][index('basis')],row.basis)
  }
  contributionRows+=data.contributions.length
  for(const comparison of data.comparisons){
   el('so1Segment').value=comparison.segment_id;el('so1Segment').listeners.change()
   const points=data.components.filter(p=>p.comparison_segment===comparison.segment_id)
   const labels=[...new Set(points.map(p=>p.period))].sort()
   if(!labels.length)continue
   assert.equal(el('so1DailyContent').hidden,false)
   const chart=charts.filter(c=>c.canvas===el('so1DailyChart')).at(-1)
   assert.deepEqual(plain(chart.config.data.labels),labels)
   assert.deepEqual(plain(chart.config.data.datasets.map(d=>d.data)),['matched_monthly_primary','daily_zero_aggregated','daily_stress_aggregated'].map(s=>labels.map(period=>points.find(p=>p.period===period&&p.scenario===s)?.trend??null)))
   el('so1DailyExport').click();const rows=csv(),header=rows[0],col=name=>header.indexOf(name)
   assert.equal(rows.length,points.length+1)
   points.forEach((p,i)=>{assert.equal(Number(rows[i+1][col('trend_php_per_month')]),p.trend);assert.equal(rows[i+1][col('interpretation')],'conditional_diagnostic_not_verified_actual_sales')})
   dailyWindows++
  }
  scopes++;monthlyCases+=data.months.length
 }
 for(const flag of ['offline','wrong']){
  offline=flag==='offline';wrong=flag==='wrong';await el('so1Reload').click()
  assert.equal(el('so1Result').hidden,true);assert.equal(el('so1MonthlyTable').children.length,0)
  assert.equal(el('so1ContributionTable').children.length,0);assert.equal(el('so1Export').disabled,true)
  assert.equal(el('so1ContributionExport').disabled,true)
  assert.match(el('so1Status').textContent,/unavailable/)
  offline=false;wrong=false;await el('so1Reload').click();assert.equal(el('so1Result').hidden,false)
 }
 dispose();assert.equal(section.removed,true)
 const report={status:'PASS_ORIGINAL_SO1_COMPILED_UI_CONTRACTS',scope_selections:scopes,monthly_cases:monthlyCases,
  daily_window_selections:dailyWindows,contribution_export_rows:contributionRows,
  checks:['Exact monthly/chart/export parity and null preservation','Conditional daily chart/export assumptions and same-window values',
   'Recorded labels, missing regional attribution and false approvals retained','Signed bridge export agrees with API',
   'Warehouse/scope failure clears stale values and disables exports; reload recovers','Disposal removes panel'],
  signed_in_visual_review:'unverified; isolated DOM/Chart models only'}
 fs.writeFileSync(output+'/frontend-check.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2))
}
main().catch(error=>{console.error(error);process.exitCode=1})
