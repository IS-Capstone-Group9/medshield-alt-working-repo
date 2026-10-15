import { test, expect } from '@playwright/test'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

test('area ranking keeps buyer ownership separate from mapped geography', async ({ page }) => {
  await page.route('http://medshield.test/**', route => route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
  await page.evaluate(()=>{window.fetch=async()=>new Response('{}',{status:503})})
  await page.addScriptTag({path:path.resolve('node_modules/chart.js/dist/chart.umd.js')})
  await page.evaluate(script=>new Function(script)(),getExecutableDashboardScript())
  await page.evaluate(()=>{
    const app=window as any
    app.setDescriptivePeriod('custom');app.setYear('2025');app.showPage('territory')
    const row=(sector:string,channel:string,territory:string,revenue:number,quantity:number,period='2025-01',product='A')=>({sector,channel,territory,region:territory==='Unassigned geography'?null:'CALABARZON',revenue,quantity,period,product,row_count:1,basis:'Test fixture'})
    app.setSalesSectorsData({rows:[row('Government','Unclassified channel','Quezon',1000,10),row('Private','Hospital','Quezon',100,90),row('Private','Pharma','Batangas',300,10),row('Private','Hospital','Quezon',200,20,'2024-01'),row('Unknown','Hospital','Unassigned geography',500,30),row('Internal','Internal','Unassigned geography',50,5),row('Private','Pharma','Batangas',900,100,'2025-01','B')],source:{file:'test fixture',excluded:{}}})
  })
  await expect(page.locator('#growthChart')).not.toBeVisible()
  await expect(page.locator('#revenueHeatmapGrid')).not.toBeVisible()
  await page.selectOption('#sectorCluster','Private')
  await page.selectOption('#sectorProduct','A')
  await page.evaluate(()=>(window as any).setYear('2025'))
  await expect(page.locator('#sectorProfileTable')).toContainText('Batangas')
  await expect(page.locator('#sectorProfileTable')).toContainText('Quezon')
  await expect(page.locator('#sectorProfileTable')).toContainText('Private 100.0%')
  const regionalSeries=()=>page.evaluate(()=>{
    const chart=(window as any).Chart.getChart(document.getElementById('sectorRevenueChart'))
    return {labels:chart.data.labels,values:chart.data.datasets[0].data}
  })
  expect(await regionalSeries()).toEqual({labels:['CALABARZON'],values:[400]})
  await page.selectOption('#sectorCluster','Unknown')
  await expect(page.locator('#sectorStatus')).toContainText('No revenue is available')
  await expect(page.locator('#areaMappingCoverage')).toHaveText('0.0% mapped')
  await page.selectOption('#sectorCluster','All')
  await expect(page.locator('#sectorProfileTable')).not.toContainText('Unassigned geography')
  await page.screenshot({path:test.info().outputPath('sectors.png'),fullPage:true})
  await page.evaluate(()=>(window as any).setYear('2022'))
  await expect(page.locator('#sectorStatus')).toContainText('No revenue is available')
  await page.evaluate(()=>(window as any).setSalesSectorsData(null,'Service unavailable'))
  await expect(page.locator('#sectorProfileTable')).toBeEmpty()
  await expect(page.locator('#sectorStatus')).toHaveText('Service unavailable')
})

test('product prioritization follows trailing periods and custom-range monthly granularity', async ({ page }) => {
  await page.route('http://medshield.test/**', route => route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
  await page.evaluate(()=>{window.fetch=async()=>new Response('{}',{status:503})})
  await page.addScriptTag({path:path.resolve('node_modules/chart.js/dist/chart.umd.js')})
  await page.evaluate(script=>new Function(script)(),getExecutableDashboardScript())
  await page.evaluate(()=>{
    const app=window as any,row=(product:string,period:string,revenue:number,returnsValue=0)=>({date:period+'-28',sector:'Private',channel:'Pharma',territory:'Quezon',revenue,positive_sales:revenue-returnsValue,returns_value:returnsValue,quantity:10,period,product,row_count:1,basis:'fixture'})
    const currentRows=Array.from({length:30},(_,index)=>row('Product '+String(index+1).padStart(2,'0'),'2025-02',3000-index*50,index===0?-100:0))
    const priorRows=Array.from({length:10},(_,index)=>row('Prior Product '+String(index+1).padStart(2,'0'),'2024-06',10000-index*500))
    app.setSalesSectorsData({rows:[...currentRows,...priorRows],source:{file:'fixture',excluded:{}}})
    app.showPage('products');app.setDescriptivePeriod('custom');app.setYear('2025');app.setProductCohort('5')
  })
  await expect(page.locator('#btnYoyYear')).toHaveCount(0)
  const signedSales = await page.evaluate(() => {
    const data = (window as any).Chart.getChart(document.getElementById('productBarChart')).data
    return { labels: data.datasets.map((dataset: any) => dataset.label), positive: data.datasets[0].data, returns: data.datasets[1].data }
  })
  expect(signedSales.labels).toEqual(['Positive amounts (₱)', 'Negative adjustments (₱)'])
  expect(signedSales.positive).toEqual([3100, 2950])
  expect(signedSales.returns).toEqual([-100, 0])
  expect(signedSales.positive.map((value: number, index: number) => value + signedSales.returns[index])).toEqual([3000, 2950])
  await expect(page.locator('#productPriorityScope')).toContainText('ABC policy candidate')
  await expect(page.locator('#productTable tbody tr')).toHaveCount(2)
  await page.selectOption('#productCohortSelect','10')
  await expect(page.locator('#productTable tbody tr')).toHaveCount(3)
  await page.selectOption('#productCohortSelect','20')
  await expect(page.locator('#productTable tbody tr')).toHaveCount(6)
  const ranks = () => page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('paretoCurveChart')).data.labels)
  expect(await ranks()).toEqual([1,2,3,4,5,6])
  await page.evaluate(()=>(window as any).setCustomDateRange('2024-01-01','2024-12-31'))
  await expect(page.locator('#productTable tbody tr')).toHaveCount(2)
  expect(await page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('productBarChart')).data.labels)).toEqual(['Prior Product 01','Prior Product 02'])
  await page.selectOption('#descriptivePeriodSelect','all')
  await expect(page.locator('#productTable tbody tr')).toHaveCount(8)
  expect(await ranks()).toEqual([1,2,3,4,5,6,7,8])
  await page.selectOption('#descriptivePeriodSelect','custom')
  await page.evaluate(()=>(window as any).setCustomDateRange('2024-06-01','2024-06-30'))
  await expect(page.locator('#productTable tbody tr')).toHaveCount(2)
  expect(await page.evaluate(()=>(window as any).setCustomDateRange('2030-01-01','2030-12-31'))).toBe(false)
  await page.evaluate(()=>(window as any).setCustomDateRange('2023-01-01','2023-12-31'))
  await expect(page.locator('#productTable')).toContainText('No observed product sales')

})

test('custom date range anchors to the date range and keeps missing days as gaps', async ({ page }) => {
  await page.route('http://medshield.test/**', route => route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
  await page.evaluate(()=>{window.fetch=async()=>new Response('{}',{status:503})})
  await page.addScriptTag({path:path.resolve('node_modules/chart.js/dist/chart.umd.js')})
  await page.evaluate(script=>new Function(script)(),getExecutableDashboardScript())
  await page.evaluate(()=>{
    const app=window as any
    app.setDescriptivePeriod('custom')
    app.setCustomDateRange('2024-06-01', '2024-06-30')
    app.setSalesSectorsData({rows:[{date:'2024-06-30',period:'2024-06',product:'A',sector:'Private',channel:'Pharma',territory:'Quezon',revenue:500,quantity:10,row_count:1,basis:'fixture'}],source:{file:'fixture',excluded:{}}})
  })
  const chart=await page.evaluate(()=>{
    const view=(window as any).Chart.getChart(document.getElementById('overviewBaselineChart'))
    return {labels:view.data.labels,data:view.data.datasets[0].data}
  })
  expect(chart.labels).toHaveLength(30)
  expect(chart.data).toHaveLength(30)
  expect(chart.data.slice(0,29)).toEqual(Array(29).fill(null))
  expect(chart.data[29]).toBe(500)
  await expect(page.locator('#singleYearWrap')).toBeHidden()
})
