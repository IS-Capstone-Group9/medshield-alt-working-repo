import test from 'node:test'
import assert from 'node:assert/strict'
import { getDatabricksSalesDiagnostics, getDatabricksSalesTransactions, getDatabricksSalesSummary } from '../src/databricksDashboard'

function success(rows: Array<Record<string,string | null>>, columns: string[] = Object.keys(rows[0] || {})) {
  return new Response(JSON.stringify({statement_id:'fixture',status:{state:'SUCCEEDED'},
    manifest:{total_row_count:rows.length,schema:{columns:columns.map((name,position)=>({name,position}))}},
    result:{data_array:rows.map(row=>columns.map(key=>row[key] ?? null))}}),{status:200})
}

test('gateway binds exact scope and lineage reads to one release; distinct scopes cannot share cached data', async () => {
  const originalFetch = globalThis.fetch
  const originalEnvironment = Object.fromEntries(['DATABRICKS_HOST','DATABRICKS_TOKEN','DATABRICKS_SQL_WAREHOUSE_ID','DATABRICKS_DESCRIPTIVE_FACT_VERSION'].map(key=>[key,process.env[key]]))
  const statements: Array<{statement:string; parameters?: Array<{name:string;value:string;type:string}>}> = []
  process.env.DATABRICKS_HOST='https://example.invalid'
  process.env.DATABRICKS_TOKEN='test-only'
  process.env.DATABRICKS_SQL_WAREHOUSE_ID='test'
  process.env.DATABRICKS_DESCRIPTIVE_FACT_VERSION='91'
  globalThis.fetch = async (_input,init) => {
    const request = JSON.parse(String(init?.body)); statements.push(request)
    const sql: string = request.statement
    if (sql.startsWith('SELECT DISTINCT dataset_id')) return success([{dataset_id:'controlled',policy_version:'legacy',area_mapping_sha256:'area91',product_master_sha256:'product91',publication_status:'CANDIDATE'}])
    if (request.parameters?.some((p:{name:string;value:string}) => p.name === 'diagnostic_area' && p.value === 'offline')) return new Response(JSON.stringify({status:{state:'FAILED',error:{message:'Controlled warehouse unavailable'}}}),{status:200})
    if (sql.startsWith('WITH source')) return success([],['dimension','group_key','label','side','revenue'])
    if (sql.includes('COUNT(*) AS total_rows')) return success([{total_rows:'1'}])
    if (sql.includes('COUNT(*) AS rows_extracted')) return success([{rows_extracted:'1',rows_accepted:'1',received_at:'2026-10-05'}])
    if (sql.includes('GROUP BY calendar_year')) return success([{calendar_year:'2025',rows:'1'}])
    if (sql.startsWith('SELECT calendar_year, source_record_id')) return success([{source_record_id:'record-7',canonical_group_id:'RAW:abc',source_file_sha256:'file-sha',source_workbook:'sales.csv',source_row_number:'17',source_layout:'canonical',is_net_sales_eligible:'true',is_gross_margin_eligible:'false',is_quantity_observation_eligible:'true',net_contract_value:'100',gross_margin_amount:'999'}])
    return success([])
  }
  try {
    const selected = {startDate:'2025-01-02',endDate:'2025-01-30',productId:'RAW:abc',area:"reviewer's \\ area",sector:'Unknown',region:'Bicol',territory:'Albay',category:'Medical'}
    const diagnostics = await getDatabricksSalesDiagnostics(selected)
    assert.equal(diagnostics.release.fact_delta_version,91)
    assert.equal(diagnostics.source.release?.area_mapping_sha256,'area91')
    assert.equal(diagnostics.totals.current,null)
    const first = statements.find(row => row.statement.startsWith('WITH source'))!
    assert.ok(first.statement.includes('VERSION AS OF 91'))
    assert.ok(!first.statement.includes(selected.area))
    assert.equal(first.parameters?.find(p=>p.name==='diagnostic_product')?.value,'RAW:abc')
    assert.equal(first.parameters?.find(p=>p.name==='diagnostic_prior_start')?.value,'2024-01-02')
    assert.equal(first.parameters?.find(p=>p.name==='diagnostic_start')?.type,'DATE')
    await getDatabricksSalesDiagnostics({...selected,area:'another area'})
    assert.equal(statements.filter(row=>row.statement.startsWith('WITH source')).length,2)
    const ledger = await getDatabricksSalesTransactions(selected)
    assert.equal(ledger.release.fact_delta_version,91)
    assert.equal(ledger.rows[0].source_record_id,'record-7')
    assert.equal(ledger.rows[0].source_row_number,17)
    assert.equal(ledger.rows[0].source_layout,'canonical')
    assert.equal(ledger.rows[0].source_sheet,'')
    assert.equal(ledger.rows[0].eligible_revenue,100)
    assert.equal(ledger.rows[0].eligible_income,null)
    assert.equal(ledger.filters.region,'Bicol')
    assert.equal(ledger.filters.category,'Medical')
    const detail = statements.find(row=>row.statement.startsWith('SELECT calendar_year, source_record_id'))!
    assert.ok(detail.statement.includes('date_delivered BETWEEN :diagnostic_start AND :diagnostic_end'))
    assert.ok(!detail.statement.includes('raw_csv_line AS source_row_number'))
    assert.equal(detail.parameters?.find(p=>p.name==='diagnostic_area')?.value,selected.area)
    const summary = await getDatabricksSalesSummary(selected)
    assert.equal(summary.release.product_master_sha256,'product91')
    assert.equal(summary.filters.start_date,'2025-01-02')
    const before = statements.length
    await assert.rejects(getDatabricksSalesDiagnostics({...selected,startDate:['2025-01-01']}),/YYYY-MM-DD/)
    assert.equal(statements.length,before)
    for (let attempt = 0; attempt < 2; attempt++) await assert.rejects(getDatabricksSalesDiagnostics({...selected,area:'offline'}),{status:503,code:'DATABRICKS_SOURCE_UNAVAILABLE'})
    assert.equal(statements.filter(row=>row.parameters?.some(p=>p.value==='offline')).length,2)
    assert.ok(statements.filter(row=>row.statement.includes('sales_restart_fact_candidate')).every(row=>row.statement.includes('VERSION AS OF 91')))
  } finally {
    globalThis.fetch=originalFetch
    for (const [key,value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key]
      else process.env[key]=value
    }
  }
})
