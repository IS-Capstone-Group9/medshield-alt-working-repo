import {test,expect} from '@playwright/test'
import {readFile,writeFile} from 'node:fs/promises'
import {signInToReadyDashboard} from './helpers/dashboard'
const areas=['QUEZON','BATANGAS','CAVITE','LOWER CAVITE','LAGUNA','MARINDUQUE','ALBAY','CAM NORTE','CAM SUR']
function csv(text:string){
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(cell);cell=''}else if(c==='\n'&&!quoted){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell=''}else cell+=c}
 if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row)}const header=rows.shift()!;header[0]=header[0].replace(/^\uFEFF/,'');return rows.map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]??''])))
}
test.use({trace:'off',video:'off'})
for(const width of [1440,390])test(`all nine areas live history and native CSV acceptance ${width}`,async({page},info)=>{
 test.setTimeout(240000);await page.setViewportSize({width,height:1000})
 let data:any
 page.on('response',async r=>{if(new URL(r.url()).pathname==='/api/sales/delivery-area-review'&&r.ok())data=await r.json()})
 await signInToReadyDashboard(page);await page.evaluate(()=>(window as any).showPage('revenue'));await page.locator('[data-sales-output-tab="so1"]').click()
 await expect(page.locator('#deliveryAreaOverviewStatus')).toContainText('9 confirmed delivery labels',{timeout:90000})
 expect(data).toBeTruthy();await writeFile(info.outputPath('validated-api.json'),JSON.stringify(data,null,2))
 await expect(page.locator('#deliveryAreaOverview tbody tr')).toHaveCount(9)
 const initial=await page.locator('#deliveryAreaOverview tbody tr').evaluateAll(nodes=>nodes.map(n=>Array.from(n.querySelectorAll('td'),c=>c.textContent)))
 expect(initial.map(r=>r[0])).toEqual(areas)
 for(const row of initial){const own=data.area_months.filter((r:any)=>r.area===row[0]&&r.net_sales_php!==null).sort((a:any,b:any)=>a.period.localeCompare(b.period));expect(Number(row[5])).toBe(own.length);expect(row[3]).toBe(own[0].period);expect(row[4]).toBe(own.at(-1).period)}
 const coverageEvent=page.waitForEvent('download');await page.locator('#deliveryAreaCoverageExport').click();const coverageFile=await coverageEvent;const coverageBytes=await readFile((await coverageFile.path())!);const coverage=csv(coverageBytes.toString('utf8'));expect(coverage).toHaveLength(9);expect(coverage.map(r=>r.area)).toEqual(areas);await writeFile(info.outputPath('coverage.csv'),coverageBytes)
 await page.locator('.delivery-area-review').screenshot({path:info.outputPath(`all-areas-${width}.png`),style:'.topbar, nextjs-portal { visibility: hidden !important; }'})
 for(const area of areas){
   const button=page.getByRole('button',{name:'View '+area+' historical sales',exact:true});await button.focus();await page.keyboard.press('Enter')
   await expect(page.locator('#deliveryArea')).toHaveValue(area);await expect(page.locator('#deliveryAreaPeer')).toHaveValue(area);await expect(page.locator('#deliveryAreaYear')).toHaveValue('history');await expect(page.locator('#deliveryArea')).toBeFocused()
   const source=data.area_months.filter((r:any)=>r.area===area),eligible=source.filter((r:any)=>r.net_sales_php!==null)
   await expect(page.locator('#deliveryAreaStatus')).toContainText(eligible.length+' common observed months')
   const plotted=await page.locator('#deliveryAreaChart').evaluate(canvas=>{const c=(window as any).Chart.getChart(canvas);return {labels:c.data.labels,values:c.data.datasets[0].data,spanGaps:c.data.datasets[0].spanGaps}})
   expect(plotted.spanGaps).toBe(false)
   for(let i=0;i<plotted.labels.length;i++){const raw=source.find((r:any)=>r.period===plotted.labels[i]);expect(plotted.values[i]).toBe(raw?.net_sales_php==null?null:Number(raw.net_sales_php))}
   const expected=eligible.reduce((s:number,r:any)=>s+Number(r.net_sales_php),0)
   const shown=await page.locator('#deliveryAreaKpis dd').first().textContent();expect(Number(shown!.replace(/[^\d.-]/g,''))).toBeCloseTo(expected,2)
   const event=page.waitForEvent('download');await page.locator('#deliveryAreaExport').click();const file=await event;const bytes=await readFile((await file.path())!);const exported=csv(bytes.toString('utf8'));expect(exported).toHaveLength(plotted.labels.length)
   for(const r of exported){expect(r.area).toBe(area);const raw=source.find((v:any)=>v.period===r.period);expect(r.net_sales_php).toBe(raw?.net_sales_php??'');expect(r.supported_gross_profit_php).toBe(raw?.gross_profit_php??'');expect(r.paired_margin_revenue_php).toBe(raw?.margin_revenue_basis_php??'');expect(r.included_common_period).toBe(String(raw?.net_sales_php!=null));expect(r.included_matched_yoy).toBe('false');expect(r.display_year).toBe('history')}
   await writeFile(info.outputPath(area.replaceAll(' ','_')+'.csv'),bytes)
   await page.locator('#deliveryAreaYear').selectOption('2026');await page.locator('#deliveryAreaEnd').selectOption('9')
   const current=source.filter((r:any)=>r.period>='2026-01'&&r.period<='2026-09'&&r.net_sales_php!==null)
   await expect(page.locator('#deliveryAreaStatus')).toContainText(current.length+' common observed months')
   if(!current.length)await expect(page.locator('#deliveryAreaKpis dd').first()).toHaveText('Unavailable')
 }
 const scroll=page.locator('#deliveryAreaOverview').locator('..');await scroll.focus();await page.keyboard.press('ArrowRight');await expect.poll(()=>scroll.evaluate(el=>el.scrollWidth>el.clientWidth?el.scrollLeft>0:true)).toBe(true)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await page.route('**/api/sales/delivery-area-review',route=>route.fulfill({status:503,json:{code:'DELIVERY_AREA_UNAVAILABLE'}}));await page.locator('#deliveryAreaReload').click();await expect(page.locator('#deliveryAreaStatus')).toContainText('source unavailable');await expect(page.locator('#deliveryAreaOverview')).toBeEmpty();await expect(page.locator('#deliveryAreaCoverageExport')).toBeDisabled();await page.unroute('**/api/sales/delivery-area-review');await page.locator('#deliveryAreaReload').click();await expect(page.locator('#deliveryAreaOverview tbody tr')).toHaveCount(9,{timeout:90000})
})


