import { test, expect, type Locator } from '@playwright/test'
import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { signInToReadyDashboard } from './helpers/dashboard'

test.use({actionTimeout:10000})

async function setDetailsOpen(detail: Locator, open: boolean) {
  if (await detail.evaluate(element => (element as HTMLDetailsElement).open) !== open) {
    await detail.locator('summary').first().click()
  }
}

test('live tabs and analytical charts fit desktop, tablet and mobile', async ({page})=>{
  test.setTimeout(180000)
  const runtimeErrors:string[]=[]
  const pendingRequests = new Set<string>()
  page.on('pageerror',error=>runtimeErrors.push(error.message))
  page.on('request',request=> { if (request.url().includes(':5000/')) pendingRequests.add(new URL(request.url()).pathname) })
  page.on('requestfinished',request=> { if (request.url().includes(':5000/')) pendingRequests.delete(new URL(request.url()).pathname) })
  page.on('requestfailed',request=> { if (request.url().includes(':5000/')) pendingRequests.delete(new URL(request.url()).pathname) })
  const output=path.resolve(process.env.MEDSHIELD_E2E_OUTPUT_DIR || test.info().outputPath('live-layout'))
  const pages = process.env.MEDSHIELD_E2E_DESCRIPTIVE_ONLY === 'true'
    ? ['overview','revenue','products','territory']
    : ['overview','revenue','products','territory','forecast','inventory','data','sales-data','weather-validation']
  await mkdir(output,{recursive:true})
  await page.setViewportSize({width:1440,height:1000})
  try { await signInToReadyDashboard(page) }
  catch (error) {
    await writeFile(path.join(output,'readiness-failure.json'),JSON.stringify({runtimeErrors,pendingRequests:[...pendingRequests]},null,2))
    throw error
  }
  const result:Array<{width:number;page:string;charts:unknown}>=[]
  for (const width of [1440,926,375]) {
    await page.setViewportSize({width,height:1000})
    for (const name of pages) {
      const nav = page.locator('[data-dashboard-page="'+name+'"]')
      const navBox = await nav.boundingBox()
      if (!navBox || navBox.x < 0) await page.locator('.nav-toggle').click()
      await nav.click()
      await expect(page.locator('#page-'+name)).toHaveClass(/active/)
      if (width<=1024) await expect(page.locator('body')).not.toHaveClass(/nav-open/)
      if (name==='products'||name==='territory') await expect(page.locator('#sectorRegion')).toBeEnabled({timeout:90000})
      if (name==='revenue') await expect(page.locator('#heatmapProduct')).toBeEnabled({timeout:90000})
      if (name==='forecast') await expect.poll(()=>page.locator('#forecastStatus').textContent(),{timeout:90000}).not.toMatch(/Loading/)
      if (name==='inventory') await expect(page.locator('#planInputs tbody tr')).toHaveCount(5,{timeout:90000})
      await page.evaluate(()=>window.scrollTo(0,0))
      await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),{message:name+' must fit '+width+'px'}).toBe(true)
      const charts=await page.locator('.page.active canvas').evaluateAll(canvases=>canvases.filter(c=>c.getBoundingClientRect().height>0 && !c.closest('details:not([open])')).map(c=>{
        const box=c.getBoundingClientRect(), parent=c.parentElement!.getBoundingClientRect()
        const chart=(window as any).Chart?.getChart(c)
        return {id:c.id,width:box.width,height:box.height,parentWidth:parent.width,plotWidth:chart?.chartArea.width,plotHeight:chart?.chartArea.height}
      }))
      for (const chart of charts) {
        expect(chart.width,name+' '+chart.id).toBeGreaterThan(100)
        expect(chart.height,name+' '+chart.id).toBeGreaterThanOrEqual(170)
        expect(chart.width,name+' '+chart.id).toBeLessThanOrEqual(chart.parentWidth+1)
      }
      result.push({width,page:name,charts})
      if (width!==926 && ['overview','revenue','products','territory','forecast','inventory'].includes(name)) {
        await page.screenshot({path:path.join(output,`${name}-${width}.png`),fullPage:true})
        const preview = name==='overview' ? page.locator('.overview-descriptive-grid') : name==='revenue' ? page.locator('#salesMovementCard') : name==='products' ? page.locator('#productAbcShareCard') : name==='territory' ? page.locator('.area-chart-grid') : null
        if (preview) {
          if (name==='overview') await setDetailsOpen(page.locator('#overviewPatternDetails'), true)
          await preview.evaluate(element=>{element.scrollIntoView({block:'start'});window.scrollBy(0,-90)})
          await expect.poll(async()=> (await preview.boundingBox())?.height || 0).toBeGreaterThan(200)
          await preview.screenshot({path:path.join(output,`${name}-charts-${width}.png`)})
        }
      }
      if (name==='overview') {
        await setDetailsOpen(page.locator('#overviewPatternDetails'), true)
        await expect(page.locator('#overviewMonthAverageChart')).toBeVisible()
        await expect.poll(()=>page.locator('#overviewMonthAverageChart').evaluate(canvas=>{
          const chart=(window as any).Chart?.getChart(canvas)
          return chart?.chartArea.width>65 && chart?.chartArea.height>80
        })).toBe(true)
      }
      if (name==='revenue') await expect(page.locator('#salesMovementChart')).toBeVisible()
      if (name==='products') await expect(page.locator('#productAbcShareChart')).toBeVisible()
      if (name==='territory') await expect(page.locator('#sectorBuyerChart')).toBeVisible()
      if (name==='revenue') {
        for (const [key,label] of [['growth','Growth'],['quantities','Quantities'],['seasonality','Seasonality']]) {
          await page.getByRole('tab',{name:label,exact:true}).click()
          await page.evaluate(()=>window.scrollTo(0,0))
          await expect(page.locator('#salesOutputPanel-'+key)).toBeVisible()
          await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
          await expect.poll(()=>page.locator('#salesOutputPanel-'+key+' canvas').evaluateAll(canvases=>canvases.filter(c=>c.getBoundingClientRect().height>0 && !c.closest('details:not([open])')).every(c=>{
            const chart=(window as any).Chart?.getChart(c),box=c.getBoundingClientRect()
            return box.width>100 && box.height>=170 && (!chart || chart.chartArea.width>65 && chart.chartArea.height>80)
          }))).toBe(true)
          if (width!==926) await page.screenshot({path:path.join(output,`revenue-${key}-${width}.png`),fullPage:true})
          if (key==='growth') {
            await setDetailsOpen(page.locator('#salesMarginDetails'), true)
            await expect(page.locator('#marginChart')).toBeVisible()
            await expect.poll(()=>page.locator('#marginChart').evaluate(canvas=>{
              const chart=(window as any).Chart?.getChart(canvas)
              return chart?.chartArea.width>65 && chart?.chartArea.height>80
            })).toBe(true)
            await setDetailsOpen(page.locator('#salesMarginDetails'), false)
          }
        }
      }
      const optional = name==='overview' ? '#overviewProfitScatter' : name==='revenue' ? '#stlResidualDetail canvas' : name==='products' ? '#productBubbleChart' : name==='territory' ? '#sectorParetoChart' : null
      if (optional && await page.locator(optional).count() && await page.locator(optional).evaluate(c=>Boolean((window as any).Chart?.getChart(c)))) {
        const detail = page.locator(optional).locator('xpath=ancestor::details[1]')
        await setDetailsOpen(detail, true)
        await expect.poll(()=>page.locator(optional).evaluate(c=>{
          const chart=(window as any).Chart.getChart(c)
          return chart.chartArea.width>65&&chart.chartArea.height>80
        })).toBe(true)
        await setDetailsOpen(detail, false)
      }
      if (name==='overview') await setDetailsOpen(page.locator('#overviewPatternDetails'), false)
      if (name==='revenue') await page.getByRole('tab',{name:'Sales Trend',exact:true}).click()
    }
  }
  await writeFile(path.join(output,'live-layout.json'),JSON.stringify({runtimeErrors,result},null,2))
  expect(runtimeErrors).toEqual([])
})
