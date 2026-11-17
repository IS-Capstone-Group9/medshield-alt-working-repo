import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import * as markup from '../services/api/dashboard-markup'
import { installDashboardFilterPanel } from '../services/api/dashboard-filter-panel'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'
import { installAnalyticsReadingGuide } from '../services/api/analytics-reading-guide'

for (const width of [390, 1440]) {
  test(`page reading guides preserve evidence limits and fit at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 })
    const ids = await page.locator('.page').evaluateAll(nodes => nodes.map(node => node.id))
    expect(ids.length).toBeGreaterThanOrEqual(9)
    for (const id of ids) {
      await page.evaluate(id => {
        document.querySelectorAll('.page').forEach(node => node.classList.toggle('active', node.id === id))
      }, id)
      const guide = page.locator(`#${id} > [data-analytics-reading]`)
      await expect(guide).toBeVisible()
      await expect(guide.locator('h2')).not.toBeEmpty()
      for (const label of ['Evidence type:', 'Use this page to:', 'Limit:', 'Where to check:']) {
        await expect(guide).toContainText(label)
      }
      const box = await guide.boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1)
    }
    await expect(page.locator('[data-analytics-reading="forecast"]')).toContainText('Past error shows how forecasts did on months already checked')
    await expect(page.locator('[data-analytics-reading="inventory"]')).toContainText('not an approved purchase')
    await expect(page.locator('[data-analytics-reading="territory"]')).toContainText('not verified disease risk')
    await expect(page.locator('#externalRegressionDetails > summary')).toBeAttached()
    await expect(page.locator('#externalRegressionDetails > [data-analytics-reading="external"]')).toContainText('reviewed joins and issue-time data vintages')
    await page.evaluate(() => {
      document.querySelectorAll('.page').forEach(node => node.classList.toggle('active', node.id === 'page-forecast'))
    })
    await page.locator('#page-forecast > [data-analytics-reading]').screenshot({ path: testInfo.outputPath(`reading-${width}.png`) })
  })
}

test('reading guide is idempotent and Help omits capstone scoring', async ({ page }) => {
  const count = await page.locator('[data-analytics-reading]').count()
  await page.evaluate(installAnalyticsReadingGuide, await page.$('body') as any)
  expect(await page.locator('[data-analytics-reading]').count()).toBe(count)
  await page.locator('#helpGuidanceModal').evaluate(node => { (node as HTMLElement).style.display = 'flex' })
  await expect(page.locator('#helpGuidanceModal')).toBeVisible()
  await expect(page.locator('[data-objective-status]')).toHaveCount(0)
})

test.beforeEach(async ({ page }) => {
  await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
  await page.addStyleTag({ path: path.resolve('app/overrides.css') })
  const source = await readFile(path.resolve('services/api/dashboard-enhancements.ts'), 'utf8')
  const script = ts.transpileModule(source.replace(/import[\s\S]*?from ['"][^'"]+['"]\s*/g, '').replace(/export /g, ''), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
  }).outputText
  await page.evaluate(({ script, markup, installer, sourcePage, readingInstaller }) => {
    const install = new Function(`return (${installer})`)()
    const enhance = new Function('SALES_DATA_NAV_ITEM', 'WEATHER_VALIDATION_NAV_ITEM', 'SALES_DATA_PAGE', 'WEATHER_VALIDATION_PAGE', 'installDashboardFilterPanel', 'DATABRICKS_SOURCE_PAGE', 'installAnalyticsReadingGuide', `${script}; return enhanceDashboardContent`)(
      markup.SALES_DATA_NAV_ITEM, markup.WEATHER_VALIDATION_NAV_ITEM, markup.SALES_DATA_PAGE, markup.WEATHER_VALIDATION_PAGE, install, sourcePage, new Function(`return (${readingInstaller})`)(),
    )
    enhance(document.body)
    window.fetch = async () => new Response('{}', { status: 503 })
  }, { script, markup, installer: installDashboardFilterPanel.toString(), sourcePage:markup.DATABRICKS_SOURCE_PAGE, readingInstaller: installAnalyticsReadingGuide.toString() })
  await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
  await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())
})

test('filters belong above dashboard content and retain period and navigation behavior', async ({ page },testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('503')) errors.push(message.text()) })
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({ monthly: [{ period: '2025-01', revenue: 100, income: 20 }, { period: '2025-02', revenue: 200, income: 40 }], year_summary: [] })
    app.buildCharts()
    app.buildCharts()
  })
  await expect(page.locator('.topbar select')).toHaveCount(0)
  await expect(page.locator('.content > #filterBar')).toBeVisible()
  // The topbar shows the page title, so this heading is for assistive technology and precedes the filters in reading order.
  await expect(page.locator('.content > #overviewWelcomeHeading + #filterBar')).toHaveCount(1)
  await expect(page.getByRole('region', { name: 'Analysis filters' })).toBeVisible()
  await page.getByLabel('Date range', { exact: true }).selectOption('custom')
  await expect(page.locator('#customDateStart')).toBeVisible()
  await page.locator('#customDateStart').fill('2025-01-01')
  await page.locator('#customDateEnd').fill('2025-06-30')
  await page.getByLabel('Chart interval', { exact: true }).selectOption('monthly')
  await page.getByLabel('Chart comparison', { exact: true }).selectOption('yoy')
  await page.evaluate(() => (window as any).showPage('products'))
  await expect(page.locator('#filterBar')).toBeVisible()
  await expect(page.locator('#descriptivePeriodSelect')).toHaveValue('custom')
  await page.evaluate(() => (window as any).showPage('forecast'))
  await expect(page.locator('#filterBar')).toBeHidden()
  await page.evaluate(() => (window as any).showPage('revenue'))
  await expect(page.locator('#filterBar')).toBeVisible()
  await page.waitForTimeout(250)
  expect(errors).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('desktop.png') })
})

test('overview calendar and trend retain observed values, negative sales and missing profit', async ({ page },testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('503')) errors.push(message.text()) })
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({ monthly: [
      { period: '2025-01', revenue: 100, income: 20 },
      { period: '2025-02', revenue: 0, income: 0 },
      { period: '2025-03', revenue: -20, income: -5 },
      { period: '2025-04', revenue: 50, income: null },
    ], year_summary: [] })
    app.setDescriptiveGranularity('monthly')
    app.buildCharts()
    app.buildCharts()
  })
  await page.locator('#overviewSalesDetails > summary').click()
  await expect(page.locator('#overviewSalesCalendar button[aria-label="2025-01: ₱100 observed net sales"]')).toBeVisible()
  await expect(page.locator('#descriptivePeriodSelect')).toHaveValue('all')
  await expect(page.locator('#overviewCalendarMethod')).toContainText('All Time')
  await expect(page.locator('#overviewCalendarNote')).toContainText('Highest observed month: 2025-01 · ₱100')
  await expect(page.locator('#overviewSalesCalendar button[aria-label="2025-02: ₱0 observed net sales"]')).toBeVisible()
  await page.locator('#overviewSalesCalendar button[aria-label^="2025-03:"]').click()
  await expect(page.locator('#overviewCalendarValue')).toContainText('-₱20')
  await expect(page.locator('#overviewSalesCalendar button[aria-label="2025-05: No observation in selected scope"]')).toBeVisible()
  const values = await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('overviewBaselineChart')).data.datasets.map((d:any)=>d.data.filter((value:number|null)=>value!==null)))
  expect(values).toEqual([[100,0,-20,50],[20,0,-5]])
  expect(errors).toEqual([])
  await page.locator('#overviewAnalyticalViews').screenshot({ path: testInfo.outputPath('overview-analytics.png') })
})

test('filter card fits a narrow screen including custom dates', async ({ page },testInfo) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.getByLabel('Date range', { exact: true }).selectOption('custom')
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({ monthly: [{ period: '2025-01', revenue: 100, income: 20 }], year_summary: [] })
    app.setCustomDateRange('2025-01-01', '2025-03-31')
  })
  for (const id of ['analysisScopeSelect', 'descriptivePeriodSelect', 'descriptiveComparisonSelect', 'chartGranularitySelect', 'customDateStart', 'customDateEnd']) {
    const box = await page.locator(`#${id}`).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(375)
  }
  await page.locator('#dashboardFilterSummary').click()
  await expect(page.locator('#overviewBaselineChart')).toBeVisible()
  const chartSize = await page.locator('#overviewBaselineChart').boundingBox()
  expect(chartSize!.width).toBeLessThanOrEqual(375)
  expect(chartSize!.height).toBeLessThanOrEqual(300)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  await page.screenshot({ path: testInfo.outputPath('mobile.png') })
})

async function load2026FilterFixture(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-25T04:00:00Z'))
  await page.evaluate(() => {
    const app = window as any
    const monthly = Array.from({length:33},(_,i) => ({period:`${2024+Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}`,revenue:(i+1)*10,income:(i+1)*2,margin_revenue_basis:(i+1)*10}))
    const daily = monthly.flatMap(row => ['All','Government','Private'].map(sector => {
      const weight = sector === 'All' ? 1 : sector === 'Government' ? 0.6 : 0.4
      return {...row,date:row.period+'-15',sector,revenue:row.revenue*weight,income:row.income*weight,margin_revenue_basis:row.margin_revenue_basis*weight}
    }))
    const release={dataset_id:'filter-fixture',fact_delta_version:0,policy_version:'filter-fixture',financial_scope:{id:'itemized',label:'Itemized'}}
    app.setOverviewSectorData({daily,source:{release},observations:{start:'2024-01-15',end:'2026-09-30'}})
    app.applyDatasetPatch({monthly,release,year_summary:[]})
    app.showPage('overview')
    app.setDescriptivePeriod('6',false)
  })
}

test('36 filter combinations preserve selected dates, real totals and prior-year overlays', async ({page}) => {
  await load2026FilterFixture(page)
  await page.selectOption('#overviewBuyerSector','All')
  for (const scope of ['extended','capstone']) {
    await page.selectOption('#analysisScopeSelect',scope)
    for (const months of [3,6,12]) {
      await page.selectOption('#descriptivePeriodSelect',String(months))
      const lastIndex=32
      const total=Array.from({length:months},(_,i)=>(lastIndex-i+1)*10).reduce((a,b)=>a+b,0)
      for (const grain of ['auto','monthly','yearly']) {
        await page.selectOption('#chartGranularitySelect',grain)
        for (const compare of ['single','yoy']) {
          await page.selectOption('#descriptiveComparisonSelect',compare)
          const value=await page.evaluate(()=>{
            const chart=(window as any).Chart.getChart(document.getElementById('overviewBaselineChart'))
            return {scope:(window as any).getDiagnosticScope(),firstPeriod:document.querySelector('#overviewSelectedTrendValues tbody tr td')?.textContent,sum:chart.data.datasets[0].data.reduce((a:number,b:number|null)=>a+(b??0),0),prior:chart.data.datasets.some((d:any)=>d.label.startsWith('Prior-year'))}
          })
          expect(value.sum,`${scope}/${months}/${grain}/${compare}`).toBe(total)
          expect(value.scope.end_date).toBe('2026-09-30')
          const startIndex=lastIndex-months+1
          expect(value.scope.start_date).toBe(`${2024+Math.floor(startIndex/12)}-${String(startIndex%12+1).padStart(2,'0')}-01`)
          expect(value.prior).toBe(compare==='yoy')
          if(grain==='yearly'&&months<12)expect(value.firstPeriod).toContain('selected dates')
          await expect(page.locator('#descriptivePeriodSelect')).toHaveValue(String(months))
        }
      }
    }
  }
})

test('all recorded dates and monthly/yearly grouping remain independent of data range',async({page})=>{
  await load2026FilterFixture(page)
  await page.selectOption('#overviewBuyerSector','All')
  await page.selectOption('#descriptivePeriodSelect','all')
  for(const scope of ['extended','capstone']) {
    await page.selectOption('#analysisScopeSelect',scope)
    for(const grain of ['monthly','yearly']) {
      await page.selectOption('#chartGranularitySelect',grain)
      const chart=await page.evaluate(()=>{const c=(window as any).Chart.getChart(document.getElementById('overviewBaselineChart'));return {labels:c.data.labels,total:c.data.datasets[0].data.reduce((a:number,b:number|null)=>a+(b??0),0)}})
      expect(chart.total).toBe(5610)
      expect(chart.labels).toHaveLength(grain==='monthly'?33:3)
      await expect(page.locator('#kpiOverviewObservationCoverage')).toHaveText('33/33')
      await expect(page.locator('#descriptivePeriodSelect')).toHaveValue('all')
      await expect(page.locator('#descriptivePeriodSelect option[value="all"]')).not.toContainText('Yearly')
    }
  }
})

test('custom dates honor permanent study bounds and reject invalid dates visibly',async({page})=>{
  await load2026FilterFixture(page)
  await page.selectOption('#overviewBuyerSector','All')
  await page.selectOption('#descriptivePeriodSelect','custom')
  await page.keyboard.press('Escape')
  await page.evaluate(()=>(window as any).setCustomDateRange('2025-02-01','2026-10-01'))
  await page.selectOption('#analysisScopeSelect','capstone')
  await expect(page.locator('#customDateStart')).toHaveValue('2025-02-01')
  await expect(page.locator('#customDateEnd')).toHaveValue('2026-09-30')
  for(const dates of [['2025-02-30','2025-03-31'],['2025-04-01','2025-03-31'],['2025-01-01','2026-10-01']]) {
    expect(await page.evaluate(([start,end])=>(window as any).setCustomDateRange(start,end),dates)).toBe(false)
    await expect(page.locator('#customDateError')).toContainText('Choose valid dates')
    await expect(page.locator('#customDateEnd')).toHaveValue('2026-09-30')
  }
  await page.evaluate(()=>(window as any).setCustomDateRange('2025-01-01','2025-12-31'))
  await expect(page.locator('#customDateError')).toBeEmpty()
  await page.selectOption('#descriptivePeriodSelect','6')
  await expect(page.locator('#dashboardFilterSummary')).toContainText('30 Sep 2026')
  await page.selectOption('#analysisScopeSelect','extended')
  await expect(page.locator('#descriptivePeriodSelect')).toHaveValue('6')
  await expect(page.locator('#dashboardFilterSummary')).toContainText('30 Sep 2026')
})

test('filter export, visible date summary and chart use the same six recorded months',async({page})=>{
  await load2026FilterFixture(page)
  await page.selectOption('#overviewBuyerSector','All')
  await page.selectOption('#chartGranularitySelect','monthly')
  await page.selectOption('#descriptiveComparisonSelect','yoy')
  await expect(page.locator('#dashboardFilterSummary')).toContainText('1 Apr 2026')
  await expect(page.locator('#dashboardFilterSummary')).toContainText('30 Sep 2026')
  const download=page.waitForEvent('download')
  await page.locator('#overviewTrendExport').click()
  const csv=await readFile((await (await download).path())!,'utf8')
  const lines=csv.trim().replace(/^\uFEFF/,'').split('\r\n').map(line=>[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replace(/""/g,'"')))
  const keys=lines.shift()!, rows=lines.map(line=>Object.fromEntries(keys.map((key,i)=>[key,line[i]])))
  expect(rows.map(row=>row.period)).toEqual(['2026-04','2026-05','2026-06','2026-07','2026-08','2026-09'])
  expect(rows.reduce((sum,row)=>sum+Number(row.net_sales),0)).toBe(1830)
  expect(rows.every(row=>row.comparison_mode==='yoy'&&row.dataset_id==='filter-fixture')).toBe(true)
})

test('cross-year comparisons keep every selected month and entering Custom cannot escape study bounds',async({page})=>{
  await load2026FilterFixture(page)
  await page.selectOption('#overviewBuyerSector','All')
  await page.selectOption('#descriptivePeriodSelect','12')
  expect(await page.evaluate(()=>(window as any).getOverviewComparisonScope())).toMatchObject({start_date:'2025-10-01',end_date:'2026-09-30'})
  await page.selectOption('#analysisScopeSelect','capstone')
  await expect(page.locator('#descriptivePeriodSelect')).toHaveValue('12')
  await page.selectOption('#descriptivePeriodSelect','custom')
  await page.keyboard.press('Escape')
  await expect(page.locator('#customDateEnd')).toHaveValue('2026-09-30')
  const scope=await page.evaluate(()=>(window as any).getDiagnosticScope())
  expect(scope.start_date>='2017-01-01'&&scope.end_date<='2026-09-30').toBe(true)
})

test('comparison only appears where supported and empty buyers keep the company date anchor',async({page},testInfo)=>{
  await load2026FilterFixture(page)
  await page.selectOption('#overviewBuyerSector','All')
  await page.selectOption('#overviewBuyerSector','Internal')
  await expect(page.locator('#dashboardFilterSummary')).toContainText('2026-09')
  await expect(page.locator('#overviewSelectedCoverage')).toContainText('0/6')
  await page.evaluate(()=>(window as any).showPage('products'))
  await expect(page.locator('#descriptiveComparisonSelect')).toBeHidden()
  await page.evaluate(()=>(window as any).showPage('territory'))
  await expect(page.locator('#descriptiveComparisonSelect')).toBeHidden()
  await page.evaluate(()=>(window as any).showPage('overview'))
  await expect(page.locator('#descriptiveComparisonSelect')).toBeVisible()
  await page.setViewportSize({width:390,height:844})
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.locator('#filterBar').screenshot({path:testInfo.outputPath('repaired-filters-mobile.png')})
})


test('study cutoff stays fixed while all available years accepts future recorded years', async ({page}) => {
  await load2026FilterFixture(page)
  await page.clock.setFixedTime(new Date('2028-02-15T04:00:00Z'))
  await page.evaluate(() => {
    const app=window as any
    const monthly=[{period:'2026-09',revenue:100,income:20,margin_revenue_basis:100},{period:'2027-12',revenue:300,income:60,margin_revenue_basis:300}]
    const release={dataset_id:'future-filter-fixture',fact_delta_version:0,policy_version:'candidate',financial_scope:{id:'itemized',label:'Itemized'}}
    app.setOverviewSectorData({daily:monthly.map(row=>({...row,date:row.period+'-15',sector:'All'})),source:{release},observations:{start:'2026-09-15',end:'2027-12-31'}})
    app.applyDatasetPatch({monthly,release,year_summary:[]})
    app.setDescriptivePeriod('all',false)
  })
  await page.selectOption('#analysisScopeSelect','extended')
  expect(await page.evaluate(()=>(window as any).getDiagnosticScope())).toMatchObject({end_date:'2027-12-31'})
  await page.selectOption('#analysisScopeSelect','capstone')
  expect(await page.evaluate(()=>(window as any).getDiagnosticScope())).toMatchObject({end_date:'2026-09-30'})
  await expect(page.locator('#analysisScopeSelect option[value="capstone"]')).toHaveText('Study · Jan 2017–Sep 2026')
})
