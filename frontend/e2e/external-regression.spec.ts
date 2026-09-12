import { test, expect } from '@playwright/test'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

function evidence(options = '', real = false) {
  const code = real
    ? `import json; from services.analytics_service.external_regression import load_regression; print(json.dumps(load_regression(metric='revenue')))`
    : `import json; from datetime import date; from services.tests.test_external_regression import regression_fixture; from services.analytics_service.external_regression import build_regression; print(json.dumps(build_regression(*regression_fixture(),metric='revenue',today=date(2026,9,12)${options})))`
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

test('regression plots, metrics, lag controls and export share the evaluated scope', async ({ page }) => {
  const data = evidence()
  await page.evaluate(d => (window as any).setExternalRegressionData(d), data)
  await expect(page.locator('#regResult')).toContainText('lower holdout MAE')
  await expect(page.locator('#regScope')).toContainText('₱ net sales')
  const chart = await page.evaluate(() => {
    const app = window as any
    return { coefficients: app.Chart.getChart(document.getElementById('regCoefficientChart')).data.datasets[0].data, predictions: app.Chart.getChart(document.getElementById('regPredictionChart')).data.datasets[1].data }
  })
  expect(chart.coefficients).toEqual(data.coefficients.map((r: any) => r.coefficient))
  expect(chart.predictions).toHaveLength(12)
  expect(chart.predictions[0].y).toBe(data.evaluation[0].augmented)
  await page.evaluate(() => {
    const app = window as any
    app.regressionChanges = []
    window.addEventListener('medshield:regression-change', () => app.regressionChanges.push(['regMode', 'regLag', 'regRainLag'].map(id => (document.getElementById(id) as HTMLSelectElement).value)))
  })
  await page.selectOption('#regLag', '8')
  expect(await page.evaluate(() => (window as any).regressionChanges.at(-1))).toEqual(['disease', '8', '1'])
  await page.evaluate(d => (window as any).setExternalRegressionData(d), evidence(',lag=8'))
  await expect(page.locator('#regScope')).toContainText('lag 8 months')
  const downloadPromise = page.waitForEvent('download')
  await page.locator('#regExport').click()
  const csv = await readFile((await (await downloadPromise).path())!, 'utf8')
  expect(csv).toContain('DOH 2025-03')
  expect(csv).toContain('"disease","Dengue","8"')
  await expect(page.locator('[data-external-regression]')).toContainText('not causality')
  await page.locator('[data-external-regression]').screenshot({ path: 'test-results/section-6-regression-fixture.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.locator('[data-external-regression]').screenshot({ path: 'test-results/section-6-regression-mobile.png' })
})

test('unmapped weather, absent buyers and service failure clear all modeled results', async ({ page }) => {
  await page.evaluate(d => (window as any).setExternalRegressionData(d), evidence())
  await page.selectOption('#regMode', 'rainfall')
  await page.evaluate(d => (window as any).setExternalRegressionData(d), evidence(",mode='rainfall',provider='PAGASA'"))
  await expect(page.locator('#regStatus')).toContainText('Not estimable')
  await expect(page.locator('#regCharts')).toBeHidden()
  await expect(page.locator('#regMetrics')).toBeEmpty()
  await expect(page.locator('#regExport')).toBeDisabled()
  await page.evaluate(d => (window as any).setExternalRegressionData(d), evidence(",sector='Private'"))
  await expect(page.locator('#regStatus')).toContainText('No observed sales')
  await page.evaluate(() => (window as any).setExternalRegressionData(null, 'Source unavailable'))
  await expect(page.locator('#regStatus')).toHaveText('Source unavailable')
  expect(await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('regPredictionChart')) === undefined)).toBe(true)
})

test('local prepared DOH and sales snapshot produce reviewable source-backed charts', async ({ page }) => {
  test.skip(!existsSync(path.resolve('../data/medshield/processed/regression_external_monthly.json')), 'Optional local source audit; raw workbooks are not CI fixtures')
  const data = evidence('', true)
  await page.evaluate(d => (window as any).setExternalRegressionData(d), data)
  expect(data.status).toBe('exploratory')
  await expect(page.locator('#regResult')).toContainText('higher holdout MAE')
  await page.locator('[data-external-regression]').screenshot({ path: 'test-results/section-6-regression-local.png' })
})
