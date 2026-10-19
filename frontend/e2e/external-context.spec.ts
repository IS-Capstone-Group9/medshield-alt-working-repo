import {test,expect} from '@playwright/test'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {MEDSHIELD_MARKUP,MEDSHIELD_STYLE} from '../lib/medshieldReference'
import {getExecutableDashboardScript} from '../services/api/dashboard-engine'
import {signInToReadyDashboard} from './helpers/dashboard'

const scope={sector:'Private',territory:'Quezon',product:'=formula-test',metric:'revenue',mode:'combined',provider:'PAGASA',disease:'Dengue',lag:1,rainfall_lag:1,unit:'₱ net sales'}
const context={status:'historical_context_candidate',sales_months:2,coobserved_months:1,join_ready_months:0,checksum:'fixture-context',limitations:['Mapping review pending'],rows:Array.from({length:108},(_,i)=>({
 period:new Date(Date.UTC(2017, i, 1)).toISOString().slice(0,7),sales:i===96?0:i===97?-50:null,
 signals:[{provider:'DOH',signal:'Dengue',unit:'reported cases',value:i===96?0:null,mapping_status:i===96?'pending':'no_observation'},
 {provider:'PAGASA',signal:'RAINFALL_TOTAL_MM',unit:'mm',value:i===96?10:null,mapping_status:i===96?'needs_review':'no_observation'}].map(s=>({...s,period:new Date(Date.UTC(2017,i-1,1)).toISOString().slice(0,7),lag:1,join_ready:false,observation_status:'candidate',station:null,source_dataset_version:'fixture',external_dataset_id:'fixture'}))
}))}
const fixture={status:'blocked',reason:'No approved external joins',scope,products:[scope.product],territories:['Quezon'],coverage:{sales_months:2,matched_months:0,signals:[]},sources:[],evaluation:[],context,sales_source:{checksum:'fixture-source'}}
const csvRows=(csv:string)=>csv.replace(/^\uFEFF/,'').trimEnd().split('\r\n').map(line=>[...line.matchAll(/"((?:[^"]|"")*)"/g)].map(m=>m[1].replace(/""/g,'"')))

test('context chart, table and export agree; pending mapping, signed/zero/missing and source failure survive',async({page})=>{
  await page.route('http://medshield.test/**',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style><div class="medshield-root">${MEDSHIELD_MARKUP}</div>`)
  // Match the stylesheet loaded by the real Next.js dashboard shell.
  await page.addStyleTag({path:path.resolve('app/medshield.css')})
  await page.addStyleTag({path:path.resolve('app/overrides.css')})
  await page.addScriptTag({path:path.resolve('node_modules/chart.js/dist/chart.umd.js')})
  await page.evaluate(script=>new Function(script)(),getExecutableDashboardScript())
  await page.evaluate(d=>{const w=window as any;w.showPage('forecast');(document.getElementById('externalRegressionDetails') as HTMLDetailsElement).open=true;w.setExternalRegressionData(d)},fixture)
  await expect(page.locator('#regContextSummary')).toContainText('2/108 months with net sales · 1 co-observed months · 0 with approved joins')
  await expect(page.locator('#regCharts')).toBeHidden()
  await expect(page.locator('#regContextTable tbody tr')).toHaveCount(108)
  const values=await page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('regContextSales')).data.datasets[0].data)
  expect(values).toEqual(context.rows.map(r=>r.sales))
  await page.locator('#regContext summary').filter({hasText:'Monthly context values and mapping status'}).click()
  await expect(page.locator('#regContextTable tbody tr').filter({has:page.getByRole('rowheader',{name:'2025-01',exact:true})})).toContainText('0 · 2024-12 · pending')
  const dl=page.waitForEvent('download');await page.locator('#regContextExport').click()
  const csv=await readFile((await (await dl).path())!,'utf8')
  expect(csv.trim().split('\r\n')).toHaveLength(109)
  expect(csv).toContain('"2025-02","-50"')
  expect(csv).toContain('"\'=formula-test"')
  expect(csv).toContain('"2017-01",""')
  const [headers,...records]=csvRows(csv)
  for(let i=0;i<108;i++){
    expect(records[i][1]).toBe(context.rows[i].sales===null?'':String(context.rows[i].sales))
    for(let j=0;j<2;j++)expect(records[i][headers.indexOf('signal_'+(j+1)+'_value')]).toBe(context.rows[i].signals[j].value===null?'':String(context.rows[i].signals[j].value))
  }
  await page.setViewportSize({width:390,height:844})
  await writeFile(path.resolve('../outputs/analytics_external_audit_20261020/mobile-overflow.json'),JSON.stringify(await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>window.innerWidth+1}).map(e=>({tag:e.tagName,id:e.id,class:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).slice(0,30)),null,2))
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
  await page.locator('[data-external-regression]').screenshot({style:'.topbar{visibility:hidden!important}',path:'../outputs/analytics_external_audit_20261020/context-mobile-fixture.png'})
  await page.evaluate(()=>(window as any).setExternalRegressionData(null,'Source unavailable'))
  await expect(page.locator('#regContext')).toBeHidden()
  await expect(page.locator('#regContextTable')).toBeEmpty()
  await expect(page.locator('#regContextExport')).toBeDisabled()
  expect(await page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('regContextSales'))===undefined)).toBe(true)
})

test('live Gold context responds to buyer and external-model filters',async({page})=>{
  test.setTimeout(180000)
  await signInToReadyDashboard(page)
  await page.locator('[data-dashboard-page="forecast"]').click()
  await page.locator('#externalRegressionDetails > summary').click()
  await expect(page.locator('#regContextSummary')).toContainText('months with net sales',{timeout:90000})
  await page.selectOption('#regSector','Private')
  const response=page.waitForResponse(r=>r.url().includes('/api/sales/external-regression?')&&r.url().includes('mode=combined')&&r.url().includes('sector=Private')&&r.ok())
  await page.selectOption('#regMode','combined')
  const evidence=await (await response).json()
  await expect(page.locator('#regContextSummary')).toContainText('Private · Quezon',{timeout:90000})
  await expect(page.locator('#regContextSummary')).toContainText('94/108 months with net sales')
  await expect(page.locator('#regContextSummary')).toContainText('79 co-observed months')
  const dl=page.waitForEvent('download');await page.locator('#regContextExport').click()
  const csv=await readFile((await (await dl).path())!,'utf8')
  expect(csv.trim().split('\r\n')).toHaveLength(109)
  const [headers,...records]=csvRows(csv)
  const plotted=await page.evaluate(()=>['regContextSales','regContextSignal0','regContextSignal1'].map(id=>(window as any).Chart.getChart(document.getElementById(id)).data.datasets[0].data))
  for(let i=0;i<108;i++){
    expect(records[i][0]).toBe(evidence.context.rows[i].period)
    expect(records[i][1]).toBe(evidence.context.rows[i].sales===null?'':String(evidence.context.rows[i].sales))
    expect(plotted[0][i]).toBe(evidence.context.rows[i].sales)
    for(let j=0;j<2;j++){
      const value=evidence.context.rows[i].signals[j].value
      expect(records[i][headers.indexOf('signal_'+(j+1)+'_value')]).toBe(value===null?'':String(value))
      expect(plotted[j+1][i]).toBe(value)
    }
  }
  await writeFile(path.resolve('../outputs/analytics_external_audit_20261020/context-displayed.csv'),csv)
  await page.locator('[data-external-regression]').screenshot({style:'.topbar{visibility:hidden!important}',path:'../outputs/analytics_external_audit_20261020/context-live.png'})
  await page.setViewportSize({width:390,height:844})
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
  await page.locator('[data-external-regression]').screenshot({style:'.topbar{visibility:hidden!important}',path:'../outputs/analytics_external_audit_20261020/context-mobile-live.png'})
  await page.selectOption('#regSector','Government')
  await expect(page.locator('#regContextSummary')).toContainText('Government · Quezon',{timeout:90000})
  await expect(page.locator('#regContextSummary')).toContainText('0/108 months with net sales')
  const out=path.resolve('../outputs/analytics_external_audit_20261020');await mkdir(out,{recursive:true})
  await writeFile(path.join(out,'browser-live.json'),JSON.stringify({scope:'Private/Quezon then Government/Quezon',csv_months:108,csv_measure_checks:324,chart_measure_checks:324,private_sales_months:94,coobserved:79,government_sales_months:0,publication:'blocked'},null,2))
})
