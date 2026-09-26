import assert from 'node:assert/strict'
import test from 'node:test'
import { filterMonthlyYear, parseMonthlyYear } from '../src/monthlyQuery'

test('monthly year permits omitted, historical, and future years', () => {
  assert.equal(parseMonthlyYear(undefined), undefined)
  for (const year of ['2017', '2025', '2026', '2030', '1000', '9999']) {
    assert.equal(parseMonthlyYear(year), year)
  }
  assert.equal(parseMonthlyYear(' 2025 '), '2025')
})

test('monthly year rejects malformed, partial, repeated, and structured values', () => {
  for (const value of ['', ' ', 'bad', '202', '20250', '2025-01', '2e3', '0000',
    '0202', 'all', '2025\n2026', ['2025'], ['2025', '2026'], { value: '2025' }, 2025, null]) {
    assert.equal(parseMonthlyYear(value), null, JSON.stringify(value))
  }
})

test('monthly filtering preserves all rows or selects only the complete year', () => {
  const rows = [{ period: '2025-01', sales: 10 }, { period: '2025-12', sales: 20 },
    { period: '2026-01', sales: 30 }, { period: '20250-01', sales: 40 }, { period: null, sales: 50 }]
  assert.equal(filterMonthlyYear(rows), rows)
  assert.deepEqual(filterMonthlyYear(rows, '2025'), rows.slice(0, 2))
  assert.deepEqual(filterMonthlyYear(rows, '2026'), [rows[2]])
  assert.deepEqual(filterMonthlyYear(rows, '2030'), [])
})
