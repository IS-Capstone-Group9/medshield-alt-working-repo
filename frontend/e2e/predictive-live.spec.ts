import { test, expect } from '@playwright/test'
import { signInToReadyDashboard } from './helpers/dashboard'
import { writeFile } from 'node:fs/promises'

test('live authenticated forecast API rejects malformed filters and returns source evidence', async ({ page, request }) => {
  test.setTimeout(120000)
  let authorization = ''
  page.on('request', r => { if (r.url().includes('localhost:5000/api/')) authorization = r.headers().authorization || authorization })
  await page.goto('/login')
  await page.fill('#username', process.env.MEDSHIELD_E2E_USERNAME || 'admin')
  await page.fill('#password', process.env.MEDSHIELD_E2E_PASSWORD || 'Medshield!2025')
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await page.waitForURL('**/')
  await expect.poll(() => Boolean(authorization)).toBe(true)
  const headers = { Authorization: authorization }
  // Native fetch avoids Playwright printing authorization headers on timeout.
  const malformed = await fetch('http://localhost:5000/api/sales/forecast-validation?sector=All&sector=Unknown', { headers, signal: AbortSignal.timeout(15000) })
  expect(malformed.status).toBe(400)
  const response = await fetch('http://localhost:5000/api/sales/forecast-validation?sector=All&metric=revenue', { headers, signal: AbortSignal.timeout(90000) })
  expect(response.status).toBe(200)
  const data = await response.json()
  expect(data.publication_status).toBe('unpublished')
  expect(data.evaluation_protocol).toBe('fixed_origin_multi_step')
  expect(data.views['12'].common_scored_months).toBeGreaterThan(0)
  const published = await fetch('http://localhost:5000/api/forecasts?schema_version=2&horizon=12', { headers, signal: AbortSignal.timeout(60000) })
  expect(published.status).toBe(200)
  expect((await published.json()).status).toBe('unpublished')
  await writeFile('../outputs/predictive_validation/2026-09-27T08-56-19-553Z/live-benchmark.json', JSON.stringify(data, null, 2))
})

test('authenticated live benchmark is truthful while publication remains unavailable', async ({ page, request }) => {
  test.setTimeout(150000)
  const diagnostic: Array<Record<string, unknown>> = []
  page.on('pageerror', error => diagnostic.push({ type: 'pageerror', message: error.message }))
  page.on('request', r => { if (r.url().includes('localhost:5000/api/')) diagnostic.push({ type: 'request', path: new URL(r.url()).pathname }) })
  page.on('response', r => { if (r.url().includes('localhost:5000/api/')) diagnostic.push({ type: 'response', path: new URL(r.url()).pathname, status: r.status() }) })
  for (const route of ['/api/forecasts?schema_version=2', '/api/model_evaluation?schema_version=2', '/api/sales/forecast-validation']) {
    expect((await request.get('http://localhost:5000' + route)).status()).toBe(401)
  }
  try { await signInToReadyDashboard(page) }
  catch (error) {
    await writeFile('../outputs/predictive_validation/2026-09-27T08-56-19-553Z/live-readiness-diagnostic.json', JSON.stringify(diagnostic, null, 2))
    throw error
  }
  await page.evaluate(() => (window as any).showPage('forecast'))
  await page.selectOption('#forecastSector', 'All')
  await expect(page.locator('#forecastStatus')).toContainText('unpublished', { timeout: 60000 })
  await expect(page.locator('#forecastSource')).toContainText('unverified')
  await expect(page.locator('#forecastBenchmarkTable tbody tr')).toHaveCount(4)
  await expect(page.locator('#forecastBenchmarkTable')).not.toContainText('Prophet')
  await expect(page.locator('#forecastWindow')).toContainText('2025-12')
  await page.screenshot({ path: '../outputs/predictive_validation/2026-09-27T08-56-19-553Z/live-forecast.png', fullPage: true })
})
