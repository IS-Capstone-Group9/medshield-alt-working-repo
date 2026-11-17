import {test,expect} from '@playwright/test'
import path from 'node:path'
import {MEDSHIELD_MARKUP,MEDSHIELD_STYLE} from '../lib/medshieldReference'
import {getExecutableDashboardScript} from '../services/api/dashboard-engine'

test.beforeEach(async({page})=>{
  await page.route('http://medshield.test/**',route=>route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style><div class="medshield-root">${MEDSHIELD_MARKUP}</div>`)
  await page.addScriptTag({path:path.resolve('node_modules/chart.js/dist/chart.umd.js')})
  await page.evaluate(script=>new Function(script)(),getExecutableDashboardScript())
  await page.evaluate(()=>{
    const app=window as any
    const release={dataset_id:'2026-fixture',policy_version:'sales_restart_gold_v8_isolated_source_rebuild',fact_delta_version:0}
    const base=[{date:'2025-01-15',period:'2025-01',revenue:100,income:10,margin_revenue_basis:100},
      {date:'2026-01-15',period:'2026-01',revenue:200,income:20,margin_revenue_basis:200},
      {date:'2026-09-30',period:'2026-09',revenue:300,income:30,margin_revenue_basis:300}]
    const daily=base.flatMap(row=>[{...row,sector:'Government',evidence:'actual'},{...row,sector:'All',evidence:'actual'}])
    app.setOverviewSectorData({daily,source:{release},observations:{start:'2017-01-02',end:'2026-09-30',source_review_status:'includes_unreviewed_source',unreviewed_source_records:2}})
    app.applyDatasetPatch({release,monthly:base.map(row=>({...row,transactions:1})),year_summary:[{year:'2025',revenue:100,income:10},{year:'2026',revenue:500,income:50}]})
    app.showPage('overview');app.setDescriptivePeriod('all')
  })
})

test('recorded-data scope includes 2026 while original study and review status stay explicit',async({page})=>{
  await expect(page.locator('#overviewStudyPeriod')).toHaveText('Recorded data · 2017–2026')
  await expect(page.locator('#overviewSectorControls')).toContainText('New source includes records awaiting review')
  const values=await page.evaluate(()=>{
    const chart=(window as any).Chart.getChart('overviewBaselineChart')
    return {labels:chart.data.labels,values:chart.data.datasets[0].data}
  })
  expect(values.labels).toContain('2026')
  expect(values.values.at(-1)).toBe(500)
  await page.setViewportSize({width:390,height:844})
  await expect(page.locator('#overviewStudyPeriod')).not.toBeVisible()
  await page.locator('[data-overview-trend-notes] > summary').click()
  await expect(page.locator('#overviewStudyPeriod')).toBeVisible()
  await expect.poll(async()=>{const panel=await page.locator('#overviewSectorControls').boundingBox();return Math.ceil(panel!.x+panel!.width)}).toBeLessThanOrEqual(390)
})

test('unreviewed-source quantities have their own selection and do not become original units',async({page})=>{
  await page.evaluate(()=>{
    const app=window as any
    app.showPage('revenue');app.setDescriptivePeriod('all')
    app.setSalesHeatmapData({products:[{id:'RAW:new',label:'New product label',category:'Unclassified',identity_status:'needs_review',item_kind:'unknown',unit:'Unknown source unit'}],
      monthly:[{product:'RAW:new',area:'QUEZON',period:'2026-09',quantity:null,unreviewed_quantity:11,estimated_quantity:null,verified_quantity:null,row_count:1,transaction_evidence:'unreviewed_source_detail'}],source:{file:'isolated Gold',excluded:{},release:{dataset_id:'2026-fixture',fact_delta_version:0}}})
  })
  await page.getByRole('tab',{name:'Quantities',exact:true}).click()
  await page.locator('#quantityMoreFilters summary').click()
  await page.selectOption('#heatmapMeasure','unreviewed')
  await expect(page.locator('#salesHeatmapTitle')).toContainText('unreviewed-source units')
  expect(await page.evaluate(()=>(window as any).Chart.getChart('quantityTrendChart').data.datasets[0].data)).toContain(11)
  await page.selectOption('#heatmapMeasure','units')
  const original=await page.evaluate(()=>(window as any).Chart.getChart('quantityTrendChart')?.data.datasets[0].data??[])
  expect(original.every((value:unknown)=>value===null)).toBe(true)
})
