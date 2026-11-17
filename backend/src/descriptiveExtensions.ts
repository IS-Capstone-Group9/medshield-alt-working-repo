import {executeDatabricksStatement} from './databricks'
import {readOriginalItemizedRelease, originalItemizedFactSql} from './originalItemizedSource'
import {FAMILY_BINDING, parseFamilyMapping} from './familyAbcXyz'
import type {DescriptiveRelease} from './descriptiveSource'

/**
 * Descriptive views D1-D8 (outputs/descriptive_extensions_20261113) served live from Gold. Counts and ratios only:
 * no model, no estimate. Contracts excluded; missing months are never zero sales; the latest year may be partial.
 */
type Row = Record<string, string | null>
const num = (v: string | null | undefined) => { const n = Number(v); if (v === null || v === undefined || !Number.isFinite(n)) throw new Error('Invalid number'); return n }
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2 }
const cents = (v: number) => Math.round(v * 100)
export const SIZE_BANDS = [[0, 10_000, 'under ₱10K'], [10_000, 100_000, '₱10K–100K'], [100_000, 500_000, '₱100K–500K'], [500_000, Infinity, '₱500K and over']] as const

export function descriptiveSql(release: DescriptiveRelease) {
  const f = `(SELECT * FROM ${originalItemizedFactSql(release, 'itemized')} WHERE is_net_sales_eligible)`
  const y = 'CAST(calendar_year AS STRING) AS year', gm = 'is_gross_margin_eligible AND gross_margin_amount IS NOT NULL', disc = 'gross_sales > 0 AND discount_amount IS NOT NULL'
  return {
    documents: `SELECT ${y}, CAST(SUM(net_sales) AS STRING) AS net_php FROM ${f} WHERE dr_number IS NOT NULL GROUP BY calendar_year, month_start, dr_number`,
    areas: `SELECT ${y}, COALESCE(NULLIF(UPPER(TRIM(normalized_area)), ''), 'UNLABELLED') AS area, CAST(SUM(net_sales) AS STRING) AS net_php FROM ${f} GROUP BY 1, 2`,
    categories: `SELECT ${y}, COALESCE(NULLIF(product_category, ''), 'unclassified') AS category, CAST(SUM(net_sales) AS STRING) AS net_php,
      CAST(SUM(CASE WHEN ${gm} THEN gross_margin_amount END) AS STRING) AS gm_php, CAST(SUM(CASE WHEN ${gm} THEN net_sales END) AS STRING) AS gm_net_php FROM ${f} GROUP BY 1, 2`,
    labels: `SELECT ${y}, normalized_product, CAST(SUM(net_sales) AS STRING) AS net_php FROM ${f} GROUP BY 1, 2`,
    yearly: `SELECT ${y}, CAST(SUM(net_sales) AS STRING) AS net_php, CAST(SUM(CASE WHEN net_sales > 0 THEN net_sales ELSE 0 END) AS STRING) AS positive_php,
      CAST(SUM(CASE WHEN net_sales < 0 THEN 1 ELSE 0 END) AS STRING) AS negative_lines, CAST(SUM(CASE WHEN net_sales < 0 THEN net_sales ELSE 0 END) AS STRING) AS negative_php,
      CAST(SUM(CASE WHEN ${disc} THEN discount_amount END) AS STRING) AS discount_php, CAST(SUM(CASE WHEN ${disc} THEN gross_sales END) AS STRING) AS gross_php FROM ${f} GROUP BY 1`,
    timing: `SELECT DATE_FORMAT(month_start,'yyyy-MM') AS period, CAST(SUM(CASE WHEN DAY(date_delivered) <= 10 THEN net_sales ELSE 0 END) AS STRING) AS day10_php,
      CAST(SUM(CASE WHEN DAY(date_delivered) <= 20 THEN net_sales ELSE 0 END) AS STRING) AS day20_php, CAST(SUM(net_sales) AS STRING) AS total_php FROM ${f} GROUP BY 1`,
  }
}

export function buildDescriptiveExtensions(release: DescriptiveRelease, families: Record<string, string>, q: Record<keyof ReturnType<typeof descriptiveSql>, Row[]>) {
  const yearOf = (r: Row) => { const y = Number(r.year); if (!Number.isInteger(y) || y < 2000) throw new Error('Invalid year'); return y }
  const yearly = new Map(q.yearly.map(r => [yearOf(r), r])), years = [...yearly.keys()].sort()
  if (!years.length) throw new Error('No eligible sales')
  const net = (y: number) => num(yearly.get(y)!.net_php), total = years.reduce((n, y) => n + net(y), 0)
  // Every query must describe the same population.
  const sumBy = (rows: Row[]) => { const m = new Map<number, number>(); for (const r of rows) m.set(yearOf(r), (m.get(yearOf(r)) ?? 0) + num(r.net_php)); return m }
  for (const rows of [q.areas, q.categories, q.labels]) { const m = sumBy(rows); for (const y of years) if (cents(m.get(y) ?? NaN) !== cents(net(y))) throw new Error('Descriptive queries do not reconcile') }
  if (cents(q.timing.reduce((n, r) => n + num(r.total_php), 0)) !== cents(total)) throw new Error('Timing query does not reconcile')

  const areaTotal = new Map<string, number>(); for (const r of q.areas) areaTotal.set(String(r.area), (areaTotal.get(String(r.area)) ?? 0) + num(r.net_php))
  const topLabels = [...areaTotal].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([a]) => a)
  const famYear = new Map<number, Map<string, number>>()
  for (const r of q.labels) { const fam = families[String(r.normalized_product)]; if (!fam) throw new Error('Gold label missing from family mapping')
    const m = famYear.get(yearOf(r)) ?? new Map<string, number>(); m.set(fam, (m.get(fam) ?? 0) + num(r.net_php)); famYear.set(yearOf(r), m) }
  const positive = (y: number) => new Map([...(famYear.get(y) ?? new Map<string, number>())].filter(([, v]) => v > 0))

  const out = years.map((y, i) => {
    const docs = q.documents.filter(r => yearOf(r) === y).map(r => num(r.net_php)).filter(v => v > 0), docTotal = docs.reduce((a, b) => a + b, 0)
    const channel: Record<string, number> = {}
    for (const r of q.areas) if (yearOf(r) === y) { const k = topLabels.includes(String(r.area)) ? String(r.area) : 'OTHER LABELS'; channel[k] = (channel[k] ?? 0) + 100 * num(r.net_php) / net(y) }
    const category = q.categories.filter(r => yearOf(r) === y).map(r => ({category: String(r.category), share_pct: 100 * num(r.net_php) / net(y),
      margin_pct: r.gm_net_php !== null && num(r.gm_net_php) !== 0 ? 100 * num(r.gm_php) / num(r.gm_net_php) : null})).sort((a, b) => b.share_pct - a.share_pct)
    const now = positive(y), nowTotal = [...now.values()].reduce((a, b) => a + b, 0), shares = [...now.values()].map(v => v / nowTotal).sort((a, b) => b - a)
    const prev = i ? positive(years[i - 1]) : null, prevTotal = prev ? [...prev.values()].reduce((a, b) => a + b, 0) : 0
    const yr = yearly.get(y)!, months = q.timing.filter(r => String(r.period).startsWith(String(y)) && num(r.total_php) > 0)
    return {year: y, net_php: net(y),
      order_size: docs.length ? {documents: docs.length, mean_php: docTotal / docs.length, median_php: median(docs),
        band_share_pct: Object.fromEntries(SIZE_BANDS.map(([lo, hi, label]) => [label, 100 * docs.filter(v => v >= lo && v < hi).reduce((a, b) => a + b, 0) / docTotal]))} : null,
      channel_share_pct: channel, category,
      portfolio: prev ? {continuing: [...now.keys()].filter(k => prev.has(k)).length, new: [...now.keys()].filter(k => !prev.has(k)).length,
        lost: [...prev.keys()].filter(k => !now.has(k)).length, new_net_share_pct: 100 * [...now].filter(([k]) => !prev.has(k)).reduce((n, [, v]) => n + v, 0) / nowTotal,
        lost_prior_net_share_pct: 100 * [...prev].filter(([k]) => !now.has(k)).reduce((n, [, v]) => n + v, 0) / prevTotal} : null,
      concentration: {families: now.size, top10_share_pct: 100 * shares.slice(0, 10).reduce((a, b) => a + b, 0), hhi: 10_000 * shares.reduce((n, s) => n + s * s, 0)},
      returns: {negative_lines: num(yr.negative_lines), share_of_positive_pct: num(yr.positive_php) > 0 ? -100 * num(yr.negative_php) / num(yr.positive_php) : null},
      discount_rate_pct: yr.gross_php !== null && num(yr.gross_php) > 0 ? 100 * num(yr.discount_php) / num(yr.gross_php) : null,
      timing: months.length ? {months: months.length, median_by_day10_pct: 100 * median(months.map(r => num(r.day10_php) / num(r.total_php))),
        median_by_day20_pct: 100 * median(months.map(r => num(r.day20_php) / num(r.total_php)))} : null}
  })
  return {status: 'descriptive_extensions', source: {dataset_id: release.dataset_id, fact_version: release.fact_delta_version, family_mapping_sha256: FAMILY_BINDING.mappingSha256, total_php: total},
    channel_labels: [...topLabels, 'OTHER LABELS'], latest_year_months: q.timing.filter(r => String(r.period).startsWith(String(years.at(-1)))).length, years: out,
    notes: {channel: 'Labels follow source-workbook conventions that changed between years; they are channels or delivery areas, not verified buyers.',
      margin: 'Margin uses only rows whose cost and sales pass quality checks, before operating expenses.'},
    interpretation: 'recorded_counts_and_ratios_only', forecast_approved: false}
}

export async function readDescriptiveExtensions(execute = executeDatabricksStatement) {
  const release = await readOriginalItemizedRelease(execute), sql = descriptiveSql(release)
  const [saved, history, documents, areas, categories, labels, yearly, timing] = await Promise.all([
    execute(`SELECT mapping_sha256, payload_json FROM ${FAMILY_BINDING.table}`, {rowLimit: 2}),
    execute(`DESCRIBE HISTORY ${FAMILY_BINDING.table} LIMIT 1`, {rowLimit: 1}),
    execute(sql.documents, {rowLimit: 50000}), execute(sql.areas, {rowLimit: 5000}), execute(sql.categories, {rowLimit: 500}),
    execute(sql.labels, {rowLimit: 50000}), execute(sql.yearly, {rowLimit: 50}), execute(sql.timing, {rowLimit: 500}),
  ])
  if (history.rows[0]?.version !== '0' || saved.rows.length !== 1 || saved.rows[0].mapping_sha256 !== FAMILY_BINDING.mappingSha256) throw new Error('Family mapping table changed or missing')
  return buildDescriptiveExtensions(release, parseFamilyMapping(String(saved.rows[0].payload_json)).families,
    {documents: documents.rows, areas: areas.rows, categories: categories.rows, labels: labels.rows, yearly: yearly.rows, timing: timing.rows})
}
