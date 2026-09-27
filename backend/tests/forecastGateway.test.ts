import assert from 'node:assert/strict'
import test from 'node:test'
import {getDatabricksForecastValidation} from '../src/databricksDashboard'

test('actual gateway preserves missing/zero, excludes future, isolates Unknown and fails on warehouse outage', async () => {
  const keys = ['DATABRICKS_HOST', 'DATABRICKS_TOKEN', 'DATABRICKS_SQL_WAREHOUSE_ID', 'DATABRICKS_DESCRIPTIVE_FACT_VERSION']
  const previous = keys.map(key => process.env[key])
  keys.forEach((key, i) => { process.env[key] = ['https://warehouse.invalid', 'fixture-token', 'fixture', '16'][i] })
  const originalFetch = globalThis.fetch
  const statements: string[] = []
  globalThis.fetch = async (_url, init) => {
    const sql = JSON.parse(String(init?.body)).statement as string
    statements.push(sql)
    if (sql.includes("'OUTAGE'")) throw new Error('Warehouse fixture outage')
    let rows: Array<Record<string, string | null>>
    if (sql.includes('SELECT DISTINCT dataset_id')) rows = [{dataset_id:'fixture-dataset', policy_version:'fixture-policy', area_mapping_sha256:'area-hash', product_master_sha256:'product-hash', publication_status:'candidate'}]
    else if (sql.includes('AS months')) rows = [{months:'3', not_closed:'1'}]
    else if (sql.includes('COUNT(DISTINCT normalized_product)')) rows = [{n:'1'}]
    else if (sql.includes('SELECT DISTINCT normalized_product')) rows = [{product:'fixture-product'}]
    else if (sql.includes('AS actual')) rows = [{period:'2020-01', actual:null, source_rows:'1',eligible_rows:'0'}, {period:'2021-01',actual:'0',source_rows:'1',eligible_rows:'1'}, {period:'9999-01',actual:'777',source_rows:'1',eligible_rows:'1'}]
    else throw new Error(`Unexpected fixture statement: ${sql}`)
    const columns = Object.keys(rows[0] ?? {})
    return new Response(JSON.stringify({statement_id:'fixture-statement',status:{state:'SUCCEEDED'},manifest:{total_row_count:rows.length,schema:{columns:columns.map((name,position)=>({name,position}))}},result:{data_array:rows.map(row=>columns.map(name=>row[name]))}}),{status:200})
  }
  try {
    const all = await getDatabricksForecastValidation({sector:'All'})
    assert.deepEqual(all.actuals.map(row=>row.actual), [null, 0])
    assert.equal(all.origin, '2021-01')
    assert.equal(all.source.excluded_not_closed, 1)
    assert.equal(all.reporting_coverage_status, 'unverified')
    assert.equal(all.publication_status, 'unpublished')
    assert.equal(all.evaluation_protocol, 'fixed_origin_multi_step')
    assert.ok(statements.filter(sql=>sql.includes('AS actual')).every(sql=>sql.includes('THEN net_sales END') && !sql.includes('THEN net_sales ELSE 0')))
    const unknown = await getDatabricksForecastValidation({sector:'Unknown'})
    assert.equal(unknown.status, 'blocked')
    assert.deepEqual(unknown.views, {})
    assert.ok(statements.some(sql=>sql.includes("ELSE 'Unknown' END) = 'Unknown'")))
    assert.ok(statements.filter(sql=>sql.includes('sales_restart_fact_candidate')).every(sql=>sql.includes('VERSION AS OF 16')))
    await assert.rejects(getDatabricksForecastValidation({product:'OUTAGE'}), /Warehouse fixture outage/)
    await assert.rejects(getDatabricksForecastValidation({sector:'unknown'}), /Invalid buyer cluster/)
  } finally {
    globalThis.fetch = originalFetch
    keys.forEach((key,i)=> {if(previous[i]===undefined) delete process.env[key]; else process.env[key]=previous[i]})
  }
})
