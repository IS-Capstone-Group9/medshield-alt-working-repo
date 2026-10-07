import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCsv, checkMapping, checkAdjustedSources, checkReleaseIdentity, checkStlIdentity, technicalVerdict } from '../scripts/publication-readiness-helpers'

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

const capturedRelease = {
  fact_delta_version: 19,
  dataset_id: 'dataset-current',
  policy_version: 'policy-current',
  area_mapping_sha256: 'area-current',
  product_master_sha256: 'master-current',
  publication_status: 'CANDIDATE_PENDING_BUSINESS_AND_PRODUCT_MASTER_REVIEW',
}

test('Equal financial totals cannot pass for a different descriptive release', () => {
  const summary = { release: { ...capturedRelease }, counts: { rows: 37728 }, sums: { net_cost: 100, net_income: 20 } }
  assert.deepEqual(checkReleaseIdentity(capturedRelease, summary.release), [])
  for (const [field, value] of Object.entries({ fact_delta_version: 17, dataset_id: 'another-dataset', policy_version: 'another-policy', area_mapping_sha256: 'another-area', product_master_sha256: 'another-master', publication_status: 'APPROVED' })) {
    const otherSummary = { ...summary, release: { ...summary.release, [field]: value } }
    assert.deepEqual(otherSummary.sums, summary.sums)
    assert.ok(checkReleaseIdentity(capturedRelease, otherSummary.release).some(error => error.startsWith(`${field} differs`)), field)
  }
})

test('Missing or incomplete captured and gateway releases cannot pass', () => {
  for (const missing of [undefined, null, {}, [], 'release']) assert.ok(checkReleaseIdentity(capturedRelease, missing).length)
  for (const field of Object.keys(capturedRelease)) {
    const incomplete: Record<string, unknown> = { ...capturedRelease }
    delete incomplete[field]
    assert.ok(checkReleaseIdentity(capturedRelease, incomplete).length, `published ${field}`)
    assert.ok(checkReleaseIdentity(incomplete, capturedRelease).length, `captured ${field}`)
  }
  for (const version of ['', '19', null, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.ok(checkReleaseIdentity(capturedRelease, { ...capturedRelease, fact_delta_version: version }).length)
    assert.ok(checkReleaseIdentity({ ...capturedRelease, fact_delta_version: version }, capturedRelease).length)
  }
  assert.deepEqual(checkReleaseIdentity({ ...capturedRelease, fact_delta_version: 0 }, { ...capturedRelease, fact_delta_version: 0 }), [])
})

test('STL must match every captured fact source identity and version', () => {
  const row = { ...capturedRelease, fact_delta_version: '19', period: '2020-01-01', publication_status: 'CANDIDATE_PENDING_BUSINESS_REVIEW' }
  assert.deepEqual(checkStlIdentity(capturedRelease, [row]), [])
  assert.deepEqual(checkStlIdentity(capturedRelease, [{ ...row, fact_delta_version: 19 }]), [])
  for (const [field, value] of Object.entries({ fact_delta_version: '17', dataset_id: 'another-dataset', policy_version: 'another-policy', area_mapping_sha256: 'another-area', product_master_sha256: 'another-master' })) {
    assert.ok(checkStlIdentity(capturedRelease, [row, { ...row, [field]: value }]).some(error => error.startsWith(`STL row 2: ${field} differs`)), field)
  }
  for (const rows of [undefined, null, [], {}, [null], [{}]]) assert.ok(checkStlIdentity(capturedRelease, rows).length)
  for (const version of ['', ' 19', '019', '19.0', '-1', null, 1.5, Number.MAX_SAFE_INTEGER + 1, '9007199254740992']) assert.ok(checkStlIdentity(capturedRelease, [{ ...row, fact_delta_version: version }]).length)
  assert.ok(checkStlIdentity({}, [row]).length)
})

test('Matching financial totals do not excuse mislabeled replacement provenance', () => {
  const known = [{filename:'2020.csv',sha256:'adjusted-hash',policy:'estimate'}]
  const original = {source_workbook:'2020.csv',source_file_sha256:'adjusted-hash',source_data_status:'ORIGINAL_SOURCE_EXPORT',source_adjustment_policy:null}
  assert.equal(checkAdjustedSources([original],known).length,1)
  assert.deepEqual(checkAdjustedSources([{...original,source_data_status:'ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE',source_adjustment_policy:'estimate'}],known),[])
  assert.deepEqual(checkAdjustedSources([{...original,source_file_sha256:'true-original'}],known),[])
})
