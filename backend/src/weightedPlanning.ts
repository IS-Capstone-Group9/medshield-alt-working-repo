import {numeric,PlanningScenarioInputError} from './planningInputs'

const criteria=['revenue','growth','outbreak'] as const
export function planningWeights(body:Record<string,unknown>){
  if(body.allocation_method===undefined||body.allocation_method==='balanced')return null
  if(body.allocation_method!=='weighted')throw new PlanningScenarioInputError('Unknown allocation method')
  const weights=Object.fromEntries(criteria.map(key=>[key,numeric(body[key+'_weight'],key+' weight',0,100,true)])) as Record<typeof criteria[number],number>
  if(Object.values(weights).reduce((sum,n)=>sum+n,0)!==100)throw new PlanningScenarioInputError('Priority weights must sum to 100')
  return weights
}
export function planningPriority(row:Record<string,unknown>,weights:ReturnType<typeof planningWeights>){
  if(!weights)return null
  const scores=Object.fromEntries(criteria.map(key=>{
    const value=row[key+'_score']
    return [key,weights[key]===0&&(value===undefined||value==='')?null:numeric(value,key+' priority score',0,100,true)]
  })) as Record<typeof criteria[number],number|null>
  return {...scores,composite_score:criteria.reduce((sum,key)=>sum+weights[key]*(scores[key]??0),0),evidence:'entered_normalized_scores_not_observed_risk'}
}
type Item={product:string;demand:number;available:number;pack:number;pack_cost_cents:number;max_packs:number;purchase_packs:number;fulfilled:number;priority:ReturnType<typeof planningPriority>}

/** Integer-pack weighted fulfillment. Exact integer objective; fractional marginal-pack relaxation bounds search. */
export function allocateWeighted(items:Item[],remainingCents:number,nodeLimit=25000,purchaseCapacityUnits?:number){
  const capacity=purchaseCapacityUnits===undefined?Infinity:numeric(purchaseCapacityUnits,'Purchase capacity',0,1_000_000_000,true)
  const scores=items.map(item=>item.priority!.composite_score)
  const scoreTotal=scores.reduce((sum,n)=>sum+n,0)
  if(!scoreTotal)throw new PlanningScenarioInputError('At least one product must have a positive priority score')
  const denominator=items.reduce((n,item)=>n*BigInt(item.demand),1n)
  const coefficients=items.map((item,i)=>BigInt(scores[i])*(denominator/BigInt(item.demand)))
  const minimum=items.map(item=>item.purchase_packs)
  const remainingCapacity=capacity-items.reduce((sum,item)=>sum+item.purchase_packs*item.pack,0)
  if(remainingCapacity<0)throw new PlanningScenarioInputError('Purchase capacity cannot meet minimum fulfillment')
  const baseline=items.map(item=>item.fulfilled)
  const maximum=items.map(item=>Math.max(item.purchase_packs,Math.min(item.max_packs,Math.max(0,Math.ceil((item.demand-item.available)/item.pack)))))
  const base=items.reduce((n,_,i)=>n+BigInt(baseline[i])*coefficients[i],0n)
  type Segment={index:number;count:number;profit:bigint;cost:number}
  const segments=(indices:number[])=>{
    const result:Segment[]=[]
    for(const i of indices){
      if(!scores[i])continue
      const item=items[i],gap=item.demand-baseline[i],extra=maximum[i]-minimum[i]
      const full=Math.min(extra,Math.floor(gap/item.pack)),remainder=gap%item.pack
      if(full)result.push({index:i,count:full,profit:BigInt(item.pack)*coefficients[i],cost:item.pack_cost_cents})
      if(extra>full&&remainder)result.push({index:i,count:1,profit:BigInt(remainder)*coefficients[i],cost:item.pack_cost_cents})
    }
    return result.sort((a,b)=>{const d=a.profit*BigInt(b.cost)-b.profit*BigInt(a.cost);return d===0n?items[a.index].product.localeCompare(items[b.index].product):d>0n?-1:1})
  }
  const order=items.map((_,i)=>i).sort((a,b)=>{
    const d=coefficients[a]*BigInt(items[a].pack)*BigInt(items[b].pack_cost_cents)-coefficients[b]*BigInt(items[b].pack)*BigInt(items[a].pack_cost_cents)
    return d===0n?items[a].product.localeCompare(items[b].product):d>0n?-1:1
  })
  const upper=(indices:number[],budget:number,value:bigint)=>{
    for(const segment of segments(indices)){
      const count=Math.min(segment.count,Math.floor(budget/segment.cost))
      value+=BigInt(count)*segment.profit;budget-=count*segment.cost
      if(count<segment.count){
        value+=(BigInt(budget)*segment.profit+BigInt(segment.cost)-1n)/BigInt(segment.cost)
        break
      }
    }
    return value
  }
  const initial=minimum.slice();let initialBudget=remainingCents,initialCapacity=remainingCapacity
  for(const segment of segments(order)){
    const count=Math.min(segment.count,Math.floor(initialBudget/segment.cost),Math.floor(initialCapacity/items[segment.index].pack))
    initial[segment.index]+=count;initialBudget-=count*segment.cost;initialCapacity-=count*items[segment.index].pack
  }
  const objective=(counts:number[])=>items.reduce((n,item,i)=>n+BigInt(Math.min(item.demand,item.available+counts[i]*item.pack))*coefficients[i],0n)
  let best=objective(initial),bestCounts=initial.slice(),bestRemaining=initialBudget,nodes=0,exhausted=false
  const rootUpper=upper(order,remainingCents,base),counts=minimum.slice()
  const visit=(depth:number,budget:number,value:bigint,capacityLeft:number)=>{
    if(nodes>=nodeLimit){exhausted=true;return}nodes++
    if(upper(order.slice(depth),budget,value)<=best)return
    if(depth===order.length){if(value>best){best=value;bestCounts=counts.slice();bestRemaining=budget}return}
    const i=order[depth],item=items[i]
    const maxExtra=scores[i]?Math.min(maximum[i]-minimum[i],Math.floor(budget/item.pack_cost_cents),Math.floor(capacityLeft/item.pack)):0
    // The last variable has monotone gain, so its largest feasible count attains its best objective.
    const least=depth===order.length-1?maxExtra:0
    for(let extra=maxExtra;extra>=least;extra--){
      counts[i]=minimum[i]+extra
      const gained=Math.min(item.demand,item.available+counts[i]*item.pack)-baseline[i]
      visit(depth+1,budget-extra*item.pack_cost_cents,value+BigInt(gained)*coefficients[i],capacityLeft-extra*item.pack)
      if(exhausted)break
    }
    counts[i]=minimum[i]
  }
  visit(0,remainingCents,base,remainingCapacity)
  items.forEach((item,i)=>{item.purchase_packs=bestCounts[i];item.fulfilled=Math.min(item.demand,item.available+bestCounts[i]*item.pack)})
  if(rootUpper<best)throw new Error('Weighted allocation bound is inconsistent')
  const proved=!exhausted||rootUpper===best
  const normalizer=denominator*BigInt(scoreTotal),certified=proved?best:rootUpper
  return {remaining_cents:bestRemaining,method:'mcda_integer_pack_branch_bound_v1',proof_status:proved?'optimal':'feasible_bound',
    nodes_visited:nodes,node_limit:nodeLimit,objective:'Maximize entered-priority-weighted product fulfillment; no secondary cost optimum',
    weighted_fulfillment_pct:100*Number(best)/Number(normalizer),upper_bound_pct:100*Number(certified)/Number(normalizer),
    absolute_gap_pp:100*Number(certified-best)/Number(normalizer),objective_numerator:best.toString(),
    certified_upper_bound_numerator:certified.toString(),relaxation_upper_bound_numerator:rootUpper.toString(),objective_denominator:normalizer.toString(),
    criteria_status:'entered_normalized_scores_not_verified_revenue_growth_or_outbreak',procurement_execution_approved:false}
}
