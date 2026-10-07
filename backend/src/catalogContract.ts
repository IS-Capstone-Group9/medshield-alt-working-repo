import { revenueAbc } from './descriptiveMetrics'

/** Metadata is selected from the same pinned fact as the measures. Legacy releases
 * have no verified catalog contract; their existing source keys remain unresolved. */
export function catalogProjection(policy: string): string {
  if (policy === 'sales_restart_gold_v7_independent_catalog') return `canonical_group_id, canonical_sku,
    canonical_title, display_category AS category, identity_status, category_status, item_kind,
    unit_of_measure, packaging_unit, pack_count, contained_unit, brand, manufacturer, model,
    strength, concentration, dosage_form, container_size, bundle_specification,
    transaction_evidence, transaction_evidence_lineage, resolution_policy`
  return `CONCAT('RAW:', product_key) AS canonical_group_id, CAST(NULL AS STRING) AS canonical_sku,
    normalized_product AS canonical_title,
    CASE WHEN product_category IN ('medicine','medical_supply','medical_equipment') THEN 'Medical'
      WHEN product_category = 'non_medical' THEN 'Non-Medical' ELSE 'Unclassified' END AS category,
    'needs_review' AS identity_status, 'needs_review' AS category_status, 'unknown' AS item_kind,
    unit_of_measure, CAST(NULL AS STRING) AS packaging_unit, CAST(NULL AS STRING) AS pack_count,
    CAST(NULL AS STRING) AS contained_unit, CAST(NULL AS STRING) AS brand, CAST(NULL AS STRING) AS manufacturer,
    CAST(NULL AS STRING) AS model, CAST(NULL AS STRING) AS strength, CAST(NULL AS STRING) AS concentration,
    CAST(NULL AS STRING) AS dosage_form, CAST(NULL AS STRING) AS container_size, CAST(NULL AS STRING) AS bundle_specification,
    CASE WHEN is_adjusted_source THEN 'adjusted_estimated_source' ELSE 'original_source_detail' END AS transaction_evidence,
    CONCAT_WS('|', source_file_sha256, source_record_id, source_adjustment_policy) AS transaction_evidence_lineage,
    'legacy_unresolved' AS resolution_policy`
}

export class CatalogInputError extends Error {}

export function parseCatalogCategory(value: unknown): string {
  if (value === undefined) return 'All'
  if (typeof value !== 'string' || !['All', 'Medical', 'Non-Medical', 'Unclassified'].includes(value)) {
    throw new CatalogInputError('category must be All, Medical, Non-Medical, or Unclassified')
  }
  return value
}

export function catalogProducts(rows: Array<Record<string, unknown>>, category = 'All', limit = 15) {
  const groups = new Map<string, {metadata: Record<string, unknown>; aliases: Set<string>; provenance: Set<string>; lineage: Set<string>; revenue: number | null; positive: number; returns: number; quantity: number | null; income: number | null; estimated: number | null; verified: number | null}>()
  for (const row of rows) {
    if (category !== 'All' && row.category !== category) continue
    const id = String(row.canonical_group_id)
    if (!/^(RAW|SKU):.+/.test(id)) throw new Error('Missing stable product identity')
    const group = groups.get(id) || { metadata: row, aliases: new Set<string>(), provenance: new Set<string>(), lineage: new Set<string>(), revenue: null, positive: 0, returns: 0, quantity: null, income: null, estimated: null, verified: null }
    group.aliases.add(String(row.product_raw || row.product))
    if (row.transaction_evidence_lineage) group.lineage.add(String(row.transaction_evidence_lineage))
    group.provenance.add(String(row.transaction_evidence))
    if (row.revenue != null) group.revenue = (group.revenue ?? 0) + Number(row.revenue)
    group.positive += Number(row.positive_sales || 0)
    group.returns += Number(row.returns_value || 0)
    if (row.observed_quantity != null && row.item_kind !== 'service') group.quantity = (group.quantity ?? 0) + Number(row.observed_quantity)
    if (row.income != null) group.income = (group.income ?? 0) + Number(row.income)
    if (row.item_kind !== 'service') {
      if (row.estimated_quantity != null) group.estimated = (group.estimated ?? 0) + Number(row.estimated_quantity)
      if (row.verified_quantity != null) group.verified = (group.verified ?? 0) + Number(row.verified_quantity)
    }
    groups.set(id, group)
  }
  const sorted = [...groups].sort((a,b) => b[1].positive - a[1].positive || a[0].localeCompare(b[0]))
  const denominator = sorted.reduce((sum, [, g]) => sum + g.positive, 0)
  let cumulative = 0
  const products = sorted.map(([id, g]) => {
    cumulative += g.positive
    const metadata = Object.fromEntries(['canonical_sku','canonical_title','category','category_status','item_kind',
      'unit_of_measure','packaging_unit','pack_count','contained_unit','brand','manufacturer','model','strength',
      'concentration','dosage_form','container_size','bundle_specification','resolution_policy'].map(key=>[key,g.metadata[key]]))
    return { ...metadata, identity_status: g.metadata.identity_status, canonical_group_id: id, product: g.metadata.canonical_title,
      original_aliases: [...g.aliases].sort(), transaction_provenance: [...g.provenance].sort(), transaction_lineage: [...g.lineage].sort(),
      revenue: g.revenue, positive_sales: g.positive, returns_value: g.returns, qty: g.quantity, income: g.income, estimated_qty: g.estimated, verified_qty: g.verified,
      pct_of_total: denominator > 0 ? g.positive / denominator * 100 : null,
      abc: revenueAbc(cumulative, denominator, g.positive), abc_policy: 'positive_sales_crossing_inclusive_v2_candidate' }
  })
  return { products: products.slice(0,limit), denominator, product_count: groups.size,
    unresolved_count: products.filter(row => row.identity_status !== 'approved').length,
    unresolved_revenue: products.filter(row => row.identity_status !== 'approved').reduce((sum, row) => sum + (row.revenue || 0), 0) }
}
