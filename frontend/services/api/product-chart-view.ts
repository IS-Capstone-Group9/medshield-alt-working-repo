import type { descriptivePortfolio } from './descriptive-products'

/** Full selected population, before the displayed cohort is applied. */
export function productAbcDistribution(portfolio: ReturnType<typeof descriptivePortfolio>) {
  const classes = ['A', 'B', 'C', 'Unclassified']
  const population = portfolio.products.length
  const positiveTotal = portfolio.contributionTotal
  const reconciledTotal = portfolio.products.reduce((sum, row) => sum + row.positiveSales, 0)
  const salesAvailable = portfolio.abcAvailable && portfolio.missingContributionRows === 0
    && Number.isFinite(positiveTotal) && positiveTotal > 0
    && portfolio.products.every(row => Number.isFinite(row.positiveSales) && row.positiveSales >= 0)
    && Math.abs(reconciledTotal - positiveTotal) <= Math.max(0.011, positiveTotal * 1e-10)
  const groups = classes.map(code => {
    const members = portfolio.products.filter(row => (classes.includes(row.abc) ? row.abc : 'Unclassified') === code)
    const positiveSales = members.reduce((sum, row) => sum + row.positiveSales, 0)
    return {
      code,
      labels: members.length,
      labelShare: population ? members.length / population * 100 : null,
      positiveSales: salesAvailable ? positiveSales : null,
      salesShare: salesAvailable ? positiveSales / positiveTotal * 100 : null,
    }
  })
  const reason = !population ? 'No source labels in the selected period and category.'
    : portfolio.missingContributionRows ? 'Positive-sales share unavailable: sales and returns do not reconcile for every row.'
      : positiveTotal <= 0 ? 'No positive sales in this selection; a sales-share denominator is unavailable.'
        : !salesAvailable ? 'Positive-sales share unavailable until the contribution basis is reconciled.' : ''
  return { groups, population, positiveTotal: salesAvailable ? positiveTotal : null, salesAvailable, reason }
}

/** Wrap axis labels; callers can allow unlimited lines to preserve a full tooltip. */
export function productChartLabel(value: unknown, maxChars = 32, maxLines = 2): string[] {
  let remaining = String(value ?? '').replace(/\s+/g, ' ').trim() || 'Unspecified product'
  const width = Math.max(8, Math.floor(maxChars))
  const limit = Math.max(1, Math.floor(maxLines))
  const lines: string[] = []
  while (remaining && lines.length < limit) {
    if (remaining.length <= width) { lines.push(remaining); break }
    if (lines.length === limit - 1) { lines.push(remaining.slice(0, width - 1).trimEnd() + '…'); break }
    const space = remaining.lastIndexOf(' ', width)
    const end = space > width / 2 ? space : width
    lines.push(remaining.slice(0, end).trimEnd())
    remaining = remaining.slice(end).trimStart()
  }
  return lines
}

export function productChartCurrency(value: unknown): string {
  const number = Number(value)
  return Number.isFinite(number)
    ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', notation: 'compact', maximumFractionDigits: 1 }).format(number)
    : 'Unavailable'
}
