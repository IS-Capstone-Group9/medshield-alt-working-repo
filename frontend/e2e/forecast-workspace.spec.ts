import { test, expect, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { mountDashboardHarness } from './helpers/dashboard-harness'

// Invented observations evaluated by the real gateway baseline; never warehouse evidence.
const evidence = JSON.parse(execFileSync('node', ['--import', 'tsx', '-e', `
  const {benchmarkView,benchmarkNames,monthIndex,monthLabel}=require('./src/forecastEvidence.ts');
  const origin=monthIndex('2026-09'), series=new Map(Array.from({length:72},(_,i)=>[origin-71+i,1000+i*10]));
  console.log(JSON.stringify({status:'retrospective_benchmark_evidence',publication_status:'unpublished',reporting_coverage_status:'unverified',
    scope:{sector:'All',product:'',metric:'revenue',unit:'PHP'},products:[],models:benchmarkNames,origin:'2026-09',last_actual_period:'2026-09',observed_months:72,
    actuals:[...series].map(([period,actual])=>({period:monthLabel(period),actual})),source:{file:'Synthetic task fixture',checksum:'fixture-checksum',as_of:'2026-10-01'},
    limitations:['Synthetic fixture; no source or model approval.'],views:Object.fromEntries([3,6,12].map(h=>[String(h),benchmarkView(series,origin,h,'company','net_sales',monthIndex('2026-10'),true)]))}));
`], { cwd: path.resolve('../backend'), encoding: 'utf8' }))

async function setup(page: Page) {
  await mountDashboardHarness(page, { '/api/sales/forecast-validation': evidence })
  await page.locator('[data-dashboard-page="forecast"]').click()
  await page.evaluate(data => (window as any).setForecastValidationData(data), evidence)
  await expect(page.locator('#forecastExport')).toBeEnabled()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() => document.fonts.ready)
}

const task = (page: Page, name: string) => page.getByRole('tab', { name, exact: true })
async function download(page: Page, selector: string) {
  const pending = page.waitForEvent('download')
  await page.locator(selector).click()
  return readFile((await (await pending).path())!, 'utf8')
}

for (const width of [1440, 824, 390]) test(`Forecast tasks retain visible limits, keyboard access and fit at ${width}px`, async ({ page }, info) => {
  await setup(page)
  await page.setViewportSize({ width, height: 900 })
  await expect(task(page, 'Outlook')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#forecastOutlook')).toBeVisible()
  await expect(page.locator('#forecastAccuracy')).toBeHidden()
  await expect(page.locator('#forecastResearchPanel')).toBeHidden()
  await expect(page.locator('#page-forecast > .analytics-output-hub dd')).toHaveCount(0)
  await expect(page.locator('#salesStreamsContext')).not.toHaveAttribute('open', '')
  await expect(page.locator('#dxReadinessContext')).not.toHaveAttribute('open', '')
  await page.addScriptTag({ path: path.resolve('node_modules/axe-core/axe.min.js') })
  const observations = []
  for (const name of ['Outlook', 'Past accuracy', 'Research']) {
    await task(page, name).click()
    await expect(page.locator('#page-forecast [role="tabpanel"]:visible')).toHaveCount(1)
    await expect(page.locator('#page-forecast > .analytics-output-hub .analytics-reading-guide__limit')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
    const violations = await page.locator('#page-forecast').evaluate(async element => {
      const result = await (window as any).axe.run(element, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })
      return result.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))
    })
    observations.push({ name, width, violations })
    await page.screenshot({ path: info.outputPath(`${name}-${width}.png`), fullPage: true, animations: 'disabled' })
    expect.soft(violations, `${name} at ${width}px`).toEqual([])
  }
  await writeFile(info.outputPath('accessibility.json'), JSON.stringify(observations, null, 2))
  await expect(page.locator('.forecast-controls')).toBeHidden()
  await expect(page.locator('#forecastResearchDetails')).toHaveAttribute('open', '')
  await task(page, 'Research').press('Home')
  await expect(task(page, 'Outlook')).toBeFocused()
  await task(page, 'Outlook').press('ArrowRight')
  await expect(task(page, 'Past accuracy')).toBeFocused()
  await task(page, 'Past accuracy').press('End')
  await expect(task(page, 'Research')).toBeFocused()
  await task(page, 'Research').press('ArrowRight')
  await expect(task(page, 'Outlook')).toBeFocused()
  await task(page, 'Outlook').press('ArrowLeft')
  await expect(task(page, 'Research')).toBeFocused()
})

test('task switches retain model, window, chart and full evidence CSV without requesting new evidence', async ({ page }) => {
  await setup(page)
  await page.selectOption('#forecastModel', 'seasonal_naive')
  await page.selectOption('#forecastHorizon', '6')
  const expected = await download(page, '#forecastExport')
  await page.evaluate(() => { (window as any).taskChart = (window as any).Chart.getChart(document.getElementById('forecastChart')) })
  const requests: string[] = []
  page.on('request', request => { if (request.url().includes('fixture.gateway')) requests.push(request.url()) })
  await task(page, 'Past accuracy').click()
  await expect(page.locator('#forecastMetrics')).toBeVisible()
  expect(await download(page, '#forecastExport')).toBe(expected)
  await task(page, 'Research').click()
  await page.locator('#forecastResearchDetails > details:has(.unit-research) > summary').press('Enter')
  await expect(page.locator('.unit-research')).toBeVisible()
  await expect(page.locator('.unit-research')).toContainText(/independent|Fixed/i)
  await task(page, 'Outlook').click()
  await expect(page.locator('#forecastModel')).toHaveValue('seasonal_naive')
  await expect(page.locator('#forecastHorizon')).toHaveValue('6')
  await expect.poll(() => page.locator('#forecastChart').evaluate(canvas => canvas.getBoundingClientRect().width)).toBeGreaterThan(0)
  expect(await page.evaluate(() => (window as any).taskChart === (window as any).Chart.getChart(document.getElementById('forecastChart')))).toBe(true)
  expect(await download(page, '#forecastExport')).toBe(expected)
  expect(requests).toEqual([])
  await task(page, 'Research').click()
  await expect(page.locator('.unit-research')).toBeVisible()
})

test('menu links select the matching task and summary includes only its displayed finding', async ({ page }) => {
  await setup(page)
  const hub = page.locator('[data-analytics-tab="forecast"]')
  const summary = () => download(page, '[data-analytics-tab="forecast"] [data-analytics-summary]')
  await hub.locator('.analytics-output-hub__menu > summary').click()
  const outlook = JSON.parse(await summary())
  expect(outlook.displayed_readouts.map((r: { text: string }) => r.text)).toEqual([await page.locator('#forecastUseSummary').textContent()])
  await task(page, 'Research').click()
  await hub.locator('.analytics-output-hub__menu > summary').click()
  await expect(hub.locator('[data-analytics-native-output="#forecastExport"]')).toBeDisabled()
  await hub.getByRole('button', { name: 'Read forecast errors', exact: true }).click()
  await expect(task(page, 'Past accuracy')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#forecastMetrics')).toBeFocused()
  await hub.locator('.analytics-output-hub__menu > summary').click()
  const accuracy = JSON.parse(await summary())
  expect(accuracy.displayed_readouts.map((r: { text: string }) => r.text)).toEqual([await page.locator('#forecastTakeaway').textContent()])
  await hub.locator('.analytics-output-hub__menu > summary').click()
  await hub.getByRole('button', { name: 'Inspect target dates', exact: true }).click()
  await expect(task(page, 'Outlook')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#forecastCalendar')).toBeFocused()
  await hub.locator('.analytics-output-hub__menu > summary').click()
  await hub.getByRole('button', { name: 'Review large-order readiness', exact: true }).click()
  await expect(page.locator('#dxReadinessContext')).toHaveAttribute('open', '')
  await expect(page.locator('#dxReadinessContext > summary')).toBeFocused()
})

test('a scope refresh clears hidden accuracy and outlook values through failure and recovery', async ({ page }) => {
  await setup(page)
  const previous = await page.locator('#kpiForecastMae').textContent()
  let release!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  await page.route('http://fixture.gateway/api/sales/forecast-validation?**', async route => {
    await held
    await route.fulfill({ status: 503, headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'application/json', body: '{"error":"Synthetic source outage"}' })
  })
  await task(page, 'Past accuracy').click()
  await page.locator('#forecastProduct').evaluate((select: HTMLSelectElement) => select.add(new Option('Synthetic product', 'Synthetic product')))
  await page.selectOption('#forecastProduct', 'Synthetic product')
  await expect(page.locator('#forecastStatus')).toContainText('Loading')
  await expect(page.locator('#forecastExport')).toBeDisabled()
  await expect(page.locator('#forecastEvidenceTable')).toBeEmpty()
  await expect(page.locator('#kpiForecastMae')).not.toHaveText(previous!)
  await task(page, 'Outlook').click()
  await expect(page.locator('#forecastEstimateTable')).toBeEmpty()
  await expect(page.locator('#forecastEstimatePanel')).toBeHidden()
  release()
  await expect(page.locator('#forecastStatus')).toContainText('Source unavailable')
  await task(page, 'Past accuracy').click()
  await expect(page.locator('#kpiForecastMae')).toHaveText('Unavailable')
  await expect(page.locator('#forecastBenchmarkTable')).toBeEmpty()
  await page.evaluate(data => (window as any).setForecastValidationData(data), evidence)
  await expect(page.locator('#forecastExport')).toBeEnabled()
  await expect(page.locator('#kpiForecastMae')).toHaveText(previous!)
  await task(page, 'Outlook').click()
  await expect(page.locator('#forecastEstimateTable tbody tr')).toHaveCount(3)
})
