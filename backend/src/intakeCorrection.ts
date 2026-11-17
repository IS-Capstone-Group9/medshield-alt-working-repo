/** Pure, read-only reconciliation of two complete-file candidate snapshots. */
export class CorrectionReviewError extends Error {}
export type CorrectionRequest = { corrected_ingestion_id: string; period_start: string; period_end: string; complete_period_asserted: true }
export type CorrectionSummary = { record_count: number; net_sales_php: string; gross_profit_known_php: string; gross_profit_known_records: number; gross_profit_missing_records: number }
export const formatCents = (n: bigint) => `${n < 0n ? '-' : ''}${(n < 0n ? -n : n) / 100n}.${String((n < 0n ? -n : n) % 100n).padStart(2, '0')}`
export function decimalCents(value: string): bigint {
  if (typeof value !== 'string' || !/^-?[0-9]{1,20}(?:\.[0-9]{1,2})?$/.test(value)) throw new CorrectionReviewError('Candidate money must be a signed decimal with at most two decimal places.')
  const negative = value.startsWith('-'), [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.')
  const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
  return negative ? -amount : amount
}
const monthIndex = (month: unknown): number => {
  if (typeof month !== 'string' || !/^(?:[2-9][0-9]{3})-(?:0[1-9]|1[0-2])$/.test(month) || month < '2017-01') throw new CorrectionReviewError('Use a valid calendar month from 2017 onward.')
  return Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1
}
export function parseCorrectionRequest(value: unknown): CorrectionRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CorrectionReviewError('Provide a correction review request.')
  const input = value as Record<string, unknown>
  if (Object.keys(input).sort().join(',') !== 'complete_period_asserted,corrected_ingestion_id,period_end,period_start' || typeof input.corrected_ingestion_id !== 'string' || !/^[a-f0-9]{64}$/.test(input.corrected_ingestion_id)) throw new CorrectionReviewError('Provide the corrected candidate ID and declared complete-period fields only.')
  if (input.complete_period_asserted !== true) throw new CorrectionReviewError('Confirm that the corrected file represents the complete declared period. This assertion is not independent completeness verification.')
  const from = monthIndex(input.period_start), to = monthIndex(input.period_end)
  if (to < from || to - from >= 1200) throw new CorrectionReviewError('The correction period must be ordered and no longer than 1,200 months.')
  return { corrected_ingestion_id: input.corrected_ingestion_id, period_start: input.period_start as string, period_end: input.period_end as string, complete_period_asserted: true }
}
type Row = { month: string; net: bigint; profit: bigint | null; key: string }
function checkedRows(rows: string[][]): Row[] {
  const references = new Set<string>()
  if (rows.length < 2 || rows.length > 100001) throw new CorrectionReviewError('Each candidate must have 1–100,000 source records.')
  return rows.slice(1).map(row => {
    if (row.length !== 8 || !row[0].trim() || references.has(row[0]) || !row[3].trim() || !row[4].trim()) throw new CorrectionReviewError('Candidate has missing or duplicate file-local references, product or area.')
    references.add(row[0])
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(row[1]) || row[1] < '2017-01-01') throw new CorrectionReviewError('Candidate contains an invalid delivery date.')
    const date = new Date(row[1] + 'T00:00:00Z')
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== row[1]) throw new CorrectionReviewError('Candidate contains an invalid delivery date.')
    if (!/^-?[0-9]{1,14}(?:\.[0-9]{1,2})?$/.test(row[6]) || row[7] !== '' && !/^-?[0-9]{1,14}(?:\.[0-9]{1,2})?$/.test(row[7]) || row[5] !== '' && !/^-?[0-9]{1,14}(?:\.[0-9]{1,6})?$/.test(row[5])) throw new CorrectionReviewError('Candidate contains invalid source money or reported quantity.')
    return { month: row[1].slice(0, 7), net: decimalCents(row[6]), profit: row[7] === '' ? null : decimalCents(row[7]), key: JSON.stringify(row.slice(1)) }
  })
}
const summary = (rows: Row[]): CorrectionSummary => ({
  record_count: rows.length,
  net_sales_php: formatCents(rows.reduce((sum, r) => sum + r.net, 0n)),
  gross_profit_known_php: formatCents(rows.reduce((sum, r) => sum + (r.profit ?? 0n), 0n)),
  gross_profit_known_records: rows.filter(r => r.profit !== null).length,
  gross_profit_missing_records: rows.filter(r => r.profit === null).length,
})
/** Empty-set amounts are additive controls, never assertions of observed zero sales. */
export function reconcileCorrection(previousRows: string[][], correctedRows: string[][], request: CorrectionRequest) {
  const previous = checkedRows(previousRows), corrected = checkedRows(correctedRows)
  const within = (r: Row) => r.month >= request.period_start && r.month <= request.period_end
  if (corrected.some(r => !within(r))) throw new CorrectionReviewError('Corrected candidate contains rows outside the declared complete period.')
  const removed = previous.filter(within), retained = previous.filter(r => !within(r))
  if (!removed.length) throw new CorrectionReviewError('The declared period contains no previous candidate records to replace.')
  const after = [...retained, ...corrected]
  const controls = { before: summary(previous), removed: summary(removed), added: summary(corrected), after: summary(after) }
  const counts = new Map<string, number>()
  for (const row of removed) counts.set(row.key, (counts.get(row.key) ?? 0) + 1)
  let unchanged = 0
  for (const row of corrected) {
    const remaining = counts.get(row.key) ?? 0
    if (remaining) { unchanged++; counts.set(row.key, remaining - 1) }
  }
  const months = [...new Set([...previous, ...corrected].map(r => r.month))].sort()
  if (months.length > 1200) throw new CorrectionReviewError('Candidate history exceeds the 1,200 observed-month review limit. Use a reviewed bounded snapshot; no history has been truncated.')
  // Partition once; scanning all source rows once per month would grow quadratically.
  const groups = (rows: Row[]) => {
    const grouped = new Map<string, Row[]>()
    for (const row of rows) { const bucket = grouped.get(row.month) ?? []; bucket.push(row); grouped.set(row.month, bucket) }
    return grouped
  }
  const beforeMonths = groups(previous), removedMonths = groups(removed), addedMonths = groups(corrected), afterMonths = groups(after)
  return { controls, scope_comparison: { unchanged_records: unchanged, removed_records: removed.length - unchanged, added_records: corrected.length - unchanged },
    monthly: months.map(month => ({ month, before: summary(beforeMonths.get(month) ?? []), removed: summary(removedMonths.get(month) ?? []), added: summary(addedMonths.get(month) ?? []), after: summary(afterMonths.get(month) ?? []) })) }
}
