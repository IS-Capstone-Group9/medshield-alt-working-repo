import { test, expect } from '@playwright/test'
import { signInToReadyDashboard, waitForReadyDashboard } from './helpers/dashboard'

test.use({ trace: 'off', video: 'off', screenshot: 'off' })

test('authentication outage hides analytics, identifies the dependency and retries to live data', async ({ page }, testInfo) => {
  test.setTimeout(180000)
  const errors: string[] = [], warnings: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'warning' && message.text().startsWith('Dashboard request unavailable:')) warnings.push(message.text())
  })
  await signInToReadyDashboard(page)
  await page.route('**/api/monthly*', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Authentication service is unavailable', code: 'AUTHENTICATION_UNAVAILABLE' }) }))
  await page.reload()
  await expect(page.locator('.medshield-root')).toHaveAttribute('data-source-state', 'unavailable', { timeout: 90000 })
  const alert = page.locator('.medshield-root [role="alert"]')
  await expect(alert).toContainText('Authentication service is unavailable')
  await expect(alert).toContainText('Your session could not be verified')
  await expect(page.locator('canvas, #researchExport, #areaRankingExport, #planExport')).toHaveCount(0)
  await expect.poll(() => warnings.length).toBeGreaterThan(0)
  expect(warnings.at(-1)).toContain('503 AUTHENTICATION_UNAVAILABLE; /api/monthly')
  await alert.screenshot({ path: testInfo.outputPath('authentication-unavailable.png') })
  await page.unroute('**/api/monthly*')
  await alert.getByRole('button', { name: 'Retry loading dashboard' }).click()
  await waitForReadyDashboard(page)
  await expect(page.locator('canvas').first()).toBeAttached()
  await expect(page.locator('.medshield-root [role="alert"]')).toHaveCount(0)
  expect(errors).toEqual([])
  await testInfo.attach('auth-outage-recovery', { body: JSON.stringify({ live_login_and_core_data: true, outage: 'Browser-only 503 simulation; provider was not interrupted', data_hidden_during_auth_outage: true, retry_returned_to_live_data: true, uncaught_errors: errors, safe_gateway_warning: warnings.at(-1) }), contentType: 'application/json' })
})
