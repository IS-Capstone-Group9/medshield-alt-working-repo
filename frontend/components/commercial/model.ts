import type { DiagnosticContribution } from '@/types/diagnostics.types'

export const money = (value: number | null | undefined, compact = false) => value == null || !Number.isFinite(value) ? 'Unavailable' : new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', notation: compact ? 'compact' : 'standard', maximumFractionDigits: compact ? 1 : 2 }).format(value)
export const number = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? 'Unavailable' : value.toLocaleString('en-PH', { maximumFractionDigits: 2 })
export function addMonths(period: string, offset: number) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error('Choose a valid calendar month')
  const [year, month] = period.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + offset, 1))
  return date.toISOString().slice(0, 7)
}
export function monthEnd(period: string) {
  const [year, month] = period.split('-').map(Number)
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
}
export function periods(start: string, end: string) {
  const result: string[] = []
  for (let p = start; p <= end && result.length < 1200; p = addMonths(p, 1)) result.push(p)
  return result
}
export function cutoff(period: string, days: number) {
  const date = new Date(`${period}-01T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}
export function aggregateAnnual(rows: DiagnosticContribution[]) {
  const groups = new Map<string, DiagnosticContribution[]>()
  rows.forEach(row => { const year = row.key.slice(0, 4); groups.set(year, [...(groups.get(year) || []), row]) })
  return [...groups].map(([period, values]) => ({ period, actual: values.some(v => v.current == null) ? null : values.reduce((sum, v) => sum + v.current!, 0), prior: values.some(v => v.prior == null) ? null : values.reduce((sum, v) => sum + v.prior!, 0) }))
}
export type ChartPoint = { period: string; actual?: number | null; prior?: number | null; forecast?: number | null; lower?: number | null; upper?: number | null }
export type ForecastRow = { period: string; prediction: number | null; lower: number | null; upper: number | null; origin?: string; lead?: number; interval_reason?: string; interval_level?: number; interval?: { nominal_level?: number }; missing_reason?: string }
export type ForecastEvidence = {
  status: string; publication_status: string; origin: string | null; last_actual_period: string | null; run_id?: string; release_id?: string
  scope: { sector: string; product: string; metric: string; unit: string }
  source: { as_of?: string; checksum?: string }; limitations?: string[]; products: string[]
  actuals: { period: string; actual: number | null }[]; models: Record<string, string>
  views: Record<string, { models: Record<string, { forecast: ForecastRow[]; metrics?: { mae?: number | null; wape?: number | null; bias?: number | null; n?: number }; backtest?: ForecastRow[] }> }>
}
export function forecastPoints(data: ForecastEvidence, anchor: string, horizon: number, history: number, model: string): ChartPoint[] {
  const actuals = new Map(data.actuals.map(row => [row.period, row.actual]))
  // The warehouse owns forecast origin and supported leads. Never shift a prediction to another month.
  const predictions = new Map((data.views[String(horizon)]?.models[model]?.forecast || []).map(row => [row.period, row]))
  return periods(addMonths(anchor, history ? 1 - history : 1), addMonths(anchor, horizon)).map(period => {
    const row = period > anchor ? predictions.get(period) : undefined
    const band = row && row.lower != null && row.upper != null && row.lower <= row.upper && !row.interval_reason && (row.interval_level || row.interval?.nominal_level)
    return { period, actual: period <= anchor ? actuals.get(period) ?? null : null, prior: actuals.get(addMonths(period, -12)) ?? null, forecast: row?.prediction ?? null, lower: band ? row.lower : null, upper: band ? row.upper : null }
  })
}
export function csvText(headers: string[], rows: unknown[][], context: Record<string, unknown>) {
  const cell = (value: unknown) => { const text = String(value ?? ''); return '"' + (/^[=+\-@\t\r]/.test(text) ? "'" : '') + text.replace(/"/g, '""') + '"' }
  return '\uFEFF' + [[...headers, ...Object.keys(context)], ...rows.map(row => [...row, ...Object.values(context)])].map(row => row.map(cell).join(',')).join('\r\n')
}
export type PlanningInput = { demand: number; stock: number; pack: number; cost: number; capacity: number; budget: number; leadDays: number; bufferDays: number; shelfDays: number; multiplier: number }
export function plan(input: PlanningInput) {
  if (Object.values(input).some(value => !Number.isFinite(value) || value < 0) || input.pack <= 0 || input.cost <= 0 || input.shelfDays <= 0) return null
  if (['demand', 'stock', 'pack', 'capacity', 'leadDays', 'bufferDays', 'shelfDays'].some(key => !Number.isSafeInteger(input[key as keyof PlanningInput]))) return null
  const costCents = Math.round(input.cost * 100), budgetCents = Math.floor(input.budget * 100 + 1e-8)
  if (!Number.isSafeInteger(costCents) || !Number.isSafeInteger(budgetCents) || costCents < 1) return null
  const daily = input.demand * input.multiplier / 30
  const target = Math.ceil(daily * (input.leadDays + input.bufferDays + 30))
  const needed = Math.max(0, Math.ceil((target - input.stock) / input.pack))
  // Cap packs so projected unused stock at shelf expiry is at most 5% of total stock.
  const expiryCap = Math.max(0, Math.floor((daily * input.shelfDays / 0.95 - input.stock) / input.pack))
  const packs = Math.min(needed, input.capacity, Math.floor(budgetCents / costCents), expiryCap)
  const total = input.stock + packs * input.pack
  return { packs, spend: packs * costCents / 100, deficit: Math.max(0, needed * costCents - budgetCents) / 100, unmet: Math.max(0, target - total), reorder: Math.ceil(daily * (input.leadDays + input.bufferDays)), waste: total ? Math.max(0, total - daily * input.shelfDays) / total * 100 : 0, supplierLimited: input.capacity < needed, expiryLimited: expiryCap < needed }
}

export function rankProducts(input: DiagnosticContribution[]) {
  const rows = [...input].sort((a, b) => (b.current ?? -Infinity) - (a.current ?? -Infinity))
  const total = rows.reduce((sum, row) => sum + Math.max(0, row.current ?? 0), 0)
  let cumulative = 0
  return rows.map(row => {
    const before = total ? cumulative / total : 0
    cumulative += Math.max(0, row.current ?? 0)
    return { ...row, share: total ? Math.max(0, row.current ?? 0) / total * 100 : null, cumulative: total ? cumulative / total * 100 : null, abc: row.current == null || row.current <= 0 ? '—' : before < 0.8 ? 'A' : before < 0.95 ? 'B' : 'C' }
  })
}
