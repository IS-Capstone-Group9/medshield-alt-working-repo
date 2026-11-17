import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { validateSo1Package, so1View, so1Query, so1Hash, so1Table, reconcileSo1Source, decodeSo1Rows, type So1Package } from '../src/so1Diagnostics'

const directory = resolve(__dirname, '../../outputs/so1_dashboard_20261025')
const raw = readFileSync(resolve(directory, 'payload.json'), 'utf8')
const hash = readFileSync(resolve(directory, 'payload.sha256'), 'utf8').trim()
const payload = () => JSON.parse(raw) as So1Package
test('persisted Gold records reconstruct exact bytes and reject tampering, missing or duplicate series', () => {
  const p = payload(), { series, ...metadata } = p
  const records = [{ record_key: '!manifest', payload_json: JSON.stringify({ package_sha256: hash, metadata, areas: series.map(s => s.area) }) },
    ...series.map(s => ({ record_key: s.area, payload_json: JSON.stringify(s) }))].map(r => ({ ...r, payload_sha256: so1Hash(r.payload_json) }))
  assert.deepEqual(decodeSo1Rows(records, hash, p.release), p)
  const corrupt = structuredClone(records); corrupt[1].payload_json += ' '
  assert.throws(() => decodeSo1Rows(corrupt, hash, p.release), /checksum/)
  assert.throws(() => decodeSo1Rows(records.slice(1), hash, p.release), /manifest/)
  assert.throws(() => decodeSo1Rows([...records.slice(1), records[1]], hash, p.release), /duplicated/)
  assert.throws(() => decodeSo1Rows(records, 'a'.repeat(64), p.release), /manifest/)
})
test('actual verified package passes source/protocol/component/calendar contracts', () => {
  const p = payload()
  assert.equal(so1Hash(raw), hash)
  assert.equal(raw, JSON.stringify(p) + '\n')
  assert.equal(validateSo1Package(p, p.release), p)
  assert.match(so1Table(p.release, hash), /so1_[a-f0-9]{16}_candidate/)
})
test('source mismatch, changed protocol, duplicate component and filled source gap fail', () => {
  const p = payload()
  assert.throws(() => validateSo1Package(p, { ...p.release, product_master_sha256: 'a'.repeat(64) }), /identity/)
  const changed = payload(); changed.protocol.daily_period = 7
  assert.throws(() => validateSo1Package(changed, changed.release))
  const duplicate = payload(); duplicate.series[0].components.push(duplicate.series[0].components[0])
  assert.throws(() => validateSo1Package(duplicate, duplicate.release), /Duplicate/)
  const gap = payload(); gap.series[0].components[0].period = '2017-05'
  assert.throws(() => validateSo1Package(gap, gap.release), /gap/)
})
test('whole missing month cannot receive assumed zeros', () => {
  const p = payload(), company = p.series[0]
  const missing = company.daily_months.find(m => m.unknown_whole_month > 0)!
  missing.assumed_zero_no_recorded_transaction = 1; missing.unknown_whole_month--
  assert.throws(() => validateSo1Package(p, p.release))
})
test('2026 Quezon comparison uses Jan–Sep 2025, with all original flags and fitting context', () => {
  const p = payload(), view = so1View(p, hash, { area: 'QUEZON', year: '2026' })
  assert.equal(view.months.length, 9)
  assert.deepEqual(view.yoy[0].common_months, ['01', '02', '03', '04', '05', '06', '07', '08', '09'])
  assert.ok(view.components.every(c => c.period.startsWith('2026-')))
  assert.ok(view.comparisons[0].start.startsWith('2023-'))
  assert.equal(view.comparisons[0].monthly_fit_context_check.reference.trend_direction, 'down')
  assert.equal(view.comparisons[0].monthly_fit_context_check.candidate.trend_direction, 'up')
  assert.equal(view.scope.buyer_scope, 'All')
  assert.ok(view.daily_months.every(m => m.period.startsWith('2026-')))
})
test('no-history territory has recorded output but no company decomposition substitution', () => {
  const p = payload(), view = so1View(p, hash, { area: 'ALBAY' })
  assert.ok(view.months.some(m => m.revenue !== null))
  assert.equal(view.components.length, 0)
  assert.equal(view.comparisons.length, 0)
  assert.equal(view.mapping?.area_evidence_status, 'PROPOSED_NOT_OWNER_APPROVED')
})
test('invalid, repeated, out-of-scope filters and channels as geography fail', () => {
  for (const q of [{ area: ['QUEZON'] }, { year: '2026 OR 1=1' }, { sector: 'Private' }, { year: ['2026'] }]) assert.throws(() => so1Query(q))
  const p = payload()
  assert.throws(() => so1View(p, hash, { area: 'GOVERNMENT' }))
  assert.throws(() => so1View(p, hash, { year: '2030' }))
})
test('independent SQL control rows reconcile; changed revenue and duplicate keys fail', async () => {
  const p = payload()
  const rows = p.series.slice(1).flatMap(s => s.months.filter(m => m.records).map(m => ({ normalized_area: s.area, period: m.period, records: String(m.records),
    eligible_records: String(m.eligible_records), adjusted_records: String(m.adjusted_records), revenue: m.revenue === null ? null : String(m.revenue) })))
  const execute = async () => ({ rows, columns: [] })
  assert.equal((await reconcileSo1Source(p, execute)).rows, rows.length)
  const changed = structuredClone(rows); changed[0].revenue = '9999999999'
  await assert.rejects(reconcileSo1Source(p, async () => ({ rows: changed, columns: [] })))
  await assert.rejects(reconcileSo1Source(p, async () => ({ rows: [...rows.slice(1), rows[1]], columns: [] })))
})
