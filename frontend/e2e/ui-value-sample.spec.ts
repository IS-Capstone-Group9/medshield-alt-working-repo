import { test, expect, type Page } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { signInToReadyDashboard } from './helpers/dashboard'

/**
 * Records displayed values so two dashboard versions can be compared exactly.
 * It needs a live sign-in and MEDSHIELD_SAMPLE_OUT, and it judges nothing by itself.
 */
const destination = process.env.MEDSHIELD_SAMPLE_OUT ? path.resolve(process.env.MEDSHIELD_SAMPLE_OUT) : ''
test.skip(!destination, 'Set MEDSHIELD_SAMPLE_OUT to record a value sample.')

const open = async (page: Page, id: string) => {
  await page.locator(`[data-dashboard-page="${id}"]`).click()
  await expect(page.locator(`#page-${id}`)).toHaveClass(/active/)
}
const chart = async (page: Page, id: string) => {
  await expect.poll(() => page.evaluate(id => Boolean((window as any).Chart?.getChart(document.getElementById(id))), id), { timeout: 90000 }).toBe(true)
  return page.evaluate(id => {
    const instance = (window as any).Chart.getChart(document.getElementById(id))
    return { labels: instance.data.labels, datasets: instance.data.datasets.map((set: any) => ({ label: set.label, data: set.data })) }
  }, id)
}
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll(nodes => nodes.map(node => node.textContent!.replace(/\s+/g, ' ').trim()))
/** Exports carry their generation time, so those fields are removed before comparing. */
const csv = async (page: Page, selector: string) => {
  const target = page.locator(selector)
  await expect(target).toBeEnabled({ timeout: 240000 })
  const pending = page.waitForEvent('download')
  await target.evaluate(node => (node as HTMLButtonElement).click())
  const file = await (await pending).path()
  return (await readFile(file, 'utf8')).split(/\r?\n/).filter(line => !/generated|exported|captured|timestamp/i.test(line))
}

test('record displayed values', async ({ page }) => {
  test.setTimeout(900000)
  page.setDefaultTimeout(30000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await signInToReadyDashboard(page)
  const sample: Record<string, unknown> = {}
  await open(page, 'overview')
  sample.overviewKpis = await texts(page, '#page-overview .kpi-card .kpi-value')
  sample.overviewChart = await chart(page, 'overviewBaselineChart')
  sample.overviewCsv = await csv(page, '#overviewTrendExport')
  await open(page, 'revenue')
  sample.salesChart = await chart(page, 'revenueDetailChart')
  sample.salesKpis = await texts(page, '#page-revenue .kpi-card .kpi-value')
  await open(page, 'products')
  await expect(page.locator('#productTableStatus')).toContainText('Showing', { timeout: 240000 })
  sample.productRows = (await texts(page, '#productTable tbody tr')).slice(0, 10)
  sample.productCsv = await csv(page, '#productPriorityExport')
  await open(page, 'territory')
  await expect(page.locator('#areaReviewStatus')).toContainText('Observed financial review', { timeout: 90000 })
  await expect(page.locator('#areaReviewTable tbody tr').first()).toBeVisible()
  sample.areaMetrics = await texts(page, '#areaReviewCompany, #areaReviewConfirmed')
  sample.areaRows = await texts(page, '#areaReviewTable tbody tr')
  await open(page, 'forecast')
  sample.forecastChart = await chart(page, 'forecastChart')
  sample.forecastMetrics = await texts(page, '.forecast-hero-card .hero-val')
  sample.forecastCsv = await csv(page, '#forecastExport')
  await mkdir(destination, { recursive: true })
  await writeFile(path.join(destination, 'values.json'), JSON.stringify(sample, null, 1))
})
