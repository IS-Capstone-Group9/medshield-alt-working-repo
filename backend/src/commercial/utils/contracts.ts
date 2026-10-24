import Decimal from 'decimal.js'

export class CommercialError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message) }
}
export const money = (value: Decimal.Value) => new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2)
export const monthNumber = (period: string) => Number(period.slice(0, 4)) * 12 + Number(period.slice(5, 7)) - 1
export function addMonths(period: string, offset: number) {
  const value = monthNumber(period) + offset
  return `${Math.floor(value / 12)}-${String(value % 12 + 1).padStart(2, '0')}`
}
export function endOfMonth(period: string) { return new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0)).toISOString().slice(0, 10) }
export function poDeadline(period: string, leadDays = 60, now = new Date()) {
  const date = new Date(`${period}-01T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - leadDays)
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const remaining = Math.round((date.getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000)
  return { poCutoffDate: date.toISOString().slice(0, 10), leadTimeDays: leadDays, rule: 'calendar_days_before_first_day_of_target_month', alertStatus: remaining < 0 ? 'URGENT_ACTION_REQUIRED' : remaining <= 14 ? 'APPROACHING_CUTOFF' : 'ON_SCHEDULE' }
}
export function balancedComponents(observed: Decimal.Value, baseline: Decimal.Value, seasonal: Decimal.Value, residual: Decimal.Value) {
  const original = new Decimal(observed).minus(baseline).minus(seasonal).minus(residual)
  if (original.abs().gt('0.000001')) throw new CommercialError(503, 'DECOMPOSITION_MISMATCH', 'Source decomposition does not reconcile.')
  const adjustment = new Decimal(money(observed)).minus(money(baseline)).minus(money(seasonal)).minus(money(residual))
  return { baselineTrend: money(baseline), seasonalCycle: money(seasonal), unexplainedVariance: money(new Decimal(money(residual)).plus(adjustment)), roundingAdjustment: money(adjustment), reconciliationChecksum: '0.00' as const }
}
