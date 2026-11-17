import {executeDatabricksStatement} from './databricks'
import {readOriginalItemizedRelease, originalItemizedFactSql} from './originalItemizedSource'
import type {DescriptiveRelease} from './descriptiveSource'

/** D3 split (11 Nov study): a delivery document (month, DR) of at least this net is a large order. */
export const LARGE_DOCUMENT_PHP = 500000

export function salesStreamSql(release: DescriptiveRelease) {
  const fact = originalItemizedFactSql(release, 'itemized')
  // Rows without a DR stay in base so base + large always equals eligible net.
  return `WITH f AS (SELECT DATE_FORMAT(month_start,'yyyy-MM') AS period, dr_number, net_sales FROM ${fact} WHERE is_net_sales_eligible),
    d AS (SELECT period, dr_number, SUM(net_sales) AS net FROM f WHERE dr_number IS NOT NULL GROUP BY period, dr_number),
    n AS (SELECT period, SUM(net_sales) AS net FROM f WHERE dr_number IS NULL GROUP BY period),
    t AS (SELECT period, SUM(net_sales) AS net FROM f GROUP BY period)
    SELECT t.period,
      CAST(COALESCE((SELECT SUM(net) FROM d WHERE d.period=t.period AND d.net < ${LARGE_DOCUMENT_PHP}),0) + COALESCE((SELECT SUM(net) FROM n WHERE n.period=t.period),0) AS STRING) AS base_php,
      CAST(COALESCE((SELECT SUM(net) FROM d WHERE d.period=t.period AND d.net >= ${LARGE_DOCUMENT_PHP}),0) AS STRING) AS large_php,
      CAST((SELECT COUNT(*) FROM d WHERE d.period=t.period AND d.net >= ${LARGE_DOCUMENT_PHP}) AS STRING) AS large_documents,
      CAST(t.net AS STRING) AS total_php
    FROM t ORDER BY t.period`
}

/** Large documents by recorded area label and month. A label is a channel or delivery label, not a verified buyer. */
export function largeOrderPatternSql(release: DescriptiveRelease) {
  const fact = originalItemizedFactSql(release, 'itemized')
  return `WITH d AS (SELECT DATE_FORMAT(month_start,'yyyy-MM') AS period, dr_number, MIN(COALESCE(normalized_area,'UNLABELLED')) AS area, SUM(net_sales) AS net
      FROM ${fact} WHERE is_net_sales_eligible AND dr_number IS NOT NULL GROUP BY 1, 2)
    SELECT area, period, CAST(COUNT(*) AS STRING) AS documents, CAST(SUM(net) AS STRING) AS net_php
    FROM d WHERE net >= ${LARGE_DOCUMENT_PHP} GROUP BY area, period ORDER BY area, period`
}

/**
 * Historical frequency per label over the last 24 recorded months: share of those months with at least one large order,
 * median gap between large-order months, last occurrence. Descriptive pattern, not a forecast or a buyer commitment.
 */
export function buildLargeOrderPatterns(recordedMonths: string[], rows: Array<Record<string, string | null>>) {
  const window = recordedMonths.slice(-24), index = new Map(recordedMonths.map((p, i) => [p, i]))
  const byArea = new Map<string, {period: string; documents: number; net: number}[]>()
  for (const row of rows) {
    const documents = Number(row.documents), net = Number(row.net_php)
    if (!row.area || !index.has(String(row.period)) || !Number.isFinite(documents) || !Number.isFinite(net)) throw new Error('Invalid large-order row')
    byArea.set(row.area, [...(byArea.get(row.area) ?? []), {period: String(row.period), documents, net}])
  }
  return [...byArea].map(([area, list]) => {
    const months = list.map(item => item.period).sort(), gaps = months.slice(1).map((p, i) => index.get(p)! - index.get(months[i])!).sort((a, b) => a - b)
    const recent = list.filter(item => window.includes(item.period))
    return {area, documents: list.reduce((n, item) => n + item.documents, 0), net_php: list.reduce((n, item) => n + item.net, 0),
      months_with_large: months.length, recent24_share_pct: 100 * recent.length / window.length,
      median_gap_recorded_months: gaps.length ? gaps[Math.floor((gaps.length - 1) / 2)] : null, last_month: months.at(-1)!,
      typical_large_php: recent.length ? recent.reduce((n, item) => n + item.net, 0) / recent.length : null}
  }).sort((a, b) => b.net_php - a.net_php)
}

const cents = (value: number) => Math.round(value * 100)

/** Rolling mean of the last six recorded months, scored one month ahead (same rule as the offline studies). */
export function mean6Lead1(series: number[]) {
  let error = 0, actual = 0, bias = 0, cases = 0
  for (let o = 5; o < series.length - 1; o++) {
    const forecast = series.slice(o - 5, o + 1).reduce((a, b) => a + b, 0) / 6
    error += Math.abs(forecast - series[o + 1]); actual += Math.abs(series[o + 1]); bias += forecast - series[o + 1]; cases++
  }
  return actual ? {cases, wape_pct: 100 * error / actual, bias_pct: 100 * bias / actual} : null
}

export function buildSalesStreams(release: DescriptiveRelease, rows: Array<Record<string, string | null>>, patternRows: Array<Record<string, string | null>> = []) {
  if (!rows.length) throw new Error('No eligible months')
  const months = rows.map(row => {
    const base = Number(row.base_php), large = Number(row.large_php), total = Number(row.total_php), docs = Number(row.large_documents)
    if (!/^\d{4}-\d{2}$/.test(String(row.period)) || ![base, large, total, docs].every(Number.isFinite)) throw new Error('Invalid stream row')
    if (cents(base + large) !== cents(total)) throw new Error('Base and large do not reconcile to recorded net')
    return {period: String(row.period), base_php: base, large_php: large, large_documents: docs, total_php: total}
  })
  const sum = (key: 'base_php' | 'large_php' | 'total_php') => months.reduce((n, row) => n + row[key], 0)
  const base = months.map(row => row.base_php), recent = base.slice(-6)
  return {
    status: 'sales_stream_split', threshold_php: LARGE_DOCUMENT_PHP, source: {dataset_id: release.dataset_id, fact_version: release.fact_delta_version},
    months, totals: {base_php: sum('base_php'), large_php: sum('large_php'), total_php: sum('total_php'),
      large_documents: months.reduce((n, row) => n + row.large_documents, 0)},
    // Recorded months only; months without records are not zero sales and are not filled here.
    base_next_month_reference_php: recent.length === 6 ? recent.reduce((a, b) => a + b, 0) / 6 : null,
    retrospective_lead1: {base: mean6Lead1(base), total: mean6Lead1(months.map(row => row.total_php))},
    large_order_patterns: buildLargeOrderPatterns(months.map(row => row.period), patternRows),
    large_order_pattern_note: 'Historical frequency by recorded label over the last 24 recorded months. Labels are channels or delivery areas, not verified buyers. Not a forecast or commitment.',
    interpretation: 'base_is_routine_flow_large_orders_need_dated_pipeline', forecast_approved: false,
  }
}

export async function readSalesStreams(execute = executeDatabricksStatement) {
  const release = await readOriginalItemizedRelease(execute)
  const [streams, patterns] = await Promise.all([execute(salesStreamSql(release), {rowLimit: 500}), execute(largeOrderPatternSql(release), {rowLimit: 3000})])
  const out = buildSalesStreams(release, streams.rows, patterns.rows)
  // The pattern query must account for every large document the split counted.
  if (out.large_order_patterns.reduce((n, row) => n + row.documents, 0) !== out.totals.large_documents) throw new Error('Large-order patterns do not reconcile')
  return out
}
