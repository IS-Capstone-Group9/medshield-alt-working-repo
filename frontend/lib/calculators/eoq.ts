export interface EoqInputs {
  annualDemand: number
  orderingCost: number
  holdingCost: number
}

export interface RopInputs {
  avgDailyDemand: number
  leadTimeDays: number
  safetyStock: number
}

export function calculateEOQ(inputs: EoqInputs): number {
  const { annualDemand, orderingCost, holdingCost } = inputs
  if (holdingCost <= 0) return 0
  return Math.round(Math.sqrt((2 * annualDemand * orderingCost) / holdingCost))
}

export function calculateROP(inputs: RopInputs): number {
  const { avgDailyDemand, leadTimeDays, safetyStock } = inputs
  return Math.round(avgDailyDemand * leadTimeDays + safetyStock)
}

export function calculateSafetyStock(stdDev: number, zScore = 1.65): number {
  return Math.round(zScore * stdDev)
}
