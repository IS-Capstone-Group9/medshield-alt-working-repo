import { test, expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { signInToReadyDashboard, waitForReadyDashboard } from './helpers/dashboard'

test.use({ trace: 'off', video: 'off', screenshot: 'off' })

for (const failure of ['503', 'network'] as const) {
  test(`T09 built app clears analytics on ${failure} source failure and restores the same candidate`, async ({ page }, testInfo) => {
    test.setTimeout(240000)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    // Read via the route API before delivery: a reload can invalidate Chrome's
    // response-body handle even when a response listener reads immediately.
    const statusReleases: any[] = []
    await page.route('**/api/dashboard_status*', async route => {
      const response = await route.fetch()
      if (response.status() === 200) statusReleases.push((await response.json()).release)
      await route.fulfill({ response })
    })
    await signInToReadyDashboard(page)
    expect(statusReleases.length).toBeGreaterThan(0)
    const before = statusReleases.at(-1)
    expect(before.fact_delta_version).toBe(20)
    await expect(page.locator('canvas').first()).toBeAttached()
    let injected = 0
    await page.route('**/api/monthly*', route => {
      injected++
      return failure === '503' ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Isolated T09 browser simulation"}' }) : route.abort('failed')
    })
    await page.reload()
    await expect(page.locator('.medshield-root')).toHaveAttribute('data-source-state', 'unavailable', { timeout: 90000 })
    const alert = page.locator('.medshield-root [role="alert"]')
    await expect(alert).toContainText('Databricks data is unavailable')
    await expect(alert).toContainText('Charts and values are unavailable')
    await expect(alert).toContainText('Reload this page to retry')
    await expect(page.locator('canvas, #researchExport, #areaRankingExport, #planExport, #productPriorityTable')).toHaveCount(0)
    expect(injected).toBeGreaterThan(0)
    await alert.screenshot({ path: testInfo.outputPath('source-unavailable.png') })
    await page.unroute('**/api/monthly*')
    const previousStatusCount = statusReleases.length
    await page.reload()
    await waitForReadyDashboard(page)
    expect(statusReleases.length).toBeGreaterThan(previousStatusCount)
    const after = statusReleases.at(-1)
    expect(after).toEqual(before)
    await expect(page.locator('.data-freshness-bar')).toContainText('Release approval pending')
    await expect(page.locator('canvas').first()).toBeAttached()
    await expect(page.locator('.medshield-root [role="alert"]')).toHaveCount(0)
    expect(errors).toEqual([])
    const receipt = { checked_at_utc: new Date().toISOString(), failure, injection: 'Browser response/transport only; actual warehouse was not interrupted', injected_requests: injected,
      previous_charts_and_exports_removed: true, explicit_unavailable: true, recovery: 'Remove browser override and reload', restored_same_source_identity: after,
      candidate_label_preserved: true, browser_errors: errors, no_saved_auth_storage: true,
      limits: ['One configured session; not all roles or full disaster/backup restoration.', 'No claim that a real provider outage or hosted deployment was tested.'] }
    await writeFile(testInfo.outputPath('recovery.json'), JSON.stringify(receipt, null, 2))
    await testInfo.attach('source-recovery', { body: JSON.stringify(receipt), contentType: 'application/json' })
  })
}
