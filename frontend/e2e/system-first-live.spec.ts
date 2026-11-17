import {test,expect,type Page,type Locator} from '@playwright/test'
import {readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {signInToReadyDashboard} from './helpers/dashboard'

test.use({trace:'off',video:'off',screenshot:'off'})
const dataset='e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10'
function csv(text:string){
  const rows:string[][]=[];let row:string[]=[],cell='',quoted=false
  for(let i=0;i<text.length;i++){
    const c=text[i]
    if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
    else if(c===','&&!quoted){row.push(cell);cell=''}
    else if(c==='\n'&&!quoted){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell=''}
    else cell+=c
  }
  if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row)}
  const header=rows.shift()!;header[0]=header[0].replace(/^\uFEFF/,'')
  return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]??''])))
}
async function download(page:Page,button:Locator){
  await button.evaluate(element=>{for(let p=element.parentElement;p;p=p.parentElement)if(p instanceof HTMLDetailsElement)p.open=true})
  await expect(button).toBeEnabled({timeout:90000})
  const event=page.waitForEvent('download');await button.click();const file=await event
  const bytes=await readFile((await file.path())!)
  return {rows:csv(bytes.toString('utf8')),receipt:{filename:file.suggestedFilename(),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}}
}
const nullable=(s:string)=>s===''?null:Number(s)
const numberText=(s:string)=>s.includes('Unavailable')?null:Number(s.replace(/[^\d.−-]/g,'').replace('−','-'))

test('live study API, chart, table and native CSV agree through September 2026',async({page},info)=>{
  test.setTimeout(180000)
  let financial:any
  page.on('response',async response=>{if(response.url().includes('/api/financial/dashboard?financial_scope=itemized')&&response.status()===200)financial=await response.json()})
  await signInToReadyDashboard(page)
  await expect.poll(()=>!!financial,{timeout:90000}).toBe(true)
  expect(financial.snapshot.data_status.release.dataset_id).toBe(dataset)
  expect(financial.snapshot.data_status.release.fact_delta_version).toBe(0)
  await page.selectOption('#analysisScopeSelect','capstone')
  await page.selectOption('#descriptivePeriodSelect','all')
  await page.selectOption('#chartGranularitySelect','monthly')
  await page.selectOption('#descriptiveComparisonSelect','single')
  await page.selectOption('#overviewBuyerSector','All')
  expect(await page.evaluate(()=>(window as any).getDiagnosticScope())).toMatchObject({start_date:'2017-01-01',end_date:'2026-09-30'})
  const result=await download(page,page.locator('#overviewTrendExport'))
  expect(result.rows).toHaveLength(117)
  expect(result.rows.at(-1)!.period).toBe('2026-09')
  const api=new Map<string,{revenue:number|null;income:number|null}>()
  for(const day of financial.sectors.daily){
    if(day.sector!=='All'||day.date<'2017-01-01'||day.date>'2026-09-30')continue
    const current=api.get(day.period)??{revenue:null,income:null}
    for(const field of ['revenue','income'] as const)if(day[field]!=null)current[field]=(current[field]??0)+Number(day[field])
    api.set(day.period,current)
  }
  let observed=0,total=0
  for(const row of result.rows){
    expect(row.dataset_id).toBe(dataset);expect(row.fact_version).toBe('0')
    expect(row.study_end).toBe('2026-09-30');expect(row.missing_observation_policy).toBe('unavailable_not_zero')
    const expected=api.get(row.period)
    for(const [column,field] of [['net_sales','revenue'],['gross_profit','income']] as const){
      const actual=nullable(row[column]),wanted=expected?.[field]??null
      if(wanted===null)expect(actual).toBeNull();else expect(actual!).toBeCloseTo(wanted,5)
    }
    if(nullable(row.net_sales)!==null){observed++;total+=Number(row.net_sales)}
  }
  expect(observed).toBe(107);expect(total).toBeCloseTo(638015351.53,2)
  const chart=await page.locator('#overviewBaselineChart').evaluate(canvas=>{
    const c=(window as any).Chart.getChart(canvas);return {sales:c.data.datasets[0].data,profit:c.data.datasets[1].data}
  })
  expect(chart.sales).toEqual(result.rows.map(r=>nullable(r.net_sales)))
  expect(chart.profit).toEqual(result.rows.map(r=>nullable(r.gross_profit)))
  const table=await page.locator('#overviewSelectedTrendValues tbody tr').evaluateAll(rows=>rows.map(r=>Array.from(r.querySelectorAll('td'),x=>x.textContent||'')))
  expect(table).toHaveLength(117)
  for(let i=0;i<table.length;i++)for(const [index,key] of [[2,'net_sales'],[3,'gross_profit']] as const){
    const expected=nullable(result.rows[i][key]),shown=numberText(table[i][index])
    if(expected===null)expect(shown).toBeNull();else expect(shown!).toBeCloseTo(expected,0)
  }
  await writeFile(info.outputPath('overview-parity.json'),JSON.stringify({source:dataset,version:0,scope:'2017-01-01/2026-09-30',calendar_slots:117,observed,total_net:total,api_chart_table_csv:true,download:result.receipt},null,2))
  await page.screenshot({path:info.outputPath('study-overview.png'),animations:'disabled'})
})

test('live product, area and forecast native outputs retain current source and visible values',async({page},info)=>{
  test.setTimeout(240000)
  let tournament:any,regional:any,unit:any
  const apiStatuses:Array<{path:string;status:number}>=[]
  page.on('response',async response=>{
    const path=new URL(response.url()).pathname
    if(path.startsWith('/api/sales/'))apiStatuses.push({path,status:response.status()})
    if(path==='/api/sales/tournament-research'&&response.status()===200)tournament=await response.json()
    if(path==='/api/sales/regional-php-research'&&response.status()===200)regional=await response.json()
    if(path==='/api/sales/unit-baseline-research'&&response.status()===200)unit=await response.json()
  })
  await signInToReadyDashboard(page)
  const receipts:any[]=[]
  await page.locator('[data-dashboard-page="products"]').click()
  const products=await download(page,page.locator('#productPriorityExport'))
  expect(products.rows.length).toBeGreaterThan(0)
  expect(products.rows.every(r=>r['Dataset ID']===dataset&&r['Fact Delta version']==='0')).toBe(true)
  const visibleProduct=await page.locator('#productTable tbody tr').first().innerText()
  expect(visibleProduct).toContain(products.rows[0]['Source product label'])
  const visibleProducts=await page.locator('#productTable tbody tr').evaluateAll(rows=>rows.map(r=>Array.from(r.querySelectorAll('td'),x=>x.textContent||'')))
  for(const row of visibleProducts){
    const exported=products.rows.find(p=>p['Source product label']===row[1])!
    expect(exported).toBeDefined();expect(numberText(row[2])!).toBeCloseTo(Number(exported['Net sales PHP']),2)
    expect(numberText(row[3])!).toBeCloseTo(Number(exported['Contribution share percent']),2)
  }
  receipts.push({name:'product',...products.receipt,rows:products.rows.length})
  await expect(page.locator('[data-abc-status]')).not.toContainText('Loading',{timeout:90000})
  const abcStatus=await page.locator('[data-abc-status]').innerText()
  await writeFile(info.outputPath('abc-before-export.json'),JSON.stringify({status:abcStatus,apiStatuses},null,2))
  if(abcStatus.startsWith('Source changed.'))await page.locator('[data-abc-reload]').click()
  expect(abcStatus,'ABC must load or explicitly request a source-change reload').not.toContain('unavailable')
  const abc=await download(page,page.locator('[data-abc-metric-export]'))
  expect(abc.rows.length).toBeGreaterThan(0);expect(await page.locator('[data-abc-source]').innerText()).toContain(dataset)
  const confusion=await page.locator('[data-abc-matrix] tbody tr').evaluateAll(rows=>rows.map(r=>Array.from(r.querySelectorAll('td')).slice(1).map(x=>Number(x.textContent))))
  for(let i=0;i<3;i++){
    const row=abc.rows.find(r=>r.class===['A','B','C'][i])!,support=confusion[i].reduce((a,b)=>a+b,0),predicted=confusion.reduce((sum,r)=>sum+r[i],0)
    const recall=support?confusion[i][i]/support:0,precision=predicted?confusion[i][i]/predicted:0,f1=recall+precision?2*recall*precision/(recall+precision):0
    expect(Number(row.support)).toBe(support);expect(Number(row.predicted_count)).toBe(predicted)
    expect(Number(row.recall)).toBeCloseTo(recall,10);expect(Number(row.precision)).toBeCloseTo(precision,10);expect(Number(row.f1)).toBeCloseTo(f1,10)
  }
  receipts.push({name:'abc_metrics',...abc.receipt,rows:abc.rows.length})
  await page.locator('[data-dashboard-page="territory"]').click()
  const area=await download(page,page.locator('#areaReviewExport'))
  expect(area.rows.length).toBeGreaterThan(0);expect(area.rows.every(r=>r.dataset_id===dataset&&r.source_delta_version==='0')).toBe(true)
  const areaRows=await page.locator('#areaReviewTable tbody tr').evaluateAll(rows=>rows.map(r=>Array.from(r.querySelectorAll('td'),x=>x.textContent||'')))
  expect(areaRows).toHaveLength(area.rows.length)
  for(let i=0;i<areaRows.length;i++){
    expect(areaRows[i][0]).toBe(area.rows[i].raw_area)
    const expected=nullable(area.rows[i].net_sales_php),shown=numberText(areaRows[i][2])
    if(expected===null)expect(shown).toBeNull();else expect(shown!).toBeCloseTo(expected,2)
    expect(areaRows[i][4]).toBe(area.rows[i].observed_abc)
  }
  receipts.push({name:'area',...area.receipt,rows:area.rows.length})
  await page.locator('[data-dashboard-page="forecast"]').click()
  await page.locator('#forecastResearchDetails > summary').click()
  await page.locator('#forecastResearchDetails > details:has([data-tournament-export]) > summary').click()
  const company=await download(page,page.locator('[data-tournament-export]'))
  await expect.poll(()=>!!tournament,{timeout:90000}).toBe(true)
  expect(company.rows.length).toBeGreaterThan(0)
  const stage=await page.locator('[data-tournament-stage]').inputValue(),lead=Number(await page.locator('[data-tournament-lead]').inputValue()),model=await page.locator('[data-tournament-model]').inputValue()
  const expected=tournament.points.filter((p:any)=>p.stage===stage&&p.lead_months===lead&&p.model_id===model).sort((a:any,b:any)=>a.origin_period.localeCompare(b.origin_period))
  expect(company.rows).toHaveLength(expected.length)
  for(let i=0;i<expected.length;i++){
    const row=company.rows[i],p=expected[i];expect(row.dataset_id).toBe(dataset);expect(row.fact_version).toBe('0');expect(row.target_month).toBe(p.target_period)
    expect(nullable(row.actual_php)).toBe(p.actual);expect(nullable(row.prediction_php)).toBe(p.prediction)
    if(p.prediction===null)expect(nullable(row.prediction_minus_actual_php)).toBeNull();else expect(Number(row.prediction_minus_actual_php)).toBeCloseTo(p.prediction-p.actual,5)
  }
  const forecastTable=await page.locator('[data-tournament-points] tbody tr').evaluateAll(rows=>rows.map(r=>Array.from(r.querySelectorAll('td'),x=>x.textContent||'')))
  expect(forecastTable).toHaveLength(expected.length)
  for(let i=0;i<expected.length;i++){expect(forecastTable[i][1]).toBe(expected[i].target_period);expect(numberText(forecastTable[i][3])!).toBeCloseTo(expected[i].actual,2)}
  const forecastChart=await page.locator('[data-tournament-chart]').evaluate(canvas=>{
    const chart=(window as any).Chart.getChart(canvas);return {actual:chart.data.datasets[0].data,prediction:chart.data.datasets[1].data}
  })
  expect(forecastChart.actual).toEqual(expected.map((p:any)=>p.actual));expect(forecastChart.prediction).toEqual(expected.map((p:any)=>p.prediction))
  receipts.push({name:'company_tournament',...company.receipt,rows:company.rows.length,api_table_csv:true})
  for(const [name,selector] of [['regional_forecast','[data-regional-php-export]'],['unit_pilot','#unitResearchExport']] as const){
    await page.locator(`#forecastResearchDetails > details:has(${selector}) > summary`).click()
    const output=await download(page,page.locator(selector));expect(output.rows.length).toBeGreaterThan(0)
    for(const row of output.rows){
      if(name==='regional_forecast'){
        expect(regional).toBeDefined()
        const p=regional.regions.find((r:any)=>r.region===row.region).points.find((p:any)=>p.stage===row.stage&&p.model_id===row.model&&p.lead_months===Number(row.lead_months)&&p.origin_period===row.origin_month)
        expect(nullable(row.actual_php)).toBe(p.actual);expect(nullable(row.prediction_php)).toBe(p.prediction)
      }else{
        expect(unit).toBeDefined()
        const p=unit.points.find((p:any)=>p.method===row.method&&p.origin===row.origin_month&&p.lead===Number(row.lead_months))
        expect(p).toBeDefined()
        expect(Number(row.actual_ampoules)).toBe(p.actual);expect(Number(row.prediction_ampoules)).toBe(p.prediction)
        expect(Number(row.signed_error_ampoules)).toBeCloseTo(p.prediction-p.actual,8)
      }
    }
    receipts.push({name,...output.receipt,rows:output.rows.length,api_csv_checked:true})
  }
  await writeFile(info.outputPath('native-output-parity.json'),JSON.stringify({source:dataset,version:0,receipts,apiStatuses,abc_source_change_reload:abcStatus.startsWith('Source changed.'),no_raw_downloads_retained:true},null,2))
})

test('live planning solve and native CSV agree for explicit synthetic assumptions',async({page},info)=>{
  test.setTimeout(180000)
  await signInToReadyDashboard(page)
  await page.locator('[data-dashboard-page="inventory"]').click()
  await page.selectOption('#planTerritory','all')
  await expect.poll(()=>page.locator('[data-plan-field="demand"]').count(),{timeout:90000}).toBeGreaterThan(0)
  const count=await page.locator('[data-plan-field="demand"]').count()
  for(let i=0;i<count;i++)for(const [key,value] of Object.entries({demand:10,stock:0,reserve:0,pack:2,pack_cost:10,max_packs:5})){
    const input=page.locator(`[data-plan-index="${i}"][data-plan-field="${key}"]`)
    await input.evaluate(node=>{for(let p=node.parentElement;p;p=p.parentElement)if(p instanceof HTMLDetailsElement)p.open=true})
    await input.fill(String(value))
  }
  await page.locator('#planBudget').fill('100')
  await page.locator('#planMinimum').fill('0')
  await page.locator('#planAcknowledged').check()
  const response=page.waitForResponse(r=>r.url().includes('/api/sales/planning-solve')&&r.request().method()==='POST')
  await page.locator('#planSolve').click()
  const reply=await response;expect(reply.status()).toBe(200);const result=await reply.json()
  expect(result.status).toBe('scenario_allocation')
  await expect(page.locator('#planExport')).toBeEnabled()
  const output=await download(page,page.locator('#planExport'))
  expect(output.rows).toHaveLength(result.rows.length)
  let spend=0,units=0
  for(let i=0;i<result.rows.length;i++){
    const row=result.rows[i],exported=output.rows[i]
    expect(Number.isInteger(row.purchase_packs)).toBe(true)
    expect(row.purchase_units).toBe(row.purchase_packs*2)
    expect(row.spend).toBe(row.purchase_packs*10)
    expect(Number(exported.buy_units)).toBe(row.purchase_units)
    expect(Number(exported.spend_pesos)).toBe(row.spend)
    expect(exported.status).toContain('Scenario')
    spend+=row.spend;units+=row.purchase_units
  }
  expect(spend).toBe(Math.min(100,count*50));expect(units).toBe(spend/5)
  const chart=await page.locator('#planFulfillmentChart').evaluate(canvas=>(window as any).Chart.getChart(canvas).data.datasets[0].data)
  expect(chart).toEqual(result.rows.map((r:any)=>r.fulfillment_pct))
  await page.locator('#planBudget').fill('90')
  await expect(page.locator('#planExport')).toBeDisabled()
  await expect(page.locator('#planCalculatedResults')).not.toBeVisible()
  await writeFile(info.outputPath('planning-parity.json'),JSON.stringify({synthetic_assumptions:true,products:count,spend,purchased_units:units,api_chart_csv:true,input_change_clears_result:true,download:output.receipt,no_procurement_execution:true},null,2))
})

test('live partial-year comparison uses January through September in both years',async({page},info)=>{
  test.setTimeout(150000)
  let financial:any
  page.on('response',async r=>{if(r.url().includes('/api/financial/dashboard?financial_scope=itemized')&&r.status()===200)financial=await r.json()})
  await signInToReadyDashboard(page)
  await expect.poll(()=>!!financial).toBe(true)
  await page.selectOption('#analysisScopeSelect','capstone')
  await page.selectOption('#descriptivePeriodSelect','custom')
  await page.locator('#customDateStart').fill('2026-01-01');await page.locator('#customDateStart').press('Tab')
  await page.locator('#customDateEnd').fill('2026-09-30');await page.locator('#customDateEnd').press('Tab')
  await page.selectOption('#chartGranularitySelect','monthly')
  await page.selectOption('#descriptiveComparisonSelect','yoy')
  await page.selectOption('#overviewBuyerSector','All')
  const output=await download(page,page.locator('#overviewTrendExport'))
  expect(output.rows).toHaveLength(9)
  const totals=new Map<string,number>()
  for(const row of financial.sectors.daily)if(row.sector==='All'&&row.revenue!=null)totals.set(row.period,(totals.get(row.period)??0)+row.revenue)
  let current=0,previous=0
  for(let i=0;i<9;i++){
    const month=String(i+1).padStart(2,'0'),row=output.rows[i]
    expect(row.period).toBe('2026-'+month);expect(row.prior_period).toBe('2025-'+month)
    expect(Number(row.net_sales)).toBeCloseTo(totals.get('2026-'+month)!,5)
    expect(Number(row.prior_net_sales)).toBeCloseTo(totals.get('2025-'+month)!,5)
    current+=Number(row.net_sales);previous+=Number(row.prior_net_sales)
  }
  await page.setViewportSize({width:390,height:844})
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:info.outputPath('partial-year-mobile.png'),animations:'disabled'})
  await writeFile(info.outputPath('partial-year-parity.json'),JSON.stringify({scope:'Jan-Sep2026 vs Jan-Sep2025',months:9,current,previous,matched_growth_pct:(current-previous)/previous*100,annualized:false,download:output.receipt},null,2))
})

test('live Overview forecast refresh loads separate source-backed evidence',async({page},info)=>{
  test.setTimeout(150000)
  await signInToReadyDashboard(page)
  await page.getByRole('button',{name:'Forecast evidence chart',exact:true}).click()
  await page.getByRole('button',{name:'Refresh forecast chart',exact:true}).click()
  await expect(page.locator('#overview-predictive-output')).not.toContainText('Forecast evidence unavailable here',{timeout:90000})
  await expect.poll(()=>page.locator('#overviewForecastChart').evaluate(canvas=>{
    const chart=(window as any).Chart.getChart(canvas);return !!chart&&chart.data.datasets.some((d:any)=>d.data.some((v:any)=>v!==null))
  }),{timeout:90000}).toBe(true)
  await expect(page.locator('#overview-predictive-limit')).toContainText('Overview filters do not change it')
  await page.setViewportSize({width:390,height:844})
  const detail=page.getByRole('region',{name:'Forecast evidence chart',exact:true})
  await expect(detail.locator('#overviewForecastChart')).toBeVisible()
  await detail.screenshot({path:info.outputPath('overview-forecast-mobile.png'),animations:'disabled'})
  await writeFile(info.outputPath('overview-forecast.json'),JSON.stringify({live_refresh:true,has_chart:true,independent_scope:true,readout:await page.locator('#overview-predictive-output').innerText(),publication_approval:false},null,2))
})

test('live diagnostic margin export and complete filtered ledger reconcile',async({page},info)=>{
  test.setTimeout(180000)
  let diagnostic:any,summary:any
  page.on('response',async r=>{
    const url=new URL(r.url())
    if(r.status()!==200)return
    if(url.pathname==='/api/sales/so1')diagnostic=await r.json()
    if(url.pathname==='/api/sales/summary'&&url.searchParams.get('year')==='2026')summary=await r.json()
  })
  await signInToReadyDashboard(page)
  await page.locator('[data-dashboard-page="revenue"]').click()
  await page.locator('[data-sales-output-tab="so1"]').click()
  const profit=await download(page,page.locator('#so1FinancialExport'))
  expect(diagnostic).toBeDefined();expect(profit.rows).toHaveLength(diagnostic.financial_yoy.length)
  for(let i=0;i<profit.rows.length;i++){
    const row=profit.rows[i],api=diagnostic.financial_yoy[i]
    expect(Number(row.base_supported_gross_profit_php)).toBe(Number(api.base.gross_profit_php))
    expect(Number(row.target_matching_margin_revenue_php)).toBe(Number(api.target.margin_revenue_basis_php))
    expect(Number(row.supported_profit_change_php)).toBeCloseTo(Number(row.target_supported_gross_profit_php)-Number(row.base_supported_gross_profit_php),5)
    if(Number(row.target_matching_margin_revenue_php)>0)expect(Number(row.target_margin_pct)).toBeCloseTo(100*Number(row.target_supported_gross_profit_php)/Number(row.target_matching_margin_revenue_php),5)
  }
  await page.locator('[data-dashboard-page="sales-data"]').click()
  await page.selectOption('#salesDataYear','2026')
  await expect.poll(()=>!!summary,{timeout:90000}).toBe(true)
  const ledger=await download(page,page.locator('#salesFinancialExport'))
  expect(ledger.rows).toHaveLength(summary.counts.rows)
  expect(ledger.rows.length).toBeGreaterThan(25)
  let net=0,gross=0
  for(const row of ledger.rows){
    expect(row['Dataset ID']).toBe(dataset);expect(row['Delta version']).toBe('0')
    expect(row.date_delivered.slice(0,4)).toBe('2026')
    if(row.eligible_revenue!=='')net+=Number(row.eligible_revenue)
    if(row.eligible_income!=='')gross+=Number(row.eligible_income)
  }
  expect(net).toBeCloseTo(summary.sums.net_cost,2);expect(gross).toBeCloseTo(summary.sums.net_income,2)
  const shown=await page.locator('#salesComputationGrid .sales-status-value').allTextContents()
  expect(numberText(shown[0])!).toBeCloseTo(net,2);expect(numberText(shown[1])!).toBeCloseTo(gross,2)
  await writeFile(info.outputPath('diagnostic-ledger-parity.json'),JSON.stringify({diagnostic_comparisons:profit.rows.length,matched_margin_formula:true,diagnostic_download:profit.receipt,ledger_year:2026,ledger_rows:ledger.rows.length,net,gross,complete_matching_rows:true,api_ui_csv:true,ledger_download:ledger.receipt,no_raw_rows_retained:true},null,2))
})
