import {test, expect} from '@playwright/test'
import path from 'node:path'
import {readFile} from 'node:fs/promises'
import {MEDSHIELD_MARKUP,MEDSHIELD_STYLE} from '../lib/medshieldReference'
import {getExecutableDashboardScript} from '../services/api/dashboard-engine'

test.beforeEach(async ({page})=>{
  await page.route('http://medshield.test/**',route=>route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
  await page.evaluate(()=>{window.fetch=async()=>new Response('{}',{status:503})})
  await page.addScriptTag({path:path.resolve('node_modules/chart.js/dist/chart.umd.js')})
  await page.evaluate(script=>new Function(script)(),getExecutableDashboardScript())
})

test('catalog filter, stable identity, safe aliases and export share one full denominator',async ({page})=>{
  await page.evaluate(()=>{
    const app=window as any
    app.setDescriptivePeriod('custom');app.setDescriptiveGranularity('monthly');app.setCustomDateRange('2025-01-01','2025-12-31');app.showPage('products')
    app.setSalesSectorsData({rows:[
      {canonical_group_id:'SKU:001',canonical_title:'Reviewed product',product:'Alias A',product_raw:'<img src=x onerror=alert(1)>',category:'Medical',identity_status:'approved',item_kind:'physical_product',packaging_unit:'Box',pack_count:'10',contained_unit:'Piece',period:'2025-01',revenue:80,positive_sales:80,returns_value:0,transaction_evidence:'adjusted_estimated_source'},
      {canonical_group_id:'RAW:002',canonical_title:'Unknown',product:'Unknown',category:'Medical',identity_status:'needs_review',item_kind:'unknown',period:'2025-01',revenue:20,positive_sales:20,returns_value:0},
      {canonical_group_id:'RAW:003',canonical_title:'Service',product:'Service',category:'Non-Medical',identity_status:'needs_review',item_kind:'service',period:'2025-01',revenue:900,positive_sales:900,returns_value:0},
    ],source:{file:'fixture',excluded:{},release:{dataset_id:'test-dataset',fact_delta_version:17,product_master_sha256:'test-hash'}}})
  })
  await page.selectOption('#productCategorySelect','Medical')
  await expect(page.locator('#productPriorityScope')).toContainText('Recorded revenue: ₱100')
  await expect(page.locator('#productPriorityScope')).toContainText('Unresolved identity: 1 groups, ₱20')
  await expect(page.locator('#productTable tbody img')).toHaveCount(0)
  await page.selectOption('#productCohortSelect','20')
  await expect(page.locator('#productTable tbody tr')).toHaveCount(1)
  await expect(page.locator('#productTable tbody')).toContainText('80.00')
  await expect(page.locator('#productTable tbody')).toContainText('SKU:001')
  const download=page.waitForEvent('download')
  await page.getByRole('button',{name:'Export selected rows'}).click()
  const csv=await readFile((await (await download).path())!,'utf8')
  for(const value of ['SKU:001','Box','adjusted_estimated_source','test-dataset','test-hash','Original aliases']) expect(csv).toContain(value)
  await page.screenshot({path:'test-results-catalog/product-catalog.png',fullPage:true})
})

test('adjusted quantity never becomes observed zero; exports retain release and packaging',async ({page})=>{
  await page.evaluate(()=>{
    const app=window as any
    app.setDescriptivePeriod('custom');app.setDescriptiveGranularity('monthly');app.setCustomDateRange('2025-01-01','2025-12-31');app.showPage('revenue')
    app.setSalesHeatmapData({products:[{id:'RAW:one',label:'One',category:'Unclassified',identity_status:'needs_review',item_kind:'unknown',original_aliases:['One'],packaging_unit:null}],monthly:[
      {product:'RAW:one',period:'2025-01',area:'Quezon',quantity:null,estimated_quantity:12,row_count:1},
      {product:'RAW:one',period:'2025-02',area:'Quezon',quantity:0,estimated_quantity:null,row_count:1},
      {product:'RAW:one',period:'2025-03',area:'Quezon',quantity:null,estimated_quantity:null,verified_quantity:7,row_count:1},
    ],source:{file:'fixture',excluded:{},release:{dataset_id:'test',fact_delta_version:17,product_master_sha256:'hash'}}})
  })
  await expect(page.locator('[data-period="2025-01"]')).toHaveAttribute('data-value','')
  await expect(page.locator('[data-period="2025-02"]')).toHaveAttribute('data-value','0')
  await page.selectOption('#heatmapMeasure','estimated')
  await expect(page.locator('[data-period="2025-01"]')).toHaveAttribute('data-value','12')
  await expect(page.locator('[data-period="2025-02"]')).toHaveAttribute('data-value','')
  const download=page.waitForEvent('download')
  await page.getByRole('button',{name:'Export CSV',exact:true}).click()
  const csv=await readFile((await (await download).path())!,'utf8')
  expect(csv).toContain('adjusted_estimated_source')
  expect(csv).toContain('RAW:one')
  expect(csv).toContain('hash')
  await page.selectOption('#heatmapMeasure','verified')
  await expect(page.locator('[data-period="2025-03"]')).toHaveAttribute('data-value','7')
  await expect(page.locator('[data-period="2025-01"]')).toHaveAttribute('data-value','')
})
