import {createHash} from 'node:crypto'
import {executeDatabricksStatement} from './databricks'
import {readOriginalItemizedRelease} from './originalItemizedSource'
import {FAMILY_BINDING, parseFamilyMapping} from './familyAbcXyz'
import {breakdownSql, parseCells} from './diagnosticBreakdowns'
import type {DescriptiveRelease} from './descriptiveSource'

/**
 * Demand profile per product group (outputs/demand_profile_20261115). Therapeutic categories come from candidate
 * mapping v0.1 (AI-inferred, not verified), saved once as a hash-pinned one-row table. The registered check found the
 * planning classes forecastable in the expected order but NOT stable between periods, so the classes are a
 * description of recent behaviour, not a validated planning rule.
 */
export const CATEGORY_BINDING = {
  table: 'workspace.medshield_warehouse.reference_therapeutic_category_410dd95259ffd612_candidate',
  mappingSha256: '410dd95259ffd612f906dc6ca4a5d2ddef73f5dd367e4e5486595b13a1c2615f',
} as const
export const PROFILE_RULES = {windowMonths: 24, largeShare: 0.5, mixedShare: 0.25, cvSteady: 0.5, cvUneven: 1.0, minActiveMonths: 12, minNetPhp: 1_000_000, stabilityPass: 0.6,
  registered: {evidence: 'outputs/demand_profile_20261115', forecast_order_passed: true, stability_pct: 53.8, stability_rule_pct: 60, usable_planning_guide: false,
    seasonal_categories: '0 of 19', disease_links: '0 of 64', tests: 'outputs/category_disease_test_20261115'}} as const
const PLAN = {LARGE_ORDER: 'Plan for readiness; do not forecast', ERRATIC: 'Order on demand', UNEVEN: 'Reorder with a larger buffer', STEADY: 'Reorder from the 6-month average'} as const
type PlanClass = keyof typeof PLAN
type Row = Record<string, string | null>

export function parseCategoryMapping(raw: string) {
  if (createHash('sha256').update(raw).digest('hex') !== CATEGORY_BINDING.mappingSha256) throw new Error('Category mapping hash mismatch')
  const payload = JSON.parse(raw)
  if (payload.schema_version !== 'therapeutic_category_mapping_v0_1' || payload.forecast_approved !== false || typeof payload.categories !== 'object') throw new Error('Unexpected category mapping')
  return payload as {categories: Record<string, string>; status: string; scope: string}
}
const idx = (p: string) => Number(p.slice(0, 4)) * 12 + Number(p.slice(5, 7)) - 1
const period = (i: number) => `${Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}`
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2 }

export function buildDemandProfile(release: DescriptiveRelease, families: Record<string, string>, mapping: ReturnType<typeof parseCategoryMapping>, cellRows: Row[]) {
  const cells = parseCells(cellRows, families), R = PROFILE_RULES, W = R.windowMonths
  const recorded = new Set(cells.map(c => c.period)), end = idx([...recorded].sort().at(-1)!)
  const span = (from: number, to: number) => Array.from({length: to - from + 1}, (_, k) => period(from + k))
  const CURRENT = span(end - W + 1, end), EARLIER = span(end - 2 * W + 1, end - W), HISTORY = span(end - 2 * W - 5, end)
  if (!HISTORY.every(p => recorded.has(p))) throw new Error('Demand profile needs 54 recorded months without gaps')
  const rout = new Map<string, Map<string, number>>(), large = new Map<string, Map<string, number>>(), allTime = new Map<string, number>()
  const famMonth = new Map<string, Map<string, number>>(), famCat = new Map<string, string>()
  const add = (m: Map<string, Map<string, number>>, k: string, p: string, v: number) => { const s = m.get(k) ?? new Map<string, number>(); s.set(p, (s.get(p) ?? 0) + v); m.set(k, s) }
  let total = 0
  for (const c of cells) {
    const cat = mapping.categories[c.family] ?? 'NOT_CLASSIFIED'
    total += c.net; allTime.set(cat, (allTime.get(cat) ?? 0) + c.net); famCat.set(c.family, cat); add(famMonth, c.family, c.period, c.net); add(c.large ? large : rout, cat, c.period, c.net)
  }
  const firstSale = new Map<string, string>()
  for (const [f, s] of famMonth) { const pos = [...s].filter(([, v]) => v > 0).map(([p]) => p).sort(); if (pos.length) firstSale.set(f, pos[0]) }
  const measures = (cat: string, win: string[]) => {
    const r = win.map(p => rout.get(cat)?.get(p) ?? 0), lg = win.reduce((n, p) => n + (large.get(cat)?.get(p) ?? 0), 0), routine = r.reduce((a, b) => a + b, 0), net = routine + lg
    const mean = routine / r.length, cv = mean > 0 ? Math.sqrt(r.reduce((n, v) => n + (v - mean) ** 2, 0) / r.length) / mean : null
    return {net, largeShare: net > 0 ? lg / net : null, cv, active: r.filter(v => v > 0).length}
  }
  const classify = (m: ReturnType<typeof measures>): PlanClass => m.largeShare !== null && m.largeShare >= R.largeShare ? 'LARGE_ORDER'
    : m.cv === null || m.cv > R.cvUneven || m.active < R.minActiveMonths ? 'ERRATIC' : m.cv > R.cvSteady ? 'UNEVEN' : 'STEADY'
  const wape = (cat: string, targets: string[]) => { let err = 0, act = 0; const s = rout.get(cat) ?? new Map<string, number>()
    for (const t of targets) { const i = HISTORY.indexOf(t), fc = HISTORY.slice(i - 6, i).reduce((n, p) => n + (s.get(p) ?? 0), 0) / 6, a = s.get(t) ?? 0; err += Math.abs(fc - a); act += Math.abs(a) }
    return act > 0 ? 100 * err / act : null }
  const last12 = CURRENT.slice(12)
  const profile = [...allTime].sort((a, b) => b[1] - a[1]).flatMap(([cat, all]) => {
    const cur = measures(cat, CURRENT); if (cur.net < R.minNetPhp) return []
    const cls = classify(cur), fams = [...famCat].filter(([, c]) => c === cat).map(([f]) => f)
    const l12 = fams.reduce((n, f) => n + last12.reduce((k, p) => k + (famMonth.get(f)!.get(p) ?? 0), 0), 0)
    const new12 = fams.filter(f => (firstSale.get(f) ?? '0') >= CURRENT[0]).reduce((n, f) => n + last12.reduce((k, p) => k + (famMonth.get(f)!.get(p) ?? 0), 0), 0)
    return [{category: cat, share_all_sales_pct: 100 * all / total, current_net_php: cur.net, large_share_pct: 100 * cur.largeShare!, routine_cv: cur.cv, active_months: cur.active,
      planning_class: cls, mixed: cls !== 'LARGE_ORDER' && cur.largeShare! >= R.mixedShare, plan: PLAN[cls], new_product_share_pct: l12 > 0 ? 100 * new12 / l12 : null,
      routine_wape_current_pct: wape(cat, CURRENT)}]
  })
  const detail = [...allTime.keys()].filter(c => c !== 'NOT_CLASSIFIED').flatMap(cat => {
    const e = measures(cat, EARLIER), cur = measures(cat, CURRENT); if (e.net < R.minNetPhp || cur.net < R.minNetPhp) return []
    return [{category: cat, class_earlier: classify(e), class_current: classify(cur), routine_wape_current_pct: wape(cat, CURRENT)}]
  }).sort((a, b) => a.category.localeCompare(b.category))
  const med = (k: PlanClass) => { const v = detail.filter(x => x.class_earlier === k && x.routine_wape_current_pct !== null).map(x => x.routine_wape_current_pct!); return {categories: v.length, median_wape_pct: v.length ? median(v) : null} }
  const byClass = {STEADY: med('STEADY'), UNEVEN: med('UNEVEN'), ERRATIC: med('ERRATIC'), LARGE_ORDER: med('LARGE_ORDER')}
  const order = (['STEADY', 'UNEVEN', 'ERRATIC'] as const).filter(k => byClass[k].categories >= 2).map(k => byClass[k].median_wape_pct!)
  const c1 = order.length < 2 ? null : order.every((v, i) => i === 0 || order[i - 1] < v)
  const same = detail.filter(x => x.class_earlier === x.class_current).length, c2 = detail.length > 0 && same / detail.length >= R.stabilityPass
  const classNet = new Map<PlanClass, number>(); for (const p of profile) classNet.set(p.planning_class, (classNet.get(p.planning_class) ?? 0) + p.current_net_php)
  const classTotal = [...classNet.values()].reduce((a, b) => a + b, 0)
  return {status: 'demand_profile_description_only', source: {dataset_id: release.dataset_id, fact_version: release.fact_delta_version, family_mapping_sha256: FAMILY_BINDING.mappingSha256,
      category_mapping_sha256: CATEGORY_BINDING.mappingSha256, category_mapping_status: mapping.status, category_mapping_scope: mapping.scope, total_php: total},
    windows: {current: [CURRENT[0], CURRENT.at(-1)!], earlier: [EARLIER[0], EARLIER.at(-1)!]}, profile,
    current_sales_by_class_pct: Object.fromEntries([...classNet].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, 100 * v / classTotal])),
    check: {categories: detail.length, by_earlier_class: byClass, forecast_order_holds: c1, same_class: same, stability_pct: detail.length ? 100 * same / detail.length : null,
      stable_enough: c2, usable_planning_guide: c1 === true && c2, detail},
    registered: R.registered, interpretation: 'classes_describe_recent_behaviour_not_a_validated_planning_rule', forecast_approved: false, procurement_approved: false}
}

export async function readDemandProfile(execute = executeDatabricksStatement) {
  const release = await readOriginalItemizedRelease(execute)
  const [family, familyHistory, category, categoryHistory, cells] = await Promise.all([
    execute(`SELECT mapping_sha256, payload_json FROM ${FAMILY_BINDING.table}`, {rowLimit: 2}), execute(`DESCRIBE HISTORY ${FAMILY_BINDING.table} LIMIT 1`, {rowLimit: 1}),
    execute(`SELECT mapping_sha256, payload_json FROM ${CATEGORY_BINDING.table}`, {rowLimit: 2}), execute(`DESCRIBE HISTORY ${CATEGORY_BINDING.table} LIMIT 1`, {rowLimit: 1}),
    execute(breakdownSql(release).cells, {rowLimit: 50000}),
  ])
  if (familyHistory.rows[0]?.version !== '0' || family.rows.length !== 1 || family.rows[0].mapping_sha256 !== FAMILY_BINDING.mappingSha256) throw new Error('Family mapping table changed or missing')
  if (categoryHistory.rows[0]?.version !== '0' || category.rows.length !== 1 || category.rows[0].mapping_sha256 !== CATEGORY_BINDING.mappingSha256) throw new Error('Category mapping table changed or missing')
  return buildDemandProfile(release, parseFamilyMapping(String(family.rows[0].payload_json)).families, parseCategoryMapping(String(category.rows[0].payload_json)), cells.rows)
}
