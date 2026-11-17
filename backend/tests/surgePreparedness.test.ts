import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {buildSurgePreparedness, parseSurgePayload, readSurgePreparedness, SURGE_BINDING} from '../src/surgePreparedness'

const raw = readFileSync(path.resolve(__dirname, '../../outputs/surge_preparedness_20261117/surge_payload.json'), 'utf8')
const release = {dataset_id: 'd1', fact_delta_version: 0} as never
const families = {A1: 'ANTI_FAM', F1: 'FEVER_FAM', X1: 'OTHER_FAM'}
const categories = {ANTI_FAM: 'ANTIBACTERIAL', FEVER_FAM: 'ANALGESIC_ANTIPYRETIC'}

function cells() {
  const out: Array<Record<string, string>> = []
  for (let y = 2021; y <= 2025; y++) for (let m = 1; m <= 12; m++) {
    const period = `${y}-${String(m).padStart(2, '0')}`
    out.push({period, normalized_product: 'A1', large: '0', net_php: '1000', gm_net_php: '', gm_php: ''})
    out.push({period, normalized_product: 'A1', large: '1', net_php: '900000', gm_net_php: '', gm_php: ''})
    out.push({period, normalized_product: 'F1', large: '0', net_php: m >= 7 && m <= 10 ? '300' : '100', gm_net_php: '', gm_php: ''})
    out.push({period, normalized_product: 'X1', large: '0', net_php: '5', gm_net_php: '', gm_php: ''})
  }
  return out
}

test('payload is hash-pinned and keeps approvals false', () => {
  const p = parseSurgePayload(raw)
  assert.equal(p.forecast_approved, false); assert.equal(p.procurement_approved, false)
  assert.ok(p.calendar.some(c => c.disease === 'Dengue' && c.geography === 'Territory'))
  assert.throws(() => parseSurgePayload(raw + ' '), /hash mismatch/)
})

test('scenario base uses routine sales in surge months only and scales by uplift', () => {
  const p = parseSurgePayload(raw), out = buildSurgePreparedness(release, families, categories, p, cells())
  const anti = out.scenarios.find(s => s.category === 'ANTIBACTERIAL')!
  assert.equal(anti.mean_routine_php, 1000)  // large documents excluded
  assert.equal(anti.extra_stock_php['40'], 400)
  const fever = out.scenarios.find(s => s.category === 'ANALGESIC_ANTIPYRETIC')!
  const expected = fever.surge_months.reduce((n, m) => n + (m >= 7 && m <= 10 ? 300 : 100), 0) / fever.surge_months.length
  assert.ok(Math.abs(fever.mean_routine_php! - expected) < 1e-9)
  assert.equal(out.evidence_types.scenarios, 'scenario_assumed_uplift')
  assert.equal(out.procurement_approved, false)
  assert.ok(out.preparedness_window_months.includes(8))
})

test('missing sales months give an unavailable base, not zero', () => {
  const p = parseSurgePayload(raw), out = buildSurgePreparedness(release, families, categories, p, cells().filter(c => c.period < '2021-01'))
  assert.ok(out.scenarios.every(s => s.mean_routine_php === null && s.extra_stock_php['20'] === null))
})

test('fails closed when the surge table changed', async () => {
  const exec = (async (sql: string) => {
    if (sql.includes('DESCRIBE HISTORY') && sql.includes(SURGE_BINDING.table)) return {rows: [{version: '1'}]}
    throw new Error('stop')
  }) as never
  await assert.rejects(readSurgePreparedness(exec))
})
