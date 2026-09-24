import { test, expect } from '@playwright/test';

test.describe('MedShield Executive Evidence Readiness & Decision Story', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && message.text().includes('Failed to initialize the MedShield dashboard runtime')) {
        runtimeErrors.push(message.text());
      }
    });

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
    expect(runtimeErrors, 'dashboard runtime must initialize without errors').toEqual([]);
  });

  test('1. External-signal readiness is explicit and does not present an unsupported live score', async ({ page }) => {
    const card = page.locator('#overviewThreatOdometerCard');
    await expect(card).toBeVisible();
    await expect(card).toContainText('External Signal Evidence Readiness');
    await expect(card).toContainText('NOT PUBLISHED');
    await expect(card).toContainText('DOH surveillance');
    await expect(card).toContainText('PAGASA weather');
    await expect(card).toContainText('Inventory controls');
    await expect(page.locator('#overviewThreatScore')).toHaveCount(0);
    await expect(page.locator('#overviewThreatNeedle')).toHaveCount(0);
  });

  test('2. Period changes do not synthesize a hazard state', async ({ page }) => {
    const periodSelect = page.locator('#descriptivePeriodSelect');
    await expect(periodSelect).toBeVisible();
    await periodSelect.selectOption('3');
    await expect(page.locator('#overviewThreatOdometerCard')).toContainText('NOT PUBLISHED');
    await expect(page.locator('#overviewThreatBadgeText')).toHaveCount(0);
  });

  test('3. Capstone scope applies 2021–2025 and the story opens regional prioritization', async ({ page }) => {
    await page.locator('#analysisScopeSelect').selectOption('capstone');
    await expect(page.locator('#customDateStart')).toHaveValue('2021-01-01');
    await expect(page.locator('#customDateEnd')).toHaveValue('2025-12-31');
    await page.locator('[data-story-page="territory"]').click();
    await expect(page.locator('#page-territory')).toBeVisible();
    await expect(page.locator('#areaRegionRollupGrid')).toContainText('Total Regional Rollup', { timeout: 30000 });
  });
});
