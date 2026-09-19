import { test, expect } from '@playwright/test'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

function evidence(metric = 'revenue', sector = 'Government') {
  const code = `import json; from datetime import date; from services.tests.test_forecast_validation import fixture_payload; from services.analytics_service.forecast_validation import build_validation; print(json.dumps(build_validation(fixture_payload(), sector='${sector}', product='${metric === 'quantity' ? 'A' : ''}', metric='${metric}', today=date(2026,9,12))))`
  return JSON.parse(execFileSync('python', ['-c', code], { cwd: path.resolve('..'), encoding: 'utf8' }))
}

test.beforeEach(async ({ page }) => {
  await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
  await page.evaluate(() => { window.fetch = async () => new Response('{}', { status: 503 }) })
  await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
  await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())
  await page.evaluate(() => (window as any).showPage('forecast'))
})

test('actuals, holdout predictions, empirical bands, metrics and horizon export agree', async ({ page }) => {
  await page.evaluate(data => (window as any).setForecastValidationData(data), evidence())
  await expect(page.locator('#forecastWindow')).toContainText('2026-09 to 2027-08')
  await expect(page.locator('#forecastWindow')).toContainText('12 months horizon')
  await expect(page.locator('#forecastWindow')).toContainText('8 closed months behind')
  await expect(page.locator('#forecastBenchmarkTable')).toContainText('Facebook Prophet AI')
  await expect(page.locator('#kpiForecastMape')).toBeVisible()

  const chart = () => page.evaluate(() => {
    const data = (window as any).Chart.getChart(document.getElementById('forecastChart')).data
    return { labels: data.labels, actuals: data.datasets[4].data, backtest: data.datasets[5].data, forecast: data.datasets[6].data, lower: data.datasets[0].data }
  })
  let displayed = await chart()
  expect(displayed.labels).toHaveLength(44)
  expect(displayed.actuals.filter((v: any) => v !== null)).toHaveLength(24)
  expect(displayed.actuals.slice(-20)).toEqual(Array(20).fill(null))
  expect(displayed.backtest.filter((v: any) => v !== null)).toHaveLength(12)
  expect(displayed.forecast.slice(-12)[0]).toBe(2600)
  expect(displayed.lower.slice(-12).every((v: any) => v !== null)).toBe(true)

  await page.selectOption('#forecastHorizon', '3')
  await expect(page.locator('#forecastWindow')).toContainText('2026-09 to 2026-11')
  await expect(page.locator('#forecastEvaluationScope')).toContainText('2025-10 to 2025-12')
  displayed = await chart()
  expect(displayed.labels).toHaveLength(35)
  expect(displayed.backtest.filter((v: any) => v !== null)).toHaveLength(3)

  await page.selectOption('#forecastHorizon', '6')
  expect((await chart()).labels.at(-1)).toBe('2027-02')

  await page.selectOption('#forecastModel', 'last_value')
  expect((await chart()).forecast.slice(-6)).toEqual(Array(6).fill(2930))

  const downloadPromise = page.waitForEvent('download')
  await page.locator('#forecastExport').click()
  const csv = await readFile((await (await downloadPromise).path())!, 'utf8')
  expect(csv).toContain('"2027-02"')
  expect(csv).toContain('"last_value"')
  expect(csv).not.toContain('2027-03')

  await expect(page.locator('#growthChart')).not.toBeVisible()
  await expect(page.locator('#topbar-sub')).not.toContainText('Prophet')
  await page.screenshot({ path: 'test-results/section-5-forecast.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('#forecastHorizon')).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/section-5-forecast-mobile.png', fullPage: true })
})

test('scope controls request new evidence; quantity, unknown private and failure states are truthful', async ({ page }) => {
  await page.evaluate(data => {
    const app = window as any
    app.setForecastValidationData(data)
    app.forecastChanges = []
    window.addEventListener('medshield:forecast-change', () => app.forecastChanges.push(['forecastSector', 'forecastProduct', 'forecastMetric'].map(id => (document.getElementById(id) as HTMLSelectElement).value)))
  }, evidence())
  await page.selectOption('#forecastMetric', 'quantity')
  expect(await page.evaluate(() => (window as any).forecastChanges.at(-1))).toEqual(['Government', 'A', 'quantity'])
  await page.evaluate(data => (window as any).setForecastValidationData(data), evidence('quantity'))
  await expect(page.locator('#forecastStatus')).toContainText('delivered source units')
  expect(await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('forecastChart')).data.datasets[6].data.filter((x: any) => x !== null)[0])).toBe(180)
  await page.selectOption('#forecastSector', 'Private')
  expect(await page.evaluate(() => (window as any).forecastChanges.at(-1))).toEqual(['Private', '', 'revenue'])
  await page.evaluate(data => (window as any).setForecastValidationData(data), evidence('revenue', 'Private'))
  await expect(page.locator('#forecastWindow')).toContainText('No observed closed-month sales')
  expect(await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('forecastChart')) === undefined)).toBe(true)
  await expect(page.locator('#forecastExport')).toBeDisabled()
  await page.evaluate(() => (window as any).setForecastValidationData(null, 'Source unavailable'))
  await expect(page.locator('#forecastStatus')).toHaveText('Source unavailable')
})
