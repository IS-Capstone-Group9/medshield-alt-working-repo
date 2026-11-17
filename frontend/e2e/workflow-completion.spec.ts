import {test,expect,type Page} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'
import {MEDSHIELD_STYLE,MEDSHIELD_MARKUP} from '../lib/medshieldReference'
import {getExecutableDashboardScript} from '../services/api/dashboard-engine'

const evidencePath=path.resolve('../outputs/workflow_completion_20261025/gateway-current-research.json')
async function research(page:Page,width=1440){
  const data=JSON.parse(await readFile(evidencePath,'utf8'))
  await page.route('http://workflow.test/**',(r:any)=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}))
  await page.goto('http://workflow.test/');await page.setViewportSize({width,height:1000})
  const css=await readFile('app/overrides.css','utf8')
  await page.setContent('<style>'+MEDSHIELD_STYLE+css+'</style><main class="medshield-root"><div class="page active"><div data-forecast-validation></div></div></main>')
  await page.addScriptTag({path:path.resolve('node_modules/chart.js/dist/chart.umd.js')})
  const script=ts.transpileModule(await readFile('services/api/current-research-panel.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
  await page.evaluate(({script,data}:any)=>{const w=window as any;w.__data=data;w.__fail=false;w.__invalid=false;const exports:any={};new Function('require','exports',script)((id:string)=>id==='chart.js/auto'?{default:w.Chart}:{getJson:async()=>{if(w.__fail)throw Error('warehouse unavailable');return w.__invalid?{...w.__data,publication_approved:true}:w.__data}},exports);w.__dispose=exports.installCurrentResearchPanel(document.querySelector('.medshield-root'))},{script,data})
  await expect(page.locator('#currentResearchMetrics')).toContainText('56.96%')
  return data
}
test('Gold replay preserves all model cases, frozen selection, errors, exact chart/table/CSV and future nulls',async({page})=>{
  const data=await research(page)
  await expect(page.locator('#currentResearchSelection')).toContainText('last_value')
  await page.locator('summary').filter({hasText:'Exact monthly values'}).click()
  for(const model of data.comparisons){
    await page.selectOption('#currentResearchModel',model.model_id)
    for(const stage of ['retrospective_audit','retrospective_extension_2026']){
      await page.selectOption('#currentResearchStage',stage)
      const expected=data.points.filter((p:any)=>p.model_id===model.model_id&&p.stage===stage)
      await expect(page.locator('#currentResearchPoints tbody tr')).toHaveCount(expected.length)
      const table=await page.locator('#currentResearchPoints tbody tr').evaluateAll(rows=>rows.map(row=>Array.from(row.querySelectorAll('td'),cell=>cell.textContent)))
      const money=(v:number|null)=>v===null?'Unavailable':'₱'+v.toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})
      expect(table).toEqual(expected.map((p:any)=>[p.target_period,p.origin_period,String(p.lead_months),money(p.actual),money(p.prediction),money(p.prediction===null?null:p.prediction-p.actual)]))
      const plotted=await page.evaluate(()=>{const w=window as any;const c=w.Chart.getChart(document.querySelector('#currentResearchChart'));return {labels:c.data.labels,values:c.data.datasets.map((d:any)=>d.data)}})
      expect(plotted.labels).toEqual(expected.map((p:any)=>p.target_period));expect(plotted.values).toEqual([expected.map((p:any)=>p.actual),expected.map((p:any)=>p.prediction)])
      const dl=page.waitForEvent('download');await page.locator('#currentResearchExport').click();const csv=await readFile((await(await dl).path())!,'utf8')
      const cells=csv.trim().replace(/^\uFEFF/,'').split('\r\n').map(row=>[...row.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replace(/""/g,'"')))
      expect(cells.length).toBe(expected.length+1)
      for(let i=0;i<expected.length;i++){expect(cells[i+1][2]).toBe(expected[i].target_period);expect(Number(cells[i+1][5])).toBe(expected[i].actual);expect(cells[i+1][6]===''?null:Number(cells[i+1][6])).toBe(expected[i].prediction);expect(cells[i+1][13]).toBe(data.source.artifact_sha256)}
    }
  }
  await page.selectOption('#currentResearchStage','future');await expect(page.locator('#currentResearchModel')).toBeDisabled()
  await expect(page.locator('#currentResearchMetrics')).toContainText('errors are unavailable')
  const future=await page.evaluate(()=>(window as any).Chart.getChart(document.querySelector('#currentResearchChart')).data.datasets[0].data)
  expect(future).toEqual(Array(12).fill(null))
  await page.selectOption('#currentResearchStage','retrospective_extension_2026');await expect(page.locator('#currentResearchModel')).toBeEnabled()
  await page.screenshot({path:'../outputs/workflow_completion_20261025/research-desktop.png',fullPage:true})
})
test('narrow research view clears stale values on warehouse or publication mismatch, recovers and disposes',async({page})=>{
  await research(page,490)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:'../outputs/workflow_completion_20261025/research-side-panel.png',fullPage:true})
  for(const kind of ['__fail','__invalid']){
    await page.evaluate(k=>{(window as any)[k]=true},kind);await page.locator('#currentResearchReload').click()
    await expect(page.locator('#currentResearchStatus')).toContainText('unavailable');await expect(page.locator('#currentResearchExport')).toBeDisabled();await expect(page.locator('#currentResearchPoints')).toBeEmpty()
    expect(await page.evaluate(()=>(window as any).Chart.getChart(document.querySelector('#currentResearchChart'))??null)).toBeNull()
    await page.evaluate(k=>{(window as any)[k]=false},kind);await page.locator('#currentResearchReload').click();await expect(page.locator('#currentResearchMetrics')).toContainText('56.96%')
  }
  await page.evaluate(()=>(window as any).__dispose());await expect(page.locator('.current-research')).toHaveCount(0)
})

async function planning(page:Page){
  await page.route('http://planning-draft.test/**',(r:any)=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));await page.goto('http://planning-draft.test/')
  await page.setContent('<style>'+MEDSHIELD_STYLE+'</style><main class="medshield-root">'+MEDSHIELD_MARKUP+'</main>')
  await page.evaluate(()=>{window.fetch=async()=>new Response('{}',{status:503})})
  await page.addScriptTag({path:path.resolve('node_modules/chart.js/dist/chart.umd.js')});await page.evaluate(getExecutableDashboardScript())
  const script=ts.transpileModule(await readFile('services/api/planning-drafts.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
  await page.evaluate(script=>{const w=window as any;w.showPage('inventory');w.setPlanningData({products:[{product:'A',revenue:100,quantity:10,observed_months:12,revenue_share_pct:100}],source:{file:'Gold fixture',checksum:'source-1',excluded:{}},scope:{sector:'All',territory:'Quezon'},territories:['Quezon'],eligible_products:1,period_start:'2025-10',period_end:'2026-09',shortlist_share_pct:100});const exports:any={};new Function('exports',script)(exports);w.__draftDispose=exports.installPlanningDrafts(document.querySelector('.medshield-root'))},script)
}
test('planning draft round-trips blanks and zeros, clears approval and requires identical source and scope',async({page})=>{
  await planning(page)
  await expect(page.locator('[data-plan-index="0"][data-plan-field="demand"]')).toHaveValue('')
  await page.locator('[data-plan-field="stock"]').fill('0');await page.locator('[data-plan-field="pack_cost"]').fill('1.25');await page.locator('#planAcknowledged').check()
  const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Save input draft'}).click();const raw=await readFile((await(await dl).path())!,'utf8'),draft=JSON.parse(raw)
  expect(draft.request.acknowledged).toBe(false);expect(draft.request.items[0].demand).toBe('');expect(draft.request.items[0].stock).toBe('0')
  await page.locator('[data-plan-field="stock"]').fill('19')
  await page.locator('[data-draft-file]').setInputFiles({name:'draft.json',mimeType:'application/json',buffer:Buffer.from(raw)})
  await expect(page.locator('[data-draft-status]')).toContainText('Draft loaded');await expect(page.locator('[data-plan-field="stock"]')).toHaveValue('0');await expect(page.locator('#planAcknowledged')).not.toBeChecked();await expect(page.locator('#planExport')).toBeDisabled();await expect(page.locator('#planResults')).toBeEmpty()
  await page.locator('#planAcknowledged').check();await page.locator('[data-plan-field="stock"]').fill('19');await expect(page.locator('#planAcknowledged')).not.toBeChecked()
  await page.locator('#planAcknowledged').check();await page.locator('#planBudget').fill('100');await expect(page.locator('#planAcknowledged')).not.toBeChecked()
  for(const change of [(d:any)=>d.request.checksum='changed',(d:any)=>d.request.scope.territory='Albay',(d:any)=>d.request.items[0].product='B',(d:any)=>d.request.acknowledged=true]){
    const bad=JSON.parse(raw);change(bad);await page.locator('[data-plan-field="stock"]').fill('19');await page.locator('[data-draft-file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await expect(page.locator('[data-draft-status]')).not.toContainText('Draft loaded');await expect(page.locator('[data-plan-field="stock"]')).toHaveValue('19')
  }
  await page.screenshot({path:'../outputs/workflow_completion_20261025/planning-drafts.png',fullPage:true})
})
test('malformed/oversized planning files and missing source never restore sample or stale approval',async({page})=>{
  await planning(page)
  for(const buffer of [Buffer.from('bad JSON'),Buffer.alloc(100001,32)]){
    await page.locator('[data-draft-file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer});await expect(page.locator('[data-draft-status]')).not.toBeEmpty();await expect(page.locator('[data-plan-field="demand"]')).toHaveValue('')
  }
  await page.evaluate(()=>(window as any).setPlanningData(null,'Warehouse unavailable'));await page.getByRole('button',{name:'Save input draft'}).click();await expect(page.locator('[data-draft-status]')).toContainText('Load source evidence first')
})
