import { test, expect, type Page } from '@playwright/test';

async function expectChartRendered(page: Page, canvasId: string) {
  await expect.poll(async () => page.evaluate((id) => {
    const chartApi = (window as any).Chart
    const canvas = document.getElementById(id)
    const chart = canvas ? chartApi?.getChart?.(canvas) : null
    return Boolean(
      chart &&
      chart.width > 0 &&
      chart.height > 0 &&
      chart.data?.datasets?.some((dataset: { data?: unknown[] }) => dataset.data?.length)
    )
  }, canvasId)).toBe(true)
}

async function expectOnlyPageActive(page: Page, pageId: string) {
  await expect.poll(async () => page.locator('.page.active').evaluateAll((pages) =>
    pages.map((activePage) => activePage.id)
  )).toEqual([pageId])
  await expect(page.locator(`#${pageId}`)).toBeVisible()
}

test.describe('MedShield DSS Enterprise Dashboard E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    const runtimeErrors: string[] = []
    page.on('pageerror', (error) => runtimeErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' && message.text().includes('Failed to initialize the MedShield dashboard runtime')) {
        runtimeErrors.push(message.text())
      }
    })

    // 1. Navigate to Login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 2. Perform authenticated sign in
    await page.fill('#username', 'admin');
    await page.fill('#password', 'medshield2025');
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    // 3. Wait for dashboard redirection and sandbox initialization
    await page.waitForURL('**/', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#topbar-title', { timeout: 10000 });
    expect(runtimeErrors, 'dashboard runtime must compile and initialize without errors').toEqual([])
  });

  test('1. System Bootstrap: Loads Executive Overview with KPIs & Baseline Charts', async ({ page }) => {
    // Verify Brand & Topbar
    await expect(page.locator('.brand-name')).toHaveText('MedShield');
    await expect(page.locator('#topbar-title')).toHaveText('Executive Overview');

    // Verify Overview KPI Cards exist and display values
    const kpiTotalRevenue = page.locator('#kpiOverviewTotalRevenue');
    await expect(kpiTotalRevenue).toBeVisible();
    await expect(kpiTotalRevenue).toContainText('₱');

    // Verify Main Overview Canvas
    await expect(page.locator('#overviewBaselineChart')).toBeVisible();
    await expectChartRendered(page, 'overviewBaselineChart');

    // Verify Data Governance Integrity Bar
    await expect(page.locator('.data-freshness-bar')).toContainText(/Analytics Services|Bundled Demo Snapshot/);
  });

  test('2. Navigation Matrix: Transitions seamlessly across all 7 DSS Modules', async ({ page }) => {
    const salesDeepDive = page.locator('[data-sales-diagnostics-deep-dive]');
    await expect(salesDeepDive).toHaveCount(1);
    await expect.poll(() => salesDeepDive.evaluate((section) => section.parentElement?.id)).toBe('page-revenue');

    // 2.1 Sales Diagnostics
    await page.locator('.nav-item', { hasText: 'Sales Diagnostics' }).click();
    await expect(page.locator('#topbar-title')).toHaveText('Sales Diagnostics');
    await expectOnlyPageActive(page, 'page-revenue');
    await expect(salesDeepDive).toBeVisible();
    await expect(page.locator('#revenueDetailChart')).toBeVisible();
    await expect(page.locator('#growthChart')).toBeVisible();
    await expect(page.locator('#marginChart')).toBeVisible();
    await expect(page.locator('#revenueHeatmapGrid')).toBeVisible();
    await expectChartRendered(page, 'revenueDetailChart');
    await expectChartRendered(page, 'growthChart');
    await expectChartRendered(page, 'marginChart');

    // 2.2 Product Prioritization
    await page.locator('.nav-item', { hasText: 'Product Prioritization' }).click();
    await expect(page.locator('#topbar-title')).toHaveText('Product Prioritization');
    await expectOnlyPageActive(page, 'page-products');
    await expect(salesDeepDive).not.toBeVisible();
    await expect(page.locator('#productBarChart')).toBeVisible();
    await expect(page.locator('#productTable')).toBeVisible();
    await expectChartRendered(page, 'productBarChart');

    // 2.3 Area Prioritization
    await page.locator('.nav-item', { hasText: 'Area Prioritization' }).click();
    await expect(page.locator('#topbar-title')).toHaveText('Area Prioritization');
    await expectOnlyPageActive(page, 'page-territory');
    await expect(salesDeepDive).not.toBeVisible();
    await expect(page.locator('#areaBarChart')).toBeVisible();
    await expect(page.locator('#areaIncomeChart')).toBeVisible();
    await expect(page.locator('[data-mcda-sensitivity="commercial-candidate"]')).toContainText('Commercial Priority MCDA');
    await expect(page.locator('#mcdaWeightSalesValue')).toHaveValue('60');
    await expect(page.locator('#mcdaWeightCoverage')).toHaveValue('40');
    await expect(page.locator('#mcdaWeightTotal')).toHaveText('100%');
    await expect(page.locator('#mcdaWeightSurge')).toHaveCount(0);
    await expect(page.locator('#mcdaWeightLead')).toHaveCount(0);
    await expect(page.locator('#diseaseDemandChart')).toBeVisible();
    await expect(page.locator('#territoryRadarChart')).toBeVisible();
    await expectChartRendered(page, 'areaBarChart');
    await expectChartRendered(page, 'areaIncomeChart');
    await expectChartRendered(page, 'diseaseDemandChart');
    await expectChartRendered(page, 'territoryRadarChart');
    await page.locator('#mcdaWeightSalesValue').fill('75');
    await expect(page.locator('#mcdaWeightCoverage')).toHaveValue('25');
    await expect(page.locator('#priorityTable')).toContainText('Month-Coverage Score');
    await expect(page.locator('#priorityTable')).not.toContainText('Lead Time Factor');

    // 2.4 Forecast Modeling
    await page.locator('.nav-item', { hasText: 'Forecast Modeling' }).click();
    await expect(page.locator('#topbar-title')).toHaveText('Forecast Modeling');
    await expectOnlyPageActive(page, 'page-forecast');
    await expect(salesDeepDive).not.toBeVisible();
    await expect(page.locator('#forecastChart')).toBeVisible();
    await expect(page.locator('#externalChart')).toBeVisible();
    await expectChartRendered(page, 'forecastChart');
    await expectChartRendered(page, 'externalChart');

    // 2.5 Prescriptive Planning
    await page.locator('.nav-item', { hasText: 'Prescriptive Planning' }).click();
    await expect(page.locator('#topbar-title')).toHaveText('Prescriptive Planning');
    await expectOnlyPageActive(page, 'page-inventory');
    await expect(salesDeepDive).not.toBeVisible();
    await expect(page.locator('#surgeMultiplierSlider')).toBeVisible();

    // 2.6 Data Upload
    await page.locator('.nav-item', { hasText: 'Data Upload' }).click();
    await expect(page.locator('#topbar-title')).toHaveText('Data Upload');
    await expectOnlyPageActive(page, 'page-data');
    await expect(salesDeepDive).not.toBeVisible();
    await expect(page.locator('#page-data')).toBeVisible();

    // 2.7 Return to Overview
    await page.locator('.nav-item', { hasText: 'Overview' }).click();
    await expect(page.locator('#topbar-title')).toHaveText('Executive Overview');
    await expectOnlyPageActive(page, 'page-overview');
    await expect(salesDeepDive).not.toBeVisible();
  });

  test('3. Dynamic Time Horizons: Toggles Single Year & Y/Y Comparison Filters', async ({ page }) => {
    const singleYearBtn = page.locator('#btnSingleYear');
    const yoyBtn = page.locator('#btnYoyYear');
    const singleWrap = page.locator('#singleYearWrap');
    const yoyWrap = page.locator('#yoyYearWrap');

    // Initially Single Year mode is active
    await expect(singleYearBtn).toHaveClass(/active/);
    await expect(singleWrap).toBeVisible();

    // Toggle to Y/Y Compare
    await yoyBtn.click();
    await expect(yoyBtn).toHaveClass(/active/);
    await expect(yoyWrap).toBeVisible();
    await expect(singleWrap).not.toBeVisible();

    // Switch comparison years in dropdowns
    const baseSelect = page.locator('#yoyBaseYearSelect');
    const targetSelect = page.locator('#yoyTargetYearSelect');
    await baseSelect.selectOption('2025');
    await targetSelect.selectOption('2023');

    // Overview Chart should render only the selected comparison pair.
    await expect(page.locator('#overviewBaselineChart')).toBeVisible();
    await expect.poll(async () => page.evaluate(() => {
      const chartApi = (window as any).Chart
      const canvas = document.getElementById('overviewBaselineChart')
      const chart = canvas ? chartApi?.getChart?.(canvas) : null
      return chart?.data?.labels?.map(String) ?? []
    })).toEqual(['2023', '2025'])

    // Switch back to Single Year
    await singleYearBtn.click();
    await expect(singleYearBtn).toHaveClass(/active/);
    await expect(singleWrap).toBeVisible();

    const yearSelect = page.locator('#topbarYearSelect');
    await yearSelect.selectOption('2024');
    await expect(page.locator('#overviewBaselineChart')).toBeVisible();
    await expect.poll(async () => page.evaluate(() => {
      const chartApi = (window as any).Chart
      const canvas = document.getElementById('overviewBaselineChart')
      const chart = canvas ? chartApi?.getChart?.(canvas) : null
      return chart?.data?.labels?.map(String) ?? []
    })).toEqual(['2024'])
  });

  test('3b. Extended data pages open and unsupported dark mode is absent', async ({ page }) => {
    const salesDeepDive = page.locator('[data-sales-diagnostics-deep-dive]');
    await expect(page.getByRole('button', { name: 'Toggle dark mode' })).toHaveCount(0);

    await page.getByRole('button', { name: 'View Sales Data' }).click();
    await expectOnlyPageActive(page, 'page-sales-data');
    await expect(page.locator('#topbar-title')).toHaveText('View Sales Data');
    await expect(page.locator('#salesDataTable')).toBeVisible();
    await expect(salesDeepDive).not.toBeVisible();

    await page.getByRole('button', { name: 'Weather API Validation' }).click();
    await expectOnlyPageActive(page, 'page-weather-validation');
    await expect(page.locator('#topbar-title')).toHaveText('Weather API Validation');
    await expect(page.locator('#weatherEffectTable')).toBeVisible();
    await expect(salesDeepDive).not.toBeVisible();
  });

  test('4. Prescriptive DSS: Adjusts Outbreak Surge Scenario & Seasonal Medicine Matrix', async ({ page }) => {
    // Navigate to Prescriptive Planning
    await page.locator('.nav-item', { hasText: 'Prescriptive Planning' }).click();

    const surgeSlider = page.locator('#surgeMultiplierSlider');
    const surgeLabel = page.locator('#surgeMultiplierLabel');

    // Test Epidemic Emergency (+75%) preset
    await page.locator('.clean-preset-btn', { hasText: 'Epidemic Emergency (+75%)' }).click();
    await expect(surgeLabel).toContainText('+75%');

    // Test Normal Baseline (0%) preset
    await page.locator('.clean-preset-btn', { hasText: 'Normal Baseline (0%)' }).click();
    await expect(surgeLabel).toContainText('+0%');

    // Test Monsoon Surge (+45%) preset
    await page.locator('.clean-preset-btn', { hasText: 'Monsoon Surge (+45%)' }).click();
    await expect(surgeLabel).toContainText('+45%');

    // Test Season Selection: Amihan (Cool Dry)
    const amihanCard = page.locator('.clean-season-card', { hasText: 'Amihan (Cool Dry)' });
    await amihanCard.click();
    await expect(amihanCard).toHaveClass(/active/);
    await expect(page.locator('#drilldownTitle')).toContainText('Amihan');

    // Test Season Selection: Summer (Hot Dry)
    const summerCard = page.locator('.clean-season-card', { hasText: 'Summer (Hot Dry)' });
    await summerCard.click();
    await expect(summerCard).toHaveClass(/active/);
    await expect(page.locator('#drilldownTitle')).toContainText('Summer');

    // Test Season Selection: Monsoon (Habagat)
    const monsoonCard = page.locator('.clean-season-card', { hasText: 'Monsoon (Habagat)' });
    await monsoonCard.click();
    await expect(monsoonCard).toHaveClass(/active/);
    await expect(page.locator('#drilldownTitle')).toContainText('Monsoon');
  });

  test('5. Modal Lifecycle: Opens and Closes Order Execution Dialog', async ({ page }) => {
    // Navigate to Prescriptive Planning
    await page.locator('.nav-item', { hasText: 'Prescriptive Planning' }).click();

    // Open the draft planning review dialog.
    const poBtn = page.locator('#seasonalDrilldownContainer button', { hasText: 'Review Draft Plan' });
    await poBtn.click();

    // Verify Modal appears
    const modalBackdrop = page.locator('#auditLogModal');
    await expect(modalBackdrop).toBeVisible();

    // Close Modal via Cancel button or close function
    const cancelBtn = modalBackdrop.locator('button', { hasText: 'Cancel' });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    } else {
      await page.evaluate(() => (window as unknown as { closeAuditModal: () => void }).closeAuditModal());
    }
    await expect(modalBackdrop).not.toBeVisible();
  });
});
