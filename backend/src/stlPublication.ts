import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { executeDatabricksStatement } from './databricks'
import { databricksLiteral as literal } from './databricksLiteral'
import { descriptiveBinding, qualifiedTable, readDescriptiveRelease, SOURCE_REBUILD_POLICY, type DescriptiveRelease } from './descriptiveSource'
import { DASHBOARD_POPULATION } from './descriptiveEvidence'

type Execute = typeof executeDatabricksStatement
type Row = Record<string, unknown>
type Month = { period: string; revenue: number | null; missing: boolean }
const sha = (raw: string) => createHash('sha256').update(raw).digest('hex')
const digestPattern = /^[a-f0-9]{64}$/
const identityFields = ['dataset_id', 'policy_version', 'area_mapping_sha256', 'product_master_sha256', 'transaction_evidence_sha256', 'catalog_helper_sha256'] as const
const numericFields = ['observed', 'trend', 'seasonal', 'residual'] as const
export const STL_FIELDS = ['period', ...numericFields, 'segment_start', 'segment_end', ...identityFields,
  'fact_delta_version', 'source_table', 'population_version', 'population_sha256', 'parameters_json', 'input_sha256', 'method', 'publication_status'] as const
const same = (left: unknown, right: unknown, label: string) => assert.deepEqual(left, right, label)
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const index = (value: unknown) => {
  assert.ok(typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value), 'Invalid STL period')
  const [year, month] = value.split('-').map(Number)
  return year * 12 + month - 1
}
const near = (left: unknown, right: unknown, label: string) => {
  assert.ok(finite(left) && finite(right) && Math.abs(left - right) <= .000001, label)
}
function identity(release: DescriptiveRelease) {
  const result = Object.fromEntries(identityFields.map(field => [field, release[field]]))
  for (const field of identityFields) {
    assert.ok(typeof result[field] === 'string' && result[field], `Missing STL source ${field}`)
    if (field !== 'policy_version') assert.match(String(result[field]), digestPattern, `Invalid STL source ${field} hash`)
  }
  return result
}

/** Only the isolated, immutable initial-source candidate can receive this package. */
export function validateStlPayload(raw: string, expectedHash: string, release: DescriptiveRelease) {
  assert.match(expectedHash, digestPattern, 'STL payload byte SHA-256 required')
  assert.equal(sha(raw), expectedHash, 'STL payload byte checksum mismatch')
  assert.ok(Buffer.byteLength(raw, 'utf8') <= 5_000_000, 'STL payload exceeds preparation bound')
  const payload = JSON.parse(raw)
  assert.equal(payload.schema_version, 'medshield.monthly_stl.v1', 'Unsupported STL publication schema')
  const match = /^workspace\.(medshield_gold_source_\d{8})\.sales_restart_fact_candidate$/.exec(release.source_table ?? '')
  assert.ok(match && release.policy_version === SOURCE_REBUILD_POLICY && release.fact_delta_version === 0, 'STL publication requires the configured isolated v8 fact 0')
  const outputTable = `workspace.${match[1]}.sales_restart_stl_candidate`
  same(payload.identity, identity(release), 'STL source identity mismatch')
  assert.equal(payload.fact_delta_version, 0, 'STL fact pin mismatch')
  assert.equal(payload.source_table, release.source_table, 'STL source table mismatch')
  assert.equal(payload.output_table, outputTable, 'STL target must be the isolated sibling table')
  assert.equal(payload.population_version, DASHBOARD_POPULATION.version, 'STL population version mismatch')
  assert.equal(payload.population_sha256, DASHBOARD_POPULATION.predicate_sha256, 'STL population predicate mismatch')
  assert.match(payload.input_sha256 ?? '', digestPattern, 'Invalid STL input identity')
  assert.equal(typeof payload.input_material_json, 'string', 'Exact STL input hash material required')
  assert.equal(sha(payload.input_material_json), payload.input_sha256, 'STL input material checksum mismatch')
  const material = JSON.parse(payload.input_material_json)
  same(Object.keys(material).sort(), ['identity', 'fact_delta_version', 'source_table', 'population_version', 'population_sha256', 'parameters', 'rows'].sort(), 'Unexpected STL hash material fields')
  same(material, { identity: payload.identity, fact_delta_version: 0, source_table: payload.source_table,
    population_version: payload.population_version, population_sha256: payload.population_sha256, parameters: payload.parameters,
    rows: payload.input_rows }, 'STL input material differs from publication fields')
  const parameters = payload.parameters
  assert.ok(parameters && !Array.isArray(parameters) && typeof parameters === 'object', 'STL parameters required')
  for (const [key, value] of Object.entries({ status: 'candidate', metric: 'eligible_net_sales_php', method: 'STL', period: 12,
    seasonal_window: 13, robust: true, minimum_contiguous_months: 36, missing_policy: 'no_imputation_split_at_gaps' }))
    same(parameters[key], value, `Unsupported STL ${key}`)
  assert.ok(typeof parameters.statsmodels_version === 'string' && parameters.statsmodels_version, 'STL runtime version required')
  assert.ok(Array.isArray(parameters.limitations) && parameters.limitations.every((v: unknown) => typeof v === 'string'), 'STL limitations required')
  const months: Month[] = payload.input_rows
  assert.ok(Array.isArray(months) && months.length > 0 && months.length <= 2400, 'Bounded STL input months required')
  const missing: string[] = [], short: string[] = [], segments = new Map<string, { start: string; end: string }>()
  let current: Month[] = []
  const finish = () => {
    if (current.length >= 36) for (const row of current) segments.set(row.period, { start: current[0].period, end: current.at(-1)!.period })
    else short.push(...current.map(row => row.period))
    current = []
  }
  months.forEach((row, position) => {
    same(Object.keys(row).sort(), ['period', 'revenue', 'missing'].sort(), 'Unexpected STL monthly fields')
    assert.ok(row.revenue === null || finite(row.revenue), 'Invalid STL monthly revenue')
    assert.equal(row.missing, row.revenue === null, 'STL missing/zero interpretation mismatch')
    if (position) assert.equal(index(row.period), index(months[position - 1].period) + 1, 'STL month spine is not unique and contiguous')
    else index(row.period)
    if (row.missing) { missing.push(row.period); finish() } else current.push(row)
  })
  finish()
  assert.ok(months[0].period.endsWith('-01') && months.at(-1)!.period.endsWith('-12'), 'STL requires the complete calendar-year spine')
  same(parameters.unavailable_periods, missing, 'STL unavailable periods mismatch')
  same(parameters.short_segment_periods, short, 'STL short segments mismatch')
  const records: Row[] = payload.records
  assert.ok(Array.isArray(records) && records.length > 0 && records.length <= 2400, 'Bounded STL candidate rows required')
  same(records.map(row => row.period), [...segments.keys()], 'STL candidate periods differ from qualifying source segments')
  const observed = new Map(months.map(row => [row.period, row.revenue]))
  for (const row of records) {
    same(Object.keys(row).sort(), [...STL_FIELDS].sort(), 'Unexpected STL candidate fields')
    for (const field of numericFields) assert.ok(finite(row[field]), `Nonfinite STL ${field}`)
    near(row.observed, observed.get(String(row.period)), 'STL observed amount mismatch')
    near(row.observed, Number(row.trend) + Number(row.seasonal) + Number(row.residual), 'STL components do not reconstruct source')
    const segment = segments.get(String(row.period))!
    assert.equal(row.segment_start, segment.start, 'STL segment start mismatch')
    assert.equal(row.segment_end, segment.end, 'STL segment end mismatch')
    for (const field of identityFields) assert.equal(row[field], payload.identity[field], `STL row ${field} mismatch`)
    for (const field of ['fact_delta_version', 'source_table', 'population_version', 'population_sha256', 'input_sha256'])
      assert.equal(row[field], payload[field], `STL row ${field} mismatch`)
    assert.equal(typeof row.parameters_json, 'string', 'STL parameter bytes required')
    same(JSON.parse(String(row.parameters_json)), parameters, 'STL row parameter identity mismatch')
    assert.equal(row.method, 'STL', 'Unexpected STL method')
    assert.equal(row.publication_status, 'CANDIDATE_PENDING_BUSINESS_REVIEW', 'STL cannot grant approval')
  }
  assert.equal(new Set(records.map(row => row.parameters_json)).size, 1, 'Ambiguous STL parameter byte identity')
  return { payload, release, payloadHash: expectedHash, outputTable, outputSql: qualifiedTable(match[1], 'sales_restart_stl_candidate'), schema: match[1], records, months }
}

type Validated = ReturnType<typeof validateStlPayload>
export async function readStlSourceMonths(release: DescriptiveRelease, execute: Execute = executeDatabricksStatement): Promise<Month[]> {
  const match = /^workspace\.(medshield_gold_source_\d{8})\.sales_restart_fact_candidate$/.exec(release.source_table ?? '')
  assert.ok(match && release.fact_delta_version === 0, 'Unexpected STL source')
  const fact = `${qualifiedTable(match[1], 'sales_restart_fact_candidate')} VERSION AS OF 0`
  const sql = `WITH calendar AS (SELECT EXPLODE(SEQUENCE(MAKE_DATE(MIN(calendar_year),1,1),MAKE_DATE(MAX(calendar_year),12,1),INTERVAL 1 MONTH)) AS month_start FROM ${fact} WHERE ${DASHBOARD_POPULATION.predicate}), monthly AS (SELECT month_start,SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS revenue FROM ${fact} WHERE ${DASHBOARD_POPULATION.predicate} GROUP BY month_start) SELECT DATE_FORMAT(c.month_start,'yyyy-MM') AS period,CAST(m.revenue AS STRING) AS revenue FROM calendar c LEFT JOIN monthly m USING(month_start) ORDER BY c.month_start`
  const result = await execute(sql, { rowLimit: 2401 })
  assert.ok(result.rows.length > 0 && result.rows.length <= 2400, 'STL source exceeds monthly bound')
  return result.rows.map(row => ({ period: String(row.period), revenue: row.revenue === null ? null : Number(row.revenue), missing: row.revenue === null }))
}

function reconcileMonths(plan: Validated, months: Month[]) {
  assert.equal(months.length, plan.months.length, 'STL live monthly population changed')
  months.forEach((row, position) => {
    const expected = plan.months[position]
    assert.equal(row.period, expected.period, 'STL live monthly key mismatch')
    assert.equal(row.missing, expected.missing, 'STL live missingness mismatch')
    if (row.revenue === null) assert.equal(expected.revenue, null)
    else near(row.revenue, expected.revenue, `STL live observed amount ${row.period} differs`)
  })
}

const sqlType = (field: typeof STL_FIELDS[number]) => (numericFields as readonly string[]).includes(field) ? 'DOUBLE' : field === 'fact_delta_version' ? 'BIGINT' : 'STRING'
function statements(plan: Validated) {
  const create = `CREATE TABLE IF NOT EXISTS ${plan.outputSql} (${STL_FIELDS.map(field => `${field} ${sqlType(field)} NOT NULL`).join(',')},generated_at TIMESTAMP NOT NULL) USING DELTA`
  const source = plan.records.map(row => `SELECT ${STL_FIELDS.map(field => `CAST(${literal(row[field])} AS ${sqlType(field)}) AS ${field}`).join(',')}`).join('\nUNION ALL\n')
  const merge = `MERGE INTO ${plan.outputSql} t USING (${source}) s ON t.input_sha256=s.input_sha256 AND t.period=s.period WHEN NOT MATCHED THEN INSERT (${STL_FIELDS.join(',')},generated_at) VALUES (${STL_FIELDS.map(field => `s.${field}`).join(',')},current_timestamp())`
  return [create, merge]
}

/** Every existing value must belong to this exact candidate; no matched row is overwritten. */
export function validateExistingStlRows(plan: Validated, existing: Record<string, string | null>[], complete = false) {
  assert.ok(existing.length <= plan.records.length, 'Unexpected existing STL population')
  assert.equal(new Set(existing.map(row => row.period)).size, existing.length, 'Duplicate existing STL period')
  const expected = new Map(plan.records.map(row => [String(row.period), row]))
  for (const row of existing) {
    const target = expected.get(String(row.period))
    assert.ok(target, 'Unexpected existing STL period')
    for (const field of STL_FIELDS) {
      if ((numericFields as readonly string[]).includes(field)) near(row[field] === null ? null : Number(row[field]), target[field], `Existing STL ${field} differs`)
      else assert.equal(row[field], String(target[field]), `Existing STL ${field} differs`)
    }
    assert.ok(row.generated_at, 'Existing STL generation timestamp missing')
  }
  if (complete) assert.equal(existing.length, plan.records.length, 'Persisted STL row count mismatch')
}

async function existingRows(plan: Validated, execute: Execute) {
  const found = (await execute(`SELECT table_name,table_type FROM workspace.information_schema.tables WHERE table_schema=${literal(plan.schema)} AND table_name='sales_restart_stl_candidate'`, { rowLimit: 2 })).rows
  assert.ok(found.length <= 1, 'Ambiguous STL output table')
  if (!found.length) return null
  assert.ok(['MANAGED', 'EXTERNAL', 'MANAGED_SHALLOW_CLONE', 'EXTERNAL_SHALLOW_CLONE'].includes(String(found[0].table_type)), 'STL target is not a Delta table')
  const detail = (await execute(`DESCRIBE DETAIL ${plan.outputSql}`, { rowLimit: 1 })).rows[0]
  assert.equal(detail?.format, 'delta', 'STL target must use Delta')
  const result = await execute(`SELECT ${STL_FIELDS.join(',')},generated_at FROM ${plan.outputSql} ORDER BY period`, { rowLimit: plan.records.length + 1 })
  validateExistingStlRows(plan, result.rows)
  return result.rows
}

export async function prepareStlPublication(raw: string, expectedHash: string, env: NodeJS.ProcessEnv = process.env, execute: Execute = executeDatabricksStatement) {
  const binding = descriptiveBinding(env)
  assert.ok(binding.auditSchema && binding.version === 0, 'STL preparation requires configured isolated fact 0')
  const head = (await execute(`DESCRIBE HISTORY ${binding.table} LIMIT 1`, { rowLimit: 1 })).rows[0]
  assert.equal(Number(head?.version), 0, 'STL source changed; prepare a current bound package')
  const release = await readDescriptiveRelease(binding, execute)
  const plan = validateStlPayload(raw, expectedHash, release)
  reconcileMonths(plan, await readStlSourceMonths(release, execute))
  const previous = await existingRows(plan, execute)
  const sql = statements(plan)
  return { ...plan, existingRows: previous?.length ?? 0, statements: sql, statementsSha256: sha(JSON.stringify(sql)) }
}

/** Serialize publication jobs. Revalidation precedes any candidate-only write. */
export async function applyStlPublication(prepared: Awaited<ReturnType<typeof prepareStlPublication>>, env: NodeJS.ProcessEnv = process.env, execute: Execute = executeDatabricksStatement) {
  const fresh = await prepareStlPublication(JSON.stringify(prepared.payload), sha(JSON.stringify(prepared.payload)), env, execute)
  assert.equal(fresh.statementsSha256, prepared.statementsSha256, 'Prepared STL statements differ after revalidation')
  same(fresh.release, prepared.release, 'STL release changed since preparation')
  let writes = 0
  if (fresh.existingRows !== fresh.records.length) {
    await execute(fresh.statements[0]); writes += 1
    await existingRows(fresh, execute)
    await execute(fresh.statements[1]); writes += 1
  }
  const saved = await existingRows(fresh, execute)
  assert.ok(saved, 'STL target absent after publication')
  validateExistingStlRows(fresh, saved, true)
  const binding = descriptiveBinding(env)
  const head = (await execute(`DESCRIBE HISTORY ${binding.table} LIMIT 1`, { rowLimit: 1 })).rows[0]
  assert.equal(Number(head?.version), 0, 'STL source changed during publication')
  same(await readDescriptiveRelease(binding, execute), prepared.release, 'STL source identity/audit changed during publication')
  reconcileMonths(fresh, await readStlSourceMonths(fresh.release, execute))
  return { status: 'candidate_persisted_verified_not_business_approval', source_table: fresh.release.source_table,
    output_table: fresh.outputTable, fact_delta_version: 0, dataset_id: fresh.release.dataset_id,
    payload_sha256: prepared.payloadHash, input_sha256: fresh.payload.input_sha256,
    population_version: DASHBOARD_POPULATION.version, population_sha256: DASHBOARD_POPULATION.predicate_sha256,
    persisted_rows: saved.length, first_period: fresh.records[0].period, last_period: fresh.records.at(-1)!.period,
    content_reconciled: true, source_revalidated: true, idempotent: writes === 0, warehouse_write_statements: writes,
    forecast_model_pointer_changed: false, business_approval: false, checked_at: new Date().toISOString() }
}
