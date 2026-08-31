import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildEstimatedMonthlyRowsForYear,
  buildEstimatedYearSummaryForYear,
  hasMonthlyRowsForYear,
} from '../services/api/dashboard-year-estimates.ts'

const baseData = {
  dataStatus: {
    source: 'analytics_services',
    mode: 'historical',
    loaded_at: '2026-08-31T06:00:00.000Z',
    message: 'Test snapshot',
    current_month: '2026-08',
    forecast_window: { start: '2026-08', end: '2027-07', months: 12 },
  },
  summary: {
    total_revenue: 0,
    total_income: 0,
    total_transactions: 0,
    top_product: 'All',
    top_area: 'All',
    avg_margin: 0,
  },
  monthly: [
    { period: '2025-10', revenue: 80, income: 40 },
    { period: '2025-11', revenue: 100, income: 50 },
    { period: '2025-12', revenue: 120, income: 60 },
  ],
  byArea: [],
  products: [],
  yearSummary: [
    { year: '2025', revenue: 300, income: 150, transactions: 30 },
  ],
  seasonality: [
    { month: 'Jan', avg_revenue: 100 },
    { month: 'Feb', avg_revenue: 200 },
    { month: 'Mar', avg_revenue: 100 },
    { month: 'Apr', avg_revenue: 100 },
    { month: 'May', avg_revenue: 100 },
    { month: 'Jun', avg_revenue: 100 },
    { month: 'Jul', avg_revenue: 100 },
    { month: 'Aug', avg_revenue: 100 },
    { month: 'Sep', avg_revenue: 100 },
    { month: 'Oct', avg_revenue: 100 },
    { month: 'Nov', avg_revenue: 100 },
    { month: 'Dec', avg_revenue: 100 },
  ],
  forecasts: [
    {
      period: '2026-01',
      area: 'All',
      product: 'All',
      model_code: 'TEST',
      forecast_scope: 'overall',
      baseline_forecast: 140,
      adjusted_forecast: 150,
      lower_bound: 130,
      upper_bound: 170,
    },
  ],
  externalSignals: [],
  inventoryRecommendations: [],
  regionalPriorities: [],
  modelEvaluation: [],
}

test('missing analytical year can be approximated from forecasts and trained seasonality', () => {
  const rows = buildEstimatedMonthlyRowsForYear(baseData, '2026')

  assert.equal(rows.length, 12)
  assert.equal(rows[0].period, '2026-01')
  assert.equal(rows[0].revenue, 150)
  assert.equal(rows[0].income, 75)
  assert.equal(rows[1].period, '2026-02')
  assert.ok(rows[1].revenue > rows[2].revenue)
})

test('actual monthly rows prevent treating a year as missing', () => {
  assert.equal(hasMonthlyRowsForYear(baseData.monthly, '2025'), true)
  assert.equal(hasMonthlyRowsForYear(baseData.monthly, '2026'), false)
})

test('estimated annual summary is derived from estimated monthly rows', () => {
  const monthlyRows = buildEstimatedMonthlyRowsForYear(baseData, '2026')
  const summary = buildEstimatedYearSummaryForYear(baseData, '2026', monthlyRows)

  assert.equal(summary?.year, '2026')
  assert.equal(summary?.revenue, monthlyRows.reduce((sum, row) => sum + row.revenue, 0))
  assert.equal(summary?.income, monthlyRows.reduce((sum, row) => sum + row.income, 0))
  assert.equal(summary?.transactions, Math.round(summary.revenue * 0.1))
})
