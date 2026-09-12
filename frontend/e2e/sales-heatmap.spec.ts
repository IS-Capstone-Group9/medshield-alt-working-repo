import { test, expect } from '@playwright/test'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

test('quantity heat map filters change cells, trend, index, year scope and exported data', async ({ page }) => {
  await page.route('http://medshield.test/**', route => route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
  await page.evaluate(()=>{window.fetch=async()=>new Response('{}',{status:503})})
  await page.addScriptTag({path:path.resolve('node_modules/chart.js/dist/chart.umd.js')})
  await page.evaluate(script=>new Function(script)(),getExecutableDashboardScript())
  await page.waitForFunction(()=>typeof (window as any).setSalesHeatmapData==='function')
  await page.evaluate(()=>{
    const app=window as any
    app.setComparisonMode('single');app.setYear('all');app.showPage('revenue')
    app.setSalesHeatmapData({products:[
      {id:'A',label:'Medicine A',category:'Analgesics',mapping_status:'approved',unit:'source units'},
      {id:'B',label:'Medicine B',category:'Antipyretics (proposed)',mapping_status:'proposed',unit:'source units'},
    ],monthly:[
      ...Array.from({length:12},(_,i)=>({product:'A',period:'2025-'+String(i+1).padStart(2,'0'),area:'Quezon',quantity:i===0?0:(i+1)*10,row_count:1})),
      {product:'A',period:'2024-01',area:'Quezon',quantity:15,row_count:1},
      {product:'B',period:'2025-01',area:'Quezon',quantity:900,row_count:1},
      {product:'B',period:'2025-01',area:'Batangas',quantity:100,row_count:1},
    ],source:{file:'reviewed-test',generated_at:'2026-09-12',included_rows:15,excluded:{estimated:2}}})
  })
  await expect(page.locator('#revenueHeatmapGrid tbody tr').first().locator('th')).toHaveText('2025')
  await expect(page.locator('[data-period="2025-01"]')).toHaveAttribute('data-value','0')
  await expect(page.locator('[data-period="2024-02"]')).toHaveAttribute('data-value','')
  await page.selectOption('#heatmapMeasure','index')
  await expect(page.locator('[data-period="2024-01"]')).toHaveAttribute('data-value','')
  await expect(page.locator('[data-period="2025-12"]')).not.toHaveAttribute('data-value','')
  await page.selectOption('#heatmapMeasure','units')
  await page.selectOption('#heatmapCategory','Antipyretics (proposed)')
  await expect(page.locator('#heatmapProduct')).toHaveValue('B')
  await expect(page.locator('#salesHeatmapTitle')).toContainText('Medicine B')
  await expect(page.locator('[data-period="2025-01"]')).toHaveAttribute('data-value','1000')
  await page.selectOption('#heatmapArea','Batangas')
  await expect(page.locator('[data-period="2025-01"]')).toHaveAttribute('data-value','100')
  expect(await page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('quantityTrendChart')).data.datasets[0].data.filter((x:any)=>x!==null))).toEqual([100])
  const downloadPromise=page.waitForEvent('download')
  await page.getByRole('button',{name:'Export CSV',exact:true}).click()
  const csv=await readFile((await (await downloadPromise).path())!,'utf8')
  expect(csv).toContain('"B","Antipyretics (proposed)","Batangas","2025-01","100"')
  expect(csv).not.toContain('1000')
  await page.evaluate(()=>(window as any).setYear('2025'))
  await expect(page.locator('#revenueHeatmapGrid tbody tr')).toHaveCount(1)
  await page.screenshot({path:'test-results/section-3-heatmap.png',fullPage:true})
  await page.evaluate(()=>(window as any).setSalesHeatmapData(null,'Service unavailable'))
  await expect(page.locator('#revenueHeatmapGrid')).toBeEmpty()
  await expect(page.locator('#heatmapStatus')).toHaveText('Service unavailable')
  expect(await page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('quantityTrendChart'))===undefined)).toBe(true)
})
