import assert from 'node:assert/strict'
import test from 'node:test'
import { DatabricksDashboardInputError, sqlString } from '../src/databricksDashboard'

function decodeExpression(expression: string): string {
  const match = /^decode\(unhex\('([0-9a-f]*)'\), 'UTF-8'\)$/.exec(expression)
  assert.ok(match, 'The SQL expression must contain only encoded value bytes')
  return Buffer.from(match[1], 'hex').toString('utf8')
}

test('dashboard filters preserve apostrophes, backslashes and Unicode source labels', () => {
  for (const label of ["BUPIRIGHT1'S VIALS", "EPIXBY10'S", 'A\\B', "A\\'B", '₱ café – 薬', '']) {
    assert.equal(decodeExpression(sqlString(label, 'product')), label)
  }
})

test('search filters preserve punctuation and LIKE wildcards as value text', () => {
  const search = "%minor surgery set 37's\\oltén%"
  assert.equal(decodeExpression(sqlString(search, 'search', 104)), search)
  assert.equal(decodeExpression(sqlString('  Quezon  ', 'territory')), 'Quezon')
})

test('dashboard SQL values retain length and control-character validation', () => {
  assert.equal(decodeExpression(sqlString('A'.repeat(160), 'product')).length, 160)
  assert.equal(decodeExpression(sqlString('  ABC  ', 'search', 3)), 'ABC')
  for (const value of ['A'.repeat(161), 'A\u0000B', 'A\nB', 'A\tB']) {
    assert.throws(() => sqlString(value, 'product'), DatabricksDashboardInputError)
  }
  assert.throws(() => sqlString('ABCD', 'search', 3), /search is invalid/)
})
