import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { DASHBOARD_POPULATION } from '../src/descriptiveEvidence'
import { SOURCE_REBUILD_POLICY, type DescriptiveRelease } from '../src/descriptiveSource'
import { applyStlPublication, prepareStlPublication, readStlSourceMonths, STL_FIELDS, validateExistingStlRows, validateStlPayload } from '../src/stlPublication'

const hash = (text: string) => createHash('sha256').update(text).digest('hex')
const schema = 'medshield_gold_source_20261022', source = `workspace.${schema}.sales_restart_fact_candidate`
const output = `workspace.${schema}.sales_restart_stl_candidate`
const identity = { dataset_id: 'a'.repeat(64), policy_version: SOURCE_REBUILD_POLICY, area_mapping_sha256: 'b'.repeat(64),
  product_master_sha256: 'c'.repeat(64), transaction_evidence_sha256: 'd'.repeat(64), catalog_helper_sha256: 'e'.repeat(64) }
const release: DescriptiveRelease = { ...identity, fact_delta_version: 0, source_table: source,
  source_audit_table: 'workspace.medshield_audit_source_20261022.sales_restart_gold_publication_candidate',
  resolution_policy: 'catalog_v1_independent_evidence', publication_status: 'CANDIDATE_PENDING_BUSINESS_AND_PRODUCT_MASTER_REVIEW' }
const env = { DATABRICKS_DESCRIPTIVE_SCHEMA: schema, DATABRICKS_DESCRIPTIVE_FACT_VERSION: '0',
  DATABRICKS_DESCRIPTIVE_DATASET_ID: identity.dataset_id, DATABRICKS_DESCRIPTIVE_POLICY_VERSION: SOURCE_REBUILD_POLICY }
function fixture() {
  const rows = Array.from({ length: 36 }, (_, i) => ({ period: `${2020 + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}`,
    revenue: 100 + i, missing: false }))
  const parameters = { status: 'candidate', metric: 'eligible_net_sales_php', method: 'STL', period: 12,
    seasonal_window: 13, robust: true, minimum_contiguous_months: 36, missing_policy: 'no_imputation_split_at_gaps',
    statsmodels_version: 'fixture', unavailable_periods: [], short_segment_periods: [], limitations: ['Fixture diagnostic only'] }
  const material = { identity, fact_delta_version: 0, source_table: source, population_version: DASHBOARD_POPULATION.version,
    population_sha256: DASHBOARD_POPULATION.predicate_sha256, parameters, rows }
  const materialJson = JSON.stringify(material), inputHash = hash(materialJson)
  const common = { ...identity, fact_delta_version: 0, source_table: source, population_version: DASHBOARD_POPULATION.version,
    population_sha256: DASHBOARD_POPULATION.predicate_sha256, parameters_json: JSON.stringify(parameters), input_sha256: inputHash,
    method: 'STL', publication_status: 'CANDIDATE_PENDING_BUSINESS_REVIEW' }
  return { schema_version: 'medshield.monthly_stl.v1', identity, fact_delta_version: 0, source_table: source, output_table: output,
    population_version: DASHBOARD_POPULATION.version, population_sha256: DASHBOARD_POPULATION.predicate_sha256,
    parameters, input_rows: rows, input_material_json: materialJson, input_sha256: inputHash,
    records: rows.map(row => ({ period: row.period, observed: row.revenue, trend: row.revenue, seasonal: 0, residual: 0,
      segment_start: '2020-01', segment_end: '2022-12', ...common })) }
}
const serialized = () => { const raw = JSON.stringify(fixture()); return { raw, hash: hash(raw) } }

function mockReader(options: { existing?: Record<string, string | null>[]; wrongSourceAmount?: boolean; failedAudit?: boolean; head?: number } = {}) {
  const statements: string[] = [], mutations: string[] = []
  const payload = fixture()
  let exists = options.existing !== undefined
  let stored = options.existing ?? []
  const encode = () => payload.records.map(row => ({ ...Object.fromEntries(STL_FIELDS.map(field => [field, String(row[field])])), generated_at: '2026-10-24T12:00:00Z' }))
  const execute = async (sql: string) => {
    statements.push(sql)
    let rows: any[] = []
    if (sql.startsWith('DESCRIBE HISTORY')) rows = [{ version: String(options.head ?? 0) }]
    else if (sql.startsWith('SELECT DISTINCT dataset_id')) rows = [Object.fromEntries(['dataset_id', 'policy_version', 'area_mapping_sha256', 'product_master_sha256', 'publication_status'].map(field => [field, (release as any)[field]]))]
    else if (sql.startsWith('SELECT DISTINCT resolution_policy')) rows = [Object.fromEntries(['resolution_policy', 'transaction_evidence_sha256', 'catalog_helper_sha256'].map(field => [field, (release as any)[field]]))]
    else if (sql.startsWith('SELECT table_name, saved_rows')) {
      const gold = ['fact', 'dim_date', 'dim_area', 'dim_product', 'dim_canonical_product', 'monthly', 'yearly', 'area_yearly', 'product_yearly', 'business_product_yearly', 'territory_yearly', 'medical_monthly', 'external_input', 'contract_labels', 'label_partition']
      const audit = ['area_coverage', 'scope', 'provisional_year', 'gold_disposition', 'gold_quality', 'returns', 'contract_evidence']
      rows = [...gold.map(n => `workspace.${schema}.sales_restart_${n}_candidate`),
        ...audit.map(n => `workspace.medshield_audit_source_20261022.sales_restart_${n}_candidate`)]
        .map(table_name => ({ table_name, saved_rows: table_name === source ? '100' : '0',
          status: options.failedAudit ? 'FAIL' : 'PASS', dataset_id: identity.dataset_id, policy_version: identity.policy_version }))
    } else if (sql.startsWith('SELECT COUNT(*) AS records')) rows = [{ records: '100', unique_records: '100' }]
    else if (sql.startsWith('WITH calendar AS')) rows = payload.input_rows.map((r, i) => ({ period: r.period,
      revenue: String(r.revenue + (options.wrongSourceAmount && i === 0 ? 1 : 0)) }))
    else if (sql.startsWith('SELECT table_name,table_type')) rows = exists ? [{ table_name: 'sales_restart_stl_candidate', table_type: 'MANAGED' }] : []
    else if (sql.startsWith('DESCRIBE DETAIL')) rows = [{ format: 'delta' }]
    else if (sql.startsWith('SELECT period,observed')) rows = stored
    else if (sql.startsWith('CREATE TABLE IF NOT EXISTS')) { exists = true; mutations.push(sql) }
    else if (sql.startsWith('MERGE INTO')) { stored = encode(); mutations.push(sql) }
    else assert.fail(`Unexpected fixture query: ${sql}`)
    return { rows, columns: [], statementId: 'fixture', rowCount: rows.length } as any
  }
  return { execute, statements, mutations, encode }
}

test('STL package binds exact raw bytes, isolated source, parameters and reconstructing components', () => {
  const artifact = serialized(), plan = validateStlPayload(artifact.raw, artifact.hash, release)
  assert.equal(plan.records.length, 36)
  assert.equal(plan.outputTable, output)
  assert.throws(() => validateStlPayload(artifact.raw + ' ', artifact.hash, release), /byte checksum/)
  for (const changed of [{ output_table: 'workspace.medshield_gold.sales_restart_stl_candidate' },
    { population_sha256: 'f'.repeat(64) }, { fact_delta_version: 1 }, { source_table: source + '; DROP TABLE x' }]) {
    const raw = JSON.stringify({ ...fixture(), ...changed })
    assert.throws(() => validateStlPayload(raw, hash(raw), release))
  }
  const broken = fixture(); broken.records[0].residual = 1
  const raw = JSON.stringify(broken)
  assert.throws(() => validateStlPayload(raw, hash(raw), release), /reconstruct/)
  assert.throws(() => validateStlPayload(artifact.raw, artifact.hash, { ...release, source_table: 'workspace.medshield_gold.sales_restart_fact_candidate' }), /isolated/)
})

test('preparation revalidates full source audit and exact live monthly values before any writes', async () => {
  const artifact = serialized(), mock = mockReader()
  const plan = await prepareStlPublication(artifact.raw, artifact.hash, env, mock.execute)
  assert.equal(plan.existingRows, 0)
  assert.equal(mock.mutations.length, 0)
  assert.ok(plan.statements[0].startsWith('CREATE TABLE IF NOT EXISTS `workspace`.`medshield_gold_source_20261022`'))
  assert.match(plan.statements[1], /WHEN NOT MATCHED THEN INSERT/)
  assert.doesNotMatch(plan.statements[1], /WHEN MATCHED|DELETE|OVERWRITE/i)
  assert.ok(mock.statements.find(sql => sql.startsWith('WITH calendar AS'))!.includes(DASHBOARD_POPULATION.predicate))
  for (const options of [{ wrongSourceAmount: true }, { failedAudit: true }, { head: 1 }]) {
    const bad = mockReader(options)
    await assert.rejects(prepareStlPublication(artifact.raw, artifact.hash, env, bad.execute))
    assert.equal(bad.mutations.length, 0)
  }
})

test('candidate apply uses only isolated output and verifies every persisted value; retry is idempotent', async () => {
  const artifact = serialized(), mock = mockReader()
  const plan = await prepareStlPublication(artifact.raw, artifact.hash, env, mock.execute)
  const receipt = await applyStlPublication(plan, env, mock.execute)
  assert.equal(receipt.persisted_rows, 36)
  assert.equal(receipt.warehouse_write_statements, 2)
  assert.equal(receipt.forecast_model_pointer_changed, false)
  assert.equal(receipt.business_approval, false)
  assert.ok(mock.mutations.every(sql => sql.includes('`medshield_gold_source_20261022`.`sales_restart_stl_candidate`')))
  const repeated = await applyStlPublication(plan, env, mock.execute)
  assert.equal(repeated.idempotent, true)
  assert.equal(repeated.warehouse_write_statements, 0)
  assert.equal(mock.mutations.length, 2)
})

test('conflicting existing content, extra rows or duplicate periods fail without overwrite', async () => {
  const artifact = serialized(), base = mockReader(), saved = base.encode()
  const cases = [saved.map((r, i) => i === 0 ? { ...r, observed: '999' } : r), [...saved, saved[0]],
    saved.map((r, i) => i === 0 ? { ...r, input_sha256: 'f'.repeat(64) } : r)]
  for (const existing of cases) {
    const mock = mockReader({ existing })
    await assert.rejects(prepareStlPublication(artifact.raw, artifact.hash, env, mock.execute))
    assert.equal(mock.mutations.length, 0)
  }
  const plan = validateStlPayload(artifact.raw, artifact.hash, release)
  assert.throws(() => validateExistingStlRows(plan, saved.slice(1), true), /count mismatch/)
})

test('missing monthly observations remain unavailable instead of recorded zero', async () => {
  const execute = async () => ({ rows: [{ period: '2026-09', revenue: '0.00' }, { period: '2026-10', revenue: null }], columns: [] }) as any
  assert.deepEqual(await readStlSourceMonths(release, execute), [
    { period: '2026-09', revenue: 0, missing: false }, { period: '2026-10', revenue: null, missing: true }])
})
