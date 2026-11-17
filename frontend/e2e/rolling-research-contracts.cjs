// Isolated compiled UI + DOM/Chart models. No browser, session access or live fallback.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),ts=require('../node_modules/typescript')
const output=path.resolve(root,process.env.QA_EVIDENCE_DIRECTORY||'outputs/rolling_research_connection_20261027')
const response=JSON.parse(fs.readFileSync(path.join(output,'actual-response.json'),'utf8'))
let original=response.lead_views['1']
const plain=value=>JSON.parse(JSON.stringify(value))
const checks=[],charts=[],blobs=[],downloads=[]
let activeResponse=response,offline=false,invalid=false,mounted,hold=null
class NodeModel{
  constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.value='';this.textContent='';this.disabled=false}
  get innerHTML(){return this.html}
  set innerHTML(html){
    this.html=html;this.ids={}
    for(const match of html.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"/g)){
      const node=new NodeModel(match[1]);node.parentElement=new NodeModel('container');this.ids[match[2]]=node
    }
  }
  querySelector(selector){return this.ids?.[selector.slice(1)]??null}
  setAttribute(){}
  append(...nodes){this.children.push(...nodes)}
  replaceChildren(){this.children=[];this.value='';this.textContent=''}
  add(node){this.children.push(node);if(this.children.length===1)this.value=node.value}
  addEventListener(event,listener){this.listeners[event]=listener}
  createTHead(){const head=new NodeModel('thead');this.append(head);return head}
  createTBody(){const body=new NodeModel('tbody');this.append(body);return body}
  insertRow(){const row=new NodeModel('tr');this.append(row);return row}
  insertCell(){const cell=new NodeModel('td');this.append(cell);return cell}
  click(){if(this.tag==='a')downloads.push(this.download);return this.listeners.click?.()}
  remove(){this.removed=true}
}
class ChartModel{constructor(canvas,config){this.config=config;charts.push(this)}destroy(){this.destroyed=true}}
const exportsModel={}
const context=vm.createContext({AbortController,exports:exportsModel,require:name=>{
  if(name==='chart.js/auto')return {__esModule:true,default:ChartModel}
  assert.equal(name,'./api-client')
  return {getJson:async endpoint=>{
    assert.equal(endpoint,'/api/sales/rolling-source-research')
    if(hold)await hold
    if(offline)throw Error('Warehouse unavailable')
    return invalid?{...activeResponse,publication_approved:true}:activeResponse
  }}
},document:{createElement:tag=>new NodeModel(tag)},
  Option:class{constructor(text,value){this.textContent=text;this.value=value}},
  MutationObserver:class{observe(){}disconnect(){}},
  Blob:class{constructor(parts){this.parts=parts;blobs.push(this)}},
  URL:{createObjectURL:()=> 'isolated-csv',revokeObjectURL:()=>{}},setTimeout:()=>0,
})
const source=fs.readFileSync(path.join(root,'frontend/services/api/current-research-panel.ts'),'utf8')
vm.runInContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,context)
const el=id=>mounted.ids[id.replace('currentResearch','rollingResearch')]
const settle=()=>new Promise(resolve=>setImmediate(resolve))
function install(){
  const anchor={before:panel=>{mounted=panel},closest:()=>({classList:{contains:()=>true}})}
  return exportsModel.installCurrentResearchPanel({addEventListener(){},removeEventListener(){},querySelector:()=>anchor},{rolling:true})
}
const money=value=>value===null?'Unavailable':'₱'+value.toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})
async function main(){
  assert.equal(exportsModel.validCurrentResearch(original),true)
  const dispose=install();await settle()
  assert.match(el('currentResearchTitle').textContent,/Monthly-refresh forecast research/)
  assert.match(el('currentResearchNotice').textContent,/Contracts excluded/)
  assert.match(el('currentResearchNotice').textContent,/Substantial errors/)
  assert.deepEqual(el('currentResearchStage').children.map(node=>node.value),['retrospective_extension_2026','retrospective_audit'])
  assert.equal(el('currentResearchModel').children.length,21)
  assert.match(el('currentResearchMetrics').textContent,/39.49%/)
  assert.equal(mounted.ids.currentResearchTitle,undefined);assert.equal(el('currentResearchLeadControl').hidden,false)
  checks.push('Rolling panel has separate IDs, lead controls, source scope and substantial-error notice')
  let cases=0
  for(const lead of ['1','3']){
  original=response.lead_views[lead];el('currentResearchLead').value=lead;el('currentResearchLead').listeners.change()
  for(const model of original.comparisons)for(const stage of original.available_stages){
    el('currentResearchModel').value=model.model_id;el('currentResearchStage').value=stage
    el('currentResearchStage').listeners.change()
    const points=original.points.filter(point=>point.model_id===model.model_id&&point.stage===stage).sort((a,b)=>a.target_period.localeCompare(b.target_period))
    const chart=charts.at(-1)
    assert.deepEqual(plain(chart.config.data.labels),points.map(point=>point.target_period))
    assert.deepEqual(plain(chart.config.data.datasets.map(dataset=>dataset.data)),[points.map(p=>p.actual),points.map(p=>p.prediction)])
    const body=el('currentResearchPoints').children.find(node=>node.tag==='tbody')
    assert.deepEqual(body.children.map(row=>row.children.map(cell=>cell.textContent)),points.map(p=>[p.target_period,p.origin_period,String(p.lead_months),money(p.actual),money(p.prediction),money(p.prediction-p.actual)]))
    el('currentResearchExport').click()
    const csv=blobs.at(-1).parts.join(''),lines=csv.replace(/^\uFEFF/,'').split('\r\n')
    const cells=lines.map(line=>[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(match=>match[1].replace(/""/g,'"')))
    assert.equal(cells.length,points.length+1)
    const header=cells[0],column=name=>header.indexOf(name)
    for(const [index,point] of points.entries()){
      const row=cells[index+1]
      assert.equal(row[column('target_month')],point.target_period)
      assert.equal(Number(row[column('actual_php')]),point.actual)
      assert.equal(Number(row[column('prediction_php')]),point.prediction)
      assert.equal(Number(row[column('signed_error_php')]),point.prediction-point.actual)
      assert.equal(row[column('contracts_excluded')],'true')
      for(const field of ['publication_approved','activation_allowed','financial_release_approved'])assert.equal(row[column(field)],'false')
      for(const field of ['artifact_sha256','input_sha256','receipt_sha256','monthly_sha256'])assert.equal(row[column(field)],original.source[field])
      assert.equal(row[column('dataset_id')],original.source.dataset_id)
      assert.equal(row[column('filter_policy')],original.scope.filter_policy)
    }
    assert.equal(cells[1][13],original.source.artifact_sha256,'Retain existing CSV column compatibility')
    assert.equal(cells[1][column('forecast_lead_months')],lead)
    assert.equal(cells[1][column('protocol_sha256')],response.lead_views[lead].source.protocol_sha256)
    assert.equal(cells[1][column('refresh_policy')],'expanding_history_refit_each_origin_month')
    assert.ok(points.every(point=>point.lead_months===Number(lead)))
    cases+=points.length
  }
  }
  assert.equal(cases,882);assert.equal(downloads.length,84)
  checks.push('All 882 cases agree across actual compiled chart, table and downloaded CSV in 84 model/lead/window selections')
  assert.throws(()=>exportsModel.currentResearchCsvRecords(original,'future','last_value'))
  el('currentResearchStage').value='future';el('currentResearchStage').listeners.change()
  assert.equal(el('currentResearchStage').value,'retrospective_extension_2026')
  const bad=structuredClone(original);bad.points[0].stage='future'
  assert.equal(exportsModel.validCurrentResearch(bad),false)
  checks.push('Original research cannot render or export unsupported future projections')
  for(const kind of ['offline','invalid']){
    if(kind==='offline')offline=true;else invalid=true
    el('currentResearchReload').click();await settle()
    assert.match(el('currentResearchStatus').textContent,/unavailable/)
    assert.equal(el('currentResearchPoints').children.length,0)
    assert.equal(el('currentResearchExport').disabled,true)
    assert.equal(el('currentResearchStage').disabled,true)
    assert.equal(el('currentResearchLead').disabled,true)
    assert.equal(charts.at(-1).destroyed,true)
    offline=false;invalid=false;el('currentResearchReload').click();await settle()
    assert.equal(el('currentResearchExport').disabled,false)
  }
  checks.push('Warehouse failure and invalid approval clear stale chart/table/source/export; reload recovers')
  dispose();assert.equal(mounted.removed,true)
  activeResponse=response;let release
  hold=new Promise(resolve=>{release=resolve})
  const disposePending=install(),chartCount=charts.length
  disposePending();release();await settle();hold=null
  assert.equal(charts.length,chartCount)
  checks.push('Disposal during pending request cannot restore removed results')
  const report={status:'PASS_COMPILED_ROLLING_RESEARCH_UI',checks,cases_compared:cases,
    model_window_exports:84,real_browser_visual_check:'unverified; isolated DOM/Chart models only'}
  fs.writeFileSync(path.join(output,'frontend-check.json'),JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report,null,2))
}
main().catch(error=>{console.error(error);process.exitCode=1})
