import assert from 'node:assert/strict'
import { test } from 'node:test'

type FixtureRow = Record<string, string | null>

test('gateway preserves missing measurements, observed zeros and partial totals', async () => {
  process.env.DATABRICKS_HOST = 'https://fixture.invalid'
  process.env.DATABRICKS_TOKEN = 'fixture-only'
  process.env.DATABRICKS_SQL_WAREHOUSE_ID = 'fixture'
  process.env.DATABRICKS_DESCRIPTIVE_FACT_VERSION = '91'
  const originalFetch = globalThis.fetch
  const statements: string[] = []
  function success(rows: FixtureRow[]) {
    const columns = Object.keys(rows[0] ?? {})
    return new Response(JSON.stringify({ statement_id: 'fixture', status: { state: 'SUCCEEDED' },
      manifest: { total_row_count: rows.length, schema: { columns: columns.map((name, position) => ({ name, position })) } },
      result: { data_array: rows.map(row => columns.map(key => row[key] ?? null)) } }), { status: 200 })
  }
  globalThis.fetch = async (_url, init) => {
    const sql = JSON.parse(String(init?.body)).statement as string
    statements.push(sql)
    if (sql.startsWith('SELECT DISTINCT dataset_id')) return success([{ dataset_id: 'null-contract', policy_version: 'legacy',
      area_mapping_sha256: 'fixture-area', product_master_sha256: 'fixture-products', publication_status: 'candidate' }])
    if (sql.includes('COUNT(*) AS total_rows')) return success([{ total_rows: '2' }])
    if (sql.includes('COUNT(*) AS rows_extracted')) return success([{ rows_extracted: '2', rows_accepted: '2',
      duplicate_rows: '0', rows_with_warnings: '2', valid_rows: '0', unique_products: '2', unique_dr_numbers: '2' }])
    if (sql.startsWith('SELECT calendar_year, source_record_id')) {
      const base = { calendar_year: '2025', source_record_id: 'missing', product: 'Unknown label',
        is_net_sales_eligible: 'false', is_gross_margin_eligible: 'false', is_quantity_observation_eligible: 'false',
        quantity: null, contract_price_unit: null, gross_contract_value: null, discount_amount: null, net_contract_value: null,
        transfer_price_unit: null, total_transfer_price: null, gross_margin_amount: null, gross_margin_pct: null }
      return success([base, { ...base, source_record_id: 'observed-zero', quantity: '0', contract_price_unit: '0',
        gross_contract_value: '0', discount_amount: '0', net_contract_value: '0', transfer_price_unit: '0',
        total_transfer_price: '0', gross_margin_amount: '0', gross_margin_pct: '0' }])
    }
    if (sql.includes('COUNT(*) AS rows, COUNT(DISTINCT normalized_product)')) {
      const observed = sql.includes('calendar_year = 2024')
      const value = observed ? '0' : null
      return success([{ rows: observed ? '1' : '2', accepted_rows: observed ? '1' : '2', sku_count: '1', unique_dr_numbers: '1',
        quantity: value, total_cost: value, net_cost: value, total_trade_price: value, net_income: value,
        avg_quantity: value, avg_unit_cost: value, avg_net_income: value, gross_margin_rate: null,
        mismatched_rows: '0', checked_rows: '0', reconciliation_delta: '0' }])
    }
    if (sql.includes('SELECT calendar_year,\n      COUNT(*) AS transaction_count')) return success([
      { calendar_year: '2023', transaction_count: '1', net_sales_candidate: null, gross_margin_candidate: null, margin_revenue_basis: null },
      { calendar_year: '2024', transaction_count: '1', net_sales_candidate: '0', gross_margin_candidate: '0', margin_revenue_basis: '0' },
      { calendar_year: '2025', transaction_count: '1', net_sales_candidate: '100', gross_margin_candidate: '20', margin_revenue_basis: '100' },
    ])
    if (sql.includes('GROUP BY calendar_year')) return success([{ calendar_year: '2025', rows: '2' }])
    if (sql.includes('WITH month_spine')) return success([
      { year_month: '2023-01', transaction_count: '1', has_sales_activity: 'true', net_sales_candidate: null, gross_margin_candidate: null, margin_revenue_basis: null },
      { year_month: '2024-01', transaction_count: '1', has_sales_activity: 'true', net_sales_candidate: '0', gross_margin_candidate: '0', margin_revenue_basis: '0' },
    ])
    if (sql.includes('WITH product_totals')) return success([{ product_name: 'Unknown label', qty: null, revenue: null, income: null,
      positive_sales: '0', returns_value: '0', product_revenue_total: '0', cumulative_revenue: '0' }])
    if (sql.includes('WITH monthly_fact')) return success([{ month: 'Jan', avg_revenue: null, observed_month_count: '0' }])
    if (sql.includes('AS area_name')) return success([{ area_name: 'UNKNOWN', revenue: null, income: null }])
    if (sql.includes('AS area FROM')) return success([{ area: 'UNKNOWN' }])
    if (sql.includes('AS product FROM')) return success([{ product: 'Unknown label' }])
    if (sql.includes('vw_dss_external_signals_candidate')) return success([])
    throw new Error('Unexpected warehouse fixture statement')
  }
  try {
    const { getDatabricksSalesTransactions, getDatabricksSalesSummary, loadDatabricksDashboardSnapshot } = await import('../src/databricksDashboard')
    const ledger = await getDatabricksSalesTransactions({})
    for (const field of ['quantity', 'unit_cost', 'total_cost', 'discount', 'net_cost', 'trade_price_unit', 'total_trade_price', 'net_income', 'margin_pct'] as const) {
      assert.equal(ledger.rows[0][field], null, `missing ledger ${field}`)
      assert.equal(ledger.rows[1][field], 0, `observed zero ledger ${field}`)
    }
    const missingSummary = await getDatabricksSalesSummary({})
    assert.ok(Object.values(missingSummary.sums).every(value => value === null))
    assert.ok(Object.values(missingSummary.averages).every(value => value === null))
    const zeroSummary = await getDatabricksSalesSummary({ year: '2024' })
    assert.ok(Object.values(zeroSummary.sums).every(value => value === 0))
    assert.equal(zeroSummary.averages.unit_cost, 0)
    assert.equal(zeroSummary.gross_margin_rate, null, 'zero denominator has no usable rate')
    const snapshot = await loadDatabricksDashboardSnapshot()
    assert.equal(snapshot.totals.total_revenue, 100)
    assert.equal(snapshot.totals.total_income, 20)
    assert.equal(snapshot.totals.avg_margin, 20)
    assert.equal(snapshot.year_summary[0].revenue, null)
    assert.equal(snapshot.year_summary[0].income, null)
    assert.equal(snapshot.year_summary[1].revenue, 0)
    assert.equal(snapshot.by_area[0].revenue, null)
    assert.equal(snapshot.by_area[0].income, null)
    assert.equal(snapshot.top_products[0].income, null)
    assert.equal(snapshot.top_products[0].qty, null)
    assert.equal(snapshot.top_products[0].pct_of_total, null)
    assert.equal(snapshot.monthly[0].missing, true)
    assert.equal(snapshot.monthly[0].revenue, null)
    assert.equal(snapshot.monthly[1].missing, false)
    assert.equal(snapshot.monthly[1].revenue, 0)
    const summarySql = statements.find(sql => sql.includes('COUNT(*) AS rows, COUNT(DISTINCT normalized_product)'))!
    for (const expression of ['quantity', 'gross_sales', 'net_sales', 'total_acquisition_cost', 'gross_margin_amount']) {
      assert.match(summarySql, new RegExp(`THEN ${expression} END`), `no-observation SUM retains NULL for ${expression}`)
    }
  } finally {
    globalThis.fetch = originalFetch
  }
})
