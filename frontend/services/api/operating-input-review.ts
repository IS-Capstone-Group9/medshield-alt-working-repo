export type OperatingScope={checksum:string;scope:{sector:string;territory:string};items:Array<{product:string;stock?:string;reserve?:string}>}
const object=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Expected a structured input record.');return v as Record<string,unknown>}
const text=(v:unknown,label:string)=>{if(typeof v!=='string'||!v.trim()||v.length>200||/[\u0000-\u001f]/.test(v))throw Error(label+' must be nonblank text up to 200 characters.');return v.trim()}
const count=(v:unknown,label:string,positive=false)=>{if(typeof v!=='number'||!Number.isSafeInteger(v)||v<(positive?1:0)||v>1e9)throw Error(label+' must be an explicit whole-number quantity.');return v}
const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,value])=>[k,canonical(value)])):v
const sameInput=(a:unknown,b:unknown)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b))
function snapshotCapacity(data:Record<string,unknown>){
 if(data.purchase_capacity_units===undefined){if(data.capacity_unit_label!==undefined)throw Error('Capacity unit requires an explicit purchase capacity.');return null}
 const units=count(data.purchase_capacity_units,'Purchase capacity'),unit_label=text(data.capacity_unit_label,'Capacity unit')
 if(!Array.isArray(data.products)||!data.products.every(p=>text(object(p).unit_label,'Product unit')===unit_label))throw Error('Purchase capacity requires matching declared product units; no automatic conversion is applied.')
 return {units,unit_label,evidence_label:'Assumed',physical_storage_verified:false}
}
/** Reconcile requested capacity against gateway full-pack readback before showing success. */
function capacityReadback(value:unknown,snapshot:unknown,selection:boolean){
 const data=object(snapshot),r=object(value),requested=snapshotCapacity(data)
 const capacity=r.purchase_capacity,constraint=r.purchase_capacity_constraint
 if(!requested){
  if(capacity!=null||selection&&constraint!=null)throw Error('Gateway applied an unrequested dated capacity.')
  return capacity===null||selection&&constraint===null?'Purchase capacity not applied.':'Purchase capacity unavailable in this legacy response.'
 }
 const matches=(raw:unknown)=>{const c=object(raw);if(c.units!==requested.units||c.unit_label!==requested.unit_label||c.evidence_label!=='Assumed'||c.physical_storage_verified!==false)throw Error('Dated capacity response differs from the requested constraint.');return c}
 if(selection)matches(constraint)
 if(selection&&r.status==='DATED_SELECTION_INFEASIBLE')return 'Entered purchase capacity '+requested.units+' '+requested.unit_label+' (Assumed); no feasible selected plan.'
 const c=matches(capacity),products=data.products as Array<Record<string,unknown>>
 if(!Array.isArray(r.rows)||r.rows.length!==products.length)throw Error('Missing dated capacity product readback.')
 const seen=new Set<string>();let used=0
 for(const raw of r.rows){
  const row=object(raw),p=products.find(p=>text(p.product,'Product')===row.product)
  if(!p||seen.has(String(row.product))||row.unit_label!==requested.unit_label)throw Error('Dated capacity rows do not match the declared products/units.')
  seen.add(String(row.product))
  const input=object(p.purchase_constraints),pack=Number(input.units_per_pack),returnedPack=object(row.constraints).units_per_pack,packs=count(row.proposed_packs,'Returned packs')
  if(!Number.isSafeInteger(pack)||pack<1||returnedPack!==pack)throw Error('Dated capacity pack size differs from the input.')
  if(selection){
   if(packs>Number(input.selection_max_packs)||packs>Number(input.supplier_max_packs))throw Error('Selected packs exceed the requested domain.')
  }else{
   const receipts=p.proposed_receipts===undefined?[]:p.proposed_receipts
   if(!Array.isArray(receipts)||receipts.reduce((sum,raw)=>sum+count(object(raw).units,'Proposed receipt units',true),0)!==packs*pack)throw Error('Fixed-plan capacity does not match proposed full-pack units.')
  }
  used+=packs*pack
 }
 if(!Number.isSafeInteger(used)||c.used_units!==used||c.remaining_units!==requested.units-used)throw Error('Dated capacity used/remaining units do not reconcile to full packs.')
 if(selection){
  if(used>requested.units||r.full_plan_verification_status!=='DATED_FIXED_PLAN_FEASIBLE')throw Error('Selected plan violates dated capacity or lacks full-plan verification.')
  const selected=object(r.selected_snapshot);matches(snapshotCapacity(selected))
  if(!Array.isArray(selected.products)||selected.products.length!==products.length)throw Error('Missing selected dated inputs.')
  const restored={...selected,products:products.map(p=>{
   const chosen=selected.products as Array<Record<string,unknown>>,sp=chosen.find(v=>v.product===p.product),row=(r.rows as Array<Record<string,unknown>>).find(v=>v.product===text(p.product,'Product'))!
   if(!sp||!Array.isArray(sp.proposed_receipts))throw Error('Missing selected product receipts.')
   const original=p.proposed_receipts as Array<Record<string,unknown>>,packs=Number(row.proposed_packs),expected=packs?[{...original[0],units:packs*Number(object(p.purchase_constraints).units_per_pack)}]:[]
   if(!sameInput(sp.proposed_receipts,expected))throw Error('Selected receipt units or dates differ from selected full packs.')
   return {...sp,proposed_receipts:p.proposed_receipts}
  })}
  if(!sameInput(restored,data))throw Error('Selected snapshot changed the requested dated inputs.')
 }else if(used>requested.units&&(r.status!=='DATED_FIXED_PLAN_INFEASIBLE'||!Array.isArray(r.conflicts)||!r.conflicts.includes('Shared dated purchase capacity exceeded')))throw Error('Fixed-plan capacity violation was not reported.')
 return 'Purchase capacity: '+used+' / '+requested.units+' '+requested.unit_label+'; remaining '+c.remaining_units+' (Assumed; physical storage unverified).'
}
const date=(v:unknown,label:string)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(label+' must be a valid YYYY-MM-DD date.');return v}
export const manilaToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
type TimelineBatch={batch_id:string;units:number;expires_on:string;eligible_as_of:boolean}
type TimelineReceipt={receipt_id:string;units:number;expected_on:string;expires_on:string;source_id?:string}
/** Date-ordered entered-input FEFO scenario; missing daily demand is never imputed. */
function supplyTimeline(p:Record<string,unknown>,asOf:string,reserve:number,batches:TimelineBatch[],receipts:TimelineReceipt[]){
 if((p.horizon_end===undefined||p.horizon_end===null)&&(p.demand_calendar===undefined||Array.isArray(p.demand_calendar)&&p.demand_calendar.length===0))return null
 const end=date(p.horizon_end,'Timeline end date'),days=(Date.parse(end)-Date.parse(asOf))/86400000+1
 if(!Number.isInteger(days)||days<1||days>366)throw Error('Timeline must span 1–366 calendar days starting at the snapshot date.')
 if(!Array.isArray(p.demand_calendar)||p.demand_calendar.length!==days)throw Error('Enter one explicit demand quantity for every calendar day, including zeros.')
 const demand=new Map<string,number>();let demandTotal=0
 for(const raw of p.demand_calendar){const d=object(raw),day=date(d.date,'Demand date'),units=count(d.units,'Daily demand')
  if(day<asOf||day>end||demand.has(day))throw Error('Demand dates must be unique and inside the timeline.')
  demand.set(day,units);demandTotal+=units
 }
 if(demandTotal>1e9)throw Error('Timeline demand exceeds one billion product units.')
 const lots=batches.filter(b=>b.eligible_as_of).map(b=>({source_id:'batch:'+b.batch_id,remaining:b.units,expires_on:b.expires_on}))
 const initial=lots.reduce((sum,b)=>sum+b.remaining,0),daily=[]
 let expiredTotal=0,receiptTotal=0,fulfilledTotal=0,unmetTotal=0
 for(let offset=0;offset<days;offset++){
  const day=new Date(Date.parse(asOf)+offset*86400000).toISOString().slice(0,10),opening=lots.reduce((sum,b)=>sum+b.remaining,0)
  let expired=0,arrivals=0;const expiredLots=[]
  for(const lot of lots)if(lot.expires_on<=day){if(lot.remaining)expiredLots.push({source_id:lot.source_id,expires_on:lot.expires_on,units:lot.remaining});expired+=lot.remaining;lot.remaining=0}
  for(const r of receipts.filter(r=>r.expected_on===day)){lots.push({source_id:r.source_id??'receipt:'+r.receipt_id,remaining:r.units,expires_on:r.expires_on});arrivals+=r.units}
  const available=lots.reduce((sum,b)=>sum+b.remaining,0),required=demand.get(day)!
  let needed=Math.min(required,Math.max(0,available-reserve));const fulfilled=needed,consumed=[]
  for(const lot of [...lots].sort((a,b)=>a.expires_on.localeCompare(b.expires_on)||a.source_id.localeCompare(b.source_id))){
   if(!needed)break
   const units=Math.min(needed,lot.remaining);if(!units)continue
   lot.remaining-=units;needed-=units;consumed.push({source_id:lot.source_id,expires_on:lot.expires_on,units})
  }
  const ending=available-fulfilled,unmet=required-fulfilled
  daily.push({date:day,opening_units:opening,projected_expired_units:expired,projected_expired_lots:expiredLots,entered_arrival_units:arrivals,demand_units:required,fulfilled_units:fulfilled,unmet_units:unmet,ending_units:ending,reserve_shortfall_units:Math.max(0,reserve-ending),consumed_lots:consumed})
  expiredTotal+=expired;receiptTotal+=arrivals;fulfilledTotal+=fulfilled;unmetTotal+=unmet
 }
 const ending=lots.reduce((sum,b)=>sum+b.remaining,0)
 if(initial+receiptTotal!==expiredTotal+fulfilledTotal+ending)throw Error('Timeline supply conservation failed.')
 const firstUnmet=daily.find(d=>d.unmet_units>0)?.date??null,firstExpiry=daily.find(d=>d.projected_expired_units>0)?.date??null
 const followups=[firstUnmet?'Confirm supplier arrivals or alternative supply before '+firstUnmet+'; review the entered demand and reserve policy before committing supply.':'',firstExpiry?'Review the identified expiring lots before '+firstExpiry+'; check customer requirements and whether future receipts should be smaller or rescheduled.':''].filter(Boolean)
 return {status:'ENTERED_FEFO_TIMELINE_SCENARIO',policy:'entered_daily_fefo_reserve_v1',start:asOf,end,days,
  initial_released_unexpired_units:initial,entered_arrival_units:receiptTotal,demand_units:demandTotal,fulfilled_units:fulfilledTotal,unmet_units:unmetTotal,
  projected_expired_units:expiredTotal,ending_units:ending,excluded_later_receipt_units:receipts.filter(r=>r.expected_on>end).reduce((sum,r)=>sum+r.units,0),
  first_unmet_date:firstUnmet,first_projected_expiry_date:firstExpiry,recommended_followups:followups,
  recommendation:unmetTotal?'Review demand, dated receipts and reserve before committing supply':expiredTotal?'Review expiring lots and receipt sizes before adding supply':'No shortage or expiry projected within this entered horizon; verify inputs and later exposure',
  daily,remaining_lots:lots.filter(b=>b.remaining>0),
  assumptions:'Expiry removes stock at start of date, then expected receipts are assumed released at start of date, then daily demand consumes FEFO while protecting reserve. Unmet demand is recorded for that day and not carried forward.',
  source_inputs_verified:false,allocation_optimized:false,procurement_execution_approved:false,expiry_outcome_measured:false}
}
function comparePurchaseLots(p:Record<string,unknown>,asOf:string,reserve:number,batches:TimelineBatch[],receipts:TimelineReceipt[],baseline:ReturnType<typeof supplyTimeline>){
 if(p.proposed_receipts===undefined||Array.isArray(p.proposed_receipts)&&p.proposed_receipts.length===0)return null
 if(!Array.isArray(p.proposed_receipts)||p.proposed_receipts.length>5)throw Error('Enter at most five proposed receipt lots per product.')
 if(!baseline)throw Error('Proposed lots require a complete daily demand timeline.')
 const ids=new Set<string>();let proposalUnits=0
 const proposals=p.proposed_receipts.map(raw=>{
  const r=object(raw),id=text(r.receipt_id,'Proposed receipt ID');if(ids.has(id))throw Error('Duplicate proposed receipt ID.');ids.add(id)
  const units=count(r.units,'Proposed receipt units',true),expected=date(r.expected_on,'Proposed arrival date'),expiry=date(r.expires_on,'Proposed expiry date')
  if(expected<asOf||expiry<=expected)throw Error('Proposed arrivals must be on/after snapshot and expiry after arrival.')
  proposalUnits+=units
  return {receipt_id:id,units,expected_on:expected,expires_on:expiry,source_id:'proposed:'+id}
 })
 if(proposalUnits>1e9)throw Error('Total proposed units exceed one billion units.')
 const compare=(candidate:NonNullable<ReturnType<typeof supplyTimeline>>)=>({
  additional_fulfilled_units:candidate.fulfilled_units-baseline.fulfilled_units,
  change_unmet_units:candidate.unmet_units-baseline.unmet_units,
  change_projected_expired_units:candidate.projected_expired_units-baseline.projected_expired_units,
  change_ending_units:candidate.ending_units-baseline.ending_units,
  first_unmet_date:candidate.first_unmet_date,
  recommendation:candidate.projected_expired_units>baseline.projected_expired_units?'Review smaller or later proposal lots; projected expiry increases versus the same entered baseline':candidate.fulfilled_units>baseline.fulfilled_units?'Review the proposed arrival dates and confirm supplier/unit evidence before considering purchase':'No additional fulfillment within this entered horizon; review need, timing and later exposure'
 })
 const combined=supplyTimeline(p,asOf,reserve,batches,[...receipts,...proposals])!
 const individual=proposals.map(proposal=>{
  const candidate=supplyTimeline(p,asOf,reserve,batches,[...receipts,proposal])!
  return {proposal,...compare(candidate),fulfilled_units:candidate.fulfilled_units,unmet_units:candidate.unmet_units,projected_expired_units:candidate.projected_expired_units,ending_units:candidate.ending_units,excluded_later_receipt_units:candidate.excluded_later_receipt_units-receipts.filter(r=>r.expected_on>baseline.end).reduce((n,r)=>n+r.units,0)}
 })
 const lotResults=proposals.map(proposal=>{
  const consumed=combined.daily.reduce((n,d)=>n+d.consumed_lots.filter(l=>l.source_id===proposal.source_id).reduce((m,l)=>m+l.units,0),0)
  const expired=combined.daily.reduce((n,d)=>n+d.projected_expired_lots.filter(l=>l.source_id===proposal.source_id).reduce((m,l)=>m+l.units,0),0)
  const remaining=combined.remaining_lots.filter(l=>l.source_id===proposal.source_id).reduce((n,l)=>n+l.remaining,0)
  const excluded=proposal.expected_on>combined.end?proposal.units:0
  if(consumed+expired+remaining+excluded!==proposal.units)throw Error('Proposed lot conservation failed.')
  return {...proposal,consumed_units:consumed,projected_expired_units:expired,ending_units:remaining,outside_horizon_units:excluded}
 })
 return {status:'ENTERED_PROPOSED_LOT_COMPARISON',policy:'same_timeline_proposed_receipts_v1',baseline:{fulfilled_units:baseline.fulfilled_units,unmet_units:baseline.unmet_units,projected_expired_units:baseline.projected_expired_units,ending_units:baseline.ending_units},
  combined_delta:compare(combined),combined_timeline:combined,individual_proposals:individual,proposed_lot_results:lotResults,
  comparison_scope:'Each proposal alone versus unchanged baseline; combined effects are separate and individual effects must not be summed.',
  costs_budget_supplier_caps_checked:false,allocation_optimized:false,source_inputs_verified:false,procurement_execution_approved:false,expiry_outcome_measured:false}
}
/** Local user-entered evidence audit; does not populate dashboard analytics or authorize procurement. */
export function reviewOperatingInputs(value:unknown,current:OperatingScope,today=manilaToday()){
 const data=object(value)
 if(data.schema_version!==1||data.classification!=='entered_unverified_operating_snapshot')throw Error('Unsupported operating snapshot classification.')
 if(data.checksum!==current.checksum||object(data.scope).sector!==current.scope.sector||object(data.scope).territory!==current.scope.territory)throw Error('Snapshot source or planning scope differs; reload its original shortlist.')
 const asOf=date(data.as_of,'Snapshot date');date(today,'Review date');if(asOf>today)throw Error('Snapshot date cannot be in the future.')
 const reference=text(data.input_reference,'Input reference')
 const purchase_capacity_constraint=snapshotCapacity(data)
 if(!current.items.length||!Array.isArray(data.products)||data.products.length!==current.items.length)throw Error('Snapshot must contain each shortlisted product exactly once.')
 const seen=new Set<string>()
 const products=data.products.map(raw=>{
  const p=object(raw),product=text(p.product,'Product'),existing=current.items.find(row=>row.product===product)
  if(!existing||seen.has(product))throw Error('Unknown or duplicate product in snapshot.');seen.add(product)
  const unit=text(p.unit_label,'Product unit'),declared=count(p.stock_total,'Stock total'),reserve=count(p.protected_reserve,'Reserve')
  if(!Array.isArray(p.batches)||p.batches.length>100||!Array.isArray(p.receipts)||p.receipts.length>100)throw Error('Supply arrays are required and limited to 100 rows per product.')
  const ids=new Set<string>();let total=0,usable=0,expired=0,held=0
  const batches=p.batches.map(raw=>{
   const b=object(raw),id=text(b.batch_id,'Batch ID');if(ids.has(id))throw Error('Duplicate batch ID.');ids.add(id)
   const units=count(b.units,'Batch units'),received=date(b.received_on,'Batch receipt date'),expiry=date(b.expires_on,'Batch expiry date')
   if(received>asOf||expiry<=received)throw Error('Batch receipt must be on/before snapshot and expiry after receipt.')
   if(!['released','quarantined','blocked'].includes(String(b.disposition)))throw Error('Batch disposition is required.')
   total+=units
   const isExpired=expiry<=asOf
   if(isExpired)expired+=units
   else if(b.disposition!=='released')held+=units
   else usable+=units
   return {batch_id:id,units,received_on:received,expires_on:expiry,disposition:b.disposition,eligible_as_of:!isExpired&&b.disposition==='released'}
  })
  if(total!==declared)throw Error('Batch quantities do not reconcile to stock_total for '+product)
  if(reserve>usable)throw Error('Reserve exceeds released, unexpired stock for '+product)
  const receiptIds=new Set<string>();let inbound=0
  const receipts=p.receipts.map(raw=>{
   const r=object(raw),id=text(r.receipt_id,'Receipt ID');if(receiptIds.has(id))throw Error('Duplicate receipt ID.');receiptIds.add(id)
   const units=count(r.units,'Receipt units',true),due=date(r.expected_on,'Expected receipt date'),expiry=date(r.expires_on,'Receipt expiry date')
   if(due<asOf||expiry<=due)throw Error('Expected receipt must be on/after snapshot and expiry after arrival.')
   inbound+=units
   return {receipt_id:id,units,expected_on:due,expires_on:expiry,arrival_status:'entered_expected_not_confirmed'}
  })
  if(!Number.isSafeInteger(total)||total>1e9||inbound>1e9)throw Error('Supply totals exceed review bounds.')
  const mismatches=[]
  if(existing.stock!==undefined&&existing.stock!==''&&Number(existing.stock)!==usable)mismatches.push('Entered planning stock differs from snapshot released/unexpired units')
  if(existing.reserve!==undefined&&existing.reserve!==''&&Number(existing.reserve)!==reserve)mismatches.push('Entered planning reserve differs from snapshot reserve')
  const timeline=supplyTimeline(p,asOf,reserve,batches,receipts)
  const purchase_comparison=comparePurchaseLots(p,asOf,reserve,batches,receipts,timeline)
  return {product,unit_label:unit,declared_stock_units:total,released_unexpired_units:usable,expired_as_of_units:expired,held_unexpired_units:held,protected_reserve_units:reserve,available_after_reserve_units:usable-reserve,entered_expected_receipt_units:inbound,batches,receipts,mismatches,timeline,purchase_comparison}
 })
 return {status:'STRUCTURALLY_VALID_UNVERIFIED_OPERATING_SNAPSHOT',policy:'dated_supply_snapshot_review_v1',as_of:asOf,reviewed_on:today,
  snapshot_age_days:Math.round((Date.parse(today)-Date.parse(asOf))/86400000),input_reference:reference,checksum:current.checksum,scope:current.scope,products,purchase_capacity_constraint,
  source_documents_verified:false,unit_mapping_approved:false,procurement_execution_approved:false,expiry_outcome_measured:false,planning_values_changed:false}
}

export function operatingTemplate(current:OperatingScope,today=manilaToday()){
 if(!current.items.length)throw Error('Load a historical shortlist first.')
 return {schema_version:1,classification:'entered_unverified_operating_snapshot',as_of:today,input_reference:'',checksum:current.checksum,scope:current.scope,purchase_budget:null,
  capacity_help:'Optional: add purchase_capacity_units (numeric whole number 0–1000000000) and capacity_unit_label at the snapshot root. Omit both for no cap; null is invalid and zero is a real zero cap. Every product unit_label must match the trimmed capacity_unit_label. Counts all proposed full-pack purchase units, excludes stock/expected receipts; no automatic conversion or verified physical storage. Ordinary planning capacity is separate.',
  products:current.items.map(row=>({product:row.product,unit_label:'',stock_total:null,protected_reserve:null,batches:[],receipts:[],horizon_end:null,demand_calendar:[],proposed_receipts:[],purchase_constraints:null}))}
}

export function installOperatingInputReview(root:HTMLElement,serverReview?:(body:unknown,options:{signal:AbortSignal})=>Promise<unknown>,serverSelect?:(body:unknown,options:{signal:AbortSignal})=>Promise<unknown>){
 const target=root.querySelector('#planInputs');if(!target)return()=>{}
 const panel=document.createElement('details');panel.style.cssText='margin:16px 0;line-height:1.6;max-width:100%;overflow-wrap:anywhere'
 panel.innerHTML='<summary>Dated stock, receipt and demand timeline review</summary><p>Download a template for this shortlist and enter batch/receipt records in one stated product unit. Optionally set horizon_end and demand_calendar with one explicit quantity for every day from the snapshot date, including zeros (maximum 366 days). Add up to five proposed_receipts per product (receipt_id, units, expected_on, expires_on) to compare each lot alone and all lots together against the same baseline. Individual effects must not be added. Costs, budget and supplier limits are not checked by this comparison. Import for structural review and a FEFO timeline scenario. Expiry is unavailable from the start of its date; expected receipts are assumed released at the start of their date. Daily demand consumes earliest-expiring stock while protecting reserve; unmet demand is not carried forward. This does not verify inputs, change allocation, measure expiry losses or approve purchases. Keep personal data and secrets out of references.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn btn-secondary" data-supply-template>Download snapshot template</button><button type="button" class="btn btn-secondary" data-supply-import>Review entered snapshot</button><button type="button" class="btn btn-secondary" data-supply-export disabled>Export review record</button><input type="file" data-supply-file accept=".json,application/json" hidden></div><p data-supply-status role="status"></p><ul data-supply-findings></ul>'
 target.closest('.plan-scroll')!.after(panel)
 const el=<T extends HTMLElement>(selector:string)=>panel.querySelector<T>(selector)!
 const file=el<HTMLInputElement>('[data-supply-file]'),status=el('[data-supply-status]'),findings=el('[data-supply-findings]'),exportButton=el<HTMLButtonElement>('[data-supply-export]')
 exportButton.disabled=true
 const request=()=> (window as unknown as {getPlanningRequest:()=>OperatingScope}).getPlanningRequest()
 let disposed=false,sequence=0,review:ReturnType<typeof reviewOperatingInputs>|null=null,signature='',snapshot:unknown=null,serverResult:unknown=null,selectionResult:unknown=null
 const serverButton=document.createElement('button');serverButton.type='button';serverButton.className='btn btn-secondary';serverButton.textContent='Check dated plan against budget and limits';serverButton.disabled=true
 const serverStatus=document.createElement('p');serverStatus.setAttribute('role','status');panel.append(serverButton,serverStatus)
 const serverHelp=document.createElement('p');serverHelp.textContent='Optional server review sends the entered snapshot to the authenticated gateway for calculation only. Add purchase_budget and, for every product, purchase_constraints with units_per_pack, pack_cost, supplier_max_packs, maximum_projected_expired_units and minimum_fulfillment_pct. Complete daily timelines are required. Optionally add snapshot purchase_capacity_units (numeric whole number, zero included) and capacity_unit_label matching every product unit_label. Omit both for no cap; null is invalid. Capacity counts all proposed full-pack purchase units, excluding stock and expected receipts. No automatic unit conversion, transfer from ordinary capacity, or verified physical storage. Values remain assumptions; no purchases or source records are written.';panel.append(serverHelp)
 const selectButton=document.createElement('button');selectButton.type='button';selectButton.className='btn btn-secondary';selectButton.textContent='Select dated purchase quantities';selectButton.disabled=true
 const selectStatus=document.createElement('p');selectStatus.setAttribute('role','status');panel.append(selectButton,selectStatus)
 const selectHelp=document.createElement('p');selectHelp.textContent='Selection requires exactly one proposed dated receipt slot per product. Add selection_max_packs (0–20, within supplier cap) and selection_weight (0–100) in each purchase_constraints record. It searches quantities within those bounds to maximize entered-weighted fulfillment, then minimize spend. It does not optimize dates/suppliers or change planning inputs. Unverified assumptions; no procurement approval.';panel.append(selectHelp)
 let reviewController:AbortController|null=null,selectController:AbortController|null=null
 const clear=()=>{sequence++;reviewController?.abort();selectController?.abort();reviewController=null;selectController=null;review=null;snapshot=null;serverResult=null;selectionResult=null;signature='';serverButton.disabled=true;selectButton.disabled=true;serverStatus.textContent='';selectStatus.textContent='';findings.replaceChildren();exportButton.disabled=true;status.textContent='No current dated-input review. Reimport after changing planning inputs or scope.'}
 const download=(data:unknown,name:string)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 el('[data-supply-template]').addEventListener('click',()=>{try{download(operatingTemplate(request()),'medshield-operating-snapshot-template.json')}catch(e){status.textContent=e instanceof Error?e.message:'Template unavailable'}})
 el('[data-supply-import]').addEventListener('click',()=>file.click())
 file.addEventListener('change',()=>{void(async()=>{
  clear();const turn=sequence
  try{
   const selected=file.files?.[0];if(!selected)return
   if(selected.size>250000)throw Error('Snapshot exceeds the 250 KB review limit.')
   const before=JSON.stringify(request()),raw:unknown=JSON.parse(await selected.text())
   if(disposed||turn!==sequence)return
   if(JSON.stringify(request())!==before)throw Error('Planning inputs changed while reading the file; import again.')
   const result=reviewOperatingInputs(raw,request());review=result;signature=before;snapshot=raw;serverResult=null;serverButton.disabled=!serverReview;selectButton.disabled=!serverSelect
   for(const row of result.products){const li=document.createElement('li');li.textContent=row.product+': '+row.released_unexpired_units+' released/unexpired '+row.unit_label+'; '+row.expired_as_of_units+' expired; '+row.held_unexpired_units+' held; '+row.entered_expected_receipt_units+' expected inbound. '+(row.mismatches.join('; ')||'Entered planning stock/reserve match where supplied.');
    if(row.timeline){const t=row.timeline,note=document.createElement('p');note.textContent=t.recommendation+'. Scenario '+t.start+'–'+t.end+': '+t.fulfilled_units+' fulfilled, '+t.unmet_units+' unmet, '+t.projected_expired_units+' projected expired, '+t.ending_units+' remaining '+row.unit_label+'. First unmet date: '+(t.first_unmet_date??'none in horizon')+'. Entered assumptions; no measured outcome.';li.append(note)
     for(const followup of t.recommended_followups){const action=document.createElement('p');action.textContent=followup;li.append(action)}
     const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Daily timeline and assumptions';details.append(summary)
     const assumption=document.createElement('p');assumption.textContent=t.assumptions;details.append(assumption)
     for(const day of t.daily){const line=document.createElement('p');line.textContent=day.date+': arrivals '+day.entered_arrival_units+', demand '+day.demand_units+', fulfilled '+day.fulfilled_units+', unmet '+day.unmet_units+', projected expired '+day.projected_expired_units+', ending '+day.ending_units+(day.projected_expired_lots.length?'. Expiring lots: '+day.projected_expired_lots.map(l=>l.source_id+' ('+l.units+')').join(', '):'');details.append(line)}li.append(details)
    }
    if(row.purchase_comparison){const c=row.purchase_comparison,d=c.combined_delta,box=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Proposed purchase-lot comparison';box.append(summary)
     const combined=document.createElement('p');combined.textContent='All proposed lots together versus unchanged baseline: unmet '+c.baseline.unmet_units+' → '+c.combined_timeline.unmet_units+'; projected expiry '+c.baseline.projected_expired_units+' → '+c.combined_timeline.projected_expired_units+'; '+d.additional_fulfilled_units+' additional fulfilled '+row.unit_label+'. '+d.recommendation+'.';box.append(combined)
     const limits=document.createElement('p');limits.textContent=c.comparison_scope+' Costs, budget and supplier caps are not checked; this is not an optimized or approved purchase plan.';box.append(limits)
     for(const individual of c.individual_proposals){const line=document.createElement('p');line.textContent=individual.proposal.receipt_id+' alone: unmet '+c.baseline.unmet_units+' → '+individual.unmet_units+'; projected expiry '+c.baseline.projected_expired_units+' → '+individual.projected_expired_units+'; '+individual.additional_fulfilled_units+' additional fulfilled. '+individual.recommendation+'.';box.append(line)}
     for(const lot of c.proposed_lot_results){const line=document.createElement('p');line.textContent=lot.receipt_id+' in combined scenario: '+lot.consumed_units+' consumed, '+lot.projected_expired_units+' projected expired, '+lot.ending_units+' remaining, '+lot.outside_horizon_units+' outside horizon '+row.unit_label+'.';box.append(line)}
     li.append(box)
    }findings.append(li)}
   status.textContent='Structural checks passed; source documents and product units remain unverified. Snapshot age: '+result.snapshot_age_days+' days. Planning values unchanged. '+(result.purchase_capacity_constraint?'Entered purchase capacity: '+result.purchase_capacity_constraint.units+' '+result.purchase_capacity_constraint.unit_label+' (Assumed); gateway checks full-pack usage with budget, expiry and service limits.':'Purchase capacity not entered; no shared dated cap.');exportButton.disabled=false
  }catch(e){if(!disposed&&turn===sequence){review=null;findings.replaceChildren();exportButton.disabled=true;status.textContent=e instanceof Error?e.message:'Snapshot review failed'}}finally{file.value=''}
 })()})
 serverButton.addEventListener('click',()=>{void(async()=>{reviewController?.abort();const controller=new AbortController();reviewController=controller;const turn=sequence;serverResult=null;serverStatus.textContent='Checking the fixed plan against current source, budget and entered limits…';serverButton.disabled=true
  try{
   if(!review||!snapshot||!serverReview||JSON.stringify(request())!==signature||manilaToday()!==review.reviewed_on)throw Error('Reimport current dated inputs before server review.')
   const result=await serverReview({acknowledged:true,snapshot},{signal:controller.signal})
   if(disposed||controller.signal.aborted||turn!==sequence)return
   if(JSON.stringify(request())!==signature||manilaToday()!==review.reviewed_on)throw Error('Planning inputs or review date changed; reimport dated snapshot.')
   const r=result as {status?:string;checksum?:string;spend_php?:string;budget_php?:string;conflicts?:string[];objective_optimized?:boolean;procurement_execution_approved?:boolean;source_inputs_verified?:boolean;expiry_outcome_measured?:boolean}
   if(!['DATED_FIXED_PLAN_FEASIBLE','DATED_FIXED_PLAN_INFEASIBLE'].includes(r.status??'')||r.checksum!==request().checksum||!/^\d+\.\d{2}$/.test(r.spend_php??'')||!/^\d+\.\d{2}$/.test(r.budget_php??'')||!Array.isArray(r.conflicts)||!r.conflicts.every(v=>typeof v==='string')||r.objective_optimized!==false||r.procurement_execution_approved!==false||r.source_inputs_verified!==false||r.expiry_outcome_measured!==false)throw Error('Invalid dated-plan response.')
   if((r.status==='DATED_FIXED_PLAN_FEASIBLE')!==!r.conflicts.length)throw Error('Inconsistent dated-plan feasibility and conflicts.')
   const capacitySummary=capacityReadback(result,snapshot,false)
   serverResult=result;serverStatus.textContent=r.status+' · entered spend ₱'+r.spend_php+' / budget ₱'+r.budget_php+'. '+capacitySummary+' '+(r.conflicts?.join('; ')||'Fixed plan satisfies the entered constraints; no optimum or operational approval.')
  }catch(error){if(!disposed&&!controller.signal.aborted&&turn===sequence){serverResult=null;serverStatus.textContent=(error instanceof Error?error.message:'Server dated review unavailable')+' No prior server result substituted.'}}
  finally{if(!disposed&&!controller.signal.aborted&&turn===sequence)serverButton.disabled=!review||!serverReview}
 })()})
 selectButton.addEventListener('click',()=>{void(async()=>{selectController?.abort();const controller=new AbortController();selectController=controller;const turn=sequence;selectionResult=null;selectButton.disabled=true;selectStatus.textContent='Selecting dated quantities under the entered constraints…'
  try{
   if(!review||!snapshot||!serverSelect||JSON.stringify(request())!==signature||manilaToday()!==review.reviewed_on)throw Error('Reimport current dated inputs before selection.')
   const result=await serverSelect({acknowledged:true,snapshot},{signal:controller.signal})
   if(disposed||controller.signal.aborted||turn!==sequence)return
   if(JSON.stringify(request())!==signature||manilaToday()!==review.reviewed_on)throw Error('Planning inputs or review date changed; reimport dated snapshot.')
   const r=result as {status?:string;checksum?:string;proof_status?:string;weighted_fulfillment_pct?:number;absolute_gap_pp?:number;spend_php?:string;budget_php?:string;rows?:Array<{product:string;proposed_packs:number}>;conflicts?:string[];source_inputs_verified?:boolean;procurement_execution_approved?:boolean;expiry_outcome_measured?:boolean}
   if(!['DATED_SELECTION_RESULT','DATED_SELECTION_INFEASIBLE'].includes(r.status??'')||r.checksum!==request().checksum||r.source_inputs_verified!==false||r.procurement_execution_approved!==false||r.expiry_outcome_measured!==false||!Array.isArray(r.rows)||!Array.isArray(r.conflicts)||!['optimal','feasible_bound','infeasible'].includes(r.proof_status??''))throw Error('Invalid dated selection response.')
   const capacitySummary=capacityReadback(result,snapshot,true)
   if(r.status==='DATED_SELECTION_INFEASIBLE'){if(r.proof_status!=='infeasible'||r.rows.length)throw Error('Inconsistent dated infeasibility response.');selectStatus.textContent='No feasible purchase quantities in the entered search domain: '+r.conflicts.join('; ')+'. '+capacitySummary}
   else{
    if(!['optimal','feasible_bound'].includes(r.proof_status??'')||!Number.isFinite(r.weighted_fulfillment_pct)||!Number.isFinite(r.absolute_gap_pp)||Number(r.absolute_gap_pp)<0||!/^\d+\.\d{2}$/.test(r.spend_php??'')||!/^\d+\.\d{2}$/.test(r.budget_php??'')||r.rows.length!==request().items.length||!r.rows.every(row=>typeof row.product==='string'&&request().items.some(item=>item.product===row.product)&&Number.isSafeInteger(row.proposed_packs)&&row.proposed_packs>=0&&row.proposed_packs<=20)||new Set(r.rows.map(row=>row.product)).size!==r.rows.length)throw Error('Invalid dated selection metrics or rows.')
    selectStatus.textContent=(r.proof_status==='optimal'?'Optimal within the entered quantity domain. ':'Feasible selection; optimality not proved. ')+'Weighted fulfillment '+Number(r.weighted_fulfillment_pct).toFixed(2)+'%; gap '+(Number(r.absolute_gap_pp)>0&&Number(r.absolute_gap_pp)<.01?'<0.01':Number(r.absolute_gap_pp).toFixed(2))+' percentage points; spend ₱'+r.spend_php+' / budget ₱'+r.budget_php+'. '+r.rows.map(row=>row.product+': '+row.proposed_packs+' packs').join('; ')+'. '+capacitySummary+' Entered assumptions; no order is placed. Export includes selected dated inputs.'
   }
   selectionResult=result
  }catch(error){if(!disposed&&!controller.signal.aborted&&turn===sequence){selectionResult=null;selectStatus.textContent=(error instanceof Error?error.message:'Dated selection unavailable')+' No previous selection substituted.'}}
  finally{if(!disposed&&!controller.signal.aborted&&turn===sequence)selectButton.disabled=!review||!serverSelect}
 })()})
 exportButton.addEventListener('click',()=>{try{if(!review)return;if(JSON.stringify(request())!==signature||manilaToday()!==review.reviewed_on){clear();return}download({...review,entered_snapshot:snapshot,server_dated_plan_review:serverResult,server_dated_purchase_selection:selectionResult},'medshield-operating-snapshot-review.json')}catch{clear();status.textContent='Current planning source is unavailable; restore it and reimport the snapshot.'}})
 window.addEventListener('medshield:plan-invalidated',clear)
 return()=>{disposed=true;clear();window.removeEventListener('medshield:plan-invalidated',clear);panel.remove()}
}
