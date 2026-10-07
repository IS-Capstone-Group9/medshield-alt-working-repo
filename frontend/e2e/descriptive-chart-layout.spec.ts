import { test, expect } from '@playwright/test'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'
import { salesMonthlyMovement } from '../services/api/sales-movement-view'

test('monthly movement retains zero and negative values without bridging estimates or gaps', () => {
  const rows = salesMonthlyMovement([
    {period:'2024-12',revenue:100},{period:'2025-01',revenue:0},
    {period:'2025-03',revenue:-10},{period:'2025-04',revenue:20},
    {period:'2025-05',revenue:500,evidence:'estimate'},
  ], ['2024-12','2025-01','2025-02','2025-03','2025-04','2025-05'])
  expect(rows.map(row=>row.delta)).toEqual([null,-100,null,null,30,null])
  expect(rows[1].rate).toBe(-100)
  expect(rows[4].rate).toBeNull()
})

test.beforeEach(async ({page}) => {
  await page.route('http://medshield.test/**', route=>route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}))
  await page.goto('http://medshield.test/')
  const css = await readFile(path.resolve('app/overrides.css'),'utf8')
  await page.setContent(`<style>${css}</style><style>${MEDSHIELD_STYLE}</style><div class="medshield-root">${MEDSHIELD_MARKUP}</div>`)
  await page.evaluate(()=>{window.fetch=async()=>new Response('{}',{status:503})})
  await page.addScriptTag({path:path.resolve('node_modules/chart.js/dist/chart.umd.js')})
  await page.evaluate(script=>new Function(script)(),getExecutableDashboardScript())
})

test('overview monthly summaries stay stable across grain and report unequal coverage', async ({page})=>{
  await page.evaluate(()=>{
    const app=window as any
    app.applyDatasetPatch({monthly:[{period:'2024-01',revenue:100},{period:'2025-01',revenue:0},{period:'2025-02',revenue:-20}],year_summary:[]})
    app.showPage('overview');app.setDescriptivePeriod('all')
  })
  const values=()=>page.evaluate(()=>{
    const app=window as any
    return {averages:app.Chart.getChart(document.getElementById('overviewMonthAverageChart')).data.datasets[0].data,
      coverage:app.Chart.getChart(document.getElementById('overviewCoverageChart')).data.datasets.map((d:any)=>d.data)}
  })
  const before=await values()
  expect(before.averages.slice(0,3)).toEqual([50,-20,null])
  expect(before.coverage).toEqual([[1,2],[11,10]])
  await page.evaluate(()=>(window as any).setDescriptiveGranularity('monthly'))
  expect(await values()).toEqual(before)
  await page.evaluate(()=>{const app=window as any;app.setDescriptivePeriod('custom');app.setCustomDateRange('2025-01-01','2025-01-31');app.setDescriptiveGranularity('auto')})
  const custom=await values()
  await page.evaluate(()=>(window as any).setDescriptiveGranularity('monthly'))
  expect(await values()).toEqual(custom)
  expect(custom.averages[0]).toBe(0)
})

test('movement graph uses full observed adjacent months at any display grain and export works', async ({page})=>{
  await page.evaluate(()=>{
    const app=window as any
    app.applyDatasetPatch({monthly:[{period:'2024-12',revenue:100},{period:'2025-01',revenue:0},{period:'2025-03',revenue:-10},{period:'2025-04',revenue:20}],year_summary:[]})
    app.showPage('revenue');app.setDescriptivePeriod('custom');app.setCustomDateRange('2024-12-01','2025-04-30');app.setDescriptiveGranularity('yearly')
  })
  const values=()=>page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('salesMovementChart')).data.datasets[0].data)
  expect(await values()).toEqual([null,-100,null,null,30])
  await page.evaluate(()=>(window as any).setDescriptiveGranularity('monthly'))
  expect(await values()).toEqual([null,-100,null,null,30])
  await page.evaluate(()=>(window as any).setCustomDateRange('2024-12-15','2025-04-15'))
  expect(await values()).toEqual([null,null,null])
  const download=page.waitForEvent('download')
  await page.evaluate(()=>(window as any).exportSalesGrowthCSV())
  expect(await (await download).path()).toBeTruthy()
})

test('ABC shares retain full population and area buyer chart distinguishes estimates and unknown', async ({page})=>{
  await page.evaluate(()=>{
    const app=window as any
    app.showPage('products');app.setDescriptivePeriod('custom');app.setCustomDateRange('2025-01-01','2025-12-31')
    app.setSalesSectorsData({rows:[{product:'Dominant',revenue:96,positive_sales:96,returns_value:0,period:'2025-02'}, {product:'Small',revenue:4,positive_sales:4,returns_value:0,period:'2025-02'}, {product:'Return only',revenue:-1,positive_sales:0,returns_value:-1,period:'2025-02'}],source:{file:'fixture',excluded:{}}})
  })
  const shares=()=>page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('productAbcShareChart')).data.datasets.map((d:any)=>d.data))
  const before=await shares()
  expect(before.map((row:number[])=>row[0])).toEqual([96,0,4,0])
  expect(before.reduce((sum:number,row:number[])=>sum+row[1],0)).toBeCloseTo(100)
  const bounds=await page.evaluate(()=>{const c=(window as any).Chart.getChart(document.getElementById('productBarChart'));return {min:c.scales.x.min,max:c.scales.x.max}})
  expect(bounds.min).toBeLessThanOrEqual(-1)
  expect(bounds.min).toBeGreaterThan(-2)
  expect(bounds.max).toBeGreaterThanOrEqual(96)
  await page.selectOption('#productCohortSelect','5')
  expect(await shares()).toEqual(before)
  await page.evaluate(()=>{
    const app=window as any;app.showPage('territory')
    app.setSalesSectorsData({rows:[
      {period:'2025-02',territory:'Quezon',region:'CALABARZON',sector:'Private',product:'Fixture',revenue:100,row_count:1},
      {period:'2025-02',territory:'Unmapped',region:null,sector:'Unknown',product:'Fixture',revenue:40,row_count:1},
      {period:'2025-02',territory:'Quezon',region:'CALABARZON',sector:'Private',product:'Fixture',revenue:20,row_count:1,evidence:'estimate'},
    ],source:{file:'fixture',excluded:{}}})
  })
  await expect(page.locator('#sectorBuyerChart')).toBeVisible()
  await expect(page.locator('#areaRevenueCoverage')).toHaveText('75.0%')
  await expect(page.locator('#areaMappingCoverage')).toContainText('50.0%')
  await expect(page.locator('#areaCoverageMethod')).toContainText('actual + gap estimates')
  const buyer=await page.evaluate(()=>{const c=(window as any).Chart.getChart(document.getElementById('sectorBuyerChart'));return {labels:c.data.labels,data:c.data.datasets.map((d:any)=>d.data)}})
  expect(buyer.labels).toContain('Unknown ownership')
  expect(buyer.data[0].reduce((sum:number,value:number)=>sum+value,0)).toBe(140)
  expect(buyer.data[1].reduce((sum:number,value:number)=>sum+value,0)).toBe(20)
})

test('empty descriptive selections do not display invented bars or class shares', async ({page})=>{
  await page.evaluate(()=>{
    const app=window as any;app.showPage('products');app.setDescriptivePeriod('custom');app.setCustomDateRange('2025-01-01','2025-12-31')
    app.setSalesSectorsData({rows:[],source:{file:'empty fixture',excluded:{}}})
  })
  await expect(page.locator('#productAbcShareChart')).not.toBeVisible()
  await expect(page.locator('#productAbcShareStatus')).toContainText('No source labels')
  await page.evaluate(()=>{const app=window as any;app.showPage('territory');app.setSalesSectorsData(null,'Service unavailable');app.renderSalesSectors()})
  await expect(page.locator('#sectorBuyerChart')).not.toBeVisible()
  await expect(page.locator('#areaBuyerEmpty')).toHaveText('Service unavailable')
  await page.evaluate(()=>{const app=window as any;app.showPage('overview');app.setCustomDateRange('2025-06-01','2025-06-30')})
  await expect(page.locator('#overviewMonthAverageChart')).not.toBeVisible()
  await expect(page.locator('#overviewMonthAverageEmpty')).toContainText('No observed net sales')
})

for (const width of [1440,926,375]) test(`descriptive charts fit at ${width}px with readable plot area`, async ({page})=>{
  await page.setViewportSize({width,height:900})
  await page.evaluate(()=>{
    const app=window as any
    app.applyDatasetPatch({monthly:Array.from({length:24},(_,i)=>({period:(2024+Math.floor(i/12))+'-'+String(i%12+1).padStart(2,'0'),revenue:100+i*20,income:20+i*4})),year_summary:[]})
    app.setDescriptivePeriod('all')
    app.setSalesSectorsData({rows:Array.from({length:10},(_,i)=>({period:'2025-02',product:'Long source product description '+i+' with packaging label and recorded strength',territory:'Quezon',region:'CALABARZON',sector:'Private',revenue:100-i,positive_sales:100-i,returns_value:0,row_count:1})),source:{file:'fixture',excluded:{}}})
  })
  for (const name of ['overview','revenue','products','territory']) {
    await page.evaluate(name=>(window as any).showPage(name),name)
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    await expect.poll(()=>page.locator('.page.active canvas').evaluateAll(canvases=>canvases.filter(c=>c.getBoundingClientRect().height>0).every(c=>{
      const box=c.getBoundingClientRect(), parent=c.parentElement!.getBoundingClientRect()
      const chart=(window as any).Chart.getChart(c)
      return box.width>100&&box.height>=170&&box.width<=parent.width+1&&(!chart || chart.chartArea.width>65&&chart.chartArea.height>80)
    }))).toBe(true)
  }
})
