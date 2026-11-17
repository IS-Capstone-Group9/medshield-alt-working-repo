import {mkdirSync,writeFileSync} from 'node:fs'
import {inventoryPolicyScenario} from '../src/inventoryPolicyScenario'
const out='../outputs/inventory_feasibility_20261029';mkdirSync(out,{recursive:true})
const cases=[]
for(const annual_demand of [1,365,10000])for(const lead_days of [0,1,10,3650])for(const shelf_life_days of ['',0,1,364,3650])for(const on_order of [0,20]){
 const input={annual_demand,lead_days,shelf_life_days,on_order,backorders:3,order_cost:10,holding_cost:2,policy_input_reference:'Synthetic reference'}
 const item={stock:8,reserve:2,pack:4,pack_cost_cents:500,max_packs:100}
 cases.push({input,item,result:inventoryPolicyScenario(input,item,10000)})
}
writeFileSync(out+'/grid.json',JSON.stringify(cases,null,2)+'\n')
console.log(JSON.stringify({status:'CAPTURED_FEASIBILITY_GRID',cases:cases.length}))
