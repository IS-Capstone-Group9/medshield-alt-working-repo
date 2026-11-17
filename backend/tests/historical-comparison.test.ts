import test from 'node:test'
import assert from 'node:assert/strict'
import {buildHistoricalComparison,type HistoricalInput} from '../src/historicalComparison'
const empty=()=>({sales:[] as HistoricalInput[],disease:[] as HistoricalInput[],tayabas:[] as HistoricalInput[],alabat:[] as HistoricalInput[],nasa:[] as HistoricalInput[]})
test('historical calendar preserves missing, genuine zero, negative sales and independent provider coverage',()=>{
  const data=empty()
  data.sales=[{period:'2017-01',value:'-12.34'},{period:'2025-01',value:'0'}]
  data.disease=[{period:'2025-01',value:'0'}];data.nasa=[{period:'2025-01',value:'25'}]
  const v=buildHistoricalComparison(data)
  assert.equal(v.rows.length,108);assert.equal(v.rows[0].sales,-12.34);assert.equal(v.rows[0].disease,null)
  const jan=v.rows.find(r=>r.period==='2025-01')!
  assert.equal(jan.sales,0);assert.equal(jan.disease,0);assert.equal(jan.nasa,25);assert.equal(jan.tayabas,null)
  assert.equal(v.coobserved_months,0);assert.equal(v.coverage.find(c=>c.key==='sales')!.observed_months,2)
})
test('same-month context never shifts a signal or multiplies financial observations',()=>{
  const input=empty();input.sales=[{period:'2024-01',value:'100'}]
  input.disease=[{period:'2023-12',value:'7'},{period:'2024-01',value:'3'}]
  input.tayabas=[{period:'2024-01',value:'20'}];input.alabat=[{period:'2024-01',value:'40'}]
  const result=buildHistoricalComparison(input),jan=result.rows.find(r=>r.period==='2024-01')!
  assert.equal(jan.disease,3);assert.equal(jan.sales,100);assert.equal(jan.tayabas,20);assert.equal(jan.alabat,40)
  assert.equal(result.coobserved_months,1);assert.equal(result.scope.alignment,'same_calendar_month')
})
test('duplicate months, malformed dates, fractional counts and invalid measurements fail',()=>{
  for(const change of [
    {sales:[{period:'2024-01',value:'1'},{period:'2024-01',value:'1'}]},
    {disease:[{period:'2024-01',value:'1.5'}]},
    {nasa:[{period:'2024-13',value:'2'}]},
    {tayabas:[{period:'2024-01',value:'-2'}]},
    {sales:[{period:'2024-01',value:'NaN'}]},
  ])assert.throws(()=>buildHistoricalComparison({...empty(),...change}))
})
