import Decimal from 'decimal.js'
import type { AllocationInput, allocationClient } from '../validators/schemas'
import type { z } from 'zod'

type Client = z.infer<typeof allocationClient>
/** Deterministic single-SKU lexicographic allocation: hospital minima, then hospital-first fill. */
export function allocate(input: AllocationInput, clients: Client[]) {
  const sorted = [...clients].sort((a, b) => Number(b.category === 'HOSPITAL') - Number(a.category === 'HOSPITAL') || a.clientId.localeCompare(b.clientId))
  const required = sorted.map(client => client.category === 'HOSPITAL' ? new Decimal(client.requestedUnits).times(input.hospitalFillTargetPct).div(100).ceil().toNumber() : 0)
  const capacity = sorted.map(client => Math.min(client.requestedUnits, client.usableUnitsBeforeExpiry))
  const minimumTotal = required.reduce((sum, value) => sum + value, 0)
  if (minimumTotal > input.totalAvailableStock || capacity.some((value, index) => value < required[index])) {
    return { status: 'infeasible', classification: 'Simulation sandbox', reason: 'Available stock or expiry-safe demand cannot meet every hospital minimum.', requiredHospitalUnits: minimumTotal, availableUnits: input.totalAvailableStock, rows: [] }
  }
  let remaining = input.totalAvailableStock - minimumTotal
  const rows = sorted.map((client, i) => {
    const extra = Math.min(remaining, capacity[i] - required[i]); remaining -= extra
    const allocatedUnits = required[i] + extra
    return { clientId: client.clientId, requestedUnits: client.requestedUnits, allocatedUnits, unmetUnits: client.requestedUnits - allocatedUnits, fillRatePct: client.requestedUnits ? new Decimal(allocatedUnits).div(client.requestedUnits).times(100).toDecimalPlaces(4).toNumber() : null, shortagePct: client.requestedUnits ? new Decimal(client.requestedUnits - allocatedUnits).div(client.requestedUnits).times(100).toDecimalPlaces(4).toNumber() : null, allocationBasis: client.category === 'HOSPITAL' ? 'hospital_priority' : 'remaining_stock', stockoutRiskPct: null }
  })
  const unusedPct = input.totalAvailableStock ? new Decimal(remaining).div(input.totalAvailableStock).times(100) : new Decimal(0)
  const expiryFeasible = unusedPct.lte(input.maxExpiryLossThresholdPct)
  return { status: expiryFeasible ? 'feasible' : 'infeasible', classification: 'Simulation sandbox', reason: expiryFeasible ? 'Entered hospital and projected unused-stock constraints are satisfied.' : 'Existing stock exceeds expiry-safe demand; the unused-stock threshold is infeasible.', productId: input.productId, targetPeriod: input.targetPeriod, availableUnits: input.totalAvailableStock, allocatedUnits: input.totalAvailableStock - remaining, remainingUnits: remaining, projectedUnusedPct: unusedPct.toDecimalPlaces(4).toNumber(), hospitalFillTargetPct: input.hospitalFillTargetPct, rows, limitations: ['No inventory is decremented and no purchase order is issued.', 'Unused stock is an expiry proxy from entered consumable demand, not a measured loss probability.', 'Hospital-first and stable client-ID order are the explicit optimization priorities; no fairness or economic optimality claim.'] }
}
