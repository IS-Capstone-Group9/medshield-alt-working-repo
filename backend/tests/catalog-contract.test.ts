import assert from 'node:assert/strict'
import {test} from 'node:test'
import {catalogProducts, catalogProjection, parseCatalogCategory} from '../src/catalogContract'
import {descriptivePortfolio} from '../../frontend/services/api/descriptive-products'

const rows = [
  {canonical_group_id:'SKU:1',canonical_title:'Same display',product:'Alias A',product_raw:'Alias A',category:'Medical',identity_status:'approved',item_kind:'physical_product',packaging_unit:'Box',pack_count:'10',revenue:50,positive_sales:60,returns_value:-10,observed_quantity:5,transaction_evidence:'original_source_detail'},
  {canonical_group_id:'SKU:1',canonical_title:'Same display',product:'Alias B',product_raw:'Alias B',category:'Medical',identity_status:'approved',item_kind:'physical_product',packaging_unit:'Box',pack_count:'10',revenue:20,positive_sales:20,returns_value:0,observed_quantity:null,estimated_quantity:3,transaction_evidence:'adjusted_estimated_source'},
  {canonical_group_id:'RAW:2',canonical_title:'Same display',product:'Same display',category:'Medical',identity_status:'needs_review',item_kind:'unknown',revenue:20,positive_sales:20,returns_value:0,observed_quantity:null,transaction_evidence:'original_source_detail'},
  {canonical_group_id:'RAW:3',canonical_title:'Service',product:'Service',category:'Non-Medical',identity_status:'needs_review',item_kind:'service',revenue:900,positive_sales:900,returns_value:0,observed_quantity:100,transaction_evidence:'original_source_detail'},
]

test('category precedes ABC denominator; Top-N follows; UI and API totals and IDs agree', () => {
  const api = catalogProducts(rows,'Medical',1)
  const ui = descriptivePortfolio(rows,'positive_sales_candidate','Medical')
  assert.equal(api.denominator,100)
  assert.equal(api.products[0].pct_of_total,80)
  assert.equal(api.products[0].abc,'A')
  assert.equal(api.products[0].revenue,70)
  assert.equal(api.products[0].qty,5)
  assert.deepEqual(api.products[0].original_aliases,['Alias A','Alias B'])
  assert.equal(ui.products.length,2)
  assert.equal(ui.products[0].id,api.products[0].canonical_group_id)
  assert.equal(ui.products[0].share,api.products[0].pct_of_total)
  assert.equal(ui.products[0].quantity,5)
  assert.equal(ui.products[1].quantity,null)
  assert.equal(ui.unresolvedRevenue,20)
  assert.equal(catalogProducts(rows).products.find(r=>r.product==='Service')?.qty,null)
  assert.equal(catalogProducts(rows).products.reduce((s,r)=>s+(r.revenue||0),0),990)
})

test('stable IDs do not merge same display text and input order does not alter classification', () => {
  const first=catalogProducts(rows,'Medical',100), second=catalogProducts([...rows].reverse(),'Medical',100)
  assert.deepEqual(first.products.map(r=>[r.canonical_group_id,r.revenue,r.abc]),second.products.map(r=>[r.canonical_group_id,r.revenue,r.abc]))
  assert.equal(first.product_count,2)
  assert.equal(catalogProducts([{...rows[0],canonical_group_id:'RAW:new',identity_status:'needs_review',category:'Unclassified'}],'All').unresolved_count,1)
})

test('accepted reporting categories preserve unresolved identity and include Unclassified revenue', () => {
  const input=[
    {canonical_group_id:'RAW:medicine',canonical_title:'Medicine alias',product:'Medicine alias',category:'Medical',category_status:'approved',identity_status:'needs_review',item_kind:'unknown',revenue:120,positive_sales:120,returns_value:0,observed_quantity:null},
    {canonical_group_id:'RAW:unknown',canonical_title:'Unknown alias',product:'Unknown alias',category:'Unclassified',category_status:'approved',identity_status:'needs_review',item_kind:'unknown',revenue:35,positive_sales:40,returns_value:-5,observed_quantity:null,estimated_quantity:3,transaction_evidence:'adjusted_estimated_source'},
  ]
  const all=catalogProducts(input,'All',100)
  assert.equal(all.products.reduce((n,p)=>n+p.revenue,0),155)
  assert.equal(all.unresolved_count,2)
  assert.ok(all.products.every(p=>p.canonical_group_id.startsWith('RAW:')&&p.qty===null))
  const parts=['Medical','Non-Medical','Unclassified'].map(category=>catalogProducts(input,category,100))
  assert.equal(parts.reduce((n,part)=>n+part.products.reduce((s,p)=>s+p.revenue,0),0),155)
  assert.equal(parts[0].denominator,120)
  assert.equal(parts[2].denominator,40)
  const ui=descriptivePortfolio(input,'positive_sales_candidate')
  assert.equal(ui.products.reduce((n,p)=>n+p.revenue,0),155)
  assert.ok(ui.products.every(p=>p.quantity===null))
})

test('category boundary rejects structured/repeated inputs; legacy projection uses existing key', () => {
  for(const input of [[],['Medical'],{},'medical',"Medical' OR 1=1"]) assert.throws(()=>parseCatalogCategory(input))
  for(const input of ['All','Medical','Non-Medical','Unclassified']) assert.equal(parseCatalogCategory(input),input)
  assert.match(catalogProjection('v6'),/CONCAT\('RAW:', product_key\)/)
  assert.doesNotMatch(catalogProjection('v6'),/AS canonical_sku,\s*canonical_title/)
  assert.match(catalogProjection('sales_restart_gold_v7_independent_catalog'),/transaction_evidence_lineage/)
})

test('UI and both API classifiers agree on dominant, crossing and exact-cutoff products', async () => {
  const { revenueAbc } = await import('../src/descriptiveMetrics')
  for (const amounts of [[96,4], [85,10,5], [80,15,5], [100], [40,40,15,5], [0.1,0.1,0.05]]) {
    const input = amounts.map((amount,i) => ({canonical_group_id:'RAW:'+i,canonical_title:'P'+i,product:'P'+i,positive_sales:amount,returns_value:0,revenue:amount}))
    const api=catalogProducts(input,'All',100), ui=descriptivePortfolio(input,'positive_sales_candidate')
    let cumulative=0
    assert.deepEqual(api.products.map(p=>p.abc),ui.products.map(p=>p.abc))
    assert.deepEqual(api.products.map(p=>p.abc),api.products.map(p=>{cumulative+=p.positive_sales;return revenueAbc(cumulative,api.denominator,p.positive_sales)}))
    assert.equal(api.products[0].abc,'A')
    assert.equal(api.products[0].abc_policy,'positive_sales_crossing_inclusive_v2_candidate')
  }
})
