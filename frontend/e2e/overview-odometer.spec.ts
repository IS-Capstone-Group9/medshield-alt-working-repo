import { test, expect } from '@playwright/test';

test.describe('MedShield Executive Multi-Hazard Threat Gauge & Odometer E2E Suite', () => {
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

  test('1. Multi-Hazard Threat Odometer Dial renders on Overview page', async ({ page }) => {
    const card = page.locator('#overviewThreatOdometerCard');
    await expect(card).toBeVisible();

    // SVG Dial and Needle elements
    const needle = page.locator('#overviewThreatNeedle');
    await expect(needle).toBeVisible();

    const score = page.locator('#overviewThreatScore');
    await expect(score).toBeVisible();

    // Status Badge
    const badge = page.locator('#overviewThreatBadge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/Normal Commercial Baseline|Baseline/i);

    // Multi-factor signal bars
    await expect(page.locator('#dohSignalBar')).toBeVisible();
    await expect(page.locator('#weatherSignalBar')).toBeVisible();
    await expect(page.locator('#salesSignalBar')).toBeVisible();
    await expect(page.locator('#overviewThreatNarrative')).toBeVisible();
  });

  test('2. Dynamic Period filter triggers Needle Rotation and Zone Transition', async ({ page }) => {
    const periodSelect = page.locator('#descriptivePeriodSelect');
    await expect(periodSelect).toBeVisible();

    // Switch to Last 30 Days (Crisis / Peak Surge State)
    await periodSelect.selectOption('30d');
    await page.waitForTimeout(600);

    const badgeRed = page.locator('#overviewThreatBadge');
    await expect(badgeRed).toHaveClass(/red/);
    await expect(page.locator('#overviewThreatBadgeText')).toContainText('EPIDEMIC / DISASTER SURGE STATE');
    
    // Check needle style rotation
    const needleStyleRed = await page.locator('#overviewThreatNeedle').getAttribute('style');
    expect(needleStyleRed).toContain('rotate(');

    // Switch to Last 3 Months (Elevated Surge Watch)
    await periodSelect.selectOption('3');
    await page.waitForTimeout(600);

    const badgeAmber = page.locator('#overviewThreatBadge');
    await expect(badgeAmber).toHaveClass(/amber/);
    await expect(page.locator('#overviewThreatBadgeText')).toContainText('Elevated Surge Watch');

    // Switch to All Time · Yearly (Normalized Multi-Year Mean)
    await periodSelect.selectOption('all');
    await page.waitForTimeout(600);

    const badgeGreen = page.locator('#overviewThreatBadge');
    await expect(badgeGreen).toHaveClass(/green/);
    await expect(page.locator('#overviewThreatBadgeText')).toContainText('Multi-Year Historical Mean');
  });

  test('3. Dynamic Odometer recalculates smoothly after tab switching', async ({ page }) => {
    // Navigate to Prescriptive Planning
    await page.locator('.nav-item').filter({ hasText: 'Prescriptive Planning' }).click();
    await expect(page.locator('#page-inventory')).toBeVisible();

    // Navigate back to Executive Overview
    await page.locator('.nav-item').filter({ hasText: 'Overview' }).click();
    await expect(page.locator('#page-overview')).toBeVisible();

    // Verify gauge is active and rendered
    const card = page.locator('#overviewThreatOdometerCard');
    await expect(card).toBeVisible();
    await expect(page.locator('#overviewThreatScore')).not.toBeEmpty();
  });
});
