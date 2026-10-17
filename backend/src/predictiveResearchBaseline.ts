import { createHash } from 'node:crypto'
import { executeDatabricksStatement } from './databricks'
import { databricksLiteral } from './databricksLiteral'
import { monthIndex, monthLabel } from './forecastEvidence'

const TABLE = 'workspace.medshield_gold.mart_forecast_monthly_candidate'
const HASH = /^[a-f0-9]{64}$/
const PERIOD = /^[1-9]\d{3}-(0[1-9]|1[0-2])$/
const MAX_ROWS = 12000
const MAX_BYTES = 20_000_000
type Json = Record<string, any>
type Node = { value: any; canonical: string; members?: Map<string, Node> }
export type FrozenBaseline = { storageHash: string; contentHash: string; rows: Map<string, Json> }

function requireValue(value: unknown): asserts value { if (!value) throw new Error('Frozen predictive input is inconsistent.') }
function pythonString(value: string) { return JSON.stringify(value).replace(/[\u007f-\uffff]/g, character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`) }
function keyOrder(a: string, b: string) {
  const left = Array.from(a, c => c.codePointAt(0)!), right = Array.from(b, c => c.codePointAt(0)!)
  for (let index = 0; index < Math.min(left.length, right.length); index++) if (left[index] !== right[index]) return left[index] - right[index]
  return left.length - right.length
}

// The final content hash remains the authority. Unsupported encodings fail closed;
// a storage payload can lose Python float type when another producer rewrites JSON.
function pythonNumber(token: string) {
  const value = Number(token)
  requireValue(Number.isFinite(value))
  if (!/[.eE]/.test(token)) { requireValue(Number.isSafeInteger(value)); return Object.is(value, -0) ? '0' : String(value) }
  if (value === 0) return token.startsWith('-') ? '-0.0' : '0.0'
  const negative = value < 0 ? '-' : ''
  const [mantissa, exponentText] = Math.abs(value).toString().split('e')
  const decimal = mantissa.indexOf('.') < 0 ? mantissa.length : mantissa.indexOf('.')
  const all = mantissa.replace('.', ''), first = all.search(/[1-9]/)
  const exponent = decimal - first - 1 + Number(exponentText ?? 0)
  const digits = all.slice(first).replace(/0+$/, '')
  if (exponent < -4 || exponent >= 16) return `${negative}${digits[0]}${digits.length > 1 ? `.${digits.slice(1)}` : ''}e${exponent < 0 ? '-' : '+'}${Math.abs(exponent).toString().padStart(2, '0')}`
  const decimalPosition = exponent + 1
  return negative + (decimalPosition <= 0 ? `0.${'0'.repeat(-decimalPosition)}${digits}` : decimalPosition >= digits.length ? `${digits}${'0'.repeat(decimalPosition - digits.length)}.0` : `${digits.slice(0, decimalPosition)}.${digits.slice(decimalPosition)}`)
}

/** Python json.dumps(sort_keys=True,separators=(',',':'),allow_nan=False) identity.
 * Numeric lexical types are retained, strings use ensure_ascii, duplicate keys fail.
 * Hash mismatch still rejects any float representation this encoder cannot reproduce.
 */
function parseCanonical(raw: string): Node {
  let position = 0, nodes = 0
  const skip = () => { while (/[ \t\r\n]/.test(raw[position] ?? '') && position < raw.length) position++ }
  function parse(depth = 0): Node {
    requireValue(++nodes <= 200000 && depth <= 30); skip()
    const start = position, character = raw[position]
    if (character === '"') {
      position++
      while (position < raw.length) { if (raw[position++] === '"') break; if (raw[position - 1] === '\\') position++ }
      const value = JSON.parse(raw.slice(start, position)); requireValue(typeof value === 'string')
      return { value, canonical: pythonString(value) }
    }
    if (character === '{') {
      position++; skip(); const members = new Map<string, Node>(), value: Json = Object.create(null)
      if (raw[position] !== '}') while (true) {
        requireValue(raw[position] === '"'); const key = parse(depth + 1).value; requireValue(!members.has(key)); skip(); requireValue(raw[position++] === ':')
        const child = parse(depth + 1); members.set(key, child); value[key] = child.value; skip()
        if (raw[position] !== ',') break
        position++; skip()
      }
      requireValue(raw[position++] === '}')
      return { value, members, canonical: `{${[...members.keys()].sort(keyOrder).map(key => `${pythonString(key)}:${members.get(key)!.canonical}`).join(',')}}` }
    }
    if (character === '[') {
      position++; skip(); const children: Node[] = []
      if (raw[position] !== ']') while (true) { children.push(parse(depth + 1)); skip(); if (raw[position] !== ',') break; position++ }
      requireValue(raw[position++] === ']')
      return { value: children.map(child => child.value), canonical: `[${children.map(child => child.canonical).join(',')}]` }
    }
    const literal = /^(?:true|false|null)/.exec(raw.slice(position))?.[0]
    if (literal) { position += literal.length; return { value: JSON.parse(literal), canonical: literal } }
    const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(raw.slice(position))?.[0]
    requireValue(number); position += number.length
    return { value: Number(number), canonical: pythonNumber(number) }
  }
  const value = parse(); skip(); requireValue(position === raw.length); return value
}
export function canonicalPythonJson(raw: string) { return parseCanonical(raw).canonical }

function roundedCents(value: string) {
  const match = /^(-?)(\d{1,22})(?:\.(\d{1,12}))?$/.exec(value)
  requireValue(match)
  const fraction = (match[3] ?? '').padEnd(3, '0')
  const cents = BigInt(match[2]) * 100n + BigInt(fraction.slice(0, 2)) + (Number(fraction[2]) >= 5 ? 1n : 0n)
  return match[1] ? -cents : cents
}
function bool(value: string | null, expected: boolean) { return value === String(expected) }

function validateRow(typed: Record<string, string | null>, payload: Json, manifest: Json) {
  const row = payload.row
  requireValue(row && row.series_id === 'company:net_sales:PHP' && row.target_name === 'net_sales' && row.grain === 'company_month' && row.scope === 'company' && row.unit === 'PHP' && PERIOD.test(row.period))
  requireValue(row.target_value === null || typeof row.target_value === 'number' && Number.isFinite(row.target_value))
  requireValue(['observed', 'recorded_zero', 'confirmed_zero', 'missing', 'ineligible', 'partial'].includes(row.value_status))
  requireValue(typeof row.coverage_status === 'string' && row.coverage_status.length > 0 && row.coverage_status.length <= 160)
  for (const key of ['period_closed', 'calendar_closed', 'eligible_for_evaluation', 'eligible_for_publication']) requireValue(typeof row[key] === 'boolean')
  requireValue(Array.isArray(row.blockers) && row.blockers.length <= 100 && row.blockers.every((reason: unknown) => typeof reason === 'string' && reason.length > 0 && reason.length <= 2000))
  requireValue(row.missing_reason === null || typeof row.missing_reason === 'string' && row.missing_reason.length > 0 && row.missing_reason.length <= 2000)
  if (['recorded_zero', 'confirmed_zero'].includes(row.value_status)) requireValue(row.target_value === 0)
  if (['missing', 'ineligible'].includes(row.value_status)) requireValue(row.target_value === null)
  if (row.target_value === null) requireValue(row.target_value_decimal === null && typed.target_value === null)
  else {
    requireValue(typeof row.target_value_decimal === 'string' && Number(row.target_value_decimal) === row.target_value && typeof typed.target_value === 'string')
    requireValue(roundedCents(typed.target_value) === roundedCents(row.target_value_decimal))
  }
  requireValue(typed.dataset_id === manifest.dataset_id && typed.fact_delta_version === String(manifest.fact_delta_version) && typed.mapping_version === `${manifest.geography_mapping_version}:${manifest.catalog_mapping_version}`)
  for (const key of ['series_id', 'target_name', 'unit', 'coverage_status']) requireValue(typed[key] === row[key])
  requireValue(typed.period === `${row.period}-01`)
  for (const key of ['period_closed', 'eligible_for_evaluation', 'eligible_for_publication']) requireValue(bool(typed[key], row[key]))
  return row
}

/** Read the complete exact-manifest input, not mutable current sales or run actuals. */
export async function readFrozenBaseline(manifest: Json, contentHash: string, execute: typeof executeDatabricksStatement): Promise<FrozenBaseline> {
  requireValue(HASH.test(contentHash))
  requireValue(HASH.test(manifest.dataset_id) && HASH.test(manifest.geography_mapping_version) && HASH.test(manifest.catalog_mapping_version) && Number.isSafeInteger(manifest.fact_delta_version) && manifest.fact_delta_version >= 0)
  const manifestCanonical = canonicalPythonJson(JSON.stringify(manifest))
  for (const key of ['extracted_at', 'source_available_at', 'revision_policy']) requireValue(typeof manifest[key] === 'string' && manifest[key].length > 0)
  const fields = 'input_hash, dataset_id, fact_delta_version, mapping_version, series_id, target_name, period, target_value, unit, period_closed, coverage_status, eligible_for_evaluation, eligible_for_publication, payload_json'
  const result = await execute(`SELECT ${fields} FROM ${TABLE} WHERE dataset_id=${databricksLiteral(manifest.dataset_id)} AND fact_delta_version=${manifest.fact_delta_version} AND mapping_version=${databricksLiteral(`${manifest.geography_mapping_version}:${manifest.catalog_mapping_version}`)} ORDER BY input_hash, series_id, target_name, period`, { rowLimit: MAX_ROWS + 1 })
  requireValue(result.rows.length > 0 && result.rows.length <= MAX_ROWS && result.rows.reduce((bytes, row) => bytes + Buffer.byteLength(row.payload_json ?? '', 'utf8'), 0) <= MAX_BYTES)
  const groups = new Map<string, Array<{ row: Json; canonical: string }>>()
  const storageManifests = new Map<string, string>()
  for (const typed of result.rows) {
    requireValue(typeof typed.input_hash === 'string' && HASH.test(typed.input_hash) && typeof typed.payload_json === 'string' && Buffer.byteLength(typed.payload_json, 'utf8') <= 100000)
    const parsed = parseCanonical(typed.payload_json)
    requireValue(parsed.members?.size === 2 && parsed.members.has('manifest') && parsed.members.has('row'))
    const storedManifest = parsed.members.get('manifest')!.canonical
    requireValue(!storageManifests.has(typed.input_hash) || storageManifests.get(typed.input_hash) === storedManifest)
    storageManifests.set(typed.input_hash, storedManifest)
    const row = validateRow(typed, parsed.value, parsed.value.manifest)
    // Other retained manifests are never substitute baselines; their rows stay excluded.
    if (storedManifest !== manifestCanonical) continue
    const group = groups.get(typed.input_hash) ?? []
    group.push({ row, canonical: parsed.members.get('row')!.canonical }); groups.set(typed.input_hash, group)
  }
  const matched: FrozenBaseline[] = []
  for (const [storageHash, values] of groups) {
    values.sort((a, b) => a.row.period.localeCompare(b.row.period))
    requireValue(new Set(values.map(value => value.row.period)).size === values.length)
    const canonical = `{"manifest":${manifestCanonical},"rows":[${values.map(value => value.canonical).join(',')}],"schema_version":"1.0"}`
    const actualHash = createHash('sha256').update(canonical, 'utf8').digest('hex')
    if (actualHash === contentHash) matched.push({ storageHash, contentHash: actualHash, rows: new Map(values.map(value => [value.row.period, value.row])) })
  }
  requireValue(matched.length === 1)
  return matched[0]
}

export function forecastYoy(point: { origin_period: string; target_period: string; lead_months: number; prediction: number | null }, baseline: FrozenBaseline) {
  requireValue(PERIOD.test(point.origin_period) && PERIOD.test(point.target_period) && Number.isInteger(point.lead_months) && point.lead_months >= 1 && point.lead_months <= 12 && monthIndex(point.target_period) - monthIndex(point.origin_period) === point.lead_months)
  const priorYear = monthLabel(monthIndex(point.target_period) - 12), row = baseline.rows.get(priorYear)
  const rawValue = row?.target_value
  const value = typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : null
  let reason: string | null = null
  if (priorYear > point.origin_period) reason = 'prior_year_after_forecast_origin'
  else if (!row) reason = 'prior_year_period_missing'
  else if (value === null || !Number.isFinite(value)) reason = 'prior_year_value_unavailable'
  else if (!['observed', 'recorded_zero', 'confirmed_zero'].includes(row.value_status)) reason = 'prior_year_value_status_ineligible'
  else if (row.period_closed !== true || row.calendar_closed !== true) reason = 'prior_year_period_not_closed'
  else if (row.coverage_status !== 'complete') reason = 'prior_year_coverage_incomplete'
  else if (row.eligible_for_evaluation !== true) reason = 'prior_year_not_evaluation_eligible'
  else if (!Array.isArray(row.blockers) || row.blockers.length) reason = 'prior_year_has_blockers'
  else if (value === 0) reason = 'prior_year_value_zero'
  else if (value < 0) reason = 'prior_year_value_negative'
  else if (point.prediction === null || !Number.isFinite(point.prediction)) reason = 'prediction_unavailable'
  const growth = reason === null ? 100 * (point.prediction! - value!) / value! : null
  if (growth !== null && !Number.isFinite(growth)) reason = 'forecast_yoy_nonfinite'
  return { prior_year_period: priorYear, prior_year_net_sales_php: value, prior_year_value_status: row?.value_status ?? null, prior_year_coverage_status: row?.coverage_status ?? null,
    forecast_yoy_percent: reason === null ? growth : null, forecast_yoy_unavailable_reason: reason, baseline_input_storage_hash: baseline.storageHash, baseline_input_content_hash: baseline.contentHash }
}
