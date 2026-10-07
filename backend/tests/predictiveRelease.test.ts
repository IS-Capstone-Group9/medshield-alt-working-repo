import test from 'node:test'
import assert from 'node:assert/strict'
import { monthLead, parsePredictiveQuery, readPredictiveRelease, validateRelease } from '../src/predictiveRelease'
import { artifactHash, preparePublication, publishPrepared } from '../src/predictivePublication'

function fixture() {
  return { schema_version: '2', publication_status: 'approved', release_id: 'release1', run_id: 'run1', model_id: 'last_value', dataset_id: 'dataset1', source_checksum: 'hash1', catalog_mapping_version: 'catalog1', geography_mapping_version: 'geo1', transformation_policy: 'policy1', training_cutoff: '2025-12', last_actual_period: '2025-12', evaluation_protocol: 'fixed_origin_multi_step', fact_delta_version: 16, target: 'net_sales', unit: 'PHP', scope: 'company', series_id: 'company:net_sales:PHP', validated_max_lead: 12, expected_point_count: 1, expected_evaluation_count: 1,
    points: [{ run_id: 'run1', model_id: 'last_value', series_id: 'company:net_sales:PHP', target: 'net_sales', unit: 'PHP', role: 'future', origin_period: '2025-12', target_period: '2026-09', lead_months: 9, prediction: 100, intervals: [] }],
    evaluations: [{ run_id: 'run1', dataset_id: 'dataset1', common_key_checksum: 'keys1', protocol: 'fixed_origin_multi_step' }] }
}
const result = (release = fixture()) => ({ columns: ['release_id', 'run_id', 'payload_json'], rows: [{ release_id: release.release_id, run_id: release.run_id, payload_json: JSON.stringify(release) }] })
test('strict filters reject repeated, structured, unknown and malformed values', () => {
  for (const query of [{ schema_version: ['2'] }, { schema_version: '2', horizon: '13' }, { schema_version: '2', display_start: '2026-13' }, { schema_version: '2', run_id: "a' OR 1=1" }, { schema_version: '2', product: 'raw' }]) assert.throws(() => parsePredictiveQuery(query))
  assert.equal(parsePredictiveQuery({ schema_version: '2', display_start: '2031-01' }).display_start, '2031-01')
})
test('calendar counts true lead and keeps unsupported display months null', async () => {
  assert.equal(monthLead('2025-12', '2027-08'), 20)
  const value = await readPredictiveRelease({ schema_version: '2', display_start: '2026-09', horizon: '12' }, async () => result())
  assert.equal(value.points.length, 12)
  assert.equal(value.points[0].lead_months, 9)
  assert.equal(value.points[11].lead_months, 20)
  assert.equal(value.points[11].prediction, null)
})
test('mixed runs, incomplete manifest, unsupported predictions, bad intervals fail closed', () => {
  const a = fixture(); a.points[0].run_id = 'other'; assert.throws(() => validateRelease(a))
  const b = fixture(); b.expected_point_count = 2; assert.throws(() => validateRelease(b))
  const c = fixture(); c.validated_max_lead = 6; assert.throws(() => validateRelease(c))
  const d: any = fixture(); d.points[0].intervals = [{ level: 0.95, lower: 0, upper: 110, support: 39, method: 'empirical' }]; assert.throws(() => validateRelease(d))
  const e = fixture(); e.evaluations[0].dataset_id = 'other'; assert.throws(() => validateRelease(e))
})
test('empty, unsupported, unpublished, outage and pointer rollback stay distinct', async () => {
  const query = { schema_version: '2', display_start: '2026-09' }
  assert.equal((await readPredictiveRelease({ ...query, scope: 'sku' }, async () => { throw Error('must not query') })).status, 'unsupported')
  assert.equal((await readPredictiveRelease(query, async () => ({ columns: [], rows: [] }))).status, 'unpublished')
  await assert.rejects(readPredictiveRelease(query, async () => { throw Error('warehouse outage') }), /warehouse outage/)
  assert.equal((await readPredictiveRelease({ ...query, run_id: 'other' }, async () => result())).status, 'empty')
  let current = fixture()
  const warehouse = async () => result(current)
  assert.equal((await readPredictiveRelease(query, warehouse)).release_id, 'release1')
  current = { ...fixture(), release_id: 'prior_release' }
  assert.equal((await readPredictiveRelease(query, warehouse)).release_id, 'prior_release')
})
test('artifact-bound review is required and interrupted staging never activates', async () => {
  const raw = JSON.stringify({ ...fixture(), data_publication_approved: true, coverage_receipt_sha256: 'coverage', input_hash: 'input', code_hash: 'code' })
  const review = { decision: 'approved', artifact_hash: artifactHash(raw), run_id: 'run1', dataset_id: 'dataset1', reviewer: 'fixture reviewer', reviewed_at: '2026-09-27T00:00:00Z', evidence_reference: 'fixture only', review_id: 'review1' }
  assert.throws(() => preparePublication(raw, { ...review, artifact_hash: 'wrong' }))
  const plan = preparePublication(raw, review)
  const statements: string[] = []
  await assert.rejects(publishPrepared(plan, async sql => {
    statements.push(sql)
    if (statements.length === 3) throw Error('interrupted')
    return { columns: [], rows: [] }
  }), /interrupted/)
  assert.equal(statements.some(sql => sql.includes('MERGE INTO workspace.medshield_gold.model_release_pointer')), false)
})
