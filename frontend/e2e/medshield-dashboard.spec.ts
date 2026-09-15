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
    await page.fill('#password', process.env.MEDSHIELD_E2E_PASSWORD || 'medshield2025');
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
    await expect(kpiTotalRevenue).toContainText('â‚±');

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
    await expect(page.locator('#sectorProfileTable')).toBeVisible();
    await page.selectOption('#sectorCluster', 'Private');
    await expect(page.locator('#sectorStatus')).toContainText('No private records');

    // 2.4 Forecast Modeling
    await page.locator('.nav-item', { hasText: 'Forecast Modeling' }).click();
    await expect(page.locator('#topbar-title')).toHaveText('Forecast Modeling');
    await expectOnlyPageActive(page, 'page-forecast');
    await expect(salesDeepDive).not.toBeVisible();
    await expect(page.locator('#forecastChart')).toBeVisible();
    await expect(page.locator('#regMetrics')).toContainText('MAE');
    await expectChartRendered(page, 'forecastChart');
    await expectChartRendered(page, 'regPredictionChart');

    // 2.5 Prescriptive Planning
    await page.locator('.nav-item', { hasText: 'Prescriptive Planning' }).click();
    await expect(page.locator('#topbar-title')).toHaveText('Prescriptive Planning');
    await expectOnlyPageActive(page, 'page-inventory');
    await expect(salesDeepDive).not.toBeVisible();
    await expect(page.locator('#planInputs tbody tr')).toHaveCount(5);
    await expectChartRendered(page, 'planParetoChart');
    await expect(page.locator('#planExport')).toBeDisabled();

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

    // Overview Chart should align the selected comparison pair by month.
    await expect(page.locator('#overviewBaselineChart')).toBeVisible();
    await expect.poll(async () => page.evaluate(() => {
      const chartApi = (window as any).Chart
      const canvas = document.getElementById('overviewBaselineChart')
      const chart = canvas ? chartApi?.getChart?.(canvas) : null
      return chart?.data?.labels?.map(String) ?? []
    })).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])
    await expect.poll(async () => page.evaluate(() => {
      const chartApi = (window as any).Chart
      const canvas = document.getElementById('overviewBaselineChart')
      const chart = canvas ? chartApi?.getChart?.(canvas) : null
      return chart?.data?.datasets?.map((dataset: { label?: string }) => dataset.label) ?? []
    })).toEqual(['Revenue 2023 (Compare)', 'Revenue 2025 (Base)'])

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
    })).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])
    await expect.poll(async () => page.evaluate(() => {
      const chartApi = (window as any).Chart
      const canvas = document.getElementById('overviewBaselineChart')
      const chart = canvas ? chartApi?.getChart?.(canvas) : null
      return chart?.data?.datasets?.map((dataset: { label?: string }) => dataset.label) ?? []
    })).toEqual(['Net Sales Revenue 2024', 'Gross Profit 2024'])
    await expect(page.locator('#overviewBaselineChart').locator('xpath=ancestor::div[contains(@class,"chart-card")]').locator('.chart-subtitle'))
      .toHaveText('January–December performance for 2024')

    await yearSelect.selectOption('all')
    await expect.poll(async () => page.evaluate(() => {
      const chartApi = (window as any).Chart
      const canvas = document.getElementById('overviewBaselineChart')
      const chart = canvas ? chartApi?.getChart?.(canvas) : null
      const labels = chart?.data?.labels?.map(String) ?? []
      const currentYear = new Date().getFullYear()
      return labels[0] === '2017'
        && labels.at(-1)?.startsWith(String(currentYear)) === true
        && labels.every((label: string) => {
          const year = Number.parseInt(label, 10)
          return year >= 2017 && year <= currentYear
        })
    })).toBe(true)
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
