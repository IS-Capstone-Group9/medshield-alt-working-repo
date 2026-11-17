import {test,expect} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'
import {MEDSHIELD_STYLE} from '../lib/medshieldReference'

const keys=['sales','disease','tayabas','alabat','nasa']
const fixture=()=>{
  const rows=Array.from({length:108},(_,i)=>({period:(2017+Math.floor(i/12))+'-'+String(i%12+1).padStart(2,'0'),sales:i===0?-12.34:i===84?0:100+i,disease:i<12?null:i===84?0:i,
    tayabas:i>=96?null:20+i,alabat:i>=96?null:40+i,nasa:i<48?null:60+i}))
  return {scope:{territory:'Quezon',buyer_scope:'All',start:'2017-01',end:'2025-12',alignment:'same_calendar_month'},rows,
    coverage:keys.map(key=>({key,observed_months:rows.filter(r=>(r as any)[key]!==null).length,total_months:108,first_period:rows.find(r=>(r as any)[key]!==null)?.period,last_period:rows.filter(r=>(r as any)[key]!==null).at(-1)?.period})),
    coobserved_months:84,checksum:'context-fixture',loaded_at:'2026-10-25',interpretation:'Historical descriptive comparison only.',limitations:['No causality or forecast-time availability claim.'],
    release:{dataset_id:'fixture-source',fact_delta_version:0,policy_version:'v8',financial_publication:{publication_id:'financial-fixture',manifest_sha256:'manifest-hash'}},
    sources:{sales:{table:'approved-fact',version:0,dataset_id:'fixture-source'},doh:{table:'doh-context',checksum:'doh-hash',identities:['DOH']},pagasa:{table:'station-months',version:2,checksum:'station-hash'},nasa:{table:'nasa-months',checksum:'nasa-hash',last_fetched_at:'2026-09-17'}}}
}
test.beforeEach(async({page})=>{
  await page.route('http://historical.test/**',route=>route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}))
  await page.goto('http://historical.test/')
  const overrides=await readFile(path.resolve('app/overrides.css'),'utf8')
  await page.setContent('<style>'+MEDSHIELD_STYLE+'\n'+overrides+'</style><div class="medshield-root"><div id="page-revenue"></div></div>')
  await page.addScriptTag({path:path.resolve('node_modules/chart.js/dist/chart.umd.js')})
  const scripts=Object.fromEntries(await Promise.all(['sales-output-sections','historical-comparison-panel'].map(async name=>[name,ts.transpileModule(await readFile(path.resolve('services/api/'+name+'.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText])))
  await page.evaluate(({scripts,data})=>{
    const app=window as any;app.__historyFail=false;app.__historyInvalid=false
    const modules:Record<string,any>={'chart.js/auto':{default:app.Chart},'./api-client':{getJson:async()=>{if(app.__historyFail)throw Error('outage');return app.__historyInvalid?{...data,scope:{...data.scope,territory:'Other'}}:(app.__historyPayload??data)}}}
    const load=(name:string)=>{if(modules[name])return modules[name];const module={exports:{} as any};new Function('require','module','exports',scripts[name])(load,module,module.exports);return module.exports}
    const root=document.querySelector<HTMLElement>('.medshield-root')!
    load('sales-output-sections').installSalesOutputSections(root)
    app.__disposeHistorical=load('historical-comparison-panel').installHistoricalComparisonPanel(root)
  },{scripts,data:fixture()})
  await page.getByRole('tab',{name:'Disease & weather',exact:true}).click()
  await expect(page.locator('#historicalContextStatus')).toContainText('Historical sources loaded')
})

for(const width of [1440,390])test(`historical comparison preserves independent units and CSV at ${width}px`,async({page},info)=>{
  await page.setViewportSize({width,height:1000})
  await expect(page.locator('#historicalContextScope')).toContainText('Topbar filters do not change this pilot')
  await expect(page.locator('#historicalContextCharts canvas')).toHaveCount(5)
  const values=await page.evaluate(()=>['sales','disease','tayabas','alabat','nasa'].map(key=>{const chart=(window as any).Chart.getChart(document.getElementById('historicalChart-'+key));return {values:chart.data.datasets[0].data,unit:chart.options.scales.y.title.text,spanGaps:chart.data.datasets[0].spanGaps}}))
  expect(values.map(v=>v.unit)).toEqual(['PHP','reported cases','mm','mm','mm'])
  expect(values[0].values[0]).toBe(-12.34);expect(values[1].values[0]).toBeNull();expect(values.every(v=>v.spanGaps===false)).toBe(true)
  await page.selectOption('#historicalContextYear','2025')
  await expect(page.locator('#historicalContextTable tbody tr')).toHaveCount(12)
  await expect(page.getByRole('region',{name:'PAGASA Tayabas station rainfall'})).toContainText('No observations')
  await expect(page.locator('#historicalContextCharts canvas')).toHaveCount(3)
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export comparison CSV'}).click()
  const csv=await readFile((await(await download).path())!,'utf8')
  const cells=csv.trim().replace(/^\uFEFF/,'').split('\r\n').map(row=>[...row.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replace(/""/g,'"')))
  expect(cells).toHaveLength(13);expect(cells[1][0]).toBe('2025-01');expect(cells[1][3]).toBe('');expect(cells[1][5]).toBe('156')
  expect(cells[1][cells[0].indexOf('financial_publication_id')]).toBe('financial-fixture')
  expect(cells[1][cells[0].indexOf('alignment')]).toBe('same_calendar_month')
  await page.selectOption('#historicalContextYear','2024')
  await expect(page.locator('#historicalContextTable tbody tr').first()).toContainText('₱0.00')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.locator('#historicalComparisonPanel').screenshot({path:info.outputPath('historical-'+width+'.png')})
})

test('source failure and wrong scope clear stale tables, plots and exports; reload recovers',async({page})=>{
  await page.evaluate(()=>{(window as any).__historyFail=true})
  await page.getByRole('button',{name:'Reload sources'}).click()
  await expect(page.locator('#historicalContextStatus')).toContainText('unavailable from Databricks')
  await expect(page.locator('#historicalContextTable tbody tr')).toHaveCount(0)
  await expect(page.locator('#historicalContextCharts canvas')).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Export comparison CSV'})).toBeDisabled()
  await page.evaluate(()=>{(window as any).__historyFail=false;(window as any).__historyInvalid=true})
  await page.getByRole('button',{name:'Reload sources'}).click()
  await expect(page.locator('#historicalContextStatus')).toContainText('unavailable from Databricks')
  await page.evaluate(()=>{(window as any).__historyInvalid=false})
  await page.getByRole('button',{name:'Reload sources'}).click()
  await expect(page.locator('#historicalContextTable tbody tr')).toHaveCount(108)
  await page.evaluate(()=>(window as any).__disposeHistorical())
  await expect(page.locator('#historicalComparisonPanel')).toHaveCount(0)
})

test('keyboard tab activation loads context and retains year selection across navigation',async({page})=>{
  await page.selectOption('#historicalContextYear','2023')
  await page.getByRole('tab',{name:'Seasonality',exact:true}).click()
  await page.getByRole('tab',{name:'Seasonality',exact:true}).press('ArrowRight')
  await expect(page.getByRole('tab',{name:'Disease & weather',exact:true})).toHaveAttribute('aria-selected','true')
  await expect(page.locator('#historicalContextYear')).toHaveValue('2023')
  await expect(page.locator('#historicalContextTable tbody tr')).toHaveCount(12)
})

test('verified warehouse capture agrees across all chart points, exact table cells and exported CSV',async({page},info)=>{
  const recorded=JSON.parse(await readFile(path.resolve('../outputs/historical_comparison_ui_20261025/gateway-live.json'),'utf8'))
  await page.evaluate(value=>{(window as any).__historyPayload=value},recorded)
  await page.getByRole('button',{name:'Reload sources'}).click()
  await expect(page.locator('#historicalContextSummary')).toContainText('78 with recorded sales')
  const charts=await page.evaluate(()=>['sales','disease','tayabas','alabat','nasa'].map(key=>(window as any).Chart.getChart(document.getElementById('historicalChart-'+key)).data.datasets[0].data))
  for(let key=0;key<keys.length;key++)expect(charts[key]).toEqual(recorded.rows.map((row:any)=>row[keys[key]]))
  const cells=await page.locator('#historicalContextTable tbody tr').evaluateAll(rows=>rows.map(row=>Array.from(row.querySelectorAll('td')).map(cell=>cell.textContent)))
  expect(cells).toHaveLength(108)
  for(let index=0;index<108;index++){
    expect(cells[index][0]).toBe(recorded.rows[index].period)
    for(let key=0;key<keys.length;key++){
      const raw=recorded.rows[index][keys[key]],text=cells[index][key+1]
      if(raw===null)expect(text).toBe('Unavailable')
      else expect(Number(text!.replace(/[₱,]/g,''))).toBeCloseTo(raw,2)
    }
  }
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export comparison CSV'}).click()
  const csv=await readFile((await(await pending).path())!,'utf8')
  const parsed=csv.replace(/^\uFEFF/,'').split('\r\n').map(row=>[...row.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replace(/""/g,'"')))
  expect(parsed).toHaveLength(109)
  for(let index=0;index<108;index++){
    expect(parsed[index+1][0]).toBe(recorded.rows[index].period)
    for(let key=0;key<keys.length;key++)expect(parsed[index+1][key+1]).toBe(recorded.rows[index][keys[key]]===null?'':String(recorded.rows[index][keys[key]]))
    expect(parsed[index+1][parsed[0].indexOf('financial_publication_id')]).toBe(recorded.release.financial_publication.publication_id)
    expect(parsed[index+1][parsed[0].indexOf('context_checksum')]).toBe(recorded.checksum)
  }
  await page.setViewportSize({width:1440,height:1000})
  await page.selectOption('#historicalContextYear','2024')
  await page.locator('#historicalComparisonPanel').screenshot({path:info.outputPath('warehouse-history-desktop.png')})
  await page.setViewportSize({width:490,height:900})
  await page.locator('#historicalComparisonPanel').screenshot({path:info.outputPath('warehouse-history-side-panel.png')})
})
