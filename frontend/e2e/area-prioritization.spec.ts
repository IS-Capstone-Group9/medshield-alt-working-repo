import { test, expect } from '@playwright/test'
import path from 'node:path'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

test.describe('Area Prioritization Dynamic Interactions & Visualizations', () => {
  test('area prioritization ranks geography and updates periods, buyer types, and evidence', async ({ page }) => {
    await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
    await page.goto('http://medshield.test/')
    await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
    await page.evaluate(() => { window.fetch = async () => new Response('{}', { status: 503 }) })
    await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
    await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())

    await page.evaluate(() => {
      const app = window as any
      app.showPage('territory')
      const row = (sector: string, channel: string, territory: string, revenue: number, quantity: number, period = '2025-02', product = 'PARACETAMOL 500MG', evidence = 'actual') => ({
        date: period + '-15',
        sector,
        channel,
        territory,
        region: territory === 'Camarines Sur' ? 'Bicol' : territory === 'Unassigned geography' ? null : 'CALABARZON',
        revenue,
        quantity,
        period,
        product,
        row_count: 1,
        basis: 'Institutional purchase order reference',
        evidence,
      })

      app.setDescriptivePeriod('custom')
      app.setCustomDateRange('2025-01-01', '2025-12-31')
      app.setSalesSectorsData({
        rows: [
          row('Government', 'LGU Hospital', 'Quezon', 500000, 5000, '2025-02', 'PARACETAMOL 500MG'),
          row('Government', 'RHU Clinic', 'Batangas', 300000, 3000, '2025-02', 'PARACETAMOL 500MG'),
          row('Government', 'Provincial Hospital', 'Camarines Sur', 200000, 2000, '2025-02', 'PARACETAMOL 500MG'),
          row('Government', 'LGU Hospital', 'Batangas', 100000, 1000, '2025-03', 'PARACETAMOL 500MG', 'estimate'),
          row('Private', 'Private Hospital', 'Cavite', 400000, 4000, '2025-02', 'PARACETAMOL 500MG'),
          row('Private', 'Retail Pharmacy', 'Laguna', 250000, 2500, '2025-02', 'PARACETAMOL 500MG'),
          row('Private', 'Clinic', 'Quezon', 150000, 1500, '2025-02', 'DOXYCYCLINE 100MG'),
          row('Government', 'LGU Hospital', 'Quezon', 600000, 6000, '2024-06', 'PARACETAMOL 500MG'),
          row('Unknown', 'Unassigned', 'Unassigned geography', 100000, 1000, '2025-02', 'PARACETAMOL 500MG')
        ],
        source: {
          file: 'datasources/templates/buyer_sector_mapping.csv',
          checksum: 'sha256-test-hash',
          excluded: {}
        }
      })
    })

    // Verify filterbar displays period selector on Area Prioritization page
    await expect(page.locator('#filterBar')).toBeVisible()

    // 1. Buyer type filters the geographic ranking without becoming an area.
    await page.selectOption('#sectorCluster', 'Government')
    await expect(page.locator('#sectorProfileTable')).toContainText('Quezon')
    await expect(page.locator('#sectorProfileTable')).toContainText('Batangas')
    await expect(page.locator('#sectorProfileTable')).toContainText('Camarines Sur')
    await expect(page.locator('#sectorProfileTable thead')).toContainText('Geographic area')
    await expect(page.locator('#sectorProfileTable thead th')).toHaveCount(5)
    await expect(page.locator('#sectorProfileTable tbody .area-row-evidence').first()).toContainText('Buyer type mix')
    await expect(page.locator('#sectorProfileTable thead')).toContainText('Historical sales score')
    await expect(page.locator('#areaScoreExplanation')).toHaveText('Historical sales score (0–100): 60% sales size + 40% periods with records.')
    await expect(page.locator('#areaCoveragePanel .area-kpi')).toHaveCount(3)
    await expect(page.locator('#areaMappingDetails')).not.toHaveAttribute('open', '')
    await expect(page.locator('#clientReferenceTable')).not.toBeVisible()
    await expect(page.locator('#areaRankedCount')).toHaveText('2')

    // The primary ranking is horizontal and visibly separates actual and estimated evidence.
    const chartOptions = await page.evaluate(() => {
      const chart = (window as any).Chart.getChart(document.getElementById('sectorRevenueChart'))
      return {
        indexAxis: chart.options.indexAxis,
        xStacked: chart.options.scales.x.stacked,
        yStacked: chart.options.scales.y.stacked,
      }
    })
    expect(chartOptions.indexAxis).toBe('y')
    expect(chartOptions.xStacked).toBe(true)
    expect(chartOptions.yStacked).toBe(true)
    const regionalLabels = await page.evaluate(() => {
      const ranking = (window as any).Chart.getChart(document.getElementById('sectorRevenueChart'))
      const pareto = (window as any).Chart.getChart(document.getElementById('sectorParetoChart'))
      return { ranking: ranking.data.labels, pareto: pareto.data.labels }
    })
    expect(regionalLabels.ranking).toEqual(['CALABARZON', 'Bicol'])
    expect(regionalLabels.pareto).toEqual(['CALABARZON', 'Bicol'])
    expect(regionalLabels.ranking).not.toContain('Quezon')
    expect(regionalLabels.ranking).not.toContain('National Hub (DOH Central)')
    const evidenceLayers = await page.evaluate(() => {
      const chart = (window as any).Chart.getChart(document.getElementById('sectorRevenueChart'))
      return {
        labels: chart.data.datasets.map((dataset: any) => dataset.label),
      }
    })
    expect(evidenceLayers.labels).toEqual(['Actual net sales', 'Gap estimate'])
    await expect(page.locator('#areaRegionalValues')).toContainText('net sales ₱900,000, 81.8%')
    await expect(page.locator('#areaRankChartTakeaway')).toHaveText('CALABARZON has the highest net sales: ₱900,000 (81.8% of this chart total).')
    await expect(page.locator('#areaRankChartNote')).toContainText('Chart total: ₱1,100,000 in sales linked to an area (actual + gap estimates).')
    await expect(page.locator('#areaBuyerTakeaway')).toHaveText('Government has the highest net sales: ₱1,100,000 (100.0% of this chart total).')
    await expect(page.locator('#areaBuyerNote')).toContainText('Chart total: ₱1,100,000 in all selected net sales')
    await expect(page.locator('#areaActualRevenue')).toContainText('₱1M')
    await expect(page.locator('#areaEstimatedRevenue')).toContainText('₱100K')

    // 2. Pareto analysis includes revenue, cumulative share, and an 80% reference.
    const paretoLayers = await page.evaluate(() => {
      const chart = (window as any).Chart.getChart(document.getElementById('sectorParetoChart'))
      return chart.data.datasets.map((dataset: any) => dataset.label)
    })
    expect(paretoLayers).toEqual(['Regional-group net sales', 'Cumulative share', '80% reference'])

    // 3. Actual-only mode removes estimates and updates confidence labels.
    await page.selectOption('#sectorEvidence', 'actual')
    await expect(page.locator('#areaEstimatedRevenue')).toContainText('₱0')
    await expect(page.locator('#sectorProfileTable')).toContainText('Observed')

    // 4. Private remains a buyer filter; the ranked values remain geographic areas.
    await page.selectOption('#sectorCluster', 'Private')
    await expect(page.locator('#sectorProfileTable')).toContainText('Cavite')
    await expect(page.locator('#sectorProfileTable')).toContainText('Laguna')

    // 5. Every supported period updates the shared scope and all-time uses yearly grain.
    await page.selectOption('#descriptivePeriodSelect', '3')
    await expect(page.locator('#sectorScope')).toContainText('Last 3 Months')

    await page.selectOption('#descriptivePeriodSelect', '6')
    await expect(page.locator('#sectorScope')).toContainText('Last 6 Months')

    await page.selectOption('#descriptivePeriodSelect', 'all')
    await expect(page.locator('#sectorScope')).toContainText('All Time')
    await expect(page.locator('#sectorScope')).toContainText('Yearly')

    await page.selectOption('#descriptivePeriodSelect', '3')
    await expect(page.locator('#sectorScope')).toContainText('Last 3 Months')

    await page.selectOption('#descriptivePeriodSelect', 'custom')
    await page.evaluate(() => (window as any).setCustomDateRange('2024-01-01', '2024-12-31'))
    await expect(page.locator('#sectorScope')).toContainText('2024')

    // 6. Verify classification and source lineage.
    await page.locator('#areaRankingMethod > summary').click()
    await expect(page.locator('#sectorSource')).toContainText('datasources/templates/buyer_sector_mapping.csv')
  })

  test('regional filtering, area granularity, and multi-level aggregations', async ({ page }) => {
    await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
    await page.goto('http://medshield.test/')
    await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
    await page.evaluate(() => { window.fetch = async () => new Response('{}', { status: 503 }) })
    await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
    await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())

    await page.evaluate(() => {
      const app = window as any
      app.showPage('territory')
      const row = (sector: string, channel: string, territory: string, revenue: number, quantity: number, period = '2025-02', product = 'PARACETAMOL 500MG', evidence = 'actual', region?: string) => ({
        date: period + '-15',
        sector,
        channel,
        territory,
        region: region || (territory === 'Quezon' || territory === 'Batangas' || territory === 'Cavite' ? 'CALABARZON' : territory === 'Marinduque' || territory === 'Oriental Mindoro' ? 'MIMAROPA' : territory === 'Camarines Sur' ? 'Bicol' : 'Other National'),
        revenue,
        quantity,
        period,
        product,
        row_count: 1,
        basis: 'Institutional purchase order reference',
        evidence,
      })

      app.setDescriptivePeriod('all')
      app.setSalesSectorsData({
        rows: [
          row('Government', 'LGU Hospital', 'Quezon', 1000000, 10000, '2025-02', 'PARACETAMOL 500MG'),
          row('Private', 'Retail Pharmacy', 'Batangas', 500000, 5000, '2025-02', 'PARACETAMOL 500MG'),
          row('Private', 'Retail Pharmacy', 'Cavite', 300000, 3000, '2025-02', 'PARACETAMOL 500MG'),
          row('Private', 'Retail Pharmacy', 'Marinduque', 200000, 2000, '2025-02', 'PARACETAMOL 500MG'),
          row('Private', 'Retail Pharmacy', 'Oriental Mindoro', 50000, 500, '2025-02', 'PARACETAMOL 500MG'),
          row('Government', 'Provincial Hospital', 'Camarines Sur', 400000, 4000, '2025-02', 'PARACETAMOL 500MG'),
          row('Government', 'Government Bidding', 'National Hub (DOH Central)', 2000000, 20000, '2025-02', 'PARACETAMOL 500MG', 'actual', 'Other National'),
        ],
        source: {
          file: 'datasources/templates/buyer_sector_mapping.csv',
          checksum: 'sha256-test-hash',
          excluded: {}
        }
      })
    })

    // 1. Verify the primary rollup contains the capstone regions plus consolidated Other National
    const rollupGrid = page.locator('#areaRegionRollupGrid')
    await expect(rollupGrid).toBeVisible()
    await expect(rollupGrid).toContainText('CALABARZON')
    await expect(rollupGrid).toContainText('MIMAROPA')
    await expect(rollupGrid).toContainText('Bicol')
    await expect(rollupGrid).toContainText('Other National')
    await expect(rollupGrid).not.toContainText('Unknown')
    await expect(rollupGrid).toContainText('2 areas')
    await expect(rollupGrid.getByRole('button')).toHaveCount(5)
    await expect(rollupGrid.getByRole('button', { name: 'All regions', exact: true })).toHaveAttribute('aria-pressed', 'true')

    // 2. Verify Region Filter Dropdown Exists with Regional Options
    const regionSelect = page.locator('#sectorRegion')
    await expect(regionSelect).toBeVisible()
    await expect(regionSelect).toContainText('CALABARZON')
    await expect(regionSelect).toContainText('MIMAROPA')
    await expect(regionSelect).toContainText('Bicol')
    await expect(regionSelect).toContainText('Other National')

    // 3. Filter by MIMAROPA Region
    await page.selectOption('#sectorRegion', 'MIMAROPA')
    await expect(page.locator('#sectorProfileTable')).toContainText('Marinduque')
    await expect(page.locator('#sectorProfileTable')).toContainText('Oriental Mindoro')
    await expect(page.locator('#sectorProfileTable')).not.toContainText('Quezon')
    await expect(page.locator('#sectorProfileTable')).not.toContainText('Batangas')
    await expect(page.locator('#areaRankedCount')).toHaveText('1')
    await expect(page.locator('#sectorStatus')).toHaveText('1 region · 2 areas linked to sales.')
    await expect(page.locator('#areaCoverageNextReview')).toBeVisible()
    await expect(page.locator('#areaCoverageNextReview')).toContainText('Region filter excludes other regions and unassigned areas.')

    // 4. Verify Summary Footer Row Totals
    const tableFooter = page.locator('#sectorProfileTable tfoot')
    await expect(tableFooter).toBeVisible()
    await expect(tableFooter).toContainText('Total Rollup')
    await expect(tableFooter).toContainText('₱250,000')

    // 5. Test 1-click selectRollupRegion interactive handler
    await rollupGrid.getByRole('button', { name: /^CALABARZON/ }).click()
    await expect(page.locator('#sectorRegion')).toHaveValue('CALABARZON')
    await expect(page.locator('#sectorProfileTable')).toContainText('Quezon')
    await expect(page.locator('#sectorProfileTable')).toContainText('Batangas')
    await expect(page.locator('#sectorProfileTable')).toContainText('Cavite')
    await expect(page.locator('#sectorProfileTable')).not.toContainText('Marinduque')
    await expect(page.locator('#areaRankedCount')).toHaveText('1')

    // 6. Reset to All Regions
    await page.selectOption('#sectorRegion', 'All')
    await expect(page.locator('#areaRankedCount')).toHaveText('4')
    await expect(page.locator('#areaCoverageNextReview')).not.toBeVisible()
  })

  test('sales leadership differs from the weighted score and signed or missing amounts keep their meaning', async ({ page }) => {
    await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
    await page.goto('http://medshield.test/')
    await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
    await page.evaluate(() => { window.fetch = async () => new Response('{}', { status: 503 }) })
    await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
    await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())
    await page.evaluate(() => {
      const app = window as any
      app.showPage('territory')
      app.setDescriptivePeriod('custom')
      app.setCustomDateRange('2025-01-01', '2025-02-28')
      const row = (territory: string, region: string, period: string, revenue: number) => ({
        territory, region, period, date: period + '-15', revenue, sector: 'Government',
        product: 'SOURCE LABEL', quantity: 1, row_count: 1, evidence: 'actual', basis: 'Review mapping',
      })
      app.setSalesSectorsData({ rows: [
        row('Quezon', 'CALABARZON', '2025-01', 1000),
        row('Camarines Sur', 'Bicol', '2025-01', 450),
        row('Camarines Sur', 'Bicol', '2025-02', 450),
      ], source: { file: 'test-source', checksum: 'test-checksum', excluded: {} } })
    })
    // Quezon: 100% sales size, 50% period coverage => 80. Camarines Sur: 90%, 100% => 94.
    await expect(page.locator('#areaLeadingArea')).toHaveText('CALABARZON')
    await expect(page.locator('#areaCommercialLeader')).toContainText('Highest historical sales score: Camarines Sur (94.0/100)')
    await expect(page.locator('#sectorProfileTable tbody tr').first()).toContainText('Camarines Sur')
    const firstEvidence = page.locator('#sectorProfileTable tbody .area-row-evidence').first()
    await expect(firstEvidence).not.toHaveAttribute('open', '')
    await firstEvidence.locator('summary').click()
    await expect(firstEvidence.locator('dd').first()).toHaveText('₱900')
    await expect(page.locator('#areaRegionalValues')).toContainText('52.6% of this chart total')

    await page.evaluate(() => (window as any).setAreaPriorityWeights(100, 0))
    await expect(page.locator('#areaScoreExplanation')).toHaveText('Historical sales score (0–100): 100% sales size + 0% periods with records.')
    await expect(page.locator('#areaCommercialLeader')).toContainText('Highest historical sales score: Quezon (100.0/100)')
    await expect(page.locator('#sectorProfileTable tbody tr').first()).toContainText('Quezon')
    await expect(page.locator('#areaLeadingArea')).toHaveText('CALABARZON')
    await page.evaluate(() => (window as any).setAreaPriorityWeights(20, 80))
    await expect(page.locator('#areaCommercialLeader')).toContainText('Highest historical sales score: Camarines Sur (98.0/100)')

    await page.evaluate(() => {
      const app = window as any
      const row = (territory: string, region: string | null, revenue: number | null, sector: string) => ({
        territory, region, revenue, sector, date: '2025-01-15', period: '2025-01',
        product: 'SOURCE LABEL', quantity: 1, row_count: 1, evidence: 'actual', basis: 'Review mapping',
      })
      app.setSalesSectorsData({ rows: [
        row('Quezon', 'CALABARZON', 1000, 'Government'),
        row('Camarines Sur', 'Bicol', -100, 'Private'),
        row('Unassigned geography', null, 200, 'Unknown'),
      ], source: { file: 'test-source', checksum: 'test-checksum', excluded: {} } })
    })
    await expect(page.locator('#areaCoverageTakeaway')).toContainText('₱200')
    await expect(page.locator('#areaRevenueCoverage')).toHaveText('81.8%')
    await expect(page.locator('#areaMappingCoverage')).toHaveText('66.7% mapped')
    await expect(page.locator('#areaRegionalValues')).toContainText('-₱100')
    await expect(page.locator('#areaRegionalValues')).not.toContainText('%')
    await expect(page.locator('#areaRankChartNote')).toContainText('Chart total: ₱900')
    await expect(page.locator('#areaRankChartNote')).toContainText('Percentages unavailable: A grouped net total is negative.')
    await expect(page.locator('#areaBuyerNote')).toContainText('Chart total: ₱1,100')
    await expect(page.locator('#areaBuyerNote')).toContainText('including ₱200 without an assigned area')
    await expect(page.locator('#areaBuyerValues')).toContainText('Unknown buyer type')
    await expect(page.locator('#areaBuyerValues')).not.toContainText('%')
    await page.locator('#areaMappingDetails > summary').click()
    await expect(page.locator('#clientReferenceTable')).toBeVisible()

    await page.evaluate(() => {
      const row = (territory: string, region: string, revenue: number | null) => ({
        territory, region, revenue, sector: 'Government', date: '2025-01-15', period: '2025-01',
        product: 'SOURCE LABEL', quantity: 1, row_count: 1, evidence: 'actual', basis: 'Review mapping',
      })
      ;(window as any).setSalesSectorsData({ rows: [row('Quezon', 'CALABARZON', 1000), row('Camarines Sur', 'Bicol', null)],
        source: { file: 'test-source', checksum: 'test-checksum', excluded: {} } })
    })
    await expect(page.locator('#areaCoverageTakeaway')).toContainText('Sales-to-area coverage is unavailable: 1 selected net sales value is missing.')
    await expect(page.locator('#areaRevenueCoverage')).toHaveText('Unavailable')
    await expect(page.locator('#areaRankChartNote')).toContainText('Amounts and shares use known net sales values; 1 selected value is missing.')
    await expect(page.locator('#areaRegionalValues')).toContainText('net sales ₱1,000, 100.0% of this chart total')
    await expect(page.locator('#areaLeadingShare')).toContainText('100.0% of linked sales')
    const concentration = await page.evaluate(() => {
      const chart = (window as any).Chart.getChart(document.getElementById('sectorParetoChart'))
      return chart.data.datasets.filter((dataset: any) => dataset.yAxisID === 'share').map((dataset: any) => dataset.data)
    })
    expect(concentration).toEqual([[100, 100], [80, 80]])

    for (const revenue of [0, -100]) {
      await page.evaluate(revenue => (window as any).setSalesSectorsData({ rows: [{
        territory: 'Quezon', region: 'CALABARZON', revenue, sector: 'Government', date: '2025-01-15', period: '2025-01',
        product: 'SOURCE LABEL', quantity: 1, row_count: 1, evidence: 'actual', basis: 'Review mapping',
      }], source: { file: 'test-source', excluded: {} } }), revenue)
      await expect(page.locator('#areaRevenueCoverage')).toHaveText('Unavailable')
      await expect(page.locator('#areaRankChartNote')).toContainText('The chart total is zero or negative.')
      await expect(page.locator('#areaRegionalValues')).not.toContainText('%')
      expect(await page.evaluate(() => (window as any).Chart.getChart(document.getElementById('sectorRevenueChart')).data.datasets[0].data)).toEqual([revenue])
    }
  })

  for (const width of [1440, 926, 375]) test(`area summaries, empty states and expanded evidence fit ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
    await page.goto('http://medshield.test/')
    await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
    await page.evaluate(() => { window.fetch = async () => new Response('{}', { status: 503 }) })
    await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
    await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())
    await page.evaluate(() => {
      const app = window as any
      app.showPage('territory'); app.setDescriptivePeriod('all')
      app.setSalesSectorsData({ rows: [{ territory: 'Quezon', region: 'CALABARZON', revenue: 1000, sector: 'Government',
        period: '2025-01', product: 'SOURCE LABEL', quantity: 1, row_count: 1, evidence: 'actual', basis: 'Review mapping' }], source: { file: 'fixture', excluded: {} } })
    })
    await page.locator('#sectorProfileTable tbody details summary').first().click()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    for (const id of ['sectorRevenueChart', 'sectorBuyerChart']) {
      await expect.poll(() => page.locator('#' + id).evaluate(canvas => {
        const chart = (window as any).Chart.getChart(canvas), box = canvas.getBoundingClientRect()
        return box.width > 100 && box.height >= 170 && chart.chartArea.width > 65 && chart.chartArea.height > 80
      })).toBe(true)
    }
    await page.screenshot({ path: testInfo.outputPath(`area-${width}.png`), fullPage: true })
    await page.evaluate(() => (window as any).setSalesSectorsData({ rows: [], source: { file: 'empty', excluded: {} } }))
    await expect(page.locator('#sectorRevenueChart')).not.toBeVisible()
    await expect(page.locator('#sectorBuyerChart')).not.toBeVisible()
    await expect(page.locator('#areaLeadingArea')).toHaveText('No region')
    await expect(page.locator('#areaRevenueCoverage')).toHaveText('Unavailable')
    await page.evaluate(() => (window as any).setSalesSectorsData(null, 'Service unavailable'))
    await expect(page.locator('#sectorProfileTable')).toBeEmpty()
    await expect(page.locator('#sectorStatus')).toHaveText('Service unavailable')
    await expect(page.locator('#areaRegionalValues')).toBeEmpty()
    await expect(page.locator('#areaBuyerValues')).toBeEmpty()
    await expect(page.locator('#areaCommercialLeader')).toHaveText('Historical sales score unavailable.')
  })
})

