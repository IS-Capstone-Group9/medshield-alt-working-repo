import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import { DESCRIPTIVE_PERIOD_SCRIPT } from '../../frontend/services/api/descriptive-period-runtime'

function detail(rows: unknown[], daily = true, start = '2025-01-01', end = '2025-01-31') {
  const script = DESCRIPTIVE_PERIOD_SCRIPT.slice(DESCRIPTIVE_PERIOD_SCRIPT.indexOf('function getDescriptiveDetailedRows()'), DESCRIPTIVE_PERIOD_SCRIPT.indexOf('function getDescriptiveMonthlyRows()'))
  return JSON.parse(JSON.stringify(runInNewContext(script + ';({rows:getDescriptiveDetailedRows(),areas:getDescriptiveAreaRows()})', {
    salesSectorsData: { rows }, descriptiveUsesDailyGrain: () => daily,
    descriptivePeriod: 'custom', customDateStart: start, customDateEnd: end,
    descriptivePeriodIncludes: (date: string) => date >= start && date <= end,
    descriptiveIsFuturePeriod: () => false,
  })))
}
test('monthly totals cannot manufacture daily observations', () => {
  assert.deepEqual(detail([{ period: '2025-01', revenue: 310, quantity: 31 }]).rows, [])
})
test('exact dates preserve uneven sales and eligible gross profit', () => {
  const result = detail([
    { date: '2025-01-02', area: 'A', revenue: 90, income: 9, margin_revenue_basis: 90 },
    { date: '2025-01-03', area: 'A', revenue: 10, income: null, margin_revenue_basis: null },
    { date: '2025-02-01', area: 'A', revenue: 1000, income: 900 },
  ])
  assert.deepEqual(result.rows.map((r: any) => r.revenue), [90, 10])
  assert.equal(result.areas[0].income, 9)
  assert.equal(result.areas[0].margin_revenue_basis, 90)
})
test('empty selections do not borrow all-history area values', () => {
  assert.deepEqual(detail([{ date: '2024-01-02', area: 'A', revenue: 90 }]).areas, [])
})
test('unknown profit remains null and estimates are not actual area totals', () => {
  const result = detail([{date:'2025-01-02', area:'A', revenue:100}, {date:'2025-01-03',area:'A',revenue:900,evidence:'estimate'}])
  assert.equal(result.areas[0].income, null)
  assert.equal(result.areas[0].revenue, 100)
})
