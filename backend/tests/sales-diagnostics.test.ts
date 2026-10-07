import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSalesDiagnostics, diagnosticStatement, parseDiagnosticScope, type DiagnosticRow } from '../src/salesDiagnostics'

const scope = () => parseDiagnosticScope({startDate:'2025-01-01', endDate:'2025-01-31'})
function row(dimension: string, key: string, side: string, revenue: string | null, extra: DiagnosticRow = {}): DiagnosticRow {
  return {dimension, group_key:key, label:key, side, revenue, income:null, margin_revenue_basis:null,
    row_count:'1', net_sales_eligible_rows:revenue === null ? '0' : '1', gross_margin_eligible_rows:'0',
    original_source_rows:'0', adjusted_estimated_rows:'1', unresolved_product_rows:'1', negative_sales:'0', ...extra}
}
function fixture(current = '200', prior = '100') {
  return ['coverage','month','total','product','area','sector'].flatMap(dimension => {
    const key = ['coverage','month'].includes(dimension) ? '2025-01' : dimension === 'total' ? 'total' : dimension === 'product' ? 'RAW:A' : dimension === 'area' ? 'Government' : 'Government'
    return [row(dimension,key,'current',current), row(dimension,key,'prior',prior)]
  })
}

test('exact scope clamps leap boundaries and supports future years without fabricated data', () => {
  const leap = parseDiagnosticScope({startDate:'2024-02-29',endDate:'2024-03-01'})
  assert.equal(leap.prior_start_date,'2023-02-28')
  assert.equal(leap.prior_end_date,'2023-03-01')
  const future = buildSalesDiagnostics(parseDiagnosticScope({startDate:'2031-01-01',endDate:'2031-01-31'}),[])
  assert.equal(future.totals.current,null)
  assert.equal(future.totals.delta,null)
  assert.equal(future.contributions.month[0].prior,null)
  assert.deepEqual(future.coverage.missing_current_months,['2031-01'])
})

test('invalid and structured filters fail before data access', () => {
  for (const patch of [{startDate:'2025-02-30'},{startDate:['2025-01-01']},{endDate:'2024-12-31'}, {sector:'Other'}, {productId:'ITEM A'}, {area:'bad\narea'}, {region:['Bicol']}]) {
    assert.throws(() => parseDiagnosticScope({startDate:'2025-01-01',endDate:'2025-01-31',...patch}))
  }
})

test('all external filters remain bound and overlapping long scopes keep separate sides', () => {
  const value = "reviewer's \\area; DROP TABLE x --"
  const selected = parseDiagnosticScope({startDate:'2024-01-02',endDate:'2025-03-11',productId:'RAW:abc',area:value,sector:'Unknown',region:'Bicol',territory:'Albay',category:'Medical'})
  const result = diagnosticStatement(selected,{fact:'fact',population:'valid',product:'group_id',title:'title',sector:'sector',identity:'identity',evidence:'evidence',region:'region',territory:'territory',category:'category'})
  assert.ok(!result.statement.includes(value))
  assert.ok(!result.statement.includes('RAW:abc'))
  assert.equal(result.parameters.find(p => p.name === 'diagnostic_area')?.value,value)
  assert.equal(result.parameters.find(p => p.name === 'diagnostic_prior_start')?.value,'2023-01-02')
  assert.equal(result.parameters.find(p => p.name === 'diagnostic_category')?.value,'Medical')
  assert.ok(result.statement.includes('UNION ALL'))
  assert.ok(result.statement.includes('GROUP BY diagnostic_product, side'))
  assert.ok(!/LIMIT\s+\d+/i.test(result.statement))
})

test('signed product changes reconcile across the full population without hiding offsets', () => {
  const rows = fixture().filter(r => r.dimension !== 'product')
  rows.push(row('product','RAW:A','current','300'),row('product','RAW:A','prior','100'),row('product','RAW:B','current','-100'))
  const result = buildSalesDiagnostics(scope(),rows)
  assert.equal(result.totals.delta,100)
  assert.deepEqual(result.contributions.product.map(r => [r.key,r.current,r.prior,r.delta,r.contribution_pct]),[
    ['RAW:A',300,100,200,200],['RAW:B',-100,0,-100,-100],
  ])
  assert.equal(result.contributions.product[0].identity_status,'needs_review')
  assert.equal(result.totals.current_financial.adjusted_estimated_rows,1)
  assert.equal(result.causal_status,'unverified')
})

test('whole missing months remain null and unpaired observations are excluded from the bridge', () => {
  const selected = parseDiagnosticScope({startDate:'2025-01-01',endDate:'2025-02-28'})
  const rows = fixture()
  rows.push(row('coverage','2025-02','current','-10'),row('month','2025-02','current','-10'))
  const result = buildSalesDiagnostics(selected,rows)
  assert.equal(result.totals.current,200)
  assert.equal(result.totals.matched_months,1)
  assert.equal(result.totals.expected_months,2)
  assert.deepEqual(result.coverage.missing_prior_months,['2025-02'])
  assert.equal(result.contributions.month[1].current,-10)
  assert.equal(result.contributions.month[1].prior,null)
  assert.equal(result.contributions.month[1].delta,null)
})

test('zero and negative prior denominators withhold growth; negative margin basis withholds margin', () => {
  for (const prior of ['0','-10']) {
    const result = buildSalesDiagnostics(scope(),fixture('100',prior))
    assert.equal(result.totals.growth_pct,null)
    assert.equal(result.totals.prior,Number(prior))
  }
  const rows = fixture().map(r => ({...r,income:'5',margin_revenue_basis:'-10',gross_margin_eligible_rows:'1'}))
  assert.equal(buildSalesDiagnostics(scope(),rows).totals.current_financial.margin_pct,null)
})

test('gross profit uses its eligible revenue basis and ineligible-only groups stay explicit', () => {
  const rows = fixture().map(r => ({...r,income:'25',margin_revenue_basis:'50',gross_margin_eligible_rows:'1'}))
  rows.push(row('product','RAW:excluded','current',null))
  const result = buildSalesDiagnostics(scope(),rows)
  assert.equal(result.totals.current_financial.margin_pct,50)
  const excluded = result.contributions.product.find(r => r.key === 'RAW:excluded')!
  assert.equal(excluded.current,0)
  assert.equal(excluded.current_financial.revenue,null)
  assert.equal(excluded.current_financial.net_sales_eligible_rows,0)
})

test('financial decimals reconcile before conversion and dropped groups fail visibly', () => {
  const rows = fixture('0.300003','0.300000').filter(r => r.dimension !== 'product')
  rows.push(row('product','RAW:A','current','0.100001'),row('product','RAW:A','prior','0.100000'),row('product','RAW:B','current','0.200002'),row('product','RAW:B','prior','0.200000'))
  assert.equal(buildSalesDiagnostics(scope(),rows).totals.delta,0.000003)
  assert.throws(() => buildSalesDiagnostics(scope(),rows.filter(r => r.group_key !== 'RAW:B')),/does not reconcile/)
})

test('partial exact boundaries are disclosed and zero change has no contribution percentage', () => {
  const selected = parseDiagnosticScope({startDate:'2025-01-02',endDate:'2025-01-30'})
  const result = buildSalesDiagnostics(selected,fixture('100','100'))
  assert.deepEqual(result.coverage.partial_boundary_months,['2025-01'])
  assert.equal(result.contributions.product[0].contribution_pct,null)
})
