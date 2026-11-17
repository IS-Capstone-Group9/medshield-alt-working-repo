import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'
import { DATABRICKS_SOURCE_PAGE } from '../services/api/dashboard-markup'
import { MEDSHIELD_STYLE } from '../lib/medshieldReference'

const candidate = 'a'.repeat(64)
const corrected = 'b'.repeat(64)
const summary = (record_count: number, net_sales_php: string, gross_profit_known_php: string, gross_profit_known_records: number) => ({ record_count, net_sales_php, gross_profit_known_php, gross_profit_known_records, gross_profit_missing_records: record_count - gross_profit_known_records })
const empty = summary(0, '0.00', '0.00', 0)
const previousSeptember = summary(1, '10.00', '0.00', 0)
const previousOctober = summary(1, '20.00', '4.00', 1)
const correctedOctober = summary(2, '25.00', '5.00', 1)
const correctionFixture = {
  schema_version: 1, review_kind: 'complete_period_replacement_preview', candidate_only: true, published: false, release_authorized: false,
  completeness: 'operator_assertion_not_independently_verified', period: { start: '2026-10', end: '2026-10' },
  previous: { ingestion_id: candidate, source_sha256: 'c'.repeat(64), record_count: 2 }, corrected: { ingestion_id: corrected, source_sha256: 'd'.repeat(64), record_count: 2 },
  category_reference_sha256: 'e'.repeat(64), plan_sha256: 'f'.repeat(64),
  controls: { before: summary(2, '30.00', '4.00', 1), removed: previousOctober, added: correctedOctober, after: summary(3, '35.00', '5.00', 1) },
  scope_comparison: { unchanged_records: 0, removed_records: 1, added_records: 2 },
  monthly: [{ month: '2026-09', before: previousSeptember, removed: empty, added: empty, after: previousSeptember }, { month: '2026-10', before: previousOctober, removed: previousOctober, added: correctedOctober, after: correctedOctober }],
}
const recheckFixture = {
  schema_version: 1, status: 'MATCHES_CURRENT_CANDIDATE_CONTROLS', verification_scope: 'intake_candidate_sources_and_correction_controls',
  plan_sha256: correctionFixture.plan_sha256, checked_at: '2026-11-01T13:06:28.479Z', source_revalidated: true,
  completeness_verified: false, serving_release_verified: false, release_authorized: false, published: false,
}
const header = 'source_record_id,delivery_date,dr_number,product,area,quantity,net_sales,gross_profit'
const csv = header + '\r\nrow-1,2026-10-01,DR-1,TEST MEDICINE,TEST AREA,2,20.00,4.00\r\n'
const ready = { ingestion_id: candidate, status: 'NEEDS_REVIEW', candidate_only: true, published: false,
  counts: { received: 1, accepted: 1, rejected: 0, category_review: 1 } }

test.beforeEach(async ({ page }) => {
  await page.route('http://intake.test/', r => r.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto('http://intake.test/')
  await page.setContent(`<style>${MEDSHIELD_STYLE}</style><style>${await readFile(path.resolve('app/overrides.css'), 'utf8')}</style><style>html,body{overflow:auto!important;height:auto!important}</style><main class="medshield-root">${DATABRICKS_SOURCE_PAGE}</main>`)
  const code = ts.transpileModule(await readFile(path.resolve('services/api/sales-intake-panel.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  await page.evaluate(code => {
    const exports: any = {}
    new Function('exports', 'require', code)(exports, () => ({ API_BASE_URL: 'http://intake.test', authHeaders: async (extra?: HeadersInit) => {
      const headers = new Headers(extra); headers.set('Authorization', 'Bearer fixture-only'); return headers
    } }))
    ;(window as any).intake = exports
  }, code)
})

async function install(page: import('@playwright/test').Page, role = 'Admin') {
  await page.evaluate(role => { (window as any).disposeIntake = (window as any).intake.installSalesIntake(document.querySelector('main'), role) }, role)
}

test('modern export status displays verified stages and non-transaction counts', async ({ page }) => {
  await page.route('**/api/sales/ingestions/configuration', r => r.fulfill({ json: {
    enabled: true, policy_version: 'client_sales_csv_v1', max_bytes: 10 * 1024 * 1024, client_exports: true,
  } }))
  await page.route(`**/api/sales/ingestions/${candidate}`, r => r.fulfill({ json: {
    ...ready,
    counts: { ...ready.counts, received: 3, non_transaction: 2 },
    stages: ['bronze', 'silver', 'gold'].map(name => ({ name, state: 'SUCCEEDED', counts: {} })),
  } }))
  await install(page)
  await page.getByRole('button', { name: 'Check intake availability' }).click()
  await expect(page.getByText('Use the CSV template or a supported modern client export.', { exact: false })).toBeVisible()
  await page.getByLabel('Candidate ID', { exact: true }).fill(candidate)
  await page.getByRole('button', { name: 'Check candidate status' }).click()
  for (const stage of ['bronze', 'silver', 'gold']) {
    await expect(page.getByText(`Stage: ${stage}`, { exact: true }).locator('+ dd')).toHaveText('Done')
  }
  await expect(page.getByText('non transaction', { exact: true }).locator('+ dd')).toHaveText('2')
})

async function correctionInputs(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Check intake availability' }).click()
  await expect(page.getByLabel('Sales CSV')).toBeEnabled()
  await page.getByText('Review a complete-period correction', { exact: true }).click()
  await page.getByLabel('Candidate ID', { exact: true }).fill(candidate)
  await page.getByLabel('Corrected candidate ID', { exact: true }).fill(corrected)
  await page.getByLabel('First replacement month').fill('2026-10')
  await page.getByLabel('Last replacement month').fill('2026-10')
  await page.getByLabel('I assert that the corrected file').check()
}

test('candidate evidence recheck exports a separate point-in-time receipt without modifying the correction review', async ({ page }) => {
  const rechecks: unknown[] = []
  await page.route('http://intake.test/api/sales/ingestions**', r => {
    if (r.request().url().endsWith('/configuration')) return r.fulfill({ json: { enabled: true, max_bytes: 10485760, policy_version: 'client_sales_csv_v1' } })
    if (r.request().url().endsWith('/revalidate')) {
      expect(r.request().url()).toContain(`/${candidate}/correction-review/revalidate`)
      expect(r.request().headers()['content-type']).toBe('application/json')
      rechecks.push(r.request().postDataJSON())
      return r.fulfill({ json: recheckFixture })
    }
    return r.fulfill({ json: correctionFixture })
  })
  await install(page)
  await correctionInputs(page)
  await expect(page.getByRole('button', { name: 'Recheck candidate evidence', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Preview correction', exact: true }).click()
  await page.getByRole('button', { name: 'Recheck candidate evidence', exact: true }).click()
  await expect(page.locator('[data-intake-recheck-feedback]')).toContainText('matched at 2026-11-01T13:06:28.479Z')
  await expect(page.locator('[data-intake-recheck-feedback]')).toContainText('serving release were not verified')
  expect(rechecks).toEqual([correctionFixture])
  const receiptDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download source-check receipt JSON' }).click()
  expect(JSON.parse(await readFile((await (await receiptDownload).path())!, 'utf8'))).toEqual(recheckFixture)
  const reviewDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download correction review JSON' }).click()
  expect(JSON.parse(await readFile((await (await reviewDownload).path())!, 'utf8'))).toEqual(correctionFixture)
  await page.locator('[data-intake-recheck-feedback]').scrollIntoViewIfNeeded()
  await expect(page.locator('[data-intake-recheck-feedback]')).toBeInViewport()
  await page.screenshot({ path: path.resolve('../outputs/correction_source_recheck_20261101/source-check-ready.png'), fullPage: true })
  await page.getByLabel('Corrected candidate ID', { exact: true }).fill('c'.repeat(64))
  await expect(page.getByRole('button', { name: 'Download source-check receipt JSON' })).toBeDisabled()
  await expect(page.locator('[data-intake-recheck-feedback]')).not.toContainText('matched at')
})

test('source recheck rejects drift, malformed scope/hash/approval/date and safely recovers', async ({ page }) => {
  let mode = 'hash'
  await page.route('http://intake.test/api/sales/ingestions**', r => {
    if (r.request().url().endsWith('/configuration')) return r.fulfill({ json: { enabled: true, max_bytes: 10485760, policy_version: 'client_sales_csv_v1' } })
    if (!r.request().url().endsWith('/revalidate')) return r.fulfill({ json: correctionFixture })
    if (mode === 'drift') return r.fulfill({ status: 409, json: { error: 'secret-provider-detail' } })
    if (mode === 'bad400') return r.fulfill({ status: 400, json: { error: 'secret-provider-detail' } })
    if (mode === 'size413') return r.fulfill({ status: 413, json: { error: 'secret-provider-detail' } })
    if (mode === 'invalid-json') return r.fulfill({ contentType: 'application/json', body: 'secret-provider-detail' })
    const receipt: any = structuredClone(recheckFixture)
    if (mode === 'hash') receipt.plan_sha256 = 'a'.repeat(64)
    if (mode === 'scope') receipt.verification_scope = 'serving_release'
    if (mode === 'approval') receipt.release_authorized = true
    if (mode === 'publication') receipt.published = true
    if (mode === 'completeness') receipt.completeness_verified = true
    if (mode === 'serving') receipt.serving_release_verified = true
    if (mode === 'date') receipt.checked_at = '2026-02-30T13:06:28.479Z'
    if (mode === 'raw') receipt.raw_records = ['secret-provider-detail']
    return r.fulfill({ json: receipt })
  })
  await install(page)
  await correctionInputs(page)
  for (mode of ['hash', 'scope', 'approval', 'publication', 'completeness', 'serving', 'date', 'raw', 'drift', 'bad400', 'size413', 'invalid-json']) {
    await page.getByRole('button', { name: 'Preview correction', exact: true }).click()
    await page.getByRole('button', { name: 'Recheck candidate evidence', exact: true }).click()
    await expect(page.locator('[data-intake-feedback]')).toContainText(mode === 'drift' ? 'no longer matches current candidate controls' : mode === 'bad400' ? 'saved correction review is invalid' : mode === 'size413' ? '2 MiB request limit' : mode === 'invalid-json' ? 'response is unavailable or invalid' : 'recheck receipt is invalid')
    await expect(page.getByRole('button', { name: 'Download source-check receipt JSON' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Download correction review JSON' })).toBeDisabled()
    await expect(page.locator('[data-intake-recheck-feedback]')).not.toContainText('matched at')
    await expect(page.locator('main')).not.toContainText('secret-provider-detail')
  }
  mode = 'valid'
  await page.getByRole('button', { name: 'Preview correction', exact: true }).click()
  await page.getByRole('button', { name: 'Recheck candidate evidence', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Download source-check receipt JSON' })).toBeEnabled()
  await page.evaluate(() => document.querySelector('main')!.dispatchEvent(new Event('medshield:source-reloaded')))
  await expect(page.getByRole('button', { name: 'Download source-check receipt JSON' })).toBeDisabled()
  await expect(page.locator('[data-intake-recheck-feedback]')).not.toContainText('matched at')
})

for (const invalidation of ['source reload', 'disposal']) test(`pending source recheck cannot restore a receipt after ${invalidation}`, async ({ page }) => {
  await page.evaluate(({ review, receipt }) => {
    let resolve: (v: Response) => void
    const pending = new Promise<Response>(r => { resolve = r })
    ;(window as any).disposeIntake = (window as any).intake.installSalesIntake(document.querySelector('main'), 'Admin', (path: string) => {
      if (path.endsWith('/configuration')) return Promise.resolve(new Response(JSON.stringify({ enabled: true, max_bytes: 10485760, policy_version: 'client_sales_csv_v1' })))
      return path.endsWith('/revalidate') ? pending : Promise.resolve(new Response(JSON.stringify(review)))
    })
    ;(window as any).finish = () => resolve(new Response(JSON.stringify(receipt)))
  }, { review: correctionFixture, receipt: recheckFixture })
  await correctionInputs(page)
  await page.getByRole('button', { name: 'Preview correction', exact: true }).click()
  await page.getByRole('button', { name: 'Recheck candidate evidence', exact: true }).click()
  await expect(page.locator('.sales-intake-panel')).toHaveAttribute('aria-busy', 'true')
  await page.evaluate(invalidation => {
    if (invalidation === 'disposal') (window as any).disposeIntake()
    else document.querySelector('main')!.dispatchEvent(new Event('medshield:source-reloaded'))
    ;(window as any).finish()
  }, invalidation)
  if (invalidation === 'disposal') await expect(page.locator('.sales-intake-panel')).toHaveCount(0)
  else {
    await expect(page.getByRole('button', { name: 'Download source-check receipt JSON' })).toBeDisabled()
    await expect(page.locator('[data-intake-recheck-feedback]')).not.toContainText('matched at')
  }
})

test('correction preview replaces the scoped row set and exports only validated review controls', async ({ page }) => {
  const bodies: unknown[] = []
  await page.route('http://intake.test/api/sales/ingestions**', async r => {
    if (r.request().url().endsWith('/configuration')) return r.fulfill({ json: { enabled: true, max_bytes: 10485760, policy_version: 'client_sales_csv_v1' } })
    if (r.request().url().endsWith('/correction-review')) {
      expect(r.request().url()).toContain('/' + candidate + '/correction-review')
      expect(r.request().headers()['content-type']).toBe('application/json')
      bodies.push(r.request().postDataJSON())
      return r.fulfill({ json: correctionFixture })
    }
    return r.fulfill({ json: ready })
  })
  await install(page)
  await correctionInputs(page)
  await page.getByRole('button', { name: 'Preview correction', exact: true }).click()
  await expect(page.locator('[data-intake-correction-result]')).toContainText('3 records · ₱35.00')
  await expect(page.locator('[data-intake-correction-result]')).toContainText('2 records with unknown gross profit')
  await expect(page.locator('[data-intake-correction-feedback]')).toContainText('No release is authorized')
  expect(bodies).toEqual([{ corrected_ingestion_id: corrected, period_start: '2026-10', period_end: '2026-10', complete_period_asserted: true }])
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download correction review JSON' }).click()
  const file = await downloaded
  expect(JSON.parse(await readFile((await file.path())!, 'utf8'))).toEqual(correctionFixture)
  await page.getByLabel('First replacement month').fill('2026-09')
  await expect(page.getByRole('button', { name: 'Download correction review JSON' })).toBeDisabled()
  await expect(page.locator('[data-intake-correction-result]')).toBeHidden()
  await expect(page.getByLabel('I assert that the corrected file')).not.toBeChecked()
  await expect(page.getByRole('button', { name: 'Preview correction', exact: true })).toBeDisabled()
  await page.getByLabel('First replacement month').fill('2026-10')
  await page.getByLabel('I assert that the corrected file').check()
  await page.getByRole('button', { name: 'Preview correction', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Download correction review JSON' })).toBeEnabled()
  await page.getByRole('button', { name: 'Check candidate status' }).click()
  await expect(page.getByRole('button', { name: 'Download correction review JSON' })).toBeDisabled()
})

test('correction review rejects approval, raw fields, changed identity and inconsistent accounting; recovers after outage', async ({ page }) => {
  let mode = 'published'
  await page.route('http://intake.test/api/sales/ingestions**', r => {
    if (r.request().url().endsWith('/configuration')) return r.fulfill({ json: { enabled: true, max_bytes: 10485760, policy_version: 'client_sales_csv_v1' } })
    if (mode === 'outage') return r.fulfill({ status: 502, json: { error: 'secret-provider-detail' } })
    if (mode === 'request400') return r.fulfill({ status: 400, json: { error: 'secret-provider-detail' } })
    if (mode === 'pending409') return r.fulfill({ status: 409, json: { error: 'secret-provider-detail' } })
    if (mode === 'size413') return r.fulfill({ status: 413, json: { error: 'secret-provider-detail' } })
    const value: any = structuredClone(correctionFixture)
    if (mode === 'published') value.published = true
    if (mode === 'authorized') value.release_authorized = true
    if (mode === 'raw') value.raw_records = ['secret-provider-detail']
    if (mode === 'identity') value.previous.ingestion_id = corrected
    if (mode === 'scope') value.period.start = '2026-09'
    if (mode === 'accounting') value.controls.after.net_sales_php = '99.00'
    if (mode === 'monthly') value.monthly[0].after.net_sales_php = '0.00'
    return r.fulfill({ json: value })
  })
  await install(page)
  await correctionInputs(page)
  for (mode of ['published', 'authorized', 'raw', 'identity', 'scope', 'accounting', 'monthly']) {
    await page.getByRole('button', { name: 'Preview correction', exact: true }).click()
    await expect(page.locator('[data-intake-feedback]')).toContainText('Correction review is invalid')
    await expect(page.getByRole('button', { name: 'Download correction review JSON' })).toBeDisabled()
    await expect(page.locator('[data-intake-correction-result]')).toBeHidden()
  }
  mode = 'outage'
  await page.getByRole('button', { name: 'Preview correction', exact: true }).click()
  await expect(page.locator('[data-intake-feedback]')).toContainText('could not complete')
  await expect(page.locator('main')).not.toContainText('secret-provider-detail')
  for (const [failure, message] of [['request400', 'candidate IDs, validation reports'], ['pending409', 'verified validation reports'], ['size413', 'Send only candidate IDs']]) {
    mode = failure
    await page.getByRole('button', { name: 'Preview correction', exact: true }).click()
    await expect(page.locator('[data-intake-feedback]')).toContainText(message)
    await expect(page.getByRole('button', { name: 'Download correction review JSON' })).toBeDisabled()
    await expect(page.locator('main')).not.toContainText('secret-provider-detail')
  }
  mode = 'valid'
  await page.getByRole('button', { name: 'Preview correction', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Download correction review JSON' })).toBeEnabled()
  await page.evaluate(() => document.querySelector('main')!.dispatchEvent(new Event('medshield:source-reloaded')))
  await expect(page.getByRole('button', { name: 'Download correction review JSON' })).toBeDisabled()
  await expect(page.getByLabel('I assert that the corrected file')).not.toBeChecked()
})

test('correction inputs reject unasserted or identical candidates and pending source invalidation cannot restore preview', async ({ page }) => {
  await page.evaluate(fixture => {
    let resolve: (v: Response) => void
    const pending = new Promise<Response>(r => { resolve = r })
    ;(window as any).disposeIntake = (window as any).intake.installSalesIntake(document.querySelector('main'), 'Admin', (path: string) => path.endsWith('/configuration') ? Promise.resolve(new Response(JSON.stringify({ enabled: true, max_bytes: 10485760, policy_version: 'client_sales_csv_v1' }))) : pending)
    ;(window as any).finish = () => resolve(new Response(JSON.stringify(fixture)))
  }, correctionFixture)
  await correctionInputs(page)
  await page.getByLabel('I assert that the corrected file').uncheck()
  await expect(page.getByRole('button', { name: 'Preview correction', exact: true })).toBeDisabled()
  await page.getByLabel('Corrected candidate ID', { exact: true }).fill(candidate)
  await page.getByLabel('I assert that the corrected file').check()
  await expect(page.getByRole('button', { name: 'Preview correction', exact: true })).toBeDisabled()
  await page.getByLabel('Corrected candidate ID', { exact: true }).fill(corrected)
  await page.getByLabel('I assert that the corrected file').check()
  await page.getByRole('button', { name: 'Preview correction', exact: true }).click()
  await expect(page.locator('.sales-intake-panel')).toHaveAttribute('aria-busy', 'true')
  await page.evaluate(() => { document.querySelector('main')!.dispatchEvent(new Event('medshield:source-reloaded')); (window as any).finish() })
  await expect(page.locator('.sales-intake-panel')).toHaveAttribute('aria-busy', 'false')
  await expect(page.getByRole('button', { name: 'Download correction review JSON' })).toBeDisabled()
  await expect(page.locator('[data-intake-correction-result]')).toBeHidden()
  await page.evaluate(() => (window as any).disposeIntake())
  await expect(page.locator('.sales-intake-panel')).toHaveCount(0)
})

test('source invalidation clears review state without cancelling an explicit pending submission', async ({ page }) => {
  await page.evaluate(receipt => {
    let resolve: (v: Response) => void
    const pending = new Promise<Response>(r => { resolve = r })
    ;(window as any).disposeIntake = (window as any).intake.installSalesIntake(document.querySelector('main'), 'Admin', (path: string, init: RequestInit) => {
      if (path.endsWith('/configuration')) return Promise.resolve(new Response(JSON.stringify({ enabled: true, max_bytes: 10485760, policy_version: 'client_sales_csv_v1' })))
      ;(window as any).submissionSignal = init.signal
      return pending
    })
    ;(window as any).finish = () => resolve(new Response(JSON.stringify(receipt)))
  }, { ...ready, status: 'QUEUED', run_id: 12 })
  await page.getByRole('button', { name: 'Check intake availability' }).click()
  await page.getByLabel('Sales CSV').setInputFiles({ name: 'sales.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await page.getByRole('button', { name: 'Submit candidate', exact: true }).click()
  await expect(page.locator('.sales-intake-panel')).toHaveAttribute('aria-busy', 'true')
  await page.evaluate(() => document.querySelector('main')!.dispatchEvent(new Event('medshield:source-reloaded')))
  expect(await page.evaluate(() => (window as any).submissionSignal.aborted)).toBe(false)
  await expect(page.locator('.sales-intake-panel')).toHaveAttribute('aria-busy', 'true')
  await page.evaluate(() => (window as any).finish())
  await expect(page.getByLabel('Candidate ID', { exact: true })).toHaveValue(candidate)
  await expect(page.locator('[data-intake-feedback]')).toContainText('Candidate queued')
  await expect(page.locator('[data-intake-review-download]')).toBeDisabled()
})

test('candidate submission, retry, status, reports and manual resume preserve publication boundary', async ({ page }) => {
  const submissions: string[] = []
  await page.route('http://intake.test/api/sales/ingestions**', async r => {
    expect(r.request().headers().authorization).toBe('Bearer fixture-only')
    const url = r.request().url()
    if (url.endsWith('/configuration')) return r.fulfill({ json: { enabled: true, max_bytes: 10485760, policy_version: 'client_sales_csv_v1' } })
    if (url.endsWith('/template')) return r.fulfill({ contentType: 'text/csv', body: header + '\r\n' })
    if (r.request().method() === 'POST') {
      expect(r.request().headers()['content-type']).toBe('text/csv')
      submissions.push(r.request().postData()!)
      return r.fulfill({ status: 202, json: { ...ready, status: 'QUEUED', run_id: 12 } })
    }
    if (url.includes('/reports/')) return r.fulfill({ contentType: 'text/csv', body: 'row_number,issue\r\n1,CATEGORY_REVIEW_REQUIRED\r\n' })
    return r.fulfill({ json: ready })
  })
  await install(page)
  await expect(page.getByRole('button', { name: 'Submit candidate', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Check intake availability' }).click()
  await expect(page.getByRole('button', { name: 'Download CSV template' })).toBeEnabled()
  const template = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download CSV template' }).click()
  expect((await template).suggestedFilename()).toBe('medshield-sales-template.csv')
  await page.getByLabel('Sales CSV').setInputFiles({ name: 'sales.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  expect(submissions).toHaveLength(0)
  await page.getByRole('button', { name: 'Submit candidate', exact: true }).click()
  await expect(page.getByLabel('Candidate ID', { exact: true })).toHaveValue(candidate)
  await expect(page.locator('[data-intake-feedback]')).toContainText('Candidate queued')
  await page.getByRole('button', { name: 'Submit candidate', exact: true }).click()
  await expect.poll(() => submissions.length).toBe(2)
  expect(submissions).toEqual([csv, csv])
  await page.getByRole('button', { name: 'Check candidate status' }).click()
  await expect(page.locator('[data-intake-result]')).toContainText('NEEDS REVIEW')
  await expect(page.locator('[data-intake-result]')).toContainText('No — dashboard release unchanged')
  const report = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download issues' }).click()
  expect((await report).suggestedFilename()).toContain('issues.csv')
  await page.getByLabel('Candidate ID', { exact: true }).fill('b'.repeat(64))
  await expect(page.getByRole('button', { name: 'Download issues' })).toBeDisabled()
  await expect(page.locator('[data-intake-result]')).toBeHidden()
  await page.getByLabel('Candidate ID', { exact: true }).fill(candidate)
  await page.getByRole('button', { name: 'Check candidate status' }).click()
  await expect(page.getByRole('button', { name: 'Download categories' })).toBeEnabled()
})

test('unconfigured intake, invalid file, provider outage and malformed report clear results', async ({ page }) => {
  let mode = 'disabled'
  await page.route('http://intake.test/api/sales/ingestions**', r => {
    if (mode === 'disabled') return r.fulfill({ status: 503, json: { error: 'secret-provider-detail' } })
    if (r.request().url().endsWith('/configuration')) return r.fulfill({ json: { enabled: true, max_bytes: 10485760, policy_version: 'client_sales_csv_v1' } })
    if (mode === 'outage') return r.fulfill({ status: 502, json: { error: 'secret-provider-detail' } })
    if (mode === 'bad-json') return r.fulfill({ contentType: 'application/json', body: 'secret-provider-detail' })
    return r.fulfill({ json: mode === 'malformed' ? { ...ready, published: true } : ready })
  })
  await install(page)
  await page.getByRole('button', { name: 'Check intake availability' }).click()
  await expect(page.locator('[data-intake-feedback]')).toContainText('not configured')
  await expect(page.getByLabel('Sales CSV')).toBeDisabled()
  await expect(page.locator('main')).not.toContainText('secret-provider-detail')
  mode = 'ready'
  await page.getByRole('button', { name: 'Check intake availability' }).click()
  await page.getByLabel('Sales CSV').setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from(csv) })
  await expect(page.locator('[data-intake-selection]')).toContainText('nonempty .csv')
  await page.getByLabel('Candidate ID', { exact: true }).fill(candidate)
  await page.getByRole('button', { name: 'Check candidate status' }).click()
  await expect(page.getByRole('button', { name: 'Download issues' })).toBeEnabled()
  mode = 'outage'
  await page.getByRole('button', { name: 'Check candidate status' }).click()
  await expect(page.locator('[data-intake-feedback]')).toContainText('could not complete')
  await expect(page.locator('[data-intake-result]')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Download issues' })).toBeDisabled()
  mode = 'malformed'
  await page.getByRole('button', { name: 'Check candidate status' }).click()
  await expect(page.locator('[data-intake-feedback]')).toContainText('status is invalid')
  await expect(page.getByRole('button', { name: 'Download issues' })).toBeDisabled()
  mode = 'bad-json'
  await page.getByRole('button', { name: 'Check candidate status' }).click()
  await expect(page.locator('[data-intake-feedback]')).toContainText('response is unavailable or invalid')
  await expect(page.locator('main')).not.toContainText('secret-provider-detail')
})

test('pending disposal cannot mutate or download and duplicate installation is cleaned up', async ({ page }) => {
  await install(page, 'Viewer')
  await expect(page.locator('.sales-intake-panel')).toHaveCount(0)
  await page.evaluate(() => {
    let resolve: (v: Response) => void
    const pending = new Promise<Response>(r => { resolve = r })
    ;(window as any).disposeIntake = (window as any).intake.installSalesIntake(document.querySelector('main'), 'Admin', () => pending)
    ;(window as any).finish = () => resolve(new Response(JSON.stringify({ enabled: true, max_bytes: 10485760, policy_version: 'client_sales_csv_v1' })))
  })
  await page.getByRole('button', { name: 'Check intake availability' }).click()
  await expect(page.locator('.sales-intake-panel')).toHaveAttribute('aria-busy', 'true')
  await page.evaluate(() => { (window as any).disposeIntake(); (window as any).finish() })
  await expect(page.locator('.sales-intake-panel')).toHaveCount(0)
  await install(page)
  await expect(page.locator('.sales-intake-panel')).toHaveCount(1)
})

for (const width of [1280, 390]) test(`keyboard and layout at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await install(page)
  await page.getByRole('button', { name: 'Check intake availability' }).focus()
  await expect(page.getByRole('button', { name: 'Check intake availability' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Candidate ID', { exact: true })).toBeFocused()
  await page.locator('[data-intake-feedback]').scrollIntoViewIfNeeded()
  await expect(page.locator('[data-intake-feedback]')).toBeInViewport()
  await page.getByText('Review a complete-period correction', { exact: true }).click()
  await page.getByLabel('Corrected candidate ID', { exact: true }).focus()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: path.resolve(`../outputs/correction_source_recheck_20261101/intake-${width}.png`), fullPage: true })
})
