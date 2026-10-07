import assert from 'node:assert/strict'
import { test } from 'node:test'
import { stlViewModel, type StlRow } from '../../frontend/services/api/stl-view-model'

const row = (period:string,start:string,end:string,trend=10,residual=0):StlRow => ({period,segment_start:start,segment_end:end,observed:trend+residual+2,trend,seasonal:2,residual})
test('STL inserts calendar gaps and preserves separate contiguous segment boundaries',()=>{
  const input=[row('2024-01','2024-01','2024-01'),row('2024-03','2024-03','2024-03',20,-5),row('2024-04','2024-04','2024-05',30),row('2024-05','2024-04','2024-05',40,3)]
  const view=stlViewModel([...input].reverse())
  assert.deepEqual(view.labels,['2024-01','2024-02','2024-03','Segment boundary','2024-04','2024-05'])
  assert.deepEqual(view.trend,[10,null,20,null,30,40])
  assert.equal(view.first.period,'2024-04')
  assert.equal(view.unusual.residual,-5)
  assert.equal(view.rows.length,4) // plot gaps never become export observations
  assert.deepEqual(input.map(r=>r.period),['2024-01','2024-03','2024-04','2024-05'])
})
test('STL empty, duplicate and invalid periods fail explicitly',()=>{
  assert.throws(()=>stlViewModel([]))
  assert.throws(()=>stlViewModel([row('2024-13','x','x')]))
  assert.throws(()=>stlViewModel([row('2024-01','x','x'),row('2024-01','x','x')]))
})
