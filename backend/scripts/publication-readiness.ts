/** Read-only live evidence collection. Never approves, uploads, or publishes data. */
import 'dotenv/config'
import { createHash } from 'node:crypto'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { executeDatabricksStatement } from '../src/databricks'
import { getDatabricksSalesSummary, getDatabricksStl } from '../src/databricksDashboard'
import { parseCsv, checkMapping, checkAdjustedSources, checkReleaseIdentity, checkStlIdentity, technicalVerdict } from './publication-readiness-helpers'

type Row = Record<string, string | null>
type Check = { name: string; status: 'PASS' | 'FAIL' | 'UNVERIFIED'; detail: string }
const root = resolve(__dirname, '../..')
const G = 'workspace.medshield_gold'
const A = 'workspace.medshield_audit'
const B = 'workspace.medshield_bronze'
const S = 'workspace.medshield_silver'
const fact = `${G}.sales_restart_fact_candidate`
const stlTable = `${G}.sales_restart_stl_candidate`
const started = new Date().toISOString()
const runId = started.replace(/[:.]/g, '-')
const out = resolve(root, 'outputs/publication_readiness', runId)
mkdirSync(out, { recursive: true })
const checks: Check[] = []
const evidence: Record<string, unknown> = { started_at: started, source: 'Databricks Unity Catalog', mode: 'read-only', queries: {} }
const queries = evidence.queries as Record<string, unknown>
function hash(bytes: Buffer | string) { return createHash('sha256').update(bytes).digest('hex') }
function record(name: string, pass: boolean, detail: string) { checks.push({ name, status: pass ? 'PASS' : 'FAIL', detail }) }
async function query(name: string, sql: string, rowLimit = 1000): Promise<Row[]> {
  try {
    const result = await executeDatabricksStatement(sql, { rowLimit })
    queries[name] = { sql, checked_at: new Date().toISOString(), ...result }
    return result.rows
  } catch (error) {
    queries[name] = { sql, error: (error as Error).message }
    throw error
  }
}
async function step(name: string, fn: () => Promise<void>) {
  try { await fn() } catch (error) { checks.push({ name, status: 'UNVERIFIED', detail: (error as Error).message }) }
}
function safeTable(name: string) {
  if (!/^workspace\.medshield_(gold|audit|bronze|silver)\.sales_restart_[a-z_]+_candidate$/.test(name)) throw new Error('Unexpected evidence table identifier')
  return name
}
const files = {
  area_mapping: 'datasources/templates/area_classification_mapping.csv',
  product_master: 'databricks/medshield_project/references/product_master_review.csv',
  gold_code: 'databricks/medshield_project/03_sales_gold.py',
  bronze_code: 'databricks/medshield_project/01_sales_bronze.py',
  gateway_code: 'backend/src/databricksDashboard.ts',
  business_definitions: 'docs/BUSINESS_DEFINITIONS.md',
  objectives: 'docs/PROJECT.md',
}
const local = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, { path, sha256: hash(readFileSync(resolve(root, path))) }]))
evidence.local_files = local
const mapping = parseCsv(readFileSync(resolve(root, files.area_mapping), 'utf8'))
const products = parseCsv(readFileSync(resolve(root, files.product_master), 'utf8'))
const versions = new Map<string, string>()
let publication: Row[] = []
let identity: Row = {}

async function main() {
  await step('Capture publication and table versions', async () => {
    publication = await query('publication_start', `SELECT * FROM ${A}.sales_restart_gold_publication_candidate ORDER BY table_name`)
    record('Publication audit contains only passing outputs', publication.length > 0 && publication.every(r => r.status === 'PASS'), `${publication.length} declared outputs`)
    record('Publication dataset is unambiguous', new Set(publication.map(r => r.dataset_id)).size === 1 && Boolean(publication[0]?.dataset_id), 'All published outputs must share a dataset ID')
    const tables = [...new Set([...publication.map(r => safeTable(r.table_name!)), fact, stlTable, `${A}.sales_restart_gold_publication_candidate`, `${A}.sales_restart_replacement_year_validation_candidate`, `${B}.sales_restart_manifest_candidate`, `${B}.sales_restart_rows_candidate`, `${S}.sales_restart_assessed_candidate`, `${S}.sales_restart_clean_candidate`])]
    // Bounded independent read batches; version changes invalidate the audit.
    for (let i = 0; i < tables.length; i += 4) {
      const results = await Promise.allSettled(tables.slice(i, i + 4).map(async table => {
        const rows = await query(`version_start:${table}`, `DESCRIBE HISTORY ${table} LIMIT 1`, 1)
        if (rows[0]?.version == null) throw new Error(`Missing version: ${table}`)
        versions.set(table, rows[0].version)
      }))
      for (const result of results) if (result.status === 'rejected') throw result.reason
    }
  })
  await step('Mapping identities and row values', async () => {
    const rows = await query('fact_identity', `SELECT DISTINCT dataset_id, policy_version, area_mapping_sha256, product_master_sha256, publication_status FROM ${fact}`)
    identity = rows[0] ?? {}
    record('Single fact identity', rows.length === 1 && Boolean(identity.dataset_id), JSON.stringify(identity))
    record('Area mapping checksum matches local master', identity.area_mapping_sha256 === local.area_mapping.sha256, local.area_mapping.sha256)
    record('Product master checksum matches local master', identity.product_master_sha256 === local.product_master.sha256, `${products.length} local entries; ${products.filter(r => r.mapping_status === 'approved').length} approved`)
    record('Fact and publication share identity', publication.length > 0 && publication.every(r => r.dataset_id === identity.dataset_id && r.policy_version === identity.policy_version && r.area_mapping_sha256 === identity.area_mapping_sha256 && r.product_master_sha256 === identity.product_master_sha256), 'Dataset, policy, area master, and product master')
    const areas = await query('area_dimensions', `SELECT normalized_area, source_record_count, area_mapping_status, area_evidence_status, territory_id, mapped_region, mapped_province, mapped_city_municipality, mapped_geographic_level, external_mapping_status, is_geographic_territory_approved FROM ${G}.sales_restart_dim_area_candidate ORDER BY normalized_area`)
    const errors = checkMapping(mapping, areas)
    evidence.mapping_comparison_errors = errors
    record('Live area dimensions agree with local mapping', errors.length === 0, `${areas.length} observed labels compared; ${errors.length} differences`)
    await query('area_review', `SELECT normalized_area, area_mapping_status, area_evidence_status, mapped_region, mapped_province, mapped_city_municipality, COUNT(*) AS fact_rows, SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales FROM ${fact} GROUP BY ALL ORDER BY fact_rows DESC`)
    await query('product_scope', `SELECT product_scope_status, COUNT(*) AS fact_rows, COUNT(DISTINCT normalized_product) AS source_labels, COUNT(DISTINCT canonical_sku) AS canonical_skus FROM ${fact} GROUP BY product_scope_status ORDER BY fact_rows DESC`)
    await query('product_review_shortlist', `SELECT normalized_product, product_scope_status, COUNT(*) AS fact_rows, SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales FROM ${fact} WHERE canonical_sku IS NULL GROUP BY ALL ORDER BY net_sales DESC LIMIT 25`, 25)
  })
  await step('Bronze to Silver lineage', async () => {
    await query('manifest', `SELECT * FROM ${B}.sales_restart_manifest_candidate ORDER BY data_source_year`)
    const rows = await query('source_accounting', `WITH a AS (SELECT dataset_id, source_workbook, source_file_sha256, COUNT(*) AS assessed_rows FROM ${S}.sales_restart_assessed_candidate GROUP BY ALL) SELECT m.source_workbook, m.dataset_id AS manifest_dataset, a.dataset_id AS assessed_dataset, m.raw_line_count, a.assessed_rows FROM ${B}.sales_restart_manifest_candidate m FULL OUTER JOIN a ON m.source_workbook=a.source_workbook AND m.source_file_sha256=a.source_file_sha256`)
    record('Every source file is accounted for in Silver', rows.length > 0 && rows.every(r => r.raw_line_count !== null && r.raw_line_count === r.assessed_rows && r.manifest_dataset === identity.dataset_id && r.assessed_dataset === identity.dataset_id), 'Counts and dataset IDs by file checksum')
    const lineage = (await query('lineage', `SELECT
      (SELECT COUNT(*) FROM (SELECT source_record_id FROM ${B}.sales_restart_rows_candidate EXCEPT ALL SELECT source_record_id FROM ${S}.sales_restart_assessed_candidate)) AS bronze_only,
      (SELECT COUNT(*) FROM (SELECT source_record_id FROM ${S}.sales_restart_assessed_candidate EXCEPT ALL SELECT source_record_id FROM ${B}.sales_restart_rows_candidate)) AS silver_only,
      (SELECT COUNT(*) FROM (SELECT source_record_id FROM ${S}.sales_restart_clean_candidate EXCEPT ALL SELECT source_record_id FROM ${fact})) AS clean_only,
      (SELECT COUNT(*) FROM (SELECT source_record_id FROM ${fact} EXCEPT ALL SELECT source_record_id FROM ${S}.sales_restart_clean_candidate)) AS fact_only,
      (SELECT COUNT(*) FROM ${S}.sales_restart_assessed_candidate WHERE disposition IS NULL OR is_analysis_candidate IS NULL OR record_kind IS NULL OR quality_rule_codes IS NULL OR is_analysis_candidate <> (disposition IN ('KEEP_SOURCE_YEAR_ALIGNED','KEEP_HISTORICAL_BACKFILL_CANDIDATE'))) AS invalid_dispositions`))[0]
    record('Source identities survive Bronze/Silver/Gold', Object.values(lineage).every(v => v === '0'), JSON.stringify(lineage))
    const values = (await query('silver_gold_values', `SELECT COUNT(*) AS mismatches FROM ${S}.sales_restart_clean_candidate s JOIN ${fact} f USING (source_record_id) WHERE NOT (s.dataset_id <=> f.dataset_id) OR NOT(s.quantity <=> f.quantity) OR NOT(s.net_sales <=> f.net_sales) OR NOT(s.gross_margin_amount <=> f.gross_margin_amount) OR NOT(s.date_delivered <=> f.date_delivered) OR NOT(s.source_file_sha256 <=> f.source_file_sha256)`))[0]
    record('Silver/Gold source values reconcile', values.mismatches === '0', JSON.stringify(values))
    await query('dispositions', `SELECT disposition, is_analysis_candidate, SUM(source_record_count) AS source_records FROM ${A}.sales_restart_gold_disposition_candidate GROUP BY ALL ORDER BY source_records DESC`)
    await query('quality_rules', `SELECT quality_rule_code, SUM(affected_source_records) AS affected_source_records FROM ${A}.sales_restart_gold_quality_candidate GROUP BY quality_rule_code ORDER BY affected_source_records DESC`)
  })
  await step('Prepared historical source provenance', async () => {
    const reportPath = 'outputs/2020_2024_databricks_final/reconciliation.json'
    const bytes = readFileSync(resolve(root, reportPath))
    const report = JSON.parse(bytes.toString('utf8'))
    evidence.historical_preparation = { path: reportPath, sha256: hash(bytes), report }
    const known: {filename: string; sha256: string; policy: string}[] = []
    for (const year of ['2020', '2024']) {
      const item = report.years[year]
      const filename = `medshield_data_${year}.csv`
      const outputHash = hash(readFileSync(resolve(root, 'outputs/2020_2024_databricks_final', filename)))
      const originalHash = hash(readFileSync(resolve(root, 'data/medshield/dataset_csv', filename)))
      record(`Preparation artifact identity ${year}`, outputHash === item.output_sha256 && originalHash === item.source_sha256 && Number(item.replaced_rows) > 0, `${item.replaced_rows} estimated product-label replacements; verifies artifact identity, not allocation accuracy`)
      known.push({ filename, sha256: outputHash, policy: report.method })
    }
    const manifest = await query('provenance_manifest', `SELECT source_workbook,source_file_sha256,source_data_status,source_adjustment_policy FROM ${B}.sales_restart_manifest_candidate ORDER BY source_workbook`)
    const errors = checkAdjustedSources(manifest, known)
    record('Known adjusted sources are labeled as estimates', errors.length === 0, errors.length ? errors.join('; ') : 'Prepared historical file hashes checked against Bronze provenance')
    const groups = await query('fact_source_provenance', `SELECT source_workbook,source_file_sha256,source_data_status,source_adjustment_policy,is_adjusted_source,COUNT(*) AS fact_rows FROM ${fact} GROUP BY ALL ORDER BY source_workbook`)
    const factErrors = checkAdjustedSources(groups, known)
    for (const row of groups) if (known.some(k => k.filename === row.source_workbook && k.sha256 === row.source_file_sha256) && row.is_adjusted_source !== 'true') factErrors.push(`${row.source_workbook}: estimated-source flag absent in Gold`)
    record('Known historical adjustments remain labeled in Gold', factErrors.length === 0, factErrors.join('; ') || 'Known adjusted source provenance is retained')
  })
  await step('Gold output counts and aggregates', async () => {
    for (let i = 0; i < publication.length; i += 4) {
      await Promise.all(publication.slice(i, i + 4).map(async row => {
        const table = safeTable(row.table_name!)
        const result = (await query(`output:${table}`, `SELECT COUNT(*) AS rows, COUNT(DISTINCT dataset_id) AS datasets, MIN(dataset_id) AS dataset_id FROM ${table}`, 1))[0]
        record(`Persisted output ${table}`, result.rows === row.saved_rows && (result.rows === '0' || result.datasets === '1' && result.dataset_id === identity.dataset_id), `${result.rows} rows; audit expected ${row.saved_rows}`)
      }))
    }
    const totals = (await query('fact_totals', `SELECT COUNT(*) AS fact_rows, COUNT(*)-COUNT(DISTINCT sales_fact_id) AS duplicate_ids, SUM(CASE WHEN sales_fact_id IS NULL THEN 1 ELSE 0 END) AS null_ids, SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales, SUM(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END) AS gross_margin, SUM(CASE WHEN SIZE(quality_rule_codes)>0 THEN 1 ELSE 0 END) AS warning_rows, SUM(CASE WHEN is_net_sales_eligible THEN 1 ELSE 0 END) AS revenue_eligible_rows, SUM(CASE WHEN is_gross_margin_eligible THEN 1 ELSE 0 END) AS margin_eligible_rows, SUM(CASE WHEN is_approved_medical_demand_eligible THEN 1 ELSE 0 END) AS medical_eligible_rows, SUM(CASE WHEN is_external_join_ready THEN 1 ELSE 0 END) AS external_ready_rows, SUM(CASE WHEN is_adjusted_source THEN 1 ELSE 0 END) AS adjusted_rows FROM ${fact}`))[0]
    record('Fact IDs unique and present', totals.duplicate_ids === '0' && totals.null_ids === '0', JSON.stringify(totals))
    for (const grain of ['monthly', 'yearly', 'area_yearly']) {
      const key = grain === 'monthly' ? 'month_start' : 'calendar_year'
      const extra = grain === 'area_yearly' ? ', normalized_area' : ''
      const mismatches = (await query(`reconcile:${grain}`, `WITH f AS (SELECT ${key}${extra}, COUNT(*) AS transaction_count, SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales, SUM(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END) AS gross_margin_amount FROM ${fact} GROUP BY ALL) SELECT COUNT(*) AS mismatches FROM f FULL OUTER JOIN ${G}.sales_restart_${grain}_candidate m USING (${key}${extra}) WHERE NOT(COALESCE(f.transaction_count,0) <=> m.transaction_count) OR NOT(f.net_sales <=> m.net_sales) OR NOT(f.gross_margin_amount <=> m.gross_margin_amount)`))[0]
      record(`Fact/${grain} reconciliation`, mismatches.mismatches === '0', JSON.stringify(mismatches))
    }
    const bridge = (await query('yearly_bridge_reconciliation', `SELECT COUNT(*) AS mismatches FROM ${G}.sales_restart_yearly_candidate y FULL OUTER JOIN ${G}.vw_dashboard_yearly_sales_candidate v USING (calendar_year) WHERE NOT(y.transaction_count <=> v.transaction_count) OR NOT(y.net_sales <=> v.net_sales_candidate) OR NOT(y.gross_margin_amount <=> v.gross_margin_candidate)`))[0]
    record('Yearly bridge reconciles', bridge.mismatches === '0', JSON.stringify(bridge))
    await query('yearly_review', `SELECT calendar_year, transaction_count, observed_month_count, unobserved_month_count, source_completeness_status, net_sales, gross_margin_amount, margin_net_sales_basis, weighted_gross_margin_pct FROM ${G}.sales_restart_yearly_candidate ORDER BY calendar_year`)
    const summary = await getDatabricksSalesSummary({})
    evidence.gateway_summary = summary
    const releaseErrors = checkReleaseIdentity({ ...identity, fact_delta_version: Number(versions.get(fact)) }, summary.release)
    evidence.gateway_release_comparison_errors = releaseErrors
    record('Gateway summary uses captured fact release', releaseErrors.length === 0, releaseErrors.join('; ') || `Fact version ${versions.get(fact)}; dataset, policy, area master, product master, and publication status match`)
    record('Gateway summary matches eligible Gold totals', summary.counts.rows === Number(totals.fact_rows)
      && summary.sums.net_cost !== null && totals.net_sales !== null
      && Math.abs(summary.sums.net_cost - Number(totals.net_sales)) < 0.01
      && summary.sums.net_income !== null && totals.gross_margin !== null
      && Math.abs(summary.sums.net_income - Number(totals.gross_margin)) < 0.01,
    'Fresh gateway function executed against live Databricks; not a browser acceptance test')
  })
  await step('STL publication identity', async () => {
    const stl = await getDatabricksStl()
    evidence.gateway_stl = stl
    const captured = { ...identity, fact_delta_version: Number(versions.get(fact)) }
    const releaseErrors = checkReleaseIdentity(captured, stl.release)
    const rowErrors = checkStlIdentity(captured, stl.rows)
    evidence.stl_release_comparison_errors = releaseErrors
    evidence.stl_row_comparison_errors = rowErrors
    record('STL gateway uses captured fact release', releaseErrors.length === 0, releaseErrors.join('; ') || `Fact version ${versions.get(fact)}; descriptive release identity matches`)
    record('STL rows retain captured fact source identity', rowErrors.length === 0, rowErrors.join('; ') || `${stl.rows.length} STL rows match the captured fact version, dataset, policy, and mapping checksums`)
  })
  await step('Adjusted-source protection', async () => {
    const replacement = await query('replacement_validation', `SELECT * FROM ${A}.sales_restart_replacement_year_validation_candidate`)
    const actual = (await query('replacement_actual', `SELECT COUNT(*) AS rows, SUM(net_sales) AS net_sales, SUM(CASE WHEN is_adjusted_source THEN 0 ELSE 1 END) AS missing_provenance, SUM(CASE WHEN is_contract_label THEN 1 ELSE 0 END) AS contract_rows, MIN(source_file_sha256) AS min_hash, MAX(source_file_sha256) AS max_hash FROM ${fact} WHERE data_source_year=2025`))[0]
    const r = replacement[0]
    record('2025 replacement retains validated provenance and totals', replacement.length === 1 && r.dataset_id === identity.dataset_id && r.validation_status === 'PASS_2025_ALLOCATION_SOURCE' && r.transaction_rows === actual.rows && Number(r.net_sales) === Number(actual.net_sales) && actual.missing_provenance === '0' && actual.contract_rows === '0' && r.source_file_sha256 === actual.min_hash && actual.min_hash === actual.max_hash, 'Reconciles replacement evidence; does not independently approve the original parent allocation methodology')
  })
  await step('Evidence stayed stable', async () => {
    for (const [table, version] of versions) {
      const result = await query(`version_end:${table}`, `DESCRIBE HISTORY ${safeTable(table)} LIMIT 1`, 1)
      record(`Stable version ${table}`, result[0]?.version === version, `start=${version}; end=${result[0]?.version}`)
    }
    record('Local review inputs unchanged', Object.entries(files).every(([key, path]) => local[key].sha256 === hash(readFileSync(resolve(root, path)))), 'Local code and mapping checksums rechecked at end')
  })
  evidence.completed_at = new Date().toISOString()
  evidence.checks = checks
  evidence.technical_verdict = technicalVerdict(checks)
  evidence.publication_status = 'BLOCKED_PENDING_BUSINESS_ACCEPTANCE_AND_SCOPED_DATA_GATES'
  evidence.approval = { status: 'NOT_RECORDED', reviewer: null, decision: null }
  const serialized = JSON.stringify(evidence, null, 2) + '\n'
  writeFileSync(resolve(out, 'evidence.json'), serialized)
  const digest = hash(serialized)
  writeFileSync(resolve(out, 'evidence.sha256'), `${digest}  evidence.json\n`)
  const table = checks.map(c => `| ${c.status} | ${c.name} | ${c.detail.replace(/\|/g, '/').replace(/\n/g, ' ')} |`).join('\n')
  writeFileSync(resolve(out, 'README.md'), `# Descriptive publication readiness\n\nCollected: ${started}\n\nDataset: \`${identity.dataset_id ?? 'UNVERIFIED'}\`\n\nTechnical verdict: **${technicalVerdict(checks)}**. Business approval: **not recorded**. This is read-only evidence; no warehouse objects were changed or approved.\n\nEvidence SHA-256: \`${digest}\`\n\n## Scope and limitations\n\nDatabricks remains the analytical source. Local evidence files are review artifacts, never dashboard inputs. This audit checks source accounting, persisted mappings, analytical aggregates, and a fresh gateway summary. It does not establish medical SKU identity, source completeness, original allocation validity, buyer ownership, browser usability, or owner approval. A matching hash is not a business sign-off. Empty medical outputs do not block arithmetic reconciliation but block approved medicine-demand claims.\n\n## Executed checks\n\n| Result | Check | Evidence |\n|---|---|---|\n${table}\n\n## Business decision required\n\nReview the acceptance record in docs/DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md. Bind any decision to this exact evidence hash, dataset, source manifest, and mapping/code versions. Keep candidate labels until approved views and their consumers have been deployed and verified.\n`)
  console.log(JSON.stringify({ output: out, dataset_id: identity.dataset_id, technical_verdict: technicalVerdict(checks), counts: Object.fromEntries(['PASS','FAIL','UNVERIFIED'].map(s => [s, checks.filter(c => c.status === s).length])), evidence_sha256: digest, failures: checks.filter(c => c.status !== 'PASS') }, null, 2))
  if (technicalVerdict(checks) !== 'PASS') process.exitCode = 1
}
main().catch(error => { console.error((error as Error).message); process.exitCode = 1 })
