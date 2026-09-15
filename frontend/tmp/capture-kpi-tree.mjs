import { chromium } from 'playwright'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 })
const source = path.resolve('tmp', 'progress_report', 'kpi-tree-standalone.html')
await page.goto(pathToFileURL(source).href)
await page.waitForTimeout(1000)
const frame = page.frameLocator('iframe')
await frame.locator('#medshield-kpi-tree-aligned').screenshot({ path: path.resolve('tmp', 'progress_report', 'kpi-tree.png') })
await browser.close()
