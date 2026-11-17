import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { mountDashboardHarness } from './helpers/dashboard-harness'

// Calendar shape comes from the saved payload; peso amounts are synthetic. Presentation contract only.
const payload = JSON.parse(readFileSync(path.resolve('../outputs/surge_preparedness_20261117/surge_payload.json'), 'utf8'))
const base: Record<string, number> = { ANTIBACTERIAL: 500000, ANALGESIC_ANTIPYRETIC: 60000, RESPIRATORY: 55000, CRITICAL_CARE: 50000, ANTIPROTOZOAL: 40000 }
function surge() {
  const territory = new Map(payload.calendar.filter((c: { geography: string }) => c.geography === 'Territory').map((c: { disease: string; surge_months: number[] }) => [c.disease, c.surge_months]))
  const scenarios = Object.keys(base).map(category => {
    const diseases = Object.entries(payload.exposed_categories as Record<string, string[]>).filter(([, v]) => v.includes(category)).map(([d]) => d)
    const months = [...new Set(diseases.flatMap(d => (territory.get(d) as number[]) ?? []))].sort((a, b) => a - b)
    return { category, diseases, surge_months: months, months_used: months.length * 5, mean_routine_php: base[category],
      extra_stock_php: Object.fromEntries([20, 40, 60].map(u => [String(u), base[category] * u / 100])) }
  })
  return { ...payload, preparedness_window_months: [6, 7, 8, 9, 10, 11], scenarios, uplifts: [20, 40, 60], cover_months: 1,
    source: { payload_sha256: 'f'.repeat(64), dataset_id: 'synthetic-surge-fixture' } }
}

async function openPlanning(page: Page) {
  if ((page.viewportSize()?.width ?? 0) <= 1024 && await page.locator('.nav-toggle').getAttribute('aria-expanded') !== 'true') await page.locator('.nav-toggle').click()
  await page.locator('[data-dashboard-page="inventory"]').click()
}
async function fits(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
}

test('season panel: month strip, indicator, buffer toggle, export and narrow layout', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-08-15T08:00:00+08:00'))
  await mountDashboardHarness(page, { '/api/sales/surge-preparedness': surge() })
  await openPlanning(page)
  const panel = page.locator('#surgePrep')
  await expect(panel.locator('#surgePrepBody')).toBeVisible()
  await expect(panel.locator('#surgePrepNowTitle')).toHaveText('This month (August): High risk')
  await expect(panel.locator('#surgePrepNow')).toHaveAttribute('data-level', 'high')
  await expect(panel.locator('.sp-month')).toHaveCount(12)
  await expect(panel.locator('.sp-month[data-month="8"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(panel.locator('#surgePrepDetail')).toContainText('Dengue')
  await panel.screenshot({ path: 'test-results-surge/desktop-august.png' })

  // Month click and keyboard navigation update the detail, bars and calendar column.
  await panel.locator('.sp-month[data-month="3"]').click()
  await expect(panel.locator('#surgePrepDetail')).toContainText('No outbreak usually peaks this month')
  await expect(panel.locator('#surgePrepTotal')).toContainText('March')
  await panel.locator('.sp-month[data-month="3"]').press('ArrowRight')
  await expect(panel.locator('.sp-month[data-month="4"]')).toBeFocused()
  await expect(panel.locator('.sp-month[data-month="4"]')).toHaveAttribute('aria-pressed', 'true')
  await panel.locator('.sp-month[data-month="4"]').press('End')
  await expect(panel.locator('.sp-month[data-month="12"]')).toHaveAttribute('aria-pressed', 'true')

  // Buffer toggle changes the amounts.
  await expect(panel.locator('#surgePrepUplift [aria-checked="true"]')).toHaveText('+40%')
  await expect(panel.locator('.sp-bar').first().locator('.val')).toHaveText('₱200,000')
  await panel.locator('#surgePrepUplift [data-uplift="60"]').click()
  await expect(panel.locator('.sp-bar').first().locator('.val')).toHaveText('₱300,000')
  await panel.locator('#surgePrepUplift [data-uplift="60"]').press('ArrowLeft')
  await expect(panel.locator('#surgePrepUplift [aria-checked="true"]')).toHaveText('+40%')

  // Area changes the calendar; collapsed sections open.
  await panel.locator('#surgePrepGeo').selectOption('Bicol')
  await panel.locator('#surgePrepCalDetails > summary').click()
  await expect(panel.locator('#surgePrepCalendar tbody tr').first()).toBeVisible()
  await panel.locator('#surgePrepAlertDetails > summary').click()
  await expect(panel.locator('#surgePrepAlerts')).toContainText('trend-driven')

  const pending = page.waitForEvent('download'); await panel.locator('#surgePrepExport').click()
  const csv = (await readFile((await (await pending).path())!, 'utf8')).replace(/^﻿/, '').trim().split(/\r?\n/)
  expect(csv).toHaveLength(6); expect(csv[0]).toContain('extra_stock_php_plus_40pct'); expect(csv[1]).toContain('not_a_purchase_order')

  await page.setViewportSize({ width: 390, height: 844 })
  await fits(page)
  await panel.scrollIntoViewIfNeeded()
  await panel.screenshot({ path: 'test-results-surge/mobile.png' })
})

test('season panel shows an explicit unavailable state without substitute values', async ({ page }) => {
  await mountDashboardHarness(page, {})
  await openPlanning(page)
  await expect(page.locator('#surgePrepStatus')).toContainText('unavailable')
  await expect(page.locator('#surgePrepBody')).toBeHidden()
  await expect(page.locator('#surgePrepStatus')).toBeVisible()
})
