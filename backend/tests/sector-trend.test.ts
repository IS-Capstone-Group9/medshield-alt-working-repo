import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSectorTrend } from '../src/sectorTrend'

test('sector trend reconciles signed eligible amounts and matching margin basis without filling absent groups', () => {
  const base = {date:'2025-01-01',sector:'Government',revenue:100,income:20,margin_revenue_basis:80,row_count:1,transaction_evidence:'original_source_detail'}
  const rows = buildSectorTrend([base, {...base,revenue:-10,income:-2,margin_revenue_basis:-10,transaction_evidence:'adjusted_estimated_source'},
    {...base,sector:'Private',revenue:0,income:null,margin_revenue_basis:null},
    {...base,date:'2025-01-02',revenue:null,income:null,margin_revenue_basis:null}])
  const government = rows.find(r=>r.sector==='Government' && r.date==='2025-01-01')!
  assert.equal(government.revenue,90); assert.equal(government.income,18); assert.equal(government.margin_revenue_basis,70)
  assert.equal(government.original_source_rows,1); assert.equal(government.adjusted_estimated_rows,1)
  assert.equal(rows.find(r=>r.sector==='Private')!.revenue,0)
  assert.equal(rows.find(r=>r.sector==='Private')!.income,null)
  assert.equal(rows.find(r=>r.sector==='All' && r.date==='2025-01-02')!.revenue,null)
  assert.equal(rows.find(r=>r.sector==='All' && r.date==='2025-01-01')!.revenue,90)
  assert.equal(rows.some(r=>r.sector==='Unknown'),false)
  assert.throws(()=>buildSectorTrend([{...base,sector:'invented'}]),/dimension/)
  assert.throws(()=>buildSectorTrend([{...base,revenue:NaN}]),/amount/)
  assert.deepEqual(buildSectorTrend([]),[])
})
