import test from 'node:test'
import assert from 'node:assert/strict'

import {
  areaRowsForView,
  buildEstimatedAreaRowsForYear,
  buildEstimatedMonthlyRowsForYear,
  buildEstimatedYearSummaryForYear,
  hasMonthlyRowsForYear,
  resolveWeightedForwardProfitMargin,
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

test('current analytical year keeps actual months and estimates remaining months', () => {
  const data = {
    ...baseData,
    monthly: [
      ...baseData.monthly,
      { period: '2026-01', revenue: 90, income: 45 },
      { period: '2026-08', revenue: 180, income: 81 },
    ],
    forecasts: [
      ...baseData.forecasts,
      {
        period: '2026-09',
        area: 'All',
        product: 'All',
        model_code: 'TEST',
        forecast_scope: 'overall',
        baseline_forecast: 190,
        adjusted_forecast: 210,
        lower_bound: 170,
        upper_bound: 230,
      },
    ],
  }
  const rows = buildEstimatedMonthlyRowsForYear(data, '2026')

  assert.equal(rows.length, 12)
  assert.deepEqual(rows.find((row) => row.period === '2026-01'), { period: '2026-01', revenue: 90, income: 45 })
  assert.deepEqual(rows.find((row) => row.period === '2026-08'), { period: '2026-08', revenue: 180, income: 81 })
  assert.equal(rows.find((row) => row.period === '2026-09')?.revenue, 210)
  assert.equal(rows.find((row) => row.period === '2026-09')?.income, 105)
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

test('weighted forward margin rejects impossible 100%+ income ratios', () => {
  const margin = resolveWeightedForwardProfitMargin({
    ...baseData,
    yearSummary: [
      { year: '2023', revenue: 100, income: 140, transactions: 10 },
      { year: '2024', revenue: 100, income: 90, transactions: 10 },
      { year: '2025', revenue: 100, income: 72, transactions: 10 },
    ],
  })

  assert.equal(Number(margin.toFixed(4)), 0.7733)
  assert.ok(margin < 1)
})

test('estimated annual net income remains below estimated revenue', () => {
  const data = {
    ...baseData,
    yearSummary: [
      { year: '2023', revenue: 100, income: 140, transactions: 10 },
      { year: '2024', revenue: 100, income: 90, transactions: 10 },
      { year: '2025', revenue: 100, income: 72, transactions: 10 },
    ],
  }
  const summary = buildEstimatedYearSummaryForYear(data, '2026')

  assert.ok(summary)
  assert.ok(summary.income < summary.revenue)
})

test('areaRowsForView returns all-years cumulative data when year is all or missing', () => {
  const data = {
    ...baseData,
    byArea: [
      { area: 'Quezon', revenue: 1000, income: 500 },
      { area: 'Batangas', revenue: 800, income: 400 },
    ],
  }
  const result = areaRowsForView(data, 'all')
  assert.equal(result.isEstimated, false)
  assert.equal(result.selectedYear, 'All available years')
  assert.equal(result.rows.length, 2)
  assert.equal(result.rows[0].area, 'Quezon')
})

test('areaRowsForView retrieves exact historical year slice from byYearArea', () => {
  const data = {
    ...baseData,
    byArea: [{ area: 'Quezon', revenue: 1000, income: 500 }],
    byYearArea: {
      '2024': [{ area: 'Batangas', revenue: 400, income: 200 }],
      '2025': [{ area: 'Quezon', revenue: 600, income: 300 }],
    },
  }
  const view2024 = areaRowsForView(data, '2024')
  assert.equal(view2024.isEstimated, false)
  assert.equal(view2024.selectedYear, '2024')
  assert.equal(view2024.rows[0].area, 'Batangas')
  assert.equal(view2024.rows[0].revenue, 400)

  const view2025 = areaRowsForView(data, '2025')
  assert.equal(view2025.isEstimated, false)
  assert.equal(view2025.selectedYear, '2025')
  assert.equal(view2025.rows[0].area, 'Quezon')
  assert.equal(view2025.rows[0].revenue, 600)
})

test('buildEstimatedAreaRowsForYear projects 2026 recency-weighted estimates with sound margins', () => {
  const data = {
    ...baseData,
    byYearArea: {
      '2023': [
        { area: 'Quezon', revenue: 100, income: 50 },
        { area: 'Batangas', revenue: 200, income: 100 },
      ],
      '2024': [
        { area: 'Quezon', revenue: 200, income: 100 },
        { area: 'Batangas', revenue: 200, income: 100 },
      ],
      '2025': [
        { area: 'Quezon', revenue: 400, income: 200 },
        { area: 'Batangas', revenue: 100, income: 50 },
      ],
    },
  }
  const view2026 = areaRowsForView(data, '2026')
  assert.equal(view2026.isEstimated, true)
  assert.equal(view2026.selectedYear, '2026')
  assert.ok(view2026.rows.length >= 2)

  // Because 2025 has highest weight (3) and Quezon had 80% share in 2025, Quezon should lead 2026
  assert.equal(view2026.rows[0].area, 'Quezon')
  assert.ok(view2026.rows[0].revenue > view2026.rows[1].revenue)
  assert.ok(view2026.rows[0].income < view2026.rows[0].revenue)
  assert.ok(view2026.rows[0].income > 0)
})
