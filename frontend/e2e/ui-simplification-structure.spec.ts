import { test, expect } from '@playwright/test'
import path from 'node:path'
import { mountDashboardHarness } from './helpers/dashboard-harness'

/** Synthetic fixture: checks page structure only. Real amounts and heights belong to the live audit. */
const shots = process.env.MEDSHIELD_AUDIT_OUT ? path.resolve(process.env.MEDSHIELD_AUDIT_OUT) : ''

test('every page leads with its header, evidence tags and limit', async ({ page }) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await mountDashboardHarness(page)
  for (const id of ['overview', 'revenue', 'products', 'territory', 'forecast', 'inventory', 'data', 'sales-data', 'weather-validation']) {
    await page.locator(`[data-dashboard-page="${id}"]`).click()
    const active = page.locator(`#page-${id}`)
    await expect(active).toHaveClass(/active/)
    await expect(active.locator('> .analytics-output-hub')).toBeVisible()
    const guide = active.locator('> [data-analytics-reading]')
    await expect(guide).toBeVisible()
    await expect(guide).not.toHaveAttribute('open', '')
    await expect(guide.locator('.analytics-reading-guide__limit')).toBeVisible()
    await expect(guide.locator('.analytics-evidence-tag').first()).toBeVisible()
    if (shots) await page.screenshot({ path: path.join(shots, `${id}-fixture.png`), fullPage: true, animations: 'disabled' })
  }
})

test('Forecast starts with validation and opens historical evidence from the export menu', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mountDashboardHarness(page)
  await page.locator('[data-dashboard-page="forecast"]').click()
  const forecast = page.locator('#page-forecast')
  const research = forecast.locator('#forecastResearchDetails')
  const summary = research.locator('> summary')
  const unit = research.locator('> details:has(.unit-research) > summary')
  const tournament = research.locator('> details:has(.tournament-research) > summary')
  const menu = forecast.locator('.analytics-output-hub__menu')

  await expect(forecast.locator('[data-forecast-validation] + #forecastResearchDetails')).toHaveCount(1)
  await expect(forecast.locator('#forecastStatus')).toBeVisible()
  await expect(research.locator('.chart-card')).toHaveCount(5)
  await expect(research.locator('.unit-research')).not.toBeVisible()
  await menu.locator('> summary').click()
  await menu.getByRole('button', { name: 'Open historical forecast research' }).click()
  await expect(research.locator('.unit-research')).not.toBeVisible()
  await expect(summary).toBeFocused()
  await unit.press('Enter')
  await expect(research.locator('.unit-research')).toBeVisible()
  await tournament.press('Enter')
  await expect(research.locator('.tournament-research')).toBeVisible()
  await expect(research.locator('.unit-research')).not.toBeVisible()
  await summary.press('Space')
  await expect(research.locator('.unit-research')).not.toBeVisible()

  for (const width of [824, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await summary.press('Enter')
    await expect(research.locator('.tournament-research')).toBeVisible()
    await expect.poll(() => page.evaluate(() => {
      const width = document.documentElement.scrollWidth
      if (width <= innerWidth + 1) return null
      const elements = [...document.querySelectorAll('#page-forecast *')].filter(element =>
        element.getBoundingClientRect().right > innerWidth + 1 && !element.closest('[role="region"]'),
      ).slice(0, 10).map(element => [element.id || element.className || element.tagName, Math.round(element.getBoundingClientRect().right)])
      return { width, elements }
    }), { message: `Forecast fits ${width}px` }).toBeNull()
    await summary.press('Enter')
  }
})

test('the first screen leads with results and page actions stay in one menu', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mountDashboardHarness(page)
  const overview = page.locator('#page-overview')
  await expect(overview.locator('.kpi-grid').first()).toBeInViewport()
  await expect(page.locator('.overview-welcome')).toHaveCSS('position', 'absolute')
  await expect(page.locator('#overviewPublicationStrip')).toBeVisible()
  await expect(page.locator('#overviewPublicationStrip')).toContainText('Unpublished')
  await expect(page.locator('#overviewPublicationStrip')).toContainText('Scenarios only')

  const hub = overview.locator('> .analytics-output-hub')
  await expect(hub.getByRole('button', { name: 'Investigate recorded sales for selected dates' })).toHaveCount(0)
  await hub.locator('.analytics-output-hub__menu > summary').click()
  await expect(hub.getByRole('button', { name: 'Investigate recorded sales for selected dates' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(hub.locator('.analytics-output-hub__menu')).not.toHaveAttribute('open', '')

  await hub.getByText('How to interpret these outputs', { exact: true }).click()
  await expect(hub.locator('.analytics-output-hub__popover').first()).toBeVisible()
  await hub.getByText('Key terms', { exact: true }).click()
  await expect(hub.locator('.analytics-output-hub__popover').first()).not.toBeVisible()
  await expect(hub.locator('#analyticsGlossary-overview .analytics-output-hub__popover')).toBeVisible()

  await page.locator('[data-dashboard-page="revenue"]').click()
  const sales = page.locator('#page-revenue')
  await expect(sales.locator('.kpi-grid').first()).toBeInViewport()
  const kpi = await sales.locator('.kpi-card:visible').first().boundingBox()
  const notes = await sales.locator('[data-metric-definitions]').boundingBox()
  expect(kpi!.y).toBeLessThan(notes!.y)

  await page.locator('[data-dashboard-page="territory"]').click()
  await expect(page.locator('#filterBar')).toBeHidden()
  await page.locator('[data-dashboard-page="products"]').click()
  await expect(page.locator('#filterBar')).toBeVisible()
  await expect(page.locator('#productTable tbody tr')).toHaveCount(10)
  await expect(page.locator('#page-products > .analytics-output-hub dd').nth(1)).not.toContainText('No current readout')
  await expect(page.locator('#productConcentrationDetails #productBubbleChart')).toHaveCount(1)
  await expect(page.locator('#page-products > .chart-grid-2:has(#productBubbleChart)')).toHaveCount(0)
})

test('selected financial scope limits stay on screen with the filters collapsed to one row', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mountDashboardHarness(page)
  const description = page.locator('#salesScopeDescription')
  await expect(description).toBeHidden()
  await page.selectOption('#salesScopeSelect', 'contracts')
  await expect(description).toBeVisible({ timeout: 15000 })
  await expect(description).toContainText('Financial release pending')
  await expect(description).toContainText('contract detail is unavailable')
  await page.selectOption('#salesScopeSelect', 'combined_unreconciled')
  await expect(page.locator('#salesScopeContextWarning')).toBeVisible()
  await expect(description).toContainText('this is not confirmed company sales', { timeout: 15000 })
  await page.selectOption('#salesScopeSelect', 'itemized')
  await expect(description).toContainText('Itemized financial candidates', { timeout: 15000 })
  await expect(description).toBeVisible()
})

test('the product table reaches its last row through paging', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mountDashboardHarness(page)
  await page.locator('[data-dashboard-page="products"]').click()
  await expect(page.locator('#productTable tbody tr')).toHaveCount(10)
  const next = page.locator('#productTableNext')
  for (const shown of ['11–20', '21–30', '31–32']) {
    await next.click()
    await expect(page.locator('#productTableStatus')).toContainText(`Showing ${shown} of 32`)
  }
  await expect(page.locator('#productTable tbody tr')).toHaveCount(2)
  await expect(next).toBeDisabled()
})

test('Overview chart controls keep their names and keep focus through a change', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mountDashboardHarness(page)
  await expect(page.locator('#overviewTrendComparison label label')).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: 'Buyer sector', exact: true })).toHaveCount(1)
  await expect(page.locator('#overviewTrendMeasureSelect')).toHaveAccessibleName(/^Show\b(?!.*Buyer sector)/)
  const sector = page.locator('#overviewBuyerSector')
  await sector.focus()
  await page.evaluate(() => { (document.getElementById('overviewTrendComparison') as any).dataset.sameCard = 'yes' })
  await sector.selectOption('Government')
  await page.waitForTimeout(300)
  await expect(sector).toBeFocused()
  await expect(page.locator('#overviewTrendComparison')).toHaveAttribute('data-same-card', 'yes')
  await expect(page.locator('#overviewTrendComparison > footer#overviewPublicationStrip')).toBeVisible()
  await expect(page.locator('#overviewTrendComparison + #overviewAnalyticsSections')).toHaveCount(1)
})
