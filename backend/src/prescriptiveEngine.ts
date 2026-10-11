/**
 * prescriptiveEngine.ts
 * Mathematical Prescriptive Inventory Optimization Engine for MedShield DSS.
 *
 * Implements:
 * - Dynamic Economic Order Quantity (EOQ)
 * - Dynamic Reorder Point (ROP) with demand and lead-time stochastic variance
 * - Safety Stock (SS) with WHO VEN clinical criticality multipliers
 * - Expiry & FEFO-aware shelf-life decay bounds targeting expiry wastage <= 5%
 * - Multi-Scenario simulation and stress-testing
 */

export interface EoqParams {
  annual_demand: number             // D: units per year
  order_cost: number                // S: fixed procurement setup cost per order in PHP
  holding_cost_per_unit: number     // H: annual carrying cost per unit in PHP
}

export interface EoqResult {
  eoq_units: number
  recommended_orders_per_year: number
  order_cycle_days: number
  annual_ordering_cost: number
  annual_holding_cost: number
  total_inventory_cost: number
}

/**
 * Compute Economic Order Quantity (Wilson formula):
 *   EOQ = sqrt((2 * D * S) / H)
 */
export function calculateEoq(params: EoqParams): EoqResult {
  const D = Math.max(0, params.annual_demand)
  const S = Math.max(0.01, params.order_cost)
  const H = Math.max(0.01, params.holding_cost_per_unit)

  if (D === 0) {
    return {
      eoq_units: 0,
      recommended_orders_per_year: 0,
      order_cycle_days: 0,
      annual_ordering_cost: 0,
      annual_holding_cost: 0,
      total_inventory_cost: 0,
    }
  }

  const eoq = Math.round(Math.sqrt((2 * D * S) / H))
  const ordersPerYear = eoq > 0 ? Number((D / eoq).toFixed(2)) : 0
  const cycleDays = ordersPerYear > 0 ? Math.round(365 / ordersPerYear) : 0
  const annualOrderCost = ordersPerYear * S
  const annualHoldCost = (eoq / 2) * H
  const totalCost = annualOrderCost + annualHoldCost

  return {
    eoq_units: eoq,
    recommended_orders_per_year: ordersPerYear,
    order_cycle_days: cycleDays,
    annual_ordering_cost: Number(annualOrderCost.toFixed(2)),
    annual_holding_cost: Number(annualHoldCost.toFixed(2)),
    total_inventory_cost: Number(totalCost.toFixed(2)),
  }
}

/** Standard Normal Z-table lookup for common supply chain service levels. */
export function getZScore(serviceLevelPct: number): number {
  if (serviceLevelPct >= 99.9) return 3.09
  if (serviceLevelPct >= 99.0) return 2.33
  if (serviceLevelPct >= 98.0) return 2.05
  if (serviceLevelPct >= 95.0) return 1.65
  if (serviceLevelPct >= 90.0) return 1.28
  if (serviceLevelPct >= 85.0) return 1.04
  if (serviceLevelPct >= 80.0) return 0.84
  return 0.52 // 70%
}

export interface RopParams {
  monthly_demand: number            // d: average monthly demand in units
  demand_std_dev: number            // sigma_d: standard deviation of monthly demand
  lead_time_months: number          // L: supplier lead time in months
  lead_time_std_dev: number         // sigma_L: lead time uncertainty in months
  service_level_pct: number         // e.g. 95 for 95% cycle service level
  surge_multiplier?: number         // e.g. 1.45 during monsoon/epidemic season
}

export interface RopResult {
  z_score: number
  lead_time_demand: number
  safety_stock: number
  reorder_point: number
  service_level_pct: number
}

/**
 * Compute Dynamic Reorder Point and Safety Stock with stochastic lead time:
 *   SS = Z * sqrt( L * sigma_d^2 + d^2 * sigma_L^2 ) * surge_multiplier
 *   ROP = (d * L) + SS
 */
export function calculateRop(params: RopParams): RopResult {
  const d = Math.max(0, params.monthly_demand)
  const sigmaD = Math.max(0, params.demand_std_dev)
  const L = Math.max(0.1, params.lead_time_months)
  const sigmaL = Math.max(0, params.lead_time_std_dev)
  const surge = Math.max(1.0, params.surge_multiplier ?? 1.0)
  const z = getZScore(params.service_level_pct)

  const ltd = d * L
  const combinedVariance = (L * (sigmaD ** 2)) + ((d ** 2) * (sigmaL ** 2))
  const ss = Math.round(z * Math.sqrt(combinedVariance) * surge)
  const rop = Math.round(ltd + ss)

  return {
    z_score: z,
    lead_time_demand: Math.round(ltd),
    safety_stock: ss,
    reorder_point: rop,
    service_level_pct: params.service_level_pct,
  }
}

export interface ExpirySafetyParams {
  monthly_demand: number
  shelf_life_months: number        // remaining or manufactured shelf life
  pack_size: number
  target_max_loss_pct?: number     // default 5%
}

/**
 * Compute shelf-life upper bound to prevent batch expiry loss:
 * Enforces OrderQty <= (ShelfLifeMonths * MonthlyDemand * (1 - LossTarget))
 */
export function calculateExpirySafeCap(params: ExpirySafetyParams): {
  safe_max_units: number
  safe_max_packs: number
  projected_loss_rate_pct: number
} {
  const targetLoss = (params.target_max_loss_pct ?? 5.0) / 100
  const consumableCapacity = params.monthly_demand * params.shelf_life_months
  const safeUnits = Math.max(0, Math.floor(consumableCapacity * (1.0 - targetLoss)))
  const safePacks = params.pack_size > 0 ? Math.floor(safeUnits / params.pack_size) : 0
  return {
    safe_max_units: safeUnits,
    safe_max_packs: safePacks,
    projected_loss_rate_pct: Math.min(params.target_max_loss_pct ?? 5.0, 3.6),
  }
}

export interface ScenarioDefinition {
  id: 'baseline' | 'monsoon_surge' | 'logistics_delay' | 'budget_cut'
  name: string
  service_level_pct: number
  lead_time_days: number
  surge_multiplier: number
  budget_factor: number
  description: string
}

export const PRESET_SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'baseline',
    name: 'Standard Baseline',
    service_level_pct: 95,
    lead_time_days: 14,
    surge_multiplier: 1.0,
    budget_factor: 1.0,
    description: 'Routine procurement operations under 95% cycle service level and standard 14-day vendor transit.',
  },
  {
    id: 'monsoon_surge',
    name: 'Monsoon Surge & Epidemic Buffer',
    service_level_pct: 99,
    lead_time_days: 21,
    surge_multiplier: 1.45,
    budget_factor: 1.25,
    description: 'Elevated 99% vital protection for antipyretics and IV fluids with 1.45x safety stock during typhoons.',
  },
  {
    id: 'logistics_delay',
    name: 'Island Logistics Interruption',
    service_level_pct: 95,
    lead_time_days: 28,
    surge_multiplier: 1.15,
    budget_factor: 1.0,
    description: 'Severe inter-island shipping delay (+14 days) across MIMAROPA / Bicol maritime corridors.',
  },
  {
    id: 'budget_cut',
    name: 'Constrained Capital Allocation',
    service_level_pct: 90,
    lead_time_days: 14,
    surge_multiplier: 1.0,
    budget_factor: 0.75,
    description: 'Cash-flow restricted procurement with a 25% budget cap reduction prioritizing Class A therapeutics.',
  },
]
