import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {buildFamilyAbcXyz, parseFamilyMapping, readFamilyAbcXyz, FAMILY_BINDING} from '../src/familyAbcXyz'

const payload = readFileSync(path.resolve(__dirname, '../../outputs/product_family_draft_20261111/family_mapping_v1_1_payload.json'), 'utf8')

test('the committed payload matches the pinned hash and keeps forecasts unapproved', () => {
  const mapping = parseFamilyMapping(payload)
  assert.equal(Object.keys(mapping.families).length, 5623)
  assert.equal(mapping.families['TRIVASC 35MG MR'], 'TRIVASC MR')
  assert.throws(() => parseFamilyMapping(payload + ' '), /hash mismatch/)
})

test('classes follow the registered 80/95 and CV rules', () => {
  const mapping = {families: {A1: 'STEADY', A2: 'STEADY', B1: 'LUMPY', C1: 'SMALL'}, status: 'candidate', definition: 'brand_line', validation: {}}
  const rows = [
    ...Array.from({length: 12}, (_, i) => ({normalized_product: i % 2 ? 'A1' : 'A2', month: String(i + 1), net_php: '100'})),
    {normalized_product: 'B1', month: '3', net_php: '200'},
    {normalized_product: 'C1', month: '5', net_php: '10'}, {normalized_product: 'C1', month: '6', net_php: '-20'},
  ]
  const out = buildFamilyAbcXyz(mapping, rows)
  assert.deepEqual(out.families.map(f => [f.family, f.abc_xyz]), [['STEADY', 'AX'], ['LUMPY', 'BZ']])
  assert.equal(out.stock_rule_approved, false)
  assert.equal(out.grid.AX.families, 1)
})

test('refuses unmapped labels, bad rows and a changed table', async () => {
  const mapping = {families: {A: 'F'}, status: 'c', definition: 'brand_line', validation: {}}
  assert.throws(() => buildFamilyAbcXyz(mapping, [{normalized_product: 'NEW', month: '1', net_php: '1'}]), /missing from family mapping/)
  assert.throws(() => buildFamilyAbcXyz(mapping, [{normalized_product: 'A', month: '13', net_php: '1'}]), /Invalid family sales row/)
  const release = {original_itemized: true, source_table: 'x', fact_delta_version: 0}
  const changed = (async (sql: string) => {
    if (sql.includes('DESCRIBE HISTORY')) return {rows: [{version: '1'}]}
    if (sql.includes(FAMILY_BINDING.table)) return {rows: [{mapping_sha256: FAMILY_BINDING.mappingSha256, payload_json: payload}]}
    return {rows: []}
  }) as never
  await assert.rejects(readFamilyAbcXyz(changed))
  void release
})
