export type ProductSalesRow = {
  canonical_group_id?: string; canonical_title?: string; category?: string; identity_status?: string
  item_kind?: string; packaging_unit?: string; pack_count?: string; contained_unit?: string; unit_of_measure?: string
  brand?: string; manufacturer?: string; model?: string; strength?: string; concentration?: string; dosage_form?: string
  container_size?: string; bundle_specification?: string; transaction_evidence_lineage?: string; resolution_policy?: string
  product_raw?: string; transaction_evidence?: string; observed_quantity?: number | null; estimated_quantity?: number | null
  product?: string; period?: string; date?: string; revenue?: number | null
  positive_sales?: number | null; returns_value?: number | null; quantity?: number | null; evidence?: string; product_evidence?: string
}

/** Group by warehouse reporting ID; legacy fixture labels remain a compatibility path. */
export function descriptivePortfolio(rows: ProductSalesRow[], basis: 'net' | 'positive_sales_candidate' = 'net', category = 'All') {
  const totals = new Map<string, { id: string; metadata: ProductSalesRow; aliases: Set<string>; lineage: Set<string>; name: string; revenue: number; quantity: number | null; positiveSales: number; returnsValue: number; periods: Set<string>; provenance: Set<string> }>()
  let estimatedRows = 0
  let unavailableRows = 0
  let missingContributionRows = 0
  for (const row of rows) {
    if (category !== 'All' && (row.category || 'Unclassified') !== category) continue
    if (row.evidence === 'estimate') { estimatedRows++; continue }
    if (row.revenue == null || !Number.isFinite(Number(row.revenue))) { unavailableRows++; continue }
    const name = String(row.canonical_title || row.product || '').trim() || 'Unspecified product'
    const id = row.canonical_group_id || name
    const total = totals.get(id) || { id, metadata: row, aliases: new Set<string>(), lineage: new Set<string>(), name, revenue: 0, quantity: null, positiveSales: 0, returnsValue: 0, periods: new Set<string>(), provenance: new Set<string>() }
    if (row.transaction_evidence_lineage) total.lineage.add(row.transaction_evidence_lineage)
    total.aliases.add(row.product_raw || row.product || name)
    total.provenance.add(row.transaction_evidence || row.product_evidence || "source_label_unverified")
    total.revenue += Number(row.revenue)
    if (row.positive_sales == null || row.returns_value == null || !Number.isFinite(Number(row.positive_sales)) || !Number.isFinite(Number(row.returns_value)) || Number(row.positive_sales) < 0 || Number(row.returns_value) > 0 || Math.abs(Number(row.positive_sales) + Number(row.returns_value) - Number(row.revenue)) > 0.011) missingContributionRows++
    else { total.positiveSales += Number(row.positive_sales); total.returnsValue += Number(row.returns_value) }
    const quantity = row.canonical_group_id ? row.observed_quantity : row.quantity
    if (row.item_kind !== 'service' && quantity != null && Number.isFinite(Number(quantity))) total.quantity = (total.quantity ?? 0) + Number(quantity)
    if (row.period || row.date) total.periods.add(String(row.period || row.date).slice(0, 7))
    totals.set(id, total)
  }
  const contribution = (row: {revenue: number; positiveSales: number}) => basis === 'positive_sales_candidate' ? row.positiveSales : row.revenue
  const sorted = [...totals.values()].sort((a, b) => contribution(b) - contribution(a) || a.id.localeCompare(b.id))
  const revenue = sorted.reduce((sum, row) => sum + row.revenue, 0)
  const negativeProducts = sorted.filter(row => row.revenue < 0).length
  const contributionTotal = sorted.reduce((sum, row) => sum + contribution(row), 0)
  const abcAvailable = contributionTotal > 0 && (basis === 'positive_sales_candidate' ? missingContributionRows === 0 : negativeProducts === 0 && unavailableRows === 0)
  let cumulative = 0
  const products = sorted.map((row, index) => {
    const shareBefore = abcAvailable ? cumulative / contributionTotal : null
    cumulative += contribution(row)
    const cumulativeShare = abcAvailable ? cumulative / contributionTotal * 100 : null
    // Include the item crossing each cutoff in the class it started in.
    // Keep aligned with backend revenueAbc; epsilon stabilizes exact money cutoffs.
    const abc = shareBefore == null || contribution(row) <= 0 ? 'Unclassified' : shareBefore < 0.8 - 1e-10 ? 'A' : shareBefore < 0.95 - 1e-10 ? 'B' : 'C'
    return { id: row.id, metadata: row.metadata, aliases: [...row.aliases].sort(), lineage: [...row.lineage].sort(), name: row.name, rank: index + 1, revenue: row.revenue, positiveSales: row.positiveSales, returnsValue: row.returnsValue, quantity: row.quantity,
      productEvidence: [...row.provenance].sort().join("; "), observedMonths: row.periods.size, share: contributionTotal > 0 ? contribution(row) / contributionTotal * 100 : null,
      cumulativeShare, abc }
  })
  return { products, unresolvedCount: products.filter(r => r.metadata.identity_status !== 'approved').length, unresolvedRevenue: products.filter(r => r.metadata.identity_status !== 'approved').reduce((sum,r)=>sum+r.revenue,0), revenue, contributionTotal, basis, missingContributionRows, negativeProducts, estimatedRows, unavailableRows, abcAvailable }
}
