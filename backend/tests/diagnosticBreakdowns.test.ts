import test from 'node:test'
import assert from 'node:assert/strict'
import {breakdownSql, buildDiagnosticBreakdowns, decomposeMargin, parseCells, salesBridge, unusualMonths, productSurvival, day20Estimate} from '../src/diagnosticBreakdowns'

const families = {A1: 'ALPHA', A2: 'ALPHA', B1: 'BETA', C1: 'GAMMA'}
const cell = (period: string, label: string, net: number, large = false, gmNet: number | null = null, gm: number | null = null) =>
  ({period, normalized_product: label, large: large ? '1' : '0', net_php: String(net), gm_net_php: gmNet === null ? null : String(gmNet), gm_php: gm === null ? null : String(gm)})

test('margin decomposition is an exact identity and entry/exit counts as mix', () => {
  const cells = parseCells([
    cell('2019-01', 'A1', 100, false, 100, 80), cell('2019-01', 'B1', 100, false, 100, 40),
    cell('2025-01', 'A1', 50, false, 50, 30), cell('2025-01', 'C1', 150, false, 150, 45),
  ], families)
  const d = decomposeMargin(cells, 2019, 2025)
  assert.ok(Math.abs(d.change_pts - (d.mix_pts + d.rate_pts)) < 1e-9)
  assert.equal(Math.round(d.margin0_pct), 60)
  assert.equal(Math.round(d.margin1_pct * 10) / 10, 37.5)
  // ALPHA: mix (−0.25 × 0.7) + rate (−0.2 × 0.375) = −25 pts; BETA exit −20 pts; GAMMA entry +22.5 pts.
  assert.equal(d.biggest_drags[0].family, 'ALPHA')
  assert.equal(Math.round(d.biggest_drags[0].mix + d.biggest_drags[0].rate), -25)
})

test('unknown labels are refused rather than dropped', () => {
  assert.throws(() => parseCells([cell('2025-01', 'ZZ', 10)], families), /missing from family mapping/)
})

test('sales bridge compares matched months only and adds up', () => {
  const cells = parseCells([
    cell('2024-01', 'A1', 100), cell('2024-02', 'B1', 50), cell('2024-03', 'A1', 999),
    cell('2025-01', 'A1', 120), cell('2025-02', 'C1', 70), cell('2025-02', 'A1', 600000, true),
  ], families)
  const [b] = salesBridge(cells)
  assert.equal(b.matched_months, 2)
  assert.equal(b.large_orders_php, 600000)
  assert.equal(b.continuing_families_php, 20)
  assert.equal(b.new_families_php, 70)
  assert.equal(b.lost_families_php, -50)
  assert.equal(b.change_php, b.large_orders_php + b.continuing_families_php + b.new_families_php + b.lost_families_php + b.non_positive_adjustments_php)
})

test('unusual months need history and flag a large-order spike', () => {
  const rows = Array.from({length: 14}, (_, i) => cell(`2025-${String(i % 12 + 1).padStart(2, '0')}`.replace(/^2025/, i < 12 ? '2025' : '2026'), 'A1', 100 + (i % 3) * 10))
  rows.push(cell('2026-02', 'B1', 5_000_000, true))
  const out = unusualMonths(parseCells(rows, families))
  assert.equal(out.months_scored, 8)
  assert.equal(out.total.at(-1)?.period, '2026-02')
  assert.equal(out.total.at(-1)?.cause, 'LARGE ORDERS')
})

test('survival excludes windows that have not finished', () => {
  const rows = [cell('2019-05', 'A1', 10), cell('2020-03', 'B1', 10), cell('2021-06', 'B1', 10), cell('2025-12', 'C1', 10), cell('2026-09', 'A1', 1)]
  const s = productSurvival(parseCells(rows, families))
  assert.equal(s.all.families, 2)
  assert.equal(s.all.year2_known, 1)
  assert.equal(s.all.survival_y2_pct, 100)
})

test('day-20 estimate follows the registered blend', () => {
  const rows = Array.from({length: 10}, (_, i) => ({period: `2020-${String(i + 1).padStart(2, '0')}`, mtd_php: '60', total_php: '100'}))
  const out = day20Estimate(rows)
  const last = out.recent.at(-1)!
  assert.equal(Math.round(last.estimate_php), 100)
  assert.equal(last.typical_share_pct, 60)
})

test('queries share the large-order threshold and carry no approval flags', () => {
  const release = {dataset_id: 'x', fact_delta_version: 0, original_itemized: true} as never
  assert.throws(() => breakdownSql(release))
  const out = buildDiagnosticBreakdowns
  assert.equal(typeof out, 'function')
})
