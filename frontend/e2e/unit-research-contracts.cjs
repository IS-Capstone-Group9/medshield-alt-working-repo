// Actual compiled panel in isolated DOM models; no browser/session access.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),ts=require('../node_modules/typescript')
const directory=path.resolve(root,process.env.UNIT_RESEARCH_DIRECTORY||'outputs/bupiright_research_connection_20261027')
const original=JSON.parse(fs.readFileSync(path.join(directory,'actual-response.json'),'utf8'))
let response=original,offline=false,mounted,hold=null,requests=0
const blobs=[],downloads=[],charts=[]
class ChartModel{constructor(canvas,config){this.config=config;charts.push(this)}destroy(){this.destroyed=true}resize(){}}
class NodeModel{
  constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.value='';this.textContent='';this.disabled=false}
  set innerHTML(html){this.html=html;this.ids={};for(const m of html.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"/g))this.ids[m[2]]=new NodeModel(m[1])}
  querySelector(s){return this.ids?.[s.slice(1)]??null}
  setAttribute(){}
  append(...nodes){this.children.push(...nodes)}
  replaceChildren(){this.children=[];this.textContent=''}
  addEventListener(event,listener){this.listeners[event]=listener}
  createTHead(){const h=new NodeModel('thead');this.append(h);return h}
  createTBody(){const b=new NodeModel('tbody');this.append(b);return b}
  insertRow(){const r=new NodeModel('tr');this.append(r);return r}
  insertCell(){const c=new NodeModel('td');this.append(c);return c}
  click(){if(this.tag==='a')downloads.push(this.download);return this.listeners.click?.()}
  remove(){this.removed=true}
}
const exportsModel={}
const robustnessModel={}
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'frontend/services/api/unit-research-robustness.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{AbortController,exports:robustnessModel})
const context=vm.createContext({AbortController,exports:exportsModel,require:name=>{if(name==='chart.js/auto')return{__esModule:true,default:ChartModel};if(name==='./unit-research-robustness')return robustnessModel;assert.equal(name,'./api-client');return{getJson:async endpoint=>{
  assert.equal(endpoint,'/api/sales/unit-baseline-research');requests++;if(hold)await hold;if(offline)throw Error('source offline');return response
}}},document:{createElement:tag=>new NodeModel(tag)},MutationObserver:class{observe(){}disconnect(){}},
  Blob:class{constructor(parts){this.parts=parts;blobs.push(this)}},URL:{createObjectURL:()=> 'isolated-csv',revokeObjectURL:()=>{}},setTimeout:()=>0})
const source=fs.readFileSync(path.join(root,'frontend/services/api/unit-research-panel.ts'),'utf8')
vm.runInContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,context)
const page={classList:{contains:()=>true}},existing={closest:()=>page,before:panel=>{mounted=panel}},rootModel={querySelector:()=>existing}
const settle=()=>new Promise(resolve=>setImmediate(resolve))
const el=id=>mounted.querySelector('#unitResearch'+id)
const cells=node=>node.children.map(row=>row.children.map(cell=>cell.textContent))
async function main(){
  const api=exportsModel;assert.equal(api.validUnitResearch(original),true)
  const mutations=[d=>d.scope.recorded_channel='GOVERNMENT',d=>d.scope.unit='PHP',d=>d.operational_forecasting_approved=true,
    d=>d.points.pop(),d=>d.points[0].lead=12,d=>d.points[0].error=999,d=>d.metrics[0].n=999,d=>d.metrics[0].mae+=1,
    d=>d.metrics[0].rmse+=1,d=>d.metrics[0].bias+=1,d=>d.metrics[0].wape+=1,d=>d.evidence.research_window_end='2026-12',
    d=>{const p=d.points.find(p=>p.method==='mean_3');p.actual++;p.prediction++},
    d=>{const p=d.points.find(p=>p.method==='mean_3');p.origin='2024-01';p.target_month=p.lead===1?'2024-02':'2024-04'},
    d=>d.evidence.observed_months=36,d=>d.source.policy_version='wrong_policy']
  for(const change of mutations){
    const bad=structuredClone(original);change(bad);assert.equal(api.validUnitResearch(bad),false)
  }
  const zero=structuredClone(original)
  zero.points.forEach(point=>{point.actual=0;point.prediction=0;point.error=0})
  zero.metrics.forEach(metric=>{metric.mae=0;metric.rmse=0;metric.bias=0;metric.wape=null})
  assert.equal(api.validUnitResearch(zero),true)
  assert.equal(api.unitResearchReadout(zero,1).lowestMaeMethods.length,4)
  zero.metrics[0].wape=0;assert.equal(api.validUnitResearch(zero),false)
  const dispose=api.installUnitResearchPanel(rootModel);await settle()
  assert.match(mounted.html,/Operational forecasting is not approved/);assert.match(mounted.html,/not a verified delivery territory/)
  assert.ok(!mounted.html.includes('<option value="future"'))
  assert.match(el('Coverage').textContent,/13 retain unreviewed-export/)
  let checked=0,chartViews=0;const readouts=[],chartRecords=[],robustnessViews=[]
  for(const lead of [1,3]){
    el('Lead').value=String(lead);el('Lead').listeners.change()
    const metrics=cells(el('Metrics').children[1]),points=cells(el('Points').children[1])
    assert.equal(metrics.length,4);assert.equal(points.length,lead===1?24:16)
    const robustness=JSON.parse(JSON.stringify(robustnessModel.researchRobustness(original.points,lead)))
    robustnessViews.push(robustness)
    assert.equal(cells(el('Robustness').children[1]).length,4)
    assert.equal(cells(el('Robustness').children[1])[0].length,6)
    assert.ok(el('RobustnessSummary').textContent.includes('Only '+robustness.n+' scored months'))
    const format=n=>n.toLocaleString('en-PH',{maximumFractionDigits:2,minimumFractionDigits:2})
    original.metrics.filter(m=>m.lead===lead).forEach((m,i)=>{
      assert.equal(metrics[i][1],String(m.n));assert.equal(metrics[i][2],format(m.mae));assert.equal(metrics[i][3],format(m.rmse));
      assert.equal(metrics[i][4],m.wape===null?'Unavailable':format(m.wape)+'%');assert.equal(metrics[i][5],format(m.bias))
    })
    const csv=api.unitResearchCsvRecords(original,lead);assert.equal(csv.length,points.length+1)
    assert.equal(csv[0].length,51)
    for(const row of csv.slice(1)){assert.equal(row[37],robustness.policy);assert.equal(row[50],robustness.n)}
    const readout=JSON.parse(JSON.stringify(api.unitResearchReadout(original,lead)));readouts.push(readout)
    assert.equal(readout.decemberLeadFromSourceEnd,3);assert.equal(readout.decemberPredictionAvailable,false);assert.equal(readout.selectedOperationalMethod,null)
    assert.ok(el('Takeaway').textContent.includes(format(readout.lowestMae)+' ampoules'));assert.ok(el('Calendar').textContent.includes('no December prediction'))
    for(const method of ['last_value','mean_3','mean_6','seasonal_naive_12']){
      el('Method').value=method;el('Method').listeners.change();const chart=charts.at(-1).config
      const sourcePoints=original.points.filter(p=>p.lead===lead&&p.method===method).sort((a,b)=>a.target_month.localeCompare(b.target_month))
      assert.deepEqual(JSON.parse(JSON.stringify(chart.data.labels)),sourcePoints.map(p=>p.target_month))
      assert.deepEqual(JSON.parse(JSON.stringify(chart.data.datasets[0].data)),sourcePoints.map(p=>p.actual));assert.deepEqual(JSON.parse(JSON.stringify(chart.data.datasets[1].data)),sourcePoints.map(p=>p.prediction))
      assert.equal(chart.data.datasets[0].spanGaps,false);assert.equal(chart.data.datasets[1].spanGaps,false);chartViews++
      chartRecords.push({lead,method,labels:JSON.parse(JSON.stringify(chart.data.labels)),datasets:JSON.parse(JSON.stringify(chart.data.datasets))})
    }
    assert.equal(csv[0].indexOf('recorded_channel'),9);assert.equal(csv[0].indexOf('operational_forecasting_approved'),13)
    for(let i=0;i<points.length;i++){
      const p=original.points.filter(p=>p.lead===lead)[i],r=csv[i+1]
      assert.equal(r[4],p.actual);assert.equal(r[5],p.prediction);assert.equal(r[6],Math.abs(p.error));assert.equal(r[7],p.error)
      assert.equal(r[9],'HOSPITAL');assert.equal(r[10],'ampoules');assert.equal(r[13],false)
      assert.equal(points[i][1],p.origin);assert.equal(points[i][2],p.target_month);checked++
      assert.equal(points[i][3],format(p.actual));assert.equal(points[i][4],format(p.prediction));assert.equal(points[i][5],format(Math.abs(p.error)));assert.equal(points[i][6],format(p.error))
      const metric=original.metrics.find(m=>m.method===p.method&&m.lead===lead)
      assert.equal(r[22],metric.n);assert.equal(r[23],metric.mae);assert.equal(r[24],metric.rmse);assert.equal(r[25],metric.wape);assert.equal(r[26],metric.bias)
    }
    el('Export').click();assert.match(downloads.at(-1),new RegExp('HOSPITAL-research-lead-'+lead))
    assert.ok(blobs.at(-1).parts.join('').includes('conditional_retrospective_not_asof_or_untouched_holdout'))
    fs.writeFileSync(path.join(directory,'compiled-lead-'+lead+'.csv'),blobs.at(-1).parts.join(''))
    assert.equal(csv[0].indexOf('requested_target_prediction_available'),34)
    csv.slice(1).forEach(row=>{assert.equal(row[34],false);assert.equal(row[35],null);assert.equal(row[36],original.source.policy_version)})
  }
  offline=true;el('Reload').click();assert.equal(el('Metrics').children.length,0);assert.equal(el('Export').disabled,true);assert.equal(el('ChartWrap').hidden,true);assert.equal(el('Takeaway').textContent,'');assert.equal(el('Calendar').textContent,'');assert.equal(el('Method').disabled,true);assert.equal(charts.at(-1).destroyed,true);await settle()
  assert.match(el('Status').textContent,/unavailable/);assert.match(mounted.html,/Operational forecasting is not approved/)
  assert.equal(el('RobustnessSummary').textContent,'');assert.equal(el('Robustness').children.length,0)
  offline=false;response={...original,activation_allowed:true};el('Reload').click();await settle();assert.equal(el('Export').disabled,true)
  response=original;el('Reload').click();await settle();assert.equal(el('Export').disabled,false)
  dispose();assert.equal(mounted.removed,true)
  let release;hold=new Promise(resolve=>{release=resolve});const pendingDispose=api.installUnitResearchPanel(rootModel),pendingPanel=mounted
  pendingDispose();release();await settle();hold=null;assert.equal(pendingPanel.removed,true);assert.equal(el('Metrics').children.length,0)
  assert.throws(()=>api.unitResearchReadout(original,12))
  fs.writeFileSync(path.join(directory,'readouts.json'),JSON.stringify(readouts,null,2)+'\n')
  fs.writeFileSync(path.join(directory,'robustness-views.json'),JSON.stringify(robustnessViews,null,2)+'\n')
  fs.writeFileSync(path.join(directory,'chart-views.json'),JSON.stringify(chartRecords,null,2)+'\n')
  const report={status:'PASS_COMPILED_UNIT_RESEARCH_UI',cases_compared:checked,lead_views:2,chart_views:chartViews,csv_exports:2,invalid_contract_cases:mutations.length,
    checks:['channel/unit/approval labels','all metrics and exact table/CSV populations','no future option','loading and failure clear stale data','safe contract rejection and recovery','disposal race'],
    requests,visual_responsive_browser_review:'unverified; isolated DOM models only'}
  fs.writeFileSync(path.join(directory,'frontend-check.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
}
main().catch(error=>{console.error(error);process.exitCode=1})
