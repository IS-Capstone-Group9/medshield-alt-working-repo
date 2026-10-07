/** Validate the decision separately from the numerical reconciliation receipt. */
export function validateCoverage(coverage: any, identity: { dataset_id: unknown; fact_delta_version: number; descriptive_receipt_sha256: string }, periods: string[]) {
  const fail = (message: string): never => { throw new Error(`Invalid coverage receipt: ${message}`) }
  if (!coverage || typeof coverage !== 'object') fail('object required')
  for (const key of ['dataset_id', 'fact_delta_version', 'descriptive_receipt_sha256'] as const) if (coverage[key] !== identity[key]) fail(`${key} mismatch`)
  for (const field of ['reviewer', 'reviewed_at', 'evidence_reference']) if (typeof coverage[field] !== 'string' || !coverage[field].trim()) fail(`${field} required`)
  if (!Number.isFinite(Date.parse(coverage.reviewed_at))) fail('invalid review date')
  for (const field of ['training_approved', 'publication_approved']) if (typeof coverage[field] !== 'boolean') fail(`${field} must be boolean`)
  if (coverage.publication_approved && !coverage.training_approved) fail('publication cannot precede training acceptance')
  if (!coverage.periods || Array.isArray(coverage.periods) || typeof coverage.periods !== 'object') fail('period decisions required')
  const known = new Set(periods)
  for (const [period, raw] of Object.entries(coverage.periods)) {
    const row = raw as any
    if (!known.has(period)) fail(`period ${period} is outside this snapshot`)
    if (!row || typeof row.period_closed !== 'boolean' || !['complete', 'partial', 'unknown'].includes(row.coverage_status)) fail(`invalid decision for ${period}`)
    if (row.confirmed_zero_activity !== undefined && typeof row.confirmed_zero_activity !== 'boolean') fail(`invalid zero decision for ${period}`)
    if (row.confirmed_zero_activity && (!row.period_closed || row.coverage_status !== 'complete')) fail(`zero activity needs a closed complete period: ${period}`)
  }
  if (coverage.training_approved && !Object.values(coverage.periods).some((r: any) => r.period_closed && r.coverage_status === 'complete')) fail('no accepted complete training periods')
  return coverage
}
