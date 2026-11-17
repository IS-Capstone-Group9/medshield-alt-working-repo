import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {buildPrescriptivePolicy, quantile, readPrescriptivePolicy, policySalesSql} from '../src/prescriptivePolicy'
import {FAMILY_BINDING} from '../src/familyAbcXyz'
import {ITEMIZED_PREVIEW_BINDING} from '../src/itemizedPreviewBinding'

const payload = readFileSync(path.resolve(__dirname, '../../outputs/product_family_draft_20261111/family_mapping_v1_1_payload.json'), 'utf8')
const mapping = {families: {S1: 'STEADY', W1: 'WILD', T1: 'TINY'}, status: 'candidate', definition: 'brand_line', validation: {}}

/** 2020-01..2023-12: STEADY ~1,000 a month, WILD lumpy, TINY below the A cut. */
function rows(months = 48, drop?: string) {
  const out: Array<Record<string, string>> = []
  for (let i = 0; i < months; i++) {
    const period = `${2020 + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}`
    if (period === drop) continue
    out.push({normalized_product: 'S1', period, net_php: String(1000 + (i % 3) * 50)})
    out.push({normalized_product: 'W1', period, net_php: String(i % 4 === 0 ? 4000 : 100)})
    out.push({normalized_product: 'T1', period, net_php: '5'})
  }
  return out
}

test('quantile matches numpy linear interpolation', () => {
  assert.equal(quantile([1, 2, 3, 4], 0.9), 3.7)
  assert.equal(quantile([5], 0.95), 5)
  assert.equal(quantile([4, 1, 3, 2], 0.5), 2.5)
})

test('prescribes A-class families from tested rules and keeps procurement unapproved', () => {
  const out = buildPrescriptivePolicy(mapping, rows(), 14)
  assert.equal(out.origin_period, '2023-12'); assert.equal(out.class_year, 2022)
  assert.deepEqual(out.families.map(f => [f.family, f.xyz_class, f.service_target]), [['STEADY', 'X', 0.95], ['WILD', 'Z', 0.9]])
  const steady = out.families.find(f => f.family === 'STEADY')!
  assert.ok(Math.abs(steady.monthly_demand_php - 1050) < 1e-9)
  assert.ok(steady.order_up_to_php >= steady.monthly_demand_php * (1 + 14 / 30))
  assert.ok(steady.safety_stock_php >= 0)
  assert.ok(!out.families.some(f => f.family === 'TINY'))
  assert.ok(out.backtest.family_months > 0 && out.backtest.cycle_service >= 0 && out.backtest.cycle_service <= 1)
  assert.equal(out.procurement_approved, false); assert.equal(out.units, 'php_sales_value_not_purchase_quantities')
})

test('longer lead times need more stock', () => {
  const short = buildPrescriptivePolicy(mapping, rows(), 7), long = buildPrescriptivePolicy(mapping, rows(), 30)
  assert.ok(long.totals.order_up_to_php > short.totals.order_up_to_php)
})

test('refuses gaps, short history, unknown labels and unsupported lead times', () => {
  assert.throws(() => buildPrescriptivePolicy(mapping, rows(48, '2021-05')), /missing month/)
  assert.throws(() => buildPrescriptivePolicy(mapping, rows(30)), /Not enough history/)
  assert.throws(() => buildPrescriptivePolicy(mapping, [...rows(), {normalized_product: 'NEW', period: '2020-01', net_php: '1'}]), /missing from family mapping/)
  assert.throws(() => buildPrescriptivePolicy(mapping, rows(), 21), /Unsupported lead time/)
  assert.throws(() => buildPrescriptivePolicy(mapping, rows().filter(r => r.period >= '2020-02')), /must start/)
})

test('reads only the pinned mapping and fails closed when it changed', async () => {
  const release = {original_itemized: true, source_table: ITEMIZED_PREVIEW_BINDING.itemizedTable, fact_delta_version: 0}
  assert.match(policySalesSql(release as never), /is_net_sales_eligible AND date_delivered >= DATE'2020-01-01'/)
  const changed = (async (sql: string) => {
    if (sql.includes('DESCRIBE HISTORY')) return {rows: [{version: '1'}]}
    if (sql.includes(FAMILY_BINDING.table)) return {rows: [{mapping_sha256: FAMILY_BINDING.mappingSha256, payload_json: payload}]}
    return {rows: []}
  }) as never
  await assert.rejects(readPrescriptivePolicy(14, changed))
})
