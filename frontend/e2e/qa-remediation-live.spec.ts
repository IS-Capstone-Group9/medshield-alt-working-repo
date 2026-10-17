import { test, expect, type Page } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { signInToReadyDashboard } from './helpers/dashboard'

test.use({ trace: 'off', video: 'off', screenshot: 'off' })

async function navigate(page: Page, name: string) {
  const nav = page.locator(`[data-dashboard-page="${name}"]`)
  const box = await nav.boundingBox()
  // The drawer's opening animation can still put a named button off screen.
  // Its accessible state prevents a second toggle while it is already opening.
  const toggle = page.locator('.nav-toggle')
  if ((!box || box.x < 0) && await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click()
  await nav.click()
  await expect(page.locator(`#page-${name}`)).toHaveClass(/active/)
}

test('navigation stays named, keyboard usable and synchronized with the drawer', async ({ page }) => {
  test.setTimeout(180000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await signInToReadyDashboard(page)
  const names = ['Overview', 'Sales Diagnostics', 'Product Prioritization', 'Area Prioritization', 'Forecast Modeling', 'Prescriptive Planning', 'Data Source', 'View Sales Data', 'Weather API Validation']
  for (const name of names) await expect(page.locator('.nav').getByRole('button', { name, exact: true })).toHaveCount(1)
  await page.locator('.nav-toggle').click()
  await expect(page.locator('body')).toHaveClass(/nav-collapsed/)
  await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'false')
  for (const name of names) await expect(page.locator('.nav').getByRole('button', { name, exact: true })).toHaveAttribute('title', name)
  const source = page.locator('.nav').getByRole('button', { name: 'Data Source', exact: true })
  await source.focus(); await source.press('Enter')
  await expect(page.locator('#page-data')).toHaveClass(/active/)
  await expect(page.locator('#page-data input[type=file]')).toHaveCount(0)
  await expect(page.locator('#sourcePageStatus')).toContainText('Approval pending')
  await expect(page.locator('#page-data')).toContainText('Direct dashboard uploads are unavailable')
  await expect.poll(() => page.locator('.medshield-root').evaluate(root => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let count = 0
    while (walker.nextNode()) if (walker.currentNode.textContent?.trim() === '"') count++
    return count
  })).toBe(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'false')
  await page.locator('.nav-toggle').click()
  await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('body')).toHaveClass(/nav-open/)
  await navigate(page, 'overview')
  await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('body')).not.toHaveClass(/nav-open/)
  await page.setViewportSize({ width: 800, height: 900 })
  await expect(page.locator('body')).toHaveAttribute('data-nav-state', 'collapsed')
  await page.locator('.nav-toggle').click()
  await expect(page.locator('body')).toHaveAttribute('data-nav-state', 'expanded')
  await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'true')
})

test('summary details retain forecast evidence, source identity and working chart geometry', async ({ page }, info) => {
  test.setTimeout(240000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await signInToReadyDashboard(page)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await navigate(page, 'forecast')
  await expect(page.locator('#forecastModel')).toBeEnabled({ timeout: 90000 })
  await expect(page.locator('#forecastTakeaway')).not.toContainText('unavailable', { timeout: 90000 })
  await expect(page.locator('#kpiForecastMae')).not.toHaveText('Unavailable', { timeout: 90000 })
  await expect(page.locator('#forecastEvidenceTable')).not.toBeVisible()
  await expect(page.locator('#predictiveResearchDetails')).not.toHaveAttribute('open')
  await expect(page.locator('#externalRegressionDetails')).not.toHaveAttribute('open')
  await page.getByText('Monthly actuals, predictions and historical errors', { exact: true }).click()
  await expect(page.locator('#forecastEvidenceTable')).toBeVisible()
  await expect(page.locator('#forecastEvidenceTable thead')).toContainText('Signed error (₱)')
  await page.locator('#predictiveResearchDetails > summary').click()
  await expect(page.locator('#researchStatus')).toContainText('Unpublished research candidate', { timeout: 90000 })
  await expect(page.locator('#researchModel option')).toHaveCount(21)
  await page.selectOption('#researchStage', 'projections')
  await expect(page.locator('#researchPoints [data-research-field="forecast_yoy_percent"]')).toHaveCount(12)
  await expect(page.locator('#researchExport')).toBeEnabled()
  await page.locator('#externalRegressionDetails > summary').click()
  await expect(page.locator('#externalRegressionDetails')).toContainText('no approved external territory joins', { timeout: 90000 })
  await page.locator('.data-freshness-bar > details > summary').click()
  await expect(page.locator('.data-freshness-bar')).toContainText('Fact version 20')
  await expect(page.locator('.data-freshness-bar')).toContainText('Policy:')
  await expect.poll(() => page.locator('#forecastChart').evaluate(canvas => {
    const chart = (window as any).Chart?.getChart(canvas)
    return !!chart && chart.width > 0 && chart.height > 0
  })).toBe(true)
  expect(errors).toEqual([])
  await page.screenshot({ path: info.outputPath('forecast-details.png') })
})

test('desktop and mobile summaries keep warnings while reducing default text', async ({ page }, info) => {
  test.setTimeout(300000)
  await signInToReadyDashboard(page)
  const measurements: unknown[] = []
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 })
    await expect(page.locator('body')).toHaveAttribute('data-nav-state', width <= 760 ? 'hidden' : 'expanded')
    for (const name of ['overview', 'products', 'forecast', 'inventory']) {
      await navigate(page, name)
      if (name === 'products') {
        await expect(page.locator('#productFinding')).not.toContainText('loading or unavailable', { timeout: 90000 })
        await expect.poll(() => page.locator('#productTable tbody tr').count(), { timeout: 90000 }).toBeGreaterThan(1)
        await expect.poll(() => page.locator('#productBarChart').evaluate(canvas => {
          const chart = (window as any).Chart?.getChart(canvas)
          return !!chart && chart.width > 0 && chart.data.datasets.some((d: any) => d.data.length > 0)
        }), { timeout: 30000 }).toBe(true)
      }
      if (name === 'forecast') await expect(page.locator('#kpiForecastMae')).not.toHaveText('Unavailable', { timeout: 90000 })
      if (name === 'inventory') await expect(page.locator('#planSourceStatus')).not.toContainText('Loading', { timeout: 90000 })
      const metric = await page.locator('.page.active').evaluate(root => {
        let text = (root as HTMLElement).innerText
        for (const e of root.querySelectorAll<HTMLElement>('table,select')) text = text.replace(e.innerText, '')
        const canvas = Array.from(root.querySelectorAll('canvas')).find(c => c.getBoundingClientRect().width > 0 && c.getBoundingClientRect().height > 0 && !c.closest('details:not([open])'))
        return { page: root.id, width: innerWidth, words: text.trim().split(/\s+/).length,
          firstCanvasY: canvas ? Math.round(canvas.getBoundingClientRect().top + scrollY) : null,
          overflow: document.documentElement.scrollWidth > innerWidth + 1 }
      })
      expect(metric.overflow, `${name} at ${width}px`).toBe(false)
      if (name === 'overview' && width <= 540) {
        const cards = page.locator('.overview-decision-kpis .kpi-card')
        const first = await cards.nth(0).boundingBox(), second = await cards.nth(1).boundingBox()
        expect(Math.abs(first!.y - second!.y)).toBeLessThan(2)
        for (const id of ['kpiOverviewTotalRevenue', 'kpiOverviewGrossProfit']) {
          const fit = await page.locator('#' + id).evaluate(value => ({
            widthFits: value.scrollWidth <= value.clientWidth + 1,
            singleLine: value.getBoundingClientRect().height <= parseFloat(getComputedStyle(value).fontSize) * 1.4,
          }))
          expect(fit, `${id} should fit without splitting digits at ${width}px`).toEqual({ widthFits: true, singleLine: true })
        }
      }
      const oldWords: Record<string, number> = { overview: 261, products: 453, forecast: 540, inventory: 300 }
      expect(metric.words, `${name} default copy should be shorter`).toBeLessThan(oldWords[name])
      if (name === 'forecast') await expect(page.locator('#forecastAssumptions')).toContainText('Historical errors do not establish future accuracy')
      if (name === 'inventory') await expect(page.locator('#planAssumptions')).toContainText('Scenario only')
      measurements.push(metric)
      await page.screenshot({ path: info.outputPath(`${name}-${width}.png`), animations: 'disabled' })
    }
  }
  await writeFile(info.outputPath('summary-measurements.json'), JSON.stringify(measurements, null, 2))
})
