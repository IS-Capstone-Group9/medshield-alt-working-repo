import {PlanningScenarioInputError,numeric,cents} from './planningInputs'
import {inventoryFeasibility} from './inventoryFeasibility'

const fields=['annual_demand','order_cost','holding_cost','lead_days','on_order','backorders'] as const
/** Classical constant-rate assumptions; no fitted demand, expiry model or purchase authority. */
export function inventoryPolicyScenario(row:Record<string,unknown>,item:{stock:number;reserve:number;pack:number;pack_cost_cents:number;max_packs:number},budgetCents:number){
  if(fields.every(key=>row[key]===undefined||row[key]==='')){
    if((row.shelf_life_days!==undefined&&row.shelf_life_days!=='')||(row.policy_input_reference!==undefined&&row.policy_input_reference!==''))throw new PlanningScenarioInputError('Enter all EOQ/ROP inputs before adding shelf-life or input references')
    return null
  }
  const annualDemand=numeric(row.annual_demand,'Annual demand',1,1_000_000_000,true)
  const orderCost=cents(row.order_cost,'Cost per order',0.01)/100
  const holdingCost=cents(row.holding_cost,'Holding cost per unit per year',0.01)/100
  const leadDays=numeric(row.lead_days,'Lead time in calendar days',0,3650,true)
  const onOrder=numeric(row.on_order,'Inbound units within lead time',0,1_000_000_000,true)
  const backorders=numeric(row.backorders,'Backordered units',0,1_000_000_000,true)
  const eoq=Math.sqrt(2*annualDemand*orderCost/holdingCost)
  const cost=(packs:number)=>annualDemand/(packs*item.pack)*orderCost+packs*item.pack/2*holdingCost
  const candidates=[...new Set([Math.max(1,Math.floor(eoq/item.pack)),Math.max(1,Math.ceil(eoq/item.pack))])]
  const packs=candidates.sort((a,b)=>cost(a)-cost(b)||a-b)[0]
  const inventoryPosition=item.stock+onOrder-backorders
  // Use exact integer division before ceiling; reserve is added once, not subtracted again.
  const leadNumerator=BigInt(annualDemand)*BigInt(leadDays)
  const reorderPoint=Number((leadNumerator+364n)/365n)+item.reserve
  const reorder=inventoryPosition<=reorderPoint
  const budgetCoversLot=packs<=Math.floor(budgetCents/item.pack_cost_cents)
  const supplierCoversLot=packs<=item.max_packs
  const blockers=[!budgetCoversLot?'EOQ model lot exceeds the total entered budget':'',!supplierCoversLot?'EOQ model lot exceeds the entered supplier cap':''].filter(Boolean)
  const feasibility=inventoryFeasibility(row,{annual_demand:annualDemand,lead_days:leadDays,on_order:onOrder,backorders},item.stock,item.reserve,item.pack)
  const exceedsShelfCapacity=feasibility.gross_demand_capacity_before_expiry_units===null?null:packs*item.pack>feasibility.gross_demand_capacity_before_expiry_units
  if(exceedsShelfCapacity)blockers.push('EOQ model lot exceeds gross entered demand capacity before expiry; review smaller lots and batch dates')
  if(![eoq,cost(packs),reorderPoint,inventoryPosition].every(Number.isFinite))throw new PlanningScenarioInputError('Inventory policy exceeds safe model arithmetic')
  return {policy:'classical_eoq_rop_entered_assumptions_v1',annual_demand:annualDemand,order_cost:orderCost,holding_cost:holdingCost,
    lead_days:leadDays,on_order:onOrder,backorders,safety_stock_units:item.reserve,days_per_year:365,
    daily_demand_units:annualDemand/365,lead_demand_units:Number(leadNumerator)/365,
    continuous_eoq_units:eoq,economic_lot_packs:packs,economic_lot_units:packs*item.pack,
    annual_ordering_and_cycle_holding_cost:cost(packs),reorder_point_units:reorderPoint,inventory_position_units:inventoryPosition,
    reorder_triggered:reorder,budget_covers_single_lot:budgetCoversLot,supplier_covers_single_lot:supplierCoversLot,review_constraints:blockers,
    feasibility,eoq_lot_exceeds_gross_shelf_capacity:exceedsShelfCapacity,
    recommendation:reorder?'Review replenishment against the entered reorder point':'No reorder-point trigger under the entered assumptions',
    operational_inputs_verified:false,procurement_execution_approved:false,expiry_outcome_measured:false}
}
