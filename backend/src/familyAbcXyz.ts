import {createHash} from 'node:crypto'
import {executeDatabricksStatement} from './databricks'
import {readOriginalItemizedRelease, originalItemizedFactSql} from './originalItemizedSource'
import type {DescriptiveRelease} from './descriptiveSource'

/** Candidate family mapping v1.1 (decision 015): one saved row, pinned by hash, never rewritten. */
export const FAMILY_BINDING = {
  table: 'workspace.medshield_warehouse.reference_product_family_8b96ff67b9134688_candidate',
  mappingSha256: '8b96ff67b91346885ab569cbfde78ce02ef66e9c8beb1753dbdf3b2944b9edcf',
  year: 2025,
} as const

const HANDLING: Record<string, string> = {
  AX: 'Steady, high value: tight reorder point and regular review',
  AY: 'High value, variable: reorder point with a larger buffer; monthly review',
  AZ: 'High value, erratic (often large orders): manual review; plan from known orders',
  BX: 'Steady, medium value: standard reorder point', BY: 'Medium value, variable: standard reorder point, larger buffer',
  BZ: 'Medium value, erratic: order on demand or keep minimal stock',
  CX: 'Low value, steady: simple min/max', CY: 'Low value, variable: simple min/max', CZ: 'Low value, erratic: order on demand',
}

export function familySalesSql(release: DescriptiveRelease, year: number = FAMILY_BINDING.year) {
  if (!Number.isInteger(year)) throw new Error('Invalid year')
  return `SELECT normalized_product, CAST(MONTH(date_delivered) AS STRING) AS month, CAST(SUM(net_sales) AS STRING) AS net_php
    FROM ${originalItemizedFactSql(release, 'itemized')} WHERE is_net_sales_eligible AND YEAR(date_delivered) = ${year}
    GROUP BY normalized_product, MONTH(date_delivered)`
}

export function parseFamilyMapping(raw: string) {
  if (createHash('sha256').update(raw).digest('hex') !== FAMILY_BINDING.mappingSha256) throw new Error('Family mapping hash mismatch')
  const payload = JSON.parse(raw)
  if (payload.schema_version !== 'product_family_mapping_v1_1' || payload.forecast_approved !== false || typeof payload.families !== 'object') throw new Error('Unexpected family mapping')
  return payload as {families: Record<string, string>; status: string; definition: string; validation: Record<string, string>}
}

/** Same rules as the registered offline tests: 80/95% cumulative positive net; CV of 12 months, X<=0.5<Y<=1.0<Z. */
export function buildFamilyAbcXyz(mapping: ReturnType<typeof parseFamilyMapping>, rows: Array<Record<string, string | null>>, year: number = FAMILY_BINDING.year) {
  const series = new Map<string, number[]>()
  for (const row of rows) {
    const label = row.normalized_product, month = Number(row.month), net = Number(row.net_php)
    if (!label || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isFinite(net)) throw new Error('Invalid family sales row')
    const family = mapping.families[label]
    if (!family) throw new Error('Gold label missing from family mapping')
    const s = series.get(family) ?? Array(12).fill(0); s[month - 1] += net; series.set(family, s)
  }
  const positive = [...series].map(([family, s]) => ({family, s, total: s.reduce((a, b) => a + b, 0)})).filter(f => f.total > 0)
    .sort((a, b) => b.total - a.total || a.family.localeCompare(b.family))
  if (!positive.length) throw new Error('No positive family sales')
  const grand = positive.reduce((n, f) => n + f.total, 0)
  let run = 0
  const families = positive.map(({family, s, total}) => {
    const abc = run < .8 * grand ? 'A' : run < .95 * grand ? 'B' : 'C'; run += total
    const mean = total / 12, cv = Math.sqrt(s.reduce((n, v) => n + (v - mean) ** 2, 0) / 12) / mean
    const cls = abc + (cv <= .5 ? 'X' : cv <= 1 ? 'Y' : 'Z')
    return {family, abc_xyz: cls, net_php: total, share_pct: 100 * total / grand, months_with_sales: s.filter(v => v !== 0).length, cv, handling: HANDLING[cls]}
  })
  const grid: Record<string, {families: number; share_pct: number}> = {}
  for (const f of families) { const g = grid[f.abc_xyz] ??= {families: 0, share_pct: 0}; g.families++; g.share_pct += f.share_pct }
  return {status: 'family_abc_xyz_candidate', year, mapping: {table: FAMILY_BINDING.table, sha256: FAMILY_BINDING.mappingSha256, definition: mapping.definition,
      review_status: mapping.status, validation: mapping.validation}, families, grid, positive_net_php: grand,
    interpretation: 'financial_classification_not_clinical_importance_handling_is_suggestion', stock_rule_approved: false, forecast_approved: false}
}

export async function readFamilyAbcXyz(execute = executeDatabricksStatement) {
  const release = await readOriginalItemizedRelease(execute)
  const [saved, history, sales] = await Promise.all([
    execute(`SELECT mapping_sha256, payload_json FROM ${FAMILY_BINDING.table}`, {rowLimit: 2}),
    execute(`DESCRIBE HISTORY ${FAMILY_BINDING.table} LIMIT 1`, {rowLimit: 1}),
    execute(familySalesSql(release), {rowLimit: 20000}),
  ])
  if (history.rows[0]?.version !== '0' || saved.rows.length !== 1 || saved.rows[0].mapping_sha256 !== FAMILY_BINDING.mappingSha256) throw new Error('Family mapping table changed or missing')
  return buildFamilyAbcXyz(parseFamilyMapping(String(saved.rows[0].payload_json)), sales.rows)
}
