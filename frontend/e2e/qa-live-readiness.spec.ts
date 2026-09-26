import { test, expect } from '@playwright/test'
import { signInToReadyDashboard } from './helpers/dashboard'

test('QA live dashboard becomes usable after the Databricks loading gate', async ({ page }) => {
  test.setTimeout(150000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => {
    const url = new URL(response.url())
    if (url.pathname.startsWith('/api/') && response.status() >= 400) {
      console.log(`API failure: ${response.status()} ${url.pathname}`)
    }
  })
  await signInToReadyDashboard(page)
  await expect(page.locator('#kpiOverviewTotalRevenue')).toContainText('₱', { timeout: 15000 })
  await expect.soft(page.locator('.data-freshness-bar')).toContainText('Databricks Gold', { timeout: 20000 })
  for (const [label, id] of [
    ['Sales Diagnostics', 'revenue'],
    ['Product Prioritization', 'products'],
    ['Area Prioritization', 'territory'],
    ['Forecast Modeling', 'forecast'],
    ['Prescriptive Planning', 'inventory'],
    ['Data Upload', 'data'],
    ['Overview', 'overview'],
  ]) {
    await page.locator('.nav-item', { hasText: label }).click()
    await expect(page.locator('.page.active')).toHaveAttribute('id', `page-${id}`)
  }
  expect(errors).toEqual([])
  await page.screenshot({ path: 'test-results-qa-live/desktop.png', fullPage: true })
})

test('exploratory mobile overview fits the viewport', async ({ page }) => {
  test.skip(process.env.MEDSHIELD_QA_MOBILE !== 'true', 'MedShield desktop-only release scope; enable explicitly for exploratory mobile QA')
  test.setTimeout(150000)
  await signInToReadyDashboard(page)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.screenshot({ path: 'test-results-qa-live/mobile.png', fullPage: true })
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }))
  console.log('Mobile dimensions:', dimensions)
  expect.soft(dimensions.document, 'Mobile page should fit the viewport without horizontal overflow').toBeLessThanOrEqual(dimensions.viewport)
})
