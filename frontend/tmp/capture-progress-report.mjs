import { chromium } from 'playwright'
import path from 'node:path'
import { mkdir } from 'node:fs/promises'

const output = path.resolve('..', 'tmp', 'progress_report', 'screenshots')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 })
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' })
await page.fill('#username', process.env.MEDSHIELD_E2E_USERNAME || 'admin')
await page.fill('#password', process.env.MEDSHIELD_E2E_PASSWORD || 'medshield2025')
await page.getByRole('button', { name: 'Login', exact: true }).click()
await page.waitForURL('http://localhost:3000/', { timeout: 15000 })
await page.waitForSelector('#topbar-title')
await page.waitForTimeout(2500)

const pages = [
  ['overview', 'overview'],
  ['Sales Diagnostics', 'sales-diagnostics'],
  ['Product Prioritization', 'product-prioritization'],
  ['Area Prioritization', 'area-prioritization'],
  ['Forecast Modeling', 'forecast-modeling'],
  ['Prescriptive Planning', 'prescriptive-planning'],
  ['Data Upload', 'data-upload'],
]
for (const [nav, filename] of pages) {
  if (nav !== 'overview') await page.locator('.nav-item', { hasText: nav }).click()
  await page.waitForTimeout(1800)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: path.join(output, `${filename}.png`) })
}
await browser.close()
