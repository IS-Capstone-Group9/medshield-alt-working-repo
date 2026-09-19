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
  }, canvasId), { timeout: 20000 }).toBe(true)
}

async function expectOnlyPageActive(page: Page, pageId: string) {
  await expect.poll(async () => page.locator('.page.active').evaluateAll((pages) =>
    pages.map((activePage) => activePage.id)
  )).toEqual([pageId])
  await expect(page.locator(`#${pageId}`)).toBeVisible()
}

test.describe('MedShield DSS Enterprise Dashboard E2E Suite', () => {
  test.setTimeout(90000);
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
    await page.fill('#username', process.env.MEDSHIELD_E2E_USERNAME || 'admin');
    await page.fill('#password', process.env.MEDSHIELD_E2E_PASSWORD || 'Medshield!2025');
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    // 3. Wait for dashboard redirection and sandbox initialization
    await page.waitForURL('**/', { timeout: 20000 });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#topbar-title', { timeout: 60000 });
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
    await expect(page.locator('.data-freshness-bar')).toContainText(/Databricks Gold|Analytics Services|Bundled Demo Snapshot/, { timeout: 20000 });
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
    await expect(page.locator('#sectorProfileTable')).toBeVisible();
    await page.selectOption('#sectorCluster', 'Private');
    await expect(page.locator('#sectorScope')).toContainText('Private');
    await expect(page.locator('#sectorStatus')).toContainText('mapped areas ranked');

    // 2.4 Forecast Modeling
    await page.locator('.nav-item', { hasText: 'Forecast Modeling' }).click();
    await expect(page.locator('#topbar-title')).toHaveText('Forecast Modeling');
    await expectOnlyPageActive(page, 'page-forecast');
    await expect(salesDeepDive).not.toBeVisible();
    await expect(page.locator('#forecastChart')).toBeVisible();
    await expect(page.locator('#forecastMetrics')).toContainText('MAE', { timeout: 20000 });
    await expectChartRendered(page, 'forecastChart');

    // 2.5 Prescriptive Planning
    await page.locator('.nav-item', { hasText: 'Prescriptive Planning' }).click();
    await expect(page.locator('#topbar-title')).toHaveText('Prescriptive Planning');
    await expectOnlyPageActive(page, 'page-inventory');
    await expect(salesDeepDive).not.toBeVisible();
    await page.selectOption('#planSector', 'Private');
    await expect(page.locator('#planInputs tbody tr')).toHaveCount(5, { timeout: 20000 });
    await expectChartRendered(page, 'planParetoChart');
    await expect(page.locator('#planExport')).toBeDisabled();

    // 2.6 Data Upload
    await page.locator('.nav-item', { hasText: 'Data Upload' }).click();
    await expect(page.locator('#topbar-title')).toHaveText(/Data Upload|Databricks Source/);
    await expectOnlyPageActive(page, 'page-data');
    await expect(salesDeepDive).not.toBeVisible();
    await expect(page.locator('#page-data')).toBeVisible();

    // 2.7 Return to Overview
    await page.locator('.nav-item', { hasText: 'Overview' }).click();
    await expect(page.locator('#topbar-title')).toHaveText('Executive Overview');
    await expectOnlyPageActive(page, 'page-overview');
    await expect(salesDeepDive).not.toBeVisible();
  });

  test('2b. Area priority weights stay complementary and update selected-period ranking', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Area Prioritization' }).click();
    await expectOnlyPageActive(page, 'page-territory');
    await expect(page.locator('#sectorStatus')).toContainText('mapped areas ranked', { timeout: 20000 });
    await page.locator('#mcdaWeightSalesValue').evaluate((element) => {
      const details = element.closest('details');
      if (details) details.open = true;
    });

    const initialScores = await page.locator('#sectorProfileTable tbody tr td:nth-child(4)').allTextContents();
    await page.locator('#mcdaWeightSalesValue').evaluate((element: HTMLInputElement) => {
      element.value = '80';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#mcdaWeightSalesValueLabel')).toHaveText('80%');
    await expect(page.locator('#mcdaWeightCoverageLabel')).toHaveText('20%');
    await expect(page.locator('#mcdaWeightTotal')).toHaveText('100%');
    await expect(page.locator('#areaScoreMethod')).toContainText('80% sales-value scale + 20% active-period coverage');
    await expect.poll(async () => page.locator('#sectorProfileTable tbody tr td:nth-child(4)').allTextContents()).not.toEqual(initialScores);

    await page.locator('#mcdaWeightCoverage').evaluate((element: HTMLInputElement) => {
      element.value = '70';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#mcdaWeightSalesValueLabel')).toHaveText('30%');
    await expect(page.locator('#mcdaWeightCoverageLabel')).toHaveText('70%');
    await expect(page.locator('#areaScoreMethod')).toContainText('30% sales-value scale + 70% active-period coverage');
    await expect(page.locator('#mcdaCriteriaStatus')).toHaveText('Live selected-period data');

    await page.locator('#mcdaResetWeights').click();
    await expect(page.locator('#mcdaWeightSalesValueLabel')).toHaveText('60%');
    await expect(page.locator('#mcdaWeightCoverageLabel')).toHaveText('40%');
    await expect(page.locator('#page-territory')).not.toContainText('Request failed: 500');
  });

  test('3. Descriptive periods use trailing windows and calendar dates for Custom', async ({ page }) => {
    const periodSelect = page.locator('#descriptivePeriodSelect')
    const comparisonSelect = page.locator('#descriptiveComparisonSelect')
    const yearWrap = page.locator('#singleYearWrap')
    await expect(periodSelect).toHaveValue('12')
    await expect(periodSelect.locator('option')).toHaveText([
      'Last 3 Months', 'Last 6 Months', 'Last 12 Months', 'All Time · Yearly', 'Custom Date Range',
    ])
    await expect(yearWrap).toBeHidden()
    await expect(page.locator('#btnYoyYear')).toHaveCount(0)
    await expect(comparisonSelect).toHaveValue('single')

    await page.selectOption('#descriptivePeriodSelect', '3');
    await expect.poll(async () => page.evaluate(() => {
      const chart = (window as any).Chart.getChart(document.getElementById('overviewBaselineChart'))
      return chart?.data?.labels?.length ?? 0
    })).toBe(3)
    await expect(page.locator('#overviewBaselineChart').locator('xpath=ancestor::div[contains(@class,"chart-card")]').locator('.chart-subtitle'))
      .toContainText('Last 3 Months')

    await page.evaluate(() => (window as any).setDescriptivePeriod('all'));
    await expect.poll(async () => page.evaluate(() => {
      const chart = (window as any).Chart.getChart(document.getElementById('overviewBaselineChart'))
      return chart?.data?.labels ?? []
    })).toEqual(expect.arrayContaining(['2017']))
    await expect(page.locator('#overviewBaselineChart').locator('xpath=ancestor::div[contains(@class,"chart-card")]').locator('.chart-subtitle'))
      .toContainText('All Time')

    await page.evaluate(() => (window as any).setComparisonMode ? (window as any).setComparisonMode('yoy') : ((document.getElementById('descriptiveComparisonSelect') as HTMLSelectElement).value = 'yoy', (document.getElementById('descriptiveComparisonSelect') as HTMLSelectElement).dispatchEvent(new Event('change', { bubbles: true }))));
    await expect.poll(async () => page.evaluate(() => {
      const chart = (window as any).Chart.getChart(document.getElementById('overviewBaselineChart'))
      return chart?.data?.datasets?.map((dataset: any) => dataset.label) ?? []
    })).toContain('Prior-year Net Sales Revenue')

    const customRange = page.locator('#customDateRangeWrap')
    const startDate = page.locator('#customDateStart')
    const endDate = page.locator('#customDateEnd')
    await startDate.evaluate((input: HTMLInputElement) => {
      input.showPicker = () => { input.dataset.calendarOpened = 'true' }
    })
    await page.evaluate(() => (window as any).setDescriptivePeriod('custom'));
    await expect(yearWrap).toBeHidden()
    await expect(customRange).toBeVisible()
    await expect(page.getByText('Historical period', { exact: true })).toHaveCSS('position', 'absolute')
    await expect(page.getByText('Historical period', { exact: true })).toHaveCSS('width', '1px')
    await expect(page.getByText('Comparison view', { exact: true })).toHaveCSS('position', 'absolute')
    await expect(customRange.getByText('From', { exact: true })).toBeVisible()
    await expect(customRange.getByText('To', { exact: true })).toBeVisible()
    await expect(startDate).toHaveAttribute('data-calendar-opened', 'true')
    await expect(startDate).toHaveAttribute('min', '2017-01-01')
    await expect(startDate).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    expect(await startDate.evaluate((input) => getComputedStyle(input).color)).not.toBe('rgb(255, 255, 255)')
    await startDate.fill('2024-01-01')
    await endDate.fill('2024-12-31')
    await expect(startDate).toHaveAttribute('max', '2024-12-31')
    await expect(endDate).toHaveAttribute('min', '2024-01-01')
    await expect.poll(async () => page.evaluate(() => {
      const chart = (window as any).Chart.getChart(document.getElementById('overviewBaselineChart'))
      return chart?.data?.labels?.length ?? 0
    })).toBe(12)

    await startDate.fill('2024-03-01')
    await endDate.fill('2024-03-20')
    await expect.poll(async () => page.evaluate(() => {
      const chart = (window as any).Chart.getChart(document.getElementById('overviewBaselineChart'))
      return chart?.data?.labels?.length ?? 0
    })).toBe(20)

    await expect(page.locator('#sectorStatus')).toContainText('weighted record equivalents', { timeout: 30000 })
    await page.evaluate(() => (window as any).setDescriptivePeriod('6'));
    await expect(yearWrap).toBeHidden()
    await expect(customRange).toBeHidden()
    const overviewSubtitle = page.locator('#overviewBaselineChart').locator('xpath=ancestor::div[contains(@class,"chart-card")]').locator('.chart-subtitle')
    await expect(overviewSubtitle).toContainText('Last 6 Months')
  });

  test('3b. Extended data pages open and unsupported dark mode is absent', async ({ page }) => {
    const salesDeepDive = page.locator('[data-sales-diagnostics-deep-dive]');

    await page.locator('.nav-item', { hasText: 'View Sales Data' }).click();
    await expect(page.locator('#topbar-title')).toHaveText('View Sales Data');
    await expectOnlyPageActive(page, 'page-sales-data');
    await expect(page.locator('#salesDataTable')).toBeVisible();
    await expect(salesDeepDive).not.toBeVisible();

    await page.locator('.nav-item', { hasText: 'Weather API Validation' }).click();
    await expectOnlyPageActive(page, 'page-weather-validation');
    await expect(page.locator('#topbar-title')).toHaveText('Weather API Validation');
    await expect(page.locator('#weatherEffectTable')).toBeVisible();
    await expect(salesDeepDive).not.toBeVisible();
  });

  test('4. Forecast horizon updates actual chart and CSV download', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Forecast Modeling' }).click();
    await expectChartRendered(page, 'forecastChart');
    await page.selectOption('#forecastHorizon', '3');
    const currentMonth = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).format(new Date());
    await expect(page.locator('#forecastWindow')).toContainText(currentMonth);
    const pending = page.waitForEvent('download');
    await page.locator('#forecastExport').click();
    const download = await pending;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const csv = Buffer.concat(chunks).toString('utf8');
    expect(csv).toContain('2026-03');
    expect(csv).toContain('Government');
    await page.screenshot({ path: 'test-results/section-8-live-forecast.png', fullPage: true });
  });
});

test('Gateway rejects anonymous access to revised analytics and uploads', async ({ request }) => {
  for (const endpoint of ['heatmap', 'sectors', 'forecast-validation', 'external-regression', 'planning-shortlist']) {
    expect((await request.get(`http://localhost:5000/api/sales/${endpoint}`)).status()).toBe(401);
  }
  for (const endpoint of ['planning-solve', 'upload']) {
    expect((await request.post(`http://localhost:5000/api/sales/${endpoint}`, { data: {} })).status()).toBe(401);
  }
});
