import {executeDatabricksStatement} from './databricks'
import {readOriginalItemizedRelease, originalItemizedFactSql} from './originalItemizedSource'
import {FAMILY_BINDING, parseFamilyMapping} from './familyAbcXyz'
import type {DescriptiveRelease} from './descriptiveSource'

/**
 * Data-driven order-up-to policy for A-class product families (O4 candidate, queued re-test R6).
 * Same rules as outputs/o4_prescriptive_policy_20261113/run.py: demand = six-month mean; target from prior-year XYZ class;
 * safety stock = target quantile of the family's last 24 known lead-time errors. Pesos at sales value, not purchase
 * quantities. Lead time is a researcher assumption (A3); no cost assumption is used here.
 */
export const POLICY = {
  start: '2020-01',
  targets: {X: 0.95, Y: 0.95, Z: 0.9} as Record<string, number>,
  leadDays: [7, 14, 30] as const,
  defaultLeadDays: 14,
  minErrors: 12,
  errorWindow: 24,
} as const

type Mapping = ReturnType<typeof parseFamilyMapping>
type Case = {o: number; xyz: string; q: number; d: number; s: number; a: number}

export function policySalesSql(release: DescriptiveRelease) {
  return `SELECT normalized_product, DATE_FORMAT(date_delivered, 'yyyy-MM') AS period, CAST(SUM(net_sales) AS STRING) AS net_php
    FROM ${originalItemizedFactSql(release, 'itemized')} WHERE is_net_sales_eligible AND date_delivered >= DATE'${POLICY.start}-01'
    GROUP BY normalized_product, DATE_FORMAT(date_delivered, 'yyyy-MM')`
}

/** numpy's default (linear) quantile, so results match the offline study. */
export function quantile(values: number[], q: number) {
  const s = [...values].sort((a, b) => a - b), h = (s.length - 1) * q, lo = Math.floor(h)
  return lo + 1 < s.length ? s[lo] + (h - lo) * (s[lo + 1] - s[lo]) : s[lo]
}

const monthIndex = (p: string) => Number(p.slice(0, 4)) * 12 + Number(p.slice(5, 7)) - 1

export function buildPrescriptivePolicy(mapping: Mapping, rows: Array<Record<string, string | null>>, leadDays: number = POLICY.defaultLeadDays) {
  if (!(POLICY.leadDays as readonly number[]).includes(leadDays)) throw new Error('Unsupported lead time')
  const periods = [...new Set(rows.map(r => String(r.period)))].sort()
  if (!periods.length || periods[0] !== POLICY.start || periods.some(p => !/^\d{4}-\d{2}$/.test(p))) throw new Error('Family history must start in ' + POLICY.start)
  if (periods.some((p, i) => i && monthIndex(p) - monthIndex(periods[i - 1]) !== 1)) throw new Error('Family history has a missing month')
  const N = periods.length, ix = new Map(periods.map((p, i) => [p, i]))
  if (N < 36) throw new Error('Not enough history for the policy')
  const fam = new Map<string, number[]>()
  for (const r of rows) {
    const label = r.normalized_product, net = Number(r.net_php)
    if (!label || !Number.isFinite(net)) throw new Error('Invalid family sales row')
    const family = mapping.families[label]
    if (!family) throw new Error('Gold label missing from family mapping')
    const y = fam.get(family) ?? Array(N).fill(0); y[ix.get(String(r.period))!] += net; fam.set(family, y)
  }
  const P = 1 + leadDays / 30
  const mean6 = (y: number[], o: number) => (y[o - 5] + y[o - 4] + y[o - 3] + y[o - 2] + y[o - 1] + y[o]) / 6
  const ltd = (y: number[], o: number) => y[o + 1] + (P - 1) * y[o + 2]
  const classCache = new Map<number, Map<string, string>>()
  const classes = (year: number) => {
    if (classCache.has(year)) return classCache.get(year)!
    const cols = periods.map((p, i) => p.startsWith(String(year)) ? i : -1).filter(i => i >= 0)
    if (cols.length !== 12) throw new Error(`Calendar year ${year} is incomplete`)
    const val = [...fam].map(([k, y]) => ({k, y, v: cols.reduce((n, i) => n + y[i], 0)})).filter(f => f.v > 0)
      .sort((a, b) => b.v - a.v || (a.k < b.k ? 1 : -1))
    const tot = val.reduce((n, f) => n + f.v, 0), out = new Map<string, string>()
    let run = 0
    for (const {k, y, v} of val) {
      if (run < 0.8 * tot) {
        const m = v / 12, cv = Math.sqrt(cols.reduce((n, i) => n + (y[i] - m) ** 2, 0) / 12) / m
        out.set(k, cv <= 0.5 ? 'X' : cv <= 1 ? 'Y' : 'Z')
      }
      run += v
    }
    classCache.set(year, out); return out
  }
  const errorsAt = (y: number[], o: number) => {
    const e: number[] = []
    for (let s = 5; s <= o - 2; s++) e.push(ltd(y, s) - P * mean6(y, s))
    return e.slice(-POLICY.errorWindow)
  }

  // Backtest: every origin whose next lead-time demand is already observed.
  const cases: Case[] = []
  for (let o = 23; o <= N - 3; o++) {
    for (const [k, xyz] of classes(Number(periods[o].slice(0, 4)) - 1)) {
      const y = fam.get(k)!, e = errorsAt(y, o)
      if (e.length < POLICY.minErrors) continue
      const q = POLICY.targets[xyz], d = mean6(y, o)
      cases.push({o, xyz, q, d, s: P * d + quantile(e, q), a: ltd(y, o)})
    }
  }
  if (!cases.length) throw new Error('No backtest cases')
  const summarize = (cs: Case[]) => {
    const demand = cs.reduce((n, c) => n + Math.max(c.a, 0), 0), short = cs.reduce((n, c) => n + Math.max(c.a - c.s, 0), 0)
    return {family_months: cs.length, cycle_service: cs.filter(c => c.a <= c.s).length / cs.length, fill_rate: demand > 0 ? 1 - short / demand : null}
  }
  const policyService = cases.filter(c => c.a <= c.s).length / cases.length, policyStock = cases.reduce((n, c) => n + c.s, 0)
  let uniform: {months_of_cover: number; stock_saving: number} | null = null
  for (let k = 50; k <= 2400; k++) {
    const m = k / 100
    if (cases.filter(c => c.a <= m * c.d).length / cases.length >= policyService) {
      uniform = {months_of_cover: m, stock_saving: 1 - policyStock / cases.reduce((n, c) => n + m * c.d, 0)}; break
    }
  }

  // Current prescription at the latest month, using the last complete calendar year for classes.
  const o = N - 1, year = Number(periods[o].slice(0, 4)) - 1
  const families = [...classes(year)].flatMap(([family, xyz]) => {
    const y = fam.get(family)!, e = errorsAt(y, o), d = mean6(y, o)
    if (e.length < POLICY.minErrors || d <= 0) return []
    const q = POLICY.targets[xyz], safety = Math.max(quantile(e, q), 0)
    return [{family, xyz_class: xyz, service_target: q, monthly_demand_php: d, safety_stock_php: safety,
      order_up_to_php: P * d + safety, months_of_cover: (P * d + safety) / d, errors_used: e.length}]
  }).sort((a, b) => b.monthly_demand_php - a.monthly_demand_php || a.family.localeCompare(b.family))
  const sum = (key: 'monthly_demand_php' | 'safety_stock_php' | 'order_up_to_php') => families.reduce((n, f) => n + f[key], 0)

  return {
    status: 'prescriptive_policy_candidate', origin_period: periods[o], class_year: year, lead_days: leadDays, protection_months: P,
    service_targets: POLICY.targets,
    mapping: {table: FAMILY_BINDING.table, sha256: FAMILY_BINDING.mappingSha256, review_status: mapping.status},
    families,
    totals: {families: families.length, monthly_demand_php: sum('monthly_demand_php'), safety_stock_php: sum('safety_stock_php'), order_up_to_php: sum('order_up_to_php')},
    backtest: {
      first_origin: periods[23], last_origin: periods[N - 3], ...summarize(cases),
      pooled_target: cases.reduce((n, c) => n + c.q, 0) / cases.length,
      by_class: Object.fromEntries(['X', 'Y', 'Z'].map(x => [x, summarize(cases.filter(c => c.xyz === x))]).filter(([, v]) => (v as {family_months: number}).family_months > 0)),
      uniform_rule: uniform,
      evidence: 'retrospective_exploratory_queued_as_R6',
    },
    assumptions: {lead_days: 'researcher_assumption_A3', service_targets: 'stated_policy_choice'},
    units: 'php_sales_value_not_purchase_quantities',
    procurement_approved: false,
  }
}

export async function readPrescriptivePolicy(leadDays: number = POLICY.defaultLeadDays, execute = executeDatabricksStatement) {
  const release = await readOriginalItemizedRelease(execute)
  const [saved, history, sales] = await Promise.all([
    execute(`SELECT mapping_sha256, payload_json FROM ${FAMILY_BINDING.table}`, {rowLimit: 2}),
    execute(`DESCRIBE HISTORY ${FAMILY_BINDING.table} LIMIT 1`, {rowLimit: 1}),
    execute(policySalesSql(release), {rowLimit: 50000}),
  ])
  if (history.rows[0]?.version !== '0' || saved.rows.length !== 1 || saved.rows[0].mapping_sha256 !== FAMILY_BINDING.mappingSha256) throw new Error('Family mapping table changed or missing')
  return buildPrescriptivePolicy(parseFamilyMapping(String(saved.rows[0].payload_json)), sales.rows, leadDays)
}
