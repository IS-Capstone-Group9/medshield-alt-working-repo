import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rmdir, unlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { ReviewIntegrityError, verifyCorrectionReview } from '../src/correctionReviewIntegrity'
import { MAX_REVIEW_BYTES, verifyCorrectionFile } from '../scripts/verify-intake-correction'

const s = (n: number, net: string, known = n, profit = '0.00') => ({ record_count: n, net_sales_php: net, gross_profit_known_php: profit, gross_profit_known_records: known, gross_profit_missing_records: n - known })
const empty = s(0, '0.00')
function fixture() {
  const beforeSep = s(1, '100.00'), beforeOct = s(2, '8.00', 1, '2.00'), afterOct = s(2, '10.00', 1, '3.00')
  const unsigned = { schema_version: 1, review_kind: 'complete_period_replacement_preview', candidate_only: true, published: false, release_authorized: false, completeness: 'operator_assertion_not_independently_verified',
    period: { start: '2026-10', end: '2026-10' }, previous: { ingestion_id: 'a'.repeat(64), source_sha256: 'c'.repeat(64), record_count: 3 }, corrected: { ingestion_id: 'b'.repeat(64), source_sha256: 'd'.repeat(64), record_count: 2 }, category_reference_sha256: 'e'.repeat(64),
    controls: { before: s(3, '108.00', 2, '2.00'), removed: beforeOct, added: afterOct, after: s(3, '110.00', 2, '3.00') }, scope_comparison: { unchanged_records: 1, removed_records: 1, added_records: 1 },
    monthly: [{ month: '2026-09', before: beforeSep, removed: empty, added: empty, after: beforeSep }, { month: '2026-10', before: beforeOct, removed: beforeOct, added: afterOct, after: afterOct }] }
  return JSON.parse(JSON.stringify({ ...unsigned, plan_sha256: createHash('sha256').update(JSON.stringify(unsigned)).digest('hex') }))
}
test('local review integrity passes exact accounting/digest but explicitly denies source/approval attestation', () => {
  const result = verifyCorrectionReview(fixture())
  assert.equal(result.status, 'PASS_LOCAL_REVIEW_INTEGRITY')
  assert.equal(result.source_revalidated, false); assert.equal(result.completeness_verified, false)
  assert.equal(result.release_authorized, false); assert.equal(result.published, false)
  assert.equal(result.monthly_controls_checked, 2)
})
test('nested property reorder, pretty print and UTF8 roundtrip do not change gateway canonical digest', () => {
  const reorder = (value: any): any => Array.isArray(value) ? value.map(reorder) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).reverse().map(([k, v]) => [k, reorder(v)])) : value
  assert.deepEqual(verifyCorrectionReview(JSON.parse(JSON.stringify(reorder(fixture()), null, 2))), verifyCorrectionReview(fixture()))
})
const corruptions: Record<string, (v: any) => void> = {
  digest: v => { v.plan_sha256 = '0'.repeat(64) },
  raw: v => { v.raw_records = ['PRIVATE-TEST-SECRET'] },
  approved: v => { v.release_authorized = true },
  published: v => { v.published = true },
  completeness: v => { v.completeness = 'verified' },
  identity: v => { v.corrected.ingestion_id = v.previous.ingestion_id },
  recordLimit: v => { v.previous.record_count = 100001 },
  fractionalCount: v => { v.controls.before.record_count = 1.5 },
  money: v => { v.controls.after.net_sales_php = '110.001' },
  negativeZero: v => { v.monthly[0].before.gross_profit_known_php = '-0.00' },
  unknownGross: v => { v.controls.after.gross_profit_missing_records = 0 },
  monthlyMismatch: v => { v.monthly[1].after.net_sales_php = '111.00' },
  monthlyOrder: v => { v.monthly.reverse() },
  monthlyDuplicate: v => { v.monthly.push(v.monthly[0]) },
  monthlyEmpty: v => { v.monthly = [] },
  monthLimit: v => { v.monthly = Array(1201).fill(v.monthly[0]) },
  scopeReverse: v => { v.period.end = '2026-09' },
  scopePartial: v => { v.period.start = '2026-09' },
  comparison: v => { v.scope_comparison.unchanged_records = 3 },
  nestedRaw: v => { v.previous.rows = ['PRIVATE-TEST-SECRET'] },
}
for (const [name, mutate] of Object.entries(corruptions)) test('rejects ' + name, () => {
  const value = fixture(); mutate(value)
  assert.throws(() => verifyCorrectionReview(value), ReviewIntegrityError)
})
test('read-only file reader accepts valid UTF8/BOM and rejects binary, malformed, empty or oversized inputs', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'medshield-review-integrity-'))
  t.after(async () => { await unlink(path.join(dir, 'review.json')).catch(error => { if (error.code !== 'ENOENT') throw error }); await rmdir(dir) })
  const file = path.join(dir, 'review.json'), value = Buffer.from('\uFEFF' + JSON.stringify(fixture()))
  await writeFile(file, value)
  assert.equal((await verifyCorrectionFile(file)).status, 'PASS_LOCAL_REVIEW_INTEGRITY')
  assert.deepEqual(await readFile(file), value)
  for (const invalid of [Buffer.alloc(0), Buffer.from([0xc0, 0xaf]), Buffer.from('{PRIVATE-TEST-SECRET'), Buffer.alloc(MAX_REVIEW_BYTES + 1)]) {
    await writeFile(file, invalid); await assert.rejects(() => verifyCorrectionFile(file))
    assert.deepEqual(await readFile(file), invalid)
  }
  await assert.rejects(() => verifyCorrectionFile(dir))
})
test('actual CLI exits successfully for valid review and sanitizes invalid content without modifying input', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'medshield-review-cli-'))
  t.after(async () => { await unlink(path.join(dir, 'review.json')).catch(error => { if (error.code !== 'ENOENT') throw error }); await rmdir(dir) })
  const file = path.join(dir, 'review.json'), original = JSON.stringify(fixture())
  await writeFile(file, original)
  const run = () => spawnSync(process.execPath, ['--import', 'tsx', 'scripts/verify-intake-correction.ts', file], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', timeout: 15000 })
  const passed = run(); assert.equal(passed.status, 0, passed.stderr); assert.equal(JSON.parse(passed.stdout).source_revalidated, false)
  assert.equal(await readFile(file, 'utf8'), original)
  await writeFile(file, '{PRIVATE-TEST-SECRET')
  const failed = run(); assert.equal(failed.status, 1); assert.equal(JSON.parse(failed.stderr).status, 'FAIL_LOCAL_REVIEW_INTEGRITY')
  assert.ok(!failed.stderr.includes('PRIVATE-TEST-SECRET')); assert.ok(!failed.stderr.includes(file))
  assert.equal(await readFile(file, 'utf8'), '{PRIVATE-TEST-SECRET')
})
