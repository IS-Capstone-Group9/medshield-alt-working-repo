import {reviewDatedPlan} from './datedPlanReview'
import {PlanningScenarioInputError,numeric,cents} from './planningInputs'
type Scope=Parameters<typeof reviewDatedPlan>[1]
/** Bounded finite-domain selection: one dated receipt slot/product, explicit pack/weight limits. */
export function selectDatedPlan(body:Record<string,unknown>,shortlist:Scope,today?:string,nodeLimit=25000){
 const prototype=reviewDatedPlan(body,shortlist,today)
 const snapshot=body.snapshot as Record<string,unknown>,products=snapshot.products as Array<Record<string,unknown>>
 const budget=BigInt(cents(snapshot.purchase_budget,'Dated selection budget',0))
 const capacity=prototype.purchase_capacity?.units??Infinity
 const definitions=products.map((p,index)=>{
  const c=p.purchase_constraints as Record<string,unknown>,receipts=p.proposed_receipts
  if(!Array.isArray(receipts)||receipts.length!==1)throw new PlanningScenarioInputError('Dated selection requires one proposed arrival/expiry slot for each product')
  const max=numeric(c.selection_max_packs,'Selection search maximum packs',0,20,true),weight=numeric(c.selection_weight,'Selection product weight',0,100,true)
  const pack=numeric(c.units_per_pack,'Selection units per pack',1,1e9,true)
  if(max>Number(c.supplier_max_packs)||max*pack>1e9)throw new PlanningScenarioInputError('Selection maximum must fit supplier and quantity bounds')
  return {p,c,slot:receipts[0] as Record<string,unknown>,max,weight,demand:prototype.rows[index].candidate.demand_units,index,pack}
 })
 const positive=definitions.filter(d=>d.demand>0&&d.weight>0),weightTotal=positive.reduce((n,d)=>n+d.weight,0)
 if(!weightTotal)throw new PlanningScenarioInputError('Selection needs a positive weight on a product with positive entered demand')
 const denominator=positive.reduce((n,d)=>n*BigInt(d.demand),1n),normalizer=denominator*BigInt(weightTotal)
 type Row=ReturnType<typeof reviewDatedPlan>['rows'][number]
 type Option={packs:number;units:number;cost:bigint;score:bigint;row:Row;productInput:Record<string,unknown>}
 const groups=definitions.map(d=>{
  const choices:Option[]=[],unitCost=BigInt(cents(d.c.pack_cost,'Selection pack cost',.01))
  for(let packs=0;packs<=d.max;packs++){
   const cost=BigInt(packs)*unitCost;if(cost>budget||packs*d.pack>capacity)continue
   const productInput={...d.p,proposed_receipts:packs?[{...d.slot,units:packs*d.pack}]:[]}
   const result=reviewDatedPlan({...body,snapshot:{...snapshot,products:[productInput]}},{...shortlist,products:[{product:String(d.p.product)}]},today)
   const row=result.rows[0]
   if(row.conflicts.length)continue
   const score=d.demand>0&&d.weight>0?BigInt(d.weight)*BigInt(row.candidate.fulfilled_units)*(denominator/BigInt(d.demand)):0n
   choices.push({packs,units:packs*d.pack,cost,score,row,productInput})
  }
  // Dominated options cannot improve primary fulfillment or secondary minimum spend.
  const nondominated=choices.filter(a=>!choices.some(b=>b!==a&&b.score>=a.score&&b.cost<=a.cost&&b.units<=a.units&&(b.score>a.score||b.cost<a.cost)))
  return nondominated.sort((a,b)=>a.score===b.score?a.cost===b.cost?a.packs-b.packs:a.cost<b.cost?-1:1:a.score>b.score?-1:1)
 })
 const base={policy:'dated_finite_pack_selection_v1',checksum:prototype.checksum,scope:prototype.scope,as_of:prototype.as_of,reviewed_on:prototype.reviewed_on,
  objective:'Maximize entered-weighted fulfillment fractions over positive-demand products; then minimize entered purchase spend',
  search_domain:definitions.map(d=>({product:d.p.product,maximum_packs:d.max,weight:d.weight,arrival:d.slot.expected_on,expiry:d.slot.expires_on})),
  node_limit:nodeLimit,prototype_snapshot:snapshot,source_inputs_verified:false,procurement_execution_approved:false,expiry_outcome_measured:false,
  purchase_capacity_constraint:capacity===Infinity?null:{units:capacity,unit_label:prototype.purchase_capacity!.unit_label,evidence_label:'Assumed',physical_storage_verified:false},
  scope_limit:'Only entered quantity bounds and one entered dated receipt slot per product; dates, suppliers and demand are not optimized.'}
 const empty=groups.map((g,i)=>g.length?null:String(definitions[i].p.product)).filter(Boolean)
 if(empty.length)return {...base,status:'DATED_SELECTION_INFEASIBLE',proof_status:'infeasible',rows:[],conflicts:empty.map(product=>product+': no quantity in the entered search domain satisfies dated product constraints'),nodes_visited:0}
 const cheapest=groups.map(g=>g.reduce((a,b)=>a.cost<b.cost?a:b))
 let best=cheapest.reduce((n,o)=>n+o.score,0n),bestCost=cheapest.reduce((n,o)=>n+o.cost,0n),bestOptions=cheapest.slice()
 if(bestCost>budget)return {...base,status:'DATED_SELECTION_INFEASIBLE',proof_status:'infeasible',rows:[],conflicts:['Minimum feasible product costs exceed the shared budget'],nodes_visited:0}
 if(cheapest.reduce((sum,o)=>sum+o.units,0)>capacity)return {...base,status:'DATED_SELECTION_INFEASIBLE',proof_status:'infeasible',rows:[],conflicts:['Minimum feasible product quantities exceed the shared purchase capacity'],nodes_visited:0}
 const maxSuffix:Array<bigint>=Array(groups.length+1).fill(0n),minCostSuffix:Array<bigint>=Array(groups.length+1).fill(0n),minUnitsSuffix:number[]=Array(groups.length+1).fill(0)
 for(let i=groups.length-1;i>=0;i--){maxSuffix[i]=maxSuffix[i+1]+groups[i][0].score;minCostSuffix[i]=minCostSuffix[i+1]+cheapest[i].cost;minUnitsSuffix[i]=minUnitsSuffix[i+1]+cheapest[i].units}
 const selected:Option[]=Array(groups.length);let nodes=0,limited=false
 const visit=(depth:number,cost:bigint,score:bigint,usedUnits:number)=>{
  if(nodes>=nodeLimit){limited=true;return}nodes++
  if(cost+minCostSuffix[depth]>budget||usedUnits+minUnitsSuffix[depth]>capacity||score+maxSuffix[depth]<best)return
  if(score+maxSuffix[depth]===best&&cost+minCostSuffix[depth]>=bestCost)return
  if(depth===groups.length){if(score>best||score===best&&cost<bestCost){best=score;bestCost=cost;bestOptions=selected.slice()}return}
  for(const option of groups[depth]){selected[depth]=option;visit(depth+1,cost+option.cost,score+option.score,usedUnits+option.units);if(limited)break}
 }
 visit(0,0n,0n,0)
 const proof=!limited?'optimal':'feasible_bound',upper=!limited?best:maxSuffix[0]
 // Verify the selected full plan again, including the shared budget; never export a partial candidate.
 const selectedSnapshot={...snapshot,products:bestOptions.map(o=>o.productInput)}
 const verification=reviewDatedPlan({...body,snapshot:selectedSnapshot},shortlist,today)
 if(verification.status!=='DATED_FIXED_PLAN_FEASIBLE')throw new Error('Selected dated plan failed full constraint readback')
 return {...base,status:'DATED_SELECTION_RESULT',proof_status:proof,nodes_visited:nodes,rows:verification.rows,conflicts:[],
  objective_numerator:best.toString(),certified_upper_bound_numerator:upper.toString(),objective_denominator:normalizer.toString(),
  weighted_fulfillment_pct:100*Number(best)/Number(normalizer),upper_bound_pct:100*Number(upper)/Number(normalizer),absolute_gap_pp:100*Number(upper-best)/Number(normalizer),
  secondary_minimum_spend_proved:!limited,spend_php:verification.spend_php,budget_php:verification.budget_php,purchase_capacity:verification.purchase_capacity,selected_snapshot:selectedSnapshot,full_plan_verification_status:verification.status}
}
