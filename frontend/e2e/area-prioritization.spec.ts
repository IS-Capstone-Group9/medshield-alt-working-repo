import { test, expect } from '@playwright/test'
import path from 'node:path'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

test.describe('Area Prioritization Dynamic Interactions & Visualizations', () => {
  test('area prioritization dynamically updates on rolling periods, buyer clusters, dimensions, and diagonal chart rotation', async ({ page }) => {
    await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
    await page.goto('http://medshield.test/')
    await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
    await page.evaluate(() => { window.fetch = async () => new Response('{}', { status: 503 }) })
    await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
    await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())

    await page.evaluate(() => {
      const app = window as any
      app.showPage('territory')
      const row = (sector: string, channel: string, territory: string, revenue: number, quantity: number, period = '2025-02', product = 'PARACETAMOL 500MG') => ({
        date: period + '-15',
        sector,
        channel,
        territory,
        revenue,
        quantity,
        period,
        product,
        row_count: 1,
        basis: 'Institutional purchase order reference'
      })

      app.setSalesSectorsData({
        rows: [
          row('Government', 'LGU Hospital', 'Quezon', 500000, 5000, '2025-02', 'PARACETAMOL 500MG'),
          row('Government', 'RHU Clinic', 'Batangas', 300000, 3000, '2025-02', 'PARACETAMOL 500MG'),
          row('Government', 'Provincial Hospital', 'Camarines Sur', 200000, 2000, '2025-02', 'PARACETAMOL 500MG'),
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

    // 1. Check Government cluster initial rendering
    await page.selectOption('#sectorCluster', 'Government')
    await expect(page.locator('#sectorProfileTable')).toContainText('Quezon')
    await expect(page.locator('#sectorProfileTable')).toContainText('Batangas')
    await expect(page.locator('#sectorProfileTable')).toContainText('Camarines Sur')

    // Verify x-axis diagonal label rotation on sector revenue chart
    const chartOptions = await page.evaluate(() => {
      const chart = (window as any).Chart.getChart(document.getElementById('sectorRevenueChart'))
      return {
        minRotation: chart.options.scales.x.ticks.minRotation,
        maxRotation: chart.options.scales.x.ticks.maxRotation,
        autoSkip: chart.options.scales.x.ticks.autoSkip
      }
    })
    expect(chartOptions.minRotation).toBe(35)
    expect(chartOptions.maxRotation).toBe(45)
    expect(chartOptions.autoSkip).toBe(false)

    // 2. Switch dimension to Customer Channel
    await page.selectOption('#sectorDimension', 'channel')
    await expect(page.locator('#sectorProfileTable')).toContainText('LGU Hospital')
    await expect(page.locator('#sectorProfileTable')).toContainText('RHU Clinic')
    await expect(page.locator('#sectorProfileTable')).toContainText('Provincial Hospital')

    // 3. Switch cluster to Private
    await page.selectOption('#sectorCluster', 'Private')
    await page.selectOption('#sectorDimension', 'territory')
    await expect(page.locator('#sectorProfileTable')).toContainText('Cavite')
    await expect(page.locator('#sectorProfileTable')).toContainText('Laguna')

    // 4. Test Dynamic Period Switching (3 Months, 6 Months, Custom Date Range)
    await page.selectOption('#descriptivePeriodSelect', '3')
    await expect(page.locator('#sectorScope')).toContainText('Last 3 Months')

    await page.selectOption('#descriptivePeriodSelect', '6')
    await expect(page.locator('#sectorScope')).toContainText('Last 6 Months')

    await page.selectOption('#descriptivePeriodSelect', '30d')
    await expect(page.locator('#sectorScope')).toContainText('Last 30 Days')

    await page.selectOption('#descriptivePeriodSelect', 'custom')
    await page.evaluate(() => (window as any).setCustomDateRange('2024-01-01', '2024-12-31'))
    await expect(page.locator('#sectorScope')).toContainText('2024')

    // 5. Verify Classification & Source Evidence Lineage
    await expect(page.locator('#sectorSource')).toContainText('datasources/templates/buyer_sector_mapping.csv')
  })
})
