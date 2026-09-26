export type ProductSalesRow = {
  product?: string; period?: string; date?: string; revenue?: number | null
  positive_sales?: number | null; returns_value?: number | null; quantity?: number | null; evidence?: string; product_evidence?: string
}

/** Financial grouping by source label; this does not resolve canonical medicine identity. */
export function descriptivePortfolio(rows: ProductSalesRow[], basis: 'net' | 'positive_sales_candidate' = 'net') {
  const totals = new Map<string, { name: string; revenue: number; quantity: number; positiveSales: number; returnsValue: number; periods: Set<string>; provenance: Set<string> }>()
  let estimatedRows = 0
  let unavailableRows = 0
  let missingContributionRows = 0
  for (const row of rows) {
    if (row.evidence === 'estimate') { estimatedRows++; continue }
    if (row.revenue == null || !Number.isFinite(Number(row.revenue))) { unavailableRows++; continue }
    const name = String(row.product || '').trim() || 'Unspecified product'
    const total = totals.get(name) || { name, revenue: 0, quantity: 0, positiveSales: 0, returnsValue: 0, periods: new Set<string>(), provenance: new Set<string>() }
    total.provenance.add(row.product_evidence || "source_label_unverified")
    total.revenue += Number(row.revenue)
    if (row.positive_sales == null || row.returns_value == null || !Number.isFinite(Number(row.positive_sales)) || !Number.isFinite(Number(row.returns_value)) || Number(row.positive_sales) < 0 || Number(row.returns_value) > 0 || Math.abs(Number(row.positive_sales) + Number(row.returns_value) - Number(row.revenue)) > 0.011) missingContributionRows++
    else { total.positiveSales += Number(row.positive_sales); total.returnsValue += Number(row.returns_value) }
    if (row.quantity != null && Number.isFinite(Number(row.quantity))) total.quantity += Number(row.quantity)
    if (row.period || row.date) total.periods.add(String(row.period || row.date).slice(0, 7))
    totals.set(name, total)
  }
  const contribution = (row: {revenue: number; positiveSales: number}) => basis === 'positive_sales_candidate' ? row.positiveSales : row.revenue
  const sorted = [...totals.values()].sort((a, b) => contribution(b) - contribution(a) || a.name.localeCompare(b.name))
  const revenue = sorted.reduce((sum, row) => sum + row.revenue, 0)
  const negativeProducts = sorted.filter(row => row.revenue < 0).length
  const contributionTotal = sorted.reduce((sum, row) => sum + contribution(row), 0)
  const abcAvailable = contributionTotal > 0 && (basis === 'positive_sales_candidate' ? missingContributionRows === 0 : negativeProducts === 0 && unavailableRows === 0)
  let cumulative = 0
  const products = sorted.map((row, index) => {
    cumulative += contribution(row)
    const cumulativeShare = abcAvailable ? cumulative / contributionTotal * 100 : null
    const abc = cumulativeShare == null || contribution(row) <= 0 ? 'Unclassified' : cumulativeShare <= 80 ? 'A' : cumulativeShare <= 95 ? 'B' : 'C'
    return { name: row.name, rank: index + 1, revenue: row.revenue, positiveSales: row.positiveSales, returnsValue: row.returnsValue, quantity: row.quantity,
      productEvidence: [...row.provenance].sort().join("; "), observedMonths: row.periods.size, share: contributionTotal > 0 ? contribution(row) / contributionTotal * 100 : null,
      cumulativeShare, abc }
  })
  return { products, revenue, contributionTotal, basis, missingContributionRows, negativeProducts, estimatedRows, unavailableRows, abcAvailable }
}
