import { test, expect } from '@playwright/test'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'
import { correctOverviewEvidence } from '../services/api/dashboard-enhancements'

test.beforeEach(async ({ page }) => {
  await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto('http://medshield.test/')
  const overrides = await readFile(path.resolve('app/overrides.css'), 'utf8')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style><style>${overrides}</style><div class="medshield-root">${MEDSHIELD_MARKUP}</div>`)
  const root = await page.$('.medshield-root')
  await page.evaluate(correctOverviewEvidence, root!)
  await page.evaluate(() => { window.fetch = async () => new Response('{}', { status: 503 }) })
  await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
  await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({ monthly: [
      { period: '2025-01', revenue: 100, income: 20 },
      { period: '2025-02', revenue: 0, income: 0 },
      { period: '2025-04', revenue: 500, income: 50 },
    ], year_summary: [] })
    app.showPage('overview')
    app.setDescriptivePeriod('custom')
    app.setDescriptiveGranularity('monthly')
    app.setCustomDateRange('2025-01-01', '2025-04-30')
  })
})

for (const width of [1440, 1024, 824, 390]) {
  test(`analytics sections align without overflow at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 })
    // Let the sidebar's viewport transition settle before comparing card heights.
    await page.evaluate(async () => {
      await document.fonts.ready
      for (const animation of document.getAnimations()) {
        if (animation instanceof CSSTransition) animation.finish()
      }
    })
    await expect(page.locator('#overviewAnalyticsSections h2')).toHaveText(['Descriptive', 'Diagnostic', 'Predictive', 'Prescriptive'])
    const measureCards = () => page.locator('.overview-analytics-card').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect()
      const gridTop = node.parentElement!.getBoundingClientRect().top
      return { x: rect.x, y: rect.y - gridTop, right: rect.right, bottom: rect.bottom - gridTop, height: rect.height, padding: getComputedStyle(node).padding }
    }))
    const cards = await measureCards()
    expect(cards.every(card => card.x >= 0 && card.right <= width)).toBe(true)
    expect(cards.every(card => card.padding === '16px')).toBe(true)
    const grid = page.locator('#overviewAnalyticsSections')
    await expect(grid).toHaveCSS('align-items', 'start')
    await expect(grid).toHaveCSS('gap', '16px')
    await expect(grid.getByRole('button')).toHaveCount(4)
    await expect(grid.locator('.overview-analytics-detail:visible')).toHaveCount(0)
    if (width >= 1280) {
      expect(new Set(cards.map(card => card.y)).size).toBe(1)
      expect(cards.slice(1).map((card, index) => card.x - cards[index].right)).toEqual([16, 16, 16])
    } else if (width > 900) {
      expect(cards[0].y).toBe(cards[1].y)
      expect(cards[2].y - Math.max(cards[0].bottom, cards[1].bottom)).toBe(16)
    } else {
      expect(cards.slice(1).map((card, index) => card.y - cards[index].bottom)).toEqual([16, 16, 16])
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await page.locator('#overviewAnalyticsSections').screenshot({ path: testInfo.outputPath(`analytics-${width}.png`), style: '.topbar { visibility: hidden !important; }' })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: testInfo.outputPath(`overview-${width}.png`), fullPage: true })

    const toggle = grid.getByRole('button', { name: 'Monthly sales change', exact: true })
    await toggle.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const detail = grid.getByRole('region', { name: 'Monthly sales change', exact: true })
    await expect(detail).toBeVisible()
    await expect(detail.locator('.overview-analytics-actions')).toHaveCSS('margin-top', '0px')
    const expandedCards = await measureCards()
    const detailBounds = await detail.evaluate(node => {
      const rect = node.getBoundingClientRect()
      const grid = node.parentElement!.getBoundingClientRect()
      return { y: rect.y - grid.y, width: rect.width, gridWidth: grid.width }
    })
    expect(detailBounds.width).toBe(detailBounds.gridWidth)
    expect(detailBounds.y - Math.max(...expandedCards.filter(card => card.y === expandedCards[1].y).map(card => card.bottom))).toBe(16)
    expect(expandedCards.map(card => card.height)).toEqual(cards.map(card => card.height))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)

    await toggle.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(detail).toBeHidden()
  })
}

test('summaries preserve observed zero, gaps, selected scope and unavailable forecasts', async ({ page }) => {
  await expect(page.locator('#overviewBaselineChart')).toBeVisible()
  await expect(page.locator('#overview-descriptive-chart')).toBeHidden()
  await expect(page.locator('#overview-diagnostic-chart')).toBeHidden()
  const sales = page.getByRole('button', { name: 'Monthly net sales', exact: true })
  const changes = page.getByRole('button', { name: 'Monthly sales change', exact: true })
  await sales.press('Enter')
  await expect(page.locator('#overview-descriptive-chart')).toBeVisible()
  await changes.press('Enter')
  await expect(sales).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('#overview-descriptive-chart')).toBeHidden()
  await expect(page.locator('#overview-diagnostic-chart')).toBeVisible()
  await expect(page.locator('#overview-diagnostic-limit')).toBeVisible()
  await page.getByRole('button', { name: 'Sales-record coverage', exact: true }).press('Enter')
  await expect(changes).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('#overview-prescriptive-chart')).toBeVisible()
  const values = await page.evaluate(() => ['descriptive', 'diagnostic'].map(key => {
    const chart = (window as any).Chart.getChart(document.getElementById('overview-' + key + '-chart'))
    return chart.data.datasets.map((dataset: any) => dataset.data)
  }))
  expect(values).toEqual([[[100, 0, null, 500]], [[-100]]])
  await expect(page.locator('#overview-coverage-count')).toHaveText('3 of 4 months observed')
  await expect(page.locator('#overview-prescriptive-chart')).toHaveAttribute('max', '4')
  await expect(page.locator('#overview-prescriptive-chart')).toHaveAttribute('value', '3')
  await expect(page.locator('#overview-descriptive-output')).toHaveText('₱600 recorded net sales · 3/4 months observed.')
  await expect(page.locator('#overview-diagnostic-output')).toContainText('2025-01 → 2025-02 · -₱100')
  await expect(page.locator('#overview-diagnostic-output')).not.toContainText('₱500')
  await expect(page.locator('#overview-diagnostic-limit')).toContainText('not its business cause')
  await expect(page.locator('#overview-prescriptive-output')).toContainText('1 month without sales records')
  await expect(page.locator('#overview-predictive-output')).toContainText('Forecast evidence not loaded')
  await expect(page.locator('#overview-predictive-limit')).toContainText('Overview filters do not change it')
  await page.evaluate(() => (window as any).setCustomDateRange('2025-03-01', '2025-03-31'))
  await expect(page.locator('#overview-descriptive-output')).toContainText('unavailable')
  await expect(page.locator('#overview-prescriptive-output')).toContainText('Restore source evidence')
  await expect(page.locator('#overview-diagnostic-output')).toContainText('No adjacent')
  await sales.press('Enter')
  await expect(page.locator('#overview-descriptive-chart')).toBeHidden()
  await expect(page.locator('#overview-descriptive-empty')).toHaveText('Source evidence unavailable for this chart.')
  await expect(page.locator('#overview-descriptive-empty')).toBeVisible()
  await changes.press('Enter')
  await expect(page.locator('#overview-diagnostic-chart')).toBeHidden()
  await expect(page.locator('#overview-diagnostic-empty')).toBeVisible()
})

test('forecast approval requires identity and failed evidence clears the overview summary', async ({ page }) => {
  await page.evaluate(() => {
    const app = window as any
    app.showPage('forecast')
    app.setForecastValidationData({ status: 'published', publication_status: 'approved',
      actuals: [], origin: '2025-04', source: { as_of: '2025-05-01' },
      scope: { sector: 'Private', product: '', metric: 'revenue', unit: 'PHP' },
      products: [], models: {}, views: {} })
    app.showPage('overview')
  })
  await expect(page.locator('#overview-predictive-limit')).toContainText('Private')
  await expect(page.locator('#overview-predictive-limit')).toContainText('approval not established')
  await expect(page.locator('#overview-predictive-limit')).not.toContainText('Approved published forecast')
  await page.evaluate(() => {
    const app = window as any
    app.setForecastValidationData(null, 'Source unavailable')
    app.showPage('overview')
  })
  await expect(page.locator('#overview-predictive-output')).toContainText('Source unavailable')
  await expect(page.locator('#overview-predictive-limit')).not.toContainText('Private')
})

test('forecast summary loads in place, labels estimates and clears them on source failure', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Forecast evidence chart', exact: true }).click()
  await page.evaluate(() => window.addEventListener('medshield:forecast-change', () => {
    (window as any).setForecastValidationData(null, 'Loading (can take up to a minute)')
  }, { once: true }))
  await page.getByRole('button', { name: 'Refresh forecast chart', exact: true }).click()
  await expect(page.locator('#overview-predictive-output')).toHaveAttribute('aria-busy', 'true')
  await expect(page.locator('#overview-predictive-empty')).toHaveText('Loading (can take up to a minute)')
  await expect(page.locator('#overviewForecastChart')).toBeHidden()
  await page.evaluate(() => {
    const app = window as any
    app.setForecastValidationData({ status: 'retrospective_benchmark_evidence', publication_status: 'unpublished',
      actuals: Array.from({length: 24}, (_, index) => {
        const date = new Date(Date.UTC(2023, 4 + index, 1))
        return {period: date.toISOString().slice(0, 7), actual: 100}
      }), origin: '2025-04', source: { as_of: '2025-05-01' },
      scope: { sector: 'Private', product: '', metric: 'revenue', unit: 'PHP' }, products: [],
      models: { last_value: 'Last value' }, views: { '3': { models: { last_value: {
        candidate_estimates: [{ period: '2025-05', prediction: 100, actual: null, origin: '2025-04', lead: 1,
          evidence_role: 'unpublished_baseline_estimate', publication_approved: false, activation_allowed: false }],
        backtest: [], metrics: { wape: 20, n: 3 },
      } } } } })
  })
  await expect(page.locator('#page-overview')).toBeVisible()
  await expect(page.locator('#overviewForecastChart')).toBeVisible()
  const chart = await page.evaluate(() => {
    const small = (window as any).Chart.getChart('overviewForecastChart')
    const full = (window as any).Chart.getChart('forecastChart')
    return {smallMonths: small.data.labels.length, fullMonths: full.data.labels.length,
      legend: small.legend.legendItems.map((item: any) => item.text),
      markers: small.data.datasets.map((series: any) => series.pointRadius),
      tickLimit: small.options.scales.x.ticks.maxTicksLimit}
  })
  expect(chart.smallMonths).toBe(18)
  expect(chart.fullMonths).toBe(25)
  expect(new Set(chart.legend).size).toBe(chart.legend.length)
  expect(chart.legend).toEqual(['Observed actuals (PHP)', 'Last value unpublished baseline estimate'])
  expect(chart.markers).toEqual([2, 5])
  expect(chart.tickLimit).toBe(5)
  const bounds = await page.locator('#overviewForecastChart').boundingBox()
  expect(bounds!.width).toBeGreaterThan(100)
  expect(bounds!.height).toBeGreaterThan(200)
  await page.locator('#overviewAnalyticsSections').screenshot({ path: testInfo.outputPath('loaded-forecast.png'), style: '.topbar { visibility: hidden !important; }' })
  await expect(page.locator('#overview-predictive-output')).toContainText('Past forecasts missed by 20% of the observed total (3 scored observations checked)')
  await expect(page.locator('#overview-predictive-limit')).toContainText('First available unpublished baseline estimate: 2025-05 · 100 PHP')
  await expect(page.locator('#overview-predictive-limit')).toContainText('Private')
  await page.evaluate(() => (window as any).setForecastValidationData(null, 'Source failed'))
  await expect(page.locator('#overviewForecastChart')).toBeHidden()
  await expect(page.locator('#overview-predictive-output')).not.toContainText('100 PHP')
  await expect(page.locator('#overview-predictive-output')).toContainText('unavailable')
  await expect(page.locator('#overview-predictive-empty')).toContainText('unavailable')
  await expect(page.locator('#overview-predictive-empty')).toBeVisible()
})

test('diagnostic change excludes the open Philippine month', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-02T00:00:00+08:00') })
  await page.evaluate(() => {
    const app = window as any
    app.applyDatasetPatch({ monthly: [
      { period: '2026-09', revenue: 10, income: 1 },
      { period: '2026-10', revenue: 20, income: 2 },
      { period: '2026-11', revenue: 1000, income: 100 },
    ], year_summary: [] })
    app.setDescriptivePeriod('all')
  })
  await expect(page.locator('#overview-diagnostic-output')).toContainText('2026-09 → 2026-10 · +₱10')
  await expect(page.locator('#overview-diagnostic-output')).not.toContainText('2026-11')
})

test('actions retain diagnostic scope, navigate by keyboard and do not duplicate sections', async ({ page }) => {
  await page.evaluate(() => window.addEventListener('medshield:diagnostic-open', event => {
    (window as any).capturedDiagnostic = (event as CustomEvent).detail
  }))
  await page.getByRole('button', { name: 'Monthly sales change', exact: true }).press('Enter')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Investigate recorded change', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  expect(await page.evaluate(() => (window as any).capturedDiagnostic)).toMatchObject({ start_date: '2025-01-01', end_date: '2025-04-30' })
  await page.getByRole('button', { name: 'Forecast evidence chart', exact: true }).click()
  const forecast = page.getByRole('button', { name: 'Review forecasts', exact: true })
  await forecast.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#page-forecast')).toBeVisible()
  await page.evaluate(() => (window as any).showPage('overview'))
  await page.getByRole('button', { name: 'Sales-record coverage', exact: true }).click()
  await page.getByRole('button', { name: 'Review planning assumptions', exact: true }).click()
  await expect(page.locator('#page-inventory')).toBeVisible()
  await page.evaluate(() => (window as any).showPage('overview'))
  await expect(page.locator('#overviewAnalyticsSections')).toHaveCount(1)
  await page.getByRole('button', { name: 'Monthly net sales', exact: true }).click()
  await page.getByRole('button', { name: 'Explore current metrics and trends', exact: true }).click()
  await expect(page.locator('#overviewTrendMeasureSelect')).toBeFocused()
})
