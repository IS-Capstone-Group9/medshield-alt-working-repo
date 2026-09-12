import { test, expect } from '@playwright/test'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

test('sector filters use separate denominators and preserve unknown ownership', async ({ page }) => {
  await page.route('http://medshield.test/**', route => route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
  await page.evaluate(()=>{window.fetch=async()=>new Response('{}',{status:503})})
  await page.addScriptTag({path:path.resolve('node_modules/chart.js/dist/chart.umd.js')})
  await page.evaluate(script=>new Function(script)(),getExecutableDashboardScript())
  await page.evaluate(()=>{
    const app=window as any
    app.setComparisonMode('single');app.setYear('all');app.showPage('territory')
    const row=(sector:string,channel:string,territory:string,revenue:number,quantity:number,period='2025-01',product='A')=>({sector,channel,territory,revenue,quantity,period,product,row_count:1,basis:'Test fixture'})
    app.setSalesSectorsData({rows:[row('Government','Unclassified channel','Quezon',1000,10),row('Private','Hospital','Quezon',100,90),row('Private','Pharma','Batangas',300,10),row('Private','Hospital','Quezon',200,20,'2024-01'),row('Unknown','Hospital','Unassigned geography',500,30),row('Private','Pharma','Batangas',900,100,'2025-01','B')],source:{file:'test fixture',excluded:{}}})
  })
  await expect(page.locator('#growthChart')).not.toBeVisible()
  await expect(page.locator('#revenueHeatmapGrid')).not.toBeVisible()
  await page.selectOption('#sectorCluster','Private')
  await page.selectOption('#sectorProduct','A')
  await page.evaluate(()=>(window as any).setYear('2025'))
  await expect(page.locator('#sectorProfileTable')).toContainText('75')
  const series=()=>page.evaluate(()=>['sectorRevenueChart','sectorQuantityChart'].map(id=>(window as any).Chart.getChart(document.getElementById(id)).data.datasets[0].data))
  expect(await series()).toEqual([[75,25],[10,90]])
  await page.selectOption('#sectorDimension','channel')
  await expect(page.locator('#sectorProfileTable')).toContainText('Hospital')
  await expect(page.locator('#sectorProfileTable')).toContainText('Pharma')
  expect(await series()).toEqual([[75,25],[10,90]])
  await page.selectOption('#sectorCluster','Unknown')
  await expect(page.locator('#sectorProfileTable')).toContainText('500')
  await page.selectOption('#sectorCluster','Private')
  await page.selectOption('#sectorProduct','')
  expect(await page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('sectorQuantityChart'))===undefined)).toBe(true)
  await page.selectOption('#sectorProduct','A')
  await page.screenshot({path:'test-results/section-4-sectors.png',fullPage:true})
  await page.evaluate(()=>(window as any).setYear('2022'))
  await expect(page.locator('#sectorStatus')).toContainText('No private records')
  await page.evaluate(()=>(window as any).setSalesSectorsData(null,'Service unavailable'))
  await expect(page.locator('#sectorProfileTable')).toBeEmpty()
  await expect(page.locator('#sectorStatus')).toHaveText('Service unavailable')
})
