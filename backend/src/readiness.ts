import {executeDatabricksStatement} from './databricks'
import {readOriginalItemizedRelease, originalItemizedFactSql} from './originalItemizedSource'
import {LARGE_DOCUMENT_PHP} from './salesStreams'
import type {DescriptiveRelease} from './descriptiveSource'

/**
 * Two tested readiness outputs computed from Gold.
 * Day-20 month-end estimate (accuracy_round2_20261111 E1, total, weight 0.75: passed the win rule, 28.8% vs 41.8% WAPE):
 *   estimate = 0.75 x pace + 0.25 x mean_6, pace = net delivered days 1-20 / median day-20 share of the previous 24 months.
 * Government large-order readiness range (new_prediction_targets_20261117 P1: passed, coverage 77.8% / 78.8%):
 *   P10-P90 of the previous 24 months' government large-order totals (documents >= PHP 500k, zeros included).
 * Neither is a purchase order; the range is a readiness floor, not a cap.
 */
export const READINESS_RULES = {day20Weight: 0.75, shareMonths: 24, trackMonths: 12, rangeMonths: 24, largePhp: LARGE_DOCUMENT_PHP,
  evidence: {day20: 'outputs/accuracy_round2_20261111', government_range: 'outputs/new_prediction_targets_20261117', replay: 'outputs/backtest_replay_20261117'},
  registered: {day20_wape_pct: 28.8, reference_wape_pct: 41.8, day20_bias_pct: -2.3, range_coverage_pct: [77.8, 78.8], range_rule_pct: [70, 90]}} as const
type Row = Record<string, string | null>
const num = (v: string | null | undefined) => { const n = Number(v); if (v === null || v === undefined || v === '' || !Number.isFinite(n)) throw new Error('Invalid number'); return n }
const idx = (p: string) => Number(p.slice(0, 4)) * 12 + Number(p.slice(5, 7)) - 1
const period = (i: number) => `${Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}`
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2 }
export const quantile = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b), pos = p * (s.length - 1), lo = Math.floor(pos), hi = Math.min(lo + 1, s.length - 1); return s[lo] + (s[hi] - s[lo]) * (pos - lo) }

export function readinessSql(release: DescriptiveRelease) {
  const fact = originalItemizedFactSql(release, 'itemized')
  return {
    months: `SELECT DATE_FORMAT(month_start,'yyyy-MM') AS period, CAST(SUM(net_sales) AS STRING) AS net_php,
      CAST(SUM(CASE WHEN DAY(date_delivered) <= 20 THEN net_sales ELSE 0 END) AS STRING) AS net20_php
      FROM ${fact} WHERE is_net_sales_eligible GROUP BY 1 ORDER BY 1`,
    documents: `SELECT DATE_FORMAT(month_start,'yyyy-MM') AS period, dr_number, normalized_area AS area, CAST(SUM(net_sales) AS STRING) AS net_php
      FROM ${fact} WHERE is_net_sales_eligible AND dr_number IS NOT NULL GROUP BY 1, 2, 3`,
  }
}

export function buildReadiness(release: DescriptiveRelease, monthRows: Row[], docRows: Row[]) {
  const R = READINESS_RULES
  const net = new Map<string, number>(), net20 = new Map<string, number>()
  for (const r of monthRows) { const p = String(r.period); if (!/^\d{4}-\d{2}$/.test(p)) throw new Error('Invalid period'); net.set(p, num(r.net_php)); net20.set(p, num(r.net20_php)) }
  const periods = [...net.keys()].sort(); if (!periods.length) throw new Error('No months')
  const last = idx(periods.at(-1)!)
  const val = (i: number) => net.get(period(i))
  const day20 = (t: number) => {
    const prior = [1, 2, 3, 4, 5, 6].map(k => val(t - k)); const hist = Array.from({length: R.shareMonths}, (_, k) => t - 1 - k)
    if (prior.some(v => v === undefined || v <= 0) || hist.some(i => !val(i))) return null
    const share = median(hist.map(i => net20.get(period(i))! / val(i)!)); const mean6 = prior.reduce((a, b) => a! + b!, 0)! / 6
    if (!(share > 0)) return null
    const pace = net20.get(period(t))! / share
    return {period: period(t), delivered_by_day20_php: net20.get(period(t))!, usual_share_by_day20: share, mean6_php: mean6,
      estimate_php: R.day20Weight * pace + (1 - R.day20Weight) * mean6, actual_php: val(t)!}
  }
  const track = Array.from({length: R.trackMonths}, (_, k) => last - R.trackMonths + 1 + k).map(day20).filter(<T,>(x: T | null): x is T => x !== null)
  const wape = (key: 'estimate_php' | 'mean6_php') => { const a = track.reduce((n, r) => n + Math.abs(r.actual_php), 0); return a > 0 ? 100 * track.reduce((n, r) => n + Math.abs(r[key] - r.actual_php), 0) / a : null }

  const docNet = new Map<string, number>(), docArea = new Map<string, Map<string, number>>()
  for (const r of docRows) {
    const key = `${r.period}|${r.dr_number}`, v = num(r.net_php), area = String(r.area ?? '').trim().toUpperCase()
    docNet.set(key, (docNet.get(key) ?? 0) + v); const m = docArea.get(key) ?? new Map<string, number>(); m.set(area, (m.get(area) ?? 0) + v); docArea.set(key, m)
  }
  const gov = new Map<string, number>()
  for (const [key, v] of docNet) {
    if (v < R.largePhp) continue
    const top = [...docArea.get(key)!].sort((a, b) => b[1] - a[1])[0][0]
    if (top === 'GOVERNMENT') { const p = key.split('|')[0]; gov.set(p, (gov.get(p) ?? 0) + v) }
  }
  const window = Array.from({length: R.rangeMonths}, (_, k) => period(last - k))
  if (!window.every(p => net.has(p))) throw new Error('Readiness range needs 24 recorded months')
  const govVals = window.map(p => gov.get(p) ?? 0)
  return {status: 'readiness_candidate', source: {dataset_id: release.dataset_id, fact_version: release.fact_delta_version}, latest_period: period(last), next_period: period(last + 1),
    day20: {track, wape_pct: wape('estimate_php'), reference_wape_pct: wape('mean6_php'), weight: R.day20Weight},
    government_range: {for_period: period(last + 1), p10_php: quantile(govVals, .1), p90_php: quantile(govVals, .9), months_with_large_order: govVals.filter(v => v > 0).length,
      window_months: R.rangeMonths, recent: window.slice(0, 12).reverse().map(p => ({period: p, government_large_php: gov.get(p) ?? 0}))},
    registered: R.registered, evidence: R.evidence, interpretation: 'readiness_aids_not_purchase_orders', forecast_approved: false, procurement_approved: false}
}

export async function readReadiness(execute = executeDatabricksStatement) {
  const release = await readOriginalItemizedRelease(execute)
  const sql = readinessSql(release)
  const [months, docs] = await Promise.all([execute(sql.months, {rowLimit: 2000}), execute(sql.documents, {rowLimit: 100000})])
  return buildReadiness(release, months.rows, docs.rows)
}
