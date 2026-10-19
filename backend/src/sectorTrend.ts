export const BUYER_SECTORS = ['Government', 'Private', 'Internal', 'Unknown'] as const
type SectorRecord = {
  date: string | null; sector: string | null; revenue: number | null; income: number | null
  margin_revenue_basis: number | null; row_count: number; transaction_evidence: string | null
}

/** Aggregate eligible Gold measures; an absent group remains absent, not observed zero. */
export function buildSectorTrend(rows: SectorRecord[]) {
  type Total = { date: string; sector: string; revenue: number | null; income: number | null
    margin_revenue_basis: number | null; row_count: number; original_source_rows: number; adjusted_estimated_rows: number }
  const groups = new Map<string, Total>()
  for (const row of rows) {
    if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !BUYER_SECTORS.includes(row.sector as typeof BUYER_SECTORS[number])) throw new Error('Invalid sector trend dimension')
    for (const sector of ['All', row.sector!]) {
      const key = `${sector}:${row.date}`
      const total = groups.get(key) ?? { date: row.date, sector, revenue: null, income: null, margin_revenue_basis: null, row_count: 0, original_source_rows: 0, adjusted_estimated_rows: 0 }
      for (const measure of ['revenue', 'income', 'margin_revenue_basis'] as const) {
        if (row[measure] === null) continue
        const micros = Math.round(row[measure]! * 1_000_000)
        const sum = (total[measure] ?? 0) + micros
        if (!Number.isSafeInteger(micros) || !Number.isSafeInteger(sum)) throw new Error('Invalid sector trend amount')
        total[measure] = sum
      }
      total.row_count += row.row_count
      if (row.transaction_evidence === 'original_source_detail') total.original_source_rows += row.row_count
      if (row.transaction_evidence === 'adjusted_estimated_source') total.adjusted_estimated_rows += row.row_count
      groups.set(key, total)
    }
  }
  return [...groups.values()].sort((a,b) => a.date.localeCompare(b.date) || a.sector.localeCompare(b.sector)).map(row => ({
    ...row, period: row.date.slice(0, 7), evidence: 'actual',
    revenue: row.revenue === null ? null : row.revenue / 1_000_000,
    income: row.income === null ? null : row.income / 1_000_000,
    margin_revenue_basis: row.margin_revenue_basis === null ? null : row.margin_revenue_basis / 1_000_000,
  }))
}
