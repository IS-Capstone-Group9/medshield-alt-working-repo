// SQL computes cumulative revenue across the full product population before LIMIT.
// Thresholds follow BUSINESS_DEFINITIONS: cumulative share <=80%, <=95%, then C.
export function revenueAbc(cumulative: number | null, total: number | null, negativeProducts = 0): string {
  if (cumulative == null || total == null || total <= 0 || negativeProducts > 0
    || !Number.isFinite(cumulative) || !Number.isFinite(total)) return 'Unclassified'
  const share = cumulative / total
  return share <= 0.8 ? 'A' : share <= 0.95 ? 'B' : 'C'
}

export function weightedMargin(profit: number | null, eligibleRevenue: number | null): number | null {
  if (profit == null || eligibleRevenue == null || eligibleRevenue <= 0
    || !Number.isFinite(profit) || !Number.isFinite(eligibleRevenue)) return null
  return profit / eligibleRevenue * 100
}
