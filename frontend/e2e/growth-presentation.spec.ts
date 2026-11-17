import {test,expect} from '@playwright/test'
import path from 'node:path'
import {readFile} from 'node:fs/promises'
import {MEDSHIELD_MARKUP,MEDSHIELD_STYLE} from '../lib/medshieldReference'
import {getExecutableDashboardScript} from '../services/api/dashboard-engine'

test.beforeEach(async({page})=>{
  await page.route('http://medshield.test/**',route=>route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}))
  await page.goto('http://medshield.test/')
  const overrides=await readFile(path.resolve('app/overrides.css'),'utf8')
  await page.setContent(`<style>${MEDSHIELD_STYLE}\n${overrides}</style><div class="medshield-root">${MEDSHIELD_MARKUP}</div>`)
  await page.evaluate(()=>{window.fetch=async()=>new Response('{}',{status:503})})
  await page.addScriptTag({path:path.resolve('node_modules/chart.js/dist/chart.umd.js')})
  await page.evaluate(script=>new Function(script)(),getExecutableDashboardScript())
  await page.evaluate(()=>{
    const app=window as any
    const revenue=[100,400,600,300,450,350,350,300,900,990]
    const margin=[68,63,70,70,65,67,56,39,55,50]
    app.applyDatasetPatch({monthly:revenue.map((value,i)=>({period:String(2017+i)+'-01',revenue:value,income:value*margin[i]/100,margin_revenue_basis:value})),year_summary:[]})
    app.showPage('revenue');app.setDescriptivePeriod('all');app.setDescriptiveGranularity('yearly')
  })
  await page.getByRole('tab',{name:'Growth',exact:true}).click()
})

for(const width of [1440,390]) {
  test(`growth spacing, header control and single margin frame at ${width}px`,async({page},testInfo)=>{
    await page.setViewportSize({width,height:1100})
    await page.evaluate(()=>(window as any).buildCharts())
    await expect(page.locator('#salesMarginDetails')).not.toHaveAttribute('open','')
    await expect(page.locator('#salesMarginSnapshot')).toContainText('50.0%')
    await expect(page.locator('#salesGrowthMeasureSelect')).toHaveCount(0)
    await expect(page.locator('[data-sales-output-panel="growth"]')).not.toContainText('DSS Executive Takeaway')
    await page.locator('#salesMarginDetails > summary').click()
    const result=await page.evaluate(()=>{
      const app=window as any
      return ['growthChart','marginChart'].map(id=>{
        const canvas=document.getElementById(id)!,wrap=canvas.parentElement!,style=getComputedStyle(wrap),chart=app.Chart.getChart(canvas)
        return {background:style.backgroundColor,border:style.borderTopWidth,height:wrap.getBoundingClientRect().height,legend:chart.options.plugins.legend.display,values:chart.data.datasets[0].data,maxBar:chart.data.datasets[0].maxBarThickness}
      })
    })
    for(const chart of result){expect(chart.background).toBe('rgb(255, 255, 255)');expect(chart.border).toBe('0px');expect(chart.height).toBeGreaterThanOrEqual(240);expect(chart.legend).toBe(false);expect(chart.maxBar).toBe(44)}
    expect(result[0].values.slice(0,5)).toEqual([null,300,200,-300,150])
    result[1].values.forEach((value:number,i:number)=>expect(value).toBeCloseTo([68,63,70,70,65,67,56,39,55,50][i],8))
    const inner=await page.locator('#salesMarginDetails > .chart-card').evaluate(el=>({border:getComputedStyle(el).borderTopWidth,padding:getComputedStyle(el).padding,shadow:getComputedStyle(el).boxShadow}))
    expect(inner).toEqual({border:'0px',padding:'0px',shadow:'none'})
    const box=await page.locator('[data-sales-output-panel="growth"]').boundingBox()
    expect(box!.x+box!.width).toBeLessThanOrEqual(width+1)
    const growthBox=await page.locator('[data-sales-growth-chart]').boundingBox()
    const marginBox=await page.locator('#salesMarginDetails').boundingBox()
    expect(growthBox!.y).toBeLessThan(marginBox!.y)
    expect(marginBox!.y-growthBox!.y-growthBox!.height).toBeGreaterThanOrEqual(15)
    await expect(page.locator('#salesGrowthSummary')).not.toBeVisible()
    await page.locator('[data-sales-output-panel="growth"]').screenshot({path:testInfo.outputPath(`growth-${width}.png`),style:'.topbar{visibility:hidden!important;}'})
    expect(await page.evaluate(()=>(window as any).Chart.getChart('growthChart').data.datasets[0].data.slice(0,5))).toEqual([null,300,200,-300,150])
    await expect(page.locator('#salesMarginDetails .chart-subtitle')).toContainText('10/10 periods available')
    await page.locator('#salesGrowthMethod > summary').click()
    await expect(page.locator('#salesGrowthMethodText')).toContainText('zero or negative baselines')
    await page.locator('#salesMarginMethod > summary').click()
    await expect(page.locator('#salesMarginMethod')).toContainText('Transaction percentages are not averaged')
  })
}

test('margin snapshot clears and unavailable denominators stay null after refresh',async({page})=>{
  await page.evaluate(()=>{
    const app=window as any
    app.setDescriptivePeriod('custom');app.setCustomDateRange('2025-01-01','2025-01-31');app.setDescriptiveGranularity('monthly')
    app.applyDatasetPatch({monthly:[{period:'2025-01',revenue:0,income:20,margin_revenue_basis:0}],year_summary:[]})
  })
  await expect(page.locator('#salesMarginSnapshot')).toHaveText('No interpretable margin')
  expect(await page.evaluate(()=>(window as any).Chart.getChart('marginChart').data.datasets[0].data)).toEqual([null])
  await page.locator('#salesMarginDetails > summary').click()
  await expect(page.locator('#salesMarginDetails .chart-subtitle')).toContainText('0/1 periods available')
})
