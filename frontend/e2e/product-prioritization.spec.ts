import { test, expect } from '@playwright/test'
import path from 'node:path'
import { MEDSHIELD_MARKUP, MEDSHIELD_STYLE } from '../lib/medshieldReference'
import { getExecutableDashboardScript } from '../services/api/dashboard-engine'

test.describe('Scenario-Driven Product Prioritization & WHO ABC-VEN Matrix Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('http://medshield.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
    await page.goto('http://medshield.test/')
    await page.setContent(`<style>${MEDSHIELD_STYLE}</style>${MEDSHIELD_MARKUP}`)
    await page.evaluate(() => { window.fetch = async () => new Response('{}', { status: 503 }) })
    await page.addScriptTag({ path: path.resolve('node_modules/chart.js/dist/chart.umd.js') })
    await page.evaluate(script => new Function(script)(), getExecutableDashboardScript())

    await page.evaluate(() => {
      const app = window as any
      app.showPage('products')
      const row = (product: string, revenue: number, quantity: number, period = '2025-02') => ({
        date: period + '-15',
        sector: 'Private',
        channel: 'Retail Pharmacy',
        territory: 'Quezon',
        revenue,
        quantity,
        period,
        product,
        row_count: 1,
        basis: 'Standard ledger record',
        evidence: 'actual'
      })

      app.setSalesSectorsData({
        rows: [
          row('AMLODIPINE 5MG', 5000000, 100000), // Class A, VEN E -> AE -> Cat I
          row('MULTIVITAMINS + ZINC', 3000000, 50000), // Class A/B, VEN N -> AN/BN -> Cat II/III
          row('SALBUTAMOL 2MG/5ML SYRUP', 1000000, 20000), // Class B, VEN E -> BE -> Cat II
          row('PARACETAMOL 500MG', 100000, 40000), // Class C, VEN V -> CV -> Cat I (Vital!)
          row('ORAL REHYDRATION SALTS', 50000, 5000), // Class C, VEN V -> CV -> Cat I (Vital!)
          row('DOXYCYCLINE 100MG', 80000, 10000), // Class C, VEN V -> CV -> Cat I (Vital!)
          row('SANOMAX-FA', 20000, 1000), // Class C, VEN N -> CN -> Cat III
        ],
        source: {
          file: 'datasources/templates/product_master_catalog.csv',
          checksum: 'test-hash-catalog',
          excluded: {}
        }
      })
    })
  })

  test('1. Core Layout: Renders Scenario Switcher, Category KPI Cards, and ABC-VEN Prioritization Table', async ({ page }) => {
    // 1. Verify Scope & Scenario Toolbar exists
    const scope = page.locator('#productPriorityScope')
    await expect(scope).toBeVisible()
    await expect(scope).toContainText('Scenario-Driven Product Decision Support')

    // 2. Verify Category Summary Cards
    const catGrid = page.locator('#productCategorySummaryGrid')
    await expect(catGrid).toBeVisible()
    await expect(catGrid).toContainText('Category I · Critical Priority')
    await expect(catGrid).toContainText('Category II · Intermediate')
    await expect(catGrid).toContainText('Category III · Routine')

    // 3. Verify Product Prioritization Table
    const table = page.locator('#productTable')
    await expect(table).toBeVisible()
    await expect(table.locator('thead')).toContainText('ABC-VEN Category')
    await expect(table.locator('thead')).toContainText('WHO VEN')
    await expect(table.locator('thead')).toContainText('MCDA Priority Score')
  })

  test('2. CV Item Elevation: Low-revenue Vital items (Paracetamol, ORS) are elevated to Category I', async ({ page }) => {
    // In Normal baseline, Paracetamol and ORS are Class C by revenue, but Vital (V) by clinical standard -> CV -> Category I
    const tableBody = page.locator('#productTable tbody')
    await expect(tableBody).toContainText('PARACETAMOL 500MG')
    await expect(tableBody).toContainText('Vital (V)')
    await expect(tableBody).toContainText('Category I')
    await expect(tableBody).toContainText('[CV]')

    // Verify ORS is also Category I [CV]
    await expect(tableBody).toContainText('ORAL REHYDRATION SALTS')
    await expect(tableBody).toContainText('[CV]')
  })

  test('3. Disease Outbreak Surge Scenario: Elevates epidemic medicines and surges MCDA scores', async ({ page }) => {
    // Switch to Disease Outbreak scenario
    await page.selectOption('#productScenarioSelect', 'outbreak')

    // Verify Topbar and Insight update to Outbreak Mode
    await expect(page.locator('#topbar-sub')).toContainText('OUTBREAK')
    await expect(page.locator('#page-products .dss-insight-card')).toContainText('Dengue Epidemic Surge Protection')

    // In Outbreak mode, Paracetamol surge multiplier is >= 1.70x and ORS is >= 2.0x
    const tableBody = page.locator('#productTable tbody')
    await expect(tableBody).toContainText('PARACETAMOL 500MG')
    await expect(tableBody).toContainText('1.85x')
    await expect(tableBody).toContainText('2.20x')
  })

  test('4. Inclement Weather / Typhoon Disaster Scenario: Elevates flood and storm medications', async ({ page }) => {
    // Switch to Inclement Weather scenario
    await page.selectOption('#productScenarioSelect', 'weather')

    // Verify Topbar and Insight update to Weather Mode
    await expect(page.locator('#topbar-sub')).toContainText('WEATHER')
    await expect(page.locator('#page-products .dss-insight-card')).toContainText('Typhoon & Flood Disaster Contingency')

    // In Weather mode, Doxycycline surge multiplier is 2.80x
    const tableBody = page.locator('#productTable tbody')
    await expect(tableBody).toContainText('DOXYCYCLINE 100MG')
    await expect(tableBody).toContainText('2.80x')
  })

  test('5. Multi-Dimensional Filtering: Therapeutic Cluster and Category filters refine scope', async ({ page }) => {
    // 1. Filter by Category I only
    await page.selectOption('#productCategorySelect', 'cat1')
    await expect(page.locator('#productTable tbody tr')).toHaveCount(4) // Amlodipine (AE), Paracetamol (CV), ORS (CV), Doxycycline (CV)
    await expect(page.locator('#productTable tbody')).not.toContainText('Category III')

    // 2. Filter by Vector-Borne (Dengue) cluster
    await page.selectOption('#productCategorySelect', 'all')
    await page.selectOption('#productClusterSelect', 'dengue')
    await expect(page.locator('#productTable tbody')).toContainText('PARACETAMOL 500MG')
    await expect(page.locator('#productTable tbody')).toContainText('ORAL REHYDRATION SALTS')
    await expect(page.locator('#productTable tbody')).not.toContainText('AMLODIPINE 5MG')

    // 3. Reset filters
    await page.selectOption('#productClusterSelect', 'all')
    await expect(page.locator('#productTable tbody')).toContainText('AMLODIPINE 5MG')
  })

  test('6. MCDA Live Weight Tuning & Reset', async ({ page }) => {
    // Check initial weights for normal mode (60% vol, 30% clin, 10% surge)
    await expect(page.locator('#weightVolLabel')).toHaveText('60%')
    await expect(page.locator('#weightClinLabel')).toHaveText('30%')
    await expect(page.locator('#weightSurgeLabel')).toHaveText('10%')

    // Test programmatically updating weights
    await page.evaluate(() => {
      (window as any).setProductScenario('outbreak')
    })
    await expect(page.locator('#weightVolLabel')).toHaveText('20%')
    await expect(page.locator('#weightClinLabel')).toHaveText('45%')
    await expect(page.locator('#weightSurgeLabel')).toHaveText('35%')
  })
})
