import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

test.beforeEach(async ({ page }) => {
  await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
  await page.evaluate(() => { window.fetch = async () => new Response('{}', { status: 503 }) })
  await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
  await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())
})

async function financialFixture(page: Page) {
  await page.evaluate(() => {
    const app = window as any
    app.showPage('revenue')
    app.applyDatasetPatch({ monthly: [
      {period:'2024-01',revenue:100,income:20}, {period:'2024-02',revenue:100,income:20},
      {period:'2025-01',revenue:200,income:40}, {period:'2025-02',revenue:200,income:40},
    ], year_summary: [] })
    app.setSalesSectorsData({ rows: ['2024','2025'].flatMap(year => [
      {date:year+'-01-20',period:year+'-01',revenue:10,income:2,margin_revenue_basis:10},
      {date:year+'-02-10',period:year+'-02',revenue:10,income:2,margin_revenue_basis:10},
    ]), source:{file:'synthetic regression fixture',excluded:{}} })
    app.setDescriptivePeriod('custom')
    app.setCustomDateRange('2025-01-15','2025-02-15')
    app.setDescriptiveGranularity('yearly')
    app.setDescriptiveComparisonMode('yoy')
  })
}

test('yearly custom comparison uses exact dates for both overlays and growth', async ({ page }) => {
  await financialFixture(page)
  const result = await page.evaluate(() => {
    const app = window as any
    const detail = app.Chart.getChart(document.getElementById('revenueDetailChart'))
    return { current:detail.data.datasets[0].data,
      prior:detail.data.datasets.find((d:any)=>d.label.startsWith('Prior-year Net Sales')).data,
      growth:app.Chart.getChart(document.getElementById('growthChart')).data.datasets[0].data }
  })
  expect(result).toEqual({current:[20],prior:[20],growth:[0]})
  await expect(page.locator('#salesGrowthTable')).toContainText('2/12 months matched')
})

test('one peso scale includes prior values and margin rejects a negative revenue basis', async ({ page }) => {
  await financialFixture(page)
  await page.evaluate(() => {
    const app=window as any
    app.setSalesSectorsData({rows:[
      {date:'2024-01-20',period:'2024-01',revenue:1000,income:200,margin_revenue_basis:1000},
      {date:'2025-01-20',period:'2025-01',revenue:100,income:-10,margin_revenue_basis:-100},
    ],source:{file:'synthetic regression fixture',excluded:{}}})
    app.setCustomDateRange('2025-01-01','2025-01-31')
    app.setDescriptiveGranularity('monthly')
  })
  await page.selectOption('#salesTrendMeasureSelect', 'both')
  const result=await page.evaluate(()=>{
    const app=window as any, detail=app.Chart.getChart(document.getElementById('revenueDetailChart'))
    return {max:detail.scales.revenue.max,min:detail.scales.revenue.min,
      axes:[...new Set(detail.data.datasets.map((d:any)=>d.yAxisID))],
      margin:app.Chart.getChart(document.getElementById('marginChart')).data.datasets[0].data}
  })
  expect(result.max).toBeGreaterThanOrEqual(1000)
  expect(result.min).toBeLessThanOrEqual(-10)
  expect(result.axes).toEqual(['revenue'])
  expect(result.margin).toEqual([null])
  await page.screenshot({path:test.info().outputPath('sales.png'),fullPage:true})
})

test('leap-day comparison clamps once and does not double-count the prior day', async ({ page }) => {
  await financialFixture(page)
  await page.evaluate(() => {
    const app=window as any
    app.setSalesSectorsData({rows:[
      {date:'2023-02-28',period:'2023-02',revenue:10},
      {date:'2024-02-28',period:'2024-02',revenue:20},
      {date:'2024-02-29',period:'2024-02',revenue:30},
    ],source:{file:'synthetic regression fixture',excluded:{}}})
    app.setCustomDateRange('2024-02-28','2024-02-29');app.setDescriptiveGranularity('auto')
  })
  const result=await page.evaluate(()=>{
    const app=window as any, chart=app.Chart.getChart(document.getElementById('growthChart'))
    return chart.data.datasets[0].data
  })
  expect(result).toEqual([100,null])
  await expect(page.locator('#salesGrowthTable')).not.toContainText('2023-02-29')
  await expect(page.locator('#salesComparisonSubtitle')).toContainText('each prior-year day once')
})

test('regional net sales retain negative areas and withhold invalid concentration shares', async ({ page }) => {
  await page.evaluate(() => {
    const app=window as any
    app.showPage('territory');app.setDescriptivePeriod('custom');app.setCustomDateRange('2025-01-01','2025-12-31')
    const row=(territory:string,region:string|null,revenue:number)=>({date:'2025-02-15',period:'2025-02',territory,region,revenue,row_count:1,product:'Fixture',sector:'Private'})
    app.setSalesSectorsData({rows:[row('Quezon','CALABARZON',100),row('Batangas','CALABARZON',-20),row('Camarines Sur','Bicol',-10),row('Unassigned geography',null,7)],source:{file:'synthetic regression fixture',excluded:{}}})
  })
  const result=await page.evaluate(()=>{
    const app=window as any, chart=app.Chart.getChart(document.getElementById('sectorRevenueChart'))
    return {labels:chart.data.labels,net:chart.data.datasets[0].data,
      share:app.Chart.getChart(document.getElementById('sectorParetoChart')).data.datasets[1].data}
  })
  expect(result).toEqual({labels:['CALABARZON','Bicol'],net:[80,-10],share:[null,null]})
  await expect(page.locator('#areaMappedRevenue')).toContainText('70')
  await expect(page.locator('#areaMappedRevenueNote')).toContainText('₱7')
  await expect(page.locator('#sectorProfileTable tbody tr')).toHaveCount(3)
  await expect(page.locator('#sectorProfileTable tfoot')).toContainText('1 / 12')
  await expect(page.locator('#areaTopThreeShare')).toHaveText('Unavailable')
  await page.screenshot({path:test.info().outputPath('areas.png'),fullPage:true})
})

test('product presentation reconciles returns and all ABC classes', async ({ page }) => {
  await page.evaluate(() => {
    const app=window as any
    app.showPage('products');app.setDescriptivePeriod('custom');app.setCustomDateRange('2025-01-01','2025-12-31')
    app.setSalesSectorsData({rows:[
      {product:'Dominant',revenue:96,positive_sales:96,returns_value:0,period:'2025-02'},
      {product:'Small',revenue:4,positive_sales:4,returns_value:0,period:'2025-02'},
      {product:'Return only',revenue:-1,positive_sales:0,returns_value:-1,period:'2025-02'},
    ],source:{file:'synthetic regression fixture',excluded:{}}})
  })
  const result=await page.evaluate(()=>{
    const app=window as any, abc=app.Chart.getChart(document.getElementById('abcChart')),
      bar=app.Chart.getChart(document.getElementById('productBarChart'))
    return {labels:abc.data.labels,counts:abc.data.datasets[0].data,
      amounts:bar.data.datasets.map((d:any)=>d.data),min:app.Chart.getChart(document.getElementById('paretoCurveChart')).scales.y.min}
  })
  expect(result).toEqual({labels:['A · Largest contributors','B · Next contributors','C · Remaining contributors','Unclassified · Not grouped'],counts:[1,0,1,1],amounts:[[96,4,0],[0,0,-1]],min:0})
  await expect(page.locator('#productDisplayScope')).toContainText('Sales groups: all 3 names in this period and category')
  await expect(page.locator('#abcChart').locator('xpath=ancestor::div[contains(@class,"chart-card")]')).toContainText('A: 96.0%')
  await page.screenshot({path:test.info().outputPath('products.png'),fullPage:true})
  await page.setViewportSize({width:390,height:844})
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('initial history uses observed annual sales rather than current-year gap estimates', async ({page})=>{
  await page.evaluate(()=>{
    const app=window as any
    app.applyDatasetPatch({monthly:[{period:'2024-01',revenue:100,income:20},{period:'2025-01',revenue:200,income:40}],year_summary:[]})
    app.showPage('overview')
  })
  await expect(page.locator('#descriptivePeriodSelect')).toHaveValue('all')
  const chart=await page.evaluate(()=>{
    const c=(window as any).Chart.getChart(document.getElementById('overviewBaselineChart'))
    return {labels:c.data.labels,values:c.data.datasets[0].data,curvature:c.data.datasets[0].tension}
  })
  expect(chart.values).toEqual([100,200])
  expect(chart.labels).toHaveLength(2)
  expect(chart.curvature).toBe(0)
  await expect(page.locator('#overviewRevenueEvidence')).toContainText('no gap estimates')
  await expect(page.locator('#overviewBaselineChart').locator('xpath=ancestor::div[contains(@class,"chart-card")]')).toContainText('Observed endpoints')
})

test('observations and estimates form one connected line with marked transition segments', async ({page})=>{
  await page.evaluate(()=>{
    const app=window as any
    app.applyDatasetPatch({monthly:[
      {period:'2024-01',revenue:100,income:20}, {period:'2024-02',revenue:200,income:40},
      {period:'2024-03',revenue:150,income:30}, {period:'2025-01',revenue:300,income:60},
      {period:'2025-03',revenue:450,income:90},
    ],year_summary:[]})
    app.setDescriptivePeriod('custom');app.setDescriptiveGranularity('monthly');app.setCustomDateRange('2025-01-01','2025-03-31')
  })
  for (const pageName of ['overview','revenue']) {
    await page.evaluate(name=>(window as any).showPage(name),pageName)
    const id=pageName==='overview'?'overviewBaselineChart':'revenueDetailChart'
    await page.waitForFunction(id => Boolean((window as any).Chart.getChart(document.getElementById(id))?.data.datasets.length), id)
    const result=await page.evaluate(id=>{
      const chart=(window as any).Chart.getChart(document.getElementById(id))
      const data=chart.data.datasets[0]
      const raw=chart.config.data.datasets[0]
      return {values:data.data,points:data.pointStyle,evidence:data.evidence,
        segments:chart.getDatasetMeta(0).dataset.segments.map((s:any)=>({start:s.start,end:s.end})),
        firstDash:raw.segment.borderDash({p0DataIndex:0,p1DataIndex:1}),
        secondDash:raw.segment.borderDash({p0DataIndex:1,p1DataIndex:2}),
        tooltip:chart.config.options.plugins.tooltip.callbacks.label({dataset:data,dataIndex:1,raw:200})}
    },id)
    expect(result.values).toEqual([300,200,450])
    expect(result.points).toEqual(['circle','triangle','circle'])
    expect(result.evidence).toEqual(['actual','estimate','actual'])
    expect(result.firstDash).toEqual([6,4]);expect(result.secondDash).toEqual([6,4])
    expect(result.segments).toEqual([{start:0,end:2}])
    expect(result.tooltip).toContain('Gap estimate')
  }
  await expect(page.locator('#salesNetRevenue')).toHaveText('₱750')
  await page.locator('#revenueDetailChart').locator('xpath=ancestor::div[contains(@class,"chart-card")]').screenshot({path:test.info().outputPath('connected-estimates.png')})
})

test('quantity line and heatmap share index values and distinguish negative, zero and missing', async ({page})=>{
  await page.evaluate(()=>{
    const app=window as any
    app.showPage('revenue');app.setDescriptivePeriod('custom');app.setCustomDateRange('2025-01-01','2025-12-31');app.setDescriptiveGranularity('monthly')
    app.setSalesHeatmapData({products:[{id:'A',label:'Fixture product',category:'Unclassified',unit:'source units'}],monthly:
      Array.from({length:12},(_,i)=>({product:'A',period:'2025-'+String(i+1).padStart(2,'0'),area:'Quezon',quantity:i===0?-10:i===1?0:10,row_count:1})),
      daily:[],source:{file:'synthetic fixture',included_rows:12,excluded:{}}})
  })
  await page.getByRole('tab', {name:'Quantities',exact:true}).click()
  await expect(page.locator('#quantityHeatmapDetail')).not.toHaveAttribute('open','')
  await page.locator('#quantityHeatmapDetail summary').click()
  const colors=await page.locator('#revenueHeatmapGrid td').evaluateAll(cells=>cells.slice(0,3).map(cell=>(cell as HTMLElement).style.background))
  expect(new Set(colors).size).toBe(3)
  await expect(page.locator('#heatmapLegend')).toContainText('red: negative')
  await page.selectOption('#heatmapMeasure','index')
  const index=await page.evaluate(()=>({
    chart:(window as any).Chart.getChart(document.getElementById('quantityTrendChart')).data.datasets[0].data,
    cells:[...document.querySelectorAll('#revenueHeatmapGrid td')].map(cell=>Number((cell as HTMLElement).dataset.value)),
  }))
  expect(index.chart).toEqual(index.cells)
  expect(index.chart[0]).toBeCloseTo(-10/7.5)
  await expect(page.locator('#quantityTrendMeaning')).toContainText('1× = the selected year’s monthly average')
  await expect(page.locator('#heatmapInsight')).toContainText('1.33× the selected year’s monthly average')
  await page.screenshot({path:test.info().outputPath('quantity.png'),fullPage:true})
})

test('STL breaks gaps, explains full-history components, and keeps export free of plot-only gaps', async ({page})=>{
  // Compile the actual component into this isolated fixture page; no API credentials or app server.
  const sources=await Promise.all(['stl-view-model.ts','stl-panel.ts'].map(name=>readFile(path.resolve('services/api',name),'utf8')))
  const compiled=ts.transpileModule(sources.map(source=>source.replace(/^import .*$/gm,'').replace(/^export /gm,'')).join('\n'),{reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None}})
  expect(compiled.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error)).toEqual([])
  const script=compiled.outputText
  await page.evaluate(()=>{
    const app=window as any;app.showPage('revenue')
    app.getJson=async()=>({release:{fact_delta_version:16,dataset_id:'fixture',policy_version:'fixture'},parameters:{period:12,seasonal_window:13,robust:true,missing_policy:'no fill'},rows:[
      {period:'2024-01',observed:12,trend:10,seasonal:2,residual:0,segment_start:'2024-01',segment_end:'2024-01'},
      {period:'2024-03',observed:18,trend:20,seasonal:3,residual:-5,segment_start:'2024-03',segment_end:'2024-03'},
    ]})
  })
  await page.addScriptTag({content:script})
  await page.evaluate(()=>(window as any).installStlPanel(document.body))
  await page.getByRole('tab', {name:'Seasonality',exact:true}).click()
  await expect(page.locator('#descriptiveStlPanel canvas')).toHaveCount(3)
  const plots=await page.locator('#descriptiveStlPanel canvas').evaluateAll(canvases=>canvases.map(canvas=>{
    const c=(window as any).Chart.getChart(canvas);return {labels:c.data.labels,values:c.data.datasets[0].data,span:c.data.datasets[0].spanGaps}
  }))
  expect(plots[0]).toEqual({labels:['2024-01','2024-02','2024-03'],values:[12,null,18],span:false})
  expect(plots[1].values).toEqual([2,null,3])
  await expect(page.locator('#descriptiveStlPanel')).toContainText('Independent of the date filter')
  await expect(page.locator('#descriptiveStlPanel')).toContainText('Largest unusual difference')
  await page.locator('#stlResidualDetail summary').click()
  await expect(page.locator('#stlResidualDetail canvas')).toBeVisible()
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export STL components'}).click()
  const csv=await readFile((await(await download).path())!,'utf8')
  expect(csv).not.toContain('2024-02')
  expect(csv.trim().split('\r\n')).toHaveLength(3)
  await page.locator('#descriptiveStlPanel').screenshot({path:test.info().outputPath('stl.png')})
})
