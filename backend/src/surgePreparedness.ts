import {createHash} from 'node:crypto'
import {executeDatabricksStatement} from './databricks'
import {readOriginalItemizedRelease} from './originalItemizedSource'
import {FAMILY_BINDING, parseFamilyMapping} from './familyAbcXyz'
import {breakdownSql, parseCells} from './diagnosticBreakdowns'
import {CATEGORY_BINDING, parseCategoryMapping} from './demandProfile'
import type {DescriptiveRelease} from './descriptiveSource'

/**
 * Surge preparedness (outputs/surge_preparedness_20261117). The observed DOH/PAGASA risk calendar and the registered
 * alert results are saved once as a hash-pinned one-row table. The peso scenario base is recomputed from Gold routine
 * sales. Disease and weather INFORM planning; they are not demand signals (alerts failed except a trend-confounded
 * diarrhoeal pass) and the uplift is a planner-chosen hedge, never a forecast or purchase order.
 */
export const SURGE_BINDING = {
  table: 'workspace.medshield_warehouse.reference_surge_preparedness_d9874878ecca4f49_candidate',
  payloadSha256: 'd9874878ecca4f49144015840ad74d5fc080e5bc706cdf9497aa84f0beff0712',
} as const
export const SURGE_RULES = {uplifts: [20, 40, 60], years: [2021, 2022, 2023, 2024, 2025], coverMonths: 1} as const

type CalendarRow = {disease: string; geography: string; seasonal_index: (number | null)[]; surge_months: number[]; total_cases_2021_2025: number; pandemic_flag: boolean}
type AlertRow = {alert: string; exposed: string[]; hit_rate_alert: number | null; hit_rate_no_alert: number | null; p_holm: number; useful: boolean; alert_months: number}
export type SurgePayload = {schema_version: string; status: string; evidence: string; surge_index_rule: number; calendar: CalendarRow[]
  exposed_categories: Record<string, string[]>; weather: {cyclones_entering_par_by_month: number[]; cyclones_total: number; rainfall_mm_mean_by_month: (number | null)[]
    wet_months: number[]; rainfall_stations: string}; alerts: AlertRow[]; alert_note: string; forecast_approved: false; procurement_approved: false}
type Row = Record<string, string | null>

export function parseSurgePayload(raw: string): SurgePayload {
  if (createHash('sha256').update(raw).digest('hex') !== SURGE_BINDING.payloadSha256) throw new Error('Surge payload hash mismatch')
  const p = JSON.parse(raw)
  if (p.schema_version !== 'surge_preparedness_v1' || p.forecast_approved !== false || p.procurement_approved !== false || !Array.isArray(p.calendar)
    || typeof p.exposed_categories !== 'object' || !Array.isArray(p.alerts)) throw new Error('Unexpected surge payload')
  return p
}

export function buildSurgePreparedness(release: DescriptiveRelease, families: Record<string, string>, categories: Record<string, string>, payload: SurgePayload, cellRows: Row[]) {
  const routine = new Map<string, Map<string, number>>(), recorded = new Set<string>()
  for (const c of parseCells(cellRows, families)) {
    recorded.add(c.period)
    if (c.large) continue
    const cat = categories[c.family]; if (!cat) continue
    const s = routine.get(cat) ?? new Map<string, number>(); s.set(c.period, (s.get(c.period) ?? 0) + c.net); routine.set(cat, s)
  }
  const territory = new Map(payload.calendar.filter(c => c.geography === 'Territory').map(c => [c.disease, c]))
  const cats = [...new Set(Object.values(payload.exposed_categories).flat())].sort()
  const scenarios = cats.map(cat => {
    const diseases = Object.entries(payload.exposed_categories).filter(([, v]) => v.includes(cat)).map(([d]) => d)
    const months = [...new Set(diseases.flatMap(d => territory.get(d)?.surge_months ?? []))].sort((a, b) => a - b)
    const periods = SURGE_RULES.years.flatMap(y => months.map(m => `${y}-${String(m).padStart(2, '0')}`)).filter(p => recorded.has(p))
    const base = periods.length ? periods.reduce((n, p) => n + (routine.get(cat)?.get(p) ?? 0), 0) / periods.length : null
    return {category: cat, diseases, surge_months: months, months_used: periods.length, mean_routine_php: base,
      extra_stock_php: Object.fromEntries(SURGE_RULES.uplifts.map(u => [String(u), base === null ? null : base * u / 100 * SURGE_RULES.coverMonths]))}
  })
  const window = [...Array(12)].map((_, i) => i + 1).filter(m => payload.weather.wet_months.includes(m)
    || [...territory.values()].some(c => !c.pandemic_flag && c.surge_months.includes(m) && c.total_cases_2021_2025 >= 5000))
  return {status: 'surge_preparedness_candidate', evidence: payload.evidence,
    source: {dataset_id: release.dataset_id, fact_version: release.fact_delta_version, payload_sha256: SURGE_BINDING.payloadSha256,
      category_mapping_sha256: CATEGORY_BINDING.mappingSha256, family_mapping_sha256: FAMILY_BINDING.mappingSha256},
    preparedness_window_months: window, surge_index_rule: payload.surge_index_rule, calendar: payload.calendar, weather: payload.weather,
    alerts: payload.alerts, alert_note: payload.alert_note, scenarios, uplifts: SURGE_RULES.uplifts, cover_months: SURGE_RULES.coverMonths,
    evidence_types: {calendar: 'observed', alerts: 'retrospective', scenarios: 'scenario_assumed_uplift'},
    interpretation: 'disease_and_weather_inform_planning_not_demand_signals', forecast_approved: false, procurement_approved: false}
}

export async function readSurgePreparedness(execute = executeDatabricksStatement) {
  const release = await readOriginalItemizedRelease(execute)
  const [family, familyHistory, category, categoryHistory, surge, surgeHistory, cells] = await Promise.all([
    execute(`SELECT mapping_sha256, payload_json FROM ${FAMILY_BINDING.table}`, {rowLimit: 2}), execute(`DESCRIBE HISTORY ${FAMILY_BINDING.table} LIMIT 1`, {rowLimit: 1}),
    execute(`SELECT mapping_sha256, payload_json FROM ${CATEGORY_BINDING.table}`, {rowLimit: 2}), execute(`DESCRIBE HISTORY ${CATEGORY_BINDING.table} LIMIT 1`, {rowLimit: 1}),
    execute(`SELECT payload_sha256, payload_json FROM ${SURGE_BINDING.table}`, {rowLimit: 2}), execute(`DESCRIBE HISTORY ${SURGE_BINDING.table} LIMIT 1`, {rowLimit: 1}),
    execute(breakdownSql(release).cells, {rowLimit: 50000}),
  ])
  if (familyHistory.rows[0]?.version !== '0' || family.rows.length !== 1 || family.rows[0].mapping_sha256 !== FAMILY_BINDING.mappingSha256) throw new Error('Family mapping table changed or missing')
  if (categoryHistory.rows[0]?.version !== '0' || category.rows.length !== 1 || category.rows[0].mapping_sha256 !== CATEGORY_BINDING.mappingSha256) throw new Error('Category mapping table changed or missing')
  if (surgeHistory.rows[0]?.version !== '0' || surge.rows.length !== 1 || surge.rows[0].payload_sha256 !== SURGE_BINDING.payloadSha256) throw new Error('Surge table changed or missing')
  return buildSurgePreparedness(release, parseFamilyMapping(String(family.rows[0].payload_json)).families,
    parseCategoryMapping(String(category.rows[0].payload_json)).categories, parseSurgePayload(String(surge.rows[0].payload_json)), cells.rows)
}
