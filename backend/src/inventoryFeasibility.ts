import {numeric,PlanningScenarioInputError} from './planningInputs'

/** Optimistic screens, never batch-expiry forecasts or allocation constraints. */
export function inventoryFeasibility(row:Record<string,unknown>,input:{annual_demand:number;lead_days:number;on_order:number;backorders:number},stock:number,reserve:number,pack:number){
  const reference=row.policy_input_reference
  if(reference!==undefined&&(typeof reference!=='string'||reference.length>200||/[\u0000-\u001f]/.test(reference)))throw new PlanningScenarioInputError('Policy input reference must be text up to 200 characters without control characters')
  const noInbound=Math.max(0,stock-reserve-input.backorders)
  const optimisticInbound=Math.max(0,stock+input.on_order-reserve-input.backorders)
  const required=Number((BigInt(input.annual_demand)*BigInt(input.lead_days)+364n)/365n)
  const shelf=row.shelf_life_days===undefined||row.shelf_life_days===''?null:numeric(row.shelf_life_days,'Usable shelf life after receipt in calendar days',0,3650,true)
  const capacity=shelf===null?null:Number(BigInt(input.annual_demand)*BigInt(shelf)/365n)
  return {policy:'constant_rate_lead_expiry_screen_v1',input_reference:typeof reference==='string'&&reference.trim()?reference.trim():null,
    input_status:'entered_unverified_assumptions',lead_demand_ceiling_units:required,
    available_before_new_receipts_units:noInbound,available_if_all_entered_inbound_is_timely_units:optimisticInbound,
    gap_without_receipts_units:Math.max(0,required-noInbound),gap_even_if_inbound_timely_units:Math.max(0,required-optimisticInbound),
    lead_review:required>optimisticInbound?'Entered supply is insufficient even if all inbound is timely':required>noInbound?'Check inbound arrival dates; current usable stock does not cover entered lead time':'Current entered usable stock covers constant-rate lead demand; no service guarantee',
    usable_shelf_life_days_after_receipt:shelf,gross_demand_capacity_before_expiry_units:capacity,
    gross_demand_capacity_before_expiry_packs:capacity===null?null:Math.floor(capacity/pack),
    expiry_outcome_measured:false,operational_inputs_verified:false}
}
