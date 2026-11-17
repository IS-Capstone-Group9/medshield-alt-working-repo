/** Execute actual gateway solvers on explicitly synthetic, bounded proof cases. */
import {readFileSync,writeFileSync} from 'node:fs'
import {solvePlanningScenario} from '../src/planningScenario'
import {selectDatedPlan} from '../src/datedPlanSelection'
import {reviewDatedPlan} from '../src/datedPlanReview'

const [input,output]=process.argv.slice(2)
if(!input||!output)throw Error('Usage: tsx scripts/check-solver-proof-cases.ts input.json output.json')
const fixture=JSON.parse(readFileSync(input,'utf8'))
if(fixture.schema_version!=='synthetic_solver_proof_cases_v1'||fixture.dataset_id!=='synthetic_fixture_only'||fixture.operational_approval!==false)throw Error('Only explicit synthetic proof cases are accepted')
const rows=fixture.cases.map((c:any)=>{
 const shortlist={source:{checksum:'synthetic_fixture_only'},scope:{sector:'All',territory:'all'},products:c.items.map((i:any)=>({product:i.product}))}
 if(c.kind==='ordinary'){
  const body={acknowledged:true,checksum:shortlist.source.checksum,horizon:1,budget:c.budget_cents/100,minimum_pct:c.minimum_pct,
   allocation_method:'weighted',revenue_weight:100,growth_weight:0,outbreak_weight:0,
   items:c.items.map((i:any)=>({product:i.product,demand:i.demand,stock:i.available,reserve:0,pack:i.pack,
    pack_cost:i.pack_cost_cents/100,max_packs:i.max_packs,revenue_score:i.score}))}
  const result=solvePlanningScenario(body,shortlist)
  return {id:c.id,kind:c.kind,status:result.status==='infeasible'?'infeasible':'optimal',packs:result.rows.length?result.rows.map(r=>r.purchase_packs):null,
   objective_numerator:result.optimization?.objective_numerator??null,objective_denominator:result.optimization?.objective_denominator??null,
   proof_status:result.optimization?.proof_status??'infeasible',operational_approval:false}
 }
 if(c.kind!=='dated')throw Error('Unknown proof case kind')
 const days=c.daily_demand.map((units:number,index:number)=>({date:new Date(Date.parse(c.as_of)+index*86400000).toISOString().slice(0,10),units}))
 const snapshot={schema_version:1,classification:'entered_unverified_operating_snapshot',checksum:shortlist.source.checksum,scope:shortlist.scope,
  as_of:c.as_of,input_reference:'Synthetic hand-solvable proof fixture',purchase_budget:c.budget_cents/100,
  products:c.items.map((i:any)=>({product:i.product,unit_label:'synthetic fixture units',stock_total:0,protected_reserve:0,batches:[],receipts:[],
   horizon_end:c.horizon_end,demand_calendar:days,proposed_receipts:[{receipt_id:'slot',units:i.pack,expected_on:c.arrival,expires_on:c.expiry}],
   purchase_constraints:{units_per_pack:i.pack,pack_cost:i.pack_cost_cents/100,supplier_max_packs:i.max_packs,
    maximum_projected_expired_units:c.maximum_expired_units,minimum_fulfillment_pct:c.minimum_pct,selection_max_packs:i.max_packs,selection_weight:i.score}}))}
 const body={acknowledged:true,snapshot},result=selectDatedPlan(body,shortlist,c.as_of)
 const options=c.items.map((i:any,index:number)=>Array.from({length:i.max_packs+1},(_,packs)=>{
  const p=snapshot.products[index],review=reviewDatedPlan({...body,snapshot:{...snapshot,products:[{...p,proposed_receipts:packs?[{...p.proposed_receipts[0],units:packs*i.pack}]:[]}]}},
   {...shortlist,products:[{product:i.product}]},c.as_of).rows[0]
  return {packs,feasible:review.conflicts.length===0,fulfilled:review.candidate.fulfilled_units,expired:review.candidate.projected_expired_units}
 }))
 return {id:c.id,kind:c.kind,status:result.status==='DATED_SELECTION_INFEASIBLE'?'infeasible':'optimal',packs:result.rows.length?result.rows.map(r=>r.proposed_packs):null,
  objective_numerator:'objective_numerator'in result?result.objective_numerator:null,objective_denominator:'objective_denominator'in result?result.objective_denominator:null,
  proof_status:result.proof_status,options,operational_approval:false}
})
writeFileSync(output,JSON.stringify({dataset_id:fixture.dataset_id,policy_version:fixture.policy_version,evidence_label:'Simulated',rows},null,2)+'\n')
