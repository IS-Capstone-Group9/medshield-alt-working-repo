import {mkdirSync,writeFileSync} from 'node:fs'
import {inventoryPolicyScenario} from '../src/inventoryPolicyScenario'
const out='../outputs/inventory_policy_scenario_20261029';mkdirSync(out,{recursive:true})
const cases=[]
for(const annual_demand of [1,100,365,10000])for(const order_cost of [.01,50])for(const holding_cost of [.5,100])for(const pack of [1,30,100]){
  const input={annual_demand,order_cost,holding_cost,lead_days:annual_demand%11,on_order:3,backorders:7}
  const item={stock:10,reserve:2,pack,pack_cost_cents:500,max_packs:100}
  cases.push({input,item,budget_cents:50000,result:inventoryPolicyScenario(input,item,50000)})
}
writeFileSync(out+'/calculation-cases.json',JSON.stringify(cases,null,2)+'\n')
console.log(JSON.stringify({status:'CAPTURED_SYNTHETIC_POLICY_GRID',cases:cases.length}))
