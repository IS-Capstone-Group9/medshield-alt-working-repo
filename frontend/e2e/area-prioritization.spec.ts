import { test, expect } from '@playwright/test'
import path from 'node:path'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

test.describe('Area Prioritization Dynamic Interactions & Visualizations', () => {
  test('area prioritization ranks geography and updates periods, buyer clusters, and evidence', async ({ page }) => {
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

    // 1. Buyer cluster filters the geographic ranking without becoming an area.
    await page.selectOption('#sectorCluster', 'Government')
    await expect(page.locator('#sectorProfileTable')).toContainText('Quezon')
    await expect(page.locator('#sectorProfileTable')).toContainText('Batangas')
    await expect(page.locator('#sectorProfileTable')).toContainText('Camarines Sur')
    await expect(page.locator('#sectorProfileTable thead')).toContainText('Geographic area')
    await expect(page.locator('#sectorProfileTable thead')).toContainText('Buyer composition')
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
    await expect(page.locator('#areaActualRevenue')).toContainText('₱1M')
    await expect(page.locator('#areaEstimatedRevenue')).toContainText('₱700K')

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
    await page.locator('.area-method').evaluate((element: HTMLDetailsElement) => { element.open = true })
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
    await expect(rollupGrid).toContainText('2 Areas')
    await expect(rollupGrid).toContainText('Total Regional-Group Rollup')
    await expect(rollupGrid).toContainText('4 Groups')
    const regionalTotalBeforeDrilldown = await rollupGrid.locator('.area-region-box.total .area-region-rev').textContent()

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
    await expect(page.locator('#areaRankedCount')).toHaveText('2')
    await expect(page.locator('#areaRankedCountLabel')).toHaveText('Ranked areas')
    await expect(page.locator('#areaRankChartTitle')).toHaveText('MIMAROPA area priority ranking')
    await expect(page.locator('#areaRegionRollupNote')).toContainText('Regional totals remain fixed')
    await expect(rollupGrid.locator('.area-region-box.total .area-region-rev')).toHaveText(regionalTotalBeforeDrilldown || '')
    const mimaropaLabels = await page.evaluate(() => {
      const ranking = (window as any).Chart.getChart(document.getElementById('sectorRevenueChart'))
      const pareto = (window as any).Chart.getChart(document.getElementById('sectorParetoChart'))
      return { ranking: ranking.data.labels, pareto: pareto.data.labels }
    })
    expect(mimaropaLabels.ranking).toEqual(['Marinduque', 'Oriental Mindoro'])
    expect(mimaropaLabels.pareto).toEqual(['Marinduque', 'Oriental Mindoro'])

    // 4. Verify Summary Footer Row Totals
    const tableFooter = page.locator('#sectorProfileTable tfoot')
    await expect(tableFooter).toBeVisible()
    await expect(tableFooter).toContainText('Total Rollup')
    await expect(tableFooter).toContainText('₱250,000')

    // 5. Test 1-click selectRollupRegion interactive handler
    await page.evaluate(() => (window as any).selectRollupRegion('CALABARZON'))
    await expect(page.locator('#sectorRegion')).toHaveValue('CALABARZON')
    await expect(page.locator('#sectorProfileTable')).toContainText('Quezon')
    await expect(page.locator('#sectorProfileTable')).toContainText('Batangas')
    await expect(page.locator('#sectorProfileTable')).toContainText('Cavite')
    await expect(page.locator('#sectorProfileTable')).not.toContainText('Marinduque')
    await expect(page.locator('#areaRankedCount')).toHaveText('3')
    const calabarzonLabels = await page.evaluate(() => {
      const ranking = (window as any).Chart.getChart(document.getElementById('sectorRevenueChart'))
      return ranking.data.labels
    })
    expect(calabarzonLabels).toEqual(['Quezon', 'Batangas', 'Cavite'])

    // 6. Reset to All Regions
    await page.selectOption('#sectorRegion', 'All')
    await expect(page.locator('#areaRankedCount')).toHaveText('4')
    await expect(page.locator('#areaRankedCountLabel')).toHaveText('Ranked regional groups')
    const resetLabels = await page.evaluate(() => {
      const ranking = (window as any).Chart.getChart(document.getElementById('sectorRevenueChart'))
      return ranking.data.labels
    })
    expect(resetLabels).toEqual(['Other National', 'CALABARZON', 'Bicol', 'MIMAROPA'])
  })
})

