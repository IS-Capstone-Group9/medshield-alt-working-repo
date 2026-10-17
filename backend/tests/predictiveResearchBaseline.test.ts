import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { canonicalPythonJson, forecastYoy, readFrozenBaseline, FrozenBaseline } from '../src/predictiveResearchBaseline'

type Json = Record<string, any>
const H = (value: string) => value.repeat(64)
const hash = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex')
const manifest = { dataset_id: H('a'), fact_delta_version: 20, geography_mapping_version: H('b'), catalog_mapping_version: H('c'), extracted_at: '2026-10-09T13:28:48.501Z', source_available_at: '2026-10-09T07:40:39.615Z', revision_policy: 'frozen_v1' }
function baselineRow(period = '2025-01', value: number | null = 100): Json {
  return { period, series_id: 'company:net_sales:PHP', target_name: 'net_sales', grain: 'company_month', scope: 'company', unit: 'PHP', target_value: value, target_value_decimal: value === null ? null : value.toFixed(6), period_closed: true, calendar_closed: true, coverage_status: 'complete', value_status: value === null ? 'missing' : 'observed', eligible_for_evaluation: value !== null, eligible_for_publication: false, blockers: [], missing_reason: value === null ? 'not_recorded' : null }
}
function stored(rows = [baselineRow()], inputManifest: Json = manifest, storageHash = H('d')) {
  return rows.map(value => ({ input_hash: storageHash, dataset_id: inputManifest.dataset_id, fact_delta_version: String(inputManifest.fact_delta_version), mapping_version: `${inputManifest.geography_mapping_version}:${inputManifest.catalog_mapping_version}`, series_id: value.series_id, target_name: value.target_name, period: `${value.period}-01`, target_value: value.target_value === null ? null : value.target_value.toFixed(2), unit: value.unit, period_closed: String(value.period_closed), coverage_status: value.coverage_status, eligible_for_evaluation: String(value.eligible_for_evaluation), eligible_for_publication: String(value.eligible_for_publication), payload_json: JSON.stringify({ manifest: inputManifest, row: value }) }))
}
function content(rows = [baselineRow()], inputManifest: Json = manifest) { return hash(canonicalPythonJson(JSON.stringify({ schema_version: '1.0', manifest: inputManifest, rows }))) }
function execute(rows: Record<string, string | null>[]) { return async () => ({ columns: Object.keys(rows[0] ?? {}), rows }) }
function baseline(row?: Json): FrozenBaseline { return { storageHash: H('d'), contentHash: H('e'), rows: new Map(row ? [[row.period, row]] : []) } }
const point = { origin_period: '2025-12', target_period: '2026-01', lead_months: 1, prediction: 120 as number | null }

test('Python canonical JSON probes preserve integer/float type, exponents, Unicode and code-point key order', () => {
  // Expected strings are reference Python json.dumps(sort_keys=True,separators=(',',':'),allow_nan=False) output.
  const probes = [
    ['{"z":1,"a":1.0}', '{"a":1.0,"z":1}'],
    ['[1e-7,0.0001,1e16,1000000000000000.0,-0.0,-0]', '[1e-07,0.0001,1e+16,1000000000000000.0,-0.0,0]'],
    ['{"₱":"é😀","a":"\\n\\t\\b\\f\\r\\\"\\\\"}', '{"a":"\\n\\t\\b\\f\\r\\\"\\\\","\\u20b1":"\\u00e9\\ud83d\\ude00"}'],
    ['{"😀":1,"\ue000":2}', '{"\\ue000":2,"\\ud83d\\ude00":1}'],
    ['[1.23e-5,123.456,5e-324,-2.5e20]', '[1.23e-05,123.456,5e-324,-2.5e+20]'],
  ]
  for (const [raw, expected] of probes) assert.equal(canonicalPythonJson(raw), expected)
  assert.throws(() => canonicalPythonJson('{"a":1,"a":2}'))
  for (const raw of ['1e400', '9007199254740993', '[NaN]', '{"a":1} trailing', '\u00a0{"a":1}', '{"a":\u000b1}', '\u000c[1]']) assert.throws(() => canonicalPythonJson(raw))
})

test('hand-solvable forecast change preserves signed predictions without inventing forecast error', () => {
  for (const [prediction, expected] of [[120, 20], [100, 0], [0, -100], [-20, -120]]) {
    const result = forecastYoy({ ...point, prediction }, baseline(baselineRow()))
    assert.equal(result.forecast_yoy_percent, expected); assert.equal(result.forecast_yoy_unavailable_reason, null)
    assert.equal(result.prior_year_period, '2025-01'); assert.equal(result.prior_year_net_sales_php, 100)
    assert.equal(result.baseline_input_storage_hash, H('d')); assert.equal(result.baseline_input_content_hash, H('e'))
    assert.equal('absolute_error_php' in result, false)
  }
})

test('zero, negative, missing, partial and blocked baselines retain evidence and a null derived percentage', () => {
  const cases: Array<[Json | undefined, string]> = [
    [undefined, 'prior_year_period_missing'], [baselineRow('2025-01', null), 'prior_year_value_unavailable'],
    [{ ...baselineRow(), target_value: Infinity }, 'prior_year_value_unavailable'],
    [baselineRow('2025-01', 0), 'prior_year_value_zero'], [baselineRow('2025-01', -50), 'prior_year_value_negative'],
    [{ ...baselineRow(), value_status: 'partial' }, 'prior_year_value_status_ineligible'],
    [{ ...baselineRow(), period_closed: false }, 'prior_year_period_not_closed'],
    [{ ...baselineRow(), calendar_closed: false }, 'prior_year_period_not_closed'],
    [{ ...baselineRow(), coverage_status: 'partial' }, 'prior_year_coverage_incomplete'],
    [{ ...baselineRow(), eligible_for_evaluation: false }, 'prior_year_not_evaluation_eligible'],
    [{ ...baselineRow(), blockers: ['coverage_unverified'] }, 'prior_year_has_blockers'],
  ]
  for (const [row, reason] of cases) {
    const result = forecastYoy(point, baseline(row))
    assert.equal(result.forecast_yoy_percent, null); assert.equal(result.forecast_yoy_unavailable_reason, reason)
    assert.equal(result.prior_year_net_sales_php, Number.isFinite(row?.target_value) ? row!.target_value : null)
  }
  assert.equal(forecastYoy({ ...point, prediction: null }, baseline(baselineRow())).forecast_yoy_unavailable_reason, 'prediction_unavailable')
  assert.equal(forecastYoy({ ...point, prediction: Infinity }, baseline(baselineRow())).forecast_yoy_percent, null)
  assert.equal(forecastYoy({ ...point, prediction: Number.MAX_VALUE }, baseline(baselineRow('2025-01', 1))).forecast_yoy_unavailable_reason, 'forecast_yoy_nonfinite')
})

test('calendar rollover and genuine supported leads do not reset the origin', () => {
  const result = forecastYoy({ origin_period: '2026-12', target_period: '2027-01', lead_months: 1, prediction: 150 }, baseline(baselineRow('2026-01')))
  assert.equal(result.prior_year_period, '2026-01'); assert.equal(result.forecast_yoy_percent, 50)
  for (const invalid of [{ ...point, lead_months: 2 }, { ...point, lead_months: 0 }, { ...point, lead_months: 13, target_period: '2027-01' }, { ...point, origin_period: '2026-01' }]) assert.throws(() => forecastYoy(invalid, baseline(baselineRow())))
})

test('resolver returns the separately identified complete frozen input and a bounded read-only query', async () => {
  const rows = [baselineRow('2025-01'), baselineRow('2025-02', 25.123456)]
  const storageRows = stored(rows); let statement = ''; let limit = 0
  const value = await readFrozenBaseline(manifest, content(rows), async (sql, options) => { statement = sql; limit = options!.rowLimit!; return execute(storageRows.reverse())() })
  assert.equal(value.storageHash, H('d')); assert.equal(value.contentHash, content(rows)); assert.notEqual(value.storageHash, value.contentHash)
  assert.equal(value.rows.size, 2); assert.equal(value.rows.get('2025-02')!.target_value, 25.123456)
  assert.equal(limit, 12001); assert.ok(statement.includes('mart_forecast_monthly_candidate')); assert.ok(statement.includes('mapping_version='))
  assert.equal(/\b(MERGE|INSERT|UPDATE|DELETE)\b/.test(statement), false); assert.equal(statement.includes(content(rows)), false)
})

test('resolver refuses duplicated, incomplete, ambiguous, mismatched and changed-value input', async () => {
  const rows = [baselineRow('2025-01'), baselineRow('2025-02', 25)]
  const saved = stored(rows), expected = content(rows)
  const invalid = [[], saved.slice(0, 1), [...saved, saved[0]], [...saved, ...stored(rows, manifest, H('f'))], stored([baselineRow('2025-01', 101), rows[1]]), stored(rows, { ...manifest, extracted_at: 'another_snapshot' })]
  for (const values of invalid) await assert.rejects(readFrozenBaseline(manifest, expected, execute(values)))
  const mixed = [...saved, ...stored([baselineRow('2025-03')], { ...manifest, extracted_at: 'other' })]
  await assert.rejects(readFrozenBaseline(manifest, expected, execute(mixed)))
  await assert.rejects(readFrozenBaseline(manifest, H('1'), execute(saved)))
  for (const field of ['dataset_id', 'fact_delta_version', 'mapping_version', 'series_id', 'target_name', 'period', 'unit', 'coverage_status', 'period_closed', 'eligible_for_evaluation', 'eligible_for_publication', 'target_value']) {
    const damaged = saved.map(row => ({ ...row })); (damaged[0] as any)[field] = 'wrong'
    await assert.rejects(readFrozenBaseline(manifest, expected, execute(damaged)))
  }
  const malformed = saved.map(row => ({ ...row })); malformed[0].payload_json = '{broken'
  await assert.rejects(readFrozenBaseline(manifest, expected, execute(malformed)))
})

test('null and signed frozen amounts are preserved while invalid payload amounts cannot bypass typed columns', async () => {
  const rows = [baselineRow('2025-01', null), baselineRow('2025-02', 0), baselineRow('2025-03', -12.345678)]
  const result = await readFrozenBaseline(manifest, content(rows), execute(stored(rows)))
  assert.deepEqual([...result.rows.values()].map(row => row.target_value), [null, 0, -12.345678])
  for (const patch of [{ target_value: null, target_value_decimal: '0.000000' }, { target_value: 10, target_value_decimal: '11.000000' }, { value_status: 'confirmed_zero' }, { value_status: 'missing' }, { unit: 'boxes' }]) {
    const invalidRows = [{ ...baselineRow(), ...patch }]
    await assert.rejects(readFrozenBaseline(manifest, content(invalidRows), execute(stored(invalidRows))))
  }
})

test('retained current 108-month input reconstructs its Python content digest, distinct from storage SHA', async () => {
  const raw = readFileSync(new URL('../../outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json', import.meta.url), 'utf8')
  const input = JSON.parse(raw), storageHash = hash(raw), contentHash = '63105c8b81d711748b0aac9df2ee316b1aa1b68202302b2b0f1231a6c2bb4046'
  assert.equal(storageHash, '04be4f529101f2117a5045d686158708e2b39d55957a3b119b22a30aa72c63ba')
  assert.equal(hash(canonicalPythonJson(raw)), contentHash)
  const frozen = await readFrozenBaseline(input.manifest, contentHash, execute(stored(input.rows, input.manifest, storageHash)))
  assert.equal(frozen.rows.size, 108); assert.equal(frozen.storageHash, storageHash); assert.equal(frozen.contentHash, contentHash)
  assert.equal([...frozen.rows.values()].filter(row => row.period.startsWith('2025-')).length, 12)
})
