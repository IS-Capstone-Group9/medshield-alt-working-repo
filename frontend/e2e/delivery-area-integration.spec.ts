import {test,expect} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import path from 'node:path'
import {signInToReadyDashboard} from './helpers/dashboard'

test.use({trace:'off',video:'off',screenshot:'off'})
for(const width of [1440,390])test(`current area STL API/table accessibility and independent outage ${width}`,async({page},info)=>{
  test.setTimeout(180000)
  await page.setViewportSize({width,height:1000})
  let stl:any
  page.on('response',async r=>{if(new URL(r.url()).pathname==='/api/sales/delivery-area-stl'&&r.status()===200)stl=await r.json()})
  await signInToReadyDashboard(page)
  if(width<=1024)await page.locator('.nav-toggle').click()
  await page.locator('[data-dashboard-page="revenue"]').click()
  await page.locator('[data-sales-output-tab="so1"]').click()
  await expect(page.locator('#deliveryAreaStatus')).toContainText('9 common observed months',{timeout:90000})
  const panel=page.locator('.delivery-area-review')
  await panel.locator('details').evaluateAll(nodes=>nodes.forEach(node=>(node as HTMLDetailsElement).open=true))
  await page.locator('#deliveryAreaStlLoad').click()
  await expect(page.locator('#deliveryAreaStl')).toContainText('18 fitted components',{timeout:90000})
  expect(stl.source.fact_version).toBe(0);expect(stl.candidate_version).toBe(0)
  const expected=stl.series.filter((s:any)=>['QUEZON','BATANGAS'].includes(s.area)).flatMap((s:any)=>s.components
    .filter((p:any)=>p.period>='2026-01'&&p.period<='2026-09').map((p:any)=>({...p,area:s.area})))
  const rows=await page.locator('#deliveryAreaStlPoints tbody tr').evaluateAll(nodes=>nodes.map(node=>Array.from(node.querySelectorAll('td'),cell=>cell.textContent||'')))
  expect(rows).toHaveLength(18)
  const money=(s:string)=>Number(s.replace(/[^\d.−-]/g,'').replace('−','-'))
  for(let i=0;i<rows.length;i++){
    const p=expected[i];expect(rows[i][0]).toBe(p.area);expect(rows[i][1]).toBe(p.period)
    for(const [cell,key] of [[2,'observed_net_sales_php'],[3,'trend_php'],[4,'seasonal_php'],[5,'residual_php']] as const)expect(money(rows[i][cell])).toBeCloseTo(Number(p[key]),2)
  }
  await panel.evaluate(element=>Promise.all(element.getAnimations({subtree:true}).filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>undefined))))
  await page.addScriptTag({path:path.resolve('node_modules/axe-core/axe.min.js')})
  const violations=await panel.evaluate(async element=>{
    const result=await (window as any).axe.run(element,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})
    return result.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}))
  })
  await writeFile(info.outputPath('area-integration.json'),JSON.stringify({width,artifact:stl.artifact_sha256,source:stl.source,component_rows:rows.length,api_table_parity:true,violations},null,2))
  expect.soft(violations).toEqual([])
  for(const wrapper of await panel.locator('.area-scroll').all()){
    await expect(wrapper).toHaveAttribute('role','region')
    await expect(wrapper).toHaveAttribute('aria-label',/.+/)
    await wrapper.focus();await expect(wrapper).toBeFocused()
    const before=await wrapper.evaluate(node=>({left:node.scrollLeft,scroll:node.scrollWidth,width:node.clientWidth}))
    await wrapper.press('ArrowRight')
    if(before.scroll>before.width+1)await expect.poll(()=>wrapper.evaluate(node=>node.scrollLeft)).toBeGreaterThan(before.left)
  }
  await page.route('**/api/sales/delivery-area-stl',route=>route.fulfill({status:503,json:{code:'DELIVERY_AREA_STL_UNAVAILABLE'}}))
  await page.locator('#deliveryAreaStlLoad').click()
  await expect(page.locator('#deliveryAreaStl')).toContainText('Area STL unavailable')
  await expect(page.locator('#deliveryAreaStlPoints')).toBeEmpty()
  await expect(page.locator('#deliveryAreaStlExport')).toBeDisabled()
  await expect(page.locator('#deliveryAreaExport')).toBeEnabled()
  await expect(page.locator('#deliveryAreaChartWrap')).toBeVisible()
  await page.unroute('**/api/sales/delivery-area-stl')
  const previous=stl.artifact_sha256
  await page.locator('#deliveryAreaStlLoad').click()
  await expect(page.locator('#deliveryAreaStl')).toContainText('18 fitted components',{timeout:90000})
  expect(stl.artifact_sha256).toBe(previous)
  await page.locator('#deliveryAreaStlExport').scrollIntoViewIfNeeded()
  await page.screenshot({path:info.outputPath(`stl-recovered-${width}.png`),animations:'disabled'})
})
