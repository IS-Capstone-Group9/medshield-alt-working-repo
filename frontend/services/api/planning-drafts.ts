type Item={product:string;demand:string;stock:string;reserve:string;pack:string;pack_cost:string;max_packs:string;annual_demand?:string;order_cost?:string;holding_cost?:string;lead_days?:string;on_order?:string;backorders?:string;revenue_score?:string;growth_score?:string;outbreak_score?:string;shelf_life_days?:string;policy_input_reference?:string;unit_label?:string}
type Request={scope:{sector:string;territory:string};checksum:string;horizon:string;budget:string;minimum_pct:string;acknowledged:boolean;items:Item[];allocation_method?:'balanced'|'weighted';revenue_weight?:string;growth_weight?:string;outbreak_weight?:string;purchase_capacity_units?:string;capacity_unit_label?:string}
type Draft={schema_version:1;classification:'unverified_scenario_assumptions';created_at:string;request:Request}
const requiredFields=['demand','stock','reserve','pack','pack_cost','max_packs'] as const
const policyFields=['annual_demand','order_cost','holding_cost','lead_days','on_order','backorders','revenue_score','growth_score','outbreak_score','shelf_life_days'] as const
const fields=[...requiredFields,...policyFields,'policy_input_reference','unit_label'] as const
const runtime=()=>window as unknown as {getPlanningRequest:(forDraft?:boolean)=>Request;invalidatePlan:()=>void}
/** Draft import carries entered assumptions only, never results or approval. */
export function validatePlanningDraft(value:unknown,current:Request):Draft {
  const data=value as Draft
  if(!data||data.schema_version!==1||data.classification!=='unverified_scenario_assumptions'||typeof data.created_at!=='string'||!Number.isFinite(Date.parse(data.created_at)))throw Error('This is not a supported planning draft.')
  const request=data.request
  if(!request||request.acknowledged!==false||request.checksum!==current.checksum||request.scope?.sector!==current.scope.sector||request.scope.territory!==current.scope.territory)throw Error('Draft source or buyer/territory scope differs. Load its original scope or prepare a new draft.')
  if(!['1','3','6','12'].includes(request.horizon))throw Error('Draft planning horizon is invalid.')
  const number=(v:unknown)=>typeof v==='string'&&v.length<=40&&(v===''||/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(v)&&Number.isFinite(Number(v)))
  if(!number(request.budget)||!number(request.minimum_pct))throw Error('Draft budget or fulfillment value is invalid.')
  if(request.purchase_capacity_units!==undefined&&(!number(request.purchase_capacity_units)||request.purchase_capacity_units!==''&&(!Number.isInteger(Number(request.purchase_capacity_units))||Number(request.purchase_capacity_units)>1_000_000_000)))throw Error('Draft purchase capacity is invalid.')
  const unit=(v:unknown)=>v===undefined||typeof v==='string'&&v.length<=80&&!/[\u0000-\u001f]/.test(v)
  if(!unit(request.capacity_unit_label)||!Array.isArray(request.items)||!request.items.every(i=>i&&unit(i.unit_label)))throw Error('Draft unit labels are invalid.')
  if(request.allocation_method!==undefined&&!['balanced','weighted'].includes(request.allocation_method))throw Error('Draft allocation method is invalid.')
  if(!(['revenue_weight','growth_weight','outbreak_weight'] as const).every(key=>request[key]===undefined||number(request[key])))throw Error('Draft priority weights are invalid.')
  if(!Array.isArray(request.items)||request.items.length!==current.items.length||new Set(request.items.map(i=>i?.product)).size!==request.items.length||!request.items.every(i=>i&&current.items.some(p=>p.product===i.product)&&requiredFields.every(f=>number(i[f]))&&policyFields.every(f=>i[f]===undefined||number(i[f]))))throw Error('Draft products or entered values do not match this shortlist.')
  if(!request.items.every(i=>i.policy_input_reference===undefined||typeof i.policy_input_reference==='string'&&i.policy_input_reference.length<=200&&!/[\u0000-\u001f]/.test(i.policy_input_reference)))throw Error('Draft input reference is invalid.')
  return data
}

export function installPlanningDrafts(root:HTMLElement):()=>void {
  const table=root.querySelector<HTMLElement>('#planInputs')
  if(!table)return()=>{}
  const panel=document.createElement('section');panel.setAttribute('aria-label','Planning draft files');panel.style.cssText='margin:16px 0;line-height:1.6'
  panel.innerHTML='<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn btn-secondary" data-draft-save>Save input draft</button><button type="button" class="btn btn-secondary" data-draft-load>Load input draft</button><input type="file" accept=".json,application/json" data-draft-file hidden></div><p style="font-size:12px">Save incomplete inputs for later. Loading needs the same source and shortlist; it clears calculated results and your review acknowledgment.</p><p data-draft-status role="status" style="font-size:12px"></p>'
  table.closest('.plan-scroll')!.after(panel)
  const status=panel.querySelector<HTMLElement>('[data-draft-status]')!,file=panel.querySelector<HTMLInputElement>('[data-draft-file]')!
  let disposed=false
  const save=()=>{
    try{
      const request=runtime().getPlanningRequest(true)
      if(!request.items.length)throw Error('Load an available historical shortlist first.')
      const draft:Draft={schema_version:1,classification:'unverified_scenario_assumptions',created_at:new Date().toISOString(),request:{...request,acknowledged:false}}
      validatePlanningDraft(draft,request)
      const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='medshield-planning-input-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
      status.textContent='Input draft downloaded. It contains no approval or calculated allocation.'
    }catch(error){status.textContent=error instanceof Error?error.message:'Planning draft unavailable.'}
  }
  const load=async()=>{
    try{
      const selected=file.files?.[0];if(!selected)return
      if(selected.size>100_000)throw Error('Planning draft is too large.')
      const parsed:unknown=JSON.parse(await selected.text());if(disposed)return
      const draft=validatePlanningDraft(parsed,runtime().getPlanningRequest()),request=draft.request
      const input=(id:string)=>root.querySelector<HTMLInputElement|HTMLSelectElement>('#'+id)!
      input('planHorizon').value=request.horizon;input('planBudget').value=request.budget;input('planMinimum').value=request.minimum_pct
      input('planPurchaseCapacity').value=request.purchase_capacity_units??'';input('planCapacityUnit').value=request.capacity_unit_label??''
      input('planAllocationMethod').value=request.allocation_method??'balanced';input('planRevenueWeight').value=request.revenue_weight??'';input('planGrowthWeight').value=request.growth_weight??'';input('planOutbreakWeight').value=request.outbreak_weight??''
      const current=runtime().getPlanningRequest()
      for(const [index,item] of current.items.entries()){
        const source=request.items.find(row=>row.product===item.product)!
        for(const field of fields)root.querySelector<HTMLInputElement>(`[data-plan-index="${index}"][data-plan-field="${field}"]`)!.value=source[field]??''
      }
      root.querySelector<HTMLInputElement>('#planAcknowledged')!.checked=false;runtime().invalidatePlan()
      status.textContent='Draft loaded. Review every assumption and acknowledge it before recalculating.'
    }catch(error){if(!disposed)status.textContent=error instanceof Error?error.message:'Draft could not be loaded.'}finally{file.value=''}
  }
  panel.querySelector('[data-draft-save]')!.addEventListener('click',save)
  panel.querySelector('[data-draft-load]')!.addEventListener('click',()=>file.click())
  file.addEventListener('change',()=>void load())
  return()=>{disposed=true;panel.remove()}
}
