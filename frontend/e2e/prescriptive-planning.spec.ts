import { test, expect } from '@playwright/test'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

function fixture() {
  const data=JSON.parse(execFileSync('python',['-c',"import json; from services.tests.test_prescriptive_planning import planning_fixture; from services.analytics_service.prescriptive_planning import solve_plan; s,b=planning_fixture(); print(json.dumps(dict(shortlist=s,body=b,result=solve_plan(b,s))))"],{cwd:path.resolve('..'),encoding:'utf8'}))
  data.result.status='scenario_allocation'
  return data
}

test('planning inputs, real solver allocation, chart and exported assumptions agree',async({page})=>{
  await page.route('http://medshield.test/**',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
  await page.evaluate(()=>{window.fetch=async()=>new Response('{}',{status:503})})
  await page.addScriptTag({path:path.resolve('node_modules/chart.js/dist/chart.umd.js')})
  await page.evaluate(script=>new Function(script)(),getExecutableDashboardScript())
  const data=fixture()
  await page.evaluate(d=>{const w=window as any;w.showPage('inventory');w.setPlanningData(d.shortlist)},data)
  await expect(page.locator('#planInputs tbody tr')).toHaveCount(2)
  await expect(page.locator('[data-plan-field="demand"]').first()).toHaveValue('')
  for(let i=0;i<2;i++)for(const key of ['demand','stock','reserve','pack','pack_cost','max_packs'])await page.locator(`[data-plan-index="${i}"][data-plan-field="${key}"]`).fill(String(data.body.items[i][key]))
  await page.locator('#planBudget').fill('100')
  await page.locator('#planAcknowledged').check()
  const request=await page.evaluate(()=>(window as any).getPlanningRequest())
  expect(request.items[0].pack).toBe('3')
  expect(request.acknowledged).toBe(true)
  await page.evaluate(()=>{(window as any).solveEvents=0;window.addEventListener('medshield:planning-solve',()=>{(window as any).solveEvents++})})
  await page.locator('#planSolve').click()
  expect(await page.evaluate(()=>(window as any).solveEvents)).toBe(1)
  await page.evaluate(d=>(window as any).setPlanningResult(d.result),data)
  await expect(page.locator('#planResultStatus')).toContainText('Draft allocation under entered constraints')
  expect(await page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('planFulfillmentChart')).data.datasets[0].data)).toEqual(data.result.rows.map((r:any)=>r.fulfillment_pct))
  const download=page.waitForEvent('download');await page.locator('#planExport').click()
  const csv=await readFile((await(await download).path())!,'utf8')
  expect(csv).toContain('Scenario only');expect(csv).toContain('"fixture"');expect(csv).toContain('units_per_pack')
  await page.evaluate(()=>window.scrollTo(0,0))
  await page.screenshot({path:'test-results/section-7-planning.png',fullPage:true})
  await page.locator('#planBudget').fill('50')
  await expect(page.locator('#planExport')).toBeDisabled()
  await expect(page.locator('#planResults')).toBeEmpty()
  expect(await page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('planFulfillmentChart'))===undefined)).toBe(true)
  await page.evaluate(()=>(window as any).setPlanningResult({status:'infeasible',conflicts:['Budget cannot meet minimum'],rows:[]}))
  await expect(page.locator('#planResultStatus')).toContainText('No allocation published')
  await page.setViewportSize({width:390,height:844})
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.evaluate(()=>window.scrollTo(0,0))
  await page.screenshot({path:'test-results/section-7-planning-mobile.png',fullPage:true})
  await page.evaluate(()=>(window as any).setPlanningData(null,'Service unavailable'))
  await expect(page.locator('#planInputs')).toBeEmpty()
  await expect(page.locator('#planSolve')).toBeDisabled()
})
