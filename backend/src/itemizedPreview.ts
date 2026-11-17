import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { inflateSync } from 'node:zlib'
import { executeDatabricksStatement, type DatabricksStatementOptions, type DatabricksStatementResult } from './databricks'
import { ITEMIZED_PREVIEW_BINDING } from './itemizedPreviewBinding'

type Row = Record<string, string | null>
type Execute = (sql: string, options?: DatabricksStatementOptions) => Promise<DatabricksStatementResult>
export type ItemizedBinding = {
  batchId: string; datasetId: string; policy: string; receiptTable: string; itemizedTable: string
  receiptSha256: string; keysSha256: string; expectedRecords: number; expectedEligibleRecords: number
  expectedNet: string; expectedGoldReceipt: Record<string, unknown>
}
export class ItemizedPreviewInputError extends Error {}
export type ItemizedFilters = { year: string; area: string; category: string }
const categories = new Set(['all', 'medicine', 'medical_supply', 'medical_equipment', 'non_medical', 'unclassified'])
export const ITEMIZED_SCOPE_NOTE = 'Original itemized sales — contract amounts excluded; not complete company sales. Technical candidate; financial publication, units and forecasts retain separate review.'

export function parseItemizedFilters(input: Record<string, unknown>): ItemizedFilters {
  if (Object.keys(input).some(key => !['year', 'area', 'category'].includes(key))) throw new ItemizedPreviewInputError('Unknown itemized preview filter')
  const scalar = (key: string) => {
    const value = input[key]
    if (value === undefined) return 'all'
    if (typeof value !== 'string' || !value.trim() || value.length > 160 || /[\u0000-\u001f]/.test(value)) throw new ItemizedPreviewInputError('Invalid ' + key + ' filter')
    return value.trim()
  }
  const filters = {year: scalar('year'), area: scalar('area'), category: scalar('category')}
  if (filters.year !== 'all' && (!/^\d{4}$/.test(filters.year) || Number(filters.year) < 2017)) throw new ItemizedPreviewInputError('Year must be all or a four-digit year from 2017')
  if (!categories.has(filters.category)) throw new ItemizedPreviewInputError('Unknown product category')
  return filters
}

function tableSql(table: string) {
  assert.match(table, /^workspace\.medshield_original_gold_20261026\.original_[a-f0-9]{20}_(?:receipt|itemized_candidates)$/)
  return table.split('.').map(part => '`' + part + '`').join('.')
}
export function decimalMicros(value: string): bigint {
  assert.match(value, /^-?\d{1,30}(?:\.\d{1,6})?$/)
  const negative = value.startsWith('-'), [whole, fraction = ''] = value.replace(/^-/, '').split('.')
  const amount = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'))
  return negative ? -amount : amount
}
function validateBinding(binding: ItemizedBinding) {
  assert.match(binding.batchId, /^original_[a-f0-9]{20}$/)
  assert.equal(binding.itemizedTable, 'workspace.medshield_original_gold_20261026.' + binding.batchId + '_itemized_candidates')
  assert.equal(binding.receiptTable, 'workspace.medshield_original_gold_20261026.' + binding.batchId + '_receipt')
  for (const hash of [binding.datasetId, binding.receiptSha256, binding.keysSha256]) assert.match(hash, /^[a-f0-9]{64}$/)
  assert.equal(binding.policy, 'original_source_layers_v1_candidate_only')
  assert.ok(Number.isSafeInteger(binding.expectedRecords) && binding.expectedRecords > 0)
  assert.ok(Number.isSafeInteger(binding.expectedEligibleRecords) && binding.expectedEligibleRecords <= binding.expectedRecords)
  decimalMicros(binding.expectedNet)
}

/** Later commits may maintain metadata; analytical data remains pinned to Delta 0.
 * Inspect the complete bounded chain so a later stats commit cannot hide a write.
 */
export function assertMetadataOnlySourceHistory(rows:Row[],latestVersion:number){
  assert.ok(Number.isSafeInteger(latestVersion)&&latestVersion>=1&&latestVersion<=25,'Source history exceeds bounded metadata review')
  assert.equal(rows.length,latestVersion+1,'Original source changed after staging: source history is incomplete')
  const allowed=new Set(['SET TBLPROPERTIES','COMPUTE STATS'])
  for(let i=0;i<rows.length;i++){
    assert.equal(rows[i].version,String(latestVersion-i),'Source history is missing, duplicated or out of order')
    if(i<latestVersion)assert.ok(allowed.has(rows[i].operation??''),'Source data/schema operation requires separate reconciliation')
  }
}

async function validateSourceHistory(table:string,latest:DatabricksStatementResult,execute:Execute){
  assert.equal(latest.rows.length,1,'Source latest history is unavailable or ambiguous')
  const value=latest.rows[0].version
  assert.match(value??'',/^(0|[1-9]\d*)$/,'Source history version is invalid')
  if(value==='0')return
  const version=Number(value)
  assert.ok(Number.isSafeInteger(version)&&version<=25,'Source history exceeds bounded metadata review')
  const complete=await execute(`DESCRIBE HISTORY ${table} LIMIT ${version+1}`,{rowLimit:version+1})
  assertMetadataOnlySourceHistory(complete.rows,version)
}

/** Pins are guard values only. Every measure is read from Gold; failures never return them. */
export async function readItemizedPreviewSource(execute: Execute = executeDatabricksStatement, binding: ItemizedBinding = ITEMIZED_PREVIEW_BINDING) {
  validateBinding(binding)
  const fact = tableSql(binding.itemizedTable), receipt = tableSql(binding.receiptTable)
  const histories = await Promise.all([fact, receipt].map(table => execute(`DESCRIBE HISTORY ${table} LIMIT 1`, {rowLimit: 1})))
  await Promise.all([fact,receipt].map((table,index)=>validateSourceHistory(table,histories[index],execute)))
  const envelope = (await execute(`SELECT dataset_id, record_id, payload_sha256, payload_b64 FROM ${receipt} VERSION AS OF 0`, {rowLimit: 2})).rows
  assert.equal(envelope.length, 1, 'Ambiguous original Gold receipt')
  assert.equal(envelope[0].dataset_id, binding.datasetId)
  assert.equal(envelope[0].record_id, 'gold_receipt')
  assert.equal(envelope[0].payload_sha256, binding.receiptSha256)
  const body = inflateSync(Buffer.from(envelope[0].payload_b64 ?? '', 'base64'), {maxOutputLength: 2 * 1024 * 1024})
  assert.equal(createHash('sha256').update(body).digest('hex'), binding.receiptSha256, 'Original Gold receipt checksum differs')
  assert.deepEqual(JSON.parse(body.toString('utf8')), binding.expectedGoldReceipt, 'Original Gold receipt identity differs')
  const validation = (await execute(`SELECT COUNT(*) AS records, COUNT(DISTINCT source_record_id) AS unique_records,
    COUNT(DISTINCT dataset_id) AS dataset_count, MIN(dataset_id) AS dataset_id,
    COUNT(DISTINCT policy_version) AS policy_count, MIN(policy_version) AS policy_version,
    SHA2(CONCAT_WS('|', SORT_ARRAY(COLLECT_LIST(source_record_id))), 256) AS keys_sha256,
    SUM(CASE WHEN is_net_sales_technically_eligible THEN 1 ELSE 0 END) AS eligible_records,
    CAST(SUM(CASE WHEN is_net_sales_technically_eligible THEN net_sales END) AS STRING) AS eligible_net,
    SUM(CASE WHEN record_kind IS NULL OR record_kind <> 'itemized_sale' OR product_key IS NULL
      OR normalized_product IS NULL OR category_status IS NULL OR category_status <> 'approved'
      OR product_category IS NULL OR product_category NOT IN ('medicine','medical_supply','medical_equipment','non_medical','unclassified')
      OR is_net_sales_technically_eligible IS NULL
      OR (is_net_sales_technically_eligible AND net_sales IS NULL)
      OR is_gross_margin_technically_eligible IS NULL
      OR (is_gross_margin_technically_eligible AND (NOT is_net_sales_technically_eligible OR gross_margin_amount IS NULL))
      OR NOT (forecast_eligible <=> FALSE) OR NOT (source_unit_approved <=> FALSE)
      OR NOT (financial_release_approved <=> FALSE) THEN 1 ELSE 0 END) AS invalid_rows
    FROM ${fact} VERSION AS OF 0`, {rowLimit: 1})).rows
  assert.equal(validation.length, 1)
  const row = validation[0]
  assert.equal(row.records, String(binding.expectedRecords), 'Original itemized record count differs')
  assert.equal(row.unique_records, row.records, 'Duplicate itemized source keys')
  assert.equal(row.dataset_count, '1'); assert.equal(row.dataset_id, binding.datasetId)
  assert.equal(row.policy_count, '1'); assert.equal(row.policy_version, binding.policy)
  assert.equal(row.keys_sha256, binding.keysSha256, 'Original itemized source keys differ')
  assert.equal(row.eligible_records, String(binding.expectedEligibleRecords))
  assert.equal(decimalMicros(row.eligible_net ?? ''), decimalMicros(binding.expectedNet), 'Original itemized eligible net differs')
  assert.equal(row.invalid_rows, '0', 'Contracts, unaccepted categories or unexpected approvals entered itemized source')
  return {batch_id: binding.batchId, dataset_id: binding.datasetId, policy_version: binding.policy,
    source_table: binding.itemizedTable, delta_version: 0, receipt_sha256: binding.receiptSha256,
    source_keys_sha256: binding.keysSha256, scope: 'original_itemized_sales_contracts_excluded',
    complete_company_sales: false, contracts_excluded: true, financial_release_approved: false,
    unit_approval: false, forecast_approval: false, live_serving_changed: false,
    note: ITEMIZED_SCOPE_NOTE}
}

function scopeSql(filters: ItemizedFilters) {
  const clauses: string[] = [], parameters: NonNullable<DatabricksStatementOptions['parameters']> = []
  if (filters.year !== 'all') {
    clauses.push('date_delivered >= :start_date AND date_delivered < :end_date')
    parameters.push({name: 'start_date', value: filters.year + '-01-01', type: 'DATE'},
      {name: 'end_date', value: String(Number(filters.year) + 1) + '-01-01', type: 'DATE'})
  }
  for (const [key, column] of [['area', 'area'], ['category', 'product_category']] as const) {
    if (filters[key] !== 'all') {
      clauses.push(`${column} = :${key}`)
      parameters.push({name: key, value: filters[key], type: 'STRING'})
    }
  }
  return {where: clauses.length ? 'WHERE ' + clauses.join(' AND ') : '', parameters}
}
const metrics = `COUNT(*) AS records,
  COUNT(CASE WHEN f.is_net_sales_technically_eligible THEN 1 END) AS net_eligible_records,
  CAST(SUM(CASE WHEN f.is_net_sales_technically_eligible THEN f.net_sales END) AS STRING) AS net_sales,
  CAST(SUM(CASE WHEN f.is_net_sales_technically_eligible THEN CASE WHEN f.net_sales > 0 THEN f.net_sales ELSE 0 END END) AS STRING) AS positive_sales,
  CAST(SUM(CASE WHEN f.is_net_sales_technically_eligible THEN CASE WHEN f.net_sales < 0 THEN f.net_sales ELSE 0 END END) AS STRING) AS signed_returns,
  CAST(SUM(CASE WHEN f.is_gross_margin_technically_eligible THEN f.gross_margin_amount END) AS STRING) AS gross_margin,
  CAST(SUM(CASE WHEN f.is_gross_margin_technically_eligible THEN f.net_sales END) AS STRING) AS margin_sales_basis,
  CASE WHEN SUM(CASE WHEN f.is_gross_margin_technically_eligible THEN f.net_sales END) <> 0
    THEN CAST(ROUND(100 * SUM(CASE WHEN f.is_gross_margin_technically_eligible THEN f.gross_margin_amount END)
      / SUM(CASE WHEN f.is_gross_margin_technically_eligible THEN f.net_sales END), 4) AS STRING) END AS margin_pct`

async function measureRows(view: 'summary' | 'monthly' | 'products' | 'records', filters: ItemizedFilters, execute: Execute, binding: ItemizedBinding) {
  const {where, parameters} = scopeSql(filters), fact = tableSql(binding.itemizedTable) + ' VERSION AS OF 0 AS f'
  if (view === 'summary') return (await execute(`SELECT ${metrics}, MIN(date_delivered) AS first_delivery_date, MAX(date_delivered) AS last_delivery_date FROM ${fact} ${where}`, {rowLimit: 1, parameters})).rows
  if (view === 'monthly') return (await execute(`SELECT DATE_FORMAT(date_delivered, 'yyyy-MM') AS period, ${metrics} FROM ${fact} ${where} GROUP BY DATE_FORMAT(date_delivered, 'yyyy-MM') ORDER BY period`, {rowLimit: 2400, parameters})).rows
  if (view === 'products') return (await execute(`SELECT normalized_product AS product, product_category AS category, ${metrics} FROM ${fact} ${where} GROUP BY normalized_product, product_category ORDER BY SUM(CASE WHEN f.is_net_sales_technically_eligible AND f.net_sales > 0 THEN f.net_sales ELSE 0 END) DESC, product`, {rowLimit: 10000, parameters})).rows
  return (await execute(`SELECT source_record_id, source_workbook, source_file_sha256, source_row_number, date_delivered, area,
    normalized_product AS product, product_category AS category, CAST(recorded_quantity AS STRING) AS recorded_quantity,
    CAST(net_sales AS STRING) AS net_sales, is_net_sales_technically_eligible AS net_eligible,
    CAST(gross_margin_amount AS STRING) AS gross_margin, is_gross_margin_technically_eligible AS margin_eligible,
    category_status, quantity_unit, source_unit_approved, forecast_eligible, financial_release_approved, quality_rule_codes_json
    FROM ${fact} ${where} ORDER BY date_delivered, source_record_id`, {rowLimit: 45000, parameters})).rows
}

export async function getItemizedPreview(input: Record<string, unknown>, execute: Execute = executeDatabricksStatement, binding: ItemizedBinding = ITEMIZED_PREVIEW_BINDING) {
  const filters = parseItemizedFilters(input)
  const source = await readItemizedPreviewSource(execute, binding)
  const [summaryRows, monthly] = await Promise.all([measureRows('summary', filters, execute, binding), measureRows('monthly', filters, execute, binding)])
  assert.equal(summaryRows.length, 1, 'Missing itemized scope summary')
  const [products, options] = await Promise.all([measureRows('products', filters, execute, binding), execute(`SELECT DISTINCT CAST(YEAR(date_delivered) AS STRING) AS year, area FROM ${tableSql(binding.itemizedTable)} VERSION AS OF 0 ORDER BY year, area`, {rowLimit: 5000})])
  return {source, filters, summary: summaryRows[0], monthly, products,
    available_years: [...new Set(options.rows.map(row => row.year).filter((year): year is string => !!year))],
    available_areas: [...new Set(options.rows.map(row => row.area).filter((area): area is string => !!area))].sort()}
}

function csvCell(value: unknown) {
  let text = value == null ? '' : String(value)
  if (/^[\s]*[=+@-]/.test(text) && !/^-?\d+(?:\.\d+)?$/.test(text)) text = "'" + text
  return '"' + text.replace(/"/g, '""') + '"'
}
export async function getItemizedPreviewCsv(view: unknown, input: Record<string, unknown>, execute: Execute = executeDatabricksStatement, binding: ItemizedBinding = ITEMIZED_PREVIEW_BINDING) {
  if (typeof view !== 'string' || !['monthly', 'products', 'records'].includes(view)) throw new ItemizedPreviewInputError('Invalid itemized export view')
  const filters = parseItemizedFilters(input), source = await readItemizedPreviewSource(execute, binding)
  const rows = await measureRows(view as 'monthly' | 'products' | 'records', filters, execute, binding)
  if (!rows.length) throw new ItemizedPreviewInputError('No itemized records match these export filters')
  const fields = view === 'records'
    ? ['source_record_id','source_workbook','source_file_sha256','source_row_number','date_delivered','area','product','category','recorded_quantity','net_sales','net_eligible','gross_margin','margin_eligible','category_status','quantity_unit','source_unit_approved','forecast_eligible','financial_release_approved','quality_rule_codes_json']
    : [...(view === 'monthly' ? ['period'] : ['product','category']), 'records','net_eligible_records','net_sales','positive_sales','signed_returns','gross_margin','margin_sales_basis','margin_pct']
  const metadata = ['Source batch','Dataset ID','Gold table','Delta version','Receipt SHA256','Analytical scope','Contracts excluded','Complete company sales','Financial release approved','Quantity unit approved','Forecast approved','Year filter','Area filter','Category filter']
  const values = [source.batch_id,source.dataset_id,source.source_table,source.delta_version,source.receipt_sha256,source.scope,true,false,false,false,false,filters.year,filters.area,filters.category]
  const body = [[...fields,...metadata],...rows.map(row => [...fields.map(field => row[field]),...values])]
  return {csv: '\uFEFF' + body.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n', filename: `medshield-itemized-preview-${String(view)}.csv`}
}
