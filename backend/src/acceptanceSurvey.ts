/**
 * Client acceptance survey (SO5): System Usability Scale (10 items, 1-5) plus three usefulness items (1-5).
 * Responses are stored as audit events (action CLIENT_ACCEPTANCE_SURVEY), never as analytical data.
 * SUS score = 2.5 x (sum over odd items of (x - 1) + sum over even items of (5 - x)), range 0-100; 68 is the
 * commonly used average benchmark.
 */
export const SURVEY_ACTION = 'CLIENT_ACCEPTANCE_SURVEY'
export const SUS_ITEMS = [
  'I think that I would like to use this system frequently.',
  'I found the system unnecessarily complex.',
  'I thought the system was easy to use.',
  'I think that I would need the support of a technical person to be able to use this system.',
  'I found the various functions in this system were well integrated.',
  'I thought there was too much inconsistency in this system.',
  'I would imagine that most people would learn to use this system very quickly.',
  'I found the system very cumbersome to use.',
  'I felt very confident using the system.',
  'I needed to learn a lot of things before I could get going with this system.',
] as const
export const USEFULNESS_ITEMS = [
  'The dashboard helps me understand our sales and product situation.',
  'The stock and season information would help me plan purchases.',
  'I trust the results because the sources and limits are shown.',
] as const
export const ROLES = ['owner_or_manager', 'purchasing_or_inventory', 'sales', 'pharmacist', 'other'] as const

export class SurveyInputError extends Error {}
export type SurveyResponse = {sus: number[]; usefulness: number[]; role: typeof ROLES[number]; comment: string}

const likert = (v: unknown) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5
export function parseSurvey(body: unknown): SurveyResponse {
  const b = body as Record<string, unknown> | null
  if (!b || typeof b !== 'object') throw new SurveyInputError('Survey body must be an object.')
  const extra = Object.keys(b).filter(k => !['sus', 'usefulness', 'role', 'comment'].includes(k))
  if (extra.length) throw new SurveyInputError('Unexpected survey fields.')
  if (!Array.isArray(b.sus) || b.sus.length !== 10 || !b.sus.every(likert)) throw new SurveyInputError('Answer all 10 usability items with 1-5.')
  if (!Array.isArray(b.usefulness) || b.usefulness.length !== 3 || !b.usefulness.every(likert)) throw new SurveyInputError('Answer all 3 usefulness items with 1-5.')
  if (!ROLES.includes(b.role as typeof ROLES[number])) throw new SurveyInputError('Choose a role.')
  const comment = b.comment === undefined ? '' : b.comment
  if (typeof comment !== 'string' || comment.length > 1000) throw new SurveyInputError('Comment must be text up to 1,000 characters.')
  return {sus: b.sus as number[], usefulness: b.usefulness as number[], role: b.role as SurveyResponse['role'], comment: comment.trim()}
}

export function susScore(sus: number[]) {
  return 2.5 * sus.reduce((n, x, i) => n + (i % 2 === 0 ? x - 1 : 5 - x), 0)
}

export function summarizeSurveys(details: string[]) {
  const rows = details.flatMap(d => { try { const r = JSON.parse(d); return Array.isArray(r.sus) && r.sus.length === 10 ? [r as SurveyResponse] : [] } catch { return [] } })
  const scores = rows.map(r => susScore(r.sus))
  const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
  const sorted = [...scores].sort((a, b) => a - b)
  return {responses: rows.length, sus_mean: mean(scores), sus_median: sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2) : null,
    sus_benchmark: 68, at_or_above_benchmark: scores.filter(s => s >= 68).length,
    usefulness_mean: USEFULNESS_ITEMS.map((item, i) => ({item, mean: mean(rows.map(r => r.usefulness[i]))})),
    by_role: Object.fromEntries(ROLES.map(role => [role, rows.filter(r => r.role === role).length])),
    comments: rows.filter(r => r.comment).map(r => r.comment).slice(-20),
    note: 'Self-reported acceptance survey; small samples are descriptive only.'}
}
