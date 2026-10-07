import { test, expect } from '@playwright/test'
import { waitForReadyDashboard } from './helpers/dashboard'

test('readiness waits for core data even when the topbar is already present', async ({ page }) => {
  await page.setContent('<div class="medshield-root" data-source-state="loading"><h1 id="topbar-title">Executive Overview</h1></div>')
  const waiting = waitForReadyDashboard(page)
  await page.locator('.medshield-root').evaluate(root => { (root as HTMLElement).dataset.sourceState = 'ready' })
  await waiting
})

test('unavailable core data fails readiness with source diagnostics', async ({ page }) => {
  await page.setContent('<div class="medshield-root" data-source-state="unavailable"><main role="alert">Databricks data is unavailable</main></div>')
  await expect(waitForReadyDashboard(page)).rejects.toThrow(/Source state: unavailable.*Databricks data is unavailable/)
})
