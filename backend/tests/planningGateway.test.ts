import assert from 'node:assert/strict'
import test from 'node:test'
import { getDatabricksPlanningShortlist } from '../src/databricksDashboard'
import { databricksLiteral } from '../src/databricksLiteral'

test('planning scopes distinguish Unknown from All and use exclusive buyer classification', async () => {
  const keys = ['DATABRICKS_HOST', 'DATABRICKS_TOKEN', 'DATABRICKS_SQL_WAREHOUSE_ID', 'DATABRICKS_DESCRIPTIVE_FACT_VERSION']
  const previous = keys.map(key => process.env[key])
  keys.forEach((key, index) => { process.env[key] = ['https://warehouse.invalid', 'fixture-token', 'fixture', '19'][index] })
  const originalFetch = globalThis.fetch
  const statements: string[] = []
  globalThis.fetch = async (_url, init) => {
    const sql = JSON.parse(String(init?.body)).statement as string
    statements.push(sql)
    let rows: Array<Record<string, string | null>>
    if (sql.includes('SELECT DISTINCT dataset_id')) rows = [{dataset_id:'planning-scope-fixture',policy_version:'fixture',area_mapping_sha256:'area',product_master_sha256:'products',publication_status:'candidate'}]
    else if (sql.includes('SELECT DISTINCT INITCAP')) rows = [{territory:'Quezon'}]
    else if (sql.includes('AS period_end')) rows = [{period_end:'2025-12'}]
    else if (sql.includes('AS product')) rows = [{product:'Fixture product',revenue:'100',quantity:'2',observed_months:'1'}]
    else throw new Error(`Unexpected planning fixture query: ${sql}`)
    const columns = Object.keys(rows[0] || {})
    return new Response(JSON.stringify({statement_id:'planning-fixture',status:{state:'SUCCEEDED'},
      manifest:{total_row_count:rows.length,schema:{columns:columns.map((name,position)=>({name,position}))}},
      result:{data_array:rows.map(row=>columns.map(name=>row[name]))}}),{status:200})
  }
  try {
    const start = statements.length
    const all = await getDatabricksPlanningShortlist({})
    assert.equal(all.scope.sector,'All')
    assert.ok(statements.slice(start).filter(sql=>sql.includes('AS period_end') || sql.includes('AS product')).every(sql=>!sql.includes("ELSE 'Unknown' END) =")))
    for (const sector of ['Unknown','Government','Private','Internal']) {
      const index = statements.length
      const selected = await getDatabricksPlanningShortlist({sector})
      assert.equal(selected.scope.sector,sector)
      const scopeQueries = statements.slice(index).filter(sql=>sql.includes('AS period_end') || sql.includes('AS product'))
      assert.ok(scopeQueries.length > 0)
      assert.ok(scopeQueries.every(sql=>sql.includes(`ELSE 'Unknown' END) = ${databricksLiteral(sector)}`)))
      // The ordered CASE excludes Government/Internal from Private even if the
      // geography proposal labels their source area as a territory.
      assert.ok(scopeQueries.every(sql=>sql.indexOf("THEN 'Government'") < sql.indexOf("THEN 'Internal'") && sql.indexOf("THEN 'Internal'") < sql.indexOf("THEN 'Private'")))
      assert.ok(scopeQueries.every(sql=>sql.includes('month_start < DATE')))
    }
    await assert.rejects(getDatabricksPlanningShortlist({sector:"Unknown' OR 1=1"}),/Invalid buyer cluster/)
  } finally {
    globalThis.fetch = originalFetch
    keys.forEach((key,index)=>{if(previous[index]===undefined)delete process.env[key];else process.env[key]=previous[index]})
  }
})
