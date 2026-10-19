import {test,expect} from '@playwright/test'
import path from 'node:path'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
import {MEDSHIELD_MARKUP,MEDSHIELD_STYLE} from '../lib/medshieldReference'
import {getExecutableDashboardScript} from '../services/api/dashboard-engine'

test.beforeEach(async({page})=>{
  await page.route('http://medshield.test/**',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style><div class="medshield-root">${MEDSHIELD_MARKUP}</div>`)
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
    const release={dataset_id:'isolated-sector-fixture',fact_delta_version:1,policy_version:'fixture'}
    app.setOverviewSectorData({daily,source:{release}})
    app.applyDatasetPatch({release,monthly:[...all.values()].map(r=>({...r,period:r.period})),year_summary:[]})
    app.showPage('overview');app.setDescriptivePeriod('all')
  })
})

test('2017–2025 study default, sector totals and matching margin denominator remain coherent',async({page})=>{
  await expect(page.locator('#overviewHistoryView')).toHaveCount(0)
  await expect(page.locator('#overviewStudyPeriod')).toHaveText('Study period · 2017–2025')
  expect(await page.locator('#overviewTrendValues tbody tr').count()).toBe(9)
  await expect(page.locator('#overviewTrendValues')).toContainText('2018')
  await expect(page.locator('#overviewSectorControls')).toContainText('Quezon and Batangas currently map to Private')
  await expect(page.locator('#overviewSectorControls')).toContainText('Totals use the client-provided sales records')
  await expect(page.locator('#overviewSectorControls')).not.toContainText('Partial')
  await page.selectOption('#overviewBuyerSector','Government')
  await expect(page.locator('#kpiOverviewTotalRevenue')).toHaveText('₱400')
  await expect(page.locator('#kpiOverviewGrossProfit')).toHaveText('₱35')
  await expect(page.locator('#overviewObservationCoverageNote')).toContainText('3 of 108')
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
  expect(csv).toContain('Study 2017–2025')
  expect(csv).not.toContain('additional context')
})

test('missing buyer scope stays unavailable while observed zero and negative sales remain values',async({page})=>{
  await page.selectOption('#overviewBuyerSector','Unknown')
  await expect(page.locator('#kpiOverviewTotalRevenue')).toHaveText('No observations')
  await expect(page.locator('#overviewObservationCoverageNote')).toContainText('0 of 108')
  expect(await page.evaluate(()=>(window as any).Chart.getChart(document.getElementById('overviewBaselineChart')).data.datasets[0].data)).toEqual([null,null,null,null,null,null,null,null,null])
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

test('comparison retains sector in inspection and clears stale results on failure before same-scope retry',async({page})=>{
  const compiled=ts.transpileModule(await readFile(path.resolve('services/api/overview-sector-comparison.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
  await page.evaluate(compiled=>{
    const app=window as any;app.__comparisonFail=false;app.__inspections=[]
    window.addEventListener('medshield:diagnostic-open',(event:Event)=>app.__inspections.push((event as CustomEvent).detail))
    const release={dataset_id:'isolated-sector-fixture',fact_delta_version:1,policy_version:'fixture'}
    const financial=(revenue:number)=>({revenue,income:10,margin_revenue_basis:50,margin_pct:20,rows:1,net_sales_eligible_rows:1,gross_margin_eligible_rows:1,original_source_rows:0,adjusted_estimated_rows:1,unresolved_product_rows:1,negative_sales:0})
    const sectors=[['Government',100,300],['Private',100,0],['Internal',0,-10]].map(([key,prior,current])=>({key,label:key,prior,current,delta:Number(current)-Number(prior),contribution_pct:(Number(current)-Number(prior))/90*100,prior_financial:financial(Number(prior)),current_financial:financial(Number(current))}))
    const compiledModule={exports:{} as any}
    new Function('require','module','exports',compiled)((name:string)=>{
      if(name!=='./diagnostics.service')throw new Error('Unexpected dependency')
      return{getSalesDiagnostics:async(scope:any)=>{if(app.__comparisonFail)throw new Error('Isolated comparison source unavailable');return{release,scope:{...scope,prior_start_date:scope.start_date.replace('2025','2024'),prior_end_date:scope.end_date.replace('2025','2024')},totals:{prior:200,current:290,delta:90,matched_months:2,expected_months:12,prior_financial:financial(200),current_financial:financial(290)},contributions:{sector:sectors}}}}
    },compiledModule,compiledModule.exports)
    compiledModule.exports.installOverviewSectorComparison(document.querySelector('.medshield-root'));app.buildCharts()
  },compiled)
  await expect(page.locator('#overviewSectorContributionTable tbody tr')).toHaveCount(4)
  await expect(page.locator('#overviewSectorContributionTable tbody tr').last()).toContainText('accounting absence')
  await page.selectOption('#overviewBuyerSector','Government')
  await expect(page.locator('#overviewSectorContributionTable tbody tr')).toHaveCount(4)
  await page.getByRole('button',{name:'Inspect Government',exact:true}).click()
  expect(await page.evaluate(()=>(window as any).__inspections.at(-1).sector)).toBe('Government')
  await page.evaluate(()=>{const app=window as any;app.__comparisonFail=true;app.setDescriptivePeriod('custom');app.setCustomDateRange('2025-01-01','2025-01-31')})
  await expect(page.locator('#overviewComparisonStatus')).toContainText('Isolated comparison source unavailable')
  await expect(page.locator('#overviewSectorContributionTable tbody tr')).toHaveCount(0)
  await expect(page.locator('#overviewContributionExport')).toBeDisabled()
  await page.evaluate(()=>(window as any).__comparisonFail=false)
  await page.locator('#overviewContributionRetry').click()
  await expect(page.locator('#overviewSectorContributionTable tbody tr')).toHaveCount(4)
  await expect(page.locator('#overviewComparisonStatus')).toContainText('Government · selected detail; table includes All sectors')
  await expect(page.locator('#overviewComparisonStatus')).toContainText('2025-01-01 – 2025-01-31')
  await expect(page.locator('#overviewContributionExport')).toBeEnabled()
})

test('overall stays fixed beside all four sector selections with shared scales and scoped exports',async({page})=>{
  await expect(page.locator('#overviewBuyerSector')).toHaveValue('Government')
  expect(await page.locator('#overviewBuyerSector option').allTextContents()).toEqual(['Government','Private','Internal','Unknown'])
  await expect(page.locator('#overviewSelectedPanel #overviewBuyerSector')).toHaveCount(1)
  const read=()=>page.evaluate(()=>{
    const app=window as any
    const get=(id:string)=>{const c=app.Chart.getChart(document.getElementById(id));return{labels:c.data.labels,sales:c.data.datasets[0].data,profit:c.data.datasets[1].data,min:c.scales.y.min,max:c.scales.y.max,visible:c.data.datasets.map((_:unknown,i:number)=>c.isDatasetVisible(i))}}
    return{all:get('overviewOverallChart'),selected:get('overviewBaselineChart')}
  })
  const original=(await read()).all
  expect(original.sales).toEqual([null,40,null,null,null,null,null,200,290])
  for(const sector of ['Government','Private','Internal','Unknown']){
    await page.selectOption('#overviewBuyerSector',sector)
    const charts=await read()
    expect(charts.all.sales).toEqual(original.sales)
    expect(charts.all.profit).toEqual(original.profit)
    expect(charts.all.labels).toEqual(charts.selected.labels)
    expect([charts.all.min,charts.all.max]).toEqual([charts.selected.min,charts.selected.max])
    await expect(page.locator('#overviewSelectedTitle')).toHaveText(sector)
    await expect(page.locator('#overviewSelectedCoverage')).toContainText(sector+' ·')
    await expect(page.locator('#overviewOverallTrendValues')).toContainText('All')
    await expect(page.locator('#overviewSelectedTrendValues')).toContainText(sector)
    for(const [button,scope] of [['overviewOverallExport','All'],['overviewTrendExport',sector]]){
      const pending=page.waitForEvent('download');await page.locator('#'+button).click();const download=await pending
      expect(download.suggestedFilename()).toBe('medshield-trend-'+scope+'.csv')
      const stream=await download.createReadStream();let csv='';for await(const chunk of stream!)csv+=chunk
      expect(csv).toContain('"2025","'+scope+'",')
      if(scope==='All')expect(csv).toContain('"2025","All","290","8"')
      if(scope==='Unknown')expect(csv).toContain('"2025","Unknown","",""')
    }
  }
  await expect(page.locator('#overviewSelectedEmpty')).toContainText('No recorded observations')
  await expect(page.locator('#overviewSelectedPanel .chart-wrap')).toBeHidden()
  await expect(page.locator('#overviewOverallPanel .chart-wrap')).toBeVisible()
  await page.selectOption('#overviewBuyerSector','Internal')
  await page.selectOption('#overviewTrendMeasureSelect','profit')
  const profit=await read()
  expect(profit.all.visible).toEqual([false,true]);expect(profit.selected.visible).toEqual([false,true])
  expect(profit.all.min).toBeLessThan(0)
  expect(profit.all.min).toBe(profit.selected.min)
})

test('both graphs share exact dates, matched overlays, full study history and mobile stacking',async({page})=>{
  await page.evaluate(()=>{const app=window as any;app.setDescriptivePeriod('custom');app.setCustomDateRange('2025-01-01','2025-01-31')})
  const daily=await page.evaluate(()=>['overviewOverallChart','overviewBaselineChart'].map(id=>{const c=(window as any).Chart.getChart(document.getElementById(id));return{labels:c.data.labels,values:c.data.datasets[0].data}}))
  expect(daily[0].labels).toEqual(daily[1].labels)
  expect(daily[0].values.filter((v:unknown)=>v!=null)).toEqual([200])
  expect(daily[1].values.filter((v:unknown)=>v!=null)).toEqual([200])
  await expect(page.locator('#overviewTrendMeasureSelect')).toBeDisabled()
  await page.evaluate(()=>{const app=window as any;app.setCustomDateRange('2025-01-01','2025-12-31');app.setDescriptiveGranularity('monthly');app.setDescriptiveComparisonMode('yoy')})
  const monthly=await page.evaluate(()=>['overviewOverallChart','overviewBaselineChart'].map(id=>{const c=(window as any).Chart.getChart(document.getElementById(id));return{labels:c.data.labels,values:c.data.datasets.map((d:any)=>d.data.slice(0,2))}}))
  expect(monthly[0].labels).toEqual(monthly[1].labels)
  expect(monthly[0].values).toEqual([[200,90],[50,150],[20,-12],[10,25]])
  expect(monthly[1].values).toEqual([[200,100],[null,100],[20,-10],[null,20]])
  await page.evaluate(()=>(window as any).setDescriptiveGranularity('yearly'))
  const annual=await page.evaluate(()=>['overviewOverallChart','overviewBaselineChart'].map(id=>{const c=(window as any).Chart.getChart(document.getElementById(id));return c.data.datasets.map((d:any)=>d.data)}))
  expect(annual[0]).toEqual([[290],[200],[8],[35]])
  expect(annual[1]).toEqual([[100],[100],[-10],[20]])
  await expect(page.locator('#overviewOverallTrendValues')).toContainText('Prior sales')
  await page.evaluate(()=>{const app=window as any;app.setDescriptiveComparisonMode('single');app.setDescriptivePeriod('all')})
  await expect(page.locator('#overviewOverallTrendValues')).toContainText('2018')
  await expect(page.locator('#overviewSelectedTrendValues')).toContainText('2018')
  await page.setViewportSize({width:1440,height:1100})
  const desktop=await page.locator('#overviewTrendPanels > article').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y}}))
  expect(desktop[0].y).toBe(desktop[1].y);expect(desktop[1].x).toBeGreaterThan(desktop[0].x)
  await page.setViewportSize({width:390,height:844})
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy()
  const mobile=await page.locator('#overviewTrendPanels > article').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y}}))
  expect(mobile[0].x).toBe(mobile[1].x);expect(mobile[1].y).toBeGreaterThan(mobile[0].y)
  await expect(page.locator('#overviewTrendMeasureSelect')).toHaveCount(1)
  await expect(page.locator('#overviewBuyerSector')).toHaveCount(1)
  await page.locator('.medshield-root').evaluate(root=>{(root as HTMLElement).style.setProperty('--bg-surface','#173042')})
  await expect(page.locator('#overviewBuyerSector')).toHaveValue('Government')
  const surface=await page.locator('#overviewOverallPanel').evaluate(panel=>{
    const probe=document.createElement('span');probe.style.backgroundColor='var(--bg-surface)';panel.append(probe)
    const expected=getComputedStyle(probe).backgroundColor,actual=getComputedStyle(panel).backgroundColor
    probe.remove();return{expected,actual}
  })
  expect(surface.actual).toBe(surface.expected)
})
