import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { mountDashboardHarness } from './helpers/dashboard-harness'

const shortlist = {
  source: { checksum: 'synthetic-workspace', file: 'Synthetic fixture', excluded: {} },
  scope: { sector: 'Unknown', territory: 'Quezon' },
  products: [{ product: 'SYNTHETIC ITEM', revenue: 1000, quantity: 100, observed_months: 12, revenue_share_pct: 100 }],
  territories: ['Quezon'], period_start: '2025-01', period_end: '2025-12', months_stale: 0,
  eligible_products: 1, excluded_nonpositive_products: 0, shortlist_share_pct: 100,
}
const stock = {
  origin_period: '2026-09', class_year: 2025, lead_days: 14,
  families: [{ family: 'SYNTHETIC FAMILY', xyz_class: 'X', service_target: .95, monthly_demand_php: 1000, safety_stock_php: 200, order_up_to_php: 1200, months_of_cover: 1.2 }],
  totals: { families: 1, monthly_demand_php: 1000, safety_stock_php: 200, order_up_to_php: 1200 },
  backtest: { first_origin: '2024-01', last_origin: '2025-12', family_months: 24, cycle_service: .95, fill_rate: .98, pooled_target: .95, by_class: {}, uniform_rule: null },
  mapping: { sha256: 'a'.repeat(64) },
}
async function setup(page: Page, available = true) {
  await mountDashboardHarness(page, available ? { '/api/sales/prescriptive-policy': stock } : {})
  await page.locator('[data-dashboard-page="inventory"]').click()
  await page.evaluate(data => (window as any).setPlanningData(data), shortlist)
}

for (const width of [1440, 824, 390]) test(`Planning shows one task with visible limits and fits at ${width}px`, async ({ page }, info) => {
  await setup(page)
  await page.setViewportSize({ width, height: 900 })
  const estimates = page.getByRole('tab', { name: 'Stock estimates', exact: true })
  const scenario = page.getByRole('tab', { name: 'Build a scenario', exact: true })
  await expect(estimates).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#stockPolicy')).toBeVisible()
  await expect(page.locator('[data-planning]')).toBeHidden()
  await expect(page.locator('#page-inventory > .analytics-output-hub dd')).toHaveCount(0)
  await expect(page.locator('#page-inventory .analytics-reading-guide__limit')).toBeVisible()
  await expect(page.locator('#page-inventory .analytics-reading-guide__limit')).toContainText('pesos, not packs')
  await page.screenshot({ path: info.outputPath(`stock-estimates-${width}.png`), fullPage: true, animations: 'disabled' })
  await estimates.focus()
  await estimates.press('ArrowRight')
  await expect(scenario).toBeFocused()
  await expect(scenario).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('[data-planning]')).toBeVisible()
  await expect(page.locator('#stockPolicy')).toBeHidden()
  await expect(page.locator('#planTakeaway')).toBeVisible()
  await expect(page.locator('#planScope')).toBeVisible()
  await expect(page.locator('#planningExampleInputs')).not.toHaveAttribute('open', '')
  await expect(page.locator('.plan-hero-grid')).toBeHidden()
  await expect(page.locator('#planWeights')).toBeHidden()
  await expect(page.locator('[data-plan-shared-unit]').first()).toBeHidden()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
  await page.screenshot({ path: info.outputPath(`scenario-${width}.png`), fullPage: true, animations: 'disabled' })
  await scenario.press('Home')
  await expect(estimates).toBeFocused()
  await expect(estimates).toHaveAttribute('aria-selected', 'true')
})

test('task changes retain entered assumptions, draft identity and complete policy output', async ({ page }) => {
  await setup(page)
  await expect(page.locator('#stockPolicyExport')).toBeEnabled()
  const event = page.waitForEvent('download')
  await page.locator('#stockPolicyExport').click()
  const csv = await readFile((await (await event).path())!, 'utf8')
  expect(csv).toContain('SYNTHETIC FAMILY,X,0.95,1000.00,200.00,1200.00')
  await page.getByRole('tab', { name: 'Build a scenario', exact: true }).click()
  await page.locator('[data-plan-field="demand"]').fill('25')
  await page.locator('#planBudget').fill('300')
  const before = await page.evaluate(() => (window as any).getPlanningRequest(true))
  await page.getByRole('tab', { name: 'Stock estimates', exact: true }).click()
  await page.getByRole('tab', { name: 'Build a scenario', exact: true }).click()
  expect(await page.evaluate(() => (window as any).getPlanningRequest(true))).toEqual(before)
  await expect(page.locator('#planAcknowledged')).not.toBeChecked()
  await expect(page.locator('#planExport')).toBeDisabled()
  const draftEvent = page.waitForEvent('download')
  await page.locator('[data-draft-save]').click()
  const draft = JSON.parse(await readFile((await (await draftEvent).path())!, 'utf8'))
  expect(draft.request).toEqual({ ...before, acknowledged: false })
  expect(draft.classification).toBe('unverified_scenario_assumptions')
})

test('advanced fields follow selected method and shared cap without deleting assumptions', async ({ page }) => {
  await setup(page)
  await page.getByRole('tab', { name: 'Build a scenario', exact: true }).click()
  await page.locator('#planAllocationMethod').selectOption('weighted')
  await expect(page.locator('#planWeights')).toBeVisible()
  await expect(page.locator('[data-plan-weighted]')).toBeVisible()
  await page.locator('#planWeights > summary').click()
  await page.locator('#planRevenueWeight').fill('100')
  await page.locator('#planAllocationMethod').selectOption('balanced')
  await expect(page.locator('#planWeights')).toBeHidden()
  await page.locator('#planAllocationMethod').selectOption('weighted')
  await expect(page.locator('#planRevenueWeight')).toHaveValue('100')
  await page.getByText('Optional shared purchase capacity', { exact: true }).click()
  await page.locator('#planPurchaseCapacity').fill('0')
  await expect(page.locator('[data-plan-shared-unit]').first()).toBeVisible()
  await page.locator('[data-plan-field="unit_label"]').fill('ampoules')
  await page.locator('#planPurchaseCapacity').fill('')
  await expect(page.locator('[data-plan-shared-unit]').first()).toBeHidden()
  await page.locator('#planPurchaseCapacity').fill('5')
  await expect(page.locator('[data-plan-field="unit_label"]')).toHaveValue('ampoules')
  await page.locator('#planningExampleInputs > summary').click()
  await page.locator('#chipScenarioNormal').click()
  await expect(page.locator('#planAcknowledged')).not.toBeChecked()
})

test('source failure stays explicit and page shortcuts open the right task', async ({ page }) => {
  await setup(page, false)
  await expect(page.locator('#stockPolicyStatus')).toContainText('unavailable')
  await expect(page.locator('#stockPolicyExport')).toBeDisabled()
  const menu = page.locator('#page-inventory .analytics-output-hub__menu')
  await menu.locator('> summary').click()
  await menu.getByRole('button', { name: 'Review entered assumptions', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Build a scenario', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#planAssumptions')).toBeVisible()
  await expect(page.locator('#planAssumptions')).toBeFocused()
  await menu.locator('> summary').click()
  await menu.getByRole('button', { name: 'Review stock estimates', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Stock estimates', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#stockPolicyStatus')).toContainText('unavailable')
})

test('real solver result survives task changes and an edited input clears it', async ({ page }) => {
  await setup(page)
  await page.getByRole('tab', { name: 'Build a scenario', exact: true }).click()
  for (const [field, value] of Object.entries({ demand: '4', stock: '0', reserve: '0', pack: '2', pack_cost: '1', max_packs: '2' })) {
    await page.locator(`[data-plan-field="${field}"]`).fill(value)
  }
  await page.locator('#planBudget').fill('100')
  await page.locator('#planAcknowledged').check()
  const request = await page.evaluate(() => (window as any).getPlanningRequest())
  const result = JSON.parse(execFileSync(process.execPath, ['--import', pathToFileURL(path.resolve('../backend/node_modules/tsx/dist/loader.mjs')).href, path.resolve('e2e/support/solve-planning.cjs')], {
    input: JSON.stringify({ body: request, shortlist }), encoding: 'utf8', cwd: path.resolve('..'),
  }))
  expect(result.status).toBe('scenario_allocation')
  expect(result.rows[0].purchase_packs).toBe(2)
  await page.evaluate(result => (window as any).setPlanningResult(result), result)
  await expect(page.locator('.plan-hero-grid')).toBeVisible()
  await expect(page.locator('#planExport')).toBeEnabled()
  const before = await page.locator('#planTakeaway').textContent()
  await page.getByRole('tab', { name: 'Stock estimates', exact: true }).click()
  await page.getByRole('tab', { name: 'Build a scenario', exact: true }).click()
  await expect(page.locator('#planTakeaway')).toHaveText(before!)
  await expect(page.locator('#planExport')).toBeEnabled()
  await page.locator('#planBudget').fill('50')
  await expect(page.locator('#planExport')).toBeDisabled()
  await expect(page.locator('.plan-hero-grid')).toBeHidden()
  await expect(page.locator('#planAcknowledged')).not.toBeChecked()
})
