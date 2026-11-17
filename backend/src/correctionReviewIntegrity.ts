import { createHash } from 'node:crypto'
import { CorrectionSummary, decimalCents, parseCorrectionRequest } from './intakeCorrection'

export class ReviewIntegrityError extends Error {}
const fail = (): never => { throw new ReviewIntegrityError('Correction review schema, accounting, scope or digest is invalid.') }
const controls = ['before', 'removed', 'added', 'after'] as const
const fields = ['record_count', 'net_sales_php', 'gross_profit_known_php', 'gross_profit_known_records', 'gross_profit_missing_records'] as const
type Controls = Record<typeof controls[number], CorrectionSummary>
const object = (value: unknown, keys: readonly string[]): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join('|') !== [...keys].sort().join('|')) return fail()
  return value as Record<string, unknown>
}
const count = (value: unknown, max = 200000): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > max) return fail()
  return value
}
const digest = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) return fail()
  return value
}
const money = (value: unknown): string => {
  if (typeof value !== 'string' || !/^-?(?:0|[1-9][0-9]{0,19})\.[0-9]{2}$/.test(value) || value === '-0.00') return fail()
  return value
}
const summary = (value: unknown): CorrectionSummary => {
  const v = object(value, fields)
  const result = { record_count: count(v.record_count), net_sales_php: money(v.net_sales_php), gross_profit_known_php: money(v.gross_profit_known_php), gross_profit_known_records: count(v.gross_profit_known_records), gross_profit_missing_records: count(v.gross_profit_missing_records) }
  if (result.gross_profit_known_records + result.gross_profit_missing_records !== result.record_count || !result.record_count && decimalCents(result.net_sales_php) !== 0n || !result.gross_profit_known_records && decimalCents(result.gross_profit_known_php) !== 0n) return fail()
  return result
}
const amount = (s: CorrectionSummary, field: typeof fields[number]) => typeof s[field] === 'string' ? decimalCents(s[field] as string) : BigInt(s[field])
const same = (a: CorrectionSummary, b: CorrectionSummary) => fields.every(field => a[field] === b[field])
const empty = (s: CorrectionSummary) => s.record_count === 0 && fields.every(field => amount(s, field) === 0n)
const reconcile = (value: unknown): Controls => {
  const v = object(value, controls)
  const result = { before: summary(v.before), removed: summary(v.removed), added: summary(v.added), after: summary(v.after) }
  for (const field of fields) if (amount(result.before, field) - amount(result.removed, field) + amount(result.added, field) !== amount(result.after, field)) return fail()
  if (result.removed.record_count > result.before.record_count) return fail()
  return result
}
const reference = (value: unknown) => {
  const v = object(value, ['ingestion_id', 'source_sha256', 'record_count'])
  const result = { ingestion_id: digest(v.ingestion_id), source_sha256: digest(v.source_sha256), record_count: count(v.record_count, 100000) }
  if (!result.record_count) return fail()
  return result
}

/** Local consistency only. An editable hash is neither source revalidation nor approval. */
export function verifyCorrectionReview(value: unknown) {
  try {
    const v = object(value, ['schema_version', 'review_kind', 'candidate_only', 'published', 'release_authorized', 'completeness', 'period', 'previous', 'corrected', 'category_reference_sha256', 'controls', 'scope_comparison', 'monthly', 'plan_sha256'])
    if (v.schema_version !== 1 || v.review_kind !== 'complete_period_replacement_preview' || v.candidate_only !== true || v.published !== false || v.release_authorized !== false || v.completeness !== 'operator_assertion_not_independently_verified') return fail()
    const previous = reference(v.previous), corrected = reference(v.corrected), period = object(v.period, ['start', 'end'])
    if (previous.ingestion_id === corrected.ingestion_id) return fail()
    const request = parseCorrectionRequest({ corrected_ingestion_id: corrected.ingestion_id, period_start: period.start, period_end: period.end, complete_period_asserted: true })
    const global = reconcile(v.controls), comparison = object(v.scope_comparison, ['unchanged_records', 'removed_records', 'added_records'])
    const scoped = { unchanged_records: count(comparison.unchanged_records, 100000), removed_records: count(comparison.removed_records, 100000), added_records: count(comparison.added_records, 100000) }
    if (!global.removed.record_count || global.before.record_count !== previous.record_count || global.added.record_count !== corrected.record_count || scoped.unchanged_records + scoped.removed_records !== global.removed.record_count || scoped.unchanged_records + scoped.added_records !== global.added.record_count) return fail()
    if (!Array.isArray(v.monthly) || !v.monthly.length || v.monthly.length > 1200) return fail()
    let last = ''
    const monthly = v.monthly.map(row => {
      const m = object(row, ['month', ...controls])
      if (typeof m.month !== 'string' || !/^[2-9][0-9]{3}-(?:0[1-9]|1[0-2])$/.test(m.month) || m.month < '2017-01' || m.month <= last) return fail()
      last = m.month
      const c = reconcile(Object.fromEntries(controls.map(key => [key, m[key]])))
      if (!c.before.record_count && !c.added.record_count) return fail()
      if (m.month >= request.period_start && m.month <= request.period_end) {
        if (!same(c.removed, c.before) || !same(c.after, c.added)) return fail()
      } else if (!empty(c.removed) || !empty(c.added) || !same(c.after, c.before)) return fail()
      return { month: m.month, ...c }
    })
    for (const control of controls) for (const field of fields) if (monthly.reduce((total, month) => total + amount(month[control], field), 0n) !== amount(global[control], field)) return fail()
    // Reconstruct the gateway's stable property order; pretty printing/reordering is harmless.
    const canonical = { schema_version: 1, review_kind: 'complete_period_replacement_preview', candidate_only: true, published: false, release_authorized: false, completeness: 'operator_assertion_not_independently_verified', period: { start: request.period_start, end: request.period_end }, previous, corrected, category_reference_sha256: digest(v.category_reference_sha256), controls: global, scope_comparison: scoped, monthly }
    const expected = createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
    if (expected !== digest(v.plan_sha256)) return fail()
    return { status: 'PASS_LOCAL_REVIEW_INTEGRITY', plan_sha256: expected, source_revalidated: false, completeness_verified: false, release_authorized: false, published: false, monthly_controls_checked: monthly.length }
  } catch (error) {
    if (error instanceof ReviewIntegrityError) throw error
    return fail()
  }
}
