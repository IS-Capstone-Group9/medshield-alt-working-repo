import {createHash} from 'node:crypto'
import {executeDatabricksStatement} from './databricks'
import {readOriginalItemizedRelease, originalItemizedFactSql} from './originalItemizedSource'
import {FAMILY_BINDING, parseFamilyMapping} from './familyAbcXyz'
import {LARGE_DOCUMENT_PHP} from './salesStreams'
import type {DescriptiveRelease} from './descriptiveSource'

/**
 * Validated offline diagnostics (15 Nov 2026) served live from Gold. Each block repeats the registered rules of its
 * study so the dashboard and the paper agree:
 *   outputs/diagnostic_breakdowns_20261115  margin mix/rate and sales-change bridge (exact identities)
 *   outputs/unusual_months_20261115         robust z >= 3 against the previous 12 recorded months
 *   outputs/product_survival_20261115       new-family survival and the 3-of-first-6-months signal
 *   outputs/large_order_profile_20261115    large-order frequency, size, readiness chance and range
 *   outputs/readiness_sizing_20261115       readiness trade-off table (selected rule failed; no default amount)
 *   outputs/accuracy_round2_20261111        day-20 current-month estimate (w = 0.75)
 * Retrospective descriptions; nothing here is a forecast approval or a procurement basis.
 */
export const BREAKDOWN_RULES = {
  marginYears: [2019, 2025] as const, unusualZ: 3, unusualWindow: 12, unusualMinHistory: 6,
  survivalFirst: '2020-01', survivalLast: '2025-12', testStart: '2020-01', originStart: '2021-01', holdoutStart: '2024-01',
  day20: {day: 20, weight: 0.75, shareWindow: 24},
  calendarTimingRegistered: {p_value: 0.134, rule: 'p < 0.05', supported: false, evidence: 'outputs/large_order_profile_20261115'},
} as const

type Row = Record<string, string | null>
const num = (v: string | null | undefined) => { const n = Number(v); if (v === null || v === undefined || !Number.isFinite(n)) throw new Error('Invalid number'); return n }
const optNum = (v: string | null | undefined) => v === null || v === undefined ? null : num(v)
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2 }
/** Python round(): half to even, so quantile indices match the offline scripts. */
const pyRound = (x: number) => { const f = Math.floor(x), d = x - f; return d > .5 ? f + 1 : d < .5 ? f : f % 2 === 0 ? f : f + 1 }
const quantile = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, pyRound(p * (s.length - 1))))] }
const cents = (v: number) => Math.round(v * 100)
const monthIndex = (p: string) => Number(p.slice(0, 4)) * 12 + Number(p.slice(5, 7)) - 1
const periodOf = (i: number) => `${Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}`

export function breakdownSql(release: DescriptiveRelease) {
  const fact = originalItemizedFactSql(release, 'itemized')
  const base = `SELECT DATE_FORMAT(month_start,'yyyy-MM') AS period, DAY(date_delivered) AS dom, dr_number, normalized_product, net_sales,
      CASE WHEN is_gross_margin_eligible AND gross_margin_amount IS NOT NULL THEN net_sales END AS gm_net,
      CASE WHEN is_gross_margin_eligible AND gross_margin_amount IS NOT NULL THEN gross_margin_amount END AS gm
    FROM ${fact} WHERE is_net_sales_eligible`
  const docs = `SELECT period, dr_number, SUM(net_sales) AS net FROM f WHERE dr_number IS NOT NULL GROUP BY period, dr_number`
  return {
    // One row per month x product label x large flag. Rows without a DR are routine, as in the sales-stream split.
    cells: `WITH f AS (${base}), d AS (${docs})
      SELECT f.period, f.normalized_product, CASE WHEN d.net >= ${LARGE_DOCUMENT_PHP} THEN '1' ELSE '0' END AS large,
        CAST(SUM(f.net_sales) AS STRING) AS net_php, CAST(SUM(f.gm_net) AS STRING) AS gm_net_php, CAST(SUM(f.gm) AS STRING) AS gm_php
      FROM f LEFT JOIN d ON f.period = d.period AND f.dr_number = d.dr_number GROUP BY 1, 2, 3`,
    largeDocuments: `WITH f AS (${base}), d AS (${docs}) SELECT period, CAST(net AS STRING) AS net_php FROM d WHERE net >= ${LARGE_DOCUMENT_PHP} ORDER BY period, net`,
    days: `WITH f AS (${base}) SELECT period, CAST(SUM(CASE WHEN dom <= ${BREAKDOWN_RULES.day20.day} THEN net_sales ELSE 0 END) AS STRING) AS mtd_php,
      CAST(SUM(net_sales) AS STRING) AS total_php FROM f GROUP BY period ORDER BY period`,
  }
}

type Cell = {period: string; year: number; month: number; family: string; large: boolean; net: number; gmNet: number | null; gm: number | null}

export function parseCells(rows: Row[], families: Record<string, string>): Cell[] {
  return rows.map(row => {
    const period = String(row.period), label = row.normalized_product
    if (!/^\d{4}-\d{2}$/.test(period) || !label || !['0', '1'].includes(String(row.large))) throw new Error('Invalid diagnostic row')
    const family = families[label]
    if (!family) throw new Error('Gold label missing from family mapping')
    return {period, year: Number(period.slice(0, 4)), month: Number(period.slice(5, 7)), family, large: row.large === '1',
      net: num(row.net_php), gmNet: optNum(row.gm_net_php), gm: optNum(row.gm_php)}
  })
}

// ---------- margin mix / rate (exact identity)
function segTable(cells: Cell[], year: number) {
  const t = new Map<string, [number, number]>()
  for (const c of cells) if (c.year === year && c.gmNet !== null && c.gm !== null) { const v = t.get(c.family) ?? [0, 0]; v[0] += c.gmNet; v[1] += c.gm; t.set(c.family, v) }
  const rev = [...t.values()].reduce((n, v) => n + v[0], 0), out = new Map<string, {w: number; m: number}>()
  for (const [k, [net, gm]] of t) if (net > 0) out.set(k, {w: net / rev, m: gm / net})
  return out
}
export function decomposeMargin(cells: Cell[], y0: number, y1: number, top = 6) {
  const a = segTable(cells, y0), b = segTable(cells, y1)
  const m0 = [...a.values()].reduce((n, s) => n + s.w * s.m, 0), m1 = [...b.values()].reduce((n, s) => n + s.w * s.m, 0)
  let mix = 0, rate = 0; const per: {family: string; share0: number; share1: number; margin0: number; margin1: number; mix: number; rate: number}[] = []
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    const s0 = a.get(k), s1 = b.get(k), w0 = s0?.w ?? 0, w1 = s1?.w ?? 0
    const r0 = s0?.m ?? s1!.m, r1 = s1?.m ?? r0
    const mx = (w1 - w0) * (r0 + r1) / 2, rt = (r1 - r0) * (w0 + w1) / 2
    mix += mx; rate += rt; per.push({family: k, share0: w0, share1: w1, margin0: r0, margin1: r1, mix: mx, rate: rt})
  }
  if (Math.abs((m1 - m0) - (mix + rate)) > 1e-9) throw new Error('Margin decomposition does not add up')
  return {from: y0, to: y1, margin0_pct: 100 * m0, margin1_pct: 100 * m1, change_pts: 100 * (m1 - m0), mix_pts: 100 * mix, rate_pts: 100 * rate,
    biggest_drags: per.sort((p, q) => (p.mix + p.rate) - (q.mix + q.rate)).slice(0, top).map(p => ({...p, share0: 100 * p.share0, share1: 100 * p.share1,
      margin0: 100 * p.margin0, margin1: 100 * p.margin1, mix: 100 * p.mix, rate: 100 * p.rate}))}
}

// ---------- sales-change bridge (matched months only)
export function salesBridge(cells: Cell[]) {
  const recorded = new Map<number, Set<number>>()
  for (const c of cells) recorded.set(c.year, (recorded.get(c.year) ?? new Set()).add(c.month))
  const years = [...recorded.keys()].sort()
  return years.slice(1).map((y1, i) => {
    const y0 = years[i], months = new Set([...recorded.get(y0)!].filter(m => recorded.get(y1)!.has(m)))
    const agg = (y: number) => { let large = 0; const fam = new Map<string, number>()
      for (const c of cells) if (c.year === y && months.has(c.month)) { if (c.large) large += c.net; else fam.set(c.family, (fam.get(c.family) ?? 0) + c.net) }
      return {large, fam} }
    const A = agg(y0), B = agg(y1)
    const act0 = new Set([...A.fam].filter(([, v]) => v > 0).map(([k]) => k)), act1 = new Set([...B.fam].filter(([, v]) => v > 0).map(([k]) => k))
    const continuing = [...act0].filter(k => act1.has(k)).reduce((n, k) => n + B.fam.get(k)! - A.fam.get(k)!, 0)
    const added = [...act1].filter(k => !act0.has(k)).reduce((n, k) => n + B.fam.get(k)!, 0)
    const lost = -[...act0].filter(k => !act1.has(k)).reduce((n, k) => n + A.fam.get(k)!, 0)
    const sum = (m: Map<string, number>) => [...m.values()].reduce((n, v) => n + v, 0)
    const net0 = A.large + sum(A.fam), net1 = B.large + sum(B.fam)
    const adjustments = (sum(B.fam) - sum(A.fam)) - (continuing + added + lost)
    if (Math.abs((net1 - net0) - (B.large - A.large + continuing + added + lost + adjustments)) > 1e-4) throw new Error('Bridge does not add up')
    return {from: y0, to: y1, matched_months: months.size, net0_php: net0, net1_php: net1, change_php: net1 - net0, large_orders_php: B.large - A.large,
      continuing_families_php: continuing, new_families_php: added, lost_families_php: lost, non_positive_adjustments_php: adjustments}
  })
}

// ---------- unusual months
export function unusualMonths(cells: Cell[]) {
  const months = [...new Set(cells.map(c => c.period))].sort()
  const total = new Map<string, number>(), large = new Map<string, number>(), fam = new Map<string, Map<string, number>>()
  for (const c of cells) {
    total.set(c.period, (total.get(c.period) ?? 0) + c.net)
    if (c.large) large.set(c.period, (large.get(c.period) ?? 0) + c.net)
    else { const f = fam.get(c.period) ?? new Map(); f.set(c.family, (f.get(c.family) ?? 0) + c.net); fam.set(c.period, f) }
  }
  const routine = new Map(months.map(p => [p, total.get(p)! - (large.get(p) ?? 0)]))
  const W = BREAKDOWN_RULES.unusualWindow
  const score = (s: Map<string, number>, i: number) => {
    const baseVals = months.slice(Math.max(0, i - W), i).map(p => s.get(p) ?? 0)
    if (baseVals.length < BREAKDOWN_RULES.unusualMinHistory) return null
    const med = median(baseVals), mad = median(baseVals.map(v => Math.abs(v - med)))
    return mad === 0 ? null : {z: ((s.get(months[i]) ?? 0) - med) / (1.4826 * mad), med}
  }
  const cause = (i: number, dev: number) => {
    const prior = months.slice(Math.max(0, i - W), i), now = fam.get(months[i]) ?? new Map<string, number>()
    const names = new Set([...now.keys(), ...prior.flatMap(p => [...(fam.get(p)?.keys() ?? [])])])
    const sign = dev >= 0 ? 1 : -1; let newPart = 0; const moves: {family: string; deviation: number; new: boolean}[] = []
    for (const f of names) {
      const hist = prior.map(p => fam.get(p)?.get(f) ?? 0), value = now.get(f) ?? 0, d = value - median(hist)
      const isNew = hist.every(h => h === 0) && value !== 0
      if (d * sign > 0) { moves.push({family: f, deviation: d, new: isNew}); if (isNew) newPart += d }
    }
    const top = moves.sort((p, q) => Math.abs(q.deviation) - Math.abs(p.deviation)).slice(0, 3)
    const label = dev && newPart / dev >= .5 ? 'NEW PRODUCTS' : dev && top.length && top[0].deviation / dev >= .5 ? 'ONE PRODUCT' : 'BROAD'
    return {label, new_families_php: newPart, top_families: top}
  }
  const scan = (s: Map<string, number>, withLarge: boolean) => months.flatMap((p, i) => {
    const r = score(s, i); if (!r || Math.abs(r.z) < BREAKDOWN_RULES.unusualZ) return []
    const dev = s.get(p)! - r.med; let rdev = dev, extra = {}
    let ldev = 0
    if (withLarge) {
      ldev = (large.get(p) ?? 0) - median(months.slice(Math.max(0, i - W), i).map(q => large.get(q) ?? 0)); rdev = dev - ldev
      extra = {large_order_deviation_php: ldev, routine_deviation_php: rdev}
    }
    const c = cause(i, rdev)
    return [{period: p, flag: r.z > 0 ? 'HIGH' : 'LOW', z: r.z, value_php: s.get(p)!, usual_php: r.med, deviation_php: dev, ...extra,
      cause: withLarge && dev && ldev / dev >= .5 ? 'LARGE ORDERS' : c.label, new_families_php: c.new_families_php, top_families: c.top_families}]
  })
  const scored = months.filter((_, i) => score(total, i) !== null).length
  return {months_recorded: months.length, months_scored: scored, total: scan(total, true), routine: scan(routine, false)}
}

// ---------- product survival
export function productSurvival(cells: Cell[]) {
  const end = monthIndex([...new Set(cells.map(c => c.period))].sort().at(-1)!)
  const byFam = new Map<string, Map<number, number>>(), largeByFam = new Map<string, Map<number, number>>()
  for (const c of cells) {
    const i = monthIndex(c.period), m = byFam.get(c.family) ?? new Map(); m.set(i, (m.get(i) ?? 0) + c.net); byFam.set(c.family, m)
    if (c.large) { const l = largeByFam.get(c.family) ?? new Map(); l.set(i, (l.get(i) ?? 0) + c.net); largeByFam.set(c.family, l) }
  }
  const lo = monthIndex(BREAKDOWN_RULES.survivalFirst), hi = monthIndex(BREAKDOWN_RULES.survivalLast)
  const fams = [...byFam].flatMap(([family, s]) => {
    const pos = [...s].filter(([, v]) => v > 0).map(([k]) => k).sort((a, b) => a - b)
    if (!pos.length || pos[0] < lo || pos[0] > hi) return []
    const first = pos[0], win = (a: number, b: number) => { let n = 0; for (let k = first + a; k < first + b; k++) n += s.get(k) ?? 0; return n }
    const active = (a: number, b: number) => { for (let k = first + a; k < first + b; k++) if ((s.get(k) ?? 0) > 0) return true; return false }
    const y1 = win(0, 12); let y1Large = 0; for (let k = first; k < first + 12; k++) y1Large += largeByFam.get(family)?.get(k) ?? 0
    let monthsY1 = 0, early = 0; for (let k = first; k < first + 12; k++) if ((s.get(k) ?? 0) > 0) { monthsY1++; if (k < first + 6) early++ }
    return [{cohort: Math.floor(first / 12), y1, y2: win(12, 24), y3: win(24, 36), alive2: active(12, 24), alive3: active(24, 36),
      y2Known: first + 23 <= end, y3Known: first + 35 <= end, monthsY1, early: early >= 3, largeStart: y1 > 0 && y1Large / y1 > .5}]
  })
  type F = typeof fams[number]
  const summary = (g: F[]) => {
    const g2 = g.filter(f => f.y2Known), g3 = g.filter(f => f.y3Known), y1n2 = g2.reduce((n, f) => n + f.y1, 0), y1n3 = g3.reduce((n, f) => n + f.y1, 0)
    return {families: g.length, first_year_php: g.reduce((n, f) => n + f.y1, 0), year2_known: g2.length,
      survival_y2_pct: g2.length ? 100 * g2.filter(f => f.alive2).length / g2.length : null,
      value_retention_y2_pct: y1n2 ? 100 * g2.reduce((n, f) => n + f.y2, 0) / y1n2 : null,
      one_month_pct: g2.length ? 100 * g2.filter(f => f.monthsY1 === 1 && !f.alive2).length / g2.length : null,
      year3_known: g3.length, survival_y3_pct: g3.length ? 100 * g3.filter(f => f.alive3).length / g3.length : null,
      value_retention_y3_pct: y1n3 ? 100 * g3.reduce((n, f) => n + f.y3, 0) / y1n3 : null}
  }
  const cohorts = [...new Set(fams.map(f => f.cohort))].sort()
  const split = (key: 'early' | 'largeStart') => {
    const per = cohorts.flatMap(c => {
      const a = fams.filter(f => f.cohort === c && f.y2Known && f[key]), b = fams.filter(f => f.cohort === c && f.y2Known && !f[key])
      if (!a.length || !b.length) return []
      return [{cohort: c, yes_n: a.length, yes_survival_y2_pct: 100 * a.filter(f => f.alive2).length / a.length,
        no_n: b.length, no_survival_y2_pct: 100 * b.filter(f => f.alive2).length / b.length}]
    })
    const qualifying = per.filter(p => p.yes_n >= 20 && p.no_n >= 20), dirs = qualifying.map(p => p.yes_survival_y2_pct > p.no_survival_y2_pct)
    return {by_cohort: per, qualifying_cohorts: dirs.length, consistent: dirs.length > 0 && (dirs.every(Boolean) || !dirs.some(Boolean)),
      yes: summary(fams.filter(f => f[key])), no: summary(fams.filter(f => !f[key]))}
  }
  return {by_cohort: cohorts.map(c => ({cohort: c, ...summary(fams.filter(f => f.cohort === c))})), all: summary(fams),
    early_repeat_signal: split('early'), large_order_start: split('largeStart')}
}

// ---------- large orders and readiness
export function largeOrderReadiness(cells: Cell[], documents: Row[]) {
  const months = [...new Set(cells.map(c => c.period))].sort()
  const totalBy = new Map<string, number>(); for (const c of cells) totalBy.set(c.period, (totalBy.get(c.period) ?? 0) + c.net)
  const L = new Map(months.map(p => [p, 0])), N = new Map(months.map(p => [p, 0])), sizes: {period: string; net: number}[] = []
  for (const d of documents) { const p = String(d.period), v = num(d.net_php); if (!L.has(p)) throw new Error('Large document outside recorded months'); L.set(p, L.get(p)! + v); N.set(p, N.get(p)! + 1); sizes.push({period: p, net: v}) }
  const largeFromCells = new Map<string, number>(); for (const c of cells) if (c.large) largeFromCells.set(c.period, (largeFromCells.get(c.period) ?? 0) + c.net)
  for (const p of months) if (cents(L.get(p)!) !== cents(largeFromCells.get(p) ?? 0)) throw new Error('Large documents do not reconcile')
  const years = [...new Set(months.map(p => Number(p.slice(0, 4))))].sort()
  const byYear = years.map(y => { const ms = months.filter(p => p.startsWith(String(y))), large = ms.reduce((n, p) => n + L.get(p)!, 0)
    return {year: y, months_recorded: ms.length, months_with_large: ms.filter(p => N.get(p)! > 0).length, documents: ms.reduce((n, p) => n + N.get(p)!, 0),
      large_php: large, share_pct: 100 * large / ms.reduce((n, p) => n + totalBy.get(p)!, 0)} })
  const start = monthIndex(BREAKDOWN_RULES.testStart), last = monthIndex(months.at(-1)!)
  const test = Array.from({length: last - start + 1}, (_, k) => periodOf(start + k))
  if (!test.every(p => L.has(p))) throw new Error('Readiness window has missing months')
  const sizeTest = sizes.filter(s => s.period >= BREAKDOWN_RULES.testStart).map(s => s.net), monthTotals = test.filter(p => N.get(p)! > 0).map(p => L.get(p)!)
  const size = {documents: sizeTest.length, p50: quantile(sizeTest, .5), p75: quantile(sizeTest, .75), p90: quantile(sizeTest, .9), max: Math.max(...sizeTest),
    months_with_large: monthTotals.length, month_p10: quantile(monthTotals, .1), month_p50: quantile(monthTotals, .5), month_p90: quantile(monthTotals, .9)}
  const calendar = Array.from({length: 12}, (_, k) => { const ms = test.filter(p => Number(p.slice(5)) === k + 1)
    return {month: k + 1, mean_large_php: ms.reduce((n, p) => n + L.get(p)!, 0) / ms.length, share_months_with_large_pct: 100 * ms.filter(p => N.get(p)! > 0).length / ms.length} })
  // Forward test: each origin uses only earlier months.
  const origins = test.filter(p => p >= BREAKDOWN_RULES.originStart), any = (p: string) => N.get(p)! > 0 ? 1 : 0
  const preds = origins.map(p => { const i = test.indexOf(p), prev12 = test.slice(i - 12, i), prevAll = test.slice(0, i)
    return {period: p, t12: prev12.reduce((n, q) => n + any(q), 0) / 12, exp: prevAll.reduce((n, q) => n + any(q), 0) / prevAll.length, o: any(p)} })
  const brier = (rs: typeof preds, k: 't12' | 'exp') => rs.reduce((n, r) => n + (r[k] - r.o) ** 2, 0) / rs.length
  const dev = preds.filter(r => r.period < BREAKDOWN_RULES.holdoutStart), hold = preds.filter(r => r.period >= BREAKDOWN_RULES.holdoutStart)
  const chosen: 't12' | 'exp' = brier(dev, 'exp') < brier(dev, 't12') ? 'exp' : 't12'
  const meanPred = hold.reduce((n, r) => n + r[chosen], 0) / hold.length, observed = hold.reduce((n, r) => n + r.o, 0) / hold.length
  const options = [12, 24].flatMap(W => [.5, .75, .9, 1].map(p => {
    const rows = origins.map(o => { const i = test.indexOf(o), hist = test.slice(Math.max(0, i - W), i).map(q => L.get(q)!); return {period: o, reserve: quantile(hist, p), actual: L.get(o)!} })
    const stat = (rs: typeof rows) => ({months: rs.length, coverage_pct: 100 * rs.filter(r => r.actual <= r.reserve).length / rs.length,
      mean_reserve_php: rs.reduce((n, r) => n + r.reserve, 0) / rs.length, mean_unused_php: rs.reduce((n, r) => n + Math.max(r.reserve - r.actual, 0), 0) / rs.length,
      mean_shortfall_php: rs.reduce((n, r) => n + Math.max(r.actual - r.reserve, 0), 0) / rs.length})
    return {window_months: W, percentile: p * 100, development: stat(rows.filter(r => r.period < BREAKDOWN_RULES.holdoutStart)),
      holdout: stat(rows.filter(r => r.period >= BREAKDOWN_RULES.holdoutStart)), next_month_php: quantile(test.slice(-W).map(q => L.get(q)!), p)}
  }))
  const eligible = options.filter(o => o.development.coverage_pct >= 80).sort((a, b) => a.development.mean_reserve_php - b.development.mean_reserve_php)
  const selected = eligible[0] ?? null
  return {by_year: byYear, size, calendar, calendar_timing_registered: BREAKDOWN_RULES.calendarTimingRegistered,
    chance: {selected_rule: chosen === 'exp' ? 'share_of_months_since_2020' : 'share_of_last_12_months', development_brier: {t12: brier(dev, 't12'), exp: brier(dev, 'exp')},
      holdout: {months: hold.length, brier: brier(hold, chosen), mean_predicted_pct: 100 * meanPred, observed_pct: 100 * observed, gap_pts: 100 * (meanPred - observed)},
      usable: brier(hold, chosen) < .25 && Math.abs(meanPred - observed) <= .1,
      next_month_pct: 100 * (chosen === 'exp' ? test.reduce((n, q) => n + any(q), 0) / test.length : test.slice(-12).reduce((n, q) => n + any(q), 0) / 12)},
    range: (() => { const r = options.find(o => o.window_months === 24 && o.percentile === 90)!
      const lo = origins.map(o => { const i = test.indexOf(o), hist = test.slice(Math.max(0, i - 24), i).map(q => L.get(q)!); return {period: o, lo: quantile(hist, .1), hi: quantile(hist, .9), a: L.get(o)!} })
      const cov = (rs: typeof lo) => 100 * rs.filter(x => x.lo <= x.a && x.a <= x.hi).length / rs.length
      const d = cov(lo.filter(x => x.period < BREAKDOWN_RULES.holdoutStart)), h = cov(lo.filter(x => x.period >= BREAKDOWN_RULES.holdoutStart))
      return {development_coverage_pct: d, holdout_coverage_pct: h, usable: d >= 70 && d <= 90 && h >= 70 && h <= 90, misses_above: lo.filter(x => x.a > x.hi).length,
        misses_below: lo.filter(x => x.a < x.lo).length, next_month_low_php: quantile(test.slice(-24).map(q => L.get(q)!), .1), next_month_high_php: r.next_month_php} })(),
    tradeoff: {options, selected: selected ? {window_months: selected.window_months, percentile: selected.percentile} : null,
      selected_usable: !!selected && selected.holdout.coverage_pct >= 70, default_amount: null,
      note: 'The pre-registered selection failed its holdout narrowly; the user chooses a risk level. No default reserve is claimed.'}}
}

// ---------- day-20 current-month estimate
export function day20Estimate(rows: Row[]) {
  const all = rows.map(r => ({period: String(r.period), mtd: num(r.mtd_php), total: num(r.total_php)}))
  const start = monthIndex(BREAKDOWN_RULES.testStart), months = all.filter(r => r.period >= BREAKDOWN_RULES.testStart)
  months.forEach((r, k) => { if (monthIndex(r.period) !== start + k) throw new Error('Day-20 window has missing months') })
  const {weight: w, shareWindow} = BREAKDOWN_RULES.day20
  const cases = months.flatMap((r, t) => {
    if (t < Math.max(6, 1)) return []
    const shares = months.slice(Math.max(0, t - shareWindow), t).filter(m => m.total > 0).map(m => m.mtd / m.total)
    if (!shares.length) return []
    const mean6 = months.slice(t - 6, t).reduce((n, m) => n + m.total, 0) / 6, pace = r.mtd / median(shares)
    return [{period: r.period, month_to_day20_php: r.mtd, typical_share_pct: 100 * median(shares), estimate_php: w * pace + (1 - w) * mean6, reference_mean6_php: mean6, actual_php: r.total}]
  })
  const score = (rs: typeof cases, k: 'estimate_php' | 'reference_mean6_php') => { const act = rs.reduce((n, r) => n + Math.abs(r.actual_php), 0)
    return {cases: rs.length, wape_pct: 100 * rs.reduce((n, r) => n + Math.abs(r[k] - r.actual_php), 0) / act, bias_pct: 100 * rs.reduce((n, r) => n + r[k] - r.actual_php, 0) / act} }
  const evalCases = cases.filter(c => c.period >= BREAKDOWN_RULES.holdoutStart)
  return {rule: 'estimate = 0.75 x (sales to day 20 / median day-20 share of the previous 24 months) + 0.25 x mean of the previous 6 months',
    evaluation: {from: BREAKDOWN_RULES.holdoutStart, estimate: score(evalCases, 'estimate_php'), reference: score(evalCases, 'reference_mean6_php')},
    recent: cases.slice(-12), caveat: 'Delivery date stands in for the date sales become known; needs sales entered within days of delivery.'}
}

export function buildDiagnosticBreakdowns(release: DescriptiveRelease, mapping: ReturnType<typeof parseFamilyMapping>, cellRows: Row[], documentRows: Row[], dayRows: Row[]) {
  const cells = parseCells(cellRows, mapping.families)
  const byMonth = new Map<string, number>(); for (const c of cells) byMonth.set(c.period, (byMonth.get(c.period) ?? 0) + c.net)
  for (const r of dayRows) if (cents(byMonth.get(String(r.period)) ?? NaN) !== cents(num(r.total_php))) throw new Error('Diagnostic queries do not reconcile')
  if (byMonth.size !== dayRows.length) throw new Error('Diagnostic month sets differ')
  const years = [...new Set(cells.map(c => c.year))].sort()
  const coverage = years.map(y => { const ys = cells.filter(c => c.year === y), tot = ys.reduce((n, c) => n + c.net, 0)
    const el = ys.filter(c => c.gmNet !== null && c.gm !== null), elNet = el.reduce((n, c) => n + c.gmNet!, 0)
    return {year: y, cost_coverage_pct: 100 * elNet / tot, gross_margin_pct: elNet ? 100 * el.reduce((n, c) => n + c.gm!, 0) / elNet : null} })
  const [y0, y1] = BREAKDOWN_RULES.marginYears
  return {status: 'diagnostic_breakdowns_validated_offline_served_live', source: {dataset_id: release.dataset_id, fact_version: release.fact_delta_version,
      family_mapping_sha256: FAMILY_BINDING.mappingSha256, total_php: [...byMonth.values()].reduce((a, b) => a + b, 0)},
    margin: {coverage, headline: decomposeMargin(cells, y0, y1), year_on_year: years.slice(1).map((y, i) => { const d = decomposeMargin(cells, years[i], y, 0)
      return {from: d.from, to: d.to, change_pts: d.change_pts, mix_pts: d.mix_pts, rate_pts: d.rate_pts} })},
    bridge: salesBridge(cells), unusual: unusualMonths(cells), survival: productSurvival(cells),
    large_orders: largeOrderReadiness(cells, documentRows), day20: day20Estimate(dayRows),
    interpretation: 'retrospective_descriptions_validated_offline', forecast_approved: false, procurement_approved: false,
    rules_sha256: createHash('sha256').update(JSON.stringify(BREAKDOWN_RULES)).digest('hex')}
}

export async function readDiagnosticBreakdowns(execute = executeDatabricksStatement) {
  const release = await readOriginalItemizedRelease(execute), sql = breakdownSql(release)
  const [saved, history, cells, documents, days] = await Promise.all([
    execute(`SELECT mapping_sha256, payload_json FROM ${FAMILY_BINDING.table}`, {rowLimit: 2}),
    execute(`DESCRIBE HISTORY ${FAMILY_BINDING.table} LIMIT 1`, {rowLimit: 1}),
    execute(sql.cells, {rowLimit: 50000}), execute(sql.largeDocuments, {rowLimit: 5000}), execute(sql.days, {rowLimit: 500}),
  ])
  if (history.rows[0]?.version !== '0' || saved.rows.length !== 1 || saved.rows[0].mapping_sha256 !== FAMILY_BINDING.mappingSha256) throw new Error('Family mapping table changed or missing')
  return buildDiagnosticBreakdowns(release, parseFamilyMapping(String(saved.rows[0].payload_json)), cells.rows, documents.rows, days.rows)
}
