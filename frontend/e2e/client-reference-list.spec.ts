import { test, expect } from '@playwright/test';
import { signInToReadyDashboard } from './helpers/dashboard'

test.describe('Mapped Client Reference Directory E2E Suite', () => {
  test.setTimeout(150000);
  test.beforeEach(async ({ page }) => {
    await signInToReadyDashboard(page)
  });

  test('Client Reference Registry renders in Area Prioritization with search, filtering, and pagination', async ({ page }) => {
    // 1. Navigate to Area Prioritization
    await page.locator('.nav-item', { hasText: 'Area Prioritization' }).click();
    await expect(page.locator('#topbar-title')).toHaveText('Area Prioritization');

    // 2. Verify Client Reference Section exists below Area Prioritization
    const clientSection = page.locator('#clientReferenceSection');
    await expect(clientSection).toBeVisible();
    await expect(page.locator('#clientRefCountBadge')).toContainText('782 Mapped Accounts');

    // 3. Verify Table Rows Rendered
    const rows = page.locator('#clientReferenceTableBody tr');
    await expect(rows).toHaveCount(25);

    // 4. Test Search by Client Code
    await page.fill('#clientRefSearch', 'CLI-0002');
    await expect(page.locator('#clientReferenceTableBody')).toContainText('DOH Central');
    await expect(page.locator('#clientRefCountBadge')).toContainText('1 Mapped Accounts');

    // 5. Clear Search & Filter by Province
    await page.fill('#clientRefSearch', '');
    await page.selectOption('#clientRefProvince', 'Batangas');
    await expect(page.locator('#clientReferenceTableBody')).toContainText('Batangas');
    await expect(page.locator('#clientRefCountBadge')).toContainText('Mapped Accounts');

    // 6. Test Pagination
    await page.selectOption('#clientRefProvince', '');
    await page.click('#clientRefNextBtn');
    await expect(page.locator('#clientRefPageLabel')).toHaveText('Page 2 of 32');
    await page.click('#clientRefPrevBtn');
    await expect(page.locator('#clientRefPageLabel')).toHaveText('Page 1 of 32');
  });
});
