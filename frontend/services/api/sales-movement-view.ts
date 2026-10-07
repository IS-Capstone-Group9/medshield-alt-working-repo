type MonthlySale = { period?: unknown; revenue?: unknown; evidence?: unknown; missing?: unknown }

/** Adjacent observed calendar months only; zero is observed and gaps are never zero-filled. */
export function salesMonthlyMovement(rows: MonthlySale[], periods: string[]) {
  const totals = new Map<string, number>()
  for (const row of rows) {
    const period = String(row.period || '')
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || row.missing
      || row.evidence === 'estimate' || row.evidence === 'unavailable'
      || row.revenue == null || row.revenue === '' || !Number.isFinite(Number(row.revenue))) continue
    totals.set(period, (totals.get(period) || 0) + Number(row.revenue))
  }
  const selected = new Set(periods)
  return [...selected].sort().map(period => {
    const year = Number(period.slice(0, 4)), month = Number(period.slice(5, 7))
    const previousPeriod = (month === 1 ? year - 1 : year) + '-' + String(month === 1 ? 12 : month - 1).padStart(2, '0')
    const current = totals.get(period) ?? null
    const previous = selected.has(previousPeriod) ? totals.get(previousPeriod) ?? null : null
    const delta = current !== null && previous !== null ? current - previous : null
    return { period, previousPeriod, current, previous, delta, rate: delta !== null && previous !== null && previous > 0 ? delta / previous * 100 : null }
  })
}
