import { test, expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { signInToReadyDashboard } from './helpers/dashboard'

test('Financial scope selector retains a compact single-row height at every viewport', async ({ page }, info) => {
  test.setTimeout(150000)
  await signInToReadyDashboard(page)
  const records: unknown[] = []
  for (const width of [1440, 824, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    const geometry = await page.locator('.sales-scope-control:visible').evaluate(control => {
      const select = control.querySelector('select')!
      const label = select.closest('label')!
      return { width: innerWidth, select: select.getBoundingClientRect().toJSON(), label: label.getBoundingClientRect().toJSON(),
        direction: getComputedStyle(control).flexDirection, labelFlex: getComputedStyle(label).flex,
        selectHeight: getComputedStyle(select).height, documentWidth: document.documentElement.scrollWidth }
    })
    records.push(geometry)
    await writeFile(info.outputPath('geometry.json'), JSON.stringify(records, null, 2))
    await page.screenshot({ path: info.outputPath(`overview-${width}.png`) })
    expect.soft(geometry.select.height, `single-line selector at ${width}px`).toBeLessThanOrEqual(48)
    expect.soft(geometry.select.height).toBeGreaterThanOrEqual(36)
    expect.soft(geometry.documentWidth).toBeLessThanOrEqual(width + 1)
  }
})

test('Settled nine-page captures support scoped visual acceptance', async ({ page }, info) => {
  test.setTimeout(360000)
  page.setDefaultTimeout(15000)
  await signInToReadyDashboard(page)
  const ids = await page.locator('[data-dashboard-page]').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-dashboard-page')))
  expect(ids).toHaveLength(9)
  const records: unknown[] = []
  for (const width of [1440, 824, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.locator('body')).toHaveAttribute('data-nav-state', width <= 1024 ? 'hidden' : 'expanded')
    for (const id of ids) {
      if (width <= 1024 && await page.locator('.nav-toggle').getAttribute('aria-expanded') !== 'true') await page.locator('.nav-toggle').click()
      await page.locator(`[data-dashboard-page="${id}"]`).click()
      const active = page.locator(`#page-${id}`)
      await expect(active).toHaveClass(/active/)
      await expect.poll(() => active.locator('p, .skeleton, [aria-busy="true"]').evaluateAll(nodes => nodes.filter(node =>
        node.checkVisibility({ opacityProperty: true, visibilityProperty: true })
        && (node.matches('.skeleton, [aria-busy="true"]') || /^Loading[ .…]/i.test(node.textContent?.trim() || ''))
      ).length), { timeout: 90000, message: `${id} must settle before visual capture` }).toBe(0)
      // Match the screenshot's settled styles before testing contrast.
      await active.evaluate(element => {
        for (const animation of element.getAnimations({ subtree: true })) {
          if (animation.playbackRate !== 0 && Number.isFinite(animation.effect?.getComputedTiming().endTime)) animation.finish()
        }
      })
      await page.evaluate(() => document.fonts.ready.then(() => undefined))
      await page.addScriptTag({ path: path.resolve('node_modules/axe-core/axe.min.js') })
      const audit = await page.evaluate(async () => {
        const result = await (window as any).axe.run('.medshield-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })
        return { violations: result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })),
          documentWidth: document.documentElement.scrollWidth }
      })
      records.push({ id, width, ...audit })
      await writeFile(info.outputPath('settled.json'), JSON.stringify(records, null, 2))
      await page.screenshot({ path: info.outputPath(`${id}-${width}.png`), fullPage: true, animations: 'disabled' })
      expect.soft(audit.violations).toEqual([])
      expect.soft(audit.documentWidth).toBeLessThanOrEqual(width + 1)
    }
  }
})

test('Ledger summary keeps exact amounts on one line on narrow screens', async ({ page }, info) => {
  test.setTimeout(150000)
  await signInToReadyDashboard(page)
  await page.locator('[data-dashboard-page="sales-data"]').click()
  await expect(page.locator('#salesComputationGrid .sales-status-value')).toHaveCount(4, { timeout: 90000 })
  const records: unknown[] = []
  for (const width of [390, 320, 824, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    const values = await page.locator('#salesComputationGrid .sales-status-value').evaluateAll(nodes => nodes.map(node => {
      const range = document.createRange(); range.selectNodeContents(node)
      return { text: node.textContent, lines: range.getClientRects().length, width: node.clientWidth, contentWidth: node.scrollWidth }
    }))
    records.push({ width, values })
    await writeFile(info.outputPath('ledger-geometry.json'), JSON.stringify(records, null, 2))
    await page.screenshot({ path: info.outputPath(`ledger-${width}.png`) })
    for (const value of values) {
      expect.soft(value.lines, `whole summary value at ${width}: ${value.text}`).toBe(1)
      expect.soft(value.contentWidth).toBeLessThanOrEqual(value.width + 1)
    }
  }
})
