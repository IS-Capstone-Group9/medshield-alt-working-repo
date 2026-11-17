import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { mountDashboardHarness } from './helpers/dashboard-harness'

// Synthetic amounts; presentation and interaction contracts only.
const surgePayload = JSON.parse(readFileSync(path.resolve('../outputs/surge_preparedness_20261117/surge_payload.json'), 'utf8'))
const surge = { ...surgePayload, preparedness_window_months: [6, 7, 8, 9, 10, 11], uplifts: [20, 40, 60], cover_months: 1, source: { payload_sha256: 'f'.repeat(64), dataset_id: 'synthetic' },
  scenarios: [{ category: 'ANTIBACTERIAL', diseases: ['Leptospirosis'], surge_months: [8, 9, 10, 11], months_used: 20, mean_routine_php: 500000, extra_stock_php: { '20': 100000, '40': 200000, '60': 300000 } }] }
const track = Array.from({ length: 12 }, (_, i) => { const p = `2025-${String(i + 1).padStart(2, '0')}`; const a = i === 8 ? 16_000_000 : 5_000_000
  return { period: p, delivered_by_day20_php: a * .7, usual_share_by_day20: .7, mean6_php: 5_200_000, estimate_php: a * (i === 8 ? 1.1 : .95), actual_php: a } })
const readiness = { latest_period: '2025-12', next_period: '2026-01', source: { dataset_id: 'synthetic-readiness' },
  day20: { track, wape_pct: 9.1, reference_wape_pct: 31.2, weight: .75 },
  government_range: { for_period: '2026-01', p10_php: 0, p90_php: 6_000_000, months_with_large_order: 14, window_months: 24, recent: track.map((t, i) => ({ period: t.period, government_large_php: i % 3 ? 0 : 3_000_000 + i * 200_000 })) },
  registered: { day20_wape_pct: 28.8, reference_wape_pct: 41.8, day20_bias_pct: -2.3, range_coverage_pct: [77.8, 78.8] } }
const register = { version: '2026-11-17', total: 4, counts: { kept: 2, failed: 1, waiting: 0, benchmark: 1 }, note: 'Recorded test outcomes.', models: [
  { name: '6-month mean (mean_6)', layer: 'Predictive', status: 'kept', result: 'WAPE 49.7%', use: 'Reference forecast', evidence: 'x' },
  { name: 'Day-20 month-end estimate', layer: 'Predictive', status: 'kept', result: '28.8% vs 41.8%', use: 'Mid-month', evidence: 'x' },
  { name: 'Weather-regime forecast ranges (W1)', layer: 'Predictive', status: 'failed', result: '66.1% coverage', use: '—', evidence: 'x' },
  { name: 'SARIMA', layer: 'Predictive', status: 'benchmark', result: '63–77% WAPE', use: 'Lost to mean_6', evidence: 'x' }] }
const questions = { sus: Array.from({ length: 10 }, (_, i) => `Usability statement ${i + 1}`), usefulness: ['Useful 1', 'Useful 2', 'Useful 3'], roles: ['sales', 'other'] }
const policy = { origin_period: '2025-12', lead_days: 14, totals: { families: 3, monthly_demand_php: 3_000_000, safety_stock_php: 1_000_000, order_up_to_php: 5_000_000 },
  families: [{ family: 'FAMILY A', xyz_class: 'X', order_up_to_php: 3_000_000 }, { family: 'FAMILY B', xyz_class: 'Z', order_up_to_php: 1_500_000 }, { family: 'FAMILY C', xyz_class: 'Y', order_up_to_php: 500_000 }],
  backtest: { first_origin: '2024-01', last_origin: '2025-12', family_months: 10, cycle_service: .94, fill_rate: .9, pooled_target: .91, by_class: {}, uniform_rule: null }, mapping: { sha256: 'a'.repeat(64) } }

async function open(page: Page, id: string) {
  if ((page.viewportSize()?.width ?? 0) <= 1024 && await page.locator('.nav-toggle').getAttribute('aria-expanded') !== 'true') await page.locator('.nav-toggle').click()
  await page.locator(`[data-dashboard-page="${id}"]`).click()
}
async function fits(page: Page) { await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1) }

test('readiness and model list sit in their Forecast tasks', async ({ page }) => {
  await mountDashboardHarness(page, { '/api/sales/readiness': readiness, '/api/models/register': register })
  await open(page, 'forecast')
  const r = page.locator('#readinessPanel')
  await expect(r.locator('#readinessBody')).toBeVisible()
  await expect(r.locator('.pk-card').nth(1)).toContainText('9.1%')
  await expect(r.locator('#readinessTrack [role="listitem"]')).toHaveCount(12)
  await expect(r.locator('.pk-card').nth(2)).toContainText('up to ₱6.00M')
  await r.screenshot({ path: 'test-results-capstone/readiness.png' })
  await page.getByRole('tab', { name: 'Past accuracy' }).click()
  await expect(r).toBeHidden()
  const m = page.locator('#modelRegister')
  await expect(m.locator('#modelRegisterRows tr')).toHaveCount(4)
  await m.locator('[data-filter="failed"]').click()
  await expect(m.locator('#modelRegisterRows tr')).toHaveCount(1)
  await expect(m.locator('#modelRegisterShown')).toHaveText('Showing 1 of 4 models.')
  await m.locator('[data-filter="all"]').click()
  await m.locator('#modelRegisterSearch').fill('sarima')
  await expect(m.locator('#modelRegisterRows tr')).toHaveCount(1)
  await m.locator('#modelRegisterSearch').fill('')
  await m.screenshot({ path: 'test-results-capstone/models.png' })
  await page.setViewportSize({ width: 390, height: 844 }); await fits(page)
})

test('survey enables submit only when complete and posts all answers', async ({ page }) => {
  let posted: Record<string, unknown> | null = null
  await mountDashboardHarness(page, { '/api/acceptance/survey/questions': questions })
  await page.route('http://fixture.gateway/api/acceptance/survey', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
    posted = route.request().postDataJSON(); return route.fulfill({ status: 201, headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'application/json', body: JSON.stringify({ saved: true, sus_score: 85 }) })
  })
  await open(page, 'data')
  const s = page.locator('#acceptanceSurvey')
  await expect(s.locator('#acceptanceSurveyForm')).toBeVisible()
  const submit = s.locator('#acceptanceSurveySubmit')
  await expect(submit).toBeDisabled()
  await s.locator('#acceptanceSurveyRole').selectOption('sales')
  for (let i = 0; i < 10; i++) await s.locator(`input[name="sus${i}"][value="${i % 2 ? 2 : 4}"]`).check({ force: true })
  for (let i = 0; i < 2; i++) await s.locator(`input[name="use${i}"][value="5"]`).check({ force: true })
  await expect(s.locator('#acceptanceSurveyCount')).toHaveText('13 of 14 answered')
  await expect(submit).toBeDisabled()
  await s.locator('input[name="use2"][value="4"]').check({ force: true })
  await expect(submit).toBeEnabled()
  await s.screenshot({ path: 'test-results-capstone/survey.png' })
  await submit.click()
  await expect(s.locator('#acceptanceSurveyDone')).toContainText('85.0 out of 100')
  expect(posted).toEqual({ sus: [4, 2, 4, 2, 4, 2, 4, 2, 4, 2], usefulness: [5, 5, 4], role: 'sales', comment: '' })
})

test('management summary combines sources and degrades per section', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-10T08:00:00+08:00'))
  await mountDashboardHarness(page, { '/api/sales/surge-preparedness': surge, '/api/sales/readiness': readiness })
  await open(page, 'overview')
  const m = page.locator('#mgmtSummary')
  await expect(m.locator('#mgmtSummaryGrid')).toBeVisible()
  await expect(m.locator('#mgmtSummarySeason')).toContainText('September: High risk')
  await expect(m.locator('#mgmtSummaryMonth')).toContainText('Antibacterials: +₱200,000')
  await expect(m.locator('#mgmtSummaryTender')).toContainText('₱6.00M')
  await expect(m.locator('#mgmtSummaryStock')).toContainText('Unavailable')
  await expect(m.locator('#mgmtSummaryPrint')).toBeEnabled()
  await m.screenshot({ path: 'test-results-capstone/summary.png' })
})

test('management summary shows stock levels when the policy loads', async ({ page }) => {
  await mountDashboardHarness(page, { '/api/sales/prescriptive-policy': policy })
  await open(page, 'overview')
  await expect(page.locator('#mgmtSummaryStock')).toContainText('₱5.00M for 3 key product families')
  await expect(page.locator('#mgmtSummarySeason')).toContainText('Unavailable')
})
