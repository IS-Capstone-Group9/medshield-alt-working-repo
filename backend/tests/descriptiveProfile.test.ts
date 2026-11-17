import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {buildDescriptiveExtensions} from '../src/descriptiveExtensions'
import {buildDemandProfile, parseCategoryMapping, CATEGORY_BINDING} from '../src/demandProfile'

const release = {dataset_id: 'e87cae21', fact_delta_version: 0} as never
const families = {A1: 'ALPHA', B1: 'BETA', C1: 'GAMMA'}

test('descriptive views reconcile across queries and compute order size, turnover and timing', () => {
  const q = {
    documents: [{year: '2024', net_php: '5000'}, {year: '2024', net_php: '15000'}, {year: '2025', net_php: '600000'}, {year: '2025', net_php: '20000'}, {year: '2025', net_php: '-100'}],
    areas: [{year: '2024', area: 'QUEZON', net_php: '20000'}, {year: '2025', area: 'GOVERNMENT', net_php: '619900'}],
    categories: [{year: '2024', category: 'medicine', net_php: '20000', gm_php: '10000', gm_net_php: '20000'}, {year: '2025', category: 'medicine', net_php: '619900', gm_php: null, gm_net_php: null}],
    labels: [{year: '2024', normalized_product: 'A1', net_php: '12000'}, {year: '2024', normalized_product: 'B1', net_php: '8000'}, {year: '2025', normalized_product: 'A1', net_php: '19900'}, {year: '2025', normalized_product: 'C1', net_php: '600000'}],
    yearly: [{year: '2024', net_php: '20000', positive_php: '20000', negative_lines: '0', negative_php: '0', discount_php: '200', gross_php: '20200'},
      {year: '2025', net_php: '619900', positive_php: '620000', negative_lines: '1', negative_php: '-100', discount_php: null, gross_php: null}],
    timing: [{period: '2024-01', day10_php: '5000', day20_php: '10000', total_php: '20000'}, {period: '2025-01', day10_php: '0', day20_php: '309950', total_php: '619900'}],
  }
  const out = buildDescriptiveExtensions(release, families, q)
  const [a, b] = out.years
  assert.equal(a.order_size?.median_php, 10000)
  assert.equal(b.order_size?.documents, 2) // the negative document is not an order
  assert.equal(Math.round(b.order_size!.band_share_pct['₱500K and over']), 97)
  assert.deepEqual([b.portfolio?.continuing, b.portfolio?.new, b.portfolio?.lost], [1, 1, 1])
  assert.equal(a.category[0].margin_pct, 50)
  assert.equal(b.category[0].margin_pct, null)
  assert.equal(b.discount_rate_pct, null)
  assert.equal(b.timing?.median_by_day20_pct, 50)
  assert.equal(out.forecast_approved, false)
  assert.throws(() => buildDescriptiveExtensions(release, families, {...q, areas: q.areas.slice(1)}), /do not reconcile/)
  assert.throws(() => buildDescriptiveExtensions(release, {A1: 'ALPHA'}, q), /missing from family mapping/)
})

const months = (from: number, n: number) => Array.from({length: n}, (_, k) => { const i = from + k; return `${Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}` })
const cell = (period: string, label: string, net: number, large = false) => ({period, normalized_product: label, large: large ? '1' : '0', net_php: String(net), gm_net_php: null, gm_php: null})

test('demand profile classes follow the registered rules and stay a description', () => {
  const all = months(2022 * 12 + 3, 54) // 2022-04 .. 2026-09
  const rows = all.flatMap((p, i) => [cell(p, 'A1', 100000), cell(p, 'B1', i % 2 ? 300000 : 20000), ...(i % 3 === 0 ? [cell(p, 'C1', 2_000_000, true)] : []), cell(p, 'C1', 10000)])
  const mapping = {categories: {ALPHA: 'CARDIOVASCULAR', BETA: 'RESPIRATORY', GAMMA: 'VACCINE_IMMUNE_SERUM'}, status: 'candidate', scope: 'test'}
  const out = buildDemandProfile(release, families, mapping, rows)
  const cls = Object.fromEntries(out.profile.map(p => [p.category, p.planning_class]))
  assert.deepEqual(cls, {VACCINE_IMMUNE_SERUM: 'LARGE_ORDER', RESPIRATORY: 'UNEVEN', CARDIOVASCULAR: 'STEADY'})
  assert.deepEqual(out.windows.current, ['2024-10', '2026-09'])
  assert.equal(out.check.same_class, 3)
  assert.equal(out.check.forecast_order_holds, null) // fewer than two routine classes with two categories
  assert.equal(out.check.usable_planning_guide, false)
  assert.equal(out.procurement_approved, false)
  assert.throws(() => buildDemandProfile(release, families, mapping, rows.filter(r => r.period !== '2023-05')), /without gaps/)
})

test('category mapping payload is pinned by hash', () => {
  const raw = readFileSync(path.resolve(__dirname, '../../outputs/category_mapping_20261115/category_mapping_v0_1_payload.json'), 'utf8')
  assert.equal(createHash('sha256').update(raw).digest('hex'), CATEGORY_BINDING.mappingSha256)
  assert.equal(Object.keys(parseCategoryMapping(raw).categories).length, 176)
  assert.throws(() => parseCategoryMapping(raw + ' '), /hash mismatch/)
})
