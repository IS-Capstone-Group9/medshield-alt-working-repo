import { test, expect, type Page } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { tournamentUnderstanding, type TournamentResearch } from '../services/api/tournament-research'
import { abcUnderstanding } from '../services/api/abc-research-panel'
import { abcReviewView, type AbcResearch } from '../services/api/abc-research-model'
import { unitUnderstanding, type UnitResearch } from '../services/api/unit-research-panel'
import { signInToReadyDashboard } from './helpers/dashboard'

test('sales explanation keeps money, zero error and unavailable predictions distinct', () => {
  // Hand-solvable presentation fixture: a zero miss is available; an unfitted model is not.
  const data = {
    scope: { source_end: '2026-09' },
    groups: [
      { stage: 'development', lead_months: 1, model_id: 'last_value', mae: 0, n: 2, expected_cases: 2 },
      { stage: 'development', lead_months: 1, model_id: 'seasonal_naive', mae: 25, n: 2, expected_cases: 2 },
      { stage: 'development', lead_months: 1, model_id: 'unavailable', mae: null, n: 0, expected_cases: 2 },
    ],
    points: [
      { stage: 'development', lead_months: 1, model_id: 'last_value', target_period: '2024-02' },
      { stage: 'development', lead_months: 1, model_id: 'last_value', target_period: '2024-01' },
    ],
    selections: [{ lead_months: 1, model_id: 'seasonal_naive', status: 'NO_PROMOTION_RETAIN_BASELINE' }],
  } as TournamentResearch
  const zero = tournamentUnderstanding(data, 'development', 1, 'last_value')
  expect(zero.summary).toContain('average absolute miss ₱0.00 across 2/2')
  expect(zero.summary).toContain('pesos, not medicine units')
  expect(zero.detail).toContain('2024-01–2024-02')
  expect(zero.detail).toContain('Seasonal naive MAE is ₱25.00')
  expect(zero.detail).toContain('baseline retained; no challenger qualified')
  expect(zero.detail).toContain('not a percent-correct score')
  const missing = tournamentUnderstanding(data, 'development', 1, 'unavailable')
  expect(missing.summary).toContain('miss Unavailable across 0/2')
  expect(missing.summary).not.toContain('miss ₱0')
  expect(missing.detail).toContain('unavailable predictions are not zero error')
})

test('ABC explanation distinguishes class support, zero recall and an unevaluated challenger', () => {
  const group: AbcResearch['groups'][number] = { stage: 'retrospective_test_2025', model_id: 'prior_abc', cohort: 'all', samples: 4,
    coverage_of_stage: 1, class_order: ['A', 'B', 'C'], confusion_matrix: [[0, 2, 0], [0, 1, 0], [0, 0, 1]],
    macro_f1: 0.5, balanced_accuracy: 2 / 3, accuracy: 0.5, per_class: {
      A: { support: 2, predicted: 0, precision: null, recall: 0, f1: 0 },
      B: { support: 1, predicted: 3, precision: 1 / 3, recall: 1, f1: 0.5 },
      C: { support: 1, predicted: 1, precision: 1, recall: 1, f1: 1 },
    } }
  const data = { selection: { model_id: 'prior_abc', best_baseline: 'prior_abc' }, groups: [group] } as Pick<AbcResearch, 'selection' | 'groups'>
  const view = { group, status: 'evaluated', cases: [{ target_window_end: '2025-12-31' }] } as ReturnType<typeof abcReviewView>
  const evaluated = abcUnderstanding(data, 'retrospective_test_2025', 'prior_abc', 'all', view)
  expect(evaluated.summary).toContain('Carry forward prior ABC: macro-F1 0.500; A recall 0.00% across 4')
  expect(evaluated.summary).toContain('not medicine quantities or clinical priority')
  expect(evaluated.detail).toContain('2025-12-31')
  expect(evaluated.detail).toContain('do not provide calibrated confidence')
  const absent = abcUnderstanding(data, 'retrospective_test_2025', 'xgb_depth_2', 'all', { group: null, status: 'model_not_evaluated', cases: [] })
  expect(absent.summary).toContain('macro-F1 Unavailable; A recall Unavailable')
  expect(absent.summary).toContain('no result for the selected period')
  expect(absent.summary).not.toContain('0.000')
  const noA = { ...group, per_class: { ...group.per_class, A: { ...group.per_class.A, support: 0, recall: null } } }
  expect(abcUnderstanding(data, 'retrospective_test_2025', 'prior_abc', 'all', { ...view, group: noA }).summary).toContain('A recall Unavailable')
})

test('unit explanation uses the selected baseline and does not turn WAPE into accuracy', () => {
  const data = {
    scope: { product: 'Synthetic pilot', recorded_channel: 'HOSPITAL' }, evidence: { research_window_end: '2026-09' },
    metrics: [{ method: 'last_value', lead: 1, mae: 0, wape: null, n: 2 }, { method: 'mean_3', lead: 1, mae: 12.5, wape: 125, n: 2 }],
    points: [{ method: 'last_value', lead: 1, target_month: '2026-08' }, { method: 'mean_3', lead: 1, target_month: '2026-09' }],
  } as UnitResearch
  const zero = unitUnderstanding(data, 1, 'last_value')
  expect(zero.summary).toContain('miss 0.00 ampoules across 2')
  expect(zero.detail).toContain('WAPE Unavailable')
  const selected = unitUnderstanding(data, 1, 'mean_3')
  expect(selected.summary).toContain('Three-month mean')
  expect(selected.summary).toContain('miss 12.50 ampoules')
  expect(selected.detail).toContain('WAPE 125.00%')
  expect(selected.detail).toContain('not percent correct')
  expect(selected.detail).not.toContain('-25')
  expect(selected.summary).toContain('One product/channel pilot; operational forecasting is not approved')
  expect(selected.detail).toContain('No operational method is selected')
})

async function openPage(page: Page, name: string) {
  const target = page.locator(`[data-dashboard-page="${name}"]`)
  const inViewport = () => target.evaluate(element => {
    const box = element.getBoundingClientRect()
    return box.width > 0 && box.left >= 0 && box.right <= innerWidth
  })
  // Observe the rendered drawer after responsive transitions, not assumed breakpoints.
  await expect(async () => {
    if (!await inViewport()) await page.locator('.nav-toggle').click({ timeout: 2000 })
    await expect.poll(inViewport, { timeout: 1000 }).toBe(true)
  }).toPass({ timeout: 10000, intervals: [250] })
  await target.click({ timeout: 10000 })
  if (name === 'forecast' || name === 'products') {
    const research = page.locator(name === 'forecast' ? '#forecastResearchDetails' : '#productResearchDetails')
    if (!await research.evaluate((details: HTMLDetailsElement) => details.open)) {
      await research.locator('> summary').click()
    }
  }
}

async function openForecastEvidence(page: Page, selector: string) {
  const panel = page.locator(`#forecastResearchDetails > details:has(${selector})`)
  if (await panel.getAttribute('open') === null) await panel.locator('> summary').click()
}

test('live existing gateway evidence readouts retain scope, keyboard access and narrow-screen fit', async ({ page }, info) => {
  test.skip(process.env.MEDSHIELD_MODEL_EVIDENCE_LIVE !== '1', 'Explicit local live evidence run; fixtures above require no server')
  test.setTimeout(300000)
  await signInToReadyDashboard(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const abcResponse = page.waitForResponse(response => response.url().includes('/api/sales/abc-research') && response.ok())
  await openPage(page, 'products')
  const abc = await (await abcResponse).json() as AbcResearch
  await expect(page.locator('[data-abc-understandingbox]')).toBeVisible({ timeout: 90000 })
  const abcGroup = abc.groups.find(group => group.stage === 'retrospective_test_2025' && group.model_id === abc.selection.model_id && group.cohort === 'all')!
  await expect(page.locator('[data-abc-understanding]')).toContainText(`macro-F1 ${abcGroup.macro_f1!.toFixed(3)}`)
  await page.selectOption('[data-abc-model]', 'xgb_depth_2')
  await expect(page.locator('[data-abc-understanding]')).toContainText('no result for the selected period')
  await expect(page.locator('[data-abc-understanding]')).toContainText('macro-F1 Unavailable')
  await page.selectOption('[data-abc-model]', abc.selection.model_id)

  const tournamentResponse = page.waitForResponse(response => response.url().includes('/api/sales/tournament-research') && response.ok())
  const unitResponse = page.waitForResponse(response => response.url().includes('/api/sales/unit-baseline-research') && response.ok())
  await openPage(page, 'forecast')
  const [tournament, unit] = await Promise.all([tournamentResponse.then(r => r.json() as Promise<TournamentResearch>), unitResponse.then(r => r.json() as Promise<UnitResearch>)])
  await openForecastEvidence(page, '[data-tournament-understandingbox]')
  await expect(page.locator('[data-tournament-understandingbox]')).toBeVisible({ timeout: 90000 })
  const selected = tournament.selections.find(selection => selection.lead_months === 1)!.model_id
  const group = tournament.groups.find(row => row.stage === 'development' && row.lead_months === 1 && row.model_id === selected)!
  await expect(page.locator('[data-tournament-understanding]')).toContainText(`₱${group.mae!.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
  await openForecastEvidence(page, '#unitResearchUnderstandingBox')
  await expect(page.locator('#unitResearchUnderstandingBox')).toBeVisible({ timeout: 90000 })
  await page.locator('#unitResearchChartDetails > summary').click()
  await expect(page.locator('#unitResearchMethod')).toBeVisible()
  await page.selectOption('#unitResearchMethod', 'mean_3')
  const metric = unit.metrics.find(row => row.lead === 1 && row.method === 'mean_3')!
  await expect(page.locator('#unitResearchUnderstanding')).toContainText(`miss ${metric.mae.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ampoules`)

  const records: unknown[] = []
  for (const width of [1440, 824, 390, 320, 720]) {
    await page.setViewportSize({ width, height: 1000 })
    // A 720 CSS-pixel viewport represents reflow of a 1440px desktop at 200% browser zoom.
    for (const tab of ['products', 'forecast']) {
      await openPage(page, tab)
      const selectors = tab === 'products' ? ['[data-abc-understandingbox]'] : ['[data-tournament-understandingbox]', '#unitResearchUnderstandingBox']
      for (const selector of selectors) {
        if (tab === 'forecast') await openForecastEvidence(page, selector)
        const note = page.locator(selector)
        const summary = note.locator('summary')
        await summary.focus()
        await expect(summary).toBeFocused()
        if (!await note.locator('details').evaluate(element => (element as HTMLDetailsElement).open)) await summary.press('Enter')
        await expect(note.locator('details')).toHaveAttribute('open', '')
        const geometry = await note.evaluate(element => ({ client: element.clientWidth, content: element.scrollWidth,
          doc: document.documentElement.scrollWidth, viewport: innerWidth }))
        expect(geometry.content).toBeLessThanOrEqual(geometry.client + 1)
        expect(geometry.doc).toBeLessThanOrEqual(width + 1)
        await expect(note).toContainText('Model owner')
        records.push({ tab, selector, width, ...geometry, keyboard_open: true, zoom_scope: width === 720 ? '200% equivalent CSS viewport reflow; native browser zoom not asserted' : 'normal CSS viewport' })
      }
    }
  }
  await writeFile(info.outputPath('layout-keyboard.json'), JSON.stringify({ source: 'existing authenticated gateway/Gold', records,
    metric_assertions: ['current ABC macro-F1 and unevaluated challenger', 'current tournament selected group MAE', 'selected unit baseline MAE'], actual_client_comprehension_measured: false }, null, 2))
  await page.locator('#unitResearchUnderstandingBox').screenshot({ path: info.outputPath('unit-understanding.png') })
})

test('live panel failures and source changes clear all model understanding readouts', async ({ page }, info) => {
  test.skip(process.env.MEDSHIELD_MODEL_EVIDENCE_LIVE !== '1', 'Explicit local live evidence run')
  test.setTimeout(240000)
  await signInToReadyDashboard(page)
  const panels = [
    { tab: 'products', box: '[data-abc-understandingbox]', text: '[data-abc-understanding]', reload: '[data-abc-reload]', endpoint: '**/api/sales/abc-research*' },
    { tab: 'forecast', box: '[data-tournament-understandingbox]', text: '[data-tournament-understanding]', reload: '[data-tournament-reload]', endpoint: '**/api/sales/tournament-research*' },
    { tab: 'forecast', box: '#unitResearchUnderstandingBox', text: '#unitResearchUnderstanding', reload: '#unitResearchReload', endpoint: '**/api/sales/unit-baseline-research*' },
  ]
  for (const panel of panels) {
    await openPage(page, panel.tab)
    if (panel.tab === 'forecast') await openForecastEvidence(page, panel.box)
    await expect(page.locator(panel.box)).toBeVisible({ timeout: 90000 })
    await page.route(panel.endpoint, route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Browser-only source failure probe"}' }))
    await page.locator(panel.reload).click()
    await expect(page.locator(panel.box)).toBeHidden()
    await expect(page.locator(panel.text)).toBeEmpty()
    await page.unroute(panel.endpoint)
    await page.locator(panel.reload).click()
    await expect(page.locator(panel.box)).toBeVisible({ timeout: 90000 })
  }
  await page.locator('.medshield-root').evaluate(root => root.dispatchEvent(new Event('medshield:source-reloaded')))
  for (const panel of panels) {
    await expect(page.locator(panel.box)).toBeHidden()
    await expect(page.locator(panel.text)).toBeEmpty()
  }
  await writeFile(info.outputPath('failure-clearing.json'), JSON.stringify({ panels_checked: 3, browser_only_503: true,
    recovered_from_real_gateway: true, source_event_clears_all: true, warehouse_disrupted: false, actual_client_comprehension_measured: false }, null, 2))
})
