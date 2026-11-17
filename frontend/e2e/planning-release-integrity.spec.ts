import {test,expect} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'
import {MEDSHIELD_STYLE,MEDSHIELD_MARKUP} from '../lib/medshieldReference'
import {getExecutableDashboardScript} from '../services/api/dashboard-engine'

test('fresh Gold shortlist, synthetic gateway allocation, CSV and draft identities agree through source changes',async({page})=>{
  const directory='../outputs/planning_release_integrity_20261025/'
  const shortlist=JSON.parse(await readFile(directory+'warehouse-shortlist.json','utf8'))
  const scenario=JSON.parse(await readFile(directory+'synthetic-scenario-control.json','utf8'))
  await page.route('http://planning-integrity.test/**',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));await page.goto('http://planning-integrity.test/')
  const overrides=await readFile('app/overrides.css','utf8')
  await page.setContent('<style>'+MEDSHIELD_STYLE+overrides+'</style><main class="medshield-root">'+MEDSHIELD_MARKUP+'</main>')
  await page.evaluate(()=>{window.fetch=async()=>new Response('{}',{status:503})});await page.addScriptTag({path:path.resolve('node_modules/chart.js/dist/chart.umd.js')});await page.evaluate(getExecutableDashboardScript())
  const script=ts.transpileModule(await readFile('services/api/planning-drafts.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
  await page.evaluate(({script,shortlist})=>{const w=window as any;w.showPage('inventory');w.setPlanningData(shortlist);const exports:any={};new Function('exports',script)(exports);exports.installPlanningDrafts(document.querySelector('.medshield-root'))},{script,shortlist})
  await expect(page.locator('#planInputs tbody tr')).toHaveCount(shortlist.products.length)
  for(let i=0;i<shortlist.products.length;i++)for(const key of ['demand','stock','reserve','pack','pack_cost','max_packs'])await expect(page.locator(`[data-plan-index="${i}"][data-plan-field="${key}"]`)).toHaveValue('')
  for(let i=0;i<scenario.body.items.length;i++)for(const key of ['demand','stock','reserve','pack','pack_cost','max_packs'])await page.locator(`[data-plan-index="${i}"][data-plan-field="${key}"]`).fill(String(scenario.body.items[i][key]))
  await page.locator('#planHorizon').selectOption('3');await page.locator('#planBudget').fill(String(scenario.body.budget));await page.locator('#planMinimum').fill('100');await page.locator('#planAcknowledged').check()
  const request=await page.evaluate(()=>(window as any).getPlanningRequest())
  expect(request.checksum).toBe(shortlist.source.checksum);expect(request.scope).toEqual(shortlist.scope)
  for(let i=0;i<request.items.length;i++)for(const key of ['demand','stock','reserve','pack','pack_cost','max_packs'])expect(Number(request.items[i][key])).toBe(scenario.body.items[i][key])
  await page.evaluate(result=>(window as any).setPlanningResult(result),scenario.allocation)
  await expect(page.locator('#kpiPlanServiceLevel')).toContainText('100%')
  const csvDownload=page.waitForEvent('download');await page.locator('#planExport').click()
  const csv=await readFile((await(await csvDownload).path())!,'utf8')
  const cells=csv.trim().replace(/^\uFEFF/,'').split('\r\n').map(row=>[...row.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replace(/""/g,'"')))
  expect(cells.length).toBe(shortlist.products.length+1)
  for(let i=0;i<scenario.allocation.rows.length;i++){
    const expected=scenario.allocation.rows[i],row=cells[i+1]
    expect(row[1]).toBe(expected.product);expect(Number(row[11])).toBe(expected.purchase_packs);expect(Number(row[13])).toBe(expected.fulfilled);expect(Number(row[16])).toBe(expected.spend);expect(row[20]).toBe(shortlist.source.checksum)
  }
  // Browser-valid decimal and exponent values must remain portable without changing their entered text.
  await page.locator('[data-plan-index="0"][data-plan-field="pack_cost"]').fill('.25');await page.locator('#planBudget').fill('1e3')
  const draftDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Save input draft'}).click();const draft=await readFile((await(await draftDownload).path())!,'utf8')
  expect(JSON.parse(draft).request.budget).toBe('1e3');expect(JSON.parse(draft).request.items[0].pack_cost).toBe('.25')
  const changed={...shortlist,source:{...shortlist.source,checksum:'f'.repeat(64),release:{...shortlist.source.release,fact_delta_version:1}}}
  await page.evaluate(data=>(window as any).setPlanningData(data),changed)
  await page.locator('[data-draft-file]').setInputFiles({name:'prior-release.json',mimeType:'application/json',buffer:Buffer.from(draft)})
  await expect(page.locator('[data-draft-status]')).toContainText('source or buyer/territory scope differs');await expect(page.locator('[data-plan-field="demand"]').first()).toHaveValue('')
  await page.evaluate(data=>(window as any).setPlanningData(data),shortlist)
  await page.locator('[data-draft-file]').setInputFiles({name:'same-release.json',mimeType:'application/json',buffer:Buffer.from(draft)})
  await expect(page.locator('[data-draft-status]')).toContainText('Draft loaded');await expect(page.locator('#planBudget')).toHaveValue('1e3');await expect(page.locator('[data-plan-index="0"][data-plan-field="pack_cost"]')).toHaveValue('.25');await expect(page.locator('#planAcknowledged')).not.toBeChecked();await expect(page.locator('#planExport')).toBeDisabled()
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:directory+'planning-desktop.png',fullPage:true})
  await page.setViewportSize({width:490,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:directory+'planning-side-panel.png',fullPage:true})
})
