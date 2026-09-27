import test from 'node:test'
import assert from 'node:assert/strict'
import { databricksLiteral } from '../src/databricksLiteral'
test('SQL values preserve quote, backslash and Unicode bytes without interpolation', () => {
  const raw = 'reviewer\'s ₱\\folder\ntext; --'
  const expression = databricksLiteral(raw)
  const hex = expression.match(/unhex\('([0-9a-f]+)'\)/)![1]
  assert.equal(Buffer.from(hex, 'hex').toString('utf8'), raw)
  assert.equal(databricksLiteral(null), 'NULL')
})
