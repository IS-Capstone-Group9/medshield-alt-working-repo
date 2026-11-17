import { test, expect } from '@playwright/test'
import { signInToReadyDashboard, waitForReadyDashboard } from './helpers/dashboard'

test('built app restores an authenticated session and handles rapid logout once', async ({ page }, testInfo) => {
  test.setTimeout(180000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await signInToReadyDashboard(page)
  await page.reload()
  await waitForReadyDashboard(page)
  await expect(page.locator('#sidebarLogoutBtn')).toBeVisible()

  let logoutRequests = 0
  page.on('request', request => {
    const path = new URL(request.url()).pathname
    if (request.method() === 'POST' && (path === '/api/auth/logout' || path === '/auth/v1/logout')) logoutRequests++
  })
  await page.locator('#sidebarLogoutBtn').evaluate(button => {
    ;(button as HTMLButtonElement).click()
    ;(button as HTMLButtonElement).click()
  })
  await expect(page.locator('#username')).toBeVisible({ timeout: 30000 })
  expect(logoutRequests).toBe(1)
  await expect(page.locator('.medshield-root')).toHaveCount(0)
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  expect(errors).toEqual([])
  await testInfo.attach('auth-flow', { body: JSON.stringify({ actual_built_app: true, source: 'live Databricks', restored_on_reload: true, rapid_logout_requests: logoutRequests, unauthenticated_redirect: true, browser_errors: errors }), contentType: 'application/json' })
})

test('built app hides analytics during a simulated required-source outage and recovers', async ({ page }, testInfo) => {
  test.setTimeout(180000)
  await signInToReadyDashboard(page)
  await page.route('**/api/monthly*', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Isolated required-source outage' }) }))
  await page.reload()
  await expect(page.locator('.medshield-root')).toHaveAttribute('data-source-state', 'unavailable', { timeout: 90000 })
  await expect(page.locator('.medshield-root [role="alert"]')).toContainText('Databricks data is unavailable')
  await expect(page.locator('canvas, #researchExport')).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('required-source-unavailable.png'), fullPage: true })
  await page.unroute('**/api/monthly*')
  await page.reload()
  await waitForReadyDashboard(page)
  await expect(page.locator('#topbar-title')).toBeVisible()
  await testInfo.attach('source-recovery', { body: JSON.stringify({ actual_built_app: true, source_outage: 'simulated browser response only', measures_hidden: true, restored_to_live_Databricks: true, local_analytical_fallback: false }), contentType: 'application/json' })
})

test('built app rejects an invalid session cookie without showing analytics', async ({ page, context }) => {
  await context.addCookies([{ name: 'medshield.accessToken', value: 'invalid-dependency-regression-token', domain: 'localhost', path: '/' }])
  await page.goto('/')
  await expect(page.locator('#username')).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.medshield-root')).toHaveCount(0)
  const response = await page.request.get('http://localhost:5000/api/sales/predictive-research', { headers: { Authorization: 'Bearer invalid-dependency-regression-token' } })
  expect(response.status()).toBe(401)
})
