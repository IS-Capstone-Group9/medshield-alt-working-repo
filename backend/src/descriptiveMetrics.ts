// SQL computes cumulative revenue across the full product population before LIMIT.
// Crossing-inclusive policy: the item that reaches a cutoff stays in that class.
// Pass the current positive contribution explicitly; cumulative includes this item.
export function revenueAbc(cumulative: number | null, total: number | null, contribution: number | null, negativeProducts = 0): string {
  if (cumulative == null || total == null || contribution == null || total <= 0 || contribution <= 0 || negativeProducts > 0
    || !Number.isFinite(cumulative) || !Number.isFinite(total) || !Number.isFinite(contribution)
    || cumulative < contribution - total * 1e-10 || cumulative > total * (1 + 1e-10)) return 'Unclassified'
  const before = Math.max(0, cumulative - contribution) / total
  return before < 0.8 - 1e-10 ? 'A' : before < 0.95 - 1e-10 ? 'B' : 'C'
}

export function weightedMargin(profit: number | null, eligibleRevenue: number | null): number | null {
  if (profit == null || eligibleRevenue == null || eligibleRevenue <= 0
    || !Number.isFinite(profit) || !Number.isFinite(eligibleRevenue)) return null
  return profit / eligibleRevenue * 100
}
