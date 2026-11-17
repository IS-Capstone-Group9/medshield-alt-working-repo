import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {regionalStrengthSummary,validateRegionalStl} from '../src/regionalStlReview'
import {regionalStlStrengths,regionalStlCsvRecords,validRegionalStl,type RegionalStl,type RegionalData} from '../../frontend/services/api/regional-sales-model'

test('Gold-derived API strengths, client model and CSV agree with independent Python variance receipt',()=>{
  const raw=readFileSync('../outputs/so1_regional_stl_20261028/analysis.json','utf8')
  const source=JSON.parse(readFileSync('../outputs/so1_regional_stl_20261028/source.json','utf8'))
  const api=validateRegionalStl(raw,source) as RegionalStl
  const expected=JSON.parse(readFileSync('../outputs/wp1_regional_stl_20261030/results.json','utf8')).strengths[0]
  assert.equal(validRegionalStl(api,source as RegionalData),true)
  const frontend=regionalStlStrengths(api)[0]
  for(const key of ['trend_strength','seasonal_strength'] as const){
    assert.ok(Math.abs(api.strength_summary![0][key]!-expected[key])<1e-12)
    assert.equal(frontend[key],api.strength_summary![0][key])
  }
  const csv=regionalStlCsvRecords(api,'CALABARZON','2026')
  assert.equal(csv.length,10)
  assert.equal(csv[1][15],frontend.trend_strength)
  assert.equal(csv[1][16],frontend.seasonal_strength)
  assert.equal(csv[1][17],'Derived')
  assert.equal(csv[1][19],source.source.policy_version)
  assert.equal(regionalStlStrengths(api).length,1)
  const mutated=structuredClone(api);mutated.strength_summary![0].trend_strength=1
  assert.equal(validRegionalStl(mutated,source as RegionalData),false)
})

test('constant denominators are unavailable, not perfect strength',()=>{
  const result=regionalStrengthSummary([{region:'fixture',fitted_segments:[{start:'2020-01',end:'2022-12',months:1}],components:[{segment_start:'2020-01',segment_end:'2022-12',trend_php:1,seasonal_php:0,residual_php:0}]}])
  assert.equal(result[0].trend_strength,null);assert.equal(result[0].seasonal_strength,null)
})
