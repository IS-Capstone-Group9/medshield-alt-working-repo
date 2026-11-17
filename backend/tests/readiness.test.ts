import test from 'node:test'
import assert from 'node:assert/strict'
import {buildReadiness, quantile} from '../src/readiness'
import {modelRegister} from '../src/modelRegister'

const release = {dataset_id: 'd', fact_delta_version: 0} as never
function months(n = 48) {
  const out: Array<Record<string, string>> = []
  for (let i = 0; i < n; i++) { const p = `${2023 + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}`; out.push({period: p, net_php: '1000', net20_php: '600'}) }
  return out
}

test('day-20 estimate blends pace and mean_6 with weight 0.75', () => {
  const rows = months(); rows[47] = {...rows[47], net_php: '2000', net20_php: '1200'}
  const out = buildReadiness(release, rows, [])
  const last = out.day20.track.at(-1)!
  assert.equal(last.period, '2026-12'); assert.equal(last.usual_share_by_day20, 0.6)
  assert.equal(last.estimate_php, 0.75 * (1200 / 0.6) + 0.25 * 1000)
  assert.equal(out.day20.track.length, 12)
  assert.equal(out.procurement_approved, false)
})

test('government range uses large government documents only, zeros included', () => {
  const docs = [
    {period: '2026-12', dr_number: 'A', area: 'GOVERNMENT', net_php: '600000'},
    {period: '2026-11', dr_number: 'B', area: 'HOSPITAL', net_php: '900000'},
    {period: '2026-10', dr_number: 'C', area: 'GOVERNMENT', net_php: '400000'},
  ]
  const out = buildReadiness(release, months(), docs)
  assert.equal(out.government_range.months_with_large_order, 1)
  assert.equal(out.government_range.p90_php, quantile([600000, ...Array(23).fill(0)], .9))
  assert.equal(out.government_range.for_period, '2027-01')
})

test('refuses gaps and invalid numbers', () => {
  assert.throws(() => buildReadiness(release, months().filter(r => r.period !== '2026-06'), []), /24 recorded months/)
  assert.throws(() => buildReadiness(release, [{period: '2026-01', net_php: 'x', net20_php: '1'}], []), /Invalid number/)
})

test('model register counts statuses', () => {
  const r = modelRegister()
  assert.equal(r.total, r.models.length)
  assert.equal(r.counts.kept + r.counts.failed + r.counts.waiting + r.counts.benchmark, r.total)
  assert.ok(r.models.some(m => m.name.startsWith('6-month mean') && m.status === 'kept'))
})
