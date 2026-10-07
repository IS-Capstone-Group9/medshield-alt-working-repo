// undefined means no filter; null means an invalid supplied query value.
export function parseMonthlyYear(value: unknown): string | undefined | null {
  if (value === undefined) return undefined
  if (typeof value !== 'string') return null
  const year = value.trim()
  return /^[1-9][0-9]{3}$/.test(year) ? year : null
}

export function filterMonthlyYear<T extends { period?: unknown }>(rows: T[], year?: string): T[] {
  return year === undefined
    ? rows
    : rows.filter((row) => String(row.period ?? '').startsWith(`${year}-`))
}

/** Reject repeated/structured filters rather than silently broadening scope. */
export function invalidScalarQueryKey(query: Record<string, unknown>): string | undefined {
  return Object.keys(query).find(key => typeof query[key] !== 'string')
}
