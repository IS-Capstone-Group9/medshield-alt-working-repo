import test from 'node:test'
import assert from 'node:assert/strict'
import {buildSalesStreams, mean6Lead1, salesStreamSql, LARGE_DOCUMENT_PHP} from '../src/salesStreams'

const release = {dataset_id: 'e87cae21', fact_delta_version: 0} as never
const row = (period: string, base: number, large: number, docs = large ? 1 : 0) =>
  ({period, base_php: String(base), large_php: String(large), large_documents: String(docs), total_php: (base + large).toFixed(2)})

test('streams reconcile and carry no forecast approval', () => {
  const rows = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'].map((p, i) => row(p, 100 + i, i % 2 ? 600000 : 0))
  const out = buildSalesStreams(release, rows)
  assert.equal(out.months.length, 7)
  assert.equal(out.totals.large_documents, 3)
  assert.equal(out.totals.total_php, out.totals.base_php + out.totals.large_php)
  assert.equal(out.base_next_month_reference_php, (101 + 102 + 103 + 104 + 105 + 106) / 6)
  assert.equal(out.forecast_approved, false)
  assert.equal(out.threshold_php, LARGE_DOCUMENT_PHP)
})

test('refuses rows that do not reconcile or are malformed', () => {
  assert.throws(() => buildSalesStreams(release, [{...row('2026-01', 100, 0), total_php: '101'}]), /reconcile/)
  assert.throws(() => buildSalesStreams(release, [{...row('2026-01', 100, 0), period: 'Jan'}]), /Invalid stream row/)
  assert.throws(() => buildSalesStreams(release, []), /No eligible months/)
})

test('large-order patterns use the last 24 recorded months and refuse unknown months', async () => {
  const {buildLargeOrderPatterns} = await import('../src/salesStreams')
  const months = Array.from({length: 30}, (_, i) => `20${24 + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}`)
  const out = buildLargeOrderPatterns(months, [
    {area: 'HOSPITAL', period: months[1], documents: '1', net_php: '600000'},
    {area: 'HOSPITAL', period: months[10], documents: '2', net_php: '1500000'},
    {area: 'HOSPITAL', period: months[12], documents: '1', net_php: '700000'},
    {area: 'CAVITE', period: months[2], documents: '1', net_php: '550000'}])
  assert.equal(out[0].area, 'HOSPITAL')
  assert.equal(out[0].documents, 4)
  assert.equal(out[0].recent24_share_pct, 100 * 2 / 24)
  assert.equal(out[0].median_gap_recorded_months, 2)
  assert.equal(out[0].typical_large_php, 1100000)
  assert.equal(out[1].typical_large_php, null)
  assert.throws(() => buildLargeOrderPatterns(months, [{area: 'X', period: '1999-01', documents: '1', net_php: '1'}]), /Invalid large-order row/)
})

test('mean_6 lead-1 scoring matches the offline formula', () => {
  const s = [10, 10, 10, 10, 10, 10, 20]
  assert.deepEqual(mean6Lead1(s), {cases: 1, wape_pct: 50, bias_pct: -50})
  assert.equal(mean6Lead1([1, 2]), null)
})

test('sql refuses an unchecked source binding', () => {
  assert.throws(() => salesStreamSql({original_itemized: true, source_table: 'x', fact_delta_version: 0} as never), /checked source binding/)
})
