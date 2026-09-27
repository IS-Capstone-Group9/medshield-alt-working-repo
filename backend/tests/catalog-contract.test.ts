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

test('category boundary rejects structured/repeated inputs; legacy projection uses existing key', () => {
  for(const input of [[],['Medical'],{},'medical',"Medical' OR 1=1"]) assert.throws(()=>parseCatalogCategory(input))
  for(const input of ['All','Medical','Non-Medical','Unclassified']) assert.equal(parseCatalogCategory(input),input)
  assert.match(catalogProjection('v6'),/CONCAT\('RAW:', product_key\)/)
  assert.doesNotMatch(catalogProjection('v6'),/AS canonical_sku,\s*canonical_title/)
  assert.match(catalogProjection('sales_restart_gold_v7_independent_catalog'),/transaction_evidence_lineage/)
})
