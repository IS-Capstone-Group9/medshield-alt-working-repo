import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCsv, checkMapping, checkAdjustedSources, technicalVerdict } from '../scripts/publication-readiness-helpers'

test('CSV supports quoted evidence and rejects broken contracts', () => {
  assert.deepEqual(parseCsv('\uFEFFarea,notes\r\nQuezon,"a,b\n""quoted"""\r\n'), [{area:'Quezon',notes:'a,b\n"quoted"'}])
  for (const text of ['a,a\nx,y', 'a,b\nx', 'a\n"unfinished', 'a\n"x"bad']) assert.throws(() => parseCsv(text))
  assert.deepEqual(parseCsv('a,b\n'), [])
})
test('Pending mapping cannot inherit approved geographic identity', () => {
  const master = [{raw_area:' Test ', mapping_status:'needs_review', area_type:'territory', territory_id:'PH-TEST'}]
  const live = [{normalized_area:'TEST',area_mapping_status:'needs_review',is_geographic_territory_approved:'false',territory_id:null}]
  assert.deepEqual(checkMapping(master,live), [])
  assert.ok(checkMapping(master,[{...live[0],territory_id:'PH-TEST'}]).length)
  assert.ok(checkMapping(master,[{...live[0],is_geographic_territory_approved:'true'}]).length)
  assert.ok(checkMapping([...master,...master],live).length)
  assert.ok(checkMapping(master,[]).length)
})
test('Missing evidence cannot produce a technical pass; technical pass does not grant approval', () => {
  assert.equal(technicalVerdict([]),'UNVERIFIED')
  assert.equal(technicalVerdict([{status:'PASS'},{status:'UNVERIFIED'}]),'UNVERIFIED')
  assert.equal(technicalVerdict([{status:'PASS'},{status:'FAIL'}]),'FAIL')
  assert.equal(technicalVerdict([{status:'PASS'}]),'PASS')
})

test('Matching financial totals do not excuse mislabeled replacement provenance', () => {
  const known = [{filename:'2020.csv',sha256:'adjusted-hash',policy:'estimate'}]
  const original = {source_workbook:'2020.csv',source_file_sha256:'adjusted-hash',source_data_status:'ORIGINAL_SOURCE_EXPORT',source_adjustment_policy:null}
  assert.equal(checkAdjustedSources([original],known).length,1)
  assert.deepEqual(checkAdjustedSources([{...original,source_data_status:'ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE',source_adjustment_policy:'estimate'}],known),[])
  assert.deepEqual(checkAdjustedSources([{...original,source_file_sha256:'true-original'}],known),[])
})
