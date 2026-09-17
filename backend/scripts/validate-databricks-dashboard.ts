import assert from 'node:assert/strict'
import 'dotenv/config'
import { executeDatabricksStatement } from '../src/databricks'
import {
  getDatabricksExternalRegression,
  getDatabricksForecastValidation,
  getDatabricksSalesHeatmap,
  getDatabricksSalesSectors,
  getDatabricksSalesStatus,
  getDatabricksSalesSummary,
  getDatabricksSalesTransactions,
  getDatabricksPlanningShortlist,
  getDatabricksWeatherEffects,
  loadDatabricksDashboardSnapshot,
} from '../src/databricksDashboard'

async function main() {
  const [snapshot, status, summary, transactions, heatmap, sectors, forecast, regression, planning, weather, eligibility] =
    await Promise.all([
      loadDatabricksDashboardSnapshot(),
      getDatabricksSalesStatus(),
      getDatabricksSalesSummary({}),
      getDatabricksSalesTransactions({ page: 1, pageSize: 5 }),
      getDatabricksSalesHeatmap(),
      getDatabricksSalesSectors(),
      getDatabricksForecastValidation({ sector: 'Unknown', metric: 'revenue' }),
      getDatabricksExternalRegression({ sector: 'Unknown', metric: 'revenue' }),
      getDatabricksPlanningShortlist({ sector: 'Unknown', territory: 'all' }),
      getDatabricksWeatherEffects({ grain: 'monthly' }),
      executeDatabricksStatement(`SELECT
        COUNT(*) AS accepted_rows,
        SUM(CASE WHEN is_net_sales_eligible THEN 1 ELSE 0 END) AS net_sales_eligible,
        SUM(CASE WHEN is_gross_margin_eligible THEN 1 ELSE 0 END) AS gross_margin_eligible,
        SUM(CASE WHEN is_quantity_observation_eligible THEN 1 ELSE 0 END) AS quantity_eligible
        FROM workspace.medshield_gold.sales_restart_fact_candidate
        WHERE is_analysis_candidate = TRUE`, { rowLimit: 5 }),
    ])

  const quality = status.quality_summary
  const eligible = eligibility.rows[0] ?? {}
  const ownership = [...new Set(sectors.rows.map((row) => row.sector))]

  assert.equal(snapshot.data_status.source, 'databricks', 'snapshot source')
  assert.equal(snapshot.data_status.mode, 'live', 'snapshot mode')
  assert.equal(snapshot.monthly.length, 108, 'monthly contract rows')
  assert.equal(snapshot.year_summary.length, 9, 'yearly contract rows')
  assert.equal(snapshot.top_products.length, 15, 'top product rows')
  assert.equal(quality.duplicate_rows, 0, 'duplicate fact rows')
  assert.equal(Object.keys(quality.years).length, 9, 'fact year count')
  assert.equal(summary.counts.rows, quality.rows_accepted, 'summary/fact accepted population')
  assert.equal(snapshot.totals.total_transactions, quality.rows_accepted, 'dashboard/fact transaction population')
  assert.equal(transactions.pagination.total_rows, quality.rows_accepted, 'transaction/fact accepted population')
  assert.equal(transactions.rows.length, 5, 'transaction page rows')
  assert.ok(
    Math.abs(summary.sums.net_cost - snapshot.totals.total_revenue) < 0.01,
    `summary/snapshot net sales: ${summary.sums.net_cost} vs ${snapshot.totals.total_revenue}`,
  )
  assert.deepEqual(ownership, ['Unknown'], 'buyer ownership values')
  assert.deepEqual(Object.keys(forecast.views), ['3', '6', '12'], 'forecast horizons')
  assert.equal(regression.status, 'blocked', 'external regression gate')
  assert.ok(regression.coverage.sales_months > 0, 'external regression sales coverage')
  assert.ok(planning.products.length > 0, 'planning shortlist')
  assert.equal(weather.metadata.provider, 'PAGASA', 'weather provider')
  assert.equal(weather.metadata.sales_matched_rows, 0, 'unapproved PAGASA/sales matches')

  console.log(JSON.stringify({
    snapshot: {
      monthly_rows: snapshot.monthly.length,
      yearly_rows: snapshot.year_summary.length,
      areas: snapshot.by_area.length,
      products: snapshot.top_products.length,
      dashboard_transaction_count: snapshot.totals.total_transactions,
    },
    fact_quality: {
      extracted_rows: quality.rows_extracted,
      accepted_rows: quality.rows_accepted,
      valid_rows: quality.valid_rows,
      warning_rows: quality.rows_with_warnings,
      duplicate_rows: quality.duplicate_rows,
      net_sales_eligible_rows: Number(eligible.net_sales_eligible ?? 0),
      gross_margin_eligible_rows: Number(eligible.gross_margin_eligible ?? 0),
      quantity_eligible_rows: Number(eligible.quantity_eligible ?? 0),
      period: [quality.source_period_start, quality.source_period_end],
    },
    financial_reconciliation: {
      rows: summary.counts.rows,
      net_sales: summary.sums.net_cost,
      gross_profit: summary.sums.net_income,
      mismatched_rows: summary.financial_reconciliation.mismatched_rows,
    },
    heatmap: {
      aggregate_rows: heatmap.monthly.length,
      included_fact_rows: heatmap.source.included_rows,
    },
    buyer_ownership: {
      aggregate_rows: sectors.rows.length,
      included_fact_rows: sectors.source.included_rows,
      published_values: ownership,
    },
    forecast: {
      observed_months: forecast.observed_months,
      origin: forecast.origin,
      horizons: Object.keys(forecast.views),
    },
    external_regression: { status: regression.status, reason: regression.reason },
    pagasa: {
      rows: weather.metadata.rows_returned,
      period: [weather.metadata.period_start, weather.metadata.period_end],
      sales_matches: weather.metadata.sales_matched_rows,
    },
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : error)
  process.exit(1)
})
