import { test, expect, type Locator } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { signInToReadyDashboard, waitForReadyDashboard } from './helpers/dashboard'

// Real local frontend/gateway/Gold. axe checks supplement visual and human AT review.
test('Step 3 current nine-page responsive accessibility audit', async ({ page }, info) => {
  test.setTimeout(360000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await signInToReadyDashboard(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const records: unknown[] = []
  const ids = ['overview', 'revenue', 'products', 'territory', 'forecast', 'inventory', 'data', 'salesdata', 'weather']
  const actualIds = await page.locator('[data-dashboard-page]').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-dashboard-page')))
  // Discover appended ledger/weather IDs from actual markup; never silently omit a page.
  expect(actualIds.length).toBe(9)
  expect(actualIds.slice(0, 7)).toEqual(ids.slice(0, 7))
  for (const width of [1440, 824, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 1024 })
    for (const id of actualIds) {
      const nav = page.locator(`[data-dashboard-page="${id}"]`)
      if (width <= 1024 && await page.locator('.nav-toggle').getAttribute('aria-expanded') !== 'true') {
        await page.locator('.nav-toggle').click()
      }
      await nav.focus()
      await nav.press('Enter')
      await expect(page.locator('.page.active')).toHaveAttribute('id', `page-${id}`)
      await expect(nav).toHaveAttribute('aria-current', 'page')
      if (width <= 1024) await expect(page.locator('.sidebar')).toHaveAttribute('inert', '')
      // Contrast must be measured after finite page-entry opacity transitions settle.
      await page.locator(`#page-${id}`).evaluate(element => Promise.all(element.getAnimations({ subtree: true })
        .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map(animation => animation.finished.catch(() => undefined))))
      await page.evaluate(() => document.fonts.ready.then(() => undefined))
      await page.addScriptTag({ path: path.resolve('node_modules/axe-core/axe.min.js') })
      const audit = await page.evaluate(async () => {
        const result = await (window as any).axe.run('.medshield-root', {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        })
        return {
          violations: result.violations.map((v: any) => ({ id: v.id, impact: v.impact,
            help: v.help, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })),
          incomplete: result.incomplete.map((v: any) => ({ id: v.id, nodes: v.nodes.length })),
          passes: result.passes.length,
        }
      })
      const geometry = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth }))
      records.push({ id, width, geometry, ...audit })
      await writeFile(info.outputPath('audit.json'), JSON.stringify({ records, errors }, null, 2))
      await page.screenshot({ path: info.outputPath(`${id}-${width}.png`), fullPage: true, animations: 'disabled' })
      expect.soft(geometry.documentWidth, `${id} document overflow at ${width}`).toBeLessThanOrEqual(width + 1)
      expect.soft(audit.violations, `${id} automated WCAG violations at ${width}`).toEqual([])
    }
  }
  expect(errors).toEqual([])
})

for (const failure of ['503', 'network'] as const) {
  test(`Step 3 source ${failure} clears stale UI and recovers`, async ({ page }, info) => {
    test.setTimeout(150000)
    await signInToReadyDashboard(page)
    await expect(page.locator('canvas').first()).toBeAttached()
    let intercepted = 0
    await page.route('**/api/financial/dashboard*', route => {
      intercepted++
      return failure === '503'
        ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Browser-only QA simulation"}' })
        : route.abort('failed')
    })
    await page.reload()
    await expect(page.locator('.medshield-root')).toHaveAttribute('data-source-state', 'unavailable', { timeout: 90000 })
    const alert = page.locator('.medshield-root [role="alert"]')
    await expect(alert).toContainText('Databricks data is unavailable')
    await expect(page.locator('canvas, #planExport, #researchExport')).toHaveCount(0)
    expect(intercepted).toBeGreaterThan(0)
    await alert.screenshot({ path: info.outputPath('unavailable.png') })
    await page.unroute('**/api/financial/dashboard*')
    await page.reload()
    await waitForReadyDashboard(page)
    await expect(page.locator('canvas').first()).toBeAttached()
    // Empty validation live regions remain mounted in the ready dashboard.
    await expect(page.locator('.medshield-root [role="alert"]').filter({ hasText: 'Databricks data is unavailable' })).toHaveCount(0)
    await writeFile(info.outputPath('recovery.json'), JSON.stringify({ failure, intercepted,
      stale_analytics_removed: true, ready_after_override_removed: true,
      real_warehouse_outage: false, hosted_or_disaster_recovery_verified: false }, null, 2))
  })
}

/** Opens every section by keyboard. Exclusive groups and header popovers would close each other, so they are lifted first. */
async function expandForAudit(active: Locator) {
  await active.evaluate(element => element.querySelectorAll('details[name]').forEach(details => details.removeAttribute('name')))
  const closed = active.locator('details:not([open]):not(.analytics-output-hub details) > summary:visible')
  let opened = 0
  // Responsive rendering can replace evidence rows; rediscover each summary.
  while (await closed.count()) {
    expect(opened, 'bounded expansion must finish').toBeLessThan(100)
    await closed.first().press('Enter')
    opened++
  }
  await active.evaluate(element => element.querySelectorAll<HTMLDetailsElement>('.analytics-output-hub details').forEach(details => { details.open = true }))
  return opened
}

test('Step 3 blank Planning expanded fields retain names and keyboard access', async ({ page }, info) => {
  test.setTimeout(180000)
  page.setDefaultTimeout(15000)
  await signInToReadyDashboard(page)
  await page.locator('[data-dashboard-page="inventory"]').click()
  await page.selectOption('#planTerritory', 'all')
  await expect.poll(() => page.locator('#planInputs input').count(), { timeout: 90000 }).toBeGreaterThan(0)
  const records: unknown[] = []
  for (const width of [1440, 824, 390]) {
    await page.setViewportSize({ width, height: 900 })
    const active = page.locator('#page-inventory')
    const opened = await expandForAudit(active)
    const inputs = page.locator('#planInputs input')
    expect(await inputs.evaluateAll(nodes => nodes.every(n => (n as HTMLInputElement).value === ''))).toBe(true)
    await expect(page.locator('#planAcknowledged')).not.toBeChecked()
    await expect(page.locator('#planExport')).toBeDisabled()
    await page.addScriptTag({ path: path.resolve('node_modules/axe-core/axe.min.js') })
    const violations = await active.evaluate(async element => {
      const result = await (window as any).axe.run(element, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })
      return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, html: n.html })) }))
    })
    await inputs.first().focus()
    for (let step = 0; step < 20; step++) {
      expect(await page.evaluate(() => !!document.activeElement?.closest('#page-inventory') && !document.activeElement?.closest('[inert]'))).toBe(true)
      await page.keyboard.press('Tab')
    }
    records.push({ width, opened, blank_inputs: await inputs.count(), focus_steps: 20, violations })
    await writeFile(info.outputPath('planning.json'), JSON.stringify(records, null, 2))
    await page.screenshot({ path: info.outputPath(`planning-expanded-${width}.png`), animations: 'disabled' })
    expect.soft(violations, `Planning expanded at ${width}`).toEqual([])
  }
})

test('Step 3 expanded research regions and help keyboard behavior', async ({ page }, info) => {
  test.setTimeout(240000)
  page.setDefaultTimeout(15000)
  await signInToReadyDashboard(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const records: unknown[] = []
  for (const width of [1440, 824, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.locator('body')).toHaveAttribute('data-nav-state', width <= 1024 ? 'hidden' : 'expanded')
    for (const id of ['products', 'forecast']) {
      if (width <= 1024 && await page.locator('.nav-toggle').getAttribute('aria-expanded') !== 'true') await page.locator('.nav-toggle').click()
      await page.locator(`[data-dashboard-page="${id}"]`).click()
      const active = page.locator(`#page-${id}`)
      const expanded = await expandForAudit(active)
      await page.addScriptTag({ path: path.resolve('node_modules/axe-core/axe.min.js') })
      const violations = await active.evaluate(async element => {
        const result = await (window as any).axe.run(element, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        })
        return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, html: n.html, summary: n.failureSummary })) }))
      })
      const wrappers = active.locator('.abc-scroll,.tournament-scroll,.regional-php-scroll')
      for (const wrapper of await wrappers.all()) {
        await expect(wrapper).toHaveAttribute('role', 'region')
        await expect(wrapper).toHaveAttribute('aria-label', /.+/)
        await wrapper.focus()
        await expect(wrapper).toBeFocused()
        const before = await wrapper.evaluate(e => e.scrollLeft)
        await wrapper.press('ArrowRight')
        const state = await wrapper.evaluate(e => ({ left: e.scrollLeft, width: e.clientWidth, scrollWidth: e.scrollWidth,
          outline: getComputedStyle(e).outlineStyle }))
        expect(state.outline).not.toBe('none')
        if (state.scrollWidth > state.width + 1) await expect.poll(() => wrapper.evaluate(e => e.scrollLeft)).toBeGreaterThan(before)
      }
      records.push({ width, id, expanded, regions: await wrappers.count(), violations })
      await writeFile(info.outputPath('expanded.json'), JSON.stringify(records, null, 2))
      await page.screenshot({ path: info.outputPath(`${id}-expanded-${width}.png`), fullPage: true, animations: 'disabled' })
      expect.soft(violations, `${id} expanded at ${width}`).toEqual([])
    }
    if (width <= 1024 && await page.locator('.nav-toggle').getAttribute('aria-expanded') !== 'true') await page.locator('.nav-toggle').click()
    const opener = page.getByRole('button', { name: 'Open help', exact: true })
    await opener.focus(); await opener.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAccessibleName(/.+/)
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press(i % 2 ? 'Shift+Tab' : 'Tab')
      expect(await dialog.evaluate(d => d.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(width <= 1024 ? page.locator('.nav-toggle') : opener).toBeFocused()
  }
})
