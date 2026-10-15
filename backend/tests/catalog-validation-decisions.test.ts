import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { categoryDecisionCte } from '../scripts/catalog-validation-decisions'

const decision = (normalized_product: string) => ({
  normalized_product,
  product_category: 'medicine',
  evidence_source: 'Reviewed category evidence',
})

test('apostrophes, backslashes and Unicode reach the bound parameter unchanged', () => {
  const rows = [
    "BUPIRIGHT 1'S VIALS",
    "EPIX BY 10'S",
    "FERN-D 120'S",
    "MINOR SURGERY SET 37'S (OLTEN)",
    "AUTOMATIC BIOPSY NEEDLE G14 X 10CM (CURWAY) 5'S",
    'MECLOP 5MG\\ML',
    "REVIEWER'S \\ LABEL\n₱ ± 漢字",
  ].map(decision)
  rows[0].evidence_source = "Supplier's \\ file\n₱ review"
  const result = categoryDecisionCte(rows)
  assert.equal(result.parameters.length, 1)
  assert.equal(result.parameters[0].name, 'catalog_decisions')
  assert.equal(result.parameters[0].type, 'STRING')
  assert.deepEqual(JSON.parse(result.parameters[0].value), rows)
  assert.match(result.statementPrefix, /FROM inline\(from_json\(/)
  assert.match(result.statementPrefix, /:catalog_decisions/)
  assert.match(result.statementPrefix, /map\('mode','FAILFAST'\)/)
  assert.match(result.statementPrefix, /ARRAY<STRUCT<normalized_product:STRING,product_category:STRING,evidence_source:STRING>>/)
  for (const row of rows) assert.ok(!result.statementPrefix.includes(row.normalized_product))
})

test('SQL-looking text stays in data and only the three receipt fields are projected', () => {
  const label = "X'); DROP TABLE protected_table; --"
  const evidence = "'); SELECT secret; --"
  const input = { ...decision(label), evidence_source: evidence, unrelated: 'not part of the SQL contract' }
  const result = categoryDecisionCte([input])
  assert.ok(!result.statementPrefix.includes(label))
  assert.ok(!result.statementPrefix.includes(evidence))
  assert.deepEqual(JSON.parse(result.parameters[0].value), [
    { normalized_product: label, product_category: 'medicine', evidence_source: evidence },
  ])
  assert.equal(result.statementPrefix, categoryDecisionCte([decision('Plain label')]).statementPrefix)
})

test('chunks accept the 1 and 500 row boundaries and reject other sizes', () => {
  for (const length of [1, 500]) {
    const result = categoryDecisionCte(Array.from({ length }, (_, i) => decision(`P${i}`)))
    assert.equal(JSON.parse(result.parameters[0].value).length, length)
  }
  for (const length of [0, 501]) {
    assert.throws(
      () => categoryDecisionCte(Array.from({ length }, (_, i) => decision(`P${i}`))),
      /between 1 and 500 rows/,
    )
  }
  assert.throws(() => categoryDecisionCte(null as unknown as Array<Record<string, string>>), /between 1 and 500 rows/)
})

test('required decision fields reject missing, empty and non-string values', () => {
  for (const field of ['normalized_product', 'product_category', 'evidence_source']) {
    for (const invalid of [undefined, null, '', '  ', 0, false, []]) {
      const row = { ...decision('Product'), [field]: invalid } as unknown as Record<string, string>
      assert.throws(() => categoryDecisionCte([row]), new RegExp(`nonempty string ${field}`))
    }
  }
  for (const invalid of [null, [], 'Product']) {
    assert.throws(() => categoryDecisionCte([invalid as unknown as Record<string, string>]), /must be an object/)
  }
})

test('all 4561 receipt decisions survive bounded chunks exactly once in receipt order', () => {
  const receipt = JSON.parse(readFileSync(resolve(__dirname, '../../databricks/medshield_project/references/category_acceptance.json'), 'utf8'))
  const decisions: Array<Record<string, string>> = receipt.decisions
  assert.equal(decisions.length, 4561)
  const reconstructed: Array<Record<string, string>> = []
  const chunkLengths: number[] = []
  for (let offset = 0; offset < decisions.length; offset += 500) {
    const result = categoryDecisionCte(decisions.slice(offset, offset + 500))
    const chunk = JSON.parse(result.parameters[0].value)
    chunkLengths.push(chunk.length)
    reconstructed.push(...chunk)
  }
  assert.deepEqual(chunkLengths, [...Array(9).fill(500), 61])
  assert.equal(new Set(reconstructed.map(row => row.normalized_product)).size, 4561)
  assert.deepEqual(reconstructed, decisions.map(({ normalized_product, product_category, evidence_source }) => ({
    normalized_product, product_category, evidence_source,
  })))
})
