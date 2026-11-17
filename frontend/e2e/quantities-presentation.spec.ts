import { test, expect } from '@playwright/test'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { SALES_HEATMAP_MARKUP, SALES_HEATMAP_SCRIPT } from '../services/api/sales-heatmap-runtime'
import { MEDSHIELD_STYLE } from '../lib/medshieldReference'

test.beforeEach(async ({ page }) => {
  const overrides=await readFile(path.resolve('app/overrides.css'),'utf8')
  await page.setContent(`<style>${MEDSHIELD_STYLE}\n${overrides}\nbody{display:block;height:auto;overflow:auto;padding:24px;background:#F3F6FA}</style><body class="medshield-root">${SALES_HEATMAP_MARKUP}</body>`)
  await page.addScriptTag({path:path.resolve('node_modules/chart.js/dist/chart.umd.js')})
  await page.evaluate(script => {
    new Function(`
      const descriptivePeriod='custom', customDateStart='2025-01-01', customDateEnd='2025-12-31';
      const historicalPeriod=()=>true, descriptiveUsesDailyGrain=()=>false, descriptiveUsesYearlyGrain=()=>false;
      const descriptivePeriodIncludes=()=>true, descriptivePeriodLabel=()=>'Jan–Mar 2025';
      const descriptiveAxisPeriods=()=>['2025-01','2025-02','2025-03'];
      const descriptivePointLabel=period=>new Date(period+'-01T00:00:00Z').toLocaleDateString('en-PH',{month:'short',year:'numeric',timeZone:'UTC'});
      const baseChartOptions=()=>({responsive:true,maintainAspectRatio:false,animation:false});
      const createChart=(id,config)=>{const canvas=document.getElementById(id);Chart.getChart(canvas)?.destroy();return new Chart(canvas,config)};
      ${script}
      Object.assign(window,{setSalesHeatmapData,renderSalesHeatmap,changeHeatmapCategory,exportSalesHeatmapCSV});
    `)()
  }, SALES_HEATMAP_SCRIPT)
})

async function load(page: import('@playwright/test').Page, values: Array<number | null>) {
  await page.evaluate(values => (window as any).setSalesHeatmapData({
    products:[{id:'A',label:'Example product 1 g',category:'Medical',unit:'source units'}],
    monthly:values.map((quantity,i)=>({product:'A',area:'Quezon',period:'2025-'+String(i+1).padStart(2,'0'),quantity,unreviewed_quantity:42,row_count:1})),
    source:{file:'synthetic-presentation-fixture',included_rows:values.length,excluded:{}}
  }), values)
}

for (const width of [1440, 390]) {
  test(`signed quantities and partial coverage at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({width,height:900})
    await load(page,[100,-20,null])
    await expect(page.locator('#quantityTotal')).toHaveText('80')
    await expect(page.locator('#quantityAverage')).toHaveText('40')
    await expect(page.locator('#quantityCoverage')).toHaveText('2 / 3')
    await expect(page.locator('#quantityTotalNote')).toContainText('partial coverage')
    await expect(page.locator('#quantityPlot')).toBeVisible()
    expect(await page.evaluate(()=>{
      const chart=(window as any).Chart.getChart(document.getElementById('quantityTrendChart'))
      return {type:chart.config.type,values:chart.data.datasets[0].data,colors:chart.data.datasets[0].backgroundColor}
    })).toEqual({type:'bar',values:[100,-20,null],colors:['#365D80','#B4534B','#365D80']})
    await page.locator('#quantityHeatmapDetail summary').click()
    await expect(page.locator('[data-period="2025-03"]')).toHaveAttribute('data-value','')
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    await page.locator('#quantityHeatmapDetail summary').click()
    await page.screenshot({path:testInfo.outputPath(`quantities-${width}.png`),fullPage:true})
    const download=page.waitForEvent('download')
    await page.getByRole('button',{name:'Export CSV'}).click()
    const csv=await readFile((await (await download).path())!,'utf8')
    expect(csv).toContain('"2025-01","100","units","100"')
    expect(csv).toContain('"2025-02","-20","units","-20"')
    expect(csv).toContain('"2025-03","","units","","0"')
  })
}

test('empty selection, zero records, separate evidence and service failure recover', async ({ page }, testInfo) => {
  await load(page,[null,null,null])
  await expect(page.locator('#quantityEmpty')).toBeVisible()
  await expect(page.locator('#quantityPlot')).toBeHidden()
  await expect(page.locator('#quantityTotal')).toHaveText('—')
  await expect(page.locator('#quantityCoverage')).toHaveText('0 / 3')
  expect(await page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('quantityTrendChart')))).toBeUndefined()
  await page.screenshot({path:testInfo.outputPath('quantities-empty.png'),fullPage:true})
  await page.locator('#quantityMoreFilters summary').click()
  await page.selectOption('#heatmapMeasure','unreviewed')
  await expect(page.locator('#quantityTotal')).toHaveText('126')
  await expect(page.locator('#quantityEmpty')).toBeHidden()
  await page.selectOption('#heatmapMeasure','units')
  await load(page,[0,null,null])
  await expect(page.locator('#quantityTotal')).toHaveText('0')
  await expect(page.locator('#quantityAverage')).toHaveText('0')
  await expect(page.locator('#quantityCoverage')).toHaveText('1 / 3')
  await expect(page.locator('#quantityPlot')).toBeVisible()
  await page.selectOption('#heatmapMeasure','index')
  await expect(page.locator('#quantityEmptyTitle')).toHaveText('A complete year is needed')
  await expect(page.locator('#quantityTotal')).toHaveText('—')
  await page.evaluate(()=>(window as any).setSalesHeatmapData(null,'Service unavailable'))
  await expect(page.locator('#quantitySummary')).toBeHidden()
  await expect(page.locator('#quantityHeatmapDetail')).toBeHidden()
  await expect(page.locator('#heatmapStatus')).toHaveText('Service unavailable')
  await expect(page.locator('#heatmapProduct')).toBeDisabled()
  await load(page,[10,20,30])
  // Restore the selected measure after the outage; no stale chart survives it.
  await page.selectOption('#heatmapMeasure','units')
  await expect(page.locator('#quantityTotal')).toHaveText('60')
  await expect(page.locator('#quantityPlot')).toBeVisible()
})

async function loadCatalog(page: import('@playwright/test').Page) {
  await page.evaluate(()=>(window as any).setSalesHeatmapData({
    products:Array.from({length:18},(_,i)=>({id:'A'+String(i).padStart(2,'0'),label:i===2 || i===3?'Medicine same':`Medicine ${i} 1 g`,category:i===17?'Non-Medical':'Medical',pack_size:i%2?'Box 20':'Box 10',original_aliases:i===4?['Brand Alias']:[],unit:'source units'})),
    monthly:Array.from({length:18},(_,i)=>({product:'A'+String(i).padStart(2,'0'),area:i===6?'Batangas':'Quezon',period:i===7?'2024-12':'2025-01',quantity:i===5?null:i*10,estimated_quantity:i===5?25:null,row_count:1})),
    source:{file:'synthetic-picker-fixture',included_rows:18,excluded:{}}
  }))
}

for(const width of [1440,390]) {
  test(`product search, pack identity, keyboard and bounded list at ${width}px`,async ({page},testInfo)=>{
    await page.setViewportSize({width,height:900})
    await loadCatalog(page)
    await expect(page.locator('#quantityMoreFilters')).not.toHaveAttribute('open','')
    await expect(page.locator('#quantityActiveScope')).toHaveText('All sales areas · Original-source units')
    await page.locator('#quantityProductPicker summary').click()
    const search=page.getByRole('searchbox',{name:'Find a product'})
    await expect(search).toBeFocused()
    await expect(page.locator('#quantityProductResults button')).toHaveCount(18)
    expect(await page.locator('#quantityProductResults').evaluate(el=>el.clientHeight<=288 && el.scrollHeight>el.clientHeight)).toBe(true)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    await page.screenshot({path:testInfo.outputPath(`picker-open-${width}.png`),fullPage:true})
    await search.fill('Brand Alias')
    await expect(page.locator('#quantityProductResults button')).toHaveCount(1)
    await search.press('ArrowDown')
    await expect(page.locator('[data-product="A04"]')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#quantitySelectedProduct')).toHaveText('Medicine 4 1 g')
    await expect(page.locator('#quantityTotal')).toHaveText('40')
    await expect(page.locator('#quantityProductPicker')).not.toHaveAttribute('open','')
    await expect(page.locator('#quantityProductPicker summary')).toBeFocused()
    await page.locator('#quantityProductPicker summary').click()
    await search.fill('Medicine same')
    await expect(page.locator('#quantityProductResults button')).toHaveCount(2)
    await expect(page.locator('[data-product="A02"]')).toContainText('Box 10 · A02 · 1 of 3 months recorded')
    await expect(page.locator('[data-product="A03"]')).toContainText('Box 20 · A03')
    await search.fill('not present')
    await expect(page.locator('#quantityProductCount')).toContainText('No matching products')
    await expect(page.locator('#quantitySelectedProduct')).toHaveText('Medicine 4 1 g')
    await search.press('Escape')
    await expect(page.locator('#quantityProductPicker')).not.toHaveAttribute('open','')
    await page.screenshot({path:testInfo.outputPath(`picker-selected-${width}.png`),fullPage:true})
  })
}

test('picker coverage follows source measure, area, period and category; search is not a selection',async ({page})=>{
  await loadCatalog(page)
  await page.locator('#quantityProductPicker summary').click()
  await expect(page.locator('[data-product="A00"]')).toContainText('1 of 3 months recorded') // recorded zero
  await expect(page.locator('[data-product="A05"]')).toContainText('No records in this scope')
  await expect(page.locator('[data-product="A07"]')).toContainText('No records in this scope') // outside dates
  await page.locator('#quantityMoreFilters summary').click()
  await expect(page.locator('#quantityProductPicker')).not.toHaveAttribute('open','')
  await page.selectOption('#heatmapArea','Quezon')
  await page.locator('#quantityProductPicker summary').click()
  await expect(page.locator('[data-product="A06"]')).toContainText('No records in this scope')
  await page.locator('#quantityProductPicker summary').click()
  await page.selectOption('#heatmapMeasure','estimated')
  await expect(page.locator('#quantityActiveScope')).toHaveText('Quezon · Adjusted-source units')
  await page.locator('#quantityProductPicker summary').click()
  await expect(page.locator('[data-product="A05"]')).toContainText('1 of 3 months recorded')
  await page.getByRole('searchbox').fill('Medicine 5')
  await page.getByRole('searchbox').press('Enter')
  await expect(page.locator('#quantityTotal')).toHaveText('25')
  await page.locator('#quantityProductPicker summary').click()
  await page.selectOption('#heatmapCategory','Non-Medical')
  await expect(page.locator('#quantitySelectedProduct')).toHaveText('Medicine 17 1 g')
  await page.getByRole('searchbox').fill('')
  await expect(page.locator('#quantityProductResults button')).toHaveCount(1)
  await page.evaluate(()=>(window as any).setSalesHeatmapData(null,'Service unavailable'))
  await expect(page.locator('#quantitySelectedProduct')).toHaveText('Unavailable')
  await page.locator('#quantityProductPicker summary').click()
  await expect(page.locator('#quantityProductPicker')).not.toHaveAttribute('open','')
})
