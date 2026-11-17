/** Offline scenario adapter; invokes actual gateway algorithms, never source writes. */
import {readFileSync,writeFileSync} from 'node:fs'
import {solvePlanningScenario} from '../src/planningScenario'
const [input,output]=process.argv.slice(2)
if(!input||!output)throw Error('Provide scenario input and new output paths')
const payload=JSON.parse(readFileSync(input,'utf8'))
if(payload.schema_version!=='offline_budget_frontier_v1'||payload.operational_approval!==false||!['synthetic_fixture','retained_source_scenario'].includes(payload.evidence_kind))throw Error('Explicit offline scenario contract required')
const rows=payload.cases.map((c:any)=>{
 const shortlist={source:{checksum:payload.source_sha256},scope:{sector:'All',territory:'all'},products:c.items.map((i:any)=>({product:i.product}))}
 const base={acknowledged:true,checksum:payload.source_sha256,horizon:1,budget:c.budget_cents/100,minimum_pct:c.minimum_pct,
  purchase_capacity_units:c.capacity_units,capacity_unit_label:c.unit_label,
  revenue_weight:100,growth_weight:0,outbreak_weight:0,
  items:c.items.map((i:any)=>({product:i.product,demand:i.demand,stock:i.available,reserve:0,pack:i.pack,
    pack_cost:i.pack_cost_cents/100,max_packs:i.max_packs,revenue_score:i.score,unit_label:c.unit_label}))}
 const weighted=solvePlanningScenario({...base,allocation_method:'weighted'},shortlist)
 const greedy=solvePlanningScenario({...base,allocation_method:'balanced'},shortlist)
 const summarize=(result:ReturnType<typeof solvePlanningScenario>)=>({status:result.status==='infeasible'?'infeasible':result.status,
  packs:result.rows.length?result.rows.map(r=>r.purchase_packs):null,spent_cents:'spent'in result?Math.round(result.spent!*100):null,
  used_units:'purchase_capacity'in result?result.purchase_capacity?.used_units:null,
  proof_status:'optimization'in result?result.optimization?.proof_status:null,
  objective_numerator:'optimization'in result?result.optimization?.objective_numerator:null,
  objective_denominator:'optimization'in result?result.optimization?.objective_denominator:null})
 return {id:c.id,weighted:summarize(weighted),greedy:summarize(greedy)}
})
writeFileSync(output,JSON.stringify({evidence_kind:payload.evidence_kind,operational_approval:false,rows},null,2)+'\n',{flag:'wx'})
