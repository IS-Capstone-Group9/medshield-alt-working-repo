// Actual compiled model/panel; isolated DOM/Chart models, never a browser bypass.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'../..'),ts=require('../node_modules/typescript'),directory=path.resolve(root,process.env.REGIONAL_REVIEW_DIRECTORY||'outputs/so1_regional_connection_20261027')
const original=JSON.parse(fs.readFileSync(path.join(directory,'actual-response.json'),'utf8')),charts=[],blobs=[],downloads=[]
const stlMode=process.env.REGIONAL_STL_TEST==='1',stlDirectory=path.join(root,'outputs/so1_regional_stl_20261028')
const originalStl=stlMode?JSON.parse(fs.readFileSync(process.env.REGIONAL_STL_SOURCE?path.resolve(root,process.env.REGIONAL_STL_SOURCE):path.join(stlDirectory,'actual-response.json'),'utf8')):null
let stlOffline=false,stlResponse=originalStl,stlViews=0,stlPoints=0
let response=original,offline=false,hold=null,panel
class NodeModel{
  constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.value='';this.textContent='';this.disabled=false}
  set innerHTML(html){this.html=html;this.ids={};for(const m of html.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"/g))this.ids[m[2]]=new NodeModel(m[1])}
  querySelector(selector){return this.ids?.[selector.slice(1)]??null}
  setAttribute(){}
  append(...nodes){this.children.push(...nodes)}
  add(node){this.children.push(node);if(this.children.length===1)this.value=node.value}
  replaceChildren(){this.children=[];this.textContent=''}
  addEventListener(event,listener){this.listeners[event]=listener}
  removeEventListener(event){delete this.listeners[event]}
  createTHead(){const h=new NodeModel('thead');this.append(h);return h}
  createTBody(){const b=new NodeModel('tbody');this.append(b);return b}
  insertRow(){const r=new NodeModel('tr');this.append(r);return r}
  insertCell(){const c=new NodeModel('td');this.append(c);return c}
  click(){if(this.tag==='a')downloads.push(this.download);return this.listeners.click?.()}
  remove(){this.removed=true}
}
class ChartModel{constructor(canvas,config){this.config=config;charts.push(this)}destroy(){this.destroyed=true}resize(){}}
const compile=(file,context)=>vm.runInContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,context)
const model={};compile('frontend/services/api/regional-sales-model.ts',vm.createContext({AbortController,exports:model}))
const api={},context=vm.createContext({AbortController,exports:api,require:name=>{
  if(name==='chart.js/auto')return {__esModule:true,default:ChartModel}
  if(name==='./regional-sales-model')return model
  assert.equal(name,'./api-client');return{getJson:async endpoint=>{if(hold)await hold;if(endpoint==='/api/sales/regional-stl-review'){assert.ok(stlMode);if(stlOffline)throw Error('STL unavailable');return stlResponse}assert.equal(endpoint,'/api/sales/regional-source-review');if(offline)throw Error('warehouse offline');return response}}
},document:{createElement:tag=>new NodeModel(tag)},Option:class{constructor(text,value){this.textContent=text;this.value=value}},
  Blob:class{constructor(parts){this.parts=parts;blobs.push(this)}},URL:{createObjectURL:()=> 'isolated-export',revokeObjectURL:()=>{}},setTimeout:()=>0})
compile('frontend/services/api/regional-sales-panel.ts',context)
const host={prepend:value=>{panel=value}},events={},rootModel={querySelector:()=>host,addEventListener:(name,fn)=>events[name]=fn,removeEventListener:name=>delete events[name]}
const el=id=>panel.querySelector('#regional'+id),settle=()=>new Promise(resolve=>setImmediate(resolve)),plain=x=>JSON.parse(JSON.stringify(x))
const money=v=>v===null?'Unavailable':'₱'+Number(v).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})
const rows=table=>table.children[1].children.map(row=>row.children.map(c=>c.textContent))
async function main(){
  assert.equal(model.validRegionalData(original),true)
  // Returns can make a signed allocation share exceed 100%; never clamp it.
  const base=original.months[0],edge={...original,months:[{...base,region:'CALABARZON',period:'2026-01',net_sales_php:'100.000000'},
    {...base,region:'UNALLOCATED',period:'2026-01',net_sales_php:'-20.000000'}]}
  assert.equal(model.regionalCoverage(edge,'2026').signed_net_share_pct,125)
  edge.months[1].net_sales_php='-100.000000';assert.equal(model.regionalCoverage(edge,'2026').signed_net_share_pct,null)
  assert.equal(model.regionalCoverage(original,'2099').signed_net_share_pct,null)
  for(const view of model.regionalComparisons(original,'all')){assert.equal(view.comparison_status,'select_year');assert.equal(view.change,null)}
  for(const change of [d=>d.scope.forecast_approved=true,d=>d.scope.contracts_excluded=false,d=>d.months[0].net_sales_php='999.000000',d=>d.months.push(d.months[0]),d=>d.summaries[0].records++,d=>d.unallocated_labels.pop()]){
    const bad=structuredClone(original);change(bad);assert.equal(model.validRegionalData(bad),false)
  }
  const dispose=api.installRegionalSalesPanel(rootModel);assert.equal(charts.length,0)
  events['medshield:sales-output-change']({detail:{name:'so1'}});await settle()
  assert.equal(el('Year').value,'2026');assert.equal(el('Region').value,'CALABARZON')
  assert.match(panel.html,/<details id="regionalSeasonalDetails"><summary>/);assert.doesNotMatch(panel.html,/<details[^>]*\bopen\b/);
  assert.match(panel.html,/Unconfirmed\/channel labels stay unallocated/);assert.match(panel.html,/Analysis filters do not apply here/)
  const years=['all',...new Set(original.months.map(m=>m.period.slice(0,4)))].sort((a,b)=>a==='all'?-1:b==='all'?1:a.localeCompare(b))
  const views=[],regions=Object.keys(model.REGION_NAMES);let slots=0,exports=0,findingsRows=0
  for(const year of years)for(const region of regions){
    el('Year').value=year;el('Region').value=region;el('Year').listeners.change()
    const view=plain(model.regionalView(original,region,year)),chart=charts.at(-1).config,monthly=rows(el('Months')),totals=rows(el('Totals'))
    const margin=view.summary.gross_profit_php!==null&&view.summary.margin_revenue_basis_php!==null&&Number(view.summary.margin_revenue_basis_php)>0?100*Number(view.summary.gross_profit_php)/Number(view.summary.margin_revenue_basis_php):null
    assert.equal(el('Net').textContent,money(view.summary.net_sales_php));assert.equal(el('Profit').textContent,money(view.summary.gross_profit_php));assert.equal(el('Margin').textContent,margin===null?'Unavailable':margin.toFixed(2)+'%')
    assert.ok(el('Takeaway').textContent.length>0)
    const coverage=plain(model.regionalCoverage(original,year)),comparisons=plain(model.regionalComparisons(original,year))
    assert.equal(coverage.confirmed.records+coverage.unallocated.records,view.company.records)
    assert.ok(el('Coverage').textContent.includes(money(coverage.confirmed.net_sales_php)+' of '+money(coverage.company.net_sales_php)))
    const comparisonTable=rows(el('Comparisons')),findings=model.regionalComparisonCsvRecords(original,year)
    assert.equal(comparisonTable.length,3);assert.equal(findings.length,4)
    comparisons.forEach((r,i)=>{
      assert.equal(comparisonTable[i][0],model.REGION_NAMES[r.region]);assert.equal(comparisonTable[i][2],money(r.previous));assert.equal(comparisonTable[i][3],money(r.current));assert.equal(comparisonTable[i][4],money(r.change))
      assert.equal(comparisonTable[i].length,6);assert.equal(comparisonTable[i][1],year==='all'?'Select a year':r.matched.length?String(r.matched.length):'Unavailable')
      assert.equal(findings[i+1][0],r.region);assert.equal(findings[i+1][2],r.summary.net_sales_php);assert.equal(findings[i+1][7],r.matched.map(m=>m.month).join(';'))
      assert.equal(findings[i+1][11],r.change);assert.equal(findings[i+1][13],r.comparison_status);assert.equal(findings[i+1][20],original.source.dataset_id)
      assert.equal(findings[i+1][26],true);assert.equal(findings[i+1][27],false);assert.equal(findings[i+1][28],false);findingsRows++
      assert.equal(findings[i+1][29],r.lastRecordedMonth)
    })
    el('ComparisonExport').click();assert.ok(downloads.at(-1).includes('findings-'+year));assert.equal(blobs.at(-1).parts[0],'\uFEFF'+findings.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n'));exports++
    const june=model.regionalJuneReview(original,region,year)
    assert.equal(el('JuneReview').hidden,!june)
    if(june){
      assert.ok(el('JuneAmounts').textContent.includes(money(june.previous.net_sales_php)+' in 2025 → '+money(june.current.net_sales_php)))
      assert.ok(el('JuneAmounts').textContent.includes(money(june.change)))
      assert.ok(el('JuneCosts').textContent.includes('Costs support '+june.current.margin_eligible_records+' records'))
      assert.match(el('JuneDates').textContent,/purpose of the separate DATE field is not established/)
    }else for(const key of ['JuneAmounts','JuneCosts','JuneDates'])assert.equal(el(key).textContent,'')
    assert.ok(el('Summary').textContent.includes('Net sales '+money(view.summary.net_sales_php)))
    assert.ok(el('Summary').textContent.includes('Paired margin '+(margin===null?'Unavailable':margin.toFixed(2)+'%')))
    if(year!=='all'&&view.matched.length){assert.ok(el('Yoy').textContent.includes(view.matched.length+' matching observed months'));assert.ok(el('Yoy').textContent.includes(money(view.previous)+' → '+money(view.current)))}
    views.push(plain(view));assert.equal(monthly.length,view.months.length);assert.equal(totals.length,5)
    assert.equal(chart.data.datasets[0].spanGaps,false)
    assert.deepEqual(plain(chart.data.labels),view.months.map(m=>m.period))
    assert.deepEqual(plain(chart.data.datasets[0].data),view.months.map(m=>m.net_sales_php===null?null:Number(m.net_sales_php)))
    const csv=model.regionalCsvRecords(original,region,year),totalCsv=model.regionalTotalsCsvRecords(original,year)
    view.months.forEach((m,i)=>{
      assert.equal(monthly[i][0],m.period);assert.equal(monthly[i][1],m.status);assert.equal(monthly[i][3],money(m.net_sales_php));assert.equal(monthly[i][4],money(m.gross_profit_php));assert.equal(monthly[i][5],money(m.margin_revenue_basis_php))
      assert.equal(csv[i+1][6],m.net_sales_php);assert.equal(csv[i+1][7],m.gross_profit_php);assert.equal(csv[i+1][17],false);assert.equal(csv[i+1][19],true);slots++
    })
    ;[...view.summaries,view.company].forEach((r,i)=>{assert.equal(totals[i][3],money(r.net_sales_php));assert.equal(totals[i][4],money(r.gross_profit_php));assert.equal(totalCsv[i+1][4],r.net_sales_php);assert.equal(totalCsv[i+1][5],r.gross_profit_php)})
    el('Export').click();el('TotalsExport').click();exports+=2;assert.ok(downloads.at(-1).includes('totals-'+year))
  }
  const absent=model.regionalView(original,'MIMAROPA','2026');assert.equal(absent.summary.net_sales_php,null);assert.equal(absent.growth_pct,null)
  assert.equal(model.regionalView(original,'ALL','2026').months[11].status,'outside_observed_source_period')
  assert.throws(()=>model.regionalView(original,'HOSPITAL','2026'))
  if(stlMode){
    assert.equal(model.validRegionalStl(originalStl,original),true)
    const bad=structuredClone(originalStl);bad.forecast_approved=true;assert.equal(model.validRegionalStl(bad,original),false)
    const altered=structuredClone(originalStl);altered.series[0].components[0].trend_php=0;assert.equal(model.validRegionalStl(altered,original),false)
    el('StlLoad').click();await settle()
    for(const region of ['CALABARZON','MIMAROPA','BICOL'])for(const year of years){
      el('Region').value=region;el('Year').value=year;el('Year').listeners.change()
      const expected=originalStl.series.find(s=>s.region===region).components.filter(p=>year==='all'||p.period.startsWith(year+'-'))
      const csv=model.regionalStlCsvRecords(originalStl,region,year);assert.equal(csv.length,expected.length+1);stlViews++
      if(expected.length){
        const strengths=model.regionalStlStrengths(originalStl).filter(s=>s.region===region)
        assert.equal(rows(el('StlStrength')).length,strengths.length)
        assert.equal(rows(el('StlStrength'))[0][2],strengths[0].trend_strength.toFixed(4))
        assert.equal(rows(el('StlStrength'))[0][3],strengths[0].seasonal_strength.toFixed(4))
        assert.equal(csv[1][15],strengths[0].trend_strength)
        assert.equal(csv[1][16],strengths[0].seasonal_strength)
      }
      if(!expected.length){assert.equal(el('StlExport').disabled,true);assert.equal(el('StlPoints').children.length,0);assert.match(el('StlStatus').textContent,/No fitted components/);continue}
      const values=rows(el('StlPoints')),config=charts.at(-1).config;assert.equal(values.length,expected.length)
      expected.forEach((p,i)=>{
        assert.equal(values[i][0],p.period);assert.equal(values[i][2],money(String(p.trend_php)));assert.equal(values[i][3],money(String(p.seasonal_php)));assert.equal(values[i][4],money(String(p.residual_php)))
        assert.equal(csv[i+1][4],p.trend_php);assert.equal(csv[i+1][14],false);stlPoints++
      })
      for(const [i,key] of ['trend_php','seasonal_php','residual_php'].entries()){
        assert.equal(config.data.datasets[i].spanGaps,false)
        assert.deepEqual(plain(config.data.datasets[i].data),plain(config.data.labels).map(m=>expected.find(p=>p.period===m)?.[key]??null))
      }
      el('StlExport').click();assert.match(downloads.at(-1),/regional-stl/)
    }
    el('Region').value='ALL';el('Year').listeners.change();assert.match(el('StlStatus').textContent,/No company or unallocated fit/)
    stlOffline=true;el('StlLoad').click();await settle();assert.match(el('StlStatus').textContent,/unavailable/);assert.equal(el('Export').disabled,false);assert.equal(el('StlExport').disabled,true)
    stlOffline=false;stlResponse={...originalStl,forecast_approved:true};el('StlLoad').click();await settle();assert.equal(el('StlExport').disabled,true)
    stlResponse=originalStl;el('Region').value='CALABARZON';el('Year').value='2026';el('StlLoad').click();await settle();assert.equal(el('StlExport').disabled,false)
  }
  offline=true;el('Reload').click();for(const key of ['Net','Profit','Margin'])assert.equal(el(key).textContent,'Unavailable');assert.equal(el('Takeaway').textContent,'');assert.equal(el('Months').children.length,0);assert.equal(el('Comparisons').children.length,0);assert.equal(el('Coverage').textContent,'');assert.equal(el('ComparisonExport').disabled,true);assert.equal(el('Export').disabled,true);await settle();assert.match(el('Status').textContent,/unavailable/)
  offline=false;response={...original,scope:{...original.scope,forecast_approved:true}};el('Reload').click();await settle();assert.equal(el('Export').disabled,true)
  response=original;el('Reload').click();await settle();assert.equal(el('Export').disabled,false);dispose();assert.equal(panel.removed,true)
  let release;hold=new Promise(resolve=>{release=resolve});const stop=api.installRegionalSalesPanel(rootModel);events['medshield:sales-output-change']({detail:{name:'so1'}});stop();release();await settle();hold=null;assert.equal(el('Months').children.length,0)
  const june=model.regionalJuneReview(original,'CALABARZON','2026')
  assert.equal(june.current.net_sales_php,'2019509.720000');assert.equal(june.previous.net_sales_php,'613772.710000');assert.equal(june.change,'1405737.010000');assert.equal(june.current.records-june.current.margin_eligible_records,29)
  assert.equal(model.regionalJuneReview({...original,source:{...original.source,current_monthly_sha256:'0'.repeat(64)}},'CALABARZON','2026').sourceNoteMatches,false)
  assert.equal(model.regionalJuneReview({...original,source:{...original.source,mapping_sha256:'0'.repeat(64)}},'CALABARZON','2026').sourceNoteMatches,false)
  assert.equal(model.regionalJuneReview({...original,months:original.months.filter(m=>m.period!=='2025-06')},'CALABARZON','2026'),null)
  assert.equal(el('JuneReview').hidden,true);assert.equal(el('JuneAmounts').textContent,'')
  const output=process.env.REGIONAL_OUTPUT_DIRECTORY?path.resolve(root,process.env.REGIONAL_OUTPUT_DIRECTORY):process.env.REGIONAL_CLIENT_TEST==='1'?path.join(root,'outputs/so1_client_review_20261028'):stlMode?stlDirectory:directory
  fs.mkdirSync(output,{recursive:true})
  fs.writeFileSync(path.join(output,'test-views.json'),JSON.stringify(views,null,2)+'\n')
  fs.writeFileSync(path.join(output,'regional-findings.json'),JSON.stringify(years.map(year=>({year,coverage:plain(model.regionalCoverage(original,year)),comparisons:plain(model.regionalComparisons(original,year)),csv:plain(model.regionalComparisonCsvRecords(original,year))})),null,2)+'\n')
  const report={status:'PASS_COMPILED_REGIONAL_CHART_TABLE_CSV',views:views.length,monthly_slots_compared:slots,csv_exports:exports,findings_rows_compared:findingsRows,
    stl_views:stlViews,stl_component_rows_compared:stlPoints,invalid_contract_cases:6,checks:['regional and unallocated conservation','all chart/table/CSV values','matched-month views retained for independent verification','missing versus future outside-source periods','source outage clears stale data','invalid scope/approval rejection and recovery','disposal race'],visual_browser_review:'unverified; isolated DOM/Chart models only'}
  fs.writeFileSync(path.join(output,'frontend-check.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
}
main().catch(error=>{console.error(error);process.exitCode=1})
