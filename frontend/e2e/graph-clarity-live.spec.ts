import { test, expect, type Page } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { signInToReadyDashboard } from './helpers/dashboard'

test.use({ trace: 'off', video: 'off', screenshot: 'off' })

async function navigate(page: Page, name: string) {
  const toggle = page.locator('.nav-toggle')
  const nav = page.locator(`[data-dashboard-page="${name}"]`)
  const box = await nav.boundingBox()
  if ((!box || box.x < 0) && await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click()
  await nav.click()
  await expect(page.locator(`#page-${name}`)).toHaveClass(/active/)
}

async function settleCharts(page: Page, name: string) {
  await expect.poll(() => page.locator(`#page-${name}`).evaluate(section => {
    const app = window as any
    return Array.from(section.querySelectorAll('canvas')).every(canvas => {
      if (!canvas.checkVisibility()) return true
      const chart = app.Chart.getChart(canvas)
      if (!chart) return true
      return chart.getSortedVisibleDatasetMetas().every((meta: any) => meta.data.every((element: any) => {
        const target = element.getProps(['x','y'], true)
        return ['x','y'].every(key => !Number.isFinite(target[key]) || Math.abs(element[key]-target[key]) < .5)
      }))
    })
  }), {timeout:10000, message:'Wait for chart animation and responsive layout to finish'}).toBe(true)
}

test('capture loaded graph meaning and geometry across dashboard pages', async ({ page }) => {
  const phase = process.env.MEDSHIELD_GRAPH_AUDIT_PHASE || 'after'
  const output = path.resolve('../outputs/graph_clarity_20261017', phase)
  await mkdir(output, { recursive: true })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await signInToReadyDashboard(page)
  const summaries = []
  for (const name of ['overview', 'revenue', 'products', 'territory', 'forecast', 'inventory']) {
    await navigate(page, name)
    // Product charts render only while their page is active, after sector data arrives.
    if (name === 'products' || name === 'revenue') await expect.poll(() => page.evaluate(id => {
      const app = window as any
      return app.Chart.getChart(document.getElementById(id))?.data.datasets.length || 0
    }, name === 'products' ? 'productBarChart' : 'revenueDetailChart'), {timeout: 90000}).toBeGreaterThan(0)
    if (name === 'forecast') {
      await expect(page.locator('#forecastModel')).toBeEnabled({ timeout: 90000 })
      await expect(page.locator('#kpiForecastMae')).not.toHaveText('Unavailable', { timeout: 90000 })
    }
    if (name === 'territory') await expect(page.locator('#sectorStatus')).not.toContainText(/Loading|unavailable/i, {timeout: 90000})
    if (name === 'inventory') await expect(page.locator('#planSourceStatus')).toContainText('Source-ranked shortlist', {timeout: 90000})
    await settleCharts(page, name)
    if (phase === 'after') {
      if (name === 'overview') await expect(page.locator('#overviewTrendReading')).toContainText('Totals use client-provided records')
      if (name === 'products') await expect(page.locator('#productSalesValues')).not.toBeVisible()
      if (name === 'territory') await expect(page.locator('[data-rollup-region="Bicol"]')).toContainText('No mapped records')
      if (name === 'inventory') await expect(page.locator('#planInputs tbody')).toContainText('source Qty (unit unverified)')
      if (name === 'forecast') {
        await expect(page.locator('#forecastPlotScope')).toContainText('Historical chart only')
        expect(await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('forecastChart')).data.datasets.some((d: any) => d.label.includes('future prediction')))).toBe(false)
      }
    }
    const summary = await page.locator(`#page-${name}`).evaluate(section => {
      const app = window as any
      return {
        name: section.id,
        text: (section as HTMLElement).innerText,
        charts: Array.from(section.querySelectorAll('canvas')).filter(canvas => canvas.checkVisibility()).map(canvas => {
          const chart = app.Chart.getChart(canvas)
          const rect = canvas.getBoundingClientRect()
          return {
            id: canvas.id, width: rect.width, height: rect.height,
            title: canvas.closest('.chart-card')?.querySelector('.chart-title')?.textContent?.trim(),
            subtitle: canvas.closest('.chart-card')?.querySelector('.chart-subtitle')?.textContent?.trim(),
            aria: canvas.getAttribute('aria-label'), type: chart?.config.type,
            labels: chart?.data.labels,
            datasets: chart?.data.datasets.map((dataset: any) => ({label: dataset.label, data: dataset.data, hidden: dataset.hidden, axis: dataset.yAxisID, spanGaps: dataset.spanGaps, pointRadius: dataset.pointRadius})),
            legend: chart?.options.plugins?.legend?.display,
            scales: chart ? Object.fromEntries(Object.entries(chart.scales).map(([key, value]: [string, any]) => [key, {min: value.min, max: value.max, title: value.options.title, ticks: value.ticks.map((tick: any) => tick.label)}])) : null,
          }
        }),
      }
    })
    summaries.push(summary)
    await page.screenshot({path: path.join(output, `${name}-1440.png`), fullPage: true})
    await page.setViewportSize({width: 390, height: 844})
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth), {timeout: 5000}).toBeLessThanOrEqual(390)
    await settleCharts(page, name)
    await page.screenshot({path: path.join(output, `${name}-390.png`), fullPage: true})
    await page.setViewportSize({width: 1440, height: 1000})
  }
  const provenance = await page.locator('.data-freshness-bar').textContent()
  await writeFile(path.join(output, 'graphs.json'), JSON.stringify({capturedAt: new Date().toISOString(), provenance, errors, summaries}, null, 2))
  expect(errors).toEqual([])
})
