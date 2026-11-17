import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {deliveryAreaOverview,deliveryAreaCoverageCsv,type DeliveryAreaData} from '../../frontend/services/api/delivery-area-model'
const source:DeliveryAreaData=JSON.parse(readFileSync('../outputs/area_stl_verification_20261102/live-source.json','utf8'))

test('coverage overview keeps all nine source labels and source-bound CSV metadata',()=>{
 const rows=deliveryAreaOverview(source,'2026','2025',9)
 assert.equal(rows.length,9);assert.ok(!rows.some(r=>r.area==='CAVITE PROVINCE'))
 for(const row of rows){
  const observed=source.area_months.filter(r=>r.area===row.area&&r.net_sales_php!==null)
  assert.equal(row.observed_months,observed.length)
  assert.equal(row.first,observed.map(r=>r.period).sort()[0]);assert.equal(row.latest,observed.map(r=>r.period).sort().at(-1))
  assert.equal(row.selected_observed_months,observed.filter(r=>r.period>='2026-01'&&r.period<='2026-09').length)
  assert.equal(row.selected_calendar_months,9)
 }
 const csv=deliveryAreaCoverageCsv(source,'2026','2025',9),header=csv[0]
 assert.equal(csv.length,10)
 for(const row of csv.slice(1)){
  assert.equal(row[header.indexOf('dataset_id')],source.regional.source.dataset_id)
  assert.equal(row[header.indexOf('display_year')],'2026');assert.equal(row[header.indexOf('base_year')],'2025')
  assert.equal(row[header.indexOf('through_month')],9);assert.equal(row[header.indexOf('source_completeness')],'unknown')
 }
})
test('hand coverage fixture preserves observed zero, breaks at missing months and matches actual base months',()=>{
 const data=structuredClone(source),template=source.area_months.find(r=>r.area==='QUEZON')!
 data.area_months=['2025-01','2025-03','2025-04','2026-01'].map(period=>({...template,area:'QUEZON',period,net_sales_php:'0.000000'}))
 const row=deliveryAreaOverview(data,'2026','2025',9).find(r=>r.area==='QUEZON')!
 assert.equal(row.observed_months,4);assert.equal(row.longest_contiguous_months,2)
 assert.equal(row.selected_observed_months,1);assert.equal(row.own_matched_yoy_months,1)
 assert.equal(row.stl_history_eligible,false)
})
