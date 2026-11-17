import { test, expect, type Page } from '@playwright/test'
import { signInToReadyDashboard } from './helpers/dashboard'

for (const absent of ['MEDSHIELD_E2E_USERNAME', 'MEDSHIELD_E2E_PASSWORD']) {
  test(`live helper refuses missing ${absent} before navigating`, async () => {
    const previous = {
      MEDSHIELD_E2E_USERNAME: process.env.MEDSHIELD_E2E_USERNAME,
      MEDSHIELD_E2E_PASSWORD: process.env.MEDSHIELD_E2E_PASSWORD,
    }
    let navigated = false
    const page = { goto: async () => { navigated = true } } as unknown as Page
    try {
      // Synthetic fixture values only; no real account is contacted.
      process.env.MEDSHIELD_E2E_USERNAME = 'fixture-user'
      process.env.MEDSHIELD_E2E_PASSWORD = 'fixture-only'
      delete process.env[absent]
      await expect(signInToReadyDashboard(page)).rejects.toThrow('through the process environment')
      expect(navigated).toBe(false)
    } finally {
      for (const [name, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[name]
        else process.env[name] = value
      }
    }
  })
}
