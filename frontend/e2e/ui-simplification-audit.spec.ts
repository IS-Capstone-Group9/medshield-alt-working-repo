import { test, expect, type Page } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { signInToReadyDashboard } from './helpers/dashboard'
import { mountDashboardHarness } from './helpers/dashboard-harness'

/**
 * Measures how much a reader has to take in on each dashboard page.
 * Report mode records the numbers; MEDSHIELD_AUDIT_ENFORCE=1 turns the targets into failures.
 * Only a live run counts as evidence: page height and word counts mean little on mock data.
 * MEDSHIELD_AUDIT_MODE=fixture measures the synthetic harness while developing layout.
 */
const fixtureMode = process.env.MEDSHIELD_AUDIT_MODE === 'fixture'
const enforce = process.env.MEDSHIELD_AUDIT_ENFORCE === '1'
const outputDirectory = process.env.MEDSHIELD_AUDIT_OUT || ''
const baselineDirectory = process.env.MEDSHIELD_AUDIT_BASELINE
const heightBudget: Record<string, number> = { overview: 1600, forecast: 1800, revenue: 1800, products: 2000, territory: 1600, inventory: 1600 }
const chartBudget: Record<string, number> = { overview: 1 }
const spacingScale = new Set([0, 4, 8, 12, 16, 20, 24, 32])

async function measure(page: Page, id: string) {
  return page.evaluate((id) => {
    const active = document.querySelector<HTMLElement>('#page-' + id)!
    const content = document.querySelector<HTMLElement>('.content')!
    const shown = (element: Element) => element.checkVisibility({ opacityProperty: true, visibilityProperty: true } as CheckVisibilityOptions)
      && element.getClientRects().length > 0
      && ![...closedDetailsOf(element)].some(details => !details.querySelector(':scope > summary')?.contains(element))
    function* closedDetailsOf(element: Element) {
      for (let node = element.closest('details:not([open])'); node; node = node.parentElement?.closest('details:not([open])') ?? null) yield node
    }
    const top = (element: Element) => Math.round(element.getBoundingClientRect().top + window.scrollY)
    const textNodes: Text[] = []
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text)
    const visibleText = textNodes.filter(node => {
      const parent = node.parentElement
      return parent && !parent.closest('script,style,option,select') && node.textContent?.trim() && shown(parent)
    })
    const words = visibleText.reduce((total, node) => total + node.textContent!.trim().split(/\s+/).length, 0)
    const paragraphs = [...content.querySelectorAll('p,dd,li')].filter(shown)
      .map(node => ({ words: (node.textContent || '').trim().split(/\s+/).filter(Boolean).length, text: (node.textContent || '').trim().slice(0, 90) }))
      .sort((a, b) => b.words - a.words)
    const charts = [...active.querySelectorAll('canvas')].filter(canvas => {
      const box = canvas.getBoundingClientRect()
      return shown(canvas) && box.width > 0 && box.height > 0
    })
    const kpi = [...active.querySelectorAll('.kpi-card,.sales-status-card,.sales-computation-card')].find(shown)
    const fontSizes = new Map<number, number>()
    for (const node of visibleText) {
      const size = parseFloat(getComputedStyle(node.parentElement!).fontSize)
      fontSizes.set(size, (fontSizes.get(size) || 0) + 1)
    }
    const smallText = [...new Set(visibleText.filter(node => parseFloat(getComputedStyle(node.parentElement!).fontSize) < 12).map(node => {
      const parent = node.parentElement!
      return `${getComputedStyle(parent).fontSize} ${parent.tagName.toLowerCase()}.${String(parent.className).split(' ')[0]}#${parent.id}`
    }))].slice(0, 12)
    const spacingSample = ['.chart-card', '.kpi-card', '.analytics-output-hub', '#filterBar', '.chart-header'].flatMap(selector => {
      const candidates = selector === '#filterBar' ? [document.querySelector('#filterBar')] : [...active.querySelectorAll(selector)]
      const element = candidates.find(node => node && shown(node))
      if (!element) return []
      const style = getComputedStyle(element)
      return [style.paddingTop, style.paddingLeft, style.marginBottom].map(value => ({ selector, value: parseFloat(value) }))
    })
    const calendar = document.querySelector('#overviewSalesCalendar')
    return {
      id,
      height: document.documentElement.scrollHeight,
      overflowX: document.documentElement.scrollWidth - innerWidth,
      firstKpiTop: kpi ? top(kpi) : null,
      firstChartTop: charts.length ? Math.min(...charts.map(top)) : null,
      charts: charts.length + (id === 'overview' && calendar && shown(calendar) ? 1 : 0),
      words,
      longestParagraphs: paragraphs.slice(0, 3),
      visibleHashes: visibleText.filter(node => /\b[0-9a-f]{64}\b/.test(node.textContent || '')).length,
      fontSizes: [...fontSizes].sort((a, b) => a[0] - b[0]),
      smallText,
      spacingSample,
    }
  }, id)
}

async function openPage(page: Page, id: string) {
  if ((page.viewportSize()?.width || 0) <= 1024 && await page.locator('.nav-toggle').getAttribute('aria-expanded') !== 'true') await page.locator('.nav-toggle').click()
  await page.locator(`[data-dashboard-page="${id}"]`).click()
  const active = page.locator(`#page-${id}`)
  await expect(active).toHaveClass(/active/)
  // Mock responses leave some optional panels pending, so only a live run waits for them to settle.
  const settled = expect.poll(() => active.locator('p').evaluateAll(nodes => nodes.filter(node =>
    node.getClientRects().length > 0 && /^Loading[ .…]/i.test(node.textContent?.trim() || '')).length), { timeout: fixtureMode ? 1500 : 120000 }).toBe(0)
  await (fixtureMode ? settled.catch(() => undefined) : settled)
  await active.evaluate(element => Promise.race([
    Promise.all(element.getAnimations({ subtree: true })
      .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => undefined))),
    new Promise(resolve => setTimeout(resolve, 3000)),
  ]))
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await page.waitForTimeout(400)
}

for (const width of [1440, 390]) {
  test(`reading load stays within budget at ${width}px`, async ({ page }, info) => {
    test.setTimeout(600000)
    page.setDefaultTimeout(20000)
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 })
    if (enforce && fixtureMode) throw new Error('A fixture run cannot enforce live budgets.')
    if (enforce && !baselineDirectory) throw new Error('Set MEDSHIELD_AUDIT_BASELINE to the before-change live audit directory.')
    const baseline = baselineDirectory
      ? JSON.parse(await readFile(path.join(baselineDirectory, `audit-${width}.json`), 'utf8')) as { id: string; words: number }[]
      : []
    if (fixtureMode) await mountDashboardHarness(page)
    else await signInToReadyDashboard(page)
    const ids = await page.locator('[data-dashboard-page]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-dashboard-page')!))
    expect(ids).toHaveLength(9)
    const records = []
    const destination = outputDirectory ? path.resolve(outputDirectory) : info.outputPath()
    await mkdir(destination, { recursive: true })
    for (const id of ids) {
      await openPage(page, id)
      const record = await measure(page, id)
      records.push(record)
      await page.screenshot({ path: path.join(destination, `${id}-${width}.png`), fullPage: true, animations: 'disabled' })
      await writeFile(path.join(destination, `audit-${width}.json`), JSON.stringify(records, null, 2))
      if (!enforce) continue
      expect.soft(record.overflowX, `${id}: no sideways scroll`).toBeLessThanOrEqual(1)
      expect.soft(record.visibleHashes, `${id}: no visible hashes`).toBe(0)
      expect.soft(record.longestParagraphs[0]?.words ?? 0, `${id}: longest paragraph`).toBeLessThanOrEqual(25)
      const previous = baseline.find(entry => entry.id === id)
      expect.soft(previous?.words, `${id}: valid before-change word count`).toBeGreaterThan(0)
      if (previous && Number.isFinite(previous.words)) {
        expect.soft(record.words, `${id}: visible word count`).toBeLessThanOrEqual(previous.words / 2)
      }
      expect.soft(record.charts, `${id}: visible charts`).toBeLessThanOrEqual(chartBudget[id] ?? 2)
      if (width !== 1440) continue
      if (heightBudget[id]) expect.soft(record.height, `${id}: height`).toBeLessThanOrEqual(heightBudget[id])
      if (record.firstKpiTop !== null) expect.soft(record.firstKpiTop, `${id}: first KPI`).toBeLessThanOrEqual(480)
      if (record.firstChartTop !== null) expect.soft(record.firstChartTop, `${id}: first chart`).toBeLessThanOrEqual(650)
      expect.soft(record.fontSizes.filter(([size]) => size < 12), `${id}: text at least 12px`).toEqual([])
      expect.soft(record.spacingSample.filter(sample => !spacingScale.has(sample.value)), `${id}: spacing scale`).toEqual([])
    }
  })
}
