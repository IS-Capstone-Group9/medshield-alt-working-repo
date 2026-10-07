export type StlRow = { period: string; observed: number; trend: number; seasonal: number; residual: number; segment_start: string; segment_end: string }

/** Calendar gaps and segment boundaries are plot breaks, never estimated values. */
export function stlViewModel(input: StlRow[]) {
  const rows = [...input].sort((a, b) => a.period.localeCompare(b.period))
  if (!rows.length) throw new Error('No qualifying STL history')
  const ordinal = (period: string) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error('Invalid STL period')
    return Number(period.slice(0, 4)) * 12 + Number(period.slice(5, 7)) - 1
  }
  const labels: string[] = []
  const observed: Array<number | null> = [], trend: Array<number | null> = []
  const seasonal: Array<number | null> = [], residual: Array<number | null> = []
  const gap = (label: string) => { labels.push(label); observed.push(null); trend.push(null); seasonal.push(null); residual.push(null) }
  rows.forEach((row, i) => {
    const previous = rows[i - 1]
    const month = ordinal(row.period)
    if (previous) {
      const previousMonth = ordinal(previous.period)
      if (month <= previousMonth || month - previousMonth > 2400) throw new Error('Invalid STL sequence')
      for (let missing = previousMonth + 1; missing < month; missing++) {
        gap(Math.floor(missing / 12) + '-' + String(missing % 12 + 1).padStart(2, '0'))
      }
      if (month === previousMonth + 1 && (row.segment_start !== previous.segment_start || row.segment_end !== previous.segment_end)) gap('Segment boundary')
    }
    labels.push(row.period); observed.push(row.observed); trend.push(row.trend); seasonal.push(row.seasonal); residual.push(row.residual)
  })
  const latest = rows[rows.length - 1]
  const first = rows.find(row => row.segment_start === latest.segment_start && row.segment_end === latest.segment_end)!
  const high = rows.reduce((best, row) => row.seasonal > best.seasonal ? row : best)
  const low = rows.reduce((best, row) => row.seasonal < best.seasonal ? row : best)
  const unusual = rows.reduce((best, row) => Math.abs(row.residual) > Math.abs(best.residual) ? row : best)
  return { rows, labels, observed, trend, seasonal, residual, first, latest, high, low, unusual }
}
