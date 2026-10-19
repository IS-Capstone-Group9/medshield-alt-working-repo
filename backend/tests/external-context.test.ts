import assert from 'node:assert/strict'
import test from 'node:test'
import { buildExternalContext } from '../src/externalContext'
import { getDatabricksExternalRegression } from '../src/databricksDashboard'
import { databricksLiteral } from '../src/databricksLiteral'

const scope = { mode: 'combined', disease: 'Dengue', provider: 'PAGASA', lag: 1, rainfallLag: 2, metric: 'revenue' }
const sales = [{ period: '2025-01', sales: '0' }, { period: '2025-02', sales: '-50' }]
const signal = { period: '2024-12', source: 'DOH', signal: 'Dengue', signal_value: '0', mapping_status: 'pending', is_external_join_ready: 'false' }
const rain = { ...signal, period: '2024-11', source: 'PAGASA', signal: 'RAINFALL_TOTAL_MM', signal_value: '20' }

test('context aligns lags without multiplying sales, preserves zero/signed/null and pending mapping', () => {
  const c = buildExternalContext(sales, [signal, rain], scope)
  assert.equal(c.rows.length, 108)
  assert.equal(c.sales_months, 2)
  assert.equal(c.coobserved_months, 1)
  assert.equal(c.join_ready_months, 0)
  const jan = c.rows.find(r => r.period === '2025-01')!
  assert.equal(jan.sales, 0)
  assert.deepEqual(jan.signals.map(s => [s.period, s.value]), [['2024-12', 0], ['2024-11', 20]])
  assert.equal(c.rows.find(r => r.period === '2025-02')!.sales, -50)
  assert.equal(c.rows[0].sales, null)
  assert.equal(c.rows[0].signals[0].value, null)
  assert.equal(c.rows.reduce((sum, row) => sum + (row.sales ?? 0), 0), -50)
  assert.throws(() => buildExternalContext([...sales, sales[0]], [signal], scope), /Duplicate monthly/)
  assert.throws(() => buildExternalContext(sales, [signal, signal], scope), /Duplicate external/)
  assert.throws(() => buildExternalContext(sales, [{ ...signal, signal_value: 'NaN' }], scope), /Nonfinite/)
  assert.equal(buildExternalContext(sales, [signal], {...scope, metric: 'quantity'}).sales_months, 0)
})

test('gateway context uses selected buyer, product and approved geography, validates options and fails closed', async () => {
  const keys = ['DATABRICKS_HOST', 'DATABRICKS_TOKEN', 'DATABRICKS_SQL_WAREHOUSE_ID', 'DATABRICKS_DESCRIPTIVE_FACT_VERSION']
  const before = keys.map(k => process.env[k])
  keys.forEach((k, i) => { process.env[k] = ['https://external-context.invalid', 'fixture', 'fixture', '16'][i] })
  const previousFetch = globalThis.fetch
  const statements: string[] = []
  globalThis.fetch = async (_, init) => {
    const sql = JSON.parse(String(init?.body)).statement as string
    statements.push(sql)
    if (sql.includes(databricksLiteral('OUTAGE'))) throw new Error('External context fixture outage')
    const rows: Array<Record<string, string | null>> = sql.includes('SELECT DISTINCT dataset_id')
      ? [{ dataset_id: 'fixture', policy_version: 'fixture', publication_status: 'candidate' }]
      : sql.includes('AS sales') ? (sql.includes(`= ${databricksLiteral('Private')}`) ? sales : [])
      : sql.includes('AS product') ? []
      : sql.includes('SELECT period, source') ? [signal, rain]
      : sql.includes('SELECT DISTINCT INITCAP') ? [{ territory: 'Quezon' }]
      : (() => { throw new Error('Unexpected fixture SQL') })()
    const columns = Object.keys(rows[0] ?? {})
    return new Response(JSON.stringify({ statement_id: 'fixture', status: {state: 'SUCCEEDED'}, manifest: { total_row_count: rows.length, schema: {columns: columns.map((name, position) => ({name, position}))}}, result: {data_array: rows.map(r => columns.map(c => r[c]))} }))
  }
  try {
    const c = await getDatabricksExternalRegression({ sector: 'Private', territory: 'Quezon', mode: 'combined', rainfall_lag: '2', product: 'PRODUCT' })
    assert.equal(c.context.coobserved_months, 1)
    assert.equal(c.status, 'blocked')
    const gov = await getDatabricksExternalRegression({ sector: 'Government', territory: 'Quezon' })
    assert.equal(gov.context.sales_months, 0)
    assert.ok(statements.filter(s => s.includes('AS sales') || s.includes('AS product')).every(s => s.includes('is_geographic_territory_approved = TRUE') && s.includes('VERSION AS OF 16') && s.includes('ELSE \'Unknown\' END) =')))
    assert.ok(statements.some(s => s.includes(`normalized_product = ${databricksLiteral('PRODUCT')}`)))
    assert.ok(statements.filter(s => s.includes('AS sales')).every(s => s.includes('THEN net_sales END')))
    for (const invalid of [{lag:'4'}, {rainfall_lag:'7'}, {provider:'NASA'}, {disease:'Invalid'}, {sector:'invalid'}]) await assert.rejects(getDatabricksExternalRegression(invalid), /Invalid|Unsupported/)
    await assert.rejects(getDatabricksExternalRegression({territory:'OUTAGE'}), /fixture outage/)
  } finally {
    globalThis.fetch = previousFetch
    keys.forEach((k, i) => { if (before[i] === undefined) delete process.env[k]; else process.env[k] = before[i] })
  }
})
