import { expect, type Page } from '@playwright/test'

export async function signInToReadyDashboard(page: Page) {
  await page.goto('/login')
  await page.fill('#username', process.env.MEDSHIELD_E2E_USERNAME || 'admin')
  await page.fill('#password', process.env.MEDSHIELD_E2E_PASSWORD || 'Medshield!2025')
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await page.waitForURL('**/', { timeout: 30000 })
  await waitForReadyDashboard(page)
}

export async function waitForReadyDashboard(page: Page) {
  const root = page.locator('.medshield-root')
  try {
    await expect.poll(() => root.getAttribute('data-source-state'), {
      timeout: 90000, message: 'Dashboard must finish the Databricks loading gate',
    }).toMatch(/^(ready|unavailable)$/)
    await expect(root, 'Databricks core data must be ready before dashboard assertions').toHaveAttribute('data-source-state', 'ready')
  } catch (error) {
    const diagnostic = await page.locator('.data-freshness-bar, .medshield-root [role="alert"]').first().textContent({ timeout: 1000 }).catch(() => null)
    throw new Error(`Dashboard readiness failed. Source state: ${await root.getAttribute('data-source-state').catch(() => null)}. Provenance: ${diagnostic ?? 'not rendered'}`, { cause: error })
  }
  await expect(page.locator('#topbar-title')).toBeVisible()
}
