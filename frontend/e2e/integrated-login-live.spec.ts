import { writeFile } from 'node:fs/promises'
import { test, expect } from '@playwright/test'
import { signInToReadyDashboard, waitForReadyDashboard } from './helpers/dashboard'

// Traces, video and automatic error screenshots can retain credential fields.
test.use({ trace: 'off', video: 'off', screenshot: 'off' })

test('current app authenticates, loads the pinned live source, restores and rejects malformed sessions', async ({ page, context, request }, testInfo) => {
  test.setTimeout(240000)
  const expectedVersion = process.env.MEDSHIELD_E2E_FACT_VERSION
  expect(expectedVersion, 'Set the reviewed fact pin for this live integration').toMatch(/^\d+$/)
  const corePaths = ['/api/dashboard_status', '/api/summary', '/api/monthly', '/api/by_area', '/api/products',
    '/api/year_summary', '/api/seasonality', '/api/forecasts', '/api/external_signals',
    '/api/inventory_recommendations', '/api/regional_priorities', '/api/model_evaluation']
  const observed = new Map<string, number>()
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => {
    const url = new URL(response.url())
    if (url.origin === 'http://localhost:5000' && corePaths.includes(url.pathname)) observed.set(url.pathname, response.status())
  })
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.locator('.medshield-root')).toHaveCount(0)
  const sourceResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/dashboard_status' && response.status() === 200)
  const started = Date.now()
  await signInToReadyDashboard(page)
  const readyMs = Date.now() - started
  const source = await (await sourceResponse).json()
  expect(source.source).toBe('databricks')
  expect(source.mode).toBe('live')
  expect(String(source.release.fact_delta_version)).toBe(expectedVersion)
  expect(typeof source.release.dataset_id).toBe('string')
  expect(typeof source.release.policy_version).toBe('string')
  const provenance = page.locator('.data-freshness-bar')
  await expect(provenance).toHaveAttribute('data-source', 'databricks')
  await expect(provenance).toHaveAttribute('data-mode', 'live')
  await expect(provenance).toContainText('Databricks Gold')
  await expect(provenance).toContainText(`Fact version ${expectedVersion}`)
  await expect(provenance).toContainText('Release approval pending')
  await expect.poll(() => observed.size).toBe(corePaths.length)
  expect([...observed.values()].every(status => status === 200)).toBeTruthy()
  await expect(page.locator('.dashboard-loading-overlay')).toHaveCount(0)
  await expect(page.locator('#sidebarLogoutBtn')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('dashboard-ready-desktop.png'), fullPage: true, mask: [page.locator('.sidebar-user')] })

  const authCookieNames = (await context.cookies()).map(cookie => cookie.name)
    .filter(name => /^sb-.*-auth-token(?:\.\d+)?$/.test(name))
  expect(authCookieNames.length, 'Configured Supabase session cookie must exist').toBeGreaterThan(0)
  const cookieName = authCookieNames[0].replace(/\.\d+$/, '')
  const reloadStarted = Date.now()
  await page.reload()
  await waitForReadyDashboard(page)
  const reloadMs = Date.now() - reloadStarted
  await expect(provenance).toContainText(`Fact version ${expectedVersion}`)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('#topbar-title')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('dashboard-ready-mobile.png'), fullPage: true, mask: [page.locator('.sidebar-user')] })

  await page.setViewportSize({ width: 1280, height: 720 })
  await page.locator('#sidebarLogoutBtn').click()
  await expect(page.locator('#username')).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.medshield-root')).toHaveCount(0)
  await context.clearCookies()
  await page.evaluate(() => { window.localStorage.clear(); window.sessionStorage.clear() })
  // Use the actual configured SSR cookie name, never a stored valid session.
  await context.addCookies([{ name: cookieName, value: 'malformed-t09-session', domain: 'localhost', path: '/' }])
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.locator('#username')).toBeVisible()
  await expect(page.locator('.medshield-root')).toHaveCount(0)
  const invalid = await request.get('http://localhost:5000/api/dashboard_status', { headers: { Authorization: 'Bearer invalid-t09-session' } })
  expect(invalid.status()).toBe(401)
  expect(errors).toEqual([])
  const evidence = { checked_at_utc: new Date().toISOString(), scope: 'T09 step 1 actual built app and configured gateway',
    unauthenticated_redirect: true, initial_ready: true, authenticated_reload_ready: true, logout_hides_analytics: true,
    malformed_actual_supabase_cookie_denied: true, invalid_gateway_bearer_status: invalid.status(),
    core_http_statuses: Object.fromEntries(observed), source: { source: source.source, mode: source.mode,
      dataset_id: source.release.dataset_id, fact_delta_version: source.release.fact_delta_version, policy_version: source.release.policy_version },
    candidate_label_visible: true, ready_ms: readyMs, reload_ms: reloadMs, browser_errors: errors,
    screenshots_mask_account_details: true, no_saved_tokens_cookies_or_trace: true,
    limits: ['One configured linked administrator session; not all roles.', 'No module/filter/export or failure-recovery acceptance in this step.', 'Existing build reused; build-time environment reproducibility not independently established.'] }
  await writeFile(testInfo.outputPath('login-readiness.json'), JSON.stringify(evidence, null, 2))
  await testInfo.attach('login-readiness', { body: JSON.stringify(evidence), contentType: 'application/json' })
})
