import { test, expect, type Page } from '@playwright/test'
import { mountDashboardHarness } from './helpers/dashboard-harness'
import { signInToReadyDashboard } from './helpers/dashboard'

// Invented fixtures: they exercise wiring, wording and layout only, never warehouse or model acceptance.
const survival = (y2: number | null, keep: number | null) => ({ families: 300, year2_known: y2 === null ? 0 : 246, survival_y2_pct: y2, survival_y3_pct: y2 === null ? null : 16,
  value_retention_y2_pct: keep, one_month_pct: y2 === null ? null : 52.5 })
const breakdowns = {
  source: { dataset_id: 'synthetic-breakdowns-fixture', fact_version: 0, total_php: 1_000_000 },
  margin: {
    coverage: [{ year: 2019, cost_coverage_pct: 60 }, { year: 2025, cost_coverage_pct: 90 }],
    headline: { from: 2019, to: 2025, margin0_pct: 70, margin1_pct: 50, change_pts: -20, mix_pts: -15, rate_pts: -5,
      biggest_drags: [{ family: 'SYNTHETIC FAMILY WITH A LONG NAME FOR RESPONSIVE TABLE REVIEW', share0: 9, share1: 2, margin0: 80, margin1: 30, mix: -4, rate: -3 }] },
    year_on_year: [{ from: 2024, to: 2025, change_pts: -7, mix_pts: -4, rate_pts: -3 }],
  },
  bridge: [
    { from: 2017, to: 2018, matched_months: 5, change_php: 1e6, large_orders_php: 1e6, continuing_families_php: 0, new_families_php: 0, lost_families_php: 0 },
    { from: 2024, to: 2025, matched_months: 12, change_php: 60e6, large_orders_php: 36e6, continuing_families_php: 8e6, new_families_php: 21e6, lost_families_php: -5e6 },
  ],
  unusual: { months_scored: 101, routine: [], total: [
    { period: '2017-12', flag: 'LOW', value_php: 3900, usual_php: 2_400_000, cause: 'BROAD', top_families: [] },
    { period: '2025-09', flag: 'HIGH', value_php: 16e6, usual_php: 3.5e6, cause: 'LARGE ORDERS', top_families: [{ family: 'SYNTHETIC A', deviation: 1e6, new: true }] },
  ] },
  survival: { by_cohort: [{ cohort: 2020, ...survival(34, 53) }, { cohort: 2025, ...survival(null, null) }], all: survival(23.4, 27),
    early_repeat_signal: { consistent: true, yes: survival(52, 43), no: survival(19, 20) }, large_order_start: { yes: survival(25, 9), no: survival(23, 49) } },
  large_orders: {
    by_year: [{ year: 2025, months_recorded: 12, months_with_large: 11, documents: 49, large_php: 43e6, share_pct: 49 }, { year: 2026, months_recorded: 9, months_with_large: 9, documents: 74, large_php: 84e6, share_pct: 60 }],
    size: { p50: 800_000, p90: 1_500_000, max: 4_800_000, month_p10: 800_000, month_p50: 3_000_000, month_p90: 9_000_000 },
    calendar_timing_registered: { p_value: 0.134 },
    chance: { next_month_pct: 67, usable: true, holdout: { brier: 0.216, mean_predicted_pct: 61, observed_pct: 70 } },
    range: { development_coverage_pct: 83, holdout_coverage_pct: 73, misses_above: 15, next_month_low_php: 0, next_month_high_php: 14_000_000 },
    tradeoff: { selected_usable: false, options: [12, 24].flatMap(window_months => [50, 75, 90, 100].map(percentile => ({ window_months, percentile, next_month_php: 1e6 * percentile / 10,
      holdout: { coverage_pct: percentile - 20, mean_reserve_php: 5e6, mean_unused_php: 2e6, mean_shortfall_php: 1e6 } }))) },
  },
  day20: { evaluation: { estimate: { cases: 33, wape_pct: 28.8, bias_pct: -2.3 }, reference: { wape_pct: 41.8, bias_pct: -24 } },
    recent: [{ period: '2026-09', month_to_day20_php: 19e6, estimate_php: 25e6, reference_mean6_php: 20e6, actual_php: 26e6 }] },
}
const year = (y: number, median: number, big: number) => ({ year: y, net_php: 1e7,
  order_size: { documents: 1000, mean_php: median * 3, median_php: median, band_share_pct: { 'under ₱10K': 10, '₱10K–100K': 20, '₱100K–500K': 70 - big, '₱500K and over': big } },
  channel_share_pct: { GOVERNMENT: 60, HOSPITAL: 30, 'OTHER LABELS': 10 }, category: [{ category: 'medicine', share_pct: 80, margin_pct: 55 }, { category: 'medical_supply', share_pct: 20, margin_pct: null }],
  portfolio: y === 2025 ? null : { continuing: 300, new: 700, lost: 400, new_net_share_pct: 55, lost_prior_net_share_pct: 20 },
  concentration: { families: 1000, top10_share_pct: 42, hhi: 500 }, returns: { negative_lines: 2, share_of_positive_pct: 0.1 }, discount_rate_pct: 0.2,
  timing: { months: 9, median_by_day10_pct: 30, median_by_day20_pct: 74 } })
const descriptive = { source: { dataset_id: 'synthetic-descriptive-fixture', fact_version: 0, total_php: 2e7 }, channel_labels: ['GOVERNMENT', 'HOSPITAL', 'OTHER LABELS'], latest_year_months: 9,
  years: [year(2025, 12_000, 49), year(2026, 15_000, 60)], notes: { channel: 'Synthetic label note.', margin: 'Synthetic margin note.' } }
const group = (category: string, planning_class: string, plan: string, mixed = false) => ({ category, share_all_sales_pct: 10, current_net_php: 5e6, large_share_pct: planning_class === 'LARGE_ORDER' ? 62 : 30,
  routine_cv: 0.6, active_months: 24, planning_class, mixed, plan, new_product_share_pct: 28, routine_wape_current_pct: 54 })
const profile = { source: { dataset_id: 'synthetic-profile-fixture', fact_version: 0, category_mapping_scope: 'synthetic scope' }, windows: { current: ['2024-10', '2026-09'], earlier: ['2022-10', '2024-09'] },
  profile: [group('ANTIBACTERIAL', 'LARGE_ORDER', 'Plan for readiness; do not forecast'), group('VITAMINS_MINERALS', 'STEADY', 'Reorder from the 6-month average', true)],
  current_sales_by_class_pct: { LARGE_ORDER: 50, STEADY: 2.3 },
  check: { categories: 13, forecast_order_holds: true, same_class: 7, stability_pct: 53.8, usable_planning_guide: false,
    by_earlier_class: { STEADY: { categories: 1, median_wape_pct: 26 }, UNEVEN: { categories: 5, median_wape_pct: 54 }, ERRATIC: { categories: 5, median_wape_pct: 93 }, LARGE_ORDER: { categories: 2, median_wape_pct: 80 } } },
  registered: { seasonal_categories: '0 of 19', disease_links: '0 of 64' } }
const responses = () => ({ '/api/sales/diagnostic-breakdowns': breakdowns, '/api/sales/descriptive-extensions': descriptive, '/api/sales/demand-profile': profile })

async function openPage(page: Page, id: string) {
  if ((page.viewportSize()?.width ?? 0) <= 1024 && await page.locator('.nav-toggle').getAttribute('aria-expanded') !== 'true') await page.locator('.nav-toggle').click()
  await page.locator(`[data-dashboard-page="${id}"]`).click()
}
/** Page layout may tuck a supporting section into a closed "<id>Context" disclosure; open it the way a keyboard user would. */
async function reveal(page: Page, id: string) {
  const context = page.locator(`#${id}Context`)
  if (await context.count() && await context.getAttribute('open') === null) await context.locator('> summary').press('Enter')
  await expect(page.locator('#' + id)).toBeVisible()
}
const fits = (page: Page) => expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)

test('Sales Diagnostics shows the breakdowns and the yearly structure, and other pages wait their turn', async ({ page }) => {
  await mountDashboardHarness(page, responses())
  await openPage(page, 'revenue')
  for (const id of ['dxDiagnostics', 'dpStructure']) await reveal(page, id)
  await expect(page.locator('#dxMargin')).toHaveText('70.0% → 50.0% (2019–2025)')
  await expect(page.locator('#dxMix')).toHaveText('−15.0 pts')
  await expect(page.locator('#dxUnusualCount')).toHaveText('2 of 101')
  await expect(page.locator('#dxMarginNote')).toContainText('60.0% of 2019 sales against 90.0% of 2025')
  // Year pairs with fewer than nine matched months are not shown.
  await expect(page.locator('#dxBridge tbody tr')).toHaveCount(1)
  await expect(page.locator('#dxBridge tbody tr')).toContainText('+₱36.0M')
  await expect(page.locator('#dxUnusual tbody tr').first()).toContainText('Large orders')
  await expect(page.locator('#dxUnusual tbody tr').last()).toContainText('Data gap')
  await expect(page.locator('#dxDiagnosticsStatus')).toContainText('Live from Gold')
  await expect(page.locator('#dpMedian')).toHaveText('₱12,000 → ₱15,000 (2025–2026)')
  await expect(page.locator('#dpLarge')).toHaveText('49% → 60%')
  await expect(page.locator('#dpOrders tbody tr')).toHaveCount(2)
  await expect(page.locator('#dpStructureStatus')).toContainText('2026 covers 9 months')
  await expect(page.locator('#dxSurvivalStatus')).toHaveText('Open Products to load survival.')
  await expect(page.locator('#dpProfileStatus')).toHaveText('Open Products to load the profile.')
})

test('Products shows survival and the product-group profile as a description, not a rule', async ({ page }) => {
  await mountDashboardHarness(page, responses())
  await openPage(page, 'products')
  // The Products page removes the reference markup's sample tables when it opens; gateway panels must survive that.
  for (const id of ['familyAbc', 'dxSurvival', 'dpProfile']) await reveal(page, id)
  await expect(page.locator('#dxSurvY2')).toHaveText('23.4%')
  await expect(page.locator('#dxSurvSignal')).toHaveText('52.0% vs 19.0%')
  await expect(page.locator('#dxCohorts tbody tr').last()).toContainText('Not yet known')
  await expect(page.locator('#dpClassLarge')).toHaveText('50%')
  await expect(page.locator('#dpStability')).toHaveText('7 of 13')
  await expect(page.locator('#dpTests')).toHaveText('0 of 19 · 0 of 64')
  await expect(page.locator('#dpProfileNote')).toContainText('not a rule')
  await expect(page.locator('#dpProfileTable tbody tr').first()).toContainText('Antibacterials')
  await expect(page.locator('#dpProfileTable tbody tr').last()).toContainText('also keep ready for large orders')
  await expect(page.locator('#dpProfileStatus')).toContainText('Description only')
  await expect(page.locator('#dpProfile')).toContainText('Nothing here authorizes a purchase')
})

test('Forecast shows readiness as a trade-off with no recommended amount and fits a phone', async ({ page }) => {
  await mountDashboardHarness(page, responses())
  await openPage(page, 'forecast')
  await page.setViewportSize({ width: 390, height: 844 })
  await reveal(page, 'dxReadiness')
  await expect(page.locator('#dxChance')).toHaveText('67%')
  await expect(page.locator('#dxDay20')).toHaveText('28.8% vs 41.8%')
  await expect(page.locator('#dxReadiness')).toContainText('No rule is recommended')
  await expect(page.locator('#dxTradeoff tbody tr')).toHaveCount(8)
  await expect(page.locator('#dxTradeoff tbody tr').nth(3)).toContainText('Highest of last 12 months')
  await expect(page.locator('#dxDay20Table')).toBeHidden()
  await page.locator('#dxReadiness details', { hasText: 'Day-20 estimate' }).locator('> summary').press('Enter')
  await expect(page.locator('#dxDay20Table tbody tr')).toHaveCount(1)
  const region = page.getByRole('region', { name: 'Readiness options and their past coverage', exact: true })
  await region.focus()
  await expect(region).toBeFocused()
  await fits(page)
})

test('a failed source shows the unavailable state with no values, then recovers on reopening', async ({ page }) => {
  await mountDashboardHarness(page, { '/api/sales/descriptive-extensions': descriptive })
  await openPage(page, 'revenue')
  await expect(page.locator('#dxDiagnosticsStatus')).toHaveText('Breakdowns unavailable. Reopen Sales Diagnostics to retry; no substitute values were used.')
  await expect(page.locator('#dxMargin')).toHaveText('Unavailable')
  await expect(page.locator('#dxBridge tbody tr')).toHaveCount(0)
  // The yearly structure has its own source and is unaffected.
  await expect(page.locator('#dpStructureStatus')).toContainText('Live from Gold')
  await page.route('http://fixture.gateway/api/sales/diagnostic-breakdowns', route => route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'application/json', body: JSON.stringify(breakdowns) }))
  await openPage(page, 'revenue')
  await expect(page.locator('#dxMargin')).toHaveText('70.0% → 50.0% (2019–2025)')
  await openPage(page, 'products')
  await expect(page.locator('#dpProfileStatus')).toHaveText('Demand profile unavailable. Reopen the page to retry; no substitute values were used.')
  await expect(page.locator('#dpProfileTable tbody tr')).toHaveCount(0)
})

test('signed-in dashboard loads all five sections from the live gateway', async ({ page }) => {
  test.skip(!process.env.MEDSHIELD_E2E_USERNAME || !process.env.MEDSHIELD_E2E_PASSWORD, 'Needs MEDSHIELD_E2E_USERNAME and MEDSHIELD_E2E_PASSWORD and the gateway and frontend running')
  test.setTimeout(240000)
  await signInToReadyDashboard(page)
  for (const [nav, statuses, sections] of [
    ['revenue', ['#dxDiagnosticsStatus', '#dpStructureStatus'], ['#dxDiagnostics', '#dpStructure']],
    ['products', ['#dxSurvivalStatus', '#dpProfileStatus'], ['#dxSurvival', '#dpProfile']],
    ['forecast', ['#dxReadinessStatus'], ['#dxReadiness']],
  ] as const) {
    await openPage(page, nav)
    for (const section of sections) await reveal(page, section.slice(1))
    for (const status of statuses) await expect(page.locator(status)).toContainText('Live from Gold', { timeout: 120000 })
    for (const section of sections) {
      await expect(page.locator(`${section} dd`, { hasText: 'Unavailable' })).toHaveCount(0)
      expect(await page.locator(`${section} table tbody tr`).count()).toBeGreaterThan(0)
    }
  }
  // Recorded net is the reconciled itemized total for the pinned release.
  await expect(page.locator('#dxReadinessStatus')).toContainText('recorded net')
})
