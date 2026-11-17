import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

// The backend is CommonJS TypeScript and the frontend package is ESM, so the real solver runs in a tsx child process.
const root = path.resolve('..')
function solvePlanningScenario(body: any, list: any) {
  return JSON.parse(execFileSync(process.execPath, ['--import', pathToFileURL(path.join(root, 'backend/node_modules/tsx/dist/loader.mjs')).href, path.join(root, 'frontend/e2e/support/solve-planning.cjs')],
    { input: JSON.stringify({ body, shortlist: list }), cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }))
}

// Native Chromium, real markup/script, real gateway solver; the gateway itself is not contacted.
// Hand-solved basis: A needs ceil(4/2)=2 packs (4 units), B needs 3 packs (3 units): uncapped purchase = 7 units, cost 5.
const shortlist = {
  source: { checksum: 'capacity_browser', file: 'controlled fixture', excluded: {} },
  scope: { sector: 'Unknown', territory: 'Quezon' },
  products: [
    { product: 'A', revenue: 100, quantity: 100, observed_months: 12, revenue_share_pct: 40 },
    { product: 'B', revenue: 100, quantity: 100, observed_months: 12, revenue_share_pct: 40 },
  ],
  territories: ['Quezon'], period_start: '2025-01', period_end: '2025-12', months_stale: 8,
  eligible_products: 10, excluded_nonpositive_products: 0, shortlist_share_pct: 80,
}
const rows = [
  { demand: '4', stock: '0', reserve: '0', pack: '2', pack_cost: '1', max_packs: '2' },
  { demand: '3', stock: '0', reserve: '0', pack: '1', pack_cost: '1', max_packs: '3' },
]

async function open(page: Page) {
  await page.route('http://medshield.test/**', r => r.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto('http://medshield.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
  await page.evaluate(() => { window.fetch = async () => new Response('{}', { status: 503 }) })
  await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
  await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())
  await page.evaluate(d => { const w = window as any; w.showPage('inventory'); w.setPlanningData(d) }, shortlist)
  await expect(page.locator('#planInputs tbody tr')).toHaveCount(2)
  for (let i = 0; i < 2; i++) for (const [key, value] of Object.entries(rows[i]))
    await page.locator(`[data-plan-index="${i}"][data-plan-field="${key}"]`).fill(value)
  await page.locator('#planBudget').fill('100')
}

const acknowledge = (page: Page) => page.locator('#planAcknowledged').check()

async function setCapacity(page: Page, units: string, unit = 'ampoules') {
  await page.locator('summary', { hasText: 'Optional shared purchase capacity' }).click()
  await page.locator('#planPurchaseCapacity').fill(units)
  await page.locator('#planCapacityUnit').fill(unit)
  for (let i = 0; i < 2; i++) await page.locator(`[data-plan-index="${i}"][data-plan-field="unit_label"]`).fill(unit)
}

// UI request -> real solver -> UI result, exactly as the dashboard bridge does.
async function solve(page: Page) {
  await acknowledge(page)
  const request = await page.evaluate(() => (window as any).getPlanningRequest())
  const result = solvePlanningScenario(request, shortlist)
  await page.evaluate(r => (window as any).setPlanningResult(r), result)
  return { request, result }
}

// Minimal RFC 4180 line parser: the export starts with a BOM and quotes its cells.
function csvLine(line: string) {
  const cells: string[] = []; let cell = '', quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) { if (c === '"' && line[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') quoted = false; else cell += c }
    else if (c === '"') quoted = true
    else if (c === ',') { cells.push(cell); cell = '' }
    else cell += c
  }
  return [...cells, cell]
}

const units = (result: any) => result.rows.reduce((sum: number, r: any) => sum + r.purchase_units, 0)

test('blank cap sends no capacity fields and reports none applied', async ({ page }) => {
  await open(page)
  const { request, result } = await solve(page)
  expect('purchase_capacity_units' in request).toBe(false)
  expect(result.purchase_capacity).toBeNull()
  expect(units(result)).toBe(7)
  await expect(page.locator('#planCapacitySummary')).toHaveText('No shared purchase-capacity constraint was applied.')
})

test('binding cap of 3 limits purchases, reconciles used+remaining and exports the applied status', async ({ page }) => {
  await open(page)
  await setCapacity(page, '3')
  const { request, result } = await solve(page)
  expect(request.purchase_capacity_units).toBe('3')
  expect(units(result)).toBeLessThanOrEqual(3)
  expect(units(result)).toBeLessThan(7)
  expect(result.purchase_capacity).toMatchObject({ units: 3, unit_label: 'ampoules', evidence_label: 'Assumed', physical_storage_verified: false })
  expect(result.purchase_capacity.used_units + result.purchase_capacity.remaining_units).toBe(3)
  expect(result.purchase_capacity.used_units).toBe(units(result))
  await expect(page.locator('#planCapacitySummary')).toContainText('Assumed purchase cap: 3 ampoules')
  await expect(page.locator('#planCapacitySummary')).toContainText('physical storage is not verified')
  const download = page.waitForEvent('download')
  await page.locator('#planExport').click()
  const lines = (await readFile((await (await download).path())!, 'utf8')).split(/\r?\n/).filter(Boolean)
  const header = csvLine(lines[0].replace(/^﻿/, '')), first = csvLine(lines[1])
  const col = (name: string) => first[header.indexOf(name)]
  expect(header).toContain('capacity_constraint_status')
  expect(col('capacity_constraint_status')).toBe('applied')
  expect(Number(col('shared_purchase_capacity_units'))).toBe(3)
})

test('zero cap permits no purchases and never silently becomes no cap', async ({ page }) => {
  await open(page)
  await setCapacity(page, '0')
  await acknowledge(page)
  const request = await page.evaluate(() => (window as any).getPlanningRequest())
  expect(request.purchase_capacity_units).toBe('0')
  const { result } = await solve(page)
  expect(units(result)).toBe(0)
  await expect(page.locator('#planCapacitySummary')).toContainText('Assumed purchase cap: 0 ampoules')
})

test('a result that does not match the entered cap is refused', async ({ page }) => {
  await open(page)
  await setCapacity(page, '3')
  await acknowledge(page)
  const request = await page.evaluate(() => (window as any).getPlanningRequest())
  const other = solvePlanningScenario({ ...request, purchase_capacity_units: '2' }, shortlist)
  await page.evaluate(r => (window as any).setPlanningResult(r), other)
  await expect(page.locator('#planResultStatus')).toContainText('does not match your inputs')
  await expect(page.locator('#planExport')).toBeDisabled()
  const { purchase_capacity_units: _u, capacity_unit_label: _l, ...rest } = request
  const blank = solvePlanningScenario(rest, shortlist)
  await page.evaluate(r => (window as any).setPlanningResult(r), blank)
  await expect(page.locator('#planResultStatus')).toContainText('does not match your inputs')
})

test('invalid caps are rejected by the solver and editing the cap clears a stale result', async ({ page }) => {
  await open(page)
  await setCapacity(page, '3')
  await acknowledge(page)
  const request = await page.evaluate(() => (window as any).getPlanningRequest())
  for (const bad of ['-1', '1.5', 'abc']) expect(() => solvePlanningScenario({ ...request, purchase_capacity_units: bad }, shortlist)).toThrow()
  await page.evaluate(() => (window as any).setPlanningResult(null, 'Purchase capacity must be a whole number'))
  await expect(page.locator('#planResultStatus')).toContainText('whole number')
  await solve(page)
  await expect(page.locator('#planExport')).toBeEnabled()
  await page.locator('#planPurchaseCapacity').fill('4')
  await expect(page.locator('#planAcknowledged')).not.toBeChecked()
  await expect(page.locator('#planExport')).toBeDisabled()
  await expect(page.locator('#planResults')).toBeEmpty()
  await expect(page.locator('#planCapacitySummary')).toHaveText('')
})

test('scroll regions are labelled and keyboard focusable; mobile has no horizontal page scroll', async ({ page }) => {
  await open(page)
  const regions = page.locator('.plan-scroll[role="region"]')
  await expect(regions.first()).toHaveAttribute('tabindex', '0')
  await expect(regions.first()).toHaveAttribute('aria-label', /scroll horizontally/)
  await regions.first().focus()
  await expect(regions.first()).toBeFocused()
  await expect(page.locator('input[data-plan-field="unit_label"]').first()).toHaveAttribute('aria-label', /scenario unit label/)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
