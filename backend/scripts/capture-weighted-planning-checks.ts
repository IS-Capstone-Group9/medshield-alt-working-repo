import {mkdirSync,writeFileSync} from 'node:fs'
import {solvePlanningScenario} from '../src/planningScenario'
import {allocateWeighted,planningPriority,planningWeights} from '../src/weightedPlanning'

const directory='../outputs/weighted_allocation_20261029';mkdirSync(directory,{recursive:true})
let state=20261029
const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state}
const cases=[]
for(let test=0;test<160;test++){
  const n=1+test%5
  const items=Array.from({length:n},(_,i)=>{const stock=next()%7;return {product:'Synthetic '+i,demand:1+next()%13,stock,reserve:next()%(stock+1),pack:1+next()%5,
    pack_cost:(1+next()%16)/4,max_packs:next()%5,revenue_score:1+next()%100,growth_score:next()%101,outbreak_score:next()%101}})
  const body={acknowledged:true,checksum:'synthetic',horizon:1,budget:(next()%81)/4,minimum_pct:[0,25,50,75][next()%4],allocation_method:'weighted',revenue_weight:50,growth_weight:30,outbreak_weight:20,items}
  const shortlist={source:{checksum:'synthetic'},scope:{sector:'All',territory:'all'},products:items.map(({product})=>({product}))}
  const result=solvePlanningScenario(body,shortlist)
  let limited=null
  if(result.status==='scenario_allocation'){
    const weights=planningWeights(body),minimum=items.map(row=>{
      const available=row.stock-row.reserve,purchase_packs=Math.max(0,Math.ceil((Math.ceil(row.demand*body.minimum_pct/100)-available)/row.pack))
      return {...row,available,purchase_packs,fulfilled:Math.min(row.demand,available+purchase_packs*row.pack),pack_cost_cents:Math.round(row.pack_cost*100),priority:planningPriority(row,weights)}
    })
    const remaining=Math.round(body.budget*100)-minimum.reduce((sum,row)=>sum+row.purchase_packs*row.pack_cost_cents,0)
    const optimization=allocateWeighted(minimum,remaining,0)
    limited={optimization,rows:minimum}
  }
  cases.push({body,result,limited})
}
writeFileSync(directory+'/oracle-cases.json',JSON.stringify(cases,null,2)+'\n')
const stressItems=[13,17,19,23,29].map((pack,i)=>({product:'Stress '+i,demand:1_000_000_000,stock:0,reserve:0,pack,pack_cost:[.53,.67,.71,.89,.97][i],max_packs:100000,revenue_score:100,growth_score:100,outbreak_score:100}))
const stressRequest={acknowledged:true,checksum:'synthetic-stress',horizon:1,budget:100000,minimum_pct:0,allocation_method:'weighted',revenue_weight:50,growth_weight:30,outbreak_weight:20,items:stressItems}
const started=Date.now(),stress=solvePlanningScenario(stressRequest,{source:{checksum:'synthetic-stress'},scope:{sector:'All',territory:'all'},products:stressItems.map(({product})=>({product}))})
writeFileSync(directory+'/stress-case.json',JSON.stringify({request:stressRequest,result:stress,elapsed_ms:Date.now()-started},null,2)+'\n')
console.log(JSON.stringify({status:'CAPTURED_WEIGHTED_ORACLE_CASES',cases:cases.length,feasible:cases.filter(c=>c.result.status==='scenario_allocation').length}))
