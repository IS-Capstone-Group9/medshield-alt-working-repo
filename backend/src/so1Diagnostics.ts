import assert from 'node:assert/strict'
import { requireUncorrectedResearchEligible } from './analyticalTruth'
import { createHash } from 'node:crypto'
import { executeDatabricksStatement } from './databricks'
import { descriptiveBinding, readDescriptiveRelease, qualifiedTable, type DescriptiveRelease } from './descriptiveSource'
import { DASHBOARD_POPULATION } from './descriptiveEvidence'
import { databricksLiteral } from './databricksLiteral'
import {originalItemizedFactSql} from './originalItemizedSource'
import {ITEMIZED_PREVIEW_BINDING} from './itemizedPreviewBinding'
import {ORIGINAL_SO1_SHA256} from './originalSo1Binding'
import {readSo1Financial,enrichSo1Financial} from './so1Financial'

export type So1Month = { period: string; revenue: number | null; records: number; eligible_records: number; adjusted_records: number }
export type So1Point = { period: string; comparison_segment: string; scenario: string; observed: number; trend: number; seasonal: number; residual: number }
export type So1Series = { area: string; mapping: Record<string, string | null> | null; months: So1Month[]; components: So1Point[];
  comparisons: Record<string, any>[]; daily_summary: Record<string, any> | null; daily_months: Record<string, any>[]; monthly_method: Record<string, any> | null }
export type So1Package = { schema_version: string; release: DescriptiveRelease; population: typeof DASHBOARD_POPULATION;
  source_sha256: string; protocol_sha256: string; verification_sha256: string; protocol: Record<string, any>;
  period_start: string; period_end: string; source_generated_at: string; analysis_generated_at: string;
  candidate_status: string; limits: string[]; series: So1Series[] }
export class So1InputError extends Error {}
export const so1Hash = (text: string) => createHash('sha256').update(text).digest('hex')
const HASH = /^[a-f0-9]{64}$/
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
export function so1Index(period: string) {
  assert.match(period, /^\d{4}-(0[1-9]|1[0-2])$/)
  return Number(period.slice(0, 4)) * 12 + Number(period.slice(5)) - 1
}
export function so1Table(release: DescriptiveRelease, hash: string) {
  assert.match(hash, HASH)
  if(release.original_itemized){
    assert.equal(release.source_table,ITEMIZED_PREVIEW_BINDING.itemizedTable)
    assert.equal(release.dataset_id,ITEMIZED_PREVIEW_BINDING.datasetId)
    assert.equal(release.policy_version,ITEMIZED_PREVIEW_BINDING.policy)
    assert.equal(release.fact_delta_version,0)
    return qualifiedTable('medshield_original_gold_20261026',`so1_${hash.slice(0,16)}_candidate`)
  }
  const match = /^workspace\.(medshield_gold_source_\d{8})\.sales_restart_fact_candidate$/.exec(release.source_table ?? '')
  assert.ok(match && release.fact_delta_version === 0, 'SO1 needs the isolated pinned source')
  return qualifiedTable(match[1], `so1_${hash.slice(0, 16)}_candidate`)
}
export function validateSo1Package(payload: So1Package, release: DescriptiveRelease) {
  assert.equal(payload.schema_version, 'medshield.so1.v1')
  assert.deepEqual(payload.release, release, 'SO1 release/financial identity differs')
  assert.deepEqual(payload.population, DASHBOARD_POPULATION, 'SO1 sales population differs')
  for (const field of ['source_sha256', 'protocol_sha256', 'verification_sha256'] as const) assert.match(payload[field], HASH)
  assert.equal(payload.candidate_status, 'conditional_diagnostic_not_model_or_objective_approval')
  for (const timestamp of [payload.source_generated_at, payload.analysis_generated_at])
    assert.ok(typeof timestamp === 'string' && Number.isFinite(Date.parse(timestamp)), 'SO1 evidence timestamp is invalid')
  assert.equal(payload.protocol.version, 'so1_recorded_sales_conditional_daily_v1')
  for (const [field, value] of Object.entries({ monthly_period: 12, daily_period: 365, seasonal_window: 13, robust: true,
    minimum_months: 36, hypothetical_blank_day_sales_fraction: '0.10', neutral_trend_scale_fraction: .05,
    material_normalized_trend_mae_pct: 10, material_peak_shift_months: 2, material_hypothetical_revenue_increase_pct: 5,
    status: 'user_authorized_offline_assumption_not_verified_source_completeness' })) assert.equal(payload.protocol[field], value)
  assert.equal(payload.period_start, '2017-01')
  const count = so1Index(payload.period_end) - so1Index(payload.period_start) + 1
  assert.ok(count > 0 && count <= 2400)
  assert.ok(Array.isArray(payload.series) && payload.series.length > 1 && payload.series.length <= 100)
  assert.ok(Array.isArray(payload.limits) && payload.limits.length && payload.limits.every(s => typeof s === 'string'))
  assert.equal(payload.series[0].area, 'COMPANY')
  assert.equal(new Set(payload.series.map(s => s.area)).size, payload.series.length)
  if(release.original_itemized){
    assert.equal(payload.release.original_itemized?.contracts_excluded,true)
    for(const series of payload.series.slice(1)){
      assert.equal(series.mapping?.proposed_area_type,'recorded_source_label')
      assert.equal(series.mapping?.is_geographic_territory_approved,'false')
      assert.equal(series.mapping?.mapped_region,null)
      assert.equal(series.mapping?.area_mapping_status,'unapproved')
      assert.ok(series.months.every(row=>row.adjusted_records===0),'Original source cannot inherit adjusted rows')
    }
  }
  for (const series of payload.series) {
    assert.ok(typeof series.area === 'string' && series.area.length <= 100 && !/[\x00-\x1f]/.test(series.area))
    assert.equal(series.months.length, count)
    const months = new Map<string, So1Month>()
    series.months.forEach((row, index) => {
      assert.equal(so1Index(row.period), so1Index(payload.period_start) + index)
      assert.ok(row.revenue === null || finite(row.revenue))
      for (const key of ['records', 'eligible_records', 'adjusted_records'] as const) assert.ok(Number.isSafeInteger(row[key]) && row[key] >= 0)
      assert.ok(row.eligible_records <= row.records && row.adjusted_records <= row.records)
      assert.equal(row.revenue === null, row.eligible_records === 0)
      months.set(row.period, row)
    })
    assert.ok(Array.isArray(series.components) && series.components.length <= 20000)
    const seen = new Set<string>(), segments = new Map<string, So1Point[]>()
    for (const point of series.components) {
      assert.ok(['monthly_primary', 'matched_monthly_primary', 'daily_zero_aggregated', 'daily_stress_aggregated'].includes(point.scenario))
      const key = `${point.comparison_segment}|${point.scenario}|${point.period}`
      assert.ok(!seen.has(key), 'Duplicate SO1 component'); seen.add(key)
      for (const field of ['observed', 'trend', 'seasonal', 'residual'] as const) assert.ok(finite(point[field]))
      assert.ok(Math.abs(point.observed - point.trend - point.seasonal - point.residual) < .00001, 'SO1 components do not reconstruct')
      const source = months.get(point.period)?.revenue
      assert.ok(source != null, 'SO1 component fills a source gap')
      if (point.scenario === 'daily_stress_aggregated') assert.ok(point.observed >= source - .000001)
      else assert.ok(Math.abs(point.observed - source) < .000001, 'SO1 observed sales changed')
      const segmentKey = `${point.comparison_segment}|${point.scenario}`
      const segment = segments.get(segmentKey) ?? []; segment.push(point); segments.set(segmentKey, segment)
    }
    for (const [key, points] of segments) {
      if (key === 'full_history_primary|monthly_primary') continue // Primary may contain separate qualifying runs.
      assert.ok(points.length >= 36)
      points.forEach((p, i) => { if (i) assert.equal(so1Index(p.period), so1Index(points[i - 1].period) + 1) })
    }
    assert.ok(Array.isArray(series.comparisons))
    assert.ok(Array.isArray(series.daily_months))
    if (series.daily_summary) {
      assert.equal(series.daily_months.length, count)
      const categories = ['recorded_eligible_revenue', 'assumed_zero_no_recorded_transaction', 'unknown_whole_month', 'unknown_ineligible_revenue']
      series.daily_months.forEach((row, i) => {
        assert.equal(row.period, series.months[i].period)
        for (const category of categories) assert.ok(Number.isSafeInteger(row[category] ?? 0) && (row[category] ?? 0) >= 0)
        assert.equal(categories.reduce((n, category) => n + (row[category] ?? 0), 0), row.days)
        assert.equal(row.days, new Date(Date.UTC(Number(row.period.slice(0, 4)), Number(row.period.slice(5)), 0)).getUTCDate())
        if (series.months[i].revenue === null) assert.equal(row.assumed_zero_no_recorded_transaction ?? 0, 0)
      })
    } else assert.equal(series.daily_months.length, 0)
    for (const comparison of series.comparisons) {
      assert.equal(comparison.area, series.area)
      assert.equal(typeof comparison.segment_id, 'string')
      assert.equal(so1Index(comparison.end.slice(0, 7)) - so1Index(comparison.start.slice(0, 7)) + 1, comparison.months)
      for (const scenario of ['matched_monthly_primary', 'daily_zero_aggregated', 'daily_stress_aggregated']) {
        const points = segments.get(`${comparison.segment_id}|${scenario}`)
        assert.equal(points?.length, comparison.months)
        assert.equal(points![0].period, comparison.start.slice(0, 7)); assert.equal(points!.at(-1)!.period, comparison.end.slice(0, 7))
      }
    }
  }
  const company = payload.series[0]
  company.months.forEach((row, index) => {
    const areas = payload.series.slice(1).map(s => s.months[index])
    assert.equal(row.records, areas.reduce((n, a) => n + a.records, 0))
    assert.equal(row.eligible_records, areas.reduce((n, a) => n + a.eligible_records, 0))
    const observed = areas.filter(a => a.revenue !== null)
    assert.equal(row.revenue === null, observed.length === 0)
    if (row.revenue !== null) assert.ok(Math.abs(row.revenue - observed.reduce((n, a) => n + a.revenue!, 0)) < .000001)
  })
  return payload
}

export async function reconcileSo1Source(payload: So1Package, execute = executeDatabricksStatement) {
  const release = payload.release
  so1Table(release, 'a'.repeat(64)) // Validate source identifier before interpolation.
  const fact = release.original_itemized?originalItemizedFactSql(release,'itemized'):
    release.source_table!.split('.').map(p => '`' + p + '`').join('.') + ` VERSION AS OF ${release.fact_delta_version}`
  const sql = `SELECT normalized_area,DATE_FORMAT(month_start,'yyyy-MM') AS period,COUNT(*) AS records,
    SUM(CASE WHEN is_net_sales_eligible THEN 1 ELSE 0 END) AS eligible_records,
    SUM(CASE WHEN is_adjusted_source THEN 1 ELSE 0 END) AS adjusted_records,
    SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS revenue
    FROM ${fact} WHERE (${DASHBOARD_POPULATION.predicate}) GROUP BY normalized_area,month_start ORDER BY normalized_area,month_start`
  const result = await execute(sql, { rowLimit: 10001 })
  assert.ok(result.rows.length > 0 && result.rows.length < 10001)
  const expected = new Map<string, So1Month>(payload.series.slice(1).flatMap(s => s.months.filter(m => m.records > 0).map(m => [`${s.area}|${m.period}`, m] as const)))
  assert.equal(result.rows.length, expected.size, 'SO1 live source calendar/population changed')
  const seen = new Set<string>()
  for (const row of result.rows) {
    const key = `${row.normalized_area}|${row.period}`, target = expected.get(key)
    assert.ok(target && !seen.has(key), 'Unexpected SO1 live source period'); seen.add(key)
    for (const field of ['records', 'eligible_records', 'adjusted_records'] as const) assert.equal(Number(row[field]), target[field])
    if (row.revenue === null) assert.equal(target.revenue, null)
    else assert.ok(target.revenue !== null && Math.abs(Number(row.revenue) - target.revenue) < .000001, 'SO1 source revenue differs')
  }
  return { rows: result.rows.length, sql_sha256: so1Hash(sql) }
}

export function so1Query(input: Record<string, unknown>) {
  if (Object.keys(input).some(k => !['area', 'year'].includes(k))) throw new So1InputError('Use area and year only')
  const area = input.area === undefined ? 'COMPANY' : input.area
  const year = input.year === undefined ? 'all' : input.year
  if (typeof area !== 'string' || area.length > 100 || !area || /[\x00-\x1f]/.test(area)) throw new So1InputError('Invalid territory label')
  if (typeof year !== 'string' || year !== 'all' && !/^(19|20|21)\d{2}$/.test(year)) throw new So1InputError('Invalid year')
  return { area, year }
}

/** Accounting bridge over company-common recorded months; absent labels contribute
 * no recorded amount, without asserting zero actual sales or complete reporting. */
export function so1Contributions(payload:So1Package,year:string){
  const company=payload.series[0]
  const years=[...new Set(company.months.map(row=>row.period.slice(0,4)))]
  return years.slice(1).filter(target=>year==='all'||year===target).flatMap(target=>{
    const base=String(Number(target)-1)
    const common=Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')).filter(m=>
      company.months.find(row=>row.period===base+'-'+m)?.revenue!=null&&company.months.find(row=>row.period===target+'-'+m)?.revenue!=null)
    if(!common.length)return []
    const total=(s:So1Series,y:string)=>common.reduce((sum,m)=>sum+(s.months.find(row=>row.period===y+'-'+m)?.revenue??0),0)
    const companyChange=total(company,target)-total(company,base)
    const rows=payload.series.slice(1).map(s=>({area:s.area,base_year:base,target_year:target,
      common_months:common,base_revenue:total(s,base),target_revenue:total(s,target),
      change:total(s,target)-total(s,base),company_change:companyChange,
      missing_label_months:common.flatMap(m=>[base+'-'+m,target+'-'+m]).filter(p=>s.months.find(row=>row.period===p)?.revenue==null),
      basis:'company_common_recorded_months_missing_label_is_no_recorded_contribution_not_verified_zero_sales'}))
    assert.ok(Math.abs(rows.reduce((n,r)=>n+r.change,0)-companyChange)<.00001,'Signed contributions do not conserve company change')
    return rows
  })
}
export function so1View(payload: So1Package, hash: string, input: Record<string, unknown>) {
  const { area, year } = so1Query(input)
  const series = payload.series.find(s => s.area === area)
  const labelAllowed=(s:So1Series)=>s.area==='COMPANY'||s.mapping?.proposed_area_type==='territory'||
    !!payload.release.original_itemized&&s.mapping?.proposed_area_type==='recorded_source_label'
  if (!series || !labelAllowed(series)) throw new So1InputError('Select company or an available recorded source label')
  const years = [...new Set(series.months.map(m => m.period.slice(0, 4)))]
  if (year !== 'all' && !years.includes(year)) throw new So1InputError('Year is outside this diagnostic source')
  const include = (period: string) => year === 'all' || period.startsWith(year + '-')
  const months = series.months.filter(m => include(m.period))
  const yoy = years.slice(1).filter(y => year === 'all' || y === year).map(target => {
    const base = String(Number(target) - 1)
    const pairs = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(n => ({ month: n,
      base: series.months.find(m => m.period === `${base}-${n}`), target: series.months.find(m => m.period === `${target}-${n}`) }))
      .filter(p => p.base?.revenue != null && p.target?.revenue != null)
    const baseRevenue = pairs.length ? pairs.reduce((n, p) => n + p.base!.revenue!, 0) : null
    const targetRevenue = pairs.length ? pairs.reduce((n, p) => n + p.target!.revenue!, 0) : null
    const change = baseRevenue !== null && targetRevenue !== null ? targetRevenue - baseRevenue : null
    return { base_year: base, target_year: target, common_months: pairs.map(p => p.month), base_revenue: baseRevenue,
      target_revenue: targetRevenue, change, growth_pct: baseRevenue !== null && baseRevenue > 0 ? 100 * change! / baseRevenue : null }
  })
  return { schema_version: 'medshield.so1.view.v1', scope: { area, year, buyer_scope: 'All', independent_of_topbar: true,
    contracts_excluded:!!payload.release.original_itemized,geographic_approval:payload.release.original_itemized?'unapproved_recorded_labels_only':'see_source_mapping',
    start: months[0].period, end: months.at(-1)!.period }, release: payload.release, checksum: hash,
    source_sha256: payload.source_sha256, protocol: payload.protocol, candidate_status: payload.candidate_status,
    options: { years, areas: payload.series.filter(labelAllowed).map(s => ({ area: s.area, mapping: s.mapping })) },
    months, yoy, contributions:so1Contributions(payload,year),contribution_scope:'Company recorded-data change by exact source label; independent of selected area; company-common months only',
    mapping: series.mapping, components: series.components.filter(p => include(p.period)),
    comparisons: series.comparisons.filter(c => year === 'all' || Number(c.start.slice(0, 4)) <= Number(year) && Number(c.end.slice(0, 4)) >= Number(year)),
    daily_summary: series.daily_summary, daily_months: series.daily_months.filter(p => include(p.period)), monthly_method: series.monthly_method,
    limits: payload.limits, interpretation: 'Monthly recorded sales are primary. Daily zeros and missed-sales stress are assumptions; changing year only filters existing full-segment fits.' }
}

export async function readSo1Diagnostics(input: Record<string, unknown>, env: NodeJS.ProcessEnv = process.env, execute = executeDatabricksStatement) {
  so1Query(input)
  const release = await readDescriptiveRelease(descriptiveBinding(env), execute)
  const hash = release.original_itemized?ORIGINAL_SO1_SHA256:env.DATABRICKS_SO1_SHA256?.trim()
  assert.ok(hash && HASH.test(hash), 'SO1 candidate is not configured')
  if(!release.original_itemized)requireUncorrectedResearchEligible(release.dataset_id)
  const table = so1Table(release, hash)
  if(release.original_itemized){
    const history=(await execute(`DESCRIBE HISTORY ${table} LIMIT 1`,{rowLimit:1})).rows
    assert.equal(history[0]?.version,'0','Original SO1 candidate must remain immutable Delta0')
  }
  const rows = (await execute(`SELECT record_key,payload_json,payload_sha256 FROM ${table} VERSION AS OF 0 ORDER BY record_key`, { rowLimit: 102 })).rows
  const payload = decodeSo1Rows(rows, hash, release)
  const controls = await reconcileSo1Source(payload, execute)
  const view=so1View(payload,hash,input)
  if(release.original_itemized){
    const financial=await readSo1Financial(payload,execute)
    return {...enrichSo1Financial(view,payload,financial),
      source:{system_of_record:'databricks',table,version:0,source_reconciled:true,...controls,financial:financial.source}}
  }
  return { ...view, source: { system_of_record: 'databricks', table, version: 0, source_reconciled: true, ...controls } }
}

export function decodeSo1Rows(rows: Record<string, string | null>[], hash: string, release: DescriptiveRelease) {
  assert.ok(rows.length > 1 && rows.length < 102 && new Set(rows.map(r => r.record_key)).size === rows.length, 'SO1 candidate rows are missing or duplicated')
  const parsed = new Map<string, any>()
  for (const row of rows) {
    assert.ok(typeof row.payload_json === 'string' && so1Hash(row.payload_json) === row.payload_sha256, 'SO1 persisted checksum mismatch')
    parsed.set(row.record_key!, JSON.parse(row.payload_json))
  }
  const manifest = parsed.get('!manifest')
  assert.ok(manifest && manifest.package_sha256 === hash && Array.isArray(manifest.areas), 'SO1 manifest mismatch')
  assert.equal(parsed.size, manifest.areas.length + 1)
  const payload = { ...manifest.metadata, series: manifest.areas.map((area: string) => parsed.get(area)) } as So1Package
  assert.ok(payload.series.every(Boolean), 'SO1 series missing')
  assert.equal(so1Hash(JSON.stringify(payload) + '\n'), hash, 'SO1 package content identity mismatch')
  validateSo1Package(payload, release)
  return payload
}

export const so1Literal = databricksLiteral
