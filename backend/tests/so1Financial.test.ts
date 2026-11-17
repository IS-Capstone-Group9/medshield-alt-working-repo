import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {reconcileSo1Financial,summarizeSo1Financial,enrichSo1Financial} from '../src/so1Financial'
import {so1View} from '../src/so1Diagnostics'
import {ORIGINAL_SO1_SHA256 as hash} from '../src/originalSo1Binding'
const payload=JSON.parse(readFileSync('../outputs/original_so1_20261027/payload.json','utf8'))
const rows=JSON.parse(readFileSync('../outputs/so1_financial_scope_20261027/financial-source.json','utf8'))
const financial=reconcileSo1Financial(payload,rows)
test('same-population margin is weighted on matching basis, not averaged rates or all net sales',()=>{
  const result=summarizeSo1Financial([
    {period:'2026-01',revenue:1000,records:10,eligible_records:10,adjusted_records:0,margin_eligible_records:1,gross_profit_php:10,margin_revenue_basis_php:100},
    {period:'2026-02',revenue:2000,records:10,eligible_records:10,adjusted_records:0,margin_eligible_records:3,gross_profit_php:90,margin_revenue_basis_php:300},
  ])
  assert.equal(result.gross_profit_php,100);assert.equal(result.margin_revenue_basis_php,400)
  assert.equal(result.margin_pct,25);assert.equal(result.margin_record_coverage_pct,20)
  assert.notEqual(result.margin_pct,100*100/3000)
})
test('no support stays null; zero or negative matching basis makes only the rate unavailable',()=>{
  assert.equal(summarizeSo1Financial([]).margin_pct,null)
  for(const basis of [0,-100]){
    const result=summarizeSo1Financial([{period:'2026-01',revenue:-100,records:1,eligible_records:1,adjusted_records:0,
      margin_eligible_records:1,gross_profit_php:-20,margin_revenue_basis_php:basis}])
    assert.equal(result.gross_profit_php,-20);assert.equal(result.margin_revenue_basis_php,basis);assert.equal(result.margin_pct,null)
  }
})
test('original full-population financial controls reconcile; all group views preserve margin support and paired YoY months',()=>{
  const all=enrichSo1Financial(so1View(payload,hash,{}),payload,financial)
  assert.ok(Math.abs(all.financial_summary.gross_profit_php!-334666271.55)<.000001)
  assert.equal(all.financial_summary.margin_eligible_records,36798)
  const fixtures:Record<string,unknown>={}
  for(const series of payload.series)for(const year of ['all',...Array.from({length:10},(_,i)=>String(2017+i))]){
    const view=enrichSo1Financial(so1View(payload,hash,{area:series.area,year}),payload,financial)
    for(const row of view.months){
      assert.equal(row.gross_profit_php===null,row.margin_eligible_records===0)
      if(row.margin_pct!==null)assert.ok(row.margin_revenue_basis_php!>0)
    }
    for(const pair of view.financial_yoy)for(const month of pair.common_margin_months){
      assert.ok((financial.values.get(series.area+'|'+pair.base_year+'-'+month)?.margin_eligible_records??0)>0)
      assert.ok((financial.values.get(series.area+'|'+pair.target_year+'-'+month)?.margin_eligible_records??0)>0)
    }
    fixtures[series.area+'|'+year]={...view,source:{system_of_record:'databricks',source_reconciled:true,
      table:'workspace.medshield_original_gold_20261026.so1_d25cea62e59712b6_candidate',version:0,financial:financial.source}}
  }
  // Derived isolated UI fixture only; runtime never imports this file.
  writeFileSync('../outputs/so1_financial_scope_20261027/test-views.json',JSON.stringify(fixtures)+'\n')
})
test('changed money, eligibility, numerator/denominator support, duplicate rows and lost months fail source controls',()=>{
  for(const edit of [(r:any[])=>r[0].gross_profit_php='1',(r:any[])=>r[0].margin_revenue_basis_php='1',
    (r:any[])=>r[0].net_sales_php='1',(r:any[])=>r[0].margin_eligible_records='99999',
    (r:any[])=>r[0].margin_eligible_records=String(Number(r[0].margin_eligible_records)-1),
    (r:any[])=>r[0].invalid_margin_pairs='1',(r:any[])=>r[0].gross_profit_php=null,
    (r:any[])=>r[0]=r[1],(r:any[])=>r.pop()]){
    const changed=structuredClone(rows);edit(changed);assert.throws(()=>reconcileSo1Financial(payload,changed))
  }
})
