import {PlanningScenarioInputError,numeric,cents,minimumDemandUnits} from './planningInputs'
type Scope={source:{checksum:string};scope:{sector:string;territory:string};products:Array<{product:string|null}>}
const obj=(v:unknown)=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new PlanningScenarioInputError('Expected a structured dated input');return v as Record<string,unknown>}
const txt=(v:unknown)=>{if(typeof v!=='string'||!v.trim()||v.length>200||/[\u0000-\u001f]/.test(v))throw new PlanningScenarioInputError('Dated IDs and references require short nonblank text');return v.trim()}
const day=(v:unknown)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw new PlanningScenarioInputError('Invalid dated-plan calendar date');return v}
const units=(v:unknown)=>{if(typeof v!=='number')throw new PlanningScenarioInputError('Dated quantities must be explicit numbers');return numeric(v,'Dated quantity',0,1e9,true)}
const list=(v:unknown,max:number)=>{if(!Array.isArray(v)||v.length>max)throw new PlanningScenarioInputError('Invalid or oversized dated record array');return v}
const php=(n:bigint)=>n/100n+'.'+String(n%100n).padStart(2,'0')
/** Server recomputes fixed-plan feasibility; it never trusts client timeline results or approval flags. */
export function reviewDatedPlan(body:Record<string,unknown>,shortlist:Scope,today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())){
 if(body.acknowledged!==true)throw new PlanningScenarioInputError('Acknowledge entered dated-plan assumptions')
 const snapshot=obj(body.snapshot)
 if(snapshot.schema_version!==1||snapshot.classification!=='entered_unverified_operating_snapshot')throw new PlanningScenarioInputError('Unsupported dated snapshot')
 const scope=obj(snapshot.scope)
 if(snapshot.checksum!==shortlist.source.checksum||scope.sector!==shortlist.scope.sector||scope.territory!==shortlist.scope.territory)throw new PlanningScenarioInputError('Dated snapshot source or scope changed; reload shortlist')
 const asOf=day(snapshot.as_of);if(asOf>day(today))throw new PlanningScenarioInputError('Future stock snapshots are not supported')
 const reference=txt(snapshot.input_reference),budget=BigInt(cents(snapshot.purchase_budget,'Dated purchase budget',0))
 const purchaseCapacity=snapshot.purchase_capacity_units===undefined?null:units(snapshot.purchase_capacity_units)
 if(purchaseCapacity===null&&snapshot.capacity_unit_label!==undefined)throw new PlanningScenarioInputError('Dated capacity unit requires an explicit purchase cap')
 const capacityUnit=purchaseCapacity===null?null:txt(snapshot.capacity_unit_label)
 const products=list(snapshot.products,5),expected=new Set(shortlist.products.map(p=>p.product)),seen=new Set<string>()
 if(!products.length||products.length!==expected.size)throw new PlanningScenarioInputError('Dated snapshot must match every shortlisted product')
 let totalSpend=0n;const conflicts:string[]=[]
 const rows=products.map(raw=>{
  const p=obj(raw),product=txt(p.product);if(!expected.has(product)||seen.has(product))throw new PlanningScenarioInputError('Unknown or duplicated dated product');seen.add(product)
  const unit=txt(p.unit_label),stock=units(p.stock_total),reserve=units(p.protected_reserve),end=day(p.horizon_end)
  if(purchaseCapacity!==null&&unit!==capacityUnit)throw new PlanningScenarioInputError('Dated purchase capacity requires matching product units')
  const days=(Date.parse(end)-Date.parse(asOf))/86400000+1
  if(days<1||days>366)throw new PlanningScenarioInputError('Dated horizon must be 1–366 days')
  type Lot={id:string;quantity:number;expiry:string;arrival:string;proposed:boolean}
  const lots:Lot[]=[],ids=new Set<string>();let batchTotal=0,initial=0,inboundTotal=0
  for(const raw of list(p.batches,100)){
   const b=obj(raw),id=txt(b.batch_id);if(ids.has(id))throw new PlanningScenarioInputError('Duplicated batch ID');ids.add(id)
   const q=units(b.units),received=day(b.received_on),expiry=day(b.expires_on)
   if(received>asOf||expiry<=received||!['released','blocked','quarantined'].includes(String(b.disposition)))throw new PlanningScenarioInputError('Invalid batch dates or disposition')
   batchTotal+=q
   if(expiry>asOf&&b.disposition==='released'){lots.push({id:'batch:'+id,quantity:q,expiry,arrival:asOf,proposed:false});initial+=q}
  }
  if(batchTotal!==stock||stock>1e9||reserve>initial)throw new PlanningScenarioInputError('Stock balance or released reserve mismatch')
  const c=obj(p.purchase_constraints),pack=numeric(c.units_per_pack,'Dated units per pack',1,1e9,true),cost=BigInt(cents(c.pack_cost,'Dated cost per pack',.01))
  const cap=numeric(c.supplier_max_packs,'Dated supplier cap',0,100000,true),maxExpiry=units(c.maximum_projected_expired_units),minimum=numeric(c.minimum_fulfillment_pct,'Dated minimum fulfillment',0,100)
  let proposalPacks=0,proposedTotal=0
  for(const [kind,records] of [['receipt',list(p.receipts,100)],['proposed',list(p.proposed_receipts===undefined?[]:p.proposed_receipts,5)]] as const){
   const ids=new Set<string>()
   for(const raw of records){
    const r=obj(raw),id=txt(r.receipt_id);if(ids.has(id))throw new PlanningScenarioInputError('Duplicated dated receipt ID');ids.add(id)
    const q=units(r.units),arrival=day(r.expected_on),expiry=day(r.expires_on)
    if(q===0||arrival<asOf||expiry<=arrival)throw new PlanningScenarioInputError('Invalid dated receipt quantity or dates')
    if(kind==='proposed'){
     if(q%pack!==0)throw new PlanningScenarioInputError('Every proposed lot must contain whole entered packs')
     if(arrival>end)throw new PlanningScenarioInputError('Costed proposed receipts must arrive within the modeled horizon')
     proposalPacks+=q/pack;proposedTotal+=q
    }else inboundTotal+=q
    lots.push({id:kind+':'+id,quantity:q,arrival,expiry,proposed:kind==='proposed'})
   }
  }
  if(inboundTotal>1e9||proposedTotal>1e9)throw new PlanningScenarioInputError('Dated supply total exceeds bounds')
  const spend=BigInt(proposalPacks)*cost;totalSpend+=spend
  const calendar=list(p.demand_calendar,366),demand=new Map<string,number>();let demandTotal=0
  if(calendar.length!==days)throw new PlanningScenarioInputError('Every dated demand day must be explicit')
  for(const raw of calendar){const d=obj(raw),key=day(d.date),q=units(d.units);if(key<asOf||key>end||demand.has(key))throw new PlanningScenarioInputError('Invalid or duplicate dated demand day');demand.set(key,q);demandTotal+=q}
  if(demandTotal>1e9)throw new PlanningScenarioInputError('Dated demand exceeds bounds')
  const simulate=(includeProposals:boolean)=>{
   const supply=lots.filter(l=>includeProposals||!l.proposed).map(l=>({...l,remaining:l.quantity}));const daily=[]
   let fulfilled=0,expired=0,arrived=0;let firstUnmet:string|null=null
   for(let index=0;index<days;index++){
    const date=new Date(Date.parse(asOf)+index*86400000).toISOString().slice(0,10)
    let discarded=0,arrival=0
    for(const lot of supply){if(lot.arrival===date)arrival+=lot.quantity;if(lot.arrival<=date&&lot.expiry<=date){discarded+=lot.remaining;lot.remaining=0}}
    const available=supply.filter(l=>l.arrival<=date&&l.expiry>date).reduce((sum,l)=>sum+l.remaining,0)
    const requested=demand.get(date)!,serve=Math.min(requested,Math.max(0,available-reserve));let remaining=serve
    for(const lot of [...supply].filter(l=>l.arrival<=date&&l.expiry>date).sort((a,b)=>a.expiry.localeCompare(b.expiry)||a.id.localeCompare(b.id))){const take=Math.min(remaining,lot.remaining);lot.remaining-=take;remaining-=take;if(!remaining)break}
    if(serve<requested&&!firstUnmet)firstUnmet=date
    daily.push({date,demand_units:requested,fulfilled_units:serve,unmet_units:requested-serve,projected_expired_units:discarded,ending_units:available-serve})
    fulfilled+=serve;expired+=discarded;arrived+=arrival
   }
   const ending=supply.filter(l=>l.arrival<=end).reduce((n,l)=>n+l.remaining,0)
   if(arrived!==fulfilled+expired+ending)throw new Error('Server dated supply conservation failed')
   return {demand_units:demandTotal,fulfilled_units:fulfilled,unmet_units:demandTotal-fulfilled,projected_expired_units:expired,ending_units:ending,first_unmet_date:firstUnmet,daily}
  }
  const baseline=simulate(false),candidate=simulate(true),required=minimumDemandUnits(demandTotal,minimum)
  const rowConflicts=[proposalPacks>cap?'supplier pack cap exceeded':'',candidate.projected_expired_units>maxExpiry?'entered projected-expiry limit exceeded':'',candidate.fulfilled_units<required?'entered aggregate fulfillment minimum not met':''].filter(Boolean)
  conflicts.push(...rowConflicts.map(reason=>product+': '+reason))
  return {product,unit_label:unit,proposed_packs:proposalPacks,spend_php:php(spend),constraints:{units_per_pack:pack,pack_cost_php:php(cost),supplier_max_packs:cap,maximum_projected_expired_units:maxExpiry,minimum_fulfillment_pct:minimum},baseline,candidate,conflicts:rowConflicts}
 })
 if(totalSpend>budget)conflicts.push('Shared dated purchase budget exceeded')
 const purchased=rows.reduce((sum,row)=>sum+row.proposed_packs*row.constraints.units_per_pack,0)
 if(purchaseCapacity!==null&&purchased>purchaseCapacity)conflicts.push('Shared dated purchase capacity exceeded')
 return {status:conflicts.length?'DATED_FIXED_PLAN_INFEASIBLE':'DATED_FIXED_PLAN_FEASIBLE',policy:'server_fixed_dated_plan_feasibility_v1',checksum:shortlist.source.checksum,scope:shortlist.scope,as_of:asOf,reviewed_on:today,input_reference:reference,budget_php:php(budget),spend_php:php(totalSpend),rows,conflicts,
  purchase_capacity:purchaseCapacity===null?null:{units:purchaseCapacity,unit_label:capacityUnit,used_units:purchased,remaining_units:purchaseCapacity-purchased,evidence_label:'Assumed',physical_storage_verified:false},
  constraints_checked:['shared_budget','whole_packs','supplier_caps','entered_aggregate_fulfillment_minimum','entered_absolute_projected_expiry_units',...(purchaseCapacity===null?[]:['shared_purchase_capacity'])],
  objective_optimized:false,source_inputs_verified:false,procurement_execution_approved:false,expiry_outcome_measured:false}
}
