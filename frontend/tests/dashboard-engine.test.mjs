import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('revenue detail charts use completed-year rows through December', () => {
  const source = readFileSync(new URL('../services/api/dashboard-engine.ts', import.meta.url), 'utf8')
  const interactions = readFileSync(new URL('../services/api/dashboard-interactions.ts', import.meta.url), 'utf8')
  const dashboardService = readFileSync(new URL('../services/api/dashboard.service.ts', import.meta.url), 'utf8')
  const chartService = readFileSync(new URL('../services/api/dashboard-decision-charts.ts', import.meta.url), 'utf8')
  const enhancements = readFileSync(new URL('../services/api/dashboard-enhancements.ts', import.meta.url), 'utf8')

  assert.match(source, /function getRevenueDetailData\(rowsOverride\)/)
  assert.match(source, /Array\.isArray\(rowsOverride\)/)
  assert.match(source, /getRevenueDetailData\(detailMonthlyRows\)/)
  assert.match(source, /completeHistoricalRevenueDetailRows/)
  assert.match(source, /Array\.from\(\{ length: 12 \}/)
  assert.match(source, /Return to the card's native width after an all-years scrollable view/)
  assert.match(interactions, /const completedYears = new Set\(/)
  assert.match(interactions, /year < currentCalendarYear/)
  assert.match(source, /\$\{labels\[Number\(month\) - 1\]\} '\$\{year\.slice\(2\)\}/)
  assert.match(dashboardService, /const FIRST_REPORTING_YEAR = 2017/)
  assert.match(dashboardService, /year >= FIRST_REPORTING_YEAR && year <= latestYear/)
  assert.match(chartService, /function renderFinancialForecastChart/)
  assert.match(chartService, /Projected net income/)
  assert.match(enhancements, /id="financialForecastChart"/)
  assert.match(source, /function completeHistoricalMonthlyRows/)
  assert.match(source, /DATA\.monthly = completeHistoricalMonthlyRows\(DATA\.monthly, DATA\.year_summary\)/)
  assert.match(source, /As of ' \+ detailCurrentDateLabel/)
})
