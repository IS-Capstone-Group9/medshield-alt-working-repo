import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const rootDir = process.cwd()
const inputPath = path.join(rootDir, 'data', 'medshield', 'processed', 'sales_transactions.json.gz')
const outputDir = path.join(rootDir, 'outputs', 'data_readiness_profile')

function readRows(filePath) {
  const parsed = JSON.parse(zlib.gunzipSync(fs.readFileSync(filePath), 'utf8'))
  if (Array.isArray(parsed)) return parsed
  return parsed.rows || parsed.transactions || []
}

function getDate(row) {
  return String(row.date_delivered || row.delivery_date || row.date || '').slice(0, 10)
}

function getProduct(row) {
  return String(row.product || row.product_name || '').trim()
}

function getArea(row) {
  return String(row.area || row.area_name || '').trim()
}

function getQualityStatus(row) {
  return String(row.quality_status || row.row_quality_status || 'unknown').trim()
}

function getQualityNotes(row) {
  return String(row.quality_notes || row.row_quality_notes || '').trim()
}

function normalizeProductKey(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\b(TAB|TABLET|CAP|CAPSULE)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount)
}

function csvEscape(value) {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function writeCsv(filePath, rows) {
  fs.writeFileSync(
    filePath,
    rows.map((row) => row.map(csvEscape).join(',')).join('\n') + '\n',
  )
}

const rows = readRows(inputPath)
const byYear = new Map()
const by2025Month = new Map()
const qualityStatus = new Map()
const issueCounts = new Map()
const areaCounts = new Map()
const productCounts = new Map()
const aliasGroups = new Map()

for (const row of rows) {
  const date = getDate(row)
  const year = date ? date.slice(0, 4) : 'missing'
  const month = date ? date.slice(0, 7) : 'missing'
  const product = getProduct(row)
  const area = getArea(row)
  const status = getQualityStatus(row)
  const notes = getQualityNotes(row)

  increment(byYear, year)
  if (year === '2025') increment(by2025Month, month)
  increment(qualityStatus, status)
  if (notes) increment(issueCounts, notes)
  if (area) increment(areaCounts, area)
  if (product) {
    increment(productCounts, product)
    const key = normalizeProductKey(product)
    if (!aliasGroups.has(key)) aliasGroups.set(key, new Map())
    increment(aliasGroups.get(key), product)
  }
}

const expected2025Months = Array.from({ length: 12 }, (_, index) => `2025-${String(index + 1).padStart(2, '0')}`)
const monthCoverage = expected2025Months.map((month) => ({
  month,
  row_count: by2025Month.get(month) || 0,
  status: by2025Month.has(month) ? 'has_accepted_rows' : 'missing_accepted_rows',
}))

const aliasCandidates = [...aliasGroups.entries()]
  .map(([normalized_key, values]) => ({
    normalized_key,
    variants: [...values.entries()].sort((a, b) => b[1] - a[1]),
  }))
  .filter((entry) => entry.variants.length > 1)
  .sort((a, b) => {
    const totalB = b.variants.reduce((sum, [, count]) => sum + count, 0)
    const totalA = a.variants.reduce((sum, [, count]) => sum + count, 0)
    return totalB - totalA
  })

const summary = {
  source_file: path.relative(rootDir, inputPath),
  row_count: rows.length,
  by_year: Object.fromEntries([...byYear.entries()].sort()),
  quality_status: Object.fromEntries([...qualityStatus.entries()].sort()),
  top_issues: [...issueCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25),
  month_coverage_2025: monthCoverage,
  unique_products: productCounts.size,
  unique_areas: areaCounts.size,
  generated_at: new Date().toISOString(),
}

fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(path.join(outputDir, 'sales_data_readiness_summary.json'), JSON.stringify(summary, null, 2) + '\n')

writeCsv(path.join(outputDir, '2025_month_coverage.csv'), [
  ['month', 'row_count', 'status'],
  ...monthCoverage.map((entry) => [entry.month, entry.row_count, entry.status]),
])

writeCsv(path.join(outputDir, 'area_counts.csv'), [
  ['raw_area', 'row_count'],
  ...[...areaCounts.entries()].sort((a, b) => b[1] - a[1]),
])

writeCsv(path.join(outputDir, 'product_alias_candidates.csv'), [
  ['normalized_key', 'raw_product', 'row_count'],
  ...aliasCandidates.flatMap((entry) =>
    entry.variants.map(([rawProduct, count]) => [entry.normalized_key, rawProduct, count]),
  ),
])

console.log(`Wrote readiness profile to ${path.relative(rootDir, outputDir)}`)
