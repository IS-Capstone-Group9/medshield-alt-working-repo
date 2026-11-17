import { test, expect } from '@playwright/test'
import { signInToReadyDashboard } from './helpers/dashboard'

test('current Forecast omits retired research and never requests its unavailable route', async ({page}, testInfo) => {
  test.setTimeout(180000)
  expect(Boolean(process.env.MEDSHIELD_E2E_USERNAME && process.env.MEDSHIELD_E2E_PASSWORD), 'Supply login through process environment variables').toBe(true)
  const retiredRequests: string[] = []
  const pending = new Set<object>()
  const responses: {path: string; status: number}[] = []
  page.on('request', request => {
    if (!request.url().startsWith('http://localhost:5000/api/')) return
    const pathname = new URL(request.url()).pathname
    if (pathname === '/api/sales/predictive-research') retiredRequests.push(pathname)
    if (request.method() === 'GET') pending.add(request)
  })
  page.on('requestfinished', request => pending.delete(request))
  page.on('requestfailed', request => pending.delete(request))
  page.on('response', response => {
    if (response.url().startsWith('http://localhost:5000/api/') && response.request().method() === 'GET') {
      responses.push({path: new URL(response.url()).pathname, status: response.status()})
    }
  })
  await page.setViewportSize({width:1440,height:900})
  await signInToReadyDashboard(page)
  const forecastStarted=performance.now()
  await page.locator('[data-dashboard-page="forecast"]').click()
  await expect(page.locator('#forecastStatus')).toContainText(/Retrospective benchmark evidence|Approved published forecast/, {timeout:90000})
  await expect.poll(() => pending.size, {timeout:90000}).toBe(0)
  await expect(page.locator('#predictiveResearchDetails, [data-predictive-research]')).toHaveCount(0)
  await expect(page.locator('[data-forecast-validation]')).toBeVisible()
  await expect(page.locator('#page-forecast > [data-analytics-reading] h2')).toHaveText('Review the sales outlook and past forecast errors')
  await expect(page.locator('#page-forecast > [data-analytics-reading]')).toContainText('Past error shows how forecasts did on months already checked')
  await expect(page.locator('[data-objective-status]')).toHaveCount(0)
  expect(retiredRequests).toEqual([])
  expect(responses.filter(response => response.status >= 400)).toEqual([])
  for(const path of ['/api/forecasts','/api/sales/forecast-validation','/api/sales/external-regression',
    '/api/sales/current-source-research','/api/sales/rolling-source-research','/api/sales/tournament-research',
    '/api/sales/regional-php-research','/api/sales/unit-baseline-research']) {
    expect(responses.some(response=>response.path===path&&response.status===200),path+' must load').toBe(true)
  }
  const forecastElapsedMs=Math.round(performance.now()-forecastStarted)
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:900})
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({path:testInfo.outputPath('forecast-current-' + width + '.png'),fullPage:true})
  }
  await testInfo.attach('current-forecast-requests', {body:JSON.stringify({retiredRequests,responses,forecastElapsedMs}),contentType:'application/json'})
})
