import { test, expect, type Page } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { signInToReadyDashboard } from './helpers/dashboard'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })
const output = '../outputs/t09_modules_20261017/'
const sha = (value: string) => createHash('sha256').update(value).digest('hex')
function parseCsv(csv: string) {
  const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/)
  const parse = (line: string) => [...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(match => match[1].replace(/""/g, '"'))
  const headers = parse(lines.shift()!)
  return { headers, rows: lines.map(line => Object.fromEntries(headers.map((header, index) => [header, parse(line)[index]]))) }
}
async function captureAuth(page: Page) {
  let authorization = ''
  page.on('request', request => {
    if (request.url().startsWith('http://localhost:5000/api/') && request.headers().authorization) authorization = request.headers().authorization
  })
  await signInToReadyDashboard(page)
  expect(authorization).toMatch(/^Bearer /)
  return async (route: string, init?: { method?: string; data?: unknown }) => {
    const response = await page.request.fetch('http://localhost:5000' + route, { headers: { Authorization: authorization }, ...init })
    return { status: response.status(), body: await response.json() }
  }
}

test('T09 live area ranking filters reconcile to pinned Gold; registry export scope is audited', async ({ page }, testInfo) => {
  test.setTimeout(240000)
  const api = await captureAuth(page)
  const reference = await api('/api/sales/sectors')
  expect(reference.status).toBe(200)
  const source = reference.body.source
  expect(source.release.fact_delta_version).toBe(20)
  await page.locator('[data-dashboard-page="territory"]').click()
  await expect(page.locator('#sectorStatus')).not.toContainText('Loading', { timeout: 90000 })
  await page.selectOption('#descriptivePeriodSelect', 'all')
  await page.selectOption('#sectorEvidence', 'actual')
  const rows: any[] = reference.body.rows
  const regionalNames = ['CALABARZON', 'MIMAROPA', 'Bicol', 'Other National']
  const observations: any[] = []
  for (const filter of [{ region: 'All', buyer: 'All' }, { region: 'CALABARZON', buyer: 'All' }, { region: 'All', buyer: 'Government' }, { region: 'All', buyer: 'Unknown' }]) {
    await page.selectOption('#sectorRegion', filter.region)
    await page.selectOption('#sectorCluster', filter.buyer)
    const selected = rows.filter(row => row.evidence !== 'estimate' && (filter.region === 'All' || row.region === filter.region) && (filter.buyer === 'All' || row.sector === filter.buyer))
    const mapped = selected.filter(row => row.territory && !['unassigned geography', 'unknown', 'unmapped'].includes(String(row.territory).trim().toLowerCase()) && regionalNames.includes(row.region))
    const regionTotals = new Map<string, number>(), buyerTotals = new Map<string, number>()
    mapped.forEach(row => regionTotals.set(row.region, (regionTotals.get(row.region) || 0) + Number(row.revenue)))
    selected.forEach(row => buyerTotals.set(row.sector, (buyerTotals.get(row.sector) || 0) + Number(row.revenue)))
    const chart = await page.evaluate(() => {
      const w = window as any
      const values = (id: string) => {
        const c = w.Chart.getChart(document.getElementById(id))
        return c ? c.data.labels.map((name: string, index: number) => ({ name, value: c.data.datasets.reduce((sum: number, d: any) => sum + Number(d.data[index]), 0) })) : []
      }
      return { region: values('sectorRevenueChart'), buyer: values('sectorBuyerChart') }
    })
    for (const item of chart.region) expect(item.value, `${filter.region}/${filter.buyer}/${item.name}`).toBeCloseTo(regionTotals.get(item.name) || 0, 2)
    for (const item of chart.buyer) expect(item.value, `buyer ${item.name}`).toBeCloseTo(buyerTotals.get(item.name) || 0, 2)
    expect(chart.region.length).toBe(regionTotals.size)
    expect(chart.buyer.length).toBe(buyerTotals.size)
    const actual = await page.locator('#sectorProfileTable tbody tr').evaluateAll(entries => entries.filter(row => row.querySelector('td:nth-child(2) strong')).map(row => ({ area: row.querySelector('td:nth-child(2) strong')!.textContent, revenue: row.querySelector('td:nth-child(3)')!.textContent, score: row.querySelector('td:nth-child(4)')!.textContent })))
    const areas = new Map<string, { revenue: number; years: Set<string> }>()
    mapped.forEach(row => { const current = areas.get(row.territory) || { revenue: 0, years: new Set<string>() }; current.revenue += Number(row.revenue); current.years.add(String(row.period).slice(0, 4)); areas.set(row.territory, current) })
    const maximum = Math.max(0, ...[...areas.values()].map(row => row.revenue))
    // All-time axis is nine distinct retained source years 2017–2025.
    for (const item of actual) {
      const expected = areas.get(item.area!)!
      expect(expected).toBeTruthy()
      expect(Number(item.revenue!.replace(/[^\d.-]/g, ''))).toBeCloseTo(Math.round(expected.revenue), 0)
      const score = (maximum ? Math.max(0, expected.revenue) / maximum * 60 : 0) + Math.min(1, expected.years.size / 9) * 40
      expect(Number(item.score)).toBeCloseTo(score, 1)
    }
    expect(actual.length).toBe(areas.size)
    let exportRows = 0
    if (areas.size) {
      const waiting = page.waitForEvent('download')
      await page.locator('#areaRankingExport').click()
      const rankingCsv = await readFile((await (await waiting).path())!, 'utf8')
      const exported = parseCsv(rankingCsv)
      exportRows = exported.rows.length
      expect(exportRows).toBe(areas.size)
      for (const row of exported.rows) {
        const reference = areas.get(row.area)!
        expect(reference).toBeTruthy()
        expect(Number(row.net_sales_php)).toBeCloseTo(reference.revenue, 2)
        expect(Number(row.active_periods)).toBe(reference.years.size)
        expect(Number(row.historical_sales_score)).toBeCloseTo((maximum ? Math.max(0, reference.revenue) / maximum * 60 : 0) + Math.min(1, reference.years.size / 9) * 40, 10)
        expect(row).toMatchObject({ buyer_filter: filter.buyer, region_filter: filter.region, evidence_filter: 'actual', selected_periods: '9', sales_weight_pct: '60', coverage_weight_pct: '40', fact_delta_version: '20', dataset_id: source.release.dataset_id, policy_version: source.release.policy_version, publication_status: source.release.publication_status, source_checksum: source.checksum })
        expect(row.mapping_status).toContain('Proposed')
        expect(row.ranking_scope).toContain('unmapped sales excluded')
      }
    } else await expect(page.locator('#areaRankingExport')).toBeDisabled()
    observations.push({ filter, rows: selected.length, mapped_rows: mapped.length, ranked_areas: actual.length, exported_gold_ranked_areas: exportRows, chart_regions: chart.region.length, mapped_net_sales: [...regionTotals.values()].reduce((a, b) => a + b, 0) })
  }
  await expect(page.locator('#areaScoreExplanation')).toContainText('Historical sales score')
  await expect(page.locator('#areaRankingMethod')).toContainText('not an inventory allocation instruction')
  await expect(page.locator('[data-sector-analysis]')).toContainText('Candidate · review required')
  await page.locator('#areaMappingDetails > summary').click()
  const registryIntro = await page.locator('#clientReferenceSection').innerText()
  await page.locator('#clientRefSearch').fill('T09_NO_SUCH_ACCOUNT_83bf21')
  await expect(page.locator('#clientRefShowingCount')).toHaveText('No accounts matching filter')
  const downloadPromise = page.waitForEvent('download')
  await page.locator('#clientReferenceSection button[onclick="exportClientReferenceCSV()"]').click()
  const download = await downloadPromise
  const csv = await readFile((await download.path())!, 'utf8')
  const registryRecords = csv.trim().split(/\r?\n/).length - 1
  const finding = { visible_rows: 0, downloaded_rows: registryRecords, download_sha256: sha(csv), contains_fact_or_dataset_provenance: /fact_delta_version|dataset_id/.test(csv), registry_claims_verified_model_anchors: /verified client accounts/.test(registryIntro) && /ML model anchors/.test(registryIntro) }
  await writeFile(output + 'area-planning-area-final-live.json', JSON.stringify({ checked_at_utc: new Date().toISOString(), source: { file: source.file, checksum: source.checksum, release: source.release }, source_response_sha256: sha(JSON.stringify(reference.body)), observations, registry: finding, limitations: ['Ranking is historical commercial candidate evidence, not disease or clinical allocation.', 'Reference CSV is a separate bundled draft directory; Gold ranking CSV retains the same current API source identity and filters.'] }, null, 2))
  expect.soft(registryRecords, 'Zero-match registry filter must not export all unrelated accounts').toBe(0)
  expect.soft(finding.registry_claims_verified_model_anchors, 'Candidate mappings must not be described as verified ML anchors').toBe(false)
  await page.locator('[data-sector-analysis]').screenshot({ path: testInfo.outputPath('area-module.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('T09 live planning scenario, CSV, infeasible constraints and source guards', async ({ page }, testInfo) => {
  test.setTimeout(240000)
  const api = await captureAuth(page)
  await page.locator('[data-dashboard-page="inventory"]').click()
  await expect(page.locator('#planSourceStatus')).toContainText('Source-ranked shortlist', { timeout: 90000 })
  const scope = { sector: await page.locator('#planSector').inputValue(), territory: await page.locator('#planTerritory').inputValue() }
  const shortlist = await api('/api/sales/planning-shortlist?' + new URLSearchParams(scope))
  expect(shortlist.status).toBe(200)
  const data = shortlist.body
  expect(data.source.release.fact_delta_version).toBe(20)
  expect(data.products.length).toBeGreaterThan(0)
  expect(data.products.length).toBeLessThanOrEqual(5)
  await expect(page.locator('#planInputs tbody tr')).toHaveCount(data.products.length)
  const labels = await page.locator('#planInputs tbody td:first-child strong').allTextContents()
  expect(labels).toEqual(data.products.map((row: any) => row.product))
  await expect(page.locator('#planScope')).toContainText(data.period_start)
  await expect(page.locator('#planScope')).toContainText('Scenario inputs are separate')
  await expect(page.locator('#planSourceDetails')).toContainText(data.source.checksum)
  await expect(page.locator('#planPresetNote')).toContainText('not audited demand, stock or supplier quotes')
  await expect(page.locator('[data-planning]')).toContainText('disease effects, clinical priority and expiry reduction are not computed')
  await expect(page.locator('#kpiPlanExpiryRate')).toHaveText('Unavailable')
  const n = data.products.length
  for (let index = 0; index < n; index++) for (const [key, value] of Object.entries({ demand: 20, stock: 0, reserve: 0, pack: 2, pack_cost: 10, max_packs: 10 })) await page.locator(`[data-plan-index="${index}"][data-plan-field="${key}"]`).fill(String(value))
  await page.locator('#planBudget').fill(String(n * 100))
  await page.locator('#planMinimum').fill('100')
  // API refuses to use entered quantities without the explicit scenario acknowledgement.
  const body = await page.evaluate(() => (window as any).getPlanningRequest())
  const unacknowledged = await api('/api/sales/planning-solve', { method: 'POST', data: body })
  expect(unacknowledged.status).toBe(400)
  await page.locator('#planAcknowledged').check()
  const solving = page.waitForResponse(response => response.url().includes('/api/sales/planning-solve') && response.request().method() === 'POST')
  await page.locator('#planSolve').click()
  const solvedResponse = await solving
  expect(solvedResponse.status()).toBe(200)
  const result = await solvedResponse.json()
  expect(result.status).toBe('scenario_allocation')
  expect(result.spent).toBe(n * 100)
  expect(result.remaining).toBe(0)
  expect(result.mean_fulfillment_pct).toBe(100)
  expect(result.assumptions.checksum).toBe(data.source.checksum)
  for (const row of result.rows) expect(row).toMatchObject({ demand: 20, stock: 0, reserve: 0, pack: 2, pack_cost_cents: 1000, max_packs: 10, purchase_packs: 10, purchase_units: 20, fulfilled: 20, unmet: 0, ending_stock: 0, spend: 100 })
  await expect(page.locator('#planResultStatus')).toContainText('Scenario allocation calculated')
  await expect(page.locator('#planAssumptions')).toContainText('Scenario only')
  await expect(page.locator('#planResults tbody tr')).toHaveCount(n)
  const csvPromise = page.waitForEvent('download')
  await page.locator('#planExport').click()
  const csv = await readFile((await (await csvPromise).path())!, 'utf8')
  const exported = parseCsv(csv)
  expect(exported.rows.length).toBe(n)
  for (const row of exported.rows) {
    expect(row).toMatchObject({ status: 'Scenario allocation for review', demand: '20', stock: '0', reserve: '0', units_per_pack: '2', cost_per_pack_pesos: '10', supplier_max_packs: '10', buy_packs: '10', buy_units: '20', fulfilled: '20', unmet: '0', ending_stock: '0', spend_pesos: '100', sector: scope.sector, territory: scope.territory, checksum: data.source.checksum })
    expect(result.rows.some((item: any) => item.product === row.product)).toBe(true)
  }
  await page.locator('#page-inventory').screenshot({ path: testInfo.outputPath('planning-scenario.png') })
  await page.locator('#planBudget').fill('0')
  await expect(page.locator('#planExport')).toBeDisabled()
  await expect(page.locator('#planResults')).toBeEmpty()
  const infeasibleResponse = page.waitForResponse(response => response.url().includes('/api/sales/planning-solve') && response.request().method() === 'POST')
  await page.locator('#planSolve').click()
  const infeasible = await (await infeasibleResponse).json()
  expect(infeasible.status).toBe('infeasible')
  expect(infeasible.rows).toEqual([])
  expect(infeasible.conflicts.some((message: string) => message.includes('budget cannot meet minimum'))).toBe(true)
  await expect(page.locator('#planResultStatus')).toContainText('No scenario allocation calculated')
  await expect(page.locator('#planExport')).toBeDisabled()
  const stale = await api('/api/sales/planning-solve', { method: 'POST', data: { ...body, acknowledged: true, checksum: 'not-current-source' } })
  expect(stale.status).toBe(400)
  expect(stale.body.error).toContain('source changed')
  // A real unsupported territory must stay empty; no substituted product set.
  const unsupported = await api('/api/sales/planning-shortlist?sector=All&territory=T09_NOT_A_TERRITORY')
  expect(unsupported.status).toBe(200)
  expect(unsupported.body.products).toEqual([])
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await writeFile(output + 'area-planning-scenario-final-live.json', JSON.stringify({ checked_at_utc: new Date().toISOString(), source: { file: data.source.file, checksum: data.source.checksum, release: data.source.release }, scope, period_start: data.period_start, period_end: data.period_end, months_stale: data.months_stale, shortlist_products: n, shortlist_response_sha256: sha(JSON.stringify(data)), scenario: { status: result.status, rows: n, spent: result.spent, fulfillment_pct: result.mean_fulfillment_pct, independent_hand_math: 'Each item: 20 assumed units / 2 units per pack = 10 packs × ₱10 = ₱100; total equals product count × ₱100.', csv_rows: exported.rows.length, csv_sha256: sha(csv), source_checksum_matches: true }, guards: { unacknowledged_status: unacknowledged.status, stale_checksum_status: stale.status, infeasible_status: infeasible.status, no_allocation_rows: true, export_cleared_after_input_change: true, unsupported_territory_products: 0, operational_action: false }, limitations: ['Scenario inputs are synthetic QA assumptions entered through visible controls, not verified demand/inventory/supplier data.', 'Read-only Gold shortlist plus pure gateway solve; no procurement or analytical-source write.'] }, null, 2))
})
