import assert from 'node:assert/strict'
import {test} from 'node:test'
import {productCommercialReview, productCommercialQueue, type CommercialRow} from '../../frontend/services/api/product-commercial-review'

const row = (product:string, date:string, revenue:number|null, extra:Partial<CommercialRow> = {}):CommercialRow => ({product,date,period:date.slice(0,7),
  revenue,positive_sales:revenue===null?0:Math.max(0,revenue),returns_value:revenue===null?0:Math.min(0,revenue),row_count:1, ...extra})

test('paired weighted margin and support counts retain ineligible-only product rows',()=>{
  const rows=[row('A','2026-01-02',100,{income:10,margin_revenue_basis:100}),row('A','2026-01-03',10,{income:5,margin_revenue_basis:10}),
    row('A','2026-01-04',1000),row('Unknown','2026-01-05',null)]
  const model=productCommercialReview(rows,rows)
  assert.equal(model.summary.grossProfit,15);assert.equal(model.summary.marginBasis,110)
  assert.equal(model.summary.marginPct,100*15/110);assert.equal(model.summary.marginCoveragePct,50)
  assert.equal(model.summary.netRecords,3);assert.equal(model.summary.records,4)
  assert.equal(model.products.find(r=>r.id==='Unknown')!.revenue,null)
  assert.equal(model.products.find(r=>r.id==='Unknown')!.grossProfit,null)
})

test('supported zero and signed profit are retained; nonpositive margin denominator has no rate',()=>{
  const rows=[row('Zero','2026-01-01',0,{income:0,margin_revenue_basis:0}),row('Negative','2026-01-02',-10,{income:-3,margin_revenue_basis:-10})]
  const model=productCommercialReview(rows,rows)
  assert.equal(model.products[0].grossProfit,0);assert.equal(model.summary.grossProfit,-3);assert.equal(model.summary.marginPct,null)
  assert.equal(productCommercialQueue(model,'negative_profit')[0].id,'Negative')
})

test('matching months apply before category; missing product is not a zero-sale claim',()=>{
  const source=[row('A','2025-01-04',100,{category:'Medical'}),row('Other','2025-02-04',10,{category:'Non-Medical'}),
    row('A','2026-01-04',50,{category:'Medical'}),row('A','2026-02-04',30,{category:'Medical'}),row('New','2026-02-05',20,{category:'Medical'}),row('A','2026-03-04',999,{category:'Medical'})]
  const model=productCommercialReview(source,source.filter(r=>r.date!.startsWith('2026')),'Medical',{start_date:'2026-01-01',end_date:'2026-03-31'})
  assert.deepEqual(model.comparison.matchedMonths,['2026-01','2026-02'])
  assert.deepEqual(model.comparison.omittedMonths,['2026-03'])
  const a=model.products.find(r=>r.id==='A')!;assert.equal(a.revenue,1079);assert.equal(a.matchedCurrent,80);assert.equal(a.change,-20);assert.equal(a.growthPct,-20)
  const fresh=model.products.find(r=>r.id==='New')!;assert.equal(fresh.matchedPrior,null);assert.equal(fresh.change,null);assert.equal(fresh.growthPct,null)
  assert.equal(productCommercialQueue(model,'declines').length,1)
})

test('partial date bounds exclude outside rows and leap-day shift is explicit',()=>{
  const source=[row('A','2023-02-28',10),row('A','2024-02-28',999),row('A','2024-02-29',20)]
  const model=productCommercialReview(source,[source[2]],'All',{start_date:'2024-02-29',end_date:'2024-02-29'})
  assert.equal(model.comparison.priorStart,'2023-02-28');assert.equal(model.products[0].change,10)
})

test('positive-baseline percentages only; negative or zero baselines retain signed change',()=>{
  for(const base of [0,-10]){
    const source=[row('A','2025-01-01',base),row('A','2026-01-01',10)]
    const model=productCommercialReview(source,[source[1]],'All',{start_date:'2026-01-01',end_date:'2026-01-31'})
    assert.equal(model.products[0].change,10-base);assert.equal(model.products[0].growthPct,null)
  }
})

test('long, overlapping, monthly-only and invalid date windows cannot create growth',()=>{
  const source=[row('A','2025-01-01',10),row('A','2026-01-01',20)]
  for(const scope of [{start_date:'2017-01-01',end_date:'2026-01-01'},{start_date:'2025-01-01',end_date:'2026-01-01'},
    {start_date:'2026-02-30',end_date:'2026-03-01'}]) assert.equal(productCommercialReview(source,source,'All',scope).comparison.available,false)
  const monthly=[{product:'A',period:'2026-01',revenue:10}]
  assert.equal(productCommercialReview(monthly,monthly,'All',{start_date:'2026-01-01',end_date:'2026-01-31'}).comparison.available,false)
})

test('estimates excluded, observed zeros retained, aggregate support unknown and malformed contribution held',()=>{
  const source=[row('A','2026-01-01',10,{income:5,margin_revenue_basis:10,row_count:10}),row('Estimate','2026-01-01',999,{evidence:'estimate'}),
    row('Zero','2026-01-02',0),row('Bad','2026-01-03',100,{positive_sales:200})]
  const model=productCommercialReview(source,source)
  assert.equal(model.excludedEstimates,1);assert.equal(model.summary.revenue,110);assert.equal(model.summary.marginCoveragePct,null)
  assert.equal(model.products.find(r=>r.id==='Bad')!.positiveSales,null)
  assert.ok(!productCommercialQueue(model,'contributors').some(r=>r.id==='Bad'))
})

test('decimal accumulation does not invent tiny declines from differently partitioned equal amounts',()=>{
  const source=[row('A','2025-01-01',.3),row('A','2026-01-01',.1),row('A','2026-01-02',.2)]
  const model=productCommercialReview(source,source.slice(1),'All',{start_date:'2026-01-01',end_date:'2026-01-31'})
  assert.equal(model.summary.revenue,.3);assert.equal(model.products[0].change,0)
  assert.equal(productCommercialQueue(model,'declines').length,0)
})

test('margin gaps rank unsupported eligible net rather than high record-count coverage or total sales',()=>{
  const source=[row('Large supported seller','2026-01-01',1000,{income:500,margin_revenue_basis:1000}),
    row('Large supported seller','2026-01-02',10),row('Large gap','2026-01-01',5,{income:1,margin_revenue_basis:5}),
    row('Large gap','2026-01-02',500),row('No net','2026-01-01',null)]
  const model=productCommercialReview(source,source)
  assert.equal(model.summary.netWithoutMarginSupport,510)
  assert.equal(model.products.find(r=>r.id==='No net')!.netWithoutMarginSupport,null)
  assert.equal(productCommercialQueue(model,'margin_gaps')[0].id,'Large gap')
})
