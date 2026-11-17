import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {deliveryAreaOverview,deliveryAreaCoverageCsv} from '../../frontend/services/api/delivery-area-model'
const source=JSON.parse(readFileSync('../outputs/delivery_area_20261102/live-source.json','utf8'))
test('all nine source labels retain own coverage and only two individual STL-eligible histories',()=>{
 const rows=deliveryAreaOverview(source,'2026','2025',9)
 assert.equal(rows.length,9);assert.equal(new Set(rows.map(r=>r.province)).size,8)
 assert.deepEqual(rows.map(r=>[r.area,r.observed_months,r.longest_contiguous_months]),[['QUEZON',103,76],['BATANGAS',104,81],['CAVITE',60,35],['LOWER CAVITE',48,26],['LAGUNA',40,19],['MARINDUQUE',79,19],['ALBAY',25,12],['CAM NORTE',58,19],['CAM SUR',54,19]])
 assert.deepEqual(rows.filter(r=>r.stl_history_eligible).map(r=>r.area),['QUEZON','BATANGAS'])
 assert.equal(rows[0].own_matched_yoy_months,9);assert.equal(rows[1].own_matched_yoy_months,9)
 assert.ok(rows.slice(2).every(r=>r.selected_observed_months===0&&r.own_matched_yoy_months===0))
 assert.equal(deliveryAreaCoverageCsv(source,'2026','2025',9).length,10)
})
test('historical coverage preserves gaps and does not label scattered months as a continuous fit',()=>{
 const rows=deliveryAreaOverview(source,'history','2025')
 assert.ok(rows.every(r=>r.selected_observed_months===r.observed_months&&r.own_matched_yoy_months===null))
 const marinduque=rows.find(r=>r.area==='MARINDUQUE')!;assert.equal(marinduque.observed_months,79);assert.equal(marinduque.stl_history_eligible,false)
})
