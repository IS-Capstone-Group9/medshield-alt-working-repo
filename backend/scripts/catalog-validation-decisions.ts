/** Bind reviewed labels as data so Spark SQL never interprets their punctuation. */
export function categoryDecisionCte(decisions: Array<Record<string, string>>): {
  statementPrefix: string
  parameters: Array<{ name: string; value: string; type: 'STRING' }>
} {
  if (!Array.isArray(decisions) || decisions.length < 1 || decisions.length > 500) {
    throw new Error('Catalog decision chunks must contain between 1 and 500 rows')
  }
  const fields = ['normalized_product', 'product_category', 'evidence_source'] as const
  const rows = decisions.map((decision, index) => {
    if (!decision || typeof decision !== 'object' || Array.isArray(decision)) {
      throw new Error(`Catalog decision ${index} must be an object`)
    }
    for (const field of fields) {
      if (typeof decision[field] !== 'string' || !decision[field].trim()) {
        throw new Error(`Catalog decision ${index} requires a nonempty string ${field}`)
      }
    }
    return {
      normalized_product: decision.normalized_product,
      product_category: decision.product_category,
      evidence_source: decision.evidence_source,
    }
  })
  return {
    statementPrefix: `WITH d AS (
  SELECT * FROM inline(from_json(
    :catalog_decisions,
    'ARRAY<STRUCT<normalized_product:STRING,product_category:STRING,evidence_source:STRING>>',
    map('mode','FAILFAST')
  ))
)`,
    parameters: [{ name: 'catalog_decisions', value: JSON.stringify(rows), type: 'STRING' }],
  }
}
