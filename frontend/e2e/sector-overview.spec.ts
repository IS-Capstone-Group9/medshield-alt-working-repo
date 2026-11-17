import {test,expect} from '@playwright/test'
import path from 'node:path'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
import {MEDSHIELD_MARKUP,MEDSHIELD_STYLE} from '../lib/medshieldReference'
import {getExecutableDashboardScript} from '../services/api/dashboard-engine'

test.beforeEach(async({page})=>{
  await page.route('http://medshield.test/**',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}))
  await page.goto('http://medshield.test/')
  const overrides=await readFile(path.resolve('app/overrides.css'),'utf8')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style><style>${overrides}</style><div class="medshield-root">${MEDSHIELD_MARKUP}</div>`)
  await page.addScriptTag({path:path.resolve('node_modules/chart.js/dist/chart.umd.js')})
  await page.evaluate(script=>new Function(script)(),getExecutableDashboardScript())
  await page.evaluate(()=>{
    const app=window as any
    const entries=[['2017-01-15','Government',null,5,10],['2018-01-15','Private',40,10,40],['2024-01-15','Private',50,10,50],['2024-02-15','Government',100,20,80],['2024-02-15','Private',50,5,50],['2025-01-15','Government',200,20,100],['2025-01-15','Private',0,null,null],['2025-02-15','Government',100,-10,100],['2025-02-15','Internal',-10,-2,-10]]
    const daily:any[]=[], all=new Map<string,any>()
    for(const [date,sector,revenue,income,basis] of entries){
      const row={date,period:String(date).slice(0,7),sector,revenue,income,margin_revenue_basis:basis,evidence:'actual'};daily.push(row)
      const total=all.get(String(date))||{...row,sector:'All',revenue:null,income:null,margin_revenue_basis:null}
      for(const field of ['revenue','income','margin_revenue_basis'])if((row as any)[field]!=null)total[field]=(total[field]??0)+Number((row as any)[field])
      all.set(String(date),total)
    }
    daily.push(...all.values())
    const release={dataset_id:'isolated-sector-fixture',fact_delta_version:1,policy_version:'fixture',financial_scope:{id:'itemized',label:'Itemized'}}
    app.setOverviewSectorData({daily,source:{release},observations:{start:'2017-01-15',end:'2025-02-28'}})
    app.applyDatasetPatch({release,monthly:[...all.values()].map(r=>({...r,period:r.period})),year_summary:[]})
    app.showPage('overview');app.setDescriptivePeriod('all')
  })
  await page.selectOption('#overviewBuyerSector','Government')
})

test('dense monthly comparison hides repetitive markers and retains isolated observations',async({page},testInfo)=>{
  await page.setViewportSize({width:1440,height:1000})
  await page.evaluate(()=>(window as any).setDescriptiveGranularity('monthly'))
  const result=await page.evaluate(()=>{
    const app=window as any
    return ['overviewBaselineChart'].map(id=>{
      const chart=app.Chart.getChart(document.getElementById(id))
      return {ticks:chart.options.scales.x.ticks.maxTicksLimit,
        legend:chart.options.plugins.legend.labels.pointStyle,
        points:chart.getDatasetMeta(0).data.map((point:any)=>point.options.radius),
        values:chart.data.datasets[0].data,
        min:chart.options.scales.y.min,max:chart.options.scales.y.max}
    })
  })
  for(const chart of result){
    expect(chart.ticks).toBe(5);expect(chart.legend).toBe('line')
    expect(chart.points).toContain(0);expect(chart.points).toContain(2.5)
  }
  expect(result[0].values).toContain(null);expect(result[0].values).toContain(200)
  await expect(page.locator('#overviewTrendComparison > .chart-header .chart-subtitle')).not.toContainText('Shared peso scale')
  await expect(page.locator('#overviewSelectedCoverage')).not.toContainText('All Time')
  expect(await page.locator('#overviewSelectedPanel .chart-wrap').evaluate(node=>getComputedStyle(node).borderTopWidth)).toBe('0px')
  await page.locator('#overviewTrendComparison').screenshot({path:testInfo.outputPath('desktop.png')})
  await page.setViewportSize({width:390,height:844})
  await page.locator('#overviewTrendComparison').screenshot({path:testInfo.outputPath('mobile.png')})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
})

test('recorded source period within the study, sector totals and matching margin denominator remain coherent',async({page})=>{
  await expect(page.locator('#overviewHistoryView')).toHaveCount(0)
  await expect(page.locator('#overviewStudyPeriod')).toHaveText('Recorded data · 2017–2025')
  expect(await page.locator('#overviewTrendValues tbody tr').count()).toBe(9)
  await expect(page.locator('#overviewTrendValues')).toContainText('2018')
  await expect(page.locator('#overviewSectorControls')).toContainText('Quezon and Batangas currently map to Private')
  await expect(page.locator('#overviewSectorControls')).toContainText('Recorded sales and profit month counts are shown in the values tables')
  await expect(page.locator('#overviewSectorControls')).not.toContainText('Partial')
  await page.selectOption('#overviewBuyerSector','Government')
  await expect(page.locator('#kpiOverviewTotalRevenue')).toHaveText('₱400')
  await expect(page.locator('#kpiOverviewGrossProfit')).toHaveText('₱35')
  await expect(page.locator('#kpiOverviewMatchedGrowth')).toHaveText('0.0%')
  await expect(page.locator('#overviewMatchedGrowthNote')).toContainText('₱100 → ₱100')
  await expect(page.locator('#overviewObservationCoverageNote')).toContainText('95 months without sales records')
  const charts=await page.evaluate(()=>{
    const app=window as any,trend=app.Chart.getChart(document.getElementById('overviewBaselineChart')),margin=app.Chart.getChart(document.getElementById('overviewMarginChart'))
    return{trend:trend.data.datasets.map((d:any)=>d.data),margin:margin.data.datasets[0].data,labels:margin.data.labels}
  })
  expect(charts.trend[0]).toEqual([null,null,null,null,null,null,null,100,300]);expect(charts.trend[1]).toEqual([5,null,null,null,null,null,null,20,10])
  expect(charts.margin).toEqual([50,null,null,null,null,null,null,25,5])
  await expect(page.locator('#overviewTrendValues tbody tr').last()).toContainText('5.00%')
  await expect(page.locator('#overviewTrendValues tbody tr').first()).toContainText('₱5')
  await expect(page.locator('#overviewTrendValues tbody tr').first()).toContainText('Unavailable')
  await expect(page.locator('#overviewTrendValues tbody tr').first()).toContainText('1/12 profit months')
  await expect(page.locator('#overviewSelectedTrendValues')).not.toContainText('Partial')
  await expect(page.locator('#overviewSelectedTrendValues tbody tr').last().locator('td').first()).toHaveText('2025')
  await expect(page.locator('#overviewSelectedTrendValues tbody tr').last()).toContainText('2/12 observed sales months')
  await expect(page.locator('#overviewTrendReading')).toContainText('Totals use client-provided records')
  await expect(page.locator('#overviewProfitScatter')).toHaveCount(0)
  const download=page.waitForEvent('download');await page.locator('#overviewTrendExport').click()
  const stream=await(await download).createReadStream();let csv='';for await(const chunk of stream!)csv+=chunk
  expect(csv).toContain('"2025","Government","300","10","200","5"')
  await expect(page.locator('#overviewTrendValues')).toContainText('2018')
  expect(csv).toContain('All available years')
  expect(csv).not.toContain('additional context')
})

test('missing buyer scope stays unavailable while observed zero and negative sales remain values',async({page})=>{
  await page.evaluate(()=>{const app=window as any;app.setDescriptivePeriod('custom');app.setCustomDateRange('2018-01-01','2018-12-31');app.setDescriptiveGranularity('yearly')})
  await expect(page.locator('#kpiOverviewTotalRevenue')).toHaveText('No observations')
  await expect(page.locator('#overviewObservationCoverageNote')).toContainText('12 months without sales records')
  expect(await page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('overviewBaselineChart')).data.datasets[0].data)).toEqual([null])
  await page.evaluate(()=>(window as any).setDescriptivePeriod('all'))
  await page.selectOption('#overviewBuyerSector','Private')
  await expect(page.locator('#overviewTrendValues tbody tr').last()).toContainText('₱0')
  await page.selectOption('#overviewBuyerSector','Internal')
  await expect(page.locator('#overviewTrendValues tbody tr').last()).toContainText('-₱10')
  await expect(page.locator('#overviewTrendValues tbody tr').last()).toContainText('Unavailable')
})

test('exact-date and matched annual overlays keep sector and matching margin basis',async({page})=>{
  await page.selectOption('#overviewBuyerSector','Government')
  await page.evaluate(()=>{const app=window as any;app.setDescriptivePeriod('custom');app.setCustomDateRange('2025-01-01','2025-01-31');app.setDescriptiveGranularity('auto')})
  await expect(page.locator('#kpiOverviewTotalRevenue')).toHaveText('₱200')
  expect(await page.evaluate(()=>(window as any).getDiagnosticScope().sector)).toBe('Government')
  await page.evaluate(()=>{const app=window as any;app.setCustomDateRange('2025-01-01','2025-12-31');app.setDescriptiveGranularity('yearly');app.setDescriptiveComparisonMode('yoy')})
  expect(await page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('overviewMarginChart')).data.datasets[0].data)).toEqual([-10])
  await expect(page.locator('#overviewTrendValues')).toContainText('1/12 observed months')
})

test('comparison retains sector in inspection and clears stale results on failure before same-scope retry',async({page},testInfo)=>{
  const compiled=ts.transpileModule(await readFile(path.resolve('services/api/overview-sector-comparison.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
  await page.evaluate(compiled=>{
    const app=window as any;app.__comparisonFail=false;app.__inspections=[]
    window.addEventListener('medshield:diagnostic-open',(event:Event)=>app.__inspections.push((event as CustomEvent).detail))
    const release={dataset_id:'isolated-sector-fixture',fact_delta_version:1,policy_version:'fixture',financial_scope:{id:'itemized',label:'Itemized'}}
    const financial=(revenue:number)=>({revenue,income:10,margin_revenue_basis:50,margin_pct:20,rows:1,net_sales_eligible_rows:1,gross_margin_eligible_rows:1,original_source_rows:0,adjusted_estimated_rows:1,unresolved_product_rows:1,negative_sales:0})
    const sectors=[['Government',100,300],['Private',100,0],['Internal',0,-10]].map(([key,prior,current])=>({key,label:key,prior,current,delta:Number(current)-Number(prior),contribution_pct:(Number(current)-Number(prior))/90*100,prior_financial:financial(Number(prior)),current_financial:financial(Number(current))}))
    const compiledModule={exports:{} as any}
    new Function('require','module','exports',compiled)((name:string)=>{
      if(name!=='./diagnostics.service')throw new Error('Unexpected dependency')
      return{getSalesDiagnostics:async(scope:any)=>{if(app.__comparisonFail)throw new Error('Isolated comparison source unavailable');return{release,scope:{...scope,prior_start_date:scope.start_date.replace('2025','2024'),prior_end_date:scope.end_date.replace('2025','2024')},totals:{prior:200,current:290,delta:90,matched_months:2,expected_months:12,prior_financial:financial(200),current_financial:financial(290)},contributions:{sector:sectors}}}}
    },compiledModule,compiledModule.exports)
    compiledModule.exports.installOverviewSectorComparison(document.querySelector('.medshield-root'));app.buildCharts()
  },compiled)
  await expect(page.locator('#overviewSectorContributionTable tbody tr')).toHaveCount(3)
  await expect(page.locator('#overviewSectorContributionTable tbody tr').last()).toContainText('Internal')
  await page.locator('#overviewSectorDetails > summary').click()
  await page.selectOption('#overviewBuyerSector','Government')
  await expect(page.locator('#overviewSectorContributionTable tbody tr')).toHaveCount(3)
  await expect(page.locator('#overviewContributionVisual')).toBeVisible()
  await expect(page.locator('.contribution-row[data-sector=Government]')).toHaveAttribute('data-direction','increase')
  await expect(page.locator('.contribution-row[data-sector=Private]')).toHaveAttribute('data-direction','decrease')
  await expect(page.locator('.contribution-row[data-sector=Unknown], #overviewSectorContributionTable [data-sector=Unknown]')).toHaveCount(0)
  await expect(page.locator('#overviewContributionVisual')).toContainText('+₱90')
  await expect(page.locator('#overviewContributionVisual')).toContainText('222.22%')
  await page.locator('.contribution-row[data-sector=Government]').click()
  expect(await page.evaluate(()=>(window as any).__inspections.at(-1).sector)).toBe('Government')
  await page.evaluate(()=>{const app=window as any;app.__comparisonFail=true;app.setDescriptivePeriod('custom');app.setCustomDateRange('2025-01-01','2025-01-31')})
  await expect(page.locator('#overviewComparisonStatus')).toContainText('Isolated comparison source unavailable')
  await expect(page.locator('#overviewSectorContributionTable tbody tr')).toHaveCount(0)
  await expect(page.locator('#overviewContributionExport')).toBeDisabled()
  await expect(page.locator('#overviewContributionVisual')).toBeHidden()
  await page.evaluate(()=>(window as any).__comparisonFail=false)
  await page.locator('#overviewContributionRetry').click()
  await expect(page.locator('#overviewSectorContributionTable tbody tr')).toHaveCount(3)
  await expect(page.locator('#overviewComparisonStatus')).toContainText('Government · selected detail; table includes All sectors')
  await expect(page.locator('#overviewComparisonStatus')).toContainText('2025-01-01 – 2025-01-31')
  await expect(page.locator('#overviewContributionExport')).toBeEnabled()
  const contributionDownload=page.waitForEvent('download')
  await page.locator('#overviewContributionExport').click()
  const contributionStream=await(await contributionDownload).createReadStream();let contributionCsv=''
  for await(const chunk of contributionStream!)contributionCsv+=chunk
  expect(contributionCsv).toContain('"Government","2024-01-01","2024-01-31","2025-01-01","2025-01-31","100","300","200"')
  const chartScale=await page.locator('.contribution-track').evaluateAll(nodes=>nodes.slice(0,2).map(node=>({zero:(node as HTMLElement).style.getPropertyValue('--zero'),width:(node.firstElementChild as HTMLElement).style.width})))
  expect(chartScale[0].zero).toBe(chartScale[1].zero)
  expect(parseFloat(chartScale[0].width)/parseFloat(chartScale[1].width)).toBeCloseTo(2)
  await page.locator('#overviewContributionDetails > summary').click()
  await expect(page.getByRole('button',{name:'Inspect Government',exact:true})).toBeVisible()
  await page.locator('#overviewContributionDetails > summary').click()
  await page.setViewportSize({width:1440,height:1100})
  await page.locator('#overviewSectorComparison').screenshot({path:testInfo.outputPath('desktop.png')})
  await page.setViewportSize({width:390,height:844})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await expect(page.locator('.contribution-row[data-sector=Government]')).toBeVisible()
  await page.locator('#overviewSectorComparison').screenshot({path:testInfo.outputPath('mobile.png')})
})

test('one graph follows all buyer selections and preserves the filter on measure changes',async({page})=>{
  await expect(page.locator('#overviewBuyerSector')).toHaveValue('Government')
  await expect(page.locator('#overviewBuyerSector option')).toHaveText(['All sectors','Government','Private','Internal'])
  await expect(page.locator('#overviewTrendPanels canvas')).toHaveCount(1)
  await expect(page.locator('#page-overview > #overviewSectorControls')).toHaveCount(0)
  await expect(page.locator('[data-overview-trend-notes] #overviewSectorControls')).not.toBeVisible()
  await expect(page.locator('#overviewOutputSummary, #overviewPeriodCaption')).toHaveCount(0)
  await expect(page.locator('#overviewOverallPanel')).toHaveCount(0)
  await expect(page.locator('#overviewTrendComparison #overviewBuyerSector')).toHaveCount(1)
  for(const sector of ['All','Government','Private','Internal']){
    await page.selectOption('#overviewBuyerSector',sector)
    await expect(page.locator('#overviewSelectedTitle')).toHaveText(sector==='All'?'All sectors':sector)
    await expect(page.locator('#overviewSelectedCoverage')).toContainText(sector+' ·')
    await expect(page.locator('#overviewSelectedTrendValues')).toContainText(sector)
    const pending=page.waitForEvent('download');await page.locator('#overviewTrendExport').click();const download=await pending
    expect(download.suggestedFilename()).toBe('medshield-trend-'+sector+'.csv')
    const stream=await download.createReadStream();let csv='';for await(const chunk of stream!)csv+=chunk
    expect(csv).toContain('"2025","'+sector+'",')
    if(sector==='All')expect(csv).toContain('"2025","All","290","8"')
  }
  await page.selectOption('#overviewBuyerSector','Internal')
  await page.selectOption('#overviewTrendMeasureSelect','profit')
  await expect(page.locator('#overviewBuyerSector')).toHaveValue('Internal')
  const profit=await page.evaluate(()=>{const c=(window as any).Chart.getChart('overviewBaselineChart');return{visible:c.data.datasets.map((_:unknown,i:number)=>c.isDatasetVisible(i)),min:c.scales.y.min}})
  expect(profit.visible).toEqual([false,true]);expect(profit.min).toBeLessThan(0)
})

test('single graph retains date overlays, full history and responsive filter placement',async({page})=>{
  const read=()=>page.evaluate(()=>{const c=(window as any).Chart.getChart('overviewBaselineChart');return c.data.datasets.map((d:any)=>d.data)})
  await page.evaluate(()=>{const app=window as any;app.setDescriptivePeriod('custom');app.setCustomDateRange('2025-01-01','2025-01-31')})
  expect((await read())[0].filter((v:unknown)=>v!=null)).toEqual([200])
  await expect(page.locator('#overviewTrendMeasureSelect')).toBeDisabled()
  await page.evaluate(()=>{const app=window as any;app.setCustomDateRange('2025-01-01','2025-12-31');app.setDescriptiveGranularity('monthly');app.setDescriptiveComparisonMode('yoy')})
  expect((await read()).map((values:unknown[])=>values.slice(0,2))).toEqual([[200,100],[null,100],[20,-10],[null,20]])
  await page.evaluate(()=>(window as any).setDescriptiveGranularity('yearly'))
  expect(await read()).toEqual([[100],[100],[-10],[20]])
  await expect(page.locator('#overviewSelectedTrendValues')).toContainText('Prior sales')
  await page.evaluate(()=>{const app=window as any;app.setDescriptiveComparisonMode('single');app.setDescriptivePeriod('all')})
  await expect(page.locator('#overviewSelectedTrendValues')).toContainText('2018')
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000})
    await expect(page.locator('#overviewTrendPanels > article')).toHaveCount(1)
    await expect(page.locator('#overviewBuyerSector')).toBeVisible()
    await expect(page.locator('#overviewBuyerSector')).toHaveValue('Government')
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy()
  }
  await expect(page.locator('#overviewTrendMeasureSelect')).toHaveCount(1)
  await expect(page.locator('#overviewBuyerSector')).toHaveCount(1)
})
