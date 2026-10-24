import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e', testMatch: 'commercial-*.spec.ts', timeout: 45000,
  use: { baseURL: process.env.COMMERCIAL_BASE_URL || 'http://localhost:3001', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
