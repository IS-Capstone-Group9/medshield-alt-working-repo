import { test, expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { signInToReadyDashboard } from './helpers/dashboard'

test('current analytical charts survive navigation and reload without missing legacy canvases', async ({ page }) => {
  test.setTimeout(240000)
  const missing: string[] = [], errors: string[] = []
  const rendered: Array<{ page: string; chartIds: string[] }> = []
  page.on('console', message => {
    if (/Canvas with id .* not found in DOM/.test(message.text())) missing.push(message.text())
    if (/Failed to create chart|Chart constructor unavailable/.test(message.text())) errors.push(message.text())
  })
  page.on('pageerror', error => errors.push(error.message))
  await signInToReadyDashboard(page)
  // The old implementation attempts retired canvases during the initial build.
  expect(missing).toEqual([])
  for (const name of ['overview', 'revenue', 'products', 'territory', 'overview', 'revenue']) {
    const nav = page.locator(`[data-dashboard-page="${name}"]`)
    const box = await nav.boundingBox()
    if (!box || box.x < 0) await page.locator('.nav-toggle').click()
    await nav.click()
    await expect(page.locator(`#page-${name}`)).toHaveClass(/active/)
    if (name === 'products' || name === 'territory') await expect(page.locator('#sectorRegion')).toBeEnabled({ timeout: 90000 })
    if (name === 'revenue') await expect(page.locator('#heatmapProduct')).toBeEnabled({ timeout: 90000 })
    await expect.poll(() => page.locator(`#page-${name} canvas`).evaluateAll(canvases => canvases.filter(canvas => {
      const chart = (window as any).Chart?.getChart(canvas)
      return !!chart && canvas.isConnected && chart.width > 0 && chart.height > 0 && chart.data.datasets.some((dataset: any) => dataset.data.length > 0)
    }).length), { timeout: 30000, message: `${name} needs a real populated Chart.js instance` }).toBeGreaterThan(0)
    rendered.push({ page: name, chartIds: await page.locator(`#page-${name} canvas`).evaluateAll(canvases => canvases
      .filter(canvas => !!(window as any).Chart?.getChart(canvas)).map(canvas => canvas.id)) })
  }
  await page.reload()
  await expect(page.locator('.medshield-root')).toHaveAttribute('data-source-state', 'ready', { timeout: 90000 })
  await expect.poll(() => page.locator('#overviewBaselineChart').evaluate(canvas => !!(window as any).Chart?.getChart(canvas))).toBe(true)
  expect(missing).toEqual([])
  expect(errors).toEqual([])
  await writeFile(test.info().outputPath('rendered-charts.json'), JSON.stringify({ rendered, afterReload: 'overviewBaselineChart', missingCanvasWarnings: missing, chartErrors: errors }, null, 2))
})
